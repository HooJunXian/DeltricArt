from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


def populate_conversation_expiry(apps, schema_editor):
    ChatbotConversation = apps.get_model("api", "ChatbotConversation")
    now = timezone.now()
    for conversation in ChatbotConversation.objects.all().iterator():
        expires_at = conversation.updated_at + timedelta(hours=1)
        status = "expired" if expires_at <= now else "active"
        ChatbotConversation.objects.filter(pk=conversation.pk).update(
            status=status,
            expires_at=expires_at,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_productembedding"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatbotconversation",
            name="expires_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="chatbotconversation",
            name="status",
            field=models.CharField(
                choices=[("active", "Active"), ("expired", "Expired")],
                db_index=True,
                default="active",
                max_length=16,
            ),
        ),
        migrations.RunPython(populate_conversation_expiry, migrations.RunPython.noop),
    ]
