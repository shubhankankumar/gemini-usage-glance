const USAGE_URL = "https://gemini.google.com/usage";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_USAGE") return;
  getUsage().then(sendResponse, (err) => sendResponse({ error: err.message }));
  return true;
});

async function getUsage() {
  const [existing] = await chrome.tabs.query({ url: USAGE_URL + "*" });
  if (existing) return extract(existing.id);

  const tab = await chrome.tabs.create({ url: USAGE_URL, active: false });
  try {
    await waitForLoad(tab.id, 15000);
    return await extract(tab.id);
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

function waitForLoad(tabId, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error("Timed out loading usage page")), ms);
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === "complete") done();
    };
    function done(err) {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      err ? reject(err) : resolve();
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
    // the tab may have finished loading before the listener was attached
    chrome.tabs.get(tabId).then((t) => t.status === "complete" && done(), () => {});
  });
}

async function extract(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: scrapeUsage });
  return result || { error: "No result from page" };
}

// Runs inside the page: serialized by executeScript, so it must be self-contained.
function scrapeUsage() {
  function pctNear(text, keywords) {
    const kw = keywords.join("|");
    const m = text.match(new RegExp("(?:" + kw + ")[\\s\\S]{0,80}?(\\d{1,3})\\s*%", "i"))
      || text.match(new RegExp("(\\d{1,3})\\s*%[\\s\\S]{0,80}?(?:" + kw + ")", "i"));
    return m ? m[1] + "%" : null;
  }

  function read() {
    const text = document.body.innerText;
    const current = pctNear(text, ["current usage", "resets every 5", "resets in about", "5-hour", "5 hour"]);
    const weekly = pctNear(text, ["weekly limit", "resets weekly", "weekly"]);
    if (current && weekly) return { current, weekly };

    // shortcut: assumes the last two % on the page are 5-hour then weekly; revisit if Gemini's layout changes.
    const all = [...text.matchAll(/\b(\d{1,3})\s*%/g)].map((m) => m[1] + "%");
    return all.length >= 2 ? { current: all.at(-2), weekly: all.at(-1) } : null;
  }

  return new Promise((resolve) => {
    const first = read();
    if (first) return resolve(first);

    const observer = new MutationObserver(() => {
      const found = read();
      if (found) finish(found);
    });
    const timer = setTimeout(() => finish(read() || { error: "Usage data not found" }), 10000);
    function finish(r) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(r);
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}
