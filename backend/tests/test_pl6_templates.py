"""
PL-6 Template System Tests

Tests for template database management, multi-template support, and intent recognition.
"""

import pytest
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Template
from services.template_registry_service import TemplateDatabaseRegistry
from services.template_service import intent_recognizer
from services.chat_service import TEMPLATE_CONFIGS, load_system_prompt, check_missing_fields


# Test Database Setup
TEST_DB_PATH = "sqlite:///:memory:"


@pytest.fixture
def test_db():
    """Create in-memory test database."""
    engine = create_engine(TEST_DB_PATH)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_templates():
    """Sample templates for testing."""
    return [
        {
            "template_id": "nda_test",
            "name": "Mutual NDA (Test)",
            "name_zh": "相互保密协议 (测试)",
            "description": "Test NDA template",
            "priority": 1,
            "status": "active",
            "critical_fields": ["purpose", "effectiveDate", "party1Company"],
            "similar_to": ["csa_test", "dpa_test"]
        },
        {
            "template_id": "csa_test",
            "name": "Cloud Service Agreement (Test)",
            "name_zh": "云服务协议 (测试)",
            "description": "Test CSA template",
            "priority": 2,
            "status": "active"
        }
    ]


class TestTemplateDatabaseRegistry:
    """Tests for TemplateDatabaseRegistry."""

    def test_init_database_from_empty(self, test_db):
        """Test initializing database from config file."""
        registry = TemplateDatabaseRegistry(test_db)
        templates = registry.get_all_templates()
        assert len(templates) > 0

    def test_get_template_by_id(self, test_db, sample_templates):
        """Test getting template by ID."""
        registry = TemplateDatabaseRegistry(test_db)

        # Add test template
        for t in sample_templates:
            template = registry.create_template(t)

        # Retrieve
        retrieved = registry.get_template("nda_test")
        assert retrieved is not None
        assert "id" in retrieved and retrieved["id"] == "nda_test", \
            f"Expected template_id 'nda_test', got {retrieved}"
        assert retrieved["name"] == "Mutual NDA (Test)"
        assert retrieved["name_zh"] == "相互保密协议 (测试)"

    def test_get_all_templates_sorted_by_priority(self, test_db, sample_templates):
        """Test that templates are sorted by priority."""
        registry = TemplateDatabaseRegistry(test_db)

        for t in sample_templates:
            registry.create_template(t)

        templates = registry.get_all_templates()
        priorities = [t["priority"] for t in templates]
        assert priorities == sorted(priorities)

    def test_update_template(self, test_db, sample_templates):
        """Test updating a template."""
        registry = TemplateDatabaseRegistry(test_db)

        # Create
        registry.create_template(sample_templates[0])

        # Update
        updated = registry.update_template("nda_test", {
            "priority": 10,
            "description": "Updated description"
        })

        retrieved = registry.get_template("nda_test")
        assert retrieved["priority"] == 10
        assert retrieved["description"] == "Updated description"

    def test_delete_template(self, test_db, sample_templates):
        """Test deleting a template."""
        registry = TemplateDatabaseRegistry(test_db)

        registry.create_template(sample_templates[0])
        assert registry.get_template("nda_test") is not None

        result = registry.delete_template("nda_test")
        assert result is True
        assert registry.get_template("nda_test") is None

    def test_search_templates(self, test_db, sample_templates):
        """Test searching templates by name or description."""
        registry = TemplateDatabaseRegistry(test_db)

        for t in sample_templates:
            registry.create_template(t)

        results = registry.search_templates("NDA")
        assert len(results) >= 1
        assert any("NDA" in r["name"] for r in results)

    def test_get_similar_templates(self, test_db, sample_templates):
        """Test getting similar templates."""
        registry = TemplateDatabaseRegistry(test_db)

        for t in sample_templates:
            registry.create_template(t)

        similar = registry.get_similar_templates("nda_test")
        assert similar is not None


