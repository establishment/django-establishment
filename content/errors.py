from establishment.utils.errors import APIError


class TranslationExists(APIError):
    code = 3200
    default_message = "A translation in this language already exists."


class RequestedTooManyArticles(APIError):
    code = 3201
    default_message = "You have requested too many articles at once."


class ProtectedArticle(APIError):
    code = 3202
    default_message = "The article is protected."


class TooMuchFeedback(APIError):
    code = 3203
    default_message = "Too many posts, ignoring"


class QuestionnaireNotAvailable(APIError):
    code = 3204
    default_message = "This questionnaire is no longer available"
