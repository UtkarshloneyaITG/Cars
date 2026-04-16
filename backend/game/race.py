import math
import asyncio
import time
from typing import Dict, Optional, Callable
from .constants import (
    NUM_LAPS, COUNTDOWN_DURATION, MIN_PLAYERS_TO_START,
    CAR_COLLISION_RADIUS, CAR_COLLISION_RESTITUTION,
    TRACKS, DEFAULT_TRACK,
    CAR_MAX_HEALTH, CAR_WALL_DAMAGE_SPEED_SCALE,
    CAR_COLLISION_DAMAGE_SCALE, CAR_MIN_IMPACT_SPEED, CAR_RESPAWN_DELAY,
    GAME_MODE_RACE, GAME_MODE_COPS, GAME_MODE_FOOTBALL,
    COPS_GAME_DURATION, COPS_TAG_COOLDOWN,
    FOOTBALL_FIELD_LEFT, FOOTBALL_FIELD_RIGHT,
    FOOTBALL_FIELD_TOP,  FOOTBALL_FIELD_BOTTOM,
    FOOTBALL_GOAL_WIDTH, FOOTBALL_GOALS_TO_WIN, FOOTBALL_KICKOFF_DELAY,
    FOOTBALL_RED_STARTS, FOOTBALL_BLUE_STARTS,
)
from .player import Player
from .track import Track
from .powerups import create_powerups, PowerUp


class RaceState:
    WAITING = 'waiting'
    COUNTDOWN = 'countdown'
    RACING = 'racing'
    FINISHED = 'finished'


