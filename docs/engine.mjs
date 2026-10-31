export const devices = {
 'door-01': {name:'North entrance',kind:'contact',protocol:'Legacy relay'},
 'zone-01': {name:'Archive corridor',kind:'presence',protocol:'Access controller'},
 'reader-01': {name:'Archive reader',kind:'access',protocol:'Wiegand adapter'},
 'camera-01': {name:'Loading bay camera',kind:'camera',protocol:'ONVIF adapter'}
};
const types={'door.open':'contact','door.closed':'contact','presence.dwell':'presence','access.denied':'access','access.granted':'access','camera.offline':'camera','camera.online':'camera'};
export function canonical(value){
 if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
 if(value!==null && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export async function digest(previous,payload){
 const bytes=new TextEncoder().encode(previous+'\n'+canonical(payload));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function validate(e){
 if(!e || Array.isArray(e) || typeof e!=='object' || Object.keys(e).sort().join(',')!=='at,data,device,id,type') throw Error('Invalid event fields');
 if(typeof e.id!=='string'||!e.id.length||e.id.length>80) throw Error('Invalid event id');
 if(!Object.hasOwn(devices,e.device)||types[e.type]!==devices[e.device].kind) throw Error('Unknown or incompatible device/type');
 if(typeof e.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(e.at)||!Number.isFinite(Date.parse(e.at))||new Date(e.at).toISOString().replace('.000Z','Z')!==e.at) throw Error('Invalid UTC timestamp');
 if(!e.data||typeof e.data!=='object'||Array.isArray(e.data)) throw Error('Data must be an object');
 const timed=['door.open','presence.dwell'].includes(e.type);
 if(Object.keys(e.data).sort().join(',')!==(timed?'duration_seconds':'')) throw Error('Invalid event data fields');
 if(timed&&(!Number.isInteger(e.data.duration_seconds)||e.data.duration_seconds<0||e.data.duration_seconds>86400)) throw Error('Invalid duration');
 return e;
}
export function incident(e){
 const duration=e.data.duration_seconds; let r;
 if(e.type==='door.open'&&duration>=120) r=['door-held','high','Door held open',`North entrance was open for ${duration} seconds; threshold is 120 seconds.`];
 if(e.type==='presence.dwell'&&duration>=300) r=['long-dwell','medium','Unusual dwell time',`Presence lasted ${duration} seconds; threshold is 300 seconds.`];
 if(e.type==='access.denied') r=['access-denied','medium','Access denied','The synthetic archive controller rejected an access attempt.'];
 if(e.type==='camera.offline') r=['camera-offline','high','Camera unavailable','The synthetic loading bay camera reported offline; coverage may be reduced.'];
 return r?{id:e.id+':'+r[0],event_id:e.id,device:e.device,rule:r[0],severity:r[1],title:r[2],explanation:r[3],at:e.at}:null;
}
export function scenario(name){
 const signals={night:[['door-01','door.open',180],['zone-01','presence.dwell',360],['camera-01','camera.offline'],['door-01','door.closed'],['reader-01','access.granted']],normal:[['door-01','door.closed'],['zone-01','presence.dwell',30],['camera-01','camera.online'],['reader-01','access.granted']],denied:[['reader-01','access.denied']]}[name];
 if(!signals) throw Error('Unknown scenario');
 return signals.map(([device,type,duration],i)=>({id:`${name}-${i+1}`,device,type,at:`2026-10-30T22:${String(i).padStart(2,'0')}:00Z`,data:duration===undefined?{}:{duration_seconds:duration}}));
}
export async function verify(rows){
 let previous='0'.repeat(64);let checked=0;
 try{ for(const row of rows){
  if(row.seq!==checked+1||row.previous!==previous||row.hash!==await digest(previous,row.payload)) return {valid:false,checked,failed_at:checked+1};
  previous=row.hash;checked++;
 }return {valid:true,checked,head:previous}; }catch{return {valid:false,checked};}
}
export async function append(rows,event){
 validate(event); const old=rows.find(r=>r.payload.event.id===event.id);
 if(old){if(canonical(old.payload.event)!==canonical(event)) throw Error('Event id conflict');return false;}
 const previous=rows.at(-1)?.hash??'0'.repeat(64),payload={event:structuredClone(event),incident:incident(event)};
 rows.push({seq:rows.length+1,payload,previous,hash:await digest(previous,payload)});return true;
}
