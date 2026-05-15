document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:160, y:130 },
      { id:1, x:360, y:80  },
      { id:2, x:520, y:220 },
      { id:3, x:360, y:360 },
      { id:4, x:160, y:310 },
    ],
    edges: [
      {s:0,t:1,w:3},{s:0,t:4,w:8},
      {s:1,t:2,w:1},{s:1,t:3,w:4},
      {s:2,t:0,w:2},
      {s:3,t:2,w:-5},
      {s:4,t:1,w:1},{s:4,t:3,w:7},
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
    { id:0, html:'<span class="cm">// Инициализация матрицы</span>' },
    { id:1, html:'d[i][i]=<span class="num">0</span>; d[i][j]=weight(i,j) or ∞' },
    { id:2, html:'<span class="kw">for</span> k <span class="kw">in</span> [<span class="num">0</span>..n-<span class="num">1</span>]:' },
    { id:3, html:'  <span class="kw">for</span> i <span class="kw">in</span> [<span class="num">0</span>..n-<span class="num">1</span>]:' },
    { id:4, html:'    <span class="kw">for</span> j <span class="kw">in</span> [<span class="num">0</span>..n-<span class="num">1</span>]:' },
    { id:5, html:'      nd = d[i][k] + d[k][j]' },
    { id:6, html:'      <span class="kw">if</span> nd < d[i][j]:' },
    { id:7, html:'        d[i][j] = nd' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const n = nodes.length;
    const ids = nodes.map(nd => nd.id);
    const labels = ids.map(id => nodes.find(n=>n.id===id)?.label ?? String(id));

    // Init matrix
    const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i===j ? 0 : INF));
    edges.forEach(e => {
      const si = ids.indexOf(e.s), ti = ids.indexOf(e.t);
      if (si >= 0 && ti >= 0) d[si][ti] = e.w ?? 1;
    });

    const steps = [];

    function matSnap() { return d.map(row => [...row]); }

    steps.push({ line:[0,1], nodeStates:{}, mat: matSnap(), hl:[], upd:[], k:-1,
      desc:'Инициализация матрицы расстояний' });

    for (let k = 0; k < n; k++) {
      const nsK = { [ids[k]]: 's-gray' };
      steps.push({ line:[2], nodeStates:nsK, mat:matSnap(), hl:[], upd:[], k,
        desc:`Промежуточная вершина k = <b>${labels[k]}</b> (${k})` });

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === k || j === k) continue;
          const hl = [[i,k],[k,j],[i,j]];
          steps.push({ line:[3,4,5,6], nodeStates:nsK, mat:matSnap(), hl, upd:[], k,
            desc:`d[${labels[i]}][${labels[j]}] = ${d[i][j]===INF?'∞':d[i][j]}, через k=${labels[k]}: ${d[i][k]===INF||d[k][j]===INF?'∞':d[i][k]+d[k][j]}` });

          if (d[i][k] < INF && d[k][j] < INF && d[i][k] + d[k][j] < d[i][j]) {
            d[i][j] = d[i][k] + d[k][j];
            steps.push({ line:[7], nodeStates:nsK, mat:matSnap(), hl:[], upd:[[i,j]], k,
              desc:`<span class="ok">Обновление:</span> d[${labels[i]}][${labels[j]}] = ${d[i][j]}` });
          }
        }
      }
    }

    steps.push({ line:[], nodeStates:{}, mat:matSnap(), hl:[], upd:[], k:-1,
      desc:'Флойд-Уоршелл завершён.' });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    const labels = nodes.map(n => n.label ?? String(n.id));
    VizMatrix.render('matrix-container', labels, step.mat || [], step.hl || [], step.upd || []);
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const n = nodes.length;
    const initMat = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => i===j?0:INF));
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, mat:initMat, hl:[], upd:[], k:-1, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
