from django.core.management.base import BaseCommand
from django.db import connection
import pymongo

class Command(BaseCommand):
    help = "Create required indexes in MongoDB collections"

    def handle(self, *args, **options):
        db = connection.database
        self.stdout.write("Creating indexes...")

        # accounts_student indexes
        try:
            db.accounts_student.create_index([("student_id", pymongo.ASCENDING)], unique=True)
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"accounts_student student_id index: {e}")

        try:
            db.accounts_student.create_index([("email", pymongo.ASCENDING)], unique=True)
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"accounts_student email index: {e}")

        try:
            db.accounts_student.create_index([("name", pymongo.ASCENDING)])
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"accounts_student name index: {e}")
        
        # certificates_certificate indexes
        try:
            db.certificates_certificate.create_index([("student_id", pymongo.ASCENDING)])
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"certificates_certificate student_id index: {e}")

        try:
            db.certificates_certificate.create_index([("created_at", pymongo.DESCENDING)])
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"certificates_certificate created_at index: {e}")

        try:
            db.certificates_certificate.create_index([("student_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"certificates_certificate compound index: {e}")

        # certificates_certificategenerationjob
        try:
            db.certificates_certificategenerationjob.create_index([("created_at", pymongo.DESCENDING)])
        except pymongo.errors.OperationFailure as e:
            self.stdout.write(f"certificates_certificategenerationjob created_at index: {e}")

        self.stdout.write(self.style.SUCCESS("MongoDB indexes created successfully!"))
