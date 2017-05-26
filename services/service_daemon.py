import os
import django

# The import encodings.idna is never user explicitly, we just need it for networking
import encodings.idna

import time

import sys

from establishment.misc.threading_helper import ThreadIntervalHandler
from establishment.services.daemon import Daemon
from establishment.services.status import ServiceStatus


class ServiceDaemon(Daemon):
    version = "1.0"

    def __init__(self, service_name, pidfile=None):
        if pidfile is None:
            pidfile = "." + service_name + "_daemon.pid"

        self.service_name = service_name
        self.background_thread_handlers = []
        super().__init__(service_name, pidfile)

    def setup(self):
        module_name = os.environ.get("ESTABLISHMENT_DJANGO_MODULE", None)
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", module_name + ".settings")
        django.setup()

    def log_initial_info(self):
        self.logger.info(str(self.service_name) + " Daemon " + str(self.version))
        self.logger.info("Operating system: " + os.name + " -- " + sys.platform)
        self.logger.info("File system encoding: " + sys.getfilesystemencoding())

    def before_run(self):
        self.setup_logging()
        self.log_initial_info()
        ServiceStatus.init(self.service_name)

    def start_background_thread(self, worker, *args, **kwargs):
        name = kwargs.pop("name", worker.__name__)
        thread_handler = ThreadIntervalHandler(name, worker, *args,
                                               signaler=self,
                                               logger=self.logger,
                                               **kwargs)
        self.background_thread_handlers.append(thread_handler)

    def wait_for_background_threads(self, wait_time=5):
        while not self.terminate:
            time.sleep(0.1)

        termination_max_time = time.time() + wait_time

        for thread_handler in self.background_thread_handlers:
            while thread_handler.is_working and time.time() < termination_max_time:
                time.sleep(0.1)
            if thread_handler.is_working:
                self.logger.error("Thread " + str(thread_handler.name) + " is still alive for too long, dying anyway")

    def start(self):
        super().start()

    def setup_logging(self):
        from django.conf import settings

        logging_handler_name = "rolling_file_" + self.name

        settings.LOGGING["handlers"][logging_handler_name] = {
           "level": "DEBUG",
           "formatter": "json",
           "class": "establishment.misc.logging_handlers.BackgroundRotatingFileHandler",
           "filename": os.path.join(settings.LOG_FILE_PATH, self.name + ".log"),
           "maxBytes": 32 << 20,
           "backupCount": 5,
        }

        settings.LOGGING["loggers"][self.name] = {
           "handlers": [logging_handler_name, "redis_handler", "mail_admins"],
           "level": "DEBUG",
           "propagate": True,
        }

    def after_run(self):
        ServiceStatus.publish_stop()
