from django.core.management.base import BaseCommand

from api.payment_lifecycle import expire_pending_orders


class Command(BaseCommand):
    help = "Expire pending-payment orders whose payment TTL has elapsed."

    def handle(self, *args, **options):
        count = expire_pending_orders()
        self.stdout.write(self.style.SUCCESS(f"Expired {count} pending order(s)."))
