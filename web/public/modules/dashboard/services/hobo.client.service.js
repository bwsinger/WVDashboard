(function() {
	'use strict';

	angular
		.module('dashboard')
		.factory('Hobo', Hobo);

	Hobo.$inject = ['$http'];

	function Hobo($http) {

		var factory = {
			getBuildings: getBuildings,
			getLeaderboard: getLeaderboard,
			getCurrent: getCurrent,
			getCurrentAll: getCurrentAll,
			getHistorical: getHistorical,
			getPercentAll: getPercentAll,
			getPercentBuilding: getPercentBuilding,
			getPercentEnduse: getPercentEnduse,
		};

		return factory;

		////////////

		function getBuildings() {
			return $http.get('./api/buildings').then(function(res) {
				return res.data;
			});
		}

		function getLeaderboard() {
			return $http.get('./api/leaderboard').then(function(res) {
				return res.data;
			});
		}

		function getCurrent(building) {
			return $http.get('./api/current/building/'+building).then(function(res) {
				return res.data;
			});
		}

		function getCurrentAll() {
			return $http.get('./api/current/all').then(function(res) {
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

		function getPercentAll(timespan) {
			return $http.get('./api/percent/all/'+timespan).then(function(res) {
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
