document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:120, y:200 },
      { id:1, x:280, y:100 },
      { id:2, x:440, y:100 },
      { id:3, x:280, y:320 },
      { id:4, x:440, y:320 },
      { id:5, x:580, y:200 },
    ],
    edges: [
      {s:0,t:1,w:7},{s:0,t:3,w:9},
      {s:1,t:2,w:10},{s:1,t:3,w:2},
      {s:2,t:5,w:4},
      {s:3,t:4,w:11},
      {s:4,t:2,w:6},{s:4,t:5,w:5},
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
    { id:0, html:'dist[src]=<span class="num">0</span>; pq.push([<span class="num">0</span>,src])' },
    { id:1, html:'<span class="kw">while</span> pq <span class="kw">not empty</span>:' },
    { id:2, html:'  [d, v] = pq.pop()' },
    { id:3, html:'  <span class="kw">if</span> d > dist[v]: <span class="kw">continue</span>' },
    { id:4, html:'  <span class="kw">for</span> (to, w) <span class="kw">in</span> adj[v]:' },
    { id:5, html:'    nd = dist[v] + w' },
    { id:6, html:'    <span class="kw">if</span> nd < dist[to]:' },
    { id:7, html:'      dist[to] = nd; pq.push([nd, to])' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => adj[e.s].push({ to: e.t, w: e.w || 1 }));

    const dist = {};
    const settled = new Set();
    ids.forEach(id => dist[id] = INF);
    dist[ids[0]] = 0;

    const pq = new MinHeap();
    pq.push([0, ids[0]]);
    const edgeSnap = {};
    const steps = [];

    function pqSnap() { return pq.h.map(([d,v]) => [d,v]); }

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (settled.has(id)) m[id] = 's-black';
        else if (dist[id] < INF) m[id] = 's-blue';
      });
      return m;
    }

    steps.push({ line:[0], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:pqSnap(),
      desc:`Инициализация: dist[${ids[0]}]=0` });

    while (pq.size > 0) {
      const [d, v] = pq.pop();
      steps.push({ line:[1,2], nodeStates:{...ns(), [v]:'s-active'}, edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:pqSnap(),
        desc:`Извлекаем из PQ: вершина <b>${v}</b>, d=${d}` });

      if (d > dist[v]) {
        steps.push({ line:[3], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:pqSnap(),
          desc:`d=${d} > dist[${v}]=${dist[v]}, пропускаем (устаревшая запись)` });
        continue;
      }

      settled.add(v);
      steps.push({ line:[2,3], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:pqSnap(),
        desc:`Вершина <b>${v}</b> settled (dist=${d})` });

      for (const { to, w } of adj[v]) {
        const nd = dist[v] + w;
        steps.push({ line:[4,5,6], nodeStates:{...ns(),[v]:'s-active'}, edgeSnap:{...edgeSnap, [`${v}-${to}`]:'active'}, dist:{...dist}, pqList:pqSnap(),
          desc:`Ребро <b>${v}→${to}</b> (${w}): nd=${nd} vs dist[${to}]=${dist[to]===INF?'∞':dist[to]}` });

        if (nd < dist[to]) {
          dist[to] = nd;
          pq.push([nd, to]);
          edgeSnap[`${v}-${to}`] = 'tree';
          steps.push({ line:[7], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:pqSnap(),
            desc:`<span class="ok">Релаксация:</span> dist[<b>${to}</b>] = ${nd}` });
        }
      }
    }

    steps.push({ line:[], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, pqList:[],
      desc:'Дейкстра завершён. Все кратчайшие пути найдены.' });
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

    document.getElementById('chips-settled').innerHTML =
      nodes.filter(n=>step.nodeStates[n.id]==='s-black').map(n=>`<span class="chip c-black">${n.id}</span>`).join('') || '—';

    document.getElementById('pq-display').innerHTML =
      (step.pqList||[]).sort((a,b)=>a[0]-b[0]).slice(0,5).map(([d,v])=>`<span class="chip c-blue">${v}:${d}</span>`).join('') || '—';

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
      { line:[], nodeStates:{}, edgeSnap:{}, dist:initDist, pqList:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
