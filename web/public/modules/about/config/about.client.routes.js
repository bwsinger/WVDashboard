(function() {
	'use strict';

	angular
		.module('about')
		.config(Config);

	Config.$inject = ['$routeProvider'];

	function Config($routeProvider) {
		$routeProvider
			.when('/about', {
				templateUrl: './modules/about/views/about.client.view.html',
				controller: 'About',
				controllerAs: 'vm'
			});
	}

})();