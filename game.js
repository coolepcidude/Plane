// ---------------- Persistence ----------------
const SAVE_KEY = 'blackbox_investigator_save_v1';

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) throw new Error('none');
    const parsed = JSON.parse(raw);
    return Object.assign({
      casesClosed:0, totalScore:0, streak:0, bestStreak:0, history:[]
    }, parsed);
  }catch(e){
    return { casesClosed:0, totalScore:0, streak:0, bestStreak:0, history:[] };
  }
}
function saveSave(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){ /* storage unavailable, ignore */ }
}

let save = loadSave();

function computeRank(){
  const avg = save.casesClosed > 0 ? save.totalScore / save.casesClosed : 0;
  const n = save.casesClosed;
  if(n >= 60 && avg >= 0.75) return 'CHIEF INVESTIGATOR';
  if(n >= 30 && avg >= 0.65) return 'SENIOR INVESTIGATOR';
  if(n >= 15 && avg >= 0.55) return 'FIELD INVESTIGATOR';
  if(n >= 5  && avg >= 0.40) return 'JUNIOR INVESTIGATOR';
  return 'TRAINEE INVESTIGATOR';
}

// ---------------- Game state ----------------
let state = {
  screen: 'intro',
  difficulty: 'standard',
  currentCase: null,
  caseDisplayNum: 0,
  searchedZones: {},
  actionsUsed: 0,
  hintUsed: false,
  selectedLeaves: new Set(),
  openCats: {},
  submitted: false,
  lastResult: null
};

function startCase(seed){
  state.currentCase = generateCase(seed, state.difficulty);
  state.caseDisplayNum = save.casesClosed + 1;
  state.searchedZones = {};
  state.actionsUsed = 0;
  state.hintUsed = false;
  state.selectedLeaves = new Set();
  state.openCats = {};
  state.submitted = false;
  state.lastResult = null;
  state.screen = 'case';
  render();
}

function render(){
  const app = document.getElementById('app');
  if(state.screen === 'intro'){ app.innerHTML = introHTML(); attachIntro(); return; }
  app.innerHTML = caseHTML();
  attachCase();
}

// ---------------- INTRO ----------------
function introHTML(){
  const rank = computeRank();
  const avgPct = save.casesClosed > 0 ? Math.round((save.totalScore/save.casesClosed)*100) : 0;

  const diffButtons = Object.keys(DIFFICULTIES).map(key=>{
    const d = DIFFICULTIES[key];
    const active = state.difficulty === key;
    return `<button class="diff-btn ${active?'active':''}" data-diff="${key}">${d.label}</button>`;
  }).join('');

  const historyRows = save.history.slice(-8).reverse().map(h=>`
    <div class="history-row">
      <span class="hr-title">${h.title}</span>
      <span class="hr-acc ${h.accuracy===1?'full':(h.accuracy>0?'partial':'none')}">${Math.round(h.accuracy*100)}%</span>
    </div>
  `).join('');

  return `
    <div class="header">
      <h1>✈ BLACK BOX</h1>
      <div class="sub">CRASH INVESTIGATION UNIT</div>
    </div>

    <div class="panel" data-tag="YOUR RECORD">
      <div class="rank-row">
        <div>
          <div class="rank-badge">${rank}</div>
          <div class="case-meta" style="margin-top:6px;">${save.casesClosed} case(s) closed · ${avgPct}% avg accuracy</div>
        </div>
        <div class="streak-box">
          <div class="streak-num">${save.streak}</div>
          <div class="streak-label">current streak</div>
        </div>
      </div>
      ${save.history.length ? `<div class="history-list">${historyRows}</div>` : ''}
      ${save.casesClosed>0 ? `<button class="btn secondary small" id="resetBtn">RESET RECORD</button>` : ''}
    </div>

    <div class="panel intro" data-tag="BRIEFING">
      <p>You're a lead investigator. Every case is generated fresh — real wreckage, real recorders, real dead ends. You have a <b style="color:var(--amber)">limited number of search actions</b> per case, so choose which parts of the wreckage to investigate carefully: cockpit recorders, the engine, the airframe, maintenance history, weather, ATC transcripts, witness statements, the load sheet, or the lab.</p>
      <p>Some crashes have a <b style="color:var(--amber)">single root cause</b>. Others have <b style="color:var(--amber)">multiple contributing causes</b> — select all of them from the cause tree to close the file. If you're stuck, you can burn an action for a category hint. There is no end to the case list — a new file lands on your desk every time you finish one.</p>

      <div class="diff-row">
        <span class="diff-label">DIFFICULTY:</span>
        ${diffButtons}
      </div>

      <div class="seed-row">
        <button class="btn" id="dailyBtn">OPEN TODAY'S CASE →</button>
        <button class="btn secondary" id="randomBtn">RANDOM CASE →</button>
      </div>
    </div>
  `;
}
function attachIntro(){
  document.querySelectorAll('.diff-btn').forEach(btn=>{
    btn.onclick = () => { state.difficulty = btn.dataset.diff; render(); };
  });
  document.getElementById('dailyBtn').onclick = () => startCase(todaySeed());
  document.getElementById('randomBtn').onclick = () => startCase(randomSeed());
  const resetBtn = document.getElementById('resetBtn');
  if(resetBtn){
    resetBtn.onclick = () => {
      if(confirm('Clear your investigator record? This cannot be undone.')){
        save = { casesClosed:0, totalScore:0, streak:0, bestStreak:0, history:[] };
        saveSave();
        render();
      }
    };
  }
}

