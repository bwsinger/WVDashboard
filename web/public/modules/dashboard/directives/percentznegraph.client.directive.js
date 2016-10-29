(function() {
	'use strict';

	angular
		.module('dashboard')
		.directive('percentzneGraph', percentzneGraph);

	percentzneGraph.$inject = ['d3Service'];

	function percentzneGraph(d3Service) {

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

				var margin = {top: 200, right: 50, bottom: 100, left: 100};

				var svg = d3.select(element[0])
							.append('svg')
							.attr('class', 'percentzneGraph');				

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

					// overwrite with dummy data so we can see multiple buildings
					// data = [
					// 	  {
					// 	    "1590": 253.4523,
					// 	    "215": 6,
					// 	    "1650": 6,
					// 	    "1715": 6,
					// 	    "interval": "2016-10-17T07:00:00.000Z"
					// 	  },
					// 	  {
					// 	    "1590": 164.52466666666666,
					// 	    "215": .12,
					// 	    "1650": 6.0,
					// 	    "1715": 6.0,
					// 	    "interval": "2016-10-10T07:00:00.000Z"
					// 	  },
					// 	  {
					// 	    "1590": 190.43256666666667,
					// 	    "215": -32,
					// 	    "1650": 6.0,
					// 	    "1715": 6.0,
					// 	    "interval": "2016-10-03T07:00:00.000Z"
					// 	  },
					// 	  {
					// 	    "1590": -50,
					// 	    "215": 50,
					// 	    "1650": -100,
					// 	    "1715": 100,
					// 	    "interval": "2016-09-26T07:00:00.000Z"
					// 	  }
					// 	]

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

					var buildings = d3.keys(data[0]).filter(function(key) { return key !== 'interval' });
					var intervals = data.map(function(d) { return d.interval; });

					var percentMax = d3.max(data.map(function(d) {
						return d3.max(buildings.map(function(i) {
							return d[i];
						}));
					}));

					var percentMin = d3.min(data.map(function(d) {
						return d3.min(buildings.map(function(i) {
							return d[i];
						}));
					}));

					// Use the largest absolute value for the min and max
					// so that zero is in the center
					var percentToUse = percentMax > -percentMin ? percentMax : -percentMin;

					// scale for percents
					var x = d3.scaleLinear()
								.domain([-percentToUse, percentToUse])
								.range([0, width]);

					// scale for intervals
					var y0 = d3.scaleBand()
								.domain(intervals)
								.rangeRound([0, height])
								.paddingInner(0.6);

					// scale for buildings
					var y1 = d3.scaleBand()
								.domain(buildings)
								.rangeRound([0, y0.bandwidth()])
								.paddingInner(0.2);


					// color scale for the buildings
					// TODO: add patterns
					var color = d3.scaleOrdinal()
						.domain(buildings)
						.range(["#c7b299", "#9e005d", "#2e3192", "#ffffff"]);

					var yFormatter = d3.timeFormat("%b %e");

					var yAxis = d3.axisLeft(y0)
								.tickSizeOuter(1)
								.tickSizeInner(20)
								.tickFormat(function(d) {
									return yFormatter(d3.isoParse(d));
								});

					var xAxis = d3.axisTop(x)
								.ticks(0)
								.tickSize(0)
								.tickSizeOuter(1);

					// add a group for each time interval
					var interval = cont.selectAll(".interval")
										.data(data).enter()
										.append("g")
											.attr("class", "interval")
											.attr("transform", function(d) { return "translate(0, " + y0(d.interval) + ")"; });

					// add a rect for each building
					interval.selectAll("rect")
							.data(function(d) {
								return buildings.map(function(building) {
									return {
										building: building,
										percent: d[building],
									};
								});
							})
							.enter().append("rect")
							.attr("y", function(d) { return y1(d.building); })
							.attr("height", y1.bandwidth())
							.attr("x", function(d) {
								//positive starts at the center,
								//negative starts at the scaled value
								return d.percent >= 0 ? x(0) : x(d.percent);
							})
							.attr("width", function(d) {
								// width of positive is the difference between the scaled value and zero
								// width of negative is the difference between zero and the scaled value
								return d.percent >= 0 ? x(d.percent) - x(0) : x(0) - x(d.percent);
							})
							.style("fill", function(d) { return color(d.building); });

					

					var gy = cont.append("g")
						.call(yAxis);

					gy.selectAll('path')
						.attr('transform', 'translate('+width/2+', 0)');

					gy.selectAll('line')
						.attr('transform', 'translate(40, 0)');

					gy.selectAll('text')
						.attr('transform', 'rotate(90)');


					cont.append("g")
						.call(xAxis)
					.append("text")
						.attr('class', 'x-axis-label')
						.attr("fill", "#FFF")
						.attr('x', width/2)
						.attr('y', -25)
						.style("text-anchor", "middle")
						.text("percent of zero-net goal");

					// Setup scales

					// group for each interval

					// rect for each building for each interval

					// axes


				};

			});
		}
	}

})();
