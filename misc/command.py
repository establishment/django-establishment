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
            self.result = self.run(*args, **kwargs)
        except Exception as e:
            self.logger.exception(e)
            self.result = e
            self.had_exception = True

        return self.result


class ProductionCommand(BaseCommand):
    production = True
