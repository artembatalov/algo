document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_T = 'aabaabaabaab';
  const DEFAULT_P = 'aab';

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="font-size:12px;color:var(--muted)">Текст T:</label>
      <input id="input-t" value="${DEFAULT_T}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:200px">
      <label style="font-size:12px;color:var(--muted)">Паттерн P:</label>
      <input id="input-p" value="${DEFAULT_P}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:100px">
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Текст T:</div>
    <div id="row-t" style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:16px"></div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Таблица переходов δ(q, c):</div>
    <div id="trans-table" style="overflow-x:auto"></div>
  `;

  VizCode.init([
    { id:0, html:'<span class="cm">// Строим таблицу переходов δ</span>' },
    { id:1, html:'<span class="kw">for</span> q <span class="kw">in</span> [<span class="num">0</span>..m]:' },
    { id:2, html:'  <span class="kw">for</span> c <span class="kw">in</span> alphabet:' },
    { id:3, html:'    δ[q][c] = <span class="fn">longest prefix suffix</span>' },
    { id:4, html:'<span class="cm">// Запускаем автомат</span>' },
    { id:5, html:'q = <span class="num">0</span>' },
    { id:6, html:'<span class="kw">for</span> i,c <span class="kw">in</span> T: q = δ[q][c]' },
    { id:7, html:'  <span class="kw">if</span> q == m: found(i-m+<span class="num">1</span>)' },
  ]);

  function buildTransitionTable(P) {
    const m = P.length;
    const sigma = [...new Set(P.split(''))].sort();
    const delta = Array.from({length: m+1}, () => ({}));
    sigma.forEach(c => { delta[0][c] = 0; });

    for (let q = 0; q <= m; q++) {
      for (const c of sigma) {
        // Compute delta[q][c]: longest prefix of P that is suffix of P[0..q-1] + c
        let k = Math.min(m, q + 1);
        const test = P.slice(0, q) + c;
        while (k > 0 && !test.endsWith(P.slice(0, k))) k--;
        delta[q][c] = k;
      }
    }
    return { delta, sigma };
  }

  function renderTransTable(delta, sigma, m, curState, curChar) {
    const el = document.getElementById('trans-table');
    if (!el) return;
    let html = '<table class="viz-table" style="font-family:monospace"><thead><tr><th>q</th>';
    sigma.forEach(c => html += `<th style="color:var(--accent2)">${c}</th>`);
    html += '</tr></thead><tbody>';
    for (let q = 0; q <= m; q++) {
      const hl = q === curState;
      html += `<tr class="${hl?'hl-row':''}"><td style="font-weight:600${q===m?';color:var(--col-black)':''}">${q}${q===m?'*':''}</td>`;
      sigma.forEach(c => {
        const val = delta[q]?.[c] ?? 0;
        const isCur = hl && c === curChar;
        html += `<td class="${isCur?'v':''}">${val}</td>`;
      });
      html += '</tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function buildSteps() {
    const T = (document.getElementById('input-t').value || DEFAULT_T).slice(0, 22);
    const P = (document.getElementById('input-p').value || DEFAULT_P).slice(0, 8);
    const n = T.length, m = P.length;
    const { delta, sigma } = buildTransitionTable(P);
    const steps = [];
    const found = [];
    const tDone = new Set();

    steps.push({ line:[0,1,2,3], i:-1, q:0, T, P, m, delta, sigma, found:[], tStates:Array(n).fill(''),
      desc:`Таблица переходов построена для паттерна "${P}"` });

    steps.push({ line:[4,5], i:-1, q:0, T, P, m, delta, sigma, found:[], tStates:Array(n).fill(''),
      desc:`Запускаем автомат с начального состояния q=0` });

    let q = 0;
    for (let i = 0; i < n; i++) {
      const c = T[i];
      const nq = delta[q]?.[c] ?? 0;
      const ts = Array(n).fill('');
      tDone.forEach(p => { for (let k = p; k < p + m && k < n; k++) ts[k] = 'cb-done'; });
      ts[i] = 'cb-active';

      steps.push({ line:[6], i, q, c, T, P, m, delta, sigma, found:[...found], tStates:[...ts],
        desc:`i=${i}: T[i]='${c}', δ(${q},'${c}')=${nq}` });
      q = nq;

      if (q === m) {
        const pos = i - m + 1;
        found.push(pos);
        tDone.add(pos);
        const ts2 = Array(n).fill('');
        tDone.forEach(p => { for (let k = p; k < p + m && k < n; k++) ts2[k] = 'cb-done'; });
        steps.push({ line:[7], i, q, c, T, P, m, delta, sigma, found:[...found], tStates:[...ts2],
          desc:`<span class="ok">Найдено на позиции ${pos}!</span> q=${m} (принимающее состояние)` });
      }
    }

    const tsFinal = Array(n).fill('');
    tDone.forEach(p => { for (let k = p; k < p + m && k < n; k++) tsFinal[k] = 'cb-done'; });
    steps.push({ line:[], i:-1, q:0, c:'', T, P, m, delta, sigma, found:[...found], tStates:tsFinal,
      desc: found.length > 0 ? `Найдено ${found.length} вхождений: [${found.join(', ')}]` : 'Вхождений не найдено.' });
    return steps;
  }

  function applyStep(step) {
    const T = step.T || '';
    const el = document.getElementById('row-t');
    if (el) el.innerHTML = T.split('').map((c, i) => `<span class="char-box ${step.tStates?.[i]||''}" style="position:relative">${c}<span class="idx">${i}</span></span>`).join('');
    if (el) el.style.cssText = 'display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:16px';

    renderTransTable(step.delta||{}, step.sigma||[], step.m||0, step.q||0, step.c||'');
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-state').textContent = step.q ?? 0;
    document.getElementById('cur-char').textContent = step.c || '—';
    document.getElementById('chips-found').innerHTML = (step.found||[]).map(p=>`<span class="chip c-black">${p}</span>`).join('') || '—';
  }

  function run() {
    const T = (document.getElementById('input-t').value || DEFAULT_T).slice(0, 22);
    const P = (document.getElementById('input-p').value || DEFAULT_P).slice(0, 8);
    const { delta, sigma } = buildTransitionTable(P);
    const steps = buildSteps();
    VizAnim.init([
      { line:[], i:-1, q:0, c:'', T, P, m:P.length, delta, sigma, found:[], tStates:Array(T.length).fill(''), desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
