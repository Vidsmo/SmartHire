import json
from app import app

client = app.test_client()

print('POST /analyze')
r = client.post('/analyze', json={
    'job_description': 'We need python, flask and sql',
    'resume': 'Experienced with Python and Flask'
})
print(r.status_code)
print(json.dumps(r.get_json(), indent=2))

print('\nPOST /compare')
r = client.post('/compare', json={
    'job_description': 'We need python, flask and sql',
    'resume_a': 'Experienced with Python and Flask',
    'resume_b': 'Experienced with SQL and AWS'
})
print(r.status_code)
print(json.dumps(r.get_json(), indent=2))

print('\nGET /community')
r = client.get('/community')
print(r.status_code)
print(json.dumps(r.get_json(), indent=2))
