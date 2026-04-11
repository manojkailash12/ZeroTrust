"""
Run once to create or reset the admin user via the API:
  python create_admin.py

All data goes through the FastAPI backend → MongoDB Atlas.
Make sure the backend is running before executing this script.
"""
import getpass
import requests
import os

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")
SETUP_SECRET = os.getenv("ADMIN_SETUP_SECRET", "zero-trust-setup-2024")

print("=== Zero Trust Admin Setup ===")
print(f"Connecting to API: {API_URL}\n")

username = input("Admin username [admin]: ").strip() or "admin"
email    = input("Admin email: ").strip()
mobile   = input("Admin mobile: ").strip()
password = getpass.getpass("Admin password (hidden): ").strip()

if not password:
    print("❌ Password cannot be empty.")
    exit(1)

if not email:
    print("❌ Email cannot be empty.")
    exit(1)

try:
    response = requests.post(
        f"{API_URL}/admin/create-admin",
        json={
            "username": username,
            "password": password,
            "email": email,
            "mobile": mobile,
            "setup_secret": SETUP_SECRET,
        },
        timeout=15
    )

    if response.status_code == 200:
        print(f"\n✅ {response.json()['message']}")
        print("Credentials stored securely in MongoDB via API.")
    elif response.status_code == 403:
        print("❌ Invalid setup secret. Check ADMIN_SETUP_SECRET env variable.")
    else:
        print(f"❌ Failed: {response.status_code} — {response.json().get('detail', 'Unknown error')}")

except requests.exceptions.ConnectionError:
    print(f"❌ Could not connect to API at {API_URL}")
    print("   Make sure the backend server is running first.")
except Exception as e:
    print(f"❌ Error: {e}")
