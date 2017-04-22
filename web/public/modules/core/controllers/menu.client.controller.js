(function() {
	'use strict';

	angular
		.module('core')
		.controller('Menu', MenuController);

	MenuController.$inject = ['$rootScope', '$location', '$scope', 'Settings'];

	function MenuController($rootScope, $location, $scope, Settings) {

		var vm = this;

		vm.loading = true;
		vm.toggle = toggle;

		$rootScope.$on('$locationChangeSuccess', updateMenu);
		$rootScope.$on('loaded', hideLoading);

		$rootScope.init.then(activate);

		////////////////////////////

		function activate() {

			vm.items = [];

			vm.items.push({ 'text': 'HOME', 'link': '/'});
			vm.items.push({ 'text': 'DASHBOARDS', 'link': ''});

			var buildings = Settings.getBuildings();

			for(var i = 0, len = buildings.length; i < len; i++) {
				vm.items.push({
					'text': '+'+buildings[i].name,
					'link': '/dashboard/'+buildings[i].id,
				});
			}

			vm.items.push({ 'text': 'ABOUT', 'link': '/about'});

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

		function hideLoading() {
			vm.loading = false;
			$scope.$apply();
		}
	}

})();
