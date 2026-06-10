from rest_framework import serializers

from courses.models import Course
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    course = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        pk_field=serializers.CharField(),
        required=False,
    )
    course_name = serializers.CharField(
        source="course.course_name",
        read_only=True,
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "name",
            "email",
            "password",
            "course",
            "course_name",
            "created_at",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
            "student_id": {"required": False},
        }
