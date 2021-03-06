(function() {
	'use strict';

	angular
		.module('dashboard')
		.directive('historicalGraph', historicalGraph);

	historicalGraph.$inject = ['d3Service'];

	function historicalGraph(d3Service) {

		var directive = {
			restrict: 'EA',
			link: link,
			scope: {
				data: '=',
				timespan: '=',
			}
		};

		return directive;

		////////////

		function link(scope, element) {
			d3Service.d3().then(function(d3) {

				var margin = {top: 30, right: 130, bottom: 40, left: 110};

				var svg = d3.select(element[0])
							.append('svg')
							.attr('class', 'historicalGraph');				

				//Watch for resizing (window / angular) or data changing
				window.onresize = function() {
					scope.$apply();
				};
				scope.$watch(function() {
					return angular.element(window)[0].innerWidth;
				}, function(newVal, oldVal) {
					if(newVal !== oldVal) {
						scope.render(scope.data, scope.timespan);
					}
				});
				scope.$watch('data', function() {
					scope.render(scope.data, scope.timespan);
				}, true);

				//Render the chart
				scope.render = function(data, timespan) {

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

					// Setup scales
					var x = d3.scaleTime()
						.domain(d3.extent(data, function(d) { return d3.isoParse(d.interval); }))
					    .rangeRound([0, width]);

					var yMax = d3.max(data, function(d) {
						return d.demand > d.production ? d.demand : d.production;
					});

					var y = d3.scaleLinear()
						.domain([0, yMax])
					    .rangeRound([height, 0]);

					// Setup line
					var demandLine = d3.line()
						.curve(d3.curveBasis)
						.x(function(d) { return x(d3.isoParse(d.interval)); })
						.y(function(d) { return y(d.demand); })
						.defined(function(d) { return d.demand !== null; });

					var prodLine = d3.line()
						.curve(d3.curveBasis)
						.x(function(d) { return x(d3.isoParse(d.interval)); })
						.y(function(d) { return y(d.production); })
						.defined(function(d) { return d.production !== null; });

					var xTicks;
					switch(timespan) {
						case 'hourly':
							xTicks = 25;
							break;
						case 'daily':
							xTicks = 8;
							break;
						case 'weekly':
							xTicks = 5;
							break;
						case 'monthly':
							xTicks = 13;
							break;
					}

					var yAxis = d3.axisLeft(y)
									.ticks(5)
									.tickSize(15)
									.tickSizeOuter(1);

					var xAxis = d3.axisBottom(x)
									.ticks(xTicks)
									.tickSize(15)
									.tickSizeOuter(1)
									.tickFormat(function(d) {

										if(timespan === 'weekly') {
											var start = d3.isoParse(d);
											var end = new Date(start.valueOf());
											end.setDate(end.getDate()+6);

											// If they're the same month, omit the month on the end
											if(start.getMonth() === end.getMonth()) {
												var startFormatter = d3.timeFormat('%b %-e');
												var endFormatter = d3.timeFormat('%-e');
												return startFormatter(start)+'-'+endFormatter(end);
											}
											// If they're different months, print the month for both
											else {
												var formatter = d3.timeFormat('%b %-e');
												return formatter(start)+'-'+formatter(end);
											}
										}
										else {
											var formatString = '';

											switch(timespan) {
												case 'hourly':
													formatString = '%-I%p';
													break;
												case 'daily':
													formatString = '%b %-e';
													break;
												case 'monthly':
													formatString = '%b';
													break;
											}

											var xFormatter = d3.timeFormat(formatString);
											return xFormatter(d3.isoParse(d));
										}
									});

					var stops = [];
					var badColor = '#bf2626';
					var goodColor = '#71c241';
					var isGood = false;

					// Which color do we start with
					if(data[data.length-1].demand > data[data.length-1].production) {
						stops.push({ offset: '0%', color: badColor });
					}
					else {
						stops.push({ offset: '0%', color: goodColor });
						isGood = true;
					}

					for(var i = data.length - 2; i > 0; i--) {

						// Check if we switched which curve is on top
						if((isGood && data[i].demand > data[i].production) || (!isGood && data[i].demand < data[i].production)) {
							var Py1 = data[i+1].production,
								Py2 = data[i].production,
								Dy1 = data[i+1].demand,
								Dy2 = data[i].demand,
								x1 = Date.parse(data[i+1].interval),
								x2 = Date.parse(data[i].interval); //use ms for calculations

							// Calculate the equation for both lines given the points at i and i+1
							var Pm = (Py2 - Py1) / (x2 - x1);
							var Pb = Py2 - (Pm * x2);

							var Dm = (Dy2 - Dy1) / (x2 - x1);
							var Db = Dy2 - (Dm * x2);

							// Calculate the time where the intersect and convert to percentage
							var xIntersection = (Db - Pb) / (Pm - Dm);
							var percentage = ((x(new Date(xIntersection))/width)*100)+'%';

							if(isGood) {
								stops.push({ offset: percentage, color: goodColor });
								stops.push({ offset: percentage, color: badColor });
								isGood = false;
							}
							else {
								stops.push({ offset: percentage, color: badColor });
								stops.push({ offset: percentage, color: goodColor });
								isGood = true;
							}
						}
					}

					// Close the last color
					if(isGood) {
						stops.push({offset: '100%', color: goodColor});
					}
					else {
						stops.push({offset: '100%', color: badColor});
					}

					// Insert the gradient
					cont.append('linearGradient')
						.attr('id', 'demand-gradient')
						.attr('gradientUnits', 'userSpaceOnUse')
						.attr('x', 0)
						.attr('y', 0)
						.attr('x2', width)
						.attr('y2', 0)
						.selectAll('stop')						
							.data(stops)					
							.enter().append('stop')			
								.attr('offset', function(d) { return d.offset; })	
								.attr('stop-color', function(d) { return d.color; });

					// Draw the two lines
					cont.append('path')
						.datum(data)
						.attr('stroke', 'url(#demand-gradient)')
						.attr('stroke-width', 2)
						.attr('fill', 'none')
						.attr('d', demandLine);

					cont.append('path')
						.datum(data)
						.attr('stroke', '#ffcc33')
						.attr('stroke-width', 2)
						.attr('fill', 'none')
						.attr('d', prodLine);

					// Draw the axes
					var gx = cont.append('g')
						.attr('transform', 'translate(0,' + height + ')')
						.call(xAxis);

					// x-axis line
					gx.selectAll('path')
						.attr('fill', 'white')
						.attr('stroke', 'white')
						.attr('stroke-width', '3');

					// x-axis ticks
					gx.selectAll('line')
						.attr('stroke', 'white')
						.attr('stroke-width', '3')
						.attr('transform', 'translate(0, -7.5)');

					// x-axis labels
					gx.selectAll('text')
						.attr('fill', 'white')
						.attr('font-family', 'LetterGothicStd')
						.attr('font-weight', 'bold')
						.attr('text-anchor', 'middle')
						.attr('font-size', function() {
							var size = '2em';
							if(timespan === 'hourly') {
								size = '1.2em';
							}

							return size;
						});

					var gy = cont.append('g')
						// .attr('transform', 'translate(0,' + height + ')')
						.call(yAxis);

					// y-axis line
					gy.selectAll('path')
						.attr('fill', 'white')
						.attr('stroke', 'white')
						.attr('stroke-width', '3');

					// y-axis ticks
					gy.selectAll('line')
						.attr('stroke', 'white')
						.attr('stroke-width', '3');

					// y-axis labels
					gy.selectAll('text')
						.attr('fill', 'white')
						.attr('font-size', '2em')
						.attr('font-family', 'LetterGothicStd')
						.attr('font-weight', 'bold')
						.attr('text-anchor', 'end')
						.attr('transform', 'translate(-7.5, 0)');

					// Y-axis label (kW)
					gy.append('text')
						.attr('fill', '#FFF')
						.attr('x', -height/2)
						.attr('y', -55)
						.attr('transform', 'rotate(-90)')
						.attr('font-family', 'LetterGothicStd')
						.style('text-anchor', 'middle')
						.attr('font-size', '3em')
						.attr('font-weight', 'bold')
						.text('kW');

				};

			});
		}
	}

})();
