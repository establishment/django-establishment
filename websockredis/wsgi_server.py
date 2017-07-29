import queue
import sys
import threading
import time
import logging
from importlib import import_module

from django import http
from django.conf import settings
from django.contrib.auth import get_user
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied
from django.core.handlers.wsgi import WSGIRequest

from establishment.misc.threading_helper import ThreadHandler
from establishment.funnel.redis_stream import RedisStreamSubscriber
from establishment.funnel.permission_checking import user_can_subscribe_to_stream
from .exceptions import WebSocketError, HandshakeError, UpgradeRequiredError

logger = logging.getLogger("django.server")

# The maximum size we should allow websocket messages to have
MAX_WEBSOCKET_MESSAGE_SIZE = 1 << 20

MAX_USER_SUBSCRIBED_STREAMS = 64

# The default Django session engine
session_engine = import_module(settings.SESSION_ENGINE)

#TODO: also keep a counter with the number of stream subcriptions

users_pending_connection = queue.Queue(maxsize=2048)


# TODO: this should be a thread pool of ~4-8 threads
def background_connect_users():
    while True:
        user_connection = users_pending_connection.get()
        user_connection.get_user()


backround_user_connection_init_thread = ThreadHandler("background fetch users from DB", background_connect_users)


class UserConnection(object):
    """
    Class used to manage a websocket connection to a user
    """
    def __init__(self, request, session_key, event, websocket):
        self.request = request
        self.session_key = session_key
        self.event = event
        self.websocket = websocket
        self.time_connected = time.time()

        users_pending_connection.put(self)

        self.event.wait()

        self.lock = threading.Lock()

        # TODO: replace this subscriber with a subscriber pool, to reduce the number of redis connections
        self.subscription = RedisStreamSubscriber()

        # Keep track of when we last sent a message, to periodically send heartbeats
        self.time_last_send = time.time()

        self.websocket_file_descriptor = None
        self.subscription_file_descriptor = None

    def __str__(self):
        return "Connection to " + str(self.request.user) + " on IP " + str(self.user_ip)

    @property
    def user_ip(self):
        # TODO: use the global one
        request_meta = self.request.META
        if "HTTP_REAL_IP" in request_meta:
            return request_meta["HTTP_REAL_IP"]
        return request_meta.get("HTTP_REMOTE_ADDR", request_meta.get("REMOTE_ADDR", "0.0.0.0"))

    def to_json(self):
        return {
            "ip": self.user_ip,
            "user": self.user,
            "numStreams": self.num_streams,
            "timeConnected": self.time_connected
        }

    def get_user(self):
        if self.session_key:
            self.request.session = session_engine.SessionStore(self.session_key)
            self.request.user = get_user(self.request)
        else:
            self.request.user = AnonymousUser()
        self.event.set()

    @property
    def user(self):
        return self.request.user

    @property
    def user_stream_name(self):
        if not self.user:
            return None
        return "user-" + self.user.id

    def send(self, message):
        self.time_last_send = time.time()
        return self.websocket.send(message)

    def ensure_heartbeat(self):
        """
        This method sees when we last had activity on the stream, and sends a heartbeat just to keep the connection alive
        """
        if time.time() - self.time_last_send >= settings.WEBSOCKET_HEARTBEAT_INTERVAL:
            self.send(settings.WEBSOCKET_HEARTBEAT)

    def subscribe(self, stream_name):
        can_subscribe, reason = user_can_subscribe_to_stream(self.user, stream_name)

        if can_subscribe:
            self.subscription.subscribe(stream_name)
            self.send(b"s " + stream_name.encode())
        else:
            # This is an error we should know about because our clients should know what they are allowed to be subscribed to
            logger.error("Registration not allowed for connection " + str(self) + " to stream " + str(stream_name) + "\nReason: " + reason)
            self.send(b"error invalidSubscription " + stream_name.encode() + b" " + str(self.user.id).encode() + b" " + reason.encode())

        logger.debug("Subscribed to " + str(self.num_streams) + " streams")

    def unsubscribe(self, stream_name):
        self.subscription.unsubscribe(stream_name)

    @property
    def num_streams(self):
        return self.subscription.num_streams

    def receive_next_message(self):
        """
        This should only be called when there's a message to read from a subscribed redis channel
        """
        message, stream_name = self.subscription.next_message()

        if message:
            self.send(b'm ' + stream_name + b' ' + message)

    def process_file_descriptors(self, ready_file_descriptors):
        for file_descriptor in ready_file_descriptors:
            if file_descriptor == self.websocket.get_file_descriptor():
                # We've received a message from the user
                # TODO: if the message is really large, or we're getting high traffic, ban that asshole
                for raw_message in self.websocket.receive_all():
                    if not raw_message:
                        continue
                    user_command = UserCommand(self, raw_message)
                    logger.debug("Received user websocket message ", extra={"user_message": str(raw_message), "user": str(self.user)})
                    # TODO: this should be done on a separate thread, not here!!!!!!
                    user_command.process()
            elif file_descriptor == self.subscription.get_file_descriptor():
                self.receive_next_message()
            else:
                logger.error("Invalid file descriptor: " + str(file_descriptor))

        # At least send a heartbeat at the end
        self.ensure_heartbeat()

    def close(self):
        if self.subscription:
            self.subscription.close()
        if self.websocket:
            self.websocket.close(code=1001, message='Websocket Closed')
            self.websocket = None

    @property
    def connected(self):
        """
        :return True if the websocket is connected to a user
        """
        return self.websocket and not self.websocket.closed


