from establishment.utils.errors import APIError


class InvalidCampaignStart(APIError):
    code = 3600
    default_message = "This campaign must be sent manually."
