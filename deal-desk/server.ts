import {env} from 'cloudflare:workers';
import * as data from './app/api/data/route';
import * as profiles from './app/api/profiles/route';
import * as handoff from './app/api/handoff/route';
import * as importer from './app/api/import/route';
import * as config from './app/api/refresh-config/route';
import assets from './assets.json';
const E=env as any;
const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(v:string){return hex(await crypto.subtle.digest('SHA-256',enc.encode(v)))}
async function sign(v:string){const k=await crypto.subtle.importKey('raw',enc.encode(E.SESSION_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,enc.encode(v)))}
function equal(a:string,b:string){let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0}
export async function valid(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)__Host-desk=([^;]+)/)?.[1]||'';const [expiry,mac]=token.split('.');return !!mac&&Number(expiry)>Date.now()&&Number(expiry)<Date.now()+86401000&&equal(mac,await sign(expiry));}
function security(r:Response){const h=new Headers(r.headers);h.set('Cache-Control','private, no-store');h.set('X-Robots-Tag','noindex, nofollow, noarchive');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','same-origin');h.set('X-Frame-Options','DENY');h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");return new Response(r.body,{status:r.status,headers:h})}
const login=`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uncle Tye · Private Deal Desk</title><style>body{margin:0;background:#171e2b;color:#222a35;font:15px Arial;display:grid;min-height:100vh;place-items:center}main{background:#f7f8fa;border-radius:20px;padding:36px;width:min(340px,75vw)}h1{font-size:27px;margin:8px 0}small{letter-spacing:2px;color:#ad634e}p{color:#68717d;line-height:1.6}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:8px;margin:10px 0;border:1px solid #d0d4db;font:inherit}button{background:#ed795b;color:#171e2b;font-weight:bold;border:0}label{font-weight:bold}</style><main><small>UNCLE TYE</small><h1>Private Deal Desk</h1><p>Enter your password to open your brands, conversations and content handoffs.</p><form method="post" action="/login"><label for="password">Password</label><input id="password" name="password" type="password" required autofocus autocomplete="current-password" maxlength="128"><button>Open Deal Desk</button></form></main></html>`;
async function run(req:Request){const u=new URL(req.url);if(u.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n');
 if(req.method==='POST'&&req.headers.get('origin')!==u.origin)return Response.json({error:'Invalid origin'},{status:403});
 if(u.pathname==='/login'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>2048)return new Response('Request too large',{status:413});
  const id=await digest((req.headers.get('CF-Connecting-IP')||'unknown')+E.SESSION_KEY);const now=Date.now();
  await E.DB.prepare('DELETE FROM login_attempts WHERE expires < ?').bind(now).run();
  const count=await E.DB.prepare('INSERT INTO login_attempts(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,now+900000).first();
  if(count.count>5)return new Response('Too many attempts. Try again in 15 minutes.',{status:429,headers:{'Retry-After':'900'}});
  const form=await req.formData();const pass=String(form.get('password')||'');
  if(!equal(await digest(E.PASSWORD_SALT+':'+pass),E.PASSWORD_HASH))return new Response(login.replace('Enter your password','Incorrect password. Enter your password'),{status:401,headers:{'Content-Type':'text/html;charset=utf-8'}});
  await E.DB.prepare('DELETE FROM login_attempts WHERE id=?').bind(id).run();const expiry=String(now+86400000);return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':`__Host-desk=${expiry}.${await sign(expiry)}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`}});
 }
 if(!await valid(req))return u.pathname.startsWith('/api/')?Response.json({error:'Password required. Reload to sign in.'},{status:401}):new Response(login,{headers:{'Content-Type':'text/html;charset=utf-8'}});
 if(u.pathname==='/logout'&&req.method==='POST')return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':'__Host-desk=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}});
 const routes:any={'/api/data':data,'/api/profiles':profiles,'/api/handoff':handoff,'/api/import':importer,'/api/refresh-config':config};
 if(routes[u.pathname]){const fn=routes[u.pathname][req.method];return fn?await fn(req):new Response('Method not allowed',{status:405});}
 const a=(assets as any)[u.pathname];if(a&&req.method==='GET')return new Response(a.body,{headers:{'Content-Type':a.type}});return new Response('Not found',{status:404});
}
export default {async fetch(req:Request){try{return security(await run(req))}catch{return security(Response.json({error:'Unable to complete request. Please retry.'},{status:503}))}}};
