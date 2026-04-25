from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    full_name: str = "Trader"

class User(UserBase):
    id: int
    full_name: str
    is_active: bool
    balance: float

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PortfolioBase(BaseModel):
    symbol: str
    quantity: float
    average_price: float

class Portfolio(PortfolioBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    symbol: str
    type: str
    quantity: float
    price: float

class Transaction(TransactionBase):
    id: int
    owner_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
