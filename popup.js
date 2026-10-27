const USAGE_URL = "https://gemini.google.com/usage";
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const statusText = statusEl.querySelector(".status-text");
const rows = [
  { key: "current", value: $("current"), bar: $("progress-current") },
  { key: "weekly", value: $("weekly"), bar: $("progress-weekly") },
];

function setStatus(text, type) {
  statusText.textContent = text;
  statusEl.className = type;
}

async function loadUsage() {
  setStatus("Fetching...", "loading");
  for (const r of rows) {
    r.value.textContent = "--";
    r.bar.style.width = "0%";
  }

  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_USAGE" });
    if (!res || res.error) throw new Error(res?.error || "No response");

    for (const r of rows) {
      const pct = Math.min(parseInt(res[r.key], 10) || 0, 100);
      r.value.textContent = pct + "%";
      r.bar.style.width = pct + "%";
      r.value.classList.remove("pulse");
      void r.value.offsetWidth; // restart the animation
      r.value.classList.add("pulse");
    }
    setStatus("Updated", "success");
  } catch (err) {
    setStatus(err.message, "error");
  }
}

$("refresh").addEventListener("click", loadUsage);

$("open").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ url: USAGE_URL + "*" });
  if (tab) {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: USAGE_URL });
  }
});

loadUsage();
