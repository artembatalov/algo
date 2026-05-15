document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT = {
    nodes: [
      { id:0, x:300, y:80  },
      { id:1, x:160, y:200 },
      { id:2, x:440, y:200 },
      { id:3, x:100, y:340 },
      { id:4, x:300, y:340 },
      { id:5, x:480, y:340 },
    ],
    edges: [
      {s:0,t:1},{s:0,t:2},
      {s:1,t:2},{s:1,t:3},{s:1,t:4},
      {s:2,t:4},{s:2,t:5},
      {s:3,t:4},
      {s:4,t:5},
    ],
  };

  const COLOR_CLASSES = ['s-blue','s-red','s-purple','s-gray','s-black','s-active'];
  const COLOR_NAMES = ['#3b82f6','#ef4444','#a855f7','#f59e0b','#10b981','#f59e0b'];
  const CHIP_CLS = ['c-blue','c-red','c-accent','c-gray','c-black'];

  VizGraph.init('viz-svg', { directed: false });
  VizGraph.setData(JSON.parse(JSON.stringify(DEFAULT.nodes)), JSON.parse(JSON.stringify(DEFAULT.edges)));
  VizGraph.defaultNodeClick();
  VizGraph.onCanvasClick((e, [x, y]) => {
    if (VizAnim.playing || VizAnim.idx > 0) return;
    VizGraph.addNode(x, y);
  });
  VizGraph.render();

  VizCode.init([
    { id:0, html:'color[v] = -<span class="num">1</span> <span class="kw">for all</span> v' },
    { id:1, html:'<span class="kw">for</span> v <span class="kw">in</span> [<span class="num">0</span>..n-<span class="num">1</span>]:' },
    { id:2, html:'  used = {color[nb] <span class="kw">for</span> nb <span class="kw">in</span> adj[v]}' },
    { id:3, html:'  c = <span class="num">0</span>' },
    { id:4, html:'  <span class="kw">while</span> c <span class="kw">in</span> used: c++' },
    { id:5, html:'  color[v] = c' },
  ]);

  function buildSteps() {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { adj[e.s].push(e.t); adj[e.t].push(e.s); });

    const color = {};
    ids.forEach(id => color[id] = -1);
    const steps = [];

    function ns() {
      const m = {};
      ids.forEach(id => {
        if (color[id] >= 0) m[id] = COLOR_CLASSES[color[id] % COLOR_CLASSES.length];
      });
      return m;
    }

    steps.push({ line:[0], nodeStates:{}, color:{...color}, forbidden:{}, desc:'Инициализация: все вершины без цвета' });

    for (const v of ids) {
      const used = new Set(adj[v].filter(nb => color[nb] >= 0).map(nb => color[nb]));
      steps.push({ line:[1,2,3], nodeStates:ns(), color:{...color}, forbidden:{[v]:[...used]},
        desc:`Вершина <b>${v}</b>: запрещены цвета {${[...used].join(',')}}` });

      let c = 0;
      while (used.has(c)) c++;

      color[v] = c;
      steps.push({ line:[4,5], nodeStates:ns(), color:{...color}, forbidden:{[v]:[...used]},
        desc:`Присваиваем вершине <b>${v}</b> цвет <b>${c}</b>` });
    }

    const chromatic = Math.max(...Object.values(color)) + 1;
    steps.push({ line:[], nodeStates:ns(), color:{...color}, forbidden:{},
      desc:`Раскраска завершена. Хроматическое число ≤ ${chromatic}` });
    return steps;
  }

  function applyStep(step) {
    const nodes = VizGraph.getNodes();
    const edges = VizGraph.getEdges();
    nodes.forEach(n => {
      n.classes = step.nodeStates[n.id] ? [step.nodeStates[n.id]] : [];
      n.sub = step.color[n.id] >= 0 ? `c${step.color[n.id]}` : '';
    });
    VizGraph.render();
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    // Count colors used
    const maxColor = Math.max(-1, ...Object.values(step.color));
    const colorChips = maxColor >= 0
      ? Array.from({length: maxColor+1}, (_,i) =>
          `<span class="chip ${CHIP_CLS[i%CHIP_CLS.length]}">Цвет ${i}</span>`).join('')
      : '—';
    document.getElementById('chips-colors').innerHTML = colorChips;

    document.getElementById('color-tbody').innerHTML = nodes.map(n => {
      const c = step.color[n.id];
      const forb = step.forbidden[n.id] ? step.forbidden[n.id].join(',') : '—';
      const cls = c >= 0 ? CHIP_CLS[c % CHIP_CLS.length] : '';
      return `<tr><td>${n.label??n.id}</td>
        <td>${c >= 0 ? `<span class="chip ${cls}">c${c}</span>` : '—'}</td>
        <td style="color:var(--muted)">${forb}</td></tr>`;
    }).join('');
  }

  function run() {
    const nodes = VizGraph.getNodes();
    const steps = buildSteps();
    VizAnim.init([
      { line:[], nodeStates:{}, color: Object.fromEntries(nodes.map(n=>[n.id,-1])), forbidden:{}, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
