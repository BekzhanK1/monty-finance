from typing import Optional

from app.models.models import Settings
from sqlalchemy.orm import Session


class SettingsService:
    # Список ключей настройки — всё хранится только в БД (таблица settings).
    # Значения задаются через UI (настройки), в коде дефолтов нет.
    SETTINGS_KEYS = ("target_amount", "target_date", "salary_day", "total_budget")

    @staticmethod
    def get_setting(db: Session, key: str) -> Optional[str]:
        setting = db.query(Settings).filter(Settings.key == key).first()
        return setting.value if setting else None

    @staticmethod
    def set_setting(db: Session, key: str, value: str) -> Settings:
        setting = db.query(Settings).filter(Settings.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = Settings(key=key, value=value)
            db.add(setting)
        db.commit()
        db.refresh(setting)
        return setting

    @staticmethod
    def get_all_settings(db: Session) -> dict:
        result = {}
        for key in SettingsService.SETTINGS_KEYS:
            val = SettingsService.get_setting(db, key)
            result[key] = val if val is not None else ""
        return result

    @staticmethod
    def get_target_amount(db: Session) -> int:
        val = SettingsService.get_setting(db, "target_amount")
        return int(val) if val else 0

    @staticmethod
    def get_target_date(db: Session) -> str:
        val = SettingsService.get_setting(db, "target_date")
        return val or ""

    @staticmethod
    def get_salary_day(db: Session) -> int:
        val = SettingsService.get_setting(db, "salary_day")
        return int(val) if val else 1

    @staticmethod
    def get_total_budget(db: Session) -> int:
        val = SettingsService.get_setting(db, "total_budget")
        return int(val) if val else 0
