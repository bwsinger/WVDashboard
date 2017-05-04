'use strict';

var schedule = require('node-schedule'),
	trophy = require('../app/tasks/trophy.server.tasks');
	
exports.start = function() {
	console.log('Starting scheduled tasks');

	// Run every Friday at noon
	schedule.scheduleJob('0 12 * * 5', trophy.awardIfNeeded);

	// Every 10 seconds for testing
	//schedule.scheduleJob('*/10 * * * * *', trophy.awardIfNeeded);
};