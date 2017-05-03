import os
import resource
import threading
import time

from establishment.misc.ifconfig import get_default_network_interface
from establishment.misc.threading_helper import ThreadHandler
from establishment.funnel.redis_stream import RedisStreamPublisher

#TODO: consider including https://github.com/giampaolo/psutil/ into our codebase


class ServiceStatus(object):
    log_info = {}

    lock = None
    status = None
    stats = {}
    mac_address = None
    machine_address = None
    pid = None
    service_name = None
    update_interval = None
    status_stream = None
    init_time = None
    machine_id = None

    @classmethod
    def init(cls, name, status={}, update_interval=2.0):
        if hasattr(cls, "init_time") and cls.init_time is not None:
            raise Exception("Service status is already started, manually change the settings if you want")

        # TODO: we should have an option if we want to report CPU/memory info
        # TODO: should be support also app version information?

        cls.init_time = time.time()

        cls.service_name = name
        cls.lock = threading.Lock()
        cls.status = status
        cls.update_interval = min(max(update_interval, 1.0), 30.0)

        cls.pid = os.getpid()
        ethernet_info = get_default_network_interface()

        cls.mac_address = ethernet_info["mac"]
        cls.machine_address = ethernet_info.get("ip", "127.0.0.1")

        cls.log_info = {
            "name": cls.service_name,
            "pid": cls.pid,
            "initTime": cls.init_time,
            "machineIP": cls.machine_address,
        }

        cls.machine_id = cls.get_machine_id()

        # TODO: this should be configurable
        cls.status_stream = RedisStreamPublisher("service_status", persistence=False)

        cls.background_thread_handler = ThreadHandler("service_status_update", cls.background_thread)

    # You probably want to monkey patch this method
    @classmethod
    def get_machine_id(cls):
        from django.conf import settings

        if hasattr(settings, "MOCK_MACHINE_ID"):
            return settings.MOCK_MACHINE_ID

        return 1

    @classmethod
    def update_status(cls, status_values):
        with cls.lock:
            cls.status.update(status_values)

    @classmethod
    def set(cls, key, value):
        with cls.lock:
            cls.status[key] = value

    @classmethod
    def increm(cls, name, value=1, init_missing=True):
        """
        Increment a status counter with the give value.
        TODO: initialize the counter if it doesn't exist
        :param name: The counter name
        :param value: The value to increment
        :return: The new value
        """
        with cls.lock:
            if init_missing and name not in cls.status:
                cls.stats[name] = 0
            cls.status[name] += value
            return cls.status[name]

    @classmethod
    def log_json(cls):
        return cls.log_info

    @classmethod
    def publish_status(cls, event_type=None):
        temp_status = {}

        # Create a thread-safe copy of the status object
        with cls.lock:
            temp_status.update(cls.status)

        # Always overwrite these (and not keep them in cls.status) to always be sure they are right
        temp_status["uid"] = cls.mac_address
        temp_status["machineAddress"] = cls.machine_address
        temp_status["pid"] = cls.pid
        temp_status["service"] = cls.service_name
        temp_status["time"] = time.time()
        temp_status["updateInterval"] = cls.update_interval * 1000.0

        rusage = resource.getrusage(resource.RUSAGE_SELF)

        temp_status["peakMemUsage"] = rusage.ru_maxrss * resource.getpagesize()
        temp_status["userCPU"] = rusage.ru_utime
        temp_status["systemCPU"] = rusage.ru_stime
        temp_status["softPageFaults"] = rusage.ru_minflt
        temp_status["hardPageFaults"] = rusage.ru_majflt
        temp_status["swapouts"] = rusage.ru_nswap
        temp_status["voluntaryContextSwitches"] = rusage.ru_nvcsw
        temp_status["involuntaryContextSwitches"] = rusage.ru_nivcsw

        temp_status["uptime"] = time.time() - cls.init_time

        if event_type is None:
            event_type = "MachineInstance-serviceStatusUpdate"

        response = {
            "objectType": "MachineInstance",
            "type": event_type,
            "objectId": cls.machine_id,
            "data": {},
            "serviceStatus": temp_status
        }

        cls.status_stream.publish_json(response)

        #TODO: should also append to the file /services/log/service_name/pid.log (rolling log)

    @classmethod
    def background_thread(cls):
        #TODO: should utils have a method for calling a function ever x seconds
        # Urs: Maybe, but not for this usecase anymore
        cls.publish_start()
        time.sleep(1.5)
        while True:
            update_call_start = time.time()
            cls.publish_status()
            update_duration = time.time() - update_call_start
            time_to_sleep = max(cls.update_interval - update_duration, 0.0)
            time.sleep(time_to_sleep)

    @classmethod
    def publish_start(cls):
        cls.publish_status(event_type="MachineInstance-serviceStatusStart")

    @classmethod
    def publish_stop(cls):
        cls.publish_status(event_type="MachineInstance-serviceStatusStop")
