from django.conf import settings
from django.core.management.base import BaseCommand

from certificates.models import Certificate
from certificates.views import _generate_qr


class Command(BaseCommand):
    help = "Regenerate certificate QR codes using the current FRONTEND_BASE_URL."

    def handle(self, *args, **options):
        certificates = Certificate.objects.select_related("student").order_by("id")
        if not certificates.exists():
            self.stdout.write("No certificates found.")
            return

        self.stdout.write(f"Using FRONTEND_BASE_URL: {settings.FRONTEND_BASE_URL}")

        for certificate in certificates:
            verification_url = _generate_qr(certificate)
            self.stdout.write(
                f"Updated {certificate.student.student_id}: {verification_url}"
            )

        self.stdout.write(self.style.SUCCESS(f"Regenerated {certificates.count()} QR code(s)."))
