document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  // K5 complete graph
  const DEFAULT = {
    nodes: [
      { id:0, x:300, y:60  },
      { id:1, x:490, y:200 },
      { id:2, x:420, y:390 },
      { id:3, x:180, y:390 },
      { id:4, x:110, y:200 },
    ],
    edges: [],
  };
  // Add all edges of K5
  for (let i = 0; i < 5; i++)
    for (let j = i+1; j < 5; j++)
      DEFAULT.edges.push({ s:i, t:j });

  VizGraph.init('viz-svg', { directed: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="cm">// Проверка условия Дирака: deg(v) ≥ n/2</span>' },
    { id:1, html:'<span class="kw">for</span> v: <span class="kw">if</span> deg[v] < n/<span class="num">2</span>: нет гарантии' },
    { id:2, html:'' },
    { id:3, html:'<span class="kw">function</span> <span class="fn">hamiltonian</span>(path, visited):' },
    { id:4, html:'  <span class="kw">if</span> |path| == n:' },
    { id:5, html:'    <span class="kw">if</span> edge(path[-1], path[0]): <span class="kw">return</span> path' },
    { id:6, html:'  <span class="kw">for</span> v <span class="kw">in</span> adj[path[-1]]:' },
    { id:7, html:'    <span class="kw">if</span> !visited[v]:' },
    { id:8, html:'      <span class="fn">hamiltonian</span>(path+[v], visited+{v})' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const n = ids.length;
    const adj = {};
    ids.forEach(id => adj[id] = new Set());
    edges.forEach(e => { adj[e.s].add(e.t); adj[e.t].add(e.s); });

    const steps = [];

    // Check Dirac condition
    steps.push({ line:[0,1], nodeStates:{}, edgeSnap:{}, path:[], degrees:{},
      desc:`Проверяем условие Дирака: все deg(v) ≥ n/2 = ${n}/2 = ${n/2}` });

    const degrees = {};
    ids.forEach(id => degrees[id] = adj[id].size);

    const diracOk = ids.every(id => degrees[id] >= n/2);
    steps.push({ line:[1], nodeStates:{}, edgeSnap:{}, path:[], degrees:{...degrees},
      desc: diracOk
        ? `<span class="ok">Условие Дирака выполнено!</span> Гамильтонов цикл гарантирован.`
        : `Условие Дирака не выполнено. Ищем перебором...` });

    // Backtracking search
    let found = false;
    const MAX_STEPS = 80;

    function bt(path, visited) {
      if (steps.length > MAX_STEPS + 5) return;
      const last = path[path.length - 1];
      const edgeSnap = {};
      for (let i = 0; i < path.length - 1; i++) {
        edgeSnap[`${path[i]}-${path[i+1]}`] = 'tree';
        edgeSnap[`${path[i+1]}-${path[i]}`] = 'tree';
      }
      const ns = {};
      path.forEach(id => ns[id] = 's-gray');

      if (path.length === n) {
        if (adj[last].has(path[0])) {
          edgeSnap[`${last}-${path[0]}`] = 'tree';
          edgeSnap[`${path[0]}-${last}`] = 'tree';
          path.forEach(id => ns[id] = 's-black');
          found = true;
          steps.push({ line:[4,5], nodeStates:{...ns}, edgeSnap:{...edgeSnap}, path:[...path], degrees:{...degrees},
            desc:`<span class="ok">Гамильтонов цикл найден!</span> ${path.join('→')}→${path[0]}` });
        }
        return;
      }

      for (const to of adj[last]) {
        if (!visited.has(to)) {
          steps.push({ line:[6,7,8], nodeStates:{...ns}, edgeSnap:{...edgeSnap}, path:[...path], degrees:{...degrees},
            desc:`Пробуем добавить <b>${to}</b> к пути [${path.join(',')}]` });
          path.push(to);
          visited.add(to);
          bt(path, visited);
          if (found) return;
          path.pop();
          visited.delete(to);
        }
      }
    }

    if (n <= 7) {
      const startId = ids[0];
      bt([startId], new Set([startId]));
    }

    if (!found) {
      steps.push({ line:[], nodeStates:{}, edgeSnap:{}, path:[], degrees:{...degrees},
        desc:'Гамильтонов цикл не найден.' });
    }

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

    const pathChips = (step.path||[]).map(id=>`<span class="chip c-gray">${id}</span>`).join('<span style="color:var(--muted)">→</span>') || '—';
    document.getElementById('chips-path').innerHTML = pathChips;

    const n = nodes.length;
    document.getElementById('deg-tbody').innerHTML = nodes.map(node => {
      const deg = step.degrees[node.id] ?? 0;
      const ok = deg >= n/2;
      return `<tr><td>${node.label??node.id}</td><td class="v">${deg}</td><td class="${ok?'v':''}">
        ${ok?'<span class="ok">✓</span>':'<span style="color:#ef4444">✗</span>'}</td></tr>`;
    }).join('');
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, path:[], degrees:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
