document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    directed: true,
    nodes: [
      { id:0, x:160, y:140 },
      { id:1, x:320, y:80  },
      { id:2, x:480, y:140 },
      { id:3, x:240, y:280 },
      { id:4, x:400, y:280 },
      { id:5, x:560, y:220 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:3},
      {s:1,t:2},{s:1,t:3},
      {s:2,t:5},
      {s:3,t:4},
      {s:4,t:1},{s:4,t:5},
    ],
  };
  let graph = JSON.parse(JSON.stringify(DEFAULT));

  VizGraph.init('viz-svg', { directed: true, weighted: false });
  VizGraph.setData(graph.nodes, graph.edges);
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0,  html:'<span class="kw">function</span> <span class="fn">dfs</span>(v):' },
    { id:1,  html:'  color[v] = <span class="num">GRAY</span>  <span class="cm">// войти</span>' },
    { id:2,  html:'  tin[v] = timer++' },
    { id:3,  html:'  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:4,  html:'    <span class="kw">if</span> color[to] == WHITE:' },
    { id:5,  html:'      <span class="fn">dfs</span>(to)  <span class="cm">// tree edge</span>' },
    { id:6,  html:'    <span class="kw">elif</span> color[to] == GRAY:' },
    { id:7,  html:'      <span class="cm">// back edge (цикл!)</span>' },
    { id:8,  html:'    <span class="kw">else</span>:' },
    { id:9,  html:'      <span class="cm">// forward / cross edge</span>' },
    { id:10, html:'  color[v] = <span class="num">BLACK</span>  <span class="cm">// выйти</span>' },
    { id:11, html:'  tout[v] = timer++' },
  ]);

  function buildSteps(startId) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => {
      adj[e.s].push(e.t);
      if (!VizGraph.directed) adj[e.t].push(e.s);
    });

    const color = {}, tin = {}, tout = {};
    ids.forEach(id => { color[id] = WHITE; });
    let timer = 0;
    const steps = [];
    const edgeTypeFinal = {};
    const running = {};
    const ek = (s, t) => `${s}-${t}`;

    function push(line, nodeStates, edgeTypeSnap, desc, extra) {
      steps.push({ line, nodeStates: {...nodeStates}, edgeTypeSnap: {...edgeTypeSnap}, desc, ...extra });
    }

    function stateSnap() {
      const ns = {};
      ids.forEach(id => {
        if (color[id] === GRAY) ns[id] = 's-gray';
        else if (color[id] === BLACK) ns[id] = 's-black';
      });
      return ns;
    }

    function dfs(v) {
      color[v] = GRAY;
      tin[v] = timer++;
      push([1,2], stateSnap(), running,
        `Входим в вершину <b>${v}</b> — красим GRAY, tin[${v}]=${tin[v]}`,
        { v, tin: {...tin}, tout: {...tout} });

      const neighbors = adj[v];
      for (const to of neighbors) {
        push([3,4], stateSnap(), running,
          `Проверяем ребро <b>${v}→${to}</b>, цвет to = ${color[to] === WHITE ? 'WHITE' : color[to] === GRAY ? 'GRAY' : 'BLACK'}`,
          { v, to, tin: {...tin}, tout: {...tout} });

        if (color[to] === WHITE) {
          running[ek(v,to)] = 'tree';
          edgeTypeFinal[ek(v,to)] = 'tree';
          push([5], stateSnap(), running,
            `<b>Tree edge</b> ${v}→${to} — рекурсивный вызов dfs(${to})`,
            { v, to, tin: {...tin}, tout: {...tout} });
          dfs(to);
        } else if (color[to] === GRAY) {
          running[ek(v,to)] = 'back';
          edgeTypeFinal[ek(v,to)] = 'back';
          push([6,7], stateSnap(), running,
            `<b>Back edge</b> ${v}→${to} — вершина GRAY → обнаружен цикл!`,
            { v, to, tin: {...tin}, tout: {...tout} });
        } else {
          const eType = (tin[v] < tin[to]) ? 'forward' : 'cross';
          running[ek(v,to)] = eType;
          edgeTypeFinal[ek(v,to)] = eType;
          push([8,9], stateSnap(), running,
            `<b>${eType === 'forward' ? 'Forward' : 'Cross'} edge</b> ${v}→${to} — вершина BLACK`,
            { v, to, tin: {...tin}, tout: {...tout} });
        }
      }

      color[v] = BLACK;
      tout[v] = timer++;
      push([10,11], stateSnap(), running,
        `Выходим из вершины <b>${v}</b> — красим BLACK, tout[${v}]=${tout[v]}`,
        { v, tin: {...tin}, tout: {...tout} });
    }

    const order = startId != null ? [startId, ...ids.filter(id=>id!==startId)] : ids;
    for (const id of order) {
      if (color[id] === WHITE) {
        push([], stateSnap(), running,
          `Начинаем DFS с вершины <b>${id}</b>`,
          { v: id, tin: {...tin}, tout: {...tout} });
        dfs(id);
      }
    }

    push([], stateSnap(), running, 'DFS завершён.', { tin: {...tin}, tout: {...tout} });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      n.sub = '';
      if (step.tin && step.tin[n.id] != null) {
        const tin = step.tin[n.id];
        const tout = step.tout && step.tout[n.id] != null ? step.tout[n.id] : '?';
        n.sub = `${tin}/${tout}`;
      }
    });
    edges.forEach(e => {
      e.type = step.edgeTypeSnap[`${e.s}-${e.t}`] || 'default';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    // chips
    const allNodes = VizGraph.getNodes();
    const grayIds = allNodes.filter(n => step.nodeStates[n.id]==='s-gray').map(n=>n.id);
    const blackIds = allNodes.filter(n => step.nodeStates[n.id]==='s-black').map(n=>n.id);
    const whiteIds = allNodes.filter(n => !step.nodeStates[n.id]).map(n=>n.id);
    document.getElementById('chips-gray').innerHTML = grayIds.map(id=>`<span class="chip c-gray">${id}</span>`).join('') || '—';
    document.getElementById('chips-black').innerHTML = blackIds.map(id=>`<span class="chip c-black">${id}</span>`).join('') || '—';
    document.getElementById('chips-white').innerHTML = whiteIds.map(id=>`<span class="chip c-white">${id}</span>`).join('') || '—';

    // times table
    const tbody = document.getElementById('times-tbody');
    tbody.innerHTML = allNodes.map(n => {
      const tin = step.tin && step.tin[n.id] != null ? step.tin[n.id] : '—';
      const tout = step.tout && step.tout[n.id] != null ? step.tout[n.id] : '—';
      const cls = n.id === step.v ? 'hl-row' : '';
      const col = step.nodeStates[n.id] === 's-gray' ? 'GRAY' : step.nodeStates[n.id] === 's-black' ? 'BLACK' : 'WHITE';
      return `<tr class="${cls}"><td>${n.label??n.id}</td><td class="v">${tin}</td><td class="v">${tout}</td><td>${col}</td></tr>`;
    }).join('');
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    graph.nodes = nodes;
    graph.edges = edges;
    const steps = buildSteps(nodes[0]?.id);
    VizAnim.init([
      { line:[], nodeStates:{}, edgeTypeSnap:{}, desc:'Готово к запуску. Нажмите Шаг или Play.', tin:{}, tout:{} },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
