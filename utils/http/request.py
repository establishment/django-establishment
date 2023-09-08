import json
from typing import Any, Union, TypeVar, Optional, Self

from django.http import QueryDict
from pydantic import BaseModel

from establishment.utils.convert import to_camel_case, to_snake_case
from establishment.utils.errors import ValidationError


# The contents of this entire file is dependent on seeing how pydantic model schemas work.
# Before making changes in this file, print out the schema of the models in the test file
# (Simple, Composed and Unions in test_request_parsing.py) and look at it. To print the schema,
# you can use `from utils.tests.test_request_parsing import *; print(Unions.schema_json(indent=2))`.


# Follow a ref in the schema of a pydantic model's nested field.
# For example, for the models:
#   class Foo(BaseModel):
#       x: int
#   class Bar(BaseModel):
#       foo: Foo
# The schema of Bar is {
#     "type": "object",
#     "properties": {
#         "foo": { "$ref": "#/defs/Foo" }
#     },
#     "$defs": {
#         "Foo": {
#             "type": "object",
#             "properties": {
#                 "x": { "type": "integer" }
#             }
#         }
#     }
# }
# Calling this function for the "foo" field (where field_description = { "$ref": "#/defs/Foo" }) will
# return the definition for "Foo".
def get_nested_field_description(model_schema: dict, field_description: dict) -> Optional[dict]:
    if "$ref" in field_description and field_description["$ref"].startswith("#/$defs/"):
        nested_definition_name = field_description["$ref"].removeprefix("#/$defs/")
        return model_schema["$defs"][nested_definition_name]
    return None


# Figure out if this field should be interpreted as a nested JSON when provided in the request as a string.
# This happens for example in GET requests, where nested JSONs are only available as strings in query params.
def should_parse_string_as_json(model_schema: dict, field_description: dict) -> bool:
    # If the field is supposed to be an object or an array, we always need to interpret it as a JSON.
    if field_description.get("type") in ["array", "object"]:
        return True

    # If the field is a Union type, check if ANY of the Union's members should be interpreted as JSONs.
    if "anyOf" in field_description or "allOf" in field_description:
        field_options = field_description.get("anyOf", []) + field_description.get("allOf", [])
        return any([
            should_parse_string_as_json(model_schema, variant_field)
            for variant_field in field_options
        ])

    # If the field has a ref type, it could be either a nested pydantic model or an enum. Check recursively
    # after following the ref.
    nested_field_description = get_nested_field_description(model_schema, field_description)
    if nested_field_description is not None:
        return should_parse_string_as_json(model_schema, nested_field_description)

    return False


# Update all appropriate keys in a nested JSON request to be snake case when appropriate. This function
# has to be careful to ONLY update the keys that map to fields in backend pydantic models, as regular
# dicts should not be changed (so we can't just call the recursive to_snake_case_json() on the request).
# A simple example is User Journey / Panel options which are a plain dict to be stored in the database,
# which the backend should not edit.
def ensure_snake_case_fields(model_schema: dict, field_description: dict, value: Any) -> Any:
    # If the current field is an array, ensure each item of the array is snake case as needed according to
    # the individual items' field description.
    if field_description.get("type") == "array" and isinstance(value, list):
        return [ensure_snake_case_fields(model_schema, field_description["items"], v) for v in value]

    result = value

    # For a Union field, follow all refs from all variants of the union and call recursively. This way,
    # no matter which Union variant is picked, we get correct snake-cased fields for all of them.
    for nested_definition in field_description.get("anyOf", []) + field_description.get("allOf", []):
        result = ensure_snake_case_fields(model_schema, nested_definition, result)

    # For a ref field (which means either a nested Pydantic model or an enum), if the value is a dict
    # then the keys of the dict will be used for fields on the pydantic model. Make them all snake case and
    # then call recursively on the properties of the resulting dict, following the nested field ref.
    nested_field_description = get_nested_field_description(model_schema, field_description)
    if nested_field_description is not None and isinstance(result, dict):
        result = {to_snake_case(k): v for k, v in result.items()}
        for sub_field_name, sub_field_description in nested_field_description.get("properties", {}).items():
            if sub_field_name in result:
                result[sub_field_name] = ensure_snake_case_fields(model_schema, sub_field_description, result[sub_field_name])

    return result


def prepare_field_value(model_schema: dict, field_description: dict, value: Any, request_field_name: str) -> Any:
    if isinstance(value, str) and should_parse_string_as_json(model_schema, field_description):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            raise ValidationError(detail={request_field_name: "Invalid value"})

    return ensure_snake_case_fields(model_schema, field_description, value)


def get_array_type(field_description: dict[str, Any]) -> Optional[dict]:
    for sub_type in field_description.get("anyOf", []):
        if sub_type.get("type", None) == "array":
            return sub_type
    if field_description.get("type", None) == "array":
        return field_description
    return None


def is_optional(field_description: dict[str, Any]) -> bool:
    for sub_type in field_description.get("anyOf", []):
        if sub_type.get("type", None) == "null":
            return True
    return False


def load_field_from_request(request: Union[dict, QueryDict], model_schema: dict, field_name: str, request_field_name: str) -> Any:
    field_description = model_schema["properties"][field_name]

    if isinstance(request, QueryDict):
        # For QueryDict, unlike JSON dict, explicitly look whether we expect an array or not in
        # the request schema, and match that. We need to do this because there is no way to tell
        # apart a string and a list with a single string when parsing URL Query Parameters.
        array_type = get_array_type(field_description)
        if array_type is not None:
            item_field_description = array_type["items"]
            return [
                prepare_field_value(model_schema, item_field_description, value, request_field_name)
                for value in request.getlist(request_field_name)
            ]

    return prepare_field_value(model_schema, field_description, request[request_field_name], request_field_name)


T = TypeVar("T", bound=BaseModel)


class BaseRequest(BaseModel):
    _raw_request: Union[dict, QueryDict]
    _implicit_fields: set[str]

    @classmethod
    def from_request(cls, request: Union[dict, QueryDict]) -> Self:
        model_schema = cls.model_json_schema()
        implicit_fields: set[str] = set()
        fields: dict[str, Any] = {}
        # TODO @pydantic looks like we just ignore extra fields in all our request. Issue an error on local?
        for field_name in model_schema["properties"].keys():
            request_field_name = field_name
            if request_field_name not in request:
                request_field_name = to_camel_case(field_name)
            if request_field_name in request:
                fields[field_name] = load_field_from_request(request, model_schema, field_name, request_field_name)
            else:
                field_description = model_schema["properties"][field_name]
                if is_optional(field_description):
                    fields[field_name] = None
                    implicit_fields.add(field_name)

        typed_request = cls.model_validate(fields)
        typed_request._raw_request = request
        typed_request._implicit_fields = implicit_fields

        # Prevent circularity, should reference a generic type
        from establishment.utils.http.request_fields import ObjectId

        for field_name in model_schema["properties"].keys():
            value = getattr(typed_request, field_name)
            if isinstance(value, ObjectId):
                value.set_request(typed_request, field_name)

        return typed_request
