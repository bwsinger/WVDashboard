import logging
import hobo

from apscheduler.schedulers.blocking import BlockingScheduler

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
    sched.add_job(hobo.fetch, 'cron', minute='1,11,21,31,41,51')
    # sched.add_job(fetch, 'cron', minute='*/5')

    sched.start()
    logging.info("Starting scheduler")
