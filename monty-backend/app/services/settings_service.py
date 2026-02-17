from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Settings

class SettingsService:
    SETTINGS_KEYS = {
        "target_amount": "1500000",
        "target_date": "2025-07-01",
        "salary_day": "10",
        "base_budget": "270000",
        "comfort_budget": "195000",
        "savings_budget": "150000",
    }
    
    @staticmethod
    def get_setting(db: Session, key: str) -> Optional[str]:
        setting = db.query(Settings).filter(Settings.key == key).first()
        if setting:
            return setting.value
        return SettingsService.SETTINGS_KEYS.get(key)
    
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
            result[key] = SettingsService.get_setting(db, key)
        return result
    
    @staticmethod
    def get_target_amount(db: Session) -> int:
        return int(SettingsService.get_setting(db, "target_amount") or 1500000)
    
    @staticmethod
    def get_target_date(db: Session) -> str:
        return SettingsService.get_setting(db, "target_date") or "2025-07-01"
    
    @staticmethod
    def get_salary_day(db: Session) -> int:
        return int(SettingsService.get_setting(db, "salary_day") or 10)
