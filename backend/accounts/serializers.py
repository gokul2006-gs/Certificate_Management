from rest_framework import serializers
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Student
        fields = ["id", "student_id", "name", "email", "password", "created_at"]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
            "student_id": {"required": False},
        }
