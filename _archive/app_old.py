"""
Flask Web Application for pyAux - Spotify Playlist Analyser (archived)
Kept for reference and historical code; not used by current app.py.
"""

# Archived: original Flask app (see root app.py for active code)

import os
from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    return 'Archived app - do not use'

