from rest_framework import serializers
from courses.models import Course


class CourseSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "course_name",
            "duration",
            "course_type",
        ]
