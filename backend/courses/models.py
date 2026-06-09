from django.db import models

class Course(models.Model):
    course_name=models.CharField(max_length=100)

    duration=models.CharField(max_length=50)

    def __str__(self):
        return self.course_name