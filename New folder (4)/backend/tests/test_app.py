import pytest

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_analyze_match(client):
    payload = {"job_description": "We need python, flask and sql", "resume": "Experienced with Python and Flask"}
    r = client.post("/analyze", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert data["match_percentage"] == 66
    assert set(data["matched_skills"]) == {"python", "flask"}
    assert data["missing_skills"] == ["sql"]


def test_analyze_invalid_payload(client):
    r = client.post("/analyze", data="notjson", content_type="text/plain")
    assert r.status_code == 400
    assert "error" in r.get_json()


def test_compare(client):
    payload = {
        "job_description": "We need python, flask and sql",
        "resume_a": "Experienced with Python and Flask",
        "resume_b": "Experienced with SQL and AWS"
    }
    r = client.post("/compare", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    # new compare returns 'candidates' mapping
    assert "candidates" in data and "candidate_1" in data["candidates"] and "candidate_2" in data["candidates"]
    assert data["candidates"]["candidate_1"]["score"] == 66
    assert data["candidates"]["candidate_2"]["score"] == 33


def test_community(client):
    r = client.get("/community")
    assert r.status_code == 200
    data = r.get_json()
    assert "cards" in data and len(data["cards"]) >= 3


def test_analyze_bias_mode(client):
    payload = {
        "job_description": "Looking for python, flask",
        "resume": "Name: Jane Doe\nCollege: Acme University\nExperienced with Python and Flask",
        "bias_free": True
    }
    r = client.post("/analyze", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert data.get("bias_free") is True
    assert "Bias‑Free" in data.get("bias_note")
    # Skills still detected
    assert set(data["matched_skills"]) == {"python", "flask"}


def test_compare_multiple_bias(client):
    payload = {
        "job_description": "We need python, sql",
        "resumes": [
            "Name: Alice\nCollege: State U\nPython developer",
            "Name: Bob\nCollege: Harvard University\nExperienced with SQL and Python"
        ],
        "bias_free": True
    }
    r = client.post("/compare", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert data.get("bias_free") is True
    assert "anonymized_texts" in data and len(data["anonymized_texts"]) == 2
    # anonymized texts should not contain personal names or college names
    for t in data["anonymized_texts"]:
        assert "alice" not in t.lower()
        assert "bob" not in t.lower()
        assert "harvard" not in t.lower()
        assert "college" not in t.lower()
    # scores present
    assert "candidates" in data and len(data["candidates"]) == 2

