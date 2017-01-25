(function() {
	'use strict';

	angular
		.module('splash')
		.controller('Splash', SplashController);

	SplashController.$inject = ['$rootScope', 'Weather'];

	function SplashController($rootScope, Weather) {

		var vm = this;

		$rootScope.init.then(activate);

		//////////////////////////

		function activate() {
			Weather.getWeather().then(function(weather) {
				vm.weather = weather;
			});
		}
	}

})();
