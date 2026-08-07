from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, RefreshRequest
from app.schemas.user import UserResponse
from app.services.auth_service import create_user, authenticate_user, generate_tokens, refresh_access_token, get_user_by_id
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await create_user(db, body.email, body.password, body.name)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return generate_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    new_token = refresh_access_token(body.refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return {
        "access_token": new_token,
        "refresh_token": body.refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return user
