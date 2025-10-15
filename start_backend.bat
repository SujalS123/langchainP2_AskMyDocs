@echo off
cd backend
call venvv\Scripts\activate
pip install -r requirements.txt
python main.py