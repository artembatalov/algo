document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const M = 6;
  const DEFAULT_KEYS = [20, 9, 35, 14, 22, 6, 17];
  const MAX_EVICTIONS = M * 2;

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:12px;font-size:11px;color:var(--muted)">
      h1(k) = k % ${M} &nbsp;·&nbsp; h2(k) = (k // ${M}) % ${M}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" id="both-tables"></div>
  `;

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">insert</span>(key, evict=0):' },
    { id:1, html:'  <span class="kw">if</span> evict > MAX: <span class="cm">// цикл! rehash</span>' },
    { id:2, html:'  idx1 = h1(key); idx2 = h2(key)' },
    { id:3, html:'  <span class="kw">if</span> T1[idx1] == EMPTY: T1[idx1]=key' },
    { id:4, html:'  <span class="kw">else</span>: old=T1[idx1]; T1[idx1]=key' },
    { id:5, html:'    <span class="fn">insert</span>(old in T2)  <span class="cm">// выселение</span>' },
  ]);

  function h1(k) { return ((k % M) + M) % M; }
  function h2(k) { return (Math.floor(k / M) % M + M) % M; }

  function renderTables(t1, t2, activeT, activeIdx, evictKey) {
    const el = document.getElementById('both-tables');
    if (!el) return;

    function renderT(table, tLabel, tNum, border) {
      let html = `<div><div style="font-size:11px;font-weight:600;margin-bottom:6px;color:${border}">${tLabel}</div>`;
      for (let i = 0; i < M; i++) {
        const isActive = tNum === activeT && i === activeIdx;
        const isEvict = table[i] === evictKey && evictKey !== null;
        let cls = 'ht-slot';
        if (isActive) cls += ' ht-active';
        else if (isEvict) cls += ' ht-probe';
        else if (table[i] !== null) cls += ' ht-filled';
        html += `<div class="ht-row"><span class="ht-idx">${i}</span><span class="${cls}" style="min-width:56px;border-color:${table[i]!==null?border:''}">${table[i] ?? '—'}</span></div>`;
      }
      html += '</div>';
      return html;
    }

    el.innerHTML = renderT(t1, 'Таблица T1', 1, '#6366f1') + renderT(t2, 'Таблица T2', 2, '#a855f7');
  }

  function buildSteps() {
    const t1 = new Array(M).fill(null);
    const t2 = new Array(M).fill(null);
    const steps = [];

    function insertStep(key, useT2, evictCount) {
      if (evictCount > MAX_EVICTIONS) {
        steps.push({ line:[1], t1:[...t1], t2:[...t2], activeT:-1, activeIdx:-1, evictKey:null, key, evictCount,
          desc:`<span class="warn">Цикл! Нужен rehash.</span>` });
        return;
      }

      if (!useT2) {
        const i1 = h1(key);
        steps.push({ line:[2,3], t1:[...t1], t2:[...t2], activeT:1, activeIdx:i1, evictKey:null, key, evictCount,
          desc:`h1(${key})=${i1}, T1[${i1}]=${t1[i1]??'пусто'}` });

        if (t1[i1] === null) {
          t1[i1] = key;
          steps.push({ line:[3], t1:[...t1], t2:[...t2], activeT:1, activeIdx:i1, evictKey:null, key, evictCount,
            desc:`<span class="ok">T1[${i1}] = ${key}</span>` });
        } else {
          const evicted = t1[i1];
          t1[i1] = key;
          steps.push({ line:[4,5], t1:[...t1], t2:[...t2], activeT:1, activeIdx:i1, evictKey:evicted, key, evictCount,
            desc:`Коллизия! Выселяем <b>${evicted}</b> из T1[${i1}], вставляем ${key}` });
          insertStep(evicted, true, evictCount + 1);
        }
      } else {
        const i2 = h2(key);
        steps.push({ line:[2,5], t1:[...t1], t2:[...t2], activeT:2, activeIdx:i2, evictKey:null, key, evictCount,
          desc:`h2(${key})=${i2}, T2[${i2}]=${t2[i2]??'пусто'}` });

        if (t2[i2] === null) {
          t2[i2] = key;
          steps.push({ line:[5], t1:[...t1], t2:[...t2], activeT:2, activeIdx:i2, evictKey:null, key, evictCount,
            desc:`<span class="ok">T2[${i2}] = ${key}</span>` });
        } else {
          const evicted = t2[i2];
          t2[i2] = key;
          steps.push({ line:[4,5], t1:[...t1], t2:[...t2], activeT:2, activeIdx:i2, evictKey:evicted, key, evictCount,
            desc:`Коллизия! Выселяем <b>${evicted}</b> из T2[${i2}]` });
          insertStep(evicted, false, evictCount + 1);
        }
      }
    }

    for (const k of DEFAULT_KEYS) {
      steps.push({ line:[0], t1:[...t1], t2:[...t2], activeT:-1, activeIdx:-1, evictKey:null, key:k, evictCount:0,
        desc:`Вставляем ключ <b>${k}</b>` });
      insertStep(k, false, 0);
    }

    steps.push({ line:[], t1:[...t1], t2:[...t2], activeT:-1, activeIdx:-1, evictKey:null, key:null, evictCount:0,
      desc:'Все ключи вставлены.' });
    return steps;
  }

  function applyStep(step) {
    renderTables(step.t1||[], step.t2||[], step.activeT, step.activeIdx, step.evictKey);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-key').textContent = step.key ?? '—';
    document.getElementById('evict-key').textContent = step.evictKey ?? '—';
    document.getElementById('evict-count').textContent = step.evictCount ?? 0;
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], t1:new Array(M).fill(null), t2:new Array(M).fill(null), activeT:-1, activeIdx:-1, evictKey:null, key:null, evictCount:0, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
