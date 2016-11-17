'use strict';

var pg = require('pg'),
	config = require('../../config/config');

module.exports = function(app) {
	var api = require('../controllers/api.server.controller');

	// ROUTES
	
	app.route('/api/buildings').get(api.buildings);

	app.route('/api/leaderboard').get(api.goals, api.leaderboard);

	app.route('/api/current/:building').get(api.current);

	app.route('/api/historical/:building/:timespan').get(api.historical);

	app.route('/api/percent/all/:timespan').get(api.goals, api.percentAll);

	app.route('/api/percent/building/:building/:timespan').get(api.goals, api.percentBuilding);

	app.route('/api/percent/enduse/:building/:timespan').get(api.goals, api.percentEnduse);


	// PARAMETERS

	app.param('timespan', api.validateTimespan);

	app.param('building', api.validateBuilding);
};
