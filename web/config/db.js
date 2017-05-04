'use strict';

var pg = require('pg'),
	config = require('./config');

var poolConfig = {
	user: config.db.user,
	database: config.db.database,
	password: config.db.password,
	host: config.db.host,
	port: config.db.port,
	max: 10,
	idleTimeoutMillis: 30000,
};

var pool = new pg.Pool(poolConfig);

pool.on('error', function(err) {
	throw err;
});

module.exports = pool;