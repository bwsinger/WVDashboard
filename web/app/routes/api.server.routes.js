'use strict';

module.exports = function(app) {
	var api = require('../controllers/api.server.controller');

	app.route('/api/leaderboard').get(api.leaderboard);

	app.route('/api/current/:building').get(api.current);

	app.route('/api/historical/:building/:timespan').get(api.historical);

	app.route('/api/percent/:type/:building/:timespan').get(api.percent);
};
