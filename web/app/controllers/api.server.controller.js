'use strict';

var pg = require('pg'),
	moment = require('moment'),
	config = require('../../config/config'),
	request = require('request'),
	URL = require('url');

exports.weather = function(req, res) {

	var key = 'b7f090a458a3a954',
		url = `https://api.wunderground.com/api/${key}/conditions/q/CA/Davis.json`;

	request(url, function(err, response, body) {
		if(err) {
			return res.status(500).send({ message: err.message });
		}

		if(response.statusCode !== 200) {
			return res.status(500).send({ message: 'Bad response from weather API' });
		}
		var data = JSON.parse(body.trim());
		var icon = URL
			.parse(data.current_observation.icon_url)
			.path
			.split('/')
			.pop()
			.split('.')[0];

		res.status(200).send({
			temperature: data.current_observation.temp_f,
			icon: icon,
		});
	});
};

exports.getEndUses = function(req, res, next) {
	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		var query = `
			SELECT "has_ev", "has_lab" FROM "buildings"
			WHERE "id" = $1`;

		dbClient.query(query, [req.params.building], function(err, result) {
			if(err) {
				throw err;
			}

			req.enduses = _buildEndUses(
				result.rows[0].has_ev,
				result.rows[0].has_lab
			);

			done();
			next();
		});
	});
};

exports.validateTimespan = function(req, res, next, value) {
	var timespans = ['hourly', 'daily', 'weekly', 'monthly'];

	if(timespans.indexOf(value) === -1) {
		res.status(400).send({
			message: 'Invalid timespan'
		});
	}
	else {
		next();
	}
};

exports.validateBuilding = function(req, res, next, value) {
	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query('SELECT "id" FROM "buildings"', [], function(err, result) {
			if(err) {
				throw err;
			}

			var buildings = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				buildings.push(result.rows[i].id);
			}

			done();

			if(buildings.indexOf(parseInt(value)) === -1) {
				res.status(400).send({
					message: 'Invalid building'
				});
			}
			else {
				next();
			}
		});
	});
};

exports.goals = function(req, res, next) {
	var query = `
		SELECT 
			"g"."building",
			"g"."season",
			"s"."name",
			"g"."hour",

			"g"."hvac_weekday", 	"g"."hvac_weekend",
			"g"."kitchen_weekday", 	"g"."kitchen_weekend",
			"g"."lights_weekday", 	"g"."lights_weekend",
			"g"."plugs_weekday", 	"g"."plugs_weekend"

		FROM "goals" AS "g"
		JOIN "seasons" AS "s"
		ON "g"."season" = "s"."id"`;

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [], function(err, result) {
			if(err) {
				throw err;
			}

			done();

			var goals = {};

			for(var i = 0, len = result.rows.length; i < len; i++) {

				var g = result.rows[i];

				if(!goals.hasOwnProperty(g.building)) {
					goals[g.building] = {};
				}

				if(!goals[g.building].hasOwnProperty(g.name)) {
					goals[g.building][g.name] = {};
				}

				goals[g.building][g.name][g.hour] = {
					hvac: {
						weekday: parseFloat(g.hvac_weekday),
						weekend: parseFloat(g.hvac_weekend),
					},
					kitchen: {
						weekday: parseFloat(g.kitchen_weekday),
						weekend: parseFloat(g.kitchen_weekend),
					},
					lights: {
						weekday: parseFloat(g.lights_weekday),
						weekend: parseFloat(g.lights_weekend),
					},
					plugs: {
						weekday: parseFloat(g.plugs_weekday),
						weekend: parseFloat(g.plugs_weekend),
					}
				};

				// use spring data for all seasons for now
				goals[g.building].summer = goals[g.building].spring;
				goals[g.building].fall = goals[g.building].spring;
				goals[g.building].winter = goals[g.building].spring;
			}

			// use 215 data for all buildings for now
			goals[2] = goals[1];
			goals[3] = goals[1];
			goals[4] = goals[1];

			req.goals = goals;

			next();
		});
	});
};

