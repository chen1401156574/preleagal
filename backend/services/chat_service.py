import httpx
import json
import os
import re
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded from project root no matter where the server starts.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv()
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Using GPT-OSS-120B via OpenRouter
MODEL = "openai/gpt-oss-120b"

# NDA default critical fields
CRITICAL_FIELDS_NDA = [
    "purpose",
    "effectiveDate",
    "mndaTermValue",
    "governingLaw",
    "jurisdiction",
    "party1Name",
    "party1Company",
    "party1Address",
    "party2Name",
    "party2Company",
    "party2Address"
]

CRITICAL_OPTIONAL_NDA = [
    "mndaTerm",
    "confidentialityTerm",
    "confidentialityTermValue",
    "party1Title",
    "party2Title",
    "party1Signature",
    "party2Signature",
]

CSA_CRITICAL_FIELDS = [
    "purpose",
    "effectiveDate",
    "serviceProvider",
    "serviceProviderContact",
    "customer",
    "customerContact",
    "serviceDescription",
    "serviceTerm",
    "governingLaw",
    "paymentTerms"
]

CSA_OPTIONAL_FIELDS = [
    "serviceLevel",
    "dataLocation",
    "securityStandards",
    "party1Title",
    "party2Title",
]

DPA_CRITICAL_FIELDS = [
    "purpose",
    "effectiveDate",
    "dataExporter",
    "dataExporterContact",
    "dataImporter",
    "dataImporterContact",
    "dataCategories",
    "processingPurpose",
    "dataTransfers",
    "governingLaw"
]

DPA_OPTIONAL_FIELDS = [
    "securityMeasures",
    "subProcessors",
    "dataRetention",
    "party1Title",
    "party2Title",
]

TEMPLATE_CONFIGS = {
    "nda": {
        "critical_fields": CRITICAL_FIELDS_NDA,
        "optional_fields": CRITICAL_OPTIONAL_NDA,
        "guided_steps": [
            ("purpose", ["purpose"]),
            ("parties", ["party1Company", "party1Name", "party2Company", "party2Name"]),
            ("effectiveDate", ["effectiveDate"]),
            ("termDuration", ["mndaTermValue"]),
            ("lawAndJurisdiction", ["governingLaw", "jurisdiction"]),
            ("addresses", ["party1Address", "party2Address"]),
        ]
    },
    "csa": {
        "critical_fields": CSA_CRITICAL_FIELDS,
        "optional_fields": CSA_OPTIONAL_FIELDS,
        "guided_steps": [
            ("purpose", ["purpose"]),
            ("parties", ["serviceProvider", "customer"]),
            ("serviceDescription", ["serviceDescription"]),
            ("serviceTerm", ["serviceTerm"]),
            ("effectiveDate", ["effectiveDate"]),
            ("governingLaw", ["governingLaw"]),
            ("paymentTerms", ["paymentTerms"]),
            ("contacts", ["serviceProviderContact", "customerContact"]),
        ]
    },
    "dpa": {
        "critical_fields": DPA_CRITICAL_FIELDS,
        "optional_fields": DPA_OPTIONAL_FIELDS,
        "guided_steps": [
            ("purpose", ["purpose"]),
            ("parties", ["dataExporter", "dataImporter"]),
            ("dataCategories", ["dataCategories"]),
            ("processingPurpose", ["processingPurpose"]),
            ("dataTransfers", ["dataTransfers"]),
            ("effectiveDate", ["effectiveDate"]),
            ("governingLaw", ["governingLaw"]),
            ("contacts", ["dataExporterContact", "dataImporterContact"]),
        ]
    }
}


def load_system_prompt(template_type: str = "nda") -> str:
    """Load system prompt for specific template type."""
    prompts_path = PROJECT_ROOT / "backend" / "prompts"
    prompt_file_map = {
        "nda": "nda_system_prompt.txt",
        "csa": "csa_system_prompt.txt",
        "dpa": "dpa_system_prompt.txt"
    }
    prompt_file = prompt_file_map.get(template_type, "nda_system_prompt.txt")
    prompt_path = prompts_path / prompt_file
    if prompt_path.exists():
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    return get_default_nda_prompt()


