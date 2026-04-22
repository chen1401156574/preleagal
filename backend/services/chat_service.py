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

# Critical fields that must be filled before PDF download
CRITICAL_FIELDS = [
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

OPTIONAL_FIELDS = [
    "mndaTerm",
    "confidentialityTerm",
    "confidentialityTermValue",
    "party1Title",
    "party2Title",
    "party1Signature",
    "party2Signature",
]

GUIDED_STEPS: List[Tuple[str, List[str]]] = [
    ("purpose", ["purpose"]),
    ("parties", ["party1Company", "party1Name", "party2Company", "party2Name"]),
    ("effectiveDate", ["effectiveDate"]),
    ("termDuration", ["mndaTermValue"]),
    ("lawAndJurisdiction", ["governingLaw", "jurisdiction"]),
    ("addresses", ["party1Address", "party2Address"]),
]

SYSTEM_PROMPT = """You are an expert legal assistant specialized in Mutual Non-Disclosure Agreements (MNDA).
Your goal is to help the user fill out an MNDA by conducting a natural conversation and extracting information.

CRITICAL NDA FIELDS (must collect before PDF generation):
1. purpose: Business purpose of the agreement
2. effectiveDate: Agreement start date (YYYY-MM-DD format)
3. mndaTermValue: Agreement duration in years (e.g., 3)
4. governingLaw: State governing the agreement
5. jurisdiction: Court jurisdiction location
6. party1Name: Party 1 representative name
7. party1Company: Party 1 company name
8. party1Address: Party 1 notice address
9. party2Name: Party 2 representative name
10. party2Company: Party 2 company name
11. party2Address: Party 2 notice address

OPTIONAL FIELDS (can default later):
- mndaTerm: '1year' or 'continues'
- mndaTermValue: e.g., '1'
- confidentialityTerm: '1year' or 'perpetuity'
- confidentialityTermValue: e.g., '1'
- party1Title: Party 1 representative title
- party2Title: Party 2 representative title
- party1Signature: Always leave empty - user types manually
- party2Signature: Always leave empty - user types manually

GUIDELINES:
1. Be professional, concise, and helpful
2. Support BOTH English and Chinese - respond in the language the user uses
3. Conduct a natural conversation - ask ONE question at a time when info is missing
4. When user provides info, extract it and confirm in your reply
5. Track which critical fields have been provided across the conversation
6. When all critical fields are complete, invite user to download PDF
7. For signature fields: ALWAYS leave empty and tell user to add manually
8. Ask for effectiveDate as YYYY-MM-DD format (e.g., 2026-04-22)
9. Never use panic wording like "technical issue", "system error", or repeated apologies
10. Follow this collection order strictly:
   - purpose
   - party1Company/party1Name + party2Company/party2Name
   - effectiveDate
   - mndaTermValue (ask agreement duration, e.g. 3 years)
   - governingLaw + jurisdiction
   - party1Address + party2Address

FIRST MESSAGE (when conversation starts with no history):
Start with a bilingual greeting in EN + ZH, then ask for the business purpose first.
Example format: "Hello! I'll help you create a Mutual NDA. What's the business purpose?
你好！我来帮你起草相互保密协议。请问商业目的是什么？"

HOW TO ASK:
- When asking for a missing field, explain WHY you need it briefly
- Keep questions concise (1-2 sentences max)
- If user mentions something vaguely, ask for clarification gently

RESPONSE FORMAT:
You MUST respond with a JSON object containing exactly two keys:
1. "reply": Your conversational message to the user (in their language)
2. "fields": Object containing ONLY fields newly extracted from THIS message

Example 1 - Extracting party info:
{
  "reply": "Thank you! I've noted that your company is TechCorp A and your name is John Smith. Now, what's the business purpose for this agreement?",
  "fields": {
    "party1Company": "TechCorp A",
    "party1Name": "John Smith"
  }
}

Example 2 - Asking for missing critical field:
{
  "reply": "I have most of the information. To complete the agreement, I need to know which state's laws will govern this NDA. Please provide the governing law (e.g., 'Delaware').\n\n我已经记录了大部分信息。为完成协议，我需要知道这份协议由哪个州的法律管辖。请提供管辖法律（例如：'Delaware'）。",
  "fields": {}
}

Example 3 - All fields complete, invite download:
{
  "reply": "Great! I've collected all the required information. You can now download the PDF. Don't forget to add the signatures manually in the signature fields!\n\n太好了！我已经收集了所有必需信息。现在可以下载 PDF 了。别忘了在签名栏手动添加签名！",
  "fields": {}
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanations. Just the JSON object with 'reply' and 'fields' keys."""

def _detect_language(messages: List[Dict[str, str]]) -> str:
    def has_zh(text: str) -> bool:
        return any("\u4e00" <= ch <= "\u9fff" for ch in text)

    def has_en_letters(text: str) -> bool:
        return bool(re.search(r"[A-Za-z]", text))

    user_messages = [m.get("content", "") for m in messages if m.get("role") == "user"]
    if not user_messages:
        return "en"

    # Prefer the latest message when it clearly indicates language.
    latest = user_messages[-1]
    if has_zh(latest):
        return "zh"
    if has_en_letters(latest):
        return "en"

    # If latest is neutral (e.g. only date/numbers), fallback to earlier user language.
    for content in reversed(user_messages[:-1]):
        if has_zh(content):
            return "zh"
        if has_en_letters(content):
            return "en"

    return "en"


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

    # Fallback: some providers may prepend/append text around JSON.
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


def _normalize_fields(fields: Any) -> Dict[str, str]:
    if not isinstance(fields, dict):
        return {}

    allowed = set(CRITICAL_FIELDS + OPTIONAL_FIELDS)
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


def _next_step_missing(all_fields: Dict[str, str]) -> Tuple[Optional[str], List[str]]:
    for step_name, keys in GUIDED_STEPS:
        missing = [k for k in keys if not str(all_fields.get(k, "")).strip()]
        if missing:
            return step_name, missing
    return None, []


def _build_guided_question(step_name: Optional[str], missing_fields: List[str], lang: str) -> str:
    if step_name is None:
        if lang == "zh":
            return "信息已收集完整，现在可以下载 PDF。签名栏请手动填写。"
        return "All required information is collected. You can download the PDF now. Please add signatures manually."

    if step_name == "purpose":
        if lang == "zh":
            return "请先告诉我这份 NDA 的商业目的。\n可直接按这个模板回复：商业目的：评估合作/技术交流/项目尽调。\n你也可以一次性把后续字段按模板一起发，我会一起识别。"
        return "First, please share the business purpose of this NDA.\nTemplate: Business purpose: partnership evaluation / technical discussion / project due diligence.\nYou can also provide multiple remaining fields in one message, and I will parse them together."

    if step_name == "parties":
        if lang == "zh":
            return "接下来请提供双方公司和签署人姓名。\n模板：甲方公司：XXX；甲方姓名：XXX；乙方公司：XXX；乙方姓名：XXX。\n也可一次性补充生效日期、生效时段、管辖法/法院和地址。"
        return "Next, please provide both sides' company names and signer names.\nTemplate: Party1 Company: XXX; Party1 Name: XXX; Party2 Company: XXX; Party2 Name: XXX.\nYou may also include effective date, term duration, law/jurisdiction, and addresses in the same message."

    if step_name == "effectiveDate":
        if lang == "zh":
            return "请提供生效日期，格式为 YYYY-MM-DD。\n模板：生效日期：2026-04-22。\n可同时补充：生效时段、管辖法/法院、双方地址。"
        return "Please provide the effective date in YYYY-MM-DD format.\nTemplate: Effective date: 2026-04-22.\nYou can also include term duration, law/jurisdiction, and addresses together."

    if step_name == "lawAndJurisdiction":
        if lang == "zh":
            return "请提供管辖法律和管辖法院地点。\n模板：管辖法律：Delaware；管辖法院：New York County Court。\n可同时补充双方地址。"
        return "Please provide the governing law and jurisdiction (court location).\nTemplate: Governing law: Delaware; Jurisdiction: New York County Court.\nYou may include both party addresses in the same message."

    if step_name == "termDuration":
        if lang == "zh":
            return "请提供协议生效时段（年限）。\n模板：生效时段：3 years（或 3 yrs / 3 年）。"
        return "Please provide the agreement term duration in years.\nTemplate: Term duration: 3 years."

    if lang == "zh":
        return "最后请提供双方通知地址。\n模板：甲方地址：XXX；乙方地址：XXX。"
    return "Finally, please provide both notice addresses.\nTemplate: Party1 Address: XXX; Party2 Address: XXX."


def _build_acknowledgement(new_fields: Dict[str, str], lang: str) -> str:
    if not new_fields:
        return ""
    if lang == "zh":
        return "已记录你刚提供的信息。"
    return "Got it, I've recorded the details you just shared."


def _latest_user_text(messages: List[Dict[str, str]]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return str(msg.get("content", "")).strip()
    return ""


def _extract_effective_date(text: str) -> Optional[str]:
    date_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if date_match:
        return date_match.group(1)
    return None


def _extract_term_years(text: str) -> Optional[str]:
    # Handles inputs like "3 years", "3 yrs", "3年"
    year_match = re.search(r"\b(\d{1,2})\s*(?:years?|yrs?)\b|(\d{1,2})\s*年", text, re.IGNORECASE)
    if year_match:
        value = year_match.group(1) or year_match.group(2)
        if value:
            return value
    # Fallback: if user only inputs a number like "3"
    number_match = re.search(r"\b(\d{1,2})\b", text)
    if number_match:
        return number_match.group(1)
    return None


def _extract_step_fields_fallback(
    step_name: Optional[str],
    missing_fields: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, str]:
    text = _latest_user_text(messages)
    if not text:
        return {}

    extracted: Dict[str, str] = {}

    if step_name == "effectiveDate":
        date_value = _extract_effective_date(text)
        if date_value and "effectiveDate" in missing_fields:
            extracted["effectiveDate"] = date_value
        return extracted

    if step_name == "termDuration":
        years_value = _extract_term_years(text)
        if years_value and "mndaTermValue" in missing_fields:
            extracted["mndaTermValue"] = years_value
            extracted["mndaTerm"] = "1year"
        if re.search(r"\b(indefinite|perpetual)\b|长期|无固定期限", text, re.IGNORECASE) and "mndaTermValue" in missing_fields:
            extracted["mndaTerm"] = "continues"
            extracted["mndaTermValue"] = "indefinite"
        return extracted

    if step_name == "lawAndJurisdiction":
        # Pattern 1: explicit labels.
        law_match = re.search(r"(?:governing\s*law|law|管辖法律|管辖法)\s*[:：]?\s*([A-Za-z\u4e00-\u9fff .'-]+)", text, re.IGNORECASE)
        jurisdiction_match = re.search(r"(?:jurisdiction|court|管辖法院|法院地点|法院)\s*[:：]?\s*([A-Za-z\u4e00-\u9fff .'-]+)", text, re.IGNORECASE)
        if law_match and "governingLaw" in missing_fields:
            extracted["governingLaw"] = law_match.group(1).strip(" ,;；。")
        if jurisdiction_match and "jurisdiction" in missing_fields:
            extracted["jurisdiction"] = jurisdiction_match.group(1).strip(" ,;；。")

        # Pattern 2: two segments separated by common delimiters,
        # e.g. "Delaware; New York County Court" or "Delaware, New York County Court"
        if ("governingLaw" in missing_fields or "jurisdiction" in missing_fields) and (
            "governingLaw" not in extracted or "jurisdiction" not in extracted
        ):
            parts = [p.strip(" ,，;；。") for p in re.split(r"[,，;；\n]+", text) if p.strip()]
            if len(parts) >= 2:
                if "governingLaw" in missing_fields and "governingLaw" not in extracted:
                    extracted["governingLaw"] = parts[0]
                if "jurisdiction" in missing_fields and "jurisdiction" not in extracted:
                    extracted["jurisdiction"] = parts[1]
            else:
                # Pattern 3: connector words, e.g. "Delaware and New York County Court"
                connector_parts = [
                    p.strip(" ,，;；。")
                    for p in re.split(r"\b(?:and|&)\b|以及|和", text, flags=re.IGNORECASE)
                    if p.strip()
                ]
                if len(connector_parts) >= 2:
                    if "governingLaw" in missing_fields and "governingLaw" not in extracted:
                        extracted["governingLaw"] = connector_parts[0]
                    if "jurisdiction" in missing_fields and "jurisdiction" not in extracted:
                        extracted["jurisdiction"] = connector_parts[1]
        return extracted

    if step_name == "parties":
        patterns = {
            "party1Company": r"(?:party\s*1\s*company|甲方公司)\s*[:：]?\s*([A-Za-z0-9\u4e00-\u9fff .&()'/-]+)",
            "party1Name": r"(?:party\s*1\s*name|甲方姓名|甲方签署人)\s*[:：]?\s*([A-Za-z\u4e00-\u9fff .'-]+)",
            "party2Company": r"(?:party\s*2\s*company|乙方公司)\s*[:：]?\s*([A-Za-z0-9\u4e00-\u9fff .&()'/-]+)",
            "party2Name": r"(?:party\s*2\s*name|乙方姓名|乙方签署人)\s*[:：]?\s*([A-Za-z\u4e00-\u9fff .'-]+)",
        }
        for key, pattern in patterns.items():
            if key not in missing_fields:
                continue
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                extracted[key] = m.group(1).strip(" ,;；。")
        return extracted

    if step_name == "addresses":
        p1 = re.search(r"(?:party\s*1\s*address|甲方地址)\s*[:：]?\s*([^\n;；]+)", text, re.IGNORECASE)
        p2 = re.search(r"(?:party\s*2\s*address|乙方地址)\s*[:：]?\s*([^\n;；]+)", text, re.IGNORECASE)
        if p1 and "party1Address" in missing_fields:
            extracted["party1Address"] = p1.group(1).strip(" ,;；。")
        if p2 and "party2Address" in missing_fields:
            extracted["party2Address"] = p2.group(1).strip(" ,;；。")
        return extracted

    if step_name == "purpose" and "purpose" in missing_fields:
        purpose_labeled = re.search(r"(?:business\s*purpose|purpose|商业目的)\s*[:：]?\s*(.+)$", text, re.IGNORECASE)
        if purpose_labeled:
            extracted["purpose"] = purpose_labeled.group(1).strip(" ,;；。")
        else:
            # Avoid swallowing a whole multi-field message as purpose.
            is_structured = bool(re.search(r"(甲方|乙方|party\s*1|party\s*2|生效日期|effective\s*date|管辖|governing|jurisdiction|地址|address)\s*[:：]", text, re.IGNORECASE))
            if not is_structured and len(text.strip()) <= 200:
                extracted["purpose"] = text.strip()
    return extracted


def _extract_fields_fallback_all_steps(
    current_fields: Dict[str, str],
    messages: List[Dict[str, str]],
) -> Dict[str, str]:
    snapshot = dict(current_fields or {})
    extracted: Dict[str, str] = {}
    for step_name, keys in GUIDED_STEPS:
        missing = [k for k in keys if not str(snapshot.get(k, "")).strip()]
        if not missing:
            continue
        step_extracted = _extract_step_fields_fallback(step_name, missing, messages)
        if step_extracted:
            extracted.update(step_extracted)
            snapshot.update(step_extracted)
    return extracted


def _get_openrouter_api_key() -> Optional[str]:
    key = os.getenv("OPENROUTER_API_KEY")
    if key is None:
        return None
    stripped = key.strip()
    return stripped if stripped else None


async def get_chat_response(messages: List[Dict[str, str]], current_fields: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Call the LLM API and return chat response with extracted fields.

    Args:
        messages: User conversation messages (without system prompt)
        current_fields: Currently filled fields from the frontend

    Returns:
        Dict with 'reply' and 'fields' keys
    """
    language = _detect_language(messages)

    api_key = _get_openrouter_api_key()
    if not api_key:
        return {
            "reply": "服务暂时不可用，请稍后重试。" if language == "zh" else "The AI service is temporarily unavailable. Please try again shortly.",
            "fields": {}
        }

    # Combine current fields into conversation context
    context = None
    if current_fields and any(current_fields.values()):
        filled_fields = {k: v for k, v in current_fields.items() if v}
        if filled_fields:
            context_str = "Current filled fields:\n" + "\n".join(
                f"- {k}: '{v}'" for k, v in filled_fields.items()
            )
        else:
            context_str = None
    else:
        context_str = None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://prelegal.ai",
        "X-Title": "PreLegal AI"
    }

    # Build messages with system prompt
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add context if available
    if context_str:
        full_messages.append({
            "role": "system",
            "content": f"Current form state: {context_str}"
        })

    # Add conversation history
    full_messages.extend(messages)

    payload = {
        "model": MODEL,
        "messages": full_messages,
        "temperature": 0.7,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
        "extra_body": {
            "provider": {
                "order": ["Cerebras"],
                "allow_fallbacks": False
            }
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"].get("content")

            parsed = _safe_parse_llm_json(content) or {}
            extracted_fields = _normalize_fields(parsed.get("fields", {}))

            current_snapshot = dict(current_fields or {})
            fallback_fields = _extract_fields_fallback_all_steps(current_snapshot, messages)
            if fallback_fields:
                extracted_fields = {**fallback_fields, **extracted_fields}

            merged_fields = dict(current_fields or {})
            merged_fields.update(extracted_fields)

            step_name, missing_in_step = _next_step_missing(merged_fields)
            question = _build_guided_question(step_name, missing_in_step, language)
            ack = _build_acknowledgement(extracted_fields, language)
            final_reply = f"{ack}\n\n{question}" if ack else question

            return {
                "reply": final_reply,
                "fields": extracted_fields
            }
        except httpx.HTTPStatusError as e:
            error_body = e.response.text[:500] if e.response is not None else "No response body"
            print(f"HTTP error from OpenRouter: {e}. Response body: {error_body}")
            current_snapshot = dict(current_fields or {})
            extracted_fields = _extract_fields_fallback_all_steps(current_snapshot, messages)
            merged_fields = dict(current_snapshot)
            merged_fields.update(extracted_fields)
            step_name, missing_in_step = _next_step_missing(merged_fields)
            guided = _build_guided_question(step_name, missing_in_step, language)
            ack = _build_acknowledgement(extracted_fields, language)
            return {
                "reply": f"{ack}\n\n{guided}" if ack else guided,
                "fields": extracted_fields
            }
        except httpx.ConnectError:
            print("Connection error to OpenRouter")
            current_snapshot = dict(current_fields or {})
            extracted_fields = _extract_fields_fallback_all_steps(current_snapshot, messages)
            merged_fields = dict(current_snapshot)
            merged_fields.update(extracted_fields)
            step_name, missing_in_step = _next_step_missing(merged_fields)
            guided = _build_guided_question(step_name, missing_in_step, language)
            ack = _build_acknowledgement(extracted_fields, language)
            return {
                "reply": f"{ack}\n\n{guided}" if ack else guided,
                "fields": extracted_fields
            }
        except Exception as e:
            print(f"Unexpected error calling LLM: {e}")
            current_snapshot = dict(current_fields or {})
            extracted_fields = _extract_fields_fallback_all_steps(current_snapshot, messages)
            merged_fields = dict(current_snapshot)
            merged_fields.update(extracted_fields)
            step_name, missing_in_step = _next_step_missing(merged_fields)
            guided = _build_guided_question(step_name, missing_in_step, language)
            ack = _build_acknowledgement(extracted_fields, language)
            return {
                "reply": f"{ack}\n\n{guided}" if ack else guided,
                "fields": extracted_fields
            }


def check_missing_fields(current_fields: Dict[str, str]) -> List[str]:
    """
    Check which critical fields are still missing.

    Args:
        current_fields: Dict of currently filled fields

    Returns:
        List of missing critical field names
    """
    if not current_fields:
        return CRITICAL_FIELDS.copy()

    missing = []
    for field in CRITICAL_FIELDS:
        value = current_fields.get(field, '').strip()
        if not value:
            missing.append(field)

    return missing


def get_missing_fields_prompt(missing_fields: List[str]) -> str:
    """
    Generate a user-friendly prompt asking for missing fields.

    Args:
        missing_fields: List of missing field names

    Returns:
        Bilingual prompt message
    """
    if not missing_fields:
        return None

    # Human-readable field names (bilingual)
    field_descriptions = {
        "purpose": "business purpose (商业目的)",
        "effectiveDate": "effective date in YYYY-MM-DD format (生效日期)",
        "governingLaw": "governing law (e.g., Delaware) (管辖法律)",
        "jurisdiction": "jurisdiction/court location (管辖法院)",
        "party1Name": "Party 1 representative name (甲方姓名)",
        "party1Company": "Party 1 company name (甲方公司)",
        "party1Address": "Party 1 notice address (甲方地址)",
        "party2Name": "Party 2 representative name (乙方姓名)",
        "party2Company": "Party 2 company name (乙方公司)",
        "party2Address": "Party 2 notice address (乙方地址)"
    }

    missing_items = [field_descriptions.get(f, f) for f in missing_fields]

    if len(missing_items) == 1:
        field = missing_items[0]
        reply_en = f"To complete the agreement, I need to know: {field}. Please provide this information."
        reply_zh = f"为完成协议，我需要了解：{field}。请提供此信息。"
    else:
        items_list = ", ".join(missing_items[:-1]) + f", and {missing_items[-1]}"
        reply_en = f"I need a few more details to complete the agreement: {items_list}. Please provide them."
        reply_zh = f"我还需要一些详细信息来完成协议：{items_list}。请提供这些信息。"

    return f"{reply_en}\n\n{reply_zh}"
