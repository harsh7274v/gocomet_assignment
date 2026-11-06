from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel
from app.models.activity_log import EventType

class ActivityLogResponse(BaseModel):
    id: str
    rfq_id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    event_type: EventType
    description: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
