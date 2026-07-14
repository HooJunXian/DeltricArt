from django.db import migrations


def seed_countries(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    countries = [
        ("Malaysia", "MY"),
        ("Singapore", "SG"),
        ("United States", "US"),
    ]

    for name, code in countries:
        Country.objects.update_or_create(
            code=code,
            defaults={"name": name, "is_show": True},
        )


def remove_seeded_countries(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    Country.objects.filter(code__in=["MY", "SG", "US"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_alter_user_email"),
    ]

    operations = [
        migrations.RunPython(seed_countries, remove_seeded_countries),
    ]