class UserCommand(object):
    def __init__(self, user_connection, message):
        self.user_connection = user_connection
        self.message = message

    def process(self):
        if not isinstance(self.message, str):
            self.message = str(self.message, "utf-8")
        command_args = self.message.split(maxsplit=1)
        logger.info("Processing command" + str(command_args))

        if len(command_args) == 0:
            self.user_connection.send(b"error No command sent")
            return

        if command_args[0] == "s":
            if len(command_args) != 2:
                #TODO: return error to user
                self.user_connection.send(b"error Tell me a stream to subscribe you to!")
                return
            logger.info("Subscribing user to stream", extra={"user": self.user_connection, "streamName": str(command_args[1])})
            self.user_connection.subscribe(command_args[1])


user_command_queue = queue.Queue(maxsize=1<<16)


def process_workload():
    while True:
        logger.debug("Trying to get a command")
        # Wait until a command is available in the queue, and gets the first one
        user_command = user_command_queue.get()

        logger.debug("Executing a user command")
        # Execute the user command
        user_command.process()

        # Signal that the current command has been processed
        user_command_queue.task_done()


user_command_thread = ThreadHandler("user_commands", process_workload)

"""
Supported commands:
subscribe streamType StreamID
unsubscribe streamType StreamID
message receivedType receiverID
Each stream needs to have a hash-set redis object with all the properties
"""

"""
TODO: keep a counter of connections per user, and allow up to 8 connections per user
"""


"""
We need a pool of workers to handle commands from users
Commands are just added on a queue, passing along a reference to the user connection and the message
A thread-pool can be used to grab the messages, and process them one by one
We need more threads than cores, because some requests can be blocking (DB access)
"""
class WebsocketWSGIServer(object):
    def assure_protocol_requirements(self, environ):
        if environ.get('REQUEST_METHOD') != 'GET':
            raise HandshakeError('HTTP method must be a GET')

        #TODO: we'll have to support HTTP 2.0 in the future, and also HTTPS
        if environ.get('SERVER_PROTOCOL') != 'HTTP/1.1':
            raise HandshakeError('HTTP server protocol must be 1.1')

        if environ.get('HTTP_UPGRADE', '').lower() != 'websocket':
            raise HandshakeError('Client does not wish to upgrade to a websocket')

    def __call__(self, environ, start_response):
        """
        Hijack the main loop from the original thread and listen on events on the Redis
        and the Websocket filedescriptors.
        """
        user_connection = None

        #TODO: also log ip
        logger.info("Got a websocket connection", extra={"environment": environ})

        try:
            self.assure_protocol_requirements(environ)
            request = WSGIRequest(environ)

            session_key = request.COOKIES.get(settings.SESSION_COOKIE_NAME, None)

            websocket = self.upgrade_websocket(environ, start_response)
            user_connection = UserConnection(request, session_key, self.get_event(), websocket)

            # Every user gets auto-subscribed to the global stream. This is where we broadcast sitewide messages
            user_connection.subscribe("global-events")

            user_connection.websocket_file_descriptor = user_connection.websocket.get_file_descriptor()
            user_connection.subscription_file_descriptor = user_connection.subscription.get_file_descriptor()

            listening_fds = [user_connection.websocket_file_descriptor, user_connection.subscription_file_descriptor]

            # TODO: if this is a resubscription, we should allow some catch-up mechanism
            while user_connection.connected:
                ready_file_descriptors = self.select(listening_fds, [], [], settings.WEBSOCKET_HEARTBEAT_INTERVAL)[0]
                user_connection.process_file_descriptors(ready_file_descriptors)

        except WebSocketError as excpt:
            logger.warning("WebSocketError: {}".format(excpt), exc_info=sys.exc_info())
            response = http.HttpResponse(status=1001, content="Websocket Closed")
        except UpgradeRequiredError as excpt:
            logger.info("Websocket upgrade required")
            response = http.HttpResponseBadRequest(status=426, content="Websocket upgrade required")
        except HandshakeError as excpt:
            logger.warning('HandshakeError: {}'.format(excpt), exc_info=sys.exc_info())
            response = http.HttpResponseBadRequest(content="Handshake error")
        except PermissionDenied as excpt:
            logger.warning('PermissionDenied: {}'.format(excpt), exc_info=sys.exc_info())
            response = http.HttpResponseForbidden(content="Permission denied!")
        except Exception as excpt:
            logger.error('Other Exception: {}'.format(excpt), exc_info=sys.exc_info())
            response = http.HttpResponseServerError(content="It's broken!")
        else:
            response = http.HttpResponse()
        finally:
            if user_connection:
                user_connection.close()
        return response
