from django.db import models
from accounts.models import Student

class Certificate(models.Model):

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="certificates"
    )

    certificate_file = models.FileField(
        upload_to="certificates/"
    )

    qr_code = models.FileField(
        upload_to="qrcodes/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.student.name
