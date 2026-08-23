# DRIFT Event Registration & Management System

DRI-FT is a real festival held in Sierra Leone, usually on New Year's Day (January 1st) and occasionally in June. This repository is the official website and data collection system for DRI-FT built to handle online registration, volunteer sign-ups, and full event management including check-in and admin tools.

This project serves one purpose: it's the actual live system used to run DRI-FT events.

**Live site:** https://kobijames18.github.io/DRIFT-Data-Collection/

---

## What this project does

- Public event website with live countdown, event details, social links, and a photo gallery from past events
- Online ticket registration form (18+ only, strictly enforced) writes directly to a live database
- Volunteer sign-up form for people who want to help run the event
- Registrations and volunteer applications go through **admin review** before confirmation nothing is instantly approved
- **Check Ticket page** anyone can look up their registration ID to confirm their ticket is valid, without exposing anyone's personal details
- **In-person cash ticket sales** admins can manually add a confirmed ticket for someone who paid in person, separate from online registrations
- Bot/spam protection on all public forms
- Secure Supabase backend storing real registrations, with Row Level Security locking data down
- Admin login (with lockout protection) and dashboard for managing participants and volunteers, including Approve/Reject actions
- Legal pages: Privacy Policy, Terms of Service, FAQ, custom 404 page
- *(In progress)* Check-in system with fraud prevention

## Current status

This is an actively developed project. Right now:

✅ **Done**
- Homepage with countdown, event info, social links, and gallery link
- Photo gallery page showcasing past DRI-FT events, with click to enlarge viewing
- Registration form (frontend + backend) writes to Supabase, generates a reference ID, and saves as **Pending** until an admin approves it
- Volunteer sign-up form (frontend + backend), also starts as **Pending**
- Check Ticket page public lookup by registration ID, returns only first name + status (never phone/email), rate limited against abuse
- In-person cash ticket sales admin dashboard has an "Add Ticket" action that instantly confirms a ticket for someone who paid in person, tagged separately from online registrations
- Responsive design, works on mobile and desktop
- Supabase database connected registrations and volunteer applications save for real
- Row Level Security policies on every table: the public can only submit their own registration/application; only authenticated admins can view, edit, approve, reject, delete, or manually add records
- Admin login with account lockout (5 failed attempts locks an email out for 15 minutes) and request size limits on Edge Functions
- Admin dashboard: view, search, edit, delete, and **approve/reject** registrants and volunteers, with live stats (total registrants, volunteers, checked-in count)
- Privacy Policy, Terms of Service, custom 404 page, FAQ page all linked from the site nav and footer

🚧 **In progress**
- Physical check-in scanning at the door (Check Ticket page covers self-service lookup; door-side check-in marking is still manual)
- Duplicate registration blocking (same email/phone) at the database level
- CAPTCHA (deferred not urgent for current scale)

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript no frameworks, kept deliberately simple and fast
- **Backend:** Supabase (PostgreSQL database, authentication, Edge Functions)
- **Hosting:** GitHub Pages

## Project structure

```
DRIFT-Data-Collection/
├── index.html            Homepage
├── register.html          Ticket registration form
├── volunteer.html         Volunteer sign-up form
├── gallery.html            Past DRI-FT event photo gallery
├── check-ticket.html       Public ticket/registration ID lookup
├── privacy-policy.html    Privacy Policy
├── terms-of-service.html  Terms of Service
├── faq.html                FAQ
├── 404.html                 Custom not-found page
├── style.css               Shared site-wide styles
├── register.css            Styles for registration & volunteer forms
├── gallery.css              Styles for the gallery page
├── script.js                 Countdown timer logic
├── register.js               Registration form validation + Supabase submission
├── volunteer.js               Volunteer form validation + Supabase submission
├── gallery.js                  Gallery lightbox functionality
├── check-ticket.js              Ticket lookup logic
├── nav.js                      Shared mobile nav toggle
├── sitemap.xml
├── robots.txt
├── images/
│   ├── drift header logo.jpg
│   └── gallery/                 Past event photos
└── admin/
    ├── admin.login.html         Admin sign-in (with lockout protection)
    ├── admin.login.js
    ├── admin.dashboard.html     View/search/edit/delete/approve/reject
    ├── admin.dashboard.css
    └── admin.dashboard.js
```

## Ownership & Copyright

© 2026 Kobi James Robert / DRI-FT. All rights reserved. This is the official, sole ticketing and registration system for DRI-FT. Any deployment of this code outside `kobijames18.github.io` is unauthorized and is not connected to the real DRI-FT event database see "Anticlone protection" below for what that actually means technically.

## Security approach

Since this system handles real people's personal data (names, phone numbers, emails), security has been built in from the start rather than bolted on later:

- Public forms include honeypot fields to block basic bot spam
- Row Level Security (RLS) is live on every table: the public can only *submit* a registration or volunteer application (as Pending) never read, edit, or instantly confirm their own or anyone else's data. Only authenticated admins listed in the `admins` table can view, edit, approve, reject, or delete records.
- Admin accounts can only be created directly in Supabase by the project owner there is no public sign-up flow anywhere on the site
- Admin login enforces account lockout after 5 failed attempts within 15 minutes, tracked server-side
- Supabase Edge Functions reject any request over 10KB, checked both by header and actual measured size
- Sensitive logic (registration ID generation, validation) runs server-side via Supabase Edge Functions, not directly from the browser
- *(Planned)* Duplicate registrations (same email/phone) blocked at the database level, not just in the form
- *(Deferred, not currently needed)* CAPTCHA, IP-based rate limiting beyond current protections, WAF/DDoS layers scoped against actual project size rather than added for their own sake

### Anticlone protection what's real vs. what's a deterrent

**Actually enforced, cannot be bypassed by copying the code:**
- Every Edge Function (`register-participant`, `submit-volunteer`, `verify-ticket`, `activate-ticket`, `check-ticket`) only accepts requests from `kobijames18.github.io`. A cloned site hosted elsewhere has its requests rejected by the browser itself (CORS) it cannot register anyone, verify a ticket, or check anyone in, no matter what the cloned frontend code says.
- There is **no direct anon write access** to `participants` or `volunteers` all public writes go exclusively through the Edge Functions above, which use the service role key server-side. Someone with just the public anon key (visible in the frontend, and thus in any clone) cannot insert data directly via Supabase's REST API.
- There is **no anon read access at all** to the `tickets` table not even ticket status. All ticket verification goes through `verify-ticket`/`activate-ticket`, which only ever return status/validity, never the PIN hash or secure token.

**Visible, but not a technical barrier — a deterrent only:**
- `ownership-guard.js` shows a full-page warning if the site is loaded from any domain other than the official one, and logs an ownership notice to the browser console. Since this check is client-side JavaScript, anyone with the full source (which is the premise of cloning in the first place) could delete this file from their copy. It's included because it makes an unauthorized copy visibly illegitimate and unprofessional, not because it's unbeatable.

## About

Built by Kobi James Robert, a final year web development student at the College of Digital Excellence, Sierra Leone. DRI-FT is a real event I help run.

**Follow DRI-FT:**
- Instagram: [@driftparty_](https://www.instagram.com/driftparty_)
- TikTok: [@drift.party3](https://www.tiktok.com/@drift.party3)
- WhatsApp Channel: [DRIFT-FESTIVAL](https://whatsapp.com/channel/0029VaiPdHY8F2pJtJZIeS0X)

---

*This README is updated as the project develops.*