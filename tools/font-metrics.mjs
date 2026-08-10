import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path'; import os from 'node:os';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const port=9700+Math.floor(Math.random()*250);
const profile=path.join(os.tmpdir(),`labi-fb-${port}`);
await rm(profile,{recursive:true,force:true});
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore'});
async function ep(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok)return (await r.json()).webSocketDebuggerUrl;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('x');}
const ws=new WebSocket(await ep());const pend=new Map();let id=0;
await new Promise(r=>ws.addEventListener('open',r));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(m.error.message)):res(m.result);}});
const raw=(m,p={},s)=>new Promise((res,rej)=>{const n=++id;pend.set(n,{res,rej});ws.send(JSON.stringify({id:n,method:m,params:p,sessionId:s}));});
const {targetId}=await raw('Target.createTarget',{url:''+ (process.env.FONT_ORIGIN ?? 'http://localhost:4217') +''});
const {sessionId}=await raw('Target.attachToTarget',{targetId,flatten:true});
const send=(m,p)=>raw(m,p,sessionId);
await send('Runtime.enable');
await new Promise(r=>setTimeout(r,3500));
const {result}=await send('Runtime.evaluate',{returnByValue:true,awaitPromise:true,expression:`(async()=>{
  await document.fonts.ready;
  const m=(fam,w,st)=>{const s=document.createElement('span');
    s.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font-size:200px;font-weight:'+w+';font-stretch:'+st+';font-family:'+fam;
    s.textContent='Open als de rest sluit';document.body.appendChild(s);const r=s.getBoundingClientRect().width;s.remove();return Math.round(r);};
  return JSON.stringify({
    real:      m("'Anybody'",800,'112%'),
    fallback:  m("'Anybody fallback'",800,'112%'),
    arial:     m('Arial',800,'112%'),
    systemui:  m('ui-sans-serif,system-ui,sans-serif',800,'112%'),
    interReal: m("'Inter Tight'",400,'normal'),
    interFb:   m("'Inter fallback'",400,'normal'),
  });
})()`});
console.log(result.value);
ws.close();chrome.kill();await rm(profile,{recursive:true,force:true}).catch(()=>{});
