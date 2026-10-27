from typing import Literal, Optional

from establishment.utils.http.request import BaseRequest
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin
from .errors import EmptyTranslationEntry, InvalidTranslationValue, OneInvalidTranslationKey, TranslationKeyNotFound
from .models import TranslationEntry, TranslationKey

localization_views = WebappViewSet(permissions=is_admin)


class TranslationEntryChange(BaseRequest):
    key_id: int
    language_id: int
    new_value: Optional[str] = None


def edit_translation_entries(entries: list[TranslationEntryChange]) -> None:
    for entry_change in entries:
        if not (entry_change.new_value or "").strip():
            raise EmptyTranslationEntry

    for entry_change in entries:
        entry, created = TranslationEntry.objects.get_or_create(
            language_id=entry_change.language_id,
            key_id=entry_change.key_id,
        )
        entry.value = entry_change.new_value.strip()
        entry.save()


class TranslationKeyChange(BaseRequest):
    type: Literal["add", "delete", "rename"]
    keys: Optional[str] = None  # One key per line, for an add
    key_id: Optional[int] = None
    new_value: Optional[str] = None


def edit_translation_keys(change: TranslationKeyChange) -> Optional[dict[str, int]]:
    if change.type == "add":
        keys = [key_value.strip() for key_value in (change.keys or "").splitlines()]
        if not all(keys):
            raise OneInvalidTranslationKey
        count_added = 0
        for key_value in keys:
            if TranslationKey.objects.get_or_create(value=key_value)[1]:
                count_added += 1
        return {"added": count_added, "alreadyExists": len(keys) - count_added}

    key = TranslationKey.objects.filter(id=change.key_id).first()
    if key is None:
        raise TranslationKeyNotFound

    if change.type == "delete":
        key.delete()
    else:
        if not change.new_value:
            raise InvalidTranslationValue
        key.value = change.new_value
        key.save()
    return None


class EditTranslationRequest(BaseRequest):
    edit_entries: Optional[list[TranslationEntryChange]] = None
    edit_keys: Optional[TranslationKeyChange] = None


@localization_views.post()
def edit_translation(request: EditTranslationRequest) -> State:
    key_info = None
    if request.edit_entries is not None:
        edit_translation_entries(request.edit_entries)
    elif request.edit_keys is not None:
        key_info = edit_translation_keys(request.edit_keys)

    return State(TranslationEntry.objects.all(), TranslationKey.objects.all()).add_extra({"keyInfo": key_info})
