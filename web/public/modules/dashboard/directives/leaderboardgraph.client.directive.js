(function() {
	'use strict';

	angular
		.module('dashboard')
		.directive('leaderboardGraph', leaderboardGraph);

	leaderboardGraph.$inject = ['d3Service'];

	function leaderboardGraph(d3Service) {

		var directive = {
			restrict: 'EA',
			link: link,
			scope: {
				data: '=',
				buildings: '=',
			}
		};

		return directive;

		////////////

		function link(scope, element) {
			d3Service.d3().then(function(d3) {

				var margin = {top: 120, right: 45, bottom: 30, left: 40};

				var svg = d3.select(element[0])
							.append('svg')
							.attr('class', 'leaderboardGraph');				

				//Watch for resizing (window / angular) or data changing
				window.onresize = function() {
					scope.$apply();
				};
				scope.$watch(function() {
					return angular.element(window)[0].innerWidth;
				}, function(newVal, oldVal) {
					if(newVal !== oldVal) {
						scope.render(scope.data, scope.buildings);
					}
				});
				scope.$watch('data', function() {
					scope.render(scope.data, scope.buildings);
				}, true);

				//Render the chart
				scope.render = function(data, buildings) {

					// Setup sizing
					var height = svg.nodes()[0].getBoundingClientRect().height - margin.top - margin.bottom,
						width = svg.nodes()[0].getBoundingClientRect().width - margin.left - margin.right;

					// Don't redraw if there are negative values on the height or width (hidden)
					if(! (height > 0 && width > 0)) {
						return;
					}

					// Clear existing
					svg.selectAll('*').remove();

					// Wrapper to ensure margins
					var cont = svg.append('g')
						//.attr('transform', 'translate('+margin.left+','+margin.top+') skewX(-30)');
						.attr('transform', 'translate('+margin.left+','+margin.top+')');

					// separate out the data for buildings from the zne location
					var buildingData = [],
						zneData = [];

					for(var i = 0, len = data.length; i < len; i++) {
						if(data[i].building === 'ZNE') {
							zneData.push(data[i]);
						}
						else {
							buildingData.push(data[i]);
						}
					}

					var names =  d3.scaleOrdinal()
						.domain(buildings.map(function(d) {return d.id; }))
						.range(buildings.map(function(d) {return d.name; }));

					// Setup scales
					var x = d3.scaleLinear()
						.domain([0, 1])
					    .rangeRound([0, width]);


					var y = d3.scaleBand()
						.domain(buildingData.map(function(d) {return d.building; }))
						.rangeRound([0, height])
						.paddingInner(0.03);

					cont.selectAll('rect.background')
						.data(buildingData).enter()
						.append('rect')
							.attr('class', 'background')
							.attr('fill', '#F3DEB4') // light yellow
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function() { return x(1); })
							.attr('height', y.bandwidth()+1);

					cont.selectAll('rect.bar')
						.data(buildingData).enter()
						.append('rect')
							.attr('class', 'bar')
							.attr('fill', function(d) {
								return d.good ? '#71c241' : '#bf2626';
							})
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function(d) { return x(d.position); })
							.attr('height', y.bandwidth());

					var horseExtra = 120,
						horseHeight = y.bandwidth() + horseExtra,
						horseWidth = horseHeight * 1.722222222;

					cont.selectAll('image.horse')
						.data(buildingData).enter()
						.append('image')
							.attr('class', 'horse')
							.attr('x', function(d) { return x(d.position) - 125; })
							.attr('y', function(d) { return y(d.building) - 52; })
							.attr('href', function(d) {
								return 'images/leaderboard/'+names(d.building)+/*'-'+d.place+*/'.svg';
							})
							.attr('height', horseHeight)
							.attr('width', horseWidth);
							//.attr('transform', 'skewX(30)');;

					var gateHeight = y.bandwidth(),
						gateWidth = gateHeight * 1.320754717;

					/*
					cont.selectAll('image.gate')
						.data(buildingData).enter()
						.append('image')
							.attr('class', 'gate')
							.attr('x', -gateWidth)
							.attr('y', function(d) { return y(d.building); })
							.attr('height', gateHeight)
							.attr('width', gateWidth)
							.attr('href', 'images/leaderboard/leaderboard_gate.svg');
							//.attr('transform', 'skewY(55)');
					*/

					cont.append('image')
							.attr('class', 'finish')
							.attr('x', x(zneData[0].position))
							.attr('y', 0)
							.attr('height', height)
							.attr('width', 72)
							.attr('href', 'images/leaderboard/leaderboard_finish_line.svg');

				};
			});
		}
	}

})();
