import {safeUrl} from './deals.mjs';
export function mergeThreads(previous=[],incoming=[]){
 const threads=new Map(previous.map(t=>[t.id,t]));
 for(const t of incoming){const old=threads.get(t.id)||{};const messages=new Map((old.messages||[]).map(m=>[m.id,m]));for(const m of t.messages||[])messages.set(m.id,{...messages.get(m.id),...m});threads.set(t.id,{...old,...t,messages:[...messages.values()].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))});}
 return [...threads.values()].sort((a,b)=>String(b.messages?.at(-1)?.date||'').localeCompare(String(a.messages?.at(-1)?.date||'')));
}
export function validateProfile(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!p.id.trim()||p.id.length>300)throw new Error('Invalid profile id.');
 for(const k of ['brand','description','descriptionBasis','website','checkedAt','emailSyncedAt','reviewNote'])if(p[k]!=null&&(typeof p[k]!=='string'||p[k].length>12000))throw new Error('Invalid profile '+k);
 if(p.website&&!safeUrl(p.website))throw new Error('Invalid website URL.');
 if(p.lead!=null&&typeof p.lead!=='boolean')throw new Error('Invalid lead flag.');
 for(const k of ['contacts','domains'])if(p[k]!=null&&(!Array.isArray(p[k])||p[k].length>100||p[k].some(v=>typeof v!=='string'||v.length>500)))throw new Error('Invalid '+k);
 if(p.sources!=null&&(!Array.isArray(p.sources)||p.sources.length>30||p.sources.some(s=>!safeUrl(s.url)||typeof s.title!=='string')))throw new Error('Invalid research source.');
 if(p.threads!=null&&(!Array.isArray(p.threads)||p.threads.length>1000))throw new Error('Invalid email threads.');
 for(const t of p.threads||[]){if(!/^[a-zA-Z0-9_-]{1,200}$/.test(t.id)||!Array.isArray(t.messages)||t.messages.length>1000)throw new Error('Invalid thread.');for(const m of t.messages){if(!/^[a-zA-Z0-9_-]{1,200}$/.test(m.id))throw new Error('Invalid message.');for(const k of ['subject','from','to','cc','date','body','direction'])if(m[k]!=null&&(typeof m[k]!=='string'||m[k].length>(k==='body'?100000:2000)))throw new Error('Invalid email '+k);if(m.direction&&!['sent','received'].includes(m.direction))throw new Error('Invalid direction.');}}
 return p;
}
export function profileSummary(p){const {threads=[],...rest}=p;const all=threads.flatMap(t=>t.messages||[]).sort((a,b)=>String(b.date).localeCompare(String(a.date)));return {...rest,threadCount:threads.length,messageCount:all.length,lastEmailAt:all[0]?.date||null,lastEmailDirection:all[0]?.direction||null,lastEmailSubject:all[0]?.subject||null};}
