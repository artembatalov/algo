document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const DEFAULT_T = 'abracadabra';
  const DEFAULT_P = 'abra';
  const BASE = 31, MOD = 1e9 + 9;

  // Build string canvas UI
  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="font-size:12px;color:var(--muted)">Текст T:</label>
      <input id="input-t" value="${DEFAULT_T}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:200px">
      <label style="font-size:12px;color:var(--muted)">Паттерн P:</label>
      <input id="input-p" value="${DEFAULT_P}" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-family:monospace;font-size:13px;width:120px">
    </div>
    <div id="row-t" style="margin-bottom:28px"></div>
    <div id="row-p" style="margin-bottom:28px"></div>
    <div id="row-hash" style="font-size:11px;color:var(--muted);min-height:20px"></div>
  `;

  VizCode.init([
    { id:0, html:'hP = <span class="fn">hash</span>(P)' },
    { id:1, html:'hW = <span class="fn">hash</span>(T[<span class="num">0</span>..m-<span class="num">1</span>])' },
    { id:2, html:'<span class="kw">for</span> i <span class="kw">in</span> [<span class="num">0</span>..n-m]:' },
    { id:3, html:'  <span class="kw">if</span> hW == hP:' },
    { id:4, html:'    <span class="kw">if</span> T[i..i+m] == P: found!' },
    { id:5, html:'  <span class="cm">// rolling hash</span>' },
    { id:6, html:'  hW = (hW - T[i]*p^(m-1)) * base + T[i+m]' },
  ]);

  function hashStr(s) {
    let h = 0, pw = 1;
    for (let i = 0; i < s.length; i++) {
      h = (h + (s.charCodeAt(i) - 96) * pw) % MOD;
      pw = (pw * BASE) % MOD;
    }
    return h;
  }

  function renderStringRow(containerId, chars, states, ptrs) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = chars.map((c, i) => {
      const st = states[i] || '';
      const ptr = ptrs && ptrs[i] ? `<span class="char-ptr" style="color:var(--accent2)">${ptrs[i]}</span>` : '';
      const idxEl = `<span class="idx">${i}</span>`;
      return `<span class="char-box ${st}" style="position:relative">${ptr}${c}${idxEl}</span>`;
    }).join('');
  }

  function buildSteps() {
    const T = document.getElementById('input-t').value || DEFAULT_T;
    const P = document.getElementById('input-p').value || DEFAULT_P;
    const n = T.length, m = P.length;
    const steps = [];
    const found = [];

    const hP = hashStr(P);
    steps.push({ line:[0,1], tStates: Array(n).fill(''), pStates: Array(m).fill(''), i:-1,
      hashW: hashStr(T.slice(0, m)), hashP: hP, found:[], desc:`hash(P)=${hP}` });

    let hW = hashStr(T.slice(0, m));

    for (let i = 0; i <= n - m; i++) {
      const tS = Array(n).fill('');
      for (let k = i; k < i + m; k++) tS[k] = 'cb-hash';

      steps.push({ line:[2,3], tStates:tS, pStates:Array(m).fill('cb-hash'), i,
        hashW: hW, hashP: hP, found:[...found],
        desc:`i=${i}: hash(окно)=${hW} vs hash(P)=${hP}` });

      if (hW === hP) {
        // Verify character by character
        let ok = true;
        const tV = [...tS], pV = Array(m).fill('');
        for (let k = 0; k < m; k++) {
          if (T[i+k] === P[k]) {
            tV[i+k] = 'cb-match'; pV[k] = 'cb-match';
          } else {
            tV[i+k] = 'cb-miss'; pV[k] = 'cb-miss';
            ok = false; break;
          }
        }
        steps.push({ line:[4], tStates:tV, pStates:pV, i, hashW: hW, hashP: hP, found:[...found],
          desc: ok ? `<span class="ok">Совпадение на позиции ${i}!</span>` : `Ложное совпадение на i=${i}, проверка символов` });
        if (ok) found.push(i);
      }

      if (i < n - m) {
        // rolling hash (simplified: just recompute for clarity)
        hW = hashStr(T.slice(i+1, i+1+m));
        steps.push({ line:[6], tStates:tS, pStates:Array(m).fill(''), i,
          hashW: hW, hashP: hP, found:[...found],
          desc:`Скользящий хэш: hash(T[${i+1}..${i+m}])=${hW}` });
      }
    }

    steps.push({ line:[], tStates: found.flatMap(p => Array.from({length:n},(_,i)=>found.includes(i-p+p)?'':'').map((_, i) => {
        for (const pos of found) { if (i >= pos && i < pos+m) return 'cb-done'; }
        return '';
      })), pStates: Array(m).fill('cb-done'), i:-1,
      hashW: hW, hashP: hP, found:[...found],
      desc: found.length > 0 ? `Найдено ${found.length} вхождений: позиции [${found.join(', ')}]` : 'Вхождений не найдено.' });

    return { T, P, steps };
  }

  function applyStep(step) {
    const T = document.getElementById('input-t').value || DEFAULT_T;
    const P = document.getElementById('input-p').value || DEFAULT_P;
    renderStringRow('row-t', T.split(''), step.tStates || [], { [step.i]: 'i' });
    renderStringRow('row-p', P.split(''), step.pStates || []);
    document.getElementById('row-t').style.cssText = 'display:flex;gap:3px;align-items:flex-end;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px';
    document.getElementById('row-p').style.cssText = 'display:flex;gap:3px;align-items:flex-end;flex-wrap:nowrap;overflow-x:auto;padding-bottom:18px';
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-hash').textContent = step.hashW ?? '—';
    document.getElementById('pat-hash').textContent = step.hashP ?? '—';
    document.getElementById('chips-found').innerHTML = (step.found||[]).map(p=>`<span class="chip c-black">${p}</span>`).join('') || '—';
  }

  function run() {
    const { T, P, steps } = buildSteps();
    VizAnim.init([
      { line:[], tStates:Array(T.length).fill(''), pStates:Array(P.length).fill(''), i:-1, hashW:null, hashP:null, found:[], desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
