from typing import Optional, Union

from pydantic import BaseModel
from user_agents.parsers import UserAgent

from establishment.utils.enums import StrEnum


class DeviceTypeEnum(StrEnum):
    DESKTOP = "desktop"
    TABLET = "tablet"
    MOBILE = "mobile"
    UNKNOWN = "unknown"


def parse_user_agent(user_agent_string: Optional[str]) -> Optional[UserAgent]:
    try:
        return UserAgent(user_agent_string)
    except:
        return None


class DeviceInfo(BaseModel):
    type: DeviceTypeEnum = DeviceTypeEnum.UNKNOWN
    os: Optional[str] = None
    browser: Optional[str] = None
    # TODO Optionally this can actually include the user agent


def get_option_or_unknown(value: str, options: list[str]) -> str:
    for option in options:
        if option.lower() in value.lower():
            return option
    return "Unknown"


def get_device_type(user_agent: Union[Optional[str], UserAgent]) -> DeviceTypeEnum:
    if not isinstance(user_agent, UserAgent):
        user_agent = parse_user_agent(user_agent)

    if user_agent is not None:
        if user_agent.is_pc:
            return DeviceTypeEnum.DESKTOP
        if user_agent.is_mobile:
            return DeviceTypeEnum.MOBILE
        if user_agent.is_tablet:
            return DeviceTypeEnum.TABLET

    return DeviceTypeEnum.UNKNOWN


def format_device(user_agent_string: Optional[str]) -> DeviceInfo:
    user_agent = parse_user_agent(user_agent_string)
    if user_agent is None:
        return DeviceInfo()

    oss = ["Windows", "Mac OS", "Android", "iOS", "Linux"]
    browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera", "Samsung", "UC Browser"]
    return DeviceInfo(
        type=get_device_type(user_agent),
        os=get_option_or_unknown(user_agent.os.family, oss),
        browser=get_option_or_unknown(user_agent.browser.family, browsers),
    )
