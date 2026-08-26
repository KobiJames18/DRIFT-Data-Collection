const SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTab = 'dashboard';
let participantsData = [];
let volunteersData = [];
let sponsorsData = [];
let checkedInIds = new Set();
let pendingDelete = null; // { table, id, name }

const dashMain = document.getElementById('dash-main');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const participantsPanel = document.getElementById('participants-panel');
const volunteersPanel = document.getElementById('volunteers-panel');
const sponsorsPanel = document.getElementById('sponsors-panel');
const checkinPanel = document.getElementById('checkin-panel');
const generatePanel = document.getElementById('generate-panel');
const dashboardPanel = document.getElementById('dashboard-panel');
const staffPanel = document.getElementById('staff-panel');
const participantsTbody = document.getElementById('participants-tbody');
const volunteersTbody = document.getElementById('volunteers-tbody');
const sponsorsTbody = document.getElementById('sponsors-tbody');
const searchBox = document.getElementById('search-box');

// ---------- AUTH GUARD ----------
(async function guardPage() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'admin.login.html';
    return;
  }

  const { data: adminRow } = await supabaseClient
    .from('admins')
    .select('id, email')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabaseClient.auth.signOut();
    window.location.href = 'admin.login.html';
    return;
  }

  document.getElementById('admin-email').textContent = adminRow.email || session.user.email;
  dashMain.hidden = false;
  loadAllData();
})();

document.getElementById('logout-link').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = 'admin.login.html';
});

// ---------- DATA LOADING ----------
async function loadAllData() {
  showLoading();

  const [participantsRes, volunteersRes, checkInsRes, sponsorsRes] = await Promise.all([
    supabaseClient.from('participants').select('*').order('registered_at', { ascending: false }),
    supabaseClient.from('volunteers').select('*').order('applied_at', { ascending: false }),
    supabaseClient.from('check_ins').select('participant_id'),
    supabaseClient.from('sponsors').select('*').order('display_order', { ascending: true }),
  ]);

  if (participantsRes.error || volunteersRes.error || checkInsRes.error || sponsorsRes.error) {
    showError('Could not load data. Please refresh and try again.');
    return;
  }

  participantsData = participantsRes.data || [];
  volunteersData = volunteersRes.data || [];
  checkedInIds = new Set((checkInsRes.data || []).map((c) => c.participant_id));
  sponsorsData = sponsorsRes.data || [];

  // Old top-level stat-strip removed — the Dashboard tab now shows more detailed
  // stats (Total Registered, Checked In, Not Checked In, Invalid Scans) instead.

  renderCurrentTab();
}

function showLoading() {
  loadingState.hidden = false;
  errorState.hidden = true;
  emptyState.hidden = true;
  participantsPanel.hidden = true;
  volunteersPanel.hidden = true;
}

function showError(message) {
  loadingState.hidden = true;
  errorState.hidden = false;
  errorState.textContent = message;
  emptyState.hidden = true;
  participantsPanel.hidden = true;
  volunteersPanel.hidden = true;
}

document.getElementById('refresh-btn').addEventListener('click', loadAllData);

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    this.classList.add('active');
    currentTab = this.dataset.tab;
    searchBox.value = '';
    editingSponsorId = null;
    if (typeof stopQrScanner === 'function') stopQrScanner();
    document.getElementById('sidebar').classList.remove('open'); // close mobile sidebar after picking a tab
    renderCurrentTab();
  });
});

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