exports.buildings = function(req, res) {

	var query = `
		SELECT "id",
				"name",
				"number", 
				"street"
		FROM "buildings"
		ORDER BY "street", "number"`;

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [], function(err, result) {
			if(err) {
				throw err;
			}

			res.status(200).send(result.rows);

			done();
		});
	});
};

exports.leaderboard = function(req, res) {

	// Start of the week is last Friday at noon
	var startFriday = moment().day(-2).hour(12).minute(0).seconds(0).millisecond(0);

	// End of the week is next Friday at noon
	var endFriday = moment().day(5).hour(12).minute(0).seconds(0).millisecond(0);

	// When to unfreeze the results? Monday at Midnight
	var unfreezeOn = moment().day(3).hour(0).minute(0).seconds(0).millisecond(0);

	// Freeze the results during the appropriate period
	var resultsFrozen = startFriday <= moment() && moment() < unfreezeOn;

	// Display data from the previous week
	if(resultsFrozen) {
		startFriday.subtract(7, 'days');
		endFriday.subtract(7, 'days');
	}

	// calculate goals per building for the week in question
	var goals = _calcGoalsAll(req.goals, startFriday, endFriday);

	// get total kwh per building for the week in question
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
	`;

	var format = 'Y-MM-DD HH:mm:ss',
		params = [
			startFriday.format(format),
			endFriday.format(format)
		];

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, params, function(err, result) {
			if(err) {
				throw err;
			}

			// Build object with week-to-date kwh values
			var current_kwh = {};

			for(var b in goals) {
				current_kwh[b] = null;
			}

			for(var i = 0, len = result.rows.length; i < len; i++) {
				current_kwh[result.rows[i].building] = parseFloat(result.rows[i].kwh);
			}

			// track length is 1, where should the finish line be?
			// need to allow some room for passing it
			var zne_final = 0.75;

			// TODO change this back to 0 once we have goals for the other buildings
			// this makes the apparent difference between horses small
			// var exaggeration_factor = 0;
			var exaggeration_factor = -0.8;

			// Caculate the ratio of the current time to the entire week to scale
			// the weekly zne to the current day

			// minutes between last friday noon and this friday noon
			var minutes_in_week = endFriday.diff(startFriday, 'minutes');

			// minutes since last friday noon
			// unless we're in the freeze period in which case
			// its just the total minutes in the week so the results don't change
			var minutes_so_far = resultsFrozen ? minutes_in_week : moment().diff(startFriday, 'minutes');

			var minute_ratio = minutes_so_far / minutes_in_week,
				zne_pos = zne_final * minute_ratio,
				positions = [],
				best_pos = 0;

			// Calculate the position of each building
			for(var building in goals) {

				var building_pos = null,
					percent_used = 0; // assume no energy data

				if(current_kwh[building] !== null) {
					// how much of the zne goal has been used
					// (compared to adjusted goal for the current day)
					percent_used = current_kwh[building] / (goals[building] * minute_ratio);

					//do exaggeration
					percent_used = 1 + (1 + exaggeration_factor) * (percent_used - 1);

					// calculate the position compared to the zne "line" for current day
					// Inverted because values lower than ZNE are good and higher are bad
					building_pos = zne_pos / percent_used;

					// if we're frozen, figure out which building was best
					if(resultsFrozen && building_pos > best_pos) {
						best_pos = building_pos;
					}
				}

				positions.push({
					building: building,
					position: building_pos,
				});
			}

			var sorted = positions.slice().sort(function(a, b) { return a.position < b.position; });

			for(var j = 0, lenj = positions.length; j < lenj; j++) {
				positions[j].place = sorted.indexOf(positions[j])+1;
				positions[j].good = positions[j].position >= zne_pos;

				// Show the trophy for first place
				positions[j].trophy = resultsFrozen && positions[j].place === 1;
			}

			// if we're frozen, the finish line should be lined up
			// with the winning building otherwise, don't show it
			res.status(200).send({
				finish: resultsFrozen ? best_pos : null,
				buildings: positions,
			}); // send response

			done(); // close db connection
		});
	});
};

exports.current = function(req, res) {
	// return average of last 10 minutes of data in the database for the passed building in Watts

	//Last 10 minutes doesn't work because of offset between when the hobo data is
	//uploaded / updated and the time when the python script downloads it and inserts it
	//into the database, so grab the last 10 instead

	//AND "datetime" >= now() at time zone 'America/Los_Angeles' - interval '10 minutes'

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

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [req.params.building], function(err, result) {
			if(err) {
				throw err;
			}

			var current = _buildCurrent(result.rows[0], req.enduses);
			current.building = req.params.building;
			res.status(200).send(current); // send response

			done(); // close db connection
		});
	});
};

exports.currentAll = function(req, res) {

	// Get the data for all buildings with row numbers
	// Grab the last 10 rows for each building
	// Average the values

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
		ORDER BY "d"."building" `;

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, function(err, result) {
			if(err) {
				throw err;
			}

			var data = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				var enduses = _buildEndUses(
					result.rows[i].has_ev,
					result.rows[i].has_lab
				);
				var current = _buildCurrent(result.rows[i], enduses);
				data.push(current);
			}

			res.status(200).send(data);

			done(); // close db connection
		});
	});

};

