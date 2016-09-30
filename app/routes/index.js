var express = require('express');
var router = express.Router();
var pg = require('pg');
//local testing
//var connectionString = 'pg://postgres:barry1@localhost/feed';
//production
var connectionString = 'pg://postgres:postgres@postgres/feed';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });

});

router.get('/api/leaderboard', function(req, res){
  var results = [];
   pg.connect(connectionString, function(err, client, done){
       if(err){
         done();
         console.log(err);
         return res.status(500).json({ success: false, data: err});
       }
       var query = client.query("SELECT * FROM log WHERE (logged >= date_trunc('week', CURRENT_TIMESTAMP - interval '1 week'));");
       var counter = 0;
       var b1 = { address: "215" };
       var b2 = { address: "1590" };
       var b3 = { address: "1605" };
       var b4 = { address: "1715" };
       // ****************** INSERT REAL ZNE GOALS HERE *******************
       b1.energy_sum_week = 0;
       b2.energy_sum_week = 0;
       b3.energy_sum_week = 0;
       b4.energy_sum_week = 0;
       b1.zne_sum_week = 30000;
       b2.zne_sum_week = 30000;
       b3.zne_sum_week = 30000;
       b4.zne_sum_week = 30000;
       // *****************************************************************
       query.on('row', function(row){
           //results.push(row);
                  if(row['address'] == 215){
                     console.log('adding to 215');
                     console.log(row);
                     b1.energy_sum_week = row['kitchen'] + row['plugload'] + row['lights'] + row['ev'] + row['hvac'] + row['instahot'] - row['solar'];
                   }
                   else if (row['address'] == 1590) {
                     console.log('adding to 1509');
		                 b2.energy_sum_week = row['kitchen'] + row['plugload'] + row['lights'] + row['ev'] + row['hvac'] + row['instahot'] - row['solar'];

                   } else if (row['address'] == 1605) {
                     console.log('adding to 1605');
                     console.log(row);
                     b3.energy_sum_week = row['kitchen'] + row['plugload'] + row['lights'] + row['ev'] + row['hvac'] + row['instahot'] - row['solar'];

                   } else if (row['address'] == 1715) {
                     console.log('adding to 1715');
                     console.log(row);
                     b4.energy_sum_week = row['kitchen'] + row['plugload'] + row['lights'] + row['ev'] + row['hvac'] + row['instahot'] - row['solar'];
                   }
       });
       query.on('end', function(){
         done();
         //make zne lower than everything
         results.push(b1);
         results.push(b2);
         results.push(b3);
         results.push(b4);
         res.json(results);
       });

  });

});

router.get('/api/all', function(req, res){
        pg.connect(connectionString, function (err, client, done) {
      var sendError = function(err) {
      console.log(err);
      return res.sendStatus(500);
      };

      if (err) return sendError(err);

        var query = client.query("select * from log;", function(err, results) {
        var resuts = [];
        query.on('row', function(row){
          // Handle any errors.
          if (err) return sendError(err);
          results.push(row);
        });
        query.on('end', function(){

          // Done with the client.
          done();
          return res.json(results);
        });





            // Return result
            });
    });
});

router.get('/api/current', function(req, res){
        pg.connect(connectionString, function (err, client, done) {
      var sendError = function(err) {
      console.log(err);
      return res.sendStatus(500);
      };

      if (err) return sendError(err);


        var query = client.query("SELECT * FROM log WHERE (logged >= date_trunc('week', CURRENT_TIMESTAMP - interval '1 week') AND logged <= date_trunc('week', CURRENT_TIMESTAMP));", function(err, results) {
                var resuts = [];
                query.on('row', function(row){
                  // Handle any errors.
                  if (err) return sendError(err);
                  results.push(row);
                });
                query.on('end', function(){

                  // Done with the client.
                  done();
                  return res.json(results);
                });
        });
    });
});

router.get('/api/:month/:day/:year', function(req, res){
        pg.connect(connectionString, function (err, client, done) {
      var sendError = function(err) {
      console.log(err);
      return res.sendStatus(500);
      };

      if (err) return sendError(err);
      var day = req.params.day;
      var month = req.params.month;
      var year = req.params.year;
      var dateParams = "date \'"+year+"-"+month+"-"+day+"\'";
      var queryStr = "SELECT * FROM log WHERE logged >="+dateParams+";";

      var query =   client.query( queryStr, function(err, results) {
      var resuts = [];
      query.on('row', function(row){
        // Handle any errors.
        if (err) return sendError(err);
        results.push(row);
      });
      query.on('end', function(){
        // Done with the client.
        done();
        return res.json(results);
      });
    });
  });
});

module.exports = router;
