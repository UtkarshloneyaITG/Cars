import {
  TRACKS,
  DEFAULT_TRACK_ID,
  TRACK_WIDTH,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  computeTrackEdges,
} from './track.js';

// Car dimensions (in canvas pixels)
const CAR_LENGTH = 40;
const CAR_WIDTH  = 24;

// Minimap dimensions
const MM_W = 200;
const MM_H = 112;
const MM_X = CANVAS_WIDTH  - MM_W;
const MM_Y = CANVAS_HEIGHT - MM_H - 12;

// Track edge cache — keyed by map id so it recomputes on map change
let _edgesCache   = null;
let _edgesMapId   = null;
function getTrackEdges(waypoints, mapId) {
  if (!_edgesCache || _edgesMapId !== mapId) {
    _edgesCache = computeTrackEdges(waypoints, TRACK_WIDTH);
    _edgesMapId = mapId;
  }
  return _edgesCache;
}

// Resolve map data from an id string (falls back to oval)
function resolveTrack(mapId) {
  return TRACKS[mapId] || TRACKS[DEFAULT_TRACK_ID];
}

// Powerup color map
const POWERUP_COLORS = {
  boost:  '#FFD700',
  nitro:  '#00FFFF',
  shield: '#9B59B6',
  slow:   '#E74C3C',
};

// ─── Skid marks / tire smoke particle system ────────────────────────────────

// Each skid mark: { x, y, alpha, color }
const _skidMarks = [];
const MAX_SKID_MARKS = 800;

// Smoke particles: { x, y, vx, vy, radius, alpha, color }
const _smokeParticles = [];
const MAX_SMOKE = 200;

function _addSkidMark(x, y, drift, color) {
  if (_skidMarks.length >= MAX_SKID_MARKS) _skidMarks.shift();
  // Use a dark rubber color, opacity driven by drift intensity
  _skidMarks.push({ x, y, alpha: Math.min(drift * 1.2, 0.55), color: '#222' });
}

function _addSmoke(x, y, drift, color) {
  if (_smokeParticles.length >= MAX_SMOKE) _smokeParticles.shift();
  _smokeParticles.push({
    x, y,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30 - 15,
    radius: 6 + Math.random() * 6,
    alpha: 0.45 + drift * 0.3,
    color,
  });
}

