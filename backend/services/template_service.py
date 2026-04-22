import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from .template_registry_service import template_registry, intent_recognizer

# Re-export for backward compatibility
from .template_registry_service import TemplateDatabaseRegistry, get_template_registry

# Maintain backward compatibility with old template registry
class LegacyTemplateRegistry:
    """Legacy registry that falls back to file-based template config."""

    def __init__(self):
        self._templates: Dict[str, Dict[str, Any]] = {}
        self._load_templates()

    def _load_templates(self):
        """Load templates from config file."""
        config_path = Path(__file__).resolve().parents[2] / "config" / "templates.json"
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                templates = json.load(f)
                for t in templates:
                    self._templates[t['id']] = t

    def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all templates sorted by priority."""
        return sorted(self._templates.values(), key=lambda x: x.get('priority', 999))

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific template by ID."""
        return self._templates.get(template_id)

    def get_template_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get template by name (case-insensitive)."""
        name_lower = name.lower()
        for t in self._templates.values():
            if t['name'].lower() == name_lower or t.get('name_zh', '').lower() == name_lower:
                return t
        return None

    def get_supported_template_ids(self) -> List[str]:
        """Get list of fully supported template IDs."""
        return ['nda', 'csa', 'dpa']

    def is_template_supported(self, template_id: str) -> bool:
        """Check if a template is fully supported."""
        return template_id in self.get_supported_template_ids()


# Legacy instance for backward compatibility
template_registry = LegacyTemplateRegistry()

# Intent recognizer (kept as is)
from .chat_service import _detect_language, _get_openrouter_api_key
import httpx
import os

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class IntentRecognizer:
    """Recognizes user intent when template is not in supported list."""

    SYSTEM_PROMPT = """You are a legal document assistant that helps identify which document template best matches a user's request.

SUPPORTED TEMPLATES:
1. Mutual NDA (相互保密协议) - Basic non-disclosure agreement
2. Cloud Service Agreement (云服务协议) - Cloud service provider terms with data processing
3. Data Processing Agreement (数据处理协议/GDPR DPA) - GDPR compliance and data protection

WHEN USER REQUESTS UNAVAILABLE TEMPLATE:
1. Analyze what the user actually needs based on their description
2. Identify the 2-3 MOST SIMILAR templates from the supported list
3. Provide brief reasoning in BOTH English and Chinese
4. Return results in JSON format ONLY

EXAMPLE INTERACTION:
User: "I need a BAA for healthcare"
Analysis: User needs HIPAA compliance, healthcare data protection
Recommendations:
- DPA (GDPR data protection, similar to HIPAA)
- CSA (includes service terms, data processing)
- NDA (basic confidentiality)

EXAMPLE JSON RESPONSE:
{
  "matched": false,
  "requested_template": "BAA",
  "similar_templates": [
    {
      "id": "dpa",
      "name_en": "Data Processing Agreement",
      "name_zh": "数据处理协议",
      "confidence": 0.85,
      "reason_en": "GDPR data protection compliance, similar to HIPAA requirements",
      "reason_zh": "GDPR 数据保护合规，类似于 HIPAA 要求"
    },
    {
      "id": "csa",
      "name_en": "Cloud Service Agreement",
      "name_zh": "云服务协议",
      "confidence": 0.72,
      "reason_en": "Includes service terms and data processing clauses",
      "reason_zh": "包含服务条款和数据处理条款"
    },
    {
      "id": "nda",
      "name_en": "Mutual NDA",
      "name_zh": "相互保密协议",
      "confidence": 0.55,
      "reason_en": "Basic confidentiality protection",
      "reason_zh": "基础保密保护"
    }
  ],
  "response_en": "I couldn't find a BAA template. Based on your requirements, the following templates are most similar. Would you like to start drafting one of these?",
  "response_zh": "我没有找到 BAA 模板。根据您的需求，以下模板最为接近。您是否要基于其中之一开始起草？"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text, no explanations."""

    def __init__(self):
        pass

    async def recognize_intent(self, user_request: str) -> Dict[str, Any]:
        """Recognize which template best matches user's request."""
        return intent_recognizer.recognize_intent(user_request)


intent_recognizer = IntentRecognizer()
