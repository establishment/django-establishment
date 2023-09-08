import json
from io import BytesIO

from django.conf import settings
from django.http import QueryDict, HttpRequest
from django.http.multipartparser import MultiPartParser as DjangoMultiPartParser
from django.utils.datastructures import MultiValueDict
from django.utils.http import parse_header_parameters

from establishment.utils.convert import query_dict_to_dict
from establishment.utils.errors import UnsupportedMediaType, ParseError, APIError


def parse_media_type(media_type: str) -> tuple[str, str, dict[str, str]]:
    full_type, params = parse_header_parameters(media_type)
    main_type, sep, sub_type = full_type.partition("/")
    return main_type, sub_type, params


def media_type_matches(lhs: str, rhs: str) -> bool:
    lhs_main_type, lhs_sub_type, lhs_params = parse_media_type(lhs)
    rhs_main_type, rhs_sub_type, rhs_params = parse_media_type(rhs)

    for key in lhs_params:
        if key != "q" and rhs_params.get(key, None) != lhs_params.get(key, None):
            return False

    if lhs_sub_type != "*" and rhs_sub_type != "*" and rhs_sub_type != lhs_sub_type:
        return False

    if lhs_main_type != '*' and rhs_main_type != '*' and rhs_main_type != lhs_main_type:
        return False

    return True


class BaseParser:
    media_type: str

    def parse(self, body: bytes, request: HttpRequest) -> tuple[dict, MultiValueDict]:
        raise NotImplementedError


class JSONParser(BaseParser):
    media_type = "application/json"

    def parse(self, body: bytes, request: HttpRequest) -> tuple[dict, MultiValueDict]:
        return json.loads(body.decode(encoding=settings.DEFAULT_CHARSET)), MultiValueDict()


class FormParser(BaseParser):
    media_type = "application/x-www-form-urlencoded"

    def parse(self, body: bytes, request: HttpRequest) -> tuple[dict, MultiValueDict]:
        return query_dict_to_dict(QueryDict(body)), MultiValueDict()


class MultiPartParser(BaseParser):
    media_type = "multipart/form-data"

    def parse(self, body: bytes, request: HttpRequest) -> tuple[dict, MultiValueDict]:
        upload_handlers = request.upload_handlers
        parser = DjangoMultiPartParser(request.META, BytesIO(body), upload_handlers)
        query_dict, files = parser.parse()
        return query_dict_to_dict(query_dict), MultiValueDict(files)


PARSER_CLASSES = (JSONParser, FormParser, MultiPartParser)


def parse_request_data(request: HttpRequest) -> tuple[bytes, dict, MultiValueDict]:
    request_body: bytes
    request_data: dict
    request_files: MultiValueDict
    if request.method == "GET":
        request_body = b""
        request_data = query_dict_to_dict(request.GET)
        request_files = MultiValueDict()
    else:
        request_body = request.body
        media_type = request.META.get("CONTENT_TYPE", request.META.get("HTTP_CONTENT_TYPE", ""))

        if not media_type or not request_body:
            return request_body, {}, MultiValueDict()

        parsers = [parser() for parser in PARSER_CLASSES]
        # Select the correct parser for the request's content type
        selected_parser = None
        for parser in parsers:
            if media_type_matches(parser.media_type, media_type):
                selected_parser = parser
                break

        parse_error_cls: type[APIError] = ParseError
        if selected_parser is None:
            # Default media type for our API is JSON, so we still try
            # to parse the body even if we don't recognize the content type.
            selected_parser = JSONParser()
            parse_error_cls = UnsupportedMediaType

        try:
            request_data, request_files = selected_parser.parse(request_body, request)
        except Exception:
            raise parse_error_cls
        if request_data is not None and not isinstance(request_data, dict):
            raise parse_error_cls

    return request_body, request_data, request_files


