import os
import re
import zipfile
import qrcode

from io import BytesIO

from django.conf import settings
from django.core.files import File
from django.core.files.base import ContentFile
from django.http import FileResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import Student
from accounts.permissions import admin_required, is_admin, is_student
from .models import Certificate, CertificateGenerationJob
from .serializers import CertificateSerializer
from .services import (
    generate_for_students,
    process_generation_job_batch,
    serialize_generation_job,
)


ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
STUDENT_ID_PATTERN = re.compile(r"TSC\d+", re.IGNORECASE)


def _absolute_media_url(request, file_field):
    if not file_field:
        return None
    return request.build_absolute_uri(file_field.url)


def _verification_url(student_id):
    return f"{settings.FRONTEND_BASE_URL}/verify/{student_id}"


def _latest_certificate(student_id):
    certificate = (
        Certificate.objects.select_related("student", "student__course")
        .filter(student__student_id=student_id)
        .order_by("-created_at")
        .first()
    )
    if certificate and certificate.qr_code:
        try:
            if not certificate.qr_code.storage.exists(certificate.qr_code.name):
                _generate_qr(certificate)
        except Exception:
            pass
    return certificate


def _is_allowed_file(file_name):
    return os.path.splitext(file_name.lower())[1] in ALLOWED_EXTENSIONS


def _student_id_from_filename(file_name):
    match = STUDENT_ID_PATTERN.search(os.path.basename(file_name))
    return match.group(0).upper() if match else None


def _generate_qr(certificate):
    verification_url = _verification_url(certificate.student.student_id)
    qr = qrcode.make(verification_url)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)
    certificate.qr_code.save(
        f"{certificate.student.student_id}-{certificate.id}.png",
        File(buffer),
        save=True,
    )
    return verification_url


def _create_certificate(student, certificate_file, file_name=None):
    certificate = Certificate(student=student)
    certificate.certificate_file.save(
        file_name or certificate_file.name,
        certificate_file,
        save=True,
    )
    verification_url = _generate_qr(certificate)
    return certificate, verification_url


