(function() {
	'use strict';

	angular
		.module('splash')
		.config(Config);

	Config.$inject = ['$routeProvider'];

	function Config($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: './modules/splash/views/splash.client.view.html',
			})
			.otherwise('/');
	}

})();