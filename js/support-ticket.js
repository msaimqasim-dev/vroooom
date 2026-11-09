// The original is Gravity Forms form 2 (WordPress postback with signed state and
// spam protection). Do not copy state tokens or POST directly to that page.
// Future integration: inject a server-backed submitTicket(FormData, {signal})
// adapter only after verifying delivery to the existing ticket workflow.
// It must reject failures and return {confirmed:true, ticketId:string} only
// after the backend has confirmed ticket creation. Validate uploads server-side.
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const fileTypes = Object.freeze({
  jpg: ['image/jpeg'], gif: ['image/gif'], png: ['image/png'],
  pdf: ['application/pdf'], doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
});
export function attachmentError(files) {
  for (const file of files) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!fileTypes[extension] || (file.type && file.type !== 'application/octet-stream' && !fileTypes[extension].includes(file.type)))
      return 'Please choose a JPG, GIF, PNG, PDF, DOC or DOCX file.';
    if (file.size > MAX_FILE_BYTES) return 'Each file must be 2 MB or smaller.';
  }
  return '';
}

export function initSupportForm(form, {submitTicket = null} = {}) {
  if (!form) return () => {};
  const events = new AbortController();
  const fields = [...form.querySelectorAll('input, textarea')];
  const summary = form.querySelector('#support-summary');
  const status = form.querySelector('#support-status');
  const button = form.querySelector('[type=submit]');
  const upload = form.querySelector('[type=file]');
  const email = form.elements.namedItem('input_9');
  const confirm = form.elements.namedItem('input_9_2');
  let busy = false, request;
  form.noValidate = true;
  button.disabled = false;

  const showError = (field, message) => {
    field.setCustomValidity(message);
    field.toggleAttribute('aria-invalid', false);
    if (message) field.setAttribute('aria-invalid', 'true');
    const errorId = field.getAttribute('aria-describedby')?.split(' ').find(id => id.endsWith('-error'));
    if (errorId) form.querySelector('#' + errorId).textContent = message;
  };
  const validateField = field => {
    field.setCustomValidity('');
    let message = '';
    if (field.type === 'file') message = attachmentError(field.files);
    else if (field.type === 'radio') {
      if (!form.querySelector(`input[name="${field.name}"]:checked`)) message = 'Please choose an option.';
    } else if (field.required && !field.value.trim()) message = 'Please complete this field.';
    else if (field.type === 'email' && field.validity.typeMismatch) message = 'Please enter a valid email address.';
    else if (field === confirm && field.value.trim() !== email.value.trim()) message = 'Your email addresses must match.';
    else if (field.type === 'url' && field.value) {
      try { const url = new URL(field.value); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw Error(); }
      catch { message = 'Please enter a website address starting with http:// or https://.'; }
    } else if (field.type === 'tel' && field.value.trim() && !/^(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}$/.test(field.value.trim())) message = 'Please enter a phone number such as (706) 576-4702.';
    showError(field, message);
    return !message;
  };
  form.addEventListener('input', event => {
    if (!fields.includes(event.target)) return;
    if (event.target.hasAttribute('aria-invalid')) validateField(event.target);
    if (event.target === email && confirm.value) validateField(confirm);
    summary.textContent = '';
    status.textContent = '';
  }, {signal: events.signal});
  upload.addEventListener('change', () => validateField(upload), {signal: events.signal});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    status.textContent = '';
    const invalid = fields.filter(field => !validateField(field));
    summary.textContent = invalid.length ? 'Please check the highlighted fields. Your ticket has not been sent.' : '';
    if (invalid.length) { invalid[0].focus(); return; }
    if (typeof submitTicket !== 'function') {
      status.textContent = 'Your ticket has not been sent. This form is not connected yet. Please use the live support form linked below. Your information has been kept here; it will not transfer automatically.';
      status.focus();
      return;
    }
    busy = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your support request…';
    request = new AbortController();
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const result = await submitTicket(new FormData(form), {signal: request.signal});
      if (result?.confirmed !== true || typeof result.ticketId !== 'string' || !result.ticketId.trim()) throw Error('Ticket creation not confirmed');
      status.textContent = `Your support ticket has been received. Ticket reference: ${result.ticketId}.`;
      form.reset();
    } catch {
      status.textContent = 'We could not confirm that your ticket was received. Your details are still here. Use the live support form or call (706) 576-4702 for help. If a request timed out, check with our team before sending it again.';
    } finally {
      clearTimeout(timeout);
      busy = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
      status.focus();
    }
  }, {signal: events.signal});
  return () => { events.abort(); request?.abort(); button.disabled = true; form.noValidate = false; };
}
let cleanup = () => {};
const mount = () => { cleanup(); cleanup = initSupportForm(document.querySelector('#support-form')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
else mount();
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
