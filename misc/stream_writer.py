import os
import queue
import sys
import threading
import traceback

from establishment.misc.rotating_file import RotatingFile
from establishment.misc.threading_helper import ThreadHandler
from establishment.funnel.redis_stream import RedisStreamSubscriber


class BasicStreamWriter(object):
    def __init__(self, base_folder, name, rotate_size = (2 << 20), backup_files=100, message_end="\n"):
        if not os.path.exists(base_folder):
            os.makedirs(base_folder)
        self.rotating_file = RotatingFile(base_folder, name, ".log", rotate_size, backup_files)
        self.message_end = message_end

    def write(self, message):
        self.rotating_file.write(message + self.message_end)


class StreamWriterManager(object):
    def __init__(self, name, streams):
        #TODO: this should take in a name and a redis connection
        self.name = name
        self.own_writer = BasicStreamWriter(os.path.join("/logging/", name), name)
        self.stream_writers = {}
        # The redis subscription is created in a separate thread since pubsub is not thread safe (and reads don't need to block)
        self.subscription = None
        # self.subscription = RedisStreamSubscriber()
        self.subscription_queue = queue.Queue()
        self.streams = streams
        self.lock = threading.Lock()
        self.background_updating_thread = ThreadHandler("background updating stream " + name, self.background_updating)

    def log_next_message(self):
        message = None
        stream_name = None
        try:
            message, stream_name = self.subscription.next_message()

            if stream_name:
                stream_name = stream_name.decode("utf-8")

            if stream_name in self.stream_writers and message is not None:
                self.stream_writers[stream_name].write(message.decode("utf-8"))
        except Exception as e:
            self.own_writer.write("Exception in logging:\nStream:" + str(stream_name) + "\nMessage:" + str(message) +
                                  "\nException: " + str(e) +
                                  "\nMore info: " + str(sys.exc_info()) + "\n" + traceback.format_exc())

    def background_updating(self):
        self.subscription = RedisStreamSubscriber()

        for stream in self.streams:
            self.stream_writers[stream] = BasicStreamWriter(os.path.join("/logging/", stream), stream)
            self.subscription.subscribe(stream)

        self.own_writer.write("Starting to listen")
        while True:
            with self.lock:
                self.log_next_message()

    def subscribe(self, stream_name, folder_path=""):
        if stream_name in self.stream_writers:
            print("Stream already added: ", stream_name)
            return

        if folder_path == "":
            folder_path = os.path.join("/logging/", stream_name)

        #TODO: ensure folder exists

        with self.lock:
            self.stream_writers[stream_name] = BasicStreamWriter(folder_path, stream_name)
            self.subscription.subscribe(stream_name)
