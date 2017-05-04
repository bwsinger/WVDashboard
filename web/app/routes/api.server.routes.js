'use strict';

var config = require('../../config/config'),
	validate = require('../middleware/validate.server.middleware'),
	append = require('../middleware/append.server.middleware'),
	api = require('../controllers/api.server.controller'),
	cache = require('apicache').options({debug: config.apicachedebug }).middleware;

module.exports = function(app) {

	// ROUTES
	
	app.route('/api/buildings')
		.get(cache('1 day'), api.buildings);

	app.route('/api/leaderboard')
		.get(append.goals, api.leaderboard);

	app.route('/api/trophies/:building')
		.get(api.trophies);

	app.route('/api/current/all')
		.get(api.current);

	app.route('/api/current/building/:building')
		.get(append.endUses, api.currentByBuilding);

	app.route('/api/historical/:building/:timespan')
		.get(append.endUses, api.historical);

	app.route('/api/percent/all/:timespan')
		.get(append.goals, api.percent);

	app.route('/api/percent/building/:building/:timespan')
		.get(append.goals, api.percentBuilding);

	app.route('/api/percent/enduse/:building/:timespan')
		.get(append.goals, api.percentEnduse);

	app.route('/api/weather')
		.get(cache('10 minutes'), api.weather);

	// PARAMETERS

	app.param('timespan', validate.timespan);

	app.param('building', validate.building);
};
