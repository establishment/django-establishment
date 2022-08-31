from django.urls import re_path


import establishment.socialaccount.urls
from . import views

urlpatterns = [
    # Signup
    re_path(r"^signup_request/$", views.user_signup_request, name="account_signup_request"),

    re_path(r"^login/$", views.user_login_view, name="account_login"),
    re_path(r"^logout/$", views.user_logout_view, name="account_logout"),

    # Social
    re_path(r"^remove_social_account/$", views.remove_social_account),

    # User profile
    re_path(r"^settings/", views.account_settings, name="account_settings"),
    re_path(r"^profile_changed/$", views.edit_profile),

    # Public user profiles
    re_path(r"^public_user_profiles", views.public_user_profiles),

    # Password
    re_path(r"^password_change/$", views.user_password_change, name="account_password_change"),

    re_path(r"^password_reset/$", views.user_password_reset_request, name="account_password_reset"),
    re_path(r"^password_reset/(?P<user_base36>[0-9A-Za-z]+)-(?P<reset_token>.+)/$", views.user_password_reset_from_token,
        name="user_password_reset_from_token"),

    # Email
    re_path(r"^email_address_add/$", views.email_address_add, name="account_email_add"),
    re_path(r"^email_address_remove/$", views.email_address_remove, name="account_email_remove"),
    re_path(r"^email_address_make_primary/$", views.email_address_make_primary, name="account_email_make_primary"),
    re_path(r"^email_address_verification_send/$", views.email_address_verification_send, name="account_email_verification_send"),
    re_path(r"^email_address_verify/(?P<key>\w+)/$", views.email_address_verify, name="account_email_verify"),

    re_path(r"^email_unsubscribe/(?P<key>\w+)/$", views.email_unsubscribe, name="email_unsubscribe"),

    # Notifications
    re_path(r"^get_user_notifications/$", views.get_user_notifications, name="get_user_notifications"),
    re_path(r"^set_user_notifications_read/$", views.set_user_notifications_read, name="set_user_notifications_read"),

    re_path(r"^change_user_group/$", views.change_user_group, name="change_user_group")
]

urlpatterns += establishment.socialaccount.urls.urlpatterns
