from django.conf.urls import url


import establishment.socialaccount.urls
from . import views

urlpatterns = [
    # Signup
    url(r"^signup_request/$", views.user_signup_request, name="account_signup_request"),

    url(r"^login/$", views.user_login_view, name="account_login"),
    url(r"^logout/$", views.user_logout_view, name="account_logout"),

    # Social
    url(r"^remove_social_account/$", views.remove_social_account),

    # User profile
    url(r"^settings/", views.account_settings, name="account_settings"),
    url(r"^profile_changed/$", views.edit_profile),

    # Public user profiles
    url(r"^public_user_profiles", views.public_user_profiles),

    # Password
    url(r"^password_change/$", views.user_password_change, name="account_password_change"),

    url(r"^password_reset/$", views.user_password_reset_request, name="account_password_reset"),
    url(r"^password_reset/(?P<user_base36>[0-9A-Za-z]+)-(?P<reset_token>.+)/$", views.user_password_reset_from_token,
        name="user_password_reset_from_token"),

    # Email
    url(r"^email_address_add/$", views.email_address_add, name="account_email_add"),
    url(r"^email_address_remove/$", views.email_address_remove, name="account_email_remove"),
    url(r"^email_address_make_primary/$", views.email_address_make_primary, name="account_email_make_primary"),
    url(r"^email_address_verification_send/$", views.email_address_verification_send, name="account_email_verification_send"),
    url(r"^email_address_verify/(?P<key>\w+)/$", views.email_address_verify, name="account_email_verify"),

    url(r"^email_unsubscribe/(?P<key>\w+)/$", views.email_unsubscribe, name="email_unsubscribe"),

    # Notifications
    url(r"^get_user_notifications/$", views.get_user_notifications, name="get_user_notifications"),
    url(r"^set_user_notifications_read/$", views.set_user_notifications_read, name="set_user_notifications_read"),

    url(r"^change_user_group/$", views.change_user_group, name="change_user_group")
]

urlpatterns += establishment.socialaccount.urls.urlpatterns
