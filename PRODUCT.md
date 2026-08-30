# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Arabic-speaking Muslim adults and families — served equally in parallel. Adults seeking Quranic education (memorization, tajweed, recitation) and families enrolling children for foundational Islamic knowledge. The platform does not prioritize one group over the other.

**Secondary:** International Muslim diaspora (Arabic-primary, but reaches non-Arab-country audiences). Both parents and their children are on the platform simultaneously through separate portals.

## Product Purpose

أكاديمية حبل الله القرآنية is a dual-portal, integrated Quranic education platform. It connects students to certified, licensed teachers for live one-on-one lessons, provides structured recorded courses, hosts periodic competitions (مسابقات), and issues internationally recognized certificates.

A student's full success journey on the platform covers: booking live lessons with vetted teachers, watching recorded course content, tracking memorization and lesson history, competing in Quranic competitions, and earning certificates — all within one platform.

Success means a student who completes a Quran memorization or tajweed program and receives a certificate, having interacted with real qualified teachers throughout.

## Positioning

The mechanism a neighboring platform could not truthfully copy: **certified, licensed teachers (معلمون مجازون)** delivering live one-on-one lessons, combined with structured competitions (مسابقات) as an active engagement and accountability mechanism — all within a single platform that separately serves adults and children without compromising either experience.

## Operating Context

- **Adults portal (`/quran`):** Courses, teacher browse/book, live lessons, competitions, student dashboard with lesson tracking.
- **Kids portal (`/` → "أسس حبل الله"):** Fully live. Age-appropriate content — simplified fiqh, aqeedah, seerah, and Quranic games. Separate visual and UX treatment from the adults portal.
- **Admin panel (`/admin`):** Manages teachers, courses, lectures, competitions, reviews, newsletter subscribers, FAQ, and static pages.
- **Contact channel:** WhatsApp floating button is the primary support and inquiry channel.
- **Interface direction:** RTL Arabic throughout. Dark mode supported.

## Capabilities and Constraints

- Stack: React 19 + Vite, React Router v7, Supabase (auth + database + storage), Tailwind CSS v4, Lucide icons.
- **Mobile-first constraint:** A significant portion of the Arabic-speaking audience uses phones as their primary device. Every surface must work well on mobile browsers.
- Students can: browse teachers by gender, view teacher profiles, book lessons, watch courses, track lesson history, participate in competitions, log in / sign up.
- Admin users can: manage teachers, reviews, courses, lectures, competitions, FAQ, newsletter subscribers, and page content.
- Certificates: described as "شهادات معتمدة دولياً" — internationally accredited; this claim must not be altered or fabricated.
- Kids platform is fully live, not future/planned.
- No hard accessibility standard mandated, but mobile browser compatibility is non-negotiable.

## Brand Commitments

- **Name:** أكاديمية حبل الله القرآنية (academy); platform names: "منصة حبل الله" (adults) and "منصة أسس حبل الله" (kids).
- **Logo:** Gold logo asset at `src/assets/logo-gold.png` — used in the hero. Must be preserved.
- **Visual identity:** Dual-tone — professional, warm Islamic (deep emerald + gold) for the adults side; vibrant and playful for the kids side. This split is a confirmed brand commitment.
- **Voice:** Sincere, welcoming, Islamic in tone. Uses formal Arabic (فصحى) throughout.
- **Stats cited in UI:** +١٠ years experience, +٥٠٠ registered students, +٣٠ certified teachers, ٪٩٨ student satisfaction — treat as current marketing copy, do not alter without user confirmation.

## Evidence on Hand

- Functional codebase: React/Vite app with routing, Supabase backend, student auth, admin panel, courses, competitions, teacher profiles, and reviews.
- Logo asset: `src/assets/logo-gold.png`.
- Database schema files at project root: `database_competitions_setup.sql`, `database_courses_setup.sql`, `database_newsletter_setup.sql`, `database_reviews_setup.sql`.
- WhatsApp support channel confirmed active (FloatingWhatsApp component).
- No real student testimonials, press mentions, or external proof assets in the repository.

## Product Principles

1. **Authenticity first:** Every teacher is certified and licensed. The quality bar is not negotiable and must be legible to prospective students at every touchpoint.
2. **Two audiences, one platform — never blended:** Adults and children each get an experience tuned to their context. Visual language, tone, and interaction patterns differ; the underlying trust and quality are the same.
3. **Mobile is the real device:** Design to the phone first. The majority of the audience reaches the platform on a mobile browser, not a desktop.
4. **Live human connection is the product:** Recorded content and competitions support the core offer; the real product is the relationship between a certified teacher and a student. Design must make booking and showing up for a live lesson feel easy and motivating.
5. **Islamic character in every detail:** Voice, imagery, color, and copy carry the academy's identity. Nothing generic or secular in feel should ever be default-accepted.
