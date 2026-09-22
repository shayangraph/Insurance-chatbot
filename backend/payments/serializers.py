from rest_framework import serializers
from .models import Payment
from orders.serializers import OrderSerializer

class PaymentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

class ProcessSandboxPaymentSerializer(serializers.Serializer):
    order_id = serializers.UUIDField(required=True)
    status_action = serializers.ChoiceField(choices=['success', 'failed'], default='success')
