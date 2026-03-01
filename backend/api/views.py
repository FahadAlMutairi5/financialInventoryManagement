import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Vault, DisbursementRequest
from .serializers import VaultSerializer, DisbursementRequestSerializer, UserSerializer, UserCreateUpdateSerializer

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

class VaultViewSet(viewsets.ModelViewSet):
    queryset = Vault.objects.all()
    serializer_class = VaultSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Set current balance to initial balance on creation
        serializer.save(current_balance=serializer.validated_data.get('initial_balance'))

class DisbursementRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DisbursementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return DisbursementRequest.objects.all()
        if user.groups.filter(name='Vault Manager').exists():
            managed_vaults = Vault.objects.filter(manager=user)
            return DisbursementRequest.objects.filter(vault__in=managed_vaults)
        return DisbursementRequest.objects.filter(requestor=user)

    def create(self, request, *args, **kwargs):
        # Allow employee to submit without explicitly setting the vault (should be handled by model change)
        if not request.data.get('letter_attachment'):
            return Response({'detail': 'ERR-01: Missing data: Please ensure all mandatory fields are filled.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Vault is null initially
        serializer.save(requestor=self.request.user, status='PENDING_SUPER_ADMIN_REVIEW')

    @action(detail=True, methods=['patch'])
    def assign_vault(self, request, pk=None):
        req = self.get_object()
        user = request.user
        
        if not user.is_superuser:
            return Response({'detail': 'Unauthorized: Only Super Admin can assign vaults.'}, status=status.HTTP_403_FORBIDDEN)
            
        vault_id = request.data.get('vault_id')
        if not vault_id:
            return Response({'detail': 'ERR-04: Assignment Error: Please select an active vault from the list.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            vault = Vault.objects.get(id=vault_id)
        except Vault.DoesNotExist:
            return Response({'detail': 'ERR-04: Assignment Error: Please select an active vault from the list.'}, status=status.HTTP_400_BAD_REQUEST)

        if req.amount > vault.current_balance:
            return Response({'detail': 'ERR-03: Insufficient Funds: The selected vault does not have enough balance to cover this request.'}, status=status.HTTP_400_BAD_REQUEST)

        req.vault = vault
        req.status = 'PENDING_VAULT_MANAGER_APPROVAL'
        req.save()
        return Response({'status': 'assigned', 'message': f'Request assigned to vault: {vault.name}'})

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        req = self.get_object()
        user = request.user
        
        # Only Super admin can reject pending requests, or Vault manager can reject assigned requests
        if not (user.is_superuser or (req.vault and req.vault.manager == user)):
             return Response({'detail': 'Unauthorized to reject this request.'}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('rejection_reason')
        if not reason:
            return Response({'detail': 'Reason for Rejection is required.'}, status=status.HTTP_400_BAD_REQUEST)

        req.status = 'REJECTED'
        req.rejection_reason = reason
        req.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['patch'])
    def disburse(self, request, pk=None):
        req = self.get_object()
        user = request.user
        
        if not req.vault or (req.vault.manager != user and not user.is_superuser):
            return Response({'detail': 'Unauthorized to disburse from this vault.'}, status=status.HTTP_403_FORBIDDEN)

        if req.status != 'PENDING_VAULT_MANAGER_APPROVAL':
            return Response({'detail': 'Request must be pending manager approval.'}, status=status.HTTP_400_BAD_REQUEST)

        receipt = request.FILES.get('receipt_attachment')
        if not receipt:
            return Response({'detail': 'ERR-05: Closing Error: You cannot complete the transaction without uploading the signed receipt.'}, status=status.HTTP_400_BAD_REQUEST)

        # Re-check balance (liquidity validation sync guard)
        req.vault.refresh_from_db()
        if req.vault.current_balance < req.amount:
             return Response({'detail': 'ERR-06: Sync Error: The vault balance has changed; please refresh and verify again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            req.receipt_attachment = receipt
            req.status = 'COMPLETED'
            req.transaction_id = str(uuid.uuid4())
            req.vault.current_balance -= req.amount
            req.vault.save()
            req.save()
            return Response({'status': 'disbursed', 'transaction_id': req.transaction_id})
        except Exception as e:
            return Response({'detail': 'System Error: Failed to update vault balance. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]
