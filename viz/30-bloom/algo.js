document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const M = 20; // bit array size
  const K = 3;  // number of hash functions

  // k hash functions
  function hashes(word) {
    const h = [];
    let v = 0;
    for (const c of word) v = (v * 31 + c.charCodeAt(0)) & 0x7fffffff;
    h.push(((v * 2654435761) >>> 0) % M);
    h.push(((v * 1000003) >>> 0) % M);
    h.push(((v * 6364136223846793005n) ? Math.abs(v * 2246822519 | 0) : Math.abs(v * 374761393 | 0)) % M);
    return h;
  }

  const DEFAULT_INSERT = ['apple', 'bloom', 'cat', 'dog'];
  const DEFAULT_QUERY  = ['apple', 'bloom', 'xyz', 'test'];

  const canvas = document.getElementById('str-canvas');
  canvas.innerHTML = `
    <div style="margin-bottom:12px;font-size:11px;color:var(--muted)">
      m=${M} бит, k=${K} хэш-функции
    </div>
    <div style="margin-bottom:8px;font-size:11px;color:var(--muted)">Битовый массив:</div>
    <div id="bit-row" class="bit-row" style="margin-bottom:20px"></div>
    <div style="margin-bottom:4px;font-size:11px;color:var(--muted)">Индексы:</div>
    <div id="idx-row" style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:16px"></div>
  `;

  VizCode.init([
    { id:0, html:'<span class="kw">function</span> <span class="fn">insert</span>(word):' },
    { id:1, html:'  <span class="kw">for</span> i <span class="kw">in</span> [<span class="num">1</span>..k]:' },
    { id:2, html:'    bits[h_i(word)] = <span class="num">1</span>' },
    { id:3, html:'' },
    { id:4, html:'<span class="kw">function</span> <span class="fn">query</span>(word):' },
    { id:5, html:'  <span class="kw">for</span> i <span class="kw">in</span> [<span class="num">1</span>..k]:' },
    { id:6, html:'    <span class="kw">if</span> bits[h_i(word)] == <span class="num">0</span>: <span class="kw">return</span> false' },
    { id:7, html:'  <span class="kw">return</span> <span class="cm">maybe true</span>  <span class="cm">// ложно-полож.!</span>' },
  ]);

  function buildSteps() {
    const bits = new Array(M).fill(0);
    const insertedWords = new Set();
    const steps = [];

    function renderBits(activeBits, mode) {
      return bits.map((b, i) => {
        if (activeBits && activeBits.includes(i)) {
          return mode === 'insert' ? (b ? 'bit-1' : 'bit-active') : (b ? 'bit-found' : 'bit-active');
        }
        return b ? 'bit-1' : '';
      });
    }

    // Insert phase
    for (const word of DEFAULT_INSERT) {
      const hs = hashes(word);
      steps.push({ line:[0,1], bits:[...bits], word, op:'insert', hashes:hs, bitClasses: renderBits(null),
        desc:`Вставляем "<b>${word}</b>": хэши = [${hs.join(', ')}]` });

      for (const h of hs) {
        steps.push({ line:[1,2], bits:[...bits], word, op:'insert', hashes:hs, activeBits:[h], bitClasses: renderBits([h],'insert'),
          desc:`Устанавливаем бит[${h}] = 1` });
        bits[h] = 1;
        steps.push({ line:[2], bits:[...bits], word, op:'insert', hashes:hs, activeBits:[h], bitClasses: renderBits([h],'insert'),
          desc:`Бит[${h}] = 1 ✓` });
      }

      insertedWords.add(word);
      steps.push({ line:[2], bits:[...bits], word, op:'insert', hashes:hs, bitClasses: renderBits(hs,'insert'),
        desc:`"<b>${word}</b>" вставлен.` });
    }

    // Query phase
    for (const word of DEFAULT_QUERY) {
      const hs = hashes(word);
      const truePositive = insertedWords.has(word);
      steps.push({ line:[4,5], bits:[...bits], word, op:'query', hashes:hs, bitClasses: renderBits(null),
        desc:`Запрос "<b>${word}</b>": хэши = [${hs.join(', ')}]${truePositive?'':`  (не вставлялось!)`}` });

      let allSet = true;
      for (const h of hs) {
        steps.push({ line:[5,6], bits:[...bits], word, op:'query', hashes:hs, activeBits:[h], bitClasses: renderBits([h],'query'),
          desc:`Проверяем бит[${h}] = ${bits[h]}` });
        if (!bits[h]) {
          allSet = false;
          steps.push({ line:[6], bits:[...bits], word, op:'query', hashes:hs, bitClasses: renderBits(hs,'query'), result:'not-found',
            desc:`Бит[${h}] = 0 → <span class="ok">Слова НЕТ</span> (точно)` });
          break;
        }
      }

      if (allSet) {
        const fp = !truePositive;
        steps.push({ line:[7], bits:[...bits], word, op:'query', hashes:hs, bitClasses: renderBits(hs,'query'), result: fp ? 'fp' : 'found',
          desc: fp
            ? `<span class="warn">Ложноположительный результат!</span> Все биты=1, но "${word}" не вставлялось`
            : `<span class="ok">Слово "${word}" вероятно присутствует</span> (все биты=1)` });
      }
    }

    steps.push({ line:[], bits:[...bits], word:'', op:'done', hashes:[], bitClasses: renderBits(null),
      desc:`Демонстрация завершена.` });
    return steps;
  }

  function applyStep(step) {
    // Render bit array
    const bitRow = document.getElementById('bit-row');
    const idxRow = document.getElementById('idx-row');
    if (bitRow) {
      bitRow.innerHTML = (step.bits||[]).map((b, i) => {
        const cls = step.bitClasses ? step.bitClasses[i] : (b ? 'bit-1' : '');
        return `<span class="bit ${cls}">${b}</span>`;
      }).join('');
    }
    if (idxRow) {
      idxRow.innerHTML = (step.bits||[]).map((_, i) =>
        `<span style="width:28px;text-align:center;font-size:9px;color:var(--muted)">${i}</span>`
      ).join('');
    }

    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('cur-op').textContent = step.op === 'insert' ? 'Вставка' : step.op === 'query' ? 'Запрос' : '—';
    document.getElementById('chips-hashes').innerHTML = (step.hashes||[]).map(h=>`<span class="chip c-accent">${h}</span>`).join('') || '—';

    const resultEl = document.getElementById('result-chip');
    if (step.result === 'found') {
      resultEl.textContent = 'Присутствует';
      resultEl.className = 'chip c-black';
    } else if (step.result === 'not-found') {
      resultEl.textContent = 'Отсутствует';
      resultEl.className = 'chip c-white';
    } else if (step.result === 'fp') {
      resultEl.textContent = 'Ложноположит.!';
      resultEl.className = 'chip c-red';
    } else {
      resultEl.textContent = '—';
      resultEl.className = 'chip c-black';
    }
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init([
      { line:[], bits:new Array(M).fill(0), word:'', op:'', hashes:[], bitClasses:new Array(M).fill(''), result:'', desc:'Готово к запуску.' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
