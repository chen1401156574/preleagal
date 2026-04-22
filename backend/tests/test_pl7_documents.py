"""
PL-7 Document CRUD Test Suite
Tests for document persistence and management functionality.
"""
import pytest
import json
import os
import tempfile
from datetime import datetime

import bcrypt
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base


# Copy models from main.py to avoid dependency issues
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=False, index=True)
    template_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    fields = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# Test Database Setup
class TestDatabase:
    def __init__(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        db_url = f"sqlite:///{self.temp_db.name}"
        self.engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = SessionLocal()

    def cleanup(self):
        self.db.close()
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)


@pytest.fixture
def test_db():
    db = TestDatabase()
    yield db
    db.cleanup()


class TestDocumentModel:
    """Test Document model persistence."""

    @pytest.fixture(autouse=True)
    def setup_users(self, test_db):
        """Create test users for each test."""
        user1 = User(
            email="testuser1@example.com",
            hashed_password=get_password_hash("testpassword123"),
        )
        user2 = User(
            email="testuser2@example.com",
            hashed_password=get_password_hash("testpassword456"),
        )
        test_db.db.add(user1)
        test_db.db.add(user2)
        test_db.db.commit()
        test_db.db.refresh(user1)
        test_db.db.refresh(user2)
        self.user1 = user1
        self.user2 = user2

    def test_create_document(self, test_db):
        """Test creating a document directly with DB."""
        document = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="Test NDA Document",
            fields=json.dumps({
                "purpose": "Business partnership",
                "effectiveDate": "2026-05-01"
            })
        )
        test_db.db.add(document)
        test_db.db.commit()
        test_db.db.refresh(document)

        assert document.id is not None
        assert document.user_email == self.user1.email
        assert document.template_id == "nda"
        assert document.title == "Test NDA Document"
        parsed_fields = json.loads(document.fields)
        assert parsed_fields["purpose"] == "Business partnership"

    def test_document_list(self, test_db):
        """Test listing all documents for a user."""
        # Create documents
        for i in range(3):
            doc = Document(
                user_email=self.user1.email,
                template_id="nda",
                title=f"Document {i+1}",
                fields=json.dumps({"test": i})
            )
            test_db.db.add(doc)
        test_db.db.commit()

        # Query documents
        documents = test_db.db.query(Document).filter(
            Document.user_email == self.user1.email
        ).all()

        assert len(documents) == 3
        for i, doc in enumerate(documents):
            assert doc.title == f"Document {i+1}"

    def test_user_isolation(self, test_db):
        """Test that documents are isolated by user."""
        # User 1 creates document
        doc1 = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="User 1's Doc",
            fields=json.dumps({})
        )
        test_db.db.add(doc1)
        test_db.db.commit()

        # User 2 creates document
        doc2 = Document(
            user_email=self.user2.email,
            template_id="csa",
            title="User 2's Doc",
            fields=json.dumps({})
        )
        test_db.db.add(doc2)
        test_db.db.commit()

        # Query - user 1 should only see their document
        user1_docs = test_db.db.query(Document).filter(
            Document.user_email == self.user1.email
        ).all()
        assert len(user1_docs) == 1
        assert user1_docs[0].title == "User 1's Doc"

        # Query - user 2 should only see their document
        user2_docs = test_db.db.query(Document).filter(
            Document.user_email == self.user2.email
        ).all()
        assert len(user2_docs) == 1
        assert user2_docs[0].title == "User 2's Doc"

    def test_document_delete(self, test_db):
        """Test deleting a document."""
        # Create document
        doc = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="To Delete",
            fields=json.dumps({})
        )
        test_db.db.add(doc)
        test_db.db.commit()
        test_db.db.refresh(doc)
        doc_id = doc.id

        # Delete
        test_db.db.delete(doc)
        test_db.db.commit()

        # Verify deletion
        remaining = test_db.db.query(Document).filter(Document.id == doc_id).first()
        assert remaining is None

    def test_document_update(self, test_db):
        """Test updating a document."""
        # Create document
        doc = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="Original Title",
            fields=json.dumps({"purpose": "Original"})
        )
        test_db.db.add(doc)
        test_db.db.commit()
        test_db.db.refresh(doc)

        # Update
        doc.template_id = "csa"
        doc.title = "Updated Title"
        doc.fields = json.dumps({"purpose": "Updated"})
        test_db.db.commit()
        test_db.db.refresh(doc)

        assert doc.template_id == "csa"
        assert doc.title == "Updated Title"
        parsed = json.loads(doc.fields)
        assert parsed["purpose"] == "Updated"

    def test_document_timestamps(self, test_db):
        """Test document created_at and updated_at timestamps."""
        doc = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="Timestamp Test",
            fields=json.dumps({})
        )
        test_db.db.add(doc)
        test_db.db.commit()
        test_db.db.refresh(doc)

        assert doc.created_at is not None
        assert isinstance(doc.created_at, datetime)

        # Update to test updated_at
        doc.title = "Updated"
        test_db.db.commit()
        test_db.db.refresh(doc)

        assert doc.updated_at is not None
        assert isinstance(doc.updated_at, datetime)

    def test_document_with_complex_fields(self, test_db):
        """Test document with complex nested JSON fields."""
        complex_fields = {
            "purpose": "Business Partnership",
            "effectiveDate": "2026-05-01",
            "party1": {
                "name": "John Doe",
                "company": "ACME Corp",
                "address": "123 Main St"
            },
            "party2": {
                "name": "Jane Smith",
                "company": "Beta LLC",
                "address": "456 Oak Ave"
            },
            "customFields": {
                "industry": "Technology",
                "riskLevel": "Medium",
                "reviewed": True
            }
        }

        doc = Document(
            user_email=self.user1.email,
            template_id="nda",
            title="Complex Test",
            fields=json.dumps(complex_fields)
        )
        test_db.db.add(doc)
        test_db.db.commit()
        test_db.db.refresh(doc)

        parsed = json.loads(doc.fields)
        assert parsed["party1"]["company"] == "ACME Corp"
        assert parsed["customFields"]["industry"] == "Technology"
        assert parsed["customFields"]["reviewed"] is True
