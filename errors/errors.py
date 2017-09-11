from establishment.errors.models import ErrorMessage, get_error


class InheritorSetMeta(type):
    __inheritors__ = set()

    def __new__(cls, name, bases, dct):
        new_class = super().__new__(cls, name, bases, dct)
        cls.__inheritors__.add(new_class)
        return new_class


class ErrorList(object, metaclass=InheritorSetMeta):
    """
    Error enum classes need to inherit this to be able to be imported anytime (before models are ready for instance)
    After the error app is ready, and all models are loaded, we'll iterate over all inheritor classes and load
    their matching ErrorMessage models from the DB.
    """
    @classmethod
    def all(cls):
        # Iterate over all own fields that are exceptions
        for attr in dir(cls):
            value = getattr(cls, attr)
            if isinstance(value, ErrorMessage):
                yield attr, value

    @classmethod
    def load_from_db(cls):
        """
        Update all class fields that are ErrorMessage instances with the values from the database.
        If there's not coresponding DB entry for the given message for instance, a new entry is created.
        """
        try:
            ErrorMessage.ensure_cache_build()
        except:
            # Just log an error here, and carry on
            print("Error in loading errors from DB, how ironic, eh? This is expected when error models are not migrated")
            return
        for attr, value in cls.all():
            if not value.is_from_db:
                value = get_error(**value.__dict__)
                setattr(cls, attr, value)

    @classmethod
    def load_from_db_all_inheritors(cls):
        for error_list_class in cls.__inheritors__:
            error_list_class.load_from_db()


class BaseError(ErrorList):
    USER_NOT_AUTHENTICATED = get_error(id=1, message="User not authenticated")
    NOT_ALLOWED = get_error(id=2, message="Not allowed")
    OBJECT_NOT_FOUND = get_error(id=3, message="Object not found")
    INVALID_URL = get_error(message="Invalid url")
    OBJECT_ALREADY_EXISTS = get_error(message="The object you want to create already exists")
    INVALID_DATA = get_error(message="Validation error")
    TOO_MANY_OBJECTS = get_error(message="Requesting too many objects")
    MAINTENANCE = get_error(message="Website in maintenance mode!")
