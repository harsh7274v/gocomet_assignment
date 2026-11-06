import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.seed import seed_database
from app.models.rfq import RFQ, RFQStatus
from app.routers import auth, rfqs, bids, auctions
from app.services.auction_engine import AuctionEngine
from app.websockets.connection_manager import ws_manager

async def auction_lifecycle_worker():
    """
    Background worker that monitors all active and scheduled auctions every 5 seconds.
    Automatically closes expired auctions and broadcasts events over WebSockets.
    """
    while True:
        try:
            await asyncio.sleep(5)
            db: Session = SessionLocal()
            try:
                active_rfqs = (
                    db.query(RFQ)
                    .filter(RFQ.status.in_([RFQStatus.ACTIVE, RFQStatus.SCHEDULED]))
                    .all()
                )
                now = datetime.utcnow()
                for rfq in active_rfqs:
                    prev_status = rfq.status
                    new_status = AuctionEngine.sync_auction_status(db, rfq, now)
                    if prev_status != new_status and new_status in (RFQStatus.CLOSED, RFQStatus.FORCE_CLOSED):
                        # Broadcast closure to connected WebSocket clients
                        await ws_manager.broadcast_to_room(rfq.id, {
                            "type": "AUCTION_CLOSED",
                            "rfq_id": rfq.id,
                            "status": new_status.value,
                            "closed_at": now.isoformat()
                        })
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Auction Lifecycle Worker Warning]: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default demo accounts & RFQs
    Base.metadata.create_all(bind=engine)
    seed_database()
    worker_task = asyncio.create_task(auction_lifecycle_worker())
    yield
    worker_task.cancel()

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
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "rfq_id": rfq_id,
            "message": "Connected to real-time British Auction stream"
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(rfq_id, websocket)
    except Exception:
        ws_manager.disconnect(rfq_id, websocket)
