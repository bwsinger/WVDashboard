(function(){

	'use strict';

	var dependencies = [
		'ngRoute',
		'core',
		'leaderboard',
		'energy-demand',
		// used to be 'energy-by-use'
		'percent-goal'
		// 'end-use' (end-use module files are good, for some reason still doesn't work)

	]; // all our modules

	angular.module('dashboard', dependencies).config(Config); //.config(Config);

	console.log('Loaded module dependencies: ', dependencies);

	Config.$inject = ['$locationProvider'];

	function Config($locationProvider){
		$locationProvider.hashPrefix('!');

	}

	if(window.location.hash === '#_=_'){
		window.location.hash = '#!';
	}

 	angular.element(document).ready(function(){
		angular.bootstrap(document, ['dashboard']);

		// ******************************************
		// 	Controls the on click actions relating
		// 	to the sidebar including hiding and 
		//  showing the sidebar
		// ******************************************
		var trigger = $('.hamburger'),
        overlay = $('.overlay'),
        isClosed = false;
	    trigger.click(function() {
	        hamburger_cross();
	    });

	    function hamburger_cross() {
	        if (isClosed == true) {
	            overlay.hide();
	            trigger.removeClass('is-open');
	            trigger.addClass('is-closed');
	            isClosed = false;
	        } else {
	            overlay.show();
	            trigger.removeClass('is-closed');
	            trigger.addClass('is-open');
	            isClosed = true;
	        }
	    }
	    $('[data-toggle="offcanvas"]').click(function() {
	        $('#sidebar-wrapper').toggleClass('toggled');
	    });
	    // Change sidebar link style on click
	    $(function() {
	        var links = $('a.nav-item').click(function() {
	            links.removeClass('active');
	            $(this).addClass('active');
	        });
	    });
	    // ******************************************
	});
})();
