# Build Spec — picsbymatmat booking site

A booking-focused site for Matthew Macapinlac (picsbymatmat.com), a Bay Area
photographer shooting product, brand, event, and portrait work.

Revised after the client call. This replaces the earlier portfolio-first version.

---

## 1. What this is and who it is for

**Subject:** a site people book from. Matt already has two portfolio sites, and his
problem with both is that they are portfolios — they show the work and then leave the
visitor to figure out what to do next. This one leads with booking and uses the work as
proof.

The full portfolio is not rebuilt here. It stays where it is and gets linked.

**Audience and how they arrive:** mostly Instagram, often after being tagged in a
friend's photos. They arrive on a phone, already half-aware of his work, wanting to know
whether he shoots the thing they need and whether he is free. They are not browsing.

**What this means concretely:**

- Mobile is the primary build, not a responsive afterthought.
- A visitor who wants to book should reach the booking step almost immediately.
- Proof is compressed: enough frames to convince, not a full gallery.
- Availability is visible, because "is he free" is the question they actually have.

**Business context that shapes the design:** graduation season is his peak and he is
trying to spread demand across the year by taking on more professional work. The site
should not read as a graduation photographer's site. Product, brand, and event work
lead.

---

## 2. Functional requirements

1. Four shoot categories: **Professional & Product**, **Brand & Lifestyle**, **Events**,
   **Portraits**.
2. Selecting a category shows that category's work and carries the choice into booking.
3. A booking form collects the fields in §8 and `POST`s JSON to a configurable webhook
   (n8n; URL from env, never hardcoded).
4. A calendar shows availability and lets a visitor request a date.
5. On success the form is replaced by a confirmation. On failure it stays filled and
   shows a recoverable error.
6. Matt can add and replace photographs himself, without a deploy and without calling
   Gavin.
7. Testimonials, results figures, portfolio link, and contact details are present.
8. Works on a 375px phone, with a keyboard, and with `prefers-reduced-motion: reduce`.
9. Static hosting. No server beyond the webhook and third-party embeds.
10. The booking step is reachable directly from any point on the site and has a stable
    URL per category (`/book/product`, `/book/brand`, `/book/event`, `/book/portrait`),
    plus `/book` with no category preselected. Changing the shoot type updates fields and
    URL in place; it never navigates or reloads.

### Webhook contract

`POST {BOOKING_WEBHOOK_URL}`, `Content-Type: application/json`:

```json
{
  "category": "product" | "brand" | "event" | "portrait",
  "name": "string",
  "subject": "string",
  "email": "string",
  "phone": "string | null",
  "instagram": "string | null",
  "shootDate": "YYYY-MM-DD | null",
  "timeSlot": "morning" | "evening" | null,
  "turnaround": "standard" | "rush",
  "location": "string",
  "notes": "string | null",
  "categoryFields": { },
  "submittedAt": "ISO-8601 string",
  "source": "picsbymatmat-booking"
}
```

`name` is the person booking; `subject` is who or what the shoot is actually of (the
earlier draft conflated these into one field labelled SUBJECT — they are now separate
questions). Exactly one of `phone` or `instagram` is required; the other is `null`.
`location` is required (see §8 — it changed from optional). `preferredDate`/`altDate` from
the earlier draft are gone, replaced by `shootDate` (from the calendar widget) plus
`timeSlot`. The delivery-target date became a two-option choice, `turnaround`, rather than
a literal date — see §8.

Non-2xx or network error is a failure. Do not clear the form on failure.

---

## 3. The experience, in order

### Navigation

Not a bar at all — `Book` in `--accent` and an Instagram link in `--muted-dim`, both mono,
text only, locked to their corners at the top of the page. No background fill, no button
chrome, no logo lockup, no border, at rest or scrolled — they scroll away with the rest of
the page like any other content, rather than sticking. It hides while the light table is
open.

