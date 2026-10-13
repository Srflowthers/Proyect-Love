import React from 'react';

const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
const STAR = 'M0-4 1.1-1.1 4 0 1.1 1.1 0 4-1.1 1.1-4 0-1.1-1.1Z';
const S = 'viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round"';
const star = (x, y, s, c, d) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="a-tw" style="animation-delay:${d}s" d="${STAR}" fill="${c}" stroke="none"/></g>`;

export const ARCADE_ICONS_RAW = {
  gominola: `<svg ${S}><defs><radialGradient id="gm" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffc2e0"/><stop offset=".45" stop-color="#ff4f9d"/><stop offset="1" stop-color="#b3125a"/></radialGradient></defs>
<g class="a-jelly"><g transform="rotate(-28 16 17)">
<path d="M8 17 2.2 10.2Q4.6 17 2.2 23.8Z" fill="#ffd45a" fill-opacity=".5" stroke="#ffd45a" stroke-width="1.5"/>
<path d="M24 17 29.8 10.2Q27.4 17 29.8 23.8Z" fill="#ffd45a" fill-opacity=".5" stroke="#ffd45a" stroke-width="1.5"/>
<ellipse cx="16" cy="17" rx="9.2" ry="7.8" fill="url(#gm)" stroke="#ff5aaa" stroke-width="1.5"/>
<path d="M11.5 10.6Q15 17 11.5 23.4M17 9.4Q20.5 17 17 24.6" stroke="#fff" stroke-width="1.6" opacity=".28"/>
<ellipse cx="11.6" cy="12.6" rx="3.4" ry="1.6" transform="rotate(-30 11.6 12.6)" fill="#fff" opacity=".7"/></g></g>
${star(26.5, 6, 1, '#ffe27a', 0)}${star(5, 5, 0.6, '#fff', 1.1)}</svg>`,

  tetris: `<svg ${S}>
<g class="a-bob" fill="#ff5aaa" fill-opacity=".28" stroke="#ff5aaa" stroke-width="1.6">
<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="12.5" y="4" width="7" height="7" rx="2"/><rect x="21" y="4" width="7" height="7" rx="2"/><rect x="12.5" y="12.5" width="7" height="7" rx="2"/></g>
<g class="a-bob2" fill="#b78bff" fill-opacity=".28" stroke="#b78bff" stroke-width="1.6">
<rect x="21" y="12.5" width="7" height="7" rx="2"/><rect x="4" y="21" width="7" height="7" rx="2"/><rect x="12.5" y="21" width="7" height="7" rx="2"/><rect x="21" y="21" width="7" height="7" rx="2"/></g>
<g transform="translate(4.4 12.9) scale(.29)"><path class="a-beat" d="${HEART}" fill="#ff5aaa" stroke="none"/></g></svg>`,

  sudoku: `<svg ${S}>
<rect x="4" y="4" width="24" height="24" rx="5" fill="#4aa8ff" fill-opacity=".14" stroke="#4aa8ff" stroke-width="1.7"/>
<path d="M12 4v24M20 4v24M4 12h24M4 20h24" stroke="#4aa8ff" stroke-width="1.1" opacity=".55"/>
<rect class="a-glow" x="12.6" y="12.6" width="6.8" height="6.8" rx="1.2" fill="#ff5aaa" fill-opacity=".35"/>
<g transform="translate(12.4 12.4) scale(.3)"><path class="a-beat" d="${HEART}" fill="#ff5aaa" stroke="none"/></g>
<g fill="#bfe0ff" font-family="Jost,system-ui,sans-serif" font-weight="700" font-size="6.6" text-anchor="middle">
<text x="8" y="10.3">5</text><text x="24" y="18.3">3</text><text x="16" y="26.3">8</text></g>
${star(28.5, 3.5, 0.9, '#bfe0ff', 0.4)}</svg>`,

  puzzle: `<svg ${S}>
<g class="a-wob"><path d="M8 10H13A3.5 3.5 0 1 1 19 10H24V15A3.5 3.5 0 1 1 24 21V26H8V21A3.5 3.5 0 1 0 8 15Z" fill="#3ddc97" fill-opacity=".2" stroke="#3ddc97" stroke-width="1.7"/>
<g transform="translate(11.2 13.2) scale(.4)"><path class="a-beat" d="${HEART}" fill="#ff5aaa" stroke="none"/></g></g>
${star(4.5, 5, 0.8, '#9dffd0', 0)}${star(28, 28, 0.7, '#9dffd0', 1)}</svg>`,

  pool: `<svg ${S}><defs>
