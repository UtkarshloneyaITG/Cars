"""
Car physics — velocity-vector model.

The car stores a 2-D velocity (vx, vy) rather than a scalar speed.
Each tick the velocity is decomposed into the car's local frame:

    v_long  – component along the heading (forward/backward)
    v_lat   – component perpendicular to the heading (sliding / drift)

Forces are applied in the local frame, then the velocity is rebuilt in
world space.  This naturally produces:
  - speed-dependent turning radius
  - tyre slip / drift when going fast and steering hard
  - momentum when changing direction
  - realistic wall bouncing (handled by track.py, which modifies vx/vy)
"""

import math
from .constants import (
    CAR_MAX_SPEED, CAR_MAX_REVERSE_SPEED,
    CAR_THROTTLE_FORCE, CAR_BRAKE_FORCE, CAR_ENGINE_BRAKE,
    CAR_ROLLING_FRICTION,
    CAR_LATERAL_GRIP_BASE, CAR_LATERAL_GRIP_HIGH,
    CAR_GRIP_SPEED_START, CAR_GRIP_SPEED_END,
    CAR_DRIFT_SPEED_THRESHOLD, CAR_DRIFT_STEER_THRESHOLD,
    CAR_DRIFT_LATERAL_BONUS, CAR_DRIFT_SUSTAIN_FORCE, CAR_OVERSTEER_FORCE,
    CAR_TURN_SPEED_LOW, CAR_TURN_SPEED_MID, CAR_TURN_SPEED_HIGH,
    STARTING_GRID, CAR_COLORS, POWERUP_CONFIG,
    CAR_MAX_HEALTH, CAR_RESPAWN_DELAY,
    CAR_HANDBRAKE_GRIP, CAR_HANDBRAKE_LATERAL_KICK,
)


def _lerp(a, b, t):
    return a + (b - a) * max(0.0, min(1.0, t))


