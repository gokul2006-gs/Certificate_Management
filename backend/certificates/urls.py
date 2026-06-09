from django.urls import path

from .views import (
    bulk_upload_certificates,
    cancel_generation_job,
    create_generation_job,
    download_certificate,
    generate_certificates_from_template,
    poll_generation_job,
    upload_certificate,
    verify_certificate,
    view_certificate,
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
        'generation-jobs/',
        create_generation_job,
    ),

    path(
        'generation-jobs/<uuid:job_id>/',
        poll_generation_job,
    ),

    path(
        'generation-jobs/<uuid:job_id>/cancel/',
        cancel_generation_job,
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
