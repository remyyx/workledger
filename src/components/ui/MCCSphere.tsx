'use client';

// ============================================
// MCCSphere — tiny rotating world-sphere canvas
// Port of docs/MCC/MCC-Sphere-25px-Final.jsx to TSX.
//
// Two placement patterns:
//   • pattern="random"     — 100 uniformly-distributed points on a sphere (original)
//   • pattern="continents" — ~200 points traced to continental landmasses, so the
//                            rotating sphere visually reads as a miniature world
//
// 23.5° axial tilt, single-color via `color` prop.
// Each instance owns its own requestAnimationFrame loop; unmount cancels it.
// ============================================

import { useEffect, useRef } from 'react';

// Land-mask world map — 36 columns × 18 rows at 10° resolution.
//   Row r → latCenter = 85 - r*10   (row 0 = +85°N, row 17 = -85°S)
//   Col c → lonCenter = -175 + c*10 (col 0 = -175°W, col 35 = +175°E)
// 'X' = land cell → one dot; '.' = ocean. Hand-traced to read as a recognisable
// world map at ~47px canvas — not GIS-accurate. Edit a row below and the whole
// map regenerates at module load.
const LAND_MASK: readonly string[] = [
  '....................................', // +85° Arctic ocean
  '.....XXXXXX.XXXX.......XXXXXXXXXXXX.', // +75° Canadian Arctic · Greenland · N. Siberia
  '..XXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXX.', // +65° Alaska · Canada · Greenland · Scandinavia · Russia
  '.....XXXXXXXX....XXXXXXXXXXXXXXXXXXX', // +55° Canada · Europe · Russia (solid Eurasia belt)
  '.....XXXXXXX.....XXXXXXXXXXXXXXXX...', // +45° USA north · Europe · C. Asia · Japan
  '......XXXXX......XXXX.XXXXXXXXXXX...', // +35° USA · Med/N. Africa · Iran · China · Japan
  '......XXXX......XXXXX.XXXXXXXXXX....', // +25° Mexico · Sahara · Arabia · India · S. China
  '.......XXXXX...XXXXXXXXX.XX.XXXX....', // +15° C. America · Sahel · Arabia · India · SE Asia · Philippines
  '.........XXXX..XXXXXXX......XXXXX...', //  +5° N. S. America · W+C Africa · Malaysia · Indonesia
  '..........XXXX....XXXX......XXXX....', //  -5° Amazon · Congo · Indonesia
  '..........XXXX.....XXXX.......XXX...', // -15° Brazil · SE Africa + Madagascar · N. Australia
  '...........XXX.....XX.X....XXXXX....', // -25° S. Brazil · S. Africa · Madagascar · Australia
  '...........XX........X......XXXXX...', // -35° Argentina · Cape · S. Australia
  '...........X.......................X', // -45° Patagonia · NZ
  '...........X........................', // -55° Tierra del Fuego
  'X...X...X...X...X...X...X...X...X...', // -65° Antarctic ring (sparse — 9 cells)
  'X.......X.......X.......X.......X...', // -75° Antarctic interior (5 cells)
  '....................................', // -85° Near-pole skipped — cos(lat) collapses everything
];

// Expand the mask to (lat, lon) pairs at module load time. Placed at top level
// (not inside the useEffect) so future edits to LAND_MASK trigger a proper
// Fast Refresh remount — otherwise the stable deps array [size,color,speed,pattern]
// keeps the existing effect running with stale geometry.
// Third tuple value = opacity multiplier. Antarctica (lat ≤ -60°) renders at
// 50% alpha so the southern cap fades into the sphere instead of anchoring
// the eye — it's a peripheral landmass, not a protagonist.
const CONTINENT_POINTS: Array<[number, number, number]> = (() => {
  const pts: Array<[number, number, number]> = [];
  for (let r = 0; r < LAND_MASK.length; r++) {
    const row = LAND_MASK[r];
    const lat = 85 - r * 10;
    const fade = lat <= -60 ? 0.5 : 1.0;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== 'X') continue;
      const lon = -175 + c * 10;
      pts.push([lat, lon, fade]);
    }
  }
  return pts;
})();

