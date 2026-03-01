from django.db import models
from django.contrib.auth.models import User

class Vault(models.Model):
    name = models.CharField(max_length=255, unique=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='managed_vaults')
    initial_balance = models.DecimalField(max_digits=12, decimal_places=2)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class DisbursementRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING_SUPER_ADMIN_REVIEW', 'Pending Super Admin Review'),
        ('PENDING_VAULT_MANAGER_APPROVAL', 'Pending Vault Manager Approval'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]

    requestor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='requests', null=True, blank=True)
    issuance_number = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    requested_payout_date = models.DateField(null=True, blank=True)
    letter_attachment = models.FileField(upload_to='letters/')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING_SUPER_ADMIN_REVIEW')
    rejection_reason = models.TextField(blank=True, null=True)
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    receipt_attachment = models.FileField(upload_to='receipts/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.issuance_number} - {self.amount}"
