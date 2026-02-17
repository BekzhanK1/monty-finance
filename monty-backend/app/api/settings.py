from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import get_db
from app.middleware.auth import get_current_user
from app.models.models import User
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingUpdate(BaseModel):
    key: str
    value: str

class SettingsResponse(BaseModel):
    target_amount: str
    target_date: str
    salary_day: str
    base_budget: str
    comfort_budget: str
    savings_budget: str

@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db)
):
    settings = SettingsService.get_all_settings(db)
    return settings

@router.post("")
def update_setting(
    setting: SettingUpdate,
    db: Session = Depends(get_db)
):
    allowed_keys = ["target_amount", "target_date", "salary_day", "base_budget", "comfort_budget", "savings_budget"]
    
    if setting.key not in allowed_keys:
        return {"error": f"Key must be one of: {allowed_keys}"}
    
    SettingsService.set_setting(db, setting.key, setting.value)
    
    return {"success": True, "key": setting.key, "value": setting.value}
