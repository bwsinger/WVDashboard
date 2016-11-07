(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams', 'Hobo'];

	function DashboardController($routeParams, Hobo) {

		var vm = this,
			timespans = ['hourly', 'daily', 'weekly', 'monthly'];

		vm.changePercentTimespan = changePercentTimespan;
		vm.changeHistoricalTimespan = changeHistoricalTimespan;
		vm.toggleUse = toggleUse;
		vm.toggleAll = toggleAll;

		activate();

		//////////////////////////

		function activate() {

			vm.building = $routeParams.building;
			vm.historicalTimespans = timespans.slice(0);
			vm.percentTimespans = timespans.slice(0);
			vm.showAll = true;

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
				
				vm.enabled = {}

				for(var enduse in data) {
					if(enduse != 'total' && enduse != 'solar') {
						vm.enabled[enduse] = true;
					}
				}

				// weekly by default
				changeHistoricalTimespan(vm.historicalTimespans[2]);
			});

			// weekly by default
			changePercentTimespan(vm.percentTimespans[2]);
		}

		function toggleUse(enduse) {
			vm.enabled[enduse] = ! vm.enabled[enduse];
			getHistoricalData();
		}

		function changeHistoricalTimespan(timespan) {
			if(timespan !== vm.historicalTimespan) {
				vm.historicalTimespan = timespan;

				vm.historicalTimespans = rotateTimespans(timespan, vm.historicalTimespans);

				getHistoricalData();
			}
		}

		function getHistoricalData() {
			Hobo.getHistorical(vm.historicalTimespan, vm.building, vm.enabled).then(function(data) {
				vm.historicalData = data;
			});
		}

		function toggleAll() {
			vm.showAll = ! vm.showAll;
			getPercentData();
		}

		function rotateTimespans(timespan, timespans) {

			var idx = timespans.indexOf(timespan);

			if(idx > 2) {
				for(var i = 0, len = idx - 2; i < len; i++) {
					timespans.push(timespans.shift());
					
				}
			}
			else {
				for(var i = 0, len = 2 - idx; i < len; i++) {
					timespans.unshift(timespans.pop());
				}
			}

			return timespans;
		}

		function changePercentTimespan(timespan) {
			if(timespan !== vm.percentTimespan) {
				vm.percentTimespan = timespan;

				vm.percentTimespans = rotateTimespans(timespan, vm.percentTimespans);

				getPercentData();
			}
		}

		function getPercentData() {
			var building = vm.showAll ? 'ALL' : vm.building;

			Hobo.getPercentZNE(vm.percentTimespan, building).then(function(data) {
				vm.percentData = data;
			});
		}

	}

})();