<radialGradient id="pb" cx=".32" cy=".28" r=".9"><stop offset="0" stop-color="#d9c2ff"/><stop offset=".5" stop-color="#7a45d6"/><stop offset="1" stop-color="#24094f"/></radialGradient>
<linearGradient id="pc" gradientUnits="userSpaceOnUse" x1="20" y1="13" x2="30" y2="3"><stop offset="0" stop-color="#ffe3b0"/><stop offset=".68" stop-color="#f0a35e"/><stop offset=".7" stop-color="#ff5aaa"/><stop offset="1" stop-color="#ff5aaa"/></linearGradient></defs>
<ellipse class="a-shade" cx="12.5" cy="29.6" rx="7.5" ry="1.4" fill="#a77bff"/>
<polygon class="a-poke" points="20.25,12.25 28.65,2.65 30.35,4.35 20.75,12.75" fill="url(#pc)" stroke="#f0a35e" stroke-width=".6" stroke-opacity=".5"/>
<g class="a-hit"><circle cx="12.5" cy="19.5" r="9.5" fill="url(#pb)" stroke="#a77bff" stroke-width="1.5"/>
<circle cx="12.5" cy="19.5" r="4.7" fill="#fff"/>
<text x="12.5" y="22" text-anchor="middle" font-family="Jost,system-ui,sans-serif" font-weight="700" font-size="6.8" fill="#1b0b3d">8</text>
<ellipse cx="8.2" cy="13.6" rx="2.9" ry="1.5" transform="rotate(-38 8.2 13.6)" fill="#fff" opacity=".6"/></g>
${star(5, 6, 0.7, '#e5d3ff', 0.8)}</svg>`,

  airhockey: `<svg ${S}><defs><radialGradient id="ah" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffd9b0"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#a8340a"/></radialGradient></defs>
