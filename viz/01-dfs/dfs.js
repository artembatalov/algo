// ── Constants ──────────────────────────────────────────────
const WHITE = 0, GRAY = 1, BLACK = 2;
const STATE_NAME = ['white', 'gray', 'black'];

const EDGE_TYPE = { DEFAULT: 'default', TREE: 'tree', BACK: 'back', FORWARD: 'forward', CROSS: 'cross', ACTIVE: 'active' };
const EDGE_LABEL = { tree: 'Tree edge', back: 'Back edge', forward: 'Forward edge', cross: 'Cross edge' };

const CODE_LINES = [
  { id: 0, html: '<span class="kw">function</span> <span class="fn">dfs</span>(v):' },
  { id: 1, html: '  color[v] = <span class="num">GRAY</span>        <span class="cm">// enter</span>' },
  { id: 2, html: '  tin[v] = timer++' },
  { id: 3, html: '  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
  { id: 4, html: '    <span class="kw">if</span> color[to] == WHITE:' },
  { id: 5, html: '      <span class="fn">dfs</span>(to)        <span class="cm">// tree edge</span>' },
  { id: 6, html: '    <span class="kw">elif</span> color[to] == GRAY:' },
  { id: 7, html: '      <span class="cm">// back edge (cycle!)</span>' },
  { id: 8, html: '    <span class="kw">else</span>:' },
  { id: 9, html: '      <span class="cm">// forward / cross edge</span>' },
  { id:10, html: '  color[v] = <span class="num">BLACK</span>       <span class="cm">// exit</span>' },
  { id:11, html: '  tout[v] = timer++' },
];

// ── Default graph ──────────────────────────────────────────
const DEFAULT_GRAPH = {
  directed: true,
  nodes: [
    { id: 0, x: 160, y: 140 },
    { id: 1, x: 320, y: 80  },
    { id: 2, x: 480, y: 140 },
    { id: 3, x: 240, y: 280 },
    { id: 4, x: 400, y: 280 },
    { id: 5, x: 560, y: 220 },
  ],
  edges: [
    { s: 0, t: 1 }, { s: 0, t: 3 },
    { s: 1, t: 2 }, { s: 1, t: 3 },
    { s: 2, t: 5 },
    { s: 3, t: 4 },
    { s: 4, t: 1 }, { s: 4, t: 5 },
  ],
};

// ── State ──────────────────────────────────────────────────
let graph = JSON.parse(JSON.stringify(DEFAULT_GRAPH));
let simulation = null;
let animSteps = [];
let stepIdx = 0;
let playing = false;
let playTimer = null;
let speed = 700; // ms per step

// ── D3 setup ───────────────────────────────────────────────
const svg = d3.select('#graph-svg');
let edgeGroup, nodeGroup, markerDefs;
let width, height;

function initSvg() {
  const rect = document.getElementById('svg-container').getBoundingClientRect();
  width = rect.width; height = rect.height;

  svg.selectAll('*').remove();

  markerDefs = svg.append('defs');
  addMarker('arrow-default', '#3e4460');
  addMarker('arrow-tree',    '#6366f1');
  addMarker('arrow-back',    '#ef4444');
  addMarker('arrow-forward', '#06b6d4');
  addMarker('arrow-cross',   '#a855f7');
  addMarker('arrow-active',  '#f59e0b');

  edgeGroup = svg.append('g').attr('class', 'edges');
  nodeGroup = svg.append('g').attr('class', 'nodes');

  svg.on('click', onSvgClick);

  renderGraph();
}

function addMarker(id, color) {
  markerDefs.append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 28).attr('refY', 0)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', color);
}

// ── Helpers ────────────────────────────────────────────────
function nodeById(id) {
  return graph.nodes.find(n => n.id === id);
}

// ── Render ─────────────────────────────────────────────────
function renderGraph() {
  renderEdges();
  renderNodes();
}

function renderEdges() {
  const edges = graph.edges;
  const sel = edgeGroup.selectAll('line.edge').data(edges, d => `${d.s}-${d.t}`);

  sel.exit().remove();

  const enter = sel.enter().append('line')
    .attr('class', 'edge default')
    .on('contextmenu', (event, d) => {
      event.preventDefault();
      if (!playing && stepIdx === 0) {
        graph.edges = graph.edges.filter(e => !(e.s === d.s && e.t === d.t));
        renderGraph();
      }
    });

  sel.merge(enter)
    .each(function(d) {
      const sn = nodeById(d.s), tn = nodeById(d.t);
      if (!sn || !tn) return;
      const { x1, y1, x2, y2 } = edgeCoords(sn, tn);
      const type = d.type || 'default';
      d3.select(this)
        .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
        .attr('class', `edge ${type}`)
        .attr('marker-end', graph.directed ? `url(#arrow-${type})` : null);
    });
}

