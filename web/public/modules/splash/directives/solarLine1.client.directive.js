(function() {
    'use strict';

    angular
        .module('splash')
        .directive('solarLine1', solarLine1);

    solarLine1.$inject = ['d3Service'];

    function solarLine1(d3Service) {

        var directive = {
            restrict: 'EA',
            link: link,
            scope: {
                points: '=',
                arrow: '=',
                path: '=',
                data: '=',
            }
        };

        return directive;

        ////////////

        function link(scope, element) {


            // console.log('linking'); 

            d3Service.d3().then(function(d3) {

                console.log('d3 loaded');

                var margin = {top: 0, right: 0, bottom: 0, left: 0};


                var svg = d3.select(element[0])
                            .append('svg')
                            .attr('class', 'solarLine1')
                            .attr("viewBox", "0 0 1600 1080")
                            .attr("preserveAspectRatio", "none" /*"xMidYMid meet"*/)
                            ;

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

                    // No data to display for this building
                    if(!data) {
                        return;
                    }

                    // Clear existing
                    svg.selectAll('*').remove();

                    // // Wrapper to ensure margins
                    // var cont = svg.append('g')
                    //     .attr('transform', 'translate('+margin.left+','+margin.top+')');

                    // var svg = d3.select("body").append("svg")
                    //     .attr("width", 960)
                    //     .attr("height", 500);

                    var path = svg.append("path")
                        .data([scope.points])
                        .attr("d", d3.line())
                        .attr('class', scope.path);

                    path.each(function(d) { d.totalLength = this.getTotalLength(); })
                        .attr("length", function(d) { return d.totalLength; });

                    var energy = 0;

                    if( data && data.demand !== null && data.production !== null ) {
                        if( scope.arrow === "arrow-red" ) {
                            if(data.demand === 0){
                                console.log("No Demand!");
                                return;
                            }
                            energy = data.demand;
                        } else if( scope.arrow === "arrow-yellow" ) {
                            if(data.production === 0){
                                console.log("No Solar!");
                                return;
                            }
                            energy = data.production;
                        } else {
                            console.log("Error: soloarLine1.client.directive: unexpected arrow style class");
                        }
                    }

                    var speedScale = d3.scaleLinear()
                                                .domain([0, 50000])
                                                .range([30,1]);

                    var arrowDelayScale = d3.scaleLinear()
                                                .domain([30,1])
                                                .range([1200, 100]);

                    var rate = speedScale(energy);
                    var arrowDelay = arrowDelayScale(rate);

                    // console.log(energy + " - " + rate);

                    setInterval(function() {
                        var thisPolygon = svg.append("polygon")
                            .attr("points", "0,18, 18,12, 0,6")
                            .attr('class', scope.arrow);
                        transition(thisPolygon, energy);
                    }, arrowDelay); // delay between arrows

                    function transition(elem, energy) {
                        
                        var dur = (path.attr("length") * rate);
                        // console.log(dur);

                        elem.transition()
                            .duration(dur) // total time for an arrow to move along path
                            .ease(d3.easeLinear)
                            .attrTween("transform", translateAlong(path.node()))
                            .on("end", function() {
                                elem.remove();
                            }); //infinite loop
                    }

                    // Returns an attrTween for translating along the specified path element.
                    function translateAlong(path) {
                        var l = path.getTotalLength();
                        var t0 = 0;
                        return function(d, i, a) {
                            return function(t) {
                                var p0 = path.getPointAtLength(t0 * l); //previous point
                                var p = path.getPointAtLength(t * l); //current point
                                var angle = Math.atan2(p.y - p0.y, p.x - p0.x) * 180 / Math.PI; //angle for tangent
                                t0 = t;
                                // Shifting center to center of arrow
                                // xoffset and yoffset should be half the original width and height of the arrow
                                var xoffset = 12,
                                    yoffset = 12;
                                var centerX = p.x - xoffset;
                                var centerY = p.y - yoffset;
                                return "translate(" + centerX + "," + centerY + ")rotate(" + angle + " " + xoffset + " " + yoffset + ")";
                            };
                        };
                    }
                }; // end render function
            }); // end function(d3)
        } // end link(scope,element)
    } // end solarLine1(d3Service)
})();
