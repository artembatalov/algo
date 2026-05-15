document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    directed: false,
    nodes: [
      { id:0, x:300, y:80  },
      { id:1, x:160, y:180 },
      { id:2, x:440, y:180 },
      { id:3, x:80,  y:300 },
      { id:4, x:240, y:300 },
      { id:5, x:380, y:300 },
      { id:6, x:520, y:300 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},
      {s:1,t:3},{s:1,t:4},
      {s:2,t:5},{s:2,t:6},
      {s:4,t:5},
    ],
  };

  VizGraph.init('viz-svg', { directed: false, weighted: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">bfs</span>(src):' },
    { id:1, html:'  dist[src] = 0; Q.push(src)' },
    { id:2, html:'  <span class="kw">while</span> Q <span class="kw">not empty</span>:' },
    { id:3, html:'    v = Q.pop_front()' },
    { id:4, html:'    <span class="kw">for</span> to <span class="kw">in</span> adj[v]:' },
    { id:5, html:'      <span class="kw">if</span> dist[to] == ∞:' },
    { id:6, html:'        dist[to] = dist[v] + <span class="num">1</span>' },
    { id:7, html:'        Q.push(to)' },
  ]);

  function buildSteps(srcId) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const dist = {};
    ids.forEach(id => dist[id] = INF);
    dist[srcId] = 0;
    const queue = [srcId];
    const visited = new Set([srcId]);
    const edgeSnap = {};
    const steps = [];

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (queue.includes(id)) m[id] = 's-blue';
        else if (visited.has(id) && !queue.includes(id)) m[id] = 's-black';
      });
      return m;
    }

    steps.push({ line:[1], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, queue:[...queue],
      desc:`Инициализация: dist[${srcId}]=0, добавляем в очередь` });

    while (queue.length > 0) {
      const v = queue.shift();
      steps.push({ line:[2,3], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, queue:[...queue],
        desc:`Извлекаем вершину <b>${v}</b> из очереди (dist=${dist[v]})` });
      visited.add(v);

      for (const to of adj[v]) {
        steps.push({ line:[4,5], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, queue:[...queue],
          desc:`Рассматриваем соседа <b>${to}</b>, dist=${dist[to]===INF?'∞':dist[to]}` });
        if (dist[to] === INF) {
          dist[to] = dist[v] + 1;
          queue.push(to);
          edgeSnap[`${v}-${to}`] = 'tree';
          edgeSnap[`${to}-${v}`] = 'tree';
          steps.push({ line:[6,7], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, queue:[...queue],
            desc:`dist[<b>${to}</b>] = ${dist[to]}, добавляем в очередь` });
        }
      }
    }

    steps.push({ line:[], nodeStates:ns(), edgeSnap:{...edgeSnap}, dist:{...dist}, queue:[],
      desc:'BFS завершён.' });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      n.sub = step.dist[n.id] === INF ? '∞' : String(step.dist[n.id]);
    });
    edges.forEach(e => {
      e.type = step.edgeSnap[`${e.s}-${e.t}`] || 'default';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    const qChips = (step.queue||[]).map(id=>`<span class="chip c-blue">${id}</span>`).join('') || '—';
    const doneChips = nodes.filter(n => step.nodeStates[n.id]==='s-black').map(n=>`<span class="chip c-black">${n.id}</span>`).join('') || '—';
    document.getElementById('chips-queue').innerHTML = qChips;
    document.getElementById('chips-done').innerHTML = doneChips;

    document.getElementById('dist-tbody').innerHTML = nodes.map(n => {
      const d = step.dist[n.id];
      const cls = step.nodeStates[n.id]==='s-blue' ? 'hl-row' : '';
      return `<tr class="${cls}"><td>${n.label??n.id}</td><td class="${d===INF?'inf':'v'}">${d===INF?'∞':d}</td></tr>`;
    }).join('');
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const steps = buildSteps(nodes[0]?.id);
    const init = { line:[], nodeStates:{[nodes[0]?.id]:'s-blue'}, edgeSnap:{},
      dist: Object.fromEntries(nodes.map(n=>[n.id, n.id===nodes[0]?.id?0:INF])),
      queue:[nodes[0]?.id], desc:'Готово к запуску.' };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
