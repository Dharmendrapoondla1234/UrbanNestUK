FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

EXPOSE 8000

# api/main.py is at /app/api/main.py when built from backend/ context
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
