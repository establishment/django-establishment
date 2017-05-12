import json

from ..models import Country


def create_countries():
    with open("establishment/localization/resources/CountryNames.json", "r") as country_names_raw:
        country_names = json.load(country_names_raw)
    with open("establishment/localization/resources/CountryISO3.json", "r") as country_iso3_codes_raw:
        country_iso3_codes = json.load(country_iso3_codes_raw)
    with open("establishment/localization/resources/PhonePrefix.json", "r") as country_phone_prefix_raw:
        country_phone_prefix = json.load(country_phone_prefix_raw)
    for iso_code in country_names.keys():
        try:
            country = Country.objects.get(iso_code=iso_code)
        except Exception:
            country = Country(iso_code=iso_code, name=country_names[iso_code],
                              iso3_code=country_iso3_codes[iso_code], phone_number_prefix=country_phone_prefix[iso_code])
        country.phone_number_prefix = country_phone_prefix[iso_code]
        country.name = country_names[iso_code]
        country.iso3_code = country_iso3_codes[iso_code]
        country.save()
