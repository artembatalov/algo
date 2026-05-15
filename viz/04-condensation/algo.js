document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:120, y:150 },
      { id:1, x:260, y:80  },
      { id:2, x:400, y:150 },
      { id:3, x:260, y:220 },
      { id:4, x:500, y:80  },
      { id:5, x:500, y:260 },
      { id:6, x:360, y:330 },
    ],
    edges: [
      {s:0,t:1},{s:1,t:2},{s:2,t:0}, // SCC: 0,1,2
      {s:1,t:3},{s:3,t:0},             // 3 in SCC 0,1,2,3
      {s:2,t:4},{s:4,t:5},             // SCC: 4,5
      {s:5,t:4},
      {s:3,t:6},{s:6,t:5},             // 6 alone
    ],
  };

  const SCC_COLORS = ['s-blue','s-red','s-purple','s-gray','s-black'];

  VizGraph.init('viz-svg', { directed: true });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="cm">// Фаза 1: DFS на исходном графе</span>' },
    { id:1, html:'<span class="kw">for</span> v <span class="kw">in</span> V: <span class="fn">dfs1</span>(v)  <span class="cm">// порядок выхода</span>' },
    { id:2, html:'' },
    { id:3, html:'<span class="cm">// Фаза 2: DFS на обратном графе</span>' },
    { id:4, html:'<span class="kw">for</span> v <span class="kw">in</span> reverse(exitOrder):' },
    { id:5, html:'  <span class="kw">if</span> !visited[v]: <span class="fn">dfs2</span>(v, scc++)' },
    { id:6, html:'' },
    { id:7, html:'<span class="kw">function</span> <span class="fn">dfs2</span>(v, id):' },
    { id:8, html:'  comp[v] = id' },
    { id:9, html:'  <span class="kw">for</span> to <span class="kw">in</span> radj[v]: <span class="fn">dfs2</span>(to, id)' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {}, radj = {};
    ids.forEach(id => { adj[id]=[]; radj[id]=[]; });
    edges.forEach(e => { adj[e.s].push(e.t); radj[e.t].push(e.s); });

    const steps = [];
    // Phase 1
    const color1 = {};
    ids.forEach(id => color1[id] = WHITE);
    const exitOrder = [];

    function ns1() {
      const m = {};
      ids.forEach(id => {
        if (color1[id]===GRAY) m[id]='s-gray';
        else if (color1[id]===BLACK) m[id]='s-black';
      });
      return m;
    }

    function dfs1(v) {
      color1[v] = GRAY;
      steps.push({ line:[1], phase:1, nodeStates:ns1(), exitOrder:[...exitOrder], sccs:[], desc:`Фаза 1: входим в <b>${v}</b>` });
      for (const to of adj[v]) {
        if (color1[to]===WHITE) dfs1(to);
      }
      color1[v] = BLACK;
      exitOrder.push(v);
      steps.push({ line:[1], phase:1, nodeStates:ns1(), exitOrder:[...exitOrder], sccs:[], desc:`Фаза 1: выходим из <b>${v}</b>, порядок: [${exitOrder.join(',')}]` });
    }

    steps.push({ line:[1], phase:1, nodeStates:{}, exitOrder:[], sccs:[], desc:'Фаза 1: DFS на исходном графе' });
    for (const id of ids) {
      if (color1[id]===WHITE) dfs1(id);
    }

    // Phase 2
    const color2 = {};
    ids.forEach(id => color2[id] = WHITE);
    const comp = {};
    let sccId = 0;
    const sccs = [];

    function ns2() {
      const m = {};
      ids.forEach(id => {
        if (color2[id]===GRAY) m[id]='s-gray';
        else if (comp[id] !== undefined) {
          const colors = ['s-blue','s-red','s-purple','s-active','s-black'];
          m[id] = colors[comp[id] % colors.length];
        }
      });
      return m;
    }

    function dfs2(v, id) {
      color2[v] = GRAY;
      comp[v] = id;
      if (!sccs[id]) sccs[id] = [];
      sccs[id].push(v);
      steps.push({ line:[7,8], phase:2, nodeStates:ns2(), exitOrder:[...exitOrder], sccs:sccs.map(s=>[...s]),
        desc:`Фаза 2: вершина <b>${v}</b> → SCC #${id}` });
      for (const to of radj[v]) {
        if (color2[to]===WHITE) dfs2(to, id);
      }
      color2[v] = BLACK;
    }

    steps.push({ line:[3,4], phase:2, nodeStates:{}, exitOrder:[...exitOrder], sccs:[], desc:'Фаза 2: DFS на обратном графе' });
    const rev = [...exitOrder].reverse();
    for (const v of rev) {
      if (color2[v]===WHITE) {
        steps.push({ line:[4,5], phase:2, nodeStates:ns2(), exitOrder:[...exitOrder], sccs:sccs.map(s=>[...s]),
          desc:`Стартуем DFS2 от <b>${v}</b> (SCC #${sccId})` });
        dfs2(v, sccId++);
      }
    }
    steps.push({ line:[], phase:2, nodeStates:ns2(), exitOrder:[...exitOrder], sccs:sccs.map(s=>[...s]), desc:`Конденсация завершена: ${sccId} компоненты` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    document.getElementById('chips-phase').innerHTML = `<span class="chip c-accent">Фаза ${step.phase}</span>`;
    document.getElementById('chips-order').innerHTML = (step.exitOrder||[]).map(id=>`<span class="chip c-black">${id}</span>`).join('') || '—';

    const sccColors = ['c-blue','c-red','c-accent','c-gray','c-black'];
    const sccHtml = (step.sccs||[]).map((scc, i) =>
      `<div class="state-row"><span class="state-key">SCC ${i}</span><div class="chips">${scc.map(id=>`<span class="chip ${sccColors[i%sccColors.length]}">${id}</span>`).join('')}</div></div>`
    ).join('');
    document.getElementById('scc-list').innerHTML = sccHtml || '<span style="color:var(--muted);font-size:11px">—</span>';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], phase:1, nodeStates:{}, exitOrder:[], sccs:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