// ---------------- CASE SCREEN ----------------
function caseHTML(){
  const c = state.currentCase;
  const remaining = c.actionBudget - state.actionsUsed;
  const diffLabel = DIFFICULTIES[c.difficulty] ? DIFFICULTIES[c.difficulty].label : 'Standard';

  const pips = Array.from({length:c.actionBudget}).map((_,i)=>{
    const used = i < state.actionsUsed;
    return `<div class="pip ${used?'used':'available'}"></div>`;
  }).join('');

  const zoneCards = ZONES.map(z=>{
    const searched = !!state.searchedZones[z.id];
    const disabled = !searched && remaining <= 0;
    return `
      <div class="zone-card ${searched?'searched':''} ${disabled?'disabled':''}" data-zone="${z.id}">
        <div class="ico">${z.ico}</div>
        <div class="label">${z.label}</div>
        <div class="prompt">${searched ? 'searched' : (disabled ? 'no actions left' : 'tap to search')}</div>
      </div>
    `;
  }).join('');

  const findingsHTML = Object.keys(state.searchedZones).map(zoneId=>{
    const z = ZONES.find(zz=>zz.id===zoneId);
    const items = c.zoneEvidence[zoneId];
    if(items.length === 0){
      return `<div class="finding-item empty"><div class="flabel">${z.ico} ${z.label}</div>No anomalies found in this area.</div>`;
    }
    return items.map(it=>`
      <div class="finding-item"><div class="flabel">${z.ico} ${it.label}</div>${it.detail}</div>
    `).join('');
  }).join('');

  const hintBlock = state.hintUsed
    ? `<div class="finding-item hint"><div class="flabel">💡 Investigator's Hunch</div>${c.hintText}</div>`
    : '';

  const treeHTML = CAUSE_TREE.map(cat=>{
    const isOpen = !!state.openCats[cat.id];
    const catSelCount = cat.subs.reduce((sum,sub)=> sum + sub.leaves.filter(l=>state.selectedLeaves.has(l.id)).length, 0);
    const subsHTML = cat.subs.map(sub=>{
      const leavesHTML = sub.leaves.map(leaf=>{
        const checked = state.selectedLeaves.has(leaf.id);
        return `
          <label class="tree-leaf ${checked?'checked':''}" data-leaf="${leaf.id}">
            <input type="checkbox" ${checked?'checked':''} ${state.submitted?'disabled':''}/>
            <span>${leaf.label}</span>
          </label>
        `;
      }).join('');
      return `<div class="tree-sub"><div class="tree-sub-head">${sub.label}</div>${leavesHTML}</div>`;
    }).join('');
    return `
      <div class="tree-category">
        <div class="tree-cat-head ${isOpen?'open':''}" data-cat="${cat.id}">
          <span><span class="arrow">▶</span> ${cat.label}</span>
          ${catSelCount>0 ? `<span class="tree-cat-count">${catSelCount}</span>` : ''}
        </div>
        <div class="tree-cat-body ${isOpen?'open':''}">${subsHTML}</div>
      </div>
    `;
  }).join('');

  let resultBlock = '';
  if(state.submitted){
    const r = state.lastResult;
    let cls = 'wrong', bigText = 'CASE CLOSED — INCORRECT';
    if(r.accuracy === 1) { cls='correct'; bigText='CASE CLOSED — FULLY SOLVED'; }
    else if(r.accuracy > 0){ cls='partial'; bigText='CASE CLOSED — PARTIALLY SOLVED'; }

    const rows = [];
    r.hits.forEach(leaf=>{
      rows.push(`<div class="verdict-row hit"><span class="mark">✅</span><div><b>${leaf.label}</b> — confirmed. Investigation found: ${leaf.blurb}.</div></div>`);
    });
    r.misses.forEach(leaf=>{
      rows.push(`<div class="verdict-row miss"><span class="mark">❌</span><div><b>${leaf.label}</b> — you missed this. Investigation found: ${leaf.blurb}.</div></div>`);
    });
    r.falsePositives.forEach(leaf=>{
      rows.push(`<div class="verdict-row falsepos"><span class="mark">⚠️</span><div><b>${leaf.label}</b> — ruled out. This was not a factor in this crash.</div></div>`);
    });

    resultBlock = `
      <div class="result-banner ${cls}">
        <div class="big">${bigText}</div>
        <div>${r.hits.length}/${r.hits.length + r.misses.length} true cause(s) identified${r.falsePositives.length ? `, ${r.falsePositives.length} incorrect accusation(s)` : ''}.</div>
      </div>
      <div class="panel" data-tag="OFFICIAL VERDICT">
        <div class="verdict-review">${rows.join('')}</div>
      </div>
      <button class="btn" id="nextBtn">NEXT CASE →</button>
      <button class="btn secondary" id="menuBtn">BACK TO DESK</button>
    `;
  }

  return `
    <div class="header">
      <h1>✈ BLACK BOX</h1>
      <div class="sub">CASE FILE #${state.caseDisplayNum} <span class="mode-tag">${diffLabel}</span> <span class="mode-tag">${c.seed === todaySeed() ? 'DAILY' : 'RANDOM'}</span></div>
      <div class="statline">
        <span>CASES CLOSED: <b>${save.casesClosed}</b></span>
        <span>AVG ACCURACY: <b>${save.casesClosed>0 ? Math.round((save.totalScore/save.casesClosed)*100) : 0}%</b></span>
        <span>STREAK: <b>${save.streak}</b></span>
      </div>
    </div>

    <div class="panel" data-tag="INCIDENT SUMMARY">
      <div class="case-title">${c.title}</div>
      <div class="case-meta">${c.meta}</div>
      <div class="brief">${c.brief}</div>
    </div>

    <div class="panel" data-tag="WRECKAGE & EVIDENCE">
      <div class="budget-row">
        <span>Search actions remaining: <b style="color:var(--amber)">${remaining}</b> / ${c.actionBudget}</span>
        <div class="budget-pips">${pips}</div>
      </div>
      <div class="zone-grid">${zoneCards}</div>
      ${(!state.hintUsed && !state.submitted) ? `<button class="btn secondary small" id="hintBtn" ${remaining<=0?'disabled':''}>USE 1 ACTION FOR A HINT</button>` : ''}
      ${findingsHTML || hintBlock ? `<div class="findings-list">${hintBlock}${findingsHTML}</div>` : ''}
    </div>

    ${!state.submitted ? `
    <div class="panel" data-tag="FILE YOUR VERDICT — SELECT ALL CAUSES">
      <div class="tree">${treeHTML}</div>
      <button class="btn" id="submitBtn" ${state.selectedLeaves.size===0?'disabled':''}>CLOSE THE FILE</button>
    </div>
    ` : resultBlock}
  `;
}

