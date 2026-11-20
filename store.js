// The pricing section on the home page: prices, Payment Links and the Founder count.

// ═══ STORE: every price and every Payment Link, in one place ═════════════════
//
// open:     false keeps the store closed. Every buy button then asks to join the
//           beta (by email) and the section says Glimmer Pro isn't on sale yet,
//           matching the app ("Glimmer Pro is not on sale yet, so every widget is
//           on for everyone"). Set it to true only once the links below exist and
//           the app's STORE_OPEN is true.
// prices:   shown on the page as written. They must match the prices set on the
//           Stripe Payment Links, and the key service's floors must be at or
//           below them (techniquest-keys user manual, section 4).
// links:    the Stripe Payment Links (https://buy.stripe.com/…), made as the
//           techniquest-keys user manual, section 5, says:
//             pro      the Advanced link       (tq_kind purchase, tq_tier advanced)
//             founder  the Founder link        (as Advanced, plus tq_offer founder)
//             renewal  the Advanced Renewal link (tq_kind renewal, tq_tier advanced,
//                      with the license_id custom field)
//           Each must redirect after payment to
//             https://glimmerwidgets.com/thanks.html?session_id={CHECKOUT_SESSION_ID}
//           A button whose link is empty asks to join the beta, even when open.
// service:  the license key service (techniquest-keys). The app uses the same
//           address (packages/core/src/licensing.ts, KEY_SERVICE). Its
//           ALLOWED_ORIGINS must include https://glimmerwidgets.com. thanks.html
//           names it too, in data-key-service.
// founderLimit: shown until the service says how many there are.
const STORE = {
  open: false,
  prices: {
    pro: '$29',
    founder: '$15',
    renewal: '$15',
  },
  links: {
    pro: '',
    founder: '',
    renewal: '',
  },
  service: 'https://keys.techniquestassociates.com',
  product: 'glimmer',
  founderLimit: 100,
};
// ═════════════════════════════════════════════════════════════════════════════

(() => {
  const params = new URLSearchParams(location.search);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  // Only a copy served from this computer may point at another service, for testing.
  const service = (local && params.get('service')) || STORE.service;

  const LABELS = {
    pro: () => `Buy Glimmer Pro · ${STORE.prices.pro}`,
    founder: () => `Buy at the Founder price · ${STORE.prices.founder}`,
    renewal: () => `Renew · ${STORE.prices.renewal}`,
  };

  const isLink = (url) => typeof url === 'string' && /^https:\/\/\S+$/.test(url);
  const selling = STORE.open && isLink(STORE.links.pro);

  for (const el of document.querySelectorAll('[data-price]')) {
    const price = STORE.prices[el.dataset.price];
    if (price) el.textContent = price;
  }
  for (const el of document.querySelectorAll('[data-founder-limit]')) el.textContent = String(STORE.founderLimit);

  const closed = document.getElementById('store-closed');
  if (closed) closed.hidden = selling;

  // A button goes to Stripe only while the store is open and its link is set;
  // otherwise it keeps the beta mailto it was written with.
  const buttons = {};
  for (const button of document.querySelectorAll('[data-buy]')) {
    const which = button.dataset.buy;
    buttons[which] = button;
    if (STORE.open && isLink(STORE.links[which])) {
      button.href = STORE.links[which];
      button.textContent = LABELS[which]();
    }
  }

  // How many Founder places are left. If the service can't be reached, no count
  // is shown and the button stays as it is; the service holds any purchase past
  // the limit anyway.
  const left = document.getElementById('founder-left');
  const founder = buttons.founder;
  if (!left) return;
  fetch(`${service}/v1/offers?product=${encodeURIComponent(STORE.product)}`, { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => {
      const offer = body && body.founder;
      if (!offer || !Number.isInteger(offer.left) || !Number.isInteger(offer.limit) || offer.limit < 0) return;
      for (const el of document.querySelectorAll('[data-founder-limit]')) el.textContent = String(offer.limit);
      if (offer.left > 0) {
        left.textContent = `${offer.left} of ${offer.limit} left`;
      } else {
        left.textContent = 'Sold out';
        left.classList.add('sold-out');
        if (founder) {
          founder.removeAttribute('href');
          founder.setAttribute('role', 'link');
          founder.setAttribute('aria-disabled', 'true');
          founder.classList.add('disabled');
          founder.textContent = 'Sold out';
        }
      }
      left.hidden = false;
    })
    .catch(() => {});
})();