class Race:
    """
    Manages one race room: players, game loop, state machine.
    broadcast_fn is an async callable(room_id, message_dict).
    """

    TICK_RATE = 30  # Hz

    def __init__(self, room_id: str, broadcast_fn: Callable):
        self.room_id = room_id
        self.broadcast = broadcast_fn
        self.players: Dict[str, Player] = {}
        self.state = RaceState.WAITING
        self.race_start_time: Optional[float] = None
        self.selected_map_id: str = DEFAULT_TRACK
        self.track = Track(TRACKS[self.selected_map_id])
        self.powerups = create_powerups()
        self._loop_task: Optional[asyncio.Task] = None
        self._countdown_task: Optional[asyncio.Task] = None
        # Host (first player to join owns mode/map selection)
        self.host_id: Optional[str] = None
        # Game mode
        self.game_mode   = GAME_MODE_RACE
        # Cops & Robbers state
        self.thief_id    = None
        self.cops_elapsed = 0.0
        # Football state
        self.teams: dict = {'red': [], 'blue': []}   # team → list of player_ids
        self.scores: dict = {'red': 0, 'blue': 0}
        self.ball = None
        self.kickoff_pending: bool = False
        self.kickoff_timer: float  = 0.0
        self.ball_stuck_timer: float = 0.0   # seconds ball has had near-zero speed

    # ------------------------------------------------------------------ #
    #  Player management                                                   #
    # ------------------------------------------------------------------ #
    def add_player(self, player_id: str, name: str) -> Optional[Player]:
        from .constants import MAX_PLAYERS_PER_ROOM
        if len(self.players) >= MAX_PLAYERS_PER_ROOM:
            return None
        slot = len(self.players)
        player = Player(player_id, name, slot, TRACKS[self.selected_map_id])
        self.players[player_id] = player
        # First player to join becomes the host
        if self.host_id is None:
            self.host_id = player_id
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)

    def set_ready(self, player_id: str):
        if player_id in self.players:
            self.players[player_id].ready = True

    def all_ready(self) -> bool:
        if len(self.players) < MIN_PLAYERS_TO_START:
            return False
        return all(p.ready for p in self.players.values())

    def apply_input(self, player_id: str, throttle: float, brake: float, steer: float,
                    handbrake: float = 0.0, reverse: float = 0.0):
        if player_id in self.players:
            p = self.players[player_id]
            p.throttle  = max(0.0, min(1.0, throttle))
            p.brake     = max(0.0, min(1.0, brake))
            p.reverse   = max(0.0, min(1.0, reverse))
            p.steer     = max(-1.0, min(1.0, steer))
            p.handbrake = max(0.0, min(1.0, handbrake))

    # ------------------------------------------------------------------ #
    #  Map / mode selection (host only)                                    #
    # ------------------------------------------------------------------ #
    def set_map(self, player_id: str, map_id: str) -> bool:
        """Returns True if accepted (caller is host and map is valid)."""
        if player_id != self.host_id or map_id not in TRACKS:
            return False
        self.selected_map_id = map_id
        return True

    def set_mode(self, player_id: str, mode: str) -> bool:
        """Returns True if accepted."""
        valid = (GAME_MODE_RACE, GAME_MODE_COPS, GAME_MODE_FOOTBALL)
        if player_id != self.host_id or mode not in valid:
            return False
        self.game_mode = mode
        return True

    def set_team(self, player_id: str, team: str) -> bool:
        """Assign a player to 'red' or 'blue' team (football only)."""
        if team not in ('red', 'blue') or player_id not in self.players:
            return False
        # Remove from whatever team they were on before
        for t in ('red', 'blue'):
            if player_id in self.teams[t]:
                self.teams[t].remove(player_id)
        self.teams[team].append(player_id)
        return True

    # ------------------------------------------------------------------ #
    #  Race lifecycle                                                      #
    # ------------------------------------------------------------------ #
    def start_countdown(self):
        if self._countdown_task:
            self._countdown_task.cancel()
        self._countdown_task = asyncio.create_task(self._countdown())

    async def _countdown(self):
        self.state = RaceState.COUNTDOWN

        from .constants import TRACKS
        track_cfg = TRACKS[self.selected_map_id]
        self.track = Track(track_cfg)

        # ── Football setup ─────────────────────────────────────────────
        if self.game_mode == GAME_MODE_FOOTBALL:
            self._setup_football_positions()
        else:
            for p in self.players.values():
                gx, gy, ga = track_cfg['starting_grid'][p.slot % len(track_cfg['starting_grid'])]
                p.x, p.y, p.angle = float(gx), float(gy), float(ga)
                p.vx, p.vy, p.speed = 0.0, 0.0, 0.0

        # ── Cops & Robbers setup ───────────────────────────────────────
        if self.game_mode == GAME_MODE_COPS:
            import random
            player_ids = list(self.players.keys())
            self.thief_id = random.choice(player_ids)
            self.cops_elapsed = 0.0
            for p in self.players.values():
                p.role         = 'thief' if p.id == self.thief_id else 'cop'
                p.thief_time   = 0.0
                p.tag_cooldown = COPS_TAG_COOLDOWN if p.id == self.thief_id else 0.0

        for count in range(int(COUNTDOWN_DURATION), 0, -1):
            await self.broadcast(self.room_id, {'type': 'countdown', 'count': count})
            await asyncio.sleep(1.0)

        now = time.time()
        self.race_start_time = now
        self.state = RaceState.RACING

        if self.game_mode == GAME_MODE_RACE:
            for p in self.players.values():
                p.lap = 1
                p.checkpoint = 0
                p.lap_start_time = now

        # ── Football: init ball & scores ───────────────────────────────
        if self.game_mode == GAME_MODE_FOOTBALL:
            from .ball import Ball
            mid_x = (FOOTBALL_FIELD_LEFT + FOOTBALL_FIELD_RIGHT) / 2
            mid_y = (FOOTBALL_FIELD_TOP  + FOOTBALL_FIELD_BOTTOM) / 2
            self.ball            = Ball(mid_x, mid_y)
            self.scores          = {'red': 0, 'blue': 0}
            self.kickoff_pending = False

        await self.broadcast(self.room_id, {
            'type': 'race_start',
            'game_mode': self.game_mode,
            'thief_id': self.thief_id,
            'teams': self.teams,
            'scores': self.scores,
        })
        self._loop_task = asyncio.create_task(self._game_loop())

    async def _game_loop(self):
        dt = 1.0 / self.TICK_RATE
        while self.state == RaceState.RACING:
            loop_start = time.perf_counter()
            if self.game_mode == GAME_MODE_COPS:
                await self._tick_cops(dt)
            elif self.game_mode == GAME_MODE_FOOTBALL:
                await self._tick_football(dt)
            else:
                await self._tick(dt)
            elapsed = time.perf_counter() - loop_start
            await asyncio.sleep(max(0.0, dt - elapsed))

    async def _tick(self, dt: float):
        now = time.time()

        for player in self.players.values():
            if player.finished:
                continue

            player.update(dt)  # handles respawn countdown internally

            if player.respawning:
                continue  # no physics while ghost-respawning

            # Wall collision — velocity-space bounce
            speed_before_bounce = player.speed
            player.x, player.y, player.vx, player.vy, hit = self.track.collide_wall(
                player.x, player.y, player.vx, player.vy
            )
            if hit:
                # Recalculate scalar speed after bounce
                player.speed = math.hypot(player.vx, player.vy)
                # Apply damage proportional to impact speed
                if speed_before_bounce > CAR_MIN_IMPACT_SPEED:
                    dmg = speed_before_bounce * CAR_WALL_DAMAGE_SPEED_SCALE
                    player.take_damage(dmg)

            # Checkpoint / lap detection
            new_cp, lap_done = self.track.advance_checkpoint(
                player.x, player.y, player.checkpoint
            )
            if new_cp != player.checkpoint:
                player.checkpoint = new_cp
                player.save_respawn_point()   # safe position for respawn
                if lap_done:
                    lap_time = player.complete_lap(now)
                    await self.broadcast(self.room_id, {
                        'type': 'lap_complete',
                        'player_id': player.id,
                        'player_name': player.name,
                        'lap': player.lap,
                        'lap_time': round(lap_time, 2) if lap_time else None,
                    })
                    if player.lap >= NUM_LAPS:
                        # Player finished!
                        player.finished = True
                        player.finish_time = now - self.race_start_time
                        await self.broadcast(self.room_id, {
                            'type': 'player_finished',
                            'player_id': player.id,
                            'player_name': player.name,
                            'finish_time': round(player.finish_time, 2),
                        })
                    else:
                        player.start_lap(now)

            # Power-up collection
            for pu in self.powerups:
                if pu.try_collect(player.x, player.y):
                    player.apply_powerup(pu.powerup_type)
                    # "slow" power-up affects others
                    if pu.powerup_type == 'slow':
                        from .constants import POWERUP_CONFIG
                        dur = POWERUP_CONFIG['slow']['duration']
                        for other in self.players.values():
                            if other.id != player.id:
                                other.apply_slow(dur)
                    await self.broadcast(self.room_id, {
                        'type': 'powerup_collected',
                        'player_id': player.id,
                        'powerup_type': pu.powerup_type,
                    })

        # Car-to-car collision resolution (also applies damage)
        self._resolve_car_collisions()

        # Check health → trigger respawn for any cars that hit 0 HP this tick
        for player in self.players.values():
            if not player.finished and not player.respawning and player.health <= 0:
                player.trigger_respawn()
                await self.broadcast(self.room_id, {
                    'type': 'player_respawn',
                    'player_id': player.id,
                    'player_name': player.name,
                    'delay': CAR_RESPAWN_DELAY,
                })

        # Update power-up respawns
        for pu in self.powerups:
            pu.update(dt)

        # Update race positions
        self._update_positions()

        # Check if race over (all finished)
        if all(p.finished for p in self.players.values()):
            await self._end_race()
            return

        # Broadcast game state
        race_time = (now - self.race_start_time) if self.race_start_time else 0
        await self.broadcast(self.room_id, {
            'type': 'game_state',
            'timestamp': now,
            'race_time': round(race_time, 2),
            'players': [p.to_dict() for p in self.players.values()],
            'powerups': [pu.to_dict() for pu in self.powerups],
        })

    async def _tick_cops(self, dt: float):
        now = time.time()
        self.cops_elapsed += dt

        for player in self.players.values():
            player.update(dt)

            # Wall / field boundary collision
            player.x, player.y, player.vx, player.vy, hit = self.track.collide_wall(
                player.x, player.y, player.vx, player.vy
            )
            if hit:
                player.speed = math.hypot(player.vx, player.vy)

            # Decrease tag cooldown
            if player.tag_cooldown > 0:
                player.tag_cooldown = max(0.0, player.tag_cooldown - dt)

        # Accumulate thief survival time
        thief = self.players.get(self.thief_id)
        if thief and not thief.tag_cooldown > 0:
            thief.thief_time += dt

        # Car collisions + tag detection
        tag_event = self._resolve_cops_collisions()
        if tag_event:
            new_thief_id, old_thief_id = tag_event
            if old_thief_id in self.players:
                self.players[old_thief_id].role = 'cop'
                self.players[old_thief_id].tag_cooldown = 0.0
            if new_thief_id in self.players:
                self.players[new_thief_id].role = 'thief'
                self.players[new_thief_id].tag_cooldown = COPS_TAG_COOLDOWN
            self.thief_id = new_thief_id
            await self.broadcast(self.room_id, {
                'type': 'thief_tagged',
                'new_thief_id': new_thief_id,
                'new_thief_name': self.players[new_thief_id].name,
                'old_thief_id': old_thief_id,
                'old_thief_name': self.players.get(old_thief_id, type('', (), {'name': '?'})()).name,
            })

        # Update positions (by thief_time for cops mode)
        self._update_cops_positions()

        # Game over?
        if self.cops_elapsed >= COPS_GAME_DURATION:
            await self._end_cops_game()
            return

        race_time_remaining = max(0.0, COPS_GAME_DURATION - self.cops_elapsed)
        await self.broadcast(self.room_id, {
            'type': 'game_state',
            'game_mode': GAME_MODE_COPS,
            'thief_id': self.thief_id,
            'game_elapsed': round(self.cops_elapsed, 2),
            'game_duration': COPS_GAME_DURATION,
            'time_remaining': round(race_time_remaining, 2),
            'timestamp': now,
            'race_time': round(self.cops_elapsed, 2),
            'players': [p.to_dict() for p in self.players.values()],
            'powerups': [],
        })

    # ------------------------------------------------------------------ #
    #  Football helpers                                                    #
    # ------------------------------------------------------------------ #
    def _setup_football_positions(self):
        """Place each player at their team starting position."""
        # Auto-assign unassigned players to balance teams
        unassigned = [
            pid for pid in self.players
            if pid not in self.teams['red'] and pid not in self.teams['blue']
        ]
        for pid in unassigned:
            if len(self.teams['red']) <= len(self.teams['blue']):
                self.teams['red'].append(pid)
            else:
                self.teams['blue'].append(pid)

        for i, pid in enumerate(self.teams['red']):
            if pid not in self.players:
                continue
            p = self.players[pid]
            gx, gy, ga = FOOTBALL_RED_STARTS[i % len(FOOTBALL_RED_STARTS)]
            p.x, p.y, p.angle = float(gx), float(gy), float(ga)
            p.vx, p.vy, p.speed = 0.0, 0.0, 0.0

        for i, pid in enumerate(self.teams['blue']):
            if pid not in self.players:
                continue
            p = self.players[pid]
            gx, gy, ga = FOOTBALL_BLUE_STARTS[i % len(FOOTBALL_BLUE_STARTS)]
            p.x, p.y, p.angle = float(gx), float(gy), float(ga)
            p.vx, p.vy, p.speed = 0.0, 0.0, 0.0

    async def _tick_football(self, dt: float):
        now = time.time()

        # ── Countdown between goals ────────────────────────────────────
        if self.kickoff_pending:
            self.kickoff_timer -= dt
            if self.kickoff_timer <= 0:
                self.kickoff_pending = False

        # ── Player physics ─────────────────────────────────────────────
        for player in self.players.values():
            player.update(dt)
            player.x, player.y, player.vx, player.vy, hit = self.track.collide_wall(
                player.x, player.y, player.vx, player.vy
            )
            if hit:
                player.speed = math.hypot(player.vx, player.vy)

        self._resolve_car_collisions()

        # ── Ball update ────────────────────────────────────────────────
        goal_scored = None
        if self.ball and not self.kickoff_pending:
            bounds    = (FOOTBALL_FIELD_LEFT, FOOTBALL_FIELD_TOP,
                         FOOTBALL_FIELD_RIGHT, FOOTBALL_FIELD_BOTTOM)
            goal_half = FOOTBALL_GOAL_WIDTH / 2

            for player in self.players.values():
                self.ball.car_hit(player.x, player.y, player.vx, player.vy)

            goal_scored = self.ball.update(dt, bounds, goal_half)

            # ── Stuck-ball recovery (> 5 s with near-zero speed) ───────
            ball_speed = math.hypot(self.ball.vx, self.ball.vy)
            if ball_speed < 15.0:
                self.ball_stuck_timer += dt
            else:
                self.ball_stuck_timer = 0.0

            if self.ball_stuck_timer >= 5.0:
                mid_x = (FOOTBALL_FIELD_LEFT + FOOTBALL_FIELD_RIGHT) / 2
                mid_y = (FOOTBALL_FIELD_TOP  + FOOTBALL_FIELD_BOTTOM) / 2
                self.ball.reset(mid_x, mid_y)
                self.ball_stuck_timer = 0.0
                await self.broadcast(self.room_id, {
                    'type':    'ball_reset',
                    'reason':  'stuck',
                })
        else:
            # Ball is frozen during kickoff — don't accumulate stuck timer
            self.ball_stuck_timer = 0.0

        # ── Goal handling ──────────────────────────────────────────────
        if goal_scored:
            self.scores[goal_scored] = self.scores.get(goal_scored, 0) + 1
            await self.broadcast(self.room_id, {
                'type':   'goal_scored',
                'team':   goal_scored,
                'scores': self.scores.copy(),
            })
            if self.scores[goal_scored] >= FOOTBALL_GOALS_TO_WIN:
                await self._end_football()
                return
            else:
                await self._football_kickoff(goal_scored)

        # ── Broadcast state ────────────────────────────────────────────
        await self.broadcast(self.room_id, {
            'type':            'game_state',
            'game_mode':       GAME_MODE_FOOTBALL,
            'timestamp':       now,
            'race_time':       round(now - (self.race_start_time or now), 2),
            'players':         [p.to_dict() for p in self.players.values()],
            'powerups':        [],
            'ball':            self.ball.to_dict() if self.ball else None,
            'scores':          self.scores.copy(),
            'teams':           self.teams,
            'kickoff_pending': self.kickoff_pending,
        })

    async def _football_kickoff(self, scored_team: str):
        """Reset ball + players to starting positions after a goal.
        The team that was scored *against* gets a kickoff advantage — their
        lead player starts slightly closer to the centre circle.
        """
        self.kickoff_pending = True
        self.kickoff_timer   = FOOTBALL_KICKOFF_DELAY

        mid_x = (FOOTBALL_FIELD_LEFT + FOOTBALL_FIELD_RIGHT) / 2
        mid_y = (FOOTBALL_FIELD_TOP  + FOOTBALL_FIELD_BOTTOM) / 2
        if self.ball:
            self.ball.reset(mid_x, mid_y)

        # Reset all player positions to team starting grids
        self._setup_football_positions()

        # Nudge the losing team's first player closer to the centre for kickoff
        losing_team = 'blue' if scored_team == 'red' else 'red'
        losing_players = [pid for pid in self.teams.get(losing_team, [])
                          if pid in self.players]
        if losing_players:
            p = self.players[losing_players[0]]
            # Move them halfway between their start and centre
            p.x = (p.x + mid_x) / 2
            p.y = (p.y + mid_y) / 2

    async def _end_football(self):
        self.state   = RaceState.FINISHED
        winner       = max(self.scores, key=self.scores.get)
        results      = [
            {'team': 'red',  'score': self.scores.get('red',  0)},
            {'team': 'blue', 'score': self.scores.get('blue', 0)},
        ]
        await self.broadcast(self.room_id, {
            'type':        'race_finish',
            'mode':        GAME_MODE_FOOTBALL,
            'winner_team': winner,
            'results':     results,
            'scores':      self.scores.copy(),
        })
        if self._loop_task:
            self._loop_task.cancel()

    def _resolve_cops_collisions(self):
        """Car physics + tag detection for cops mode. Returns (new_thief_id, old_thief_id) or None."""
        players = list(self.players.values())
        diameter = CAR_COLLISION_RADIUS * 2.0
        tag_event = None

        for i in range(len(players)):
            for j in range(i + 1, len(players)):
                a, b = players[i], players[j]
                dx = b.x - a.x
                dy = b.y - a.y
                dist = math.hypot(dx, dy)
                if dist >= diameter or dist == 0:
                    continue

                nx = dx / dist
                ny = dy / dist
                overlap = (diameter - dist) * 0.5
                a.x -= nx * overlap
                a.y -= ny * overlap
                b.x += nx * overlap
                b.y += ny * overlap

                rel_vx = b.vx - a.vx
                rel_vy = b.vy - a.vy
                rel_dot = rel_vx * nx + rel_vy * ny
                if rel_dot < 0:
                    impulse = rel_dot * (1.0 + CAR_COLLISION_RESTITUTION)
                    a.vx += impulse * nx
                    a.vy += impulse * ny
                    b.vx -= impulse * nx
                    b.vy -= impulse * ny
                    a.speed = math.hypot(a.vx, a.vy)
                    b.speed = math.hypot(b.vx, b.vy)

                # Tag detection — only one tag per tick
                if tag_event is None:
                    thief = self.players.get(self.thief_id)
                    if thief and thief.tag_cooldown <= 0:
                        if a.id == self.thief_id and b.role == 'cop':
                            tag_event = (b.id, a.id)
                        elif b.id == self.thief_id and a.role == 'cop':
                            tag_event = (a.id, b.id)

        return tag_event

    def _update_cops_positions(self):
        """Rank by thief_time descending."""
        ranked = sorted(self.players.values(), key=lambda p: p.thief_time, reverse=True)
        for i, p in enumerate(ranked):
            p.race_position = i + 1

    async def _end_cops_game(self):
        self.state = RaceState.FINISHED
        results = sorted(
            [p.to_dict() for p in self.players.values()],
            key=lambda d: d.get('thief_time', 0),
            reverse=True,
        )
        await self.broadcast(self.room_id, {
            'type': 'race_finish',
            'mode': GAME_MODE_COPS,
            'results': results,
        })
        if self._loop_task:
            self._loop_task.cancel()

    def _resolve_car_collisions(self):
        """
        Simplified elastic collision between every car pair.
        Uses circle overlap detection with impulse-based velocity exchange.
        """
        players = list(self.players.values())
        diameter = CAR_COLLISION_RADIUS * 2.0

        for i in range(len(players)):
            for j in range(i + 1, len(players)):
                a, b = players[i], players[j]
                # Skip cars that are respawning (they're ghosts)
                if a.respawning or b.respawning:
                    continue
                dx   = b.x - a.x
                dy   = b.y - a.y
                dist = math.hypot(dx, dy)
                if dist >= diameter or dist == 0:
                    continue

                # Normalised collision axis
                nx = dx / dist
                ny = dy / dist

                # Separate the cars so they don't overlap
                overlap  = (diameter - dist) * 0.5
                a.x -= nx * overlap
                a.y -= ny * overlap
                b.x += nx * overlap
                b.y += ny * overlap

                # Relative velocity along collision axis
                rel_vx  = b.vx - a.vx
                rel_vy  = b.vy - a.vy
                rel_dot = rel_vx * nx + rel_vy * ny

                # Only resolve if cars are approaching each other
                if rel_dot >= 0:
                    continue

                # Impulse magnitude (equal-mass simplified)
                impulse = rel_dot * (1.0 + CAR_COLLISION_RESTITUTION)
                a.vx += impulse * nx
                a.vy += impulse * ny
                b.vx -= impulse * nx
                b.vy -= impulse * ny

                # Recalculate derived speeds
                a.speed = math.hypot(a.vx, a.vy)
                b.speed = math.hypot(b.vx, b.vy)

                # Apply collision damage based on impact speed
                impact_speed = abs(rel_dot)
                if impact_speed > CAR_MIN_IMPACT_SPEED:
                    dmg = impact_speed * CAR_COLLISION_DAMAGE_SCALE
                    a.take_damage(dmg)
                    b.take_damage(dmg)

    def _update_positions(self):
        """Rank players by laps + checkpoints completed."""
        def rank_key(p: Player):
            if p.finished:
                return (NUM_LAPS + 10, -(p.finish_time or 9999))
            return (p.lap * 100 + p.checkpoint, 0)

        ranked = sorted(self.players.values(), key=rank_key, reverse=True)
        for i, p in enumerate(ranked):
            p.race_position = i + 1

    async def _end_race(self):
        self.state = RaceState.FINISHED
        results = sorted(
            [p.to_dict() for p in self.players.values()],
            key=lambda d: d['finish_time'] or 9999
        )
        await self.broadcast(self.room_id, {'type': 'race_finish', 'results': results})
        if self._loop_task:
            self._loop_task.cancel()

    def stop(self):
        if self._loop_task:
            self._loop_task.cancel()
        if self._countdown_task:
            self._countdown_task.cancel()

    def room_state_dict(self):
        return {
            'room_id':      self.room_id,
            'state':        self.state,
            'host_id':      self.host_id,
            'game_mode':    self.game_mode,
            'selected_map': self.selected_map_id,
            'teams':        self.teams,
            'players': [
                {'id': p.id, 'name': p.name, 'slot': p.slot,
                 'color': p.color, 'ready': p.ready}
                for p in self.players.values()
            ],
        }
