import json
from psycopg2.extras import Json
from django import forms as django_forms
from django.db.models.fields import Field
from django.core.exceptions import ValidationError

from establishment.funnel.encoder import StreamJSONEncoder
from establishment.funnel.json_helper import to_camel_case, to_underscore_case, from_json_dict


# BaseJSONSerializable Usage

# ~~~~ How to use it ~~~~
# 1) extend BaseJSONSerializable class
#
# ~~~~ General guidelines and how to's ~~~~
# ~~| fields and types |~~
# All fields that are serialized should be an argument in __init__(1) and should have a default-value(2)
#   1 - if an object is created from a JSON, the __init__ is called with the json dict as kwargs
#   2 - the default value is used when a new db-object is created. If the model has a default which returns
#       created object, everything should be fine :)
#
# ~~| Adding fields during runtime and custom serialization |~~
#   When an object is being serialized, the BaseJSONSerializable class gets all the fields of that object
#     and puts them in the JSON. If one of those fields is not an parameter, the __init__ will break if
#     another object will be created from this serialization.
# If not all fields should be serialized, create the get_vars(self) function that returns
#   an array of strings with the name of the fields that should be serialized.
#   ~ this should contain a subset of the parameters of __init__ 
#     (the init could contain stuff that's not serialized if it's default-valued)
# 
# ~~| Fields that are not primitive |~~
# If the class has a field that is a custom class as well, the __init__ should support that the 
#   field's value could be an object of that class or a json version of it.
#   The easiest way to do this (if the custom class extends BaseJSONSerializable as well) is:
#     self.custom_field = CustomClass.from_json(custom_field)
#   ~ since from_json returns the json_object if it's an instance of the type
#
# ~~~~ Code Example ~~~~
#
# class TimeStat(BaseJSONSerializable):
#     def __init__(self, cpu=0.0, wall_time=0.0):
#         self.cpu = cpu
#         self.wall_time = wall_time
#
# class RunStat(BaseJSONSerializable):
#     def __init__(self, mem_kb = 0, time_stat = TimeStat()):
#         self.mem_kb = mem_kb
#         self.time_stat = TimeStat.from_json(time_stat)


class BaseJSONSerializable:
    encoder = StreamJSONEncoder

    # returns a list of strings with the name of the fields(attributes) of the object that will
    # be serialized. This could returns different things based on the content (if custom specified)
    # (for example, one can custom-serialize a field if it's not empty or something like this)
    def get_vars(self):
        return vars(self)

    def to_json(self):
        json_vars = self.get_vars()

        d = dict()
        for var in json_vars:
            d[to_camel_case(var)] = getattr(self, var)

        return d

    @classmethod
    def from_json(cls, json_obj):
        if isinstance(json_obj, cls):
            return json_obj  # which is not a json

        arg_list = from_json_dict(json_obj)

        return cls(**arg_list)

    def dumps(self):
        return json.dumps(self, cls=self.encoder)

    def __str__(self):
        print("Call on __str__")
        # check if a custom encoder is present.
        # By default the StreamJSONEncoder encoder is used, since the class can have a field that's
        #   not a primitive, and the <Object at ...> it's not useful.
        return json.dumps(self, cls=self.encoder)


class InvalidJSONInput(str):
    pass


class JSONString(str):
    pass


# this is necesary when viewing stuff in /admin
# maybe it could be done by calling the default json form with an encoder and decoder
# but hey, it's easier to copy-paste the code here
# TODO: use the default json-form with custom encoder and decoder
#       https://github.com/django/django/blob/master/django/contrib/postgres/forms/jsonb.py
class SerializedJsonFieldAdminForm(django_forms.CharField):
    default_error_messages = {
        'invalid': "'%(value)s' value must be valid JSON.",
    }
    widget = django_forms.Textarea

    def to_python(self, value):
        print("to_python")
        if self.disabled:
            return value
        if value in self.empty_values:
            return None
        elif isinstance(value, (list, dict, int, float, JSONString)):
            return value

        try:
            if hasattr(value, "dumps"):
                converted = json.loads(value.dumps())
            elif hasattr(value, "to_json"):
                converted = json.loads(json.dumps(value.to_json()))
            else:
                converted = json.loads(value)
        except ValueError:
            raise django_forms.ValidationError(
                self.error_messages['invalid'],
                code='invalid',
                params={'value': value},
            )

        if isinstance(converted, str):
            return JSONString(converted)
        else:
            return converted

    def bound_data(self, data, initial):
        print("bound_data")
        if self.disabled:
            return initial
        try:
            return json.loads(data)
        except ValueError:
            return InvalidJSONInput(data)

    def prepare_value(self, value):
        print("prepare_value")
        if isinstance(value, InvalidJSONInput):
            return value

        if hasattr(value, "dumps"):
            return value.dumps()

        if hasattr(value, "to_json"):
            return json.dumps(value.to_json())

        try:
            return json.dumps(value)
        except:
            return None


