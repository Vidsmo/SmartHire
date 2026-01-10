from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import os
import re
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    logger = logging.getLogger(__name__)
    logger.warning("GEMINI_API_KEY not found in environment variables. AI features will be disabled.")
    model = None

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

from skills import extract_skills, SKILLS


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

    jd_skills = extract_skills(job_desc)
    resume_skills = extract_skills(resume)

    matched = sorted(list(set(jd_skills) & set(resume_skills)))
    missing = sorted(list(set(jd_skills) - set(resume_skills)))

    match_percentage = int((len(matched) / max(len(jd_skills), 1)) * 100)

    # AI-Powered Analysis (if model is available)
    ai_insights = ""
    career_tip = f"Learning {', '.join(missing[:3])} can improve your chances." if missing else "You are a strong match!"
    if model:
        try:
            prompt = f"""
            Analyze this resume against the job description.
            Job Description: {job_desc[:2000]}
            Resume: {resume[:3000]}
            
            Provide the following in JSON format:
            1. 'ai_match_score': a percentage (0-100) based on overall fit.
            2. 'analysis_summary': 2-3 sentences explaining the fit.
            3. 'key_strengths': list of top 3 strengths.
            4. 'critical_gaps': list of top 3 missing things.
            5. 'career_advice': 1-2 sentences of specific advice.
            6. 'culture_fit_score': a number 1-10.
            7. 'growth_potential': a number 1-10.
            8. 'salary_expectation_mid': a number (estimated monthly INR).
            """
            ai_res = model.generate_content(prompt)
            ai_data = json.loads(ai_res.text.replace('```json', '').replace('```', '').strip())
            
            match_percentage = ai_data.get('ai_match_score', match_percentage)
            ai_insights = ai_data.get('analysis_summary', "")
            career_tip = ai_data.get('career_advice', career_tip)
            
            # Additional high-level metrics for the premium UI
            response = {
                "match_percentage": match_percentage,
                "matched_skills": matched,
                "missing_skills": missing,
                "career_tip": career_tip,
                "ai_insights": ai_insights,
                "jd_skill_count": len(jd_skills),
                "resume_skill_count": len(resume_skills),
                "extra_metrics": {
                    "culture_fit": ai_data.get('culture_fit_score', 7),
                    "potential": ai_data.get('growth_potential', 8),
                    "est_salary": ai_data.get('salary_expectation_mid', 50000),
                    "strengths": ai_data.get('key_strengths', []),
                    "gaps": ai_data.get('critical_gaps', [])
                }
            }
            return jsonify(response), 200
        except Exception as e:
            logger.error(f"AI Analysis failed: {e}")

    response = {
        "match_percentage": match_percentage,
        "matched_skills": matched,
        "missing_skills": missing,
        "career_tip": career_tip,
        "ai_insights": ai_insights,
        "jd_skill_count": len(jd_skills),
        "resume_skill_count": len(resume_skills),
        "extra_metrics": {
            "culture_fit": 5,
            "potential": 5,
            "est_salary": 0,
            "strengths": [],
            "gaps": []
        }
    }
    return jsonify(response), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/compare", methods=["POST"])
def compare_resumes():
    """Compare resumes against the same job description.
    Expects JSON: { job_description, resumes: [ ... ] }
    Backwards compatible with resume_a / resume_b keys.
    """
    data = request.get_json(silent=True)
    ok, err = validate_compare_payload(data)
    if not ok:
        return jsonify({"error": err}), 400

    jd = data.get("job_description")

    resumes = data.get("resumes")
    if resumes is None:
        # fallback to resume_a / resume_b
        resumes = [data.get("resume_a"), data.get("resume_b")]

    processed = [extract_skills(r) for r in resumes]

    jd_skills = extract_skills(jd)

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
        "winner": max(range(len(candidates)), key=lambda i: candidates[i]["score"]) + 1
    }

    return jsonify(res), 200


@app.route("/chat", methods=["POST"])
def chat():
    if not model:
        return jsonify({"error": "AI features are currently disabled (missing API key)"}), 503
    
    data = request.get_json(silent=True) or {}
    message = data.get("message")
    context = data.get("context", "") # Optional context about the candidate/JD
    
    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        prompt = f"You are an AI HR Assistant. Context: {context}\n\nUser: {message}\nAssistant:"
        response = model.generate_content(prompt)
        return jsonify({"response": response.text}), 200
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        return jsonify({"error": "Failed to get response from AI"}), 500


@app.route("/generate-questions", methods=["POST"])
def generate_questions():
    if not model:
        return jsonify({"error": "AI features are currently disabled"}), 503

    data = request.get_json(silent=True) or {}
    jd = data.get("job_description", "")
    resume = data.get("resume", "")

    try:
        prompt = f"Generate 5 targeted interview questions for a candidate based on this Job Description and Resume. Focus on their skill gaps and verifying their claimed strengths.\n\nJD: {jd[:1000]}\nResume: {resume[:2000]}"
        response = model.generate_content(prompt)
        # Split by lines and clean up
        questions = [q.strip() for q in response.text.split('\n') if q.strip() and (q.strip()[0].isdigit() or q.strip().startswith('-'))]
        return jsonify({"questions": questions or [response.text]}), 200
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        return jsonify({"error": "Failed to generate questions"}), 500


