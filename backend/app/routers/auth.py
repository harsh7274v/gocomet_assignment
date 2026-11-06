from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole, SupplierProfile
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    SupplierProfileResponse,
)
from app.routers.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    if user_in.role == UserRole.SUPPLIER:
        carrier = user_in.carrier_name or user_in.full_name
        profile = SupplierProfile(
            user_id=user.id,
            carrier_name=carrier,
            contact_number=user_in.contact_number,
            address=user_in.address,
        )
        db.add(profile)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive account.")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/suppliers", response_model=List[dict])
def list_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns registered suppliers so buyers can select them in the invite step.
    """
    suppliers = (
        db.query(User)
        .filter(User.role == UserRole.SUPPLIER, User.is_active == True)
        .all()
    )
    result = []
    for s in suppliers:
        carrier = s.supplier_profile.carrier_name if s.supplier_profile else s.full_name
        result.append({
            "id": s.id,
            "email": s.email,
            "full_name": s.full_name,
            "carrier_name": carrier
        })
    return result
