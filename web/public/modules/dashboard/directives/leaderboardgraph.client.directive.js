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
			}
		};

		return directive;

		////////////

		function link(scope, element) {
			d3Service.d3().then(function(d3) {

				var margin = {top: 5, right: 45, bottom: 50, left: 175};

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
						scope.render(scope.data);
					}
				});
				scope.$watch('data', function() {
					scope.render(scope.data);
				}, true);

				//Render the chart
				scope.render = function(data) {

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
						.attr('transform', 'translate('+margin.left+','+margin.top+') skewX(-30)');

					// Setup scales
					var x = d3.scaleLinear()
						.domain([0, 1])
					    .rangeRound([0, width]);

					var buildings = []

					buildings.push({ x: data['ZNE']+0.2, y: '215', place: 1,});

					for(var item in data) {
						if(item != 'ZNE') {
							buildings.push({
								x: data[item],
								y: item,
								place: 1,
							});
						}
					}

					// temp
					buildings.push({ x: data['ZNE']+0.3, y: '1605', place: 1,});
					buildings.push({ x: data['ZNE']+0.1, y: '1715', place: 1,});
					

					for(var i = 0, len = buildings.length; i < len; i++) {
						for(var j = 0; j < len; j++) {
							if(j!==i && buildings[i].x < buildings[j].x) {
								buildings[i].place++;
							}
						}
					}

					console.log(buildings);

					var y = d3.scaleBand()
						.domain(buildings.map(function(d) {return d.y; }))
						.rangeRound([0, height])
						.paddingInner(0.03);

					cont.selectAll('rect.background')
						.data(buildings).enter()
						.append('rect')
							.attr('class', 'background')
							.attr('fill', '#d3d4b1')
							.attr('x', 0)
							.attr('y', function(d) { return y(d.y); })
							.attr('width', function(d) { return x(1); })
							.attr("height", y.bandwidth());

					cont.selectAll('rect.bar')
						.data(buildings).enter()
						.append('rect')
							.attr('class', 'bar')
							.attr('fill', function(d) {
								return d.x >= data['ZNE'] ? '#71c241' : '#bf2626';
							})
							.attr('x', 0)
							.attr('y', function(d) { return y(d.y); })
							.attr('width', function(d) { return x(d.x); })
							.attr("height", y.bandwidth())

					cont.selectAll('image.horse')
						.data(buildings).enter()
						.append('image')
							.attr('class', 'horse')
							.attr('x', function(d) { return x(d.x) - 80 > 0 ? x(d.x) - 70 : 0; })
							.attr('y', function(d) { return y(d.y) - 10; })
							.attr('href', function(d) {
								return 'images/leaderboard/'+d.y+'-'+d.place+'.svg';
							})
							.attr('height', function(d) {
								return y.bandwidth() * 1.2;
							})
							.attr('width', function(d) {
								return (y.bandwidth() * 1.2) * 1.5;
							});

					cont.selectAll('image.gate')
						.data(buildings).enter()
						.append('image')
							.attr('class', 'gate')
							.attr('x', -40)
							.attr('y', function(d) { return y(d.y); })
							.attr('height', 100)
							.attr('width', 40)
							.attr("href","images/leaderboard/leaderboard_gate.svg");

				};
			});
		}
	}

})();
