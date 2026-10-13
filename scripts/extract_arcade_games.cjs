const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.resolve(__dirname, '../../ALL-DOCUMENTAICON-GAME/Arcade_Rank_con_insignias.html');
const outDir = path.resolve(__dirname, '../public/arcade');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Optimizando y re-extrayendo juegos Arcade Rank para 60 FPS en PC y móviles...');
const content = fs.readFileSync(srcHtmlPath, 'utf8');

const games = ['gomi', 'pool', 'puzzle', 'sudoku', 'tetris'];

// Optimización global de CSS para aceleración por hardware y cero repaint innecesario
const BASE_HEAD = `<meta name="color-scheme" content="dark">
<style>
:root{color-scheme:dark!important}
html,body{background:transparent!important;animation:none!important;margin:0;padding:0;overflow:hidden;-webkit-tap-highlight-color:transparent}
canvas{image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;transform:translateZ(0);backface-visibility:hidden}
</style>`;

const GAME_CSS = {
  sudoku: '<style>body{background:linear-gradient(135deg,color-mix(in srgb,var(--p1) 22%,transparent),color-mix(in srgb,var(--p2) 22%,transparent),color-mix(in srgb,var(--p1) 22%,transparent)) 0 0/300% 300%!important;animation:none!important}.app{max-width:440px;margin:0 auto}</style>',
  tetris: '<style>body{background:transparent!important}.card,canvas{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>',
  gomi: '<style>#rankCard,#histCard,#ovDelta,#ovRank{display:none!important}.lcrow>div:last-child{display:none}.game{display:block!important;max-width:540px;margin:0 auto}canvas{touch-action:none}</style>',
  puzzle: '<style>body{background:transparent!important}.lp-card{backdrop-filter:none!important}</style>',
  pool: '<style>body{background:transparent!important;padding:4px}#stage{max-width:960px}</style>'
};

const COTTON_CANDY = `function pMint(c) {
  c.beginPath();
  [[0, -0.1, 0.5], [-0.52, 0.0, 0.38], [0.52, 0.0, 0.38], [-0.32, -0.5, 0.38], [0.32, -0.5, 0.38], [-0.34, 0.4, 0.38], [0.34, 0.4, 0.38], [0, 0.2, 0.5], [0, -0.62, 0.34]].forEach(function (a) { c.moveTo(a[0] + a[2], a[1]); c.arc(a[0], a[1], a[2], 0, Math.PI * 2); });
}
function dMint(c, p, deep) {
  c.lineCap = 'round';
  c.strokeStyle = rgba(deep, 0.28); c.lineWidth = 0.05;
  [[-0.3, 0.55, 0.3, 0.1, 3.6], [0.35, 0.5, 0.28, 0.2, 5.2], [0, 0.78, 0.4, 0.1, 3.9]].forEach(function (a) { c.beginPath(); c.arc(a[0], a[1], a[2], a[4], a[4] + 2.2); c.stroke(); });
  c.strokeStyle = 'rgba(255,255,255,.62)'; c.lineWidth = 0.055;
  [[-0.35, -0.3, 0.3, 3.5], [0.33, -0.2, 0.26, 0.2], [-0.05, -0.55, 0.28, 3.9], [0.0, 0.05, 0.34, 5.0], [-0.45, 0.2, 0.22, 4.4], [0.45, 0.25, 0.2, 5.4], [-0.05, 0.4, 0.26, 0.5]].forEach(function (a) { c.beginPath(); c.arc(a[0], a[1], a[2], a[3], a[3] + 2.4); c.stroke(); });
  c.fillStyle = 'rgba(255,255,255,.4)';
  c.beginPath(); el(c, -0.28, -0.52, 0.2, 0.12, -0.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)';
  [[-0.5, -0.12, 0.035], [0.12, -0.7, 0.03], [0.55, 0.18, 0.03], [-0.15, 0.62, 0.03]].forEach(function (a) { c.beginPath(); c.arc(a[0], a[1], a[2], 0, Math.PI * 2); c.fill(); });
}
`;

