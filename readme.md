# DRI-FT Festival: Event Registration & Management System

DRI-FT is a real festival held in Sierra Leone, usually on New Year's Day (January 1st) and occasionally in June. This repository is the official website and data collection system for DRI-FT, built to handle online registration, physical ticket activation, volunteer sign ups, and full event management including check in and admin tools.

This project serves one purpose: it's the actual live system used to run DRI-FT events.

**Live site:** https://kobijames18.github.io/DRIFT-Data-Collection/

---

## What this project does

- Public event website with live countdown, event details, social links, and a photo gallery from past events
- Online ticket registration form (18+ only, strictly enforced), writes directly to a live database, saves as Pending until an admin approves it
- Physical ticket system: admin generates a batch of tickets ahead of time, each with a unique code, a hidden 6 digit PIN, and a QR code
- Public ticket activation page: buyers enter their ticket code and PIN to register their details and photo against a real physical ticket
- Check Ticket page: anyone can look up a registration ID to confirm it's valid, without exposing anyone's personal details
- Volunteer sign up form, also starts as Pending until reviewed
- Bot and spam protection on all public forms
- Secure Supabase backend, Row Level Security locking data down at every table
- Admin login with lockout protection, plus a full admin dashboard (sidebar navigation) for managing registrants, volunteers, sponsors, and tickets
- Door check in tool with a QR camera scanner, usable by both full admins and dedicated scanner only staff accounts
- Dashboard analytics: live stats, registration and check in charts, and a recent check ins table
- Dynamic sponsor management: admins add sponsors from the dashboard, logos appear automatically on the homepage and site footer
- Legal pages: Privacy Policy, Terms of Service, FAQ, custom 404 page

## Current status

This is an actively developed project. Right now:

**Done**
- Homepage with countdown, event info, social links, gallery, and sponsor strip
- Photo gallery page showcasing past DRI-FT events, with click to enlarge viewing
- Online registration form, saves as Pending until admin approval, generates a QR coded reference ID
- Physical ticket generation, PIN protected activation, and photo capture for door identity verification
- Check Ticket public lookup, returns only a first name and status, never phone or email, rate limited against abuse
- In person cash ticket sales from the admin dashboard, confirmed instantly since payment already happened face to face
- Admin dashboard with a sidebar layout: Dashboard analytics, Registrants, Volunteers, Sponsors, Door Check In, Generate Tickets, and Staff Accounts tabs
- Scanner only staff accounts: door staff can check people in without any access to registrant data, editing, or deletion
- Row Level Security on every table; the public can only submit their own registration or application; only authenticated admins can view, edit, approve, reject, or delete records
- Admin login with account lockout after repeated failed attempts, plus request size limits on every Edge Function
- Privacy Policy, Terms of Service, custom 404 page, and FAQ, all linked from the site nav and footer
- Ownership notice and anti clone protection, explained honestly in this README

**In progress**
- Full offline capable door scanning (current scanner requires an internet connection)
- Duplicate registration blocking (same email or phone) at the database level
- CAPTCHA (deferred, not urgent for current scale)

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript. No frameworks, kept deliberately simple and fast
- **Backend:** Supabase (PostgreSQL database, authentication, Edge Functions, Storage)
- **Hosting:** GitHub Pages

## Project structure

```
DRIFT-Data-Collection/
├── index.html               Homepage
├── register.html             Online ticket registration form
├── volunteer.html            Volunteer sign up form
├── gallery.html               Past DRI-FT event photo gallery
├── check-ticket.html          Public ticket status lookup
├── activate-ticket.html       Physical ticket activation (code + PIN + photo)
├── privacy-policy.html       Privacy Policy
├── terms-of-service.html     Terms of Service
├── faq.html                   FAQ
├── 404.html                    Custom not found page
├── style.css                  Shared site wide styles
├── register.css               Styles for registration, volunteer, and activation forms
├── gallery.css                 Styles for the gallery page
├── script.js                    Countdown timer logic
├── register.js                  Registration form validation and Supabase submission
├── volunteer.js                  Volunteer form validation and Supabase submission
├── gallery.js                     Gallery lightbox functionality
├── check-ticket.js                Ticket lookup logic
├── activate-ticket.js             Physical ticket activation flow (code, PIN, photo)
├── sponsors.js                     Loads and displays active sponsors site wide
├── ownership-guard.js               Domain verification and ownership notice
├── nav.js                           Shared mobile nav toggle
├── sitemap.xml
├── robots.txt
├── images/
│   ├── drift header logo.jpg
│   └── gallery/                      Past event photos
└── admin/
    ├── admin.login.html               Staff sign in (with lockout protection)
    ├── admin.login.js                 Routes admins and scanners to the right screen
    ├── admin.dashboard.html           Full admin dashboard, sidebar navigation
    ├── admin.dashboard.css
    ├── admin.dashboard.js
    ├── scanner.html                    Lightweight door check in tool for scanner accounts
    └── scanner.js
```