exports.historical = function(req, res) {

	var enabled = {};

	for(let use in req.enduses) {
		enabled[use] = true;
	}

	if(req.query.disabled) {
		var passed = req.query.disabled.split(',');

		for(let use in enabled) {
			if(passed.indexOf(use) !== -1) {
				enabled[use] = false;
			}
		}
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

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [req.params.building], function(err, result) {
			if(err) {
				throw err;
			}

			var data = [];

			// Build the array to return
			for(var i = 0, len = result.rows.length; i < len; i++) {
				data.push({
					demand: result.rows[i].demand !== null ? parseFloat(result.rows[i].demand) : null,
					production: result.rows[i].demand !== null ? parseFloat(result.rows[i].production) : null,
					interval: result.rows[i].interval,
				});
			}

			res.status(200).send(data); // send response

			done(); // close db connection
		});
	});
};

exports.percentAll = function(req, res) {

	var query = _buildPercentBuildingQuery(req.params.timespan, false);

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [], function(err, result) {
			if(err) {
				throw err;
			}

			var intervals = _getPercentIntervals(result),
				data = {};

			// Build a 0 result set for each interval and building
			for(var j = 0, len_j = intervals.length; j < len_j; j++) {
				data[intervals[j]] = {};

				for(var building in req.goals) {
					data[intervals[j]][building] = null;
				}
			}

			_doPercentAdjustment(data, result, req.params.timespan, req.goals);

			res.status(200).send(_transformPercentObject(data)); // send response

			done(); // close db connection
		});
	});
};

exports.percentBuilding = function(req, res) {

	var query = _buildPercentBuildingQuery(req.params.timespan, true);

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [req.params.building], function(err, result) {
			if(err) {
				throw err;
			}

			var intervals = _getPercentIntervals(result),
				data = {};

			// Build a 0 result set for each interval
			for(var j = 0, len_j = intervals.length; j < len_j; j++) {
				data[intervals[j]] = {};
				data[intervals[j]][req.params.building] = null;
			}

			_doPercentAdjustment(data, result, req.params.timespan, req.goals);

			res.status(200).send(_transformPercentObject(data)); // send response

			done(); // close db connection
		});
	});
};

exports.percentEnduse = function(req, res) {

	var query = _buildPercentUseQuery(req.params.timespan);

	pg.connect(config.connString, function(err, dbClient, done) {
		if(err) {
			throw err;
		}

		dbClient.query(query, [req.params.building], function(err, result) {
			if(err) {
				throw err;
			}

			var data = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {

				var row = result.rows[i],
					interval = row.interval.toISOString(),
					start = moment(interval),
					end = _addInterval(start, req.params.timespan),
					goals = {
						hvac: _calcGoal(req.goals[req.params.building], start, end, 'hvac'),
						lights: _calcGoal(req.goals[req.params.building], start, end, 'lights'),
						plugs: _calcGoal(req.goals[req.params.building], start, end, 'plugs'),
						kitchen: _calcGoal(req.goals[req.params.building], start, end, 'kitchen'),
					};

				data.push({
					interval: 	interval,
					HVAC: 		row.hvac !== null ? 	(parseFloat(row.hvac) / goals.hvac) * 100 		: null,
					Lights: 	row.lights !== null ? 	(parseFloat(row.lights) / goals.lights) * 100 	: null,
					Plugs: 		row.plugs !== null ? 	(parseFloat(row.plugs) / goals.plugs) * 100 	: null,
					Kitchen: 	row.kitchen !== null ? 	(parseFloat(row.kitchen) / goals.kitchen) * 100 : null,
				});
			}

			res.status(200).send(data);

			done(); // close db connection
		});
	});
};

