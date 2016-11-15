(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams', 'Hobo'];

	function DashboardController($routeParams, Hobo) {

		var vm = this,
			timespans = ['hourly', 'daily', 'weekly', 'monthly'],
			percentStates = ['enduse', 'current', 'all'];

		vm.changePercentTimespan = changePercentTimespan;
		vm.changeHistoricalTimespan = changeHistoricalTimespan;
		vm.toggleUse = toggleUse;
		vm.togglePercentState = togglePercentState;

		activate();

		//////////////////////////

		function activate() {

			// TODO validate building paramater

			vm.building = $routeParams.building;
			vm.historicalTimespans = timespans.slice(0);
			vm.percentTimespans = timespans.slice(0);
			vm.percentState = percentStates[percentStates.length-1];

			Hobo.getLeaderboard().then(function(data) {
				vm.leaderboardData = data;

				for(var i = 0, len = data.length; i < len; i++) {
					if(data[i].building === vm.building) {
						vm.place = data[i].place;
						vm.state = data[i].good ? 'positive' : 'negative';
						break;
					}
				}
			});

			Hobo.getCurrent(vm.building).then(function(data) {
				vm.currentData = data;
				
				console.log("Current as of: "+new Date(data.latest));

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

		function togglePercentState(state) {
			if(state) {
				vm.percentState = state;
			}
			else if(percentStates.indexOf(vm.percentState) === 0) {
				vm.percentState = percentStates[percentStates.length-1];
			}
			else {
				vm.percentState = percentStates[percentStates.indexOf(vm.percentState)-1];
			}

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

			if(vm.percentState === 'enduse') {
				Hobo.getPercentEnduse(vm.percentTimespan, vm.building).then(function(data) {
					vm.percentData = data;
				});
			}
			else {
				var building = vm.percentState === 'all' ? 'ALL' : vm.building;

				Hobo.getPercentBuilding(vm.percentTimespan, building).then(function(data) {
					vm.percentData = data;
				});
			}
		}

	}

})();
