document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:100, y:150 },
      { id:1, x:220, y:80  },
      { id:2, x:220, y:220 },
      { id:3, x:370, y:150 },
      { id:4, x:490, y:80  },
      { id:5, x:490, y:220 },
      { id:6, x:350, y:360 },
      { id:7, x:200, y:360 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},{s:1,t:2},
      {s:3,t:4},{s:3,t:5},{s:4,t:5},
      {s:6,t:7},
    ],
  };

  const COMP_COLORS = ['s-blue','s-red','s-purple','s-active','s-gray','s-black'];
  const CHIP_CLASSES = ['c-blue','c-red','c-accent','c-gray','c-black'];

  VizGraph.init('viz-svg', { directed: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="kw">for</span> v <span class="kw">in</span> V:' },
    { id:1, html:'  <span class="kw">if</span> !visited[v]:' },
    { id:2, html:'    <span class="fn">dfs</span>(v, compId++)' },
    { id:3, html:'' },
    { id:4, html:'<span class="kw">function</span> <span class="fn">dfs</span>(v, id):' },
    { id:5, html:'  comp[v] = id' },
    { id:6, html:'  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:7, html:'    <span class="kw">if</span> !visited[to]: <span class="fn">dfs</span>(to, id)' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const visited = {};
    const comp = {};
    let compId = 0;
    const steps = [];

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (comp[id] !== undefined) m[id] = COMP_COLORS[comp[id] % COMP_COLORS.length];
      });
      return m;
    }

    function compSnap() {
      const res = {};
      ids.forEach(id => { if (comp[id] !== undefined) res[id] = comp[id]; });
      return res;
    }

    function dfs(v, id) {
      visited[v] = true;
      comp[v] = id;
      steps.push({ line:[5], nodeStates:ns(), comp:compSnap(), compCount: compId,
        desc:`Вершина <b>${v}</b> → компонента #${id}` });
      for (const to of adj[v]) {
        if (!visited[to]) {
          steps.push({ line:[6,7], nodeStates:ns(), comp:compSnap(), compCount: compId,
            desc:`Идём в соседа <b>${to}</b>` });
          dfs(to, id);
        }
      }
    }

    steps.push({ line:[0], nodeStates:{}, comp:{}, compCount:0, desc:'Начинаем поиск компонент' });
    for (const id of ids) {
      if (!visited[id]) {
        steps.push({ line:[0,1,2], nodeStates:ns(), comp:compSnap(), compCount: compId,
          desc:`Вершина <b>${id}</b> не посещена, запускаем DFS (компонента #${compId})` });
        dfs(id, compId++);
      }
    }

    steps.push({ line:[], nodeStates:ns(), comp:compSnap(), compCount: compId,
      desc:`Найдено <b>${compId}</b> компонент связности.` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    // Build component groups
    const groups = {};
    nodes.forEach(n => {
      const c = step.comp[n.id];
      if (c !== undefined) {
        if (!groups[c]) groups[c] = [];
        groups[c].push(n.id);
      }
    });

    let html = '';
    Object.entries(groups).forEach(([cid, members]) => {
      const cls = CHIP_CLASSES[+cid % CHIP_CLASSES.length];
      html += `<div class="state-row"><span class="state-key">SCC #${cid}</span><div class="chips">${members.map(id=>`<span class="chip ${cls}">${id}</span>`).join('')}</div></div>`;
    });
    if (!html) html = '<span style="color:var(--muted);font-size:11px">—</span>';
    document.getElementById('comp-list').innerHTML = html;
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, comp:{}, compCount:0, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
