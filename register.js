const form = document.getElementById('drift-form');
const successPanel = document.getElementById('success-panel');
const successName = document.getElementById('successName');

function setError(fieldEl, hasError) {
  fieldEl.classList.toggle('has-error', hasError);
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  // Honeypot check — if this hidden field has a value, it was almost certainly filled by a bot.
  // Silently stop here without telling the "user" anything went wrong (real people never see this field).
  const honeypot = form.elements['website'];
  if (honeypot && honeypot.value.trim() !== '') {
    return;
  }

  let isValid = true;

  // Text/email/select fields — required
  const requiredFields = ['fullName', 'phone', 'email', 'gender', 'location'];
  requiredFields.forEach((name) => {
    const input = form.elements[name];
    const fieldEl = input.closest('.field');
    const filled = input.value.trim() !== '';
    const validFormat = input.checkValidity();
    const ok = filled && validFormat;
    setError(fieldEl, !ok);
    if (!ok) isValid = false;
  });

  // Age confirmation checkbox
  const ageCheckbox = form.elements['ageConfirm'];
  const ageField = ageCheckbox.closest('.checkbox-field');
  setError(ageField, !ageCheckbox.checked);
  if (!ageCheckbox.checked) isValid = false;

  if (!isValid) {
    const firstError = form.querySelector('.has-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // No backend yet — show a placeholder success state
  successName.textContent = form.elements['fullName'].value.trim().split(' ')[0];
  form.hidden = true;
  successPanel.hidden = false;
  successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Clear individual field errors as the person fixes them
['fullName', 'phone', 'email', 'gender', 'location'].forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('input', () => {
    if (input.checkValidity() && input.value.trim() !== '') {
      setError(input.closest('.field'), false);
    }
  });
});

form.elements['ageConfirm'].addEventListener('change', function () {
  if (this.checked) {
    setError(this.closest('.checkbox-field'), false);
  }
});