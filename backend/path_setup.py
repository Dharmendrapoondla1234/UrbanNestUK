"""
Path setup — ensures all backend modules can import each other.
Import this at the top of any entry point (main.py, celery_app.py).
"""
import os, sys

# Add the backend directory to sys.path so that:
#   from db.models import ...         works
#   from ai.gemini_client import ...  works
#   from services.country_config import ... works

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_backend_dir)

for path in [_backend_dir, _project_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)
