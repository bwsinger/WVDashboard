'use strict';

var core = require('../controllers/core.server.controller');

module.exports = function(app) {
	app.route('/').get(core.index);
};
