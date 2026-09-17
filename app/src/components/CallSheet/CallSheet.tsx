import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import content from "../../data/content.json";
import { CATEGORIES, CATEGORY_BY_SLUG } from "../../data/categories";
import CalendarEmbed from "./CalendarEmbed";
import type {
  BookingPayload,
  BrandFields,
  CallSheetProps,
  CategoryKey,
  EventFields,
  PortraitFields,
  ProductFields,
  TimeSlot,
  Turnaround,
} from "../../types";
import "./CallSheet.css";

// ---- Shared field state ----
//
// Shoot type is one question among the rest (§ conversation: "the shoot
// type only determines the questions on the rest of the form, not any
// header labeling text") — it never hides itself, and picking it never
// rewrites the heading copy above the form. It only changes which
// category-specific fields render below it.

type ContactMethod = "phone" | "instagram";

interface SharedFieldValues {
  name: string;
  contactMethod: ContactMethod;
  contactValue: string;
  email: string;
  subject: string;
  location: string;
  shootDate: string;
  timeSlot: TimeSlot | "";
  turnaround: Turnaround;
  notes: string;
}

const EMPTY_SHARED: SharedFieldValues = {
  name: "",
  contactMethod: "phone",
  contactValue: "",
  email: "",
  subject: "",
  location: "",
  shootDate: "",
  timeSlot: "",
  turnaround: "standard",
  notes: "",
};

// ---- Category field state, one bucket per category so switching never
// discards what was already typed for another category ----

interface CategoryFieldState {
  product: ProductFields;
  brand: BrandFields;
  event: EventFields;
  portrait: PortraitFields;
}

const EMPTY_CATEGORY_FIELDS: CategoryFieldState = {
  product: { business: "", productCount: "", usage: "ecommerce listings" },
  brand: { business: "", deliverables: "social content", shootLength: "1 hour" },
  event: { eventType: "", duration: "", guestCount: "" },
  portrait: { occasion: "", people: "" },
};

type SharedFieldName = keyof SharedFieldValues;

const SHARED_REQUIRED: SharedFieldName[] = [
  "name",
  "contactValue",
  "email",
  "subject",
  "location",
  "shootDate",
];

type SubmitStatus = "idle" | "pending" | "failure";

// Paused for testing convenience per client feedback: required-field and
// format errors still compute and display normally (on blur, as usual),
// but no longer block submission — only a chosen category does, since the
// payload is meaningless without one. Flip back to true before launch.
const BLOCK_SUBMIT_ON_VALIDATION_ERRORS = false;

// Also paused for testing: no real webhook is wired up yet, so treat a
// missing VITE_BOOKING_WEBHOOK_URL as a simulated success (payload logged
// to the console) instead of failing every submit attempt. Flip to false
// once a real webhook URL is set for launch.
const SIMULATE_SUCCESS_WITHOUT_WEBHOOK = true;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sharedFieldError(field: SharedFieldName, values: SharedFieldValues): string | null {
  const value = values[field];
  const trimmed = typeof value === "string" ? value.trim() : "";
  switch (field) {
    case "name":
      return trimmed ? null : "Add your name so I knows who's booking.";
    case "contactValue":
      return trimmed
        ? null
        : values.contactMethod === "phone"
          ? "Add a phone number so I can reach you."
          : "Add your Instagram so I can reach you.";
    case "email":
      if (!trimmed) return "Add an email so I can send the photos to you.";
      if (!EMAIL_RE.test(trimmed)) return "That email doesn't look right — check it and try again.";
      return null;
    case "subject":
      return trimmed ? null : "Say who or what this shoot is for.";
    case "location":
      return trimmed ? null : "Say where the shoot will be held.";
    case "shootDate":
      return trimmed ? null : "Pick a date so I know when you're hoping to shoot.";
    default:
      return null;
  }
}

