import httpx
import json
import os
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Using GPT-OSS-120B via OpenRouter as specified
MODEL = "openai/gpt-oss-120b"

# Critical fields that must be filled before PDF download
CRITICAL_FIELDS = [
    "purpose",
    "effectiveDate",
    "governingLaw",
    "jurisdiction",
    "party1Name",
    "party1Company",
    "party1Address",
    "party2Name",
    "party2Company",
    "party2Address"
]

SYSTEM_PROMPT = """You are an expert legal assistant specialized in Mutual Non-Disclosure Agreements (MNDA).
Your goal is to help the user fill out an MNDA by conducting a natural conversation and extracting information.

CRITICAL NDA FIELDS (must collect before PDF generation):
1. purpose: Business purpose of the agreement
2. effectiveDate: Agreement start date (YYYY-MM-DD format)
3. governingLaw: State governing the agreement
4. jurisdiction: Court jurisdiction location
5. party1Name: Party 1 representative name
6. party1Company: Party 1 company name
7. party1Address: Party 1 notice address
8. party2Name: Party 2 representative name
9. party2Company: Party 2 company name
10. party2Address: Party 2 notice address

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


async def get_chat_response(messages: List[Dict[str, str]], current_fields: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Call the LLM API and return chat response with extracted fields.

    Args:
        messages: User conversation messages (without system prompt)
        current_fields: Currently filled fields from the frontend

    Returns:
        Dict with 'reply' and 'fields' keys
    """
    if not OPENROUTER_API_KEY:
        return {
            "reply": "Error: OPENROUTER_API_KEY is not configured. Please set it in your .env file.",
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
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
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
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Parse and validate the response
            try:
                parsed = json.loads(content)
                # Ensure both keys exist
                if "reply" not in parsed:
                    parsed["reply"] = "I received your information but couldn't process it properly. Could you please rephrase your response?"
                if "fields" not in parsed:
                    parsed["fields"] = {}
                return parsed
            except json.JSONDecodeError:
                print(f"Failed to parse LLM response: {content}")
                return {
                    "reply": "I apologize, I encountered a technical issue. Could you please try again?",
                    "fields": {}
                }
        except httpx.HTTPStatusError as e:
            print(f"HTTP error from OpenRouter: {e}")
            return {
                "reply": f"Connection error: {e.response.status_code}. Please try again later.",
                "fields": {}
            }
        except httpx.ConnectError:
            print("Connection error to OpenRouter")
            return {
                "reply": "Could not connect to the AI service. Please check your internet connection and try again.",
                "fields": {}
            }
        except Exception as e:
            print(f"Unexpected error calling LLM: {e}")
            return {
                "reply": f"Sorry, an error occurred: {str(e)}. Please try again.",
                "fields": {}
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
