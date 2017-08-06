from importlib import import_module


def byteify(input):
    if isinstance(input, dict):
        return {byteify(key): byteify(value) for key, value in input.items()}
    elif isinstance(input, list):
        return [byteify(element) for element in input]
    elif isinstance(input, set):
        return set([byteify(element) for element in input])
    else:
        return input


def stringify(input):
    if isinstance(input, dict):
        return {stringify(key): stringify(value) for key, value in input.items()}
    elif isinstance(input, list):
        return [stringify(element) for element in input]
    elif isinstance(input, set):
        return set([stringify(element) for element in input])
    elif input is None:
        return None
    else:
        return input.decode(encoding="UTF-8")


def serializify(input):
    if isinstance(input, dict):
        return {key: serializify(value) for key, value in input.items()}
    elif isinstance(input, list):
        return [serializify(element) for element in input]
    elif isinstance(input, set):
        return [serializify(element) for element in input]
    else:
        return input


def same_dict(d1, d2):
    d1_keys = set(d1.keys())
    d2_keys = set(d2.keys())
    if d1_keys != d2_keys:
        return False
    for key in d1_keys:
        if isinstance(d1[key], dict) and isinstance(d2[key], dict):
            if not same_dict(d1[key], d2[key]):
                return False
        elif d1[key] != d2[key]:
            return False
    return True


def jsonify(obj):
    if isinstance(obj, str):
        return obj
    if isinstance(obj, int):
        return obj
    if isinstance(obj, list):
        return [jsonify(o) for o in obj]
    if isinstance(obj, dict):
        temp = {}
        for key in obj.keys():
            temp[key] = jsonify(obj[key])
        return temp
    return obj.to_json()


def import_module_attribute(object_path, default=None):
    """
    Import from a module path and return the desired attribute/class
    """
    try:
        module_path, class_name = object_path.rsplit(".", 1)
    except Exception:
        raise ImportError("Couldn't parse module path %s" % object_path)

    try:
        module = import_module(module_path)
        return getattr(module, class_name)
    except Exception as e:
        if default:
            return default() if callable(default) else default
        if isinstance(e, ImportError):
            raise e
        raise ImportError("Module %s is missing attribute %s" % (module_path, class_name))
