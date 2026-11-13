import {getDb} from '@/db';
import {trackerSource} from '@/db/schema';
import {and,eq} from 'drizzle-orm';
export const dynamic='force-dynamic';
// Shared updater, protected by the owner-private Sites access boundary.
export async function POST(req:Request){
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 try{
  const body:any=await req.json();if(typeof body.enabled!=='boolean'||typeof body.automationId!=='string'||body.automationId.length>200)throw new Error('Invalid refresh configuration');
  const db=getDb();const [source]=await db.select().from(trackerSource);if(!source)throw new Error('Import the source first');
  const payload=JSON.stringify({...JSON.parse(source.payload),refreshConfig:{enabled:body.enabled,automationId:body.automationId,cadence:'Hourly at :45',timezone:'America/New_York'}});
  const updated=await db.update(trackerSource).set({payload,revision:source.revision+1}).where(and(eq(trackerSource.id,'tracker'),eq(trackerSource.revision,source.revision))).returning();
  if(!updated.length)return Response.json({error:'Source changed; reload and retry configuration'},{status:409});
  return Response.json({ok:true});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to configure refresh'},{status:400})}
}
