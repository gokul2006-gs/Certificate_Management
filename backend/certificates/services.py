from django.utils import timezone

from accounts.models import Student

from .models import CertificateGenerationJob

JOB_BATCH_SIZE = 25
MAX_SKIPPED_DETAILS = 200


def generate_for_students(template_file, issue_date, students, request):
    from .views import (
        _absolute_media_url,
        _create_certificate,
        _download_url,
        _generated_certificate_file,
    )

    created = []
    skipped = []

    for student in students:
        try:
            template_file.seek(0)
            generated_file = _generated_certificate_file(student, template_file, issue_date)
            certificate, verification_url = _create_certificate(
                student,
                generated_file,
                generated_file.name,
            )
            created.append({
                "student_id": student.student_id,
                "student_name": student.name,
                "certificate": _absolute_media_url(request, certificate.certificate_file),
                "download_url": _download_url(request, student.student_id),
                "qr": _absolute_media_url(request, certificate.qr_code),
                "verification_url": verification_url,
            })
        except Exception as exc:
            skipped.append({
                "student_id": student.student_id,
                "student_name": student.name,
                "reason": str(exc),
            })

    return created, skipped


def process_generation_job_batch(job, request, batch_size=JOB_BATCH_SIZE):
    if job.status in {
        CertificateGenerationJob.STATUS_COMPLETED,
        CertificateGenerationJob.STATUS_FAILED,
        CertificateGenerationJob.STATUS_CANCELLED,
    }:
        return [], []

    if job.processed_count >= len(job.student_ids):
        job.status = CertificateGenerationJob.STATUS_COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at", "updated_at"])
        return [], []

    job.status = CertificateGenerationJob.STATUS_PROCESSING
    job.save(update_fields=["status", "updated_at"])

    batch_ids = job.student_ids[job.processed_count:job.processed_count + batch_size]
    students = Student.objects.filter(student_id__in=batch_ids).select_related("course")
    student_map = {student.student_id: student for student in students}

    ordered_students = []
    missing_ids = []
    for student_id in batch_ids:
        student = student_map.get(student_id)
        if student:
            ordered_students.append(student)
        else:
            missing_ids.append(student_id)

    recent_created = []
    recent_skipped = [
        {
            "student_id": student_id,
            "student_name": student_id,
            "reason": "Student not found",
        }
        for student_id in missing_ids
    ]

    try:
        with job.template_file.open("rb") as template_handle:
            batch_created, batch_skipped = generate_for_students(
                template_handle,
                job.issue_date,
                ordered_students,
                request,
            )
            recent_created.extend(batch_created)
            recent_skipped.extend(batch_skipped)
    except Exception as exc:
        job.status = CertificateGenerationJob.STATUS_FAILED
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        return recent_created, recent_skipped

    job.processed_count += len(batch_ids)
    job.created_count += len(recent_created)
    job.skipped_count += len(recent_skipped)
    job.skipped_details = (job.skipped_details + recent_skipped)[-MAX_SKIPPED_DETAILS:]

    if job.processed_count >= len(job.student_ids):
        job.status = CertificateGenerationJob.STATUS_COMPLETED
        job.completed_at = timezone.now()
    else:
        job.status = CertificateGenerationJob.STATUS_PROCESSING

    job.save(
        update_fields=[
            "status",
            "processed_count",
            "created_count",
            "skipped_count",
            "skipped_details",
            "completed_at",
            "updated_at",
        ]
    )
    return recent_created, recent_skipped


def serialize_generation_job(job, request, recent_created=None, recent_skipped=None):
    return {
        "job_id": str(job.id),
        "status": job.status,
        "total_count": job.total_count,
        "processed_count": job.processed_count,
        "created_count": job.created_count,
        "skipped_count": job.skipped_count,
        "progress_percent": job.progress_percent,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
        "recent_created": recent_created or [],
        "recent_skipped": recent_skipped or [],
        "skipped": job.skipped_details if job.status == CertificateGenerationJob.STATUS_COMPLETED else [],
    }
