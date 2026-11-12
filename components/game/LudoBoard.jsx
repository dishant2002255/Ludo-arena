'use client';
import { useMemo } from 'react';

/**
 * SVG Ludo Board — 15x15 grid, traditional layout
 *
 * Layout:
 *  - 4 colored home areas (6x6) in each corner
 *  - 3-wide path columns/rows
 *  - Center 3x3 diamond finish area
 *
 * Colors: Red=top-left, Green=top-right, Yellow=bottom-right, Blue=bottom-left
 */

const CELL = 40; // pixels per cell
const BOARD = CELL * 15; // 600px
const HALF = BOARD / 2;

// Colors
const C = {
  red:    { main: '#ef4444', light: '#fca5a5', dark: '#991b1b', home: '#fee2e2' },
  green:  { main: '#22c55e', light: '#86efac', dark: '#14532d', home: '#dcfce7' },
  yellow: { main: '#eab308', light: '#fde047', dark: '#713f12', home: '#fef9c3' },
  blue:   { main: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', home: '#dbeafe' },
  white:  '#f8fafc',
  border: '#1e293b',
  safe:   '#e0e7ff',
  star:   '#818cf8',
  path:   '#f1f5f9',
  center: '#6d28d9',
};

/**
 * Map 52-cell main track index → {row, col} on 15x15 grid
 * Starting from Red's start (col=6, row=13) going clockwise.
 *
 * Track layout (hand-crafted for traditional Ludo):
 */
const MAIN_TRACK_CELLS = [
  // Red path going up (col 6, rows 14→9)
  {r:14,c:6},{r:13,c:6},{r:12,c:6},{r:11,c:6},{r:10,c:6},{r:9,c:6},
  // Turn right along top of red home (row 8, cols 6→1)
  {r:8,c:6},{r:8,c:5},{r:8,c:4},{r:8,c:3},{r:8,c:2},{r:8,c:1},
  // Turn up col 0, then right (row 7→6→... up along left)
  {r:7,c:1},{r:6,c:1},
  // Green start area top-left (row 6, cols 2→6)
  {r:6,c:2},{r:6,c:3},{r:6,c:4},{r:6,c:5},{r:6,c:6},
  // Turn up (col 6, rows 6→1)
  {r:5,c:6},{r:4,c:6},{r:3,c:6},{r:2,c:6},{r:1,c:6},{r:0,c:6},
  // Turn right (row 0, cols 7→8)
  {r:0,c:7},{r:0,c:8},
  // Turn down col 8 (rows 0→5)
  {r:1,c:8},{r:2,c:8},{r:3,c:8},{r:4,c:8},{r:5,c:8},{r:6,c:8},
  // Turn right (row 6, cols 9→13)
  {r:6,c:9},{r:6,c:10},{r:6,c:11},{r:6,c:12},{r:6,c:13},{r:6,c:14},
  // Turn down (rows 7→8, col 14→13)
  {r:7,c:13},{r:8,c:13},
  // Turn left (row 8, cols 13→8)
  {r:8,c:12},{r:8,c:11},{r:8,c:10},{r:8,c:9},{r:8,c:8},
  // Turn down (col 8, rows 9→14)
  {r:9,c:8},{r:10,c:8},{r:11,c:8},{r:12,c:8},{r:13,c:8},{r:14,c:8},
  // Turn left (row 14, cols 7→7)
  {r:14,c:7},{r:7,c:7}, // placeholder — col 7 main track bottom
];

// Standard 52-cell Ludo main track (clockwise starting from red's start cell)
const TRACK = (() => {
  const cells = [];
  // ── Segment 1: Red going UP, col 6, rows 14→9 (6 cells, indices 0-5)
  for (let r = 14; r >= 9; r--) cells.push({r, c: 6});
  // ── Segment 2: Row 8 going LEFT, cols 5→1 (5 cells, indices 6-10)
  //    (col 6 is the entry/turn, shared with segment 1; excluded here)
  for (let c = 5; c >= 1; c--) cells.push({r: 8, c});
  // ── Segment 3: Left edge going UP, col 1, rows 7→6 (2 cells, indices 11-12)
  cells.push({r: 7, c: 1});
  cells.push({r: 6, c: 1});
  // ── Segment 4: Green side, row 6 going RIGHT, cols 2→6 (5 cells, indices 13-17)
  for (let c = 2; c <= 6; c++) cells.push({r: 6, c});
  // ── Segment 5: Green going UP, col 6, rows 5→1 (5 cells, indices 18-22)
  for (let r = 5; r >= 1; r--) cells.push({r, c: 6});
  // ── Segment 6: Top edge, row 0, cols 6→8 (3 cells, indices 23-25)
  cells.push({r: 0, c: 6});
  cells.push({r: 0, c: 7});
  cells.push({r: 0, c: 8});
  // ── Segment 7: Yellow going DOWN, col 8, rows 1→5 (5 cells, indices 26-30)
  for (let r = 1; r <= 5; r++) cells.push({r, c: 8});
  // ── Segment 8: Yellow side, row 6 going RIGHT, cols 9→12 (4 cells, indices 31-34)
  //    (col 8 is shared with segment 7; col 13 is the corner)
  for (let c = 9; c <= 12; c++) cells.push({r: 6, c});
  // ── Segment 9: Right edge, col 13, rows 6→8 (3 cells, indices 35-37)
  cells.push({r: 6, c: 13});
  cells.push({r: 7, c: 13});
  cells.push({r: 8, c: 13});
  // ── Segment 10: Row 8 going LEFT, cols 12→8 (5 cells, indices 38-42)
  for (let c = 12; c >= 8; c--) cells.push({r: 8, c});
  // ── Segment 11: Blue going DOWN, col 8, rows 9→13 (5 cells, indices 43-47)
  for (let r = 9; r <= 13; r++) cells.push({r, c: 8});
  // ── Segment 12: Bottom edge going LEFT, row 14, cols 8→7 (2 cells, indices 48-49)
  cells.push({r: 14, c: 8});
  cells.push({r: 14, c: 7});
  // Total: 6+5+2+5+5+3+5+4+3+5+5+2 = 50 cells
  // NOTE: This is a 50-cell track that maps to backend positions 0-51.
  // The backend engine uses a 52-cell model but only positions 0-49 ever appear on
  // the visual board (positions 50-51 transition directly into the home lane).
  // To handle the 2-cell gap, we add the two missing cells at their visual positions.
  // Position 50 = row 14, col 6 (south of red start — wraps just below the board)
  // Position 51 = row 8, col 6 (the turn cell before entering red home)
  // These positions ARE reachable, so we add them explicitly:
  cells.push({r: 14, c: 6}); // index 50 — red's last-but-one cell before home
  cells.push({r: 8,  c: 6}); // index 51 — red's last cell before entering home lane
  return cells;
})();

// Safe cell positions on track
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home lane cells for each color (6 cells going toward center)
const HOME_LANES = {
  red:    [{r:13,c:7},{r:12,c:7},{r:11,c:7},{r:10,c:7},{r:9,c:7},{r:8,c:7}],
  green:  [{r:7,c:2},{r:7,c:3},{r:7,c:4},{r:7,c:5},{r:7,c:6},{r:7,c:7}],
  yellow: [{r:1,c:7},{r:2,c:7},{r:3,c:7},{r:4,c:7},{r:5,c:7},{r:6,c:7}],
  blue:   [{r:7,c:12},{r:7,c:11},{r:7,c:10},{r:7,c:9},{r:7,c:8},{r:7,c:7}],
};

// Home area base cells (each 6x6 area minus the 3 path columns)
const HOME_AREAS = {
  red:    { r: 9, c: 0, color: C.red },    // bottom-left
  green:  { r: 0, c: 9, color: C.green },  // top-right
  yellow: { r: 9, c: 9, color: C.yellow }, // bottom-right
  blue:   { r: 0, c: 0, color: C.blue },   // top-left
};

// Token base positions within home area (4 circles)
const TOKEN_BASE_POSITIONS = {
  red:    [{r:10,c:1},{r:10,c:3},{r:12,c:1},{r:12,c:3}],
  green:  [{r:1,c:10},{r:1,c:12},{r:3,c:10},{r:3,c:12}],
  yellow: [{r:10,c:10},{r:10,c:12},{r:12,c:10},{r:12,c:12}],
  blue:   [{r:1,c:1},{r:1,c:3},{r:3,c:1},{r:3,c:3}],
};

function Token({ color, tokenId, isMovable, onClick, cx, cy, size = 14 }) {
  const cfg = C[color];
  return (
    <g
      className={isMovable ? 'cursor-pointer token-movable' : ''}
      onClick={isMovable ? onClick : undefined}
    >
      {/* Shadow */}
      <circle cx={cx} cy={cy + 2} r={size} fill="rgba(0,0,0,0.3)" />
      {/* Body */}
      <circle
        cx={cx} cy={cy} r={size}
        fill={cfg.main}
        stroke={isMovable ? '#ffffff' : cfg.dark}
        strokeWidth={isMovable ? 3 : 1.5}
      />
      {/* Highlight */}
      <circle cx={cx - size * 0.3} cy={cy - size * 0.35} r={size * 0.3} fill="rgba(255,255,255,0.4)" />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={size * 0.55} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Glow for movable */}
      {isMovable && (
        <circle cx={cx} cy={cy} r={size + 6} fill="none" stroke={cfg.main} strokeWidth="2" opacity="0.5" />
      )}
    </g>
  );
}