`Book` opens `/book` with no category chosen and shoot type as the first field. Never
preselect a category arbitrarily: the same entry point must behave the same way every
time. A visitor who already knows what they want never has to pick a strip or scroll a
rail. The portfolio link deliberately
stays out of the nav: at the top it invites people to leave before booking, at the
bottom it is a useful exit for people who were not going to book anyway.

### Arrival

Four vertical filmstrips hang in frame, overlapping in a loose fan rather than evenly
spaced — as if just set down after being held together in one hand, each angled slightly
off vertical in alternating directions, resting almost against one another. Each strip
holds three frames from one category, sprocket holes running both edges.

Portrait (vertical) aspect ratio only, on every strip, everywhere. There is no horizontal
variant — the earlier alternate horizontal frame set is retired. The whole graphic is
scaled down from the earlier four-frame strip so three frames fit at a size that still
reads clearly; do not just crop a frame off the bottom of the old layout.

Under each strip, its category name in mono. This is the only navigation.

Hovering a strip changes the room it hangs in: the background crossfades to one of
Matt's atmosphere frames, held well back — heavily darkened, grained, vignetted. The
hovered strip's label lights up. **No photograph is ever dimmed, desaturated, or
transformed.** All four strips stay at full grade at all times. His work is never turned
down to make an interaction feel responsive.

Above the fan, one line of copy and nothing else. Below it, a quiet, underlined link for
people who want to see more work before deciding.

On desktop, the whole landing page — nav, heading, fan, link — fits exactly one viewport,
no scroll. It sizes itself against the nav's real measured height rather than assuming a
fixed nav size, so this holds regardless of how the nav's own height changes.

### Category view

The chosen strip expands to fill the screen. Below it, horizontal rails of that
category's photographs, drifting sideways as the visitor scrolls. Between rails, thin
film-edge rules carrying frame markings.

There are three rails per category, and each carries its own subtitle naming the kind of
shot it shows — e.g. for Portraits: candids, posed, details. The subtitle sits with the
film-edge rule above its rail, mono, quiet, not a heading. Content per category, from
`content.json`.

Clicking any frame puts it on the light table: the page dims to a scrim, the frame opens
large with its sprocket edges intact and its frame number in mono in a corner, and the
rest of the category is navigable left and right. Escape or a click outside returns to
the rails at the same scroll position.

Two or three rails of proof is enough before the booking step appears. Do not make
someone scroll past forty photographs to find the form.

### The call sheet

A booking form set as a production call sheet: ruled rows, mono field labels, generous
space. Fields in §8. It is a form and behaves like one; only the styling is unusual.

The calendar sits inside this step, not before it — a visitor picks the kind of shoot,
sees when Matt is free, and requests a date in one motion.

### Confirmation

Submitting takes the visitor to a standalone confirmation page (`/success`, no category
in the URL — there is nothing category-specific left to link to directly). A Polaroid
rises into place, blank, then develops over roughly two and a half seconds from a flat
undeveloped grey into Matt's actual hero photograph for that category — a real print now,
not a tint standing in for one.

Matt supplies each hero photo shot with deliberate open space — sky, wall, negative
space in the frame — so there is somewhere for text to sit without covering the subject.
The confirmation line develops directly into that whitespace, on the photograph itself,
handwritten:

> Got it. I'll text you to lock in the time.

In the white margin below the print's border — the traditional blank strip at the bottom
of a Polaroid — two things, stacked: the plain mono caption, and beneath it a generated
autograph-style sign-off, in a script hand rather than the confirmation line's print-hand,
as if Matt signed the print himself:

> {{category of shoot}} - {{date of shoot}}
> {{location of shoot}}
>
> *Thank you for booking with me. Love, Matmat*

Location is now a required field (§8), so this line is always present. The sign-off is
static, the same on every card — it is not personalized per booking. Below the card, a
quiet link back to the landing page.

Like the landing page, `/success` fits exactly one viewport on desktop, no scroll — sized
against the nav's real measured height, same as landing.

