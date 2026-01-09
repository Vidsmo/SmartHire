from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import os
import re

app = Flask(__name__, static_folder="../frontend")
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.before_request
def log_request():
    try:
        logger.info("%s %s - remote: %s", request.method, request.path, request.remote_addr)
    except Exception:
        logger.exception("Failed to log request")

from skills import extract_skills, SKILLS, anonymize_text


def validate_payload(data):
    if not isinstance(data, dict):
        return False, "JSON body required"
    jd = data.get("job_description")
    resume = data.get("resume")
    if not isinstance(jd, str) or not isinstance(resume, str):
        return False, "Both 'job_description' and 'resume' must be strings"
    return True, ""


def validate_compare_payload(data):
    if not isinstance(data, dict):
        return False, "JSON body required"
    jd = data.get("job_description")
    resumes = data.get("resumes")
    # Backwards compatibility with resume_a / resume_b
    if resumes is None:
        a = data.get("resume_a")
        b = data.get("resume_b")
        if not all(isinstance(x, str) for x in (jd, a, b)):
            return False, "job_description and at least two resumes must be provided as strings"
        return True, ""
    if not isinstance(jd, str) or not isinstance(resumes, list) or len(resumes) < 2:
        return False, "job_description must be a string and 'resumes' must be a list of 2+ resume strings"
    if not all(isinstance(r, str) for r in resumes):
        return False, "All resumes must be strings"
    return True, ""


@app.route("/analyze", methods=["POST"])
def analyze_resume():
    data = request.get_json(silent=True)
    ok, err = validate_payload(data)
    if not ok:
        logger.warning("Invalid payload: %s", err)
        return jsonify({"error": err}), 400

    job_desc = data.get("job_description", "")
    resume = data.get("resume", "")
    bias = bool(data.get("bias_free", False))

    # Apply anonymization when bias-free mode is enabled
    if bias:
        job_desc = anonymize_text(job_desc)
        resume = anonymize_text(resume)

    jd_skills = extract_skills(job_desc)
    resume_skills = extract_skills(resume)

    matched = sorted(list(set(jd_skills) & set(resume_skills)))
    missing = sorted(list(set(jd_skills) - set(resume_skills)))

    match_percentage = int((len(matched) / max(len(jd_skills), 1)) * 100)

    response = {
        "match_percentage": match_percentage,
        "matched_skills": matched,
        "missing_skills": missing,
        "career_tip": f"Learning {', '.join(missing[:3])} can improve your chances." if missing else "You are a strong match!",
        "jd_skill_count": len(jd_skills),
        "resume_skill_count": len(resume_skills),
        "bias_free": bias,
        "bias_note": "Bias‑Free Evaluation Enabled" if bias else ""
    }
    return jsonify(response), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/compare", methods=["POST"])
def compare_resumes():
    """Compare resumes against the same job description.
    Expects JSON: { job_description, resumes: [ ... ], bias_free: bool }
    Backwards compatible with resume_a / resume_b keys.
    """
    data = request.get_json(silent=True)
    ok, err = validate_compare_payload(data)
    if not ok:
        return jsonify({"error": err}), 400

    jd = data.get("job_description")
    bias = bool(data.get("bias_free", False))

    resumes = data.get("resumes")
    if resumes is None:
        # fallback to resume_a / resume_b
        resumes = [data.get("resume_a"), data.get("resume_b")]

    # Optionally anonymize
    anonymized_texts = []
    processed = []
    for r in resumes:
        text = anonymize_text(r) if bias else r
        anonymized_texts.append(text)
        processed.append(extract_skills(text))

    jd_skills = extract_skills(anonymize_text(jd) if bias else jd)

    def score(skills):
        matched = list(set(jd_skills) & set(skills))
        pct = int((len(matched) / max(len(jd_skills), 1)) * 100)
        return {"matched_skills": sorted(matched), "score": pct, "skill_count": len(skills)}

    candidates = [score(s) for s in processed]

    # Build response listing candidates
    resp_candidates = {}
    for idx, cand in enumerate(candidates):
        resp_candidates[f"candidate_{idx+1}"] = cand

    res = {
        "job_skills": jd_skills,
        "candidates": resp_candidates,
        "anonymized_texts": anonymized_texts if bias else [],
        "bias_free": bias,
        "bias_note": "This comparison is bias‑controlled and anonymized." if bias else "",
        "winner": max(range(len(candidates)), key=lambda i: candidates[i]["score"]) + 1
    }

    return jsonify(res), 200


@app.route("/community", methods=["GET"])
def community():
    # Static feature cards for the community section
    cards = [
        {"title": "Peer Learning", "summary": "Connect with peers and improve together."},
        {"title": "Resume Tips", "summary": "Templates and feedback from experts."},
        {"title": "Interview Prep", "summary": "Mock interviews and scoring."},
        {"title": "Career Insights", "summary": "Trends and role fit analysis."}
    ]
    return jsonify({"cards": cards}), 200


# Serve frontend files
@app.route("/", methods=["GET"])
def index():
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
    return send_from_directory(frontend_dir, "index.html")


@app.route("/<path:filename>")
def frontend_files(filename):
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
    return send_from_directory(frontend_dir, filename)


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.exception("Server error")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
