from functools import wraps

from rest_framework import status
from rest_framework.response import Response

from .models import Student


def is_admin(request):
    return request.session.get("role") == "admin" or (
        request.user.is_authenticated and request.user.is_staff
    )


def is_student(request):
    if request.session.get("role") != "student":
        return False
    student_id = request.session.get("student_id")
    return bool(student_id) and Student.objects.filter(student_id=student_id).exists()


def is_authenticated(request):
    return is_admin(request) or is_student(request)


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not is_admin(request):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view_func(request, *args, **kwargs)

    return wrapper


def student_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not is_student(request):
            return Response(
                {"error": "Student login required"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view_func(request, *args, **kwargs)

    return wrapper
