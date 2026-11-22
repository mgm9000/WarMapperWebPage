/* Entitlements: what a visitor may do. STUB: everyone is "free" and everything is allowed.
   When accounts exist (see PRD, "Accounts, subscriptions and pricing"), only this file changes:
   it will read the plan from WMAuth.getUser() or from a server answer, and callers keep asking the same questions. */
window.WMEntitlements = (function () {
  const PLANS = { /* placeholders; prices and limits are undecided (PRD open questions) */
    free: { label: "Free" }, pro: { label: "Subscriber" }, institution: { label: "Institution" },
    publisher: { label: "Publisher" }, api: { label: "API" },
  };
  function plan() { const u = window.WMAuth && WMAuth.getUser(); return (u && u.plan) || "free"; }
  /* feature: "open-map" | "download" | "api" ...; ctx: e.g. {id: "gettysburg"} */
  function can(feature, ctx) { return { allowed: true, plan: plan(), upgrade: null }; }
  return { PLANS, plan, can };
})();
