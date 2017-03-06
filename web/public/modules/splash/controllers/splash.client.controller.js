(function() {
	'use strict';

	angular
		.module('splash')
		.controller('Splash', SplashController);

	SplashController.$inject = ['$rootScope', 'Weather'];

	function SplashController($rootScope, Weather) {

		var vm = this,
			tmonth = new Array("Jan", "Feb", "Mar", "Apr", "May", "June",
								"July", "Aug", "Sept", "Oct", "Nov", "Dec");

		vm.toggleInfo = toggleInfo;
		vm.addressTrue = addressTrue;
		vm.addressFalse = addressFalse;
		vm.allAddressTrue = allAddressTrue;
		vm.allAddressFalse = allAddressFalse;
		vm.GetClock = GetClock;
		vm.timer = timer;

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

		function GetClock() {
			var d = new Date();

			var nmonth = d.getMonth(),
			ndate = d.getDate();

			var nhour = d.getHours(),
			nmin = d.getMinutes(),
			ap;
			
			if (nhour === 0) {
				ap = " AM";
				nhour = 12;
			} else if (nhour < 12) {
				ap = " AM";
			} else if (nhour == 12) {
				ap = " PM";
			} else if (nhour > 12) {
				ap = " PM";
				nhour -= 12;
			}

			if (nmin <= 9) {
				nmin = "0" + nmin
			}

			document.getElementById('clockbox').innerHTML = 
				"" + tmonth[nmonth] + " " + ndate + "<br>" + nhour + ":" + nmin + ap + "<br>";
		}

		function timer() {
			vm.GetClock();
			setInterval(vm.GetClock, 1000);
		};
	}
})();
