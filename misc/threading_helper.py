"""
Thread handler from fabric lib, to run background threads
"""
import logging
import threading
import traceback
import sys

import time

import datetime


class ThreadHandler(object):
    def __init__(self, name, callable, *args, **kwargs):
        self.name = name
        # Set up exception handling
        self.exception_info = None

        def wrapper(*args, **kwargs):
            try:
                callable(*args, **kwargs)
            except Exception:
                # TODO mciucu reconsider what we do here (maybe we want to autorestart?)
                self.exception_info = sys.exc_info()
                print("Exception in thread\n", traceback.format_exc())

        is_daemon = kwargs.pop("daemon", True)

        # Kick off thread
        self.thread = threading.Thread(None, wrapper, name, args, kwargs)
        self.thread.setDaemon(is_daemon)
        self.thread.start()

        self.is_working = True

    def raise_if_needed(self):
        if self.exception:
            raise self.exception

    def is_alive(self):
        return self.thread.is_alive()


class ThreadIntervalHandler(ThreadHandler):
    def __init__(self, name, worker, interval, *args, **kwargs):
        self.terminate = False
        self.interval = interval
        self.start_at_interval_multiples = kwargs.pop("start_at_interval_multiples", False)
        self.exception_throttle = kwargs.pop("exception_throttle", 3600)
        self.worker = worker
        self.signaler = kwargs.pop("signaler", False)
        self.terminate_on_exception = kwargs.pop("terminate_on_exception", False)
        self.logger = kwargs.get("logger") or logging.getLogger("django")
        self.is_working = False

        super().__init__(name, self.background, *args, **kwargs)

    def get_error_message(self, e):
        return "Error in daemon thread " + str(self.name) + " " + str(e)

    def background(self, *args, **kwargs):
        last_exception_time = 0
        last_start_time = 0.0
        while not self.terminate and (not self.signaler or not self.signaler.terminate):
            try:
                last_start_time = time.time()
                self.is_working = True
                if self.worker(*args, **kwargs):
                    self.terminate = True
            except Exception as e:
                current_time = time.time()
                error_message = self.get_error_message(e)
                if current_time - last_exception_time > self.exception_throttle:
                    last_exception_time = current_time
                    self.logger.exception(error_message)
                else:
                    self.logger.warn(error_message)
                if self.terminate_on_exception:
                    raise e
            self.is_working = False
            sleep_duration = self.interval
            if self.start_at_interval_multiples:
                dt = datetime.datetime.now()
                microsec_since_midnight = ((dt.hour * 60 + dt.minute) * 60 + dt.second) * 1000000 + dt.microsecond
                microsec_interval = int(self.interval * 1000000)
                microsec_remaining = microsec_interval - int(microsec_since_midnight) % microsec_interval
                sleep_duration = microsec_remaining / 1000000.0
                if time.time() - last_start_time > self.interval:
                    sleep_duration = 0
            time.sleep(sleep_duration)

    def stop(self):
        self.terminate = True
