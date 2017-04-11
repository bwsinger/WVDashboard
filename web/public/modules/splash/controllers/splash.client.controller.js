(function() {
	'use strict';

	angular
		.module('splash')
		.controller('Splash', SplashController);

	SplashController.$inject = ['$rootScope', 'Weather', 'Hobo'];

	function SplashController($rootScope, Weather, Hobo) {

		var vm = this,
			tmonth = new Array("Jan", "Feb", "Mar", "Apr", "May", "June",
								"July", "Aug", "Sept", "Oct", "Nov", "Dec"),
			// copied from core.scss
			mqls = [
				window.matchMedia("only screen and (max-aspect-ratio: 168888/100000)"),
				window.matchMedia("only screen and (min-aspect-ratio: 1688881/1000000) and (max-aspect-ratio: 181197/100000)"),
				window.matchMedia("only screen and (min-aspect-ratio: 1811971/1000000) and (max-aspect-ratio: 186425/100000)"),
				window.matchMedia("only screen and (min-aspect-ratio: 1864251/1000000) and (max-aspect-ratio: 194118/100000)"),
				window.matchMedia("only screen and (min-aspect-ratio: 1941181/1000000) and (max-aspect-ratio: 205/100)"),
				window.matchMedia("only screen and (min-aspect-ratio: 2051/1000)")
			],
			strViewBoxs = [
				"0 0 1600 1080",
				"0 0 1600 1080",
				"0 0 1600 1080",
				"0 0 1600 1080",
				"0 0 1600 1080",
				"0 0 1600 1080"
			],
			path = $('#allsolarLines') //document.getElementById("allsolarLines")
			// path = document.getElementsByClassName("solarLine1")[0]
			;

		vm.toggleInfo = toggleInfo;
		vm.addressTrue = addressTrue;
		vm.addressFalse = addressFalse;
		vm.allAddressTrue = allAddressTrue;
		vm.allAddressFalse = allAddressFalse;
		vm.GetClock = GetClock;
		vm.timer = timer;
		vm.MediaQuery = MediaQuery;
		vm.viewBoxAdjuster = viewBoxAdjuster;


		$rootScope.init.then(activate);

		//////////////////////////

		function activate() {
			vm.infoButton = true;
			vm.addressList = { '215':false, '1715':false, '1605':false, '1590':false };

			Weather.getWeather().then(function(weather) {
				vm.weather = weather;
			});

			vm.lineData = [];

			for(var buildingID = 1; buildingID < 5; buildingID++) {
				Hobo.getCurrent(buildingID).then(function(data) {
					vm.lineData.push(data);
				});
			}

			console.log(vm.lineData);
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
		}

		// Media Query event listener
		function MediaQuery(mq) {
			if (mqls[0].matches) {
				console.log("laptop");
				// path.setAttribute("viewBox", strViewBoxs[0]);
				$('.solarLine1').attr("viewBox", strViewBoxs[0]);
			}
			else if (mqls[1].matches) {
				console.log("desktop");
				// path.setAttribute("viewBox", strViewBoxs[1]);
				$('.solarLine1').attr("viewBox", strViewBoxs[1]);
			}
			else if (mqls[2].matches) {
				console.log("laptopW");
				// path.setAttribute("viewBox", strViewBoxs[2]);
				$('.solarLine1').attr("viewBox", strViewBoxs[2]);
			}
			else if (mqls[3].matches) {
				console.log("laptop2W");
				// path.setAttribute("viewBox", strViewBoxs[3]);
				$('.solarLine1').attr("viewBox", strViewBoxs[3]);
			}
			else if (mqls[4].matches) {
				console.log("desktopW");
				// path.setAttribute("viewBox", strViewBoxs[4]);
				$('.solarLine1').attr("viewBox", strViewBoxs[4]);
			}
			else if (mqls[5].matches) {
				console.log("popularW");
				// path.setAttribute("viewBox", strViewBoxs[5]);
				$('.solarLine1').attr("viewBox", strViewBoxs[5]);
			}
		}

		function viewBoxAdjuster() {
			for (var i=0; i<6; i++){
	            vm.MediaQuery(mqls[i]);
	            // console.log(vm.strVB);
	            mqls[i].addListener(vm.MediaQuery);
	        }
	    }
	}
})();
