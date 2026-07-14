from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0022_order_payment_lifecycle"),
    ]

    operations = [
        migrations.CreateModel(
            name="PaymentGatewayEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(default="billplz", max_length=20)),
                ("event_type", models.CharField(choices=[("webhook", "Webhook"), ("browser_return", "Browser return")], max_length=20)),
                ("gateway_reference", models.CharField(blank=True, db_index=True, max_length=64)),
                ("signature_valid", models.BooleanField(blank=True, null=True)),
                ("processed", models.BooleanField(default=False)),
                ("processing_result", models.CharField(blank=True, max_length=64)),
                ("payload", models.JSONField(default=dict)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="gateway_events", to="api.payment")),
            ],
            options={
                "db_table": "payment_gateway_events",
                "ordering": ["-received_at", "-id"],
            },
        ),
    ]
