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
			getPercentBuilding: getPercentBuilding,
			getPercentEnduse: getPercentEnduse,
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
				if(!enabled[use]) {
					uses.push(use);
				}
			}

			var url = './api/historical/'+building+'/'+timespan;

			if(uses.length) {
				url+= '?disabled='+uses.join(',');
			}

			return $http.get(url).then(function(res) {
				return res.data;
			});
		}

		function getPercentBuilding(timespan, building) {
			return $http.get('./api/percent/building/'+building+'/'+timespan).then(function(res) {
				return res.data;
			});
		}

		function getPercentEnduse(timespan, building) {
			return $http.get('./api/percent/enduse/'+building+'/'+timespan).then(function(res) {
				return res.data;
			});
		}
	}

})();
