TICK_RATE = 30
MAX_PLAYERS_PER_ROOM = 8
MIN_PLAYERS_TO_START = 1
CANVAS_WIDTH = 1280
CANVAS_HEIGHT = 720
TRACK_WIDTH = 140
NUM_LAPS = 3
COUNTDOWN_DURATION = 3.0

# ── Three selectable tracks ────────────────────────────────────────── #

TRACKS = {
    'oval': {
        'id': 'oval',
        'name': 'Grand Oval',
        'description': 'High-speed oval — two long straights, wide curves',
        'waypoints': [
            (250, 610), (350, 615), (500, 618), (640, 618), (780, 618), (900, 615), (1000, 610),
            (1080, 595), (1140, 560), (1175, 510), (1185, 450), (1185, 370), (1175, 310), (1140, 260), (1080, 225),
            (1000, 205), (900, 198), (780, 195), (640, 195), (500, 195), (380, 198), (260, 205),
            (190, 230), (140, 275), (115, 330), (110, 390), (115, 450), (140, 505), (190, 550), (250, 610),
        ],
        'checkpoints': [
            (640, 618, 70),
            (1185, 410, 70),
            (640, 195, 70),
            (110, 410, 70),
        ],
        'starting_grid': [
            (680, 608, 0),
            (620, 626, 0),
            (740, 626, 0),
            (560, 644, 0),
            (800, 644, 0),
            (480, 662, 0),
            (860, 662, 0),
        ],
    },
    'city': {
        'id': 'city',
        'name': 'City Sprint',
        'description': 'Technical street circuit — tight chicanes, hairpins',
        'waypoints': [
            (180, 620), (300, 625), (450, 625), (580, 620),
            (680, 605), (750, 575), (790, 535), (810, 490), (820, 440),
            (815, 385), (795, 335), (755, 295), (700, 272), (635, 262),
            (560, 268), (490, 285), (430, 270), (370, 255), (300, 262),
            (240, 285), (195, 325), (172, 378), (175, 435),
            (195, 488), (195, 540), (185, 590), (180, 620),
        ],
        'checkpoints': [
            (390, 623, 70),
            (818, 435, 70),
            (575, 265, 70),
            (174, 407, 70),
        ],
        'starting_grid': [
            (420, 613, 0),
            (350, 631, 0),
            (490, 631, 0),
            (280, 649, 0),
            (560, 649, 0),
            (210, 667, 0),
            (630, 667, 0),
        ],
    },
    'highland': {
        'id': 'highland',
        'name': 'Alpine Circuit',
        'description': 'Fast sweeper + two hairpins — technical and rewarding',
        'waypoints': [
            # Bottom straight (going right) — starts at x=300 for clean join
            (300, 608), (480, 612), (660, 612), (840, 607), (990, 592),
            # Wide fast right sweep going north
            (1090, 555), (1155, 490), (1178, 415), (1165, 338),
            # Tight top-right hairpin
            (1118, 268), (1048, 222), (960, 205), (870, 217), (795, 252),
            # Short top straight going left
            (705, 262), (580, 252), (455, 252), (348, 258),
            # Top-left hairpin (x≥178 — away from edge)
            (258, 285), (197, 348), (178, 428), (200, 508),
            # Smooth return curve sweeping right back to start
            (240, 562), (280, 592), (300, 608),
        ],
        'checkpoints': [
            (660, 612, 70),   # CP0: Start/Finish
            (1178, 415, 70),  # CP1: Right side
            (580, 252, 70),   # CP2: Top center
            (178, 428, 70),   # CP3: Left hairpin apex
        ],
        'starting_grid': [
            (690, 602, 0),
            (620, 620, 0),
            (760, 620, 0),
            (550, 638, 0),
            (830, 638, 0),
            (480, 656, 0),
            (900, 656, 0),
        ],
    },
    'field': {
        'id': 'field',
        'name': 'Open Field',
        'description': 'Wide open arena — the Cops & Robbers battlefield',
        'type': 'field',
        'bounds': (60, 40, 1220, 680),   # left, top, right, bottom
        'waypoints': [
            (60, 40), (1220, 40), (1220, 680), (60, 680),
        ],
        'checkpoints': [],
        'starting_grid': [
            (640, 360,   0),
            (200, 200,  90),
            (1080, 520, 270),
            (200,  520,  45),
            (1080, 200, 180),
            (640, 200,  90),
            (640, 520, 270),
        ],
    },
    'football': {
        'id': 'football',
        'name': 'Football Pitch',
        'description': 'Score 5 goals to win — pick your team in the lobby',
        'type': 'football',
        'bounds': (80, 60, 1200, 660),   # left, top, right, bottom
        'waypoints': [
            (80, 60), (1200, 60), (1200, 660), (80, 660),
        ],
        'checkpoints': [],
        'starting_grid': [
            (380, 360,   0),
            (900, 360, 180),
            (270, 250,   0),
            (1010, 250, 180),
            (270, 470,   0),
            (1010, 470, 180),
            (175, 360,   0),
        ],
    },
}

DEFAULT_TRACK = 'oval'

