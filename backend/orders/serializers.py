from rest_framework import serializers
from .models import Order
from recommendation.serializers import InsurancePlanSerializer
from users.serializers import UserSerializer

class OrderSerializer(serializers.ModelSerializer):
    plan = InsurancePlanSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    initial_payable_amount = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    payment_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_payment_url(self, obj):
        return f"/sandbox-payment/{obj.id}"

class CreateOrderSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField(required=True)
    total_price = serializers.DecimalField(max_digits=16, decimal_places=2, required=True)
    session_id = serializers.CharField(required=False, allow_blank=True)
    payment_type = serializers.ChoiceField(choices=['cash', 'installment_3', 'installment_6'], default='cash', required=False)
    collected_info = serializers.JSONField(required=False, default=dict)

