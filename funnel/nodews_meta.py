from django.conf import settings
from redis import StrictRedis, ConnectionPool

from establishment.misc.util import stringify, serializify
from establishment.funnel.redis_stream import get_default_redis_connection_pool

REDIS_ENTRY_CONNECTIONIDS = "nodews-meta-connectionids"
REDIS_ENTRY_USERIDS = "nodews-meta-userids"
REDIS_ENTRY_STREAMS = "nodews-meta-streams"
REDIS_ENTRY_USERID_TO_CONNECTIONID_PREFIX = "nodews-meta-userid-to-connectionids-"
REDIS_ENTRY_CONNECTIONID_TO_USERID_PREFIX = "nodews-meta-connectionid-to-userids-"
REDIS_ENTRY_CONNECTIONID_TO_STREAMS_PREFIX = "nodews-meta-connectionid-to-streams-"
REDIS_ENTRY_STREAM_TO_CONNECTIONIDS_PREFIX = "nodews-meta-stream-to-connectionids-"
REDIS_ENTRY_CONNECTIONID_TO_DATA_PREFIX = "nodews-meta-connectionid-to-data-prefix-"
REDIS_ENTRY_USERID_TO_STREAMS_PREFIX = "nodews-meta-userid-to-streams-"
REDIS_ENTRY_STREAM_TO_USERIDS_PREFIX = "nodews-meta-stream-to-userids-"
REDIS_ENTRY_STREAM_TO_USERID_CONNECTION_COUNTER_PREFIX = "nodews-meta-stream-to-userid-counter-"


class WSUserData:
    @classmethod
    def object_type(cls):
        return "WSUserData"

    def add_to_state(self, state, user=None):
        state.add(self)

    def __init__(self, user_id, metadata):
        self.id = int(user_id)
        self.connection_ids = metadata["userIdToConnectionIds"][user_id]
        self.streams = metadata["userIdToStreams"][user_id]

    def to_json(self):
        state = {
            "id": self.id,
            "connectionIds": self.connection_ids,
            "streams": self.streams
        }

        return state


class WSConnectionData:
    @classmethod
    def object_type(cls):
        return "WSConnectionData"

    def add_to_state(self, state, user=None):
        state.add(self)

    def __init__(self, connection_id, metadata):
        self.id = int(connection_id)
        self.user_id = metadata["connectionIdToUserId"][connection_id]
        self.streams = metadata["connectionIdToStreams"][connection_id]
        self.data = metadata["connectionIdToData"][connection_id]

    def to_json(self):
        state = {
            "id": self.id,
            "userId": self.user_id,
            "streams": self.streams,
            "data": self.data
        }

        return state


class WSStreamData:
    @classmethod
    def object_type(cls):
        return "WSStreamData"

    def add_to_state(self, state, user=None):
        state.add(self)

    def __init__(self, stream, metadata):
        self.id = stream
        self.connection_ids = metadata["streamToConnectionIds"][stream]
        self.user_ids = metadata["streamToUserIds"][stream]

    def to_json(self):
        state = {
            "id": self.id,
            "connectionIds": self.connection_ids,
            "userIds": self.user_ids
        }

        return state


