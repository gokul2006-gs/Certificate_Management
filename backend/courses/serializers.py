from rest_framework import serializers

from accounts.models import Student
from courses.models import Course


class CourseSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "course_name",
            "duration",
            "student_count",
        ]

    def get_student_count(self, obj):
        return Student.objects.filter(course=obj).count()
