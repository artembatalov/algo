document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:80,  y:220, label:'S' },
      { id:1, x:240, y:120 },
      { id:2, x:240, y:320 },
      { id:3, x:400, y:120 },
      { id:4, x:400, y:320 },
      { id:5, x:560, y:220, label:'T' },
    ],
    edges: [
      {s:0,t:1,w:10},{s:0,t:2,w:10},
      {s:1,t:2,w:2},{s:1,t:3,w:4},{s:1,t:4,w:8},
      {s:2,t:4,w:9},
      {s:3,t:5,w:10},
      {s:4,t:3,w:6},{s:4,t:5,w:10},
    ],
  };

  VizGraph.init('viz-svg', { directed: true, weighted: true });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="kw">while</span> <span class="fn">bfs</span>(S, T, parent):' },
    { id:1, html:'  path = <span class="fn">reconstructPath</span>(parent)' },
    { id:2, html:'  bn = <span class="fn">min</span>(cap-flow on path)' },
    { id:3, html:'  <span class="kw">for</span> (u,v) <span class="kw">in</span> path:' },
    { id:4, html:'    flow[u][v] += bn' },
    { id:5, html:'    flow[v][u] -= bn  <span class="cm">// обратное ребро</span>' },
    { id:6, html:'  totalFlow += bn' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const S = ids[0], T = ids[ids.length - 1];

    // Build capacity matrix
    const cap = {};
    ids.forEach(u => { cap[u] = {}; ids.forEach(v => cap[u][v] = 0); });
    edges.forEach(e => { cap[e.s][e.t] = e.w || 1; });

    const flow = {};
    ids.forEach(u => { flow[u] = {}; ids.forEach(v => flow[u][v] = 0); });

    const adj = {};
    ids.forEach(id => adj[id] = new Set());
    edges.forEach(e => { adj[e.s].add(e.t); adj[e.t].add(e.s); });

    let totalFlow = 0;
    const steps = [];

    function edgeLabel(u, v) {
      return `${flow[u][v]}/${cap[u][v]}`;
    }

    function edgeSnap(pathSet) {
      const snap = {};
      ids.forEach(u => {
        ids.forEach(v => {
          if (flow[u][v] > 0) snap[`${u}-${v}`] = 'flow';
        });
      });
      if (pathSet) {
        pathSet.forEach(([u,v]) => { snap[`${u}-${v}`] = 'active'; });
      }
      return snap;
    }

    function updateEdgeWeights(pathSet) {
      const edgs = VizGraph.getEdges();
      edgs.forEach(e => {
        e.label = `${flow[e.s][e.t]}/${cap[e.s][e.t]}`;
      });
    }

    steps.push({ line:[], nodeStates:{[S]:'s-gray',[T]:'s-black'}, edgeSnap:{}, totalFlow:0, path:[], bn:null,
      desc:`Граф загружен. Источник S=${S}, Сток T=${T}. Ищем увеличивающие пути.` });

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

    let iteration = 0;
    while (true) {
      iteration++;
      steps.push({ line:[0], nodeStates:{[S]:'s-gray',[T]:'s-black'}, edgeSnap:edgeSnap(null), totalFlow, path:[], bn:null,
        desc:`Итерация ${iteration}: BFS поиск пути S→T` });

      const parent = bfs();
      if (!parent) {
        steps.push({ line:[], nodeStates:{[S]:'s-gray',[T]:'s-black'}, edgeSnap:edgeSnap(null), totalFlow, path:[], bn:null,
          desc:`<span class="ok">Увеличивающих путей нет!</span> Максимальный поток = <b>${totalFlow}</b>` });
        break;
      }

      // Reconstruct path
      const path = [];
      let cur = T;
      while (cur !== S) {
        path.unshift([parent[cur], cur]);
        cur = parent[cur];
      }

      const pathIds = [S, ...path.map(([,v]) => v)];
      const bn = Math.min(...path.map(([u,v]) => cap[u][v] - flow[u][v]));

      steps.push({ line:[1,2], nodeStates:{[S]:'s-gray',[T]:'s-black'}, edgeSnap:edgeSnap(path), totalFlow, path:pathIds, bn,
        desc:`Путь найден: ${pathIds.join('→')}, bottleneck=${bn}` });

      path.forEach(([u, v]) => {
        flow[u][v] += bn;
        flow[v][u] -= bn;
      });
      totalFlow += bn;

      steps.push({ line:[3,4,5,6], nodeStates:{[S]:'s-gray',[T]:'s-black'}, edgeSnap:edgeSnap(null), totalFlow, path:pathIds, bn,
        desc:`Обновляем поток (+${bn}). Итоговый поток = <b>${totalFlow}</b>` });

      if (iteration > 20) break; // safety
    }

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
    document.getElementById('bottleneck').textContent = step.bn ?? '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, totalFlow:0, path:[], bn:null, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
