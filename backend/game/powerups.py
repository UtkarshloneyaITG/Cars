import uuid
import math
import random
from .constants import POWERUP_SPAWN_POINTS, POWERUP_CONFIG, POWERUP_RESPAWN_TIME


class PowerUp:
    """A collectible power-up on the track."""

    COLLECT_RADIUS = 30  # pixels

    def __init__(self, spawn_idx: int):
        self.id = str(uuid.uuid4())[:8]
        self.spawn_idx = spawn_idx
        pos = POWERUP_SPAWN_POINTS[spawn_idx]
        self.x = float(pos[0])
        self.y = float(pos[1])
        self.powerup_type = random.choice(list(POWERUP_CONFIG.keys()))
        self.active = True          # Visible/collectable
        self.respawn_timer = 0.0

    def respawn(self):
        """Pick a new random type and mark inactive until timer expires."""
        self.active = False
        self.respawn_timer = POWERUP_RESPAWN_TIME

    def update(self, dt: float):
        if not self.active:
            self.respawn_timer -= dt
            if self.respawn_timer <= 0:
                self.active = True
                self.powerup_type = random.choice(list(POWERUP_CONFIG.keys()))
                self.id = str(uuid.uuid4())[:8]  # New ID so frontend resets animation

    def try_collect(self, px, py):
        """Return True (and mark collected) if player is close enough."""
        if not self.active:
            return False
        dist = math.hypot(px - self.x, py - self.y)
        if dist < self.COLLECT_RADIUS:
            self.respawn()
            return True
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'spawn_idx': self.spawn_idx,
            'x': self.x,
            'y': self.y,
            'type': self.powerup_type,
            'active': self.active,
            'config': POWERUP_CONFIG[self.powerup_type],
        }


def create_powerups():
    """Initialise one power-up per spawn point."""
    return [PowerUp(i) for i in range(len(POWERUP_SPAWN_POINTS))]
