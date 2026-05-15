document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const M = 11;
  const DEFAULT_KEYS = [20, 31, 13, 8, 35, 55, 24, 9];

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:12px;font-size:12px;color:var(--muted)">
      Линейное зондирование: h(k, i) = (k % ${M} + i) % ${M}
    </div>
    <div id="hash-table" style="display:flex;flex-direction:column;gap:4px"></div>
  `;

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">insert</span>(key):' },
    { id:1, html:'  i = 0' },
    { id:2, html:'  <span class="kw">while</span> i < m:' },
    { id:3, html:'    idx = (key%m + i) % m' },
    { id:4, html:'    <span class="kw">if</span> table[idx] == EMPTY:' },
    { id:5, html:'      table[idx] = key; <span class="kw">return</span>' },
    { id:6, html:'    i++  <span class="cm">// коллизия, зондируем дальше</span>' },
  ]);

  function renderTable(table, probeSlots, insertSlot, key) {
    const el = document.getElementById('hash-table');
    if (!el) return;
    let html = '';
    for (let i = 0; i < M; i++) {
      let cls = 'ht-slot';
      if (i === insertSlot) cls += ' ht-active';
      else if (probeSlots && probeSlots.includes(i) && table[i] !== null) cls += ' ht-probe';
      else if (table[i] !== null) cls += ' ht-filled';
      const val = table[i] !== null ? table[i] : '—';
      html += `<div class="ht-row">
        <span class="ht-idx">${i}</span>
        <span class="${cls}" style="min-width:60px">${val}</span>
        ${i === insertSlot ? `<span style="color:var(--col-gray);font-size:11px;margin-left:8px">← вставляем ${key}</span>` : ''}
        ${probeSlots && probeSlots.includes(i) && table[i] !== null && i !== insertSlot ? `<span style="color:#ef4444;font-size:11px;margin-left:8px">коллизия</span>` : ''}
      </div>`;
    }
    el.innerHTML = html;
  }

  function buildSteps() {
    const table = new Array(M).fill(null);
    const steps = [];

    for (const key of DEFAULT_KEYS) {
      const h0 = key % M;
      steps.push({ line:[0,1,2,3], table:[...table], probeSlots:[], insertSlot:-1, key,
        desc:`Вставляем <b>${key}</b>: начальный индекс h(${key})=${key}%${M}=${h0}` });

      let i = 0;
      const probed = [];
      while (i < M) {
        const idx = (h0 + i) % M;
        steps.push({ line:[2,3,4], table:[...table], probeSlots:[...probed], insertSlot:idx, key,
          desc:`Зондируем slot[${idx}] = ${table[idx] !== null ? table[idx] : 'пусто'}` });

        if (table[idx] === null) {
          table[idx] = key;
          steps.push({ line:[5], table:[...table], probeSlots:[...probed], insertSlot:idx, key,
            desc:`<span class="ok">Вставлено!</span> table[${idx}] = ${key}` });
          break;
        }
        probed.push(idx);
        steps.push({ line:[6], table:[...table], probeSlots:[...probed], insertSlot:-1, key,
          desc:`Коллизия на slot[${idx}] (занят ключом ${table[idx]}), i=${i+1}` });
        i++;
      }
    }

    const count = table.filter(x => x !== null).length;
    steps.push({ line:[], table:[...table], probeSlots:[], insertSlot:-1, key:null,
      desc:`Все ключи вставлены. Нагрузка: ${count}/${M} = ${(count/M).toFixed(2)}` });
    return steps;
  }

  function applyStep(step) {
    renderTable(step.table || [], step.probeSlots || [], step.insertSlot, step.key);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-key').textContent = step.key ?? '—';
    document.getElementById('cur-probe').textContent = step.insertSlot >= 0 ? step.insertSlot : '—';
    const count = (step.table || []).filter(x => x !== null).length;
    document.getElementById('load-factor').textContent = (count / M).toFixed(2);
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], table:new Array(M).fill(null), probeSlots:[], insertSlot:-1, key:null, desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
