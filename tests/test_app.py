import os
import importlib.util
from fastapi.testclient import TestClient


# Load the app module directly from src/app.py to avoid package import issues
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APP_PATH = os.path.join(ROOT, "src", "app.py")
spec = importlib.util.spec_from_file_location("app_module", APP_PATH)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

app = getattr(app_module, "app")
client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Basic assertions about the structure
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    test_email = "pytest-user@example.com"

    # Ensure the test email is not present at start (if it is, remove it first)
    resp = client.get("/activities")
    participants = resp.json().get(activity, {}).get("participants", [])
    if test_email in participants:
        client.delete(f"/activities/{activity}/participants?email={test_email}")

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert resp.status_code == 200
    data = resp.json()
    assert "Signed up" in data.get("message", "")

    # Confirm presence
    resp = client.get("/activities")
    participants = resp.json().get(activity, {}).get("participants", [])
    assert test_email in participants

    # Unregister
    resp = client.delete(f"/activities/{activity}/participants?email={test_email}")
    assert resp.status_code == 200
    data = resp.json()
    assert "Unregistered" in data.get("message", "")

    # Confirm removal
    resp = client.get("/activities")
    participants = resp.json().get(activity, {}).get("participants", [])
    assert test_email not in participants


def test_unregister_nonexistent_returns_404():
    activity = "Chess Club"
    non_email = "does-not-exist@example.com"
    # Ensure it's not present
    resp = client.get("/activities")
    participants = resp.json().get(activity, {}).get("participants", [])
    if non_email in participants:
        client.delete(f"/activities/{activity}/participants?email={non_email}")

    # Attempt to unregister a non-existent user
    resp = client.delete(f"/activities/{activity}/participants?email={non_email}")
    assert resp.status_code == 404
