document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:150, y:120 },
      { id:1, x:320, y:60  },
      { id:2, x:490, y:120 },
      { id:3, x:200, y:280 },
      { id:4, x:400, y:280 },
      { id:5, x:320, y:400 },
    ],
    edges: [
      {s:0,t:1,w:4},{s:0,t:3,w:2},
      {s:1,t:2,w:5},{s:1,t:3,w:1},{s:1,t:4,w:3},
      {s:2,t:4,w:6},
      {s:3,t:4,w:7},{s:3,t:5,w:8},
      {s:4,t:5,w:2},
    ],
  };

  VizGraph.init('viz-svg', { directed: false, weighted: true });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="fn">sort</span>(edges by weight)' },
    { id:1, html:'dsu = <span class="fn">DSU</span>(n)' },
    { id:2, html:'mstWeight = <span class="num">0</span>' },
    { id:3, html:'<span class="kw">for</span> (u, v, w) <span class="kw">in</span> edges:' },
    { id:4, html:'  <span class="kw">if</span> !dsu.<span class="fn">same</span>(u, v):' },
    { id:5, html:'    dsu.<span class="fn">union</span>(u, v)' },
    { id:6, html:'    mstWeight += w' },
    { id:7, html:'    mst.add((u, v, w))' },
    { id:8, html:'  <span class="kw">else</span>: <span class="cm">// цикл, пропускаем</span>' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const n = nodes.length;
    const ids = nodes.map(nd => nd.id);
    const idxMap = {};
    ids.forEach((id, i) => idxMap[id] = i);

    const sorted = [...edges].sort((a, b) => (a.w||0) - (b.w||0));
    const steps = [];
    const edgeSnap = {};
    let mstW = 0;
    const edgeStatus = sorted.map(() => '');

    steps.push({ line:[0,1,2], nodeStates:{}, edgeSnap:{...edgeSnap}, mstW, edgeStatus:[...edgeStatus], sortedEdges: sorted,
      desc:`Сортируем ${sorted.length} рёбер по весу` });

    const dsu = new DSU(n);

    sorted.forEach((e, si) => {
      const u = idxMap[e.s], v = idxMap[e.t];
      const curSnap = {...edgeSnap};
      curSnap[`${e.s}-${e.t}`] = 'active';
      curSnap[`${e.t}-${e.s}`] = 'active';

      steps.push({ line:[3,4], nodeStates:{}, edgeSnap:curSnap, mstW, edgeStatus:[...edgeStatus], sortedEdges: sorted,
        desc:`Рассматриваем ребро <b>${e.s}-${e.t}</b> (вес ${e.w}). DSU.same? ${dsu.same(u,v)}` });

      if (!dsu.same(u, v)) {
        dsu.union(u, v);
        mstW += (e.w||0);
        edgeSnap[`${e.s}-${e.t}`] = 'mst';
        edgeSnap[`${e.t}-${e.s}`] = 'mst';
        edgeStatus[si] = 'mst';
        steps.push({ line:[5,6,7], nodeStates:{}, edgeSnap:{...edgeSnap}, mstW, edgeStatus:[...edgeStatus], sortedEdges: sorted,
          desc:`<span class="ok">Добавляем</span> ребро <b>${e.s}-${e.t}</b> в MST. Вес MST = ${mstW}` });
      } else {
        edgeSnap[`${e.s}-${e.t}`] = 'rejected';
        edgeSnap[`${e.t}-${e.s}`] = 'rejected';
        edgeStatus[si] = 'rejected';
        steps.push({ line:[8], nodeStates:{}, edgeSnap:{...edgeSnap}, mstW, edgeStatus:[...edgeStatus], sortedEdges: sorted,
          desc:`<span class="warn">Пропускаем</span> ребро <b>${e.s}-${e.t}</b> — создаёт цикл` });
      }
    });

    steps.push({ line:[], nodeStates:{}, edgeSnap:{...edgeSnap}, mstW, edgeStatus:[...edgeStatus], sortedEdges: sorted,
      desc:`MST построено. Итоговый вес: <b>${mstW}</b>` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => { n.classes = []; });
    edges.forEach(e => {
      e.type = step.edgeSnap[`${e.s}-${e.t}`] || step.edgeSnap[`${e.t}-${e.s}`] || 'default';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('mst-weight').textContent = step.mstW ?? 0;

    const sorted = step.sortedEdges || [];
    document.getElementById('edges-tbody').innerHTML = sorted.map((e, i) => {
      const st = step.edgeStatus[i];
      let statusHtml = '—';
      if (st==='mst') statusHtml = '<span class="ok">MST</span>';
      else if (st==='rejected') statusHtml = '<span style="color:#ef4444">цикл</span>';
      return `<tr class="${st==='mst'?'upd-row':st==='rejected'?'hl-row':''}">
        <td>${e.s}-${e.t}</td><td class="v">${e.w}</td><td>${statusHtml}</td></tr>`;
    }).join('');
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, mstW:0, edgeStatus:[], sortedEdges:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
