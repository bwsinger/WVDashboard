import psycopg2
import requests
import logging
import csv
import yaml
import os
from datetime import datetime
from dateutil import parser
from apscheduler.schedulers.blocking import BlockingScheduler

def parse_row(row, columns):
    total = 0
    if len(columns):
        for column in columns:
            total += float(row[column])
    return total

def fetch():

    logging.info("Starting run @ {}".format(datetime.now()))

    # connect to db
    try:
        # conn = psycopg2.connect("dbname='feed' user='postgres' host='postgres' password='postgres'")
        conn = psycopg2.connect("dbname='feed' user='postgres' host='172.18.0.2' password='postgres'")
        cur = conn.cursor()
        logging.debug("Successfully connected to the database")
    except:
        logging.error("Cannot connect to the database")
        return

    # grab building data
    if os.path.isfile('buildings.yaml'):
        buildings = yaml.load(open('buildings.yaml'))
    else:
        logging.error("Missing building configuration file")
        return

    for b in buildings:
        logging.debug("Starting building {}".format(b))

        # get the last timestamp from db for this building
        cur.execute("""
            SELECT "datetime"
            FROM "log"
            WHERE "building" = %s
            ORDER BY "datetime" DESC
            LIMIT 1
        """, (b, ))
        result = cur.fetchone()
        lasttimestamp = None
        if result is not None:
            lasttimestamp = result[0]

        logging.debug("Looking for data after {}".format(lasttimestamp))

        for s in buildings[b]['serials']:
            logging.debug("Starting hobo logger with serial {}".format(s))

            # grab the latest file
            req = requests.get("http://webservice.hobolink.com/rest/public/devices/{}/data_files/latest/txt".format(s))

            # split csv portion from the junk at the top
            # trim excess whitespace
            # split into lines and feed to the reader
            reader = csv.reader(req.content.split("------------")[1].strip().split('\n'))

            next(reader) #headers

            skipped = 0
            rowstoinsert = []

            for row in reader:

                currtimestamp = parser.parse(row[1])

                # is the row newer?
                if lasttimestamp is None or currtimestamp > lasttimestamp:

                    logging.debug("Found row with more recent timestamp: {}".format(currtimestamp))

                    # aggregate stats from relevant columns
                    kitchen = parse_row(row, buildings[b]['serials'][s]['kitchen'])
                    plugs = parse_row(row, buildings[b]['serials'][s]['plugs'])
                    lights = parse_row(row, buildings[b]['serials'][s]['lights'])
                    solar = parse_row(row, buildings[b]['serials'][s]['solar'])
                    ev = parse_row(row, buildings[b]['serials'][s]['ev'])

                    rowstoinsert.append((b, currtimestamp, kitchen, plugs, lights, solar, ev))
                    
                else:
                    logging.debug("Skipped old row with timestamp: {}".format(currtimestamp))
                    skipped+= 1


            # insert if needed
            if len(rowstoinsert):
                cur.executemany("""
                        INSERT INTO "log"
                        ("building", "datetime", "kitchen", "plugs", "lights", "solar", "ev")
                        VALUES(%s, %s, %s, %s, %s, %s, %s)
                    """, rowstoinsert)
                conn.commit()

                logging.info("Inserted {} new rows".format(len(rowstoinsert)))

            if skipped > 0:
                logging.info("Skipped {} old rows".format(skipped))

    logging.info("Finished run")

if __name__ == "__main__":

    # log debug to file
    logging.basicConfig(filename="output.log", level=logging.DEBUG)

    # log info to console
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    logging.getLogger('').addHandler(console)

    # setup scheduler and start
    logging.info("Starting scheduler")
    sched = BlockingScheduler()
    sched.start()

    # runs ever ten minutes
    sched.add_job(fetch, 'cron', minute='1,11,21,31,41,51')
