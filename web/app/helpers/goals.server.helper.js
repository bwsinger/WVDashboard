'use strict';

var moment = require('moment'),
	goals = require('../models/goals.server.model');

// compile the goals
exports.compile = function() {

	return goals.findAll()
		.then(function(result) {
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

			return goals;
		});
};

// calculate the goal for each building in the array of hourly goals
// over the same time period
exports.calcAll = function(hourly, start, end) {
	var goals = {};

	for(let b in hourly) {
		goals[b] = _calc(hourly[b], start, end);
	}

	return goals;
};

// calculate the goal in kwh for an arbitrary time period]
// given a set of hourly goals
exports.calc = function(hourly, start, end, enduse) {
	return _calc(hourly, start, end, enduse);
};

// Helpers

function _calc(hourly, start, end, enduse) {
	var current = moment(start),
		totalwatthours = 0;

	// Add any remaining time from the first hour
	// Example: starts at 2:10, add the remaining 50 minutes
	//			for 2 oclock hour
	if(start.minute() !== 0) {

		totalwatthours += _partialHour(
			hourly[_getSeason(start.month())],
			start.hour(),
			60-start.minute(), // remaining time in the hour
			_getDayType(start.day()),
			enduse
		);

		// move to the start of the next hour
		current.minute(0).add(1, 'hour');
	}


	// Add each intermediate hour (this will also take care
	// of times on different days)
	// Example: 2:10 to 8:45, add hours for 3, 4, 5, 6, 7
	while(end.diff(current, 'hours') > 0) {

		totalwatthours += _fullHour(
			hourly[_getSeason(current.month())],
			current.hour(),
			_getDayType(current.day()),
			enduse
		);

		// move to the next hour
		current.add(1, 'hour');
	}

	// Add any time from the last hour
	// Example: ends 8:45, add the 45 minutes from the 8
	// 			oclock hour
	if(end.minute() > 0) {

		totalwatthours += _partialHour(
			hourly[_getSeason(end.month())],
			end.hour(),
			end.minute(), // time so far in hour
			_getDayType(end.day()),
			enduse
		);
	}

	return totalwatthours / 1000; //return kwh
}

// Map day of the week to weekday/weekend
function _getDayType(day) {
	switch(day) {
		case 0:
		case 6:
			return 'weekend';
		default:
			return 'weekday';
	}
}

// Map month to season
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

// Calculate the total goal for a certain number of minutes
// in an hour, optionally restricted to a single enduse
function _partialHour(goals, hour, minutes, type, enduse) {
	enduse = typeof(enduse) === 'undefined' ? false : enduse;

	var watthours = 0,
		ratio = minutes / 60;

	if(enduse) {
		watthours += goals[hour][enduse][type] * ratio;
	}
	else {
		watthours += goals[hour].hvac[type] * ratio;
		watthours += goals[hour].kitchen[type] * ratio;
		watthours += goals[hour].lights[type] * ratio;
		watthours += goals[hour].plugs[type] * ratio;
	}

	return watthours;
}

// Calculate the total goal for a full hour,
// optionally restricted to a single enduse
function _fullHour(goals, hour, type, enduse) {
	enduse = typeof(enduse) === 'undefined' ? false : enduse;

	var watthours = 0;

	if(enduse) {
		watthours += goals[hour][enduse][type];
	}
	else {
		watthours += goals[hour].hvac[type];
		watthours += goals[hour].kitchen[type];
		watthours += goals[hour].lights[type];
		watthours += goals[hour].plugs[type];
	}

	return watthours;
}