from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Creates or promotes a user to ADMIN role"

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, default='09357486007', help='Admin phone number')
        parser.add_argument('--password', type=str, default='Shagraph82', help='Admin password')
        parser.add_argument('--name', type=str, default='شایان جعفری', help='Admin full name')

    def handle(self, *args, **options):
        phone = options['phone']
        password = options['password']
        name = options['name']

        user, created = User.objects.get_or_create(phone_number=phone)
        user.full_name = name
        user.role = 'ADMIN'
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Promoted"
        self.stdout.write(self.style.SUCCESS(f"[OK] {action} admin user ({phone}) with password '{password}'."))