// Pool optimizado: DPR limitado a 1.25 máx (ultra fluido en móviles y pantallas retina sin ahogar la GPU), sombras estáticas
const POOL_FRAME = `const _TICK=1000/60;let _acc=0,_last=0,_dirty=true,_cueWas=false,_ema=16.7,_n=0,_pr=Math.min(devicePixelRatio||1,1.25);
const _tq=new THREE.Quaternion(),_tax=new THREE.Vector3();
function frame(now){
 requestAnimationFrame(frame);
 now=now||performance.now();const dt=Math.min(now-(_last||now),100);_last=now;_acc+=dt;
 _ema=_ema*.95+Math.min(dt,50)*.05;
 if(++_n>60&&_ema>22&&_pr>.75){_pr-=.25;rd.setPixelRatio(_pr);resize();_n=0;_ema=16.7}
 let ticks=0;
 while(_acc>=_TICK&&ticks<4){_acc-=_TICK;ticks++;
  if(moving&&!step(B,pot))finish();
  if(charging&&idle())charge=Math.min(1,charge+.014);
  B.forEach((b,k)=>{const m=meshes[k];if(!b.in){m.visible=true;m.castShadow=true;
    const s=Math.hypot(b.vx,b.vy);if(s>0){_tax.set(b.vy,0,-b.vx).normalize();m.quaternion.premultiply(_tq.setFromAxisAngle(_tax,s/R));m.quaternion.normalize();_dirty=true}
    if(m.position.x!==b.x||m.position.z!==b.y||m.position.y!==R)_dirty=true;
    m.position.set(b.x,R,b.y);m.scale.setScalar(1)}
   else{m.castShadow=false;if(m.position.y>-R*2.2){let q=PK[0],dm=1e9;for(const p of PK){const d=Math.hypot(b.x-p[0],b.y-p[1]);if(d<dm){dm=d;q=p}}
     m.position.x+=(q[0]-m.position.x)*.25;m.position.z+=(q[1]-m.position.z)*.25;
     m.position.y-=1.6;m.scale.setScalar(Math.max(.4,m.scale.x-.01));_dirty=true}else m.visible=false}})}
 if(ticks===4)_acc=0;
 aimL.visible=trgL.visible=ghost.visible=cue.visible=false;
 if(!B[0].in&&idle()){if(aimMode&&!hand)aim(aimYaw,charge*180);else if(drag){const dx=drag.sx-mouse.x,dz=drag.sz-mouse.z;aim(Math.atan2(dz,dx),Math.min(Math.hypot(dx,dz),180))}}
 if(hand&&over==null&&!moving){ghost.position.set(mouse.x,R,mouse.z);ghost.visible=true}
 if(cue.visible!==_cueWas){_cueWas=cue.visible;_dirty=true}
 if(_dirty||cue.visible){rd.shadowMap.needsUpdate=true;_dirty=false}
 try { if(typeof bgTick==='function') bgTick(); }catch(e){} placeCam(); rd.render(sc,cam)}`;

