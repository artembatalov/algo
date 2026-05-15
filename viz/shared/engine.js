/* ═══════════════════════════════════════════════════════════
   AlgoViz Shared Engine  —  viz/shared/engine.js
   Provides: VizAnim, VizGraph, VizCode, VizState
   ═══════════════════════════════════════════════════════════ */

// ── Constants ───────────────────────────────────────────────
const WHITE = 0, GRAY = 1, BLACK = 2;
const INF = 1e9;

/* ════════════════════════════════════════════════════════════
   VizAnim — step-by-step animation controller
   ════════════════════════════════════════════════════════════ */
const VizAnim = (() => {
  let _steps = [], _idx = -1, _playing = false, _timer = null, _speed = 650;
  let _onStep = null;

  function _apply(i) {
    if (i < 0 || i >= _steps.length) return;
    _idx = i;
    _onStep?.(_steps[i], i);
    _sync();
  }

  function _sync() {
    const atEnd = _idx >= _steps.length - 1;
    const atStart = _idx <= 0;
    _setDis('btn-play',  _playing || atEnd);
    _setDis('btn-pause', !_playing);
    _setDis('btn-step',  _playing || atEnd);
    _setDis('btn-back',  _playing || atStart);
    _setDis('btn-reset', _playing);
  }

  function _setDis(id, v) {
    const el = document.getElementById(id);
    if (el) v ? el.setAttribute('disabled','') : el.removeAttribute('disabled');
  }

  function _tick() {
    if (!_playing) return;
    if (_idx >= _steps.length - 1) { pause(); return; }
    _apply(_idx + 1);
    _timer = setTimeout(_tick, _speed);
  }

  return {
    init(steps, onStep) {
      clearTimeout(_timer);
      _steps = steps;
      _idx = -1;
      _playing = false;
      _onStep = onStep;
      _sync();
    },
    play() {
      if (_idx < 0) _apply(0); else _playing = true;
      _playing = true;
      _sync();
      _tick();
    },
    pause() { _playing = false; clearTimeout(_timer); _sync(); },
    step()  { if (!_playing && _idx < _steps.length-1) _apply(_idx+1); },
    back()  { if (!_playing && _idx > 0) _apply(_idx-1); },
    reset() { clearTimeout(_timer); _playing = false; _apply(0); },
    setSpeed(ms) { _speed = ms; },
    get idx()   { return _idx; },
    get steps() { return _steps; },
    get playing(){ return _playing; },
    bindUI(onRun) {
      const b = id => document.getElementById(id);
      b('btn-run')?.addEventListener('click', () => { onRun?.(); });
      b('btn-play')?.addEventListener('click', () => this.play());
      b('btn-pause')?.addEventListener('click', () => this.pause());
      b('btn-step')?.addEventListener('click', () => this.step());
      b('btn-back')?.addEventListener('click', () => this.back());
      b('btn-reset')?.addEventListener('click', () => this.reset());
      b('speed')?.addEventListener('input', e => this.setSpeed(1100 - +e.target.value));
      window.addEventListener('keydown', e => {
        if (e.key==='ArrowRight'||e.key==='.') this.step();
        if (e.key==='ArrowLeft' ||e.key===',') this.back();
        if (e.key===' ') { e.preventDefault(); _playing ? this.pause() : this.play(); }
        if (e.key==='r'||e.key==='R') this.reset();
      });
    },
  };
})();

/* ════════════════════════════════════════════════════════════
   VizGraph — D3 graph renderer
   ════════════════════════════════════════════════════════════ */
