from __future__ import annotations

from django.conf import settings
from geoip2.database import Reader
from geoip2.errors import GeoIP2Error
from os.path import join
from pydantic import BaseModel
from typing import Optional

_country_reader: Optional[Reader] = None
_city_reader: Optional[Reader] = None


def get_country_reader() -> Reader:
    global _country_reader
    if _country_reader is None:
        try:
            _country_reader = Reader(join(settings.GEOIP_PATH, "GeoIP2-Country.mmdb"), mode=0)
        except OSError:
            _country_reader = Reader(join(settings.GEOIP_PATH, "GeoLite2-Country.mmdb"), mode=0)
    return _country_reader


def get_city_reader() -> Reader:
    global _city_reader
    if _city_reader is None:
        try:
            _city_reader = Reader(join(settings.GEOIP_PATH, "GeoIP2-City.mmdb"), mode=0)
        except OSError:
            _city_reader = Reader(join(settings.GEOIP_PATH, "GeoLite2-City.mmdb"), mode=0)
    return _city_reader


def get_country_code_from_ip(ip: Optional[str]) -> Optional[str]:
    if ip is None:
        return None
    try:
        response = get_country_reader().country(ip)
    except (GeoIP2Error, ValueError):
        return None
    return response.country.iso_code


class IPGeoLocation(BaseModel):
    ip: str
    city: Optional[str] = None
    region: Optional[str] = None
    country_code: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None

    @staticmethod
    def from_ip(ip: str) -> IPGeoLocation:
        default_response = IPGeoLocation(ip=ip)

        # Try to have the country, regardless of city info
        default_response.country_code = get_country_code_from_ip(ip)

        try:
            info = get_city_reader().city(ip)
        except (GeoIP2Error, ValueError):
            return default_response

        region = info.subdivisions[0].iso_code if info.subdivisions else None
        return IPGeoLocation(ip=ip,
                             city=info.city.name,
                             region=region,
                             country_code=info.country.iso_code,
                             longitude=info.location.longitude,
                             latitude=info.location.latitude)

    def __str__(self) -> str:
        return " ".join([item for item in [self.city, self.region, self.country_code] if item is not None])
