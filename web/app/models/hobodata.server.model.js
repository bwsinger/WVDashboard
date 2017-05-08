'use strict';

var db = require('../../config/db');

// Get the data for all buildings with row numbers
// Grab the last 10 rows for each building
// Average the values
exports.current = function() {

	var query = `
		SELECT
			"d"."building",
			BOOL_AND("b"."has_ev") as "has_ev",
			BOOL_AND("b"."has_lab") as "has_lab",
			MAX("d"."datetime") as "latest",
			ROUND(AVG("d"."hvac"), 2) as "hvac",
			ROUND(AVG("d"."kitchen"), 2) as "kitchen",
			ROUND(AVG("d"."plugs"), 2) as "plugs",
			ROUND(AVG("d"."lights"), 2) as "lights",
			ROUND(AVG("d"."solar"), 2) as "solar",
			ROUND(AVG("d"."ev"), 2) as "ev",
			ROUND(AVG("d"."lab"), 2) as "lab"
		FROM (
			SELECT
				"building",
				"datetime",
				row_number() OVER (
					PARTITION BY "building"
					ORDER BY "datetime" DESC
				) as "rank",
				"hvac",
				"kitchen",
				"plugs",
				"lights",
				"solar",
				"ev",
				"lab"
			FROM "hobodata"
			ORDER BY "datetime" DESC
		) as "d"
		JOIN "buildings" as "b"
		ON "b"."id" = "d"."building"
		WHERE "d"."rank" <= 10
		GROUP BY "d"."building"
		ORDER BY "d"."building"
	`;

	return db.query(query)
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to lookup current data '+err.message);
		});
};

// return average of last 10 minutes of data in the database for the passed building in Watts

//Last 10 minutes doesn't work because of offset between when the hobo data is
//uploaded / updated and the time when the python script downloads it and inserts it
//into the database, so grab the last 10 instead

exports.currentByBuilding = function(id) {

	var query = `
		SELECT
			MAX("datetime") as "latest",
			ROUND(AVG("hvac"), 2) as "hvac",
			ROUND(AVG("kitchen"), 2) as "kitchen",
			ROUND(AVG("plugs"), 2) as "plugs",
			ROUND(AVG("lights"), 2) as "lights",
			ROUND(AVG("solar"), 2) as "solar",
			ROUND(AVG("ev"), 2) as "ev",
			ROUND(AVG("lab"), 2) as "lab"
		FROM (
			SELECT
				"datetime",
				"hvac",
				"kitchen",
				"plugs",
				"lights",
				"solar",
				"ev",
				"lab"
			FROM "hobodata"
			WHERE "building" = $1
			ORDER BY "datetime" DESC
			LIMIT 10
		) as "lastTen"`;
	//AND "datetime" >= now() at time zone 'America/Los_Angeles' - interval '10 minutes'

	return db.query(query, [id])
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to lookup current data '+err.message);
		});

};

// Grab all the hobo data for the date range requested for a specific building

// Create the demand and production totals based on the passed set of enduses
// Create the interval for each reading based upon the epoch (which gives us)
// the necessary resolution

// Group by interval (so that all data recorded over the period will be summed
// and each period yields a single reading)

