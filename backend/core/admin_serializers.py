from rest_framework import serializers
from django.contrib.auth import get_user_model
from recommendation.models import InsuranceCompany, InsurancePlan, InsuranceCoverage
from orders.models import Order
from payments.models import Payment
from chat.models import ChatSession

User = get_user_model()

class AdminInsuranceCoverageSerializer(serializers.ModelSerializer):
    coverage_type_display = serializers.CharField(source='get_coverage_type_display', read_only=True)
    plan_title = serializers.CharField(source='plan.title', read_only=True)

    class Meta:
        model = InsuranceCoverage
        fields = (
            'id', 'plan', 'plan_title', 'name', 'description',
            'coverage_type', 'coverage_type_display',
            'additional_price', 'is_active', 'created_at'
        )

class AdminInsuranceCompanySerializer(serializers.ModelSerializer):
    plans_count = serializers.IntegerField(source='plans.count', read_only=True)

    class Meta:
        model = InsuranceCompany
        fields = '__all__'

class AdminInsurancePlanSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    insurance_type_display = serializers.CharField(source='get_insurance_type_display', read_only=True)
    coverages = AdminInsuranceCoverageSerializer(many=True, read_only=True)

    class Meta:
        model = InsurancePlan
        fields = (
            'id', 'company', 'company_name', 'title',
            'insurance_type', 'insurance_type_display',
            'description', 'base_price', 'coverage_amount',
            'coverage_details', 'max_discount_percent',
            'is_active', 'coverages'
        )

class AdminUserListSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_company_name = serializers.CharField(source='assigned_company.name', read_only=True)
    orders_count = serializers.IntegerField(source='orders.count', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'phone_number', 'full_name', 'role', 'role_display',
            'assigned_company', 'assigned_company_name', 'is_approved_expert',
            'is_active', 'created_at', 'orders_count'
        )

class AdminOrderSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    plan_title = serializers.CharField(source='plan.title', read_only=True)
    company_name = serializers.CharField(source='plan.company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'order_number', 'session_id', 'user', 'user_phone', 'user_name',
            'plan', 'plan_title', 'company_name', 'total_price', 'status', 'status_display',
            'selected_coverages', 'collected_info', 'created_at', 'updated_at'
        )

class AdminChatSessionSerializer(serializers.ModelSerializer):
    messages_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ('id', 'title', 'insurance_type', 'collected_data', 'is_completed', 'created_at', 'messages_count')

class AdminUserDetailSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_company_name = serializers.CharField(source='assigned_company.name', read_only=True)
    orders = AdminOrderSerializer(many=True, read_only=True)
    chat_sessions = AdminChatSessionSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'phone_number', 'full_name', 'role', 'role_display',
            'assigned_company', 'assigned_company_name', 'is_approved_expert',
            'is_active', 'created_at', 'orders', 'chat_sessions'
        )

class AdminTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    user_phone = serializers.CharField(source='order.user.phone_number', read_only=True, default='مهمان')
    user_name = serializers.CharField(source='order.user.full_name', read_only=True, default='مهمان')
    plan_title = serializers.CharField(source='order.plan.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    order_data = AdminOrderSerializer(source='order', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'transaction_id', 'order', 'order_number', 'user_phone', 'user_name',
            'plan_title', 'amount', 'status', 'status_display', 'payment_gateway',
            'paid_at', 'created_at', 'order_data'
        )

