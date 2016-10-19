'use strict';

var pg = require('pg'),
	moment = require('moment'),
	connString = 'postgres://postgres:postgres@172.18.0.2:5432/feed',
	buildings = ['1590', '1650'],
	timespans = ['hourly', 'daily', 'weekly', 'monthly'];

exports.leaderboard = function(req, res) {

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		// gets the total kw since the start of the week (Monday) for each building
		var query = `
			SELECT "building",
					ROUND(((SUM("kitchen") + SUM("plugs") + SUM("lights") + SUM("ev")) - SUM("solar")) / 1000, 2) as "kw"
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

			var zne_goals = {
				'1590': 40000,
			};

			var zne_ratio = .75;
			var exaggeration_factor = .05;

			var minutes_in_week = 60*24*7; // minutes * hours * days
			var minutes_so_far = moment().diff(moment().startOf('isoWeek')) / (1000 * 60); // ms -> minutes
			var minute_ratio = minutes_so_far / minutes_in_week;

			var positions = {
				'ZNE': zne_ratio * minute_ratio, // location of zne "line" for current day
			};

			for(var building in zne_goals) {
				var percent_used = (current_kw[building] / zne_goals[building]) / minute_ratio; // how much have we used?
				percent_used = 1+(1+exaggeration_factor)*(percent_used-1); //do exaggeration
				positions[building] = positions['ZNE'] * (1/percent_used); // calculate position on track
			}

			res.status(200).send(positions); // send response

			done(); // close db connection
		});
	});
};

exports.current = function(req, res) {
	// return average of last 10 minutes of data in the database for the passed building in Watts
	// TODO handle no data (nulls) here? or handle at client?

	if(buildings.indexOf(req.params.building) === -1) {
		res.status(400).send({
			message: 'Invalid request'
		});
		return;
	}

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

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

			res.status(200).send({
				kitchen: parseFloat(result.rows[0].kitchen),
				plugs: parseFloat(result.rows[0].plugs),
				lights: parseFloat(result.rows[0].lights),
				solar: parseFloat(result.rows[0].solar),
				ev: parseFloat(result.rows[0].ev),
			}); // send response

			done(); // close db connection
		});
	});
};

exports.historical = function(req, res) {

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

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		var query = _buildHistoricalQuery(start, minutes);

		dbClient.query(query, [req.params.building], function(err, result) {
			if (err) throw err;

			var data = [];

			// Build the array to return
			for(var i = 0, len = result.rows.length; i < len; i++) {
				data.push({
					kitchen: parseFloat(result.rows[i].kitchen),
					plugs: parseFloat(result.rows[i].plugs),
					lights: parseFloat(result.rows[i].lights),
					solar: parseFloat(result.rows[i].solar),
					ev: parseFloat(result.rows[i].ev),
					interval: result.rows[i].interval,
				});
			}

			res.status(200).send(data); // send response

			done(); // close db connection
		});
	});
};

exports.percentzne = function(req, res) {

	// Validate parameters
	if(timespans.indexOf(req.params.timespan) === -1 ||
		(buildings.indexOf(req.params.building) === -1 &&
			req.params.building !== 'ALL') ) {
		res.status(400).send({
			message: 'Invalid request'
		});
		return;
	}

	res.status(200).send('Percent ZNE for building '+req.params.building+' ('+req.params.timespan+')');
};

function _buildHistoricalQuery(start, minutes) {

	var interval = minutes+" minutes";
	var seconds = minutes * 60;

	return `
		SELECT "series"."interval",
			COALESCE("values"."kitchen", 0) as "kitchen",
			COALESCE("values"."plugs", 0) as "plugs",
			COALESCE("values"."lights", 0) as "lights",
			COALESCE("values"."solar", 0) as "solar",
			COALESCE("values"."ev", 0) as "ev"
		FROM (
			SELECT to_timestamp(ceil(extract('epoch' from "datetime") / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC' as "interval",
				ROUND(AVG("kitchen"), 2) as "kitchen",
				ROUND(AVG("plugs"), 2) as "plugs",
				ROUND(AVG("lights"), 2) as "lights",
				ROUND(AVG("solar"), 2) as "solar",
				ROUND(AVG("ev"), 2) as "ev"
			FROM "log"
			WHERE "datetime" > NOW() - INTERVAL '${start}' + INTERVAL '${interval}'
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