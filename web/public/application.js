(function() {
	'use strict';

	var dependencies = [
		'ngRoute',
		'core',
		'about',
		'splash',
		'dashboard',
	];

	angular.module('wvdashboard', dependencies).config(Config);

	Config.$inject = ['$locationProvider'];

	function Config($locationProvider) {
		$locationProvider.hashPrefix('!');
	}

	// Bootstrap angular
	angular.element(document).ready(function() {
		angular.bootstrap(document, ['wvdashboard']);
	});

	angular.module('wvdashboard').run(initialize);

	initialize.$inject = ['$q', '$rootScope', 'Hobo', 'Settings'];

	function initialize($q, $rootScope, Hobo, Settings) {

		var deferred = $q.defer();
		$rootScope.init = deferred.promise;

		Hobo.getBuildings().then(function(data) {
			Settings.setBuildings(data);
			deferred.resolve();
		});
	}

})();
