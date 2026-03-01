from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.utils import timezone
from .models import Vault, DisbursementRequest

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'Super Admin'
        if obj.groups.filter(name='Vault Manager').exists():
            return 'Vault Manager'
        return 'Employee'

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=['Employee', 'Vault Manager', 'Super Admin'], write_only=True)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', 'Employee')
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password('defaultpassword123') # Default fallback
            
        if role == 'Super Admin':
            user.is_superuser = True
            user.is_staff = True
        user.save()
        
        if role == 'Vault Manager':
            group, _ = Group.objects.get_or_create(name='Vault Manager')
            user.groups.add(group)
            
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        if role:
            # Clear existing roles
            instance.is_superuser = False
            instance.is_staff = False
            instance.groups.clear()
            
            if role == 'Super Admin':
                instance.is_superuser = True
                instance.is_staff = True
            elif role == 'Vault Manager':
                group, _ = Group.objects.get_or_create(name='Vault Manager')
                instance.groups.add(group)
                
        instance.save()
        return instance

class VaultSerializer(serializers.ModelSerializer):
    manager_details = UserSerializer(source='manager', read_only=True)

    class Meta:
        model = Vault
        fields = ['id', 'name', 'manager', 'manager_details', 'initial_balance', 'current_balance', 'created_at', 'updated_at']

    def validate_name(self, value):
        if Vault.objects.filter(name=value).exists():
            raise serializers.ValidationError("Vault name already exists. Please use a unique name.")
        return value

class DisbursementRequestSerializer(serializers.ModelSerializer):
    requestor_details = UserSerializer(source='requestor', read_only=True)
    vault_details = VaultSerializer(source='vault', read_only=True)
    
    class Meta:
        model = DisbursementRequest
        fields = [
            'id', 'requestor', 'requestor_details', 'vault', 'vault_details', 
            'issuance_number', 'amount', 'requested_payout_date', 'letter_attachment', 'status', 
            'rejection_reason', 'transaction_id', 'receipt_attachment', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['requestor', 'status', 'rejection_reason', 'transaction_id']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Invalid Amount: Please enter a numeric value greater than zero.")
        return value

    def validate_requested_payout_date(self, value):
        if value and value < timezone.now().date():
            raise serializers.ValidationError("ERR-13: Invalid Date: The disbursement date cannot be in the past.")
        return value
