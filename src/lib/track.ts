// Records a demo interaction in Microsoft Clarity as a real custom event, and tags
// the session "demo: engaged" so sessions that used a demo can be filtered as the
// positive engagement they are, never read as dead or rage clicks. Called only from
// the handler of a real click, key press or change.
export function track(name: string): void {
  try {
    const c = (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity;
    if (typeof c === 'function') { c('event', name); c('set', 'demo', 'engaged'); }
  } catch { /* analytics must never break the page */ }
}

// A short visible acknowledgement for a control whose click changes nothing else.
export function ack(el: Element): void {
  el.classList.remove('ack');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('ack');
  setTimeout(() => el.classList.remove('ack'), 450);
}