// HELPERS

function _calcGoalsAll(hourly, start, end) {
	// calculate the goals for all the buildings

	var goals = {};

	for(let b in hourly) {
		//console.log('Calc for '+b);
		goals[b] = _calcGoal(hourly[b], start, end);
	}

	//console.log(goals);

	return goals;
}

function _calcGoal(hourly, start, end, enduse) {
	
	//console.log('Calc from '+start.format()+' to '+end.format()+' for '+(enduse === 'undefined'? 'all' : enduse));

	var current = moment(start),
		totalwatthours = 0;

	if(start.minute() !== 0) {

		//console.log('partial at start');

		totalwatthours += _partialHour(
			hourly[_getSeason(start.month())],
			start.hour(),
			60-start.minute(), // remaining time in the hour
			_getDayType(start.day()),
			enduse
		);

		current.minute(0).add(1, 'hour');
	}

	//console.log('adding '+end.diff(current, 'hours')+' hours in between');

	while(end.diff(current, 'hours') > 0) {
		

		totalwatthours += _fullHour(
			hourly[_getSeason(current.month())],
			current.hour(),
			_getDayType(current.day()),
			enduse
		);

		current.add(1, 'hour');
	}

	if(end.minute() > 0) {

		//console.log('partial at end');

		totalwatthours += _partialHour(
			hourly[_getSeason(end.month())],
			end.hour(),
			end.minute(),
			_getDayType(end.day()),
			enduse
		);
	}

	//console.log('Total for time period '+(totalwatthours/1000));

	return totalwatthours / 1000; //return kwh
}

function _getDayType(day) {
	switch(day) {
		case 0:
		case 6:
			return 'weekend';
		default:
			return 'weekday';
	}
}

function _getSeason(month) {
	switch(month) {
		case 2:
		case 3:
		case 4:
			return 'spring';
		case 5:
		case 6:
		case 7:
			return 'summer';
		case 8:
		case 9:
		case 10:
			return 'fall';
		case 11:
		case 0:
		case 1:
			return 'winter';
	}
}

function _partialHour(season, hour, minutes, type, enduse) {
	var watthours = 0,
		ratio = minutes / 60;

	if(typeof(enduse) === 'undefined') {
		watthours += season[hour].hvac[type] * ratio;
		watthours += season[hour].kitchen[type] * ratio;
		watthours += season[hour].lights[type] * ratio;
		watthours += season[hour].plugs[type] * ratio;
	}
	else {
		watthours += season[hour][enduse][type] * ratio;	
	}

	//console.log('Caculated a partial hour at '+watthours);
	return watthours;
}

function _fullHour(season, hour, type, enduse) {
	var watthours = 0;

	if(typeof(enduse) === 'undefined') {
		watthours += season[hour].hvac[type];
		watthours += season[hour].kitchen[type];
		watthours += season[hour].lights[type];
		watthours += season[hour].plugs[type];
	}
	else {
		watthours += season[hour][enduse][type];	
	}

	//console.log('Caculated '+(end-start+1)+' hours at '+watthours);
	return watthours;
}

function _buildCurrent(data, enduses) {
	var current = {};
	var production = parseFloat(data.solar);
	var demand = 0;

	for(var use in enduses) {
		var val = parseFloat(data[use]);
		current[use] =  Math.round(val);
		demand += val;
	}

	current.solar = Math.round(production);
	current.demand = Math.round(demand);
	current.production = Math.round(production);
	current.total = Math.round(production-demand);
	current.latest = data.latest;
	if(data.hasOwnProperty('building')) {
		current.building = data.building;
	}
	return current;
}

