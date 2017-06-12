from django.conf import settings


class BaseCommand(object):
    production = False

    def __init__(self, *args, **kwargs):
        self.logger = kwargs.pop("logger")
        self.had_exception = False
        self.result = None

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
            self.logger.exception(e)
            self.result = e
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