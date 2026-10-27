from inspect import Parameter, isclass
from types import NoneType, UnionType
from typing import Any, Callable, ClassVar, Optional, Union, Unpack, get_args, get_origin

from django.contrib.auth import get_user_model
from django.contrib.auth.base_user import AbstractBaseUser
from django.http import HttpRequest, QueryDict
from pydantic import ValidationError as PydanticValidationError

from establishment.utils.argument_loader import ArgumentLoader, make_arguments_loader_func
from establishment.utils.error_data import convert_pydantic_exception
from establishment.utils.errors import InternalServerError, NotAuthenticated, PermissionDenied
from establishment.utils.http import BaseView, Permission, ViewConfig, ViewConfigOverrides, ViewSet
from establishment.utils.http.request import BaseRequest, is_ajax
from establishment.utils.http.view_arguments_loaders import URLArgLoader, ViewContextArgumentLoader
from establishment.utils.http.view_context import BaseViewContext
from establishment.webapp.base_views import global_renderer


class RequestArgumentLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, BaseRequest)

    def get_view_dict(self, view_context: BaseViewContext) -> Union[dict, QueryDict]:
        django_request = view_context.raw_request
        if django_request.method == "GET":
            return django_request.GET
        if django_request.method == "POST":
            # Flattening a form would turn an array holding one element into a bare value
            if django_request.content_type in ("application/x-www-form-urlencoded", "multipart/form-data"):
                return django_request.POST
            return view_context.data

        raise InternalServerError("Failed to match http method")

    def load(self, param: Parameter) -> BaseRequest:
        view_context = BaseViewContext.get()
        try:
            request = param.annotation.from_request(self.get_view_dict(view_context))
        except PydanticValidationError as exc:
            raise convert_pydantic_exception(exc)

        view_context.typed_request = request
        return request


# Matches the site's user model or any base of it, so a shared app can take a user without naming the site's model
class UserArgumentLoader(ArgumentLoader):
    @staticmethod
    def get_user_class(param: Parameter) -> Optional[type]:
        annotation = param.annotation
        if get_origin(annotation) in (Union, UnionType):
            classes = [arg for arg in get_args(annotation) if arg is not NoneType]
            if len(classes) != 1:
                return None
            annotation = classes[0]
        if not isclass(annotation) or not issubclass(annotation, AbstractBaseUser):
            return None
        return annotation

    def can_load_type(self, param: Parameter) -> bool:
        user_class = self.get_user_class(param)
        return user_class is not None and issubclass(get_user_model(), user_class)

    def load(self, param: Parameter) -> Optional[AbstractBaseUser]:
        user = BaseViewContext.get().raw_request.user
        if user.is_authenticated:
            return user
        # A bare annotation means the view needs a user, an Optional one also serves visitors
        if param.annotation is self.get_user_class(param):
            raise NotAuthenticated
        return None


WEBAPP_ARGUMENT_LOADERS: list[ArgumentLoader] = [
    RequestArgumentLoader(),
    URLArgLoader(),
    ViewContextArgumentLoader(),
    UserArgumentLoader(),
]


class WebappView(BaseView):
    argument_loaders: ClassVar[list[ArgumentLoader]] = WEBAPP_ARGUMENT_LOADERS

    def process_request(self, request: HttpRequest) -> Any:
        view_context = BaseViewContext.get()

        if self.config.extra.get("is_single_page", None) and not is_ajax(view_context.raw_request):
            return global_renderer.render_single_page_app(request)

        view_context.typed_view_args = self.load_view_arguments()

        return self.func(*view_context.typed_view_args)

    def make_argument_loader(self) -> Callable[[], list[Any]]:
        return make_arguments_loader_func(self.func, self.argument_loaders)


class WebappViewSet(ViewSet):
    view_class: ClassVar[type[WebappView]] = WebappView

    def make_view(self, view_config: ViewConfig, view_func: Callable) -> WebappView:
        return self.view_class(view_config, view_func, self)

    def single_page_app(self, **kwargs: Unpack[ViewConfigOverrides]) -> Callable:
        kwargs["extra"] = kwargs.get("extra", {})
        kwargs["extra"]["is_single_page"] = True

        return self.get(**kwargs)


class IsAdmin(Permission):
    name = "IsAdmin"

    def check_permission(self) -> None:
        view_context = BaseViewContext.get()
        if not view_context.raw_request.user.is_superuser:
            raise PermissionDenied


is_admin = IsAdmin()
