from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_company_name = serializers.CharField(source='assigned_company.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'phone_number', 'full_name', 'role', 'role_display',
            'assigned_company', 'assigned_company_name', 'is_approved_expert',
            'created_at'
        )
        read_only_fields = ('id', 'created_at')
