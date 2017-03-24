import os

# The import encodings.idna is never user explicitly, we just need it for networking
import encodings.idna

from establishment.services.daemon import Daemon
from establishment.services.status import ServiceStatus


class ServiceDaemon(Daemon):
    def __init__(self, service_name, pidfile=None):
        if pidfile is None:
            pidfile = "." + service_name + "_daemon.pid"

        self.service_name = service_name
        super().__init__(service_name, pidfile)
        self.setup_logging()

    def before_run(self):
        ServiceStatus.init(self.service_name)

    def start(self):
        super().start()

    def setup_logging(self):
        from django.conf import settings

        logging_handler_name = "rolling_file_" + self.name

        settings.LOGGING["handlers"][logging_handler_name] = {
           "level": "DEBUG",
           "formatter": "json",
           "class": "establishment.services.logging.BackgroundRotatingFileHandler",
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
