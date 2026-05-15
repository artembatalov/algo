document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_S = 'aabaabaab';

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
      <label style="font-size:12px;color:var(--muted)">Строка S:</label>
      <input id="input-s" value="${DEFAULT_S}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:250px">
    </div>
    <div id="str-row" style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:16px"></div>
    <div id="pi-display" style="font-size:11px;color:var(--muted);margin-top:8px">π: —</div>
  `;

  VizCode.init([
    { id:0, html:'pi[<span class="num">0</span>] = <span class="num">0</span>' },
    { id:1, html:'<span class="kw">for</span> i <span class="kw">in</span> [<span class="num">1</span>..n-<span class="num">1</span>]:' },
    { id:2, html:'  j = pi[i-<span class="num">1</span>]' },
    { id:3, html:'  <span class="kw">while</span> j > <span class="num">0</span> and S[i] != S[j]:' },
    { id:4, html:'    j = pi[j-<span class="num">1</span>]' },
    { id:5, html:'  <span class="kw">if</span> S[i] == S[j]: j++' },
    { id:6, html:'  pi[i] = j' },
  ]);

  function buildSteps() {
    const S = (document.getElementById('input-s').value || DEFAULT_S).slice(0, 20);
    const n = S.length;
    const pi = new Array(n).fill(0);
    const steps = [];

    function charStates(i, j, done) {
      const st = Array(n).fill('');
      for (let k = 0; k < done; k++) st[k] = 'cb-done';
      if (i >= 0) st[i] = 'cb-active';
      if (j >= 0 && j !== i) st[j] = 'cb-hash';
      return st;
    }

    steps.push({ line:[0], i:-1, j:-1, pi:[...pi], S,
      states: Array(n).fill(''), desc:`pi[0] = 0` });

    for (let i = 1; i < n; i++) {
      let j = pi[i - 1];
      steps.push({ line:[1,2], i, j, pi:[...pi], S,
        states: charStates(i, j, i),
        desc:`i=${i}, j=pi[${i-1}]=${j}, сравниваем S[${i}]='${S[i]}' и S[${j}]='${S[j]}'` });

      while (j > 0 && S[i] !== S[j]) {
        j = pi[j - 1];
        steps.push({ line:[3,4], i, j, pi:[...pi], S,
          states: charStates(i, j, i),
          desc:`S[${i}]!= S[prev j], откатываем j=pi[j-1]=${j}` });
      }

      if (S[i] === S[j]) {
        j++;
        steps.push({ line:[5], i, j, pi:[...pi], S,
          states: charStates(i, j-1, i),
          desc:`S[${i}]='${S[i]}' == S[${j-1}]='${S[j-1]}', j++ = ${j}` });
      }

      pi[i] = j;
      steps.push({ line:[6], i, j, pi:[...pi], S,
        states: charStates(i, -1, i+1),
        desc:`pi[${i}] = ${j}` });
    }

    steps.push({ line:[], i:-1, j:-1, pi:[...pi], S, states:Array(n).fill('cb-done'),
      desc:`Готово! π = [${pi.join(', ')}]` });
    return steps;
  }

  function renderStr(S, states) {
    const row = document.getElementById('str-row');
    if (!row) return;
    row.innerHTML = S.split('').map((c, i) => {
      return `<span class="char-box ${states[i]||''}" style="position:relative">${c}<span class="idx">${i}</span></span>`;
    }).join('');
  }

  function applyStep(step) {
    renderStr(step.S || DEFAULT_S, step.states || []);
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');

    // pi row
    const piEl = document.getElementById('pi-row');
    if (piEl) {
      piEl.innerHTML = (step.pi||[]).map((v,i) => {
        const cls = i === step.i ? 'cb-active' : (v > 0 ? 'cb-done' : '');
        return `<span class="char-box ${cls}" style="position:relative">${v}<span class="idx">${i}</span></span>`;
      }).join('');
    }

    document.getElementById('cur-i').textContent = step.i >= 0 ? step.i : '—';
    document.getElementById('cur-j').textContent = step.j >= 0 ? step.j : '—';
    document.getElementById('pi-display').textContent = `π: [${(step.pi||[]).join(', ')}]`;
  }

  function run() {
    const S = (document.getElementById('input-s').value || DEFAULT_S).slice(0, 20);
    const steps = buildSteps();
    VizAnim.init([
      { line:[], i:-1, j:-1, pi:Array(S.length).fill(0), S, states:Array(S.length).fill(''), desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