export default function CallSheet({ presetCategory, onCategoryChange, onSuccess }: CallSheetProps) {
  const navigate = useNavigate();
  const params = useParams<{ category?: string }>();

  // Resolve the active category: prefer presetCategory (parent-controlled),
  // fall back to the URL param, else null (direct-entry mode).
  const paramCategory: CategoryKey | null = params.category
    ? CATEGORY_BY_SLUG[params.category]?.key ?? null
    : null;
  const initialCategory = presetCategory ?? paramCategory ?? null;

  const [category, setCategory] = useState<CategoryKey | null>(initialCategory);
  const [shared, setShared] = useState<SharedFieldValues>(EMPTY_SHARED);
  const [categoryFields, setCategoryFields] = useState<CategoryFieldState>(EMPTY_CATEGORY_FIELDS);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [success, setSuccess] = useState(false);
  // Label for the button once a real Cal.com booking picks a date — kept
  // separate from shared.shootDate (a plain "yyyy-mm-dd") since re-deriving
  // a friendly weekday/month string from that date-only value risks an
  // off-by-one day around midnight in timezones behind UTC.
  const [calBookingLabel, setCalBookingLabel] = useState<string | null>(null);

  // ---- Category switching: updates fields + URL in place, never a real nav ----
  const handleCategorySelect = useCallback(
    (key: CategoryKey) => {
      setCategory(key);
      const meta = CATEGORIES.find((c) => c.key === key);
      if (meta) {
        navigate(`/book/${meta.slug}`, { replace: true });
      }
      onCategoryChange(key);
    },
    [navigate, onCategoryChange],
  );

  const setSharedField = useCallback(<K extends SharedFieldName>(field: K, value: SharedFieldValues[K]) => {
    setShared((prev) => ({ ...prev, [field]: value }));
  }, []);

  const blurShared = useCallback((field: SharedFieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const blurCategoryField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [`cat.${field}`]: true }));
  }, []);

  const handleCalBooked = useCallback((startTimeIso: string) => {
    const d = new Date(startTimeIso);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSharedField("shootDate", isoDate);
    setTouched((prev) => ({ ...prev, shootDate: true }));
    setCalBookingLabel(d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
  }, [setSharedField]);

  const sharedErrors = useMemo(() => {
    const errors: Partial<Record<SharedFieldName, string>> = {};
    for (const field of SHARED_REQUIRED) {
      const err = sharedFieldError(field, shared);
      if (err) errors[field] = err;
    }
    return errors;
  }, [shared]);

  const categoryError = !category ? "Choose a shoot type so Matt knows what you're booking." : null;

  const isValid = useMemo(() => {
    if (categoryError) return false;
    return SHARED_REQUIRED.every((field) => !sharedFieldError(field, shared));
  }, [categoryError, shared]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark everything touched so errors surface on a submit attempt too.
    setTouched((prev) => ({
      ...prev,
      category: true,
      name: true,
      contactValue: true,
      email: true,
      subject: true,
      location: true,
      shootDate: true,
    }));

    // Hard gate, independent of BLOCK_SUBMIT_ON_VALIDATION_ERRORS above:
    // shootDate now only ever gets set via a completed Cal.com booking
    // (see handleCalBooked/CalendarEmbed) rather than free-typed text, so
    // there's no "arbitrary placeholder date" case left to allow through
    // for testing — an unpicked date means no real availability was
    // checked at all.
    if (!shared.shootDate) return;

    if (BLOCK_SUBMIT_ON_VALIDATION_ERRORS && (!category || !isValid)) return;

    // Testing convenience per client feedback (see BLOCK_SUBMIT_ON_VALIDATION_ERRORS
    // above): even with no category chosen, fall back to the first one so a
    // fully blank form can still submit and produce a valid payload shape.
    const effectiveCategory = category ?? CATEGORIES[0].key;

    const webhookUrl = import.meta.env.VITE_BOOKING_WEBHOOK_URL as string | undefined;

    const contactValue = shared.contactValue.trim() || null;
    const payload: BookingPayload = {
      category: effectiveCategory,
      name: shared.name.trim(),
      subject: shared.subject.trim(),
      email: shared.email.trim(),
      phone: shared.contactMethod === "phone" ? contactValue : null,
      instagram: shared.contactMethod === "instagram" ? contactValue : null,
      shootDate: shared.shootDate,
      timeSlot: shared.timeSlot ? shared.timeSlot : null,
      turnaround: shared.turnaround,
      location: shared.location.trim(),
      notes: shared.notes.trim() ? shared.notes.trim() : null,
      categoryFields: { ...categoryFields[effectiveCategory] },
      submittedAt: new Date().toISOString(),
      source: "picsbymatmat-booking",
    };

    setStatus("pending");
    try {
      if (!webhookUrl) {
        // Paused for testing (see BLOCK_SUBMIT_ON_VALIDATION_ERRORS above):
        // no webhook is hooked up yet, so rather than hard-failing every
        // submit attempt — which made it impossible to reach the
        // success/Polaroid flow at all — log the payload and proceed as if
        // it sent. Flip SIMULATE_SUCCESS_WITHOUT_WEBHOOK to false once a
        // real webhook URL is set for launch.
        if (SIMULATE_SUCCESS_WITHOUT_WEBHOOK) {
          console.info("[booking] no VITE_BOOKING_WEBHOOK_URL set — payload:", payload);
        } else {
          throw new Error("Missing VITE_BOOKING_WEBHOOK_URL");
        }
      } else {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      }
      setStatus("idle");
      setSuccess(true);
      onSuccess(payload);
    } catch {
      setStatus("failure");
    }
  }

  if (success) {
    return (
      <section className="call-sheet call-sheet--success" aria-live="polite">
        <p className="mono call-sheet__success-note">{content.copy["callsheet.successNote"]}</p>
      </section>
    );
  }

  return (
    <section className="call-sheet">
      <p className="call-sheet__above">{content.copy["callsheet.aboveForm"]}</p>

      <form className="call-sheet__form" onSubmit={handleSubmit} noValidate>
        <SharedRow
          field="name"
          label="YOUR NAME"
          type="text"
          value={shared.name}
          error={touched.name ? sharedErrors.name : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          autoComplete="name"
        />

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-contact">
            PHONE OR INSTAGRAM
          </label>
          <div className="call-sheet__control">
            <div className="call-sheet__method-toggle" role="radiogroup" aria-label="Contact method">
              <button
                type="button"
                role="radio"
                aria-checked={shared.contactMethod === "phone"}
                className={`call-sheet__method-btn${shared.contactMethod === "phone" ? " call-sheet__method-btn--active" : ""}`}
                onClick={() => setSharedField("contactMethod", "phone")}
              >
                Phone
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={shared.contactMethod === "instagram"}
                className={`call-sheet__method-btn${shared.contactMethod === "instagram" ? " call-sheet__method-btn--active" : ""}`}
                onClick={() => setSharedField("contactMethod", "instagram")}
              >
                Instagram
              </button>
            </div>
            <input
              id="cs-contact"
              type={shared.contactMethod === "phone" ? "tel" : "text"}
              placeholder="how should I reach you"
              value={shared.contactValue}
              autoComplete={shared.contactMethod === "phone" ? "tel" : undefined}
              aria-describedby={touched.contactValue && sharedErrors.contactValue ? "cs-contact-error" : undefined}
              aria-invalid={Boolean(touched.contactValue && sharedErrors.contactValue)}
              onChange={(e) => setSharedField("contactValue", e.target.value)}
              onBlur={() => blurShared("contactValue")}
            />
            {touched.contactValue && sharedErrors.contactValue ? (
              <p className="call-sheet__error" id="cs-contact-error" role="alert">
                {sharedErrors.contactValue}
              </p>
            ) : null}
          </div>
        </div>

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-email">
            EMAIL
          </label>
          <div className="call-sheet__control">
            <input
              id="cs-email"
              type="email"
              value={shared.email}
              placeholder="where should I deliver your photos"
              autoComplete="email"
              aria-describedby={touched.email && sharedErrors.email ? "cs-email-error" : undefined}
              aria-invalid={Boolean(touched.email && sharedErrors.email)}
              onChange={(e) => setSharedField("email", e.target.value)}
              onBlur={() => blurShared("email")}
            />
            {touched.email && sharedErrors.email ? (
              <p className="call-sheet__error" id="cs-email-error" role="alert">
                {sharedErrors.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-shoot-type">
            {content.copy["callsheet.firstFieldLabel"]}
          </label>
          <div className="call-sheet__control">
            <select
              id="cs-shoot-type"
              required
              value={category ?? ""}
              aria-describedby={touched.category && categoryError ? "cs-shoot-type-error" : undefined}
              aria-invalid={Boolean(touched.category && categoryError)}
              onChange={(e) => {
                const value = e.target.value as CategoryKey | "";
                if (value) handleCategorySelect(value);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, category: true }))}
            >
              <option value="" disabled>
                Choose one
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            {touched.category && categoryError ? (
              <p className="call-sheet__error" id="cs-shoot-type-error" role="alert">
                {categoryError}
              </p>
            ) : null}
          </div>
        </div>

        {category ? (
          <CategoryFieldsSection
            category={category}
            values={categoryFields}
            setValues={setCategoryFields}
            touched={touched}
            onBlur={blurCategoryField}
          />
        ) : null}

        <SharedRow
          field="subject"
          label="SUBJECT"
          type="text"
          value={shared.subject}
          error={touched.subject ? sharedErrors.subject : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          placeholder="who or what this shoot is for"
        />

        <SharedRow
          field="location"
          label="LOCATION"
          type="text"
          value={shared.location}
          error={touched.location ? sharedErrors.location : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          placeholder="where should I meet you"
        />

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-shoot-date-trigger">
            SHOOT DATE
          </label>
          <div className="call-sheet__control">
            <CalendarEmbed onBooked={handleCalBooked} selectedLabel={calBookingLabel} />
            {touched.shootDate && sharedErrors.shootDate ? (
              <p className="call-sheet__error" id="cs-shoot-date-error" role="alert">
                {sharedErrors.shootDate}
              </p>
            ) : null}
            {shared.shootDate ? (
              <div className="call-sheet__method-toggle" role="radiogroup" aria-label="Time of day">
                <button
                  type="button"
                  role="radio"
                  aria-checked={shared.timeSlot === "morning"}
                  className={`call-sheet__method-btn${shared.timeSlot === "morning" ? " call-sheet__method-btn--active" : ""}`}
                  onClick={() => setSharedField("timeSlot", "morning")}
                >
                  Morning
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={shared.timeSlot === "evening"}
                  className={`call-sheet__method-btn${shared.timeSlot === "evening" ? " call-sheet__method-btn--active" : ""}`}
                  onClick={() => setSharedField("timeSlot", "evening")}
                >
                  Evening
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-turnaround">
            DELIVERY DATE
          </label>
          <div className="call-sheet__control">
            <select
              id="cs-turnaround"
              value={shared.turnaround}
              onChange={(e) => setSharedField("turnaround", e.target.value as Turnaround)}
            >
              <option value="standard">2-3 weeks from shoot date - Typical turnaround</option>
              <option value="rush">Sooner - Comes with a rush fee</option>
            </select>
          </div>
        </div>

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-notes">
            NOTES
          </label>
          <div className="call-sheet__control">
            <textarea
              id="cs-notes"
              rows={4}
              value={shared.notes}
              onChange={(e) => setSharedField("notes", e.target.value)}
              onBlur={() => blurShared("notes")}
            />
          </div>
        </div>

        {status === "failure" ? (
          <p className="call-sheet__failure" role="alert">
            {content.copy["failure.message"]}
          </p>
        ) : null}

        <div className="call-sheet__submit-row">
          <button
            type="submit"
            className="call-sheet__submit"
            disabled={status === "pending" || !shared.shootDate}
          >
            {status === "pending" ? content.copy["submit.pending"] : content.copy["submit.default"]}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---- Shared field row ----

interface SharedRowProps {
  field: SharedFieldName;
  label: string;
  type: "text" | "email" | "tel" | "date";
  value: string;
  error?: string;
  placeholder?: string;
  onChange: <K extends SharedFieldName>(field: K, value: SharedFieldValues[K]) => void;
  onBlur: (field: SharedFieldName) => void;
  autoComplete?: string;
}

function SharedRow({ field, label, type, value, error, placeholder, onChange, onBlur, autoComplete }: SharedRowProps) {
  const id = `cs-${field}`;
  const errorId = `${id}-error`;
  return (
    <div className="call-sheet__row">
      <label className="call-sheet__label mono" htmlFor={id}>
        {label}
      </label>
      <div className="call-sheet__control">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(field, e.target.value)}
          onBlur={() => onBlur(field)}
        />
        {error ? (
          <p className="call-sheet__error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---- Category-specific fields ----

interface CategoryFieldsSectionProps {
  category: CategoryKey;
  values: CategoryFieldState;
  setValues: React.Dispatch<React.SetStateAction<CategoryFieldState>>;
  touched: Partial<Record<string, boolean>>;
  onBlur: (field: string) => void;
}

function CategoryFieldsSection({ category, values, setValues, onBlur }: CategoryFieldsSectionProps) {
  if (category === "product") {
    const v = values.product;
    const set = (patch: Partial<ProductFields>) =>
      setValues((prev) => ({ ...prev, product: { ...prev.product, ...patch } }));
    return (
      <>
        <TextRow id="cs-business" label="BUSINESS" value={v.business} onChange={(val) => set({ business: val })} onBlur={() => onBlur("business")} />
        <TextRow id="cs-productCount" label="PRODUCT COUNT" value={v.productCount} onChange={(val) => set({ productCount: val })} onBlur={() => onBlur("productCount")} />
        <SelectRow
          id="cs-usage"
          label="USAGE"
          value={v.usage}
          onChange={(val) => set({ usage: val as ProductFields["usage"] })}
          onBlur={() => onBlur("usage")}
          options={["ecommerce listings", "social", "website", "advertising", "other"]}
        />
      </>
    );
  }

  if (category === "brand") {
    const v = values.brand;
    const set = (patch: Partial<BrandFields>) =>
      setValues((prev) => ({ ...prev, brand: { ...prev.brand, ...patch } }));
    return (
      <>
        <TextRow id="cs-business" label="BUSINESS" value={v.business} onChange={(val) => set({ business: val })} onBlur={() => onBlur("business")} />
        <SelectRow
          id="cs-deliverables"
          label="DELIVERABLES"
          value={v.deliverables}
          onChange={(val) => set({ deliverables: val as BrandFields["deliverables"] })}
          onBlur={() => onBlur("deliverables")}
          options={["social content", "campaign", "headshots", "other"]}
        />
        <SelectRow
          id="cs-shootLength"
          label="SHOOT LENGTH"
          value={v.shootLength}
          onChange={(val) => set({ shootLength: val as BrandFields["shootLength"] })}
          onBlur={() => onBlur("shootLength")}
          options={["1 hour", "2 hours", "half day"]}
        />
      </>
    );
  }

  if (category === "event") {
    const v = values.event;
    const set = (patch: Partial<EventFields>) =>
      setValues((prev) => ({ ...prev, event: { ...prev.event, ...patch } }));
    return (
      <>
        <TextRow id="cs-eventType" label="EVENT TYPE" value={v.eventType} onChange={(val) => set({ eventType: val })} onBlur={() => onBlur("eventType")} />
        <TextRow id="cs-duration" label="DURATION" value={v.duration} onChange={(val) => set({ duration: val })} onBlur={() => onBlur("duration")} />
        <TextRow id="cs-guestCount" label="GUEST COUNT" value={v.guestCount} onChange={(val) => set({ guestCount: val })} onBlur={() => onBlur("guestCount")} />
      </>
    );
  }

  // portrait
  const v = values.portrait;
  const set = (patch: Partial<PortraitFields>) =>
    setValues((prev) => ({ ...prev, portrait: { ...prev.portrait, ...patch } }));
  return (
    <>
      <TextRow
        id="cs-occasion"
        label="OCCASION"
        value={v.occasion}
        onChange={(val) => set({ occasion: val })}
        onBlur={() => onBlur("occasion")}
        placeholder="graduation, headshots, couples"
      />
      <TextRow id="cs-people" label="PEOPLE" type="number" value={v.people} onChange={(val) => set({ people: val })} onBlur={() => onBlur("people")} />
    </>
  );
}

interface TextRowProps {
  id: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function TextRow({ id, label, value, type = "text", placeholder, onChange, onBlur }: TextRowProps) {
  return (
    <div className="call-sheet__row">
      <label className="call-sheet__label mono" htmlFor={id}>
        {label}
      </label>
      <div className="call-sheet__control">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

interface SelectRowProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onBlur: () => void;
}

function SelectRow({ id, label, value, options, onChange, onBlur }: SelectRowProps) {
  return (
    <div className="call-sheet__row">
      <label className="call-sheet__label mono" htmlFor={id}>
        {label}
      </label>
      <div className="call-sheet__control">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
