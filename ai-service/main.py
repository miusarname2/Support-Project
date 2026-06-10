from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import AI_SERVICE_PORT, validate_config
from routers.crawl import router as crawl_router

validate_config()

app = FastAPI(title="Own Lovi AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crawl_router, prefix="/crawl", tags=["crawling"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "own-lovi-ai"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "own-lovi-ai"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=AI_SERVICE_PORT, reload=True)
