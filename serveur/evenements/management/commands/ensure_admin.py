import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Initialise temporairement le compte administrateur."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_ADMIN_USERNAME")
        password = os.environ.get("DJANGO_ADMIN_PASSWORD")
        email = os.environ.get("DJANGO_ADMIN_EMAIL", "")

        if not username or not password:
            raise CommandError(
                "Les variables DJANGO_ADMIN_USERNAME et "
                "DJANGO_ADMIN_PASSWORD doivent être configurées."
            )

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )

        user.is_active = True
        user.is_staff = True
        user.is_superuser = True

        if email:
            user.email = email

        user.set_password(password)
        user.save()

        action = "créé" if created else "mis à jour"
        self.stdout.write(
            self.style.SUCCESS(
                f"Compte administrateur {action} avec succès."
            )
        )