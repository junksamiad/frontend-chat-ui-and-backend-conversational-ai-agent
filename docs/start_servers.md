*** Start Back End Server: uvicorn server:app --reload --port 8001 ***

must have the venv up and running in the root urmston_town_web_agent dir first, and then cd into urmston_town_web_agent

pip install -r requirements.txt in dir on first initialisation 

*** Start Front End Web Server: cd apps/web && pnpm dev (http://localhost:3000/chat) ***

must have the venv up and running in the root urmston_town_web_agent dir first, and then cd into urmston_town_web_agent

pnpm install in dir on first intialisation

source .venv/bin/activate

--------

When running in Docker, use Docker Compose file to start both servers:

(source urmston_town_web_agent/venv/bin/activate && cd urmston_town_web_agent)

docker compose up

Or to rebuild after changes:

docker compose up --build
docker-compose build --no-cache frontend
docker-compose up -d --force-recreate frontend

To see logs:
docker-compose logs -f (to follow).

To stop services:

docker compose down 
docker compose down -v

--------


Launch CLI version
python agents_sdk_lee/go.py
python -m chatbot_src.go

Chat UI (frontend web seerver - currently a local uivicorn server) apps/web/pnpm

Agent (back end server - currently a local back end FastAPI server) main_web.py


Activate VENV
source urmston_town_web_agent/venv/bin/activate && cd urmston_town_web_agent

cd urmston_town_web_agent
pip install -r requirements.txt