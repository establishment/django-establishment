from .models import public_settings_cache


def export_to_public_state(state, global_constants, context_dict):
    public_settings_cache.rebuild()
    for public_setting in public_settings_cache.cache.values():
        if not public_setting.export:
            continue
        name = public_setting.export_name or public_setting.key
        global_constants[name] = public_setting.value
