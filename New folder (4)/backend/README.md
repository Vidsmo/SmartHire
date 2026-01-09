# Resume Analyzer Backend

This is a simple Flask backend for the resume analyzer app.

## Run locally

1. Create a virtual environment:

   python -m venv venv

2. Activate the venv (Windows PowerShell):

   .\venv\Scripts\Activate.ps1

3. Install dependencies:

   python -m pip install -r requirements.txt

4. Start the server:

   python app.py

The server will run on http://localhost:5000. The frontend files in `../frontend` are served by Flask.

## Bias Control Mode

The API supports a `bias_free` boolean flag on `/analyze` and `/compare` requests. When `bias_free: true` is sent, the server anonymizes the resume and job text (redacting names, gender, age, photo, address/location and replacing college/university with "Institution Redacted") before scoring.

Example request for analyze:

POST /analyze
{
  "job_description": "...",
  "resume": "...",
  "bias_free": true
}

Example request for compare (multiple resumes):

POST /compare
{
  "job_description": "...",
  "resumes": ["resume text A", "resume text B", ...],
  "bias_free": true
}

When bias mode is enabled the response includes `bias_free: true` and `bias_note` that can be displayed in the UI.

## Tests

Run tests with:

    pytest