def _load_font(size, bold=False):
    from PIL import ImageFont

    candidates = [
        "arialbd.ttf" if bold else "arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for font_path in candidates:
        try:
            return ImageFont.truetype(font_path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_centered(draw, text, y, font, image_width, color):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    x = (image_width - (right - left)) / 2
    draw.text((x, y), text, font=font, fill=color)


def _fit_font(text, max_width, start_size, min_size=16, bold=False):
    font_size = start_size
    while font_size >= min_size:
        font = _load_font(font_size, bold=bold)
        left, top, right, bottom = font.getbbox(text)
        if right - left <= max_width:
            return font
        font_size -= 2
    return _load_font(min_size, bold=bold)


def _wrap_text(text, font, max_width, draw):
    if draw.textlength(text, font=font) <= max_width:
        return [text]

    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        candidate = f"{current_line} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current_line = candidate
            continue

        if current_line:
            lines.append(current_line)
            current_line = word
        else:
            partial = ""
            for char in word:
                candidate_char = f"{partial}{char}"
                if draw.textlength(candidate_char, font=font) <= max_width:
                    partial = candidate_char
                else:
                    if partial:
                        lines.append(partial)
                    partial = char
            current_line = partial

    if current_line:
        lines.append(current_line)

    return lines


def _draw_box_centered(draw, text, box, start_size, color, bold=False, min_size=16):
    left, top, right, bottom = box
    text = str(text or "").strip()
    font = _fit_font(text, right - left, start_size, min_size=min_size, bold=bold)
    lines = _wrap_text(text, font, right - left, draw)
    line_spacing = max(2, int(font.size * 0.15)) if hasattr(font, "size") else 4

    def measured_total_height():
        height = 0
        for line in lines:
            _, line_top, _, line_bottom = draw.textbbox((0, 0), line, font=font)
            height += line_bottom - line_top
        height += line_spacing * (len(lines) - 1)
        return height

    total_height = measured_total_height()
    while total_height > (bottom - top) and font.size > min_size:
        font = _load_font(font.size - 2, bold=bold)
        lines = _wrap_text(text, font, right - left, draw)
        line_spacing = max(2, int(font.size * 0.15))
        total_height = measured_total_height()

    y = top + ((bottom - top) - total_height) / 2
    for line in lines:
        line_left, line_top, line_right, line_bottom = draw.textbbox((0, 0), line, font=font)
        line_width = line_right - line_left
        line_height = line_bottom - line_top
        x = left + ((right - left) - line_width) / 2
        draw.text((x, y - line_top), line, font=font, fill=color)
        y += line_height + line_spacing


def _generated_certificate_file(student, template_file, issue_date):
    from PIL import Image, ImageDraw

    template = Image.open(template_file).convert("RGB")
    width, height = template.size
    draw = ImageDraw.Draw(template)
    verification_url = _verification_url(student.student_id)

    text_color = (21, 32, 54)
    muted_color = (61, 75, 99)
    accent_color = (227, 126, 26)

    # Positioning is tuned for the Tech S-Cube internship certificate template.
    _draw_box_centered(
        draw,
        student.name.upper(),
        (
            int(width * 0.250),
            int(height * 0.430),
            int(width * 0.830),
            int(height * 0.488),
        ),
        max(36, int(width * 0.036)),
        text_color,
        bold=True,
        min_size=max(20, int(width * 0.018)),
    )

    _draw_box_centered(
        draw,
        f"ID: {student.student_id}",
        (
            int(width * 0.410),
            int(height * 0.500),
            int(width * 0.720),
            int(height * 0.528),
        ),
        max(16, int(width * 0.015)),
        muted_color,
        min_size=max(12, int(width * 0.012)),
    )

    course_name = student.course.course_name if student.course else "Internship Training"
    _draw_box_centered(
        draw,
        course_name.upper(),
        (
            int(width * 0.295),
            int(height * 0.778),
            int(width * 0.545),
            int(height * 0.835),
        ),
        max(18, int(width * 0.017)),
        text_color,
        bold=True,
        min_size=max(11, int(width * 0.009)),
    )

    _draw_box_centered(
        draw,
        issue_date,
        (
            int(width * 0.595),
            int(height * 0.778),
            int(width * 0.775),
            int(height * 0.835),
        ),
        max(18, int(width * 0.017)),
        text_color,
        bold=True,
        min_size=max(11, int(width * 0.009)),
    )

    _draw_box_centered(
        draw,
        getattr(student.course, "duration", "") or "Internship",
        (
            int(width * 0.335),
            int(height * 0.868),
            int(width * 0.535),
            int(height * 0.912),
        ),
        max(16, int(width * 0.014)),
        muted_color,
        min_size=max(10, int(width * 0.009)),
    )

    qr_image = qrcode.make(verification_url).convert("RGB")
    qr_size = max(115, int(min(width, height) * 0.12))
    qr_image = qr_image.resize((qr_size, qr_size))
    qr_x = width - qr_size - int(width * 0.055)
    qr_y = height - qr_size - int(height * 0.055)
    template.paste(qr_image, (qr_x, qr_y))
    draw.rectangle(
        [qr_x - 6, qr_y - 6, qr_x + qr_size + 6, qr_y + qr_size + 6],
        outline=accent_color,
        width=max(2, int(width * 0.002)),
    )

    buffer = BytesIO()
    template.save(buffer, format="PNG")
    buffer.seek(0)
    return ContentFile(buffer.read(), name=f"{student.student_id}-certificate.png")


def _download_url(request, student_id):
    return request.build_absolute_uri(
        reverse("certificate-download", kwargs={"student_id": student_id})
    )


def _file_available(file_field):
    if not file_field:
        return False
    try:
        return file_field.storage.exists(file_field.name)
    except (OSError, ValueError):
        return False


def _certificate_response(request, certificate):
    course = certificate.student.course
    certificate_available = _file_available(certificate.certificate_file)
    return {
        "valid": True,
        "status": "VALID",
        "student_id": certificate.student.student_id,
        "student_name": certificate.student.name,
        "course_name": course.course_name if course else "",
        "certificate_status": "VALID",
        "issue_date": certificate.created_at.date(),
        "certificate": _absolute_media_url(request, certificate.certificate_file)
        if certificate_available
        else None,
        "certificate_available": certificate_available,
        "download_url": _download_url(request, certificate.student.student_id)
        if certificate_available
        else None,
        "qr": _absolute_media_url(request, certificate.qr_code),
        "verification_url": _verification_url(certificate.student.student_id),
    }


@api_view(["POST"])
@admin_required
def upload_certificate(request):
    student_id = request.data.get("student_id")
    certificate_file = request.FILES.get("certificate_file")

    if not student_id or not certificate_file:
        return Response(
            {"error": "Student ID and certificate file are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not _is_allowed_file(certificate_file.name):
        return Response(
            {"error": "Only PDF, JPG, JPEG, and PNG files are allowed"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

    certificate, verification_url = _create_certificate(student, certificate_file)

    return Response({
        "message": "Certificate uploaded successfully",
        "certificate": _absolute_media_url(request, certificate.certificate_file),
        "download_url": _download_url(request, certificate.student.student_id),
        "qr": _absolute_media_url(request, certificate.qr_code),
        "verification_url": verification_url,
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@admin_required
def bulk_upload_certificates(request):
    uploaded_files = list(request.FILES.getlist("certificate_files"))
    zip_file = request.FILES.get("zip_file")

    if not uploaded_files and not zip_file:
        return Response(
            {"error": "Upload certificate files or a ZIP file"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created = []
    skipped = []

    def process_file(file_name, file_content):
        if not _is_allowed_file(file_name):
            skipped.append({"file": file_name, "reason": "Unsupported file type"})
            return

        student_id = _student_id_from_filename(file_name)
        if not student_id:
            skipped.append({"file": file_name, "reason": "No student ID found in filename"})
            return

        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            skipped.append({"file": file_name, "reason": f"{student_id} not found"})
            return

        certificate, verification_url = _create_certificate(
            student,
            file_content,
            os.path.basename(file_name),
        )
        created.append({
            "student_id": student.student_id,
            "student_name": student.name,
            "file": os.path.basename(file_name),
            "certificate": _absolute_media_url(request, certificate.certificate_file),
            "download_url": _download_url(request, certificate.student.student_id),
            "qr": _absolute_media_url(request, certificate.qr_code),
            "verification_url": _verification_url(certificate.student.student_id),
        })

    for uploaded_file in uploaded_files:
        process_file(uploaded_file.name, uploaded_file)

    if zip_file:
        try:
            with zipfile.ZipFile(zip_file) as archive:
                for entry in archive.infolist():
                    if entry.is_dir():
                        continue
                    with archive.open(entry) as source:
                        content = ContentFile(source.read(), name=os.path.basename(entry.filename))
                        process_file(entry.filename, content)
        except zipfile.BadZipFile:
            return Response({"error": "Invalid ZIP file"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": "Bulk certificate upload completed",
        "created_count": len(created),
        "skipped_count": len(skipped),
        "created": created,
        "skipped": skipped,
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@admin_required
def generate_certificates_from_template(request):
    template_file = request.FILES.get("template_file")
    if not template_file:
        return Response({"error": "Upload a blank certificate template"}, status=status.HTTP_400_BAD_REQUEST)

    if not template_file.name.lower().endswith((".jpg", ".jpeg", ".png")):
        return Response(
            {"error": "Template must be a JPG or PNG image"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    issue_date = request.data.get("issue_date") or timezone.localdate().isoformat()
    student_ids = [value.strip() for value in request.data.getlist("student_ids") if value.strip()]
    students = Student.objects.select_related("course").order_by("student_id")
    if student_ids:
        students = students.filter(student_id__in=student_ids)

    if not students.exists():
        return Response({"error": "No students found to generate certificates for"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        created, skipped = generate_for_students(template_file, issue_date, students, request)
    except Exception as exc:
        return Response(
            {"error": f"Certificate generation failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        "message": "Template certificates generated",
        "created_count": len(created),
        "skipped_count": len(skipped),
        "created": created,
        "skipped": skipped,
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@admin_required
def create_generation_job(request):
    template_file = request.FILES.get("template_file")
    if not template_file:
        return Response({"error": "Upload a blank certificate template"}, status=status.HTTP_400_BAD_REQUEST)

    if not template_file.name.lower().endswith((".jpg", ".jpeg", ".png")):
        return Response(
            {"error": "Template must be a JPG or PNG image"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    issue_date = request.data.get("issue_date") or timezone.localdate().isoformat()
    student_ids = [value.strip() for value in request.data.getlist("student_ids") if value.strip()]
    if not student_ids:
        student_ids = list(
            Student.objects.order_by("student_id").values_list("student_id", flat=True)
        )

    if not student_ids:
        return Response({"error": "No students found to generate certificates for"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        job = CertificateGenerationJob.objects.create(
            template_file=template_file,
            issue_date=issue_date,
            student_ids=student_ids,
        )
    except Exception as exc:
        return Response(
            {
                "error": (
                    "Failed to start certificate generation job. "
                    "Redeploy the Render backend so database migrations can run."
                ),
                "detail": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        serialize_generation_job(job, request),
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@admin_required
def poll_generation_job(request, job_id):
    try:
        job = CertificateGenerationJob.objects.get(pk=job_id)
    except CertificateGenerationJob.DoesNotExist:
        return Response({"error": "Generation job not found"}, status=status.HTTP_404_NOT_FOUND)

    recent_created = []
    recent_skipped = []
    try:
        if job.status in {
            CertificateGenerationJob.STATUS_PENDING,
            CertificateGenerationJob.STATUS_PROCESSING,
        }:
            recent_created, recent_skipped = process_generation_job_batch(job, request)
        job.refresh_from_db()
    except Exception as exc:
        return Response(
            {
                "error": "Certificate generation failed while processing a batch.",
                "detail": str(exc),
                "job_id": str(job.id),
                "status": CertificateGenerationJob.STATUS_FAILED,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(serialize_generation_job(job, request, recent_created, recent_skipped))


@api_view(["POST"])
@admin_required
def cancel_generation_job(request, job_id):
    try:
        job = CertificateGenerationJob.objects.get(pk=job_id)
    except CertificateGenerationJob.DoesNotExist:
        return Response({"error": "Generation job not found"}, status=status.HTTP_404_NOT_FOUND)

    if job.status in {
        CertificateGenerationJob.STATUS_COMPLETED,
        CertificateGenerationJob.STATUS_FAILED,
        CertificateGenerationJob.STATUS_CANCELLED,
    }:
        return Response(serialize_generation_job(job, request))

    job.status = CertificateGenerationJob.STATUS_CANCELLED
    job.completed_at = timezone.now()
    job.save(update_fields=["status", "completed_at", "updated_at"])
    return Response(serialize_generation_job(job, request))


@api_view(["GET"])
def view_certificate(request, student_id):
    # Check access control: admin can view any, students can only view their own
    if not is_admin(request):
        session_student_id = request.session.get("student_id")
        if not is_student(request) or session_student_id != student_id:
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

    certificate = _latest_certificate(student_id)
    if not certificate:
        return Response({
            "status": "PENDING",
            "message": "Certificate not uploaded yet",
        }, status=status.HTTP_404_NOT_FOUND)

    return Response({
        **_certificate_response(request, certificate),
        "created_at": certificate.created_at,
        "history": CertificateSerializer(
            Certificate.objects.filter(student=certificate.student).order_by("-created_at"),
            many=True,
            context={"request": request},
        ).data,
    })


@api_view(["GET"])
def verify_certificate(request, student_id):
    certificate = _latest_certificate(student_id)
    if not certificate:
        return Response({
            "valid": False,
            "status": "INVALID",
            "student_id": student_id,
            "message": "Certificate not found",
        }, status=status.HTTP_404_NOT_FOUND)

    return Response({
        **_certificate_response(request, certificate),
    })


@api_view(["GET"])
def download_certificate(request, student_id):
    certificate = _latest_certificate(student_id)
    if not certificate:
        return Response({"error": "Certificate not found"}, status=status.HTTP_404_NOT_FOUND)

    if not certificate.certificate_file:
        return Response({"error": "Certificate file is missing"}, status=status.HTTP_404_NOT_FOUND)

    try:
        if not _file_available(certificate.certificate_file):
            return Response(
                {"error": "Certificate file is no longer available. Please regenerate or upload it again."},
                status=status.HTTP_404_NOT_FOUND,
            )
        file_handle = certificate.certificate_file.open("rb")
    except (FileNotFoundError, OSError, ValueError):
        return Response(
            {"error": "Certificate file is no longer available. Please regenerate or upload it again."},
            status=status.HTTP_404_NOT_FOUND,
        )

    file_name = os.path.basename(certificate.certificate_file.name)
    return FileResponse(file_handle, as_attachment=True, filename=file_name)
