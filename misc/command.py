import sys
import re
import traceback

from django.conf import settings
from establishment.funnel.json_field import BaseJSONSerializable
from establishment.funnel.json_helper import to_space_case


class BaseCommandArgument(BaseJSONSerializable):
    INVALID = 0
    STRING = 1
    INT = 2
    BOOL = 3
    SELECT = 4

    def __init__(self, short_name, description="", long_name=None, type=0):
        if long_name is None:
            long_name = to_space_case(short_name)

        self.short_name = short_name
        self.long_name = long_name
        self.type = type
        self.description = description


class StringArgument(BaseCommandArgument):
    def __init__(self, *args, default_value="", **kwargs):
        super().__init__(*args, **kwargs, type=self.STRING)
        self.default_value = default_value


class IntArgument(BaseCommandArgument):
    def __init__(self, *args, default_value=0, **kwargs):
        super().__init__(*args, **kwargs, type=self.INT)
        self.default_value = default_value


class BoolArgument(BaseCommandArgument):
    def __init__(self, *args, default_value=False, **kwargs):
        super().__init__(*args, **kwargs, type=self.BOOL)
        self.default_value = default_value


class SelectArgumentChoice(BaseJSONSerializable):
    def __init__(self, key, label=None):
        if isinstance(key, SelectArgumentChoice):
            label = key.label
            key = key.key

        if isinstance(key, list):
            if len(key) != 2:
                raise Exception()
            label = key[1]
            key = key[0]

        if label is None:
            label = str(key)

        self.key = key
        self.label = label


class SelectArgument(BaseCommandArgument):
    def __init__(self, *args, choices, **kwargs):
        super().__init__(*args, **kwargs, type=self.SELECT)
        self.choices = []
        for choice in choices:
            self.choices.append(SelectArgumentChoice(choice))


class BaseCommand(object):
    production = False
    prompt_for_confirmation = False

    def __init__(self, *args, **kwargs):
        self.logger = kwargs.pop("logger")
        self.had_exception = False
        self.result = None

    @classmethod
    def get_name(cls):
        if hasattr(cls, "name"):
            return cls.name
        name = cls.__name__
        name_chunks = re.findall('[A-Z][^A-Z]*', name)
        name = name_chunks[0]
        for i in range(1, len(name_chunks)):
            if name_chunks[i - 1][len(name_chunks[i - 1]) - 1].isupper():
                name += name_chunks[i]
            else:
                name += " "
                name += name_chunks[i]
        return name

    @classmethod
    def get_description(cls):
        if hasattr(cls, "description"):
            return cls.description
        return ""

    @classmethod
    def get_arguments(cls):
        return []

    def run(self, *args, **kwargs):
        raise NotImplementedError()

    def run_safe(self, *args, **kwargs):
        try:
            if not settings.DEBUG and not self.production:
                raise RuntimeError("Only call this command in dev environments!")
            self.logger.set_progress(0)
            self.result = self.run(*args, **kwargs)
            self.logger.set_progress(1)
            self.had_exception = False
        except Exception as e:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            exc_message = traceback.format_exception(exc_type, exc_value, exc_traceback)
            self.logger.exception(exc_message)
            self.result = exc_message
            self.had_exception = True

        return self.result


class ProductionCommand(BaseCommand):
    production = True


class PrintLogger:
    def __call__(self, *args, **kwargs):
        print(*args, **kwargs)

    def set_progress(self, percent, progress_dict=None):
        print("\r", int(100 * percent), "%", progress_dict, end="")
print_logger = PrintLogger()