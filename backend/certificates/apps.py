from django.apps import AppConfig


class CertificatesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "certificates"

    def ready(self):
        from django.conf import settings

        for folder in ("certificate_templates", "certificates", "qrcodes"):
            (settings.MEDIA_ROOT / folder).mkdir(parents=True, exist_ok=True)
