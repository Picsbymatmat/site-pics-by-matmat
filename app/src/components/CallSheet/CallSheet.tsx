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
} from "../../types";
import "./CallSheet.css";

// ---- Shared field state ----

interface SharedFieldValues {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  altDate: string;
  location: string;
  details: string;
}

const EMPTY_SHARED: SharedFieldValues = {
  name: "",
  email: "",
  phone: "",
  preferredDate: "",
  altDate: "",
  location: "",
  details: "",
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
  event: { eventType: "", eventDate: "", duration: "", guestCount: "" },
  portrait: { occasion: "", people: "" },
};

type SharedFieldName = keyof SharedFieldValues;

const SHARED_REQUIRED: SharedFieldName[] = ["name", "email", "phone", "preferredDate"];

type SubmitStatus = "idle" | "pending" | "failure";

// Paused for testing convenience per client feedback: required-field and
// format errors still compute and display normally (on blur, as usual),
// but no longer block submission — only a chosen category does, since the
// payload is meaningless without one. Flip back to true before launch.
const BLOCK_SUBMIT_ON_VALIDATION_ERRORS = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sharedFieldError(field: SharedFieldName, value: string): string | null {
  const trimmed = value.trim();
  switch (field) {
    case "name":
      return trimmed ? null : "Add your name so Matt knows who's booking.";
    case "email":
      if (!trimmed) return "Add an email so Matt can reach you.";
      if (!EMAIL_RE.test(trimmed)) return "That email doesn't look right — check it and try again.";
      return null;
    case "phone":
      return trimmed ? null : "Add a phone number so Matt can text you.";
    case "preferredDate":
      return trimmed ? null : "Pick a preferred date so Matt knows when you're hoping to shoot.";
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

  const categoryMeta = category ? CATEGORY_BY_SLUG[CATEGORIES.find((c) => c.key === category)!.slug] : null;

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

  const setSharedField = useCallback((field: SharedFieldName, value: string) => {
    setShared((prev) => ({ ...prev, [field]: value }));
  }, []);

  const blurShared = useCallback((field: SharedFieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const blurCategoryField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [`cat.${field}`]: true }));
  }, []);

  const sharedErrors = useMemo(() => {
    const errors: Partial<Record<SharedFieldName, string>> = {};
    for (const field of SHARED_REQUIRED) {
      const err = sharedFieldError(field, shared[field]);
      if (err) errors[field] = err;
    }
    return errors;
  }, [shared]);

  const categoryError = !category ? "Choose a shoot type so Matt knows what you're booking." : null;

  const isValid = useMemo(() => {
    if (categoryError) return false;
    return SHARED_REQUIRED.every((field) => !sharedFieldError(field, shared[field]));
  }, [categoryError, shared]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark everything touched so errors surface on a submit attempt too.
    setTouched((prev) => ({
      ...prev,
      category: true,
      name: true,
      email: true,
      phone: true,
      preferredDate: true,
    }));

    if (!category || (BLOCK_SUBMIT_ON_VALIDATION_ERRORS && !isValid)) return;

    const webhookUrl = import.meta.env.VITE_BOOKING_WEBHOOK_URL as string | undefined;

    const payload: BookingPayload = {
      category,
      name: shared.name.trim(),
      email: shared.email.trim(),
      phone: shared.phone.trim(),
      preferredDate: shared.preferredDate,
      altDate: shared.altDate ? shared.altDate : null,
      location: shared.location.trim() ? shared.location.trim() : null,
      details: shared.details.trim() ? shared.details.trim() : null,
      categoryFields: { ...categoryFields[category] },
      submittedAt: new Date().toISOString(),
      source: "picsbymatmat-booking",
    };

    setStatus("pending");
    try {
      if (!webhookUrl) throw new Error("Missing VITE_BOOKING_WEBHOOK_URL");
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      setStatus("idle");
      setSuccess(true);
      onSuccess(payload);
    } catch {
      setStatus("failure");
    }
  }

  const presetHeading = categoryMeta
    ? content.copy["callsheet.presetHeading"].replace("{category}", categoryMeta.label)
    : null;

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

      {presetHeading ? (
        <h2 className="call-sheet__preset-heading">{presetHeading}</h2>
      ) : null}

      <form className="call-sheet__form" onSubmit={handleSubmit} noValidate>
        {!presetCategory ? (
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
        ) : null}

        <SharedRow
          field="name"
          label="SUBJECT"
          type="text"
          value={shared.name}
          error={touched.name ? sharedErrors.name : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          autoComplete="name"
        />
        <SharedRow
          field="email"
          label="EMAIL"
          type="email"
          value={shared.email}
          error={touched.email ? sharedErrors.email : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          autoComplete="email"
        />
        <SharedRow
          field="phone"
          label="PHONE"
          type="tel"
          value={shared.phone}
          error={touched.phone ? sharedErrors.phone : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
          autoComplete="tel"
        />
        <SharedRow
          field="preferredDate"
          label="PREFERRED DATE"
          type="date"
          value={shared.preferredDate}
          error={touched.preferredDate ? sharedErrors.preferredDate : undefined}
          onChange={setSharedField}
          onBlur={blurShared}
        />
        <SharedRow
          field="altDate"
          label="ALTERNATE DATE"
          type="date"
          value={shared.altDate}
          onChange={setSharedField}
          onBlur={blurShared}
        />
        <div className="call-sheet__calendar">
          <h3 className="call-sheet__calendar-heading">{content.copy["calendar.heading"]}</h3>
          <CalendarEmbed />
        </div>

        <SharedRow
          field="location"
          label="LOCATION"
          type="text"
          value={shared.location}
          onChange={setSharedField}
          onBlur={blurShared}
        />

        {category ? (
          <CategoryFieldsSection
            category={category}
            values={categoryFields}
            setValues={setCategoryFields}
            touched={touched}
            onBlur={blurCategoryField}
          />
        ) : null}

        <div className="call-sheet__row">
          <label className="call-sheet__label mono" htmlFor="cs-notes">
            NOTES
          </label>
          <div className="call-sheet__control">
            <textarea
              id="cs-notes"
              rows={4}
              value={shared.details}
              onChange={(e) => setSharedField("details", e.target.value)}
              onBlur={() => blurShared("details")}
            />
          </div>
        </div>

        {status === "failure" ? (
          <p className="call-sheet__failure" role="alert">
            {content.copy["failure.message"]}
          </p>
        ) : null}

        <div className="call-sheet__submit-row">
          <button type="submit" className="call-sheet__submit" disabled={status === "pending"}>
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
  onChange: (field: SharedFieldName, value: string) => void;
  onBlur: (field: SharedFieldName) => void;
  autoComplete?: string;
}

function SharedRow({ field, label, type, value, error, onChange, onBlur, autoComplete }: SharedRowProps) {
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
        <TextRow id="cs-eventDate" label="EVENT DATE" type="date" value={v.eventDate} onChange={(val) => set({ eventDate: val })} onBlur={() => onBlur("eventDate")} />
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