<g class="a-streak" stroke="#4de1ff" stroke-width="1.6"><path d="M15 10 17.6 7.4M19 17 21.6 14.4"/></g>
<g class="a-puck"><circle cx="23" cy="10" r="4.4" fill="#0b2a3a" stroke="#4de1ff" stroke-width="1.6"/><circle cx="23" cy="10" r="2.8" stroke="#4de1ff" stroke-width=".6" opacity=".5"/>
<g transform="translate(20.7 7.7) scale(.19)"><path class="a-beat" d="${HEART}" fill="#ff5aaa" stroke="none"/></g></g>
<g class="a-strike"><circle cx="11" cy="21" r="8.2" fill="url(#ah)" stroke="#ff8a3d" stroke-width="1.5"/>
<circle cx="11" cy="21" r="3.8" fill="#ffb36b" fill-opacity=".45" stroke="#ffd9b0" stroke-width="1"/>
<ellipse cx="7" cy="16.4" rx="2.8" ry="1.4" transform="rotate(-38 7 16.4)" fill="#fff" opacity=".6"/></g>
${star(27.5, 26, 0.8, '#9eefff', 0.6)}${star(4.5, 5, 0.6, '#fff', 1.3)}</svg>`
};

const sty = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');

export const ARCADE_SCENES = {
  gominola: () => [['6%', '#ff5aaa', 3.4, 0], ['18%', '#ffd45a', 4.2, 0.8, 1], ['30%', '#b78bff', 3.8, 1.6], ['42%', '#5be3b0', 4.6, 0.3, 1], ['54%', '#ff8a3d', 3.6, 2.1], ['66%', '#ff5aaa', 4.4, 1.2], ['78%', '#4aa8ff', 3.9, 0.5, 1], ['90%', '#ffd45a', 4.1, 2.6]]
    .map(([l, k, d, dl, sq]) => `<i class="cd${sq ? ' sq' : ''}" style="${sty({ l, k, d: d + 's', dl: dl + 's' })}"></i>`).join(''),

  tetris: () => {
    const P = { T: [[0, 0], [1, 0], [2, 0], [1, 1]], L: [[0, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]] };
    return [['8%', '#ff5aaa', 'T', 72, 3.6, 0], ['34%', '#b78bff', 'L', 46, 4.2, 1.2], ['58%', '#ff7ac8', 'S', 72, 3.4, 2.1], ['76%', '#b78bff', 'O', 60, 4, 0.5], ['16%', '#ff7ac8', 'I', 40, 4.4, 2.6]]
      .map(([l, k, sh, e, d, dl]) => `<i class="pc" style="${sty({ l, k, e: e + '%', d: d + 's', dl: dl + 's' })}">${P[sh].map(([x, y]) => `<b style="--x:${x};--y:${y}"></b>`).join('')}</i>`).join('');
  },

  sudoku: () => {
    const pos = [[6, 8, '5'], [34, 8, '3'], [62, 8, '7'], [20, 34, '8'], [48, 34, '1'], [76, 34, '4'], [6, 60, '2'], [34, 60, '9'], [62, 60, '6'], [76, 8, '♥'], [20, 60, '♥']];
    return pos.map(([l, t, n], i) => `<i class="nm${n === '♥' ? ' h' : ''}" style="${sty({ l: l + '%', t: t + '%', dl: (i * 0.45) + 's' })}">${n}</i>`).join('');
  },

  puzzle: () => {
    const path = 'M8 10H13A3.5 3.5 0 1 1 19 10H24V15A3.5 3.5 0 1 1 24 21V26H8V21A3.5 3.5 0 1 0 8 15Z';
    return [['8%', '12%', '#3ddc97', '12deg', '1.2em', '.8em', 5, 0], ['70%', '10%', '#6ff0b8', '-18deg', '-1em', '1em', 6, 1], ['10%', '62%', '#2fb985', '20deg', '1.4em', '-1em', 5.5, 0.6], ['72%', '60%', '#3ddc97', '-10deg', '-1.2em', '-.8em', 6.5, 1.6], ['40%', '4%', '#9dffd0', '8deg', '.8em', '1.2em', 7, 0.3], ['44%', '72%', '#6ff0b8', '-14deg', '-.8em', '-1em', 6, 2]]
      .map(([l, t, k, r, dx, dy, d, dl]) => `<i class="pz" style="${sty({ l, t, r, dx, dy, d: d + 's', dl: dl + 's' })}"><svg viewBox="0 0 32 32"><path d="${path}" fill="${k}" fill-opacity=".35" stroke="${k}" stroke-width="1.6" stroke-linejoin="round"/></svg></i>`).join('');
  },

  pool: () => {
    const B = [['#ffd45a', ['12%', '14%'], ['82%', '30%'], ['70%', '78%'], ['16%', '60%'], 7, 0], ['#ff5a6a', ['80%', '20%'], ['20%', '74%'], ['84%', '72%'], ['38%', '12%'], 8, 1.5], ['#4aa8ff', ['30%', '78%'], ['78%', '14%'], ['10%', '30%'], ['62%', '80%'], 6.5, 0.8], ['#f4efff', ['60%', '46%'], ['10%', '80%'], ['84%', '10%'], ['26%', '40%'], 9, 2.2]];
    const bl = B.map(([k, a, b, c, d, dur, dl]) => `<i class="bl" style="${sty({ k, x0: a[0], y0: a[1], x1: b[0], y1: b[1], x2: c[0], y2: c[1], x3: d[0], y3: d[1], d: dur + 's', dl: '-' + dl + 's' })}"></i>`).join('');
    const pk = ['0;0', '100%;0', '0;100%', '100%;100%'].map(q => { const [x, y] = q.split(';'); return `<i class="pk" style="left:calc(${x} - 1em);top:calc(${y} - 1em)"></i>` }).join('');
    return pk + bl;
  },

  airhockey: () => `<i class="gl l"></i><i class="gl r"></i>
  <i class="ml" style="${sty({ l: '14%', a: '18%', b: '62%', k: '#ff8a3d', d: '3.1s', dl: '0s' })}"></i>
  <i class="ml" style="${sty({ l: '74%', a: '66%', b: '20%', k: '#ff5aaa', d: '2.7s', dl: '-1s' })}"></i>
  <i class="hp" style="${sty({ x0: '26%', y0: '12%', x1: '68%', y1: '80%', x2: '30%', y2: '78%', x3: '66%', y3: '14%', d: '4.2s' })}"></i>`
};

export const GameIcons = {
  gomi: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.gominola }} />
  ),
  tetris: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.tetris }} />
  ),
  sudoku: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.sudoku }} />
  ),
  puzzle: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.puzzle }} />
  ),
  pool: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.pool }} />
  ),
  airhockey: ({ className = "w-5 h-5" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} dangerouslySetInnerHTML={{ __html: ARCADE_ICONS_RAW.airhockey }} />
  ),
  reload: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  fullscreen: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  ),
  minimize: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
    </svg>
  ),
  lightning: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  chevronDown: ({ className = "w-3 h-3" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronUp: ({ className = "w-3 h-3" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
};
