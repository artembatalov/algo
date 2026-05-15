document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_T = 'aabaabaabaabaab';
  const DEFAULT_P = 'aab';

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="font-size:12px;color:var(--muted)">Текст T:</label>
      <input id="input-t" value="${DEFAULT_T}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:220px">
      <label style="font-size:12px;color:var(--muted)">Паттерн P:</label>
      <input id="input-p" value="${DEFAULT_P}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:100px">
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Текст T:</div>
    <div id="row-t" style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:16px"></div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Паттерн P:</div>
    <div id="row-p" style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:8px"></div>
  `;

  VizCode.init([
    { id:0, html:'pi = <span class="fn">prefixFunction</span>(P)' },
    { id:1, html:'j = <span class="num">0</span>' },
    { id:2, html:'<span class="kw">for</span> i <span class="kw">in</span> [<span class="num">0</span>..n-<span class="num">1</span>]:' },
    { id:3, html:'  <span class="kw">while</span> j>0 and T[i]!=P[j]: j=pi[j-<span class="num">1</span>]' },
    { id:4, html:'  <span class="kw">if</span> T[i]==P[j]: j++' },
    { id:5, html:'  <span class="kw">if</span> j==m: found(i-m+<span class="num">1</span>); j=pi[j-<span class="num">1</span>]' },
  ]);

  function prefixFunction(s) {
    const n = s.length;
    const pi = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      let j = pi[i-1];
      while (j > 0 && s[i] !== s[j]) j = pi[j-1];
      if (s[i] === s[j]) j++;
      pi[i] = j;
    }
    return pi;
  }

  function buildSteps() {
    const T = (document.getElementById('input-t').value || DEFAULT_T).slice(0, 24);
    const P = (document.getElementById('input-p').value || DEFAULT_P).slice(0, 10);
    const n = T.length, m = P.length;
    const pi = prefixFunction(P);
    const steps = [];
    const found = [];
    const tDone = new Set();

    steps.push({ line:[0,1], i:-1, j:0, T, P, pi, found:[], tStates:Array(n).fill(''), pStates:Array(m).fill(''),
      desc:`Вычислена π-функция: [${pi.join(',')}]` });

    let j = 0;
    for (let i = 0; i < n; i++) {
      const ts = Array(n).fill('');
      tDone.forEach(p => { for (let k = p; k < p + m; k++) ts[k] = 'cb-done'; });

      steps.push({ line:[2,3], i, j, T, P, pi, found:[...found], tStates:[...ts], pStates:Array(m).fill(''),
        desc:`i=${i} T[i]='${T[i]}', j=${j} P[j]='${P[j]}'` });

      while (j > 0 && T[i] !== P[j]) {
        j = pi[j - 1];
        steps.push({ line:[3], i, j, T, P, pi, found:[...found], tStates:[...ts], pStates:Array(m).fill(''),
          desc:`Несовпадение, откат: j=pi[${j}]=${j}` });
      }

      if (T[i] === P[j]) {
        // mark match chars
        const ps2 = Array(m).fill('');
        for (let k = 0; k <= j; k++) ps2[k] = 'cb-match';
        ts[i] = 'cb-match';
        steps.push({ line:[4], i, j: j+1, T, P, pi, found:[...found], tStates:[...ts], pStates:ps2,
          desc:`Совпадение T[${i}]='${T[i]}'==P[${j}]='${P[j]}', j++ = ${j+1}` });
        j++;
      } else {
        ts[i] = 'cb-miss';
        steps.push({ line:[4], i, j, T, P, pi, found:[...found], tStates:[...ts], pStates:Array(m).fill('cb-miss'),
          desc:`Несовпадение T[${i}]='${T[i]}'!=P[${j}]='${P[j]}'` });
      }

      if (j === m) {
        const pos = i - m + 1;
        found.push(pos);
        tDone.add(pos);
        const ts2 = Array(n).fill('');
        tDone.forEach(p => { for (let k = p; k < p + m; k++) ts2[k] = 'cb-done'; });
        steps.push({ line:[5], i, j: pi[j-1], T, P, pi, found:[...found], tStates:[...ts2], pStates:Array(m).fill('cb-done'),
          desc:`<span class="ok">Найдено вхождение на позиции ${pos}!</span>` });
        j = pi[j - 1];
      }
    }

    const tsFinal = Array(n).fill('');
    tDone.forEach(p => { for (let k = p; k < p + m; k++) tsFinal[k] = 'cb-done'; });
    steps.push({ line:[], i:-1, j:0, T, P, pi, found:[...found], tStates:tsFinal, pStates:Array(m).fill(''),
      desc: found.length > 0 ? `Найдено ${found.length} вхождений: [${found.join(', ')}]` : 'Вхождений не найдено.' });
    return steps;
  }

  function renderRow(id, chars, states) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = chars.map((c, i) => {
      return `<span class="char-box ${states[i]||''}" style="position:relative">${c}<span class="idx">${i}</span></span>`;
    }).join('');
  }

  function applyStep(step) {
    renderRow('row-t', (step.T||'').split(''), step.tStates || []);
    renderRow('row-p', (step.P||'').split(''), step.pStates || []);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-i').textContent = step.i >= 0 ? step.i : '—';
    document.getElementById('cur-j').textContent = step.j >= 0 ? step.j : '—';
    document.getElementById('chips-found').innerHTML = (step.found||[]).map(p=>`<span class="chip c-black">${p}</span>`).join('') || '—';
    const piRow = document.getElementById('pi-row');
    if (piRow) piRow.innerHTML = (step.pi||[]).map((v,i) => `<span class="char-box ${i===step.j-1?'cb-active':''}" style="position:relative">${v}<span class="idx">${i}</span></span>`).join('');
  }

  function run() {
    const T = (document.getElementById('input-t').value || DEFAULT_T).slice(0, 24);
    const P = (document.getElementById('input-p').value || DEFAULT_P).slice(0, 10);
    const pi = (() => {
      const n = P.length; const arr = new Array(n).fill(0);
      for (let i = 1; i < n; i++) { let j = arr[i-1]; while (j>0&&P[i]!==P[j]) j=arr[j-1]; if(P[i]===P[j])j++; arr[i]=j; }
      return arr;
    })();
    const steps = buildSteps();
    VizAnim.init([
      { line:[], i:-1, j:0, T, P, pi, found:[], tStates:Array(T.length).fill(''), pStates:Array(P.length).fill(''), desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
