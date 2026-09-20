#!/usr/bin/env bash
set -euo pipefail

pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create MongoDB indexes
python manage.py create_mongodb_indexes

# Ensure admin user exists
python manage.py ensure_admin

# Collect static files
python manage.py collectstatic --noinput