(function () {
	'use strict';

	angular
		.module('core')
		.factory('Settings', Settings);

	Settings.$inject = [];

	function Settings() {
		var buildings;

		var factory = {
			setBuildings: setBuildings,
			getBuildings: getBuildings,
		};

		return factory;

		///////////////////////////////

		function setBuildings(newBuildings) {
			buildings = newBuildings;
		}

		function getBuildings() {
			return buildings;
		}
	}

})();