function renderCurrentTab() {
  loadingState.hidden = true;
  errorState.hidden = true;

  document.getElementById('add-ticket-btn').hidden = currentTab !== 'participants';
  document.getElementById('add-sponsor-btn').hidden = currentTab !== 'sponsors';
  searchBox.hidden = (currentTab === 'sponsors' || currentTab === 'checkin' || currentTab === 'generate' || currentTab === 'dashboard' || currentTab === 'staff');
  document.getElementById('refresh-btn').hidden = (currentTab === 'checkin' || currentTab === 'generate' || currentTab === 'staff');

  participantsPanel.hidden = true;
  volunteersPanel.hidden = true;
  sponsorsPanel.hidden = true;
  checkinPanel.hidden = true;
  generatePanel.hidden = true;
  dashboardPanel.hidden = true;
  staffPanel.hidden = true;
  emptyState.hidden = true;

  if (currentTab === 'dashboard') {
    dashboardPanel.hidden = false;
    renderDashboard();
  } else if (currentTab === 'participants') {
    renderParticipants(participantsData);
  } else if (currentTab === 'volunteers') {
    renderVolunteers(volunteersData);
  } else if (currentTab === 'sponsors') {
    renderSponsors(sponsorsData);
  } else if (currentTab === 'checkin') {
    checkinPanel.hidden = false;
    loadingState.hidden = true;
  } else if (currentTab === 'generate') {
    generatePanel.hidden = false;
    loadingState.hidden = true;
  } else if (currentTab === 'staff') {
    staffPanel.hidden = false;
    loadingState.hidden = true;
  }
}

// ---------- SEARCH ----------
searchBox.addEventListener('input', function () {
  const q = this.value.trim().toLowerCase();
  if (currentTab === 'participants') {
    const filtered = !q ? participantsData : participantsData.filter((p) =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
    renderParticipants(filtered);
  } else {
    const filtered = !q ? volunteersData : volunteersData.filter((v) =>
      (v.full_name || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q)
    );
    renderVolunteers(filtered);
  }
});

// ---------- RENDER: PARTICIPANTS ----------
function renderParticipants(rows) {
  participantsPanel.hidden = false;
  emptyState.hidden = rows.length !== 0;

  participantsTbody.innerHTML = rows.map((p) => `
    <tr>
      <td class="mono">${escapeHtml(p.registration_id || '—')}</td>
      <td>${escapeHtml(p.full_name)}</td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.gender || '—')}</td>
      <td>${escapeHtml(p.location || '—')}</td>
      <td><span class="status-pill status-${(p.status || '').toLowerCase()}">${escapeHtml(p.status || '—')}</span>${checkedInIds.has(p.id) ? ' <span class="status-pill status-registered">Checked In</span>' : ''}</td>
      <td>
        <div class="row-actions">
          ${p.status === 'Pending' ? `
            <button class="approve-btn" data-id="${p.id}" data-table="participants">Approve</button>
            <button class="reject-btn" data-id="${p.id}" data-table="participants">Reject</button>
          ` : ''}
          <button class="edit-btn" data-id="${p.id}" data-table="participants">Edit</button>
          <button class="del-btn" data-id="${p.id}" data-table="participants" data-name="${escapeHtml(p.full_name)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachRowHandlers();
}

// ---------- RENDER: VOLUNTEERS ----------
function renderVolunteers(rows) {
  volunteersPanel.hidden = false;
  emptyState.hidden = rows.length !== 0;

  volunteersTbody.innerHTML = rows.map((v) => `
    <tr>
      <td>${escapeHtml(v.full_name)}</td>
      <td>${escapeHtml(v.phone)}</td>
      <td>${escapeHtml(v.email)}</td>
      <td>${escapeHtml(v.role === 'Other' ? (v.other_role || 'Other') : v.role)}</td>
      <td>${escapeHtml(v.location || '—')}</td>
      <td><span class="status-pill status-${(v.status || '').toLowerCase()}">${escapeHtml(v.status || '—')}</span></td>
      <td>
        <div class="row-actions">
          ${v.status === 'Pending' ? `
            <button class="approve-btn" data-id="${v.id}" data-table="volunteers">Approve</button>
            <button class="reject-btn" data-id="${v.id}" data-table="volunteers">Reject</button>
          ` : ''}
          <button class="edit-btn" data-id="${v.id}" data-table="volunteers">Edit</button>
          <button class="del-btn" data-id="${v.id}" data-table="volunteers" data-name="${escapeHtml(v.full_name)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachRowHandlers();
}

function attachRowHandlers() {
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.table === 'sponsors') {
        openEditSponsorModal(btn.dataset.id);
      } else {
        openEditModal(btn.dataset.table, btn.dataset.id);
      }
    });
  });
  document.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.table, btn.dataset.id, btn.dataset.name));
  });
  document.querySelectorAll('.approve-btn').forEach((btn) => {
    btn.addEventListener('click', () => reviewRecord(btn.dataset.table, btn.dataset.id, 'approve'));
  });
  document.querySelectorAll('.reject-btn').forEach((btn) => {
    btn.addEventListener('click', () => reviewRecord(btn.dataset.table, btn.dataset.id, 'reject'));
  });
}

