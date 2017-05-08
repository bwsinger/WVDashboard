'use strict';

var db = require('../../config/db');

exports.findAll = function() {

	var query = `
		SELECT "id",
				"name",
				"number", 
				"street"
		FROM "buildings"
		ORDER BY "street", "number"`;

	return db.query(query)
		.then(function(results) {
			return results;
		})
		.catch(function(err) {
			console.log('Error fetching buildings: '+err.message);
		});
};

exports.findOne = function(id) {
	var query = `
		SELECT "id", "name", "number", "street", "has_ev", "has_lab"
		FROM "buildings"
		WHERE "id" = $1
	`;

	return db.query(query, [id])
		.then(function(results) {
			return results;
		})
		.catch(function(err) {
			console.log('Error fetching building: '+err.message);
		});
};
