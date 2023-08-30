from __future__ import annotations

import json
import re
import string
import unicodedata
from typing import Optional, Union, Any

from django.http.request import QueryDict


orda = ord("a")
ordA = ord("A")


def query_dict_to_dict(query_dict: QueryDict) -> dict:
    d: dict[str, Union[str, list[str]]] = {}
    for key, values in query_dict.lists():
        if len(values) > 1:
            # multiple values for the same key, we keep all of them
            d[key] = values
        else:
            # only one value for the key
            d[key] = values[0]
    return d


def to_snake_case_json(json_obj: Any) -> Any:
    if isinstance(json_obj, dict):
        return {to_snake_case(key): to_snake_case_json(value) for key, value in json_obj.items()}

    if isinstance(json_obj, list):
        return [to_snake_case_json(item) for item in json_obj]

    if json_obj == "false":
        return False

    if json_obj == "true":
        return True

    if json_obj == "null":
        return None

    return json_obj


def to_snake_case(txt: str) -> str:
    new_txt = ""

    prev_char: Optional[str] = None
    for c in txt:
        if "A" <= c <= "Z" and (prev_char is not None and "a" <= prev_char <= "z"):
            new_txt += "_" + chr(ord(c) + orda - ordA)
        else:
            new_txt += c
        prev_char = c

    return new_txt


def to_camel_case_json(json_obj: Any) -> Any:
    if isinstance(json_obj, dict):
        return {to_camel_case(key): to_camel_case_json(value) for key, value in json_obj.items()}

    if isinstance(json_obj, list):
        return [to_camel_case_json(item) for item in json_obj]

    return json_obj


def to_camel_case(txt: str) -> str:
    new_txt = ""

    for i, part in enumerate(txt.split("_")):
        if i == 0:
            # don't change the first part
            new_txt += part
        elif part != part.capitalize():
            # part starts with a lower case
            new_txt += part.capitalize()
        else:
            # part starts with something else
            new_txt += "_{}".format(part)

    return new_txt


def canonical_json_dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True)


def hex_to_bytes(hex_string: str) -> bytes:
    return bytes(
        [
            ((int(hex_string[i], base=16) << 4) | int(hex_string[i + 1], base=16))
            for i in range(0, len(hex_string) - 1, 2)
        ]
    )


def bytes_to_hex(bytes_blob: bytes) -> str:
    hex_characters = []
    for byte in bytes_blob:
        hex_characters.append(string.hexdigits[byte >> 4])
        hex_characters.append(string.hexdigits[byte & 15])
    return "".join(hex_characters)


def is_valid_hex_string(s: Any, length: Optional[int] = None) -> bool:
    """
    Check if given parameter is a valid hexadecimal string of expected length.

    If length is not provided or is None, only checks if given parameter is a
    hex string.
    """
    if s is None or not isinstance(s, str):
        return False
    if length is not None and len(s) != length:
        return False
    for character in s:
        if character not in string.hexdigits:
            return False
    return True


def camel_case_to_title_case(s: str) -> str:
    return to_snake_case(s).replace("_", " ").title()


def unicode_to_best_match_ascii(value: str) -> str:
    # Turn the name "Denis Mită" into "Denis Mita".
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def normalize_name(name: str) -> str:
    # Asciify, capitalize, split word parts, sort parts alphabetically, concatenate with #
    name = unicode_to_best_match_ascii(name)
    name = name.upper()
    name_parts = re.findall(r"[\w']+", name)
    name_parts.sort()
    return "#".join(name_parts)


def int_list(values: list[Any]) -> list[int]:
    result = []
    for value in values:
        try:
            result.append(int(value))
        except Exception as e:
            pass
    return result
