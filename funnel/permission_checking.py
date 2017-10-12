from .stream import get_stream_handler


def guest_can_subscribe_to_stream(stream_name):
    """
    Function to test if a given stream supports guests or not
    :param stream_name: The stream the guest wants to subscribe to
    :return: A pair of bool and string, that mean if the user can subscribe and a reason
    """
    if len(stream_name) > 512:
        return False, "Invalid stream name"

    # Even guests are allowed to subscribe to the global stream
    if stream_name == "global-events":
        return True, "Default streams"

    stream_handler = get_stream_handler(stream_name)

    if stream_handler:
        can_subscribe, reason = stream_handler.guest_can_subscribe(stream_name)
        if can_subscribe:
            return True, "OK"
        else:
            # TODO: return the actual reason?
            return False, "Invalid rights"

    return False, "No matching streams"


def user_can_subscribe_to_stream(user, stream_name):
    """
    Function to test if the current user can subscribe to a given stream
    :param user: The user
    :param stream_name: The stream the user wants to subscribe to
    :return: A pair of bool and string, that mean if the user can subscribe and a reason
    """
    if user is None or user.is_anonymous:
        return guest_can_subscribe_to_stream(stream_name)

    # Admins can subscribe to anything
    if user.is_superuser:
        return True, "Admin"

    if len(stream_name) > 512:
        return False, "Invalid stream name"

    # Any user is allowed to subscribe to the global stream and their own
    if stream_name == "global-events" or (user.is_authenticated and stream_name.startswith("user-" + str(user.id) + "-")):
        return True, "Default streams"

    stream_handler = get_stream_handler(stream_name)

    if stream_handler:
        can_subscribe, reason = stream_handler.can_subscribe(user, stream_name)
        if can_subscribe:
            return True, "OK"
        else:
            # TODO: return the actual reason?
            return False, "Invalid rights"

    return False, "No matching streams"