class NodeWSMeta(object):
    def __init__(self, connection=None):
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.connection = connection

    def get_all(self):
        pipe = self.connection.pipeline(transaction=False)
        for key in [REDIS_ENTRY_CONNECTIONIDS, REDIS_ENTRY_USERIDS, REDIS_ENTRY_STREAMS]:
            pipe.smembers(key)

        result = pipe.execute()
        connection_ids = stringify(result[0])
        user_ids = stringify(result[1])
        streams = stringify(result[2])

        for user_id in user_ids:
            pipe.smembers(REDIS_ENTRY_USERID_TO_CONNECTIONID_PREFIX + user_id)
            pipe.smembers(REDIS_ENTRY_USERID_TO_STREAMS_PREFIX + user_id)

        for connection_id in connection_ids:
            pipe.get(REDIS_ENTRY_CONNECTIONID_TO_USERID_PREFIX + connection_id)
            pipe.smembers(REDIS_ENTRY_CONNECTIONID_TO_STREAMS_PREFIX + connection_id)

        for stream in streams:
            pipe.smembers(REDIS_ENTRY_STREAM_TO_CONNECTIONIDS_PREFIX + stream)
            pipe.smembers(REDIS_ENTRY_STREAM_TO_USERIDS_PREFIX + stream)

        for connection_id in connection_ids:
            pipe.hgetall(REDIS_ENTRY_CONNECTIONID_TO_DATA_PREFIX + connection_id)

        result = pipe.execute()
        index = 0

        user_id_to_connection_ids = {}
        user_id_to_streams = {}
        for user_id in user_ids:
            user_id_to_connection_ids[user_id] = stringify(result[index])
            index += 1
            user_id_to_streams[user_id] = stringify(result[index])
            index += 1

        connection_id_to_user_id = {}
        connection_id_to_streams = {}
        for connection_id in connection_ids:
            connection_id_to_user_id[connection_id] = stringify(result[index])
            index += 1
            connection_id_to_streams[connection_id] = stringify(result[index])
            index += 1

        stream_to_connection_ids = {}
        stream_to_user_ids = {}
        for stream in streams:
            stream_to_connection_ids[stream] = stringify(result[index])
            index += 1
            stream_to_user_ids[stream] = stringify(result[index])
            index += 1

        connection_id_to_data = {}
        for connection_id in connection_ids:
            connection_id_to_data[connection_id] = stringify(result[index])
            index += 1

        metadata = {
            "connectionIds": connection_ids,
            "userIds": user_ids,
            "streams": streams,
            "userIdToConnectionIds": user_id_to_connection_ids,
            "userIdToStreams": user_id_to_streams,
            "connectionIdToUserId": connection_id_to_user_id,
            "connectionIdToStreams": connection_id_to_streams,
            "streamToConnectionIds": stream_to_connection_ids,
            "streamToUserIds": stream_to_user_ids,
            "connectionIdToData": connection_id_to_data
        }

        return serializify(metadata)

    def get_online_users(self, stream):
        pipe = self.connection.pipeline(transaction=False)

        pipe.smembers(REDIS_ENTRY_STREAM_TO_USERIDS_PREFIX + stream)

        result = pipe.execute()
        user_ids = stringify(result[0])

        return serializify(user_ids)

    def get_streams(self):
        pipe = self.connection.pipeline(transaction=False)

        pipe.smembers(REDIS_ENTRY_STREAMS)

        result = pipe.execute()
        streams = stringify(result[0])

        return serializify(streams)

    @classmethod
    def build_user_data(cls, metadata):
        user_data = []
        for user_id in metadata["userIds"]:
            user_data.append(WSUserData(user_id, metadata))
        return user_data

    @classmethod
    def build_connection_data(cls, metadata):
        connection_data = []
        for connection_id in metadata["connectionIds"]:
            connection_data.append(WSConnectionData(connection_id, metadata))
        return connection_data

    @classmethod
    def build_stream_data(cls, metadata):
        stream_data = []
        for stream in metadata["streams"]:
            stream_data.append(WSStreamData(stream, metadata))
        return stream_data

    def add_all_to_state(self, state):
        metadata = self.get_all()
        user_data = self.build_user_data(metadata)
        for user in user_data:
            user.add_to_state(state)

        connection_data = self.build_connection_data(metadata)
        for connection in connection_data:
            connection.add_to_state(state)

        stream_data = self.build_stream_data(metadata)
        for stream in stream_data:
            stream.add_to_state(state)

    def clean_zombie_connectionid_data(self):
        pipe = self.connection.pipeline(transaction=False)

        pipe.smembers(REDIS_ENTRY_CONNECTIONIDS)

        result = pipe.execute()

        connection_ids = stringify(result[0])

        to_delete = []
        for connection_id_data in self.connection.scan_iter(match=REDIS_ENTRY_CONNECTIONID_TO_DATA_PREFIX+"*"):
            connection_id_data = stringify(connection_id_data)
            connection_id = connection_id_data[len(REDIS_ENTRY_CONNECTIONID_TO_DATA_PREFIX):]
            if connection_id not in connection_ids:
                to_delete.append(connection_id_data)
        for connection_id_data in to_delete:
            print("Deleting connection id data: " + connection_id_data)
            self.connection.delete(connection_id_data)

    def clean_null_stream_to_userid_counter(self):
        stream_to_delete = []
        for stream in self.connection.scan_iter(match=REDIS_ENTRY_STREAM_TO_USERID_CONNECTION_COUNTER_PREFIX+"*"):
            stream = str(stream)
            to_delete = []
            for userid in self.connection.hscan_iter(stream):
                userid = str(userid)
                if str(self.connection.hget(stream, userid)) == "0":
                    to_delete.append(userid)
            if len(to_delete) != 0:
                print("From \"" + stream + "\" deleting fields:")
            for userid in to_delete:
                print("\t\t" + userid)
                self.connection.hdelete(stream, userid)
            if str(self.connection.hlen(stream)) == "0":
                stream_to_delete.append(stream)
        for stream in stream_to_delete:
            stream = str(stream)
            stream = " " + stream
            stream = stream[3:-1]
            print("Deleting \"" + stream + "\"")
            self.connection.delete(stream)

    def gc(self):
        self.clean_zombie_connectionid_data()
        self.clean_null_stream_to_userid_counter()
        print("NodeWS Meta GC: Done!")