class Player:
    """One racing car — physics state + race state."""

    def __init__(self, player_id: str, name: str, slot: int, track_config=None):
        from .constants import TRACKS, DEFAULT_TRACK, CAR_COLORS
        cfg = track_config or TRACKS[DEFAULT_TRACK]

        self.id    = player_id
        self.name  = name
        self.slot  = slot
        self.color = CAR_COLORS[slot % len(CAR_COLORS)]

        gx, gy, ga = cfg['starting_grid'][slot % len(cfg['starting_grid'])]
        self.x     = float(gx)
        self.y     = float(gy)
        self.angle = float(ga)   # degrees  0=right  90=down

        # World-space velocity (px / s)
        self.vx = 0.0
        self.vy = 0.0

        # Derived scalar (updated every tick, sent to client)
        self.speed = 0.0

        # Drift intensity 0–1 (for frontend smoke / skid effects)
        self.drift = 0.0

        # Current inputs — written by the network handler each tick
        self.throttle  = 0.0   # [0, 1]
        self.brake     = 0.0   # [0, 1]   Arrow-Down: friction brake while moving forward
        self.reverse   = 0.0   # [0, 1]   S key: immediate reverse thrust
        self.steer     = 0.0   # [-1, +1]  negative=left  positive=right
        self.handbrake = 0.0   # [0, 1]  Space key

        # Race state
        self.lap             = 0
        self.checkpoint      = 0
        self.race_position   = 1
        self.lap_start_time  = None
        self.lap_times       = []
        self.best_lap_time   = None
        self.finished        = False
        self.finish_time     = None
        self.ready           = False

        # Power-up state
        self.active_powerup  = None
        self.powerup_timer   = 0.0
        self.is_slowed       = False
        self.slow_timer      = 0.0
        self.shield_active   = False

        # Health / respawn
        self.health          = CAR_MAX_HEALTH
        self.respawning      = False
        self.respawn_timer   = 0.0
        # Last safe checkpoint position — starts at grid spawn
        self.respawn_x       = float(gx)
        self.respawn_y       = float(gy)
        self.respawn_angle   = float(ga)

        # Cops & Robbers role state
        self.role         = 'cop'    # 'cop' | 'thief'
        self.thief_time   = 0.0      # accumulated seconds as thief
        self.tag_cooldown = 0.0      # immunity timer (thief only)

        # Internal: previous steer sign for drift initiation
        self._prev_steer       = 0.0
        self._drift_boosted    = False
        self._handbrake_kicked = False
        self._drift_intensity  = 0.0   # 0-1 smooth ramp for entry/exit feel

    # ------------------------------------------------------------------ #
    #  Physics update — called every server tick                          #
    # ------------------------------------------------------------------ #
    def update(self, dt: float):
        # ── Respawn countdown ─────────────────────────────────────────── #
        if self.respawning:
            self.respawn_timer -= dt
            if self.respawn_timer <= 0:
                self._do_respawn()
            return

        if self.finished:
            # Coast smoothly to a stop
            self.vx *= math.exp(-2.0 * dt)
            self.vy *= math.exp(-2.0 * dt)
            self.x  += self.vx * dt
            self.y  += self.vy * dt
            self.speed = math.hypot(self.vx, self.vy)
            self.drift = 0.0
            return

        # ── Power-up / debuff speed multiplier ───────────────────────── #
        speed_mult = 1.0
        if self.active_powerup and self.powerup_timer > 0:
            speed_mult = POWERUP_CONFIG[self.active_powerup]['speed_mult']
            self.powerup_timer -= dt
            if self.powerup_timer <= 0:
                self.powerup_timer = 0.0
                if self.active_powerup == 'shield':
                    self.shield_active = False
                self.active_powerup = None

        if self.is_slowed:
            speed_mult *= POWERUP_CONFIG['slow']['speed_mult']
            self.slow_timer -= dt
            if self.slow_timer <= 0:
                self.is_slowed = False

        effective_max = CAR_MAX_SPEED * speed_mult

        # ── Heading unit vectors ──────────────────────────────────────── #
        rad = math.radians(self.angle)
        fwd_x =  math.cos(rad)   # forward  (along heading)
        fwd_y =  math.sin(rad)
        lat_x = -math.sin(rad)   # lateral  (right of heading)
        lat_y =  math.cos(rad)

        # ── Decompose world velocity into car-local frame ─────────────── #
        v_long = self.vx * fwd_x + self.vy * fwd_y
        v_lat  = self.vx * lat_x + self.vy * lat_y

        speed_abs = math.hypot(self.vx, self.vy)

        # ── Lateral grip — decreases at high speed ───────────────────── #
        t_grip = max(0.0, min(1.0, (speed_abs - CAR_GRIP_SPEED_START) / max(
            CAR_GRIP_SPEED_END - CAR_GRIP_SPEED_START, 1.0
        )))
        lateral_grip = _lerp(CAR_LATERAL_GRIP_BASE, CAR_LATERAL_GRIP_HIGH, t_grip)

        # ── Handbrake (Space) — kills grip, speed-scaled lateral kick ── #
        if self.handbrake > 0.5 and speed_abs > 40:
            lateral_grip *= CAR_HANDBRAKE_GRIP
            if not self._handbrake_kicked and abs(self.steer) > 0.1:
                kick = CAR_HANDBRAKE_LATERAL_KICK * min(1.0, speed_abs / 200.0)
                v_lat += self.steer * kick
                self._handbrake_kicked = True
        else:
            self._handbrake_kicked = False

        # ── Tyre friction circle: speed × steer combined load ─────────── #
        # Real-world: lateral and longitudinal forces share one friction budget.
        # Cornering hard at speed exceeds the tyre's limit → natural oversteer
        # without any special input.  tyre_stress peaks at ~1.5 (max speed + full steer).
        tyre_stress = abs(self.steer) * max(0.0, speed_abs - 80.0) / 280.0
        # oversteer_loss: 0 → 0.35, activates progressively above stress = 0.30
        oversteer_loss = max(0.0, min(0.35, (tyre_stress - 0.30) * 1.75))
        lateral_grip  *= (1.0 - oversteer_loss)

        # ── Throttle-induced oversteer (rear-wheel drive) ─────────────── #
        # Hard acceleration while cornering: driven rear wheels break traction
        # and the rear steps out in the steer direction — classic RWD behaviour.
        if (self.throttle > 0.3 and abs(self.steer) > 0.15
                and speed_abs > 80 and self.handbrake <= 0.5):
            rwd_lat = self.throttle * tyre_stress * CAR_OVERSTEER_FORCE * dt
            v_lat  += self.steer * rwd_lat
            # Drive wheels consume lateral grip under combined load (friction circle)
            lateral_grip *= max(0.6, 1.0 - 0.20 * self.throttle)

        # ── Drift condition ───────────────────────────────────────────── #
        # Triggered by explicit steer threshold OR by natural tyre-stress oversteer
        drifting = (
            speed_abs > CAR_DRIFT_SPEED_THRESHOLD
            and (abs(self.steer) > CAR_DRIFT_STEER_THRESHOLD
                 or oversteer_loss > 0.10)
        ) or self.handbrake > 0.5

        # ── Drift intensity — smooth 0→1 ramp ────────────────────────── #
        target_intensity = 1.0 if drifting else 0.0
        ramp = 5.0 if drifting else 3.5
        self._drift_intensity += (target_intensity - self._drift_intensity) * min(1.0, ramp * dt)
        self._drift_intensity = max(0.0, min(1.0, self._drift_intensity))

        # ── Counter-steer detection: steering against the slide ──────── #
        counter_steering = (abs(v_lat) > 25.0) and (self.steer * v_lat < 0.0)

        if self._drift_intensity > 0.05 and self.handbrake <= 0.5:
            if counter_steering:
                # Driver correcting: extra grip snaps car back
                lateral_grip *= _lerp(1.0, 2.5, min(self._drift_intensity, 0.8))
            else:
                # Only stack drift-intensity grip reduction when tyre stress isn't
                # already doing the heavy lifting — prevents double-penalising at speed
                if oversteer_loss < 0.20:
                    lateral_grip *= _lerp(1.0, 0.45, self._drift_intensity)

                # One-shot lateral kick at drift initiation
                if not self._drift_boosted and self._drift_intensity < 0.3:
                    v_lat += self.steer * CAR_DRIFT_LATERAL_BONUS
                    self._drift_boosted = True

                # Sustained lateral push — keeps drift angle alive.
                # Scales back at high tyre stress so forces don't compound.
                sustain = CAR_DRIFT_SUSTAIN_FORCE * max(0.15, 1.0 - tyre_stress * 0.65)
                if abs(self.steer) > 0.1 and speed_abs > 80:
                    v_lat += self.steer * sustain * self._drift_intensity * dt
        else:
            if self.handbrake <= 0.5:
                self._drift_boosted = False

        # Exponential lateral friction:  v_lat → 0 over time
        v_lat *= math.exp(-lateral_grip * dt)

        # ── Steering — speed-dependent turn rate ─────────────────────── #
        # Peaks at mid-speed (most responsive), lower near standstill and top speed
        t_low  = min(speed_abs / 200.0, 1.0)
        t_high = max((speed_abs - 200.0) / (CAR_MAX_SPEED - 200.0), 0.0)
        turn_rate = (
            _lerp(CAR_TURN_SPEED_LOW, CAR_TURN_SPEED_MID, t_low)
            * _lerp(1.0, CAR_TURN_SPEED_HIGH / CAR_TURN_SPEED_MID, t_high)
        )
        # Reverse: flip steering direction
        if v_long < -5.0:
            self.angle -= self.steer * turn_rate * dt
        else:
            self.angle += self.steer * turn_rate * dt

        # ── Longitudinal forces ───────────────────────────────────────── #
        if self.throttle > 0.01:
            # Torque curve: full force at low speed, tapers near max speed
            torque_factor = 1.0 - 0.4 * (max(v_long, 0) / effective_max) ** 2
            # Handbrake limits throttle to ~45% — prevents rocket acceleration
            throttle_mult = 0.45 if self.handbrake > 0.5 else 1.0
            v_long += CAR_THROTTLE_FORCE * self.throttle * torque_factor * throttle_mult * dt

        elif self.reverse > 0.01:
            # S key — immediate reverse regardless of current speed
            if v_long > 5.0:
                # Still rolling forward: hard brake first to scrub speed fast
                v_long -= CAR_BRAKE_FORCE * 1.2 * self.reverse * dt
            else:
                # Stopped or already reversing: apply reverse thrust
                v_long -= CAR_THROTTLE_FORCE * 0.65 * self.reverse * dt

        elif self.brake > 0.01:
            # Arrow-Down — friction brake only (slows, does not reverse)
            if v_long > 5.0:
                v_long -= CAR_BRAKE_FORCE * self.brake * dt
            elif v_long < -5.0:
                # Braking while reversing brings car to a stop
                v_long += CAR_BRAKE_FORCE * 0.6 * self.brake * dt
            else:
                v_long = 0.0   # fully stopped, stay stopped

        else:
            # Coasting — engine braking (reduced during drift to preserve momentum)
            engine_brake = CAR_ENGINE_BRAKE * (0.15 if drifting else 1.0)
            if abs(v_long) < 15.0:
                v_long = 0.0
            elif v_long > 0:
                v_long -= engine_brake * dt
            else:
                v_long += engine_brake * dt

        # Rolling friction — reduced during drift so speed bleeds slowly,
        # but restored when throttle + handbrake are both held to prevent
        # uncontrolled acceleration.
        if drifting:
            if self.handbrake > 0.5 and self.throttle > 0.01:
                friction = 0.40   # W+Space: normal-ish friction keeps speed steady
            else:
                friction = 0.10   # pure slide/coast: maintain speed
        else:
            friction = CAR_ROLLING_FRICTION
        v_long *= math.exp(-friction * dt)

        # Clamp longitudinal speed
        v_long = max(-CAR_MAX_REVERSE_SPEED, min(effective_max, v_long))

        # ── Rebuild world-space velocity ──────────────────────────────── #
        # Re-read heading after steering update
        rad    = math.radians(self.angle)
        fwd_x  =  math.cos(rad)
        fwd_y  =  math.sin(rad)
        lat_x  = -math.sin(rad)
        lat_y  =  math.cos(rad)

        self.vx = v_long * fwd_x + v_lat * lat_x
        self.vy = v_long * fwd_y + v_lat * lat_y

        # ── Integrate position ────────────────────────────────────────── #
        self.x += self.vx * dt
        self.y += self.vy * dt

        # ── Derived display values ────────────────────────────────────── #
        self.speed = math.hypot(self.vx, self.vy)

        # Drift 0–1: ratio of lateral speed to total speed
        if self.speed > 10:
            self.drift = min(abs(v_lat) / self.speed, 1.0)
        else:
            self.drift = 0.0

        self._prev_steer = self.steer

    # ------------------------------------------------------------------ #
    #  Health / respawn                                                   #
    # ------------------------------------------------------------------ #
    def take_damage(self, amount: float) -> bool:
        """
        Apply damage to this car.
        Returns True the first time health reaches 0 (triggers respawn).
        Ignored if shield is active, already respawning, or already finished.
        """
        if self.shield_active or self.respawning or self.finished or self.health <= 0:
            return False
        self.health = max(0.0, self.health - amount)
        return self.health <= 0.0

    def trigger_respawn(self):
        """Freeze the car and start the 3-second respawn countdown."""
        self.respawning    = True
        self.respawn_timer = CAR_RESPAWN_DELAY
        self.vx = self.vy  = 0.0
        self.speed         = 0.0
        self.throttle      = 0.0
        self.brake         = 0.0
        self.reverse       = 0.0
        self.steer         = 0.0
        self.drift         = 0.0

    def _do_respawn(self):
        """Teleport to last checkpoint, restore full health."""
        self.x             = self.respawn_x
        self.y             = self.respawn_y
        self.angle         = self.respawn_angle
        self.vx            = self.vy = 0.0
        self.speed         = 0.0
        self.health        = CAR_MAX_HEALTH
        self.respawning    = False
        self.respawn_timer = 0.0

    def save_respawn_point(self):
        """Call when a checkpoint is confirmed — saves current position."""
        self.respawn_x     = self.x
        self.respawn_y     = self.y
        self.respawn_angle = self.angle

    # ------------------------------------------------------------------ #
    #  Power-ups                                                          #
    # ------------------------------------------------------------------ #
    def apply_powerup(self, powerup_type: str):
        cfg = POWERUP_CONFIG.get(powerup_type)
        if not cfg:
            return
        self.active_powerup = powerup_type
        self.powerup_timer  = cfg['duration']
        if powerup_type == 'shield':
            self.shield_active = True

    def apply_slow(self, duration: float):
        if not self.shield_active:
            self.is_slowed  = True
            self.slow_timer = max(self.slow_timer, duration)

    # ------------------------------------------------------------------ #
    #  Lap tracking                                                       #
    # ------------------------------------------------------------------ #
    def start_lap(self, now: float):
        self.lap           += 1
        self.lap_start_time = now

    def complete_lap(self, now: float):
        if self.lap_start_time is not None:
            lap_time = now - self.lap_start_time
            self.lap_times.append(lap_time)
            if self.best_lap_time is None or lap_time < self.best_lap_time:
                self.best_lap_time = lap_time
            return lap_time
        return None

    # ------------------------------------------------------------------ #
    #  Serialisation                                                      #
    # ------------------------------------------------------------------ #
    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'slot':          self.slot,
            'color':         self.color,
            'x':             round(self.x,  2),
            'y':             round(self.y,  2),
            'angle':         round(self.angle % 360, 2),
            'vx':            round(self.vx, 2),
            'vy':            round(self.vy, 2),
            'speed':         round(self.speed, 2),
            'drift':         round(self.drift, 3),
            'lap':           self.lap,
            'checkpoint':    self.checkpoint,
            'race_position': self.race_position,
            'active_powerup': self.active_powerup,
            'powerup_timer': round(self.powerup_timer, 2),
            'shield_active': self.shield_active,
            'handbrake':     self.handbrake,
            'role':          self.role,
            'thief_time':    round(self.thief_time, 2),
            'tag_cooldown':  round(self.tag_cooldown, 2),
            'health':        round(self.health, 1),
            'respawning':    self.respawning,
            'respawn_timer': round(self.respawn_timer, 2),
            'finished':      self.finished,
            'finish_time':   round(self.finish_time, 2) if self.finish_time else None,
            'best_lap_time': round(self.best_lap_time, 2) if self.best_lap_time else None,
            'ready':         self.ready,
        }
