import uuid
from django.db import models
from django.conf import settings
from recommendation.models import Recommendation
from orders.models import Order

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_sessions', verbose_name="کاربر")
    title = models.CharField(max_length=255, default="گفتگو با دستیار هوشمند بیمه", verbose_name="عنوان گفتگو")
    insurance_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="نوع بیمه مورد نیاز")
    collected_data = models.JSONField(default=dict, verbose_name="اطلاعات جمع‌آوری شده")
    is_completed = models.BooleanField(default=False, verbose_name="تکمیل گفتگو و صدور سفارش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "نشست گفتگو"
        verbose_name_plural = "نشست‌های گفتگو"
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({str(self.id)[:8]})"

class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ('user', 'کاربر'),
        ('assistant', 'دستیار هوشمند'),
        ('system', 'سیستم'),
    )

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages', verbose_name="نشست گفتگو")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="نقش ارسال‌کننده")
    content = models.TextField(verbose_name="متن پیام")
    recommendation = models.ForeignKey(Recommendation, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages', verbose_name="پیشنهاد متصل")
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages', verbose_name="سفارش متصل")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="متاداده تکمیلی")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ارسال")

    class Meta:
        verbose_name = "پیام گفتگو"
        verbose_name_plural = "پیام‌های گفتگو"
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:30]}..."
