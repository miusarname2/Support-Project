import re
import unicodedata


def clean_text(raw_text: str) -> str:
    """Strip extra whitespace, normalize unicode."""
    # Normalize unicode characters
    text = unicodedata.normalize("NFKC", raw_text)
    # Replace multiple spaces/tabs with single space
    text = re.sub(r"[ \t]+", " ", text)
    # Replace 3+ newlines with 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, max_chars: int = 3000) -> list[str]:
    """Split text into chunks respecting sentence boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    current_chunk = ""

    # Split by paragraphs first
    paragraphs = text.split("\n\n")

    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) + 2 <= max_chars:
            current_chunk += paragraph + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            # If a single paragraph is too long, split by sentences
            if len(paragraph) > max_chars:
                sentences = re.split(r"(?<=[.!?])\s+", paragraph)
                current_chunk = ""
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) + 1 <= max_chars:
                        current_chunk += sentence + " "
                    else:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = sentence + " "
            else:
                current_chunk = paragraph + "\n\n"

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def extract_key_sentences(text: str, n: int = 10) -> list[str]:
    """Extract most informative sentences using simple heuristics."""
    sentences = re.split(r"(?<=[.!?])\s+", text)

    # Filter out very short sentences
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    # Score sentences by informativeness
    scored = []
    for sentence in sentences:
        score = 0
        # Longer sentences tend to be more informative
        score += min(len(sentence) / 50, 3)
        # Questions are often important
        if "?" in sentence:
            score += 2
        # Sentences with numbers often contain facts
        if re.search(r"\d+", sentence):
            score += 1
        # Sentences with key phrases
        key_phrases = ["important", "note", "remember", "key", "must", "should",
                       "required", "contact", "support", "help", "price", "cost",
                       "free", "available", "hours", "address", "phone", "email"]
        for phrase in key_phrases:
            if phrase.lower() in sentence.lower():
                score += 1
                break
        scored.append((score, sentence))

    # Sort by score descending, take top n
    scored.sort(key=lambda x: x[0], reverse=True)
    return [s[1] for s in scored[:n]]
