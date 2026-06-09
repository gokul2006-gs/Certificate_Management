import re

from django.conf import settings
from django.http import HttpResponse

PRIVATE_NETWORK_ORIGIN = re.compile(
    r"^http://(?:127\.0\.0\.1|localhost|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}):\d+$"
)


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin")
        allowed_origins = getattr(settings, "FRONTEND_ALLOWED_ORIGINS", [])
        is_allowed_origin = origin in allowed_origins or (
            settings.DEBUG
            and origin
            and PRIVATE_NETWORK_ORIGIN.match(origin)
        )
        if is_allowed_origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = "content-type, x-csrftoken"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

        return response
