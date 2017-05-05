'use strict';

var db = require('../../config/db');

exports.findOldByBuilding = function(id, year, week) {

	var query = `
			SELECT
				"building",
				"year",
				"isoweek"
			FROM "trophies"
			WHERE "building" = $1
			AND ("year" < $2 OR "isoweek" < $3)
			ORDER BY "year", "isoweek" ASC
		`,
		params = [
			id,
			year,
			week,
		];

	return db.query(query, params)
		.then(function(results) {
			return results;
		})
		.catch(function(err) {
			console.log('Error fetching trophies: '+err.message);
		});
};

exports.findByWeek = function(year, week) {
	var query = `
			SELECT "building"
			FROM "trophies"
			WHERE "year" = $1
			AND "isoweek" = $2
		`;

	return db.query(query, [year, week])
		.then(function(results) {
			return results;
		})
		.catch(function(err) {
			console.log('Error fetching trophy: '+err.message);
		});
};

exports.insert = function(year, week, building) {
	var query = `
			INSERT INTO "trophies" ("building", "year", "isoweek")
			VALUES ($1, $2, $3)
		`;

	return db.query(query, [building, year, week])
		.catch(function(err) {
			console.log('Unable to insert trophy: '+err.message);
		});		
};