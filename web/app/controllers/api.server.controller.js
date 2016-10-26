'use strict';

var pg = require('pg'),
	moment = require('moment'),
	config = require('../../config/config');

var connString = config.connString,
	timespans = ['hourly', 'daily', 'weekly', 'monthly'],
	zne_goals = { '1590': 80000 }; // TODO generate this list from db

exports.leaderboard = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		// gets the total kw since the start of the week (Monday) for each building
		var query = `
			SELECT "building",
					ROUND( ( SUM("solar") - (SUM("kitchen") + SUM("plugs") + SUM("lights") + SUM("ev")) ) / 1000, 2) as "kw"
			FROM "log"
			WHERE "datetime" >= date_trunc('week', NOW())
			GROUP BY "building"`;

		dbClient.query(query, [], function(err, result) {
			if (err) throw err;

			// Build object with week-to-date kw values
			var current_kw = {};

			for(var i = 0, len = result.rows.length; i < len; i++) {
				current_kw[result.rows[i].building] = parseFloat(result.rows[i].kw);
			} 

			var zne_ratio = .75;
			var exaggeration_factor = 0;

			// Caculate the ratio of the current time to the entire week to scale
			// the weekly zne to the current day
			var minutes_in_week = 60*24*7; // minutes * hours * days
			var minutes_so_far = moment().diff(moment().startOf('isoWeek')) / (1000 * 60); // ms -> minutes
			var minute_ratio = minutes_so_far / minutes_in_week;

			var positions = {
				'ZNE': zne_ratio * minute_ratio, // location of zne "line" for current day
			};

			// Calculate the position of each building
			for(var building in zne_goals) {
				// how much of the zne goal has been used
				// (compared to adjusted goal for the current day)
				var percent_used = current_kw[building] / (zne_goals[building] * minute_ratio);

				//do exaggeration
				percent_used = 1 + (1 + exaggeration_factor) * (percent_used - 1);

				// calculate the position compared to the zne "line" for current day
				// Inverted because values lower than ZNE are good and higher are bad
				positions[building] = positions['ZNE'] / percent_used;
			}

			res.status(200).send(positions); // send response

			done(); // close db connection
		});
	});
};

exports.current = function(req, res) {
	// return average of last 10 minutes of data in the database for the passed building in Watts

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		dbClient.query('SELECT DISTINCT "building" FROM "log"', [], function(err, result) {

			var buildings = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				buildings.push(result.rows[i].building);
			}

			if(buildings.indexOf(req.params.building) === -1) {
				res.status(400).send({
					message: 'Invalid request'
				});
				return;
			}

			var query = `SELECT ROUND(AVG("kitchen"), 2) as "kitchen",
								ROUND(AVG("plugs"), 2) as "plugs",
								ROUND(AVG("lights"), 2) as "lights",
								ROUND(AVG("solar"), 2) as "solar",
								ROUND(AVG("ev"), 2) as "ev"
						FROM (
							SELECT * FROM "log"
							WHERE "building" = $1
							ORDER BY "datetime" DESC
							LIMIT 10
						) as "lastTen"`;

			dbClient.query(query, [req.params.building], function(err, result) {
				if (err) throw err;

				var data = {
					kitchen: result.rows[0].kitchen !== null ? -parseFloat(result.rows[0].kitchen) : 0,
					plugs: result.rows[0].plugs !== null ? -parseFloat(result.rows[0].plugs) : 0,
					lights: result.rows[0].lights !== null ? -parseFloat(result.rows[0].lights) : 0,
					solar: result.rows[0].solar !== null ? parseFloat(result.rows[0].solar) : 0,
					ev: result.rows[0].ev !== null ? -parseFloat(result.rows[0].ev) : 0,
				};

				data.total = data.solar+data.kitchen+data.plugs+data.lights+data.ev;
				data.total = data.total.toFixed(2);

				res.status(200).send(data); // send response

				done(); // close db connection
			});
		});
	});
};

exports.historical = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		dbClient.query('SELECT DISTINCT "building" FROM "log"', [], function(err, result) {

			var buildings = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				buildings.push(result.rows[i].building);
			}

			// Validate parameters
			if(timespans.indexOf(req.params.timespan) === -1 || buildings.indexOf(req.params.building) === -1) {
				res.status(400).send({
					message: 'Invalid request'
				});
				return;
			}

			var start = '';
			var minutes = 0;

			// Set the appropriate options to build the query
			switch(req.params.timespan) {
				case 'hourly':
					//every 10 minutes for the last 25 hours
					start = '25 hours';
					minutes = 10;
					break;
				case 'daily':
					//every 10 minutes for the last 8 days
					start = '8 days';
					minutes = 10;
					break;
				case 'weekly':
					//every 30 minutes for the last 5 weeks
					start = '5 weeks';
					minutes = 30;
					break;
				case 'monthly':
					//every 30 minutes for the last 13 months
					start = '13 months';
					minutes = 60;
					break;
			}

			var query = _buildHistoricalQuery(start, minutes);

			dbClient.query(query, [req.params.building], function(err, result) {
				if (err) throw err;

				var data = [];

				// Build the array to return
				for(var i = 0, len = result.rows.length; i < len; i++) {
					data.push({
						demand: parseFloat(result.rows[i].demand),
						production: parseFloat(result.rows[i].production),
						interval: result.rows[i].interval,
					});
				}

				res.status(200).send(data); // send response

				done(); // close db connection
			});
		});
	});
};

