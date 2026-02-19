.PHONY: backend-run frontend-run

backend-run:
	cd monty-backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend-run:
	cd monty-frontend && npm run dev
