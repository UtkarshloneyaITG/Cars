"""
Ball physics for Football mode.

The ball uses simple circle physics:
  - Constant friction per tick
  - Velocity-space bounce off field walls (with goal openings on left/right)
  - Impulse-based collision with car circles
  - Goal detection when ball center crosses an end wall within the goal opening
"""
import math
from .constants import BALL_RADIUS, BALL_FRICTION, BALL_WALL_BOUNCE, BALL_CAR_IMPULSE


class Ball:
    CAR_RADIUS = 26.0   # matches CAR_COLLISION_RADIUS

    def __init__(self, x: float, y: float):
        self.x      = float(x)
        self.y      = float(y)
        self.vx     = 0.0
        self.vy     = 0.0
        self.radius = BALL_RADIUS

    # ------------------------------------------------------------------ #
    #  Physics step                                                        #
    # ------------------------------------------------------------------ #
    def update(self, dt: float, bounds: tuple, goal_half: float):
        """
        Advance the ball by dt seconds.

        bounds     = (left, top, right, bottom)  — field extents
        goal_half  = half the goal opening height (centred on the field midline)

        Returns 'red' | 'blue' | None — team that just scored, if any.
        """
        self.x += self.vx * dt
        self.y += self.vy * dt

        # Frame-rate-independent friction
        friction  = BALL_FRICTION ** (dt * 30)   # tuned at 30 Hz
        self.vx  *= friction
        self.vy  *= friction

        left, top, right, bottom = bounds
        mid_y    = (top  + bottom) / 2
        goal_top = mid_y - goal_half
        goal_bot = mid_y + goal_half

        scored = None

        # ── Rounded corner deflection ──────────────────────────────────
        # Each corner is a quarter-circle of radius CORNER_R.
        # If the ball centre is inside the corner arc, push it out radially.
        CORNER_R = 28.0
        corners = [
            (left  + CORNER_R, top    + CORNER_R),   # top-left
            (right - CORNER_R, top    + CORNER_R),   # top-right
            (right - CORNER_R, bottom - CORNER_R),   # bottom-right
            (left  + CORNER_R, bottom - CORNER_R),   # bottom-left
        ]
        for cx_c, cy_c in corners:
            cdx  = self.x - cx_c
            cdy  = self.y - cy_c
            cdist = math.hypot(cdx, cdy)
            # Only act if ball is inside the rounded corner zone
            if cdist < CORNER_R + self.radius and cdist > 0:
                # Outward normal from corner centre toward ball
                cnx = cdx / cdist
                cny = cdy / cdist
                # Push ball to the surface of the rounded corner
                self.x = cx_c + cnx * (CORNER_R + self.radius)
                self.y = cy_c + cny * (CORNER_R + self.radius)
                # Reflect velocity through the outward normal
                dot = self.vx * cnx + self.vy * cny
                if dot < 0:
                    self.vx -= 2 * dot * cnx * BALL_WALL_BOUNCE
                    self.vy -= 2 * dot * cny * BALL_WALL_BOUNCE

        # ── Left wall ──────────────────────────────────────────────────
        if self.x - self.radius <= left:
            if goal_top <= self.y <= goal_bot:
                # Ball is inside the left goal opening
                if self.x + self.radius < left:
                    scored = 'blue'          # blue scores in red's (left) goal
            else:
                # Solid wall — bounce
                self.x  = left + self.radius
                self.vx = abs(self.vx) * BALL_WALL_BOUNCE

        # ── Right wall ─────────────────────────────────────────────────
        if self.x + self.radius >= right:
            if goal_top <= self.y <= goal_bot:
                if self.x - self.radius > right:
                    scored = 'red'           # red scores in blue's (right) goal
            else:
                self.x  = right - self.radius
                self.vx = -abs(self.vx) * BALL_WALL_BOUNCE

        # ── Top / bottom walls ─────────────────────────────────────────
        if self.y - self.radius <= top:
            self.y  = top + self.radius
            self.vy = abs(self.vy) * BALL_WALL_BOUNCE
        if self.y + self.radius >= bottom:
            self.y  = bottom - self.radius
            self.vy = -abs(self.vy) * BALL_WALL_BOUNCE

        return scored

    # ------------------------------------------------------------------ #
    #  Car → ball collision                                               #
    # ------------------------------------------------------------------ #
    def car_hit(self, cx: float, cy: float, cvx: float, cvy: float):
        """
        If a car overlaps the ball, push the ball out and transfer impulse.
        Call this once per car per tick *before* ball.update().
        """
        dx   = self.x - cx
        dy   = self.y - cy
        dist = math.hypot(dx, dy)
        combined = self.radius + self.CAR_RADIUS
        if dist >= combined or dist == 0:
            return

        nx = dx / dist
        ny = dy / dist

        # Separate: push ball fully out of overlap
        overlap  = combined - dist
        self.x  += nx * overlap
        self.y  += ny * overlap

        # Relative velocity of car along the collision normal
        car_normal_vel  = cvx * nx + cvy * ny
        ball_normal_vel = self.vx * nx + self.vy * ny

        # Only apply impulse if car is moving into ball
        if car_normal_vel > ball_normal_vel:
            delta       = (car_normal_vel - ball_normal_vel) * BALL_CAR_IMPULSE
            self.vx    += nx * delta
            self.vy    += ny * delta

    # ------------------------------------------------------------------ #
    #  Helpers                                                            #
    # ------------------------------------------------------------------ #
    def reset(self, x: float, y: float):
        self.x  = float(x)
        self.y  = float(y)
        self.vx = 0.0
        self.vy = 0.0

    def to_dict(self):
        return {
            'x':      round(self.x, 1),
            'y':      round(self.y, 1),
            'vx':     round(self.vx, 1),
            'vy':     round(self.vy, 1),
            'radius': self.radius,
        }
