document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:80,  y:220, label:'s' },
      { id:1, x:230, y:120 },
      { id:2, x:230, y:320 },
      { id:3, x:400, y:120 },
      { id:4, x:400, y:320 },
      { id:5, x:540, y:220, label:'t' },
    ],
    edges: [
      {s:0,t:1,w:5},{s:0,t:2,w:3},
      {s:1,t:3,w:6},{s:1,t:2,w:2},
      {s:2,t:4,w:4},{s:2,t:5,w:6},
      {s:3,t:4,w:-1},{s:3,t:5,w:1},
      {s:4,t:5,w:4},
    ],
  };

  VizGraph.init('viz-svg', { directed: true, weighted: true });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="cm">// Фаза 1: топологическая сортировка</span>' },
    { id:1, html:'topo = <span class="fn">topoSort</span>(G)' },
    { id:2, html:'<span class="cm">// Фаза 2: релаксация в топо-порядке</span>' },
    { id:3, html:'dist[src]=<span class="num">0</span>; dist[v]=∞' },
    { id:4, html:'<span class="kw">for</span> v <span class="kw">in</span> topo:' },
    { id:5, html:'  <span class="kw">for</span> (to, w) <span class="kw">in</span> adj[v]:' },
    { id:6, html:'    <span class="kw">if</span> dist[v]+w < dist[to]:' },
    { id:7, html:'      dist[to] = dist[v]+w' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => adj[e.s].push({ to: e.t, w: e.w || 0 }));

    const steps = [];

    // Phase 1: Topo sort
    const color = {};
    ids.forEach(id => color[id] = WHITE);
    const topo = [];

    function dfs(v) {
      color[v] = GRAY;
      for (const { to } of adj[v]) {
        if (color[to] === WHITE) dfs(to);
      }
      color[v] = BLACK;
      topo.unshift(v);
    }

    for (const id of ids) {
      if (color[id] === WHITE) dfs(id);
    }

    const topoNs = {};
    ids.forEach(id => { topoNs[id] = 's-gray'; });
    steps.push({ line:[0,1], phase:1, nodeStates:{...topoNs}, edgeSnap:{}, topo:[...topo],
      dist: Object.fromEntries(ids.map(id=>[id,INF])),
      desc:`Топологический порядок: ${topo.join(' → ')}` });

    // Phase 2: Relaxation
    const dist = {};
    ids.forEach(id => dist[id] = INF);
    dist[ids[0]] = 0;
    const edgeSnap = {};

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (dist[id] < INF) m[id] = 's-black';
      });
      return m;
    }

    steps.push({ line:[2,3], phase:2, nodeStates:ns(), edgeSnap:{...edgeSnap}, topo:[...topo],
      dist:{...dist}, desc:`Инициализация: dist[${ids[0]}]=0, остальные ∞` });

    for (const v of topo) {
      steps.push({ line:[4], phase:2, nodeStates:{...ns(), [v]:'s-active'}, edgeSnap:{...edgeSnap},
        topo:[...topo], dist:{...dist},
        desc:`Обрабатываем вершину <b>${nodes.find(n=>n.id===v)?.label??v}</b> в топо-порядке` });

      for (const { to, w } of adj[v]) {
        steps.push({ line:[5,6], phase:2, nodeStates:{...ns(), [v]:'s-active'}, edgeSnap:{...edgeSnap, [`${v}-${to}`]:'active'},
          topo:[...topo], dist:{...dist},
          desc:`Ребро <b>${v}→${to}</b> (вес ${w}), dist[${to}]=${dist[to]===INF?'∞':dist[to]}` });

        if (dist[v] < INF && dist[v] + w < dist[to]) {
          dist[to] = dist[v] + w;
          edgeSnap[`${v}-${to}`] = 'tree';
          steps.push({ line:[7], phase:2, nodeStates:ns(), edgeSnap:{...edgeSnap},
            topo:[...topo], dist:{...dist},
            desc:`<span class="ok">Релаксация:</span> dist[<b>${to}</b>] = ${dist[to]}` });
        }
      }
    }

    steps.push({ line:[], phase:2, nodeStates:ns(), edgeSnap:{...edgeSnap}, topo:[...topo],
      dist:{...dist}, desc:'Кратчайшие пути в DAG найдены.' });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      n.sub = step.dist[n.id] === INF ? '∞' : String(step.dist[n.id]);
    });
    edges.forEach(e => { e.type = step.edgeSnap[`${e.s}-${e.t}`] || 'default'; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('chips-phase').innerHTML = `<span class="chip c-accent">Фаза ${step.phase}</span>`;
    document.getElementById('chips-topo').innerHTML = (step.topo||[]).map(id=>`<span class="chip c-gray">${nodes.find(n=>n.id===id)?.label??id}</span>`).join('') || '—';
    document.getElementById('dist-tbody').innerHTML = nodes.map(n => {
      const d = step.dist[n.id];
      return `<tr><td>${n.label??n.id}</td><td class="${d===INF?'inf':'v'}">${d===INF?'∞':d}</td></tr>`;
    }).join('');
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const initDist = Object.fromEntries(nodes.map((n,i) => [n.id, i===0?0:INF]));
    const steps = buildSteps();
    VizAnim.init([
      { line:[], phase:1, nodeStates:{}, edgeSnap:{}, topo:[], dist:initDist, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
