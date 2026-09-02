let state = {
  screen: 'intro',
  caseNum: 0,          // how many cases completed
  totalScore: 0,        // sum of per-case accuracy (0..1)
  currentCase: null,
  searchedZones: {},    // zoneId -> true
  actionsUsed: 0,
  selectedLeaves: new Set(),
  openCats: {},
  submitted: false,
  lastResult: null
};

function startCase(seed){
  state.currentCase = generateCase(seed);
  state.caseDisplayNum = state.caseNum + 1;
  state.searchedZones = {};
  state.actionsUsed = 0;
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
  return `
    <div class="header">
      <h1>✈ BLACK BOX</h1>
      <div class="sub">CRASH INVESTIGATION UNIT</div>
    </div>
    <div class="panel intro" data-tag="BRIEFING">
      <p>You're a lead investigator. Every case is generated fresh — real wreckage, real recorders, real dead ends. You have a <b style="color:var(--amber)">limited number of search actions</b> per case, so choose which parts of the wreckage to investigate carefully: cockpit recorders, the engine, the airframe, maintenance history, weather, ATC transcripts, or the lab.</p>
      <p>Some crashes have a <b style="color:var(--amber)">single root cause</b>. Others have <b style="color:var(--amber)">multiple contributing causes</b> — you'll need to select all of them from the cause tree to close the file. There is no end to the case list; a new file lands on your desk every time you finish one.</p>
      <div class="seed-row">
        <button class="btn" id="dailyBtn">OPEN TODAY'S CASE →</button>
        <button class="btn secondary" id="randomBtn">RANDOM CASE →</button>
      </div>
    </div>
  `;
}
function attachIntro(){
  document.getElementById('dailyBtn').onclick = () => startCase(todaySeed());
  document.getElementById('randomBtn').onclick = () => startCase(randomSeed());
}

// ---------------- CASE SCREEN ----------------
function caseHTML(){
  const c = state.currentCase;
  const remaining = c.actionBudget - state.actionsUsed;

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
    `;
  }

  return `
    <div class="header">
      <h1>✈ BLACK BOX</h1>
      <div class="sub">CASE FILE #${state.caseDisplayNum} <span class="mode-tag">${c.seed === todaySeed() ? 'DAILY' : 'RANDOM'}</span></div>
      <div class="statline">
        <span>CASES CLOSED: <b>${state.caseNum}</b></span>
        <span>AVG ACCURACY: <b>${state.caseNum>0 ? Math.round((state.totalScore/state.caseNum)*100) : 0}%</b></span>
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
      ${findingsHTML ? `<div class="findings-list">${findingsHTML}</div>` : ''}
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
      state.caseNum++;
      state.totalScore += clampedAcc;
      render();
    };
  }

  const nextBtn = document.getElementById('nextBtn');
  if(nextBtn){
    nextBtn.onclick = () => startCase(randomSeed());
  }
}

render();