def get_default_nda_prompt() -> str:
    return """你是一位专门负责相互保密协议（MNDA）的资深法律助手。
你的目标是通过自然对话和提取信息，帮助用户填写 MNDA。

必须收集的 NDA 关键字段（生成 PDF 前必须完成）：
1. purpose: 协议的商业目的
2. effectiveDate: 协议生效日期（格式：YYYY-MM-DD）
3. mndaTermValue: 协议期限（以年为单位，例如：3）
4. governingLaw: 协议管辖法律所属州/省
5. jurisdiction: 法院管辖地
6. party1Name: 甲方代表人姓名
7. party1Company: 甲方公司名称
8. party1Address: 甲方通知地址
9. party2Name: 乙方代表人姓名
10. party2Company: 乙方公司名称
11. party2Address: 乙方通知地址

可选字段（后续可默认）：
- mndaTerm: '1year' 或 'continues'
- confidentialityTerm: '1year' 或 'perpetuity'
- party1Title: 甲方代表人职位
- party2Title: 乙方代表人职位
- party1Signature: 始终保持为空 - 由用户手动签署
- party2Signature: 始终保持为空 - 由用户手动签署

准则：
1. 保持专业、简洁且乐于助人
2. 始终使用中文回答
3. 进行自然对话 - 当还有关键字段未收集时，你必须在回复的末尾明确提出一个关于缺失字段的后续问题。一次只问一个问题。
4. 当用户提供信息时，在回复中确认已提取的信息
5. 跟踪对话中已提供的关键字段
6. 当所有关键字段收集完毕时，邀请用户下载 PDF
7. 签名栏：始终保持为空，并告知用户需手动签署
8. 要求 effectiveDate 格式为 YYYY-MM-DD（例如：2026-04-22）
9. 严禁使用“技术问题”、“系统错误”或反复道歉等词汇

首条消息（对话开始且无历史记录时）：
以中文问候开始，询问商业目的。

响应格式：
你必须返回一个包含两个键的 JSON 对象：
1. "reply": 你对用户的对话消息（中文）
2. "fields": 仅包含从当前消息中新提取的字段的对象

仅返回有效的 JSON。不要包含 Markdown、代码块或任何解释。"""


def _detect_language(messages: List[Dict[str, str]]) -> str:
    def has_zh(text: str) -> bool:
        return any("一" <= ch <= "鿿" for ch in text)

    user_messages = [m.get("content", "") for m in messages if m.get("role") == "user"]
    if not user_messages:
        return "zh"

    latest = user_messages[-1]
    if has_zh(latest):
        return "zh"

    for content in reversed(user_messages[:-1]):
        if has_zh(content):
            return "zh"

    return "zh"


def _safe_parse_llm_json(content: Any) -> Optional[Dict[str, Any]]:
    if isinstance(content, dict):
        return content
    if not isinstance(content, str) or not content.strip():
        return None

    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        return None

    try:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def _normalize_fields(fields: Any, template_type: str = "nda") -> Dict[str, str]:
    if not isinstance(fields, dict):
        return {}

    config = TEMPLATE_CONFIGS.get(template_type, TEMPLATE_CONFIGS['nda'])
    allowed = set(config['critical_fields'] + config['optional_fields'])
    normalized: Dict[str, str] = {}
    for key, value in fields.items():
        if key not in allowed:
            continue
        if value is None:
            continue
        text = str(value).strip()
        if text:
            normalized[key] = text
    return normalized


def _next_step_missing(all_fields: Dict[str, str], template_type: str = "nda") -> Tuple[Optional[str], List[str]]:
    config = TEMPLATE_CONFIGS.get(template_type, TEMPLATE_CONFIGS['nda'])
    for step_name, keys in config['guided_steps']:
        missing = [k for k in keys if not str(all_fields.get(k, "")).strip()]
        if missing:
            return step_name, missing
    return None, []


def _get_template_name(template_type: str, lang: str = "zh") -> str:
    from services.template_service import template_registry
    template = template_registry.get_template(template_type)
    if template:
        return template.get('name_zh' if lang == "zh" else 'name', template['name'])
    return "协议" if lang == "zh" else "Agreement"


