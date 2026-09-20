import './style.css';
import { defaultPlan, validatePlan, newSession, times, toggle, advance, clock, type ClassPlan } from './model';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let plan = structuredClone(defaultPlan), session = newSession(), student = false, storageMessage = '';
try { const saved = localStorage.getItem('class-clock-plan-v1'); if (saved) plan = validatePlan(JSON.parse(saved)); } catch { storageMessage = 'Saved settings could not be loaded. Using the default rhythm.'; }
$('app').innerHTML = `
<header><a class="brand" href="./" aria-label="Tempus fugit home"><span class="brand-icon">◷</span> TEMPUS FUGIT <span class="beta">BETA</span></a><div class="view-tools"><button id="fullscreen">⛶ <span>Full screen</span></button><button id="view">Student View ↗</button></div></header>
<main><section class="class-heading"><div><p class="eyebrow">OUR TIME TOGETHER</p><h1 id="class-name"></h1></div><button id="edit" class="teacher-only">Edit class & rhythm <span>↗</span></button></section>
<div class="workspace"><section class="clock-panel" aria-label="Current movement"><div class="clock-top"><span id="movement-number" class="eyebrow"></span><span id="state" class="status" role="status"></span></div><h2 id="movement-title"></h2><p id="description"></p><div id="countdown" class="countdown" role="timer" aria-label="Movement time remaining"></div><p id="clock-caption" class="clock-caption"></p><div class="movement-track"><div id="movement-progress"></div></div><div class="up-next"><span class="eyebrow">UP NEXT</span><strong id="next-title"></strong><span id="next-duration"></span></div></section>
<aside class="period-panel"><div class="period-top"><p class="eyebrow">CLASS TIME LEFT</p><span id="period-length"></span></div><div id="total-countdown" class="total-countdown" role="timer" aria-label="Class time remaining"></div><p id="period-caption">A little structure. Room to learn.</p><div class="period-track"><div id="period-progress"></div></div><div class="rhythm-title"><h2>Today’s rhythm</h2><span id="planned-total"></span></div><ol id="rhythm"></ol><p id="allocation"></p></aside></div>
<section class="controls" aria-label="Timer controls"><div class="control-buttons"><button id="start" class="primary">▶ Start class</button><button id="next">Next movement →</button><button id="reset" class="quiet teacher-only">↺ Reset</button></div><p id="control-note">You set the pace. Movements advance only when you say so.</p></section>
<footer><span>ONE CLASS. FIVE MOMENTS TO MAKE IT COUNT.</span><span id="save-note">Settings saved on this browser</span></footer></main>
<dialog id="editor"><form id="plan-form"><div class="dialog-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>Class & rhythm</h2></div><button type="button" id="close-editor" aria-label="Close editor">✕</button></div><p>Changes start a fresh class. Your current clock stays paused.</p><div class="form-top"><label>Class name<input id="name-input" name="className" maxlength="100" required></label><label>Period (minutes)<input id="period-input" name="period" type="number" min="1" max="240" step="1" required></label></div><div id="movement-fields"></div><p id="draft-allocation" role="status"></p><p id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" id="cancel-editor">Cancel</button><button class="primary" type="submit">Save rhythm</button></div></form></dialog>
<dialog id="reset-dialog"><h2>Start this class again?</h2><p>Both clocks return to the beginning. Your class name and rhythm stay saved.</p><div class="dialog-actions"><button id="cancel-reset">Keep class</button><button id="confirm-reset" class="primary">Reset clocks</button></div></dialog>`;
function renderPlan() {
  $('class-name').textContent = plan.className;
  $('period-length').textContent = `${plan.periodMinutes} min period`;
  $('planned-total').textContent = `${plan.movements.reduce((a,m)=>a+m.minutes,0)} min`;
  $('rhythm').innerHTML = plan.movements.map((m,i)=>`<li style="--row-color:${m.color}"><span class="step">${String(i+1).padStart(2,'0')}</span><span>${escape(m.title)}</span><strong>${m.minutes}<small> min</small></strong></li>`).join('');
  $('allocation').textContent = allocation(plan.periodMinutes, plan.movements.reduce((a,m)=>a+m.minutes,0));
  $('save-note').textContent = storageMessage || 'Settings saved on this browser';
  renderClock();
}
function allocation(period:number, sum:number) { return sum===period ? 'Every minute has a place.' : sum<period ? `${period-sum} min unallocated · room to flex` : `${sum-period} min over the period · adjust or advance early`; }
function renderClock() {
  const m = plan.movements[session.index], next = plan.movements[session.index+1], t = times(session, Date.now());
  const remaining = m.minutes*60000-t.movement, totalRemaining = plan.periodMinutes*60000-t.total;
  document.documentElement.style.setProperty('--movement',m.color);
  document.documentElement.style.setProperty('--next-color', !session.complete && next ? next.color : '#263d33');
  $('movement-number').textContent = `MOVEMENT ${String(session.index+1).padStart(2,'0')} / ${String(plan.movements.length).padStart(2,'0')}`;
  $('state').textContent = session.complete?'Class complete':session.startedAt!==null?'● In progress':t.total>0?'Ⅱ Paused':'Ready when you are';
  $('movement-title').textContent = session.complete?'Nicely done.':m.title;
  $('description').textContent = session.complete?'A little time to reflect. A fresh start next class.':m.description;
  $('countdown').textContent = clock(remaining);
  $('clock-caption').textContent = session.complete?'CLASS COMPLETE':remaining<=0?`WRAP UP · ${clock(-remaining)} over · advance when ready`:'REMAINING IN THIS MOVEMENT';
  $('total-countdown').textContent = clock(totalRemaining);
  $('period-caption').textContent = totalRemaining<=0?`Period ended · ${clock(-totalRemaining)} over`:session.complete?'Class finished. See you next time.':'A little structure. Room to learn.';
  $('movement-progress').style.width = `${Math.min(100,t.movement/(m.minutes*60000)*100)}%`;
  $('period-progress').style.width = `${Math.min(100,t.total/(plan.periodMinutes*60000)*100)}%`;
  $('next-title').textContent = session.complete?'Ready for a new class':next?.title ?? 'A moment to reflect';
  $('next-duration').textContent = !session.complete&&next?`${next.minutes} min`:'';
  $('start').textContent = session.complete?'Class complete':session.startedAt!==null?'Ⅱ Pause':t.total>0?'▶ Resume':'▶ Start class';
  ($('start') as HTMLButtonElement).disabled=session.complete;
  ($('next') as HTMLButtonElement).disabled=session.complete;
  $('next').textContent=next?'Next movement →':'Finish class ✓';
  document.querySelectorAll('#rhythm li').forEach((row,i)=>{row.classList.toggle('current',i===session.index&&!session.complete); row.classList.toggle('done',i<session.index||session.complete); if(i===session.index&&!session.complete)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');});
}
$('start').onclick=()=>{session=toggle(session,Date.now());renderClock();};
$('next').onclick=()=>{session=advance(session,plan.movements.length,Date.now());renderClock();};
$('view').onclick=()=>{student=!student;document.body.classList.toggle('student',student);$('view').textContent=student?'Teacher View ↙':'Student View ↗';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('control-note').textContent='Full screen is unavailable here. Use your browser’s full-screen command.';}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').innerHTML=document.fullscreenElement?'⛶ <span>Exit full screen</span>':'⛶ <span>Full screen</span>';});
const editor=$<HTMLDialogElement>('editor');
$('edit').onclick=()=>{
  if(session.startedAt!==null)session=toggle(session,Date.now());renderClock();
  $<HTMLInputElement>('name-input').value=plan.className;$<HTMLInputElement>('period-input').value=String(plan.periodMinutes);
  $('movement-fields').innerHTML=plan.movements.map((m,i)=>`<fieldset><legend><span style="color:${m.color}">●</span> Movement ${i+1}</legend><div class="form-top"><label>Movement name<input name="title-${i}" value="${escape(m.title)}" maxlength="100" required></label><label>Minutes<input name="minutes-${i}" type="number" min="1" max="240" step="1" value="${m.minutes}" required></label></div><label>Student instruction<input name="description-${i}" value="${escape(m.description)}" maxlength="300"></label></fieldset>`).join('');
  $('form-error').textContent='';draftAllocation();editor.showModal();
};
function draftAllocation(){const form=$<HTMLFormElement>('plan-form');const sum=plan.movements.reduce((a,_,i)=>a+Number((form.elements.namedItem(`minutes-${i}`) as HTMLInputElement).value),0);$('draft-allocation').textContent=allocation(Number($<HTMLInputElement>('period-input').value),sum);}
$('plan-form').addEventListener('input',draftAllocation);
$('close-editor').onclick=$('cancel-editor').onclick=()=>editor.close();
$('plan-form').onsubmit=(e)=>{e.preventDefault();const data=new FormData($<HTMLFormElement>('plan-form'));try{
  plan=validatePlan({...plan,className:String(data.get('className')).trim(),periodMinutes:Number(data.get('period')),movements:plan.movements.map((m,i)=>({...m,title:String(data.get(`title-${i}`)).trim(),description:String(data.get(`description-${i}`)).trim(),minutes:Number(data.get(`minutes-${i}`))}))});
  try{localStorage.setItem('class-clock-plan-v1',JSON.stringify(plan));storageMessage='';}catch{storageMessage='Settings apply now, but this browser cannot save them.';}
  session=newSession();renderPlan();editor.close();
}catch{$('form-error').textContent='Use a class name, movement names, and whole minutes from 1 to 240.';}};
$('reset').onclick=()=>{$<HTMLDialogElement>('reset-dialog').showModal();};
$('cancel-reset').onclick=()=>$<HTMLDialogElement>('reset-dialog').close();
$('confirm-reset').onclick=()=>{session=newSession();renderClock();$<HTMLDialogElement>('reset-dialog').close();};
renderPlan();setInterval(renderClock,200);
