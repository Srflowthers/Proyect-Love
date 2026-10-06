import { useEffect, useRef, useState } from "react";

/**
 * GlitterWarp v2 — optimizado + variantes. Canvas 2D, sin dependencias.
 *
 * Optimizaciones:
 *  - Estrellas en typed arrays (cero objetos/GC por frame).
 *  - Dibujo por lotes: 1 stroke por (capa de profundidad × color), no 1 por estrella.
 *  - Calidad adaptativa: si el FPS cae, reduce estrellas activas solo.
 *  - Pausa automática fuera de pantalla y con la pestaña oculta.
 *  - DPR limitado (1.5), props leídas por ref (sin reiniciar el loop).
 *  - prefers-reduced-motion respetado.
 */

export const VARIANTS = {
  // ---- calmas: casi quietas, sin giro, parpadeo lento (no marean) ----
  bruma:        { label: "Bruma",          n: 60,  speed: 0.04, streak: 0,   spin: 0, ring: false, pulse: 0, glitter: 0.5, size: 1.6, trail: 0.1,  glow: true, tw: 0.3,  mouse: 0.03 },
  rocio:        { label: "Rocío",          n: 80,  speed: 0.07, streak: 0.6, spin: 0, ring: false, pulse: 0, glitter: 1,   size: 1,   trail: 0.25, glow: true, tw: 0.35, mouse: 0.03 },
  polvo:        { label: "Polvo dorado",   n: 130, speed: 0.03, streak: 0,   spin: 0, ring: false, pulse: 0, glitter: 0.7, size: 0.7, trail: 0.15, glow: true, tw: 0.3,  mouse: 0.02 },
  luciernagas:  { label: "Luciérnagas",    n: 45,  speed: 0.04, streak: 0,   spin: 0, ring: false, pulse: 0, glitter: 1.2, size: 1.8, trail: 0.2,  glow: true, tw: 0.2,  mouse: 0.03 },
  profundo:     { label: "Profundo",       n: 60,  speed: 0.1,  streak: 1.5, spin: 0, ring: false, pulse: 0, glitter: 0.6, size: 0.9, trail: 0.5,  glow: true, tw: 0.4,  mouse: 0.04 },
  tunnel:       { label: "Túnel",       speed: 0.6, streak: 2.5, spin: 0,    ring: false, pulse: 0, glitter: 0.8, size: 1,   trail: 0.6 },
  hyperspace:   { label: "Hiperespacio",speed: 1.4, streak: 9,   spin: 0,    ring: false, pulse: 0, glitter: 0.4, size: 0.9, trail: 0.75 },
  vortex:       { label: "Vórtice",     speed: 0.5, streak: 3,   spin: 0.35, ring: false, pulse: 0, glitter: 0.9, size: 1,   trail: 0.7 },
  rings:        { label: "Anillos",     speed: 0.7, streak: 2,   spin: 0.15, ring: true,  pulse: 0, glitter: 0.7, size: 1.1, trail: 0.55 },
  burst:        { label: "Pulso",       speed: 0.4, streak: 4,   spin: 0.05, ring: false, pulse: 3, glitter: 1,   size: 1,   trail: 0.65 },
  // ---- elegantes: pocas estrellas, lentas, con halo suave ----
  silk:         { label: "Seda",          n: 90,  speed: 0.22, streak: 16,  spin: 0.03,  ring: false, pulse: 0,   glitter: 0.6, size: 0.6, trail: 0.88, glow: true },
  halo:         { label: "Halo",          n: 140, speed: 0.18, streak: 1.2, spin: 0.1,   ring: true,  pulse: 0,   glitter: 0.9, size: 0.9, trail: 0.8,  glow: true },
  constelacion: { label: "Constelación",  n: 70,  speed: 0.05, streak: 0,   spin: 0.015, ring: false, pulse: 0,   glitter: 1.1, size: 1.3, trail: 0.3,  glow: true },
  orbita:       { label: "Órbita",        n: 110, speed: 0.2,  streak: 2,   spin: 0.14,  ring: false, pulse: 0,   glitter: 0.8, size: 0.8, trail: 0.85, glow: true },
  gala:         { label: "Gala",          n: 100, speed: 0.15, streak: 5,   spin: 0.04,  ring: false, pulse: 1.8, glitter: 1,   size: 0.8, trail: 0.8,  glow: true },
  drift:        { label: "Deriva",      speed: 0.12,streak: 0,   spin: 0.02, ring: false, pulse: 0, glitter: 1,   size: 1.2, trail: 0.2 },
};

const DEPTH = 1000;
const LAYERS = 8;
const LAYER_W = [0.6, 0.75, 0.9, 1.1, 1.35, 1.6, 1.9, 2.2];
const LAYER_A = [0.04, 0.15, 0.3, 0.48, 0.65, 0.8, 0.92, 1]; // nacen casi invisibles y aparecen despacio