interface MCCSphereProps {
  /** Pixel size of the canvas (width === height). Default 25. */
  size?: number;
  /** Dot color — typically a taxon accent (gold for T1, silver for T2, etc). */
  color?: string;
  /** Rotation speed in radians per frame. Default 0.02 (≈69°/sec at 60fps). */
  speed?: number;
  /** Extra classes for the canvas element. */
  className?: string;
  /**
   * Dot placement pattern.
   * 'random' (default) — uniform sphere, 100 points (original behaviour).
   * 'continents' — lat/lon-placed points along continental landmasses.
   */
  pattern?: 'random' | 'continents';
}

export default function MCCSphere({
  size = 25,
  color = '#C9A84C',
  speed = 0.02,
  className,
  pattern = 'random',
}: MCCSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.32; // scales with size; 8 at 25px, ~15 at 47px

    // Build the base point cloud. Pattern is fixed per mount — changing `pattern`
    // re-runs this effect because it's in the deps array below.
    // `fade` is a per-point opacity multiplier (Antarctica dims to 0.5).
    type Point = { baseX: number; baseY: number; baseZ: number; fade: number };
    let points: Point[];

    if (pattern === 'continents') {
      // Canvas Y grows downward (opposite of math convention), so sin(lat)
      // must be negated to put the north pole at the top of the screen —
      // otherwise continents render upside-down.
      points = CONTINENT_POINTS.map(([lat, lon, fade]) => {
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;
        return {
          baseX: Math.cos(latRad) * Math.cos(lonRad) * radius,
          baseY: -Math.sin(latRad) * radius,
          baseZ: Math.cos(latRad) * Math.sin(lonRad) * radius,
          fade,
        };
      });
    } else {
      const pointCount = 100;
      points = Array.from({ length: pointCount }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        return {
          baseX: Math.sin(phi) * Math.cos(theta) * radius,
          baseY: Math.sin(phi) * Math.sin(theta) * radius,
          baseZ: Math.cos(phi) * radius,
          fade: 1,
        };
      });
    }

    // Straight axis — no 23.5° tilt. Continents ride a horizontal equator
    // and poles sit dead-center top/bottom; reads cleaner at 47px.
    const earthTilt = 0;
    let rotation = 0;
    let rafId = 0;

    const rotatePoint = (p: Point, rotZ: number, tiltX: number) => {
      const x = p.baseX;
      const y = p.baseY * Math.cos(tiltX) - p.baseZ * Math.sin(tiltX);
      let z = p.baseY * Math.sin(tiltX) + p.baseZ * Math.cos(tiltX);
      const x2 = x * Math.cos(rotZ) - z * Math.sin(rotZ);
      z = x * Math.sin(rotZ) + z * Math.cos(rotZ);
      return { x: x2, y, z };
    };

    // Continent mode: bump dot size so neighbouring land cells overlap and read
    // as continuous landmasses (otherwise it looks like a point cloud). 1.1 is
    // calibrated against 10° grid spacing on a 47px canvas — tight enough that
    // adjacent 'X' cells blur into Europe/Africa/etc., loose enough that oceans
    // stay clear. Random mode keeps the original delicate look.
    const baseDotSize = pattern === 'continents' ? 1.1 : 0.5;

    const frame = () => {
      rotation += speed;
      ctx.clearRect(0, 0, size, size);

      const rendered = points
        .map((p) => {
          const r = rotatePoint(p, rotation, earthTilt);
          const scale = 200 / (200 + r.z);
          return {
            screenX: centerX + r.x * scale * 1.2,
            screenY: centerY + r.y * scale * 1.2,
            scale,
            z: r.z,
            fade: p.fade,
          };
        })
        .sort((a, b) => a.z - b.z);

      ctx.fillStyle = color;
      for (const point of rendered) {
        const dotSize = baseDotSize * point.scale;
        // Multiply the fade into BOTH the computed alpha and the 0.15 floor —
        // otherwise Antarctic points clamp at 0.15 and never drop below full
        // opacity once the depth falloff is gentle.
        const opacity = Math.max(0.15 * point.fade, point.scale * 0.6 * point.fade);
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [size, color, speed, pattern]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    />
  );
}
