import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("certificates", "0004_alter_certificate_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="CertificateGenerationJob",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("template_file", models.FileField(upload_to="certificate_templates/")),
                ("issue_date", models.CharField(max_length=10)),
                ("student_ids", models.JSONField(default=list)),
                ("processed_count", models.PositiveIntegerField(default=0)),
                ("created_count", models.PositiveIntegerField(default=0)),
                ("skipped_count", models.PositiveIntegerField(default=0)),
                ("skipped_details", models.JSONField(default=list)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
