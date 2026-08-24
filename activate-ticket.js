const VERIFY_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/verify-ticket';
const ACTIVATE_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/activate-ticket';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';

const stepCodeForm = document.getElementById('step-code-form');
const stepDetailsForm = document.getElementById('step-details-form');
const successPanel = document.getElementById('success-panel');
const stepCodeError = document.getElementById('step-code-error');
const stepDetailsError = document.getElementById('step-details-error');

let verifiedTicketCode = '';
let selectedPhotoBase64 = '';

function setError(fieldEl, hasError) {
  fieldEl.classList.toggle('has-error', hasError);
}

// ---------- STEP 1: verify the ticket code exists and is unused ----------
stepCodeForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  stepCodeError.style.display = 'none';

  const ticketCode = document.getElementById('ticketCode').value.trim().toUpperCase();
  if (!ticketCode) return;

  const submitBtn = stepCodeForm.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ ticketCode }),
    });
    const result = await response.json();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';

    if (!response.ok) {
      stepCodeError.textContent = result.error || 'Something went wrong. Please try again.';
      stepCodeError.style.display = 'block';
      return;
    }

    if (!result.valid) {
      if (result.reason === 'already_used') {
        stepCodeError.textContent = 'This ticket has already been registered.';
      } else {
        stepCodeError.textContent = 'Ticket code not found. Please check it and try again.';
      }
      stepCodeError.style.display = 'block';
      return;
    }

    // Valid and unused — move to step 2
    verifiedTicketCode = ticketCode;
    document.getElementById('confirmedCode').textContent = ticketCode;
    stepCodeForm.hidden = true;
    stepDetailsForm.hidden = false;
    stepDetailsForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Verify failed:', err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';
    stepCodeError.textContent = 'Could not connect. Please check your internet connection and try again.';
    stepCodeError.style.display = 'block';
  }
});

// ---------- Photo preview + compression ----------
// Phone camera photos are often 5-15MB, far too slow to upload on mobile data
// and often too large for the server to accept. Resize + compress before sending.
document.getElementById('photoInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      const MAX_DIMENSION = 800;
      let { width, height } = img;

      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // JPEG at 0.75 quality — small enough to upload quickly even on slow connections,
      // still clear enough for door staff to visually verify identity.
      selectedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.75);

      const preview = document.getElementById('photoPreview');
      preview.src = selectedPhotoBase64;
      preview.style.display = 'block';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// ---------- STEP 2: PIN + registration + photo ----------
stepDetailsForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  stepDetailsError.style.display = 'none';

  let isValid = true;
  const requiredFields = ['pin', 'fullName', 'phone', 'email'];
  requiredFields.forEach((name) => {
    const input = document.getElementById(name);
    const fieldEl = input.closest('.field');
    const ok = input.value.trim() !== '' && input.checkValidity();
    setError(fieldEl, !ok);
    if (!ok) isValid = false;
  });

  const photoField = document.getElementById('photoInput').closest('.field');
  const hasPhoto = !!selectedPhotoBase64;
  setError(photoField, !hasPhoto);
  if (!hasPhoto) isValid = false;

  if (!isValid) {
    const firstError = stepDetailsForm.querySelector('.has-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = stepDetailsForm.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const payload = {
    ticketCode: verifiedTicketCode,
    pin: document.getElementById('pin').value.trim(),
    fullName: document.getElementById('fullName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    photoBase64: selectedPhotoBase64,
  };

  try {
    const response = await fetch(ACTIVATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      const detailText = Array.isArray(result.details) ? result.details.join(' ') : '';
      stepDetailsError.textContent = detailText || result.error || 'Something went wrong. Please try again.';
      stepDetailsError.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Registration';
      return;
    }

    stepDetailsForm.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Activation failed:', err);
    stepDetailsError.textContent = 'Could not connect. Please check your internet connection and try again.';
    stepDetailsError.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Registration';
  }
});