"""
Thread handler from fabric lib, to run background threads
"""
import threading
import traceback
import sys


class ThreadHandler(object):
    def __init__(self, name, callable, *args, **kwargs):
        # Set up exception handling
        self.exception_info = None

        def wrapper(*args, **kwargs):
            try:
                callable(*args, **kwargs)
            except Exception:
                # TODO mciucu reconsider what we do here (maybe we want to autorestart?)
                self.exception_info = sys.exc_info()
                print("Exception in thread\n", traceback.format_exc())

        # Kick off thread
        self.thread = threading.Thread(None, wrapper, name, args, kwargs)
        self.thread.setDaemon(True)
        self.thread.start()

    def restart(self):
        raise NotImplementedError("Still need to figure this out")

    def raise_if_needed(self):
        if self.exception:
            raise self.exception


class ThreadIntervalHandler(ThreadHandler):
    def __init__(self, name, callable, interval, *args, **kwargs):
        self.terminate = False
        self.interval = interval
        super().__init__(name, self.background, *args, **kwargs)

    def background(self, *args, **kwargs):
        pass

    def stop(self):
        self.terminate = True