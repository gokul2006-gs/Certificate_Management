import re

from django.http import JsonResponse

from accounts.permissions import is_admin, is_authenticated, is_student

PUBLIC_API_PATTERNS = (
    re.compile(r"^/api/accounts/csrf/?$"),
    re.compile(r"^/api/accounts/session/?$"),
    re.compile(r"^/api/accounts/login/?$"),
    re.compile(r"^/api/accounts/logout/?$"),
    re.compile(r"^/api/certificates/verify/[^/]+/?$"),
    re.compile(r"^/api/certificates/download/[^/]+/?$"),
)

ADMIN_API_PREFIXES = (
    "/api/accounts/dashboard-stats/",
    "/api/accounts/students",
    "/api/accounts/upload-excel/",
    "/api/accounts/db-connection/",
    "/api/accounts/admin-login-logs/",
    "/api/courses/",
    "/api/certificates/bulk-upload/",
    "/api/certificates/upload/",
    "/api/certificates/generate-from-template/",
    "/api/certificates/generation-jobs/",
)


class RequireApiAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS" or not request.path.startswith("/api/"):
            return self.get_response(request)

        if any(pattern.match(request.path) for pattern in PUBLIC_API_PATTERNS):
            return self.get_response(request)

        if not is_authenticated(request):
            return JsonResponse(
                {"error": "Authentication required. Please login first."},
                status=401,
            )

        if any(request.path.startswith(prefix) for prefix in ADMIN_API_PREFIXES):
            if not is_admin(request):
                return JsonResponse(
                    {"error": "Admin access required"},
                    status=403,
                )

        if request.session.get("role") == "student" and not is_student(request):
            request.session.flush()
            return JsonResponse(
                {"error": "Student session expired. Please login again."},
                status=401,
            )

        return self.get_response(request)
