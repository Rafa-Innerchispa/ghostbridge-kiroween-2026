import {devices,scenario,append,verify} from './engine.mjs';
import {filterBySeverity} from './filters.mjs';
const $=id=>document.getElementById(id),key='ghostbridge-ledger-v1';
let rows=[],busy=false,last=null,local=false;

// UI-only severity filter state — ephemeral, never written to ledger or storage.
let activeSeverity='all';

function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function save(){if(!local){try{localStorage.setItem(key,JSON.stringify(rows));}catch{status('Storage unavailable. This session works in memory; export before closing.',true);}}}
async function api(path,body){const r=await fetch('/api/'+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw Error((await r.json()).error||'Local API failed');return r.json();}
function text(tag,value,className){const n=document.createElement(tag);n.textContent=value;if(className)n.className=className;return n;}

function updateSeverityButtons(){
  for(const v of ['all','high','medium']){
    const btn=$('filter-'+v);
    if(!btn)continue;
    const active=v===activeSeverity;
    btn.setAttribute('aria-pressed',String(active));
    btn.classList.toggle('filter-active',active);
  }
}

function render(){
 // Full unfiltered sets — used for counters, timeline, export, verification.
 const events=rows.map(r=>r.payload.event),findings=rows.filter(r=>r.payload.incident);
 // Visible subset — only the Incident desk cards.
 const visibleFindings=filterBySeverity(rows,activeSeverity);

 $('events-count').textContent=events.length;
 $('incidents-count').textContent=findings.length;
 $('finding-label').textContent=findings.length?'EXPLAINABLE FINDINGS':'NO INCIDENTS RECORDED';
 updateSeverityButtons();

 $('devices').replaceChildren(...Object.entries(devices).map(([id,d])=>{const n=text('div','','device'),latest=events.filter(e=>e.device===id).at(-1);n.append(text('span',{contact:'◫',presence:'⌁',access:'▣',camera:'◉'}[d.kind],'icon'));const label=text('div','');label.append(text('strong',d.name),text('small',d.protocol+' · simulated'));n.append(label,text('span',latest?latest.type.split('.')[1]:'Awaiting signal','device-state'+(latest?.type==='camera.offline'?' offline':'')));return n;}));

 // Incident desk: use visibleFindings for cards; distinguish empty cases.
 let incidentNodes;
 if(!findings.length){
  // No incidents recorded at all in this shift.
  incidentNodes=[text('p',events.length?'This shift has no detected incidents. Every received event remains available below.':'The quiet before the shift. Run a scenario to inspect the findings.','empty')];
 } else if(!visibleFindings.length){
  // Incidents exist but none match the active severity filter.
  const msg=text('p',`No ${activeSeverity}-severity incidents in this shift. Switch to All or another severity to see recorded findings.`,'empty empty-filter');
  incidentNodes=[msg];
 } else {
  incidentNodes=visibleFindings.map(r=>{const f=r.payload.incident,b=text('button','','finding');b.append(text('span',f.severity,'severity'),text('strong',f.title),text('p',f.explanation),text('small',f.rule+' → '+f.event_id));b.onclick=()=>{$('inspection').textContent=JSON.stringify(r,null,2);$('inspection').scrollIntoView({block:'nearest',behavior:'smooth'});};return b;});
 }
 $('incidents').replaceChildren(...incidentNodes);

 $('timeline-empty').hidden=!!events.length;
 $('timeline').replaceChildren(...rows.map(r=>{const e=r.payload.event,n=document.createElement('tr');for(const v of [e.at.slice(11,19),devices[e.device]?.name??e.device,e.type,r.hash.slice(0,16)+'…'])n.append(text('td',v));return n;}));
 $('replay').disabled=busy||!last;
}

async function run(name,replay=false){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);let added=0;
 try{
 for(const e of scenario(name)){
  for(let i=0;i<4;i++){$('p'+i).classList.add('active');status(`${e.id}: ${['capturing synthetic signal','validating event contract','evaluating deterministic rules','linking SHA-256 evidence'][i]}`);await new Promise(r=>setTimeout(r,100));}
  if(local){const result=await api('events',e);if(result.created)added++;rows=(await api('state')).ledger;}else if(await append(rows,e))added++;
  save();render();
  for(let i=0;i<4;i++)$('p'+i).classList.remove('active');
 }
 last=name;const result=await verify(rows);$('integrity-label').textContent=result.valid?'Verified':'FAILED';
 status(replay?`Replay complete: ${added} new events. Identical event IDs produce no duplicate evidence or incidents.`:`${name==='night'?'Night Watch':name==='normal'?'Normal Shift':'Access Denied'} complete: ${added} new events, ${rows.filter(r=>r.payload.incident).length} total incidents. Pipeline pacing is visual; rules run locally without an AI request.`);
 }catch(e){status(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);for(let i=0;i<4;i++)$('p'+i).classList.remove('active');render();}
}

for(const name of ['night','normal','denied'])$(name).onclick=()=>run(name);
$('replay').onclick=()=>run(last,true);
$('verify').onclick=async()=>{const r=await verify(rows);$('integrity-label').textContent=r.valid?'Verified':'FAILED';$('inspection').textContent=JSON.stringify(r,null,2);status(r.valid?`Verified ${r.checked} ledger records against their chain. See the head hash below.`:'Integrity check failed. Export this ledger for investigation.',!r.valid);};
$('tamper').onclick=async()=>{if(!rows.length){status('Run a scenario before testing tamper detection.');return;}const copy=structuredClone(rows);copy[0].payload.event.data.tampered=true;const r=await verify(copy);$('inspection').textContent=JSON.stringify(r,null,2);status(!r.valid?'Tampering detected in a disposable copy. Your original evidence was not changed.':'Unexpected result: tamper test did not fail.',r.valid);};
$('reset').onclick=async()=>{try{if(local)await api('reset',{});rows=[];last=null;activeSeverity='all';save();render();$('integrity-label').textContent='Unchecked';$('inspection').textContent='Lab reset. Select a scenario.';status('Synthetic lab cleared. Choose a new scenario.');}catch(e){status(e.message,true);}};
$('export').onclick=async()=>{const blob=new Blob([JSON.stringify({schema:'ghostbridge-evidence-v1',mode:local?'LOCAL_SYNTHETIC':'BROWSER_SYNTHETIC',exported_at:new Date().toISOString(),integrity:await verify(rows),ledger:rows},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ghostbridge-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Evidence JSON exported. Includes events, explanations, hashes and current verification.');};

// Severity filter button wiring.
for(const v of ['all','high','medium']){
  const btn=$('filter-'+v);
  if(btn)btn.onclick=()=>{activeSeverity=v;render();};
}

async function init(){
 try{if(['localhost','127.0.0.1'].includes(location.hostname)){const s=await api('state');rows=s.ledger;local=true;$('mode').textContent='Local Python + SQLite · synthetic';}else{rows=JSON.parse(localStorage.getItem(key)||'[]');}
 if(!Array.isArray(rows)||!(await verify(rows)).valid)throw Error('Saved evidence is malformed or has failed integrity. Reset the lab or export for investigation.');
 render();if(rows.length)$('integrity-label').textContent='Verified';
 }catch(e){status(e.message,true);if(!Array.isArray(rows))rows=[];try{render();}catch{rows=[];render();}}
}init();
