@echo off
echo Starting DevOps Ecosystem Platform...

start "PPG System :8001" cmd /k "cd backend\ppg && python -m uvicorn app.main:app --port 8001 --reload"
timeout /t 5 /nobreak > nul

start "BA Workflow :8002" cmd /k "cd backend\ba-workflow && python -m uvicorn app.main:app --port 8002 --reload"
timeout /t 3 /nobreak > nul

start "Test Platform :8003" cmd /k "cd backend\test-platform && python -m uvicorn app.main:app --port 8003 --reload"
timeout /t 3 /nobreak > nul

start "Frontend :5173" cmd /k "cd frontend && npm run dev"

echo.
echo All services starting...
echo PPG:      http://localhost:8001/docs
echo BA:       http://localhost:8002/docs
echo Test:     http://localhost:8003/docs
echo Frontend: http://localhost:5173
echo.
echo Default login: admin / admin123