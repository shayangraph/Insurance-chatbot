from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUserRole(BasePermission):
    """
    Allows access only to authenticated users with role='ADMIN' or is_staff=True.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff or request.user.is_superuser)
        )


class IsInsuranceExpertOrAdmin(BasePermission):
    """
    Allows access to ADMIN or approved EXPERT with an assigned company.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff or request.user.is_superuser:
            return True

        if getattr(request.user, 'role', '') == 'EXPERT':
            return bool(
                getattr(request.user, 'is_approved_expert', False) and
                getattr(request.user, 'assigned_company_id', None) is not None
            )

        return False


class IsReadOnlyForExpert(BasePermission):
    """
    Strictly forbids EXPERT users from mutating data (POST, PUT, PATCH, DELETE).
    ADMIN users have full access.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff or request.user.is_superuser:
            return True

        if getattr(request.user, 'role', '') == 'EXPERT':
            # Expert has READ-ONLY access to allowed views
            return request.method in SAFE_METHODS

        return False
