(function() {
	'use strict';

	angular
		.module('dashboard')
		.config(Config);

	Config.$inject = ['$routeProvider'];

	function Config($routeProvider) {
		$routeProvider
			.when('/dashboard/:building', {
				templateUrl: './modules/dashboard/views/dashboard.client.view.html',
				controller: 'Dashboard',
				controllerAs: 'vm'
			});
	}

})();