import {getDb} from '@/db';
import {trackerSource} from '@/db/schema';
import {eq} from 'drizzle-orm';
import {normalizeRows} from '@/lib/deals.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 // No-origin service imports are protected by the confirmed owner-private Sites boundary.
 try{const text=await req.text();if(text.length>2500000)throw new Error('Import is too large.');const body=JSON.parse(text);
 const records=normalizeRows(body.values);if(!records.length)throw new Error('The import has no brands.');
 const db=getDb();const [previous]=await db.select().from(trackerSource);const expected=body.expectedRevision??0;
 if((previous?.revision??0)!==expected)return Response.json({error:'Tracker snapshot changed. Reload before importing.',conflict:true},{status:409});
 const payload=JSON.stringify({records,sourceReadAt:body.sourceReadAt||new Date().toISOString(),mode:body.mode==='scheduled'?'scheduled':'manual-import',advertisement:body.advertisementValues?{values:body.advertisementValues,checkedAt:body.sourceReadAt||new Date().toISOString()}:(previous?JSON.parse(previous.payload).advertisement:null),refreshConfig:previous?JSON.parse(previous.payload).refreshConfig:null}),importedAt=new Date().toISOString();
 if(previous){const changed=await db.update(trackerSource).set({payload,importedAt,revision:previous.revision+1}).where(eq(trackerSource.revision,expected)).returning();if(!changed.length)return Response.json({error:'Import conflict. Reload and review.'},{status:409});}
 else await db.insert(trackerSource).values({id:'tracker',payload,importedAt,revision:1});
 return Response.json({ok:true,count:records.length,importedAt});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Import failed'},{status:400});}
}
