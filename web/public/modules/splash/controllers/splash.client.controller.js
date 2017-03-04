(function() {
	'use strict';

	angular
		.module('splash')
		.controller('Splash', SplashController);

	SplashController.$inject = ['$rootScope', 'Weather'];

	function SplashController($rootScope, Weather) {

		var vm = this;

		vm.toggleInfo = toggleInfo;
		vm.addressTrue = addressTrue;
		vm.addressFalse = addressFalse;
		vm.allAddressTrue = allAddressTrue;
		vm.allAddressFalse = allAddressFalse;

		$rootScope.init.then(activate);

		//////////////////////////

		function activate() {
			vm.infoButton = true;
			vm.addressList = { '215':false, '1715':false, '1605':false, '1590':false };

			Weather.getWeather().then(function(weather) {
				vm.weather = weather;
			});
		}

		function toggleInfo() {
			vm.infoButton = ! vm.infoButton;
		}

		function allAddressTrue() {
			for(var key in vm.addressList) {
				vm.addressList[key] = true;
			}
		}

		function allAddressFalse() {
			for(var key in vm.addressList) {
				vm.addressList[key] = false;
			}
		}

		function addressTrue(addr) {
			vm.addressList[addr] = true;
		}

		function addressFalse(addr) {
			var alltrue = true;
			for(var key in vm.addressList) {
				if (vm.addressList[key] == false) {
					alltrue = false;
				}
			}

			if (!alltrue) {
				vm.addressList[addr] = false;
			}
		}
	}

})();
