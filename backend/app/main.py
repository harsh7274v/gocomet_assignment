from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import Base, engine
from app.seed import seed_database
from app.routers import auth, rfqs, bids, auctions
from app.websockets.connection_manager import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default demo accounts & RFQs
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="British Auction in RFQ System - Reverse procurement with dynamic time extensions and forced closure ceiling.",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(rfqs.router, prefix=settings.API_V1_STR)
app.include_router(bids.router, prefix=settings.API_V1_STR)
app.include_router(auctions.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/auctions/{rfq_id}")
async def websocket_auction_endpoint(
    websocket: WebSocket,
    rfq_id: str,
    token: str = Query(None)
):
    """
    Real-time WebSocket endpoint for live British Auction room.
    Subscribers receive live bid notifications, countdown revisions, and extension alerts.
    """
    await ws_manager.connect(rfq_id, websocket)
    try:
        # Send initial connected confirmation
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "rfq_id": rfq_id,
            "message": "Connected to real-time British Auction stream"
        })

        while True:
            # Keep connection open; clients can also send ping/heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(rfq_id, websocket)
    except Exception:
        ws_manager.disconnect(rfq_id, websocket)
