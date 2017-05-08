'use strict';

var building = require('../models/building.server.model'),
	timespans = ['hourly', 'daily', 'weekly', 'monthly'];

exports.timespan = function(req, res, next, value) {
	
	if(timespans.indexOf(value) === -1) {
		res.status(400).send({
			message: 'Invalid timespan'
		});
	}
	else {
		next();
	}
};

exports.building = function(req, res, next, value) {

	building.findOne(value)
		.then(function(result) {
			if(result.rows.length) {
				req.building = result.rows[0];
				next();
			}
			else {
				res.status(400).send({
					message: 'Invalid building',
				});
			}
		})
		.catch(function() {
			res.status(500).send({
				message: 'Could not validate building',
			});
		});
};