// ---------- APPROVE / REJECT ----------
async function reviewRecord(table, id, action) {
  const approvedStatus = table === 'participants' ? 'Registered' : 'Approved';
  const newStatus = action === 'approve' ? approvedStatus : 'Rejected';

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { error } = await supabaseClient
    .from(table)
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq('id', id);

  if (error) {
    alert('Could not update status: ' + error.message);
    return;
  }

  loadAllData();
}

// ---------- EDIT MODAL ----------
const editBackdrop = document.getElementById('edit-modal-backdrop');
const modalFields = document.getElementById('modal-fields');
const modalTitle = document.getElementById('modal-title');
let editContext = null; // { table, id }

const PARTICIPANT_FIELDS = [
  { key: 'full_name', label: 'Full Name', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'gender', label: 'Gender', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'school_organization', label: 'School / Organization', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Registered', 'Cancelled', 'Attended', 'Rejected'] },
];

const VOLUNTEER_FIELDS = [
  { key: 'full_name', label: 'Full Name', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

function openEditModal(table, id) {
  const source = table === 'participants' ? participantsData : volunteersData;
  const record = source.find((r) => r.id === id);
  if (!record) return;

  editContext = { table, id };
  modalTitle.textContent = `Edit ${table === 'participants' ? 'Registrant' : 'Volunteer'}`;

  const fields = table === 'participants' ? PARTICIPANT_FIELDS : VOLUNTEER_FIELDS;

  modalFields.innerHTML = fields.map((f) => {
    const val = record[f.key] || '';
    if (f.type === 'select') {
      return `
        <div class="modal-field">
          <label for="edit-${f.key}">${f.label}</label>
          <select id="edit-${f.key}" data-key="${f.key}">
            ${f.options.map((opt) => `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>`;
    }
    return `
      <div class="modal-field">
        <label for="edit-${f.key}">${f.label}</label>
        <input type="${f.type}" id="edit-${f.key}" data-key="${f.key}" value="${escapeHtml(val)}">
      </div>`;
  }).join('');

  editBackdrop.hidden = false;
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  editBackdrop.hidden = true;
  editContext = null;
});

document.getElementById('modal-save').addEventListener('click', async () => {
  if (!editContext) return;

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const updates = {};
  modalFields.querySelectorAll('[data-key]').forEach((el) => {
    updates[el.dataset.key] = el.value.trim();
  });

  const { error } = await supabaseClient
    .from(editContext.table)
    .update(updates)
    .eq('id', editContext.id);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  if (error) {
    alert('Could not save changes: ' + error.message);
    return;
  }

  editBackdrop.hidden = true;
  editContext = null;
  loadAllData();
});

// ---------- DELETE MODAL ----------
const deleteBackdrop = document.getElementById('delete-modal-backdrop');
const deleteTargetName = document.getElementById('delete-target-name');

function openDeleteModal(table, id, name) {
  pendingDelete = { table, id, name };
  deleteTargetName.textContent = name || 'This record';
  deleteBackdrop.hidden = false;
}

document.getElementById('delete-cancel').addEventListener('click', () => {
  deleteBackdrop.hidden = true;
  pendingDelete = null;
});

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDelete) return;

  const confirmBtn = document.getElementById('delete-confirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting...';

  const { error } = await supabaseClient
    .from(pendingDelete.table)
    .delete()
    .eq('id', pendingDelete.id);

  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Delete';

  if (error) {
    alert('Could not delete: ' + error.message);
    return;
  }

  deleteBackdrop.hidden = true;
  pendingDelete = null;
  loadAllData();
});

// ---------- ADD TICKET (CASH SALE) ----------
const addTicketBackdrop = document.getElementById('add-ticket-modal-backdrop');
const addTicketError = document.getElementById('add-ticket-error');

document.getElementById('add-ticket-btn').addEventListener('click', () => {
  ['add-fullName', 'add-phone', 'add-email', 'add-location'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  addTicketError.style.display = 'none';
  addTicketBackdrop.hidden = false;
});

document.getElementById('add-ticket-cancel').addEventListener('click', () => {
  addTicketBackdrop.hidden = true;
});

document.getElementById('add-ticket-save').addEventListener('click', async () => {
  const fullName = document.getElementById('add-fullName').value.trim();
  const phone = document.getElementById('add-phone').value.trim();
  const email = document.getElementById('add-email').value.trim();
  const gender = document.getElementById('add-gender').value;
  const location = document.getElementById('add-location').value.trim();

  if (!fullName || !phone || !email || !location) {
    addTicketError.textContent = 'Please fill in all required fields.';
    addTicketError.style.display = 'block';
    return;
  }

  const saveBtn = document.getElementById('add-ticket-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Adding...';

  // Generate the next registration ID the same way the online form does
  const editionCode = 'JAN2027';
  const nextNumber = participantsData.length + 1;
  const registrationId = `DRIFT-${editionCode}-${String(nextNumber).padStart(4, '0')}`;

  const { error } = await supabaseClient.from('participants').insert({
    registration_id: registrationId,
    full_name: fullName,
    phone,
    email,
    gender,
    location,
    age_confirmed: true,
    ticket_category: 'Regular',
    ticket_source: 'in_person',
    status: 'Registered',
  });

  saveBtn.disabled = false;
  saveBtn.textContent = 'Add Ticket';

  if (error) {
    addTicketError.textContent = 'Could not add ticket: ' + error.message;
    addTicketError.style.display = 'block';
    return;
  }

  // Show the buyer's QR code right in the modal so it can be shown on screen or printed
  const modalBody = document.querySelector('#add-ticket-modal-backdrop .modal');
  modalBody.innerHTML = `
    <h2>Ticket Added ✓</h2>
    <p class="modal-warn">${escapeHtml(fullName)}'s ticket is confirmed. Show or screenshot this QR code for them now.</p>
    <div style="text-align: center;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registrationId)}" alt="Ticket QR code" style="background: white; padding: 10px; border-radius: 6px; margin-bottom: 16px;">
      <p style="font-family: 'Space Mono', monospace; color: var(--blue); font-size: 18px; margin-bottom: 24px;">${escapeHtml(registrationId)}</p>
    </div>
    <div class="modal-actions">
      <button class="btn" id="add-ticket-done">Done</button>
    </div>
  `;

  document.getElementById('add-ticket-done').addEventListener('click', () => {
    addTicketBackdrop.hidden = true;
    loadAllData();
  });
});

// ---------- RENDER: SPONSORS ----------
function renderSponsors(rows) {
  sponsorsPanel.hidden = false;
  emptyState.hidden = rows.length !== 0;

  sponsorsTbody.innerHTML = rows.map((s) => `
    <tr>
      <td><img src="${escapeHtml(s.logo_url)}" alt="${escapeHtml(s.name)}" style="height: 32px; max-width: 80px; object-fit: contain;" onerror="this.style.opacity=0.3"></td>
      <td>${escapeHtml(s.name)}</td>
      <td>${s.website_url ? `<a href="${escapeHtml(s.website_url)}" target="_blank" rel="noopener" style="color: var(--blue);">${escapeHtml(s.website_url)}</a>` : '—'}</td>
      <td>${s.display_order}</td>
      <td><span class="status-pill ${s.is_active ? 'status-approved' : 'status-cancelled'}">${s.is_active ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="row-actions">
          <button class="edit-btn" data-id="${s.id}" data-table="sponsors">Edit</button>
          <button class="del-btn" data-id="${s.id}" data-table="sponsors" data-name="${escapeHtml(s.name)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachRowHandlers();
}

// ---------- ADD/EDIT SPONSOR ----------
const sponsorBackdrop = document.getElementById('sponsor-modal-backdrop');
const sponsorError = document.getElementById('sponsor-error');
let editingSponsorId = null;

document.getElementById('add-sponsor-btn').addEventListener('click', () => {
  editingSponsorId = null;
  document.getElementById('sponsor-modal-title').textContent = 'Add Sponsor';
  document.getElementById('sponsor-name').value = '';
  document.getElementById('sponsor-logo').value = '';
  document.getElementById('sponsor-website').value = '';
  document.getElementById('sponsor-order').value = String(sponsorsData.length);
  document.getElementById('sponsor-active').value = 'true';
  sponsorError.style.display = 'none';
  sponsorBackdrop.hidden = false;
});

document.getElementById('sponsor-cancel').addEventListener('click', () => {
  sponsorBackdrop.hidden = true;
});

document.getElementById('sponsor-save').addEventListener('click', async () => {
  const name = document.getElementById('sponsor-name').value.trim();
  const logoUrl = document.getElementById('sponsor-logo').value.trim();
  const websiteUrl = document.getElementById('sponsor-website').value.trim();
  const displayOrder = parseInt(document.getElementById('sponsor-order').value, 10) || 0;
  const isActive = document.getElementById('sponsor-active').value === 'true';

  if (!name || !logoUrl) {
    sponsorError.textContent = 'Sponsor name and logo URL are required.';
    sponsorError.style.display = 'block';
    return;
  }

  const saveBtn = document.getElementById('sponsor-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const payload = {
    name,
    logo_url: logoUrl,
    website_url: websiteUrl || null,
    display_order: displayOrder,
    is_active: isActive,
  };

  const { error } = editingSponsorId
    ? await supabaseClient.from('sponsors').update(payload).eq('id', editingSponsorId)
    : await supabaseClient.from('sponsors').insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Sponsor';

  if (error) {
    sponsorError.textContent = 'Could not save: ' + error.message;
    sponsorError.style.display = 'block';
    return;
  }

  sponsorBackdrop.hidden = true;
  loadAllData();
});

function openEditSponsorModal(id) {
  const sponsor = sponsorsData.find((s) => s.id === id);
  if (!sponsor) return;

  editingSponsorId = id;
  document.getElementById('sponsor-modal-title').textContent = 'Edit Sponsor';
  document.getElementById('sponsor-name').value = sponsor.name;
  document.getElementById('sponsor-logo').value = sponsor.logo_url;
  document.getElementById('sponsor-website').value = sponsor.website_url || '';
  document.getElementById('sponsor-order').value = String(sponsor.display_order);
  document.getElementById('sponsor-active').value = String(sponsor.is_active);
  sponsorError.style.display = 'none';
  sponsorBackdrop.hidden = false;
}

// ---------- DOOR CHECK-IN ----------
const checkinInput = document.getElementById('checkin-search-input');
const checkinResult = document.getElementById('checkin-result');

// People often type ticket codes without hyphens. Normalize so punctuation/case
// never causes a false "not found" for what is actually a valid ticket.
function normalizeTicketCode(raw) {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (/^DR[0-9A-F]{8}$/.test(cleaned)) {
    return `DR-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  }
  return cleaned;
}

async function performCheckinSearch() {
  const regId = normalizeTicketCode(checkinInput.value.trim());
  if (!regId) return;

  checkinResult.innerHTML = '<p class="state-msg">Searching...</p>';

  const { data: { session } } = await supabaseClient.auth.getSession();

  const { data: participant, error } = await supabaseClient
    .from('participants')
    .select('id, full_name, registration_id, status, photo_url')
    .eq('registration_id', regId)
    .maybeSingle();

  if (error || !participant) {
    checkinResult.innerHTML = '<p class="state-msg error-state">No registration found with that ID.</p>';
    await supabaseClient.from('scan_logs').insert({
      ticket_code: regId,
      scan_result: 'invalid',
      reason: 'Not found at door check-in',
      scanned_by: session?.user?.id || null,
    });
    return;
  }

  const { data: existingCheckin } = await supabaseClient
    .from('check_ins')
    .select('id, checked_in_at')
    .eq('participant_id', participant.id)
    .maybeSingle();

  let statusWarning = '';
  if (participant.status !== 'Registered') {
    statusWarning = `<p class="checkin-warn">Status is "${escapeHtml(participant.status)}" — not an approved, confirmed ticket. Verify before allowing entry.</p>`;
  }

  let photoHtml = '';
  if (participant.photo_url) {
    const { data: signedUrlData } = await supabaseClient.storage
      .from('ticket-photos')
      .createSignedUrl(participant.photo_url, 300); // 5 minute link, just enough to view at the door
    if (signedUrlData?.signedUrl) {
      photoHtml = `<img src="${signedUrlData.signedUrl}" alt="${escapeHtml(participant.full_name)}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`;
    }
  }

  checkinResult.innerHTML = `
    <div class="checkin-card">
      ${photoHtml}
      <div class="checkin-name">${escapeHtml(participant.full_name)}</div>
      <div class="checkin-id">${escapeHtml(participant.registration_id)}</div>
      ${statusWarning}
      ${existingCheckin
        ? `<p class="checkin-already">✓ Already checked in at ${new Date(existingCheckin.checked_in_at).toLocaleTimeString()}</p>`
        : `<button class="checkin-btn-in" id="confirm-checkin-btn" data-participant-id="${participant.id}">Check In Now</button>`
      }
    </div>
  `;

  if (existingCheckin) {
    await supabaseClient.from('scan_logs').insert({
      ticket_code: regId,
      scan_result: 'already_checked_in',
      scanned_by: session?.user?.id || null,
    });
  }

  const confirmBtn = document.getElementById('confirm-checkin-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Checking in...';

      const { data: { session: checkinSession } } = await supabaseClient.auth.getSession();

      const { error: checkinError } = await supabaseClient.from('check_ins').insert({
        participant_id: participant.id,
        checked_in_by: checkinSession.user.id,
      });

      if (checkinError) {
        alert('Could not check in: ' + checkinError.message);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Check In Now';
        return;
      }

      await supabaseClient.from('scan_logs').insert({
        ticket_code: regId,
        scan_result: 'valid',
        scanned_by: checkinSession.user.id,
      });

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
      () => {} // ignore per-frame scan failures, this fires constantly while searching for a code
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

// ---------- STAFF ACCOUNTS ----------
document.getElementById('staff-create-btn').addEventListener('click', async () => {
  const email = document.getElementById('staff-email-input').value.trim();
  const password = document.getElementById('staff-password-input').value;
  const role = document.getElementById('staff-role-select').value;
  const errorBox = document.getElementById('staff-create-error');
  const resultBox = document.getElementById('staff-create-result');
  errorBox.style.display = 'none';
  resultBox.innerHTML = '';

  if (!email || !password) {
    errorBox.textContent = 'Email and password are required.';
    errorBox.style.display = 'block';
    return;
  }

  const createBtn = document.getElementById('staff-create-btn');
  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  const { data: { session } } = await supabaseClient.auth.getSession();

  try {
    const response = await fetch('https://esuueahaoporkdyurwjr.supabase.co/functions/v1/create-staff-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, password, role }),
    });
    const result = await response.json();

    createBtn.disabled = false;
    createBtn.textContent = 'Create Account';

    if (!response.ok) {
      errorBox.textContent = result.error || 'Could not create account.';
      errorBox.style.display = 'block';
      return;
    }

    resultBox.innerHTML = `<p style="color: #2fd15a; font-family: 'Space Mono', monospace; font-size: 13px; margin-top: 16px; text-align: center;">✓ ${escapeHtml(role)} account created for ${escapeHtml(email)}. Share the login and password with them directly — this won't be shown again.</p>`;
    document.getElementById('staff-email-input').value = '';
    document.getElementById('staff-password-input').value = '';
  } catch (err) {
    createBtn.disabled = false;
    createBtn.textContent = 'Create Account';
    errorBox.textContent = 'Could not connect. Please try again.';
    errorBox.style.display = 'block';
  }
});

// ---------- GENERATE TICKETS ----------
document.getElementById('generate-tickets-btn').addEventListener('click', async () => {
  const countInput = document.getElementById('generate-count-input');
  const count = parseInt(countInput.value, 10);
  const resultDiv = document.getElementById('generate-result');

  if (!count || count < 1 || count > 200) {
    resultDiv.innerHTML = '<p class="state-msg error-state">Enter a number between 1 and 200.</p>';
    return;
  }

  const genBtn = document.getElementById('generate-tickets-btn');
  genBtn.disabled = true;
  genBtn.textContent = 'Generating...';
  resultDiv.innerHTML = '<p class="state-msg">Generating tickets...</p>';

  const { data, error } = await supabaseClient.rpc('generate_ticket_batch', {
    p_count: count,
    p_event_id: null,
  });

  genBtn.disabled = false;
  genBtn.textContent = 'Generate';

  if (error) {
    resultDiv.innerHTML = `<p class="state-msg error-state">Could not generate tickets: ${escapeHtml(error.message)}</p>`;
    return;
  }

  resultDiv.innerHTML = `
    <p style="color: var(--red); font-family: 'Space Mono', monospace; font-size: 12px; text-align: center; margin-bottom: 20px;">
      ⚠ These PINs are shown ONCE. Print or record them now — they cannot be retrieved again after you leave this page.
    </p>
    <div id="ticket-print-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
      ${data.map((t) => `
        <div style="border: 1px solid var(--line); border-radius: 8px; padding: 16px; text-align: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(t.ticket_code)}" style="background: white; padding: 6px; border-radius: 4px; margin-bottom: 10px;">
          <div style="font-family: 'Space Mono', monospace; font-size: 13px; color: var(--blue);">${escapeHtml(t.ticket_code)}</div>
          <div style="font-family: 'Space Mono', monospace; font-size: 16px; color: var(--red); margin-top: 6px;">PIN: ${escapeHtml(t.plaintext_pin)}</div>
        </div>
      `).join('')}
    </div>
    <button class="btn" id="print-tickets-btn" style="width: 100%; margin-top: 20px;">Print This Batch</button>
  `;

  document.getElementById('print-tickets-btn').addEventListener('click', () => window.print());
});

// ---------- DASHBOARD OVERVIEW ----------
let dashLineChartInstance = null;
let dashBarChartInstance = null;

async function renderDashboard() {
  const totalRegistered = participantsData.filter((p) => p.status === 'Registered').length;
  const checkedInCount = checkedInIds.size;
  const notCheckedIn = Math.max(totalRegistered - checkedInCount, 0);

  const { count: invalidScanCount } = await supabaseClient
    .from('scan_logs')
    .select('id', { count: 'exact', head: true })
    .eq('scan_result', 'invalid');

  document.getElementById('dash-total-registered').textContent = totalRegistered;
  document.getElementById('dash-checked-in').textContent = checkedInCount;
  document.getElementById('dash-not-checked-in').textContent = notCheckedIn;
  document.getElementById('dash-invalid-scans').textContent = invalidScanCount ?? 0;

  const checkedInPct = totalRegistered > 0 ? ((checkedInCount / totalRegistered) * 100).toFixed(1) : '0.0';
  const notCheckedInPct = totalRegistered > 0 ? ((notCheckedIn / totalRegistered) * 100).toFixed(1) : '0.0';
  document.getElementById('dash-checked-in-pct').textContent = `${checkedInPct}% of total`;
  document.getElementById('dash-not-checked-in-pct').textContent = `${notCheckedInPct}% of total`;

  // Fetch check-in data with participant + admin info joined, for both the table and charts
  const { data: recentCheckins } = await supabaseClient
    .from('check_ins')
    .select('checked_in_at, participants(full_name, registration_id), admins(email)')
    .order('checked_in_at', { ascending: false })
    .limit(200); // enough history for the charts, table only shows the top 10

  renderRecentCheckinsTable((recentCheckins || []).slice(0, 10));
  renderLineChart(recentCheckins || []);
  renderBarChart(recentCheckins || []);
}

function renderRecentCheckinsTable(rows) {
  const tbody = document.getElementById('recent-checkins-tbody');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--gray);">No check-ins yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((c) => `
    <tr>
      <td>${escapeHtml(c.participants?.full_name || '—')}</td>
      <td class="mono">${escapeHtml(c.participants?.registration_id || '—')}</td>
      <td>${new Date(c.checked_in_at).toLocaleString()}</td>
      <td>${escapeHtml(c.admins?.email || '—')}</td>
      <td><span class="status-pill status-registered">✓ Checked In</span></td>
    </tr>
  `).join('');
}

function renderLineChart(checkins) {
  // Build a day-by-day count for the last 7 days, for both registrations and check-ins
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const registeredByDay = days.map((day) =>
    participantsData.filter((p) => p.registered_at && p.registered_at.slice(0, 10) === day).length
  );
  const checkedInByDay = days.map((day) =>
    checkins.filter((c) => c.checked_in_at && c.checked_in_at.slice(0, 10) === day).length
  );

  const ctx = document.getElementById('dashLineChart');
  if (dashLineChartInstance) dashLineChartInstance.destroy();

  dashLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map((d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        { label: 'Registered', data: registeredByDay, borderColor: '#29abe2', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2 },
        { label: 'Checked In', data: checkedInByDay, borderColor: '#2fd15a', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2 },
      ],
    },
    options: {
      plugins: { legend: { position: 'top', labels: { color: '#8c8c8c', boxWidth: 8, boxHeight: 8 } } },
      scales: {
        x: { grid: { color: 'rgba(244,244,242,0.08)' }, ticks: { color: '#8c8c8c' } },
        y: { grid: { color: 'rgba(244,244,242,0.08)' }, ticks: { color: '#8c8c8c' }, beginAtZero: true },
      },
    },
  });
}

function renderBarChart(checkins) {
  const today = new Date().toISOString().slice(0, 10);
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const countsByHour = hours.map((h) =>
    checkins.filter((c) => {
      if (!c.checked_in_at || c.checked_in_at.slice(0, 10) !== today) return false;
      return new Date(c.checked_in_at).getHours() === h;
    }).length
  );

  // Only show hours that have any activity across the whole day, plus a little padding,
  // so the chart isn't 24 mostly-empty bars before the event has really started.
  const firstActive = countsByHour.findIndex((c) => c > 0);
  const startHour = firstActive === -1 ? 17 : Math.max(firstActive - 1, 0);
  const visibleHours = hours.slice(startHour, startHour + 8);
  const visibleCounts = countsByHour.slice(startHour, startHour + 8);

  const ctx = document.getElementById('dashBarChart');
  if (dashBarChartInstance) dashBarChartInstance.destroy();

  dashBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: visibleHours.map((h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'AM' : 'PM'}`),
      datasets: [{ label: 'Check-ins', data: visibleCounts, backgroundColor: '#e8342c', borderRadius: 4 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8c8c8c' } },
        y: { grid: { color: 'rgba(244,244,242,0.08)' }, ticks: { color: '#8c8c8c' }, beginAtZero: true },
      },
    },
  });
}

// ---------- UTIL ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}