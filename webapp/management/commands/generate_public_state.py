import os

from django.conf import settings
from django.core.management import BaseCommand
from django.template import Context, Template
from django.utils.safestring import mark_safe

from establishment.funnel.encoder import StreamJSONEncoder
from establishment.misc.util import import_module_attribute
from establishment.webapp.state import State


class Command(BaseCommand):
    @staticmethod
    def generate_template(template_path, output_path, context_dict):
        context_dict["template_path"] = template_path
        context_dict["output_path"] = output_path

        with open(template_path, "r") as template_file:
            template_str = str(template_file.read())

        template = Template(template_str)
        generated_source = template.render(Context(context_dict))

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, "w") as public_state_source:
            public_state_source.write(generated_source)

    @staticmethod
    def serialize_constant(name, value):
        return "self.%s = %s;" % (name, StreamJSONEncoder.dumps(value))

    def handle(self, *args, **options):
        state = State()
        context_dict = {}
        from collections import OrderedDict
        global_constants = OrderedDict()

        for collector in settings.PUBLIC_STATE_COLLECTORS:
            if isinstance(collector, str):
                collector = import_module_attribute(collector)
            collector(state, global_constants, context_dict)

        global_constants["PUBLIC_STATE"] = state

        context_dict["all_constants"] = mark_safe("\n".join([self.serialize_constant(key, value) for key, value in global_constants.items()]))
        context_dict["constants"] = global_constants

        for template_path, output_path in settings.PUBLIC_STATE_PATHS:
            self.generate_template(template_path, output_path, context_dict)
            # TODO: also copy to static path in production
