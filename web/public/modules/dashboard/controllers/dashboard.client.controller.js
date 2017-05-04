(function() {
	'use strict';

	angular
		.module('dashboard')
		.controller('Dashboard', DashboardController);

	DashboardController.$inject = ['$routeParams', '$location', '$rootScope', 'Hobo', 'Settings'];

	function DashboardController($routeParams, $location, $rootScope, Hobo, Settings) {

		var vm = this,
			timespans = ['hourly', 'daily', 'weekly', 'monthly'],
			percentStates = ['enduse', 'current', 'all'];

		vm.changePercentTimespan = changePercentTimespan;
		vm.changeHistoricalTimespan = changeHistoricalTimespan;
		vm.toggleUse = toggleUse;
		vm.togglePercentState = togglePercentState;

		$rootScope.init.then(activate);

		//////////////////////////

		function activate() {

			var buildings = Settings.getBuildings(),
				buildingId = parseInt($routeParams.building),
				ids = buildings.map(function(b) { return b.id; });

			if(ids.indexOf(buildingId) === -1) {
				$location.path('/');
				return;
			}

			vm.building = buildings[ids.indexOf(buildingId)].name;
			vm.buildings = buildings;
			vm.buildingId = buildingId;

			vm.historicalTimespans = timespans.slice(0);
			vm.percentTimespans = timespans.slice(0);
			vm.percentState = percentStates[percentStates.length-1];

			Hobo.getLeaderboard().then(function(data) {
				vm.leaderboardData = data;

				for(var i = 0, len = data.buildings.length; i < len; i++) {
					if(parseInt(data.buildings[i].building) === vm.buildingId) {
						vm.place = data.buildings[i].place;
						vm.state = data.buildings[i].good ? 'positive' : 'negative';
						vm.trophy = data.buildings[i].trophy;
						break;
					}
				}
			});

			Hobo.getTrophies(vm.buildingId).then(function(data) {
				if(data.trophies.length) {
					vm.trophies = data.trophies;
				}
			});

			Hobo.getCurrent(vm.buildingId).then(function(data) {
				vm.currentData = data;
				
				//console.log("Current as of: "+new Date(data.latest));

				vm.enabled = {};

				for(var enduse in data) {
					if(enduse !== 'total' && enduse !== 'solar' && enduse !== 'latest') {
						vm.enabled[enduse] = true;
					}
				}

				vm.hasEV = vm.enabled.hasOwnProperty('ev');
				vm.hasLab = vm.enabled.hasOwnProperty('lab');

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
			Hobo.getHistorical(vm.historicalTimespan, vm.buildingId, vm.enabled).then(function(data) {
				vm.historicalData = data.intervals;
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
				for(var i = 0, leni = idx - 2; i < leni; i++) {
					timespans.push(timespans.shift());
					
				}
			}
			else {
				for(var j = 0, lenj = 2 - idx; j < lenj; j++) {
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
				Hobo.getPercentEnduse(vm.percentTimespan, vm.buildingId)
					.then(handlePercentData);
			}
			else if(vm.percentState === 'all') {
				Hobo.getPercentAll(vm.percentTimespan)
					.then(handlePercentData);
			}
			else {
				Hobo.getPercentBuilding(vm.percentTimespan, vm.buildingId)
					.then(handlePercentData);
			}
		}

		function handlePercentData(data) {
			vm.percentData = data.intervals;
		}

	}

})();