def _build_guided_question(step_name: Optional[str], missing_fields: List[str], lang: str, template_type: str = "nda") -> str:
    if step_name is None:
        return "信息已收集完整，现在可以下载 PDF。签名栏请手动填写。"

    template_name = _get_template_name(template_type, "zh")

    if step_name == "purpose":
        return f"请先告诉我这份{template_name}的商业目的。\n可直接回复：商业目的：评估合作/技术交流/项目尽调。\n您也可以一次性提供多个后续字段。"

    if step_name == "parties":
        if template_type == "nda":
            return "接下来请提供双方公司的基本信息。\n模板：甲方公司：XXX；甲方姓名：XXX；乙方公司：XXX；乙方姓名：XXX。"
        elif template_type == "csa":
            return "接下来请提供双方公司的信息。\n模板：服务商（甲方）：XXX；客户（乙方）：XXX。"
        elif template_type == "dpa":
            return "接下来请提供双方公司的信息。\n模板：数据输出方（甲方）：XXX；数据输入方（乙方）：XXX。"
        return "接下来请提供双方公司的基本信息。"

    if step_name == "effectiveDate":
        return "请提供生效日期，格式为 YYYY-MM-DD。\n模板：生效日期：2026-04-22。"

    if step_name == "termDuration":
        return "请提供协议期限（年数）。\n模板：协议期限：2年。"

    if step_name == "lawAndJurisdiction":
        return "请提供管辖法律和管辖法院。\n模板：管辖法律：Delaware；管辖法院：Delaware courts。"

    if step_name == "addresses":
        return "最后请提供双方通知地址。\n模板：甲方地址：XXX；乙方地址：XXX。"

    if step_name == "serviceDescription":
        return "请描述您将提供的云服务。\n模板：服务描述：提供云存储和计算服务，包括数据备份功能。"

    if step_name == "serviceTerm":
        return "请说明服务期限。\n模板：服务期限：2 年（或 24 months）。"

    if step_name == "governingLaw":
        return "请提供管辖法律（如：Delaware）。\n模板：管辖法律：Delaware。"

    if step_name == "paymentTerms":
        return "请提供付款条款。\n模板：付款条款：monthly（月付）/net-30。"

    if step_name == "dataCategories":
        return "请说明将处理的个人数据类别。\n模板：数据类别：用户姓名、邮箱地址、使用记录。"

    if step_name == "processingPurpose":
        return "请说明数据处理的目的。\n模板：处理目的：提供服务、数据分析、客户支持。"

    if step_name == "dataTransfers":
        return "个人数据是否会转移到欧盟经济区 (EEA) 之外？(是/否)\n如转移，请说明目的地国家。"

    if step_name == "contacts":
        return "最后请提供双方的联系信息。\n模板：联系人：info@example.com"

    return "请继续提供剩余的信息以完成协议。"


def _build_acknowledgement(new_fields: Dict[str, str], lang: str) -> str:
    if not new_fields:
        return ""
    
    field_names_zh = {
        "purpose": "商业目的",
        "effectiveDate": "生效日期",
        "mndaTermValue": "协议期限",
        "governingLaw": "管辖法律",
        "jurisdiction": "管辖法院",
        "party1Name": "甲方姓名",
        "party1Company": "甲方公司",
        "party1Address": "甲方地址",
        "party2Name": "乙方姓名",
        "party2Company": "乙方公司",
        "party2Address": "乙方地址"
    }
    
    captured = [field_names_zh.get(k, k) for k in new_fields.keys() if k in field_names_zh]
    if captured:
        return f"已记录您提供的{', '.join(captured)}。"
    return "已记录您提供的信息。"


