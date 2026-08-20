const form = document.getElementById('drift-form');
const successPanel = document.getElementById('success-panel');
const successName = document.getElementById('successName');

const SUPABASE_FUNCTION_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/register-participant';
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

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  // Honeypot check if this hidden field has a value, it was almost certainly filled by a bot.
  // Silently stop here without telling the "user" anything went wrong (real people never see this field).
  const honeypot = form.elements['website'];
  if (honeypot && honeypot.value.trim() !== '') {
    return;
  }

  let isValid = true;

  // Text/email/select fields required
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

  // Disable the button while we wait, so people can't double submit
  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const payload = {
    fullName: form.elements['fullName'].value.trim(),
    phone: form.elements['phone'].value.trim(),
    email: form.elements['email'].value.trim(),
    gender: form.elements['gender'].value,
    org: form.elements['org'].value.trim(),
    location: form.elements['location'].value.trim(),
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
      submitBtn.textContent = 'Complete Registration';
      return;
    }

    // Success — but this is now a PENDING submission, not an instantly confirmed ticket.
    // Show the reference ID and set expectations that review/confirmation follows.
    successName.textContent = payload.fullName.split(' ')[0];
    const regIdEl = document.getElementById('registrationId');
    if (regIdEl) regIdEl.textContent = result.registrationId;
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Registration failed:', err);
    showSubmitError('Could not connect. Please check your internet connection and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Registration';
  }
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