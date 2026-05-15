document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  // Graph where Eulerian cycle exists (all degrees even, connected)
  const DEFAULT = {
    nodes: [
      { id:0, x:300, y:80  },
      { id:1, x:160, y:220 },
      { id:2, x:440, y:220 },
      { id:3, x:100, y:370 },
      { id:4, x:300, y:370 },
      { id:5, x:500, y:370 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},
      {s:1,t:2},{s:1,t:3},
      {s:2,t:4},{s:2,t:5},
      {s:3,t:4},{s:4,t:5},{s:5,t:0},
      {s:1,t:4},
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
    { id:0, html:'<span class="cm">// Проверка: все степени чётные</span>' },
    { id:1, html:'<span class="kw">for</span> v: <span class="kw">if</span> deg[v] % <span class="num">2</span> != 0: нет цикла' },
    { id:2, html:'' },
    { id:3, html:'<span class="fn">Hierholzer</span>(start):' },
    { id:4, html:'  stack = [start]' },
    { id:5, html:'  <span class="kw">while</span> stack <span class="kw">not empty</span>:' },
    { id:6, html:'    v = stack.top()' },
    { id:7, html:'    <span class="kw">if</span> adj[v] <span class="kw">not empty</span>:' },
    { id:8, html:'      to = adj[v].pop(); stack.push(to)' },
    { id:9, html:'    <span class="kw">else</span>: result.push(stack.pop())' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const steps = [];

    // Build adjacency as list of edge indices
    const adjList = {};
    ids.forEach(id => adjList[id] = []);
    edges.forEach((e, i) => {
      adjList[e.s].push({ to: e.t, idx: i });
      adjList[e.t].push({ to: e.s, idx: i });
    });

    const degrees = {};
    ids.forEach(id => degrees[id] = adjList[id].length);

    // Check Euler condition
    const allEven = ids.every(id => degrees[id] % 2 === 0);
    steps.push({ line:[0,1], nodeStates:{}, edgeSnap:{}, stack:[], path:[], degrees:{...degrees},
      desc: allEven
        ? `<span class="ok">Все степени чётные!</span> Эйлеров цикл существует.`
        : `<span class="warn">Есть вершины с нечётной степенью!</span> Эйлеров цикл невозможен.` });

    if (!allEven) return steps;

    // Hierholzer
    const usedEdge = new Array(edges.length).fill(false);
    const adjCopy = {};
    ids.forEach(id => adjCopy[id] = [...adjList[id]]);

    const stack = [ids[0]];
    const result = [];
    const edgeSnap = {};

    function ns(stk) {
      const m = {};
      stk.forEach(id => m[id] = 's-gray');
      return m;
    }

    steps.push({ line:[3,4], nodeStates:ns(stack), edgeSnap:{...edgeSnap}, stack:[...stack], path:[...result], degrees:{...degrees},
      desc:`Начинаем с вершины <b>${ids[0]}</b>, стек: [${stack.join(',')}]` });

    while (stack.length > 0) {
      const v = stack[stack.length - 1];

      // find unused edge
      while (adjCopy[v].length > 0 && usedEdge[adjCopy[v][adjCopy[v].length-1].idx]) {
        adjCopy[v].pop();
      }

      if (adjCopy[v].length > 0) {
        const { to, idx } = adjCopy[v].pop();
        usedEdge[idx] = true;
        edgeSnap[`${v}-${to}`] = 'tree';
        edgeSnap[`${to}-${v}`] = 'tree';
        stack.push(to);
        steps.push({ line:[7,8], nodeStates:ns(stack), edgeSnap:{...edgeSnap}, stack:[...stack], path:[...result], degrees:{...degrees},
          desc:`Идём по ребру <b>${v}→${to}</b>, стек: [${stack.slice(-3).join(',')}...]` });
      } else {
        const done = stack.pop();
        result.unshift(done);
        const edgeSnapFinal = {...edgeSnap};
        result.forEach((id, i) => {
          if (i < result.length - 1) {
            edgeSnapFinal[`${id}-${result[i+1]}`] = 'mst';
            edgeSnapFinal[`${result[i+1]}-${id}`] = 'mst';
          }
        });
        steps.push({ line:[9], nodeStates:ns(stack), edgeSnap: stack.length > 0 ? {...edgeSnap} : edgeSnapFinal,
          stack:[...stack], path:[...result], degrees:{...degrees},
          desc:`Выталкиваем <b>${done}</b> в результат, путь: [${result.slice(0,5).join(',')}${result.length>5?'...':''}]` });
      }
    }

    steps.push({ line:[], nodeStates:{}, edgeSnap:{...edgeSnap}, stack:[], path:[...result], degrees:{...degrees},
      desc:`Эйлеров цикл: ${result.join(' → ')}` });
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

    document.getElementById('chips-stack').innerHTML = (step.stack||[]).slice(-6).map(id=>`<span class="chip c-gray">${id}</span>`).join('') || '—';
    document.getElementById('chips-path').innerHTML = (step.path||[]).slice(0,8).map(id=>`<span class="chip c-black">${id}</span>`).join('') || '—';

    document.getElementById('deg-tbody').innerHTML = nodes.map(n => {
      const d = step.degrees[n.id] ?? 0;
      const even = d % 2 === 0;
      return `<tr><td>${n.label??n.id}</td><td class="v">${d}</td><td>${even?'<span class="ok">✓</span>':'<span style="color:#ef4444">✗</span>'}</td></tr>`;
    }).join('');
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, stack:[], path:[], degrees:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
