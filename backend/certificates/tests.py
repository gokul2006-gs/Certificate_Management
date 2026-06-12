import io
import uuid
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from accounts.models import Student
from courses.models import Course
from certificates.models import CertificateGenerationJob, Certificate


class CertificateGenerationTests(TestCase):
    def setUp(self):
        # Create admin user
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpassword"
        )
        
        # Create a course and student
        self.course = Course.objects.create(
            course_name="Python Programming",
            duration="3 Months"
        )
        self.student = Student.objects.create(
            student_id="TSC001",
            name="Alice Smith",
            email="alice@example.com",
            password="password123",
            course=self.course
        )

        # Create a tiny 10x10 pixel PNG image in memory for template file
        img_buffer = io.BytesIO()
        img = Image.new("RGB", (100, 100), color="white")
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)
        self.dummy_template = SimpleUploadedFile(
            "template.png",
            img_buffer.read(),
            content_type="image/png"
        )

    def test_generation_job_lifecycle(self):
        # 1. Log in admin session to pass admin check
        session = self.client.session
        session["role"] = "admin"
        session.save()

        # 2. Test create_generation_job POST view
        response = self.client.post(
            "/api/certificates/generation-jobs/",
            data={
                "template_file": self.dummy_template,
                "issue_date": "2026-06-11",
                "student_ids": ["TSC001"]
            }
        )
        if response.status_code != 201:
            print("RESPONSE CONTENT:", response.content)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        job_id = data["job_id"]
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["total_count"], 1)

        # 3. Test poll_generation_job GET view which processes the batch
        response = self.client.get(f"/api/certificates/generation-jobs/{job_id}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["processed_count"], 1)
        self.assertEqual(data["created_count"], 1)
        self.assertEqual(data["skipped_count"], 0)

        # Verify a certificate model was actually created
        self.assertTrue(Certificate.objects.filter(student=self.student).exists())

    def test_bulk_upload_query_count(self):
        # Log in admin session to pass admin check
        session = self.client.session
        session["role"] = "admin"
        session.save()

        # Create multiple students
        for i in range(2, 6):
            student_id = f"TSC{i:03d}"
            Student.objects.create(
                student_id=student_id,
                name=f"Student {i}",
                email=f"student{i}@example.com",
                password="password123",
                course=self.course
            )

        # Create multiple dummy files
        files = []
        for i in range(2, 6):
            student_id = f"TSC{i:03d}"
            files.append(
                SimpleUploadedFile(
                    f"{student_id}_cert.png",
                    b"fake_file_content_png_image",
                    content_type="image/png"
                )
            )

        # Capture queries during request
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.post(
                "/api/certificates/bulk-upload/",
                data={"certificate_files": files}
            )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["created_count"], 4)
        print(f"\nNumber of queries executed for 4 files: {len(ctx.captured_queries)}")

    def test_single_certificate_generation_from_template(self):
        # Log in admin session to pass admin check
        session = self.client.session
        session["role"] = "admin"
        session.save()

        # Call the single upload endpoint with a template file
        response = self.client.post(
            "/api/certificates/upload/",
            data={
                "student_id": self.student.student_id,
                "certificate_file": self.dummy_template,
                "issue_date": "2026-06-12"
            }
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("certificate", data)
        self.assertIn("qr", data)
        self.assertIn("verification_url", data)

        # Verify a certificate model was created and file is generated
        self.assertTrue(Certificate.objects.filter(student=self.student).exists())


