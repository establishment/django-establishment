"""Generic linux daemon base class for python 3.x."""
import logging
import sys
import os
import time
import atexit
import signal
from typing import Optional

import psutil

KILL_NOT_GRACEFULLY = -1
KILL_TIMEOUT = 0
KILL_GRACEFULLY = 1


class Daemon:
    """
    A generic daemon class.
    Usage: subclass the daemon class and override the run() method.
    """

    def __init__(self, service_name: str, pidfile: str):
        tokens = sys.argv[0].split("/")
        if tokens[-1] == "":
            self.daemon_process_name = tokens[-2]
        else:
            self.daemon_process_name = tokens[-1]
        self.name = service_name
        self.pidfile = pidfile
        self.logger = logging.getLogger(service_name)
        self.terminate = False

    def stop_daemon(self, signum, frame):
        self.logger.warning("Received the stop message, going to stop now!")
        self.terminate = True

    def daemonize(self):
        """Deamonize class. UNIX double fork mechanism."""

        cur_dir = os.getcwd()
        try:
            pid = os.fork()
            if pid > 0:
                # exit first parent
                sys.exit(0)
        except OSError:
            self.logger.exception("Daemonize: first fork failed")
            sys.exit(1)

        # decouple from parent environment
        # os.chdir('/')
        os.setsid()
        os.umask(0)

        # do second fork
        try:
            pid = os.fork()
            if pid > 0:
                # exit from second parent
                sys.exit(0)
        except OSError as err:
            self.logger.exception("Daemonize: second fork failed")
            sys.exit(1)

        # redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        si = open(os.devnull, "r")
        log_dir = os.path.join(cur_dir, "log")
        os.makedirs(log_dir, exist_ok=True)
        so = open(os.path.join(log_dir, self.name + "-out.txt"), "a+")
        se = so

        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())

        # write pidfile
        atexit.register(self.remove_pid_file)

        pid = os.getpid()
        self.logger.info("Current pid file: " + self.pidfile)

        with open(self.pidfile, "w+") as pidfile:
            pidfile.write(str(pid) + "\n")

    def remove_pid_file(self):
        if os.path.isfile(self.pidfile):
            os.remove(self.pidfile)

    def start_raw(self):
        self.terminate = False

        # Register SIGTERM to stop the program gracefully
        signal.signal(signal.SIGTERM, self.stop_daemon)

        self.setup()

        self.before_run()

        self.run()

        self.after_run()

    def start(self):
        """Start the daemon."""

        # Check for a pidfile to see if the daemon is already running
        if self.get_existing_pid():
            self.logger.error("Daemon is already running ...")
            sys.exit(1)

        # Start the daemon
        self.daemonize()

        self.start_raw()

    def get_existing_pid(self) -> Optional[int]:
        """Get the daemon pid from file."""
        try:
            with open(self.pidfile, "r") as pidfile:
                file_pid = int(pidfile.read().strip())
        except IOError:
            self.remove_pid_file()
            return None

        try:
            existing_proc = psutil.Process(file_pid)
            if not ("python" in existing_proc.name()):
                self.logger.error(f"Strange, the existing process doesn't seem to be python, but {str(existing_proc)}")
        except psutil.NoSuchProcess:
            self.logger.critical("There is no daemon running but pid file is present! Deleting ...")
            self.remove_pid_file()
            return None

        return file_pid

    def kill(self, signal_number, pid=None, timeout=None):
        if not pid:
            pid = self.get_existing_pid()

        if not pid:
            self.logger.warning("No running daemon found!")
            return KILL_GRACEFULLY

        total_time = 0.0

        # Try killing the daemon process
        try:
            while 1:
                os.kill(pid, signal_number)
                sleep_time = 0.1
                time.sleep(sleep_time)
                if timeout:
                    total_time += sleep_time
                    if total_time >= timeout:
                        return KILL_TIMEOUT
        except OSError as err:
            e = str(err.args)
            if e.find("No such process") > 0:
                if os.path.exists(self.pidfile):
                    self.logger.warning("Daemon was not gracefully closed! (residual pid file is still present)")
                    self.remove_pid_file()
                return KILL_GRACEFULLY
            else:
                return KILL_NOT_GRACEFULLY

    def stop(self, sync: bool = False):
        """Stop the daemon."""

        pid = self.get_existing_pid()

        if not pid:
            self.logger.error("Daemon is not running ...")
            return

        self.logger.warning("Trying to stop the daemon")

        timeout: Optional[float] = 6.0
        if sync:
            timeout = None
        rc = self.kill(signal.SIGTERM, pid=pid, timeout=timeout)

        if rc == KILL_TIMEOUT:
            self.logger.error("Daemon stop procedure timed out. Consider using --force")
        elif rc == KILL_NOT_GRACEFULLY:
            self.logger.error("Daemon stopped but not gracefully!")
        elif rc == KILL_GRACEFULLY:
            self.logger.warning("Daemon successfully stopped!")
        else:
            self.logger.error("kill() with SIGTERM returned with invalid return code! This should never happen!")

    def restart(self):
        """Restart the daemon."""

        self.stop(sync=True)
        self.start()

    def force_stop(self):
        pid = self.get_existing_pid()

        if not pid:
            self.logger.error("Daemon is not running ...")
            return

        rc = self.kill(signal.SIGKILL, pid=pid, timeout=4.0)

        if rc == KILL_TIMEOUT:
            self.logger.error("kill() with SIGKILL returned with TIMEOUT! This should never happen!")
        elif rc == KILL_NOT_GRACEFULLY:
            self.logger.warning("Force stop (kill) returned successfully but not gracefully!")
        elif rc == KILL_GRACEFULLY:
            self.logger.warning("Force stop (kill) returned successfully!")
        else:
            self.logger.error("kill() with SIGKILL returned with invalid return code! This should never happen!")

    def force_restart(self):
        """Force kill and start normally"""

        self.force_stop()
        self.start()

    def execute_command(self):
        cmd = ""

        force = None
        if len(sys.argv) == 2:
            cmd = sys.argv[1]
        elif len(sys.argv) == 3 and sys.argv[2] == "--force":
            cmd = sys.argv[1]
            force = True

        if cmd == "start":
            self.logger.warning("Starting daemon " + sys.argv[0])
            self.start()
        elif cmd == "restart" and not force:
            self.logger.warning("Restarting daemon " + sys.argv[0])
            self.restart()
        elif cmd == "stop" and not force:
            self.logger.warning("Stopping daemon " + sys.argv[0])
            self.stop()
        elif cmd == "restart" and force:
            self.logger.warning("Force restarting daemon " + sys.argv[0])
            self.force_restart()
        elif cmd == "stop" and force:
            self.logger.warning("Force stop daemon " + sys.argv[0])
            self.force_stop()
        elif cmd == "sync-stop" and not force:
            self.logger.warning("Stopping daemon " + sys.argv[0] + " (sync call)")
            self.stop(sync=True)
        elif cmd == "start_raw":
            self.logger.warning("Starting daemon " + sys.argv[0] + " as a simple process...")
            self.start_raw()
        else:
            print("Invalid arguments, call as python3 " + sys.argv[0] + " start|stop|restart [--force]")

    def setup(self):
        pass

    def before_run(self):
        pass

    def run(self):
        """You should override this method when you subclass Daemon.

        It will be called after the process has been daemonized by
        start() or restart().
        """

    def after_run(self):
        pass
