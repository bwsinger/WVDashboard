'use strict';


exports.leaderboard = function(req, res) {
	res.status(200).send('Leaderboard');
};

exports.current = function(req, res) {
	res.status(200).send('Current data for building '+req.params.building);

};

exports.historical = function(req, res) {
	res.status(200).send('Historical data for building '+req.params.building+' ('+req.params.time+')');
};

exports.percentzne = function(req, res) {
	res.status(200).send('Percent ZNE for building '+req.params.building+' ('+req.params.time+')');
};
