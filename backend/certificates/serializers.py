from rest_framework import serializers
from accounts.models import Student
from .models import Certificate

class CertificateSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(),
        pk_field=serializers.CharField(),
        required=False,
    )
    student_id = serializers.CharField(source="student.student_id", read_only=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    course_name = serializers.CharField(source="student.course.course_name", read_only=True)

    class Meta:
        model = Certificate
        fields = [
            "id",
            "student",
            "student_id",
            "student_name",
            "course_name",
            "certificate_file",
            "qr_code",
            "created_at",
        ]
