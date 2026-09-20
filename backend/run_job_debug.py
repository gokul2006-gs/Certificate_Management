import os
import sys
import traceback
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
sys.path.insert(0, '.')
import django
django.setup()
from certificates.models import CertificateGenerationJob
from certificates.services import process_generation_job_batch

job_id = '7c04c71b-eecf-4882-a1c6-93461232317c'
try:
    job = CertificateGenerationJob.objects.get(pk=job_id)
except CertificateGenerationJob.DoesNotExist:
    print('Job not found:', job_id)
    sys.exit(1)

try:
    recent_created, recent_skipped = process_generation_job_batch(job, None)
    print('recent_created:', recent_created)
    print('recent_skipped:', recent_skipped)
except Exception:
    traceback.print_exc()
