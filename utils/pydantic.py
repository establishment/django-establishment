from __future__ import annotations

from datetime import datetime
from typing import Optional, TypeVar

from django.db.models import Q
from pydantic import BaseModel, Field

from establishment.utils.http.request import BaseRequest

T = TypeVar("T")


UUIDHexStr = Field(min_length=32, max_length=32)  # TODO Missing validation


class PageQuery(BaseModel):
    page: int = Field(default=1, ge=1, le=2 ** 31)  # Increase this if we made it!
    page_size: int = Field(default=20, ge=0, le=250)
    include_count: bool = True
    include_summary: bool = True  # Generic umbrella for now if we want all fields, stats, etc.


class DateRangeQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_start: bool = True  # Control if we want to include or exclude the interval endpoints
    include_end: bool = False

    def matches_date(self, date: datetime) -> bool:
        if self.start_date and self.start_date > date:
            return False
        if self.end_date and self.end_date < date:
            return False
        return True

    # TODO @pydantic is there a way for us to know the field name?
    def get_date_range_query(self, field_name: str = "created_at") -> Q:
        q = Q()

        if self.start_date:
            start_field_name = field_name + "__gt"
            if self.include_start:
                start_field_name += "e"
            q &= Q(**{start_field_name: self.start_date})

        if self.end_date:
            end_field_name = field_name + "__lt"
            if self.include_end:
                end_field_name += "e"
            q &= Q(**{end_field_name: self.end_date})

        return q

    def clamp(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
        if start_date and (not self.start_date or self.start_date < start_date):
            self.start_date = start_date
        if end_date and (not self.end_date or end_date < self.end_date):
            self.end_date = end_date


# Can also be used as a stand-alone request
class PageRequest(PageQuery, BaseRequest):
    pass
