'use strict';

module.exports = function(app) {
	var api = require('../controllers/api.server.controller');

	app.route('/api/leaderboard').get(api.leaderboard);

	app.route('/api/current/:building').get(api.current);

	app.route('/api/historical/:timespan/:building').get(api.historical);

	app.route('/api/percentzne/:timespan/:building').get(api.percentzne);
};