@app.route("/generate-doc", methods=["POST"])
def generate_doc():
    """Generate a document (offer, rejection, NDA, internship contract).
    If the AI model is available we use it; otherwise fall back to a simple local template generator so the feature remains usable offline.
    """
    data = request.get_json(silent=True) or {}
    doc_type = data.get("type", "offer_letter")  # offer_letter, rejection_mail, nda, intern_contract
    cand_info = data.get("candidate_info", "")
    job_info = data.get("job_info", "")

    def local_generate(dt, cand, job):
        cand = cand or "Candidate"
        job = job or "the role"
        if dt == 'offer_letter':
            return (
                f"Dear {cand},\n\n"
                f"We are delighted to offer you the position for {job}." 
                "Please review the terms and confirm your acceptance.\n\n"
                "We look forward to having you on the team.\n\n"
                "Sincerely,\nSmartHire Recruitment Team"
            )
        if dt == 'rejection_mail':
            return (
                f"Dear {cand},\n\n"
                f"Thank you for applying for {job}. We appreciate your interest, however we will not be moving forward with your application at this time.\n\n"
                "We encourage you to apply again in the future for roles that match your profile.\n\n"
                "Best regards,\nSmartHire Recruitment Team"
            )
        if dt == 'nda':
            return (
                "NON-DISCLOSURE AGREEMENT (Summary)\n\n"
                "This NDA confirms that the recipient will not disclose confidential information shared in the course of employment discussions and onboarding.\n\n"
                "Parties: SmartHire and the Candidate.\nEffective Date: Upon acceptance.\n\n"
                "(This is a short template intended for demonstration purposes only.)"
            )
        if dt == 'intern_contract' or dt == 'internship_contract':
            return (
                f"INTERNSHIP AGREEMENT (Summary)\n\n"
                f"This agreement outlines the internship position of {cand} for {job}. The internship is for a defined period and may be compensated as agreed.\n\n"
                "(Use this template as a starting point and expand as needed.)"
            )
        # default generic template
        return f"Document for {cand} — {job}\n\n(This is a generated template.)"

    # If model exists, prefer it but gracefully fall back to local generator on error
    if model:
        try:
            prompt = (
                f"Write a professional {doc_type.replace('_', ' ')} for a candidate. Use this info:\n"
                f"Candidate: {cand_info}\nJob: {job_info}\n\nMaintain a professional, modern tone."
            )
            response = model.generate_content(prompt)
            return jsonify({"document": response.text}), 200
        except Exception as e:
            logger.error(f"Doc generation failed (AI): {e}")
            # fallback to local
            return jsonify({"document": local_generate(doc_type, cand_info, job_info)}), 200

    # No model available — return local template so the UI remains functional
    return jsonify({"document": local_generate(doc_type, cand_info, job_info)}), 200


@app.route("/bulk-rank", methods=["POST"])
def bulk_rank():
    if not model:
        return jsonify({"error": "AI features are currently disabled"}), 503

    data = request.get_json(silent=True) or {}
    jd = data.get("job_description", "")
    resumes = data.get("resumes", []) # Expecting list of strings

    if not jd or not resumes:
        return jsonify({"error": "JD and resumes list required"}), 400

    jd_skills = extract_skills(jd)
    results = []

    # Phase 1: Rapid local scoring
    for idx, r_text in enumerate(resumes):
        r_skills = extract_skills(r_text)
        matched = list(set(jd_skills) & set(r_skills))
        score = int((len(matched) / max(len(jd_skills), 1)) * 100)
        results.append({
            "id": idx + 1,
            "raw_score": score,
            "matched_skills": sorted(matched),
            "text": r_text[:500] # Snippet for context
        })

    # Sort candidates
    results.sort(key=lambda x: x['raw_score'], reverse=True)

    # Phase 2: AI Validation for Top 5
    top_candidates = results[:5]
    try:
        cand_summaries = "\n".join([f"Candidate {c['id']}: Score {c['raw_score']}%, Skills: {', '.join(c['matched_skills'])}" for c in top_candidates])
        prompt = f"Rank these top candidates for JD: {jd[:500]}\nCandidates:\n{cand_summaries}\n\nProvide 1 sentence 'Recruiter Verdict' for each in JSON: {{'results': [{{'id': X, 'verdict': '...'}}, ...]}}"
        ai_res = model.generate_content(prompt)
        ai_data = json.loads(ai_res.text.replace('```json', '').replace('```', '').strip())
        
        # Merge AI verdicts back
        verdicts = {v['id']: v['verdict'] for v in ai_data.get('results', [])}
        for c in results:
            c['verdict'] = verdicts.get(c['id'], "Potential candidate for further review.")
    except Exception as e:
        logger.error(f"Bulk AI ranking failed: {e}")

    return jsonify({"ranked_results": results}), 200


@app.route("/community", methods=["GET"])
def community():
    # Static feature cards for the community section
    cards = [
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
