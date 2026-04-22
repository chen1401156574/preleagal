import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models import Base, Template
from dotenv import load_dotenv

# Ensure .env is loaded
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


class TemplateDatabaseRegistry:
    """Database-backed template registry with CRUD operations."""

    def __init__(self, db: Session):
        self.db = db
        self._init_database()

    def _init_database(self):
        """Initialize templates from config if database is empty."""
        templates = self.db.query(Template).all()
        if not templates:
            self._load_from_config()

    def _load_from_config(self):
        """Load templates from templates.json into database."""
        config_path = PROJECT_ROOT / "config" / "templates.json"
        if not config_path.exists():
            return

        with open(config_path, 'r', encoding='utf-8') as f:
            templates_data = json.load(f)

        for t in templates_data:
            # Check if template already exists
            existing = self.db.query(Template).filter(
                Template.template_id == t['id']
            ).first()

            if existing:
                # Update existing template
                existing.name = t['name']
                existing.name_zh = t.get('name_zh')
                existing.description = t['description']
                existing.description_zh = t.get('description_zh')
                existing.prompt_file = t.get('prompt_file')
                existing.priority = t.get('priority', 99)
                existing.fallback_for = json.dumps(t.get('fallback_for', []))
                existing.similar_to = json.dumps(t.get('similar_to', []))
            else:
                # Create new template
                new_template = Template(
                    template_id=t['id'],
                    name=t['name'],
                    name_zh=t.get('name_zh'),
                    description=t['description'],
                    description_zh=t.get('description_zh'),
                    prompt_file=t.get('prompt_file'),
                    priority=t.get('priority', 99),
                    fallback_for=json.dumps(t.get('fallback_for', [])),
                    similar_to=json.dumps(t.get('similar_to', [])),
                    # Set up default critical/optional fields based on template type
                    critical_fields=self._get_default_critical_fields(t['id']),
                    optional_fields=self._get_default_optional_fields(t['id']),
                    guided_steps=self._get_default_guided_steps(t['id'])
                )
                self.db.add(new_template)

        self.db.commit()

    def _get_default_critical_fields(self, template_id: str) -> str:
        """Get default critical fields based on template type."""
        defaults = {
            'nda': ["purpose", "effectiveDate", "party1Company", "party1Name", "party2Company", "party2Name", "governingLaw", "jurisdiction"],
            'csa': ["purpose", "effectiveDate", "serviceProvider", "customer", "serviceDescription", "serviceTerm", "governingLaw", "paymentTerms"],
            'dpa': ["purpose", "effectiveDate", "dataExporter", "dataImporter", "dataCategories", "processingPurpose", "dataTransfers", "governingLaw"]
        }
        return json.dumps(defaults.get(template_id, []))

    def _get_default_optional_fields(self, template_id: str) -> str:
        """Get default optional fields based on template type."""
        defaults = {
            'nda': ["mndaTerm", "confidentialityTerm", "mndaTermValue"],
            'csa': ["serviceLevel", "dataLocation", "securityStandards"],
            'dpa': ["securityMeasures", "subProcessors", "dataRetention"]
        }
        return json.dumps(defaults.get(template_id, []))

    def _get_default_guided_steps(self, template_id: str) -> str:
        """Get default guided steps based on template type."""
        defaults = {
            'nda': [["purpose", ["purpose"]], ["parties", ["party1Company", "party1Name", "party2Company", "party2Name"]], ["governingLaw", ["governingLaw", "jurisdiction"]]],
            'csa': [["purpose", ["purpose"]], ["parties", ["serviceProvider", "customer"]], ["serviceDescription", ["serviceDescription"]], ["serviceTerm", ["serviceTerm"]], ["governingLaw", ["governingLaw", "paymentTerms"]]],
            'dpa': [["purpose", ["purpose"]], ["parties", ["dataExporter", "dataImporter"]], ["dataCategories", ["dataCategories"]], ["processingPurpose", ["processingPurpose"]], ["dataTransfers", ["dataTransfers"]], ["governingLaw", ["governingLaw"]]]
        }
        return json.dumps(defaults.get(template_id, []))

    def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all templates sorted by priority."""
        templates = self.db.query(Template).order_by(Template.priority).all()
        return [self._template_to_dict(t) for t in templates]

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific template by ID."""
        template = self.db.query(Template).filter(
            Template.template_id == template_id
        ).first()
        return self._template_to_dict(template) if template else None

    def get_template_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get template by name (case-insensitive)."""
        template = self.db.query(Template).filter(
            Template.name.ilike(name)
        ).first()
        return self._template_to_dict(template) if template else None

    def create_template(self, data: Dict[str, Any]) -> Template:
        """Create a new template."""
        new_template = Template(
            template_id=data['template_id'],
            name=data['name'],
            name_zh=data.get('name_zh'),
            description=data.get('description'),
            description_zh=data.get('description_zh'),
            prompt_file=data.get('prompt_file'),
            priority=data.get('priority', 99),
            status=data.get('status', 'active'),
            fallback_for=json.dumps(data.get('fallback_for', [])),
            similar_to=json.dumps(data.get('similar_to', [])),
            critical_fields=json.dumps(data.get('critical_fields', [])),
            optional_fields=json.dumps(data.get('optional_fields', [])),
            guided_steps=json.dumps(data.get('guided_steps', []))
        )
        self.db.add(new_template)
        self.db.commit()
        return new_template

    def update_template(self, template_id: str, data: Dict[str, Any]) -> Optional[Template]:
        """Update an existing template."""
        template = self.db.query(Template).filter(
            Template.template_id == template_id
        ).first()

        if not template:
            return None

        for key, value in data.items():
            if hasattr(template, key):
                if key in ['fallback_for', 'similar_to', 'critical_fields', 'optional_fields', 'guided_steps']:
                    setattr(template, key, json.dumps(value))
                else:
                    setattr(template, key, value)

        template.updated_at = datetime.utcnow()
        self.db.commit()
        return template

    def delete_template(self, template_id: str) -> bool:
        """Delete a template."""
        template = self.db.query(Template).filter(
            Template.template_id == template_id
        ).first()

        if not template:
            return False

        self.db.delete(template)
        self.db.commit()
        return True

    def get_supported_templates(self) -> List[str]:
        """Get list of template IDs that are fully supported (active)."""
        templates = self.db.query(Template).filter(
            Template.status == 'active'
        ).all()
        return [t.template_id for t in templates]

    def get_fallback_templates(self, target_template_id: str) -> List[Dict[str, Any]]:
        """Get templates that can fallback to the target template."""
        templates = self.db.query(Template).filter(
            Template.fallback_for != None
        ).all()

        target_id_list = []
        for t in templates:
            try:
                fallback_list = json.loads(t.fallback_for)
                if target_template_id in fallback_list:
                    target_id_list.append(self._template_to_dict(t))
            except (json.JSONDecodeError, TypeError):
                continue

        return target_id_list

    def get_similar_templates(self, template_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get similar templates for a given template."""
        target = self.get_template(template_id)
        if not target:
            return []

        similar_list = []
        try:
            similar_list = json.loads(target.get('similar_to', '[]'))
        except (json.JSONDecodeError, TypeError):
            pass

        return [self.get_template(tid) for tid in similar_list[:limit] if self.get_template(tid)]

    def search_templates(self, query: str) -> List[Dict[str, Any]]:
        """Search templates by name or description."""
        templates = self.db.query(Template).filter(
            Template.name.ilike(f"%{query}%") |
            Template.description.ilike(f"%{query}%")
        ).all()
        return [self._template_to_dict(t) for t in templates]

    def _template_to_dict(self, template: Template) -> Dict[str, Any]:
        """Convert Template object to dictionary."""
        if not template:
            return {}

        return {
            'id': template.template_id,
            'name': template.name,
            'name_zh': template.name_zh,
            'description': template.description,
            'description_zh': template.description_zh,
            'prompt_file': template.prompt_file,
            'priority': template.priority,
            'status': template.status,
            'fallback_for': self._parse_json(template.fallback_for, []),
            'similar_to': self._parse_json(template.similar_to, []),
            'critical_fields': self._parse_json(template.critical_fields, []),
            'optional_fields': self._parse_json(template.optional_fields, []),
            'guided_steps': self._parse_json(template.guided_steps, [])
        }

    @staticmethod
    def _parse_json(value: Optional[str], default: Any) -> Any:
        """Safely parse JSON string."""
        if not value:
            return default
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return default


# Singleton instance helper
def get_template_registry(db: Session) -> TemplateDatabaseRegistry:
    """Get template registry for the given database session."""
    return TemplateDatabaseRegistry(db)


# Backward compatibility exports for test imports
template_registry = None
intent_recognizer = None
