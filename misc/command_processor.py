import json
import logging
import time

from establishment.misc.threading_helper import ThreadHandler
from establishment.funnel.redis_stream import RedisStreamPublisher, RedisStreamSubscriber, RedisScheduledJob


class BaseProcessor(object):
    def __init__(self, logger_name):
        self.logger = logging.getLogger(logger_name)
        self.background_thread = None
        self.keep_working = False
        self.running = False

    def main(self):
        pass

    def process(self):
        self.logger.info("Starting to process: " + str(self.__class__.__name__))

        self.running = True
        try:
            self.main()
        except:
            self.logger.error("Unhandled error in main(): " + str(self.__class__.__name__))
        self.running = False

    def start(self):
        self.keep_working = True
        self.background_thread = ThreadHandler("Command processor " + str(self.__class__.__name__), self.process)

    def stop(self):
        self.keep_working = False


class RedisScheduledJobProcessor(BaseProcessor):
    def __init__(self, redis_scheduled_job_name, callback, logger_name, try_lock_interval=1):
        super().__init__(logger_name=logger_name)
        self.try_lock_interval = try_lock_interval
        self.redis_scheduled_job_name = redis_scheduled_job_name
        self.redis_scheduled_job = RedisScheduledJob(name=self.redis_scheduled_job_name)
        self.callback = callback

    def main(self):
        while self.keep_working:
            if self.redis_scheduled_job.try_acquire():
                try:
                    self.callback(redis_scheduled_job=self.redis_scheduled_job)
                except:
                    self.logger.error("Unhandled error in acquired RedisLock! Critical!")
                self.redis_scheduled_job.release()
            time.sleep(self.try_lock_interval)


class BaseCommandProcessor(BaseProcessor):
    def __init__(self, logger_name):
        super().__init__(logger_name=logger_name)

    def get_next_command(self):
        raise RuntimeError("Implement me!")

    def process_command(self, command):
        raise RuntimeError("Implement me!")

    def publish_answer(self, answer, command):
        raise RuntimeError("Implement me!")

    def handle_exception(self, exception):
        if hasattr(self, "logger"):
            self.logger.exception("Exception in command processor " + str(self.name))

    def main(self):
        while self.keep_working:
            try:
                command = self.get_next_command()
                if command:
                    answer = self.process_command(command)
                    if answer:
                        self.publish_answer(answer, command)
            except Exception as exception:
                self.handle_exception(exception)


class BaseRedisCommandProcessor(BaseCommandProcessor):
    def __init__(self, logger_name, redis_stream_name):
        super().__init__(logger_name)
        self.redis_stream_name = redis_stream_name
        self.redis_stream_subscriber = None
        self.redis_stream_publisher = None

    def get_next_command(self):
        if not self.redis_stream_subscriber:
            self.redis_stream_subscriber = RedisStreamSubscriber()
            self.redis_stream_subscriber.subscribe(self.redis_stream_name + "-q")
            self.redis_stream_publisher = RedisStreamPublisher(self.redis_stream_name + "-a", raw=True)

        message, stream_name = self.redis_stream_subscriber.next_message()

        if not message:
            return message

        try:
            message = str(message, "utf-8")
        except Exception:
            self.logger.error("Failed to convert to unicode")
            return None

        try:
            return json.loads(message)
        except Exception:
            self.logger.error("Failed to parse command " + str(message))
            return None

    def publish_answer(self, answer, command):
        self.redis_stream_publisher.publish_json(answer)

    def handle_exception(self, exception):
        self.logger.exception("Error processing redis command for " + str(self.__class__.__name__))
        self.redis_stream_subscriber = None
        self.redis_stream_publisher = None
        time.sleep(1.0)


class CommandProcessorHandler(object):
    def __init__(self, command_processors=None):
        if command_processors is None:
            command_processors = []
        self.command_processors = command_processors

    def add(self, command_processor):
        self.command_processors.append(command_processor)

    def start(self):
        for command_processor in self.command_processors:
            command_processor.start()

    def stop(self):
        for command_processor in self.command_processors:
            command_processor.stop()

    def wait_to_finish(self):
        finished = False
        while not finished:
            finished = True
            for command_processor in self.command_processors:
                if command_processor.running:
                    finished = False
            time.sleep(1)
