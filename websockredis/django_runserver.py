import base64
import select
import threading
import wsgiref
import logging
from hashlib import sha1

from django.conf import settings
from django.core.management.commands import runserver
from django.core.servers.basehttp import WSGIServer
from django.core.wsgi import get_wsgi_application
from django.utils.encoding import force_str

from .websocket import WebSocket
from .wsgi_server import WebsocketWSGIServer, HandshakeError, UpgradeRequiredError

if not settings.DEBUG:
    raise Exception("This module should only be used in DEBUG mode")

logger = logging.getLogger("django.server")


# Disable Hop-by-hop transport, Yo!
wsgiref.util._hoppish = {}.__contains__


class WebsocketRunServer(WebsocketWSGIServer):
    WS_GUID = b'258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    WS_VERSIONS = ('13', '8', '7')

    def upgrade_websocket(self, environ, start_response):
        """
        Attempt to upgrade the socket environ['wsgi.input'] into a websocket enabled connection.
        """
        websocket_version = environ.get('HTTP_SEC_WEBSOCKET_VERSION', '')
        if not websocket_version:
            raise UpgradeRequiredError
        elif websocket_version not in self.WS_VERSIONS:
            raise HandshakeError('Unsupported WebSocket Version: {0}'.format(websocket_version))

        key = environ.get('HTTP_SEC_WEBSOCKET_KEY', '').strip()
        if not key:
            raise HandshakeError('Sec-WebSocket-Key header is missing/empty')
        try:
            key_len = len(base64.b64decode(key))
        except TypeError:
            raise HandshakeError('Invalid key: {0}'.format(key))
        if key_len != 16:
            # 5.2.1 (3)
            raise HandshakeError('Invalid key: {0}'.format(key))

        sec_ws_accept = base64.b64encode(sha1(key.encode('latin-1') + self.WS_GUID).digest())
        sec_ws_accept = sec_ws_accept.decode('ascii')
        headers = [
            ('Upgrade', 'websocket'),
            ('Connection', 'Upgrade'),
            ('Sec-WebSocket-Accept', sec_ws_accept),
            ('Sec-WebSocket-Version', str(websocket_version)),
        ]
        logger.debug('WebSocket request accepted, switching protocols')
        start_response(force_str('101 Switching Protocols'), headers)
        start_response.__self__.finish_content()
        return WebSocket(environ['wsgi.input'])

    def select(self, rlist, wlist, xlist, timeout=None):
        return select.select(rlist, wlist, xlist, timeout)

    def get_event(self):
        return threading.Event()


old_runserver_run = runserver.run


def run(addr, port, wsgi_handler, ipv6=False, threading=False, server_cls=WSGIServer):
    """
    Function to monkey patch the internal Django command: manage.py runserver
    Do whatever you need here
    """
    if not threading:
        raise Exception("Debug server must run with threading enabled")

    old_runserver_run(addr, port, wsgi_handler, ipv6, threading)


runserver.run = run

_django_app = get_wsgi_application()
_websocket_app = WebsocketRunServer()


def application(environ, start_response):
    if environ.get("HTTP_UPGRADE") == "websocket":
        return _websocket_app(environ, start_response)
    return _django_app(environ, start_response)
