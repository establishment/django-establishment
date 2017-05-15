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
