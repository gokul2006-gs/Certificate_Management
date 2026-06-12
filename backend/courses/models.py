from django.db import models

class Course(models.Model):
    TECHNICAL = "Technical"
    BASIC = "Basic"
    NON_TECHNICAL = "Non-Technical"
    GRAPHIC_DESIGNING = "Graphic Designing"
    DEVELOPMENT_SERVICES = "Development Services"

    COURSE_TYPE_CHOICES = [
        (TECHNICAL, "Technical Courses"),
        (BASIC, "Basic Courses"),
        (NON_TECHNICAL, "Non-Technical Courses"),
        (GRAPHIC_DESIGNING, "Graphic Designing Courses"),
        (DEVELOPMENT_SERVICES, "Development Services"),
    ]

    course_name = models.CharField(max_length=100)
    duration = models.CharField(max_length=50)
    course_type = models.CharField(
        max_length=50,
        choices=COURSE_TYPE_CHOICES,
        default=TECHNICAL,
    )

    def __str__(self):
        return self.course_name