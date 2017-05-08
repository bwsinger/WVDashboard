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
						.attr('transform', 'translate('+margin.left+','+margin.top+')');

					var names =  d3.scaleOrdinal()
						.domain(buildings.map(function(d) {return d.id; }))
						.range(buildings.map(function(d) {return d.name; }));

					// Setup scales
					var x = d3.scaleLinear()
						.domain([0, 1])
					    .rangeRound([0, width]);

					var y = d3.scaleBand()
						.domain(data.buildings.map(function(d) {return d.building; }))
						.rangeRound([0, height])
						.paddingInner(0.03);

					cont.selectAll('rect.background')
						.data(data.buildings).enter()
						.append('rect')
							.attr('class', 'background')
							.attr('fill', '#F3DEB4') // light yellow
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function() { return x(1); })
							.attr('height', y.bandwidth()+1);

					cont.selectAll('rect.bar')
						.data(data.buildings).enter()
						.append('rect')
							.attr('class', 'bar')
							.attr('fill', function(d) {
								return d.good ? '#71c241' : '#bf2626';
							})
							.attr('x', 0)
							.attr('y', function(d) { return y(d.building); })
							.attr('width', function(d) { return x(d.position); })
							.attr('height', y.bandwidth());

					if(data.finish) {

						var finishHeight = height,
							finishWidth = finishHeight * 0.254716981;

						cont.append('image')
							.attr('class', 'finish')
							.attr('x', x(data.finish) - finishWidth)
							.attr('y', 0)
							.attr('height', finishHeight)
							.attr('width', finishWidth)
							.attr('href', 'images/leaderboard/leaderboard_finish_line.svg');
					}


					var horseHeight = y.bandwidth() * 1.40, // account for the lower drop shadow
						// use image ratio to calculate width
						horseWidth = (horseHeight * 3.828571429),
						// the right drop shadow is about 6% of the total width
						// we need this to make the nose at the line, not the shadow of the nose
						horseRightShadow =  horseWidth * 0.06;

					cont.selectAll('image.horse')
						.data(data.buildings).enter()
						.append('image')
							.attr('class', 'horse')
							.attr('x', function(d) { return x(d.position) - horseWidth + horseRightShadow; })
							.attr('y', function(d) { return y(d.building) - (y.bandwidth() * 0.05); })
							.attr('href', function(d) {
								return 'images/leaderboard/'+names(d.building)+'.svg';
							})
							.attr('height', horseHeight)
							.attr('width', horseWidth);

					var trophyHeight = y.bandwidth(),
						trophyWidth = trophyHeight * 0.836538462;

					cont.selectAll('image.trophy')
						.data(data.buildings.filter(function(v) { return v.trophy; })).enter()
						.append('image')
							.attr('class', 'trophy')
							.attr('x', function(d) { return x(d.position) + 15; })
							.attr('y', function(d) { return y(d.building); })
							.attr('href', 'images/leaderboard/trophy.svg')
							.attr('height', trophyHeight)
							.attr('width', trophyWidth);

				};
			});
		}
	}

})();
