'use strict';

var pg = require('pg'),
	moment = require('moment'),
	config = require('../../config/config');

var connString = config.connString,
	timespans = ['hourly', 'daily', 'weekly', 'monthly'],
	zne_goals = {
		'1590': {
			total: 10000,
			hvac: 1,
			kitchen: 850,
			plugs: 4000,
			lights: 5000,
		}
	}; // TODO generate this list from db

exports.leaderboard = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		// gets the total kw since the start of the week (Monday) for each building
		var query = `
			SELECT "building",
					ROUND( (SUM("hvac") + SUM("kitchen") + SUM("plugs") + SUM("lights")) / 1000, 2) as "kw"
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
				var percent_used = current_kw[building] / (zne_goals[building].total * minute_ratio);

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

			var query = `SELECT ROUND(AVG("hvac"), 2) as "hvac",
								ROUND(AVG("kitchen"), 2) as "kitchen",
								ROUND(AVG("plugs"), 2) as "plugs",
								ROUND(AVG("lights"), 2) as "lights",
								ROUND(AVG("solar"), 2) as "solar",
								ROUND(AVG("ev"), 2) as "ev",
								MAX("datetime") as "latest"
						FROM (
							SELECT * FROM "log"
							WHERE "building" = $1
							ORDER BY "datetime" DESC
							LIMIT 10
						) as "lastTen"`;

			dbClient.query(query, [req.params.building], function(err, result) {
				if (err) throw err;

				var data = {
					hvac: result.rows[0].hvac !== null ? -parseFloat(result.rows[0].hvac) : 0,
					kitchen: result.rows[0].kitchen !== null ? -parseFloat(result.rows[0].kitchen) : 0,
					plugs: result.rows[0].plugs !== null ? -parseFloat(result.rows[0].plugs) : 0,
					lights: result.rows[0].lights !== null ? -parseFloat(result.rows[0].lights) : 0,
					solar: result.rows[0].solar !== null ? parseFloat(result.rows[0].solar) : 0,
					ev: result.rows[0].ev !== null ? -parseFloat(result.rows[0].ev) : 0,
					latest: result.rows[0].latest,
				};

				data.total = data.solar+data.hvac+data.kitchen+data.plugs+data.lights+data.ev;

				data.total = Math.round(data.total);
				data.hvac = Math.round(data.hvac);
				data.kitchen = Math.round(data.kitchen);
				data.plugs = Math.round(data.plugs);
				data.lights = Math.round(data.lights);
				data.solar = Math.round(data.solar);
				data.ev = Math.round(data.ev);

				res.status(200).send(data); // send response

				done(); // close db connection
			});
		});
	});
};

exports.historical = function(req, res) {

	var enabled = {
		'hvac': true,
		'lights': true,
		'plugs': true,
		'kitchen': true,
		'ev': true,
	};

	if(req.query.disabled) {
		var passed = req.query.disabled.split(',');

		for(var use in enabled) {
			if(passed.indexOf(use) !== -1) {
				enabled[use] = false;
			}
		}
	}

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
					minutes = 30;
					break;
			}

			var query = _buildHistoricalQuery(start, minutes, enabled);

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

exports.percent = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		dbClient.query('SELECT DISTINCT "building" FROM "log"', [], function(err, result) {

			var buildings = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				buildings.push(result.rows[i].building);
			}

			// Validate parameters
			if(timespans.indexOf(req.params.timespan) === -1 ||
				(buildings.indexOf(req.params.building) === -1 && req.params.building !== 'ALL') ||
					(req.params.type !== 'building' && req.params.type !== 'enduse') ) {

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

			for(var building in zne_goals) {

				zne_adjusted[building] = {};

				for(var goal in zne_goals[building]) {
					zne_adjusted[building][goal] = zne_goals[building][goal] * multiplier;
				}
			}

			var query = req.params.type === 'building' ? _buildPercentBuildingQuery(start, unit) : _buildPercentUseQuery(start, unit);
			var query_params = req.params.building === 'ALL' ? ['%'] : [req.params.building]

			dbClient.query(query, query_params, function(err, result) {
				if (err) throw err;

				if(req.params.type === 'building') {

					var data = {};
					var intervals = [];
					var actual_buildings = [];

					// Grab all the intervals and buildings in the result
					for(var i = 0, len = result.rows.length; i < len; i++) {
						var current = result.rows[i].interval.toISOString();
						if(intervals.indexOf(current) === -1) {
							intervals.push(current);
						}

						if(result.rows[i].building !== null && actual_buildings.indexOf(result.rows[i].building) === -1) {
							actual_buildings.push(result.rows[i].building)
						}
					};

					// Build a 0 result set for each interval and building
					for(var j = 0, len_j = intervals.length; j < len_j; j++) {
						data[intervals[j]] = {};

						for(var k = 0, len_k = actual_buildings.length; k < len_k; k++) {
							data[intervals[j]][actual_buildings[k]] = 0;
						}
					}

					// Change any values that exist in the result
					for(var i = 0, len = result.rows.length; i < len; i++) {

						// building null means an interval with no data from any building
						// kw null means an interval with no data for that building
						if(result.rows[i].building !== null && result.rows[i].kw !== null) {

							// calculate the percent of the zne
							var percent = (parseFloat(result.rows[i].kw) / zne_adjusted[result.rows[i].building].total) * 100;
							data[result.rows[i].interval.toISOString()][result.rows[i].building] = percent;
						}
					}

					var newData = [];

					// Make the interval a property of the object and return an array
					for(var interval in data) {
						data[interval]['interval'] = interval;
						newData.push(data[interval]);
					}

					res.status(200).send(newData); // send response
				}
				else {

					var data = [];

					for(var i = 0, len = result.rows.length; i < len; i++) {
						data.push({
							interval: result.rows[i].interval.toISOString(),
							hvac: result.rows[i].hvac !== null ? (parseFloat(result.rows[i].hvac) / zne_adjusted[req.params.building].hvac) * 100 : 0,
							kitchen: result.rows[i].kitchen !== null ? (parseFloat(result.rows[i].kitchen) / zne_adjusted[req.params.building].kitchen) * 100 : 0,
							plugs: result.rows[i].plugs !== null ? (parseFloat(result.rows[i].plugs) / zne_adjusted[req.params.building].plugs) * 100 : 0,
							lights: result.rows[i].lights !== null ? (parseFloat(result.rows[i].lights) / zne_adjusted[req.params.building].lights) * 100 : 0,
						});
					}

					res.status(200).send(data);
				}

				done(); // close db connection

			});
		});
	});
};

function _buildPercentBuildingQuery(start, unit) {
	var start = `${start} ${unit}s`;
	var interval = `1 ${unit}`;

	return `
		SELECT "series"."interval",
				"values"."building",
			ROUND(("values"."hvac" + "values"."kitchen" + "values"."plugs" + "values"."lights") / 1000, 2) as "kw"
		FROM (
			SELECT date_trunc('${unit}',  "datetime") as "interval",
				SUM("hvac") as "hvac",
				SUM("kitchen") as "kitchen",
				SUM("plugs") as "plugs",
				SUM("lights") as "lights",
				"building"
			FROM "log"
			WHERE "datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'
			AND "building" LIKE $1
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

function _buildPercentUseQuery(start, unit) {
	var start = `${start} ${unit}s`;
	var interval = `1 ${unit}`;

	return `
		SELECT "series"."interval",
				ROUND(("values"."hvac") / 1000, 2) as "hvac",
				ROUND(("values"."kitchen") / 1000, 2) as "kitchen",
				ROUND(("values"."plugs") / 1000, 2) as "plugs",
				ROUND(("values"."lights") / 1000, 2) as "lights"
		FROM (
			SELECT date_trunc('${unit}',  "datetime") as "interval",
				SUM("hvac") as "hvac",
				SUM("kitchen") as "kitchen",
				SUM("plugs") as "plugs",
				SUM("lights") as "lights",
				"building"
			FROM "log"
			WHERE "datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'
			AND "building" = $1
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

function _buildHistoricalQuery(start, minutes, enabled) {

	var interval = minutes+" minutes";
	var seconds = minutes * 60;

	var uses = []
	for(var use in enabled) {
		if(enabled[use]) {
			uses.push('"values"."'+use+'"');
		}
	}

	var demandString = uses.length ? uses.join(" + ") : 0;

	return `
		SELECT "series"."interval",
			ROUND((${demandString}) / 1000, 2) as "demand",
			ROUND("values"."solar" / 1000, 2) as "production"
		FROM (
			SELECT to_timestamp(ceil(extract('epoch' from "datetime") / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC' as "interval",
				AVG("hvac") as "hvac",
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