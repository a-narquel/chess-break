// Switch to the Claude tab for this conversation (or any Claude Code tab),
// opening one only when none is open.
chrome.runtime.onMessage.addListener(msg => {
  if (!msg || msg.type !== "chess-break:back") return;
  const href = typeof msg.href === "string" && /^https:\/\/claude\.ai\/code(\/|$)/.test(msg.href) ? msg.href : "https://claude.ai/code";
  chrome.tabs.query({ url: "https://claude.ai/code/*" }, tabs => {
    const exact = tabs.find(t => t.url && t.url.split(/[?#]/)[0] === href);
    const tab = exact || tabs[0];
    if (tab) {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: href });
    }
  });
});
