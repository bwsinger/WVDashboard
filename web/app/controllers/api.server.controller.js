'use strict';

var pg = require('pg'),
	connString = 'postgres://postgres:postgres@172.18.0.2:5432/feed',
	buildings = ['1590', '1650'],
	timespans = ['hourly', 'daily', 'weekly', 'monthly'];

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
			FROM log
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC
	`;
}

exports.leaderboard = function(req, res) {
	res.status(200).send('Leaderboard');
};

exports.current = function(req, res) {
	// return average of last 10 minutes of data in the database for the passed building in Watts
	// TODO handle no data

	if(buildings.indexOf(req.params.building) === -1) {
		res.status(400).send({
			message: 'Invalid building'
		});
		return;
	}

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		var query = 'SELECT ROUND(AVG("kitchen"), 2) as "kitchen", \
							ROUND(AVG("plugs"), 2) as "plugs", \
							ROUND(AVG("lights"), 2) as "lights", \
							ROUND(AVG("solar"), 2) as "solar", \
							ROUND(AVG("ev"), 2) as "ev" \
					FROM (SELECT * FROM "log" \
						WHERE "building" = $1 \
						ORDER BY "datetime" DESC \
						LIMIT 10) as lastTen';

		dbClient.query(query, [req.params.building], function(err, result) {
			if (err) throw err;

			res.status(200).send({
				kitchen: parseFloat(result.rows[0].kitchen),
				plugs: parseFloat(result.rows[0].plugs),
				lights: parseFloat(result.rows[0].lights),
				solar: parseFloat(result.rows[0].solar),
				ev: parseFloat(result.rows[0].ev),
			});

			done();
		});

	});
};

exports.historical = function(req, res) {

	if(timespans.indexOf(req.params.time) === -1 || buildings.indexOf(req.params.building) === -1) {
		res.status(400).send({
			message: 'Invalid request'
		});
		return;
	}

	var start = '';
	var minutes = 0;

	switch(req.params.time) {
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
			start = '5 weeks';
			minutes = 30;
			break;
		case 'monthly':
			start = '13 months';
			minutes = 30;
			break;
	}

	pg.connect(connString, function(err, dbClient, done) {
		if(err) throw err;

		var query = _buildHistoricalQuery(start, minutes);

		dbClient.query(query, [req.params.building], function(err, result) {
			if (err) throw err;

			console.log(result.rows[0]);

			var data = [];

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

			res.status(200).send(data);

			done();
		});

	});

};

exports.percentzne = function(req, res) {
	res.status(200).send('Percent ZNE for building '+req.params.building+' ('+req.params.time+')');
};
