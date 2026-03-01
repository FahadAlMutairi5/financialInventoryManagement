import requests
import json

auth_response = requests.post('http://localhost:8000/api/auth/token/', data={'username':'admin', 'password':'adminpassword'}) # change if diff
token = auth_response.json().get('access')
if not token:
    auth_response = requests.post('http://localhost:8000/api/auth/token/', data={'username':'admin', 'password':'admin'}) # change if diff
    token = auth_response.json().get('access')

headers = {'Authorization': f'Bearer {token}'}

try:
    reqs = requests.get('http://localhost:8000/api/requests/', headers=headers)
    print("REQUESTS", json.dumps(reqs.json()[:3] if isinstance(reqs.json(), list) else reqs.json(), indent=2))
except Exception as e: print("REQ ERR", e)

try:
    vaults = requests.get('http://localhost:8000/api/vaults/', headers=headers)
    print("VAULTS", json.dumps(vaults.json()[:2] if isinstance(vaults.json(), list) else vaults.json(), indent=2))
except Exception as e: print("VAULT ERR", e)

try:
    users = requests.get('http://localhost:8000/api/users/', headers=headers)
    print("USERS", json.dumps(users.json()[:3] if isinstance(users.json(), list) else users.json(), indent=2))
except Exception as e: print("USER ERR", e)
