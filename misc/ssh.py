from __future__ import annotations

import codecs
import json
import os
import socket
import stat
from functools import cached_property
from typing import Any, Optional

import paramiko
from paramiko.sftp_client import SFTPClient
import time

KEEPALIVE_SECONDS = 15
DEAD_PEER_SECONDS = 60  # Longer than a network blip, which a long silent command should ride out


class SSHRun:
    """
    Class to wrap a single remote run call
    """

    def __init__(self, worker: SSHWorker, command: str, max_output_size: int = 1 << 20, timeout: Optional[float] = None):
        self.worker = worker
        self.command = command
        self.failed = False
        self.output = ""
        self.max_output_size = max_output_size
        self.timeout = timeout  # For opening the session and running the command
        self.decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")  # A character can be split across two reads

        worker.log("Running command ", command)

        transport = worker.client.get_transport()

        if transport is None:
            raise RuntimeError("SSHWorker is not connected")

        self.channel = transport.open_session(timeout=timeout)
        # Right now we combine stdout with stderr. We may want to change this in the future
        self.channel.set_combine_stderr(True)
        # self.channel.settimeout(timeout)
        self.channel.exec_command(command)

        self.execute()

    def log_output(self):
        #TODO: there should be separate threads to handle I/O routines
        while self.channel.recv_ready():
            data = self.channel.recv(8192)
            data_str = self.decoder.decode(data)
            if len(self.output) < self.max_output_size:
                self.output += data_str
                self.worker.log(data_str, end="")

    def execute(self):
        started_at = time.monotonic()
        while not self.channel.exit_status_ready():
            if self.timeout is not None and time.monotonic() - started_at > self.timeout:
                self.channel.close()
                raise TimeoutError(f"SSH command still running after {self.timeout}s: {self.command}")
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
    def __init__(self, logger: Any, address: str, user: str = "root", auto_add: bool = False, timeout: Optional[float] = None):
        self.logger = logger
        self.address = address
        self.user = user
        self.client = paramiko.SSHClient()
        self.client.load_system_host_keys()
        if auto_add:
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        else:
            self.client.set_missing_host_key_policy(paramiko.RejectPolicy())

        try:
            self.client.connect(self.address, username=user, timeout=timeout, banner_timeout=timeout, auth_timeout=timeout)
            transport = self.client.get_transport()
            # A vanished peer would otherwise hang any wait for good, since an idle connection gives TCP nothing to time out
            if timeout is not None and transport is not None:
                transport.set_keepalive(KEEPALIVE_SECONDS)
                # Through a proxy the transport holds a channel, whose own connection isn't ours to tune
                if isinstance(transport.sock, socket.socket) and hasattr(socket, "TCP_USER_TIMEOUT"):
                    transport.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_USER_TIMEOUT, DEAD_PEER_SECONDS * 1000)
        except Exception:
            # The transport thread it may have started would otherwise outlive the failed attempt
            self.client.close()
            raise

    def log(self, *arguments, **keywords):
        self.logger.log(*arguments, **keywords)

    @cached_property
    def ftp_client(self) -> SFTPClient:
        client = self.client.open_sftp()
        if client is None:
            raise RuntimeError("FTPClient is not connected")
        return client

    # Returns True if the give path is a folder on the remote machine
    def is_folder(self, path: str) -> bool:
        try:
            mode = self.ftp_client.stat(path).st_mode
            return mode is not None and stat.S_ISDIR(mode)
        except IOError:
            return False

    # Returns True if the given path is a link on the remote machine
    def is_link(self, path: str) -> bool:
        try:
            mode = self.ftp_client.stat(path).st_mode
            return mode is not None and stat.S_ISLNK(mode)
        except IOError:
            return False

    # Returns True if the given resource exists on the remote machine
    def file_exists(self, path: str) -> bool:
        try:
            self.ftp_client.lstat(path).st_mode
        except IOError:
            return False
        return True

    # Returns the whole content of the given file path
    def get_content(self, path: str) -> Optional[str]:
        try:
            with self.ftp_client.open(path, "rb") as file:
                buffer = file.read()
                return buffer.decode("utf-8", "ignore")
        except IOError:
            return None

    def load_json(self, json_path: str) -> Optional[dict]:
        content = self.get_content(json_path)
        if content is None:
            return content
        return json.loads(content)

    # Run a shell command on the remote host
    def run(self, command: str, stop_at_error: bool = True, timeout: Optional[float] = None) -> SSHRun:
        current_run = SSHRun(self, command, timeout=timeout)
        if current_run.failed and stop_at_error:
            raise Exception("SSH command failed: " + command)
        return current_run

    def apt_upgrade(self):
        self.run("sudo apt update && sudo apt dist-upgrade -y && sudo apt autoremove -y")

    def apt_install(self, package: str):
        self.run("sudo apt -y install " + package)

    def deploy_zip_to_folder(self, zip_file: str, remote_folder: str):
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

    def __enter__(self) -> SSHWorker:
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
