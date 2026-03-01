import os
import django
import json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fin_inv_man_backend.settings")
django.setup()

from api.models import Vault, DisbursementRequest
from django.contrib.auth.models import User
from api.serializers import VaultSerializer, DisbursementRequestSerializer, UserSerializer

print("USERS:")
users = UserSerializer(User.objects.all(), many=True).data
print(json.dumps(users, indent=2))

print("VAULTS:")
vaults = VaultSerializer(Vault.objects.all(), many=True).data
print(json.dumps(vaults, indent=2))

print("REQUESTS:")
requests = DisbursementRequestSerializer(DisbursementRequest.objects.all(), many=True).data
print(json.dumps(requests, indent=2))
