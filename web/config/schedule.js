'use strict';

var schedule = require('node-schedule'),
	trophy = require('../app/tasks/trophy.server.tasks');
	

exports.start = function() {
	// Run every Friday at noon
	schedule.scheduleJob('0 12 * * 5', trophy.award);
};