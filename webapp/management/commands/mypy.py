import os
import sys
from typing import Any
from unittest.mock import patch

from django.core.management import BaseCommand
from django.conf import settings
from establishment.utils.mypy.semantic_analyzer import SemanticAnalyzerWithAutoNoneReturns
from establishment.utils.mypy.type_checker import TypeCheckerWithAutoNoneReturns


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any):
        os.chdir(settings.BASE_DIR)
        try:
            with patch("mypy.semanal.SemanticAnalyzer", SemanticAnalyzerWithAutoNoneReturns):
                with patch("mypy.checker.TypeChecker", TypeCheckerWithAutoNoneReturns):
                    import mypy.main
                    mypy.main.main(args=[".", "--config-file=mypy.ini", "--show-traceback", "--enable-incomplete-feature=Unpack"], stdout=sys.stdout, stderr=sys.stderr)
            sys.stdout.flush()
            sys.stderr.flush()
        except BrokenPipeError:
            devnull = os.open(os.devnull, os.O_WRONLY)
            os.dup2(devnull, sys.stdout.fileno())
            sys.exit(2)
