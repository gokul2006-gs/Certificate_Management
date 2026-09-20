import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from accounts.models import Student
from certificates.views import _generated_certificate_file

# Mock a student or use an existing one
student = Student.objects.first()
if not student:
    # Create a dummy student if none exists
    from courses.models import Course
    course, _ = Course.objects.get_or_create(course_name="Graphical Designer", duration="15-Days")
    student = Student.objects.create(
        student_id="TSC001",
        name="Vinotha K",
        email="vinotha@example.com",
        password="password123",
        course=course
    )

template_path = 'd:/Task/TS3/backend/media/certificate_templates/TS3.png'
with open(template_path, 'rb') as f:
    template_file = File(f)
    # Generate the certificate
    generated = _generated_certificate_file(
        student=student,
        template_file=template_file,
        issue_date="19th May 2025 to 04th June 2025",
        course_name="Graphical Designer"
    )
    
    # Save the output file
    output_path = 'd:/Task/TS3/backend/media/certificates/test_out.png'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as out_f:
        out_f.write(generated.read())
    print(f"Generated certificate saved to {output_path}")
