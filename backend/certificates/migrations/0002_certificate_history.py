import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("certificates", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="certificate",
            name="student",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="certificates",
                to="accounts.student",
            ),
        ),
    ]
