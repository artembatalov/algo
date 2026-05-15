document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:160, y:120 },
      { id:1, x:320, y:80  },
      { id:2, x:480, y:120 },
      { id:3, x:240, y:260 },
      { id:4, x:400, y:260 },
      { id:5, x:320, y:380 },
    ],
    edges: [
      {s:0,t:1},{s:1,t:2},{s:2,t:4},
      {s:0,t:3},{s:3,t:4},
      {s:4,t:1}, // back edge → cycle
      {s:3,t:5},{s:5,t:3}, // another cycle
    ],
  };

  VizGraph.init('viz-svg', { directed: true });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">dfs</span>(v):' },
    { id:1, html:'  color[v] = <span class="num">GRAY</span>' },
    { id:2, html:'  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:3, html:'    <span class="kw">if</span> color[to] == GRAY:' },
    { id:4, html:'      <span class="cm">// BACK EDGE → цикл!</span>' },
    { id:5, html:'      cycleFound = <span class="kw">true</span>' },
    { id:6, html:'    <span class="kw">elif</span> color[to] == WHITE:' },
    { id:7, html:'      <span class="fn">dfs</span>(to)' },
    { id:8, html:'  color[v] = <span class="num">BLACK</span>' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => adj[e.s].push(e.t));

    const color = {};
    ids.forEach(id => color[id] = WHITE);
    const parent = {};
    const steps = [];
    const edgeSnap = {};
    const cycleNodes = new Set();

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (cycleNodes.has(id)) m[id] = 's-red';
        else if (color[id]===GRAY) m[id] = 's-gray';
        else if (color[id]===BLACK) m[id] = 's-black';
      });
      return m;
    }

    function markCycle(v, from) {
      // trace cycle back through parent chain
      const cycle = [from];
      let cur = v;
      while (cur !== from) {
        cycle.push(cur);
        cur = parent[cur];
        if (cur === undefined) break;
      }
      cycle.push(from);
      cycle.forEach(id => cycleNodes.add(id));
      for (let i = 0; i < cycle.length - 1; i++) {
        edgeSnap[`${cycle[i+1]}-${cycle[i]}`] = 'back';
        edgeSnap[`${cycle[i]}-${cycle[i+1]}`] = 'back';
      }
    }

    function dfs(v) {
      color[v] = GRAY;
      steps.push({ line:[1], nodeStates:ns(), edgeSnap:{...edgeSnap},
        desc:`Входим в <b>${v}</b>, красим GRAY` });

      for (const to of adj[v]) {
        steps.push({ line:[2,3], nodeStates:ns(), edgeSnap:{...edgeSnap},
          desc:`Ребро <b>${v}→${to}</b>, цвет[${to}]=${color[to]===WHITE?'WHITE':color[to]===GRAY?'GRAY':'BLACK'}` });

        if (color[to] === GRAY) {
          markCycle(v, to);
          steps.push({ line:[3,4,5], nodeStates:ns(), edgeSnap:{...edgeSnap},
            desc:`<span class="warn">ЦИКЛ найден!</span> Back edge <b>${v}→${to}</b>` });
        } else if (color[to] === WHITE) {
          parent[to] = v;
          edgeSnap[`${v}-${to}`] = 'tree';
          steps.push({ line:[6,7], nodeStates:ns(), edgeSnap:{...edgeSnap},
            desc:`Tree edge <b>${v}→${to}</b>, рекурсия` });
          dfs(to);
        }
      }

      color[v] = BLACK;
      steps.push({ line:[8], nodeStates:ns(), edgeSnap:{...edgeSnap},
        desc:`Выходим из <b>${v}</b>, красим BLACK` });
    }

    for (const id of ids) {
      if (color[id] === WHITE) dfs(id);
    }

    steps.push({ line:[], nodeStates:ns(), edgeSnap:{...edgeSnap},
      desc: cycleNodes.size > 0 ? `<span class="warn">Найдены циклы!</span> Вершины: ${[...cycleNodes].join(', ')}` : '<span class="ok">Циклов нет.</span>' });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    edges.forEach(e => { e.type = step.edgeSnap[`${e.s}-${e.t}`] || 'default'; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    const grayChips = nodes.filter(n=>step.nodeStates[n.id]==='s-gray').map(n=>`<span class="chip c-gray">${n.id}</span>`).join('')||'—';
    const blackChips = nodes.filter(n=>step.nodeStates[n.id]==='s-black').map(n=>`<span class="chip c-black">${n.id}</span>`).join('')||'—';
    const cycleChips = nodes.filter(n=>step.nodeStates[n.id]==='s-red').map(n=>`<span class="chip c-red">${n.id}</span>`).join('')||'—';
    document.getElementById('chips-gray').innerHTML = grayChips;
    document.getElementById('chips-black').innerHTML = blackChips;
    document.getElementById('chips-cycle').innerHTML = cycleChips;
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, edgeSnap:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