function edgeCoords(sn, tn) {
  const r = 22;
  const dx = tn.x - sn.x, dy = tn.y - sn.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const ux = dx/len, uy = dy/len;
  return {
    x1: sn.x + ux*r, y1: sn.y + uy*r,
    x2: tn.x - ux*r, y2: tn.y - uy*r,
  };
}

function renderNodes() {
  const sel = nodeGroup.selectAll('g.node').data(graph.nodes, d => d.id);
  sel.exit().remove();

  const enter = sel.enter().append('g').attr('class', 'node')
    .call(d3.drag().on('drag', (event, d) => {
      d.x = event.x; d.y = event.y;
      renderGraph();
    }))
    .on('contextmenu', (event, d) => {
      event.preventDefault();
      if (!playing && stepIdx === 0) {
        graph.nodes = graph.nodes.filter(n => n.id !== d.id);
        graph.edges = graph.edges.filter(e => e.s !== d.id && e.t !== d.id);
        renderGraph();
      }
    });

  enter.append('circle').attr('class', 'node-circle');
  enter.append('text').attr('class', 'node-label');
  enter.append('text').attr('class', 'node-times').attr('dy', 33);

  sel.merge(enter).each(function(d) {
    const g = d3.select(this);
    g.attr('transform', `translate(${d.x},${d.y})`);

    const classes = ['node-circle'];
    if (d.state === GRAY)  classes.push('state-gray');
    if (d.state === BLACK) classes.push('state-black');
    if (d.id === graph.startNode) classes.push('start-node');
    if (d.current) classes.push('current');

    g.select('.node-circle').attr('class', classes.join(' '));
    g.select('.node-label').text(d.label ?? d.id);
    g.select('.node-times').text(
      d.tin != null ? `${d.tin ?? '?'}/${d.tout ?? '?'}` : ''
    );
  });
}

// ── DFS algorithm → step list ──────────────────────────────
function buildSteps(startId) {
  const n = graph.nodes.length;
  const ids = graph.nodes.map(nd => nd.id);
  const adj = {};
  ids.forEach(id => adj[id] = []);
  graph.edges.forEach(e => {
    adj[e.s].push(e.t);
    if (!graph.directed) adj[e.t].push(e.s);
  });

  const color = {};
  const tin = {}, tout = {};
  const edgeType = {};
  ids.forEach(id => { color[id] = WHITE; });
  let timer = 0;
  const steps = [];

  // edge key
  const ek = (s, t) => `${s}-${t}`;

  function push(step) { steps.push(step); }

  function dfs(v) {
    color[v] = GRAY;
    tin[v] = timer++;
    push({ type: 'enter', v, tin: tin[v], color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [1,2] });

    for (const to of adj[v]) {
      push({ type: 'check-edge', v, to, color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [3,4] });
      if (color[to] === WHITE) {
        edgeType[ek(v,to)] = 'tree';
        push({ type: 'tree-edge', v, to, color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [5] });
        dfs(to);
      } else if (color[to] === GRAY) {
        edgeType[ek(v,to)] = 'back';
        push({ type: 'back-edge', v, to, color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [6,7] });
      } else {
        const k = ek(v,to);
        const eType = (tin[v] < tin[to]) ? 'forward' : 'cross';
        edgeType[k] = eType;
        push({ type: eType+'-edge', v, to, color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [8,9] });
      }
    }

    color[v] = BLACK;
    tout[v] = timer++;
    push({ type: 'exit', v, tout: tout[v], color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [10,11] });
  }

  // start from startId, then any unvisited
  const order = startId != null
    ? [startId, ...ids.filter(id => id !== startId)]
    : ids;

  for (const id of order) {
    if (color[id] === WHITE) {
      push({ type: 'start-component', v: id, color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [] });
      dfs(id);
    }
  }

  push({ type: 'done', color: {...color}, tin_snap: {...tin}, tout_snap: {...tout}, line: [], edgeType });

  // embed final edgeType in every step for convenience
  steps.forEach(s => { if (!s.edgeType) s.edgeType = {}; });
  // propagate edgeType incrementally
  const running = {};
  steps.forEach(s => {
    if (s.type === 'tree-edge' || s.type.endsWith('-edge')) {
      running[ek(s.v, s.to)] = edgeType[ek(s.v, s.to)] || 'default';
    }
    s.edgeTypeSnap = {...running};
  });

  return steps;
}

