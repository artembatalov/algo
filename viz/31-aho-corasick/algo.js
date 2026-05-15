/* ═══════════════════════════════════════════════════════════
   31 — Алгоритм Ахо–Корасик
   Multi-pattern string search using a Trie + failure links.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Default input ─────────────────────────────────────────
  const DEFAULT_PATTERNS = ['he', 'she', 'his', 'hers'];
  const DEFAULT_TEXT     = 'ahishers';

  // ── Pseudocode ─────────────────────────────────────────────
  VizCode.init([
    // BUILD section
    { id: 0,  html: '<span class="cm">// 1. Построение бора</span>' },
    { id: 1,  html: '<span class="kw">for</span> pattern <span class="kw">in</span> patterns:' },
    { id: 2,  html: '  insert(trie, pattern)' },
    { id: 3,  html: '' },
    { id: 4,  html: '<span class="cm">// 2. Fail-ссылки (BFS)</span>' },
    { id: 5,  html: 'fail[root] = root' },
    { id: 6,  html: '<span class="kw">for</span> u <span class="kw">in</span> BFS(trie):' },
    { id: 7,  html: '  <span class="kw">for</span> c <span class="kw">in</span> alphabet:' },
    { id: 8,  html: '    v = goto[u][c]' },
    { id: 9,  html: '    <span class="kw">if</span> v:' },
    { id: 10, html: '      fail[v] = goto[fail[u]][c]' },
    { id: 11, html: '' },
    // SEARCH section
    { id: 12, html: '<span class="cm">// 3. Поиск</span>' },
    { id: 13, html: 'cur = root' },
    { id: 14, html: '<span class="kw">for</span> i, c <span class="kw">in</span> text:' },
    { id: 15, html: '  <span class="kw">while</span> cur≠root <span class="kw">and</span> !goto[cur][c]:' },
    { id: 16, html: '    cur = fail[cur]' },
    { id: 17, html: '  <span class="kw">if</span> goto[cur][c]: cur = goto[cur][c]' },
    { id: 18, html: '  <span class="kw">if</span> cur.isEnd: report match' },
    { id: 19, html: '  <span class="kw">if</span> cur.dict: report dict match' },
  ]);

  // ── Aho-Corasick data structure ───────────────────────────

  /**
   * Build trie nodes. Each node:
   *   id, children: {char -> nodeId}, fail: nodeId, output: [pattern]
   *   parent: nodeId, parentChar: char
   */
  function buildTrie(patterns) {
    const nodes = [{ id: 0, children: {}, fail: 0, output: [], parent: -1, parentChar: '' }];

    for (const pat of patterns) {
      let cur = 0;
      for (const ch of pat) {
        if (!(ch in nodes[cur].children)) {
          const id = nodes.length;
          nodes.push({ id, children: {}, fail: 0, output: [], parent: cur, parentChar: ch });
          nodes[cur].children[ch] = id;
        }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].output.push(pat);
    }
    return nodes;
  }

  /**
   * Build fail links via BFS.
   * Returns array of steps recording each fail link assignment.
   */
  function buildFailLinks(nodes, steps) {
    const queue = [];

    // Root's children: fail -> root
    for (const [ch, childId] of Object.entries(nodes[0].children)) {
      nodes[childId].fail = 0;
      queue.push(childId);
      steps.push({
        phase: 'fail',
        trieSnapshot: snapshotNodes(nodes),
        highlightNode: childId,
        failSrc: childId,
        failDst: 0,
        textPos: -1,
        matches: [],
        line: [5, 6, 7, 8, 9, 10],
        desc: `Fail-ссылка для дочернего узла корня <b>"${ch}"</b> → корень (узел 0)`,
      });
    }

    while (queue.length) {
      const u = queue.shift();

      for (const [ch, v] of Object.entries(nodes[u].children)) {
        // find fail[v]
        let f = nodes[u].fail;
        while (f !== 0 && !(ch in nodes[f].children)) {
          f = nodes[f].fail;
        }
        if (ch in nodes[f].children && nodes[f].children[ch] !== v) {
          nodes[v].fail = nodes[f].children[ch];
        } else {
          nodes[v].fail = 0;
        }
        // merge output from fail target
        const failTarget = nodes[v].fail;
        nodes[v].output = [...new Set([...nodes[v].output, ...nodes[failTarget].output])];

        queue.push(v);
        steps.push({
          phase: 'fail',
          trieSnapshot: snapshotNodes(nodes),
          highlightNode: v,
          failSrc: v,
          failDst: nodes[v].fail,
          textPos: -1,
          matches: [],
          line: [6, 7, 8, 9, 10],
          desc: `Вычисляем fail[${v}] = ${nodes[v].fail}. Символ <b>"${ch}"</b>, узел ${v} → fail ${nodes[v].fail}`,
        });
      }
    }
  }

  /**
   * Search text, recording steps.
   */
  function searchText(nodes, text, steps) {
    let cur = 0;
    const allMatches = [];

    steps.push({
      phase: 'search',
      trieSnapshot: snapshotNodes(nodes),
      highlightNode: 0,
      textPos: -1,
      currentMatches: [],
      matches: [],
      line: [13],
      desc: 'Начинаем поиск. cur = корень (узел 0)',
    });

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      steps.push({
        phase: 'search',
        trieSnapshot: snapshotNodes(nodes),
        highlightNode: cur,
        textPos: i,
        currentMatches: [],
        matches: [...allMatches],
        line: [14],
        desc: `Позиция <b>i=${i}</b>, символ <b>"${ch}"</b>, текущий узел: <b>${cur}</b>`,
      });

      // follow fail links if no transition
      while (cur !== 0 && !(ch in nodes[cur].children)) {
        const prev = cur;
        cur = nodes[cur].fail;
        steps.push({
          phase: 'search',
          trieSnapshot: snapshotNodes(nodes),
          highlightNode: cur,
          textPos: i,
          currentMatches: [],
          matches: [...allMatches],
          line: [15, 16],
          desc: `Нет перехода по <b>"${ch}"</b> из ${prev}, следуем fail-ссылке → узел <b>${cur}</b>`,
        });
      }

      // take transition if possible
      if (ch in nodes[cur].children) {
        cur = nodes[cur].children[ch];
        steps.push({
          phase: 'search',
          trieSnapshot: snapshotNodes(nodes),
          highlightNode: cur,
          textPos: i,
          currentMatches: [],
          matches: [...allMatches],
          line: [17],
          desc: `Переход по <b>"${ch}"</b> → узел <b>${cur}</b>`,
        });
      }

      // report matches
      const stepMatches = [];
      for (const pat of nodes[cur].output) {
        const pos = i - pat.length + 1;
        const entry = { pattern: pat, pos };
        allMatches.push(entry);
        stepMatches.push(entry);
      }

      if (stepMatches.length > 0) {
        steps.push({
          phase: 'search',
          trieSnapshot: snapshotNodes(nodes),
          highlightNode: cur,
          textPos: i,
          currentMatches: stepMatches,
          matches: [...allMatches],
          line: [18, 19],
          desc: `Найдено! Узел <b>${cur}</b> содержит паттерн(ы): <b>${stepMatches.map(m => `"${m.pattern}" @ ${m.pos}`).join(', ')}</b>`,
        });
      }
    }

    steps.push({
      phase: 'done',
      trieSnapshot: snapshotNodes(nodes),
      highlightNode: -1,
      textPos: -1,
      currentMatches: [],
      matches: [...allMatches],
      line: [],
      desc: `Поиск завершён. Найдено <b>${allMatches.length}</b> вхождени${allMatches.length === 1 ? 'е' : allMatches.length < 5 ? 'я' : 'й'}.`,
    });
  }

  function snapshotNodes(nodes) {
    return nodes.map(n => ({
      id: n.id,
      children: { ...n.children },
      fail: n.fail,
      output: [...n.output],
      parent: n.parent,
      parentChar: n.parentChar,
    }));
  }

  // ── Trie layout ───────────────────────────────────────────

  /**
   * Compute x,y positions for each trie node using a simple BFS tree layout.
   * Returns { nodePos: {id -> {x,y}} }
   */
  function computeLayout(nodes, svgWidth, svgHeight) {
    // BFS level-by-level, track subtree widths
    const R = 18;
    const levelHeight = 70;
    const minGap = 46;

    // Compute subtree sizes (number of leaves) bottom-up
    const subtreeSize = new Array(nodes.length).fill(0);
    const leaves = nodes.filter(n => Object.keys(n.children).length === 0);
    leaves.forEach(n => { subtreeSize[n.id] = 1; });

    // BFS from root to get levels
    const levels = [];
    const visited = new Set([0]);
    let frontier = [0];
    while (frontier.length) {
      levels.push(frontier);
      const next = [];
      for (const uid of frontier) {
        for (const cid of Object.values(nodes[uid].children)) {
          if (!visited.has(cid)) { visited.add(cid); next.push(cid); }
        }
      }
      frontier = next;
    }

    // Compute subtree sizes bottom-up
    for (let lv = levels.length - 1; lv >= 0; lv--) {
      for (const uid of levels[lv]) {
        const childIds = Object.values(nodes[uid].children);
        if (childIds.length === 0) {
          subtreeSize[uid] = 1;
        } else {
          subtreeSize[uid] = childIds.reduce((s, cid) => s + subtreeSize[cid], 0);
        }
      }
    }

    const pos = {};
    const topPad = 30;

    // Assign x positions using a Reingold-Tilford-ish approach
    // Each node gets a contiguous horizontal span proportional to its subtree
    const totalLeaves = subtreeSize[0] || 1;
    const usableWidth = Math.max(svgWidth - 40, nodes.length * minGap);

    function assignX(nodeId, leftBound, rightBound) {
      const childIds = Object.values(nodes[nodeId].children).sort((a, b) => {
        // sort by key char for determinism
        const ea = Object.entries(nodes[nodeId].children).find(([,v]) => v === a)[0];
        const eb = Object.entries(nodes[nodeId].children).find(([,v]) => v === b)[0];
        return ea.localeCompare(eb);
      });
      const cx = (leftBound + rightBound) / 2;
      // find which level this node is on
      const lv = levels.findIndex(l => l.includes(nodeId));
      pos[nodeId] = { x: cx, y: topPad + lv * levelHeight };

      let left = leftBound;
      for (const cid of childIds) {
        const span = (subtreeSize[cid] / subtreeSize[nodeId]) * (rightBound - leftBound);
        assignX(cid, left, left + span);
        left += span;
      }
    }

    assignX(0, 20, Math.max(svgWidth - 20, 20 + totalLeaves * minGap));
    return { pos, levels };
  }

  // ── SVG rendering ─────────────────────────────────────────

  let _svgSelection = null;
  let _layout = null;
  let _nodes = null;

  function initSVG(nodes) {
    _nodes = nodes;
    const svgEl = document.getElementById('ac-svg');
    const svgWidth = svgEl.clientWidth || 600;
    const svgHeight = svgEl.clientHeight || 340;

    _svgSelection = d3.select('#ac-svg');
    _svgSelection.selectAll('*').remove();

    // defs for arrows
    const defs = _svgSelection.append('defs');

    defs.append('marker')
      .attr('id', 'arrow-trie')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#4a5278');

    defs.append('marker')
      .attr('id', 'arrow-fail')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f59e0b');

    _layout = computeLayout(nodes, svgWidth, svgHeight);

    // Layers
    _svgSelection.append('g').attr('class', 'g-fail-edges');
    _svgSelection.append('g').attr('class', 'g-trie-edges');
    _svgSelection.append('g').attr('class', 'g-nodes');
  }

  function renderSVG(trieSnapshot, highlightNode, showFail, currentMatches) {
    if (!_svgSelection || !_layout) return;

    const { pos } = _layout;
    const R = 18;
    const matchSet = new Set((currentMatches || []).map(() => highlightNode));

    // ── Trie edges ────────────────────────────────────────
    const trieEdges = [];
    for (const node of trieSnapshot) {
      for (const [ch, childId] of Object.entries(node.children)) {
        trieEdges.push({ src: node.id, dst: childId, ch });
      }
    }

    const edgeSel = _svgSelection.select('.g-trie-edges')
      .selectAll('g.te')
      .data(trieEdges, d => `${d.src}-${d.dst}`);
    edgeSel.exit().remove();
    const edgeEnter = edgeSel.enter().append('g').attr('class', 'te');
    edgeEnter.append('line').attr('class', 'trie-edge-line');
    edgeEnter.append('text').attr('class', 'ac-edge-char');
    edgeSel.merge(edgeEnter).each(function(d) {
      const sp = pos[d.src], dp = pos[d.dst];
      if (!sp || !dp) return;
      const dx = dp.x - sp.x, dy = dp.y - sp.y;
      const len = Math.hypot(dx, dy) || 1;
      const x1 = sp.x + (dx / len) * R;
      const y1 = sp.y + (dy / len) * R;
      const x2 = dp.x - (dx / len) * R;
      const y2 = dp.y - (dy / len) * R;
      d3.select(this).select('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', '#4a5278').attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrow-trie)');
      // label midpoint, offset perpendicular
      const mx = (sp.x + dp.x) / 2;
      const my = (sp.y + dp.y) / 2;
      const px = -dy / len * 10;
      const py = dx / len * 10;
      d3.select(this).select('text')
        .attr('x', mx + px).attr('y', my + py)
        .text(d.ch);
    });

    // ── Fail edges ────────────────────────────────────────
    const failEdges = [];
    if (showFail) {
      for (const node of trieSnapshot) {
        if (node.id !== 0 && node.fail !== node.id) {
          failEdges.push({ src: node.id, dst: node.fail });
        }
      }
    }

    const failSel = _svgSelection.select('.g-fail-edges')
      .selectAll('path.fail-edge')
      .data(failEdges, d => `f-${d.src}-${d.dst}`);
    failSel.exit().remove();
    failSel.enter().append('path').attr('class', 'fail-edge')
      .merge(failSel).each(function(d) {
        const sp = pos[d.src], dp = pos[d.dst];
        if (!sp || !dp) return;
        const dx = dp.x - sp.x, dy = dp.y - sp.y;
        const len = Math.hypot(dx, dy) || 1;
        const x1 = sp.x + (dx / len) * R;
        const y1 = sp.y + (dy / len) * R;
        const x2 = dp.x - (dx / len) * (R + 6);
        const y2 = dp.y - (dy / len) * (R + 6);
        // curved path
        const cx = (sp.x + dp.x) / 2 + (-dy / len) * 30;
        const cy = (sp.y + dp.y) / 2 + (dx / len) * 30;
        d3.select(this)
          .attr('d', `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`)
          .attr('marker-end', 'url(#arrow-fail)');
      });

    // ── Nodes ─────────────────────────────────────────────
    const nodeSel = _svgSelection.select('.g-nodes')
      .selectAll('g.ac-node-g')
      .data(trieSnapshot, d => d.id);
    nodeSel.exit().remove();
    const nodeEnter = nodeSel.enter().append('g').attr('class', 'ac-node-g');
    nodeEnter.append('circle').attr('r', R);
    nodeEnter.append('text').attr('class', 'ac-node-label');
    nodeSel.merge(nodeEnter).each(function(d) {
      const p = pos[d.id];
      if (!p) return;
      d3.select(this).attr('transform', `translate(${p.x},${p.y})`);
      const isCurrent  = d.id === highlightNode;
      const isMatch    = isCurrent && (currentMatches && currentMatches.length > 0);
      const isRoot     = d.id === 0;
      const hasPattern = d.output && d.output.length > 0;
      let cls = 'ac-node';
      if (isMatch)    cls += ' ac-match';
      else if (isCurrent) cls += ' ac-current';
      else if (isRoot) cls += ' ac-root';
      else if (hasPattern) cls += ' ac-match';
      d3.select(this).select('circle').attr('class', cls);
      // label: node id, plus pattern if terminal
      const lbl = d.id === 0 ? '⊙' : String(d.id);
      d3.select(this).select('text').text(lbl).attr('class', 'ac-node-label');
    });
  }

  // ── Patterns display ──────────────────────────────────────

  function renderPatternsDisplay(patterns) {
    const el = document.getElementById('ac-patterns-display');
    el.className = 'ac-patterns';
    el.innerHTML = patterns.map((pat, i) => {
      const chars = pat.split('').map(ch =>
        `<span class="char-box">${ch}</span>`
      ).join('');
      return `<div style="display:flex;align-items:center;gap:4px">
        <span class="pattern-label">P${i + 1}:</span>
        <div class="ac-pat-chip">${chars}</div>
      </div>`;
    }).join('');
  }

  // ── Text display ──────────────────────────────────────────

  function renderTextDisplay(text, textPos, allMatches, currentMatches) {
    const el = document.getElementById('ac-text-display');
    el.innerHTML = '';

    const label = document.createElement('span');
    label.className = 'str-label';
    label.textContent = 'T:';
    el.appendChild(label);

    // Build per-position match data
    const matchedPositions = new Set();
    const currentMatchSet = new Set((currentMatches || []).flatMap(m => {
      const positions = [];
      for (let k = m.pos; k < m.pos + m.pattern.length; k++) positions.push(k);
      return positions;
    }));
    for (const m of allMatches) {
      for (let k = m.pos; k < m.pos + m.pattern.length; k++) matchedPositions.add(k);
    }

    text.split('').forEach((ch, i) => {
      const box = document.createElement('span');
      box.className = 'char-box';
      if (currentMatchSet.has(i)) {
        box.classList.add('cb-match');
      } else if (matchedPositions.has(i)) {
        box.classList.add('cb-done');
      } else if (i === textPos) {
        box.classList.add('cb-active');
      } else if (i < textPos) {
        // already passed
      }

      if (i === textPos) {
        const ptr = document.createElement('span');
        ptr.className = 'char-ptr';
        ptr.style.color = '#818cf8';
        ptr.textContent = 'i';
        box.appendChild(ptr);
      }

      const idxSpan = document.createElement('span');
      idxSpan.className = 'idx';
      idxSpan.textContent = i;
      box.appendChild(idxSpan);

      box.insertBefore(document.createTextNode(ch), box.firstChild);
      el.appendChild(box);
    });
  }

  // ── State chips & table ───────────────────────────────────

  const PHASE_LABELS = {
    trie:   'Построение бора',
    fail:   'Вычисление fail-ссылок',
    search: 'Поиск',
    done:   'Завершено',
  };

  function renderPhaseChip(phase) {
    const el = document.getElementById('chips-phase');
    if (!el) return;
    const color = { trie: 'c-blue', fail: 'c-gray', search: 'c-accent', done: 'c-black' }[phase] || 'c-white';
    el.innerHTML = `<span class="chip ${color}">${PHASE_LABELS[phase] || phase}</span>`;
  }

  function renderStateChip(nodeId) {
    const el = document.getElementById('chips-state');
    if (!el) return;
    if (nodeId < 0) { el.innerHTML = '—'; return; }
    el.innerHTML = `<span class="chip c-gray">узел ${nodeId}</span>`;
  }

  function renderFoundChip(matches) {
    const el = document.getElementById('chips-found');
    if (!el) return;
    el.innerHTML = matches.length
      ? `<span class="chip c-black">${matches.length}</span>`
      : '<span style="color:#475569;font-size:11px">—</span>';
  }

  function renderMatchesTable(matches) {
    const tbody = document.getElementById('matches-tbody');
    if (!tbody) return;
    tbody.innerHTML = matches.map((m, i) =>
      `<tr class="${i === matches.length - 1 ? 'upd-row' : ''}">
        <td class="v">${m.pattern}</td>
        <td>${m.pos}</td>
      </tr>`
    ).join('') || '<tr><td colspan="2" style="color:#475569">—</td></tr>';
  }

  // ── Step application ──────────────────────────────────────

  function applyStep(step) {
    const showFail = step.phase === 'fail' || step.phase === 'search' || step.phase === 'done';
    renderSVG(step.trieSnapshot, step.highlightNode, showFail, step.currentMatches || []);
    renderTextDisplay(DEFAULT_TEXT, step.textPos, step.matches || [], step.currentMatches || []);
    renderPhaseChip(step.phase);
    renderStateChip(step.highlightNode);
    renderFoundChip(step.matches || []);
    renderMatchesTable(step.matches || []);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
  }

  // ── Step generation ───────────────────────────────────────

  function buildSteps(patterns, text) {
    const steps = [];

    // Initial state
    steps.push({
      phase: 'trie',
      trieSnapshot: [{ id: 0, children: {}, fail: 0, output: [], parent: -1, parentChar: '' }],
      highlightNode: 0,
      textPos: -1,
      currentMatches: [],
      matches: [],
      line: [0, 1],
      desc: 'Начинаем построение бора (Trie). Вставляем паттерны по очереди.',
    });

    // Build trie incrementally with steps
    const nodes = [{ id: 0, children: {}, fail: 0, output: [], parent: -1, parentChar: '' }];

    for (let pi = 0; pi < patterns.length; pi++) {
      const pat = patterns[pi];
      let cur = 0;

      steps.push({
        phase: 'trie',
        trieSnapshot: snapshotNodes(nodes),
        highlightNode: cur,
        textPos: -1,
        currentMatches: [],
        matches: [],
        line: [1, 2],
        desc: `Вставляем паттерн <b>"${pat}"</b> (P${pi + 1})`,
      });

      for (let ci = 0; ci < pat.length; ci++) {
        const ch = pat[ci];
        if (!(ch in nodes[cur].children)) {
          const id = nodes.length;
          nodes.push({ id, children: {}, fail: 0, output: [], parent: cur, parentChar: ch });
          nodes[cur].children[ch] = id;
          cur = id;
          steps.push({
            phase: 'trie',
            trieSnapshot: snapshotNodes(nodes),
            highlightNode: cur,
            textPos: -1,
            currentMatches: [],
            matches: [],
            line: [2],
            desc: `Новый узел <b>${cur}</b> для символа <b>"${ch}"</b> (паттерн "${pat}", позиция ${ci})`,
          });
        } else {
          cur = nodes[cur].children[ch];
          steps.push({
            phase: 'trie',
            trieSnapshot: snapshotNodes(nodes),
            highlightNode: cur,
            textPos: -1,
            currentMatches: [],
            matches: [],
            line: [2],
            desc: `Символ <b>"${ch}"</b> уже существует, переходим в узел <b>${cur}</b>`,
          });
        }
      }
      // Mark as terminal
      nodes[cur].output.push(pat);
      steps.push({
        phase: 'trie',
        trieSnapshot: snapshotNodes(nodes),
        highlightNode: cur,
        textPos: -1,
        currentMatches: [],
        matches: [],
        line: [2],
        desc: `Узел <b>${cur}</b> помечен как конец паттерна <b>"${pat}"</b>`,
      });
    }

    // Transition: start fail link computation
    steps.push({
      phase: 'fail',
      trieSnapshot: snapshotNodes(nodes),
      highlightNode: 0,
      textPos: -1,
      currentMatches: [],
      matches: [],
      line: [4, 5, 6],
      desc: 'Бор построен. Начинаем вычисление fail-ссылок через BFS.',
    });

    buildFailLinks(nodes, steps);

    steps.push({
      phase: 'search',
      trieSnapshot: snapshotNodes(nodes),
      highlightNode: 0,
      textPos: -1,
      currentMatches: [],
      matches: [],
      line: [12, 13],
      desc: `Fail-ссылки готовы. Начинаем поиск в тексте <b>"${text}"</b>.`,
    });

    searchText(nodes, text, steps);

    return { steps, nodes };
  }

  // ── Main run ──────────────────────────────────────────────

  function run() {
    const patterns = DEFAULT_PATTERNS;
    const text     = DEFAULT_TEXT;

    renderPatternsDisplay(patterns);
    renderTextDisplay(text, -1, [], []);

    const { steps, nodes } = buildSteps(patterns, text);

    initSVG(nodes);

    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
