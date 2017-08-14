import os
from django.conf import settings
from django.core.management import BaseCommand
from django.template import Context, Template

from establishment.funnel.state import State


class Command(BaseCommand):
    def handle(self, *args, **options):
        state = State()
        context_dict = {
            "REQUIRE_NAME": "PublicState",
        }

        for accumulator in settings.PUBLIC_STATE_ACCUMULATORS:
            accumulator(state, context_dict)

        context_dict["state"] = state.dumps()

        with open(settings.PUBLIC_STATE_TEMPLATE, "r") as template_file:
            template_str = str(template_file.read())

        template = Template(template_str)
        generated_source = template.render(Context(context_dict))

        print("Generating public state source in", settings.PUBLIC_STATE_PATH)

        os.makedirs(os.path.dirname(settings.PUBLIC_STATE_PATH), exist_ok=True)

        with open(settings.PUBLIC_STATE_PATH, "w") as public_state_source:
            public_state_source.write(generated_source)
