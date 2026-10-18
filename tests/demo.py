"""Hosted demo regression checks; run against a fresh temporary demo instance."""
import io
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import zipfile

base = os.environ.get('BASE_URL', 'http://localhost:3000')

def request(path, payload=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + path, data=json.dumps(payload).encode() if payload else None, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

assert request('/api/documents')[0] == 401
assert request('/api/documents/DEMO-001/file')[0] == 401
assert request('/api/auth/login', {'email': 'admin@compliance.app', 'password': 'wrong'})[0] == 401
status, body = request('/api/auth/login', {'email': 'admin@compliance.app', 'password': 'Compliance123!'})
assert status == 200, body
token = json.loads(body)['sessionToken']
status, body = request('/api/documents', token=token)
docs = json.loads(body)['documents']
seed = json.loads(Path('src/lib/demo-seed.json').read_text())
assert len(docs) == 15
for expected in seed['documents']:
    actual = next(doc for doc in docs if doc['id'] == expected['id'])
    assert actual == expected
    status, body = request('/api/documents/' + actual['id'] + '/file?preview=1', token=token)
    if actual['hasFile']:
        import base64
        assert status == 200 and body == base64.b64decode(seed['files'][actual['id']])
    else:
        assert status == 404 and b'no attached certificate' in body
status, body = request('/api/export', token=token)
assert status == 200
with zipfile.ZipFile(io.BytesIO(body)) as archive:
    assert len([name for name in archive.namelist() if name.endswith('.pdf')]) == 14
    assert len(json.loads(archive.read('clearledger-manifest.json'))['documents']) == 15
    assert not any(name.startswith('errors/') for name in archive.namelist())
status, body = request('/login')
assert status == 200 and b'Compliance123!' not in body
assert b'Compliance123!' not in Path('src/app/login/LoginForm.tsx').read_bytes()
print('Demo checks passed: 15 records, 14 original PDFs, protected access, metadata-only record, ZIP and hidden password.')
