'use strict';

var pg = require('pg'),
	client = new pg.Client('postgres://postgres:postgres@172.18.0.2:5432/feed');

function _buildHistoricalQuery(interval, period) {

	return `
		SELECT "series"."interval",
			COALESCE("values"."kitchen", 0) as "kitchen",
			COALESCE("values"."plugs", 0) as "plugs",
			COALESCE("values"."lights", 0) as "lights",
			COALESCE("values"."solar", 0) as "solar",
			COALESCE("values"."ev", 0) as "ev"
		FROM (
			SELECT to_timestamp(ceil(extract('epoch' from "datetime") / ${period}) * ${period}) AT TIME ZONE 'UTC' as "interval",
				ROUND(AVG("kitchen"), 2) as "kitchen",
				ROUND(AVG("plugs"), 2) as "plugs",
				ROUND(AVG("lights"), 2) as "lights",
				ROUND(AVG("solar"), 2) as "solar",
				ROUND(AVG("ev"), 2) as "ev"
			FROM "log"
			WHERE "datetime" > NOW() - INTERVAL ${interval}
			GROUP BY "interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
				to_timestamp(ceil(extract('epoch' from max("datetime") - INTERVAL ${interval}) / ${period}) * ${period}) AT TIME ZONE 'UTC',
				to_timestamp(ceil(extract('epoch' from max("datetime")) / ${period}) * ${period}) AT TIME ZONE 'UTC',
				${interval}) as "interval"
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
	// TODO sanitize building number
	// TODO handle no data

	client.connect(function(err) {
		if (err) throw err;

		var query = 'SELECT AVG("kitchen") as "kitchen", \
							AVG("plugs") as "plugs", \
							AVG("lights") as "lights", \
							AVG("solar") as "solar", \
							AVG("ev") as "ev" \
						FROM (SELECT * FROM "log" \
								WHERE "building" = $1 \
								ORDER BY "datetime" DESC \
								LIMIT 10) as lastTen';

		client.query(query, [req.params.building], function(err, result) {
			if (err) throw err;

			res.status(200).send({
				kithen: result.rows[0].kitchen,
				plugs: result.rows[0].plugs,
				lights: result.rows[0].lights,
				solar: result.rows[0].solar,
				ev: result.rows[0].ev,
			})
		});
	});
};

exports.historical = function(req, res) {

	var period = '';
	var interval = 0;

	switch(req.params.time) {
		case 'hourly':
			//every 10 minutes for the last 25 hours
			period = '25 hours';
			interval = 10;
			break;
		case 'daily':
			//every 10 minutes for the last 8 days
			period = '8 days';
			interval = 10;
			break;
		case 'weekly':
			period = '5 weeks';
			interval = 30;
			break;
		case 'monthly':
			period = '13 months';
			interval = 30;
			break;
	}

	interval *= 60; //convert minutes to seconds

	res.status(200).send('Historical data for building '+req.params.building+' ('+req.params.time+')');
};

exports.percentzne = function(req, res) {
	res.status(200).send('Percent ZNE for building '+req.params.building+' ('+req.params.time+')');
};
