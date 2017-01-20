import psycopg2
import psycopg2.extras
import requests
import logging
import csv
import json
import os
import yaml
from datetime import datetime
from dateutil import parser
from apscheduler.schedulers.blocking import BlockingScheduler

def parse_row(row, columns):
    total = 0
    if len(columns):
        for column in columns:
            total += float(row[column])
        return total
    else:
        return None

def fetch():

    logging.info("Starting run @ {}".format(datetime.now()))

    # connect to db
    try:
        conn = psycopg2.connect("dbname='wvdashboard' user='postgres' host='db' password='postgres'")
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        logging.debug("Successfully connected to the database")
    except:
        logging.error("Cannot connect to the database")
        return

    # grab logger data
    cur.execute(""" SELECT * FROM "loggers" """)
    loggers = cur.fetchall()

    for logger in loggers:
        logging.debug("Starting hobo logger with serial {}".format(logger['serial']))

        # get the last timestamp from db for this logger
        cur.execute("""
            SELECT "datetime"
            FROM "hobodata"
            WHERE "logger" = %s
            ORDER BY "datetime" DESC
            LIMIT 1
        """, (logger['id'], ))
        result = cur.fetchone()
        lasttimestamp = None
        if result is not None:
            lasttimestamp = result[0]

        logging.debug("Looking for data after {}".format(lasttimestamp))
            
        # load credentials
        if os.path.isfile('hobolink.yml'):
            hobolink = yaml.load(open('hobolink.yml'))
        else:
            logging.error("Missing hobolink credentials, see README")
            return

        # grab the latest file  
        url = "http://webservice.hobolink.com/rest/private/devices/{}/data_files/latest/txt".format(logger['serial'])
        req = requests.get(url, auth=(hobolink['username'], hobolink['password']))

        # split csv portion from the junk at the top
        # trim excess whitespace
        # split into lines and feed to the reader
        reader = csv.reader(req.text.split("------------")[1].strip().split('\n'))

        next(reader) #headers

        skipped = 0
        rowstoinsert = []

        for row in reader:

            currtimestamp = parser.parse(row[1])

            # is the row newer?
            if lasttimestamp is None or currtimestamp > lasttimestamp:

                logging.debug("Found row with more recent timestamp: {}".format(currtimestamp))

                # aggregate stats from relevant columns
                hvac = parse_row(row, json.loads(logger['hvac']))
                lights = parse_row(row, json.loads(logger['lights']))
                plugs = parse_row(row, json.loads(logger['plugs']))
                kitchen = parse_row(row, json.loads(logger['kitchen']))
                solar = parse_row(row, json.loads(logger['solar']))
                ev = parse_row(row, json.loads(logger['ev']))

                rowstoinsert.append((logger['id'], currtimestamp, hvac, kitchen, plugs, lights, solar, ev))
                
            else:
                logging.debug("Skipped old row with timestamp: {}".format(currtimestamp))
                skipped+= 1


        # insert if needed
        if len(rowstoinsert):
            cur.executemany("""
                    INSERT INTO "hobodata"
                    ("logger", "datetime", "hvac", "kitchen", "plugs", "lights", "solar", "ev")
                    VALUES(%s, %s, %s, %s, %s, %s, %s, %s)
                """, rowstoinsert)
            conn.commit()

            logging.info("Inserted {} new rows".format(len(rowstoinsert)))

        if skipped > 0:
            logging.info("Skipped {} old rows".format(skipped))

    logging.info("Finished run")

if __name__ == "__main__":

    
    # log info to console
    logging.basicConfig(level=logging.INFO)
    # logging.basicConfig(level=logging.DEBUG)

    # log debug to file   
    # logfile = logging.FileHandler('output.log')
    # logfile.setLevel(logging.DEBUG)
    # logging.getLogger('').addHandler(logfile)

    # setup scheduler
    sched = BlockingScheduler()

    # runs every ten minutes
    sched.add_job(fetch, 'cron', minute='1,11,21,31,41,51')
    # sched.add_job(fetch, 'cron', minute='*/5')

    sched.start()
    logging.info("Starting scheduler")