exports.percentzne = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		dbClient.query('SELECT DISTINCT "building" FROM "log"', [], function(err, result) {

			var buildings = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				buildings.push(result.rows[i].building);
			}

			// Validate parameters
			if(timespans.indexOf(req.params.timespan) === -1 ||
				(buildings.indexOf(req.params.building) === -1 &&
					req.params.building !== 'ALL') ) {
				res.status(400).send({
					message: 'Invalid request'
				});
				return;
			}

			var start = 0;
			var unit = '';
			var multiplier = 1;

			// Set the appropriate options to build the query
			// Get the multiplier to adjust ZNE goals according to timespan
			switch(req.params.timespan) {
				case 'hourly':
					// every hour for the last 8 hours
					start = 8;
					unit = 'hour';
					multiplier = 1 / (24 * 7) // weekly to hourly
					break;
				case 'daily':
					// every day for the last 7 days
					start = 7;
					unit = 'day';
					multiplier = 1 / 7 // weekly to daily
					break;
				case 'weekly':
					// every week for the last 4 weeks
					start = 4;
					unit = 'week';
					multiplier = 1 // weekly
					break;
				case 'monthly':
					// every month for the last 6 months
					start = 6;
					unit = 'month';
					multiplier = 4 // weekly to monthly
					break;
			}

			// Adjust the ZNE goals from weekly to the time span in question
			var zne_adjusted = {};

			for(var goal in zne_goals) {
				zne_adjusted[goal] = zne_goals[goal] * multiplier;
			}

			var query = '';

			if(req.params.building === 'ALL') {
				query = _buildPercentQueryAll(start, unit);

				dbClient.query(query, [], function(err, result) {
					if (err) throw err;

					var data = {};

					// Build the array to return
					for(var i = 0, len = result.rows.length; i < len; i++) {

						if(result.rows[i].building !== null) {

							if(!data.hasOwnProperty(result.rows[i].building)) {
								data[result.rows[i].building] = [];
							}

							var percent = 0;
							if(result.rows[i].kw !== null) {
								percent = (1 - (parseFloat(result.rows[i].kw) / zne_adjusted[result.rows[i].building])) * 100;
							}

							data[result.rows[i].building].push({
								interval: result.rows[i].interval,
								percent: percent,
							});
						}
					}

					res.status(200).send(data); // send response

					done(); // close db connection
				});
			}
			else {
				query = _buildPercentQuery(start, unit);

				dbClient.query(query, [req.params.building], function(err, result) {
					if (err) throw err;

					var data = [];

					// Build the array to return
					for(var i = 0, len = result.rows.length; i < len; i++) {

						var percent = 0;
						if(result.rows[i].kw !== null) {
							percent = (1 - (parseFloat(result.rows[i].kw) / zne_adjusted[req.params.building])) * 100;
						}

						data.push({
							interval: result.rows[i].interval,
							percent: percent,
						});
					}

					res.status(200).send(data); // send response

					done(); // close db connection
				});
			}		
		});
	});
};


function _buildPercentQueryAll(start, unit) {
	var start = `${start} ${unit}s`;
	var interval = `1 ${unit}`;

	return `
		SELECT "series"."interval",
				"values"."building",
			ROUND((("values"."kitchen" + "values"."plugs" + "values"."lights" + "values"."ev") - "values"."solar") / 1000, 2) as "kw"
		FROM (
			SELECT date_trunc('${unit}',  "datetime") as "interval",
				SUM("kitchen") as "kitchen",
				SUM("plugs") as "plugs",
				SUM("lights") as "lights",
				SUM("solar") as "solar",
				SUM("ev") as "ev",
				"building"
			FROM "log"
			WHERE "datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'
			GROUP BY "building", "interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'),
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${interval}'),
			'${interval}') as "interval"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;
}

function _buildPercentQuery(start, unit) {

	var start = `${start} ${unit}s`;
	var interval = `1 ${unit}`;

	return `
		SELECT "series"."interval",
			ROUND((("values"."kitchen" + "values"."plugs" + "values"."lights" + "values"."ev") - "values"."solar") / 1000, 2) as "kw"
		FROM (
			SELECT date_trunc('${unit}',  "datetime") as "interval",
				SUM("kitchen") as "kitchen",
				SUM("plugs") as "plugs",
				SUM("lights") as "lights",
				SUM("solar") as "solar",
				SUM("ev") as "ev"
			FROM "log"
			WHERE "datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'
			AND "building" = $1
			GROUP BY "interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'),
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${interval}'),
			'${interval}') as "interval"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;
}

function _buildHistoricalQuery(start, minutes) {

	var interval = minutes+" minutes";
	var seconds = minutes * 60;

	return `
		SELECT "series"."interval",
			ROUND(("values"."kitchen" + "values"."plugs" + "values"."lights" + "values"."ev") / 1000, 2) as "demand",
			ROUND("values"."solar" / 1000, 2) as "production"
		FROM (
			SELECT to_timestamp(ceil(extract('epoch' from "datetime") / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC' as "interval",
				AVG("kitchen") as "kitchen",
				AVG("plugs") as "plugs",
				AVG("lights") as "lights",
				AVG("solar") as "solar",
				AVG("ev") as "ev"
			FROM "log"
			WHERE "datetime" > NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}' + INTERVAL '${interval}'
			AND "building" = $1
			GROUP BY "interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
				to_timestamp(ceil(extract('epoch' from max("datetime") - INTERVAL '${start}') / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC' + INTERVAL '${interval}',
				to_timestamp(ceil(extract('epoch' from max("datetime")) / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC',
				'${interval}') as "interval"
			FROM "log"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;
}