from rest_framework import serializers
from .models import ChatSession, ChatMessage
from recommendation.serializers import RecommendationSerializer
from orders.serializers import OrderSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    recommendation = RecommendationSerializer(read_only=True)
    order = OrderSerializer(read_only=True)
    products = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ('id', 'role', 'content', 'recommendation', 'order', 'products', 'metadata', 'created_at')

    def get_products(self, obj):
        if obj.metadata and isinstance(obj.metadata, dict):
            return obj.metadata.get('products')
        return None

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    paid_order = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ('id', 'title', 'insurance_type', 'collected_data', 'is_completed', 'messages', 'paid_order', 'created_at', 'updated_at')

    def get_paid_order(self, obj):
        from orders.models import Order
        from orders.serializers import OrderSerializer
        order = Order.objects.filter(session_id=str(obj.id), status='paid').select_related('plan', 'plan__company').order_by('-created_at').first()
        if order:
            return OrderSerializer(order).data
        return None
