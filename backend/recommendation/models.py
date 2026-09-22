from django.db import models
from django.conf import settings

class InsuranceCompany(models.Model):
    name = models.CharField(max_length=150, verbose_name="نام شرکت بیمه")
    code = models.CharField(max_length=50, unique=True, verbose_name="کد شناسه")
    logo_url = models.URLField(blank=True, null=True, verbose_name="آدرس لوگو")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5, verbose_name="امتیاز مشتریان (۱ تا ۵)")
    wealth_level = models.IntegerField(default=1, verbose_name="سطح توانگری مالی")
    complaint_satisfaction_rate = models.IntegerField(default=95, verbose_name="درصد رضایت‌مندی از پرداخت خسارت")

    class Meta:
        verbose_name = "شرکت بیمه"
        verbose_name_plural = "شرکت‌های بیمه"

    def __str__(self):
        return self.name

class InsurancePlan(models.Model):
    INSURANCE_TYPES = (
        ('third_party', 'شخص ثالث خودرو'),
        ('body', 'بدنه خودرو'),
        ('fire', 'آتش‌سوزی و زلزله'),
        ('travel', 'مسافرتی خارج از کشور'),
        ('life', 'عمر و سرمایه‌گذاری'),
        ('health', 'درمان تکمیلی'),
    )


    company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE, related_name='plans', verbose_name="شرکت بیمه‌گر")
    title = models.CharField(max_length=255, verbose_name="عنوان طرح بیمه")
    insurance_type = models.CharField(max_length=50, choices=INSURANCE_TYPES, verbose_name="نوع بیمه")
    description = models.TextField(verbose_name="توضیحات و پوشش‌ها")
    base_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="قیمت پایه (تومان)")
    coverage_amount = models.DecimalField(max_digits=14, decimal_places=0, verbose_name="حداکثر سقف تعهد مالی (تومان)")
    coverage_details = models.JSONField(default=list, verbose_name="جزئیات پوشش‌ها به تفکیک")
    max_discount_percent = models.IntegerField(default=70, verbose_name="حداکثر درصد تخفیف عدم خسارت")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    # Installment Payment Settings
    is_installment_enabled = models.BooleanField(default=True, verbose_name="امکان پرداخت اقساطی")
    allow_3_months = models.BooleanField(default=True, verbose_name="امکان اقساط ۳ ماهه")
    allow_6_months = models.BooleanField(default=True, verbose_name="امکان اقساط ۶ ماهه")
    down_payment_percent = models.IntegerField(default=20, verbose_name="درصد پیش‌پرداخت")

    class Meta:
        verbose_name = "طرح بیمه"
        verbose_name_plural = "طرح‌های بیمه"

    def __str__(self):
        return f"{self.title} - {self.company.name}"

class InsuranceCoverage(models.Model):
    COVERAGE_TYPES = (
        ('BASE', 'پوشش اصلی / پایه'),
        ('OPTIONAL', 'پوشش اختیاری / تکمیلی'),
    )

    plan = models.ForeignKey(InsurancePlan, on_delete=models.CASCADE, related_name='coverages', verbose_name="طرح بیمه مرتبط")
    name = models.CharField(max_length=255, verbose_name="نام پوشش")
    description = models.TextField(blank=True, verbose_name="توضیحات پوشش")
    coverage_type = models.CharField(max_length=20, choices=COVERAGE_TYPES, default='OPTIONAL', verbose_name="نوع پوشش")
    additional_price = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="مبلغ اضافه (تومان)")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "پوشش بیمه"
        verbose_name_plural = "پوشش‌های بیمه"
        ordering = ['coverage_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_coverage_type_display()}) - {self.plan.title}"

class Recommendation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="کاربر")
    session_id = models.CharField(max_length=100, db_index=True, verbose_name="شناسه نشست گفتگو")
    plan = models.ForeignKey(InsurancePlan, on_delete=models.CASCADE, verbose_name="طرح بیمه پیشنهادی")
    calculated_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="قیمت محاسبه شده (تومان)")
    original_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="قیمت قبل از تخفیف (تومان)")
    discount_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="مبلغ تخفیف (تومان)")
    recommendation_reason = models.TextField(verbose_name="دلیل پیشنهاد هوشمند")
    collected_data = models.JSONField(default=dict, verbose_name="اطلاعات ورودی کاربر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ پیشنهاد")

    class Meta:
        verbose_name = "پیشنهاد هوشمند"
        verbose_name_plural = "پیشنهادات هوشمند"

    def __str__(self):
        return f"پیشنهاد {self.plan.title} برای نشست {self.session_id}"

