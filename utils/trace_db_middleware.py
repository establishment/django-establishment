from typing import Optional, Callable

from django.conf import settings
from django.core.exceptions import MiddlewareNotUsed
from django.db import connections
from django.http import HttpResponse, BadHeaderError, HttpRequest
from django.utils.deprecation import MiddlewareMixin


# Debug only middleware, to get stats on SQL queries
class TraceDBQueriesMiddleware(MiddlewareMixin):
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        # Disable this middleware if settings.TRACE_DB_QUERIES is False.
        # https://docs.djangoproject.com/en/3.1/topics/http/middleware/#marking-middleware-as-unused
        if not settings.TRACE_DB_QUERIES:
            raise MiddlewareNotUsed
        super().__init__(get_response)

    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        for connection in connections.all():
            connection.queries_log.clear()
            connection.force_debug_cursor = True
        return None

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        top_queries: list[tuple[float, str, str]] = []
        for conn in connections.all():
            queries = conn.queries
            if len(queries) == 0:
                continue

            num_queries = len(queries)
            total_time = sum(map(lambda q: float(q["time"]), queries), 0.0)

            header_name = "DB-Queries-Total-" + conn.settings_dict["NAME"]
            header_value = "{:d} ({:.2f}ms)".format(num_queries, total_time * 1000)
            response[header_name] = header_value

            top_queries.extend(map(lambda q: (float(q["time"]), conn.settings_dict["NAME"], q["sql"]), queries))

        top_queries.sort(key=lambda q: q[0], reverse=True)
        for i in range(min(5, len(top_queries))):
            header_name = "DB-Queries-Top-" + str(i + 1)
            sql = top_queries[i][2]
            # Make sure to not exceed Nginx header buffer limit (which is
            # 16kB at the time of writing this). Since we send at most the
            # top 5 queries, the SQL body will take up to 10kB of that space,
            # leaving plenty of space for everything else.
            if len(sql) > 2048:
                sql = sql[:2045] + "..."
            try:
                header_value = "time={time:.2f}ms; db={db}; sql={sql}".format(time=top_queries[i][0] * 1000,
                                                                              db=top_queries[i][1],
                                                                              sql=sql)
                response[header_name] = header_value
            except BadHeaderError:
                header_value = "time={time:.2f}ms; db={db}; sql=<unserializable>".format(time=top_queries[i][0] * 1000,
                                                                                         db=top_queries[i][1])
                response[header_name] = header_value
        return response
