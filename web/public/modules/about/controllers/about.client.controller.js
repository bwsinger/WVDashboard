(function() {
	'use strict';

	angular
		.module('about')
		.controller('About', AboutController);

	AboutController.$inject = [];

	function AboutController($routeParams) {

		var vm = this;
		var tiles = {
			'dashboard': 'THE DASHBOARD',
			'zne': 'ZERO NET ENERGY MODELING',
			'creators': 'THE CREATORS',
		};

		vm.tiles = tiles;
		vm.changeTile = changeTile;

		activate();

		////////////////////////////

		function activate() {
			changeTile('dashboard');
		}

		function changeTile(name) {
			vm.current = name;
			vm.title = tiles[name];
			vm.currentTemplate = './modules/about/views/about-'+name+'.client.view.html';
		}
	}

})();
