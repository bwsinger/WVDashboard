'use strict';

var db = require('../../config/db');

exports.findAll = function() {

	var query = `
		SELECT 
			"g"."building",
			"g"."season",
			"s"."name",
			"g"."hour",

			"g"."hvac_weekday", 	"g"."hvac_weekend",
			"g"."kitchen_weekday", 	"g"."kitchen_weekend",
			"g"."lights_weekday", 	"g"."lights_weekend",
			"g"."plugs_weekday", 	"g"."plugs_weekend"

		FROM "goals" AS "g"
		JOIN "seasons" AS "s"
		ON "g"."season" = "s"."id"`;

	return db.query(query)
		.then(function(results) {
			return results;
		})
		.catch(function(err) {
			console.log('Unable to fetch goals: '+err.message);
		});
};