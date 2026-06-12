import uuid

from django.db import models

from accounts.models import Student


class Certificate(models.Model):

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="certificates"
    )

    certificate_file = models.FileField(upload_to="certificates/")
    qr_code = models.FileField(upload_to="qrcodes/", blank=True, null=True)
    course_name = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.student.name


class CertificateGenerationJob(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    template_file = models.FileField(upload_to="certificate_templates/")
    issue_date = models.CharField(max_length=10)
    student_ids = models.JSONField(default=list)
    fields = models.JSONField(default=dict, blank=True)
    course_name = models.CharField(max_length=200, blank=True, default="")
    processed_count = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    skipped_details = models.JSONField(default=list)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def total_count(self):
        return len(self.student_ids)

    @property
    def progress_percent(self):
        if not self.student_ids:
            return 100
        return int((self.processed_count / len(self.student_ids)) * 100)

    def __str__(self):
        return f"Certificate job {self.id} ({self.status})"
