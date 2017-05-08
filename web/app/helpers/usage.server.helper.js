'use strict';

var hobodata = require('../models/hobodata.server.model');

exports.period = function(start, end) {

	return hobodata.period(start, end)
		.then(function(result) {
			// Build object with week-to-date kwh values
			var current_kwh = {};

			for(var i = 0, len = result.rows.length; i < len; i++) {
				current_kwh[result.rows[i].building] = parseFloat(result.rows[i].kwh);
			}

			return current_kwh;
		});
};

exports.enduses = function(has_ev, has_lab) {
	var enduses = {
		'hvac': true,
		'lights': true,
		'plugs': true,
		'kitchen': true,
	};

	if(has_ev) {
		enduses.ev = true;
	}

	if(has_lab) {
		enduses.lab = true;
	}

	return enduses;
};
