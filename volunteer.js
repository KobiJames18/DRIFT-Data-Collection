const form = document.getElementById('volunteer-form');
const successPanel = document.getElementById('success-panel');
const successName = document.getElementById('successName');
const roleSelect = document.getElementById('role');
const otherRoleField = document.getElementById('otherRoleField');

function setError(fieldEl, hasError) {
  fieldEl.classList.toggle('has-error', hasError);
}

// Show the "Other" text field only when "Other" is picked
roleSelect.addEventListener('change', function () {
  otherRoleField.hidden = this.value !== 'Other';
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  // Honeypot check — silently stop if the hidden field was filled (bot behavior)
  const honeypot = form.elements['website'];
  if (honeypot && honeypot.value.trim() !== '') {
    return;
  }

  let isValid = true;

  const requiredFields = ['fullName', 'phone', 'email', 'location', 'role'];
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
['fullName', 'phone', 'email', 'location', 'role'].forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('input', () => {
    if (input.checkValidity() && input.value.trim() !== '') {
      setError(input.closest('.field'), false);
    }
  });
  input.addEventListener('change', () => {
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