from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("certificates", "0002_certificate_history"),
    ]

    operations = [
        migrations.AlterField(
            model_name="certificate",
            name="qr_code",
            field=models.FileField(blank=True, null=True, upload_to="qrcodes/"),
        ),
    ]