**Proportions match a real Polaroid 600 print, to the mm:**

```
card (border included):  88.5 x 107.5mm  → aspect-ratio 88.5 / 107.5
image window:             77 x   79mm    → aspect-ratio 77 / 79
border, all four sides:  5.75mm on an 88.5mm-wide card → 6.4972% padding
caption strip:             77 x   17mm    → aspect-ratio 77 / 17
```

The border is a uniform matte on all sides — the caption strip is a distinct region
below it, sized by its own aspect ratio, not by lopsided frame padding.

**Current build, interim (not the target state described above):** no per-category hero
photo exists yet, so the develop still resolves into a generic placeholder image (birds on
a wire) with a warm tint overlaid at partial opacity rather than full-grade photography,
and the confirmation line is baked into that placeholder image rather than live text. The
margin below the border currently holds only a supplied signature image — no mono caption,
no live category/date/location text, no separate script sign-off — a first step toward the
sign-off described above, not the finished version. The proportions have also been tuned
away from the literal real-print mm above, as currently built: `2%` border padding
(was `6.4972%`), `77 / 78` image window (was `77 / 79`), `77 / 18` caption strip
(was `77 / 17`), and the card itself scaled down another 10% (`min(378px, 90vw)`).

The develop crossfades from a flat, undeveloped grey to the hero photograph at full
grade — no gradient stand-in.

### Below the fold

Supporting sections, in this order: testimonials, results, portfolio link, contact.
Detail in §10.

---

## 4. Colour

**One palette. Category difference comes from the photographs, not from the interface.**

