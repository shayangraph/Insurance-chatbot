import uuid
from django.db import models
from django.conf import settings
from recommendation.models import InsurancePlan

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending_payment', 'در انتظار پرداخت'),
        ('paid', 'پرداخت موفق و صادر شده'),
        ('cancelled', 'لغو شده'),
        ('failed', 'ناموفق'),
    )

    PAYMENT_TYPE_CHOICES = (
        ('cash', 'نقدی'),
        ('installment_3', 'اقساطی ۳ ماهه'),
        ('installment_6', 'اقساطی ۶ ماهه'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, verbose_name="شماره سفارش")
    session_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="شناسه نشست")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders', verbose_name="خریدار")
    plan = models.ForeignKey(InsurancePlan, on_delete=models.PROTECT, related_name='orders', verbose_name="طرح بیمه خریداری شده")
    total_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="مبلغ کل سفارش (تومان)")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_payment', verbose_name="وضعیت سفارش")

    # Payment method & installment fields
    payment_type = models.CharField(max_length=30, choices=PAYMENT_TYPE_CHOICES, default='cash', verbose_name="روش پرداخت")
    down_payment_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="مبلغ پیش‌پرداخت (تومان)")
    installment_count = models.IntegerField(default=0, verbose_name="تعداد اقساط")
    installment_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="مبلغ هر قسط (تومان)")
    paid_installments_count = models.IntegerField(default=1, verbose_name="تعداد اقساط پرداخت‌شده")

    selected_coverages = models.JSONField(default=list, blank=True, verbose_name="پوشش‌های انتخابی")
    collected_info = models.JSONField(default=dict, verbose_name="اطلاعات تکمیل شده بیمه‌نامه")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت سفارش")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    @property
    def initial_payable_amount(self):
        """Returns the initial amount that must be paid via gateway (down payment for installment, total for cash)"""
        if self.payment_type in ['installment_3', 'installment_6'] and self.down_payment_amount > 0:
            return self.down_payment_amount
        return self.total_price


    class Meta:
        verbose_name = "سفارش بیمه"
        verbose_name_plural = "سفارشات بیمه"
        ordering = ['-created_at']

    def __str__(self):
        return f"سفارش {self.order_number} - {self.plan.title}"
