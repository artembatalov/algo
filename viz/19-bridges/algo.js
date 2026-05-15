document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:160, y:200 },
      { id:1, x:300, y:100 },
      { id:2, x:300, y:300 },
      { id:3, x:440, y:200 },
      { id:4, x:560, y:100 },
      { id:5, x:560, y:300 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},{s:1,t:2}, // triangle 0-1-2
      {s:1,t:3},                       // bridge 1-3
      {s:3,t:4},{s:3,t:5},{s:4,t:5}, // triangle 3-4-5
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
    { id:0, html:'<span class="kw">function</span> <span class="fn">dfs</span>(v, p):' },
    { id:1, html:'  tin[v] = low[v] = timer++' },
    { id:2, html:'  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:3, html:'    <span class="kw">if</span> to == p: <span class="kw">continue</span>' },
    { id:4, html:'    <span class="kw">if</span> visited[to]: low[v]=<span class="fn">min</span>(low[v],tin[to])' },
    { id:5, html:'    <span class="kw">else</span>: <span class="fn">dfs</span>(to, v)' },
    { id:6, html:'          low[v]=<span class="fn">min</span>(low[v],low[to])' },
    { id:7, html:'          <span class="kw">if</span> low[to]>tin[v]: bridge!' },
    { id:8, html:'          <span class="kw">if</span> low[to]>=tin[v] and !root: ap!' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const visited = {}, tin = {}, low = {};
    let timer = 0;
    const bridges = [];
    const artPoints = new Set();
    const edgeSnap = {};
    const steps = [];

    function ns(active) {
      const m = {};
      ids.forEach(id => {
        if (artPoints.has(id)) m[id] = 's-red';
        else if (visited[id]) m[id] = 's-black';
      });
      if (active != null) m[active] = 's-gray';
      return m;
    }

    function dfs(v, parent) {
      visited[v] = true;
      tin[v] = low[v] = timer++;
      steps.push({ line:[0,1], nodeStates:ns(v), edgeSnap:{...edgeSnap},
        tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
        desc:`Входим в <b>${v}</b>, tin[${v}]=low[${v}]=${tin[v]}` });

      let childCount = 0;
      for (const to of adj[v]) {
        if (to === parent) continue;

        if (visited[to]) {
          if (low[v] > tin[to]) {
            low[v] = tin[to];
            steps.push({ line:[4], nodeStates:ns(v), edgeSnap:{...edgeSnap},
              tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
              desc:`Обратное ребро ${v}→${to}: low[${v}]=min(low[${v}],tin[${to}])=${low[v]}` });
          }
        } else {
          childCount++;
          dfs(to, v);

          if (low[v] > low[to]) {
            low[v] = low[to];
          }

          steps.push({ line:[6], nodeStates:ns(v), edgeSnap:{...edgeSnap},
            tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
            desc:`После dfs(${to}): low[${v}]=min(low[${v}],low[${to}])=${low[v]}` });

          if (low[to] > tin[v]) {
            bridges.push([v, to]);
            edgeSnap[`${v}-${to}`] = 'back';
            edgeSnap[`${to}-${v}`] = 'back';
            steps.push({ line:[7], nodeStates:ns(v), edgeSnap:{...edgeSnap},
              tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
              desc:`<span class="warn">МОСТ найден:</span> ребро <b>${v}-${to}</b>, low[${to}]=${low[to]} > tin[${v}]=${tin[v]}` });
          }

          if (parent !== -1 && low[to] >= tin[v]) {
            artPoints.add(v);
            steps.push({ line:[8], nodeStates:ns(v), edgeSnap:{...edgeSnap},
              tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
              desc:`<span class="warn">ТОЧКА СОЧЛЕНЕНИЯ:</span> вершина <b>${v}</b>, low[${to}]=${low[to]} >= tin[${v}]=${tin[v]}` });
          }
        }
      }

      // Root with 2+ children
      if (parent === -1 && childCount > 1) {
        artPoints.add(v);
      }
    }

    for (const id of ids) {
      if (!visited[id]) dfs(id, -1);
    }

    steps.push({ line:[], nodeStates:ns(null), edgeSnap:{...edgeSnap},
      tin:{...tin}, low:{...low}, bridges:[...bridges], artPoints:[...artPoints],
      desc:`Готово. Мостов: ${bridges.length}, Точек сочленения: ${artPoints.size}` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      if (step.tin[n.id] != null) {
        n.sub = `${step.tin[n.id]}/${step.low[n.id]}`;
      } else {
        n.sub = '';
      }
    });
    edges.forEach(e => { e.type = step.edgeSnap[`${e.s}-${e.t}`] || step.edgeSnap[`${e.t}-${e.s}`] || 'default'; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('chips-bridges').innerHTML = (step.bridges||[]).map(([u,v])=>`<span class="chip c-red">${u}-${v}</span>`).join('') || '—';
    document.getElementById('chips-apoints').innerHTML = (step.artPoints||[]).map(id=>`<span class="chip c-red">${id}</span>`).join('') || '—';

    document.getElementById('tinlow-tbody').innerHTML = nodes.map(n => {
      const t = step.tin[n.id]; const l = step.low[n.id];
      return `<tr><td>${n.label??n.id}</td><td class="v">${t??'—'}</td><td class="v">${l??'—'}</td></tr>`;
    }).join('');
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, tin:{}, low:{}, bridges:[], artPoints:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
