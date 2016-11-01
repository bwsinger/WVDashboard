'use strict';

var http			= require('http'),
	express 		= require('express'),
	favicon 		= require('serve-favicon'),
	morgan 			= require('morgan'),
	bodyParser 		= require('body-parser'),
	cookieParser 	= require('cookie-parser'),
	pug				= require('pug'),
	config = require('./config');

module.exports = function() {
	var app = express();

	var server = http.createServer(app);

	// Middleware

	// is this actually used/needed? the static route will handle the favicon
	// uncomment after placing your favicon in /public
	//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

	if(process.env.NODE_ENV === 'development') {
		app.use(morgan('dev'));
	}
	// else use compression for production?

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

	// Added from original, but these need some work
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
			error: process.env.NODE_ENV === 'development'? err : {}
		});
	});

	return server;
};