export function GlitterWarp({
  variant = "tunnel",
  count,
  colors = ["#ffffff", "#9ec5ff", "#d6a8ff", "#ffd1a6", "#8ff0ff"],
  background = "#05030f",
  speed, glitter, trail, // overrides opcionales de la variante
  mouseInfluence,
  motion = 1, // 0..1: escala velocidad y giro de cualquier variante
  className = "",
  style = {},
}) {
  const canvasRef = useRef(null);
  const live = useRef({});
  live.current = { speed, glitter, trail, background, mouseInfluence, motion };
  const colorKey = colors.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    const preset = VARIANTS[variant] || VARIANTS.tunnel;
    const palette = colorKey.split(",");
    const nc = palette.length;
    const TH = preset.glow ? 0.88 : 0.94;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // ---- estado en typed arrays ----
    const N = count ?? preset.n ?? 600;
    const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
    const PH = new Float32Array(N), RT = new Float32Array(N), SZ = new Float32Array(N);
    const CI = new Uint8Array(N);
    const nb = LAYERS * nc;
    const buf = Array.from({ length: nb }, () => new Float32Array(N * 4));
    const cnt = new Int32Array(nb);
    const spk = new Float32Array(N * 3); // x, y, len
    const NX = new Float64Array(N), DU = new Float64Array(N); // inicio y duración del destello
    const frac = preset.glow ? 0.12 : 0.05;            // fracción de estrellas brillando a la vez
    const gap = () => (2.5 / frac) * (0.4 + Math.random() * 1.2); // segundos hasta el próximo destello

    const spawn = (i, randZ) => {
      if (preset.ring) {
        const a = Math.random() * 6.2832;
        const R = 380 + ((Math.random() * 4) | 0) * 220;
        X[i] = Math.cos(a) * R; Y[i] = Math.sin(a) * R;
      } else {
        X[i] = (Math.random() - 0.5) * 2200; Y[i] = (Math.random() - 0.5) * 2200;
      }
      Z[i] = randZ ? Math.random() * DEPTH : DEPTH;
      PH[i] = Math.random() * 6.2832;
      RT[i] = (4 + Math.random() * 10) * (preset.tw ?? 1);
      SZ[i] = 0.7 + Math.random() * 0.9;
      CI[i] = (Math.random() * nc) | 0;
      NX[i] = performance.now() / 1000 + gap();
      DU[i] = 1.8 + Math.random() * 1.8;
    };
    for (let i = 0; i < N; i++) spawn(i, true);

    const t0 = performance.now();
    let w = 0, h = 0, raf = 0, last = performance.now();
    let active = N, slow = 0, frames = 0, acc = 0;
    let angle = 0, running = false, visible = true;
    const cen = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, w * dpr | 0);
      canvas.height = Math.max(1, h * dpr | 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cen.x = tgt.x = w / 2; cen.y = tgt.y = h / 2;
      const bg = live.current.background;
      if (bg !== "transparent") { ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const m = (live.current.mouseInfluence ?? preset.mouse ?? 0.15) * 2;
      tgt.x = w / 2 + ((e.clientX - r.left) / r.width - 0.5) * w * m;
      tgt.y = h / 2 + ((e.clientY - r.top) / r.height - 0.5) * h * m;
    };

    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      const intro = Math.min(1, (now - t0) / 2200);
      last = now;
      const t = now / 1000;
      const L = live.current;
      const spd = (L.speed ?? preset.speed) * L.motion;
      const gl = L.glitter ?? preset.glitter;
      const tr = L.trail ?? preset.trail;

      // calidad adaptativa: promedia 45 frames, si >22ms baja 15% (mín 35%)
      acc += dt; frames++;
      if (frames === 45) {
        slow = acc / frames > 0.022 ? slow + 1 : 0;
        if (slow >= 2 && active > N * 0.35) { active = (active * 0.85) | 0; slow = 0; }
        frames = 0; acc = 0;
      }

      cen.x += (tgt.x - cen.x) * 0.05;
      cen.y += (tgt.y - cen.y) * 0.05;
      angle += preset.spin * L.motion * dt;
      const ca = Math.cos(angle), sa = Math.sin(angle);

      // estela
      const fade = 1 - tr * 0.85;
      if (L.background === "transparent") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.globalAlpha = fade; ctx.fillStyle = L.background; ctx.fillRect(0, 0, w, h);
      }

      const pulse = preset.pulse ? 1 + preset.pulse * Math.pow(Math.max(0, Math.sin(t * 0.8)), 3) : 1;
      const dz = spd * pulse * 260 * dt;
      const streak = preset.streak * (preset.pulse ? pulse : 1);
      const focal = Math.min(w, h) * 0.9;
      cnt.fill(0);
      let ns = 0;

      for (let i = 0; i < active; i++) {
        const z0 = Z[i];
        const z = z0 - dz;
        if (z <= 1) { spawn(i, false); continue; }
        Z[i] = z;
        const x = X[i] * ca - Y[i] * sa;
        const y = X[i] * sa + Y[i] * ca;
        const k = focal / z;
        const px = cen.x + x * k, py = cen.y + y * k;
        if (px < -40 || px > w + 40 || py < -40 || py > h + 40) { spawn(i, false); continue; }
        const kp = focal / (z + dz * streak + 0.4);
        const depth = 1 - z / DEPTH;
        const layer = Math.min(LAYERS - 1, (depth * LAYERS) | 0);
        const b = layer * nc + CI[i];
        const a = buf[b], c = cnt[b]++ * 4;
        a[c] = cen.x + x * kp; a[c + 1] = cen.y + y * kp; a[c + 2] = px; a[c + 3] = py;

        if (depth > 0.3 && t >= NX[i]) {
          const u = (t - NX[i]) / DU[i];
          if (u >= 1) {
            NX[i] = t + gap(); DU[i] = 1.8 + Math.random() * 1.8;
          } else {
            const sn = Math.sin(u * 3.1416), ev = sn * sn; // sube y baja suave
            if (ev > 0.04) {
              const o = ns++ * 3;
              spk[o] = px; spk[o + 1] = py;
              spk[o + 2] = (1 + ev * 11) * gl * (0.6 + depth);
            }
          }
        }
      }

      // un stroke por lote
      ctx.lineCap = "round";
      for (let b = 0; b < nb; b++) {
        const n = cnt[b];
        if (!n) continue;
        const layer = (b / nc) | 0, a = buf[b];
        ctx.globalAlpha = LAYER_A[layer] * intro;
        ctx.strokeStyle = palette[b - layer * nc];
        ctx.lineWidth = LAYER_W[layer] * preset.size;
        ctx.beginPath();
        for (let j = 0, m = n * 4; j < m; j += 4) {
          ctx.moveTo(a[j], a[j + 1]);
          ctx.lineTo(a[j + 2] + 0.1, a[j + 3]);
        }
        ctx.stroke();
      }
      // destellos: un solo path
      if (ns) {
        ctx.globalAlpha = 0.95; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < ns; j++) {
          const o = j * 3, x = spk[o], y = spk[o + 1], l = spk[o + 2];
          ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
          ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
        }
        ctx.stroke();
        if (preset.glow) {
          ctx.globalAlpha = 0.1; ctx.fillStyle = "#fff";
          ctx.beginPath();
          for (let j = 0; j < ns; j++) {
            const o = j * 3;
            ctx.moveTo(spk[o] + spk[o + 2] * 0.9, spk[o + 1]);
            ctx.arc(spk[o], spk[o + 1], spk[o + 2] * 0.9, 0, 6.2832);
          }
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduce) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const sync = () => (visible && !document.hidden ? start() : stop());

    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointermove", onMove, { passive: true });

    if (reduce) { running = true; frame(performance.now()); running = false; }
    else sync();

    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onMove);
    };
  }, [variant, count, colorKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none", ...style }}
    />
  );
}

