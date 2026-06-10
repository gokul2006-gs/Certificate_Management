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
