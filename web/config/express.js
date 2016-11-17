'use strict';

var http			= require('http'),
	express 		= require('express'),
	morgan 			= require('morgan'),
	compress 		= require('compression'),
	bodyParser 		= require('body-parser'),
	cookieParser 	= require('cookie-parser'),
	pug				= require('pug'),
	config = require('./config');

module.exports = function() {
	var app = express();

	var server = http.createServer(app);

	// Middleware
	if(process.env.NODE_ENV !== 'production') {
		app.use(morgan('dev'));
	}
	else {
		app.use(compress());
	}

	app.use(bodyParser.urlencoded({
		extended: false
	}));

	app.use(bodyParser.json());
	app.use(cookieParser()); // is this actually used/needed?

	// Templates
	app.engine('server.view.html', pug.renderFile);
	app.set('view engine', 'server.view.html');
	app.set('views', './app/views');

	// Routes
	require('../app/routes/core.server.routes.js')(app);
	require('../app/routes/api.server.routes.js')(app);

	// Static
	app.use(express.static('./public'));

	// TODO Added from original, but these need some work
	// Handle 404
	app.use(function(req, res, next) {
	  var err = new Error('Not Found');
	  err.status = 404;
	  next(err);
	});

	// Error handler
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);

		res.render('error', {
			message: err.message,
			error: process.env.NODE_ENV === 'production'? {} : err,
		});
	});

	return server;
};