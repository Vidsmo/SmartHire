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

## Docs Generator

The `/generate-doc` endpoint generates common HR documents (offer letters, rejection emails, NDAs, internship agreements). If an AI model is configured (via `GEMINI_API_KEY`), the server uses it. If the model is unavailable or an error occurs the server falls back to a local template generator so the Docs Generator remains functional.

Example request:

POST /generate-doc
{
  "type": "offer_letter",
  "candidate_info": "Jane Doe",
  "job_info": "Senior Backend Engineer, INR 120,000/month"
}

Response (200):
{
  "document": "...generated text..."
}

## Tests

Run tests with:

    pytest
