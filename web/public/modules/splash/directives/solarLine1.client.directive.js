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
                // data: '=',
                // buildings: '=',
            }
        };

        return directive;

        ////////////

        function link(scope, element) {


            console.log('linking'); 

            d3Service.d3().then(function(d3) {

                console.log('d3 loaded');

                var margin = {top: 0, right: 0, bottom: 0, left: 0};

                var svg = d3.select(element[0])
                            .append('svg')
                            .attr('class', 'solarLine1');

                //Watch for resizing (window / angular) or data changing
                window.onresize = function() {
                    scope.$apply();
                };
                scope.$watch(function() {
                    return angular.element(window)[0].innerWidth;
                });
                // , function(newVal, oldVal) {
                //     if(newVal !== oldVal) {
                //         scope.render(scope.data, scope.buildings);
                //     }
                // });
                // scope.$watch('data', function() {
                //     scope.render(scope.data, scope.buildings);
                // }, true);

                //Render the chart
                // function(data, buildings)
                //scope.render = function() {
                    // Setup sizing
                    var height = svg.nodes()[0].getBoundingClientRect().height - margin.top - margin.bottom,
                        width = svg.nodes()[0].getBoundingClientRect().width - margin.left - margin.right;

                    // Don't redraw if there are negative values on the height or width (hidden)
                    if(! (height > 0 && width > 0)) {
                        return;
                    }

                    // Clear existing
                    svg.selectAll('*').remove();

                    // // Wrapper to ensure margins
                    // var cont = svg.append('g')
                    //     .attr('transform', 'translate('+margin.left+','+margin.top+')');

                    // var points = [
                    //     [480, 200],
                    //     [580, 400],
                    //     [680, 100],
                    //     [780, 300],
                    //     [180, 300],
                    //     [280, 100],
                    //     [380, 400]
                    // ];

                    // number of total arrows to spawn
                    var arrowData = d3.range(50);

                    // var svg = d3.select("body").append("svg")
                    //     .attr("width", 960)
                    //     .attr("height", 500);

                    var path = svg.append("path")
                        .data([scope.points])
                        .attr("d", d3.line());

                    var arrow = svg.selectAll(".arrow")
                        .data(arrowData)
                        .enter()
                        .append("polygon")
                        .attr("points", "0,24, 15,12, 0,0");

                    var counter = -1;

                    // IIFE that sets delay for each spawned arrow
                    (function loop() {
                        if (counter++ > 48) return;
                        setTimeout(function() {
                            var thisPolygon = d3.selectAll("polygon").filter(function(d, i) {
                                return i == counter;
                            });
                            transition(thisPolygon);
                            loop()
                        }, 1000) // delay between arrows
                    }())

                    function transition(elem) {
                        elem.transition()
                            .duration(50000) // total time for an arrow to move along path
                            .ease(d3.easeLinear)
                            .attrTween("transform", translateAlong(path.node()))
                            .on("end", function() {
                                return transition(elem)
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
               // }; // end render function
            }); // end function(d3)
        } // end link(scope,element)
    } // end solarLine1(d3Service)
})();
