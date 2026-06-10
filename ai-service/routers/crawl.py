from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional

from services.crawler import crawl_url, get_supabase
from services.groq_client import generate_faqs
from services.text_processor import clean_text, chunk_text

router = APIRouter()


class CrawlStartRequest(BaseModel):
    url: str
    agent_id: str
    max_pages: int = 10


class GenerateFaqsRequest(BaseModel):
    agent_id: str
    source_id: str


@router.post("/start")
async def start_crawl(req: CrawlStartRequest, background_tasks: BackgroundTasks):
    """Start crawling a URL. Returns immediately, crawling happens in background."""
    supabase = get_supabase()

    # Create crawl_source record
    result = supabase.table("crawl_sources").insert({
        "agent_id": req.agent_id,
        "url": req.url,
        "status": "pending",
    }).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create crawl source")

    source_id = result.data[0]["id"]

    # Start crawling in background
    background_tasks.add_task(
        crawl_url,
        url=req.url,
        agent_id=req.agent_id,
        source_id=source_id,
        max_pages=req.max_pages,
    )

    return {
        "source_id": source_id,
        "status": "crawling",
        "url": req.url,
        "max_pages": req.max_pages,
    }


@router.post("/generate-faqs")
async def generate_faqs_endpoint(req: GenerateFaqsRequest):
    """Generate FAQs from crawled content using Groq."""
    supabase = get_supabase()

    # Fetch crawled pages for the source
    result = supabase.table("crawled_pages").select(
        "content, title"
    ).eq(
        "crawl_source_id", req.source_id
    ).eq(
        "status", "scraped"
    ).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="No crawled pages found")

    # Combine all page content
    all_content = ""
    for page in result.data:
        if page.get("content"):
            title = page.get("title", "")
            all_content += f"\n\n## {title}\n{page['content']}"

    all_content = clean_text(all_content)

    # Chunk if too large and process the most informative chunks
    chunks = chunk_text(all_content, max_chars=8000)

    # Generate FAQs from the first (largest/most relevant) chunk
    content_for_faqs = chunks[0] if chunks else all_content[:8000]

    # Determine number of FAQs based on content length
    num_faqs = min(max(len(content_for_faqs) // 500, 3), 15)

    faqs = generate_faqs(content_for_faqs, num_faqs=num_faqs)

    if not faqs:
        raise HTTPException(status_code=500, detail="Failed to generate FAQs")

    # Save FAQs to database
    faqs_to_insert = []
    for faq in faqs:
        faqs_to_insert.append({
            "agent_id": req.agent_id,
            "question": faq["question"],
            "answer": faq["answer"],
            "source": "crawled",
            "is_active": True,
        })

    insert_result = supabase.table("faqs").insert(faqs_to_insert).execute()

    return {
        "generated": len(faqs),
        "faqs": faqs,
        "saved": len(insert_result.data) if insert_result.data else 0,
    }


@router.get("/status/{source_id}")
async def get_crawl_status(source_id: str):
    """Get the status of a crawl source."""
    supabase = get_supabase()

    result = supabase.table("crawl_sources").select("*").eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Crawl source not found")

    source = result.data[0]

    # Count pages
    pages_result = supabase.table("crawled_pages").select(
        "id", count="exact"
    ).eq(
        "crawl_source_id", source_id
    ).execute()

    return {
        **source,
        "total_pages": pages_result.count or 0,
    }