def _find_numeric_name_issues(text: str, template_type: str = "nda") -> List[str]:
    """Detect numeric-only names without relaxing extraction regex."""
    if template_type == "nda":
        checks = [
            ("甲方姓名", r"(?:party\s*1\s*name|甲方姓名|甲方代表人)\s*[:：]?\s*([0-9]+)\b"),
            ("乙方姓名", r"(?:party\s*2\s*name|乙方姓名|乙方代表人)\s*[:：]?\s*([0-9]+)\b"),
        ]
    elif template_type == "csa":
        checks = [
            ("服务商联系人", r"(?:provider\s*contact|服务商联系人|甲方姓名|甲方代表人)\s*[:：]?\s*([0-9]+)\b"),
            ("客户联系人", r"(?:customer\s*contact|客户联系人|乙方姓名|乙方代表人)\s*[:：]?\s*([0-9]+)\b"),
        ]
    elif template_type == "dpa":
        checks = [
            ("输出方联系人", r"(?:exporter\s*contact|输出方联系人|甲方姓名|甲方代表人)\s*[:：]?\s*([0-9]+)\b"),
            ("输入方联系人", r"(?:importer\s*contact|输入方联系人|乙方姓名|乙方代表人)\s*[:：]?\s*([0-9]+)\b"),
        ]
    else:
        checks = []

    issues: List[str] = []
    for label, pattern in checks:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            issues.append(f"{label}“{m.group(1)}”")
    return issues


def _build_numeric_name_hint(issues: List[str]) -> str:
    if not issues:
        return ""
    issue_text = "、".join(issues)
    return (
        f"{issue_text}看起来不是有效姓名（姓名不能为纯数字）。\n"
        "请提供真实姓名，例如：甲方姓名：张三；乙方姓名：李四。"
    )


