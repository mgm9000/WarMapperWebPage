/* Accounts: login, sessions, subscription state. STUB: nobody is signed in and nothing is sent anywhere.
   The rest of the site only talks to this object (getUser, onChange, loginUrl), so a real provider can replace
   the body without touching the pages. Routes reserved: login.html, account.html, pricing.html. */
window.WMAuth = (function () {
  let user = null; const listeners = [];
  const api = {
    getUser() { return user; },
    onChange(fn) { listeners.push(fn); },
    loginUrl() { return "login.html"; },
    accountUrl() { return "account.html"; },
    pricingUrl() { return "pricing.html"; },
  };
  function renderSlot() {
    const slot = document.getElementById("account-slot"); if (!slot) return;
    slot.textContent = "";
    const a = document.createElement("a");
    if (user) { a.href = api.accountUrl(); a.textContent = "Account"; } else { a.href = api.loginUrl(); a.textContent = "Log in"; }
    slot.append(a);
  }
  document.addEventListener("DOMContentLoaded", renderSlot);
  if (document.readyState !== "loading") renderSlot();
  api.onChange(renderSlot);
  return api;
})();
