"""Generic linux daemon base class for python 3.x."""
import logging
import sys
import os
import time
import atexit
import signal

KILL_NOT_GRACEFULLY = -1
KILL_TIMEOUT = 0
KILL_GRACEFULLY = 1


class Daemon:
    """
    A generic daemon class.
    Usage: subclass the daemon class and override the run() method.
    """

    def __init__(self, service_name, pidfile):
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
            self.logger.exception("Fork 1 failed")
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
            self.logger.exception("Fork 2 failed")
            sys.exit(1)

        # redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        si = open(os.devnull, 'r')
        so = open(os.path.join(cur_dir, "log/" + self.name + "-out.txt"), 'a+')
        se = so

        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())

        # write pidfile
        atexit.register(self.delpid)

        pid = str(os.getpid())
        self.logger.info("Current pidfile " + self.pidfile)

        with open(self.pidfile,'w+') as f:
            f.write(pid + '\n')

    def delpid(self):
        os.remove(self.pidfile)

    def start(self):
        """Start the daemon."""

        # Check for a pidfile to see if the daemon is already running
        if self.get_pid():
            self.logger.error("Pidfile already exist. Daemon already running?")
            sys.exit(1)

        # Start the daemon
        self.daemonize()

        self.terminate = False

        # Register SIGTERM to stop the program gracefully
        signal.signal(signal.SIGTERM, self.stop_daemon)

        self.before_run()

        self.run()

        self.after_run()

    def get_pid(self):
        """Get the daemon pid from file."""

        try:
            with open(self.pidfile,'r') as pf:
                return int(pf.read().strip())
        except IOError:
            return None

    def kill(self, signal_number, pid=None, timeout=None):
        if not pid:
            pid = self.get_pid()

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
                    os.remove(self.pidfile)
                return KILL_GRACEFULLY
            else:
                return KILL_NOT_GRACEFULLY

    def stop(self, sync=False):
        """Stop the daemon."""

        pid = self.get_pid()

        if not pid:
            self.logger.error("Pidfile does not exist. Daemon not running?")
            return # not an error in a restart

        self.logger.warning("Trying to stop the daemon")

        timeout = 6.0
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

        self.stop()
        self.start()

    def force_stop(self):
        pid = self.get_pid()

        if not pid:
            self.logger.error("Pidfile does not exists. Daemon not running?")
            return # not an error in restart --force

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
            self.logger.warning("Stoping daemon " + sys.argv[0])
            self.stop()
        elif cmd == "restart" and force:
            self.logger.warning("Force restarting daemon " + sys.argv[0])
            self.force_restart()
        elif cmd == "stop" and force:
            self.logger.warning("Force stop daemon " + sys.argv[0])
            self.force_stop()
        elif cmd == "sync-stop" and not force:
            self.logger.warning("Stoping daemon " + sys.argv[0] + " (sync call)")
            self.stop(sync=True)
        else:
            print("Invalid arguments, call as python3 " + sys.argv[0] + " start|stop|restart [--force]")

    def before_run(self):
        pass

    def run(self):
        """You should override this method when you subclass Daemon.

        It will be called after the process has been daemonized by
        start() or restart().
        """

    def after_run(self):
        pass
