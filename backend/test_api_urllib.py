import urllib.request
import urllib.parse
import json

def fetch(url, data=None, token=None):
    req = urllib.request.Request(url)
    if data:
        data = urllib.parse.urlencode(data).encode('utf-8')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

token_data = fetch('http://localhost:8000/api/auth/token/', {'username': 'admin', 'password': 'adminpassword'})
if not token_data or not token_data.get('access'):
    token_data = fetch('http://localhost:8000/api/auth/token/', {'username': 'admin', 'password': 'admin'})
if not token_data or not token_data.get('access'):
    token_data = fetch('http://localhost:8000/api/auth/token/', {'username': 'admin3', 'password': 'adminpassword'}) # The user created one called admin3 maybe?

token = token_data.get('access') if token_data else None

if token:
    print("TOKEN OK")
    reqs = fetch('http://localhost:8000/api/requests/', token=token)
    print("REQUESTS", json.dumps(reqs[:3] if isinstance(reqs, list) else reqs, indent=2))
    
    vaults = fetch('http://localhost:8000/api/vaults/', token=token)
    print("VAULTS", json.dumps(vaults[:2] if isinstance(vaults, list) else vaults, indent=2))

    users = fetch('http://localhost:8000/api/users/', token=token)
    print("USERS", json.dumps(users[:3] if isinstance(users, list) else users, indent=2))
else:
    print("Failed to get token")
