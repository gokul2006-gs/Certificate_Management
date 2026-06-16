import os
import re
import zipfile
import qrcode
import functools
import logging

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
logger = logging.getLogger(__name__)


def _absolute_media_url(request, file_field):
    if not file_field:
        return None
    # Some callers (management scripts or background workers) may pass None
    # for `request`. Fall back to configured FRONTEND_BASE_URL when that
    # happens or if `build_absolute_uri` is unavailable.
    try:
        if request is None:
            base = settings.FRONTEND_BASE_URL.rstrip("/")
            return f"{base}{file_field.url}"
        return request.build_absolute_uri(file_field.url)
    except Exception:
        base = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
        return f"{base}{file_field.url}"


def _verification_url(student_id):
    return f"{settings.FRONTEND_BASE_URL}/verify/{student_id}"


def _latest_certificate(student_id):
    # Use exact case-sensitive lookup on student_id using the index
    student_id = student_id.strip().upper()
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return None

    certificate = (
        Certificate.objects.filter(student=student)
        .order_by("-created_at")
        .first()
    )
    if certificate:
        certificate.student = student
        if not certificate.qr_code:
            try:
                _generate_qr(certificate)
            except Exception:
                pass
    return certificate


def _is_allowed_file(file_name):
    return os.path.splitext(file_name.lower())[1] in ALLOWED_EXTENSIONS


def _student_id_from_filename(file_name):
    match = STUDENT_ID_PATTERN.search(os.path.basename(file_name))
    return match.group(0).upper() if match else None


def _generate_qr(certificate, save=True):
    verification_url = _verification_url(certificate.student.student_id)
    qr = qrcode.make(verification_url)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)
    certificate.qr_code.save(
        f"{certificate.student.student_id}-{certificate.id}.png",
        File(buffer),
        save=save,
    )
    return verification_url


def _create_certificate(student, certificate_file, file_name=None, course_name=""):
    certificate = Certificate(student=student, course_name=course_name or "")
    safe_name = (file_name or certificate_file.name).replace("\\", "/")
    certificate.certificate_file.save(
        safe_name,
        certificate_file,
        save=True,
    )
    verification_url = _generate_qr(certificate, save=False)
    certificate.save()
    return certificate, verification_url


_WORKING_FONT_PATH = {True: None, False: None}

# Font style caches
_SCRIPT_FONT_PATH = None
_SERIF_FONT_PATH = None
_SERIF_BOLD_FONT_PATH = None


def _resolve_font(candidates):
    """Try each path and return the first that loads."""
    from PIL import ImageFont
    for path in candidates:
        try:
            ImageFont.truetype(path, 12)
            return path
        except OSError:
            continue
    return None


@functools.lru_cache(maxsize=512)
def _load_script_font(size):
    """Script/cursive font - uses Great Vibes or Monotype Corsiva for elegant certificate style."""
    global _SCRIPT_FONT_PATH
    from PIL import ImageFont
    if _SCRIPT_FONT_PATH is None:
        _SCRIPT_FONT_PATH = _resolve_font([
            # Great Vibes from backend folder (local copy)
            os.path.join(settings.BASE_DIR, "Great_Vibes", "GreatVibes-Regular.ttf"),
            os.path.join(settings.BASE_DIR, "GreatVibes-Regular.ttf"),
            # Great Vibes from Windows system
            "C:/Windows/Fonts/GreatVibes-Regular.ttf",
            "C:/Windows/Fonts/GreatVibes.ttf",
            "C:/Windows/Fonts/Great Vibes.ttf",
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft\\Windows\\Fonts\\GreatVibes-Regular.ttf'),
            # Monotype Corsiva as fallback
            "C:/Windows/Fonts/MTCORSVA.TTF",
        ])
    if _SCRIPT_FONT_PATH:
        try:
            return ImageFont.truetype(_SCRIPT_FONT_PATH, size)
        except OSError:
            _SCRIPT_FONT_PATH = None
    return ImageFont.load_default()