function Cell({ r, c, fill = C.path, stroke = C.border, strokeWidth = 0.5 }) {
  return (
    <rect
      x={c * CELL} y={r * CELL}
      width={CELL} height={CELL}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

export default function LudoBoard({ gameState, myColor, movableTokens, onTokenClick }) {
  // Map token positions to board coordinates
  const tokenPositions = useMemo(() => {
    if (!gameState?.players) return [];
    const positions = [];

    for (const player of gameState.players) {
      for (const token of player.tokens) {
        let cx, cy;

        if (token.state === 'home' || token.position === -1) {
          // In base
          const basePos = TOKEN_BASE_POSITIONS[player.color]?.[token.id];
          if (!basePos) continue;
          cx = basePos.c * CELL + CELL / 2;
          cy = basePos.r * CELL + CELL / 2;
        } else if (token.position >= 100) {
          // In home lane
          const colorBase = { red: 100, green: 200, yellow: 300, blue: 400 };
          const laneIdx = token.position - (colorBase[player.color] || 100);
          const laneCell = HOME_LANES[player.color]?.[laneIdx];
          if (!laneCell) continue;
          cx = laneCell.c * CELL + CELL / 2;
          cy = laneCell.r * CELL + CELL / 2;
        } else {
          // On main track
          const cell = TRACK[token.position];
          if (!cell) continue;
          // Stack offset for multiple tokens on same cell
          const offset = positions.filter(p => p.trackPos === token.position).length;
          cx = cell.c * CELL + CELL / 2 + (offset % 2) * 6 - 3;
          cy = cell.r * CELL + CELL / 2 + Math.floor(offset / 2) * 6 - 3;
        }

        const isMovable = movableTokens?.includes(token.id) &&
          player.color === myColor &&
          player.color === gameState.currentTurn;

        positions.push({
          color: player.color,
          tokenId: token.id,
          isMovable,
          cx, cy,
          trackPos: token.position,
          state: token.state,
        });
      }
    }
    return positions;
  }, [gameState, movableTokens, myColor]);

  return (
    <div className="ludo-board-container">
      <svg
        viewBox={`0 0 ${BOARD} ${BOARD}`}
        width="100%"
        height="100%"
        style={{ display: 'block', borderRadius: '12px', boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
      >
        {/* Background */}
        <rect width={BOARD} height={BOARD} fill="#1e1b4b" />

        {/* === HOME AREAS === */}
        {/* Red - bottom left */}
        <rect x={0} y={9*CELL} width={6*CELL} height={6*CELL} fill={C.red.home} stroke={C.red.main} strokeWidth="2" />
        {/* Inner circle */}
        <circle cx={3*CELL} cy={12*CELL} r={2.2*CELL} fill={C.red.main} opacity="0.15" />
        <circle cx={3*CELL} cy={12*CELL} r={1.8*CELL} fill={C.red.main} opacity="0.25" stroke={C.red.main} strokeWidth="2" />

        {/* Blue - top left */}
        <rect x={0} y={0} width={6*CELL} height={6*CELL} fill={C.blue.home} stroke={C.blue.main} strokeWidth="2" />
        <circle cx={3*CELL} cy={3*CELL} r={2.2*CELL} fill={C.blue.main} opacity="0.15" />
        <circle cx={3*CELL} cy={3*CELL} r={1.8*CELL} fill={C.blue.main} opacity="0.25" stroke={C.blue.main} strokeWidth="2" />

        {/* Green - top right */}
        <rect x={9*CELL} y={0} width={6*CELL} height={6*CELL} fill={C.green.home} stroke={C.green.main} strokeWidth="2" />
        <circle cx={12*CELL} cy={3*CELL} r={2.2*CELL} fill={C.green.main} opacity="0.15" />
        <circle cx={12*CELL} cy={3*CELL} r={1.8*CELL} fill={C.green.main} opacity="0.25" stroke={C.green.main} strokeWidth="2" />

        {/* Yellow - bottom right */}
        <rect x={9*CELL} y={9*CELL} width={6*CELL} height={6*CELL} fill={C.yellow.home} stroke={C.yellow.main} strokeWidth="2" />
        <circle cx={12*CELL} cy={12*CELL} r={2.2*CELL} fill={C.yellow.main} opacity="0.15" />
        <circle cx={12*CELL} cy={12*CELL} r={1.8*CELL} fill={C.yellow.main} opacity="0.25" stroke={C.yellow.main} strokeWidth="2" />

        {/* === HOME AREA TOKEN CIRCLES === */}
        {Object.entries(TOKEN_BASE_POSITIONS).map(([color, positions]) =>
          positions.map((pos, i) => (
            <g key={`base-${color}-${i}`}>
              <circle
                cx={pos.c * CELL + CELL / 2}
                cy={pos.r * CELL + CELL / 2}
                r={CELL * 0.38}
                fill="rgba(255,255,255,0.15)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />
            </g>
          ))
        )}

        {/* === PATH BACKGROUND === */}
        {/* Vertical paths */}
        <rect x={6*CELL} y={0} width={3*CELL} height={6*CELL} fill={C.path} stroke={C.border} strokeWidth="0.5"/>
        <rect x={6*CELL} y={9*CELL} width={3*CELL} height={6*CELL} fill={C.path} stroke={C.border} strokeWidth="0.5"/>
        {/* Horizontal paths */}
        <rect x={0} y={6*CELL} width={6*CELL} height={3*CELL} fill={C.path} stroke={C.border} strokeWidth="0.5"/>
        <rect x={9*CELL} y={6*CELL} width={6*CELL} height={3*CELL} fill={C.path} stroke={C.border} strokeWidth="0.5"/>

        {/* Grid lines on paths */}
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(r =>
          [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(c => {
            const onPath = (c >= 6 && c <= 8) || (r >= 6 && r <= 8);
            if (!onPath) return null;
            return (
              <rect key={`g-${r}-${c}`}
                x={c*CELL} y={r*CELL}
                width={CELL} height={CELL}
                fill="none"
                stroke={C.border}
                strokeWidth="0.3"
              />
            );
          })
        )}

        {/* === HOME LANE COLORS === */}
        {/* Red home lane (col 7, rows 8→13) */}
        {HOME_LANES.red.slice(0, 5).map((cell, i) => (
          <rect key={`rl-${i}`} x={cell.c*CELL} y={cell.r*CELL} width={CELL} height={CELL} fill={C.red.light} stroke={C.border} strokeWidth="0.3" />
        ))}
        {/* Green home lane (row 7, cols 1→6) */}
        {HOME_LANES.green.slice(0, 5).map((cell, i) => (
          <rect key={`gl-${i}`} x={cell.c*CELL} y={cell.r*CELL} width={CELL} height={CELL} fill={C.green.light} stroke={C.border} strokeWidth="0.3" />
        ))}
        {/* Yellow home lane (col 7, rows 1→6) */}
        {HOME_LANES.yellow.slice(0, 5).map((cell, i) => (
          <rect key={`yl-${i}`} x={cell.c*CELL} y={cell.r*CELL} width={CELL} height={CELL} fill={C.yellow.light} stroke={C.border} strokeWidth="0.3" />
        ))}
        {/* Blue home lane (row 7, cols 8→13) */}
        {HOME_LANES.blue.slice(0, 5).map((cell, i) => (
          <rect key={`bl-${i}`} x={cell.c*CELL} y={cell.r*CELL} width={CELL} height={CELL} fill={C.blue.light} stroke={C.border} strokeWidth="0.3" />
        ))}

        {/* === START CELLS (colored) === */}
        {/* Red start = TRACK[0] */}
        <rect x={TRACK[0].c*CELL} y={TRACK[0].r*CELL} width={CELL} height={CELL} fill={C.red.main} stroke={C.border} strokeWidth="0.5" />
        {/* Green start = TRACK[13] */}
        <rect x={TRACK[13].c*CELL} y={TRACK[13].r*CELL} width={CELL} height={CELL} fill={C.green.main} stroke={C.border} strokeWidth="0.5" />
        {/* Yellow start = TRACK[26] */}
        {TRACK[26] && <rect x={TRACK[26].c*CELL} y={TRACK[26].r*CELL} width={CELL} height={CELL} fill={C.yellow.main} stroke={C.border} strokeWidth="0.5" />}
        {/* Blue start = TRACK[39] */}
        {TRACK[39] && <rect x={TRACK[39].c*CELL} y={TRACK[39].r*CELL} width={CELL} height={CELL} fill={C.blue.main} stroke={C.border} strokeWidth="0.5" />}

        {/* === SAFE CELL STARS === */}
        {[8, 21, 34, 47].map(idx => {
          if (!TRACK[idx]) return null;
          const { r, c } = TRACK[idx];
          const cx = c * CELL + CELL / 2;
          const cy = r * CELL + CELL / 2;
          return (
            <g key={`star-${idx}`}>
              <rect x={c*CELL} y={r*CELL} width={CELL} height={CELL} fill={C.safe} stroke={C.border} strokeWidth="0.5" />
              {/* Star shape */}
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="20" fill={C.star}>★</text>
            </g>
          );
        })}

        {/* === CENTER FINISHING AREA === */}
        {/* Center 3x3 area with diamond */}
        <rect x={6*CELL} y={6*CELL} width={3*CELL} height={3*CELL} fill="#1e1b4b" />
        {/* Colored triangles pointing to center */}
        {/* Red (from bottom) */}
        <polygon
          points={`${6*CELL},${9*CELL} ${9*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`}
          fill={C.red.main} opacity="0.85"
        />
        {/* Blue (from top) */}
        <polygon
          points={`${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`}
          fill={C.blue.main} opacity="0.85"
        />
        {/* Green (from right) */}
        <polygon
          points={`${9*CELL},${6*CELL} ${9*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`}
          fill={C.green.main} opacity="0.85"
        />
        {/* Yellow (from left) */}
        <polygon
          points={`${6*CELL},${6*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`}
          fill={C.yellow.main} opacity="0.85"
        />
        {/* Center star */}
        <circle cx={7.5*CELL} cy={7.5*CELL} r={CELL * 0.7} fill="white" opacity="0.95" />
        <text x={7.5*CELL} y={7.5*CELL + 10} textAnchor="middle" fontSize="28" fill={C.center}>★</text>

        {/* === TOKENS === */}
        {tokenPositions.map((tp) => (
          <Token
            key={`${tp.color}-${tp.tokenId}`}
            color={tp.color}
            tokenId={tp.tokenId}
            isMovable={tp.isMovable}
            cx={tp.cx}
            cy={tp.cy}
            onClick={() => onTokenClick?.(tp.tokenId)}
            size={tp.state === 'home' ? 14 : 12}
          />
        ))}

        {/* === BOARD BORDER === */}
        <rect x={0} y={0} width={BOARD} height={BOARD} fill="none" stroke="#7c3aed" strokeWidth="3" rx="12" />
      </svg>
    </div>
  );
}
