#!/usr/bin/env bash
set -o errexit

python -m pip install -r requirements.txt

cd serveur

python manage.py collectstatic --no-input
python manage.py migrate

python manage.py loaddata donnees_initiales.json