---
name: Cerebras 推理
description: 使用此技能编写代码，通过 LiteLLM 和 OpenRouter 调用指定 Cerebras 作为推理提供商的大语言模型 (LLM)
---

# 通过 Cerebras 调用大语言模型 (LLM)

这些指令允许你编写代码来调用 LLM，并将 Cerebras 指定为推理提供商。
该方法使用 LiteLLM 和 OpenRouter。

## 环境准备

必须在 `.env` 文件中设置 `OPENROUTER_API_KEY`，并将其作为环境变量加载。

使用 uv 管理的项目必须包含 `litellm` 和 `pydantic`。
`uv add litellm pydantic`

## 代码片段

请参考以下示例代码来使用 Cerebras。

### 导入与常量定义

```python
from litellm import completion
MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}
```

### 通过 Cerebras 获取文本回复的代码

```python
response = completion(model=MODEL, messages=messages, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
```

### 通过 Cerebras 获取结构化输出 (Structured Outputs) 的代码

```python
response = completion(model=MODEL, messages=messages, response_format=MyBaseModelSubclass, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```