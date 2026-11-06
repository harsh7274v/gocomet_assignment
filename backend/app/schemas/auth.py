from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.user import UserRole

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    carrier_name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class SupplierProfileResponse(BaseModel):
    id: str
    carrier_name: str
    contact_number: Optional[str]
    address: Optional[str]

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    supplier_profile: Optional[SupplierProfileResponse] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
