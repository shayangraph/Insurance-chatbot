from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'plan', 'payment_type', 'total_price', 'down_payment_amount', 'installment_count', 'status', 'created_at')
    list_filter = ('status', 'payment_type', 'created_at')
    search_fields = ('order_number', 'user__phone_number', 'user__full_name', 'plan__title')
