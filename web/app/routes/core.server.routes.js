'use strict';

module.exports = function(app) {
	var core = require('../controllers/core.server.controller');
	app.route('/').get(core.index);
};
