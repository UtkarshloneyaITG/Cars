"""
Car Racing Game - Backend Server
Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import uuid
import json
import asyncio
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from game.game_manager import GameManager

app = FastAPI(title="Car Racing Game API")

# Allow the Vite dev server (port 5173) and any origin for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  Connection registry                                                 #
# ------------------------------------------------------------------ #
# player_id -> WebSocket
connections: Dict[str, WebSocket] = {}


async def broadcast(room_id: str, message: dict):
    """Send message to every player currently in room_id."""
    if not hasattr(broadcast, '_manager'):
        return
    mgr: GameManager = broadcast._manager
    for pid, rid in list(mgr.player_room.items()):
        if rid == room_id and pid in connections:
            try:
                await connections[pid].send_text(json.dumps(message))
            except Exception:
                pass


async def send_to(player_id: str, message: dict):
    ws = connections.get(player_id)
    if ws:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            pass


# Attach manager to broadcast so it can look up rooms
manager = GameManager(broadcast)
broadcast._manager = manager


# ------------------------------------------------------------------ #
#  WebSocket endpoint                                                  #
# ------------------------------------------------------------------ #
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    player_id = str(uuid.uuid4())
    connections[player_id] = websocket

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_to(player_id, {'type': 'error', 'message': 'Invalid JSON'})
                continue

            msg_type = msg.get('type')

            # ---- create_room ----
            if msg_type == 'create_room':
                player_name = msg.get('player_name', f'Player-{player_id[:4]}')
                # Generate a short, memorable room code
                room_id = str(uuid.uuid4())[:6].upper()
                try:
                    race, player = manager.join_room(room_id, player_id, player_name)
                    await send_to(player_id, {
                        'type': 'room_joined',
                        'room_id': room_id,
                        'player_id': player_id,
                        'player_slot': player.slot,
                        'car_color': player.color,
                    })
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })
                except ValueError as e:
                    await send_to(player_id, {'type': 'error', 'message': str(e)})

            # ---- join_room ----
            elif msg_type == 'join_room':
                room_id = msg.get('room_id', 'room1')
                player_name = msg.get('player_name', f'Player-{player_id[:4]}')
                try:
                    race, player = manager.join_room(room_id, player_id, player_name)
                    await send_to(player_id, {
                        'type': 'room_joined',
                        'room_id': room_id,
                        'player_id': player_id,
                        'player_slot': player.slot,
                        'car_color': player.color,
                    })
                    # Notify room of updated state
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })
                except ValueError as e:
                    await send_to(player_id, {'type': 'error', 'message': str(e)})

            # ---- ready ----
            elif msg_type == 'ready':
                race = manager.get_race_for_player(player_id)
                if race:
                    race.set_ready(player_id)
                    room_id = manager.player_room[player_id]
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })
                    if race.all_ready() and race.state == 'waiting':
                        race.start_countdown()

            # ---- select_map (host only) ----
            elif msg_type == 'select_map':
                map_id = msg.get('map_id', 'oval')
                race = manager.get_race_for_player(player_id)
                if race and race.state == 'waiting' and race.set_map(player_id, map_id):
                    room_id = manager.player_room[player_id]
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })

            # ---- select_mode (host only) ----
            elif msg_type == 'select_mode':
                mode = msg.get('mode', 'race')
                race = manager.get_race_for_player(player_id)
                if race and race.state == 'waiting' and race.set_mode(player_id, mode):
                    room_id = manager.player_room[player_id]
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })

            # ---- input ----
            elif msg_type == 'input':
                race = manager.get_race_for_player(player_id)
                if race and race.state == 'racing':
                    race.apply_input(
                        player_id,
                        float(msg.get('throttle', 0)),
                        float(msg.get('brake', 0)),
                        float(msg.get('steer', 0)),
                        float(msg.get('handbrake', 0)),
                        float(msg.get('reverse', 0)),
                    )

            # ---- join_team (football lobby) ----
            elif msg_type == 'join_team':
                team = msg.get('team', '')
                race = manager.get_race_for_player(player_id)
                if race and race.state == 'waiting' and race.set_team(player_id, team):
                    room_id = manager.player_room[player_id]
                    await broadcast(room_id, {
                        'type': 'room_update',
                        **race.room_state_dict(),
                    })

            # ---- chat ----
            elif msg_type == 'chat':
                race = manager.get_race_for_player(player_id)
                if race:
                    room_id = manager.player_room[player_id]
                    player_name = race.players[player_id].name if player_id in race.players else '?'
                    await broadcast(room_id, {
                        'type': 'chat_message',
                        'player_name': player_name,
                        'message': msg.get('message', ''),
                    })

            else:
                await send_to(player_id, {'type': 'error', 'message': f'Unknown message type: {msg_type}'})

    except WebSocketDisconnect:
        pass
    finally:
        connections.pop(player_id, None)
        room_id, race = manager.leave_room(player_id)
        if race and room_id:
            await broadcast(room_id, {
                'type': 'room_update',
                **race.room_state_dict(),
            })


@app.get("/health")
def health():
    return {"status": "ok", "rooms": len(manager.rooms)}


@app.get("/rooms")
def list_rooms():
    from game.constants import MAX_PLAYERS_PER_ROOM
    rooms = []
    for room_id, race in manager.rooms.items():
        if race.state == 'waiting':          # only show joinable rooms
            rooms.append({
                "room_id":      room_id,
                "state":        race.state,
                "player_count": len(race.players),
                "max_players":  MAX_PLAYERS_PER_ROOM,
                "players":      [p.name for p in race.players.values()],
            })
    return rooms
