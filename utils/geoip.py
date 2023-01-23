from __future__ import annotations

from django.conf import settings
from geoip2.database import Reader
from geoip2.errors import GeoIP2Error
from os.path import join
from pydantic import BaseModel
from typing import Optional

country_reader = Reader(join(settings.GEOIP_PATH, "GeoLite2-Country.mmdb"), mode=0)
city_reader = Reader(join(settings.GEOIP_PATH, "GeoLite2-City.mmdb"), mode=0)


def get_country_code_from_ip(ip: Optional[str]) -> Optional[str]:
    if ip is None:
        return None
    try:
        response = country_reader.country(ip)
    except (GeoIP2Error, ValueError):
        return None
    return response.country.iso_code


class IPGeoLocation(BaseModel):
    ip: str
    city: Optional[str]
    region: Optional[str]
    country_code: Optional[str]
    longitude: Optional[float]
    latitude: Optional[float]

    @staticmethod
    def from_ip(ip: str) -> IPGeoLocation:
        try:
            info = city_reader.city(ip)
        except (GeoIP2Error, ValueError):
            return IPGeoLocation(ip=ip)
        region = info.subdivisions[0].iso_code if info.subdivisions else None  # type: ignore
        return IPGeoLocation(ip=ip,
                             city=info.city.name or "-",
                             region=region or "-",
                             country_code=info.country.iso_code or "-",
                             longitude=info.location.longitude,
                             latitude=info.location.latitude)

    def __str__(self) -> str:
        return " ".join([item for item in [self.city, self.region, self.country_code] if item is not None])
