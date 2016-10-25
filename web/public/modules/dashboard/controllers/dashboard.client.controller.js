(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams'];

	function DashboardController($routeParams) {

		var vm = this;

		vm.building = $routeParams.building;

	}

})();
