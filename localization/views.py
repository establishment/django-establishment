import json

from establishment.funnel.base_views import superuser_required, JSONResponse, JSONErrorResponse
from establishment.funnel.state import State
from establishment.localization.models import TranslationEntry, TranslationKey


def check_translation_entries(entries):
    for entry_change in entries:
        if "newValue" not in entry_change.keys():
            return "Entry values musn't be empty"
        new_value = entry_change["newValue"].strip()
        if not new_value:
            return "Entry values musn't be empty"


def edit_translation_entries(entries):
    print(entries, flush=True)
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
        print("here", flush=True)
        decoder = json.JSONDecoder()
        entries = decoder.decode(request.POST["editEntries"])

        check = check_translation_entries(entries)
        if check is not None:
            return JSONErrorResponse(check)
        edit_translation_entries(entries)
    elif "editKeys" in request.POST.keys():
        decoder = json.JSONDecoder()
        change = decoder.decode(request.POST["editKeys"])
        if change["type"] == "add":
            keys = [x.strip() for x in change["keys"].splitlines()]
            for key_value in keys:
                if not key_value:
                    return JSONErrorResponse("One of the key is not valid")
            count_added = 0
            for key_value in keys:
                if TranslationKey.objects.get_or_create(value=key_value)[1]:
                    count_added += 1
            key_info = {"added": count_added, "alreadyExists": len(keys) - count_added}
        elif change["type"] == "delete":
            key_id = int(change["keyId"])
            key = TranslationKey.objects.get(id=key_id)
            if not key:
                return JSONErrorResponse("Key doesn't exists")
            key.delete()
        elif change["type"] == "rename":
            key_id = int(change["keyId"])
            new_value = change["newValue"]
            key = TranslationKey.objects.get(id=key_id)
            if not key:
                return JSONErrorResponse("Key doesn't exists")
            if not new_value:
                return JSONErrorResponse("Key value is not value")
            key.value = new_value
            key.save()

    state = State()
    state.add_all(TranslationEntry.objects.all())
    state.add_all(TranslationKey.objects.all())
    return JSONResponse({"succes": True, "state": state, "keyInfo": key_info})
