.PHONY: backend-run frontend-run dev-up dev-down

backend-run:
	cd monty-backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend-run:
	cd monty-frontend && npm run dev

dev-up:
	docker compose -f docker-compose.dev.yml up --watch

dev-down:
	docker compose -f docker-compose.dev.yml down