// ── Apply step ─────────────────────────────────────────────
function applyStep(idx) {
  const step = animSteps[idx];
  if (!step) return;

  // update node states
  graph.nodes.forEach(nd => {
    nd.state = step.color[nd.id] ?? WHITE;
    nd.tin  = step.tin_snap[nd.id] ?? null;
    nd.tout = step.tout_snap[nd.id] ?? null;
    nd.current = (nd.id === step.v && step.type !== 'done');
  });

  // update edge types
  graph.edges.forEach(e => {
    const k = `${e.s}-${e.t}`;
    const t = step.edgeTypeSnap?.[k];
    const isActive = step.v != null && step.to != null && e.s === step.v && e.t === step.to;
    e.type = isActive && step.type !== 'done' ? 'active' : (t || 'default');
  });

  renderGraph();
  renderCode(step.line || []);
  renderState(step);
  renderStepDesc(step);
}

// ── Code panel ─────────────────────────────────────────────
function renderCode(activeLines) {
  const lines = Array.isArray(activeLines) ? activeLines : [activeLines];
  document.querySelectorAll('.code-line').forEach(el => {
    const lid = parseInt(el.dataset.line);
    el.classList.toggle('active', lines.includes(lid));
  });
}

// ── State panel ────────────────────────────────────────────
function renderState(step) {
  const ids = graph.nodes.map(n => n.id);
  const color = step?.color ?? {};

  // stack = gray nodes
  const stackNodes = ids.filter(id => color[id] === GRAY);
  const visitedNodes = ids.filter(id => color[id] === BLACK);
  const unvisited = ids.filter(id => !color[id] || color[id] === WHITE);

  document.getElementById('chip-stack').innerHTML = renderChips(stackNodes, 'gray') || '<span style="color:#475569;font-size:11px">empty</span>';
  document.getElementById('chip-visited').innerHTML = renderChips(visitedNodes, 'black') || '<span style="color:#475569;font-size:11px">—</span>';
  document.getElementById('chip-unvisited').innerHTML = renderChips(unvisited, 'white');

  // times table
  const tbody = document.getElementById('times-tbody');
  tbody.innerHTML = '';
  ids.forEach(id => {
    const nd = graph.nodes.find(n => n.id === id);
    const tr = document.createElement('tr');
    if (id === step?.v) tr.className = 'current-row';
    tr.innerHTML = `
      <td>${nd?.label ?? id}</td>
      <td class="val">${nd?.tin ?? '—'}</td>
      <td class="val">${nd?.tout ?? '—'}</td>
      <td>${STATE_NAME[nd?.state ?? 0]}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderChips(ids, cls) {
  return ids.map(id => {
    const nd = graph.nodes.find(n => n.id === id);
    return `<span class="chip ${cls}">${nd?.label ?? id}</span>`;
  }).join('');
}

// ── Step description ───────────────────────────────────────
const DESC = {
  'enter':           s => `Entering node <b>${lbl(s.v)}</b> — marking <b>GRAY</b>, tin = ${s.tin}`,
  'exit':            s => `Finished node <b>${lbl(s.v)}</b> — marking <b>BLACK</b>, tout = ${s.tout}`,
  'check-edge':      s => `Checking edge <b>${lbl(s.v)} → ${lbl(s.to)}</b>`,
  'tree-edge':       s => `<b>Tree edge</b> ${lbl(s.v)} → ${lbl(s.to)} — recursing into <b>${lbl(s.to)}</b>`,
  'back-edge':       s => `<b>Back edge</b> ${lbl(s.v)} → ${lbl(s.to)} — <b>${lbl(s.to)}</b> is GRAY → cycle detected!`,
  'forward-edge':    s => `<b>Forward edge</b> ${lbl(s.v)} → ${lbl(s.to)} — <b>${lbl(s.to)}</b> is BLACK (descendant)`,
  'cross-edge':      s => `<b>Cross edge</b> ${lbl(s.v)} → ${lbl(s.to)} — <b>${lbl(s.to)}</b> is BLACK (different subtree)`,
  'start-component': s => `Starting DFS from node <b>${lbl(s.v)}</b>`,
  'done':            () => 'DFS complete.',
};

function lbl(id) {
  const nd = graph.nodes.find(n => n.id === id);
  return nd?.label ?? id;
}

function renderStepDesc(step) {
  const fn = DESC[step?.type];
  document.getElementById('step-desc').innerHTML = fn ? fn(step) : '';
}

// ── Controls ───────────────────────────────────────────────
function initDfs(startId) {
  const sid = startId ?? (graph.startNode ?? graph.nodes[0]?.id);
  graph.startNode = sid;
  animSteps = buildSteps(sid);
  stepIdx = 0;

  // reset visual state
  graph.nodes.forEach(nd => { nd.state = WHITE; nd.tin = null; nd.tout = null; nd.current = false; });
  graph.edges.forEach(e => { e.type = 'default'; });
  renderGraph();
  renderCode([]);
  renderState({ color: {} });
  renderStepDesc(null);
  updateButtons();
}

function stepForward() {
  if (stepIdx < animSteps.length - 1) {
    stepIdx++;
    applyStep(stepIdx);
    updateButtons();
  }
}

function stepBack() {
  if (stepIdx > 0) {
    stepIdx--;
    applyStep(stepIdx);
    updateButtons();
  }
}

function play() {
  playing = true;
  updateButtons();
  tick();
}

function tick() {
  if (!playing) return;
  if (stepIdx >= animSteps.length - 1) {
    pause();
    return;
  }
  stepForward();
  playTimer = setTimeout(tick, speed);
}

function pause() {
  playing = false;
  clearTimeout(playTimer);
  updateButtons();
}

function reset() {
  pause();
  stepIdx = 0;
  graph.nodes.forEach(nd => { nd.state = WHITE; nd.tin = null; nd.tout = null; nd.current = false; });
  graph.edges.forEach(e => { e.type = 'default'; });
  renderGraph();
  renderCode([]);
  renderState({ color: {} });
  renderStepDesc(null);
  updateButtons();
}

function updateButtons() {
  document.getElementById('btn-play').disabled  = playing || stepIdx >= animSteps.length - 1;
  document.getElementById('btn-pause').disabled = !playing;
  document.getElementById('btn-step').disabled  = playing || stepIdx >= animSteps.length - 1;
  document.getElementById('btn-back').disabled  = playing || stepIdx === 0;
  document.getElementById('btn-reset').disabled = playing;
}

// ── Graph editing ──────────────────────────────────────────
let pendingEdgeSrc = null;

function onSvgClick(event) {
  if (playing || stepIdx > 0) return;
  if (event.target.closest('.node')) return; // handled by node click

  const [mx, my] = d3.pointer(event);
  const newId = graph.nodes.length === 0 ? 0 : Math.max(...graph.nodes.map(n => n.id)) + 1;
  graph.nodes.push({ id: newId, x: mx, y: my });
  pendingEdgeSrc = null;
  renderGraph();
  wireNodeClicks();
}

function wireNodeClicks() {
  nodeGroup.selectAll('g.node').on('click', function(event, d) {
    event.stopPropagation();
    if (playing || stepIdx > 0) {
      // set start node
      graph.startNode = d.id;
      initDfs(d.id);
      return;
    }
    if (pendingEdgeSrc === null) {
      pendingEdgeSrc = d.id;
      d3.select(this).select('.node-circle').classed('start-node', true);
    } else if (pendingEdgeSrc !== d.id) {
      const exists = graph.edges.some(e => e.s === pendingEdgeSrc && e.t === d.id);
      if (!exists) {
        graph.edges.push({ s: pendingEdgeSrc, t: d.id, type: 'default' });
      }
      pendingEdgeSrc = null;
      renderGraph();
      wireNodeClicks();
    } else {
      pendingEdgeSrc = null;
      renderGraph();
      wireNodeClicks();
    }
  });
}

function loadDefault() {
  graph = JSON.parse(JSON.stringify(DEFAULT_GRAPH));
  initSvg();
  initDfs();
  wireNodeClicks();
}

function toggleDirected() {
  graph.directed = !graph.directed;
  document.getElementById('btn-directed').classList.toggle('active', graph.directed);
  document.getElementById('btn-undirected').classList.toggle('active', !graph.directed);
  renderGraph();
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildCodePanel();

  // controls
  document.getElementById('btn-play').addEventListener('click', () => {
    if (animSteps.length === 0) initDfs();
    play();
  });
  document.getElementById('btn-pause').addEventListener('click', pause);
  document.getElementById('btn-step').addEventListener('click', () => {
    if (animSteps.length === 0) initDfs();
    stepForward();
  });
  document.getElementById('btn-back').addEventListener('click', stepBack);
  document.getElementById('btn-reset').addEventListener('click', reset);
  document.getElementById('btn-run').addEventListener('click', () => { initDfs(); });
  document.getElementById('btn-load').addEventListener('click', loadDefault);
  document.getElementById('btn-directed').addEventListener('click', () => { if (!graph.directed) toggleDirected(); });
  document.getElementById('btn-undirected').addEventListener('click', () => { if (graph.directed) toggleDirected(); });

  document.getElementById('speed').addEventListener('input', e => {
    speed = 1100 - parseInt(e.target.value);
  });

  loadDefault();

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === '.') { if (animSteps.length === 0) initDfs(); if (!playing) stepForward(); }
    if (e.key === 'ArrowLeft'  || e.key === ',') { if (!playing) stepBack(); }
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : (animSteps.length === 0 ? initDfs() : null, play()); }
    if (e.key === 'r' || e.key === 'R') reset();
  });
});

function buildCodePanel() {
  const container = document.getElementById('pseudocode');
  CODE_LINES.forEach(cl => {
    const div = document.createElement('div');
    div.className = 'code-line';
    div.dataset.line = cl.id;
    div.innerHTML = cl.html;
    container.appendChild(div);
  });
}
