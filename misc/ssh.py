from __future__ import annotations
import os
import stat
from functools import cached_property
from typing import Any

import paramiko
import time


class SSHRun:
    """
    Class to wrap a single remote run call
    """
    def __init__(self, worker: SSHWorker, command, max_output = 1 << 20, timeout = 0):
        self.worker = worker
        self.command = command
        self.failed = False

        worker.log("Running command ", command)

        self.channel = worker.client._transport.open_session()
        # Right now we combine stdout with stderr. We may want to change this in the future
        self.channel.set_combine_stderr(True)
        # self.channel.settimeout(timeout)
        self.channel.exec_command(command)

        self.execute()

    def log_output(self):
        #TODO: there should be separate threads to handle I/O routines
        while self.channel.recv_ready():
            data = self.channel.recv(4096)
            self.worker.log(str(data, "utf-8"), end="")

    def execute(self):
        while not self.channel.exit_status_ready():
            self.log_output()
            time.sleep(0.05)

        # might still have some output unlogged
        self.log_output()

        self.exit_code = self.channel.recv_exit_status()
        self.failed = self.exit_code != 0

        self.worker.log("\nJob exit code:", self.exit_code)
        self.channel.close()


# Class that handles running commands on a remote machine
class SSHWorker:
    def __init__(self, logger: Any, address: str, user: str = "root", auto_add: bool = False):
        self.logger = logger
        self.address = address
        self.user = user
        self.client = paramiko.SSHClient()
        self.client.load_system_host_keys()
        if auto_add:
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        else:
            self.client.set_missing_host_key_policy(paramiko.RejectPolicy())

        self.client.connect(self.address, username=user)

    def log(self, *arguments, **keywords):
        self.logger.log(*arguments, **keywords)

    @cached_property
    def ftp_client(self):
        return self.client.open_sftp()

    # Returns True if the give path is a folder on the remote machine
    def is_folder(self, path):
        try:
            file_stat = self.ftp_client.stat(path)
            return stat.S_ISDIR(file_stat.st_mode)
        except IOError:
            return False

    # Returns True if the given path is a link on the remote machine
    def is_link(self, path):
        try:
            return stat.S_ISLNK(self.ftp_client.lstat(path).st_mode)
        except IOError:
            return False

    # Returns True if the given resource exists on the remote machine
    def file_exists(self, path):
        try:
            self.ftp.ftp_client.lstat(path).st_mode
        except IOError:
            return False
        return True

    # Returns the whole content of the given file path
    def get_content(self, path):
        try:
            with self.ftp_client.open(path, "rb") as file:
                buffer = file.read()
                return buffer.decode("utf-8", "ignore")
        except IOError:
            return None

    # Run a shell command on the remote host
    def run(self, command, stop_at_error=True):
        self.current_run = SSHRun(self, command)
        if self.current_run.failed and stop_at_error:
            raise Exception("SSH command failed: " + command)

    def apt_upgrade(self):
        self.run("sudo apt update")
        self.run("sudo apt -y dist-upgrade")

    def apt_install(self, package):
        self.run("sudo apt -y install " + package)

    def deploy_zip_to_folder(self, zip_file, remote_folder, overwrite=True, remove_existing=True):
        # TODO: remove the hardcoded path
        zip_file = os.path.join("/maestro/deployment/files", zip_file)
        if not os.path.isfile(zip_file):
            raise Exception("Not a valid file!")
        if not zip_file.endswith(".zip") and not zip_file.endswith(".tar.gz"):
            raise RuntimeError("Not a zip file!")

        #TODO: remote folder needs to be encapsulated in ""

        if zip_file.endswith(".zip"):
            self.ftp_client.put(zip_file, "/tmp/deploy.zip")
            self.run("unzip /tmp/deploy.zip -d " + remote_folder)
        else:
            self.ftp_client.put(zip_file, "/tmp/deploy.tar.gz")
            self.run(f"tar -xvf /tmp/deploy.tar.gz --directory {remote_folder}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
