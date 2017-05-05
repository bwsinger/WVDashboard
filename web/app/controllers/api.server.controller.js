'use strict';

var moment = require('moment'),
	rp = require('request-promise'),
	URL = require('url'),
	config = require('../../config/config'),

	building = require('../models/building.server.model'),
	trophy = require('../models/trophy.server.model'),
	hobodata = require('../models/hobodata.server.model'),

	goalsHelper = require('../helpers/goals.server.helper'),
	usageHelper = require('../helpers/usage.server.helper');

exports.buildings = function(req, res) {

	building.findAll()
		.then(function(result) {
			res.status(200).send({
				buildings: result.rows,
			});
		})
		.catch(function() {
			res.status(500).send({
				errors: {
					message: 'Unable to fetch buildings',
				}
			});
		});
};

exports.leaderboard = function(req, res) {

	var now = moment();

	// Start of the week is last Friday at noon
	var startFriday = moment(now).day(-2).hour(12).minute(0).seconds(0).millisecond(0);

	// End of the week is next Friday at noon
	var endFriday = moment(now).day(5).hour(12).minute(0).seconds(0).millisecond(0);

	// When to unfreeze the results? Monday at Midnight
	var unfreezeOn = moment(now).day(1).hour(0).minute(0).seconds(0).millisecond(0);

	// Freeze the results during the appropriate period
	var resultsFrozen = false;

	// Freeze the results after Friday noon
	if(now >= endFriday) {
		resultsFrozen = true;
	}
	// Freeze the results before monday midnight
	else if(startFriday <= now && now < unfreezeOn) {
		resultsFrozen = true;

		// Display data from the previous week
		startFriday.subtract(7, 'days');
		endFriday.subtract(7, 'days');
	}

	// Get the actual usage over the week
	usageHelper.period(startFriday, endFriday)
		.then(function(current_kwh) {

			// calculate goals per building for the week in question
			var weeklyGoals = goalsHelper.calcAll(req.goals, startFriday, endFriday);

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
			for(var building in weeklyGoals) {

				var building_pos = null,
					percent_used = 0; // assume no energy data

				if(current_kwh[building] !== null) {
					// how much of the zne goal has been used
					// (compared to adjusted goal for the current day)
					percent_used = current_kwh[building] / (weeklyGoals[building] * minute_ratio);

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
		});
};

exports.trophies = function(req, res) {

	var now = moment();

	// Start of the week is last Friday at noon
	var startFriday = moment(now).day(-2).hour(12).minute(0).seconds(0).millisecond(0);

	// When to unfreeze the results? Monday at Midnight
	var unfreezeOn = moment(now).day(1).hour(0).minute(0).seconds(0).millisecond(0);

	var year = now.year(),
		week = now.week();

	if(startFriday <= now && now < unfreezeOn) {
		week--;
	}

	trophy.findOldByBuilding(req.params.building, year, week)
		.then(function(result) {
			res.status(200).send({
				trophies: result.rows,
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch trophies'
			});
		});
};

exports.current = function(req, res) {

	hobodata.current()
		.then(function(result) {
			var data = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {
				var enduses = usageHelper.enduses(
					result.rows[i].has_ev,
					result.rows[i].has_lab
				);
				var current = _buildCurrent(result.rows[i], enduses);
				data.push(current);
			}

			res.status(200).send({
				buildings: data
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch current data'
			});
		});
};

exports.currentByBuilding = function(req, res) {

	hobodata.currentByBuilding(req.params.building)
		.then(function(result) {
			var current = _buildCurrent(result.rows[0], req.enduses);
			current.building = req.params.building;

			res.status(200).send(current);
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch current data'
			});
		});
};