@functools.lru_cache(maxsize=512)
def _load_serif_font(size, bold=False):
    """Serif font for body text on the certificate."""
    global _SERIF_FONT_PATH, _SERIF_BOLD_FONT_PATH
    from PIL import ImageFont
    cache_attr = "_SERIF_BOLD_FONT_PATH" if bold else "_SERIF_FONT_PATH"
    cached = _SERIF_BOLD_FONT_PATH if bold else _SERIF_FONT_PATH
    if cached is None:
        candidates = (
            [
                "C:/Windows/Fonts/timesbd.ttf",
                "C:/Windows/Fonts/GARA.TTF",
                "C:/Windows/Fonts/GARABD.TTF",
                "C:/Windows/Fonts/georgia.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            ]
            if bold else
            [
                "C:/Windows/Fonts/times.ttf",
                "C:/Windows/Fonts/GARA.TTF",
                "C:/Windows/Fonts/georgia.ttf",
                "C:/Windows/Fonts/BKANT.TTF",
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            ]
        )
        resolved = _resolve_font(candidates)
        if bold:
            _SERIF_BOLD_FONT_PATH = resolved
            cached = resolved
        else:
            _SERIF_FONT_PATH = resolved
            cached = resolved
    if cached:
        try:
            return ImageFont.truetype(cached, size)
        except OSError:
            pass
    return ImageFont.load_default()


@functools.lru_cache(maxsize=256)
def _load_font(size, bold=False):
    return _load_serif_font(size, bold=bold)


def _draw_centered(draw, text, y, font, image_width, color):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    x = (image_width - (right - left)) / 2
    draw.text((x, y), text, font=font, fill=color)


def _fit_font(text, max_width, start_size, min_size=16, bold=False, font_loader=None):
    if font_loader is None:
        font_loader = lambda s: _load_font(s, bold=bold)
    max_k = (start_size - min_size) // 2
    if max_k < 0:
        return font_loader(min_size)
    low, high, best_k = 0, max_k, None
    while low <= high:
        mid = (low + high) // 2
        size = start_size - 2 * mid
        font = font_loader(size)
        left, top, right, bottom = font.getbbox(text)
        if right - left <= max_width:
            best_k = mid
            high = mid - 1
        else:
            low = mid + 1
    if best_k is None:
        return font_loader(min_size)
    return font_loader(start_size - 2 * best_k)


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


def _draw_box_centered(draw, text, box, start_size, color, bold=False, min_size=16, font_loader=None):
    if font_loader is None:
        font_loader = lambda s: _load_font(s, bold=bold)
    left, top, right, bottom = box
    text = str(text or "").strip()
    font = _fit_font(text, right - left, start_size, min_size=min_size, font_loader=font_loader)
    lines = _wrap_text(text, font, right - left, draw)
    line_spacing = max(2, int(font.size * 0.15)) if hasattr(font, "size") else 4

    def measured_total_height(lines_list, font_obj, spacing):
        height = 0
        for line in lines_list:
            _, line_top, _, line_bottom = draw.textbbox((0, 0), line, font=font_obj)
            height += line_bottom - line_top
        height += spacing * (len(lines_list) - 1)
        return height

    total_height = measured_total_height(lines, font, line_spacing)

    # Optimize height fitting using binary search
    current_size = font.size
    max_k = (current_size - min_size) // 2
    if total_height > (bottom - top) and max_k > 0:
        low = 0
        high = max_k
        best_k = None

        while low <= high:
            mid = (low + high) // 2
            size = current_size - 2 * mid
            test_font = font_loader(size)
            test_lines = _wrap_text(text, test_font, right - left, draw)
            test_spacing = max(2, int(test_font.size * 0.15))
            test_height = measured_total_height(test_lines, test_font, test_spacing)

            if test_height <= (bottom - top):
                best_k = mid
                high = mid - 1
            else:
                low = mid + 1

        if best_k is not None:
            font = font_loader(current_size - 2 * best_k)
            lines = _wrap_text(text, font, right - left, draw)
            line_spacing = max(2, int(font.size * 0.15))
            total_height = measured_total_height(lines, font, line_spacing)
        else:
            font = font_loader(min_size)
            lines = _wrap_text(text, font, right - left, draw)
            line_spacing = max(2, int(font.size * 0.15))
            total_height = measured_total_height(lines, font, line_spacing)

    y = top + ((bottom - top) - total_height) / 2
    for line in lines:
        line_left, line_top, line_right, line_bottom = draw.textbbox((0, 0), line, font=font)
        line_width = line_right - line_left
        line_height = line_bottom - line_top
        x = left + ((right - left) - line_width) / 2
        draw.text((x, y - line_top), line, font=font, fill=color)
        y += line_height + line_spacing


def _draw_centered_single_line(
    draw,
    text,
    box,
    start_size,
    color,
    bold=False,
    min_size=16,
    font_loader=None,
    stroke_width=0,
    stroke_fill=None,
    shadow_offset=None,
    shadow_fill=None,
):
    if font_loader is None:
        font_loader = lambda s: _load_font(s, bold=bold)
    left, top, right, bottom = box
    text = str(text or "").strip()
    font = _fit_font(text, right - left, start_size, min_size=min_size, font_loader=font_loader)
    text_left, text_top, text_right, text_bottom = draw.textbbox((0, 0), text, font=font)
    text_width = text_right - text_left
    text_height = text_bottom - text_top
    x = left + ((right - left) - text_width) / 2 - text_left
    y = top + ((bottom - top) - text_height) / 2 - text_top
    if shadow_offset and shadow_fill:
        shadow_x = x + shadow_offset[0]
        shadow_y = y + shadow_offset[1]
        draw.text(
            (shadow_x, shadow_y),
            text,
            font=font,
            fill=shadow_fill,
            stroke_width=stroke_width,
            stroke_fill=shadow_fill,
        )
    draw.text(
        (x, y),
        text,
        font=font,
        fill=color,
        stroke_width=stroke_width,
        stroke_fill=stroke_fill or color,
    )


def _resolve_field_box(field, width, height):
    if not field:
        return None

    def to_pixel(value, dimension):
        if value is None:
            return 0
        value = float(value)
        if 0 <= value <= 1:
            return int(value * dimension)
        return int((value / 100.0) * dimension)

    return (
        to_pixel(field.get("x1"), width),
        to_pixel(field.get("y1"), height),
        to_pixel(field.get("x2"), width),
        to_pixel(field.get("y2"), height),
    )


def _format_certificate_date(value):
    from datetime import datetime

    def ordinal(day):
        if 10 <= day % 100 <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return f"{day}{suffix}"

    def format_one(part):
        part = str(part or "").strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                parsed = datetime.strptime(part, fmt)
                return f"{ordinal(parsed.day)} {parsed.strftime('%B')} {parsed.year}"
            except ValueError:
                continue
        return part

    text = str(value or "").strip()
    if " to " in text:
        start, end = text.split(" to ", 1)
        return f"{format_one(start)} to {format_one(end)}"
    return format_one(text)


def _format_certificate_person_name(value):
    text = str(value or "").strip()
    return re.sub(
        r"[A-Za-z]+",
        lambda match: match.group(0)[:1].upper() + match.group(0)[1:].lower(),
        text,
    )


def _generated_certificate_file(student, template_file, issue_date, fields=None, course_name=None):
    from PIL import Image, ImageDraw

    if isinstance(template_file, Image.Image):
        template = template_file
    else:
        template = Image.open(template_file).convert("RGB")
    width, height = template.size
    draw = ImageDraw.Draw(template)
    verification_url = _verification_url(student.student_id)

    # Clean teal text color and vibrant orange/gold accent color matching the TS3 demo certificate
    text_color = (11, 52, 57)
    name_color = (11, 52, 57)
    name_shadow_color = (247, 247, 247)
    muted_color = (61, 75, 99)
    accent_color = (243, 123, 21)

    def box(fx1, fy1, fx2, fy2):
        return (int(width * fx1), int(height * fy1), int(width * fx2), int(height * fy2))

    def _field(key):
        if not fields or key not in fields:
            return None
        return _resolve_field_box(fields[key], width, height)

    # course_name is passed explicitly at generation time by the admin
    display_course = course_name or ""

    # SIGNIFICANTLY LOWER positioning to avoid all overlaps:
    # Name: Well BELOW "PROUDLY PRESENTED TO" banner (~35-41% of height)
    name_box = _field("name") or box(0.220, 0.350, 0.780, 0.415)
    
    # Course: Well BELOW orange bar, plenty of clearance (~49-55% of height)
    course_box = _field("course") or box(0.200, 0.490, 0.800, 0.550)
    
    # Date: Well BELOW "Her performance..." text (~57-60% of height)
    date_box = _field("issue_date") or box(0.300, 0.570, 0.700, 0.600)

    # --- Student Name (elegant script, clear space below banner) ---
    _draw_centered_single_line(
        draw, _format_certificate_person_name(student.name),
        name_box,
        max(72, int(width * 0.070)), text_color,
        font_loader=_load_script_font,
        min_size=max(36, int(width * 0.034)),
        stroke_width=0,
    )

    # --- Course Name (elegant script, clear space below orange bar) ---
    _draw_centered_single_line(
        draw, display_course,
        course_box,
        max(64, int(width * 0.062)), text_color,
        font_loader=_load_script_font,
        min_size=max(32, int(width * 0.030)),
        stroke_width=0,
    )

    # --- Date (orange script with professional formatting) ---
    # Format: (19th May 2025 to 04th June 2025)
    date_text = f"({_format_certificate_date(issue_date)})"
    _draw_centered_single_line(
        draw, date_text,
        date_box,
        max(28, int(width * 0.031)), accent_color,
        font_loader=_load_serif_font,
        min_size=max(14, int(width * 0.015)),
        stroke_width=0,
    )

    # Note: Student ID and duration fields removed as per requirement
    # Certificate now only displays: Student Name, Course Title, and Issue Date
    # All three fields use the same script font and size for consistency

    # --- QR code ---
    if fields and "qr" in fields:
        f = fields["qr"]
        qr_x = int(width * f["x1"] / 100)
        qr_y = int(height * f["y1"] / 100)
        qr_size = int(width * (f["x2"] - f["x1"]) / 100)
    else:
        qr_size = max(115, int(min(width, height) * 0.12))
        qr_x = width - qr_size - int(width * 0.055)
        qr_y = height - qr_size - int(height * 0.055)

    qr_image = qrcode.make(verification_url).convert("RGB")
    qr_image = qr_image.resize((qr_size, qr_size))
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
    try:
        if request is None:
            base = settings.FRONTEND_BASE_URL.rstrip("/")
            return f"{base}{reverse('certificate-download', kwargs={'student_id': student_id})}"
        return request.build_absolute_uri(
            reverse("certificate-download", kwargs={"student_id": student_id})
        )
    except Exception:
        base = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
        return f"{base}{reverse('certificate-download', kwargs={'student_id': student_id})}"


def _file_available(file_field):
    return bool(file_field and file_field.name)


def _certificate_response(request, certificate):
    certificate_available = _file_available(certificate.certificate_file)
    return {
        "valid": True,
        "status": "VALID",
        "student_id": certificate.student.student_id,
        "student_name": certificate.student.name,
        "course_name": certificate.course_name or "",
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
            {"error": "Student ID and template file are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not certificate_file.name.lower().endswith((".jpg", ".jpeg", ".png")):
        return Response(
            {"error": "Template must be a JPG or PNG image"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get start_date and end_date from request
    start_date = request.data.get("start_date", "").strip()
    end_date = request.data.get("end_date", "").strip()
    
    # Format issue_date as a date range if both dates provided
    if start_date and end_date:
        issue_date = f"{start_date} to {end_date}"
    elif start_date:
        issue_date = start_date
    else:
        issue_date = request.data.get("issue_date") or timezone.localdate().isoformat()
    
    course_name = request.data.get("course_name", "").strip()

    import json
    fields_raw = request.data.get("fields")
    fields = None
    if fields_raw:
        try:
            fields = json.loads(fields_raw)
        except (ValueError, TypeError):
            fields = None

    try:
        generated_file = _generated_certificate_file(
            student, certificate_file, issue_date, fields=fields, course_name=course_name
        )
        certificate, verification_url = _create_certificate(
            student,
            generated_file,
            generated_file.name,
            course_name=course_name,
        )
    except Exception as exc:
        return Response(
            {"error": f"Failed to generate certificate from template: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        "message": "Certificate generated successfully from template",
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

    # Pre-scan files and zip archive to collect student IDs for a single bulk query
    student_ids_to_query = set()
    for uploaded_file in uploaded_files:
        student_id = _student_id_from_filename(uploaded_file.name)
        if student_id:
            student_ids_to_query.add(student_id)

    archive = None
    if zip_file:
        try:
            archive = zipfile.ZipFile(zip_file)
            for entry in archive.infolist():
                if entry.is_dir():
                    continue
                student_id = _student_id_from_filename(entry.filename)
                if student_id:
                    student_ids_to_query.add(student_id)
        except zipfile.BadZipFile:
            return Response({"error": "Invalid ZIP file"}, status=status.HTTP_400_BAD_REQUEST)

    # Perform a single bulk query to fetch all matching student records
    student_map = {}
    if student_ids_to_query:
        students = Student.objects.filter(student_id__in=list(student_ids_to_query))
        student_map = {student.student_id: student for student in students}

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

        student = student_map.get(student_id)
        if not student:
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

    if archive:
        try:
            for entry in archive.infolist():
                if entry.is_dir():
                    continue
                with archive.open(entry) as source:
                    content = ContentFile(source.read(), name=os.path.basename(entry.filename))
                    process_file(entry.filename, content)
        finally:
            archive.close()

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
    students = Student.objects.order_by("student_id")
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

    # Get start_date and end_date from request
    start_date = request.data.get("start_date", "").strip()
    end_date = request.data.get("end_date", "").strip()
    
    # Format issue_date as a date range if both dates provided
    if start_date and end_date:
        issue_date = f"{start_date} to {end_date}"
    elif start_date:
        issue_date = start_date
    else:
        issue_date = request.data.get("issue_date") or timezone.localdate().isoformat()

    # All students — course is chosen at generation time, not stored on student
    student_ids_input = [v.strip() for v in request.data.getlist("student_ids") if v.strip()]
    if student_ids_input:
        student_ids = student_ids_input
    else:
        student_ids = list(Student.objects.order_by("student_id").values_list("student_id", flat=True))

    if not student_ids:
        return Response({"error": "No students registered yet."}, status=status.HTTP_400_BAD_REQUEST)

    import json
    fields_raw = request.data.get("fields")
    fields = None
    if fields_raw:
        try:
            fields = json.loads(fields_raw)
        except (ValueError, TypeError):
            fields = None

    # course_name to print on the certificate — required
    course_name = request.data.get("course_name", "").strip()

    try:
        job = CertificateGenerationJob.objects.create(
            template_file=template_file,
            issue_date=issue_date,
            start_date=start_date,
            end_date=end_date,
            student_ids=student_ids,
            fields=fields or {},
            course_name=course_name,
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
    except Exception as exc:
        logger.exception("Failed to load certificate generation job %s", job_id)
        return Response(
            {
                "job_id": str(job_id),
                "status": CertificateGenerationJob.STATUS_FAILED,
                "total_count": 0,
                "processed_count": 0,
                "created_count": 0,
                "skipped_count": 0,
                "progress_percent": 0,
                "error_message": f"Failed to load generation job: {exc}",
                "recent_created": [],
                "recent_skipped": [],
                "skipped": [],
            },
            status=status.HTTP_200_OK,
        )

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
        logger.exception("Certificate generation job poll failed for %s", job_id)
        job.status = CertificateGenerationJob.STATUS_FAILED
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        try:
            job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        except Exception:
            logger.exception("Failed to persist failed status for certificate generation job %s", job_id)
        try:
            payload = serialize_generation_job(job, request, recent_created, recent_skipped)
        except Exception:
            logger.exception("Failed to serialize failed certificate generation job %s", job_id)
            payload = {
                "job_id": str(job.id),
                "status": CertificateGenerationJob.STATUS_FAILED,
                "total_count": len(job.student_ids or []),
                "processed_count": job.processed_count,
                "created_count": job.created_count,
                "skipped_count": job.skipped_count,
                "progress_percent": job.progress_percent,
                "error_message": str(exc),
                "recent_created": recent_created,
                "recent_skipped": recent_skipped,
                "skipped": [],
            }
        return Response(
            payload,
            status=status.HTTP_200_OK,
        )

    try:
        return Response(serialize_generation_job(job, request, recent_created, recent_skipped))
    except Exception as exc:
        logger.exception("Failed to serialize certificate generation job %s", job_id)
        return Response(
            {
                "job_id": str(job.id),
                "status": CertificateGenerationJob.STATUS_FAILED,
                "total_count": len(job.student_ids or []),
                "processed_count": job.processed_count,
                "created_count": job.created_count,
                "skipped_count": job.skipped_count,
                "progress_percent": job.progress_percent,
                "error_message": f"Failed to report generation job status: {exc}",
                "recent_created": recent_created,
                "recent_skipped": recent_skipped,
                "skipped": [],
            },
            status=status.HTTP_200_OK,
        )


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
    # Normalize student_id
    student_id = student_id.strip()
    
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
            Certificate.objects.filter(student=certificate.student).select_related("student").order_by("-created_at"),
            many=True,
            context={"request": request},
        ).data,
    })


@api_view(["GET"])
def verify_certificate(request, student_id):
    # Normalize student_id: strip whitespace and handle URL encoding
    student_id = student_id.strip()
    
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
    # Normalize student_id
    student_id = student_id.strip()
    
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


@api_view(["GET"])
@admin_required
def download_all_certificates_zip(request):
    """Download all certificates as a ZIP file"""
    # Get all certificates with available files
    certificates = Certificate.objects.select_related("student").all()
    
    if not certificates.exists():
        return Response(
            {"error": "No certificates found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create ZIP file in memory
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        added_count = 0
        
        for cert in certificates:
            if cert.certificate_file and _file_available(cert.certificate_file):
                try:
                    # Read certificate file
                    cert.certificate_file.open('rb')
                    file_data = cert.certificate_file.read()
                    cert.certificate_file.close()
                    
                    # Create filename: StudentID-StudentName-certificate.png
                    safe_name = cert.student.name.replace(' ', '_').replace('/', '_')
                    filename = f"{cert.student.student_id}-{safe_name}-certificate.png"
                    
                    # Add to ZIP
                    zip_file.writestr(filename, file_data)
                    added_count += 1
                    
                except Exception as e:
                    # Skip files that can't be read
                    continue
        
        if added_count == 0:
            return Response(
                {"error": "No certificate files available to download"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Prepare response
    zip_buffer.seek(0)
    response = FileResponse(
        zip_buffer,
        as_attachment=True,
        filename=f"all_certificates_{timezone.now().strftime('%Y%m%d_%H%M%S')}.zip"
    )
    response['Content-Type'] = 'application/zip'
    
    return response
