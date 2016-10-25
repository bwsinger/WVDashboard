(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams', 'Hobo'];

	function DashboardController($routeParams, Hobo) {

		var vm = this;

		vm.changePercentTimespan = changePercentTimespan;
		vm.changeHistoricalTimespan = changeHistoricalTimespan;

		activate();

		//////////////////////////

		function activate() {

			vm.building = $routeParams.building;
			vm.timespans = ['hourly', 'daily', 'weekly', 'monthly'];

			Hobo.getLeaderboard().then(function(data) {
				vm.leaderboardData = data;

				if(data.hasOwnProperty(vm.building)) {

					if(data[vm.building] < data['ZNE']) {
						vm.state = 'negative';
					}
					else {
						vm.state = 'positive';
					}

					var place = 1;

					for(var building in data) {
						if(building != 'ZNE' && building != vm.building && data[building] > data[vm.building]) {
								place++;
						}
					}

					vm.place = place;
				}
			});

			Hobo.getCurrent(vm.building).then(function(data) {
				vm.currentData = data;
			});

			//defaults
			changeHistoricalTimespan(vm.timespans[2]);
			changePercentTimespan(vm.timespans[2]);
		}

		function changeHistoricalTimespan(timespan) {
			if(timespan !== vm.historicalTimespan) {
				vm.historicalTimespan = timespan;

				Hobo.getHistorical(vm.historicalTimespan, vm.building).then(function(data) {
					vm.historicalData = data;
				});
			}
		}

		function changePercentTimespan(timespan) {
			if(timespan !== vm.percentTimespan) {
				vm.percentTimespan = timespan;

				Hobo.getPercentZNE(vm.percentTimespan, vm.building).then(function(data) {
					vm.percentData = data;
				});
			}
		}

	}

})();