const VizGraph = (() => {
  let _svg, _edgeG, _nodeG, _weightG, _defs;
  let _nodes = [], _edges = [];
  let _directed = true, _weighted = false;
  let _onNodeClick = null, _onCanvasClick = null;
  let _pendingSrc = null;

  const R = 20; // node radius

  function _addMarker(id, color) {
    _defs.append('marker')
      .attr('id', id)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', R + 8).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d','M0,-5L10,0L0,5').attr('fill', color);
  }

  function init(svgId, options = {}) {
    _directed = options.directed !== false;
    _weighted = options.weighted || false;
    _svg = d3.select('#' + svgId);
    _svg.selectAll('*').remove();
    _defs = _svg.append('defs');
    [['default','#4a5278'],['tree','#6366f1'],['back','#ef4444'],
     ['forward','#06b6d4'],['cross','#a855f7'],['active','#f59e0b'],
     ['mst','#10b981'],['rejected','#ef4444'],['flow','#818cf8'],
    ].forEach(([id,c]) => _addMarker(id, c));
    _edgeG  = _svg.append('g');
    _weightG = _svg.append('g');
    _nodeG  = _svg.append('g');
    _svg.on('click', e => {
      if (e.target.closest('.node')) return;
      _pendingSrc = null;
      _onCanvasClick?.(e, d3.pointer(e, _svg.node()));
    });
  }

  function _ecoords(sn, tn) {
    const dx=tn.x-sn.x, dy=tn.y-sn.y, len=Math.hypot(dx,dy)||1;
    return { x1:sn.x+dx/len*R, y1:sn.y+dy/len*R, x2:tn.x-dx/len*R, y2:tn.y-dy/len*R };
  }

  function _nodeById(id) { return _nodes.find(n=>n.id===id); }

  function render() {
    // Edges
    const eSel = _edgeG.selectAll('line.edge').data(_edges, d=>`${d.s}-${d.t}`);
    eSel.exit().remove();
    const eEnter = eSel.enter().append('line').attr('class','edge');
    eSel.merge(eEnter).each(function(d) {
      const sn=_nodeById(d.s), tn=_nodeById(d.t);
      if (!sn||!tn) return;
      const {x1,y1,x2,y2}=_ecoords(sn,tn);
      const type = d.type||'default';
      d3.select(this)
        .attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2)
        .attr('class','edge '+type)
        .attr('marker-end', _directed ? `url(#${type})` : null);
    });

    // Weight labels
    if (_weighted) {
      const wSel = _weightG.selectAll('text.wlbl').data(_edges, d=>`${d.s}-${d.t}`);
      wSel.exit().remove();
      wSel.enter().append('text').attr('class','wlbl edge-weight-label')
        .merge(wSel).each(function(d) {
          const sn=_nodeById(d.s), tn=_nodeById(d.t);
          if(!sn||!tn) return;
          const mx=(sn.x+tn.x)/2, my=(sn.y+tn.y)/2;
          const dx=tn.y-sn.y, dy=sn.x-tn.x, len=Math.hypot(dx,dy)||1;
          d3.select(this).attr('x',mx+dx/len*11).attr('y',my+dy/len*11)
            .attr('class', 'wlbl edge-weight-label'+(d.type&&d.type!=='default'?' wlbl-'+d.type:''))
            .text(d.w ?? '');
        });
    }

    // Nodes
    const nSel = _nodeG.selectAll('g.node').data(_nodes, d=>d.id);
    nSel.exit().remove();
    const nEnter = nSel.enter().append('g').attr('class','node')
      .call(d3.drag().on('drag', (ev,d)=>{ d.x=ev.x; d.y=ev.y; render(); }))
      .on('contextmenu', (ev,d)=>{ ev.preventDefault(); removeNode(d.id); })
      .on('click', (ev,d)=>{ ev.stopPropagation(); _onNodeClick?.(d, ev); });
    nEnter.append('circle').attr('r', R).attr('class','node-circle');
    nEnter.append('text').attr('class','node-label');
    nEnter.append('text').attr('class','node-sublabel').attr('dy', R+10);
    nSel.merge(nEnter).each(function(d) {
      d3.select(this).attr('transform',`translate(${d.x},${d.y})`);
      const cls = ['node-circle', ...(d.classes||[])].join(' ');
      d3.select(this).select('.node-circle').attr('class', cls);
      d3.select(this).select('.node-label').text(d.label ?? d.id);
      d3.select(this).select('.node-sublabel').text(d.sub ?? '');
    });
  }

  function setData(nodes, edges) { _nodes = nodes; _edges = edges; }
  function getNodes() { return _nodes; }
  function getEdges() { return _edges; }

  function addNode(x, y) {
    const id = _nodes.length ? Math.max(..._nodes.map(n=>n.id))+1 : 0;
    _nodes.push({ id, x, y });
    render();
    return id;
  }

  function removeNode(id) {
    _nodes = _nodes.filter(n=>n.id!==id);
    _edges = _edges.filter(e=>e.s!==id&&e.t!==id);
    render();
  }

  function addEdge(s, t, w) {
    if (!_edges.some(e=>e.s===s&&e.t===t))
      _edges.push({ s, t, w: w??undefined });
    render();
  }

  function setDirected(v) { _directed = v; render(); }

  /* Edge source selection for interactive building */
  function handleNodeClick(d) {
    if (_pendingSrc === null) {
      _pendingSrc = d.id;
      _nodeG.selectAll('g.node').filter(n=>n.id===d.id)
        .select('.node-circle').classed('s-start', true);
    } else if (_pendingSrc !== d.id) {
      const src = _pendingSrc;
      _pendingSrc = null;
      _nodeG.selectAll('.s-start').classed('s-start', false);
      const w = _weighted ? (parseFloat(prompt('Вес ребра:', '1'))||1) : undefined;
      addEdge(src, d.id, w);
    } else {
      _pendingSrc = null;
      _nodeG.selectAll('.s-start').classed('s-start', false);
      render();
    }
  }

  return {
    init, render, setData, getNodes, getEdges, addNode, removeNode, addEdge, setDirected,
    nodeById: _nodeById,
    onNodeClick(cb) { _onNodeClick = cb; },
    onCanvasClick(cb) { _onCanvasClick = cb; },
    defaultNodeClick() { _onNodeClick = handleNodeClick; },
    get directed() { return _directed; },
  };
})();

