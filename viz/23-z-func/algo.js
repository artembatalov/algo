document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_S = 'aabxaabaab';

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
      <label style="font-size:12px;color:var(--muted)">Строка S:</label>
      <input id="input-s" value="${DEFAULT_S}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:250px">
    </div>
    <div id="str-row" style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px;margin-bottom:16px"></div>
  `;

  VizCode.init([
    { id:0, html:'z[<span class="num">0</span>] = n; l = r = <span class="num">0</span>' },
    { id:1, html:'<span class="kw">for</span> i <span class="kw">in</span> [<span class="num">1</span>..n-<span class="num">1</span>]:' },
    { id:2, html:'  <span class="kw">if</span> i < r: z[i] = <span class="fn">min</span>(r-i, z[i-l])' },
    { id:3, html:'  <span class="kw">while</span> i+z[i] < n and S[z[i]] == S[i+z[i]]:' },
    { id:4, html:'    z[i]++' },
    { id:5, html:'  <span class="kw">if</span> i+z[i] > r: l=i; r=i+z[i]' },
  ]);

  function buildSteps() {
    const S = (document.getElementById('input-s').value || DEFAULT_S).slice(0, 18);
    const n = S.length;
    const z = new Array(n).fill(0);
    z[0] = n;
    let l = 0, r = 0;
    const steps = [];

    function states(i, ll, rr) {
      const st = Array(n).fill('');
      for (let k = ll; k < rr; k++) st[k] = 'cb-hash';
      if (i >= 0) st[i] = 'cb-active';
      return st;
    }

    steps.push({ line:[0], i:0, l, r, z:[...z], S, states: states(-1, l, r),
      desc:`z[0] = n = ${n}, l=0, r=0` });

    for (let i = 1; i < n; i++) {
      steps.push({ line:[1], i, l, r, z:[...z], S, states: states(i, l, r),
        desc:`i=${i}: l=${l}, r=${r}` });

      if (i < r) {
        z[i] = Math.min(r - i, z[i - l]);
        steps.push({ line:[2], i, l, r, z:[...z], S, states: states(i, l, r),
          desc:`i=${i} < r=${r}: z[${i}]=min(r-i=${r-i}, z[${i-l}]=${z[i]})=${z[i]}` });
      }

      while (i + z[i] < n && S[z[i]] === S[i + z[i]]) {
        z[i]++;
        steps.push({ line:[3,4], i, l, r, z:[...z], S, states: states(i, l, r),
          desc:`Расширяем: S[${z[i]-1}]='${S[z[i]-1]}'==S[${i+z[i]-1}]='${S[i+z[i]-1]}', z[${i}]=${z[i]}` });
      }

      if (i + z[i] > r) {
        l = i; r = i + z[i];
        steps.push({ line:[5], i, l, r, z:[...z], S, states: states(i, l, r),
          desc:`Обновляем Z-бокс: l=${l}, r=${r}, z[${i}]=${z[i]}` });
      }
    }

    steps.push({ line:[], i:-1, l, r, z:[...z], S, states: Array(n).fill('cb-done'),
      desc:`Z-функция: [${z.join(', ')}]` });
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

    const zEl = document.getElementById('z-row');
    if (zEl) {
      zEl.innerHTML = (step.z||[]).map((v,i) => {
        const cls = i === step.i ? 'cb-active' : (v > 0 ? 'cb-done' : '');
        return `<span class="char-box ${cls}" style="position:relative">${v===step.z?.[0]&&i===0?'n':v}<span class="idx">${i}</span></span>`;
      }).join('');
    }

    document.getElementById('cur-l').textContent = step.l ?? '—';
    document.getElementById('cur-r').textContent = step.r ?? '—';
  }

  function run() {
    const S = (document.getElementById('input-s').value || DEFAULT_S).slice(0, 18);
    const steps = buildSteps();
    VizAnim.init([
      { line:[], i:-1, l:0, r:0, z:Array(S.length).fill(0), S, states:Array(S.length).fill(''), desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
