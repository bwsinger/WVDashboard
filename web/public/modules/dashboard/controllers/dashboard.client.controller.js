(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams', 'Hobo'];

	function DashboardController($routeParams, Hobo) {

		var vm = this;

		vm.timespans = ['hourly', 'daily', 'weekly', 'monthly'];

		vm.building = $routeParams.building;
		vm.changePercentTimespan = changePercentTimespan;
		vm.changeHistoricalTimespan = changeHistoricalTimespan;

		activate();

		//////////////////////////

		function activate() {

			Hobo.getLeaderboard().then(function(data) {
				vm.leaderboardData = data;
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