exports.historical = function(req, res) {

	// Build list of enabled enduses
	var enabled = {};

	// By default enable all
	for(let use in req.enduses) {
		enabled[use] = true;
	}

	// Disable passed enduses
	if(req.query.disabled) {
		var passed = req.query.disabled.split(',');

		for(let use in enabled) {
			if(passed.indexOf(use) !== -1) {
				enabled[use] = false;
			}
		}
	}

	hobodata.historical(req.params.building, req.params.timespan, enabled)
		.then(function(result) {
			var data = [];

			// Build the array to return
			for(var i = 0, len = result.rows.length; i < len; i++) {
				data.push({
					demand: result.rows[i].demand !== null ? parseFloat(result.rows[i].demand) : null,
					production: result.rows[i].demand !== null ? parseFloat(result.rows[i].production) : null,
					interval: result.rows[i].interval,
				});
			}

			res.status(200).send({
				intervals: data
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unabled to fetch historical data',
			});
		});
};

exports.percent = function(req, res) {

	hobodata.percent(req.params.timespan)
		.then(function(result) {
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

			res.status(200).send({
				intervals: _transformPercentObject(data)
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch percent usage'
			});
		});
};

exports.percentBuilding = function(req, res) {

	hobodata.percentBuilding(req.params.building, req.params.timespan)
		.then(function(result) {
			var intervals = _getPercentIntervals(result),
				data = {};

			// Build a 0 result set for each interval
			for(var j = 0, len_j = intervals.length; j < len_j; j++) {
				data[intervals[j]] = {};
				data[intervals[j]][req.params.building] = null;
			}

			_doPercentAdjustment(data, result, req.params.timespan, req.goals);

			res.status(200).send({
				intervals: _transformPercentObject(data)
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch percent usage for building'
			});
		});
};

exports.percentEnduse = function(req, res) {

	hobodata.percentEnduse(req.params.building, req.params.timespan)
		.then(function(result) {
			var goals = req.goals[req.params.building],
				data = [];

			for(var i = 0, len = result.rows.length; i < len; i++) {

				var row = result.rows[i],
					interval = row.interval.toISOString(),
					start = moment(interval),
					end = _addInterval(start, req.params.timespan);

				var hvac = goalsHelper.calc(goals, start, end, 'hvac'),
					lights = goalsHelper.calc(goals, start, end, 'lights'),
					plugs = goalsHelper.calc(goals, start, end, 'plugs'),
					kitchen = goalsHelper.calc(goals, start, end, 'kitchen');

				data.push({
					interval: interval,
					HVAC: _calcPercent(row.hvac, hvac),
					Lights: _calcPercent(row.lights, lights),
					Plugs: _calcPercent(row.plugs, plugs),
					Kitchen: _calcPercent(row.kitchen, kitchen),
				});
			}

			res.status(200).send({
				intervals: data
			});
		})
		.catch(function() {
			res.status(500).send({
				message: 'Unable to fetch percent usage for building enduses'
			});
		});
};

exports.weather = function(req, res) {

	var key = config.weatherApiKey,
		url = `https://api.wunderground.com/api/${key}/conditions/q/CA/Davis.json`;

	rp(url)
		.then(function(result) {
			var data = JSON.parse(result.trim());
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
		})
		.catch(function(err) {
			console.log('Unable to fetch weather: '+err.message);

			return res.status(500).send({ 
				message: 'Unable to fetch weather',
			});
		});
};

// HELPERS
function _calcPercent(val, goal) {
	if(val !== null) {
		return (parseFloat(val) / goal) * 100;
	}

	return null;
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
function _doPercentAdjustment(data, result, timespan, buildingGoals) {

	// Change any values that exist in the result
	for(var i = 0, len = result.rows.length; i < len; i++) {

		// building null means an interval with no data from any building
		// kw null means an interval with no data for that building
		if(result.rows[i].building !== null && result.rows[i].kwh !== null) {

			var interval = result.rows[i].interval.toISOString(),
				start = moment(interval),
				end = _addInterval(start, timespan),
				building = result.rows[i].building,
				goal = goalsHelper.calc(buildingGoals[building], start, end),
				kwh = parseFloat(result.rows[i].kwh),
				percent = (kwh / goal) * 100; //calculate the percent of the zne

			data[interval][building] = percent;
		}
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

