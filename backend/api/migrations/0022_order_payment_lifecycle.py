from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_remove_order_failed_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="expires_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="stock_released_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="stock_reserved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("PN", "Pending payment"),
                    ("SC", "Paid"),
                    ("FL", "Failed"),
                    ("EX", "Expired"),
                    ("CN", "Cancelled"),
                ],
                default="PN",
                max_length=2,
            ),
        ),
    ]
