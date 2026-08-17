# DRIFT — Event Registration & Management System

DRI-FT is a real festival held in Sierra Leone, usually on New Year's Day (January 1st) and occasionally in June. This repository is the official website and data collection system for DRI-FT built to handle online registration, volunteer sign ups, and (in progress) full event management including check in and admin tools.

This project serves one purposes: it's the actual live system used to run DRI-FT events.

**Live site:** https://kobijames18.github.io/DRIFT-Data-Collection/

---

## What this project does

- Public event website with live countdown, event details, and social links
- Online ticket registration form (18+ only, strictly enforced)
- Volunteer sign-up form for people who want to help run the event
- Bot/spam protection on all public forms
- *(In progress)* Secure database backend for storing real registrations
- *(In progress)* Admin dashboard for managing participants, check-in, and statistics

## Current status

This is an actively developed project, not a finished product. Right now:

✅ **Done**
- Homepage with countdown, event info, and social links
- Registration form (frontend, with validation and bot protection)
- Volunteer sign-up form
- Responsive design works on mobile and desktop

🚧 **In progress**
- Supabase database connection (so registrations actually get saved)
- Row Level Security policies to protect participant data
- Rate limiting and backend validation via Supabase Edge Functions
- Admin login and dashboard
- Check-in system with fraud prevention
- Ticket ID generation (`DRIFT-JAN2027-0001` format)

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript no frameworks, kept deliberately simple and fast
- **Backend (planned):** Supabase (PostgreSQL database, authentication, and Edge Functions)
- **Hosting:** GitHub Pages

## Project structure

```
DRI-FT-Data-Collection/
├── index.html          Homepage
├── register.html        Ticket registration form
├── volunteer.html       Volunteer sign-up form
├── style.css             Shared site-wide styles
├── register.css          Styles for registration & volunteer forms
├── script.js              Countdown timer logic
├── register.js            Registration form validation
├── volunteer.js           Volunteer form validation
└── images/                 Logo and visual assets
```

## Security approach

Since this system will eventually handle real people's personal data (names, phone numbers, emails), security has been considered from the start rather than bolted on later:

- Public forms include honeypot fields to block basic bot spam
- Planned database access will use Row Level Security (RLS) the public will only ever be able to *submit* a registration, never read or edit other people's data
- Sensitive logic (registration ID generation, rate limiting, real validation) will run server side via Supabase Edge Functions, not directly from the browser
- IP-based rate limiting is planned to prevent abuse, stored separately from participant data
- Duplicate registrations (same email/phone) will be blocked at the database level, not just in the form

## About

Built by Kobi James Robert, a final year web development student at the College of Digital Excellence, Sierra Leone. DRI-FT is a real event I help run.
**Follow DRI-FT:**
- Instagram: [@driftparty_](https://www.instagram.com/driftparty_)
- TikTok: [@drift.party3](https://www.tiktok.com/@drift.party3)
- WhatsApp Channel: [DRIFT-FESTIVAL](https://whatsapp.com/channel/0029VaiPdHY8F2pJtJZIeS0X)

---

*This README is updated as the project develops.*