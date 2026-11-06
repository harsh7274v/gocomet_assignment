import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map rfq_id -> list of active WebSocket connections
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, rfq_id: str, websocket: WebSocket):
        await websocket.accept()
        if rfq_id not in self.active_rooms:
            self.active_rooms[rfq_id] = []
        self.active_rooms[rfq_id].append(websocket)

    def disconnect(self, rfq_id: str, websocket: WebSocket):
        if rfq_id in self.active_rooms:
            if websocket in self.active_rooms[rfq_id]:
                self.active_rooms[rfq_id].remove(websocket)
            if not self.active_rooms[rfq_id]:
                del self.active_rooms[rfq_id]

    async def broadcast_to_room(self, rfq_id: str, message: dict):
        if rfq_id in self.active_rooms:
            dead_connections = []
            for connection in self.active_rooms[rfq_id]:
                try:
                    await connection.send_text(json.dumps(message, default=str))
                except Exception:
                    dead_connections.append(connection)
            
            for dead in dead_connections:
                self.disconnect(rfq_id, dead)

ws_manager = ConnectionManager()
