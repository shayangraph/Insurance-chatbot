from django.contrib import admin
from .models import InsuranceCompany, InsurancePlan, InsuranceCoverage, Recommendation

@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'rating', 'wealth_level', 'complaint_satisfaction_rate')
    search_fields = ('name', 'code')

@admin.register(InsuranceCoverage)
class InsuranceCoverageAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'coverage_type', 'additional_price', 'is_active')
    list_filter = ('coverage_type', 'is_active')
    search_fields = ('name', 'plan__title')

@admin.register(InsurancePlan)
class InsurancePlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'insurance_type', 'base_price', 'is_installment_enabled', 'allow_3_months', 'allow_6_months', 'down_payment_percent', 'is_active')
    list_filter = ('insurance_type', 'is_active', 'is_installment_enabled', 'company')
    search_fields = ('title', 'company__name')
    fieldsets = (
        ('مشخصات اصلی', {
            'fields': ('company', 'title', 'insurance_type', 'description', 'base_price', 'coverage_amount', 'is_active')
        }),
        ('تنظیمات پرداخت اقساطی', {
            'fields': ('is_installment_enabled', 'allow_3_months', 'allow_6_months', 'down_payment_percent'),
            'description': 'تنظیم شرایط و بازه‌های اقساط و پیش‌پرداخت برای کاربران'
        }),
        ('جزئیات پوشش‌ها و تخفیف', {
            'fields': ('max_discount_percent', 'coverage_details')
        }),
    )

@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'calculated_price', 'session_id', 'created_at')
