from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, SmallInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import jwt
import os
import json
from services.chat_service import get_chat_response, check_missing_fields, get_missing_fields_prompt
from services.template_service import intent_recognizer, LegacyTemplateRegistry
from services.template_registry_service import TemplateDatabaseRegistry, get_template_registry

# Configuration
DATABASE_URL = "sqlite:///./users.db"
TEMPLATE_DB_URL = "sqlite:///./templates.db"
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
template_engine = create_engine(TEMPLATE_DB_URL, connect_args={"check_same_thread": False})
TemplateSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=template_engine)

Base = declarative_base()


# Template Model
class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    name_zh = Column(String)
    description = Column(Text)
    description_zh = Column(Text)
    prompt_file = Column(String)
    priority = Column(SmallInteger, default=99)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    fallback_for = Column(Text)
    similar_to = Column(Text)
    critical_fields = Column(Text)
    optional_fields = Column(Text)
    guided_steps = Column(Text)


# Initialize template database
Base.metadata.create_all(bind=template_engine)

# Global registry instances
db_registry: Optional[TemplateDatabaseRegistry] = None
file_registry = LegacyTemplateRegistry()


# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)

# API Models
class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    currentFields: Optional[Dict[str, str]] = None
    templateType: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    fields: Dict[str, str]
    missingFields: Optional[List[str]] = None
    templateType: Optional[str] = None


class IntentRecognitionRequest(BaseModel):
    userRequest: str


class IntentRecognitionResponse(BaseModel):
    matched: bool
    requested_template: str
    similar_templates: List[Dict[str, Any]]
    response_en: str
    response_zh: str
    supported_templates: List[Dict[str, str]]


class TemplateCreate(BaseModel):
    template_id: str
    name: str
    name_zh: Optional[str] = None
    description: Optional[str] = None
    description_zh: Optional[str] = None
    prompt_file: Optional[str] = None
    priority: Optional[int] = 99
    status: Optional[str] = "active"
    fallback_for: Optional[List[str]] = None
    similar_to: Optional[List[str]] = None
    critical_fields: Optional[List[str]] = None
    optional_fields: Optional[List[str]] = None
    guided_steps: Optional[List[List[str]]] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    name_zh: Optional[str] = None
    description: Optional[str] = None
    description_zh: Optional[str] = None
    prompt_file: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    fallback_for: Optional[List[str]] = None
    similar_to: Optional[List[str]] = None
    critical_fields: Optional[List[str]] = None
    optional_fields: Optional[List[str]] = None
    guided_steps: Optional[List[List[str]]] = None


# FastAPI app
app = FastAPI(title="Prelegal API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_template_db():
    db = TemplateSessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user_header(token: str = Header(None), db: Session = Depends(get_db)):
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to Prelegal API", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/login")
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(get_current_user_header)):
    return current_user


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    messages_dict = [{"role": m.role, "content": m.content} for m in request.messages]
    template_type = request.templateType or 'nda'
    response = await get_chat_response(messages_dict, request.currentFields, template_type)
    missing_fields = None
    if request.currentFields is not None:
        merged_fields = dict(request.currentFields)
        merged_fields.update(response.get("fields", {}))
        missing = check_missing_fields(merged_fields, template_type)
        if missing:
            missing_fields = missing
    return ChatResponse(
        reply=response["reply"],
        fields=response["fields"],
        missingFields=missing_fields,
        templateType=template_type
    )


@app.post("/api/intent", response_model=IntentRecognitionResponse)
async def recognize_intent(request: IntentRecognitionRequest):
    result = await intent_recognizer.recognize_intent(request.userRequest)
    return IntentRecognitionResponse(**result)


# Template Management API Endpoints
@app.get("/api/templates", dependencies=[Depends(get_template_db)])
async def list_templates(template_db: Session = Depends(get_template_db)):
    """Get all available templates from database."""
    registry = TemplateDatabaseRegistry(template_db)
    templates = registry.get_all_templates()
    return {"templates": templates}


@app.get("/api/templates/{template_id}", dependencies=[Depends(get_template_db)])
async def get_template(template_id: str, template_db: Session = Depends(get_template_db)):
    """Get a specific template by ID."""
    registry = TemplateDatabaseRegistry(template_db)
    template = registry.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": template}


@app.post("/api/templates", dependencies=[Depends(get_template_db)])
async def create_template(
    template_data: TemplateCreate,
    template_db: Session = Depends(get_template_db)
):
    """Create a new template."""
    registry = TemplateDatabaseRegistry(template_db)
    try:
        new_template = registry.create_template(template_data.dict(exclude_unset=True))
        return {"template": registry._template_to_dict(new_template), "message": "Template created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/templates/{template_id}", dependencies=[Depends(get_template_db)])
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    template_db: Session = Depends(get_template_db)
):
    """Update an existing template."""
    registry = TemplateDatabaseRegistry(template_db)
    updated_template = registry.update_template(template_id, template_data.dict(exclude_unset=True))
    if not updated_template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": registry._template_to_dict(updated_template), "message": "Template updated successfully"}


@app.delete("/api/templates/{template_id}", dependencies=[Depends(get_template_db)])
async def delete_template(
    template_id: str,
    template_db: Session = Depends(get_template_db)
):
    """Delete a template."""
    registry = TemplateDatabaseRegistry(template_db)
    if not registry.delete_template(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@app.get("/api/templates/search", dependencies=[Depends(get_template_db)])
async def search_templates(
    q: str,
    template_db: Session = Depends(get_template_db)
):
    """Search templates by name or description."""
    registry = TemplateDatabaseRegistry(template_db)
    templates = registry.search_templates(q)
    return {"templates": templates, "query": q}
