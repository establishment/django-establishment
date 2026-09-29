import os
import sys
from typing import Optional


REQUIRED_COMMANDS = ["start", "stop"]
OPTIONAL_COMMANDS = ["deploy", "post_deploy"]
DEFAULT_MISSING_FILE_ERROR = "Failed to open file {}"


def die(error_message: str) -> None:
    print(error_message)
    sys.exit(-1)


# Load from a file the lines that don't start with a `#` and aren't void
# If file_required_error is None then an empty list is returned
def simple_line_loader(file_name: str, file_required_error: Optional[str] = DEFAULT_MISSING_FILE_ERROR) -> list[str]:
    try:
        with open(file_name) as f:
            lines = f.readlines()
    except Exception:
        if file_required_error:
            file_required_error = file_required_error.format(file_name)
            die(file_required_error)
        return []

    lines = [line.strip() for line in lines]
    return [line for line in lines if not line.startswith("#") and line != ""]


class ServiceRunner:
    def __init__(self, root_path: str = "services/"):
        self.root_path = root_path

    def path(self, file_path: str) -> str:
        return os.path.join(self.root_path, file_path)

    def load_available_services(self) -> list[str]:
        subdirs = list(os.walk(self.root_path))
        return sorted(subdirs[0][1])

    def load_active_services(self) -> list[str]:
        return simple_line_loader(self.path("local.services"))

    def load_env(self, env_file: str, file_required_error: Optional[str] = DEFAULT_MISSING_FILE_ERROR) -> None:
        env_file = self.path(env_file)
        lines = simple_line_loader(env_file, file_required_error)
        for line in lines:
            try:
                key, value = line.split("=", 1)
            except ValueError:
                die(f"Failed fo parse line {line} from env file {env_file}")
            os.environ[key] = value

    # Run either file_prefix.py or file_prefix.sh (not both)
    def maybe_execute(self, file_prefix: str) -> bool:
        for runner, extension in [("python", "py"), ("bash", "sh")]:
            file_name = self.path(f"{file_prefix}.{extension}")
            if os.path.exists(file_name):
                command = f"{runner} {file_name}"
                exit_code = os.system(command)
                if exit_code:
                    die(f"Command failed: {command}")
                return True
        return False

    def run_service_command(self, service_name: str, command: str) -> None:
        have_executed = self.maybe_execute(f"{service_name}/{command}")

        if not have_executed and command in REQUIRED_COMMANDS:
            die(f"Failed to find command {command} for service {service_name}")

    def process_command(self, command: str) -> None:
        allowed_commands = REQUIRED_COMMANDS + OPTIONAL_COMMANDS
        if command not in allowed_commands:
            die(f"Invalid service command {command}, allow commands {allowed_commands}")

        self.load_env("prod.env")
        self.load_env("local.env", None)

        active_services = self.load_active_services()
        available_services = self.load_available_services()

        for service_name in active_services:
            if service_name not in available_services:
                die(f"Bad config, unknown service: {service_name}")

        for service_name in active_services:
            self.run_service_command(service_name, command)


if __name__ == '__main__':
    runner = ServiceRunner()
    runner.process_command(sys.argv[1])