def _latest_user_text(messages: List[Dict[str, str]]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return str(msg.get("content", "")).strip()
    return ""


def _extract_term_years(text: str) -> Dict[str, str]:
    """Extract years and map to appropriate fields."""
    results = {}
    
    # Match "2 years", "1 year", "3 yrs", "5年", "2 year(s)" etc.
    
    # 1. Pattern for confidentialityTermValue (保密期限) - Check this first as it's more specific
    conf_match = re.search(r"(?:term\s*of\s*confidentiality|confidentiality\s*term|confidentiality\s*period|保密期限|保密时间)\s*[:：]?\s*(\d{1,2})\s*(?:years?|yrs?|年|year\(s\))?(?!\w)", text, re.IGNORECASE)
    if conf_match:
        results["confidentialityTermValue"] = conf_match.group(1)
        results["confidentialityTerm"] = "1year"
    
    # 2. Pattern for mndaTermValue (协议期限) - More specific prefixes
    mnda_match = re.search(r"(?:term\s*of\s*agreement|agreement\s*term|contract\s*term|duration|period|协议期限|协议时间|期限)\s*[:：]?\s*(\d{1,2})\s*(?:years?|yrs?|年|year\(s\))?(?!\w)", text, re.IGNORECASE)
    if mnda_match:
        results["mndaTermValue"] = mnda_match.group(1)
        results["mndaTerm"] = "1year"
        
    # 3. Generic "X年" match if no specific prefix found and no results yet
    if not results:
        generic_match = re.search(r"\b(\d{1,2})\s*(?:years?|yrs?|年|year\(s\))(?!\w)", text, re.IGNORECASE)
        if generic_match:
            # Default to mndaTermValue if generic
            results["mndaTermValue"] = generic_match.group(1)
            results["mndaTerm"] = "1year"

    return results


def _is_update_request(text: str) -> bool:
    """Check if the user message indicates an update to existing info."""
    update_keywords = ["改为", "修改为", "设置为", "更新为", "update", "change", "set to", "instead of"]
    return any(kw in text.lower() for kw in update_keywords)


def _extract_effective_date(text: str) -> Optional[str]:
    # Match YYYY-MM-DD
    date_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if date_match:
        return date_match.group(1)
    return None


def _is_asking_for_missing_info(text: str) -> bool:
    """Check if the user is asking what information is still needed."""
    patterns = [
        r"还需要.*信息",
        r"还需要.*什么",
        r"还差.*什么",
        r"缺失.*信息",
        r"未提供.*信息",
        r"没提供.*信息",
        r"还有.*没填",
        r"what.*missing",
        r"what.*else",
        r"information.*needed",
        r"which.*fields"
    ]
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def _build_missing_fields_reply(merged_fields: Dict[str, str], template_type: str = "nda") -> str:
    missing_fields = check_missing_fields(merged_fields, template_type)
    field_names_zh = {
        "purpose": "商业目的",
        "effectiveDate": "生效日期",
        "mndaTermValue": "协议期限",
        "governingLaw": "管辖法律",
        "jurisdiction": "管辖法院",
        "party1Name": "甲方姓名",
        "party1Company": "甲方公司",
        "party1Address": "甲方地址",
        "party2Name": "乙方姓名",
        "party2Company": "乙方公司",
        "party2Address": "乙方地址",
        "serviceProvider": "服务提供商",
        "serviceProviderContact": "服务商联系人",
        "customer": "客户",
        "customerContact": "客户联系人",
        "serviceDescription": "服务描述",
        "serviceTerm": "服务期限",
        "paymentTerms": "付款条款",
        "dataExporter": "数据输出方",
        "dataExporterContact": "输出方联系人",
        "dataImporter": "数据输入方",
        "dataImporterContact": "输入方联系人",
        "dataCategories": "数据类别",
        "processingPurpose": "处理目的",
        "dataTransfers": "数据转移",
    }

    missing_names = [field_names_zh.get(f, f) for f in missing_fields]
    if missing_names:
        return f"您目前还需要提供以下信息：\n- " + "\n- ".join(missing_names)
    return "所有必要信息已收集完整，您可以下载 PDF 了。"


def _extract_step_fields_fallback(
    step_name: Optional[str],
    missing_fields: List[str],
    messages: List[Dict[str, str]],
    template_type: str = "nda"
) -> Dict[str, str]:
    text = _latest_user_text(messages)
    if not text:
        return {}

    extracted: Dict[str, str] = {}
    config = TEMPLATE_CONFIGS.get(template_type, TEMPLATE_CONFIGS['nda'])

    if step_name == "effectiveDate":
        date_value = _extract_effective_date(text)
        if date_value:
            extracted["effectiveDate"] = date_value
        return extracted

    if step_name == "termDuration":
        term_results = _extract_term_years(text)
        if term_results:
            extracted.update(term_results)
        return extracted

    if step_name == "lawAndJurisdiction":
        law_match = re.search(r"(?:governing\s*law|law|管辖法律|管辖法)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)", text, re.IGNORECASE)
        jurisdiction_match = re.search(r"(?:jurisdiction|court|管辖法院|法院)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)", text, re.IGNORECASE)
        if law_match and "governingLaw" in missing_fields:
            extracted["governingLaw"] = law_match.group(1).strip(" ,;；。")
        if jurisdiction_match and "jurisdiction" in missing_fields:
            extracted["jurisdiction"] = jurisdiction_match.group(1).strip(" ,;；。")
        return extracted

    if step_name == "parties":
        if template_type == "nda":
            patterns = {
                "party1Company": r"(?:party\s*1\s*company|甲方公司|甲方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
                "party1Name": r"(?:party\s*1\s*name|甲方姓名|甲方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
                "party2Company": r"(?:party\s*2\s*company|乙方公司|乙方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
                "party2Name": r"(?:party\s*2\s*name|乙方姓名|乙方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
            }
        elif template_type == "csa":
            patterns = {
                "serviceProvider": r"(?:provider|service\s*provider|服务商|甲方公司|甲方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
                "customer": r"(?:customer|client|客户|乙方公司|乙方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
            }
        elif template_type == "dpa":
            patterns = {
                "dataExporter": r"(?:exporter|data\s*exporter|输出方|甲方公司|甲方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
                "dataImporter": r"(?:importer|data\s*importer|输入方|乙方公司|乙方)\s*[:：]?\s*([A-Za-z0-9一-鿿 .&()'/-]+)",
            }
        else:
            patterns = {}

        for key, pattern in patterns.items():
            if key not in missing_fields:
                continue
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                extracted[key] = m.group(1).strip(" ,;；。")
        return extracted

    if step_name == "addresses":
        if template_type == "nda":
            patterns = {
                "party1Address": r"(?:party\s*1\s*address|甲方地址|甲方通知地址)\s*[:：]?\s*([A-Za-z0-9一-鿿 .,#&()'/-]+)",
                "party2Address": r"(?:party\s*2\s*address|乙方地址|乙方通知地址)\s*[:：]?\s*([A-Za-z0-9一-鿿 .,#&()'/-]+)",
            }
        else:
            patterns = {}

        for key, pattern in patterns.items():
            if key not in missing_fields:
                continue
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                extracted[key] = m.group(1).strip(" ,;；。")
        return extracted

    if step_name == "contacts":
        if template_type == "csa":
            patterns = {
                "serviceProviderContact": r"(?:provider\s*contact|服务商联系人|甲方姓名|甲方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
                "customerContact": r"(?:customer\s*contact|客户联系人|乙方姓名|乙方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
            }
        elif template_type == "dpa":
            patterns = {
                "dataExporterContact": r"(?:exporter\s*contact|输出方联系人|甲方姓名|甲方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
                "dataImporterContact": r"(?:importer\s*contact|输入方联系人|乙方姓名|乙方代表人)\s*[:：]?\s*([A-Za-z一-鿿 .'-]+)",
            }
        else:
            patterns = {}
        
        for key, pattern in patterns.items():
            if key not in missing_fields:
                continue
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                extracted[key] = m.group(1).strip(" ,;；。")
        return extracted

    if step_name == "serviceDescription":
        desc_match = re.search(r"(?:service\s*description|description|服务描述|服务内容)\s*[:：]?\s*(.+)$", text, re.IGNORECASE)
        if desc_match and "serviceDescription" in missing_fields:
            extracted["serviceDescription"] = desc_match.group(1).strip(" ,;；。")
        return extracted

    if step_name == "serviceTerm":
        term_match = re.search(r"(?:service\s*term|term|服务期限|期限)\s*[:：]?\s*(.+)$", text, re.IGNORECASE)
        if term_match and "serviceTerm" in missing_fields:
            extracted["serviceTerm"] = term_match.group(1).strip(" ,;；。")
        return extracted

    if step_name == "paymentTerms":
        pay_match = re.search(r"(?:payment\s*terms|payment|付款条款|支付方式)\s*[:：]?\s*(.+)$", text, re.IGNORECASE)
        if pay_match and "paymentTerms" in missing_fields:
            extracted["paymentTerms"] = pay_match.group(1).strip(" ,;；。")
        return extracted

    if step_name == "purpose":
        if "purpose" not in missing_fields:
            return extracted
        purpose_pattern = r"(?:business\s*purpose|purpose|商业目的)\s*[:：]?\s*(.+)$"
        purpose_match = re.search(purpose_pattern, text, re.IGNORECASE)
        if purpose_match:
            extracted["purpose"] = purpose_match.group(1).strip(" ,;；。")
        elif len(text.strip()) <= 200:
            # Check if it's just a template selection (by name or number)
            from services.template_service import template_registry
            all_templates = template_registry.get_all_templates()
            is_template_selection = False
            
            # Check if it's a number (1, 2, 3...)
            if re.match(r"^\d+[\.、]?$", text.strip()):
                is_template_selection = True
            
            # Check if it's a template name
            clean_text = text.strip().lower()
            # Common selection prefixes
            selection_prefixes = ["选", "选择", "我要", "我想", "点", "1.", "2.", "3.", "1、", "2、", "3、"]
            for prefix in selection_prefixes:
                if clean_text.startswith(prefix.lower()):
                    clean_text = clean_text[len(prefix):].strip()

            for t in all_templates:
                names = [t.get('name', '').lower(), t.get('name_zh', '').lower()]
                if clean_text in names or any(n in clean_text for n in names if len(n) > 2):
                    # Additional check: if it's just the name (with optional prefix), it's a selection
                    if len(clean_text) < len(t.get('name_zh', '')) + 5:
                        is_template_selection = True
                        break

            is_structured = bool(re.search(r"(甲方 | 乙方|party|生效|管辖|governing|contact)", text, re.IGNORECASE))
            if not is_structured and not is_template_selection:
                extracted["purpose"] = text.strip()
    return extracted


def _extract_fields_fallback_all_steps(
    current_fields: Dict[str, str],
    messages: List[Dict[str, str]],
    template_type: str = "nda"
) -> Dict[str, str]:
    """Fallback extraction when JSON extraction fails or is incomplete."""
    if not messages:
        return {}
        
    latest_user_message = next((m["content"] for m in reversed(messages) if m["role" ] == "user"), "")
    if not latest_user_message:
        return {}

    all_extracted = {}
    
    # 1. Identify missing fields
    critical_fields = CRITICAL_FIELDS_NDA if template_type == "nda" else []
    optional_fields = CRITICAL_OPTIONAL_NDA if template_type == "nda" else []
    
    missing_critical = [f for f in critical_fields if not current_fields.get(f)]
    missing_optional = [f for f in optional_fields if not current_fields.get(f)]
    
    # 2. Extract for missing fields or if it's an update request
    is_update = _is_update_request(latest_user_message)
    
    # Check each "step" logic
    steps = ["purpose", "effectiveDate", "termDuration", "parties", "governingLaw"]
    for step in steps:
        # If the step fields are missing OR it's an update request, try to extract
        # We also extract if the user message matches a very specific pattern (like a date)
        extracted = _extract_step_fields_fallback(step, missing_critical + missing_optional, messages, template_type)
        if extracted:
            for k, v in extracted.items():
                # Only update if it's missing OR it's an explicit update request OR it's a date/term update
                if k not in current_fields or is_update or k in ["effectiveDate", "mndaTermValue", "confidentialityTermValue"]:
                    all_extracted[k] = v

    return all_extracted


def _get_openrouter_api_key() -> Optional[str]:
    key = os.getenv("OPENROUTER_API_KEY")
    if key is None:
        return None
    return key.strip() if key.strip() else None


async def get_chat_response(
    messages: List[Dict[str, str]],
    current_fields: Dict[str, str] = None,
    template_type: str = "nda"
) -> Dict[str, Any]:
    """
    Call the LLM API and return chat response with extracted fields.

    Args:
        messages: User conversation messages
        current_fields: Currently filled fields
        template_type: Template type (nda, csa, dpa)

    Returns:
        Dict with 'reply' and 'fields' keys
    """
    language = _detect_language(messages)
    config = TEMPLATE_CONFIGS.get(template_type, TEMPLATE_CONFIGS['nda'])

    api_key = _get_openrouter_api_key()
    if not api_key:
        return {
            "reply": "服务暂时不可用，请稍后重试。",
            "fields": {}
        }

    context_str = None
    if current_fields and any(current_fields.values()):
        filled = {k: v for k, v in current_fields.items() if v}
        if filled:
            context_str = "Current filled fields:\n" + "\n".join(f"- {k}: '{v}'" for k, v in filled.items())

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://prelegal.ai",
        "X-Title": "PreLegal AI"
    }

    system_prompt = load_system_prompt(template_type)
    full_messages = [{"role": "system", "content": system_prompt}]

    if context_str:
        full_messages.append({"role": "system", "content": f"Current form state: {context_str}"})

    full_messages.extend(messages)

    payload = {
        "model": MODEL,
        "messages": full_messages,
        "temperature": 0.7,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
        "extra_body": {
            "provider": {"order": ["Cerebras"], "allow_fallbacks": False}
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"].get("content")

            parsed = _safe_parse_llm_json(content) or {}
            extracted_fields = _normalize_fields(parsed.get("fields", {}), template_type)

            fallback_fields = _extract_fields_fallback_all_steps(current_fields or {}, messages, template_type)
            if fallback_fields:
                extracted_fields = {**fallback_fields, **extracted_fields}

            merged_fields = dict(current_fields or {})
            merged_fields.update(extracted_fields)

            # Check if user is asking what's missing
            user_text = _latest_user_text(messages)
            if _is_asking_for_missing_info(user_text):
                final_reply = _build_missing_fields_reply(merged_fields, template_type)
                return {"reply": final_reply, "fields": extracted_fields, "templateType": template_type}

            step_name, missing_in_step = _next_step_missing(merged_fields, template_type)
            question = _build_guided_question(step_name, missing_in_step, language, template_type)
            llm_reply = parsed.get("reply", "").strip()
            numeric_name_hint = _build_numeric_name_hint(_find_numeric_name_issues(user_text, template_type))
            
            if llm_reply:
                # Check if the LLM's natural reply includes a question or prompt for info
                if step_name and not re.search(r'[?？请]', llm_reply):
                    final_reply = f"{llm_reply}\n\n{question}"
                else:
                    final_reply = llm_reply
            else:
                ack = _build_acknowledgement(extracted_fields, language)
                final_reply = f"{ack}\n\n{question}" if ack else question

            if numeric_name_hint:
                final_reply = f"{final_reply}\n\n{numeric_name_hint}"
            return {"reply": final_reply, "fields": extracted_fields, "templateType": template_type}
        except httpx.HTTPStatusError as e:
            print(f"HTTP error: {e}")
            extracted_fields = _extract_fields_fallback_all_steps(current_fields or {}, messages, template_type)
            merged_fields = dict(current_fields or {})
            merged_fields.update(extracted_fields)
            user_text = _latest_user_text(messages)
            if _is_asking_for_missing_info(user_text):
                final_reply = _build_missing_fields_reply(merged_fields, template_type)
                return {"reply": final_reply, "fields": extracted_fields, "templateType": template_type}
            step_name, missing_in_step = _next_step_missing(merged_fields, template_type)
            guided = _build_guided_question(step_name, missing_in_step, language, template_type)
            ack = _build_acknowledgement(extracted_fields, language)
            return {"reply": f"{ack}\n\n{guided}" if ack else guided, "fields": extracted_fields, "templateType": template_type}
        except httpx.ConnectError:
            print("Connection error to OpenRouter")
            extracted_fields = _extract_fields_fallback_all_steps(current_fields or {}, messages, template_type)
            merged_fields = dict(current_fields or {})
            merged_fields.update(extracted_fields)
            user_text = _latest_user_text(messages)
            if _is_asking_for_missing_info(user_text):
                final_reply = _build_missing_fields_reply(merged_fields, template_type)
                return {"reply": final_reply, "fields": extracted_fields, "templateType": template_type}
            step_name, missing_in_step = _next_step_missing(merged_fields, template_type)
            guided = _build_guided_question(step_name, missing_in_step, language, template_type)
            ack = _build_acknowledgement(extracted_fields, language)
            return {"reply": f"{ack}\n\n{guided}" if ack else guided, "fields": extracted_fields, "templateType": template_type}
        except Exception as e:
            print(f"Unexpected error: {e}")
            extracted_fields = _extract_fields_fallback_all_steps(current_fields or {}, messages, template_type)
            merged_fields = dict(current_fields or {})
            merged_fields.update(extracted_fields)
            user_text = _latest_user_text(messages)
            if _is_asking_for_missing_info(user_text):
                final_reply = _build_missing_fields_reply(merged_fields, template_type)
                return {"reply": final_reply, "fields": extracted_fields, "templateType": template_type}
            step_name, missing_in_step = _next_step_missing(merged_fields, template_type)
            guided = _build_guided_question(step_name, missing_in_step, language, template_type)
            ack = _build_acknowledgement(extracted_fields, language)
            return {"reply": f"{ack}\n\n{guided}" if ack else guided, "fields": extracted_fields, "templateType": template_type}


def check_missing_fields(current_fields: Dict[str, str], template_type: str = "nda") -> List[str]:
    """Check which critical fields are still missing."""
    config = TEMPLATE_CONFIGS.get(template_type, TEMPLATE_CONFIGS['nda'])
    critical_fields = config['critical_fields']

    if not current_fields:
        return critical_fields.copy()

    return [f for f in critical_fields if not str(current_fields.get(f, '')).strip()]


def get_missing_fields_prompt(missing_fields: List[str], lang: str = "zh") -> str:
    """Return a message listing missing critical fields."""
    if not missing_fields:
        return ""

    return f"请提供以下必要信息以生成 PDF：{', '.join(missing_fields)}"
