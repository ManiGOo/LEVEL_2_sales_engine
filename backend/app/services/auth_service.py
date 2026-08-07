from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token


async def create_user(db: AsyncSession, email: str, password: str, name: str) -> User:
    user = User(email=email, hashed_password=hash_password(password), name=name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.hashed_password):
        return user
    return None


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


def generate_tokens(user_id: str) -> dict:
    return {
        "access_token": create_access_token({"sub": user_id}),
        "refresh_token": create_refresh_token({"sub": user_id}),
        "token_type": "bearer",
    }


def refresh_access_token(refresh_token: str) -> str | None:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None
    return create_access_token({"sub": payload["sub"]})
