'use strict';

var db = require('../../config/db');

module.exports = {
	periodAll: periodAll,
};

// get total kwh over an arbitrary period
function periodAll(start, end, callback) {
	
	var query = `
			SELECT
				"building",
				ROUND(
					(
						SUM("hvac"/60) +
						SUM("kitchen"/60) +
						SUM("plugs"/60) +
						SUM("lights"/60)
					) / 1000,
					2
				) as "kwh"
			FROM "hobodata"
			WHERE "datetime" > $1
			AND "datetime" <= $2
			GROUP BY "building"
			ORDER BY "building"
		`,
		format = 'Y-MM-DD HH:mm:ss',
		params = [
			start.format(format),
			end.format(format)
		];

	db.query(query, params, handleResult);

	function handleResult(err, result) {
		if(err) {
			throw err;
		}

		// Build object with week-to-date kwh values
		var current_kwh = {};

		for(var i = 0, len = result.rows.length; i < len; i++) {
			current_kwh[result.rows[i].building] = parseFloat(result.rows[i].kwh);
		}

		return callback(current_kwh);
	}
}