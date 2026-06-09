from django.db import models
from courses.models import Course


class AdminLoginLog(models.Model):
    username = models.CharField(max_length=150)
    login_at = models.DateTimeField(auto_now_add=True)
    logout_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-login_at"]

    def __str__(self):
        return f"{self.username} @ {self.login_at}"


class Student(models.Model):

    student_id = models.CharField(
        max_length=20,
        unique=True
    )

    name = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        unique=True
    )

    password = models.CharField(
        max_length=255
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name