class TestMultiTemplateChatService:
    """Tests for multi-template chat service."""

    def test_template_configs_exist(self):
        """Test that template configs are defined."""
        assert "nda" in TEMPLATE_CONFIGS
        assert "csa" in TEMPLATE_CONFIGS
        assert "dpa" in TEMPLATE_CONFIGS

    def test_template_configs_have_required_fields(self):
        """Test that all template configs have required data."""
        required_keys = ["critical_fields", "optional_fields", "guided_steps"]
        for template_id, config in TEMPLATE_CONFIGS.items():
            for key in required_keys:
                assert key in config, f"Template {template_id} missing {key}"
            assert len(config["critical_fields"]) > 0
            assert len(config["guided_steps"]) > 0

    def test_load_system_prompt(self):
        """Test loading system prompts."""
        for template_id in ["nda", "csa", "dpa"]:
            prompt = load_system_prompt(template_id)
            assert prompt is not None
            assert len(prompt) > 100
            assert "fields" in prompt.lower() or "extract" in prompt.lower()

    def test_check_missing_fields_nda(self):
        """Test checking missing fields for NDA."""
        # Empty fields
        missing = check_missing_fields({}, "nda")
        assert len(missing) > 0

        # Partial fields
        partial = {"purpose": "test", "effectiveDate": "2026-04-22"}
        missing = check_missing_fields(partial, "nda")
        assert len(missing) < len(check_missing_fields({}, "nda"))

    def test_check_missing_fields_csa(self):
        """Test checking missing fields for CSA."""
        missing = check_missing_fields({}, "csa")
        assert len(missing) > 0
        assert "serviceProvider" in missing

    def test_check_missing_fields_dpa(self):
        """Test checking missing fields for DPA."""
        missing = check_missing_fields({}, "dpa")
        assert len(missing) > 0
        assert "dataExporter" in missing


class TestIntentRecognition:
    """Tests for intent recognition (skip API-dependent tests)."""

    def test_intent_recognition_module_exists(self):
        """Verify intent recognizer module is importable."""
        from services.template_service import intent_recognizer
        assert intent_recognizer is not None
        assert hasattr(intent_recognizer, 'recognize_intent')

    def test_recognize_intent_is_coroutine(self):
        """Verify recognize_intent returns coroutine."""
        import asyncio
        from services.template_service import intent_recognizer
        from pathlib import Path
        import os

        # Temporarily set up env for testing
        os.environ.setdefault("OPENROUTER_API_KEY", "test-key-for-unit-tests")

        result = intent_recognizer.recognize_intent("test request")
        assert asyncio.iscoroutine(result)


class TestTemplatePromptFiles:
    """Tests for template prompt files."""

    def test_prompt_files_exist(self):
        """Test that all prompt files exist."""
        prompts_dir = Path(__file__).resolve().parents[2] / "backend" / "prompts"

        required_files = [
            "nda_system_prompt.txt",
            "csa_system_prompt.txt",
            "dpa_system_prompt.txt"
        ]

        for prompt_file in required_files:
            file_path = prompts_dir / prompt_file
            assert file_path.exists(), f"Prompt file {prompt_file} not found"
            assert file_path.stat().st_size > 0


class TestConfigFiles:
    """Tests for configuration files."""

    def test_templates_json_exists(self):
        """Test that templates.json exists."""
        config_path = Path(__file__).resolve().parents[2] / "config" / "templates.json"
        assert config_path.exists(), "templates.json not found"

    def test_templates_json_valid(self):
        """Test that templates.json is valid JSON."""
        import json
        config_path = Path(__file__).resolve().parents[2] / "config" / "templates.json"

        with open(config_path, 'r', encoding='utf-8') as f:
            templates = json.load(f)

        assert isinstance(templates, list)
        assert len(templates) == 11, "Should have 11 templates"

        # Check required fields
        required_fields = ["id", "name"]
        for template in templates:
            for field in required_fields:
                assert field in template, f"Template missing {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
