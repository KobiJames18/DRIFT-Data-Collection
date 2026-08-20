const form = document.getElementById('check-form');
const resultPanel = document.getElementById('result-panel');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultDetail = document.getElementById('result-detail');
const errorBox = document.getElementById('check-error');

const SUPABASE_FUNCTION_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/check-ticket';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
}

const STATUS_MESSAGES = {
  Registered: { icon: '✓', title: 'Valid ticket', detail: 'confirmed and ready for entry.' },
  Pending: { icon: '⏳', title: 'Still under review', detail: 'registered but pending admin approval. Check back soon.' },
  Rejected: { icon: '✕', title: 'Not confirmed', detail: 'this registration was not approved. Contact us if you think this is a mistake.' },
  Cancelled: { icon: '✕', title: 'Cancelled', detail: 'this ticket has been cancelled.' },
  Attended: { icon: '✓', title: 'Already checked in', detail: 'this ticket was already used for entry.' },
};

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const regId = form.elements['regId'].value.trim();
  if (!regId) return;

  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ registrationId: regId }),
    });

    const result = await response.json();

    if (!response.ok) {
      showError(result.error || 'Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Check Ticket';
      return;
    }

    if (!result.found) {
      resultIcon.textContent = '✕';
      resultTitle.textContent = 'Ticket not found';
      resultDetail.textContent = "We couldn't find a registration with that ID. Double-check it and try again, or contact us.";
    } else {
      const info = STATUS_MESSAGES[result.status] || { icon: '?', title: result.status, detail: '' };
      resultIcon.textContent = info.icon;
      resultTitle.textContent = `Hi ${result.firstName}, ${info.title.toLowerCase()}.`;
      resultDetail.textContent = `Your ${result.ticketCategory || ''} ticket is ${info.detail}`;
    }

    form.hidden = true;
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Ticket check failed:', err);
    showError('Could not connect. Please check your internet connection and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Check Ticket';
  }
});