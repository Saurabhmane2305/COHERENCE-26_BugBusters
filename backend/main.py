"""
main.py
FastAPI application entry point.
Mounts all routers, configures CORS, and exposes health check.
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure engines directory is importable
sys.path.insert(0, os.path.dirname(__file__))

from routers.overview    import router as overview_router
from routers.flow        import router as flow_router
from routers.anomalies   import router as anomalies_router
from routers.forecast    import router as forecast_router
from routers.reallocation import router as reallocation_router

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Budget Flow Intelligence API")
    # Pre-warm data caches on startup so first request is fast
    try:
        from engines.graph_engine    import _load_releases
        from engines.zscore_engine   import _load_expenditures
        from engines.lapse_projector import _load_expenditures as _load_exp2
        _load_releases()
        _load_expenditures()
        logger.info("Data caches warmed successfully")
    except Exception as e:
        logger.warning(f"Cache warm-up failed (CSVs may not exist yet): {e}")
    yield
    logger.info("Shutting down Budget Flow Intelligence API")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Budget Flow Intelligence API",
    description = "National Budget Flow Intelligence & Leakage Detection Platform",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(overview_router)
app.include_router(flow_router)
app.include_router(anomalies_router)
app.include_router(forecast_router)
app.include_router(reallocation_router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "budget-flow-intelligence"}


# ── Global error handler ──────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code = 500,
        content     = {"error": "Internal server error", "detail": str(exc)},
    )


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)