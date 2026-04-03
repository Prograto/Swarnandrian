from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket_manager import ws_manager

router = APIRouter()


@router.websocket("/leaderboard")
async def leaderboard_ws(websocket: WebSocket, room: str = Query("leaderboard")):
    await ws_manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or handle ping
            if data == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, room)


@router.websocket("/competition/{comp_id}")
async def competition_ws(websocket: WebSocket, comp_id: str):
    room = f"competition_{comp_id}"
    await ws_manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, room)
