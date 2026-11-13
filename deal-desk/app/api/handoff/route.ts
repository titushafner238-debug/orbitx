import {getDb} from '@/db';
import {trackerSource,handoffs} from '@/db/schema';
import {and,eq} from 'drizzle-orm';
import {validateWorkflow} from '@/lib/deals.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Save from this Site only.'},{status:403});
 try{const raw=await req.text();if(raw.length>100000)throw new Error('Record is too large.');const {id,workflow,revision,sourceRevision}=JSON.parse(raw);
 const db=getDb();const [source]=await db.select().from(trackerSource);if(!source||source.revision!==sourceRevision)return Response.json({error:'Tracker snapshot changed. Reload and review the latest terms.'},{status:409});
 const d=JSON.parse(source.payload).records.find((r:{id:string})=>r.id===id);if(!d)throw new Error('Brand no longer exists in the current tracker import.');
 validateWorkflow(d,workflow);const [old]=await db.select().from(handoffs).where(eq(handoffs.id,id));
 if((old?.revision??0)!==(revision??0))return Response.json({error:'This handoff changed in another window. Reload before editing.'},{status:409});
 const payload=JSON.stringify({...workflow,termsKey:d.termsKey,termsChanged:false}),updatedAt=new Date().toISOString();
 if(old){const changed=await db.update(handoffs).set({payload,updatedAt,revision:old.revision+1}).where(and(eq(handoffs.id,id),eq(handoffs.revision,revision))).returning();if(!changed.length)return Response.json({error:'Save conflict. Reload first.'},{status:409});}
 else await db.insert(handoffs).values({id,payload,updatedAt,revision:1});
 return Response.json({ok:true,revision:(old?.revision??0)+1});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to save'},{status:400});}
}
