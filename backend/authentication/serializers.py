from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    assigned_company_name = serializers.CharField(source='assigned_company.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'phone_number', 'full_name', 'role', 'role_display',
            'assigned_company', 'assigned_company_name', 'is_approved_expert',
            'is_staff', 'is_superuser', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, error_messages={
        "min_length": "رمز عبور باید حداقل ۶ کاراکتر باشد."
    })
    is_expert_applicant = serializers.BooleanField(required=False, default=False, write_only=True)
    requested_company_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = ('phone_number', 'full_name', 'password', 'is_expert_applicant', 'requested_company_id')

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("این شماره همراه قبلاً در سیستم ثبت شده است.")
        return value

    def create(self, validated_data):
        is_expert = validated_data.pop('is_expert_applicant', False)
        requested_company_id = validated_data.pop('requested_company_id', None)

        role = 'EXPERT' if is_expert else 'USER'
        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            full_name=validated_data.get('full_name', ''),
            password=validated_data['password'],
            role=role,
            assigned_company_id=requested_company_id if is_expert else None,
            is_approved_expert=False  # Requires admin approval
        )
        return user

class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        phone_number = data.get('phone_number')
        password = data.get('password')

        user = User.objects.filter(phone_number=phone_number).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({"detail": "شماره همراه یا رمز عبور اشتباه است."})

        data['user'] = user
        return data