/* ════════════════════════════════════════════════════════════
   VizCode — pseudocode panel
   ════════════════════════════════════════════════════════════ */
const VizCode = (() => {
  let _container = null;
  return {
    init(lines, containerId = 'pseudo') {
      _container = document.getElementById(containerId);
      if (!_container) return;
      // keep existing h3
      const h3 = _container.querySelector('h3');
      _container.innerHTML = '';
      if (h3) _container.appendChild(h3);
      lines.forEach(({ id, html }) => {
        const d = document.createElement('div');
        d.className = 'pseudo-line';
        d.dataset.id = id;
        d.innerHTML = html;
        _container.appendChild(d);
      });
    },
    highlight(ids) {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      _container?.querySelectorAll('.pseudo-line').forEach(el => {
        el.classList.toggle('hl', set.has(+el.dataset.id));
      });
    },
    clear() { this.highlight([]); },
  };
})();

/* ════════════════════════════════════════════════════════════
   VizState — state chips + table panel
   ════════════════════════════════════════════════════════════ */
const VizState = {
  /* groups: [{key, ids, cls, nodes}] */
  setChips(groups, nodes) {
    const panel = document.getElementById('state-panel');
    if (!panel) return;
    const rows = panel.querySelectorAll('.state-row');
    groups.forEach((g, i) => {
      if (!rows[i]) return;
      const chips = rows[i].querySelector('.chips');
      if (!chips) return;
      const ndMap = Object.fromEntries((nodes||[]).map(n=>[n.id, n.label??n.id]));
      chips.innerHTML = g.ids.length
        ? g.ids.map(id => `<span class="chip ${g.cls}">${ndMap[id]??id}</span>`).join('')
        : `<span style="color:#475569;font-size:11px">${g.empty??'—'}</span>`;
    });
  },

  /* rows: [{cells: [], hl: bool}] */
  setTable(tableId, headers, rows) {
    const t = document.getElementById(tableId);
    if (!t) return;
    let h = t.querySelector('thead');
    if (!h) { h=document.createElement('thead'); t.prepend(h); }
    h.innerHTML = '<tr>' + headers.map(c=>`<th>${c}</th>`).join('') + '</tr>';
    let b = t.querySelector('tbody');
    if (!b) { b=document.createElement('tbody'); t.appendChild(b); }
    b.innerHTML = rows.map(r =>
      `<tr class="${r.hl?'hl-row':r.upd?'upd-row':''}">`+
      r.cells.map(c=>`<td class="${c.cls??''}">${c.v}</td>`).join('')+
      '</tr>'
    ).join('');
  },

  setDesc(html) {
    const el = document.getElementById('step-desc');
    if (el) el.innerHTML = html;
  },
};

/* ════════════════════════════════════════════════════════════
   VizMatrix — Floyd-Warshall / matrix animations
   ════════════════════════════════════════════════════════════ */