# When you query the db, an object of your class is returned (from the seriazed json)
# But when the object needs to go back the the DB, some things are required.
# like the adapted field that's not documented anywhere
# and the easiest way to do this is to wrap the object in a class that does that :)
class SerializedJsonFieldAdapter(Json):
    def __init__(self, custom_obj, encoder=None):
        adapted = custom_obj.to_json()
        if encoder is None and hasattr(custom_obj, "encoder"):
            encoder = custom_obj.encoder

        def dumps(obj):
            return json.dumps(obj, cls=encoder)

        super().__init__(adapted=adapted, dumps=dumps)


# When you create a Custom SerializedJsonField you need to specify the local_class
# An object of that class will be returned every time, and it'll work

# The priority of the encoder is the following:
# - encoder parameter from the SerializedJsonField
# - object's .encoder
# - BaseJSONSerializable's default encoder (if the custom class extends this one)
# - the default one used by json
#
# the only thing that should make sense to change here it's the validate function
#
# ~~~~ Code Example ~~~~
# class CoolClass(BaseJSONSerializable):
#     encoder = StreamJSONEncoder
#     def __init__(self, a=10, b=20):
#         self.a = a
#         self.b = b
#
#
# class GenericModel(models.Model):
#     json = SerializedJsonField("Serialized struct", local_class=CoolClass)


class SerializedJsonField(Field):
    description = "Generic JSON-struct field"
    default_error_messages = {
        "invalid": "Value must be valid JSON."
    }

    def __init__(self, verbose_name=None, name=None, encoder=None, local_class=None, default=None, **kwargs):
        if local_class is None:
            raise ValueError("Must specify a class to jsonify")
        
        if not callable(local_class):
            raise ValueError("The local class must be a callable object.")
        
        self.local_class = local_class
        
        if not encoder and hasattr(local_class, "encoder"):
            encoder = local_class.encoder

        if encoder and not callable(encoder):
            raise ValueError("The encoder parameter must be a callable object.")

        self.encoder = encoder

        # just to be a good guy.
        # If no default is selected, create an instance of the class
        if default is None:
            default = local_class

        super().__init__(verbose_name, name, default=default, **kwargs)

    # the type that it's in the database (postgres only type)
    def db_type(self, connection):
        return "jsonb"

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.encoder is not None:
            kwargs["encoder"] = self.encoder

        kwargs["local_class"] = self.local_class

        return name, path, args, kwargs

    # This is called before putting the object in the database.
    # it only wraps the custom object in a StringifiedJsonAdapter so django knows what to put
    # in the db (as value)
    def get_prep_value(self, value):
        if isinstance(value, dict):
            obj = self.local_class.from_json(value)
            return SerializedJsonFieldAdapter(custom_obj=obj)

        if isinstance(value, str):
            d = json.loads(value)
            obj = self.local_class.from_json(d)
            return SerializedJsonFieldAdapter(custom_obj=obj)

        if value is None:
            return value

        return SerializedJsonFieldAdapter(custom_obj=value)

    # called everytime an object is retrieved from the db with a query
    def from_db_value(self, value, expression, connection, context):
        if value is None:
            return value
        if isinstance(value, dict):
            return self.local_class.from_json(value)

        if isinstance(value, str):
            return self.local_class.from_json(json.loads(value))

        raise ValueError("Unknown type for value:", value)

    # called when modifying a json from admin, for example.
    def to_python(self, value):
        try:
            if value is None:
                return value

            if isinstance(value, str):
                return self.local_class.from_json(json.loads(value))

            if isinstance(value, dict):
                return self.local_class.from_json(value)
        
            return value # value is my custom type
        except Exception as e:
            raise ValidationError("Invalid JSON: " + str(e))

    # the form that will be displayed in /admin when looking at a field like this.
    # the only difference from the standard json form is that this one calls to_json
    # on the object, not json.dumps and loads
    def formfield(self, **kwargs):
        defaults = {"form_class": SerializedJsonFieldAdminForm}
        defaults.update(kwargs)
        return super().formfield(**defaults)

    # before updating the DB, the object is validated with this function (yey)
    # it only checks if it can be dumped (since the 'value' is an object from the current type)
    # and if it's not, it's not this code's fault
    def validate(self, value, model_instance):
        super().validate(value, model_instance)

        options = {"cls": self.encoder} if self.encoder else {}
        try:
            # everything that needs validation should be my type.
            json.dumps(value.to_json(), **options)
        except TypeError:
            raise ValidationError(
                self.error_messages["invalid"],
                code="invalid",
                params={"value": value},
            )
