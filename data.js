// Flattens the CAUSE_TREE into a list of leaves, each annotated with its category/sub path.
function flattenLeaves(){
  const out = [];
  for(const cat of CAUSE_TREE){
    for(const sub of cat.subs){
      for(const leaf of sub.leaves){
        out.push({ ...leaf, catId:cat.id, catLabel:cat.label, subId:sub.id, subLabel:sub.label });
      }
    }
  }
  return out;
}
const ALL_LEAVES = flattenLeaves();

let CASE_COUNTER = 0;

const DIFFICULTIES = {
  easy:     { label:'Easy',     twoCauseChance:0.10, distractorRange:[2,4], budgetPad:2 },
  standard: { label:'Standard', twoCauseChance:0.28, distractorRange:[4,6], budgetPad:1 },
  hard:     { label:'Hard',     twoCauseChance:0.45, distractorRange:[6,9], budgetPad:0 }
};

function generateCase(seed, difficulty){
  difficulty = difficulty || 'standard';
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.standard;
  const rng = mulberry32(seed);
  CASE_COUNTER++;

  // How many true causes this crash has.
  const numCauses = rng() < diff.twoCauseChance ? 2 : 1;
  const correctLeaves = pickN(rng, ALL_LEAVES, numCauses);
  const correctIds = new Set(correctLeaves.map(l => l.id));

  // Pick some distractor leaves whose "negative" (ruled-out) evidence will appear.
  const pool = ALL_LEAVES.filter(l => !correctIds.has(l.id));
  const [dMin, dMax] = diff.distractorRange;
  const numDistractors = dMin + Math.floor(rng()*(dMax-dMin+1));
  const distractors = pickN(rng, pool, numDistractors);

  // Build evidence grouped by zone.
  const zoneEvidence = {};
  ZONES.forEach(z => zoneEvidence[z.id] = []);

  correctLeaves.forEach(leaf => {
    leaf.positive.forEach(ev => {
      const item = { ...ev, leafId:leaf.id, isKey:true };
      if(leaf.zone === 'witness') item.qOptionIndex = Math.floor(rng()*3);
      zoneEvidence[leaf.zone].push(item);
    });
  });
  distractors.forEach(leaf => {
    const item = { ...leaf.negative, leafId:leaf.id, isKey:false };
    if(leaf.zone === 'witness') item.qOptionIndex = Math.floor(rng()*3);
    zoneEvidence[leaf.zone].push(item);
  });

  const nonEmptyZones = ZONES.filter(z => zoneEvidence[z.id].length > 0);
  const actionBudget = Math.max(3, Math.min(8, nonEmptyZones.length - 1 + diff.budgetPad));

  // Flavor text
  const aircraftInfo = generateAircraftName(rng);
  const aircraftLabel = `${aircraftInfo.manufacturer} ${aircraftInfo.model}`;
  const airline = pick(rng, FLAVOR.airlines);
  const location = pick(rng, FLAVOR.locations);
  const phase = pick(rng, FLAVOR.phases);
  const outcome = pick(rng, FLAVOR.outcomes);
  const flightNum = 100 + Math.floor(rng()*880);

  const title = `${airline} Flight ${flightNum}`;
  const meta = `${aircraftLabel} · Incident occurred ${phase} · ${location[0].toUpperCase()+location.slice(1)}`;
  const brief = `${title} (a ${aircraftLabel} operated by ${airline}) experienced a serious in-flight event ${phase}, departing from ${location}. ${outcome} Investigators have recovered the flight data recorder, cockpit voice recorder, and wreckage for analysis. Your task: examine the evidence and determine the probable cause.`;

  // A witness/category-level hint, purchasable in-game for an extra action.
  const hintCategory = correctLeaves[0].catLabel;
  const hintText = `Investigators strongly suspect this falls under "${hintCategory}."`;

  return {
    uid: `case-${seed}-${CASE_COUNTER}`,
    seed,
    difficulty,
    title, meta, brief,
    zoneEvidence,
    actionBudget,
    correctLeafIds: [...correctIds],
    correctLeaves,
    hintText
  };
}

function todaySeed(){
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  return hashStringToSeed('blackbox-daily-' + key);
}
function randomSeed(){
  return Math.floor(Math.random()*2**31);
}
