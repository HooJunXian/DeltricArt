from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_load_malaysia_postcodes"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="cLogo",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
