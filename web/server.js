process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || 3000;

var schedule = require('./config/schedule'),
	express = require('./config/express'),
	app = express();

schedule.start(); // start scheduled tasks

app.listen(process.env.PORT);

module.exports = app;

console.log('Server running at http://localhost:'+process.env.PORT+'/');