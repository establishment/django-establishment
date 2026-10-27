from typing import Optional

import requests

from establishment.baseconfig.models import private_settings_cache

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


def test_recaptcha(recaptcha_key: Optional[str]) -> bool:
    if not private_settings_cache.get("USE_GOOGLE_RECAPTCHA", True):
        return True

    google_request = {
        "secret": private_settings_cache.RECAPTCHA_PRIVATE_KEY,
        "response": recaptcha_key,
    }

    google_response_raw = requests.post(RECAPTCHA_VERIFY_URL, data=google_request)
    google_response = google_response_raw.json()

    passed_captcha = (google_response["success"] == True)

    return passed_captcha
