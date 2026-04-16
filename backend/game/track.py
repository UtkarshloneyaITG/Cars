"""
Track geometry: boundary checking, wall collision, checkpoint detection.

Wall collision uses a velocity-space bounce:
  - find the nearest point on the track centerline
  - compute the outward wall normal
  - reflect the velocity vector through that normal (scaled by restitution)
This produces a realistic bounce rather than a silent position clamp.
"""

import math
from .constants import (
    TRACK_WAYPOINTS, TRACK_WIDTH, CHECKPOINTS,
    CAR_WALL_BOUNCE,
)


class Track:

    def __init__(self, track_config=None):
        from .constants import TRACKS, DEFAULT_TRACK, TRACK_WIDTH
        cfg = track_config or TRACKS[DEFAULT_TRACK]
        self.track_type  = cfg.get('type', 'circuit')
        self.waypoints   = cfg.get('waypoints', [])
        self.half_width  = TRACK_WIDTH / 2.0
        self.checkpoints = cfg.get('checkpoints', [])
        if self.track_type in ('field', 'football'):
            self.field_bounds = cfg['bounds']   # (left, top, right, bottom)
            self._segments    = []
        else:
            self._segments = self._build_segments()

    # ------------------------------------------------------------------ #
    #  Segment helpers                                                    #
    # ------------------------------------------------------------------ #
    def _build_segments(self):
        n    = len(self.waypoints)
        segs = []
        for i in range(n):
            p1 = self.waypoints[i]
            p2 = self.waypoints[(i + 1) % n]
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            L  = math.hypot(dx, dy)
            segs.append({'p1': p1, 'p2': p2, 'dx': dx, 'dy': dy, 'L': L})
        return segs

    def _nearest_on_segment(self, x, y, seg):
        """Project (x, y) onto segment; return (proj_x, proj_y, dist)."""
        L2 = seg['L'] ** 2
        if L2 == 0:
            px, py = seg['p1']
            return px, py, math.hypot(x - px, y - py)
        t  = ((x - seg['p1'][0]) * seg['dx'] + (y - seg['p1'][1]) * seg['dy']) / L2
        t  = max(0.0, min(1.0, t))
        px = seg['p1'][0] + t * seg['dx']
        py = seg['p1'][1] + t * seg['dy']
        return px, py, math.hypot(x - px, y - py)

    def nearest_on_track(self, x, y):
        """Return (proj_x, proj_y, dist, seg_idx) for the closest centerline point."""
        best = None
        for i, seg in enumerate(self._segments):
            px, py, d = self._nearest_on_segment(x, y, seg)
            if best is None or d < best[2]:
                best = (px, py, d, i)
        return best

    # ------------------------------------------------------------------ #
    #  Wall collision                                                     #
    # ------------------------------------------------------------------ #
    def collide_wall(self, x, y, vx, vy):
        """
        If the car is outside the track boundary:
          1. Clamp its position back to the track edge.
          2. Reflect its velocity through the wall normal (physics bounce).
        Returns (new_x, new_y, new_vx, new_vy, hit_wall: bool).
        """
        if self.track_type in ('field', 'football'):
            return self._collide_field_wall(x, y, vx, vy)
        px, py, dist, _ = self.nearest_on_track(x, y)

        if dist <= self.half_width:
            return x, y, vx, vy, False   # On track — nothing to do

        # Outward direction: from centerline toward car
        if dist > 0:
            out_x = (x - px) / dist
            out_y = (y - py) / dist
        else:
            out_x, out_y = 1.0, 0.0

        # Push car back to track edge
        new_x = px + out_x * self.half_width
        new_y = py + out_y * self.half_width

        # Wall normal points inward (opposite to out direction)
        wall_nx = -out_x
        wall_ny = -out_y

        # Reflect velocity: v' = v - (1 + e)(v·n) n   where e = restitution
        dot = vx * wall_nx + vy * wall_ny
        if dot < 0:
            impulse = (1.0 + CAR_WALL_BOUNCE) * dot
            new_vx  = (vx - impulse * wall_nx) * 0.55   # rough wall scrub
            new_vy  = (vy - impulse * wall_ny) * 0.55
        else:
            new_vx = vx * 0.55
            new_vy = vy * 0.55

        return new_x, new_y, new_vx, new_vy, True

    def _collide_field_wall(self, x, y, vx, vy):
        """Rectangular boundary collision for the open field map."""
        left, top, right, bottom = self.field_bounds
        pad = 26   # car half-size
        nx, ny, nvx, nvy = x, y, vx, vy
        hit = False

        if x < left + pad:
            nx  = left + pad
            nvx = abs(vx) * 0.55
            hit = True
        elif x > right - pad:
            nx  = right - pad
            nvx = -abs(vx) * 0.55
            hit = True

        if y < top + pad:
            ny  = top + pad
            nvy = abs(vy) * 0.55
            hit = True
        elif y > bottom - pad:
            ny  = bottom - pad
            nvy = -abs(vy) * 0.55
            hit = True

        return nx, ny, nvx, nvy, hit

    # ------------------------------------------------------------------ #
    #  Checkpoint detection                                               #
    # ------------------------------------------------------------------ #
    def advance_checkpoint(self, x, y, current_cp):
        """
        Check if the car reached the NEXT checkpoint in sequence.
        Returns (new_cp_index, lap_completed: bool).
        """
        if self.track_type in ('field', 'football') or not self.checkpoints:
            return current_cp, False
        next_idx = (current_cp + 1) % len(self.checkpoints)
        cp       = self.checkpoints[next_idx]
        if math.hypot(x - cp[0], y - cp[1]) < cp[2]:
            return next_idx, (next_idx == 0)
        return current_cp, False
