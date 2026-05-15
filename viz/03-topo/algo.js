document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:100, y:200, label:'A' },
      { id:1, x:250, y:100, label:'B' },
      { id:2, x:250, y:300, label:'C' },
      { id:3, x:400, y:100, label:'D' },
      { id:4, x:400, y:300, label:'E' },
      { id:5, x:550, y:200, label:'F' },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},
      {s:1,t:3},{s:1,t:4},
      {s:2,t:4},
      {s:3,t:5},{s:4,t:5},
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
    { id:0, html:'<span class="kw">function</span> <span class="fn">topoSort</span>():' },
    { id:1, html:'  <span class="kw">for</span> v <span class="kw">in</span> V: color[v]=WHITE' },
    { id:2, html:'  <span class="kw">for</span> v <span class="kw">in</span> V:' },
    { id:3, html:'    <span class="kw">if</span> color[v]==WHITE: <span class="fn">dfs</span>(v)' },
    { id:4, html:'' },
    { id:5, html:'<span class="kw">function</span> <span class="fn">dfs</span>(v):' },
    { id:6, html:'  color[v] = GRAY' },
    { id:7, html:'  <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:8, html:'    <span class="kw">if</span> color[to]==WHITE: <span class="fn">dfs</span>(to)' },
    { id:9, html:'  color[v] = BLACK' },
    { id:10,html:'  order.push_front(v)  <span class="cm">// выдаём</span>' },
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
    const topo = [];
    const steps = [];

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (color[id]===GRAY) m[id]='s-gray';
        else if (color[id]===BLACK) m[id]='s-black';
      });
      return m;
    }

    function dfs(v) {
      color[v] = GRAY;
      steps.push({ line:[6], nodeStates:ns(), topo:[...topo],
        desc:`DFS: входим в <b>${nodes.find(n=>n.id===v)?.label??v}</b>, красим GRAY` });
      for (const to of adj[v]) {
        if (color[to] === WHITE) {
          steps.push({ line:[7,8], nodeStates:ns(), topo:[...topo],
            desc:`Идём по ребру → <b>${nodes.find(n=>n.id===to)?.label??to}</b>` });
          dfs(to);
        }
      }
      color[v] = BLACK;
      topo.unshift(v);
      steps.push({ line:[9,10], nodeStates:ns(), topo:[...topo],
        desc:`Выходим из <b>${nodes.find(n=>n.id===v)?.label??v}</b> — добавляем в начало порядка` });
    }

    steps.push({ line:[1,2], nodeStates:ns(), topo:[], desc:'Инициализация: все WHITE' });
    for (const id of ids) {
      if (color[id] === WHITE) {
        steps.push({ line:[2,3], nodeStates:ns(), topo:[...topo],
          desc:`Запускаем DFS от <b>${nodes.find(n=>n.id===id)?.label??id}</b>` });
        dfs(id);
      }
    }
    steps.push({ line:[], nodeStates:ns(), topo:[...topo], desc:'Топологическая сортировка завершена!' });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    nodes.forEach(n => { n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : []; });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    const grayChips = nodes.filter(n=>step.nodeStates[n.id]==='s-gray').map(n=>`<span class="chip c-gray">${n.label??n.id}</span>`).join('') || '—';
    const blackChips = nodes.filter(n=>step.nodeStates[n.id]==='s-black').map(n=>`<span class="chip c-black">${n.label??n.id}</span>`).join('') || '—';
    document.getElementById('chips-gray').innerHTML = grayChips;
    document.getElementById('chips-black').innerHTML = blackChips;

    const topoLabels = (step.topo||[]).map((id,i) => {
      const lbl = nodes.find(n=>n.id===id)?.label??id;
      return `<span class="chip c-accent" style="position:relative"><span style="font-size:8px;position:absolute;top:-8px;left:50%;transform:translateX(-50%)">${i+1}</span>${lbl}</span>`;
    });
    document.getElementById('chips-topo').innerHTML = topoLabels.join('<span style="color:var(--muted);padding:0 2px">→</span>') || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, topo:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
