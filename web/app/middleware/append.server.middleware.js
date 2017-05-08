'use strict';

var goalsHelper = require('../helpers/goals.server.helper'),
	usageHelper = require('../helpers/usage.server.helper');

// Compile the building goals
exports.goals = function(req, res, next) {
	goalsHelper.compile()
		.then(function(goals) {
			req.goals = goals;
			next();
		});
};

// Build the set of enduses for this building
exports.endUses  = function(req, res, next) {
	req.enduses = usageHelper.enduses(
		req.building.has_ev,
		req.building.has_lab
	);

	next();
};