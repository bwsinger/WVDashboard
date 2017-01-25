(function() {
	'use strict';

	angular
		.module('splash')
		.factory('Weather', Hobo);

	Hobo.$inject = ['$http'];

	function Hobo($http) {

		var factory = {
			getWeather: getWeather,
		};

		return factory;

		////////////

		function getWeather() {
			return $http.get('./api/weather').then(function(res) {
				return res.data;
			});
		}
	}

})();
