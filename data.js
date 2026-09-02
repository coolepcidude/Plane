// ---------- Seeded RNG ----------
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToSeed(str){
  let h = 1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0);
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function pickN(rng, arr, n){
  const copy = arr.slice();
  const out = [];
  n = Math.min(n, copy.length);
  for(let i=0;i<n;i++){
    const idx = Math.floor(rng()*copy.length);
    out.push(copy.splice(idx,1)[0]);
  }
  return out;
}

// ---------- Investigation zones ----------
const ZONES = [
  { id:'cockpit',    label:'Cockpit Recorders',   ico:'🎙️' },
  { id:'engine',     label:'Engine & Powerplant',  ico:'🔥' },
  { id:'structure',  label:'Airframe & Structure', ico:'🛠️' },
  { id:'maintenance',label:'Maintenance Records',  ico:'📋' },
  { id:'weather',    label:'Weather Archive',      ico:'🌦️' },
  { id:'atc',        label:'ATC Transcript',       ico:'📡' },
  { id:'forensics',  label:'Lab & Forensics',      ico:'🧪' },
  { id:'witness',    label:'Witness Statements',   ico:'🗣️' },
  { id:'cargo',      label:'Cargo & Load Sheet',   ico:'📦' }
];

// ---------- Flavor text pools ----------
const FLAVOR = {
  aircraftTypes: [
    'regional jet','narrow-body airliner','wide-body airliner','twin-engine turboprop',
    'cargo freighter','business jet','commuter turboprop'
  ],
  airlines: [
    'Meridian Air','Northline Airways','Falcon Regional','Continental Skyways',
    'Harborview Cargo','Vantage Air','Coastal Express Air','Summit Airlines'
  ],
  locations: [
    'a coastal airport','a mountain-region airfield','a major international hub',
    'a regional airstrip','an island airport','a high-altitude plateau airport'
  ],
  phases: [
    'shortly after takeoff','during initial climb','while cruising at high altitude',
    'on final approach','during descent','shortly after rotation','while taxiing to the runway'
  ],
  outcomes: [
    'The aircraft landed safely with no fatalities.',
    'The crew managed to divert and land at the nearest suitable airport.',
    'All occupants survived, though several sustained injuries.',
    'The aircraft was substantially damaged but everyone on board survived.',
    'Emergency crews met the aircraft on the runway; there were no fatalities.'
  ]
};

