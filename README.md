# SmartHire – AI‑Assisted Resume Screening Prototype

SmartHire is a simple web‑based prototype designed to help HR teams reduce manual effort in resume screening.  
It analyzes resumes against a job description, highlights matching skills, extracts projects, and supports better hiring decisions.

This project is built using **free and beginner‑friendly technologies** and focuses on logic‑based analysis instead of paid AI tools.

# Problem Statement
HR teams in startups and small companies spend a lot of time manually screening resumes.  
This leads to delays, bias, inefficiency, and increased operational costs.
SmartHire aims to automate:
- Resume screening
- Skill matching
- Project extraction
- Interview preparation support

# Features
- Resume vs Job Description matching
- Match percentage calculation
- Skill extraction and highlighting
- Project extraction with short summaries
- Basic interview question generation
- Simple and clean UI
- Completely free tech stack

# Tech Stack Used
- **Frontend:** HTML, CSS  
- **Backend:** Python, Flask  
- **Logic:** Rule‑based text analysis (ML‑style approach)  
- **Tools:** Git, GitHub  

# Project Structure
SmartHire/
│
├── app.py
├── templates/
│ └── index.html
├── static/
│ └── style.css
└── README.md

# How It Works
1. User pastes a Job Description and Resume
2. System compares keywords and skills
3. Match score is calculated
4. Resume projects are extracted and summarized
5. HR‑friendly analysis is displayed
   
# How to Run the Project
1. Install Python
2. Install Flask:
   ```bash
   pip install flask
Run the app:

bash
Copy code
python app.py
Open browser and go to:

cpp
Copy code
http://127.0.0.1:5000/
Use Case
This prototype is ideal for:
HR teams in startups
College projects
Hackathons
Learning Flask and resume analysis logic
Future Enhancements
Database storage for resumes
Advanced ML models
Role‑specific interview questions
Admin dashboard for HR

Team
Built as a student project to demonstrate practical use of AI‑assisted automation in HR processes.
Note
This is a prototype, created using simple logic to explain the concept clearly and effectively.
