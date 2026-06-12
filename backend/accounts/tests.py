from bson import ObjectId
from django.contrib.sessions.backends.db import SessionStore
from django.test import TestCase

from accounts.models import Student
from accounts.serializers import StudentSerializer
from accounts.views import _to_session_value
from courses.models import Course


class SessionSerializationTests(TestCase):
    def test_student_serializer_returns_string_ids(self):
        course = Course.objects.create(course_name="Mongo Course", duration="3 Months")
        student = Student.objects.create(
            student_id="TSC999",
            name="Mongo Student",
            email="mongo@example.com",
            password="secret",
            course=course,
        )

        data = StudentSerializer(student).data

        self.assertIsInstance(data["id"], str)
        self.assertIsInstance(data["course"], str)
        self.assertEqual(data["course"], str(course.id))
    def test_to_session_value_converts_objectid_to_string(self):
        value = ObjectId()

        self.assertEqual(_to_session_value(value), str(value))

    def test_session_store_accepts_objectid_session_value(self):
        session = SessionStore()
        session["admin_log_id"] = _to_session_value(ObjectId())

        session.save()

        self.assertTrue(session.session_key)


class AccountsViewTests(TestCase):
    def test_csrf_token_endpoint(self):
        response = self.client.get('/api/accounts/csrf/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('csrfToken', data)
        self.assertTrue(len(data['csrfToken']) > 0)

    def test_student_login_success(self):
        course = Course.objects.create(course_name="Test Course", duration="1 Month")
        student = Student.objects.create(
            student_id="TSC001",
            name="Student Name",
            email="student@example.com",
            password="password123",
            course=course,
        )
        response = self.client.post(
            '/api/accounts/login/',
            data={"role": "student", "student_id": "TSC001", "password": "password123"},
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['role'], 'student')
        self.assertEqual(data['student_id'], 'TSC001')
        self.assertEqual(data['name'], 'Student Name')

    def test_student_creation_with_course_and_duration(self):
        # Log in admin session to pass admin check
        from django.contrib.auth.models import User
        User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpassword"
        )
        session = self.client.session
        session["role"] = "admin"
        session.save()

        # Create student with a new course and duration
        response = self.client.post(
            "/api/accounts/students/",
            data={
                "name": "New Student",
                "email": "new.student@example.com",
                "course": "Data Science",
                "duration": "6 Months"
            },
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "New Student")
        self.assertEqual(data["email"], "new.student@example.com")
        self.assertEqual(data["course_name"], "Data Science")

        # Verify Course duration was set correctly
        student_obj = Student.objects.get(student_id=data["student_id"])
        self.assertEqual(student_obj.course.course_name, "Data Science")
        self.assertEqual(student_obj.course.duration, "6 Months")


