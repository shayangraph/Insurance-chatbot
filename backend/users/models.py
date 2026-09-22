from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('شماره تلفن همراه الزامی است.')
        extra_fields.setdefault('username', phone_number)
        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(phone_number, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'کاربر عادی'),
        ('ADMIN', 'مدیر سیستم'),
        ('EXPERT', 'کارشناس بیمه'),
    )

    phone_number = models.CharField(max_length=15, unique=True, verbose_name="شماره همراه")
    full_name = models.CharField(max_length=255, blank=True, verbose_name="نام و نام خانوادگی")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER', verbose_name="نقش کاربری")
    assigned_company = models.ForeignKey(
        'recommendation.InsuranceCompany',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='experts',
        verbose_name="شرکت بیمه تخصیص‌یافته"
    )
    is_approved_expert = models.BooleanField(default=False, verbose_name="تایید صلاحیت کارشناس توسط مدیریت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت نام")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    def __str__(self):
        return f"{self.full_name or self.phone_number} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == 'ADMIN' or self.is_staff or self.is_superuser

    @property
    def is_expert(self):
        return self.role == 'EXPERT' and self.is_approved_expert and self.assigned_company_id is not None

