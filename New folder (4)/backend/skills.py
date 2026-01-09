import re
from typing import List

# Canonical skill list used for extraction
SKILLS = [
    "html", "css", "javascript", "react", "git",
    "python", "flask", "sql", "aws", "docker", "kubernetes","java"
    "problem solving", "communication", "teamwork",
    "java", "spring", "hibernate", "machine learning", "ai", "tensorflow", "pytorch",
    "devops", "ci/cd", "jenkins", "leadership", "management", "agile", "scrum",
    "c#", "dotnet", ".net", "c++", "php", "ruby", "go", "rust", "scala",
    "mongodb", "mysql", "postgresql", "oracle", "redis", "elasticsearch",
    "azure", "gcp", "google cloud", "terraform", "ansible", "puppet",
    "angular", "vue", "svelte", "jquery", "bootstrap", "sass", "less",
    "linux", "windows", "macos", "bash", "powershell", "shell scripting",
    "rest api", "graphql", "microservices", "serverless", "lambda",
    "testing", "unit testing", "integration testing", "selenium", "jest", "pytest",
    "security", "encryption", "oauth", "jwt", "cybersecurity",
    "data analysis", "pandas", "numpy", "matplotlib", "seaborn", "tableau",
    "big data", "hadoop", "spark", "kafka", "airflow"
]

# Simple synonyms mapping
SYNONYMS = {
    "js": "javascript",
    "py": "python",
    "aws": "aws",
    "ml": "machine learning",
    "ai": "ai",
    "devops": "devops",
    "c#": "c#",
    ".net": "dotnet",
    "c++": "c++",
    "php": "php",
    "ruby": "ruby",
    "go": "go",
    "rust": "rust",
    "scala": "scala",
    "mongo": "mongodb",
    "mysql": "mysql",
    "postgres": "postgresql",
    "oracle": "oracle",
    "redis": "redis",
    "azure": "azure",
    "gcp": "gcp",
    "google cloud": "google cloud",
    "terraform": "terraform",
    "ansible": "ansible",
    "angular": "angular",
    "vue": "vue",
    "jquery": "jquery",
    "bootstrap": "bootstrap",
    "sass": "sass",
    "linux": "linux",
    "windows": "windows",
    "macos": "macos",
    "bash": "bash",
    "powershell": "powershell",
    "rest": "rest api",
    "graphql": "graphql",
    "microservices": "microservices",
    "serverless": "serverless",
    "testing": "testing",
    "unit testing": "unit testing",
    "selenium": "selenium",
    "jest": "jest",
    "pytest": "pytest",
    "security": "security",
    "oauth": "oauth",
    "jwt": "jwt",
    "data analysis": "data analysis",
    "pandas": "pandas",
    "numpy": "numpy",
    "matplotlib": "matplotlib",
    "tableau": "tableau",
    "big data": "big data",
    "hadoop": "hadoop",
    "spark": "spark",
    "kafka": "kafka"
}


def extract_skills(text: str) -> List[str]:
    """Extract known skills from plain text (case-insensitive).

    Uses word boundaries and a synonyms map to improve matching.
    """
    text = (text or "").lower()
    found = set()

    for skill in SKILLS:
        pattern = rf"\b{re.escape(skill)}\b"
        if re.search(pattern, text):
            found.add(skill)

    for syn, norm in SYNONYMS.items():
        if re.search(rf"\b{re.escape(syn)}\b", text):
            found.add(norm)

    return sorted(found)


def anonymize_text(text: str) -> str:
    """Redact personal identifiers from resume text for bias‑free evaluation.

    Rules (simple, deterministic):
    - Replace lines starting with 'Name:', 'Gender:', 'Age:', 'Photo:', 'Address:', 'Location:' with 'REDACTED'.
    - Replace 'College'/'University'/'Institution' occurrences with 'Institution Redacted'.
    - Remove common personal tokens like emails and phone numbers (basic regex).

    This function aims to provide deterministic, explainable anonymization suitable for the demo.
    """
    if not text:
        return text

    lines = text.splitlines()
    redacted_lines = []
    for line in lines:
        stripped = line.strip()
        lowered = stripped.lower()
        if any(lowered.startswith(prefix) for prefix in ("name:", "gender:", "age:", "photo:", "address:", "location:")):
            redacted_lines.append("REDACTED")
            continue
        # If the line mentions a college/university/institution, redact the whole line
        if re.search(r"\b(college|university|institution)\b", lowered, flags=re.IGNORECASE):
            redacted_lines.append("Institution Redacted")
            continue
        # Remove emails
        line = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[redacted email]", line)
        # Remove phone numbers (simple patterns)
        line = re.sub(r"\+?\d[\d()\-\s]{6,}\d", "[redacted phone]", line)
        redacted_lines.append(line)

    return "\n".join(redacted_lines)
