from flask import Flask, render_template, request

app = Flask(__name__)

# predefined skill set (can be expanded)
SKILLS = [
    "python", "flask", "sql", "machine learning",
    "data analysis", "html", "css", "javascript", "api"
]

PROJECT_KEYWORDS = ["project", "developed", "built", "created", "implemented"]

INTERVIEW_QUESTIONS = {
    "python": "Explain lists vs tuples in Python.",
    "flask": "How does Flask handle routing?",
    "sql": "What is the difference between WHERE and HAVING?",
    "machine learning": "What is overfitting?",
    "data analysis": "How do you handle missing data?",
    "html": "What are semantic HTML tags?",
    "css": "Difference between class and id selectors?",
    "javascript": "Explain event bubbling.",
    "api": "What is REST API?"
}

def extract_skills(text):
    text = text.lower()
    return [skill for skill in SKILLS if skill in text]

def extract_projects(resume):
    lines = resume.split("\n")
    projects = []

    for line in lines:
        for key in PROJECT_KEYWORDS:
            if key in line.lower():
                projects.append(line.strip())
                break

    return projects

def summarize_project(project):
    return f"This project demonstrates hands-on experience: {project}"

@app.route("/", methods=["GET", "POST"])
def home():
    score = None
    decision = ""
    matched_skills = []
    missing_skills = []
    projects = []
    project_summaries = []
    interview_questions = []

    if request.method == "POST":
        jd = request.form["jd"].lower()
        resume = request.form["resume"].lower()

        jd_skills = extract_skills(jd)
        resume_skills = extract_skills(resume)

        matched_skills = list(set(jd_skills) & set(resume_skills))
        missing_skills = list(set(jd_skills) - set(resume_skills))

        if jd_skills:
            score = int((len(matched_skills) / len(jd_skills)) * 100)
        else:
            score = 0

        if score >= 70:
            decision = "Highly Recommended"
        elif score >= 40:
            decision = "Can Be Considered"
        else:
            decision = "Not Recommended"

        projects = extract_projects(resume)
        project_summaries = [summarize_project(p) for p in projects]

        for skill in matched_skills:
            if skill in INTERVIEW_QUESTIONS:
                interview_questions.append(INTERVIEW_QUESTIONS[skill])

    return render_template(
        "index.html",
        score=score,
        decision=decision,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        projects=project_summaries,
        questions=interview_questions
    )

if __name__ == "__main__":
    app.run(debug=True)
