const SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';
const STAFF_LOGIN_URL = 'https://esuueahaoporkdyurwjr.supabase.co/functions/v1/staff-login';

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

// If already logged in AND actually staff, skip straight to the right screen for their role
(async function checkExistingSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const { data: adminRow } = await supabaseClient
      .from('admins')
      .select('id, role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminRow) {
      window.location.href = adminRow.role === 'scanner' ? 'scanner.html' : 'admin.dashboard.html';
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

  // The entire login (lockout check, then authentication) now happens inside
  // one Edge Function. There is no separate client side path to sign in, so
  // the lockout check cannot be skipped or bypassed by calling Supabase Auth
  // directly, unlike the previous two-call design.
  try {
    const response = await fetch(STAFF_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();

    if (!response.ok) {
      showError(result.error || 'Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      return;
    }

    // Establish the actual client side session using the tokens the function
    // already validated server side.
    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });

    if (sessionError) {
      showError('Something went wrong signing you in. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      return;
    }

    window.location.href = result.role === 'scanner' ? 'scanner.html' : 'admin.dashboard.html';
  } catch (err) {
    console.error('Login failed:', err);
    showError('Could not connect. Please check your internet connection and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
})