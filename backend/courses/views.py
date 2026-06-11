from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import Student
from courses.models import Course
from .serializers import CourseSerializer


def _parse_object_id(val):
    try:
        return ObjectId(val)
    except (InvalidId, TypeError, ValueError):
        return None


def _admin_required(request):
    return request.session.get("role") == "admin" or (
        request.user.is_authenticated and request.user.is_staff
    )


@api_view(["GET", "POST"])
def courses_list(request):
    if not _admin_required(request):
        return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        courses = Course.objects.all().order_by("course_name")
        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def course_detail(request, course_id):
    if not _admin_required(request):
        return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

    obj_id = _parse_object_id(course_id)
    if not obj_id:
        return Response({"error": "Invalid course ID format"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        course = Course.objects.get(id=obj_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = CourseSerializer(course)
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = CourseSerializer(course, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        enrolled_count = Student.objects.filter(course=course).count()
        if enrolled_count > 0:
            return Response(
                {"error": f"Cannot delete course because {enrolled_count} student(s) are registered under it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.delete()
        return Response({"message": "Course deleted successfully"})
