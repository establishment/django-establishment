import json

from establishment.webapp.base_views import superuser_required
from establishment.webapp.state import State
from .errors import LocalizationError
from .models import TranslationEntry, TranslationKey


def check_translation_entries(entries):
    for entry_change in entries:
        if "newValue" not in entry_change.keys():
            return LocalizationError.EMPTY_TRANSLATION_ENTRY
        new_value = entry_change["newValue"].strip()
        if not new_value:
            return LocalizationError.EMPTY_TRANSLATION_ENTRY


def edit_translation_entries(entries):
    for entry_change in entries:
        key_id = int(entry_change["keyId"])
        language_id = int(entry_change["languageId"])
        new_value = entry_change["newValue"].strip()
        entry, created = TranslationEntry.objects.get_or_create(
            language_id=language_id,
            key_id=key_id
        )
        entry.value = new_value
        entry.save()


@superuser_required
def edit_translation(request):
    key_info = None
    if "editEntries" in request.POST.keys():
        decoder = json.JSONDecoder()
        entries = decoder.decode(request.POST["editEntries"])

        error = check_translation_entries(entries)
        if error is not None:
            return error
        edit_translation_entries(entries)
    elif "editKeys" in request.POST.keys():
        decoder = json.JSONDecoder()
        change = decoder.decode(request.POST["editKeys"])
        if change["type"] == "add":
            keys = [x.strip() for x in change["keys"].splitlines()]
            for key_value in keys:
                if not key_value:
                    return LocalizationError.ONE_INVALID_TRANSLATION_KEY
            count_added = 0
            for key_value in keys:
                if TranslationKey.objects.get_or_create(value=key_value)[1]:
                    count_added += 1
            key_info = {"added": count_added, "alreadyExists": len(keys) - count_added}
        elif change["type"] == "delete":
            key_id = int(change["keyId"])
            key = TranslationKey.objects.get(id=key_id)
            if not key:
                return LocalizationError.TRANSLATION_KEY_NOT_FOUND
            key.delete()
        elif change["type"] == "rename":
            key_id = int(change["keyId"])
            new_value = change["newValue"]
            key = TranslationKey.objects.get(id=key_id)
            if not key:
                return LocalizationError.TRANSLATION_KEY_NOT_FOUND
            if not new_value:
                return LocalizationError.INVALID_TRANSLATION_VALUE
            key.value = new_value
            key.save()

    return State.from_objects(TranslationEntry.objects.all(), TranslationKey.objects.all()).to_response({
        "succes": True,
        "keyInfo": key_info
    })
