from __future__ import annotations

from functools import cached_property
from typing import TypeVar, Generic, Any, Optional, Iterable, Callable

from django.core.exceptions import FieldDoesNotExist
from django.db.models import Model, Q, QuerySet
from pydantic import GetCoreSchemaHandler, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from pydantic_core.core_schema import ValidationInfo

from establishment.utils.errors import NotFound, ValidationError
from establishment.utils.http.request import BaseRequest
from establishment.utils.proxy import DjangoModelT
from establishment.utils.state import State


def edit_object_from_request(obj: DjangoModelT,
                             request: BaseRequest,
                             fields: Optional[Iterable[str]] = None,  # If None we'll just take everything
                             exclude: Iterable[str] = [],  # Fields to exclude. Included automatically are id
                             const_validators: list[Callable[[DjangoModelT], Any]] = [],  # Validators that are considered not to make any changes to the object
                             pre_save: list[Callable[[DjangoModelT], Any]] = [],  # Any function that's to be run on the object pre save
                             save: Optional[bool] = None,  # None means save only if changed from fields or if there are validators (which might change the object)
                             ) -> State:
    changed_fields = []
    exclude = list(exclude) + list(request._implicit_fields) + ["id"]

    for key, value in request.model_dump(exclude=set(exclude), exclude_unset=True, exclude_none=False).items():
        try:
            django_field = obj._meta.get_field(key)
        except FieldDoesNotExist:
            # If the model doesn't have this field then just skip it
            continue

        value_to_set = value
        current_value = getattr(obj, key)
        if current_value == value_to_set:
            continue

        if isinstance(value, ObjectId):
            if not key.endswith("_id"):
                raise KeyError(f"Invalid request foreign key field name: {key}")
            # We'll access the object here, to verify that we're actually allowed to access it.
            obj_to_set = value.get()
            value_to_set = int(value)  # Ideally we'd want to get the primary key here

        if fields is not None and key not in fields:
            raise ValidationError(f"Field not editable: {key}")
        setattr(obj, key, value_to_set)
        changed_fields.append(key)

    for callback in const_validators + pre_save:
        callback(obj)

    if len(changed_fields) > 0 or len(pre_save) > 0 or save:
        save_options: dict[str, Any] = {}

        # Validators might modify the object, it's ok
        if save is None:
            if len(pre_save) == 0:
                save_options.update(update_fields=changed_fields)
            save = True

        if save:
            if not obj.pk:
                # Maybe this is a new object, just save everything then
                save_options = {}
            obj.save(**save_options)

    return State(obj)


class ObjectId(Generic[DjangoModelT], int):
    model_class: type[DjangoModelT]
    request: BaseRequest
    field_name: str

    @classmethod
    def __class_getitem__(cls, model_class: type[Model]):
        # TODO @pydantic find out what this does
        # TODO @Mihai figure out why mypy is complaining here
        if isinstance(model_class, TypeVar) or model_class == Any:
            # Allow sub-classes to forward the type var to TaskBase at runtime (match mypy behaviour).
            return cls

        return type(f"{cls.__name__}__{model_class.__name__}", (cls,), {"model_class": model_class})

    @classmethod
    def __get_pydantic_json_schema__(cls, schema: core_schema.JsonSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        # Use the same schema that would be used for `int`
        return handler(core_schema.int_schema())

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: GetCoreSchemaHandler) -> CoreSchema:
        return core_schema.general_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, input_value: Any, validation_info: ValidationInfo) -> Optional[ObjectId[DjangoModelT]]:
        if input_value is None:
            return None
        if not isinstance(input_value, (str, int)):
            raise TypeError("Invalid value type. Valid types are int and string.")
        try:
            input_value = int(input_value)
        except ValueError:
            raise ValueError("Invalid id")
        return cls(input_value)

    def set_request(self, request: BaseRequest, field_name: str):
        self.request = request
        self.field_name = field_name

    # Will be overwritten for each user/merchant
    def context_query(self) -> Q:
        return Q()

    def queryset(self) -> QuerySet[DjangoModelT]:
        return self.model_class.objects.filter(self.context_query(), pk=self)

    def get(self, *args: Q, **kwargs: Any) -> DjangoModelT:
        try:
            return self.queryset().get(*args, **kwargs)
        except self.model_class.DoesNotExist:
            raise NotFound(detail={
                self.field_name: f"{State.get_object_name(self.model_class)} not found"
            })

    @cached_property
    def obj(self) -> DjangoModelT:
        return self.get()

    def apply_edit(self,
                   request: Optional[BaseRequest] = None,
                   fields: Optional[Iterable[str]] = None,  # If None we'll just take everything
                   exclude: Iterable[str] = [],  # Fields to exclude from the request
                   const_validators: list[Callable[[DjangoModelT], Any]] = [],  # Validators that are guaranteed not to make any changes to the object
                   pre_save: list[Callable[[DjangoModelT], Any]] = [],  # Any function that's to be run on the object pre save
                   save: Optional[bool] = None,  # None means save only if changed from fields or if there are validators (which might change the object)
                   ) -> State:

        return edit_object_from_request(
            self.obj,
            request or self.request,
            fields=fields,
            exclude=[*exclude, self.field_name],  # Also remove our own field from the request
            const_validators=const_validators,
            pre_save=pre_save,
            save=save,
        )


def maybe_load(fk_field: Optional[ObjectId[DjangoModelT]]) -> Optional[DjangoModelT]:
    return fk_field.obj if fk_field is not None else None
