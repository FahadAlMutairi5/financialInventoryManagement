import os
import django
import json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fin_inv_man_backend.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User
from api.views import UserViewSet

try:
    factory = APIRequestFactory()
    request = factory.get('/api/users/')
    user = User.objects.get(username="admin")
    force_authenticate(request, user=user)
    view = UserViewSet.as_view({'get': 'list'})
    response = view(request)
    print("RESPONSE TYPE:", type(response.data))
    if isinstance(response.data, dict):
        print("KEYS:", response.data.keys())
        print("PAGINATED RESULTS:", type(response.data.get('results')))
    else:
        print("NOT DICT, length:", len(response.data))
        print(response.data[:1])
except Exception as e:
    print("ERROR:", e)
