(function() {
	'use strict';

	angular
		.module('core')
		.controller('Menu', MenuController);

	MenuController.$inject = ['$rootScope', '$location'];

	function MenuController($rootScope, $location) {

		var vm = this;

		vm.toggle = toggle;

		$rootScope.$on('$locationChangeSuccess', updateMenu);

		activate();

		////////////////////////////

		function activate() {
			vm.items = [
				{ 'text': 'HOME', 'link': '/',},
				{ 'text': 'DASHBOARDS', 'link': '',},
				{ 'text': '+215 SAGE', 'link': '/dashboard/215 Sage',},
				{ 'text': '+1590 TILIA', 'link': '/dashboard/1590 Tilia',},
				{ 'text': '+1605 TILIA', 'link': '/dashboard/1605 Tilia',},
				{ 'text': '+1715 TILIA', 'link': '/dashboard/1715 Tilia',},
				{ 'text': 'ABOUT', 'link': '/about',},
			];

			vm.visible = false;
			vm.location = $location.path();
		}

		function toggle() {
			vm.visible = !vm.visible;
		}

		function updateMenu() {
			vm.location = $location.path();
			vm.visible = false; // re hide the menu after a click
		}
	}

})();