// ---------- Cause taxonomy ----------
// Each leaf: id, label, zone, positive evidence (used when this IS a cause),
// negative evidence (single item used as a red herring / rule-out when it's NOT the cause), blurb.
const CAUSE_TREE = [
  {
    id:'mechanical', label:'Mechanical', subs:[
      { id:'engine_fail', label:'Engine Failure', leaves:[
        { id:'fan_blade_fatigue', label:'Fatigue fracture of a fan/turbine blade', zone:'engine',
          positive:[
            {label:'Engine Teardown', detail:'A blade was found fractured at its root. The fracture surface shows classic fatigue striations consistent with a crack that grew over time before final failure.'},
            {label:'Maintenance Records', detail:'The scheduled borescope inspection for this engine was overdue by several hundred flight hours.'}
          ],
          negative:{label:'Engine Teardown', detail:'All fan and turbine blades intact, no fatigue striations or crack propagation found on any blade surface.'},
          blurb:'a fatigue crack in a fan/turbine blade propagated undetected until the blade fractured, likely because a scheduled inspection had lapsed'
        },
        { id:'bird_ingestion', label:'Bird ingestion', zone:'engine',
          positive:[
            {label:'Ground Inspection', detail:'Organic remains and feather debris recovered from the engine intake and fan blades.'},
            {label:'ATC Transcript', detail:'A wildlife advisory for the airfield had been issued roughly ten minutes before departure.'}
          ],
          negative:{label:'Ground Inspection', detail:'No bird remains, feather debris, or soft-body impact marks found in the intake or fan section.'},
          blurb:'the engine ingested a bird (or birds) during a critical phase of flight, causing internal damage and power loss'
        },
        { id:'fuel_starvation', label:'Fuel starvation to the engine', zone:'engine',
          positive:[
            {label:'Flight Data Recorder', detail:'Fuel flow to the affected engine dropped to zero several minutes before the failure, while the opposite tank still showed adequate fuel quantity.'},
            {label:'Cockpit Voice Recorder', detail:'Crew discussed a fuel imbalance and a crossfeed valve that would not respond to selection.'}
          ],
          negative:{label:'Fuel System Check', detail:'Fuel flow to both engines remained normal and within limits throughout the flight; no crossfeed anomalies logged.'},
          blurb:'a fuel system malfunction (crossfeed/valve fault) starved the engine of fuel despite adequate quantity remaining onboard'
        },
        { id:'turbine_overheat', label:'Turbine overheat / overspeed', zone:'engine',
          positive:[
            {label:'Engine Teardown', detail:'Turbine section shows heat distress and blade tip rub consistent with an uncontained overspeed event.'},
            {label:'Flight Data Recorder', detail:'Exhaust gas temperature spiked well beyond redline in the seconds before the failure was annunciated.'}
          ],
          negative:{label:'Engine Teardown', detail:'Turbine section shows normal heat signatures and no evidence of overspeed or tip rub.'},
          blurb:'an uncontrolled turbine overspeed drove exhaust gas temperatures beyond limits, damaging the engine internally'
        }
      ]},
      { id:'structural', label:'Structural Failure', leaves:[
        { id:'fuselage_fatigue', label:'Metal fatigue in the fuselage', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'A skin panel shows a fatigue crack originating at a rivet hole, consistent with repeated pressurization cycles.'},
            {label:'Maintenance Records', detail:'The aircraft had accumulated an unusually high number of pressurization cycles relative to its structural inspection program.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'No fatigue cracking found in fuselage skin panels or rivet lines; structure consistent with normal wear.'},
          blurb:'cyclic fatigue cracking in the fuselage skin, driven by repeated pressurization cycles, led to a structural failure'
        },
        { id:'corrosion', label:'Undetected corrosion', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'Significant corrosion pitting found in a structural spar, well beyond allowable limits, hidden beneath a sealant layer.'},
            {label:'Maintenance Records', detail:'The aircraft had a history of operating in a humid coastal environment with inconsistent corrosion inspections.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Structural members show only light surface oxidation, well within normal limits — no significant corrosion pitting.'},
          blurb:'hidden corrosion weakened a critical structural member beyond its design margins, going undetected during inspections'
        },
        { id:'manufacturing_defect', label:'Manufacturing defect', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'A structural fitting shows a subsurface void consistent with a casting defect introduced during manufacture.'},
            {label:'Fleet Records', detail:'A service bulletin was later issued after similar defects were found on other aircraft from the same production batch.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Structural fittings show consistent, defect-free material properties matching manufacturing specification.'},
          blurb:'a latent manufacturing defect in a structural fitting, present since production, ultimately failed under normal loads'
        }
      ]},
      { id:'landing_gear', label:'Landing Gear', leaves:[
        { id:'gear_collapse', label:'Landing gear collapse on touchdown', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'The main gear strut shows a fatigue fracture at a known weak point, consistent with failure under a normal (not excessive) landing load.'},
            {label:'Maintenance Records', detail:'The gear had exceeded its overhaul interval, and a prior inspection noted early-stage cracking that was deferred rather than repaired.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Landing gear struts and attachment points show no fatigue cracking and are within normal service limits.'},
          blurb:'a fatigued landing gear strut, with cracking that had been deferred rather than repaired, collapsed under a normal landing load'
        },
        { id:'brake_failure', label:'Brake system failure', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'Brake assemblies show severe overheating and a hydraulic seal failure, consistent with a loss of braking on rollout.'},
            {label:'Cockpit Voice Recorder', detail:'Crew reported the brakes were "not doing anything" during landing rollout despite normal pedal pressure.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Brake assemblies and hydraulic seals are intact and show normal wear consistent with proper function.'},
          blurb:'a hydraulic seal failure in the brake system caused a loss of braking effectiveness during landing rollout'
        },
        { id:'gear_failed_to_extend', label:'Landing gear failed to extend', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'The gear extension mechanism shows a jammed actuator, preventing the gear from locking down despite the crew\u2019s attempts to cycle it.'},
            {label:'Cockpit Voice Recorder', detail:'Crew ran the abnormal gear extension checklist multiple times without success before committing to a gear-up landing.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Gear extension mechanism and actuators show normal function with no jamming or mechanical obstruction.'},
          blurb:'a jammed gear actuator prevented the landing gear from extending and locking despite correct crew procedure'
        }
      ]},
      { id:'systems', label:'Systems Failure', leaves:[
        { id:'sensor_malfunction', label:'Faulty angle-of-attack / airspeed sensor', zone:'engine',
          positive:[
            {label:'Flight Data Recorder', detail:'One sensor fed data wildly inconsistent with the other, triggering an automatic and unwarranted flight control response.'},
            {label:'Maintenance Records', detail:'An earlier fault on the same sensor was logged and signed off as "checks normal" without replacement.'}
          ],
          negative:{label:'Sensor Diagnostics', detail:'All redundant sensors cross-check consistently throughout the flight with no discrepancy logged.'},
          blurb:'a malfunctioning sensor fed erroneous data into the automated flight systems, triggering an unwarranted control response'
        },
        { id:'hydraulic_failure', label:'Hydraulic system failure', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'A hydraulic line shows a chafe-through failure, with fluid loss consistent with a slow in-flight leak.'},
            {label:'Cockpit Voice Recorder', detail:'Crew reported a hydraulic pressure warning and reduced flight control authority in the minutes before the event.'}
          ],
          negative:{label:'Hydraulic System Check', detail:'All hydraulic lines and reservoirs intact with no signs of leakage or pressure loss.'},
          blurb:'a chafed hydraulic line failed in flight, causing a loss of pressure and reduced flight control authority'
        },
        { id:'electrical_fire', label:'Electrical system fire', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'Wiring bundle shows arcing damage and soot patterns consistent with an in-flight electrical fire.'},
            {label:'Cockpit Voice Recorder', detail:'Crew reported smoke in the cabin and a burning smell before pulling the associated circuit breaker.'}
          ],
          negative:{label:'Wiring Inspection', detail:'No arcing damage, soot, or thermal distress found on wiring bundles throughout the airframe.'},
          blurb:'a wiring fault led to arcing and an in-flight electrical fire, filling the cabin with smoke'
        }
      ]}
    ]
  },
  {
    id:'pilot', label:'Pilot Error', subs:[
      { id:'procedural', label:'Procedural Error', leaves:[
        { id:'unstabilized_approach', label:'Continued an unstabilized approach', zone:'cockpit',
          positive:[
            {label:'Flight Data Recorder', detail:'The aircraft was significantly fast and long on approach, well outside stabilized-approach criteria, yet the approach was continued to landing.'},
            {label:'Cockpit Voice Recorder', detail:'Crew discussed being fast and long but did not brief or execute a go-around.'}
          ],
          negative:{label:'Flight Data Recorder', detail:'Approach parameters (speed, glidepath, configuration) were stable and within limits from the gate to touchdown.'},
          blurb:'the crew continued an unstabilized approach — fast and long — rather than executing a go-around'
        },
        { id:'checklist_skipped', label:'Critical checklist item skipped', zone:'cockpit',
          positive:[
            {label:'Cockpit Voice Recorder', detail:'The pre-departure checklist was rushed, and a required configuration item was never called out or verified.'},
            {label:'Flight Data Recorder', detail:'Aircraft configuration at a critical phase does not match the required checklist state.'}
          ],
          negative:{label:'Cockpit Voice Recorder', detail:'All required checklists were read in full, with each item verified and acknowledged by both crew members.'},
          blurb:'a required checklist item was skipped during a rushed procedure, leaving the aircraft improperly configured'
        },
        { id:'mismanaged_emergency', label:'Mismanaged an in-flight emergency', zone:'cockpit',
          positive:[
            {label:'Cockpit Voice Recorder', detail:'Crew actioned the wrong checklist for the abnormal indication, worsening rather than resolving the situation.'},
            {label:'Flight Data Recorder', detail:'Control inputs following the initial warning are inconsistent with the correct emergency procedure for the fault present.'}
          ],
          negative:{label:'Cockpit Voice Recorder', detail:'Crew correctly identified the abnormal indication and worked the appropriate checklist promptly and accurately.'},
          blurb:'the crew actioned the wrong procedure in response to an abnormal indication, compounding the original problem'
        }
      ]},
      { id:'awareness', label:'Situational Awareness', leaves:[
        { id:'spatial_disorientation', label:'Spatial disorientation', zone:'cockpit',
          positive:[
            {label:'Flight Data Recorder', detail:'Control inputs show a slow, disorienting roll and pitch divergence with no corresponding external cause, typical of spatial disorientation.'},
            {label:'Weather Archive', detail:'The flight was in cloud with no visible horizon at the time control inputs became erratic.'}
          ],
          negative:{label:'Flight Data Recorder', detail:'Control inputs remained smooth and coordinated throughout, with no unexplained roll or pitch divergence.'},
          blurb:'the pilot became spatially disoriented in low-visibility conditions, losing the visual horizon and misjudging the aircraft attitude'
        },
        { id:'cfit', label:'Controlled flight into terrain', zone:'cockpit',
          positive:[
            {label:'Flight Data Recorder', detail:'The aircraft was under full control, on a stable descent path, directly into rising terrain with no evasive maneuver recorded.'},
            {label:'ATC Transcript', detail:'A minimum safe altitude warning from ATC went unacknowledged by the crew shortly before impact.'}
          ],
          negative:{label:'Terrain Awareness Check', detail:'Flight path maintained safe terrain clearance throughout, consistent with normal published procedures.'},
          blurb:'the crew, under full control of the aircraft, lost awareness of terrain proximity and continued a descent into rising ground'
        }
      ]},
      { id:'fatigue', label:'Fatigue & Physiology', leaves:[
        { id:'pilot_fatigue', label:'Pilot fatigue / impaired alertness', zone:'witness',
          positive:[
            {label:'Duty Roster', detail:'The crew had been on duty for well beyond the recommended window, following a red-eye rotation with minimal rest.'},
            {label:'Cockpit Voice Recorder', detail:'Speech patterns and slowed response times in the final minutes of the recording are consistent with significant fatigue.'}
          ],
          negative:{label:'Duty Roster', detail:'The crew\u2019s duty and rest times were well within limits, with no indication of fatigue.'},
          blurb:'the crew was operating on severely degraded rest, and fatigue slowed their recognition of and response to the developing problem'
        },
        { id:'medical_incapacitation', label:'Pilot medical incapacitation', zone:'witness',
          positive:[
            {label:'Witness Statement', detail:'The remaining crew member reported the other pilot became suddenly unresponsive at the controls partway through the flight.'},
            {label:'Cockpit Voice Recorder', detail:'One pilot\u2019s speech becomes slurred and then stops entirely, with no response to the other pilot\u2019s prompts.'}
          ],
          negative:{label:'Witness Statement', detail:'Both crew members remained alert, responsive, and in normal health throughout the flight.'},
          blurb:'one pilot suffered a sudden medical incapacitation at the controls, leaving the other to manage the aircraft alone'
        }
      ]},
      { id:'crm', label:'Crew Resource Management', leaves:[
        { id:'atc_miscommunication', label:'Miscommunication with air traffic control', zone:'atc',
          positive:[
            {label:'ATC Transcript', detail:'The crew read back an altitude clearance that did not match what was actually issued, and the discrepancy was never caught.'},
            {label:'Flight Data Recorder', detail:'The aircraft leveled off at an altitude inconsistent with its actual clearance.'}
          ],
          negative:{label:'ATC Transcript', detail:'All clearances were read back correctly and match recorded controller instructions throughout the flight.'},
          blurb:'a clearance was misheard and incorrectly read back without being caught, leading the aircraft to fly an unintended profile'
        },
        { id:'crm_breakdown', label:'Breakdown in crew coordination', zone:'cockpit',
          positive:[
            {label:'Cockpit Voice Recorder', detail:'One pilot noticed the developing problem but did not clearly communicate it; the other pilot took no corrective action until much later.'},
            {label:'Flight Data Recorder', detail:'Control inputs show conflicting or duplicated actions from both pilots at a critical moment.'}
          ],
          negative:{label:'Cockpit Voice Recorder', detail:'Crew communication was clear and well coordinated throughout, with cross-checks performed as expected.'},
          blurb:'a breakdown in communication between pilots meant a developing problem was not addressed until it had become critical'
        }
      ]}
    ]
  },
  {
    id:'environment', label:'Environment', subs:[
      { id:'weather', label:'Weather', leaves:[
        { id:'severe_turbulence', label:'Severe turbulence', zone:'weather',
          positive:[
            {label:'Weather Archive', detail:'A convective cell with reported severe turbulence was active directly along the flight path at the time of the event.'},
            {label:'Flight Data Recorder', detail:'Rapid, high-magnitude vertical acceleration spikes recorded consistent with severe turbulence.'}
          ],
          negative:{label:'Weather Archive', detail:'No significant weather, convective activity, or turbulence reports along the flight path at the time.'},
          blurb:'the aircraft encountered severe, largely unavoidable turbulence from a convective cell along its route'
        },
        { id:'icing', label:'Airframe icing', zone:'weather',
          positive:[
            {label:'Weather Archive', detail:'Conditions were conducive to icing, with visible moisture and temperatures near freezing reported in the area.'},
            {label:'Cockpit Voice Recorder', detail:'Crew reported unusual buffet and reduced control effectiveness consistent with ice accumulation on the airframe.'}
          ],
          negative:{label:'Ice Inspection', detail:'No ice accretion found on wings, tail, or engine inlets; conditions were not conducive to icing at the time.'},
          blurb:'undetected ice accumulation on the airframe degraded aerodynamic performance and control effectiveness'
        },
        { id:'windshear', label:'Low-level windshear', zone:'weather',
          positive:[
            {label:'Weather Archive', detail:'A windshear alert was active for the runway in use, associated with a nearby thunderstorm outflow.'},
            {label:'Flight Data Recorder', detail:'A sudden, large airspeed loss was recorded consistent with a windshear encounter at low altitude.'}
          ],
          negative:{label:'Weather Archive', detail:'No windshear alerts, outflow boundaries, or airspeed anomalies consistent with shear were recorded near the runway.'},
          blurb:'the aircraft encountered low-level windshear from a nearby thunderstorm outflow during a critical phase of flight'
        },
        { id:'lightning_strike', label:'Lightning strike', zone:'weather',
          positive:[
            {label:'Wreckage Analysis', detail:'Burn and entry/exit marks consistent with a lightning strike found on the nose and a wingtip.'},
            {label:'Weather Archive', detail:'Active thunderstorm cells with lightning activity were present along the flight path.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'No burn marks, pitting, or entry/exit points consistent with a lightning strike found anywhere on the airframe.'},
          blurb:'a lightning strike damaged aircraft systems and/or structure during flight through an active thunderstorm cell'
        }
      ]},
      { id:'wildlife', label:'Wildlife', leaves:[
        { id:'bird_strike_airframe', label:'Bird strike to airframe (non-engine)', zone:'structure',
          positive:[
            {label:'Wreckage Analysis', detail:'Organic residue and impact damage found on the windscreen/leading edge, consistent with a bird strike outside the engine.'},
            {label:'ATC Transcript', detail:'A bird activity advisory had been issued for the area shortly before the flight departed.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'No organic residue or impact damage consistent with a bird strike found anywhere on the airframe.'},
          blurb:'a bird strike to the windscreen or leading edge caused structural and/or visibility damage during a critical phase'
        }
      ]},
      { id:'atmospheric', label:'Atmospheric Hazards', leaves:[
        { id:'volcanic_ash', label:'Volcanic ash encounter', zone:'engine',
          positive:[
            {label:'Engine Teardown', detail:'Glassy deposits found fused to turbine blades, a signature consistent with ingested volcanic ash melting and re-solidifying inside the engine.'},
            {label:'Weather Archive', detail:'An ash advisory for a nearby eruption was active along a portion of the filed route.'}
          ],
          negative:{label:'Engine Teardown', detail:'No glassy deposits or ash-related erosion found on turbine blades or compressor surfaces.'},
          blurb:'the aircraft transited an unreported volcanic ash cloud, and ingested ash melted inside the engine causing a loss of power'
        },
        { id:'high_altitude_stall', label:'High-altitude aerodynamic stall', zone:'cockpit',
          positive:[
            {label:'Flight Data Recorder', detail:'Airspeed decayed steadily at high altitude until the aircraft exceeded its critical angle of attack and departed controlled flight.'},
            {label:'Cockpit Voice Recorder', detail:'A stall warning sounded and continued for an extended period before the crew applied correct recovery inputs.'}
          ],
          negative:{label:'Flight Data Recorder', detail:'Airspeed and angle of attack remained comfortably within safe margins at altitude throughout the flight.'},
          blurb:'the aircraft was flown into a high-altitude aerodynamic stall as its speed margin eroded near the edge of its performance envelope'
        }
      ]},
      { id:'terrain', label:'Terrain & Visibility', leaves:[
        { id:'poor_visibility_terrain', label:'Poor visibility in mountainous terrain', zone:'weather',
          positive:[
            {label:'Weather Archive', detail:'Dense fog and low cloud reduced visibility well below minimums for the mountainous approach in use.'},
            {label:'ATC Transcript', detail:'The crew was cleared for an approach into terrain-challenging terrain with visibility reported at the minimum limit.'}
          ],
          negative:{label:'Weather Archive', detail:'Visibility was well above minimums throughout, with no fog or low cloud reported near the terrain.'},
          blurb:'dense fog and low cloud sharply reduced visibility during an approach through mountainous terrain'
        }
      ]}
    ]
  },
  {
    id:'maintenance', label:'Maintenance', subs:[
      { id:'inspection', label:'Inspection Failure', leaves:[
        { id:'overdue_inspection', label:'Overdue scheduled inspection', zone:'maintenance',
          positive:[
            {label:'Maintenance Records', detail:'A required inspection interval had been exceeded by a wide margin due to a scheduling backlog at the operator\u2019s maintenance base.'},
            {label:'Engine Teardown', detail:'The defect found is of a type that the overdue inspection is specifically designed to catch.'}
          ],
          negative:{label:'Maintenance Records', detail:'All scheduled inspections were completed on time and within required intervals.'},
          blurb:'a required inspection — one designed specifically to catch this type of defect — was significantly overdue'
        },
        { id:'improper_repair', label:'Improperly performed repair', zone:'maintenance',
          positive:[
            {label:'Maintenance Records', detail:'A recent repair to this component does not match the approved procedure; a required torque/sign-off step appears to have been skipped.'},
            {label:'Wreckage Analysis', detail:'The failed part shows tooling marks and fastener damage consistent with an improperly executed repair.'}
          ],
          negative:{label:'Maintenance Records', detail:'The relevant repair was performed and signed off exactly per the approved maintenance procedure.'},
          blurb:'a recent repair on the failed component was performed incorrectly, skipping a required step in the approved procedure'
        }
      ]},
      { id:'parts', label:'Parts & Components', leaves:[
        { id:'incorrect_part', label:'Incorrect or non-approved part installed', zone:'maintenance',
          positive:[
            {label:'Maintenance Records', detail:'The part installed does not match the part number specified for this position in the maintenance manual.'},
            {label:'Wreckage Analysis', detail:'The failed component\u2019s material specification does not match the approved part for this application.'}
          ],
          negative:{label:'Maintenance Records', detail:'All installed parts match the approved part numbers specified in the maintenance manual.'},
          blurb:'an incorrect, non-approved part had been installed in place of the specified component, and it failed under normal loads'
        },
        { id:'counterfeit_part', label:'Counterfeit/substandard part', zone:'forensics',
          positive:[
            {label:'Lab Analysis', detail:'Material testing shows the failed part does not meet the certified alloy specification — consistent with a counterfeit component.'},
            {label:'Maintenance Records', detail:'The part was sourced through an unauthorized secondary supplier rather than the approved parts channel.'}
          ],
          negative:{label:'Lab Analysis', detail:'Material testing confirms the component meets certified specification; no signs of a counterfeit or substandard part.'},
          blurb:'a counterfeit part, sourced outside the approved supply chain, did not meet certified material specifications and failed'
        }
      ]}
    ]
  },
  {
    id:'external', label:'External Factors', subs:[
      { id:'fuel', label:'Fuel Supply', leaves:[
        { id:'fuel_contamination', label:'Contaminated fuel from supplier', zone:'forensics',
          positive:[
            {label:'Lab Analysis', detail:'Fuel samples from the aircraft tanks show contamination (water/particulate) matching a batch from the fueling depot used before departure.'},
            {label:'Cockpit Voice Recorder', detail:'Crew reported rough running and fluctuating power on the affected engine(s) shortly after departure.'}
          ],
          negative:{label:'Lab Analysis', detail:'Fuel samples from the aircraft tanks are clean and within specification, with no contamination detected.'},
          blurb:'contaminated fuel loaded at the departure airport caused rough engine operation and a loss of power'
        }
      ]},
      { id:'other_external', label:'Other External Factors', leaves:[
        { id:'atc_error', label:'Air traffic control routing/clearance error', zone:'atc',
          positive:[
            {label:'ATC Transcript', detail:'The controller issued a clearance that placed the aircraft in conflict with terrain/traffic, contrary to standard procedure.'},
            {label:'Flight Data Recorder', detail:'The aircraft flew precisely the profile it was cleared for by ATC — a profile that was itself unsafe.'}
          ],
          negative:{label:'ATC Transcript', detail:'All clearances issued by the controller were correct and consistent with standard, safe procedure.'},
          blurb:'air traffic control issued an incorrect clearance that placed the aircraft on an unsafe profile it otherwise flew correctly'
        },
        { id:'sabotage', label:'Deliberate interference / sabotage', zone:'forensics',
          positive:[
            {label:'Lab Analysis', detail:'Forensic examination found evidence of deliberate tampering with a flight-critical system, inconsistent with normal wear or accidental damage.'},
            {label:'Security Records', detail:'Access logs show an unauthorized individual had access to the aircraft during its last overnight stop.'}
          ],
          negative:{label:'Lab Analysis', detail:'No evidence of deliberate tampering found; all damage is consistent with normal operational wear or the accident sequence itself.'},
          blurb:'deliberate tampering with a flight-critical system was found, pointing to intentional interference rather than an accident'
        }
      ]},
      { id:'load', label:'Cargo & Weight', leaves:[
        { id:'weight_balance_error', label:'Weight and balance calculation error', zone:'cargo',
          positive:[
            {label:'Load Sheet Audit', detail:'The final load sheet significantly understated actual cargo weight, shifting the center of gravity well outside the certified envelope.'},
            {label:'Flight Data Recorder', detail:'The aircraft required far more control input than normal to rotate and climb, consistent with an aft center-of-gravity condition.'}
          ],
          negative:{label:'Load Sheet Audit', detail:'The load sheet accurately reflects actual cargo weight and distribution, with center of gravity well within the certified envelope.'},
          blurb:'an error in the load sheet understated cargo weight and pushed the center of gravity outside the safe envelope'
        },
        { id:'shifting_cargo', label:'Improperly secured cargo shifted in flight', zone:'cargo',
          positive:[
            {label:'Wreckage Analysis', detail:'Cargo restraint straps found failed or unattached, with cargo displaced toward the rear of the hold.'},
            {label:'Flight Data Recorder', detail:'A sudden, unexplained aft center-of-gravity shift was recorded mid-flight, consistent with cargo movement.'}
          ],
          negative:{label:'Wreckage Analysis', detail:'Cargo restraints remained intact and properly secured, with no evidence of in-flight cargo movement.'},
          blurb:'inadequately secured cargo broke loose and shifted aft in flight, suddenly moving the center of gravity out of safe limits'
        }
      ]}
    ]
  }
];
