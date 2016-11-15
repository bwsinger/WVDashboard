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


					var y = d3.scaleBand()
						.domain(data.map(function(d) {return d.building; }))
						.rangeRound([0, height])
						.paddingInner(0.03);

					cont.selectAll('rect.background')
						.data(data).enter()
						.append('rect')
							.attr('class', 'background')
							.attr('fill', '#d3d4b1')
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function(d) { return x(1); })
							.attr("height", y.bandwidth());

					cont.selectAll('rect.bar')
						.data(data).enter()
						.append('rect')
							.attr('class', 'bar')
							.attr('fill', function(d) {
								return d.good ? '#71c241' : '#bf2626';
							})
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function(d) { return x(d.position); })
							.attr("height", y.bandwidth())

					cont.selectAll('image.horse')
						.data(data).enter()
						.append('image')
							.attr('class', 'horse')
							.attr('x', function(d) { return x(d.position) - 80 > 0 ? x(d.position) - 70 : 0; })
							.attr('y', function(d) { return y(d.building) - 10; })
							.attr('href', function(d) {
								return 'images/leaderboard/'+d.building+'-'+d.place+'.svg';
							})
							.attr('height', function(d) {
								return y.bandwidth() * 1.2;
							})
							.attr('width', function(d) {
								return (y.bandwidth() * 1.2) * 1.5;
							});

					cont.selectAll('image.gate')
						.data(data).enter()
						.append('image')
							.attr('class', 'gate')
							.attr('x', -40)
							.attr('y', function(d) { return y(d.building); })
							.attr('height', 100)
							.attr('width', 40)
							.attr("href","images/leaderboard/leaderboard_gate.svg");

				};
			});
		}
	}

})();
