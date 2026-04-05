from typing import Dict, Set
from fastapi import WebSocket
import json


class WebSocketManager:
    def __init__(self):
        # room_id -> set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, room: str):
        await ws.accept()
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(ws)

    def disconnect(self, ws: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room].discard(ws)
            if not self.rooms[room]:
                del self.rooms[room]

    async def broadcast(self, room: str, message: dict):
        if room not in self.rooms:
            return
        dead = set()
        for ws in self.rooms[room]:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.rooms[room].discard(ws)

    async def send_personal(self, ws: WebSocket, message: dict):
        await ws.send_text(json.dumps(message))


ws_manager = WebSocketManager()
