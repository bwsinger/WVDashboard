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
				patterns: '=',
				timespan: '=',
			}
		};

		return directive;

		////////////

		function link(scope, element) {
			d3Service.d3().then(function(d3) {

				var margin = {top: 200, right: 85, bottom: 100, left: 100};

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
						scope.render(scope.data, scope.patterns, scope.timespan);
					}
				});
				scope.$watch('data', function() {
					scope.render(scope.data, scope.patterns, scope.timespan);
				}, true);
				scope.$watch('patterns', function() {
					scope.render(scope.data, scope.patterns, scope.timespan);
				}, true);

				//Render the chart
				scope.render = function(data, patterns, timespan) {

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
								.domain([200, 0])
								.range([0, width]);

					// scale for intervals
					var y0 = d3.scaleBand()
								.domain(intervals)
								.rangeRound([0, height])
								.paddingInner(0.4)
								.paddingOuter(0.2);

					// scale for buildings
					var y1 = d3.scaleBand()
								.domain(buildings)
								.rangeRound([0, y0.bandwidth()])
								.paddingInner(0.05);


					// color scale for the buildings
					// TODO: add patterns
					if(patterns) {
						var fill = d3.scaleOrdinal()
							.domain(buildings)
							.range(["#circles-2" , "#diagonal-stripe-2", "#crosshatch", "#circles-9"]);
					}

					var defs = cont.append('defs');

					defs.append('pattern')
							.attr('id', 'circles-9')
							.attr('patternUnits', 'userSpaceOnUse')
							.attr('width', 10)
							.attr('height', 10)
						.append('image')
							.attr('width', 10)
							.attr('height', 10)
							.attr('x', 0)
							.attr('y', 0)
							.attr('xlink:href', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSd3aGl0ZScgLz4KICA8Y2lyY2xlIGN4PSc1JyBjeT0nNScgcj0nNScgZmlsbD0nYmxhY2snLz4KPC9zdmc+');

					defs.append('pattern')
							.attr('id', 'crosshatch')
							.attr('patternUnits', 'userSpaceOnUse')
							.attr('width', 8)
							.attr('height', 8)
						.append('image')
							.attr('width', 8)
							.attr('height', 8)
							.attr('x', 0)
							.attr('y', 0)
							.attr('xlink:href', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==');

					defs.append('pattern')
							.attr('id', 'diagonal-stripe-2')
							.attr('patternUnits', 'userSpaceOnUse')
							.attr('width', 10)
							.attr('height', 10)
						.append('image')
							.attr('width', 10)
							.attr('height', 10)
							.attr('x', 0)
							.attr('y', 0)
							.attr('xlink:href', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSd3aGl0ZScvPgogIDxwYXRoIGQ9J00tMSwxIGwyLC0yCiAgICAgICAgICAgTTAsMTAgbDEwLC0xMAogICAgICAgICAgIE05LDExIGwyLC0yJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInLz4KPC9zdmc+');

					defs.append('pattern')
							.attr('id', 'circles-2')
							.attr('patternUnits', 'userSpaceOnUse')
							.attr('width', 10)
							.attr('height', 10)
						.append('image')
							.attr('width', 10)
							.attr('height', 10)
							.attr('x', 0)
							.attr('y', 0)
							.attr('xlink:href', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSd3aGl0ZScgLz4KICA8Y2lyY2xlIGN4PScxLjUnIGN5PScxLjUnIHI9JzEuNScgZmlsbD0nYmxhY2snLz4KPC9zdmc+Cg==');

					var yAxis = d3.axisLeft(y0)
								.tickSizeOuter(1)
								.tickSizeInner(20)
								.tickFormat(function(d) {
									if(timespan === 'weekly') {
										var start = d3.isoParse(d);
										var end = new Date(start.valueOf());
										end.setDate(end.getDate()+6);

										// If they're the same month, omit the month on the end
										if(start.getMonth() === end.getMonth()) {
											var startFormatter = d3.timeFormat('%b %-e');
											var endFormatter = d3.timeFormat('%-e');
											return startFormatter(start)+"-"+endFormatter(end);
										}
										// If they're different months, print the month for both
										else {
											var formatter = d3.timeFormat('%b %-e');
											return formatter(start)+"-"+formatter(end);
										}
									}
									else {
										var formatString = '';

										switch(timespan) {
											case 'hourly':
												formatString = '%-I %p'
												break;
											case 'daily':
												formatString = '%b %-e';
												break;
											case 'monthly':
												formatString = '%b';
												break;
										}

										var yFormatter = d3.timeFormat(formatString);
										return yFormatter(d3.isoParse(d));
									}
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
								return d.percent >= 100 ? x(d.percent) : x(100);
							})
							.attr("width", function(d) {
								// width of positive is the difference between the scaled value and zero
								// width of negative is the difference between zero and the scaled value
								return d.percent >= 100 ? x(100) - x(d.percent) : x(d.percent) - x(100);
							})
							.style("fill", function(d) {
								// if we show all buildings, use the color scale
								if(patterns) {
									return 'url('+fill(d.building)+')';
								}
								// otherwise, just red and green
								else if(d.percent < 100) {
									return '#71c241';
								}
								else {
									return '#bf2626';
								}
							});

					
					// insert y-axis
					var gy = cont.append("g")
						.call(yAxis);

					// y-axis line
					gy.selectAll('path')
						.attr('transform', 'translate('+width/2+', 0)')
						.attr('fill', 'white')
						.attr('stroke', 'white')
						.attr('stroke-width', '3');

					// y-axis ticks
					gy.selectAll('line')
						.attr('stroke', 'white')
						.attr('stroke-width', '3')
						.attr('transform', 'translate(-10, 0)');

					// y-axis labels
					gy.selectAll('text')
						.attr('transform', 'rotate(90) translate(25, 50)')
						.attr('fill', 'white')
						.attr('font-size', '15')
						.attr('font-family', 'webly')
						.attr('font-weight', 'bold')
						.attr('text-anchor', 'middle');

					// insert x-axis
					var gx = cont.append("g")
						.call(xAxis);

					// add the label text
					gx.append("text")
						.attr('font-size', '25')
						.attr("fill", "#FFF")
						.attr('x', width/2)
						.attr('y', -25)
						.attr('font-family', 'webly')
						.attr('font-weight', 'bold')
						.style("text-anchor", "middle")
						.text("percent of zero-net goal");

					// x-axis line
					gx.selectAll('path')
						.attr('fill', 'white')
						.attr('stroke', 'white')
						.attr('stroke-width', '3');

					if(fill) {
					// legend

						var legendMargin = {left: 20, bottom: 10, right: 20},
							legendWidth = svg.nodes()[0].getBoundingClientRect().width - legendMargin.left - legendMargin.right;

						var legend = svg.append('g')
										.attr('class', 'legend')
										.attr('transform', 'translate('+legendMargin.left+',-'+legendMargin.bottom+')');

						var items = legend.selectAll('g.item')
							.data(buildings)
								.enter().append("g")
								.attr('class', 'item')
								.attr("x", function(d) {
									return (legendWidth / 4) * buildings.indexOf(d);
								})
								.attr("y", svg.nodes()[0].getBoundingClientRect().height - legendMargin.bottom - 20)
								.attr("height", 20)
								.attr("width", legendWidth / 4);

						items.append('rect')
								.attr('height', 20)
								.attr('width', 20)
								.attr('x', function(d) {
									return (legendWidth / 4) * buildings.indexOf(d);
								})
								.attr('y', svg.nodes()[0].getBoundingClientRect().height - legendMargin.bottom - 20)
								.attr("fill", function(d) { return 'url('+fill(d)+')'; })
								.attr('stroke', 'black')
								.attr('stroke-width', 1);

						items.append('text')
							.attr('x', function(d) {
								return ((legendWidth / 4) * buildings.indexOf(d)) + 35;
							})
							.attr('y', svg.nodes()[0].getBoundingClientRect().height - legendMargin.bottom - 20)
							.text(function(d) { return d; })
							.attr('dy', '1em')
							.attr('fill', 'white')
							.attr('font-family', 'webly')
							.attr('font-size', '1em')
							.attr('text-anchor', 'start');

					}
				};
			});
		}
	}

})();
