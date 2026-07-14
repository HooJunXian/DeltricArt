# Generated manually to fold failed order status into cancelled.

from django.db import migrations, models


def forwards(apps, schema_editor):
    Order = apps.get_model("api", "Order")
    Order.objects.filter(status="FL").update(status="CN")


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_alter_order_status"),
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
                    ("CN", "Cancelled"),
                ],
                default="PN",
                max_length=2,
            ),
        ),
    ]
