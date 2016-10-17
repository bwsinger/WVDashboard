'use strict';

var pg = require('pg'),
	client = new pg.Client('postgres://postgres:postgres@172.18.0.2:5432/feed');

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
	res.status(200).send('Historical data for building '+req.params.building+' ('+req.params.time+')');
};

exports.percentzne = function(req, res) {
	res.status(200).send('Percent ZNE for building '+req.params.building+' ('+req.params.time+')');
};