const VizMatrix = {
  render(containerId, labels, matrix, hlCells = [], updCells = []) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const n = labels.length;
    const hlSet  = new Set(hlCells.map(([r,c])=>`${r},${c}`));
    const updSet = new Set(updCells.map(([r,c])=>`${r},${c}`));
    let html = '<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th>';
    labels.forEach(l => html += `<th>${l}</th>`);
    html += '</tr></thead><tbody>';
    for (let i=0; i<n; i++) {
      html += `<tr><th>${labels[i]}</th>`;
      for (let j=0; j<n; j++) {
        const v = matrix[i][j];
        const key = `${i},${j}`;
        let cls = i===j ? 'm-diag' : v>=INF ? 'm-inf' : '';
        if (updSet.has(key)) cls = 'm-upd';
        else if (hlSet.has(key)) cls = 'm-hl';
        html += `<td class="${cls}">${v>=INF ? '∞' : v}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    el.innerHTML = html;
  },
};

/* ════════════════════════════════════════════════════════════
   Standard HTML controls snippet — call from each page
   ════════════════════════════════════════════════════════════ */
function buildStdControls(containerId = 'controls') {
  const el = document.getElementById(containerId);
  if (!el || el.dataset.built) return;
  el.dataset.built = '1';
  el.innerHTML = `
    <button class="btn primary" id="btn-run">▶ Запустить</button>
    <div class="sep"></div>
    <button class="btn" id="btn-play" disabled>⏵ Play</button>
    <button class="btn" id="btn-pause" disabled>⏸ Пауза</button>
    <button class="btn" id="btn-step" disabled>→ Шаг</button>
    <button class="btn" id="btn-back" disabled>← Назад</button>
    <button class="btn" id="btn-reset" disabled>↺ Сброс</button>
    <div class="sep"></div>
    <span class="ctrl-label">Скорость</span>
    <input type="range" id="speed" min="100" max="1000" value="450">
  `;
}

function buildDirectedToggle(containerId = 'controls') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'toggle-group';
  div.innerHTML = `
    <button class="toggle-btn active" id="btn-dir">Орент.</button>
    <button class="toggle-btn" id="btn-undir">Неорент.</button>
  `;
  el.appendChild(div);
  document.getElementById('btn-dir').addEventListener('click', () => {
    VizGraph.setDirected(true);
    document.getElementById('btn-dir').classList.add('active');
    document.getElementById('btn-undir').classList.remove('active');
  });
  document.getElementById('btn-undir').addEventListener('click', () => {
    VizGraph.setDirected(false);
    document.getElementById('btn-dir').classList.remove('active');
    document.getElementById('btn-undir').classList.add('active');
  });
}

/* ════════════════════════════════════════════════════════════
   DSU — Disjoint Set Union (used by Kruskal)
   ════════════════════════════════════════════════════════════ */
class DSU {
  constructor(n) { this.p = Array.from({length:n},(_,i)=>i); this.r=new Array(n).fill(0); }
  find(x) { return this.p[x]===x ? x : (this.p[x]=this.find(this.p[x])); }
  union(a,b) { a=this.find(a); b=this.find(b); if(a===b)return false; if(this.r[a]<this.r[b])[a,b]=[b,a]; this.p[b]=a; if(this.r[a]===this.r[b])this.r[a]++; return true; }
  same(a,b) { return this.find(a)===this.find(b); }
}

/* ════════════════════════════════════════════════════════════
   MinHeap — priority queue (used by Prim, Dijkstra)
   ════════════════════════════════════════════════════════════ */
class MinHeap {
  constructor(cmp=(a,b)=>a[0]-b[0]) { this.h=[]; this.cmp=cmp; }
  push(v){ this.h.push(v); this._up(this.h.length-1); }
  pop(){ const top=this.h[0],last=this.h.pop(); if(this.h.length){this.h[0]=last;this._dn(0);}return top; }
  get size(){ return this.h.length; }
  _up(i){ while(i>0){ const p=(i-1)>>1; if(this.cmp(this.h[i],this.h[p])<0){[this.h[i],this.h[p]]=[this.h[p],this.h[i]];i=p;}else break;} }
  _dn(i){ const n=this.h.length; while(true){ let s=i,l=2*i+1,r=2*i+2; if(l<n&&this.cmp(this.h[l],this.h[s])<0)s=l; if(r<n&&this.cmp(this.h[r],this.h[s])<0)s=r; if(s===i)break; [this.h[i],this.h[s]]=[this.h[s],this.h[i]];i=s; } }
}
