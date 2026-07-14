# Generated manually for order status code migration.

from django.db import migrations, models


OLD_TO_NEW_STATUS = {
    "pending_payment": "PN",
    "paid": "SC",
    "payment_failed": "FL",
    "cancelled": "CN",
}

NEW_TO_OLD_STATUS = {value: key for key, value in OLD_TO_NEW_STATUS.items()}


def forwards(apps, schema_editor):
    Order = apps.get_model("api", "Order")
    for old_status, new_status in OLD_TO_NEW_STATUS.items():
        Order.objects.filter(status=old_status).update(status=new_status)


def backwards(apps, schema_editor):
    Order = apps.get_model("api", "Order")
    for new_status, old_status in NEW_TO_OLD_STATUS.items():
        Order.objects.filter(status=new_status).update(status=old_status)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_alter_payment_provider"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("PN", "Pending payment"),
                    ("SC", "Success"),
                    ("FL", "Failed"),
                    ("CN", "Cancelled"),
                ],
                default="PN",
                max_length=2,
            ),
        ),
    ]