// Create a series of all the periods that could exist over the requested time period
// Join the two so we get a complete set of periods. If we don't have data for a period,
// it will be a NULL
exports.historical = function(building, timespan, enduses) {
	var start = '', minutes = 0;

	// Set the appropriate options to build the query
	switch(timespan) {
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

	var interval = minutes+' minutes',
		seconds = minutes * 60,
		demandColumns = [];

	for(var use in enduses) {
		if(enduses[use]) {
			demandColumns.push('AVG("data"."'+use+'")');
		}
	}

	var demandString = demandColumns.length ? demandColumns.join(' + ') : 0;

	var query = `
		SELECT "series"."interval", "values"."demand", "values"."production"
		FROM (
			SELECT to_timestamp(ceil(extract('epoch' from "data"."datetime") / ${seconds}) * ${seconds}) AT TIME ZONE 'UTC' as "interval",
				ROUND((${demandString}) / 1000, 2) as "demand",
				ROUND(AVG("data"."solar") / 1000, 2) as "production"
			FROM (
				SELECT
					"datetime",
					"hvac",
					"kitchen",
					"plugs",
					"lights",
					"solar",
					"ev",
					"lab"
				FROM "hobodata"
				WHERE "building" = $1
				AND "datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${start}'
			) as "data"
			GROUP BY "interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
				to_timestamp(ceil(extract('epoch' from now() - INTERVAL '${start}') / ${seconds}) * ${seconds}) AT TIME ZONE 'America/Los_Angeles',
				to_timestamp(ceil(extract('epoch' from now()) / ${seconds}) * ${seconds}) AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${interval}',
				'${interval}') as "interval"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;

	return db.query(query, [building])
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to lookup historical data '+err.message);
		});
};

exports.period = function(start, end) {
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

	return db.query(query, params)
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to lookup usage data '+err.message);
		});
};

exports.percent = function(timespan) {
	var query = _buildPercentQuery(timespan, false);

	return db.query(query)
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to fetch percent usage: '+err.message);
		});
};

exports.percentBuilding = function(building, timespan) {
	var query = _buildPercentQuery(timespan, true);

	return db.query(query, [building])
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to fetch percent usage for building: '+err.message);
		});
};

// Grab all the hobo data for the date range requested for a specific building
// Note that the timestamp for each data point is trucated to the period it will belong to

// Group by interval (so that all data recorded over the period will be summed
// and each period yields a single reading)

// Create a series of all the periods that could exist over the requested time period
// Join the two so we get a complete set of periods. If we don't have data for a period, it will
// be a NULL
exports.percentEnduse = function(building, timespan) {
	var unit = _getPercentUnit(timespan),
		start = _getPercentStart(timespan),
		startText = `${start} ${unit}s`,
		interval = `1 ${unit}`;

	var query = `
		SELECT "series"."interval",
				ROUND(("values"."hvac") / 1000, 2) as "hvac",
				ROUND(("values"."kitchen") / 1000, 2) as "kitchen",
				ROUND(("values"."plugs") / 1000, 2) as "plugs",
				ROUND(("values"."lights") / 1000, 2) as "lights"
		FROM (
			SELECT 
				"data"."interval",
				SUM("data"."hvac"/60) as "hvac",
				SUM("data"."kitchen"/60) as "kitchen",
				SUM("data"."plugs"/60) as "plugs",
				SUM("data"."lights"/60) as "lights"
			FROM (
				SELECT
					date_trunc('${unit}',  "hobodata"."datetime") as "interval",
					"hobodata"."hvac",
					"hobodata"."kitchen",
					"hobodata"."plugs",
					"hobodata"."lights"
				FROM "hobodata"
				WHERE "hobodata"."building" = $1
				AND "hobodata"."datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${startText}'
			) as "data"
			GROUP BY "data"."interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${startText}'),
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${interval}'),
			'${interval}') as "interval"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;

	return db.query(query, [building])
		.then(function(result) {
			return result;
		})
		.catch(function(err) {
			console.log('Unable to fetch percent usage for building enduses: '+err.message);
		});
};

// Helpers

// How far back should the query look
function _getPercentStart(timespan) {
	switch(timespan) {
		case 'hourly':
			// every hour for the last 8 hours
			return 8;
		case 'daily':
			// every day for the last 7 days
			return 7;
		case 'weekly':
			// every week for the last 4 weeks
			return 4;
		case 'monthly':
			// every month for the last 6 months
			return 6;
	}
}

// Which unit of time?
function _getPercentUnit(timespan) {
	switch(timespan) {
		case 'hourly':
			// every hour for the last 8 hours
			return 'hour';
		case 'daily':
			// every day for the last 7 days
			return 'day';
		case 'weekly':
			// every week for the last 4 weeks
			return 'week';
		case 'monthly':
			// every month for the last 6 months
			return 'month';
	}
}

// Grab all the hobo data for the date range requested (optionally limited to a single building)
// Note that the timestamp for each data point is trucated to the period it will belong to

// Group by building and by interval (so that all data recorded over the period will be summed
// and each period yields a single reading)

// Create a series of all the periods that could exist over the requested time period
// Join the two so we get a complete set of periods. If we don't have data for a period, it will
// be a NULL
function _buildPercentQuery(timespan, filter) {
	var unit = _getPercentUnit(timespan),
		start = _getPercentStart(timespan),
		startText = `${start} ${unit}s`,
		interval = `1 ${unit}`,
		condition = filter ? 'AND "hobodata"."building" = $1' : '';

	return `
		SELECT "series"."interval",
				"values"."building",
			ROUND(("values"."hvac" + "values"."kitchen" + "values"."plugs" + "values"."lights") / 1000, 2) as "kwh"
		FROM (
			SELECT 
				"data"."building",
				"data"."interval",
				SUM("data"."hvac"/60) as "hvac",
				SUM("data"."kitchen"/60) as "kitchen",
				SUM("data"."plugs"/60) as "plugs",
				SUM("data"."lights"/60) as "lights"
			FROM (
				SELECT
					"hobodata"."building",
					date_trunc('${unit}',  "hobodata"."datetime") as "interval",
					"hobodata"."hvac",
					"hobodata"."kitchen",
					"hobodata"."plugs",
					"hobodata"."lights"
				FROM "hobodata"
				WHERE "hobodata"."datetime" >= NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${startText}'
				${condition}
			) as "data"
			GROUP BY "data"."building", "data"."interval"
		) as "values"
		RIGHT JOIN (
			SELECT generate_series(
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${startText}'),
			date_trunc('${unit}', NOW() AT TIME ZONE 'America/Los_Angeles' - INTERVAL '${interval}'),
			'${interval}') as "interval"
		) as "series"
		USING("interval")
		ORDER BY "series"."interval" DESC`;
}
