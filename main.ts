import './style.css';
import { defaultPlan, validatePlan, newSession, times, toggle, advance, clock, type ClassPlan } from './model';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let plan = structuredClone(defaultPlan), session = newSession(), student = false, storageMessage = '';
try { const saved = localStorage.getItem('class-clock-plan-v1'); if (saved) plan = validatePlan(JSON.parse(saved)); } catch { storageMessage = 'Saved settings could not be loaded. Using the default rhythm.'; }
// Class names identify presets. One storage write keeps the selected class and library together.
let presets: ClassPlan[] = [structuredClone(plan)];
const presetKey = (name: string) => name.trim().toLocaleLowerCase();
try {
  const raw = localStorage.getItem('tempusfugit-presets-v1');
  if (raw) {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.plans) || saved.plans.length === 0) throw new Error('Invalid presets');
    const loaded: ClassPlan[] = saved.plans.map(validatePlan);
    if (new Set(loaded.map(p => presetKey(p.className))).size !== loaded.length) throw new Error('Duplicate presets');
    presets = loaded;
    plan = structuredClone(presets.find(p => presetKey(p.className) === saved.selected) ?? presets[0]);
  }
} catch { storageMessage = 'Saved classes could not be loaded. Your current rhythm is still available.'; }
function savePresets() {
  try {
    localStorage.setItem('tempusfugit-presets-v1', JSON.stringify({ plans: presets, selected: presetKey(plan.className) }));
    storageMessage = '';
  } catch { storageMessage = 'Changes work now, but this browser cannot save them. Keep this tab open.'; }
}
$('app').innerHTML = `
<header><a class="brand" href="./" aria-label="Tempus fugit home"><span class="brand-icon">◷</span> TEMPUS FUGIT <span class="beta">BETA</span></a><div class="view-tools"><button id="fullscreen">⛶ <span>Full screen</span></button><button id="view">Student View ↗</button></div></header>
<main><section class="class-heading"><div><p class="eyebrow">OUR TIME TOGETHER</p><h1 id="class-name"></h1></div><button id="edit" class="teacher-only">Edit class & rhythm <span>↗</span></button></section>
<section class="preset-bar teacher-only" aria-label="Saved classes"><label for="class-preset">Saved classes<select id="class-preset"></select></label><button id="new-class">＋ New class</button><button id="delete-class" class="quiet">Remove saved class</button><p id="preset-note" role="status">Saved on this browser only.</p></section>
<div class="workspace"><section class="clock-panel" aria-label="Current movement"><div class="clock-top"><span id="movement-number" class="eyebrow"></span><span id="state" class="status" role="status"></span></div><h2 id="movement-title"></h2><p id="description"></p><div id="countdown" class="countdown" role="timer" aria-label="Movement time remaining"></div><p id="clock-caption" class="clock-caption"></p><div class="movement-track"><div id="movement-progress"></div></div><div class="up-next"><span class="eyebrow">UP NEXT</span><strong id="next-title"></strong><span id="next-duration"></span></div></section>
<aside class="period-panel"><div class="period-top"><p class="eyebrow">CLASS TIME LEFT</p><span id="period-length"></span></div><div id="total-countdown" class="total-countdown" role="timer" aria-label="Class time remaining"></div><p id="period-caption">A little structure. Room to learn.</p><div class="period-track"><div id="period-progress"></div></div><div class="rhythm-title"><h2>Today’s rhythm</h2><span id="planned-total"></span></div><ol id="rhythm"></ol><p id="allocation"></p></aside></div>
<section class="controls" aria-label="Timer controls"><div class="control-buttons"><button id="start" class="primary">▶ Start class</button><button id="next">Next movement →</button><button id="reset" class="quiet teacher-only">↺ Reset</button></div><p id="control-note">You set the pace. Movements advance only when you say so.</p></section>
<footer><span>ONE CLASS. FIVE MOMENTS TO MAKE IT COUNT.</span><span id="save-note">Settings saved on this browser</span></footer></main>
<dialog id="editor"><form id="plan-form"><div class="dialog-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>Class & rhythm</h2></div><button type="button" id="close-editor" aria-label="Close editor">✕</button></div><p>Saving starts a fresh class. Use a new class name to save another preset; an existing name updates that preset.</p><div class="form-top"><label>Class name<input id="name-input" name="className" maxlength="100" required></label><label>Period (minutes)<input id="period-input" name="period" type="number" min="1" max="240" step="1" required></label></div><div id="movement-fields"></div><p id="draft-allocation" role="status"></p><p id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" id="cancel-editor">Cancel</button><button class="primary" type="submit">Save class preset</button></div></form></dialog>
<dialog id="reset-dialog"><h2>Start this class again?</h2><p>Both clocks return to the beginning. Your class name and rhythm stay saved.</p><div class="dialog-actions"><button id="cancel-reset">Keep class</button><button id="confirm-reset" class="primary">Reset clocks</button></div></dialog>`;
function renderPlan() {
  $('class-name').textContent = plan.className;
  $<HTMLSelectElement>('class-preset').innerHTML = presets.map(p => `<option value="${escape(presetKey(p.className))}">${escape(p.className)}</option>`).join('');
  $<HTMLSelectElement>('class-preset').value = presetKey(plan.className);
  $<HTMLButtonElement>('delete-class').disabled = presets.length < 2;
  $('preset-note').textContent = storageMessage || 'Saved on this browser only.';
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
function openEditor(newClass = false) {
  if(session.startedAt!==null)session=toggle(session,Date.now());renderClock();
  $<HTMLInputElement>('name-input').value=newClass ? '' : plan.className;$<HTMLInputElement>('period-input').value=String(plan.periodMinutes);
  $('movement-fields').innerHTML=plan.movements.map((m,i)=>`<fieldset><legend><span style="color:${m.color}">●</span> Movement ${i+1}</legend><div class="form-top"><label>Movement name<input name="title-${i}" value="${escape(m.title)}" maxlength="100" required></label><label>Minutes<input name="minutes-${i}" type="number" min="1" max="240" step="1" value="${m.minutes}" required></label></div><label>Student instruction<input name="description-${i}" value="${escape(m.description)}" maxlength="300"></label></fieldset>`).join('');
  $('form-error').textContent='';draftAllocation();editor.showModal();
};
$('edit').onclick=()=>openEditor();
$('new-class').onclick=()=>openEditor(true);
$('class-preset').onchange=()=>{
  const select = $<HTMLSelectElement>('class-preset');
  const chosen = presets.find(p => presetKey(p.className) === select.value);
  if (!chosen || presetKey(chosen.className) === presetKey(plan.className)) return;
  if (!session.complete && (session.startedAt !== null || session.elapsed > 0 || session.index > 0)) {
    if (session.startedAt !== null) session = toggle(session, Date.now());
    renderClock();
    if (!window.confirm(`Switch to ${chosen.className}? This resets both clocks. Cancel keeps the current class paused.`)) {
      select.value = presetKey(plan.className); return;
    }
  }
  plan = structuredClone(chosen); session = newSession(); savePresets(); renderPlan();
};
$('delete-class').onclick=()=>{
  if (presets.length < 2) return;
  if (session.startedAt !== null) session = toggle(session, Date.now());
  renderClock();
  if (!window.confirm(`Remove the saved class “${plan.className}” from this browser? Another saved class will load with fresh clocks.`)) return;
  presets = presets.filter(p => presetKey(p.className) !== presetKey(plan.className));
  plan = structuredClone(presets[0]); session = newSession(); savePresets(); renderPlan();
};
function draftAllocation(){const form=$<HTMLFormElement>('plan-form');const sum=plan.movements.reduce((a,_,i)=>a+Number((form.elements.namedItem(`minutes-${i}`) as HTMLInputElement).value),0);$('draft-allocation').textContent=allocation(Number($<HTMLInputElement>('period-input').value),sum);}
$('plan-form').addEventListener('input',draftAllocation);
$('close-editor').onclick=$('cancel-editor').onclick=()=>editor.close();
$('plan-form').onsubmit=(e)=>{e.preventDefault();const data=new FormData($<HTMLFormElement>('plan-form'));try{
  const updated=validatePlan({...plan,className:String(data.get('className')).trim(),periodMinutes:Number(data.get('period')),movements:plan.movements.map((m,i)=>({...m,title:String(data.get(`title-${i}`)).trim(),description:String(data.get(`description-${i}`)).trim(),minutes:Number(data.get(`minutes-${i}`))}))});
  const existing = presets.findIndex(p => presetKey(p.className) === presetKey(updated.className));
  if (existing >= 0 && presetKey(updated.className) !== presetKey(plan.className) && !window.confirm(`Replace the saved rhythm for ${presets[existing].className}?`)) return;
  plan = updated;
  if (existing >= 0) presets[existing] = structuredClone(plan); else presets.push(structuredClone(plan));
  savePresets();
  session=newSession();renderPlan();editor.close();
}catch{$('form-error').textContent='Use a class name, movement names, and whole minutes from 1 to 240.';}};
$('reset').onclick=()=>{$<HTMLDialogElement>('reset-dialog').showModal();};
$('cancel-reset').onclick=()=>$<HTMLDialogElement>('reset-dialog').close();
$('confirm-reset').onclick=()=>{session=newSession();renderClock();$<HTMLDialogElement>('reset-dialog').close();};
renderPlan();setInterval(renderClock,200);
