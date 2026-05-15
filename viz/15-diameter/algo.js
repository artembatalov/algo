document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:300, y:60  },
      { id:1, x:160, y:160 },
      { id:2, x:440, y:160 },
      { id:3, x:80,  y:280 },
      { id:4, x:240, y:280 },
      { id:5, x:380, y:280 },
      { id:6, x:520, y:280 },
      { id:7, x:40,  y:380 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},
      {s:1,t:3},{s:1,t:4},
      {s:2,t:5},{s:2,t:6},
      {s:3,t:7},
    ],
  };

  VizGraph.init('viz-svg', { directed: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="cm">// BFS 1: из любой вершины (0)</span>' },
    { id:1, html:'A = <span class="fn">farthest</span>(bfs(<span class="num">0</span>))' },
    { id:2, html:'<span class="cm">// BFS 2: из A</span>' },
    { id:3, html:'B = <span class="fn">farthest</span>(bfs(A))' },
    { id:4, html:'diameter = dist[B]' },
  ]);

  function bfsAll(src, adj) {
    const ids = Object.keys(adj).map(Number);
    const dist = {};
    ids.forEach(id => dist[id] = INF);
    dist[src] = 0;
    const queue = [src];
    const order = [];
    while (queue.length > 0) {
      const v = queue.shift();
      order.push(v);
      for (const to of adj[v]) {
        if (dist[to] === INF) {
          dist[to] = dist[v] + 1;
          queue.push(to);
        }
      }
    }
    return { dist, order };
  }

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const steps = [];

    // BFS 1 from node 0
    const src1 = ids[0];
    steps.push({ line:[0,1], phase:1, nodeStates:{}, edgeSnap:{}, dist:{}, A:null, B:null, diam:0,
      desc:`BFS 1: начинаем с вершины <b>${src1}</b>` });

    const { dist: dist1, order: order1 } = bfsAll(src1, adj);
    let A = src1;
    order1.forEach(v => { if (dist1[v] > dist1[A]) A = v; });

    // Animate BFS1
    const visited1 = new Set();
    const edgeSnap1 = {};
    for (const v of order1) {
      visited1.add(v);
      const ns = {};
      ids.forEach(id => {
        if (id === v) ns[id] = 's-active';
        else if (visited1.has(id)) ns[id] = 's-black';
        else if (dist1[id] < INF && !visited1.has(id)) ns[id] = 's-blue';
      });
      steps.push({ line:[1], phase:1, nodeStates:ns, edgeSnap:{...edgeSnap1}, dist:{...dist1}, A:null, B:null, diam:0,
        desc:`BFS1: обрабатываем <b>${v}</b> (dist=${dist1[v]})` });
    }

    const nsA = {};
    ids.forEach(id => nsA[id] = 's-black');
    nsA[A] = 's-gray';
    steps.push({ line:[1], phase:1, nodeStates:nsA, edgeSnap:{}, dist:{...dist1}, A, B:null, diam:0,
      desc:`BFS1 завершён. Дальняя вершина A = <b>${A}</b> (dist=${dist1[A]})` });

    // BFS 2 from A
    steps.push({ line:[2,3], phase:2, nodeStates:{[A]:'s-gray'}, edgeSnap:{}, dist:{}, A, B:null, diam:0,
      desc:`BFS 2: начинаем с <b>A=${A}</b>` });

    const { dist: dist2, order: order2 } = bfsAll(A, adj);
    let B = A;
    order2.forEach(v => { if (dist2[v] > dist2[B]) B = v; });

    const visited2 = new Set();
    const edgeSnap2 = {};
    for (const v of order2) {
      visited2.add(v);
      const ns = {};
      ns[A] = 's-gray';
      ids.forEach(id => {
        if (id === v && id !== A) ns[id] = 's-active';
        else if (visited2.has(id) && id !== A) ns[id] = 's-black';
        else if (dist2[id] < INF && !visited2.has(id)) ns[id] = 's-blue';
      });
      steps.push({ line:[3], phase:2, nodeStates:ns, edgeSnap:{...edgeSnap2}, dist:{...dist2}, A, B:null, diam:0,
        desc:`BFS2: обрабатываем <b>${v}</b> (dist=${dist2[v]})` });
    }

    // Highlight diameter path
    const pathEdge = {};
    // trace path from B back to A using dist2
    let cur = B;
    while (cur !== A) {
      for (const nb of adj[cur]) {
        if (dist2[nb] === dist2[cur] - 1) {
          pathEdge[`${cur}-${nb}`] = 'back';
          pathEdge[`${nb}-${cur}`] = 'back';
          cur = nb;
          break;
        }
      }
    }

    const nsFinal = {};
    ids.forEach(id => nsFinal[id] = 's-black');
    nsFinal[A] = 's-gray';
    nsFinal[B] = 's-gray';
    steps.push({ line:[3,4], phase:2, nodeStates:nsFinal, edgeSnap:pathEdge, dist:{...dist2}, A, B, diam:dist2[B],
      desc:`Диаметр дерева = <b>${dist2[B]}</b> (путь A=${A} → B=${B})` });

    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      n.sub = step.dist && step.dist[n.id] !== undefined && step.dist[n.id] < INF ? String(step.dist[n.id]) : '';
    });
    edges.forEach(e => {
      e.type = step.edgeSnap[`${e.s}-${e.t}`] || step.edgeSnap[`${e.t}-${e.s}`] || 'default';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('chips-phase').innerHTML = `<span class="chip c-accent">BFS ${step.phase}</span>`;
    document.getElementById('chips-a').innerHTML = step.A != null ? `<span class="chip c-gray">${step.A}</span>` : '—';
    document.getElementById('chips-b').innerHTML = step.B != null ? `<span class="chip c-gray">${step.B}</span>` : '—';
    document.getElementById('diam-val').textContent = step.diam || '?';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], phase:1, nodeStates:{}, edgeSnap:{}, dist:{}, A:null, B:null, diam:0, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
