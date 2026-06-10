import json
from groq import Groq

from config import GROQ_API_KEY

_client = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def generate_faqs(text_content: str, num_faqs: int = 10) -> list[dict]:
    """
    Send content to Groq and generate FAQ pairs.
    Returns list of {"question": str, "answer": str} dicts.
    """
    client = get_groq_client()

    # Truncate content if too long for context window
    max_content_length = 8000
    if len(text_content) > max_content_length:
        text_content = text_content[:max_content_length] + "..."

    prompt = f"""Based on the following website content, generate exactly {num_faqs} frequently asked questions (FAQs) with clear, concise answers.

The FAQs should cover the most important topics from the content. Each answer should be helpful and informative.

Return ONLY a JSON array with objects containing "question" and "answer" fields. No other text.

Example format:
[
  {{"question": "What is the return policy?", "answer": "You can return items within 30 days of purchase."}},
  {{"question": "How do I contact support?", "answer": "You can reach us at support@example.com or call 1-800-123-4567."}}
]

Website content:
---
{text_content}
---

Generate {num_faqs} FAQs as a JSON array:"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates FAQ pairs from website content. Always respond with valid JSON arrays only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=2048,
        )

        response_text = completion.choices[0].message.content or "[]"

        # Try to extract JSON from the response
        # Sometimes the model wraps it in ```json ... ```
        response_text = response_text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```") and not in_json:
                    in_json = True
                    continue
                elif line.startswith("```") and in_json:
                    break
                elif in_json:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        faqs = json.loads(response_text)

        if not isinstance(faqs, list):
            print(f"Groq returned non-list: {type(faqs)}")
            return []

        # Validate structure
        valid_faqs = []
        for faq in faqs:
            if isinstance(faq, dict) and "question" in faq and "answer" in faq:
                valid_faqs.append({
                    "question": str(faq["question"]).strip(),
                    "answer": str(faq["answer"]).strip(),
                })

        return valid_faqs

    except json.JSONDecodeError as e:
        print(f"Failed to parse Groq response as JSON: {e}")
        return []
    except Exception as e:
        print(f"Groq API error: {e}")
        return []
