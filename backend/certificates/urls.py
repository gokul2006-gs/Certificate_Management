from django.urls import path

from .views import (
    bulk_upload_certificates,
    download_certificate,
    generate_certificates_from_template,
    upload_certificate,
    verify_certificate,
    view_certificate
)

urlpatterns = [

    path(
        'upload/',
        upload_certificate
    ),

    path(
        'bulk-upload/',
        bulk_upload_certificates
    ),

    path(
        'generate-from-template/',
        generate_certificates_from_template
    ),

    path(
        'verify/<str:student_id>/',
        verify_certificate
    ),

    path(
        'download/<str:student_id>/',
        download_certificate
    ),
    path(
    'view/<str:student_id>/',
    view_certificate
),

]