function attachCase(){
  const c = state.currentCase;

  document.querySelectorAll('.zone-card').forEach(card=>{
    card.onclick = () => {
      const zoneId = card.dataset.zone;
      if(state.searchedZones[zoneId]) return;
      const remaining = c.actionBudget - state.actionsUsed;
      if(remaining <= 0) return;
      state.searchedZones[zoneId] = true;
      state.actionsUsed++;
      render();
    };
  });

  const hintBtn = document.getElementById('hintBtn');
  if(hintBtn){
    hintBtn.onclick = () => {
      const remaining = c.actionBudget - state.actionsUsed;
      if(remaining <= 0) return;
      state.hintUsed = true;
      state.actionsUsed++;
      render();
    };
  }

  document.querySelectorAll('.tree-cat-head').forEach(head=>{
    head.onclick = () => {
      const catId = head.dataset.cat;
      state.openCats[catId] = !state.openCats[catId];
      render();
    };
  });

  document.querySelectorAll('.tree-leaf').forEach(leafEl=>{
    leafEl.onclick = (e) => {
      if(state.submitted) return;
      e.preventDefault();
      const leafId = leafEl.dataset.leaf;
      if(state.selectedLeaves.has(leafId)) state.selectedLeaves.delete(leafId);
      else state.selectedLeaves.add(leafId);
      render();
    };
  });

  const submitBtn = document.getElementById('submitBtn');
  if(submitBtn){
    submitBtn.onclick = () => {
      if(state.selectedLeaves.size === 0) return;
      const correctIds = new Set(c.correctLeafIds);
      const selected = state.selectedLeaves;

      const hits = c.correctLeaves.filter(l => selected.has(l.id));
      const misses = c.correctLeaves.filter(l => !selected.has(l.id));
      const falsePositives = ALL_LEAVES.filter(l => selected.has(l.id) && !correctIds.has(l.id));

      const accuracy = hits.length / (c.correctLeaves.length + falsePositives.length * 0.5);
      const clampedAcc = Math.max(0, Math.min(1, accuracy));

      state.lastResult = { hits, misses, falsePositives, accuracy: clampedAcc };
      state.submitted = true;

      save.casesClosed++;
      save.totalScore += clampedAcc;
      save.streak = clampedAcc === 1 ? save.streak + 1 : 0;
      save.bestStreak = Math.max(save.bestStreak, save.streak);
      save.history.push({ title:c.title, accuracy:clampedAcc, date:Date.now() });
      if(save.history.length > 50) save.history = save.history.slice(-50);
      saveSave();

      render();
    };
  }

  const nextBtn = document.getElementById('nextBtn');
  if(nextBtn){
    nextBtn.onclick = () => startCase(randomSeed());
  }
  const menuBtn = document.getElementById('menuBtn');
  if(menuBtn){
    menuBtn.onclick = () => { state.screen = 'intro'; render(); };
  }
}

render();
