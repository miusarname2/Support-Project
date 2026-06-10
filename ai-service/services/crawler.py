import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

HEADERS = {
    "User-Agent": "OwnLoviBot/1.0 (compatible; support crawler)"
}

SKIP_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
    ".mp4", ".mp3", ".zip", ".tar", ".gz", ".css", ".js",
    ".ico", ".woff", ".woff2", ".ttf", ".eot",
}

REMOVE_TAGS = {"script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"}


def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def is_valid_url(url: str) -> bool:
    """Check if URL is crawlable (not a file, not external schema)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    path = parsed.path.lower()
    for ext in SKIP_EXTENSIONS:
        if path.endswith(ext):
            return False
    # Skip anchors-only and mailto/tel
    if url.startswith("mailto:") or url.startswith("tel:"):
        return False
    return True


def extract_text(soup: BeautifulSoup) -> str:
    """Remove unwanted tags and extract clean text."""
    for tag in soup.find_all(REMOVE_TAGS):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)

    # Clean up excessive whitespace
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    cleaned = "\n".join(lines)

    return cleaned


def extract_title(soup: BeautifulSoup) -> str:
    """Extract page title from <title> or first <h1>."""
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        return title_tag.string.strip()

    h1_tag = soup.find("h1")
    if h1_tag:
        return h1_tag.get_text(strip=True)

    return "Untitled"


def get_internal_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    """Find same-domain links from the page."""
    base_domain = urlparse(base_url).netloc
    links = set()

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(base_url, href)

        # Remove fragments
        full_url = full_url.split("#")[0]

        parsed = urlparse(full_url)
        if parsed.netloc == base_domain and is_valid_url(full_url):
            links.add(full_url)

    return list(links)


def fetch_page(url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
    """Fetch a URL and return parsed BeautifulSoup, or None on error."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            return None

        return BeautifulSoup(response.text, "lxml")
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None


def crawl_url(url: str, agent_id: str, source_id: str, max_pages: int = 10):
    """
    Crawl a URL and its internal links.
    Saves results to Supabase crawled_pages table.
    Updates crawl_source status.
    """
    supabase = get_supabase()
    visited = set()
    to_visit = [url]
    pages_scraped = 0

    try:
        # Update status to crawling
        supabase.table("crawl_sources").update({
            "status": "crawling"
        }).eq("id", source_id).execute()

        while to_visit and pages_scraped < max_pages:
            current_url = to_visit.pop(0)

            if current_url in visited:
                continue
            visited.add(current_url)

            print(f"Crawling ({pages_scraped + 1}/{max_pages}): {current_url}")

            soup = fetch_page(current_url)
            if soup is None:
                # Save as error page
                supabase.table("crawled_pages").insert({
                    "crawl_source_id": source_id,
                    "url": current_url,
                    "title": "Error",
                    "content": None,
                    "status": "error",
                }).execute()
                continue

            title = extract_title(soup)
            content = extract_text(soup)

            # Skip pages with very little content
            if len(content) < 50:
                continue

            # Save to database
            supabase.table("crawled_pages").insert({
                "crawl_source_id": source_id,
                "url": current_url,
                "title": title,
                "content": content[:50000],  # Limit content size
                "status": "scraped",
            }).execute()

            pages_scraped += 1

            # Get internal links for further crawling
            if pages_scraped < max_pages:
                internal_links = get_internal_links(soup, current_url)
                for link in internal_links:
                    if link not in visited and link not in to_visit:
                        to_visit.append(link)

        # Update source status to completed
        supabase.table("crawl_sources").update({
            "status": "completed",
            "pages_found": pages_scraped,
            "last_crawled_at": "now()",
        }).eq("id", source_id).execute()

        print(f"Crawling completed: {pages_scraped} pages scraped for source {source_id}")

    except Exception as e:
        print(f"Crawling error for source {source_id}: {e}")
        try:
            supabase.table("crawl_sources").update({
                "status": "error",
                "error_message": str(e)[:500],
            }).eq("id", source_id).execute()
        except Exception as db_err:
            print(f"Failed to update error status: {db_err}")
