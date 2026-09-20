/** Stable boundary for a future planning adapter; no external service is required. */
export interface Movement { id: string; title: string; description: string; minutes: number; color: string }
export interface ClassPlan { version: 1; className: string; periodMinutes: number; movements: Movement[]; source?: { classId?: string; lessonId?: string } }
export const defaultPlan: ClassPlan = { version: 1, className: 'English Class', periodMinutes: 50, movements: [
  { id: 'latin', title: 'Latin Phrase Interaction', description: 'Explore the phrase. Make a connection.', minutes: 3, color: '#755027' },
  { id: 'reading', title: 'Independent Reading', description: 'Settle in. Make space for a good book.', minutes: 10, color: '#32617f' },
  { id: 'course', title: 'Course Work', description: 'Focus on today’s learning.', minutes: 25, color: '#34634c' },
  { id: 'flex', title: 'Flex Time', description: 'Work ahead or complete a past assignment.', minutes: 10, color: '#745589' },
  { id: 'record', title: 'Record What We Did', description: 'Capture your learning before you leave.', minutes: 2, color: '#995344' }
] };
export function validatePlan(value: unknown): ClassPlan {
  const p = value as ClassPlan;
  if (!p || p.version !== 1 || typeof p.className !== 'string' || !p.className.trim() || p.className.length > 100 || !validMinutes(p.periodMinutes) || !Array.isArray(p.movements) || !p.movements.length || p.movements.length > 20) throw new Error('Invalid class plan');
  const ids = new Set<string>();
  for (const m of p.movements) {
    if (!m || typeof m.id !== 'string' || !m.id || ids.has(m.id) || typeof m.title !== 'string' || !m.title.trim() || m.title.length > 100 || typeof m.description !== 'string' || m.description.length > 300 || !validMinutes(m.minutes) || !/^#[\da-f]{6}$/i.test(m.color)) throw new Error('Invalid movement');
    ids.add(m.id);
  }
  return structuredClone(p);
}
function validMinutes(n: number) { return Number.isInteger(n) && n >= 1 && n <= 240; }
export interface Session { index: number; elapsed: number; movementElapsed: number; startedAt: number | null; complete: boolean }
export const newSession = (): Session => ({ index: 0, elapsed: 0, movementElapsed: 0, startedAt: null, complete: false });
export function times(s: Session, now: number) { const delta = s.startedAt === null ? 0 : Math.max(0, now - s.startedAt); return { total: s.elapsed + delta, movement: s.movementElapsed + delta }; }
export function pause(s: Session, now: number): Session { const t = times(s, now); return { ...s, elapsed: t.total, movementElapsed: t.movement, startedAt: null }; }
export function toggle(s: Session, now: number): Session { return s.complete ? s : s.startedAt === null ? { ...s, startedAt: now } : pause(s, now); }
export function advance(s: Session, count: number, now: number): Session {
  if (s.complete) return s;
  const stopped = pause(s, now);
  return s.index === count - 1 ? { ...stopped, complete: true } : { ...stopped, index: s.index + 1, movementElapsed: 0, startedAt: s.startedAt === null ? null : now };
}
export function clock(ms: number) { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
