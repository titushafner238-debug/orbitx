import {getDb} from '@/db';
import {brandProfiles,deskSettings,trackerSource} from '@/db/schema';
import {and,eq} from 'drizzle-orm';
import {validateProfile,mergeThreads,profileSummary} from '@/lib/profiles.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){try{const db=getDb(),id=new URL(req.url).searchParams.get('id');
 if(id){const [row]=await db.select().from(brandProfiles).where(eq(brandProfiles.id,id));return Response.json({profile:row?{...JSON.parse(row.payload),revision:row.revision}:null},{headers});}
 const rows=await db.select().from(brandProfiles);const [settings]=await db.select().from(deskSettings).where(eq(deskSettings.id,'email'));
 return Response.json({profiles:Object.fromEntries(rows.map(r=>[r.id,{...profileSummary(JSON.parse(r.payload)),revision:r.revision}])),emailSync:settings?JSON.parse(settings.payload):null},{headers});
 }catch{return Response.json({error:'Could not load brand profiles. Please retry.'},{status:503,headers});}}
// The owner-private Sites boundary protects email data and service writes.
export async function POST(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 try{const raw=await req.text();if(raw.length>2500000)throw new Error('Profile batch too large.');const body=JSON.parse(raw);if(!Array.isArray(body.profiles)||body.profiles.length>40)throw new Error('Send up to 40 profiles per batch.');
 const db=getDb();const [source]=await db.select().from(trackerSource);const ids=new Set(source?JSON.parse(source.payload).records.map((d:any)=>d.id):[]);const seen=new Set();const prepared=[];
 for(const incoming of body.profiles){validateProfile(incoming);if(seen.has(incoming.id))throw new Error('Duplicate profile in batch.');seen.add(incoming.id);
 if(!ids.has(incoming.id)&&!(incoming.lead===true&&incoming.id.startsWith('lead:')&&incoming.brand?.trim()))throw new Error('Profile must match a tracker brand or an explicitly labeled email lead.');
 const [previous]=await db.select().from(brandProfiles).where(eq(brandProfiles.id,incoming.id));if((previous?.revision||0)!==incoming.expectedRevision)return Response.json({error:'Profile changed. Reload revisions and retry.',id:incoming.id},{status:409});
 const {expectedRevision,...patch}=incoming;const old=previous?JSON.parse(previous.payload):{};const payload=JSON.stringify({...old,...patch,threads:mergeThreads(old.threads,patch.threads)});prepared.push({id:incoming.id,previous,payload});}
 const updatedAt=new Date().toISOString(),results=[];for(const p of prepared){if(p.previous){const result=await db.update(brandProfiles).set({payload:p.payload,updatedAt,revision:p.previous.revision+1}).where(and(eq(brandProfiles.id,p.id),eq(brandProfiles.revision,p.previous.revision))).returning();if(!result.length)return Response.json({error:'Profile conflict. Reload and retry; previous successful upserts are safe to repeat.'},{status:409});}else await db.insert(brandProfiles).values({id:p.id,payload:p.payload,revision:1,updatedAt});results.push({id:p.id,revision:(p.previous?.revision||0)+1});}
 if(body.emailSync){const s=body.emailSync;if(typeof s.enabled!=='boolean'||(s.enabled&&typeof s.automationId!=='string'))throw new Error('Invalid email sync configuration.');const payload=JSON.stringify({enabled:s.enabled,automationId:s.automationId||null,lastCheckedAt:updatedAt,mode:s.enabled?'Gmail event updates':'Initial email import'});await db.insert(deskSettings).values({id:'email',payload}).onConflictDoUpdate({target:deskSettings.id,set:{payload}});}
 return Response.json({ok:true,updated:results,updatedAt},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Profile import failed'},{status:400,headers});}}
