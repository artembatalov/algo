document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const M = 7; // table size
  const DEFAULT_KEYS = [15, 11, 27, 8, 3, 22, 18, 14];

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label style="font-size:12px;color:var(--muted)">Размер таблицы m=${M}</label>
      <span style="color:var(--muted);font-size:11px">h(k) = k % ${M}</span>
    </div>
    <div id="hash-table" style="margin-top:8px"></div>
  `;

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">insert</span>(key):' },
    { id:1, html:'  idx = key % m' },
    { id:2, html:'  table[idx].chain.<span class="fn">append</span>(key)' },
    { id:3, html:'' },
    { id:4, html:'<span class="kw">function</span> <span class="fn">search</span>(key):' },
    { id:5, html:'  idx = key % m' },
    { id:6, html:'  <span class="kw">return</span> key <span class="kw">in</span> table[idx].chain' },
  ]);

  function renderTable(table, activeSlot, activeKey) {
    const el = document.getElementById('hash-table');
    if (!el) return;
    let html = '';
    for (let i = 0; i < M; i++) {
      const isActive = i === activeSlot;
      html += `<div class="ht-row">
        <span class="ht-idx">${i}</span>
        <span class="ht-slot ${isActive?'ht-active':''}" style="min-width:36px">[${i}]</span>`;
      const chain = table[i] || [];
      html += `<div class="ht-chain">`;
      chain.forEach((k, j) => {
        const isAK = isActive && k === activeKey;
        html += `<span class="ht-slot ht-filled${isAK?' ht-active':''}">${k}</span>`;
        if (j < chain.length - 1) html += `<span style="color:var(--muted);align-self:center">→</span>`;
      });
      html += `</div></div>`;
    }
    el.innerHTML = html;
  }

  function buildSteps() {
    const table = Array.from({length: M}, () => []);
    const steps = [];
    let totalKeys = 0;

    for (const key of DEFAULT_KEYS) {
      const idx = key % M;
      steps.push({ line:[0,1], table: table.map(r=>[...r]), activeSlot: idx, activeKey: key, key, idx,
        desc:`Вставляем ключ <b>${key}</b>: h(${key}) = ${key} % ${M} = <b>${idx}</b>` });

      table[idx].push(key);
      totalKeys++;

      steps.push({ line:[2], table: table.map(r=>[...r]), activeSlot: idx, activeKey: key, key, idx,
        desc:`Ключ <b>${key}</b> добавлен в slot[${idx}]. Цепочка: [${table[idx].join(',')}]` });
    }

    steps.push({ line:[], table: table.map(r=>[...r]), activeSlot: -1, activeKey: null, key: null, idx: -1,
      desc:`Всё вставлено. Коэффициент загрузки: ${(totalKeys/M).toFixed(2)}` });
    return steps;
  }

  function applyStep(step) {
    renderTable(step.table || [], step.activeSlot, step.activeKey);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-key').textContent = step.key ?? '—';
    document.getElementById('cur-hash').textContent = step.idx >= 0 ? step.idx : '—';
    const total = (step.table || []).reduce((s, r) => s + r.length, 0);
    document.getElementById('load-factor').textContent = (total / M).toFixed(2);
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], table:Array.from({length:M},()=>[]), activeSlot:-1, activeKey:null, key:null, idx:-1, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
