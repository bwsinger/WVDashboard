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
    # this is defined as a bad reading in the hobolink API
    bad_values = [
        '-889',
        '-888.9',
        '-888.88',
    ]
    total = 0
    if len(columns):
        for column in columns:
            if row[column] not in bad_values:
                total += float(row[column].replace(',',''))
        return total
    else:
        return None

def fetch():

    logging.info("Starting run @ {}".format(datetime.now()))

    # load credentials
    if os.path.isfile('db.yml'):
        postgres = yaml.load(open('db.yml'))
    else:
        logging.error("Missing database credentials, see README")
        return

    # connect to db
    try:
        conn_string = "dbname='{}' user='{}' host='{}' password='{}'".format(
            postgres['database'],
            postgres['username'],
            postgres['hostname'],
            postgres['password'],
        )
        conn = psycopg2.connect(conn_string)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        logging.debug("Successfully connected to the database")
    except:
        logging.error("Cannot connect to the database")
        return

    # grab logger data
    cur.execute(""" SELECT * FROM "loggers" """)
    loggers = cur.fetchall()

    for logger in loggers:
        logging.debug("Starting hobo logger with data export {}".format(logger['export']))

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
        url = 'https://webservice.hobolink.com/restv2/data/custom/file'

        payload = {
            "query": logger['export'],
            "authentication": {
                "password": hobolink['password'],
                "user": hobolink['username'],
                "token": hobolink['token'],
            }
        }

        r = requests.post(url, json=payload)

        reader = csv.reader(r.text.strip().split('\n'))
        next(reader) #headers

        skipped = 0
        rowstoinsert = []

        for row in reader:
            currtimestamp = parser.parse(row[0])

            # is the row newer?
            if lasttimestamp is None or currtimestamp > lasttimestamp:

                logging.debug("Found row with more recent timestamp: {}".format(currtimestamp))

                # validate row first
                bad_row = False
                for col in row:
                    if col == '':
                        bad_row = True
                        break

                if not bad_row:

                    # aggregate stats from relevant columns
                    hvac = parse_row(row, json.loads(logger['hvac']))
                    lights = parse_row(row, json.loads(logger['lights']))
                    plugs = parse_row(row, json.loads(logger['plugs']))
                    kitchen = parse_row(row, json.loads(logger['kitchen']))
                    solar = parse_row(row, json.loads(logger['solar']))
                    ev = parse_row(row, json.loads(logger['ev']))
                    lab = parse_row(row, json.loads(logger['lab']))

                    # custom stuff for 215 here
                    # eventually find some way to store the equation in the database
                    # the normal ones would be like 1 + 2 + 3
                    # the more complex ones are like abs(4 - 32) - 16
                    # then parse it on the fly to figure out the correct value
                    if logger['export'] == '215_Last_30_Days':
                        T1_Total = parse_row(row, [2])
                        T1_Solar = parse_row(row, [18])
                        T1_Kitchen = parse_row(row, [15,16,17])
                        T1_Lights = parse_row(row, [22,24,25])

                        T1_Plugs = abs(T1_Total - T1_Solar) - T1_Kitchen - T1_Lights
                        plugs += T1_Plugs

                        T3_Total = parse_row(row, [3])
                        T3_Solar = parse_row(row, [1])

                        T3_Lab = abs(T3_Total - T3_Solar)
                        lab += T3_Lab

                        T2A_AND_T2B_TOTAL = parse_row(row, [13])
                        T4A_Total = parse_row(row, [29])

                        T2_Lab = T2A_AND_T2B_TOTAL + T4A_Total
                        lab += T2_Lab

                    
                    rowstoinsert.append((logger['id'], currtimestamp, hvac, kitchen, plugs, lights, solar, ev, lab))
                else:
                    logging.debug('Bad row with timestamp: {}'.format(currtimestamp))
                
            else:
                logging.debug("Skipped old row with timestamp: {}".format(currtimestamp))
                skipped+= 1


        # insert if needed
        if len(rowstoinsert):
            cur.executemany("""
                    INSERT INTO "hobodata"
                    ("logger", "datetime", "hvac", "kitchen", "plugs", "lights", "solar", "ev", "lab")
                    VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
