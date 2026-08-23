const SPONSORS_SUPABASE_URL = 'https://esuueahaoporkdyurwjr.supabase.co';
const SPONSORS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXVlYWhhb3BvcmtkeXVyd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA1NDMsImV4cCI6MjEwMjQ1NjU0M30.kHYPaCCq8VkDeSAqqBDjguMtbKqTDgJWbtuQqbut_6c';

async function loadSponsors() {
  try {
    const response = await fetch(
      `${SPONSORS_SUPABASE_URL}/rest/v1/sponsors?is_active=eq.true&select=name,logo_url,website_url&order=display_order.asc`,
      {
        headers: {
          'apikey': SPONSORS_ANON_KEY,
          'Authorization': `Bearer ${SPONSORS_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) return;
    const sponsors = await response.json();
    if (!sponsors || sponsors.length === 0) return;

    renderHomepageSponsors(sponsors);
    renderFooterSponsors(sponsors);
  } catch (err) {
    // Fail silently — sponsors are a nice-to-have, never block the page
    console.error('Could not load sponsors:', err);
  }
}

function renderHomepageSponsors(sponsors) {
  const section = document.getElementById('sponsors-section');
  if (!section) return; // this page doesn't have the homepage sponsor section

  const grid = section.querySelector('.sponsors-grid');
  grid.innerHTML = sponsors.map((s) => sponsorLogoHtml(s)).join('');
  section.hidden = false;
}

function renderFooterSponsors(sponsors) {
  const strip = document.getElementById('footer-sponsors-strip');
  if (!strip) return; // this page doesn't have a footer sponsor strip

  strip.innerHTML = sponsors.map((s) => sponsorLogoHtml(s, true)).join('');
  strip.hidden = false;
}

function sponsorLogoHtml(sponsor, small) {
  const img = `<img src="${escapeAttr(sponsor.logo_url)}" alt="${escapeAttr(sponsor.name)}" loading="lazy" style="height: ${small ? '24px' : '48px'}; width: auto; opacity: 0.85; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.85">`;
  if (sponsor.website_url) {
    return `<a href="${escapeAttr(sponsor.website_url)}" target="_blank" rel="noopener sponsored">${img}</a>`;
  }
  return img;
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', loadSponsors);