function _updateAndDrawEffects(ctx, dt) {
  // Decay skid mark alpha
  for (let i = _skidMarks.length - 1; i >= 0; i--) {
    _skidMarks[i].alpha -= dt * 0.06;
    if (_skidMarks[i].alpha <= 0) { _skidMarks.splice(i, 1); continue; }
    const m = _skidMarks[i];
    ctx.fillStyle = `rgba(30,30,30,${m.alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Update + draw smoke
  for (let i = _smokeParticles.length - 1; i >= 0; i--) {
    const p = _smokeParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.radius += 12 * dt;
    p.alpha  -= dt * 1.8;
    if (p.alpha <= 0) { _smokeParticles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draw the static track (road, edges, dashes, start line, checkpoints).
 * Can be cached to an offscreen canvas for performance.
 */
export function renderTrack(ctx, mapId) {
  const track = resolveTrack(mapId);

  if (track.type === 'football') {
    _renderFootballField(ctx, track);
    return;
  }

  if (track.type === 'field') {
    _renderFieldTrack(ctx, track);
    return;
  }

  const wp    = track.waypoints;
  const cps   = track.checkpoints;
  const { outer, inner } = getTrackEdges(wp, track.id);

  // --- Road surface ---
  ctx.save();
  ctx.fillStyle = '#2C2C2C';
  ctx.beginPath();

  // Outer polygon
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) {
    ctx.lineTo(outer[i][0], outer[i][1]);
  }
  ctx.closePath();

  // Inner hole (wound opposite direction for even-odd)
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = inner.length - 1; i >= 1; i--) {
    ctx.lineTo(inner[i][0], inner[i][1]);
  }
  ctx.closePath();

  ctx.fillRule = 'evenodd';
  ctx.fill('evenodd');
  ctx.restore();

  // --- Edge lines ---
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';

  // Outer edge
  ctx.beginPath();
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
  ctx.closePath();
  ctx.stroke();

  // Inner edge
  ctx.beginPath();
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i][0], inner[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // --- Center dashes ---
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 220, 0, 0.55)';
  ctx.setLineDash([18, 22]);
  ctx.lineDashOffset = 0;
  ctx.beginPath();
  ctx.moveTo(wp[0][0], wp[0][1]);
  for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i][0], wp[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Checkpoint markers (faint arcs) ---
  ctx.save();
  cps.forEach((cp, idx) => {
    if (idx === 0) return; // Start/finish drawn below
    ctx.strokeStyle = 'rgba(100, 160, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.restore();

  // --- Start / Finish checker at CP0 — rotated perpendicular to road ---
  const sfCp = cps[0];
  const sfX  = sfCp.x;
  const sfY  = sfCp.y;

  // Find the road direction at the S/F line by locating the nearest waypoint
  // and taking the vector from its predecessor to its successor.
  let closestIdx = 0, closestDist = Infinity;
  for (let i = 0; i < wp.length; i++) {
    const dx = wp[i][0] - sfX, dy = wp[i][1] - sfY;
    const d = dx * dx + dy * dy;
    if (d < closestDist) { closestDist = d; closestIdx = i; }
  }
  const prevWp    = wp[(closestIdx - 1 + wp.length) % wp.length];
  const nextWp    = wp[(closestIdx + 1)              % wp.length];
  const roadAngle = Math.atan2(nextWp[1] - prevWp[1], nextWp[0] - prevWp[0]);

  const halfW    = TRACK_WIDTH / 2;
  const sqSize   = 14;
  const numCross = Math.ceil(TRACK_WIDTH / sqSize); // squares spanning the track width
  const numAlong = 2;                               // squares along road direction

  ctx.save();
  ctx.translate(sfX, sfY);
  ctx.rotate(roadAngle);
  // After rotation: local +X = along road, local +Y = across track (perpendicular)
  // Draw the checker strip spanning the full track width on Y, narrow on X.
  for (let col = 0; col < numAlong; col++) {
    for (let row = 0; row < numCross; row++) {
      const lx = (-numAlong / 2 + col) * sqSize;
      const ly = -halfW + row * sqSize;
      ctx.fillStyle = (col + row) % 2 === 0 ? '#ffffff' : '#000000';
      ctx.fillRect(lx, ly, sqSize, sqSize);
    }
  }
  ctx.restore();

  // S/F label — offset to the inside of the track
  ctx.save();
  ctx.font = 'bold 11px Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'center';
  const labelOffX = Math.cos(roadAngle + Math.PI / 2) * 26;
  const labelOffY = Math.sin(roadAngle + Math.PI / 2) * 26;
  ctx.fillText('S/F', sfX + labelOffX, sfY + labelOffY);
  ctx.restore();
}

function _renderFootballField(ctx, track) {
  const { left, top, right, bottom } = track.bounds;
  const W    = right - left;
  const H    = bottom - top;
  const midX = left + W / 2;
  const midY = top  + H / 2;
  const goalHalf = (track.goalWidth || 180) / 2;
  const goalDepth = 48;

  // ── Grass base (rounded corners) ───────────────────────────────────
  const cornerR = 28;
  ctx.save();
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.roundRect(left, top, W, H, cornerR);
  ctx.fill();
  // Alternating vertical grass stripes (like a real pitch)
  ctx.clip();   // clip stripes to rounded shape
  const stripeW = W / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(left + i * stripeW, top, stripeW, H);
  }
  ctx.restore();

  // ── Goal nets (behind each wall) ───────────────────────────────────
  // Left goal (red team defends)
  ctx.fillStyle = 'rgba(231,76,60,0.25)';
  ctx.fillRect(left - goalDepth, midY - goalHalf, goalDepth, goalHalf * 2);
  ctx.strokeStyle = 'rgba(231,76,60,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(left - goalDepth, midY - goalHalf, goalDepth, goalHalf * 2);
  // Net lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.5;
  for (let nx = 8; nx < goalDepth; nx += 8) {
    ctx.beginPath();
    ctx.moveTo(left - nx, midY - goalHalf);
    ctx.lineTo(left - nx, midY + goalHalf);
    ctx.stroke();
  }
  for (let ny = 8; ny < goalHalf * 2; ny += 8) {
    ctx.beginPath();
    ctx.moveTo(left - goalDepth, midY - goalHalf + ny);
    ctx.lineTo(left, midY - goalHalf + ny);
    ctx.stroke();
  }

  // Right goal (blue team defends)
  ctx.fillStyle = 'rgba(52,152,219,0.25)';
  ctx.fillRect(right, midY - goalHalf, goalDepth, goalHalf * 2);
  ctx.strokeStyle = 'rgba(52,152,219,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(right, midY - goalHalf, goalDepth, goalHalf * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.5;
  for (let nx = 8; nx < goalDepth; nx += 8) {
    ctx.beginPath();
    ctx.moveTo(right + nx, midY - goalHalf);
    ctx.lineTo(right + nx, midY + goalHalf);
    ctx.stroke();
  }
  for (let ny = 8; ny < goalHalf * 2; ny += 8) {
    ctx.beginPath();
    ctx.moveTo(right, midY - goalHalf + ny);
    ctx.lineTo(right + goalDepth, midY - goalHalf + ny);
    ctx.stroke();
  }

  // ── Pitch boundary with rounded corners ────────────────────────────
  const cr = 28;  // corner radius (matches ball physics)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;

  // Draw each of the 8 boundary segments separately so goal openings are gaps.
  // Top edge: left-corner-arc → top-right-corner-arc
  ctx.beginPath();
  ctx.moveTo(left + cr, top);
  ctx.lineTo(right - cr, top);
  ctx.arcTo(right, top, right, top + cr, cr);
  ctx.lineTo(right, midY - goalHalf);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(right, midY + goalHalf);
  ctx.lineTo(right, bottom - cr);
  ctx.arcTo(right, bottom, right - cr, bottom, cr);
  ctx.lineTo(left + cr, bottom);
  ctx.arcTo(left, bottom, left, bottom - cr, cr);
  ctx.lineTo(left, midY + goalHalf);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left, midY - goalHalf);
  ctx.lineTo(left, top + cr);
  ctx.arcTo(left, top, left + cr, top, cr);
  ctx.lineTo(right - cr, top);
  ctx.stroke();

  ctx.restore();

  // Goal posts (short lines at the opening ends)
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  [midY - goalHalf, midY + goalHalf].forEach((py) => {
    // Left post
    ctx.beginPath();
    ctx.moveTo(left - 6, py);
    ctx.lineTo(left + 6, py);
    ctx.stroke();
    // Right post
    ctx.beginPath();
    ctx.moveTo(right - 6, py);
    ctx.lineTo(right + 6, py);
    ctx.stroke();
  });
  ctx.restore();

  // ── Centre circle + line ───────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  // Halfway line
  ctx.beginPath();
  ctx.moveTo(midX, top);
  ctx.lineTo(midX, bottom);
  ctx.stroke();
  // Centre circle
  const cR = Math.min(W, H) * 0.12;
  ctx.beginPath();
  ctx.arc(midX, midY, cR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Centre dot
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(midX, midY, 5, 0, Math.PI * 2);
  ctx.fill();

  // ── Penalty boxes ──────────────────────────────────────────────────
  const pbW = W * 0.12;
  const pbH = H * 0.42;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(left,          midY - pbH / 2, pbW, pbH);   // left box
  ctx.strokeRect(right - pbW,   midY - pbH / 2, pbW, pbH);   // right box
  ctx.restore();

  // ── Penalty spots ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(left + pbW * 0.6, midY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(right - pbW * 0.6, midY, 4, 0, Math.PI * 2);
  ctx.fill();

  // ── Team zone tints ────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(231,76,60,0.07)';
  ctx.fillRect(left, top, W / 2, H);
  ctx.fillStyle = 'rgba(52,152,219,0.07)';
  ctx.fillRect(midX, top, W / 2, H);

  // RED / BLUE labels on each half
  ctx.save();
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(231,76,60,0.35)';
  ctx.fillText('RED', left + W / 4, midY);
  ctx.fillStyle = 'rgba(52,152,219,0.35)';
  ctx.fillText('BLUE', right - W / 4, midY);
  ctx.restore();
}

function drawBall(ctx, ball, timestamp) {
  if (!ball) return;
  const { x, y, radius } = ball;
  const r = radius || 14;

  ctx.save();

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur  = 10;
  ctx.shadowOffsetY = 4;

  // Ball body
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#e0e0e0');
  grad.addColorStop(1,   '#888');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Classic football pentagon pattern (simplified with arcs)
  ctx.strokeStyle = 'rgba(30,30,30,0.55)';
  ctx.lineWidth = 1.5;

  // Top pentagon
  ctx.beginPath();
  ctx.arc(x, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom-left arc
  ctx.beginPath();
  ctx.arc(x - r * 0.5, y + r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom-right arc
  ctx.beginPath();
  ctx.arc(x + r * 0.5, y + r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.stroke();

  // Outer ring
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _renderFieldTrack(ctx, track) {
  const { left, top, right, bottom } = track.bounds;
  const W = right - left;
  const H = bottom - top;
  const midX = left + W / 2;
  const midY = top  + H / 2;

  // Grass base
  ctx.fillStyle = '#2d6a2d';
  ctx.fillRect(left, top, W, H);

  // Alternating stripe pattern
  for (let i = 0; i * 80 < W; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(left + i * 80, top, 80, H);
    }
  }

  // White boundary
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(left + 6, top + 6, W - 12, H - 12);
  ctx.restore();

  // Center line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(midX, top + 6);
  ctx.lineTo(midX, bottom - 6);
  ctx.stroke();
  ctx.restore();

  // Center circle
  const cR = Math.min(W, H) * 0.13;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(midX, midY, cR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Center dot
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(midX, midY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Penalty boxes
  const pbW = W * 0.14, pbH = H * 0.45;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(left + 6, midY - pbH / 2, pbW, pbH);          // left box
  ctx.strokeRect(right - 6 - pbW, midY - pbH / 2, pbW, pbH);  // right box
  ctx.restore();

  // Corner arcs
  const cornerR = 28;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  [
    [left  + 6, top    + 6, 0,           Math.PI / 2],
    [right - 6, top    + 6, Math.PI / 2, Math.PI],
    [right - 6, bottom - 6, Math.PI,     Math.PI * 3 / 2],
    [left  + 6, bottom - 6, Math.PI * 3 / 2, Math.PI * 2],
  ].forEach(([cx, cy, sa, ea]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerR, sa, ea);
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Draw a single car (translated & rotated).
 * Emits skid marks + smoke when player.drift > threshold.
 */
function drawCar(ctx, player, isLocalPlayer, timestamp, dt) {
  // In football mode _displayColor overrides the car's assigned colour:
  //   local player → white  |  teammates → team colour
  const color = player._displayColor ?? player.color;
  const { x, y, angle, name, race_position, speed, drift = 0,
          shield_active, finished, active_powerup, vx = 0, vy = 0,
          health = 100, respawning = false, respawn_timer = 0,
          handbrake = 0 } = player;

  // ── Drift effects (skid marks + tire smoke) — drawn BEFORE the car ──
  const DRIFT_THRESHOLD = 0.18;
  if (drift > DRIFT_THRESHOLD && !finished && speed > 40) {
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const halfL = CAR_LENGTH / 2;
    const halfW = CAR_WIDTH  / 2;

    // Rear wheel world positions
    const wheelOffsets = [
      { ox: -halfL + 4, oy:  halfW - 1 },
      { ox: -halfL + 4, oy: -halfW + 1 },
    ];

    wheelOffsets.forEach(({ ox, oy }) => {
      const wx = x + cosA * ox - sinA * oy;
      const wy = y + sinA * ox + cosA * oy;
      _addSkidMark(wx, wy, drift, color);
      if (drift > 0.35 && Math.random() < 0.4) {
        _addSmoke(wx, wy, drift, 'rgba(180,180,180,1)');
      }
    });
  }

  // Nitro smoke (cyan)
  if (active_powerup === 'nitro' && !finished && Math.random() < 0.6) {
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const wx = x - cosA * (CAR_LENGTH / 2);
    const wy = y - sinA * (CAR_LENGTH / 2);
    _addSmoke(wx, wy, 0.6, 'rgba(0,220,255,0.7)');
  }

  const angleRad = (angle * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // Shield aura
  if (shield_active) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const shieldRadius = Math.max(CAR_LENGTH, CAR_WIDTH) / 2 + 8;
    const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius - 8, 0, 0, shieldRadius + 6);
    const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.004);
    shieldGrad.addColorStop(0, `rgba(79, 195, 247, ${0.15 + pulse * 0.15})`);
    shieldGrad.addColorStop(1, `rgba(79, 195, 247, 0)`);
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(79, 195, 247, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Speed lines (if fast) — trail behind the car
  if (speed > 300 && !finished) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const alpha = Math.min(1, (speed - 300) / 200) * 0.4;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const oy = -CAR_WIDTH / 2 + (i * CAR_WIDTH) / 4 + CAR_WIDTH / 8;
      const lineLen = 10 + (speed - 300) / 40;
      ctx.beginPath();
      ctx.moveTo(-CAR_LENGTH / 2 - 2, oy);
      ctx.lineTo(-CAR_LENGTH / 2 - 2 - lineLen, oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Drift wobble indicator — subtle red tint on tyres when sliding
  if (drift > 0.25 && !finished) {
    ctx.save();
    ctx.shadowBlur = 0;
    const halfL = CAR_LENGTH / 2;
    const halfW = CAR_WIDTH  / 2;
    ctx.strokeStyle = `rgba(255, 60, 60, ${drift * 0.7})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfL + 2, -halfW - 4, 10, 5);   // rear-left tyre
    ctx.strokeRect(-halfL + 2,  halfW - 1, 10, 5);   // rear-right tyre
    ctx.restore();
  }

  // ── IMPROVED CAR BODY ─────────────────────────────────────────────────

  const halfL = CAR_LENGTH / 2;  // 20
  const halfW = CAR_WIDTH  / 2;  // 12

  // Finished / respawning players are faded
  const bodyAlpha = finished ? 0.5 : (respawning ? 0.25 : 1);
  ctx.globalAlpha = bodyAlpha;

  // ── 1. Tires (drawn under body) ─────────────────────────────────────
  const tW = 11, tH = 7, tR = 2.5;
  const tires = [
    { tx: halfL - 13,  ty:  halfW - 1        },  // front-right
    { tx: halfL - 13,  ty: -halfW - tH + 1   },  // front-left
    { tx: -halfL + 2,  ty:  halfW - 1        },  // rear-right
    { tx: -halfL + 2,  ty: -halfW - tH + 1   },  // rear-left
  ];

  tires.forEach(({ tx, ty }) => {
    // Rubber
    ctx.fillStyle = '#161616';
    roundRect(ctx, tx, ty, tW, tH, tR);
    ctx.fill();
    // Tire sidewall highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.6;
    roundRect(ctx, tx + 0.5, ty + 0.5, tW - 1, tH - 1, tR);
    ctx.stroke();
    // Metallic rim
    const cx = tx + tW / 2, cy = ty + tH / 2;
    const rg = ctx.createRadialGradient(cx - 0.7, cy - 0.7, 0, cx, cy, 3);
    rg.addColorStop(0,   '#e8e8e8');
    rg.addColorStop(0.5, '#aaaaaa');
    rg.addColorStop(1,   '#444');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    // Spoke cross
    ctx.strokeStyle = 'rgba(10,10,10,0.75)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(cx - 2.4, cy); ctx.lineTo(cx + 2.4, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 2.4); ctx.lineTo(cx, cy + 2.4); ctx.stroke();
  });

  // Handbrake — rear tires glow red-orange
  if (handbrake > 0.5 && !finished) {
    ctx.save();
    ctx.shadowBlur = 0;
    [tires[2], tires[3]].forEach(({ tx, ty }) => {
      ctx.fillStyle = 'rgba(255, 75, 0, 0.88)';
      roundRect(ctx, tx, ty, tW, tH, tR);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── 2. Main body ─────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur  = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

  const bodyGrad = ctx.createLinearGradient(-halfL, -halfW, halfL, halfW);
  bodyGrad.addColorStop(0,   lightenColor(color, 48));
  bodyGrad.addColorStop(0.35, lightenColor(color, 14));
  bodyGrad.addColorStop(0.65, color);
  bodyGrad.addColorStop(1,   darkenColor(color, 40));
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, -halfL, -halfW, CAR_LENGTH, CAR_WIDTH, 5);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Body outline
  ctx.strokeStyle = darkenColor(color, 60);
  ctx.lineWidth = 1.2;
  roundRect(ctx, -halfL, -halfW, CAR_LENGTH, CAR_WIDTH, 5);
  ctx.stroke();

  // ── 3. Roof / cockpit ────────────────────────────────────────────────
  const roofL = CAR_LENGTH * 0.42;   // ~16.8px
  const roofH = CAR_WIDTH  * 0.72;   // ~17.3px
  const roofX = -roofL / 2 - 1;
  const roofY = -roofH / 2;

  // Cockpit surround (darker body color)
  ctx.fillStyle = darkenColor(color, 30);
  roundRect(ctx, roofX, roofY, roofL, roofH, 4);
  ctx.fill();

  // Glass
  ctx.fillStyle = 'rgba(10, 28, 70, 0.88)';
  roundRect(ctx, roofX + 1.5, roofY + 1.5, roofL - 3, roofH - 3, 3);
  ctx.fill();

  // Glass glint (top-left shimmer)
  const glintG = ctx.createLinearGradient(roofX + 2, roofY + 2, roofX + roofL * 0.6, roofY + roofH * 0.55);
  glintG.addColorStop(0, 'rgba(255,255,255,0.36)');
  glintG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glintG;
  roundRect(ctx, roofX + 2, roofY + 2, roofL * 0.52, roofH * 0.44, 2);
  ctx.fill();

  // ── 4. Front windshield ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(16, 38, 85, 0.90)';
  roundRect(ctx, halfL - 12, -halfW + 4, 8, CAR_WIDTH - 8, 2);
  ctx.fill();
  // Windshield vertical glint
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.fillRect(halfL - 11, -halfW + 5, 2, (CAR_WIDTH - 10) * 0.48);

  // ── 5. Rear window ───────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(16, 36, 76, 0.72)';
  roundRect(ctx, -halfL + 4, -halfW + 4, 7, CAR_WIDTH - 8, 2);
  ctx.fill();

  // ── 6. Headlights ────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(255, 253, 210, 0.95)';
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = '#FFFBE8';
  ctx.fillRect(halfL - 2, -halfW + 1, 2, 4);   // left
  ctx.fillRect(halfL - 2,  halfW - 5, 2, 4);   // right
  ctx.shadowBlur  = 0;

  // ── 7. Tail lights ───────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(220, 0, 0, 0.85)';
  ctx.shadowBlur  = 6;
  ctx.fillStyle   = '#CC0000';
  ctx.fillRect(-halfL, -halfW + 1, 2, 4);   // left
  ctx.fillRect(-halfL,  halfW - 5, 2, 4);   // right
  ctx.shadowBlur  = 0;

  // ── 8. Center accent stripe ──────────────────────────────────────────
  const stripeGrad = ctx.createLinearGradient(-halfL, 0, halfL, 0);
  stripeGrad.addColorStop(0,   'rgba(255,255,255,0)');
  stripeGrad.addColorStop(0.18,'rgba(255,255,255,0.13)');
  stripeGrad.addColorStop(0.82,'rgba(255,255,255,0.13)');
  stripeGrad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(-halfL + 2, -1.3, CAR_LENGTH - 4, 2.6);

  // Exhaust flame — boost = orange, nitro = cyan
  if ((active_powerup === 'boost' || active_powerup === 'nitro') && !finished) {
    ctx.save();
    ctx.shadowBlur = 0;
    const isNitro = active_powerup === 'nitro';
    const flameLen = (isNitro ? 22 : 14) + 6 * Math.sin(timestamp * 0.02);
    const c0 = isNitro ? 'rgba(0,240,255,0.95)'  : 'rgba(255,200,0,0.95)';
    const c1 = isNitro ? 'rgba(0,120,255,0.7)'   : 'rgba(255,80,0,0.7)';
    const c2 = isNitro ? 'rgba(0,60,200,0)'      : 'rgba(255,30,0,0)';
    const flameGrad = ctx.createLinearGradient(-halfL, 0, -halfL - flameLen, 0);
    flameGrad.addColorStop(0,   c0);
    flameGrad.addColorStop(0.4, c1);
    flameGrad.addColorStop(1,   c2);
    ctx.fillStyle = flameGrad;
    const w = isNitro ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(-halfL,  w);
    ctx.lineTo(-halfL - flameLen, 0);
    ctx.lineTo(-halfL, -w);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Cop siren lights (blue/red flash) — hidden in football mode ────
  if (player.role === 'cop' && !finished && !player._teamColor) {
    ctx.save();
    ctx.shadowBlur = 0;
    const sirenPhase = Math.sin(timestamp * 0.015);
    // Left siren (red)
    ctx.fillStyle = sirenPhase > 0 ? 'rgba(231,76,60,0.95)' : 'rgba(231,76,60,0.2)';
    ctx.beginPath();
    ctx.arc(-6, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Right siren (blue)
    ctx.fillStyle = sirenPhase < 0 ? 'rgba(52,152,219,0.95)' : 'rgba(52,152,219,0.2)';
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Thief pulsing aura ─────────────────────────────────────────────
  if (player.role === 'thief' && !finished) {
    ctx.save();
    ctx.shadowBlur = 0;
    const thiefPulse = 0.5 + 0.5 * Math.sin(timestamp * 0.006);
    const thiefR = Math.max(CAR_LENGTH, CAR_WIDTH) / 2 + 10;
    const thiefGrad = ctx.createRadialGradient(0, 0, thiefR - 10, 0, 0, thiefR + 8);
    // Immunity = rainbow shimmer, normal = red
    const isImmune = (player.tag_cooldown ?? 0) > 0;
    const c1 = isImmune ? `rgba(255,255,100,${0.35 + thiefPulse * 0.35})` : `rgba(231,76,60,${0.3 + thiefPulse * 0.3})`;
    const c2 = isImmune ? 'rgba(255,200,0,0)' : 'rgba(231,76,60,0)';
    thiefGrad.addColorStop(0, c1);
    thiefGrad.addColorStop(1, c2);
    ctx.fillStyle = thiefGrad;
    ctx.beginPath();
    ctx.arc(0, 0, thiefR + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Name + position badge (always upright, centred above the car) ──────
  //  Layout:  ┌──────┬─────────────────┐
  //           │  P1  │   PlayerName    │
  //           └──────┴─────────────────┘
  //  The badge sits 34px above the car centre so it's clear even when rotated.
  ctx.save();

  const pos        = race_position != null ? race_position : '?';
  const posLabel   = `P${pos}`;
  const posColors  = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const rankColor  = posColors[pos] || '#aaaaaa';
  const nameColor  = isLocalPlayer ? '#FFD700' : '#e8e8ee';

  const BADGE_H    = 18;
  const PADDING    = 6;
  const DIVIDER    = 2;  // gap between pos chip and name area

  // Measure text widths
  ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
  const nameW = ctx.measureText(name).width;
  ctx.font = 'bold 10px "Courier New", monospace';
  const posW  = ctx.measureText(posLabel).width;

  const chipW  = posW  + PADDING * 2;        // left coloured chip
  const textW  = nameW + PADDING * 2;        // right name area
  const totalW = chipW + DIVIDER + textW;

  // Position badge 34px above car centre
  const bx = x - totalW / 2;
  const by = y - CAR_LENGTH / 2 - 34 - BADGE_H;  // above the car tip

  // Outer pill — dark background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.82)';
  roundRect(ctx, bx, by, totalW, BADGE_H, BADGE_H / 2);
  ctx.fill();

  // Thin border (car colour)
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, totalW, BADGE_H, BADGE_H / 2);
  ctx.stroke();

  // Left position chip
  ctx.fillStyle = rankColor;
  roundRect(ctx, bx, by, chipW, BADGE_H, BADGE_H / 2);
  ctx.fill();

  // Clamp chip to left side — mask out right half of the pill
  ctx.fillStyle = 'rgba(10, 10, 20, 0.82)';
  ctx.fillRect(bx + chipW - BADGE_H / 2, by, BADGE_H / 2 + DIVIDER, BADGE_H);

  // Position label
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(posLabel, bx + chipW / 2, by + BADGE_H / 2);

  // Player name
  ctx.fillStyle = nameColor;
  ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, bx + chipW + DIVIDER + PADDING, by + BADGE_H / 2);

  // Small arrow pointing down to the car
  ctx.fillStyle = 'rgba(10, 10, 20, 0.70)';
  ctx.beginPath();
  ctx.moveTo(x - 5, by + BADGE_H);
  ctx.lineTo(x + 5, by + BADGE_H);
  ctx.lineTo(x,     by + BADGE_H + 6);
  ctx.closePath();
  ctx.fill();

  // ── Health bar (just above the badge) — hidden in football mode ─────
  if (!player._teamColor) {
    const BAR_W  = Math.max(totalW, 48);
    const BAR_H  = 5;
    const barX   = x - BAR_W / 2;
    const barY   = by - 4 - BAR_H;
    const hpPct  = Math.max(0, Math.min(1, health / 100));
    const hpColor = hpPct > 0.6 ? '#2ecc71' : hpPct > 0.3 ? '#f1c40f' : '#e74c3c';

    // Track (background)
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, barX, barY, BAR_W, BAR_H, BAR_H / 2);
    ctx.fill();

    // Fill
    if (hpPct > 0) {
      ctx.fillStyle = hpColor;
      const fillW = BAR_W * hpPct;
      roundRect(ctx, barX, barY, fillW, BAR_H, BAR_H / 2);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.5;
    roundRect(ctx, barX, barY, BAR_W, BAR_H, BAR_H / 2);
    ctx.stroke();
  }

  ctx.restore();

  // ── Respawn countdown overlay ────────────────────────────────────────
  if (respawning) {
    ctx.save();
    const countdown = Math.ceil(respawn_timer);
    const pulse = 0.55 + 0.45 * Math.sin(timestamp * 0.008);

    // Red pulsing circle on the car
    ctx.fillStyle = `rgba(200,30,30,${0.7 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Countdown number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countdown > 0 ? String(countdown) : '!', x, y);

    // "RESPAWN" label below the car
    ctx.fillStyle = 'rgba(255,80,80,0.9)';
    ctx.font = 'bold 9px "Segoe UI", sans-serif';
    ctx.fillText('RESPAWN', x, y + CAR_LENGTH / 2 + 12);

    ctx.restore();
  }
}

/**
 * Draw a powerup on the track.
 */
function drawPowerup(ctx, pu, timestamp) {
  if (!pu.active) return;

  const { x, y, type, config } = pu;
  const color = (config && config.color) || POWERUP_COLORS[type] || '#FFD700';
  const label = (config && config.label) || (type ? type.toUpperCase() : '?');

  const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.004 + x * 0.01);
  const radius = 14 + pulse * 4;

  ctx.save();

  // Outer glow
  const grd = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius + 8);
  grd.addColorStop(0, color + 'cc');
  grd.addColorStop(1, color + '00');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
  ctx.fill();

  // Main circle
  ctx.fillStyle = color + 'dd';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = '#000';
  ctx.font = `bold ${Math.max(8, Math.floor(radius * 0.55))}px Courier New, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.substring(0, 3), x, y);

  ctx.restore();
}

/**
 * Draw minimap overlay.
 */
function drawMinimap(ctx, players, mapId) {
  const scaleX = MM_W / CANVAS_WIDTH;
  const scaleY = MM_H / CANVAS_HEIGHT;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.82)';
  roundRect(ctx, MM_X - 2, MM_Y - 2, MM_W + 4, MM_H + 4, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, MM_X - 2, MM_Y - 2, MM_W + 4, MM_H + 4, 8);
  ctx.stroke();

  // Track outline using active map
  const track = resolveTrack(mapId);

  // Field / football map: draw rectangle instead of track edges
  if (track.type === 'field' || track.type === 'football') {
    const { left, top, right, bottom } = track.bounds;
    const scaleX = MM_W / CANVAS_WIDTH;
    const scaleY = MM_H / CANVAS_HEIGHT;
    ctx.fillStyle = 'rgba(30,80,30,0.7)';
    ctx.fillRect(
      MM_X + left * scaleX, MM_Y + top * scaleY,
      (right - left) * scaleX, (bottom - top) * scaleY
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      MM_X + left * scaleX, MM_Y + top * scaleY,
      (right - left) * scaleX, (bottom - top) * scaleY
    );
    // Player dots
    if (players) {
      players.forEach((p) => {
        if (p.x == null || p.y == null) return;
        const px = MM_X + p.x * scaleX;
        const py = MM_Y + p.y * scaleY;
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MAP', MM_X + 4, MM_Y + 3);
    ctx.restore();
    return;
  }

  const { outer, inner } = getTrackEdges(track.waypoints, track.id);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(MM_X + outer[0][0] * scaleX, MM_Y + outer[0][1] * scaleY);
  for (let i = 1; i < outer.length; i++) {
    ctx.lineTo(MM_X + outer[i][0] * scaleX, MM_Y + outer[i][1] * scaleY);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(MM_X + inner[0][0] * scaleX, MM_Y + inner[0][1] * scaleY);
  for (let i = 1; i < inner.length; i++) {
    ctx.lineTo(MM_X + inner[i][0] * scaleX, MM_Y + inner[i][1] * scaleY);
  }
  ctx.closePath();
  ctx.stroke();

  // Player dots
  if (players) {
    players.forEach((p) => {
      if (p.x == null || p.y == null) return;
      const px = MM_X + p.x * scaleX;
      const py = MM_Y + p.y * scaleY;

      ctx.fillStyle = p.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }

  // MAP label
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '9px Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('MAP', MM_X + 4, MM_Y + 3);

  ctx.restore();
}

let _lastTimestamp = null;

/**
 * Main render function — called every animation frame.
 * mapId: active track id string from the store (e.g. 'oval', 'city', 'highland').
 */
export function render(ctx, gameState, myPlayerId, timestamp, mapId) {
  // Compute frame delta time for particle updates (capped at 100ms)
  const dt = _lastTimestamp !== null
    ? Math.min((timestamp - _lastTimestamp) / 1000, 0.1)
    : 0.016;
  _lastTimestamp = timestamp;

  // 1. Clear
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Track (uses active map)
  renderTrack(ctx, mapId);

  const players  = (gameState && gameState.players)  || [];
  const powerups = (gameState && gameState.powerups)  || [];
  const ball     = gameState && gameState.ball;
  const isFootball = gameState && gameState.game_mode === 'football';
  const teams    = (gameState && gameState.teams) || { red: [], blue: [] };

  // 3. Skid marks + smoke (drawn on road surface, before cars)
  _updateAndDrawEffects(ctx, dt);

  // 4. Powerups (not shown in football mode)
  if (!isFootball) {
    powerups.forEach((pu) => drawPowerup(ctx, pu, timestamp));
  }

  // 5. Ball (football — drawn under cars)
  if (isFootball && ball) {
    drawBall(ctx, ball, timestamp);
  }

  // 6. Cars — annotate team colour for football mode, then draw
  if (isFootball) {
    players.forEach((p) => {
      const teamColor = teams.red?.includes(p.id)  ? '#e74c3c'
                      : teams.blue?.includes(p.id) ? '#3498db'
                      : null;
      p._teamColor    = teamColor;
      // Local player sees their own car as white so they can spot themselves easily
      p._displayColor = p.id === myPlayerId ? '#ffffff' : teamColor;
    });
  } else {
    // Clear football overrides when not in football mode
    players.forEach((p) => {
      p._teamColor    = null;
      p._displayColor = null;
    });
  }

  // Draw non-local players first, then local on top
  const localPlayer  = players.find((p) => p.id === myPlayerId);
  const otherPlayers = players.filter((p) => p.id !== myPlayerId);

  otherPlayers.forEach((p) => drawCar(ctx, p, false, timestamp, dt));
  if (localPlayer) drawCar(ctx, localPlayer, true, timestamp, dt);

  // 7. Minimap — hidden in football mode (entire field is already visible)
  if (!isFootball) {
    drawMinimap(ctx, players, mapId);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function lightenColor(hex, amount) {
  return adjustColor(hex, amount);
}

function darkenColor(hex, amount) {
  return adjustColor(hex, -amount);
}

function adjustColor(hex, amount) {
  let r, g, b;
  if (hex && hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex || '#888';
  }
  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