An earlier draft graded each category as a different film stock. That is gone. A single
restrained palette across the whole site, with all colour coming from Matt's work.

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#19191C` | page |
| `--surface` | `#242428` | call sheet, cards |
| `--ink` | `#F2F0EC` | body text, warm off-white |
| `--muted` | `#E8E6E0` | secondary text, field labels — near-white, not grey |
| `--muted-dim` | `#8C8981` | the original grey `--muted` value, kept only for a couple of deliberately quieter links (nav Instagram, landing "See more work", success page's back link) |
| `--accent` | `#C08A4A` | actions, focus rings, active states |
| `--rule` | `#38383F` | hairlines, film edges, borders |

**Why dark:** photographs are the only source of colour on the page and they sit
strongest against near-black. It also suits the professional repositioning — his product
and night work read considerably better here than on cream, and cream-with-a-serif is
the default look of every generated portfolio site on the internet.

Use `--accent` sparingly: interactive states and nothing else. If more than a few percent
of the screen is accent-coloured, it is wrong.

**Atmosphere plates** behind the landing fan are treated, never shown raw:

```css
filter: brightness(0.48) contrast(0.9) saturate(0.55) blur(6px);
/* plus the shared grain overlay */
/* plus a radial-gradient mask for the vignette — never bake the fade into the file */
```

If a plate is legible as a photograph at a glance, it is too strong. It is the room, not
the subject. Choose the four plates to be distinguishable from each other at thumbnail
size.

---

## 5. Type

- **Fraunces** (variable) — display and headings. Heavy weight, tight tracking.
- **Space Mono** — film edge markings, category labels, call sheet field labels, frame
  numbers, the Polaroid's caption line. Nothing else.
- **Caveat** — the Polaroid confirmation line only, written as if in marker on the print.
- **A separate script face** (e.g. Mrs Saint Delafield) for the autograph sign-off in the
  Polaroid's bottom margin — deliberately not Caveat, so the sign-off reads as an actual
  signature rather than more of the same handwriting.

Body copy is Fraunces at a lighter weight and looser leading. There is little body copy
here and giving it to the serif keeps things cohesive.

Scale from a 1.25 ratio: `0.75 / 0.875 / 1 / 1.25 / 1.563 / 1.953 / 2.441 / 3.052rem`.
Body under 70 characters per line, 1.6 line-height.

**Rules:**

- Uppercase only inside the call sheet and on film edge markings, where it is diegetic.
  No uppercase eyebrow labels above section headings.
- No single word in a heading accented with different colour, weight, or italic.
- No middle-dot metadata. Film edges use frame numbers and arrows: `→12 12A 13`.
- No arrows appended to button or link text.
- **No film manufacturer or stock names anywhere in the rendered output.** Edge markings
  carry bare frame numbers only.

---

## 6. Motion

One moment gets real budget. Everything else is quiet or absent.

### The hero moment

**The Polaroid developing.** The frame rises from below over 450ms (settling at a slight
-2° tilt, like a print set down by hand), then over 2400ms the image crossfades from flat
grey to Matt's hero photograph at full grade, and the handwritten confirmation line —
resolving into the photo's own negative space, not overlaid on top of the subject — fades
and sharpens in step with it, one resolving exposure, not two separate animations. A short
delay first so the blank grey reads before developing starts. Film grain and the print's
vignette are present throughout, undisturbed by the crossfade. The mono caption and the
signature in the bottom margin are present from the start, not part of the develop — only
the photograph and the line written on it develop. This is the only place motion is the
point.

### Everything else

- **The page does not animate on load.** The strips are simply there. No drop, no
  stagger, no fade-up, no reveal. Do not add an entrance.
- **Strip hover:** two effects, neither touching a photograph. The background plate
  crossfades over 280ms. The hovered strip's label shifts to `--accent` and gains a 1px
  rule, 140ms. No transform on the strip itself.
  - Preload all four plates or the first hover flashes empty.
  - Debounce: commit a plate change only after 60ms of sustained hover.
  - `cursor: pointer` on all four.
- **Category open:** the strip expands over 650ms ease-in-out; rails fade in as one group
  over 300ms, not staggered per row.
- **Rails:** scroll-linked horizontal translation at rates `-0.35`, `+0.22`, `-0.5`.
  `transform: translate3d()` only, one `requestAnimationFrame` loop for all rails.
- **Light table:** scrim fades 200ms; frame fades in with a 1.02 to 1 scale over 220ms;
  moving between frames is a 160ms crossfade, no slide.
- **Call sheet arrival:** none.
- **Submit pending:** progress shown in the button. No spinner overlay.

### Reduced motion

- Category open becomes a 150ms crossfade.
- Rails do not translate; each becomes a normal horizontally scrollable row.
- Light table opens, navigates, and closes with no transition.
- The Polaroid appears already developed.
- Colour transitions remain; they are not motion.

---

## 7. Mobile

Built first, not adapted. Most visitors arrive here from Instagram.

- **Landing:** the four strips stack vertically, full-bleed, each showing two frames. In
  place on load, no entrance. Tap replaces hover.
- **Background plates:** whichever strip is nearest the vertical centre sets the plate,
  via `IntersectionObserver` with a centre-band root margin. Same 280ms crossfade.
- **Rails:** native horizontal scroll with `scroll-snap-type: x mandatory`. No parallax.
- **Light table:** swipe between frames, tap outside or a persistent close control to
  dismiss. No pinch-zoom; fit each frame to screen. Close control always visible.
- **Call sheet:** single column, labels above inputs, inputs at least 16px to prevent iOS
  zoom, 44px minimum tap targets.
- **Calendar:** the embed must be usable at 375px. Test it early; this is the most likely
  thing to be broken on a phone.
- **Polaroid:** same animation, sized to 90vw (max 378px — see the interim proportions
  note under Confirmation), same real-print-derived proportions.

Breakpoint at 768px.

---

## 8. The call sheet

**Category and URL.** Each category has its own booking URL, so Matt can link straight to
one from an Instagram story. Arriving at `/book/portrait` presets the shoot type. Arriving
at `/book` leaves it unset. Either way, `SHOOT TYPE` is always rendered as a normal
question in the form — it is never hidden or swapped for fixed text, and picking or
presetting it never changes any surrounding header or label copy. It only changes which
category-specific questions render beneath it. Choosing a strip on the landing routes to
that category's URL.

Changing the shoot type from the dropdown updates the category-specific fields and
rewrites the URL with `history.replaceState`. It does not navigate, does not reload, and
does not clear anything already typed. **Never trigger navigation from a select change**
— it breaks keyboard and screen reader use, where users move through options one at a
time.

Shared fields, all categories, in order:

| Label | Field | Required |
| --- | --- | --- |
| YOUR NAME | name | yes |
| PHONE OR INSTAGRAM | phone (tel) or instagram, one toggle | one of phone/Instagram |
| EMAIL | email | yes |
| SHOOT TYPE | category | yes |
| *(category-specific fields, see below)* | categoryFields | varies |
| SUBJECT | subject | yes |
| LOCATION | location | yes |
| SHOOT DATE | shootDate + timeSlot (calendar widget, §9) | yes |
| DELIVERY DATE | turnaround (two-option select) | yes |
| NOTES | notes (textarea) | no |

**Name vs. subject.** `name` is the person booking; `subject` is who or what the shoot is
actually of (e.g. a business name, a couple, an event). These are two separate questions,
not one field doing double duty.

**Phone or Instagram, not both required.** A single question with a method toggle
(Phone / Instagram) and one text input, subtitled "How I'll reach out." Whichever method
isn't chosen submits as `null`; validate that the chosen method's value is filled.

**Email** is subtitled "How I'll deliver the photos."

**Shoot date** is the calendar widget from §9, plus a choice of two time slots —
**Morning** or **Evening** — once a date is picked. Matt runs roughly one shoot a day, so
this is which half of that day, not a precise time.

**Delivery date** is not a literal date — it is a two-option select asking how soon the
visitor needs the photos, since that is what actually determines whether a rush fee comes
up:

- "2-3 weeks from shoot date - typical turnaround" (default)
- "Sooner - Comes with a rush fee"

**Location** is required, not optional — Matt needs to know roughly where before he can
confirm. Placeholder text: "A general area is plenty, just so I can plan my commute." —
visitors are not asked for a street address, just an area. Error: "Say where the shoot
will be held."

Category-specific, into `categoryFields`, rendered directly beneath the shoot type field:

- **Professional & Product** — `business`, `productCount`, `usage` (select: ecommerce
  listings, social, website, advertising, other)
- **Brand & Lifestyle** — `business`, `deliverables` (select: social content, campaign,
  headshots, other), `shootLength` (select: 1 hour, 2 hours, half day)
- **Events** — `eventType`, `duration`, `guestCount`
- **Portraits** — `occasion` (text, e.g. graduation, headshots, couples), `people`
  (number)

Validate on blur. Errors under the field, in plain language saying how to fix it: "Add a
phone number so Matt can text you." Errors do not apologise.

**Testimonials beside the form.** One or two testimonials sit alongside the call sheet,
filtered to the chosen shoot type and updating when it changes. Quiet: quote in Fraunces
at body size, attribution in mono, no boxes, no avatars, no stars. They reassure in
peripheral vision; they do not compete with the form.

Fallback, since Matt is supplying three or four testimonials in total rather than per
category: if the chosen category has none, fall back to any testimonial. If there are
none at all, render nothing.

On mobile they sit below the form, not beside it.

---

## 9. Calendar

**Behaviour: request, not instant booking.** A visitor picks a preferred date; Matt
confirms. He runs roughly one shoot a day and blocks out days he is busy, so availability
is day-level, not time-slot-level. Pricing and duration vary enough across the four
categories that he will want a conversation before anything is locked. Instant booking
would also let someone hold a peak-season Saturday for free and then vanish.

**Morning or evening is a preference, not a slot Cal.com books against.** Once a date is
picked, the call sheet asks which half of the day works better — a plain either/or choice
alongside the widget, submitted as `timeSlot`, not a second Cal.com availability axis.
Availability stays day-level for the reasons above; the time-of-day choice just gives Matt
something to work with when he confirms.

**Implementation: embed Cal.com (free tier)**, configured for day-long request-mode
bookings. Matt manages availability in Cal.com's own interface rather than one built
here. Theme it as close to the palette as the embed allows.

Known tradeoff, already raised with the client: the embed will not look as bespoke as the
rest of the site. A custom month grid reading his Google Calendar would look better and
cost a meaningful share of the budget. If he chooses that later it slots in behind the
same interface.

The calendar sits inside the call sheet step, directly under the shoot date field, with no
separate heading above it — cut per client feedback. A visitor should not have to hunt for
it.

---

## 10. Supporting sections

Below the booking flow, in this order. All are simple; none should compete with the work.

**Testimonials.** Appear in two places: beside the call sheet filtered by shoot type, and
in full here below the booking flow. Same data, same component, different filter.

Three or four, each with the client's name and what the shoot was.
Quote in Fraunces, attribution in mono. No carousel, no star ratings, no avatars. If a
photograph from that shoot exists, one small frame beside the quote.

**Results.** For the product and ecommerce work. Whatever figures Matt supplies —
conversion lift, before and after, sales change. Set as large numerals in Fraunces with a
mono caption underneath. Three at most. **If he supplies none, the section does not
render. Do not invent placeholder statistics.**

**Portfolio link.** One line pointing to his existing site for people who want to see
more. Quiet, in `--muted`, not a competing call to action.

**Contact.** Instagram and email, one line, for people not ready to book.

---

## 11. Content management

**Photographs: Cloudinary free tier.** Matt uploads into a folder per category and the
site reads that folder. He does not learn a CMS, and Cloudinary handles responsive
resizing and format conversion, which this site needs regardless.

- Folder names map to category keys: `product`, `brand`, `event`, `portrait`, `plates`.
- Ordering by filename prefix (`01-`, `02-`) so he controls sequence by renaming.
- Alt text from Cloudinary context metadata where set, with a sensible fallback.
- Fetch the folder listing at build time, with a client-side fetch fallback so new
  uploads appear without a redeploy.

**Text content: a JSON file in the repo**, edited by Gavin on request. Testimonials,
results figures, and copy change perhaps twice a year and do not justify a second system.

Document the Cloudinary workflow for Matt in plain language: where to upload, how naming
affects order, how long changes take to appear.

---

## 12. Copy

- **Nav:** `Book`, `Instagram`
- **Landing heading:** `Pick a shot.`
- **Call sheet, shoot type field label (always shown, never swapped for a heading):**
  `SHOOT TYPE`
- **Strip labels:** `Product`, `Event`, `Brand`, `Portrait`
- **Landing portfolio link:** `See more work`
- **Above the call sheet:** `Tell me what you have in mind`
- **Submit control:** `Send`
- **Pending:** `Sending`
- **Confirmation:** `Got it. I'll text you to lock in the time.` (handwritten, resolving
  into the photograph's negative space), mono caption below the border
  `{{category of shoot}} - {{date of shoot}}` then `{{location of shoot}}` on its own line
  (location is required, always present), followed by the script sign-off
  `Thank you for booking with me. Love, Matmat` (static, not per-booking)
- **Failure:** `That didn't send. Check your connection and try again.`

Sentence case throughout except call sheet labels and film markings. Active voice. Submit
control and confirmation use the same verb.

---

## 13. Stack and orchestration

**Stack:** React + Vite + TypeScript, plain CSS with custom properties. No UI kit, no
Tailwind, no animation library. Static deploy.

### Phase 0 — Contracts. Sequential. Orchestrator only. No agents.

1. **Design review first.** Produce tokens and a layout plan from §4–6, then check
   whether any of it is what you would produce for any photography site rather than this
   one. Revise what is generic and say what changed.
2. Scaffold Vite + React + TS with the structure below.
3. Write these yourself before dispatching anything:
   - `src/styles/tokens.css` — palette, type scale, spacing, grain overlay,
     reduced-motion block
   - `src/styles/global.css` — resets, font loading, base type
   - `src/data/content.json` — testimonials, results, copy strings
   - `src/lib/cloudinary.ts` — folder fetch and URL construction
   - `src/types.ts` — `Category`, `BookingPayload`, every component's props
4. Freeze the interfaces. An agent wanting to change a shared type comes back to you.

```
src/
  components/
    Filmstrip/        agent A
    CategoryView/     agent B   (includes light table)
    CallSheet/        agent C   (includes calendar embed)
    Polaroid/         agent D
    Supporting/       agent E   (testimonials, results, links)
  styles/  data/  lib/  types.ts  App.tsx     orchestrator
```

### Phase 1 — Components. Parallel. Five agents.

Each gets this document, the frozen types, and one rule: create files only inside your
own folder. Each builds against placeholder data and must be independently viewable.

- **A — Filmstrip.** Sprocket edges as repeating SVG, vertical frame stacking, the
  overlapping fan arrangement with alternating angles, hover per §6 (plate signal emitted
  upward via callback), tap, keyboard focus. No entrance animation.
- **B — CategoryView.** Expand transition, rails with parallax on desktop and
  scroll-snap on mobile, film-edge rules, return control, and the light table: scrim,
  enlarged frame, arrow-key and Escape navigation, focus trap, focus returned to the
  originating frame on close, scroll position preserved.
- **C — CallSheet.** All fields including per-category, blur validation, plain-language
  errors, Cal.com embed, webhook `POST`, pending and failure states preserving input.
  Must work in two modes: category preset, and category chosen as the first field. Build
  it as a standalone view taking an optional category prop, not as a section glued to the
  bottom of the category view. Also owns routing for `/book` and `/book/:category`,
  in-place category switching via `history.replaceState`, and the category-filtered
  testimonial panel with its fallback.
- **D — Polaroid.** Frame geometry, develop animation from flat grey to the per-category
  hero photo, Caveat handwriting confirmation line resolving into the photo's negative
  space, mono caption plus script sign-off in the bottom margin, reduced-motion variant.
- **E — Supporting.** Testimonials, results, portfolio link, contact. Reads
  `content.json`. Renders nothing for empty sections.

### Phase 2 — Integration. Orchestrator.

1. Compose the landing: four Filmstrips in the fan, plate crossfade with debounce and
   preloading, labels.
2. Wire landing → CategoryView → CallSheet → Polaroid, category carried through.
3. Compose the nav bar and wire `Book` to open the call sheet in direct mode from
   anywhere, including mid-category.
4. Mobile plates via `IntersectionObserver`.
5. Cloudinary wiring against real folders.
6. Resolve whatever the agents did inconsistently. There will be something.

### Phase 3 — The pass. Orchestrator.

1. Keyboard from landing to confirmation. Visible focus in `--accent`.
2. Reduced-motion path end to end.
3. 375px, including the Cal.com embed.
4. Lighthouse on mobile with real images.
5. Screenshot the landing, a category, and the confirmation. Fix what looks wrong, not
   what fails a check.
6. Remove one thing that is not earning its place.

### If you cannot spawn agents

Build Phase 1 in the listed order. Nothing depends on parallelism.

---

## 14. Acceptance criteria

- [ ] Four categories, each opening its own view and carrying into booking.
- [ ] Form validates and `POST`s the §2 payload to the env-configured webhook.
- [ ] Failure keeps entered data and offers retry.
- [ ] `Book` in the nav opens the call sheet from any state, with shoot type as a
      required first field.
- [ ] Nav is hidden while the light table is open.
- [ ] `/book/:category` deep links work and preset the shoot type.
- [ ] Changing shoot type updates fields and URL without navigating or clearing input.
- [ ] Testimonials beside the form filter by shoot type and fall back gracefully when a
      category has none.
- [ ] Calendar renders and is usable at 375px.
- [ ] Polaroid develops on `/success` from flat grey into the category's real hero
      photograph, with the confirmation line resolving into the photo's negative space,
      and the category/date/location caption plus the signature sign-off in the margin
      below the border.
- [ ] New photos uploaded to Cloudinary appear without a redeploy.
- [ ] Every photograph opens on the light table and is navigable and closable by keyboard
      alone, with focus returned to its originating frame.
- [ ] Every photograph has a real alt description.
- [ ] Keyboard-usable start to finish, visible focus in `--accent`.
- [ ] `prefers-reduced-motion` removes the expand, parallax, light table transitions, and
      develop, and the flow still completes.
- [ ] 375px has no horizontal overflow, no tap target under 44px.
- [ ] Every image has dimensions set; no cumulative layout shift.
- [ ] No filmstrip photograph is ever dimmed, desaturated, or filtered in any state.
- [ ] Empty content sections render nothing rather than placeholders.
- [ ] No film manufacturer or stock name in rendered output, including alt text.
- [ ] No uppercase eyebrow labels, no middle-dot metadata, no arrows in button text.
- [ ] Page has title, meta description, and Open Graph image.
- [ ] Lighthouse performance above 85 on mobile with real photographs.

---

## 15. To be supplied by the client

- 15–25 photographs per category, four categories, exported web-sized.
- Four atmosphere frames for the background plates.
- One hero frame per category for the Polaroid, shot with deliberate open space (sky,
  wall, negative space) for the confirmation line to sit in without covering the subject.
- Three or four testimonials with names and shoot types.
- Conversion figures for the results section, or confirmation that there are none.
- Logo or business card artwork.
- Links to the existing portfolio sites, and which to link.
- Phone number and email for booking notifications.
- Cal.com account, or agreement for Gavin to set one up.
- Domain and current hosting details.

---

## 16. Still open

- Whether this replaces the current site address or lives at a new one.
- Timeline, to be set backwards from the photo delivery date.
- Whether the Cal.com embed is acceptable aesthetically, or a custom calendar is wanted
  later as separate work.
- Backend automation beyond the booking webhook is out of scope and priced separately.

---

## 17. Milestones

The phases in §13 describe the build sequence once, start to finish — Phase 3 does not
repeat. Milestones are a separate, client-facing axis: what "done" means at each delivery
checkpoint, since the site runs end to end well before every real input exists.

**Milestone 1 — site works end to end against interim inputs.**

- One real photo per category (frame, hero, and a distinct atmosphere plate), not the
  final 15–25 — enough to prove every component against real photography instead of
  placeholders.
- Booking form posts to a webhook URL from an env var; no live n8n workflow behind it
  yet.
- Cal.com embed present and functional against a stub/demo configuration; no production
  account required yet.
- Supporting section (testimonials, results, portfolio link, contact) may ship empty or
  deferred — §10's "render nothing for empty sections" rule covers this by design.
- Everything in the Phase 3 pass (keyboard, reduced-motion, 375px, Lighthouse) holds at
  Milestone 1, against whatever content exists at the time.

**Milestone 2 — real inputs swap in.**

- Cloudinary account created, Matt has folder upload access, full photo counts per §15.
- Real n8n workflow behind the webhook URL.
- Real Cal.com account, configured and themed.
- Real testimonials and results figures in `content.json`; Agent E (Supporting) built or
  revisited against them.
- Re-run the relevant parts of Phase 2 (wiring) and Phase 3 (the pass) against real data
  — Phase 1 component work does not get redone.

Milestone 2 does not require rebuilding Milestone 1; it is Milestone 1 with placeholders
replaced. The two are declared here since they carry different sign-off criteria — the
acceptance criteria in §14 are Milestone 2's bar; Milestone 1 is complete when the same
flow works using interim inputs without a broken or fabricated state anywhere.
