orda = ord('a')
ordA = ord('A')


def to_camel_case(txt):
    capitalise_next = False
    new_txt = ""

    for c in txt:
        if 'A' <= c <= 'Z':
            new_txt += c
        elif capitalise_next and 'a' <= c <= 'z':
            new_txt += chr(ord(c) - orda + ordA)
            capitalise_next = False
        elif c == '_':
            capitalise_next = True
        else:
            capitalise_next = False
            new_txt += c

    return new_txt


def to_underscore_case(txt):
    new_txt = ""

    for c in txt:
        if 'A' <= c <= 'Z':
            new_txt += "_" + chr(ord(c) + orda - ordA)
        else:
            new_txt += c

    return new_txt


def to_space_case(txt):
    new_txt = ""
    capitalise_next = True

    for c in txt:
        if c == '_':
            new_txt += " "
            capitalise_next = True
        elif capitalise_next and 'a' <= c <= 'z':
            capitalise_next = False
            new_txt += chr(ord(c) - orda + ordA)
        else:
            capitalise_next = False
            new_txt += c

    return new_txt


def from_json_dict(json_obj):
    # make all keys underscore_case
    arg_list = dict()
    for key in json_obj:
        arg_list[to_underscore_case(key)] = json_obj[key]

    return arg_list


def update_dict(target, *args):
    from django.http import QueryDict
    from django.utils.datastructures import MultiValueDict
    for arg in args:
        # If it comes from a request.POST or request.GET
        if type(arg) == QueryDict or type(arg) == MultiValueDict:
            target.update(arg.dict())
        else:
            target.update(arg)


def to_json_dict(*args, **kwargs):
    if len(args) > 0:
        for arg in args:
            update_dict(kwargs, arg)
    result = dict()
    for key, value in kwargs.items():
        json_like_key = to_camel_case(key)
        json_like_value = value
        result[json_like_key] = json_like_value
    return result
