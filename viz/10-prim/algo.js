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
    { id:0, html:'key[0]=<span class="num">0</span>; key[v]=∞ <span class="kw">for</span> v≠0' },
    { id:1, html:'pq = MinHeap; pq.push([<span class="num">0</span>, 0])' },
    { id:2, html:'<span class="kw">while</span> pq <span class="kw">not empty</span>:' },
    { id:3, html:'  [w, v] = pq.pop()' },
    { id:4, html:'  <span class="kw">if</span> inMST[v]: <span class="kw">continue</span>' },
    { id:5, html:'  inMST[v] = <span class="kw">true</span>' },
    { id:6, html:'  <span class="kw">for</span> [to, ew] <span class="kw">in</span> adj[v]:' },
    { id:7, html:'    <span class="kw">if</span> !inMST[to] && ew < key[to]:' },
    { id:8, html:'      key[to] = ew; pq.push([ew, to])' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => {
      adj[e.s].push({ to: e.t, w: e.w||1 });
      adj[e.t].push({ to: e.s, w: e.w||1 });
    });

    const key = {};
    const inMST = {};
    const parent = {};
    ids.forEach(id => { key[id] = INF; inMST[id] = false; parent[id] = -1; });
    key[ids[0]] = 0;

    const pq = new MinHeap();
    pq.push([0, ids[0]]);
    let mstW = 0;
    const mstSet = new Set();
    const edgeSnap = {};
    const steps = [];

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (inMST[id]) m[id] = 's-black';
        else if (key[id] < INF) m[id] = 's-blue';
      });
      return m;
    }

    steps.push({ line:[0,1], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
      desc:`Инициализация: key[${ids[0]}]=0, остальные key=∞` });

    while (pq.size > 0) {
      const [w, v] = pq.pop();
      if (inMST[v]) {
        steps.push({ line:[4], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
          desc:`Вершина <b>${v}</b> уже в MST, пропускаем` });
        continue;
      }

      inMST[v] = true;
      mstSet.add(v);
      if (parent[v] !== -1) {
        mstW += w;
        edgeSnap[`${parent[v]}-${v}`] = 'mst';
        edgeSnap[`${v}-${parent[v]}`] = 'mst';
      }

      steps.push({ line:[3,4,5], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
        desc:`Добавляем <b>${v}</b> в MST (key=${w}), вес MST = ${mstW}` });

      for (const { to, w: ew } of adj[v]) {
        if (!inMST[to]) {
          steps.push({ line:[6,7], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
            desc:`Проверяем ребро <b>${v}-${to}</b> (вес ${ew}), key[${to}]=${key[to]===INF?'∞':key[to]}` });
          if (ew < key[to]) {
            key[to] = ew;
            parent[to] = v;
            pq.push([ew, to]);
            steps.push({ line:[8], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
              desc:`Обновляем key[<b>${to}</b>] = ${ew}, добавляем в PQ` });
          }
        }
      }
    }

    steps.push({ line:[], nodeStates:ns(), edgeSnap:{...edgeSnap}, mstW, key:{...key}, inMST:{...inMST},
      desc:`MST построено. Итоговый вес: <b>${mstW}</b>` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    edges.forEach(e => {
      e.type = step.edgeSnap[`${e.s}-${e.t}`] || step.edgeSnap[`${e.t}-${e.s}`] || 'default';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('mst-weight').textContent = step.mstW ?? 0;
    const mstChips = nodes.filter(n=>step.inMST[n.id]).map(n=>`<span class="chip c-black">${n.id}</span>`).join('') || '—';
    document.getElementById('chips-mst').innerHTML = mstChips;

    document.getElementById('key-tbody').innerHTML = nodes.map(n => {
      const k = step.key[n.id];
      const inM = step.inMST[n.id];
      return `<tr class="${inM?'upd-row':''}"><td>${n.label??n.id}</td>
        <td class="${k===INF?'inf':'v'}">${k===INF?'∞':k}</td>
        <td>${inM?'<span class="ok">✓</span>':'—'}</td></tr>`;
    }).join('');
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, mstW:0, key:{}, inMST:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
