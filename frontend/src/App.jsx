import { useEffect, useMemo, useState } from "react";

const interestOptions = [
  "Food & cafes",
  "Art & culture",
  "Nature",
  "Architecture",
  "Nightlife",
  "Slow travel",
];

const destinationIdeas = [
  { name: "Kyoto, Japan", origin: "Tokyo, Japan" },
  { name: "Lisbon, Portugal", origin: "London, United Kingdom" },
  { name: "Bali, Indonesia", origin: "Singapore" },
];
const API_BASE = import.meta.env.VITE_API_URL || "";

function localDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createInitialForm() {
  return {
    origin: "",
    destination: "",
    departure_date: localDateOffset(30),
    return_date: localDateOffset(36),
    travelers: 2,
    budget: 3500,
    currency: "USD",
    travel_style: "balanced",
    interests: ["Food & cafes", "Art & culture"],
    origin_iata: "",
    destination_iata: "",
  };
}

function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toLocaleString()}`;
  }
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(`${value}T12:00:00`),
  );
}

function formatFlightTime(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function buildShareText(plan) {
  const itinerary = plan.days
    .map(
      (day) =>
        `Day ${day.day} · ${formatDate(day.date)} · ${day.title}\n${day.activities
          .map((activity) => `  - ${activity}`)
          .join("\n")}`,
    )
    .join("\n\n");
  return `${plan.destination} · ${plan.days.length} days\n\n${plan.summary}\n\n${itinerary}\n\nTrip budget: ${formatCurrency(plan.total_estimated_cost, plan.currency)}\n\nMade with Roam`;
}

function Icon({ name, size = 18, className = "" }) {
  const paths = {
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.7 8.3-2.2 5.2-5.2 2.2 2.2-5.2 5.2-2.2Z" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    sparkles: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7" />
        <path d="m21 3-9 9" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    check: <path d="m5 12 4 4L19 6" />,
    plane: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [form, setForm] = useState(createInitialForm);
  const [plan, setPlan] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [flightFieldsOpen, setFlightFieldsOpen] = useState(false);
  const tripLength = useMemo(() => {
    if (!form.departure_date || !form.return_date) return 0;
    const start = new Date(`${form.departure_date}T12:00:00`);
    const end = new Date(`${form.return_date}T12:00:00`);
    return Math.max(0, Math.round((end - start) / 86_400_000) + 1);
  }, [form.departure_date, form.return_date]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("roam:saved-trips") || "[]",
      );
      if (Array.isArray(saved)) setSavedTrips(saved);
    } catch (storageError) {
      if (storageError instanceof SyntaxError) {
        window.localStorage.removeItem("roam:saved-trips");
      } else {
        setError("Saved trips are unavailable in this browser.");
      }
    }
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleInterest(interest) {
    setForm((current) => {
      const selected = current.interests.includes(interest);
      if (selected) {
        return {
          ...current,
          interests: current.interests.filter((item) => item !== interest),
        };
      }
      if (current.interests.length >= 8) return current;
      return { ...current, interests: [...current.interests, interest] };
    });
  }

  async function createPlan(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setPlan(null);

    try {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          travelers: Number(form.travelers),
          budget: Number(form.budget),
          origin_iata: form.origin_iata || null,
          destination_iata: form.destination_iata || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail =
          typeof result.detail === "string"
            ? result.detail
            : "Please check your trip details and try again.";
        throw new Error(detail);
      }
      setPlan(result);
      window.setTimeout(
        () => document.getElementById("itinerary")?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "Could not reach the planner. Check that the API is running, then try again."
          : requestError.message,
      );
    } finally {
      setLoading(false);
    }
  }

  function persistTrips(trips) {
    try {
      window.localStorage.setItem("roam:saved-trips", JSON.stringify(trips));
      setSavedTrips(trips);
      return true;
    } catch {
      setError("Could not save your trip. Check your browser's available storage.");
      return false;
    }
  }

  function savePlan() {
    if (!plan) return;
    const saved = {
      id: `${Date.now()}`,
      label: `${plan.destination} · ${plan.days.length} days`,
      form: { ...form },
      plan,
    };
    const updated = [
      saved,
      ...savedTrips.filter(
        (trip) =>
          trip.plan.destination !== plan.destination ||
          trip.plan.departure_date !== plan.departure_date,
      ),
    ].slice(0, 8);
    if (persistTrips(updated)) setNotice("Trip saved on this device.");
  }

  function loadSavedTrip(trip) {
    setForm(trip.form);
    setPlan(trip.plan);
    setError("");
    setNotice(`Opened ${trip.plan.destination}.`);
    window.setTimeout(
      () => document.getElementById("itinerary")?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
  }

  function deleteSavedTrip(id) {
    persistTrips(savedTrips.filter((trip) => trip.id !== id));
  }

  async function sharePlan() {
    if (!plan) return;
    const text = buildShareText(plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${plan.destination} · Roam`, text });
        setNotice("Your trip is ready to share.");
      } else {
        await navigator.clipboard.writeText(text);
        setNotice("Itinerary copied to your clipboard.");
      }
    } catch (shareError) {
      if (shareError.name !== "AbortError") {
        setError("Could not share your trip. Try copying it from a secure browser tab.");
      }
    }
  }

  function tryDestination(idea) {
    setForm((current) => ({
      ...current,
      origin: idea.origin,
      destination: idea.name,
    }));
    document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
  }

  const mapUrl = plan
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(plan.destination)}`
    : "";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Roam home">
          <span className="brand-mark">
            <Icon name="compass" size={22} />
          </span>
          <span>roam<span className="brand-period">.</span></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#planner">Plan a trip</a>
          <a href="#saved">Saved trips{savedTrips.length > 0 && ` (${savedTrips.length})`}</a>
        </nav>
        <a className="nav-cta" href="#planner">
          Start planning <Icon name="arrow" size={16} />
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" />
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow">
              <span className="eyebrow-dot" /> A little more you, a lot more world
            </span>
            <h1 id="hero-title">
              Make room for
              <br />
              somewhere <em>new.</em>
            </h1>
            <p>
              Less time in tabs. More time imagining the good stuff.
              Your next favorite trip starts right here.
            </p>
            <a className="button button-light" href="#planner">
              Plan your escape <Icon name="arrow" size={17} />
            </a>
          </div>
          <div className="hero-note">
            <span className="hero-note-icon"><Icon name="sparkles" size={17} /></span>
            <span><strong>Thoughtfully planned</strong><small>Made around how you love to travel</small></span>
          </div>
          <div className="hero-image-credit">Somewhere worth slowing down for</div>
          <a className="hero-scroll" href="#planner" aria-label="Scroll to trip planner">
            <span />
          </a>
        </section>

        <section className="intro-row" id="how-it-works">
          <div>
            <span className="eyebrow">Good trips start with a feeling</span>
            <h2>Tell us what you’re <em>looking for.</em></h2>
          </div>
          <p>
            A weekend wandering through old streets? A week of fresh air and
            unhurried mornings? Give us the details. We’ll help with the rest.
          </p>
        </section>

        <section className="planner-layout" id="planner">
          <div className="planner-card">
            <div className="form-heading">
              <div>
                <span className="eyebrow">Your next chapter</span>
                <h2>Plan a trip</h2>
              </div>
              <span className="step-count">01 <span>/</span> 01</span>
            </div>

            <form onSubmit={createPlan}>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Leaving from</span>
                  <span className="input-wrap">
                    <Icon name="pin" size={17} />
                    <input
                      name="origin"
                      value={form.origin}
                      onChange={updateField}
                      placeholder="Your city"
                      minLength="2"
                      maxLength="100"
                      autoComplete="address-level2"
                      required
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Where to?</span>
                  <span className="input-wrap">
                    <Icon name="pin" size={17} />
                    <input
                      name="destination"
                      value={form.destination}
                      onChange={updateField}
                      placeholder="A place on your mind"
                      minLength="2"
                      maxLength="100"
                      required
                    />
                  </span>
                </label>
              </div>

              <div className="field-row three-fields">
                <label className="field">
                  <span className="field-label">Going</span>
                  <span className="input-wrap">
                    <Icon name="calendar" size={17} />
                    <input
                      name="departure_date"
                      type="date"
                      value={form.departure_date}
                      onChange={updateField}
                      required
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Coming back</span>
                  <span className="input-wrap">
                    <Icon name="calendar" size={17} />
                    <input
                      name="return_date"
                      type="date"
                      value={form.return_date}
                      min={form.departure_date}
                      onChange={updateField}
                      required
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Travelers</span>
                  <span className="input-wrap">
                    <Icon name="people" size={17} />
                    <select name="travelers" value={form.travelers} onChange={updateField}>
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>
                          {count} {count === 1 ? "person" : "people"}
                        </option>
                      ))}
                      <option value="12">12 people</option>
                      <option value="16">16 people</option>
                      <option value="20">20 people</option>
                    </select>
                  </span>
                </label>
              </div>

              <div className="form-divider" />

              <div className="field-row budget-row">
                <label className="field">
                  <span className="field-label">Total trip budget</span>
                  <span className="input-wrap">
                    <span className="currency-prefix">{form.currency}</span>
                    <input
                      name="budget"
                      type="number"
                      value={form.budget}
                      onChange={updateField}
                      min="1"
                      max="100000000"
                      step="1"
                      required
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Currency</span>
                  <span className="input-wrap select-wrap">
                    <select name="currency" value={form.currency} onChange={updateField}>
                      {["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"].map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Your kind of trip</span>
                  <span className="input-wrap select-wrap">
                    <select name="travel_style" value={form.travel_style} onChange={updateField}>
                      <option value="balanced">A bit of everything</option>
                      <option value="relaxed">Slow & easy</option>
                      <option value="adventurous">Out there & active</option>
                      <option value="culture">Culture curious</option>
                      <option value="food">Here for the food</option>
                    </select>
                  </span>
                </label>
              </div>

              <fieldset className="interests-field">
                <legend>What are you into? <span>Pick as many as you like</span></legend>
                <div className="interest-list">
                  {interestOptions.map((interest) => {
                    const checked = form.interests.includes(interest);
                    return (
                      <button
                        className={`interest-chip${checked ? " selected" : ""}`}
                        key={interest}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleInterest(interest)}
                      >
                        {checked && <Icon name="check" size={14} />}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="button"
                className="flight-toggle"
                aria-expanded={flightFieldsOpen}
                onClick={() => setFlightFieldsOpen((open) => !open)}
              >
                <Icon name="plane" size={16} />
                {flightFieldsOpen ? "Hide flight lookup" : "Add airport codes for flight lookup"}
                <span>{flightFieldsOpen ? "−" : "+"}</span>
              </button>
              {flightFieldsOpen && (
                <div className="field-row airport-row">
                  <label className="field">
                    <span className="field-label">Leaving airport · IATA</span>
                    <span className="input-wrap">
                      <input
                        name="origin_iata"
                        value={form.origin_iata}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            origin_iata: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="JFK"
                        maxLength="3"
                        pattern="[A-Za-z]{3}"
                        aria-describedby="airport-help"
                      />
                    </span>
                  </label>
                  <label className="field">
                    <span className="field-label">Arrival airport · IATA</span>
                    <span className="input-wrap">
                      <input
                        name="destination_iata"
                        value={form.destination_iata}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            destination_iata: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="HND"
                        maxLength="3"
                        pattern="[A-Za-z]{3}"
                        aria-describedby="airport-help"
                      />
                    </span>
                  </label>
                  <p className="field-help" id="airport-help">
                    Optional · enter 3-letter codes (like JFK or HND). A flight data API key is needed.
                  </p>
                </div>
              )}

              <div className="submit-row">
                <div className="trip-duration">
                  <Icon name="calendar" size={16} />
                  <span>{tripLength} {tripLength === 1 ? "day" : "days"} away</span>
                </div>
                <button className="button button-primary submit-button" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner" /> Putting it together…
                    </>
                  ) : (
                    <>
                      Build my itinerary <Icon name="arrow" size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <aside className="planner-aside">
            <span className="aside-kicker"><Icon name="sparkles" size={15} /> A note from Roam</span>
            <h3>The best trips leave a little room for the unexpected.</h3>
            <p>
              Roam gives you a thoughtful starting point—not a minute-by-minute
              schedule. Keep what feels right, change what doesn’t.
            </p>
            <div className="aside-rule" />
            <p className="aside-small">Need a little inspiration?</p>
            <div className="destination-ideas">
              {destinationIdeas.map((idea) => (
                <button
                  type="button"
                  className="destination-idea"
                  key={idea.name}
                  onClick={() => tryDestination(idea)}
                >
                  <span><Icon name="pin" size={15} /> {idea.name}</span>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
            <div className="aside-stamp" aria-hidden="true">
              <span>GO</span>
              <Icon name="compass" size={31} />
              <span>WANDER</span>
            </div>
          </aside>
        </section>

        {error && (
          <div className="feedback-message error-message" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setError("")}>
              <Icon name="close" size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div className="feedback-message notice-message" role="status">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
              <Icon name="close" size={17} />
            </button>
          </div>
        )}

        {plan && (
          <section className="results-section" id="itinerary" aria-live="polite">
            <div className="results-heading">
              <div>
                <span className="eyebrow"><span className="eyebrow-dot" /> YOUR TRIP, TAKING SHAPE</span>
                <h2>A good kind of <em>getaway.</em></h2>
              </div>
              <div className="results-actions">
                <button className="button button-outline" type="button" onClick={savePlan}>
                  <Icon name="heart" size={16} /> Save
                </button>
                <button className="button button-outline" type="button" onClick={sharePlan}>
                  <Icon name="copy" size={16} /> Share
                </button>
                <button className="button button-primary print-button" type="button" onClick={() => window.print()}>
                  Print plan
                </button>
              </div>
            </div>

            <div className="trip-overview">
              <div className="overview-copy">
                <div className="route-line">
                  <span>{plan.origin}</span>
                  <Icon name="arrow" size={18} />
                  <strong>{plan.destination}</strong>
                </div>
                <p>{plan.summary}</p>
                <div className="overview-meta">
                  <span><Icon name="calendar" size={15} /> {formatDate(plan.departure_date, { month: "short", day: "numeric" })} – {formatDate(plan.return_date, { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span><Icon name="people" size={15} /> {plan.travelers} {plan.travelers === 1 ? "traveler" : "travelers"}</span>
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    <Icon name="pin" size={15} /> Explore the map <Icon name="external" size={13} />
                  </a>
                </div>
              </div>
              <div className="overview-budget">
                <span className="budget-label">YOUR TRIP BUDGET</span>
                <strong>{formatCurrency(plan.total_estimated_cost, plan.currency)}</strong>
                <small>planned across {plan.days.length} days</small>
              </div>
            </div>

            {plan.warnings.length > 0 && (
              <div className="integration-notice">
                <Icon name="sparkles" size={17} />
                <div>
                  <strong>Want the full picture?</strong>
                  {plan.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              </div>
            )}

            <div className="results-grid">
              <div className="itinerary-column">
                <div className="section-title-row">
                  <div>
                    <span className="eyebrow">A little structure, lots of possibility</span>
                    <h3>Your day-by-day</h3>
                  </div>
                  <span className={`generator-badge ${plan.generated_by === "ai" ? "ai-badge" : ""}`}>
                    <Icon name="sparkles" size={14} />
                    {plan.generated_by === "ai" ? "Made with AI" : "Starter itinerary"}
                  </span>
                </div>
                <div className="day-list">
                  {plan.days.map((day) => (
                    <article className="day-card" key={day.day}>
                      <div className="day-marker">
                        <span>DAY</span>
                        <strong>{String(day.day).padStart(2, "0")}</strong>
                      </div>
                      <div className="day-content">
                        <div className="day-date">{formatDate(day.date, { weekday: "long", month: "long", day: "numeric" })}</div>
                        <h4>{day.title}</h4>
                        <p>{day.description}</p>
                        <ul>
                          {day.activities.map((activity, index) => (
                            <li key={`${day.day}-${index}`}>
                              <span className="activity-dot" /> {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="tips-card">
                  <div className="tips-icon"><Icon name="sparkles" size={19} /></div>
                  <div>
                    <span className="eyebrow">A few things to keep in mind</span>
                    <h3>Little tips, smoother travels.</h3>
                    <ul>{plan.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                  </div>
                </div>
              </div>

              <aside className="details-column">
                <section className="detail-card budget-card">
                  <span className="eyebrow">A plan for your spending</span>
                  <h3>Budget breakdown</h3>
                  <p className="detail-caption">A starting point for your total trip budget. Adjust as you go.</p>
                  <div className="budget-bars">
                    {Object.entries(plan.budget_breakdown).map(([category, amount], index) => {
                      const percentage = Math.round((amount / plan.total_estimated_cost) * 100);
                      return (
                        <div className="budget-item" key={category}>
                          <div className="budget-item-heading">
                            <span>{category}</span>
                            <span>{formatCurrency(amount, plan.currency)}</span>
                          </div>
                          <div className="budget-track">
                            <span className={`budget-fill fill-${index}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="budget-total">
                    <span>Total planned</span><strong>{formatCurrency(plan.total_estimated_cost, plan.currency)}</strong>
                  </div>
                  <p className="budget-disclaimer">A flexible guide—not a quote. Flights and actual prices can vary.</p>
                </section>

                {plan.flights.length > 0 && (
                  <section className="detail-card flights-card">
                    <span className="eyebrow">On your way</span>
                    <h3>Flight options</h3>
                    {plan.flights.map((flight) => (
                      <div className="flight-option" key={`${flight.flight_number}-${flight.departure_time}`}>
                        <div className="flight-option-heading">
                          <strong>{flight.airline}</strong><span>{flight.flight_number}</span>
                        </div>
                        <p>{flight.departure_airport} → {flight.arrival_airport}</p>
                        <small>{formatFlightTime(flight.departure_time)} · {flight.status}</small>
                      </div>
                    ))}
                    <p className="budget-disclaimer">Check with the airline before booking; schedules can change.</p>
                  </section>
                )}

                <section className="detail-card research-card">
                  <span className="eyebrow">Worth a closer look</span>
                  <h3>Travel notes</h3>
                  {plan.sources.length > 0 ? (
                    <div className="source-list">
                      {plan.sources.map((source) => (
                        <a
                          className="source-link"
                          href={source.url}
                          key={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{source.title}</span>
                          <Icon name="external" size={14} />
                          {source.snippet && <small>{source.snippet}</small>}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="detail-caption">Add a Tavily API key to bring current destination research into your plans.</p>
                  )}
                </section>
              </aside>
            </div>
          </section>
        )}

        <section className="saved-section" id="saved">
          <div className="saved-heading">
            <div>
              <span className="eyebrow">Your little travel journal</span>
              <h2>Keep the ones you <em>love.</em></h2>
            </div>
            <span className="saved-count">{savedTrips.length} / 8 saved</span>
          </div>
          {savedTrips.length > 0 ? (
            <div className="saved-grid">
              {savedTrips.map((trip) => (
                <article className="saved-trip" key={trip.id}>
                  <div className="saved-trip-top">
                    <span className="saved-icon"><Icon name="pin" size={18} /></span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${trip.plan.destination} from saved trips`}
                      onClick={() => deleteSavedTrip(trip.id)}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </div>
                  <h3>{trip.plan.destination}</h3>
                  <p>{formatDate(trip.plan.departure_date)} – {formatDate(trip.plan.return_date)} · {trip.plan.days.length} days</p>
                  <button type="button" className="saved-open" onClick={() => loadSavedTrip(trip)}>
                    Open this trip <Icon name="arrow" size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="saved-empty">
              <span className="saved-empty-icon"><Icon name="heart" size={22} /></span>
              <div>
                <strong>No trips saved just yet.</strong>
                <p>When you find a plan you love, save it here for later. It stays on this device.</p>
              </div>
              <a href="#planner" className="text-link">Dream something up <Icon name="arrow" size={15} /></a>
            </div>
          )}
        </section>

        <section className="closing-cta">
          <span className="eyebrow">There’s a whole world out there</span>
          <h2>So, where to <em>next?</em></h2>
          <a className="button button-light" href="#planner">
            Let’s figure it out <Icon name="arrow" size={17} />
          </a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark"><Icon name="compass" size={20} /></span>
          <span>roam<span className="brand-period">.</span></span>
        </a>
        <p>Thoughtful trips. More room to wander.</p>
        <span className="footer-small">Your plans stay yours. Saved only on this device.</span>
      </footer>
    </div>
  );
}

export default App;
