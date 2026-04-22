@echo off
echo Installing DevOps Ecosystem Platform dependencies...

echo [1/4] PPG System...
cd backend\ppg && pip install -r requirements.txt
cd ..\..

echo [2/4] BA Workflow...
cd backend\ba-workflow && pip install -r requirements.txt
cd ..\..

echo [3/4] Test Platform...
cd backend\test-platform && pip install -r requirements.txt
cd ..\..

echo [4/4] Frontend...
cd frontend && npm install
cd ..

echo.
echo Done!
echo Next step: psql -U postgres -f infra/init.sql
echo Then run:  start.bat
