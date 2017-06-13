import sys
import re
import traceback

from django.conf import settings


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

    # TODO: describe arguments, etc?

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