def populate_user(request, social_login, data):
    """
    Hook that can be used to further populate the user instance.

    For convenience, we populate several common fields.

    Note that the user instance being populated represents a
    suggested User instance that represents the social user that is
    in the process of being logged in.

    The User instance need not be completely valid and conflict
    free. For example, verifying whether or not the username
    already exists, is not a responsibility.
    """
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    name = data.get("name")
    user = social_login.user
    name_parts = (name or "").partition(" ")
    user.first_name = first_name or name_parts[0]
    user.last_name = last_name or name_parts[2]
    return user
