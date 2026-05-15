document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:120, y:200 },
      { id:1, x:280, y:100 },
      { id:2, x:440, y:100 },
      { id:3, x:280, y:320 },
      { id:4, x:440, y:320 },
    ],
    edges: [
      {s:0,t:1,w:6},{s:0,t:3,w:7},
      {s:1,t:2,w:5},{s:1,t:3,w:8},{s:1,t:4,w:-4},
      {s:2,t:1,w:-2},
      {s:3,t:4,w:9},{s:3,t:2,w:-3},
      {s:4,t:0,w:2},{s:4,t:2,w:7},
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
    { id:0, html:'dist[src]=<span class="num">0</span>; dist[v]=∞ <span class="kw">for</span> v≠src' },
    { id:1, html:'<span class="kw">for</span> i <span class="kw">in</span> [<span class="num">1</span>..n-<span class="num">1</span>]:' },
    { id:2, html:'  <span class="kw">for</span> (u,v,w) <span class="kw">in</span> edges:' },
    { id:3, html:'    <span class="kw">if</span> dist[u]+w < dist[v]:' },
    { id:4, html:'      dist[v] = dist[u]+w  <span class="cm">// релакс</span>' },
    { id:5, html:'<span class="cm">// Проверка отрицательного цикла</span>' },
    { id:6, html:'<span class="kw">for</span> (u,v,w) <span class="kw">in</span> edges:' },
    { id:7, html:'  <span class="kw">if</span> dist[u]+w < dist[v]: <span class="cm">// neg cycle!</span>' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const n = ids.length;
    const src = ids[0];

    const dist = {};
    ids.forEach(id => dist[id] = INF);
    dist[src] = 0;

    const steps = [];
    const edgeSnap = {};
    let negCycle = false;

    function ns(hl) {
      const m = {};
      if (hl) m[hl] = 's-active';
      ids.forEach(id => { if (dist[id] < INF && id !== hl) m[id] = 's-black'; });
      return m;
    }

    steps.push({ line:[0], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist},
      desc:`Инициализация: dist[${src}]=0, остальные dist=∞` });

    for (let iter = 1; iter <= n - 1; iter++) {
      steps.push({ line:[1], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist},
        desc:`Итерация ${iter} из ${n-1}` });

      for (const e of edges) {
        const { s, t, w } = e;
        steps.push({ line:[2,3], nodeStates:ns(s), edgeSnap:{...edgeSnap, [`${s}-${t}`]: 'active'}, dist:{...dist},
          desc:`Ребро <b>${s}→${t}</b> (вес ${w}): dist[${s}]=${dist[s]===INF?'∞':dist[s]}, dist[${t}]=${dist[t]===INF?'∞':dist[t]}` });

        if (dist[s] < INF && dist[s] + (w||0) < dist[t]) {
          dist[t] = dist[s] + (w||0);
          edgeSnap[`${s}-${t}`] = 'tree';
          steps.push({ line:[4], nodeStates:ns(t), edgeSnap:{...edgeSnap}, dist:{...dist},
            desc:`<span class="ok">Релаксация!</span> dist[<b>${t}</b>] = ${dist[t]}` });
        }
      }
    }

    // Check negative cycle
    steps.push({ line:[5,6], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist},
      desc:'Проверяем наличие отрицательного цикла...' });

    for (const e of edges) {
      const { s, t, w } = e;
      if (dist[s] < INF && dist[s] + (w||0) < dist[t]) {
        negCycle = true;
        steps.push({ line:[7], nodeStates:{ [s]:'s-red', [t]:'s-red' }, edgeSnap:{...edgeSnap, [`${s}-${t}`]:'back'}, dist:{...dist},
          desc:`<span class="warn">Отрицательный цикл!</span> Ребро ${s}→${t}` });
      }
    }

    if (!negCycle) {
      steps.push({ line:[], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist},
        desc:'<span class="ok">Отрицательных циклов нет.</span> Кратчайшие пути найдены.' });
    }

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

    const nodes2 = VizGraph.getNodes();
    document.getElementById('dist-tbody').innerHTML = nodes2.map(n => {
      const d = step.dist[n.id];
      return `<tr><td>${n.label??n.id}</td><td class="${d===INF?'inf':'v'}">${d===INF?'∞':d}</td></tr>`;
    }).join('');
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const initDist = Object.fromEntries(nodes.map((n,i) => [n.id, i===0?0:INF]));
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, dist:initDist, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
