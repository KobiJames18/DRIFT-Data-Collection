const SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTab = 'participants';
let participantsData = [];
let volunteersData = [];
let checkedInIds = new Set();
let pendingDelete = null; // { table, id, name }

const dashMain = document.getElementById('dash-main');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const participantsPanel = document.getElementById('participants-panel');
const volunteersPanel = document.getElementById('volunteers-panel');
const participantsTbody = document.getElementById('participants-tbody');
const volunteersTbody = document.getElementById('volunteers-tbody');
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

  const [participantsRes, volunteersRes, checkInsRes] = await Promise.all([
    supabaseClient.from('participants').select('*').order('registered_at', { ascending: false }),
    supabaseClient.from('volunteers').select('*').order('applied_at', { ascending: false }),
    supabaseClient.from('check_ins').select('participant_id'),
  ]);

  if (participantsRes.error || volunteersRes.error || checkInsRes.error) {
    showError('Could not load data. Please refresh and try again.');
    return;
  }

  participantsData = participantsRes.data || [];
  volunteersData = volunteersRes.data || [];
  checkedInIds = new Set((checkInsRes.data || []).map((c) => c.participant_id));

  document.getElementById('stat-participants').textContent = participantsData.length;
  document.getElementById('stat-volunteers').textContent = volunteersData.length;
  document.getElementById('stat-checkins').textContent = checkedInIds.size;

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
    renderCurrentTab();
  });
});

function renderCurrentTab() {
  loadingState.hidden = true;
  errorState.hidden = true;

  if (currentTab === 'participants') {
    volunteersPanel.hidden = true;
    renderParticipants(participantsData);
  } else {
    participantsPanel.hidden = true;
    renderVolunteers(volunteersData);
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
    btn.addEventListener('click', () => openEditModal(btn.dataset.table, btn.dataset.id));
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

  addTicketBackdrop.hidden = true;
  loadAllData();
});

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