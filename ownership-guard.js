// DRI-FT Ownership & Deployment Verification
// This is a visible deterrent, not a security boundary real protection lives
// server-side (CORS-restricted Edge Functions + RLS). See README for details.

console.log(
  '%cDRI-FT Ticketing System © 2027, built by Kobi James Robert.',
  'color:#e8342c; font-weight:bold; font-size:13px;'
);
console.log(
  'This frontend only works against the official DRI-FT backend at ' +
  'kobijames18.github.io. Copies deployed elsewhere cannot register, verify, ' +
  'or check in real tickets every request is rejected server side.'
);

const AUTHORIZED_HOSTS = ['kobijames18.github.io'];

(function checkAuthorizedDeployment() {
  if (AUTHORIZED_HOSTS.includes(window.location.hostname)) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: rgba(5,5,5,0.97); color: #f4f4f2;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 40px 24px; font-family: -apple-system, sans-serif;
  `;
  overlay.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⚠</div>
    <h1 style="font-size: 22px; margin-bottom: 12px;">Unauthorized Deployment</h1>
    <p style="max-width: 480px; color: #aaa; line-height: 1.6; margin-bottom: 24px;">
      This is an unofficial copy of the DRI-FT ticketing system. It is not connected to
      the real DRI-FT event database registrations, tickets, and check-ins made here
      are not valid and will not work.
    </p>
    <a href="https://kobijames18.github.io/DRIFT-Data-Collection/" style="color:#29abe2;">
      Go to the official DRI-FT site →
    </a>
  `;
  document.body.appendChild(overlay);
})();