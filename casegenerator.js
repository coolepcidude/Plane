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

function generateCase(seed){
  const rng = mulberry32(seed);
  CASE_COUNTER++;

  // How many true causes this crash has.
  const numCauses = rng() < 0.28 ? 2 : 1;
  const correctLeaves = pickN(rng, ALL_LEAVES, numCauses);
  const correctIds = new Set(correctLeaves.map(l => l.id));

  // Pick some distractor leaves whose "negative" (ruled-out) evidence will appear.
  const pool = ALL_LEAVES.filter(l => !correctIds.has(l.id));
  const numDistractors = 4 + Math.floor(rng()*3); // 4-6
  const distractors = pickN(rng, pool, numDistractors);

  // Build evidence grouped by zone.
  const zoneEvidence = {};
  ZONES.forEach(z => zoneEvidence[z.id] = []);

  correctLeaves.forEach(leaf => {
    leaf.positive.forEach(ev => {
      zoneEvidence[leaf.zone].push({ ...ev, leafId:leaf.id, isKey:true });
    });
  });
  distractors.forEach(leaf => {
    zoneEvidence[leaf.zone].push({ ...leaf.negative, leafId:leaf.id, isKey:false });
  });

  const nonEmptyZones = ZONES.filter(z => zoneEvidence[z.id].length > 0);
  const actionBudget = Math.max(4, Math.min(6, nonEmptyZones.length - 1));

  // Flavor text
  const aircraft = pick(rng, FLAVOR.aircraftTypes);
  const airline = pick(rng, FLAVOR.airlines);
  const location = pick(rng, FLAVOR.locations);
  const phase = pick(rng, FLAVOR.phases);
  const outcome = pick(rng, FLAVOR.outcomes);
  const flightNum = 100 + Math.floor(rng()*880);

  const title = `${airline} Flight ${flightNum}`;
  const meta = `${aircraft[0].toUpperCase()+aircraft.slice(1)} · Incident occurred ${phase} · ${location[0].toUpperCase()+location.slice(1)}`;
  const brief = `${title} (a ${aircraft} operated by ${airline}) experienced a serious in-flight event ${phase}, departing from ${location}. ${outcome} Investigators have recovered the flight data recorder, cockpit voice recorder, and wreckage for analysis. Your task: examine the evidence and determine the probable cause.`;

  return {
    uid: `case-${seed}-${CASE_COUNTER}`,
    seed,
    title, meta, brief,
    zoneEvidence,
    actionBudget,
    correctLeafIds: [...correctIds],
    correctLeaves
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
