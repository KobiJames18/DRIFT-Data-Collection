const form = document.getElementById('volunteer-form');
const successPanel = document.getElementById('success-panel');
const successName = document.getElementById('successName');
const roleSelect = document.getElementById('role');
const otherRoleField = document.getElementById('otherRoleField');

const SUPABASE_FUNCTION_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/submit-volunteer';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';

function setError(fieldEl, hasError) {
  fieldEl.classList.toggle('has-error', hasError);
}

function showSubmitError(message) {
  let errorBox = document.getElementById('submit-error');
  if (!errorBox) {
    errorBox = document.createElement('p');
    errorBox.id = 'submit-error';
    errorBox.style.color = 'var(--red)';
    errorBox.style.fontFamily = "'Space Mono', monospace";
    errorBox.style.fontSize = '13px';
    errorBox.style.textAlign = 'center';
    form.insertBefore(errorBox, form.querySelector('.submit-btn'));
  }
  errorBox.textContent = message;
}

// Show the "Other" text field only when "Other" is picked
roleSelect.addEventListener('change', function () {
  otherRoleField.hidden = this.value !== 'Other';
});

form.addEventListener('submit', async function (e) {
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

  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const payload = {
    fullName: form.elements['fullName'].value.trim(),
    phone: form.elements['phone'].value.trim(),
    email: form.elements['email'].value.trim(),
    location: form.elements['location'].value.trim(),
    role: form.elements['role'].value,
    otherRole: form.elements['otherRole'] ? form.elements['otherRole'].value.trim() : '',
    reason: form.elements['reason'] ? form.elements['reason'].value.trim() : '',
    ageConfirm: form.elements['ageConfirm'].checked,
    website: form.elements['website'].value, // honeypot, should be empty
  };

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      showSubmitError(result.error || 'Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
      return;
    }

    successName.textContent = payload.fullName.split(' ')[0];
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Volunteer submission failed:', err);
    showSubmitError('Could not connect. Please check your internet connection and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
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