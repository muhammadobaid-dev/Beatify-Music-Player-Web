/**
 * Premium subscription + demo payment (UPI / Card / Wallet).
 * Persists plan & earnings in localStorage for creator demo.
 */
window.BeatifyPay = (function () {
  const KEY = 'beatify_subscription';
  const EARN_KEY = 'beatify_earnings';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null') || {
        plan: 'free',
        name: '',
        since: null,
      };
    } catch {
      return { plan: 'free', name: '', since: null };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getEarnings() {
    try {
      return JSON.parse(localStorage.getItem(EARN_KEY) || 'null') || {
        total: 0,
        subscribers: 0,
        history: [],
      };
    } catch {
      return { total: 0, subscribers: 0, history: [] };
    }
  }

  function saveEarnings(e) {
    localStorage.setItem(EARN_KEY, JSON.stringify(e));
  }

  function isPremium() {
    const s = load();
    return s.plan === 'premium' || s.plan === 'family';
  }

  function getPlan() {
    return load().plan;
  }

  function processPayment({ plan, price, name, method }) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sub = {
          plan,
          name: name || 'Member',
          since: new Date().toISOString(),
          method,
          price: Number(price),
        };
        save(sub);

        const earn = getEarnings();
        earn.total += Number(price);
        earn.subscribers += 1;
        earn.history.unshift({
          plan,
          price: Number(price),
          at: sub.since,
          name: sub.name,
        });
        saveEarnings(earn);

        resolve(sub);
      }, 1200);
    });
  }

  return { load, isPremium, getPlan, processPayment, getEarnings };
})();