## Security approach

Since this system handles real people's personal data, names, phone numbers, emails, and photos, security has been built in from the start rather than bolted on later:

- Public forms include honeypot fields to block basic bot spam
- Row Level Security (RLS) is live on every table. The public can only submit a registration or volunteer application (as Pending), never read, edit, or instantly confirm their own or anyone else's data. Only authenticated admins listed in the `admins` table can view, edit, approve, reject, or delete records
- There is no direct public read or write access to the `tickets` table at all, not even ticket status. Every ticket operation goes through a dedicated Edge Function
- Ticket PINs are never stored in plaintext. Generation and verification both use pgcrypto's `crypt()` with bcrypt hashing, entirely server side
- Two staff roles exist: `admin` (full dashboard access) and `scanner` (check in only, no access to registrant lists, editing, or deletion). Scanner accounts interact with participant data exclusively through a locked down Edge Function, never a direct table query
- Admin accounts can only be created by an existing full admin, from inside the dashboard, using a dedicated Edge Function with the service role key. There is no public sign up flow anywhere on the site
- Admin login enforces account lockout after repeated failed attempts within a time window, tracked server side
- Supabase Edge Functions reject any request over their configured size limit, checked both by header and actual measured size
- Sensitive logic (ID generation, PIN verification, validation, photo upload) runs server side via Supabase Edge Functions, never directly from the browser
- Every check in attempt, valid or not, is logged with who performed it and why it succeeded or failed
- *(Deferred, not currently needed)* CAPTCHA, IP based rate limiting beyond current protections, WAF and DDoS layers; scoped against actual project size rather than added for their own sake

### Anti clone protection: what's real vs what's a deterrent

**Actually enforced, cannot be bypassed by copying the code:**
- Every Edge Function only accepts requests from `kobijames18.github.io`. A cloned site hosted elsewhere has its requests rejected by the browser itself (CORS). It cannot register anyone, verify a ticket, or check anyone in, no matter what the cloned frontend code says
- There is no direct anon write access to `participants` or `volunteers`. All public writes go exclusively through the Edge Functions, which use the service role key server side. Someone with just the public anon key (visible in the frontend, and thus in any clone) cannot insert data directly via Supabase's REST API
- There is no anon read access at all to the `tickets` table. All ticket verification goes through dedicated Edge Functions, which only ever return status or validity, never the PIN hash or secure token

**Visible, but not a technical barrier, a deterrent only:**
- `ownership-guard.js` shows a full page warning if the site is loaded from any domain other than the official one, and logs an ownership notice to the browser console. Since this check is client side JavaScript, anyone with the full source (which is the premise of cloning in the first place) could delete this file from their copy. It's included because it makes an unauthorized copy visibly illegitimate, not because it's unbeatable

## Ownership and Copyright

© 2027 Kobi James Robert / DRI-FT. All rights reserved. This is the official, sole ticketing and registration system for DRI-FT. Any deployment of this code outside `kobijames18.github.io` is unauthorized and is not connected to the real DRI-FT event database.

## About

Built by Kobi James Robert, a final year web development student at the College of Digital Excellence, Sierra Leone. DRI-FT is a real event I help run.

**Follow DRI-FT:**
- Instagram: [@driftparty_](https://www.instagram.com/driftparty_)
- TikTok: [@drift.party3](https://www.tiktok.com/@drift.party3)
- WhatsApp Channel: [DRIFT-FESTIVAL](https://whatsapp.com/channel/0029VaiPdHY8F2pJtJZIeS0X)

---

*This README is updated as the project develops.*