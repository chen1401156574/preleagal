# Template database models for PL-6

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, SmallInteger, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Template(Base):
    """Template metadata stored in database for dynamic management."""
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    name_zh = Column(String)
    description = Column(Text)
    description_zh = Column(Text)
    prompt_file = Column(String)
    priority = Column(SmallInteger, default=99)
    status = Column(String, default="active")  # active, draft, deprecated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Related templates
    fallback_for = Column(Text)  # JSON string of template IDs this template can fallback to
    similar_to = Column(Text)    # JSON string of similar template IDs

    # Template fields definition
    critical_fields = Column(Text)    # JSON string of critical field names
    optional_fields = Column(Text)    # JSON string of optional field names
    guided_steps = Column(Text)       # JSON string of guided step tuples
