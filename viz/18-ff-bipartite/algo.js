document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  // S=0, L=[1,2,3], R=[4,5,6], T=7
  const DEFAULT = {
    nodes: [
      { id:0, x:60,  y:240, label:'S' },
      { id:1, x:200, y:120, label:'L0' },
      { id:2, x:200, y:240, label:'L1' },
      { id:3, x:200, y:360, label:'L2' },
      { id:4, x:440, y:120, label:'R0' },
      { id:5, x:440, y:240, label:'R1' },
      { id:6, x:440, y:360, label:'R2' },
      { id:7, x:580, y:240, label:'T' },
    ],
    edges: [
      // S → L
      {s:0,t:1,w:1},{s:0,t:2,w:1},{s:0,t:3,w:1},
      // L → R (bipartite edges)
      {s:1,t:4,w:1},{s:1,t:5,w:1},
      {s:2,t:4,w:1},{s:2,t:6,w:1},
      {s:3,t:5,w:1},{s:3,t:6,w:1},
      // R → T
      {s:4,t:7,w:1},{s:5,t:7,w:1},{s:6,t:7,w:1},
    ],
  };

  VizGraph.init('viz-svg', { directed: true, weighted: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="cm">// Сводим к потоку:</span>' },
    { id:1, html:'S → L_i (cap=1), R_j → T (cap=1)' },
    { id:2, html:'L_i → R_j (cap=1) для каждого ребра' },
    { id:3, html:'' },
    { id:4, html:'totalFlow = <span class="fn">EdmondsKarp</span>(S, T)' },
    { id:5, html:'<span class="cm">// totalFlow = max matching</span>' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const S = ids[0], T = ids[ids.length - 1];

    // Determine left/right groups
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const Lverts = nodes.filter(n => n.x > nodeMap[S].x && n.x < nodeMap[T].x && n.x < (nodeMap[S].x + nodeMap[T].x)/2).map(n=>n.id);
    const Rverts = nodes.filter(n => n.x > (nodeMap[S].x + nodeMap[T].x)/2 && n.id !== T).map(n=>n.id);

    const cap = {};
    ids.forEach(u => { cap[u] = {}; ids.forEach(v => cap[u][v] = 0); });
    edges.forEach(e => cap[e.s][e.t] = e.w || 1);

    const flow = {};
    ids.forEach(u => { flow[u] = {}; ids.forEach(v => flow[u][v] = 0); });

    const adj = {};
    ids.forEach(id => adj[id] = new Set());
    edges.forEach(e => { adj[e.s].add(e.t); adj[e.t].add(e.s); });

    let totalFlow = 0;
    const steps = [];

    function ns(pathSet) {
      const m = {};
      m[S] = 's-gray'; m[T] = 's-black';
      Lverts.forEach(id => m[id] = 's-blue');
      Rverts.forEach(id => m[id] = 's-purple');
      return m;
    }

    function edgeSnap(pathEdges) {
      const snap = {};
      ids.forEach(u => ids.forEach(v => { if (flow[u][v] > 0) snap[`${u}-${v}`] = 'flow'; }));
      if (pathEdges) pathEdges.forEach(([u,v]) => { snap[`${u}-${v}`] = 'active'; });
      return snap;
    }

    steps.push({ line:[0,1,2,3,4], nodeStates:ns(), edgeSnap:edgeSnap(), totalFlow:0, path:[],
      desc:'Граф построен. Запускаем Эдмондс-Карп.' });

    function bfs() {
      const parent = {};
      ids.forEach(id => parent[id] = -1);
      parent[S] = S;
      const queue = [S];
      while (queue.length > 0) {
        const v = queue.shift();
        for (const to of adj[v]) {
          if (parent[to] === -1 && cap[v][to] - flow[v][to] > 0) {
            parent[to] = v;
            if (to === T) return parent;
            queue.push(to);
          }
        }
      }
      return null;
    }

    let iter = 0;
    while (iter++ < 20) {
      const parent = bfs();
      if (!parent) break;

      const path = [];
      let cur = T;
      while (cur !== S) { path.unshift([parent[cur], cur]); cur = parent[cur]; }
      const pathIds = [S, ...path.map(([,v])=>v)];
      const bn = Math.min(...path.map(([u,v]) => cap[u][v] - flow[u][v]));

      steps.push({ line:[4], nodeStates:ns(), edgeSnap:edgeSnap(path), totalFlow, path:pathIds,
        desc:`Путь: ${pathIds.join('→')}, bottleneck=${bn}` });

      path.forEach(([u,v]) => { flow[u][v] += bn; flow[v][u] -= bn; });
      totalFlow += bn;

      steps.push({ line:[4,5], nodeStates:ns(), edgeSnap:edgeSnap(), totalFlow, path:pathIds,
        desc:`Добавляем поток ${bn}. Всего поток = <b>${totalFlow}</b>` });
    }

    steps.push({ line:[], nodeStates:ns(), edgeSnap:edgeSnap(), totalFlow, path:[],
      desc:`Максимальное паросочетание = <b>${totalFlow}</b>` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    edges.forEach(e => { e.type = step.edgeSnap[`${e.s}-${e.t}`] || 'default'; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('total-flow').textContent = step.totalFlow ?? 0;
    document.getElementById('chips-path').innerHTML = (step.path||[]).map(id=>`<span class="chip c-accent">${id}</span>`).join('<span style="color:var(--muted)">→</span>') || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, totalFlow:0, path:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
