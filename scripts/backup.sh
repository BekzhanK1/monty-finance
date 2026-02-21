#!/usr/bin/env bash
# Бэкап БД Monty и отправка в Telegram.
# Запуск вручную: ./scripts/backup.sh
# Ежедневно в 23:00: добавить в crontab -e строку:
# 0 23 * * * /bin/bash /path/to/monty/scripts/backup.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="monty_backup_${DATE}.sql"

# Загрузка TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID из .env бэкенда
if [ -f "monty-backend/.env" ]; then
  set -a
  source monty-backend/.env
  set +a
fi

echo "[$(date)] Creating backup $BACKUP_FILE ..."
docker compose exec -T db pg_dump -U postgres monty > "$BACKUP_FILE" 2>/dev/null || {
  echo "[$(date)] ERROR: pg_dump failed. Is 'db' container running? (docker compose up -d)" >&2
  exit 1
}

if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date)] ERROR: Backup file is empty." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "[$(date)] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Backup saved as $BACKUP_FILE (not sent)." >&2
  exit 0
fi

echo "[$(date)] Sending backup to Telegram (за $DATE) ..."
CAPTION="Backup Monty за ${DATE}"
if curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
  -F "chat_id=${TELEGRAM_CHAT_ID}" \
  -F "document=@${BACKUP_FILE}" \
  -F "caption=${CAPTION}" > /tmp/telegram_backup_resp.json; then
  if grep -q '"ok":true' /tmp/telegram_backup_resp.json 2>/dev/null; then
    echo "[$(date)] Backup sent to Telegram."
  else
    echo "[$(date)] Telegram API error: $(cat /tmp/telegram_backup_resp.json)" >&2
  fi
else
  echo "[$(date)] ERROR: Failed to send to Telegram." >&2
fi

rm -f "$BACKUP_FILE"
echo "[$(date)] Done."
