from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0023_paymentgatewayevent"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="PaymentGatewayEvent",
            new_name="BillplzEvent",
        ),
        migrations.AlterModelTable(
            name="billplzevent",
            table="billplz_events",
        ),
    ]