# Keep a flat alias for any code that still references TRACK_WAYPOINTS directly
TRACK_WAYPOINTS  = TRACKS['oval']['waypoints']
CHECKPOINTS      = TRACKS['oval']['checkpoints']
STARTING_GRID    = TRACKS['oval']['starting_grid']

# ── Health / respawn ──────────────────────────────────────────────── #
CAR_MAX_HEALTH              = 100.0
CAR_WALL_DAMAGE_SPEED_SCALE = 0.05    # damage = speed_at_impact * scale
CAR_COLLISION_DAMAGE_SCALE  = 0.04    # damage = relative_impulse * scale
CAR_MIN_IMPACT_SPEED        = 80.0    # minimum speed to take any damage
CAR_RESPAWN_DELAY           = 3.0     # seconds before car respawns

# ── Game modes ─────────────────────────────────────────────────────── #
GAME_MODE_RACE     = 'race'
GAME_MODE_COPS     = 'cops_robbers'
GAME_MODE_FOOTBALL = 'football'

# ── Cops & Robbers ─────────────────────────────────────────────────── #
COPS_GAME_DURATION = 120.0   # total game seconds
COPS_TAG_COOLDOWN  = 2.5     # immunity seconds after becoming thief

# ── Football ───────────────────────────────────────────────────────── #
FOOTBALL_FIELD_LEFT   = 80
FOOTBALL_FIELD_RIGHT  = 1200
FOOTBALL_FIELD_TOP    = 60
FOOTBALL_FIELD_BOTTOM = 660
FOOTBALL_GOAL_WIDTH   = 180   # y-extent of goal opening on each end wall
FOOTBALL_GOALS_TO_WIN = 5
FOOTBALL_KICKOFF_DELAY = 2.5  # seconds between goal event and next kickoff

BALL_RADIUS      = 14.0
BALL_FRICTION    = 0.986      # velocity multiplier per tick (30 Hz)
BALL_WALL_BOUNCE = 0.62
BALL_CAR_IMPULSE = 1.3        # scale factor for car→ball impulse

# Team starting grids (up to 8 per team); red = left half, blue = right half
FOOTBALL_RED_STARTS = [
    (380, 360,   0),
    (270, 250,   0),
    (270, 470,   0),
    (370, 185,   0),
    (370, 535,   0),
    (175, 295,   0),
    (175, 425,   0),
    (480, 360,   0),
]
FOOTBALL_BLUE_STARTS = [
    (900, 360, 180),
    (1010, 250, 180),
    (1010, 470, 180),
    (910, 185, 180),
    (910, 535, 180),
    (1105, 295, 180),
    (1105, 425, 180),
    (800, 360, 180),
]

# ── Physics constants ──────────────────────────────────────────────── #
CAR_WIDTH  = 24
CAR_HEIGHT = 40
CAR_MAX_SPEED         = 500.0
CAR_MAX_REVERSE_SPEED = 150.0
CAR_THROTTLE_FORCE = 180.0
CAR_BRAKE_FORCE    = 480.0
CAR_ENGINE_BRAKE   = 90.0
CAR_ROLLING_FRICTION = 0.55
CAR_LATERAL_GRIP_BASE  = 9.0
CAR_LATERAL_GRIP_HIGH  = 2.5      # lower than before — less grip at max speed → natural slide
CAR_GRIP_SPEED_START   = 150.0    # grip starts dropping sooner (was 180)
CAR_GRIP_SPEED_END     = CAR_MAX_SPEED
CAR_DRIFT_SPEED_THRESHOLD = 120.0
CAR_DRIFT_STEER_THRESHOLD = 0.18  # lower threshold — easier natural oversteer onset
CAR_DRIFT_LATERAL_BONUS   = 40.0  # one-shot lateral kick on drift entry
CAR_DRIFT_SUSTAIN_FORCE   = 20.0  # continuous lateral push per second during drift
CAR_OVERSTEER_FORCE       = 14.0  # RWD throttle-induced rear slip force
CAR_HANDBRAKE_GRIP        = 0.10  # lateral grip multiplier when handbrake held
CAR_HANDBRAKE_LATERAL_KICK = 65.0 # instant lateral push when handbrake starts
CAR_TURN_SPEED_LOW  = 120.0
CAR_TURN_SPEED_MID  = 200.0
CAR_TURN_SPEED_HIGH = 130.0
CAR_COLLISION_RADIUS = 26.0
CAR_COLLISION_RESTITUTION = 0.45
CAR_WALL_BOUNCE = 0.25

POWERUP_SPAWN_POINTS = [
    (640, 406),
    (400, 195),
    (880, 195),
    (1100, 500),
    (165, 500),
]

POWERUP_CONFIG = {
    'boost':  {'duration': 5.0,  'speed_mult': 1.5, 'color': '#FFD700', 'label': 'BOOST'},
    'nitro':  {'duration': 2.5,  'speed_mult': 2.0, 'color': '#00FFFF', 'label': 'NITRO'},
    'shield': {'duration': 7.0,  'speed_mult': 1.0, 'color': '#9B59B6', 'label': 'SHIELD'},
    'slow':   {'duration': 4.0,  'speed_mult': 0.5, 'color': '#E74C3C', 'label': 'SLOW'},
}
POWERUP_RESPAWN_TIME = 12.0

CAR_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22', '#1ABC9C', '#F06292']
