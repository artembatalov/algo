document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  // Bipartite: L = [0,1,2], R = [3,4,5] (ids 0-2 left, 3-5 right)
  const DEFAULT = {
    nodes: [
      { id:0, x:150, y:120, label:'L0' },
      { id:1, x:150, y:240, label:'L1' },
      { id:2, x:150, y:360, label:'L2' },
      { id:3, x:460, y:120, label:'R0' },
      { id:4, x:460, y:240, label:'R1' },
      { id:5, x:460, y:360, label:'R2' },
    ],
    edges: [
      {s:0,t:3},{s:0,t:4},
      {s:1,t:3},{s:1,t:5},
      {s:2,t:4},{s:2,t:5},
    ],
    left: [0,1,2],
    right: [3,4,5],
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
    { id:0, html:'matchR[v] = -<span class="num">1</span> <span class="kw">for</span> v <span class="kw">in</span> R' },
    { id:1, html:'<span class="kw">for</span> u <span class="kw">in</span> L: <span class="fn">tryKuhn</span>(u)' },
    { id:2, html:'' },
    { id:3, html:'<span class="kw">function</span> <span class="fn">tryKuhn</span>(u):' },
    { id:4, html:'  <span class="kw">for</span> v <span class="kw">in</span> adj[u]:' },
    { id:5, html:'    <span class="kw">if</span> !used[v]:' },
    { id:6, html:'      used[v] = <span class="kw">true</span>' },
    { id:7, html:'      <span class="kw">if</span> matchR[v]==-<span class="num">1</span> or <span class="fn">tryKuhn</span>(matchR[v]):' },
    { id:8, html:'        matchR[v]=u; <span class="kw">return true</span>' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    // Determine left/right by x position
    const xs = nodes.map(n => n.x);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const left = nodes.filter(n => n.x < midX).map(n => n.id);
    const right = nodes.filter(n => n.x >= midX).map(n => n.id);

    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const matchR = {};
    right.forEach(id => matchR[id] = -1);

    const steps = [];

    function ns(active, used) {
      const m = {};
      left.forEach(id => m[id] = 's-blue');
      right.forEach(id => m[id] = 's-purple');
      if (active != null) m[active] = 's-active';
      return m;
    }

    function edgeSnap(matchR) {
      const snap = {};
      Object.entries(matchR).forEach(([r, l]) => {
        if (l !== -1) {
          snap[`${l}-${r}`] = 'mst';
          snap[`${r}-${l}`] = 'mst';
        }
      });
      return snap;
    }

    steps.push({ line:[0,1], nodeStates:ns(null,{}), edgeSnap:edgeSnap(matchR), matchR:{...matchR},
      desc:'Инициализация: matchR[v]=-1 для всех R' });

    function tryKuhn(u, used) {
      for (const v of adj[u]) {
        if (!right.includes(v)) continue;
        if (used[v]) continue;
        used[v] = true;

        steps.push({ line:[4,5,6,7], nodeStates:ns(u, used), edgeSnap:{...edgeSnap(matchR), [`${u}-${v}`]:'active', [`${v}-${u}`]:'active'}, matchR:{...matchR},
          desc:`tryKuhn(${u}): пробуем ребро <b>${u}-${v}</b>, matchR[${v}]=${matchR[v]}` });

        if (matchR[v] === -1 || tryKuhn(matchR[v], used)) {
          matchR[v] = u;
          steps.push({ line:[8], nodeStates:ns(u,used), edgeSnap:edgeSnap(matchR), matchR:{...matchR},
            desc:`<span class="ok">Успех!</span> matchR[${v}] = ${u}` });
          return true;
        }
      }
      return false;
    }

    for (const u of left) {
      const used = {};
      steps.push({ line:[1], nodeStates:ns(u,{}), edgeSnap:edgeSnap(matchR), matchR:{...matchR},
        desc:`Обрабатываем левую вершину <b>${u}</b>` });
      tryKuhn(u, used);
    }

    const matchCount = Object.values(matchR).filter(v => v !== -1).length;
    steps.push({ line:[], nodeStates:ns(null,{}), edgeSnap:edgeSnap(matchR), matchR:{...matchR},
      desc:`Паросочетание найдено. Размер: <b>${matchCount}</b>` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    edges.forEach(e => { e.type = step.edgeSnap[`${e.s}-${e.t}`] || step.edgeSnap[`${e.t}-${e.s}`] || 'default'; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    const matchR = step.matchR || {};
    const matchCount = Object.values(matchR).filter(v => v !== -1).length;
    document.getElementById('match-size').textContent = matchCount;
    const matchDisplay = Object.entries(matchR).filter(([r,l])=>l!==-1).map(([r,l])=>
      `<span class="chip c-black">${l}–${r}</span>`).join('') || '—';
    document.getElementById('matching-display').innerHTML = matchDisplay;
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, matchR:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
