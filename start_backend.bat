@echo off
echo Starting StockSense Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000