function _buildEndUses(has_ev, has_lab) {
	var enduses = {
		'hvac': true,
		'lights': true,
		'plugs': true,
		'kitchen': true,
	};

	if(has_ev) {
		enduses.ev = true;
	}

	if(has_lab) {
		enduses.lab = true;
	}

	return enduses;
}

// Make the interval a property of the object and return an array
function _transformPercentObject(data) {
	var newData = [];

	for(var interval in data) {
		data[interval].interval = interval;
		newData.push(data[interval]);
	}

	return newData;
}

// Adjust the kw values to be a percent of the zne goal
function _doPercentAdjustment(data, result, timespan, goals) {

	// Change any values that exist in the result
	for(var i = 0, len = result.rows.length; i < len; i++) {

		// building null means an interval with no data from any building
		// kw null means an interval with no data for that building
		if(result.rows[i].building !== null && result.rows[i].kwh !== null) {

			var interval = result.rows[i].interval.toISOString(),
				start = moment(interval),
				end = _addInterval(start, timespan),
				building = result.rows[i].building,
				goal = _calcGoal(goals[building], start, end),
				kwh = parseFloat(result.rows[i].kwh),
				percent = (kwh / goal) * 100; //calculate the percent of the zne

			//console.log(kwh);

			data[interval][building] = percent;
		}
	}
}

function _addInterval(start, timespan) {
	switch(timespan) {
		case 'hourly':
			return moment(start).add(1, 'hour');
		case 'daily':
			return moment(start).add(1, 'day');
		case 'weekly':
			return moment(start).add(7, 'day');
		case 'monthly':
			return moment(start).add(1, 'month');
	}
}

// Get all the unique intervals from the result (whether there is any building data for it or not)
function _getPercentIntervals(result) {
	var intervals = [];

	// Grab all the intervals in the result
	for(var i = 0, len = result.rows.length; i < len; i++) {
		var current = result.rows[i].interval.toISOString();
		if(intervals.indexOf(current) === -1) {
			intervals.push(current);
		}
	}

	return intervals;
}

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

function _buildPercentBuildingQuery(timespan, filter) {
	var unit = _getPercentUnit(timespan),
		start = _getPercentStart(timespan),
		startText = `${start} ${unit}s`,
		interval = `1 ${unit}`,
		condition = '';

	if(filter) {
		condition = 'AND "hobodata"."building" = $1';
	}

	// Grab all the hobo data for the date range requested (optionally limited to a single building)
	// Note that the timestamp for each data point is trucated to the period it will belong to

	// Group by building and by interval (so that all data recorded over the period will be summed
	// and each period yields a single reading)

	// Create a series of all the periods that could exist over the requested time period
	// Join the two so we get a complete set of periods. If we don't have data for a period, it will
	// be a NULL

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

function _buildPercentUseQuery(timespan) {
	var unit = _getPercentUnit(timespan),
		start = _getPercentStart(timespan),
		startText = `${start} ${unit}s`,
		interval = `1 ${unit}`;

	// Grab all the hobo data for the date range requested for a specific building
	// Note that the timestamp for each data point is trucated to the period it will belong to

	// Group by interval (so that all data recorded over the period will be summed
	// and each period yields a single reading)

	// Create a series of all the periods that could exist over the requested time period
	// Join the two so we get a complete set of periods. If we don't have data for a period, it will
	// be a NULL
	return `
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
}

function _buildHistoricalQuery(start, minutes, enabled) {

	var interval = minutes+' minutes';
	var seconds = minutes * 60;

	var uses = [];
	for(var use in enabled) {
		if(enabled[use]) {
			uses.push('AVG("data"."'+use+'")');
		}
	}

	var demandString = uses.length ? uses.join(' + ') : 0;

	// Grab all the hobo data for the date range requested for a specific building

	// Create the demand and production totals based on the passed set of enduses
	// Create the interval for each reading based upon the epoch (which gives us)
	// the necessary resolution

	// Group by interval (so that all data recorded over the period will be summed
	// and each period yields a single reading)

	// Create a series of all the periods that could exist over the requested time period
	// Join the two so we get a complete set of periods. If we don't have data for a period,
	// it will be a NULL

	return `
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
}
