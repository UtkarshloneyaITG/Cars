import uuid
from typing import Dict, Optional
from .race import Race


class GameManager:
    """Creates/manages multiple race rooms."""

    def __init__(self, broadcast_fn):
        self.broadcast = broadcast_fn
        self.rooms: Dict[str, Race] = {}
        # player_id -> room_id mapping
        self.player_room: Dict[str, str] = {}

    def get_or_create_room(self, room_id: str) -> Race:
        if room_id not in self.rooms:
            self.rooms[room_id] = Race(room_id, self.broadcast)
        return self.rooms[room_id]

    def join_room(self, room_id: str, player_id: str, player_name: str):
        """Returns (race, player) or raises ValueError."""
        race = self.get_or_create_room(room_id)
        if race.state != 'waiting':
            raise ValueError('Race already in progress')
        player = race.add_player(player_id, player_name)
        if player is None:
            raise ValueError('Room is full')
        self.player_room[player_id] = room_id
        return race, player

    def leave_room(self, player_id: str):
        room_id = self.player_room.pop(player_id, None)
        if room_id and room_id in self.rooms:
            race = self.rooms[room_id]
            race.remove_player(player_id)
            if not race.players:
                race.stop()
                del self.rooms[room_id]
            return room_id, race
        return None, None

    def get_race_for_player(self, player_id: str) -> Optional[Race]:
        room_id = self.player_room.get(player_id)
        return self.rooms.get(room_id) if room_id else None
