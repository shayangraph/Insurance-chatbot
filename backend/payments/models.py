import uuid
from django.db import models
from orders.models import Order

class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'در انتظار پردازش'),
        ('success', 'پرداخت موفق'),
        ('failed', 'پرداخت ناموفق'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments', verbose_name="سفارش مرتبط")
    transaction_id = models.CharField(max_length=100, unique=True, verbose_name="شناسه تراکنش درگاه")
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="مبلغ پرداختی (تومان)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="وضعیت پرداخت")
    payment_gateway = models.CharField(max_length=50, default='sandbox', verbose_name="درگاه پرداخت")
    paid_at = models.DateTimeField(blank=True, null=True, verbose_name="زمان دقیق پرداخت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد تراکنش")

    class Meta:
        verbose_name = "پرداخت"
        verbose_name_plural = "تراکنش‌های پرداخت"
        ordering = ['-created_at']

    def __str__(self):
        return f"تراکنش {self.transaction_id} - {self.get_status_display()}"
