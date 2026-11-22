/* Shared page shell: header, navigation and the account slot. One place to edit the nav for every page. */
(function () {
  const NAV = [
    ["About WarMapper", "about.html"],
    ["Search a WarMap", "search.html"],
    ["For institutions", "institutions.html"],
    ["For publishers", "publishers.html"],
  ];
  const BYLINE = "A military history map study guide for service members. Follow the wars of every age, then watch the battles unfold.";
  const here = location.pathname.split("/").pop() || "index.html";
  const host = document.getElementById("shell-header");
  if (!host) return;
  const header = document.createElement("header");
  header.className = "top";
  const brand = document.createElement("a");
  brand.className = "brand"; brand.href = "index.html"; brand.setAttribute("aria-label", "WarMapper home");
  const b = document.createElement("b"); b.textContent = "WarMapper";
  const s = document.createElement("span"); s.textContent = BYLINE;
  brand.append(b, s);
  const burger = document.createElement("button");
  burger.className = "burger"; burger.setAttribute("aria-label", "Menu"); burger.setAttribute("aria-expanded", "false");
  burger.append(document.createElement("i"));
  const nav = document.createElement("nav");
  nav.className = "nav"; nav.id = "site-nav"; nav.setAttribute("aria-label", "Main");
  for (const [label, href] of NAV) {
    const a = document.createElement("a");
    a.className = "link"; a.href = href; a.textContent = label;
    if (here === href) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  const slot = document.createElement("div");
  slot.id = "account-slot"; /* reserved: filled by js/auth.js (log in / account) */
  nav.append(slot);
  burger.addEventListener("click", () => {
    const o = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", String(o));
  });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
  header.append(brand, burger, nav);
  host.replaceWith(header);
  window.WMShell = { BYLINE, NAV };
})();
