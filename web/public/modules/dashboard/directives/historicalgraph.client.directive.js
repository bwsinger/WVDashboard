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
			}
		};

		return directive;

		////////////

		function link(scope, element) {
			d3Service.d3().then(function(d3) {

				var margin = {top: 30, right: 110, bottom: 50, left: 110};

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
						.y(function(d) { return y(d.demand); });

					var prodLine = d3.line()
						.curve(d3.curveBasis)
						.x(function(d) { return x(d3.isoParse(d.interval)); })
						.y(function(d) { return y(d.production); });

					// TODO add timespan dependent ticks (see percent ZNE directive)

					var yAxis = d3.axisLeft(y)
								.ticks(0)
								.tickSizeOuter(1);

					var xAxis = d3.axisBottom(x)
									.ticks(5)
									.tickSize(15)
									.tickSizeOuter(1);

					var stops = [];
					var badColor = '#bf2626';
					var goodColor = '#71c241';
					var isGood = false;
					var xMax = d3.max(data, function(d) { return d3.isoParse(d.interval); })
					var xMin = d3.min(data, function(d) { return d3.isoParse(d.interval); })

					if(data[data.length-1].demand > data[data.length-1].production) {
						stops.push({ offset: '0%', color: badColor });
					}
					else {
						stops.push({ offset: '0%', color: goodColor });
						isGood = true;
					}

					for(var i = data.length - 2; i > 0; i--) {

						var percentage = ((x(d3.isoParse(data[i].interval))/x(xMax))*100)+'%';

						if(isGood && data[i].demand > data[i].production) {
							stops.push({ offset: percentage, color: goodColor });
							stops.push({ offset: percentage, color: badColor });
							isGood = false;
						}
						else if(!isGood && data[i].demand <= data[i].production) {
							stops.push({ offset: percentage, color: badColor });
							stops.push({ offset: percentage, color: goodColor });
							isGood = true;
						}
					}

					if(isGood) {
						stops.push({offset: '100%', color: goodColor});
					}
					else {
						stops.push({offset: '100%', color: badColor});
					};

					cont.append('linearGradient')
						.attr('id', 'demand-gradient')
						.attr("gradientUnits", "userSpaceOnUse")
						.attr('x2', x(xMax))
						.selectAll("stop")						
							.data(stops)					
							.enter().append("stop")			
								.attr("offset", function(d) { return d.offset; })	
								.attr("stop-color", function(d) { return d.color; });

					// Draw the lines
					cont.append("path")
						.datum(data)
						.attr("stroke", "url(#demand-gradient)")
						.attr("stroke-width", 3)
						.attr("fill", "none")
						.attr("d", demandLine);

					cont.append("path")
						.datum(data)
						.attr("class", "line-prod")
						.attr("d", prodLine);

					// Draw the axes
					var gx = cont.append("g")
						.attr("transform", "translate(0," + height + ")")
						.call(xAxis);

					gx.selectAll("text")
						.attr('font-family', 'webly');

					cont.append("g")
						.call(yAxis)
					.append("text")
						.attr("class", 'y-axis-label')
						.attr("fill", "#FFF")
						.attr('x', -height/2)
						.attr('y', -25)
						.attr("transform", "rotate(-90)")
						.attr('font-family', 'webly')
						.style("text-anchor", "middle")
						.text("kW");

				};

			});
		}
	}

})();
