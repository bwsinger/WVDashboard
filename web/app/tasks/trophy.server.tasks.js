'use strict';

var	moment = require('moment'),
	trophy = require('../models/trophy.server.model'),
	goalsHelper = require('../helpers/goals.server.helper'),
	usageHelper = require('../helpers/usage.server.helper');

exports.awardIfNeeded = function() {
	var now = moment(),
		year = now.year(),
		week = now.isoWeek();

	trophy.findByWeek(year, week)
		.then(function(results) {
			if(!results.rows.length) {
				award(year, week);
			}
		});
};

function award(year, week) {

	// Get the goals
	goalsHelper.compile()
		.then(function(goals) {
			
			// Start of the week is last Friday at noon
			var start = moment().day(-2).hour(12).minute(0).seconds(0).millisecond(0);
			// End of the week is next Friday at noon
			var end = moment().day(5).hour(12).minute(0).seconds(0).millisecond(0);

			// Get the actual usage
			usageHelper.period(start, end)
				.then(function(kwh) {

					var lowest,
						winner,
						weeklyGoals = goalsHelper.calcAll(goals, start, end);

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
						trophy.insert(year, week, winner);
					}
				});
		});
}

