(function() {
	'use strict';

	angular
		.module('dashboard')
		.factory('Hobo', Hobo);

	Hobo.$inject = ['$http'];

	function Hobo($http) {

		var factory = {
			getLeaderboard: getLeaderboard,
			getCurrent: getCurrent,
			getHistorical: getHistorical,
			getPercentZNE: getPercentZNE,
		};

		return factory;

		////////////

		function getLeaderboard() {
			return $http.get('./api/leaderboard').then(function(res) {
				return res.data;
			});
		}

		function getCurrent(building) {
			return $http.get('./api/current/'+building).then(function(res) {
				return res.data;
			});
		}

		function getHistorical(timespan, building, enabled) {

			var uses = [];
			for(var use in enabled) {
				if(enabled[use]) {
					uses.push(use);
				}
			}

			return $http.get('./api/historical/'+timespan+'/'+building+'?enabled='+uses.join(',')).then(function(res) {
				return res.data;
			});
		}

		function getPercentZNE(timespan, building) {
			return $http.get('./api/percentzne/'+timespan+'/'+building).then(function(res) {
				return res.data;
			});
		}
	}

})();
