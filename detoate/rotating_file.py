import os
import threading
import time


class RotatingFile(object):
    def __init__(self, folder_name, base_file_name, extension=".log", max_file_size=(1 << 20), backup_files=100):
        self.folder_name = folder_name
        self.base_file_name = base_file_name
        self.extension = extension
        self.lock = threading.Lock()
        self.max_file_size = max_file_size
        self.backup_files = backup_files
        self.file_name = os.path.join(self.folder_name, self.base_file_name + self.extension)
        self.current_file = self.open_file()

    def open_file(self):
        # TODO: this file can be deleted from under us. Set the directory to read-only while writing to it?
        return open(self.file_name, "ab")

    def file_size(self):
        #TODO: have a cached_file_size member that gets incremented with the buffer size
        return os.path.getsize(self.file_name)

    def write(self, buffer):
        if isinstance(buffer, str):
            buffer = buffer.encode("utf-8")

        with self.lock:
            self.current_file.write(buffer)
            self.current_file.flush()
            if self.should_rotate():
                self.rotate_file()

    def should_rotate(self):
        return self.file_size() >= self.max_file_size

    def clear_backup_files(self):
        # TODO: implement cleaning up old files. We should cache
        pass

    def rotate_file(self):
        # TODO: we should check here that we have the lock, and acquire it otherwise
        # TODO: consider if we should use a better naming format
        # The name we'll give to the current file
        new_file_name = os.path.join(self.folder_name, self.base_file_name + "." + str(int(time.time() * 1000)) + self.extension)
        self.current_file.close()
        os.rename(self.file_name, new_file_name)
        self.current_file = self.open_file()
