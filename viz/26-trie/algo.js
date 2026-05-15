document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_WORDS = ['cat', 'car', 'card', 'care', 'bat'];

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">insert</span>(word):' },
    { id:1, html:'  node = root' },
    { id:2, html:'  <span class="kw">for</span> c <span class="kw">in</span> word:' },
    { id:3, html:'    <span class="kw">if</span> c <span class="kw">not in</span> node.children:' },
    { id:4, html:'      node.children[c] = new Node()' },
    { id:5, html:'    node = node.children[c]' },
    { id:6, html:'  node.isEnd = <span class="kw">true</span>' },
  ]);

  // Trie data structure
  class TrieNode {
    constructor() { this.children = {}; this.isEnd = false; this.id = TrieNode.nextId++; }
  }
  TrieNode.nextId = 0;

  let root = new TrieNode();
  const words = [];
  let pendingWord = null;

  function resetTrie() {
    TrieNode.nextId = 0;
    root = new TrieNode();
    words.length = 0;
  }

  // Build trie layout for SVG rendering
  function buildLayout(node, depth = 0, offset = 0) {
    const children = Object.entries(node.children);
    const width = Math.max(1, children.length);
    let childOffset = offset;
    const childLayouts = children.map(([ch, child]) => {
      const layout = buildLayout(child, depth + 1, childOffset);
      childOffset += layout.width;
      return { ch, child, layout };
    });
    const x = (offset + offset + width - 1) / 2;
    return { node, x, depth, children: childLayouts, width };
  }

  function flattenLayout(layout, xScale = 50, yScale = 60, xOff = 30) {
    const nodes = [], edges = [];
    function visit(l, parentX, parentY) {
      const nx = l.x * xScale + xOff;
      const ny = l.depth * yScale + 50;
      nodes.push({ id: l.node.id, x: nx, y: ny, isEnd: l.node.isEnd, ch: l.ch, hl: l.node.hl });
      if (parentX !== undefined) edges.push({ x1: parentX, y1: parentY, x2: nx, y2: ny, ch: l.ch });
      for (const c of l.children) visit(c, nx, ny);
    }
    visit(layout, undefined, undefined);
    return { nodes, edges };
  }

  function renderTrie(hlNodes = new Set(), endNodes = new Set()) {
    const svg = d3.select('#trie-svg');
    svg.selectAll('*').remove();

    const layout = buildLayout(root);
    const svgWidth = document.getElementById('trie-svg').getBoundingClientRect().width || 600;
    const xScale = Math.min(50, (svgWidth - 60) / Math.max(1, layout.width));
    const { nodes, edges } = flattenLayout(layout, xScale, 70, 30);

    // edges
    svg.selectAll('line.trie-edge').data(edges)
      .enter().append('line').attr('class','trie-edge')
      .attr('x1',d=>d.x1).attr('y1',d=>d.y1).attr('x2',d=>d.x2).attr('y2',d=>d.y2);

    // edge labels
    svg.selectAll('text.trie-edge-label').data(edges)
      .enter().append('text').attr('class','trie-edge-label')
      .attr('x',d=>(d.x1+d.x2)/2).attr('y',d=>(d.y1+d.y2)/2)
      .text(d=>d.ch);

    // nodes
    const ng = svg.selectAll('g.trie-n').data(nodes).enter().append('g').attr('class','trie-n')
      .attr('transform',d=>`translate(${d.x},${d.y})`);
    ng.append('circle').attr('r',14).attr('class',d => {
      if (hlNodes.has(d.id)) return 'trie-node tn-hl';
      if (d.isEnd || endNodes.has(d.id)) return 'trie-node tn-end';
      return 'trie-node';
    });
    ng.append('text').attr('text-anchor','middle').attr('dominant-baseline','central')
      .attr('font-size','11px').attr('fill','#fff').attr('font-weight','700')
      .text(d => d.id === root.id ? '∅' : d.ch || '');
  }

  // Build insert animation steps
  function buildInsertSteps(word) {
    const steps = [];
    let node = root;
    steps.push({ line:[0,1], word, pos:-1, hl:new Set([root.id]), ends:new Set(),
      desc:`Вставляем слово "<b>${word}</b>", начинаем с корня` });

    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      const hl = new Set([node.id]);

      if (!(c in node.children)) {
        steps.push({ line:[2,3,4], word, pos:i, hl, ends:new Set(),
          desc:`Символ '<b>${c}</b>': создаём новый узел` });
        node.children[c] = new TrieNode();
      } else {
        steps.push({ line:[2,3], word, pos:i, hl, ends:new Set(),
          desc:`Символ '<b>${c}</b>': узел уже существует, идём дальше` });
      }

      node = node.children[c];
      hl.add(node.id);
      steps.push({ line:[5], word, pos:i, hl, ends:new Set(),
        desc:`Переходим в узел '<b>${c}</b>'` });
    }

    node.isEnd = true;
    const ends = new Set([node.id]);
    steps.push({ line:[6], word, pos:word.length-1, hl: new Set([node.id]), ends,
      desc:`Помечаем конец слова "<b>${word}</b>"` });

    return steps;
  }

  let pendingSteps = [];
  let pendingIndex = 0;

  document.getElementById('btn-add-word').addEventListener('click', () => {
    const w = document.getElementById('input-word').value.trim().toLowerCase().replace(/[^a-z]/g,'');
    if (!w) return;
    document.getElementById('input-word').value = '';
    pendingWord = w;
    document.getElementById('chips-cur').innerHTML = `<span class="chip c-accent">${w}</span>`;
    run();
  });

  function applyStep(step) {
    renderTrie(step.hl || new Set(), step.ends || new Set());
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('chips-words').innerHTML = words.map(w=>`<span class="chip c-black">${w}</span>`).join('') || '—';
  }

  function run() {
    if (!pendingWord) {
      // Default: insert preset words
      resetTrie();
      pendingSteps = [];
      for (const w of DEFAULT_WORDS) {
        words.push(w);
        pendingSteps.push(...buildInsertSteps(w));
      }
    } else {
      words.push(pendingWord);
      pendingSteps = buildInsertSteps(pendingWord);
      pendingWord = null;
    }

    VizAnim.init([
      { line:[], hl:new Set([root.id]), ends:new Set(), word:'', pos:-1, desc:'Начало вставки' },
      ...pendingSteps,
      { line:[], hl:new Set(), ends:new Set(), word:'', pos:-1, desc:'Вставка завершена.' },
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
