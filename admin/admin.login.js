const SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
}

// If already logged in AND actually an admin, skip straight to the dashboard
(async function checkExistingSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const { data: adminRow } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminRow) {
      window.location.href = 'admin.dashboard.html';
    }
  }
})();

// Show/hide password toggle
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('toggle-password');

togglePasswordBtn.addEventListener('click', function () {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  this.textContent = isHidden ? 'Hide' : 'Show';
  this.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const email = form.elements['email'].value.trim();
  const password = form.elements['password'].value;

  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  // Check if this email is currently locked out from too many recent failed attempts
  const { data: allowed, error: lockoutCheckError } = await supabaseClient.rpc('check_login_lockout', {
    p_email: email,
    p_max_failures: 5,
    p_window_minutes: 15,
  });

  if (lockoutCheckError) {
    showError('Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  if (!allowed) {
    showError('Too many failed attempts. Please wait 15 minutes and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    await supabaseClient.rpc('log_failed_login', { p_email: email });
    showError('Incorrect email or password.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  // Login succeeded but only people listed in the admins table are allowed in.
  // This is a UX check only; the real enforcement is server side via RLS on every table.
  const { data: adminRow, error: adminCheckError } = await supabaseClient
    .from('admins')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (adminCheckError || !adminRow) {
    await supabaseClient.auth.signOut();
    showError('This account is not authorized for admin access.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  window.location.href = 'admin.dashboard.html';
});