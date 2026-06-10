import logging
import string

from django.conf import settings

logger = logging.getLogger(__name__)

SESSION_KEY_LENGTH = 32
VALID_SESSION_KEY_CHARS = frozenset(string.ascii_lowercase + string.digits)


class CleanStaleSessionCookieMiddleware:
    """Drop malformed session cookies before SessionMiddleware touches MongoDB."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        cookie_name = settings.SESSION_COOKIE_NAME
        session_key = request.COOKIES.get(cookie_name)
        invalid_session_key = bool(session_key) and not self._is_valid_session_key(session_key)

        if invalid_session_key:
            cookies = request.COOKIES.copy()
            cookies.pop(cookie_name, None)
            request.COOKIES = cookies

        response = self.get_response(request)

        if invalid_session_key:
            response.delete_cookie(
                cookie_name,
                path=settings.SESSION_COOKIE_PATH,
                domain=settings.SESSION_COOKIE_DOMAIN,
                samesite=settings.SESSION_COOKIE_SAMESITE,
            )

        return response

    def _is_valid_session_key(self, key):
        return (
            len(key) == SESSION_KEY_LENGTH
            and all(char in VALID_SESSION_KEY_CHARS for char in key)
        )