export const PALETTES = {
  Champagne:["#fff6e5", "#f1d9a7", "#ffffff"],
  Perla:    ["#ffffff", "#dfe9ff", "#f3dfff"],
  Cósmico:  ["#ffffff", "#9ec5ff", "#d6a8ff", "#ffd1a6", "#8ff0ff"],
  Nebulosa: ["#ff7ad9", "#7a5cff", "#4de3ff", "#ffffff"],
  Ámbar:    ["#fff2d6", "#ffc46b", "#ff8a4c", "#ffffff"],
  Esmeralda:["#d9ffe8", "#5cffb0", "#2fd4ff", "#ffffff"],
};

export default function GlitterWarpCatalog() {
  const [palette, setPalette] = useState("Champagne");
  const [selected, setSelected] = useState(null);
  const colors = PALETTES[palette];

  return (
    <div style={{ background: "#05030f", color: "#eee", minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.keys(PALETTES).map((p) => (
          <button key={p} onClick={() => setPalette(p)}
            style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #ffffff44",
                     background: p === palette ? "#ffffff22" : "transparent", color: "inherit", cursor: "pointer" }}>
            {p}
          </button>
        ))}
      </div>

      {/* Solo la tarjeta seleccionada anima a pleno; las demás son livianas */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {Object.entries(VARIANTS).map(([key, v]) => (
          <button key={key} onClick={() => setSelected(key)}
            style={{ position: "relative", height: 180, borderRadius: 12, overflow: "hidden",
                     border: "1px solid #ffffff22", background: "#05030f", cursor: "pointer", padding: 0, color: "inherit" }}>
            <GlitterWarp variant={key} colors={colors} count={v.n ?? 220} />
            <span style={{ position: "absolute", left: 12, bottom: 10, fontWeight: 600 }}>{v.label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10, background: "#05030f" }}>
          <GlitterWarp variant={selected} colors={colors} count={VARIANTS[selected].n ? VARIANTS[selected].n * 2 : 800} />
          <span style={{ position: "absolute", left: 20, bottom: 20 }}>
            {VARIANTS[selected].label} — toca para cerrar
          </span>
        </div>
      )}
    </div>
  );
}
