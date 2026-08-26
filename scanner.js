const SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';
const SCANNER_CHECKIN_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/scanner-checkin';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- AUTH GUARD ----------
// Note: this only checks the user is logged in and listed as staff, for UX routing.
// The real enforcement is server-side in the scanner-checkin Edge Function, which
// independently verifies the session token on every single request.
let currentAccessToken = null;

(async function guardPage() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'admin.login.html';
    return;
  }

  const { data: staffRow } = await supabaseClient
    .from('admins')
    .select('id, email')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!staffRow) {
    await supabaseClient.auth.signOut();
    window.location.href = 'admin.login.html';
    return;
  }

  currentAccessToken = session.access_token;
  document.getElementById('staff-email').textContent = staffRow.email || session.user.email;
  document.getElementById('scanner-main').hidden = false;
})();

document.getElementById('logout-link').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = 'admin.login.html';
});

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// People often type ticket codes without hyphens. Normalize so punctuation/case
// never causes a false "not found" for what is actually a valid ticket.
function normalizeTicketCode(raw) {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (/^DR[0-9A-F]{8}$/.test(cleaned)) {
    return `DR-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  }
  return cleaned;
}

// ---------- SEARCH + CHECK-IN (via Edge Function only) ----------
const checkinInput = document.getElementById('checkin-search-input');
const checkinResult = document.getElementById('checkin-result');

async function callScannerFunction(action, registrationId) {
  const response = await fetch(SCANNER_CHECKIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentAccessToken}`,
    },
    body: JSON.stringify({ action, registrationId }),
  });
  return { ok: response.ok, data: await response.json() };
}

async function performCheckinSearch() {
  const regId = normalizeTicketCode(checkinInput.value.trim());
  if (!regId) return;

  checkinResult.innerHTML = '<p class="state-msg">Searching...</p>';

  const { ok, data } = await callScannerFunction('lookup', regId);

  if (!ok) {
    checkinResult.innerHTML = `<p class="state-msg error-state">${escapeHtml(data.error || 'Something went wrong.')}</p>`;
    return;
  }

  if (!data.found) {
    checkinResult.innerHTML = '<p class="state-msg error-state">No registration found with that ID.</p>';
    return;
  }

  let statusWarning = '';
  if (data.status !== 'Registered') {
    statusWarning = `<p class="checkin-warn">Status is "${escapeHtml(data.status)}" — not an approved, confirmed ticket. Verify before allowing entry.</p>`;
  }

  const photoHtml = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="${escapeHtml(data.fullName)}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`
    : '';

  checkinResult.innerHTML = `
    <div class="checkin-card">
      ${photoHtml}
      <div class="checkin-name">${escapeHtml(data.fullName)}</div>
      <div class="checkin-id">${escapeHtml(regId)}</div>
      ${statusWarning}
      ${data.alreadyCheckedIn
        ? `<p class="checkin-already">✓ Already checked in at ${new Date(data.checkedInAt).toLocaleTimeString()}</p>`
        : `<button class="checkin-btn-in" id="confirm-checkin-btn">Check In Now</button>`
      }
    </div>
  `;

  const confirmBtn = document.getElementById('confirm-checkin-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Checking in...';

      const { ok: checkinOk, data: checkinData } = await callScannerFunction('checkin', regId);

      if (!checkinOk) {
        alert('Could not check in: ' + (checkinData.error || 'Please try again.'));
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Check In Now';
        return;
      }

      performCheckinSearch(); // re-render to show the "already checked in" state
    });
  }
}

document.getElementById('checkin-search-btn').addEventListener('click', performCheckinSearch);
checkinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performCheckinSearch();
  }
});

// ---------- QR SCANNER ----------
let qrScanner = null;
let qrScanning = false;

const scanToggleBtn = document.getElementById('checkin-scan-toggle');
const qrReaderDiv = document.getElementById('qr-reader');

scanToggleBtn.addEventListener('click', async () => {
  if (qrScanning) {
    await stopQrScanner();
    return;
  }

  qrReaderDiv.hidden = false;
  scanToggleBtn.textContent = '✕ Stop Scanning';
  qrScanning = true;

  qrScanner = new Html5Qrcode('qr-reader');

  try {
    await qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 240 },
      async (decodedText) => {
        checkinInput.value = decodedText.trim();
        await stopQrScanner();
        performCheckinSearch();
      },
      () => {}
    );
  } catch (err) {
    console.error('Camera start failed:', err);
    checkinResult.innerHTML = '<p class="state-msg error-state">Could not access the camera. Check permissions, or use the search box instead.</p>';
    await stopQrScanner();
  }
});

async function stopQrScanner() {
  if (qrScanner && qrScanning) {
    try {
      await qrScanner.stop();
      qrScanner.clear();
    } catch (err) {
      // scanner may already be stopped, ignore
    }
  }
  qrScanning = false;
  qrReaderDiv.hidden = true;
  scanToggleBtn.textContent = '📷 Scan QR Code Instead';
}