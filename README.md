# About

Project by Cenergi to provide feedback on energy usage in West Village. Hobo loggers collect data on energy use. This application downloads that data and uses it to drive a dashboard for each building logged. The dashboard displays current usage, historical usage, and historical performance compared to zero net energy goals. Also, the dashboard compares performance with respect to the zne goal among all the buildings on a weekly leaderboard.

# Using Docker

##### Prequisites

 - Docker
 - Compose

##### Production
```
docker-compose up -d
```

##### Development
```
docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d
```

Grunt will compile SASS and livereload on changes.

Web server will be at [http://localhost:3000/](http://localhost:3000/)

# Outside of Docker

## DB

1. `CREATE DATABASE "feed";`
2. `psql feed < schema/feed.sql`

## Tasks

Pulls data from hobo link every 10 minutes and inserts into the database. 

##### Prequisites

 - python3, pip3
 - postgres server running on localhost @ 5432 with feed database, log tabled created

##### Starting

1. `cd tasks\`
2. `pip install -r requirements.txt`
3. `python logger_processing.py`

## Web Server

Serves front-end content and runs api to access backend data

##### Prequisites

 - node and npm ([package info](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions))
 - ruby (apt install ruby)
 - sass (gem install sass)
 - postgres server running on localhost @ 5432 with feed database, log tabled created, and populated
 - grunt (npm install -g grunt-cli)
 - bower (npm install -g bower)

##### Starting

1. `cd web\`
2. `bower install`
3. `npm install`
4. `grunt`
5. Open [http://localhost:3000/](http://localhost:3000/) in browser

## Twitter Bot

??
