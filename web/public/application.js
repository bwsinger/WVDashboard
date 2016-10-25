(function() {
	'use strict';

	var dependencies = [
		'ngRoute',
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

})();
