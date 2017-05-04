'use strict';

var	moment = require('moment'),
	db = require('../../config/db'),
	goalsHelper = require('../helpers/goals.server.helper'),
	usageHelper = require('../helpers/usage.server.helper');

module.exports = {
	award: award,
}

function award() {

	var now = moment(),
		year = now.year(),
		week = now.isoWeek(),
		weeklyGoals;

	_checkIfAwarded(year, week, handleAwarded);

	function handleAwarded(awarded) {
		if(!awarded) {
			goalsHelper.compile(handleGoals);
		}
	}

	function handleGoals(goals) {
		// Start of the week is last Friday at noon
		var startFriday = moment().day(-2).hour(12).minute(0).seconds(0).millisecond(0);
		// End of the week is next Friday at noon
		var endFriday = moment().day(5).hour(12).minute(0).seconds(0).millisecond(0);

		weeklyGoals = goalsHelper.calcAll(goals, startFriday, endFriday);

		// calculate acutal usage
		usageHelper.periodAll(startFriday, endFriday, handleUsage);
	}

	function handleUsage(kwh) {
		var lowest, winner;

		for(let b in weeklyGoals) {
			if(weeklyGoals.hasOwnProperty(b) && kwh.hasOwnProperty(b)) {
				// calc percent used for each building
				var percent = kwh[b]  / weeklyGoals[b];

				// lowest wins
				if(!lowest || percent < lowest) {
					lowest = percent;
					winner = b;
				}
			}
		}

		// insert the winning id
		if(winner) {
			console.log('Building '+winner+' wins the trophy this week');
			_insert(year, week, winner);
		}
	}
}

function _checkIfAwarded(year, week, callback) {
	var query = `
			SELECT "building"
			FROM "trophies"
			WHERE "year" = $1
			AND "isoweek" = $2
		`,
		params = [
			year,
			week,
		];

	db.query(query, params, handleResult);

	function handleResult(err, result) {
		if(err) {
			throw err;
		}

		return callback(result.rows.length > 0);
	}
}

function _insert(year, week, building) {
	var query = `
			INSERT INTO "trophies" ("building", "year", "isoweek")
			VALUES ($1, $2, $3)
		`,
		params = [
			building,
			year,
			week,
		];

	db.query(query, params, handleResult);

	function handleResult(err) {
		if(err) {
			throw err;
		}
	}
}
