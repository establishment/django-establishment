from __future__ import annotations

from typing import Any

from pydantic import BaseModel, field_validator


class FakeModel(BaseModel):
    id: str

    @field_validator("id", mode="before")
    @classmethod
    def int_or_str(cls, value: Any) -> str:
        if isinstance(value, int):
            return str(value)
        if not isinstance(value, str):
            raise ValueError("Only int or string accepted")
        return str(value)
