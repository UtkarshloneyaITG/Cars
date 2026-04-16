export const TRACK_WIDTH = 140;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const NUM_LAPS = 3;

export const TRACKS = {
  oval: {
    id: 'oval',
    name: 'Grand Oval',
    description: 'High-speed oval — two long straights, wide curves',
    waypoints: [
      [250,610],[350,615],[500,618],[640,618],[780,618],[900,615],[1000,610],
      [1080,595],[1140,560],[1175,510],[1185,450],[1185,370],[1175,310],[1140,260],[1080,225],
      [1000,205],[900,198],[780,195],[640,195],[500,195],[380,198],[260,205],
      [190,230],[140,275],[115,330],[110,390],[115,450],[140,505],[190,550],[250,610],
    ],
    checkpoints: [
      {x:640, y:618, r:70},
      {x:1185,y:410, r:70},
      {x:640, y:195, r:70},
      {x:110, y:410, r:70},
    ],
  },
  city: {
    id: 'city',
    name: 'City Sprint',
    description: 'Technical street circuit — tight chicanes, hairpins',
    waypoints: [
      [180,620],[300,625],[450,625],[580,620],
      [680,605],[750,575],[790,535],[810,490],[820,440],
      [815,385],[795,335],[755,295],[700,272],[635,262],
      [560,268],[490,285],[430,270],[370,255],[300,262],
      [240,285],[195,325],[172,378],[175,435],
      [195,488],[195,540],[185,590],[180,620],
    ],
    checkpoints: [
      {x:390, y:623, r:70},
      {x:818, y:435, r:70},
      {x:575, y:265, r:70},
      {x:174, y:407, r:70},
    ],
  },
  highland: {
    id: 'highland',
    name: 'Alpine Circuit',
    description: 'Fast sweeper + two hairpins — technical and rewarding',
    waypoints: [
      // Bottom straight (going right) — starts at x=300 for clean join
      [300,608],[480,612],[660,612],[840,607],[990,592],
      // Wide fast right sweep going north
      [1090,555],[1155,490],[1178,415],[1165,338],
      // Tight top-right hairpin
      [1118,268],[1048,222],[960,205],[870,217],[795,252],
      // Short top straight going left
      [705,262],[580,252],[455,252],[348,258],
      // Top-left hairpin (x>=178 — away from edge)
      [258,285],[197,348],[178,428],[200,508],
      // Smooth return curve sweeping right back to start
      [240,562],[280,592],[300,608],
    ],
    checkpoints: [
      {x:660, y:612, r:70},
      {x:1178,y:415, r:70},
      {x:580, y:252, r:70},
      {x:178, y:428, r:70},
    ],
  },
  field: {
    id: 'field',
    name: 'Open Field',
    description: 'Wide open arena — the Cops & Robbers battlefield',
    type: 'field',
    bounds: { left: 60, top: 40, right: 1220, bottom: 680 },
    waypoints: [
      [60, 40], [1220, 40], [1220, 680], [60, 680],
    ],
    checkpoints: [],
  },
  football: {
    id: 'football',
    name: 'Football Pitch',
    description: 'Score 5 goals to win — pick your team in the lobby',
    type: 'football',
    bounds: { left: 80, top: 60, right: 1200, bottom: 660 },
    goalWidth: 180,   // total height of goal opening
    waypoints: [
      [80, 60], [1200, 60], [1200, 660], [80, 660],
    ],
    checkpoints: [],
  },
};

export const DEFAULT_TRACK_ID = 'oval';

// Backwards-compat aliases
export const TRACK_WAYPOINTS = TRACKS.oval.waypoints;
export const CHECKPOINTS     = TRACKS.oval.checkpoints;

// ── Geometry utilities ────────────────────────────────────────────── //

/**
 * Compute a perpendicular normal for a segment between two points.
 */
function segmentNormal(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { nx: 0, ny: -1 };
  return { nx: -dy / len, ny: dx / len };
}

/**
 * Compute left/right edge point arrays for a given set of waypoints + width.
 * Uses averaged segment normals for smooth corners.
 */
export function computeTrackEdges(waypoints, width) {
  const half = width / 2;
  const n = waypoints.length;
  const outer = [];
  const inner = [];

  for (let i = 0; i < n; i++) {
    const prev = waypoints[(i - 1 + n) % n];
    const curr = waypoints[i];
    const next = waypoints[(i + 1) % n];

    const n1 = segmentNormal(prev[0], prev[1], curr[0], curr[1]);
    const n2 = segmentNormal(curr[0], curr[1], next[0], next[1]);

    // Average the two normals
    let nx = (n1.nx + n2.nx) / 2;
    let ny = (n1.ny + n2.ny) / 2;
    const len = Math.sqrt(nx * nx + ny * ny);
    if (len > 0) { nx /= len; ny /= len; }

    outer.push([curr[0] + nx * half, curr[1] + ny * half]);
    inner.push([curr[0] - nx * half, curr[1] - ny * half]);
  }

  return { outer, inner };
}

/**
 * Build and fill a track polygon on the canvas context.
 * Uses the outer edge + reversed inner edge as the polygon.
 */
export function buildTrackPath(ctx, waypoints, width) {
  const { outer, inner } = computeTrackEdges(waypoints, width);

  ctx.beginPath();
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) {
    ctx.lineTo(outer[i][0], outer[i][1]);
  }
  ctx.closePath();

  // Cut out inner (counter-winding for even-odd rule)
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = inner.length - 1; i >= 1; i--) {
    ctx.lineTo(inner[i][0], inner[i][1]);
  }
  ctx.closePath();
}