const PATCHES = {
  pool: [
    [`rd.setPixelRatio(Math.min(devicePixelRatio,2));rd.shadowMap.enabled=true;`, `rd.setPixelRatio(Math.min(devicePixelRatio||1,1.15));rd.shadowMap.enabled=true;rd.shadowMap.autoUpdate=false;`],
    [`sc.background=new THREE.Color('#000');`, `rd.setClearColor(0x000000, 0);sc.background=null;`],
    [`applyCue('clasico');applyBackground('espacio');`, `applyCue('clasico');`],
    [`b.x+=b.vx/8;b.y+=b.vy/8;`, `b.x+=b.vx/8;b.y+=b.vy/8;for(const p of PK)if(Math.hypot(b.x-p[0],b.y-p[1])<(p[0]===MX?34:36)){b.in=1;b.vx=b.vy=0;pot.push(b.i);sPocket();break}if(b.in)continue;`],
    [`for(const p of PK)if(Math.hypot(b.x-p[0],b.y-p[1])<20){b.in=1;b.vx=b.vy=0;pot.push(b.i);sPocket()}}`, `}`],
    [`sp.shadow.mapSize.set(2048,2048)`, `sp.shadow.mapSize.set(512,512)`]
  ],
  gomi: [
    [`dpr = Math.min(window.devicePixelRatio || 1, 2);`, `dpr = Math.min(window.devicePixelRatio || 1, 1.25);`],
    [`<h1>Gominola Rank</h1>`, `<h1>Gominola</h1>`],
    [`Cada ronda tiene una meta. Si la cumples, subes de rango; si fallas, pierdes puntos. El rango no tiene techo, y cuanto más alto estás, más cuesta caer. Junta`, `Cada ronda tiene una meta de puntos. Junta`],
    [`Los puntos extra suman rango`, `Sigue sumando puntos`],
    [`la meta sube y, si fallas, pierdes más puntos de rango.`, `la meta sube.`],
    [`'¡Subiste de rango!'`, `'¡Ronda superada!'`], [`'Bajaste de rango'`, `'Meta no alcanzada'`], [`'Lo perdiste todo'`, `'Meta no alcanzada'`],
    [`function hasMove(b) { return countHearts(b) > 0 || hasMatchMove(b); }`, `function hasMove(b) { return hasMatchMove(b); }`],
    [`    if ((a.t === HEART) !== (b.t === HEART)) {
      round.moves--; renderHud();
      if (!heartTip) { heartTip = true; toast('Los corazones se mueven libres, pero cuestan 1 movimiento'); }
      if (round.moves <= 0) { await wait(250); roundOver(); return; }
      busy = false; return;
    }
`, ``],
    [`Los corazones son raros y se mueven libres: junta 3 y explota TODO.`, `Los corazones son raros y se mueven como las demás piezas: junta 3 y explota TODO.`]
  ]
};

for (const k of games) {
  const marker = `<script type="text/plain" id="src-${k}">`;
  const startIdx = content.indexOf(marker);
  if (startIdx === -1) {
    console.error(`No se encontró el script src-${k}`);
    continue;
  }
  const codeStart = startIdx + marker.length;
  const endIdx = content.indexOf('</script>', codeStart);
  if (endIdx === -1) {
    console.error(`No se encontró el cierre de script para src-${k}`);
    continue;
  }

  let h = content.substring(codeStart, endIdx)
    .replace(/<\\\/script/g, '</script')
    .replace(/<\\!--/g, '<!--');

  // 1. Tema oscuro
  h = h.includes('<html lang="es">')
    ? h.replace('<html lang="es">', '<html lang="es" data-theme="dark">')
    : h.replace('<html>', '<html data-theme="dark">');

  // 2. Parches de texto y optimizaciones
  if (PATCHES[k]) {
    PATCHES[k].forEach(([a, b]) => {
      if (h.includes(a)) h = h.replace(a, () => b);
      else console.warn(`[parche no encontrado en ${k}]`, a.slice(0, 40));
    });
  }

  // 2b. Parches especiales
  if (k === 'gomi') {
    const i0 = h.indexOf('function pMint(c)');
    const i1 = h.indexOf('// formas de osito y patito');
    if (i0 >= 0 && i1 > i0) {
      h = h.slice(0, i0) + COTTON_CANDY + h.slice(i1);
    }
  }

  if (k === 'pool') {
    const f0 = h.indexOf('function frame(){');
    const f1 = h.indexOf('requestAnimationFrame(frame)}', f0);
    if (f0 >= 0 && f1 > f0) {
      h = h.slice(0, f0) + POOL_FRAME + h.slice(f1 + 'requestAnimationFrame(frame)}'.length);
    }
  }

  if (k === 'tetris') {
    h = h.replace(/<div class="tip">[\s\S]*?<\/div>/, '');
  }

  // 3. Inyectar CSS transparente + optimizado
  h = h.replace('</head>', () => BASE_HEAD + (GAME_CSS[k] || '') + '</head>');

  const outFile = path.join(outDir, `${k}.html`);
  fs.writeFileSync(outFile, h, 'utf8');
  console.log(`✓ Creado ${outFile} (${(h.length / 1024).toFixed(1)} KB)`);
}

console.log('¡Extracción y optimización a 60 FPS completadas con éxito!');
