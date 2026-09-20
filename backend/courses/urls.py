from django.urls import path

from .views import course_detail, courses_list


urlpatterns = [
    path("", courses_list, name="courses-list"),
    path("<str:course_id>/", course_detail, name="course-detail"),
]
