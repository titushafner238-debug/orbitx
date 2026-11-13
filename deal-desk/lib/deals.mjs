export const SOURCE='https://docs.google.com/spreadsheets/d/1q3brJ2MuUDrlQ-Z1P4rSDTkssWNkqXcEEvr8P-M8sto/edit';
export const SOURCE_TAB='All Brand Outreach';
export const STATUSES=['Not submitted','Pending','Approved','Needs action','Denied','Awaiting reply','Shipping to confirm','Deliverables to confirm','Usage rights to confirm','Commission to confirm','Payout terms to confirm','Ready to promote','Completed'];
export function statusLabel(value){return value==='Pending'?'Waiting on brand':value;}
export const TERM_FIELDS=[['shipping','Shipping'],['deliverables','Deliverables'],['usage','Usage rights'],['commission','Commission'],['payout','Payout terms'],['referral','Referral link / code'],['discount','Viewer discount']];
export const STEPS=[['response','Response reviewed'],['terms','Terms confirmed'],['script','Script ready'],['filming','Filming complete'],['edit','Edit approved'],['published','Video published'],['payout','Payout reconciled']];
export function parseCSV(text){
 const rows=[];let row=[],v='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);rows.push(row);row=[];v='';}else v+=c;}
 if(quoted)throw new Error('A quoted CSV field is incomplete. Export the tracker again.');
 if(v||row.length){row.push(v);rows.push(row);}return rows;
}
export function normalizeRows(rows){
 if(!Array.isArray(rows)||rows.length>2005)throw new Error('Import up to 2,000 brand records.');
 const hi=rows.findIndex(r=>Array.isArray(r)&&r[0]?.toString().trim()==='Brand'&&r.includes('Approval status'));
 if(hi<0)throw new Error('Use a CSV export of All Brand Outreach, including its column headers.');
 const heads=rows[hi], seen=new Set();
 return rows.slice(hi+1).map((row,i)=>({row,i})).filter(({row})=>row?.[0]?.toString().trim()).map(({row,i})=>{
  if(!Array.isArray(row)||row.some(v=>v!=null&&typeof v!=='string'&&typeof v!=='number'))throw new Error('Invalid tracker cell.');
  const get=(...names)=>{const col=names.map(n=>heads.indexOf(n)).find(n=>n>=0);return col==null?'':String(row[col]??'').trim().slice(0,12000);};
  const brand=get('Brand'),id=brand.toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
  if(seen.has(id))throw new Error(`Duplicate brand: ${brand}. Resolve duplicate rows in the tracker first.`);seen.add(id);
  const d={id,brand,category:get('Company type'),type:get('Type','type'),approval:get('Approval status'),response:get('Latest response'),offer:get('Product / benefit'),commission:get('Confirmed commission'),payout:get('Revenue / payout details'),referral:get('Your public link / code'),discount:get('Viewer discount'),deliverables:get('Content deliverables / pitch','Content deliverables'),terms:get('Other terms / costs'),submission:get('Submission / outreach status','Submission status'),contact:get('Contact route'),lastContact:get('Applied / contacted'),nextStep:get('Next step / delivery notes','Next step'),program:get('Program / company URL','Program / company'),evidence:get('Evidence / email','Evidence'),checked:get('Last checked'),placement:get('Video placement'),videos:get('Videos appeared in'),dealStatus:get('Deal status'),notes:get('Video / deal notes'),eligibility:get('Goal eligibility','700 goal eligibility'),exclusion:get('Count / exclusion reason'),sourceRow:hi+i+2};
  d.termsKey=JSON.stringify([d.approval,d.commission,d.payout,d.referral,d.discount,d.deliverables,d.terms,d.offer]);
  return d;
 });
}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function overdue(w,date=today()){return !!w.nextFollowUp&&w.nextFollowUp<date&&w.status!=='Completed';}
export function ready(d,w){return d.approval==='Approved'&&TERM_FIELDS.every(([k])=>['confirmed','not applicable'].includes(w.terms?.[k]))&&!!w.termEvidence?.trim();}
export function effectiveWorkflow(d,w={}){
 if(w.termsKey&&w.termsKey!==d.termsKey)return {...w,terms:{},checks:{...w.checks,terms:false,script:false,filming:false,edit:false,published:false,payout:false},status:'Needs action',termsChanged:true};
 return w;
}
export function statusOf(d,w={}){return w.status||(d.approval==='Approved'?'Approved':d.approval==='Denied'?'Denied':/action|failed/i.test(d.approval)?'Needs action':/not submitted/i.test(d.approval)?'Not submitted':'Pending');}
export function isOnline(d){return /online|software|vpn|security|digital|creator tools|video editor|fonts|graphics|streaming/i.test(d.category);}
export function isFast(d){return /automatic.{0,35}(enroll|approv)|instant|no.{0,15}(minimum|approval)|anyone.{0,12}(join|apply)|low.approval/i.test([d.response,d.terms,d.submission].join(' '));}
export function needsAction(d,w){return overdue(w)||/action|to confirm/.test(statusOf(d,w).toLowerCase())||(d.approval==='Approved'&&!ready(d,w))||/Delivery failed/i.test(d.approval);}
export function nextAction(d,w){if(w.termsChanged)return 'Tracker terms changed. Review confirmations.';if(overdue(w))return 'Follow up · '+w.nextFollowUp;if(w.nextAction?.trim())return w.nextAction;if(d.nextStep?.trim())return d.nextStep;if(d.approval==='Approved'&&!ready(d,w)){const term=TERM_FIELDS.find(([k])=>!['confirmed','not applicable'].includes(w.terms?.[k]));return term?`Confirm ${term[1].toLowerCase()}`:'Add evidence for confirmed terms';}return d.nextStep||'Review the tracker record';}
export function matches(d,w,filter){switch(filter){case'waiting':return ['Pending','Awaiting reply'].includes(statusOf(d,w));case'action':return needsAction(d,w);case'overdue':return overdue(w);case'terms':return !ready(d,w)&&!['Denied','Completed'].includes(statusOf(d,w));case'approved':return d.approval==='Approved';case'fast':return isFast(d);case'online':return isOnline(d);case'ready':return ready(d,w)&&statusOf(d,w)!=='Completed';case'content':return !!w.content||d.placement==='Needs video';default:return true;}}
export function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function sourceUrl(d){return SOURCE+'#gid=2116051855&range=A'+d.sourceRow+':X'+d.sourceRow;}
export function validateWorkflow(d,w){
 if(!w||typeof w!=='object'||Array.isArray(w))throw new Error('Invalid handoff record.');
 if(w.status&&!STATUSES.includes(w.status))throw new Error('Choose a valid workflow status.');
 for(const k of ['nextFollowUp','payoutDue'])if(w[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(w[k]))throw new Error('Use a valid date.');
 for(const k of ['content','nextAction','termEvidence','notes','evidence','scriptUrl','publishedUrl','payoutExpected','payoutReceived','payoutDue','nextFollowUp','status','shippingStatus'])if(w[k]!=null&&(typeof w[k]!=='string'||w[k].length>12000))throw new Error('Invalid '+k+' field.');
 for(const [k] of TERM_FIELDS)if(w.terms?.[k]&&!['unverified','confirmed','not applicable'].includes(w.terms[k]))throw new Error('Invalid term confirmation.');
 let previous=true;for(const [k] of STEPS){if(w.checks?.[k]&&!previous)throw new Error('Complete earlier handoff steps first.');previous=!!w.checks?.[k];}
 if((w.checks?.terms||w.status==='Ready to promote'||w.status==='Completed')&&!ready(d,w))throw new Error('Confirm approval and all terms, then add written evidence before promoting.');
 if(w.checks?.script&&!w.content?.trim())throw new Error('Assign a video or ad before completing the script.');
 if(w.checks?.published&&!safeUrl(w.publishedUrl))throw new Error('Add a valid published video URL.');
 if(w.checks?.payout&&!w.payoutReceived?.trim())throw new Error('Record payout received or explain why no payout applies.');
 if(w.status==='Completed'&&!w.checks?.payout)throw new Error('Finish the handoff and reconcile the payout before completing.');
 return w;
}
