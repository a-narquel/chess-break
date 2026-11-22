// Runs in the chess board page (it lives in a frame inside the artifact page).
// "Back to Claude" asks the extension to switch to the open Claude tab; with
// "Stop me when Claude replies" ticked, the reply itself does it.
(() => {
  const back = document.getElementById("gotIt");
  const link = document.getElementById("backLink");
  const overlay = document.getElementById("overlay");
  if (!back || !overlay) return; // not the chess board

  const goBack = href => {
    try { chrome.runtime.sendMessage({ type: "chess-break:back", href }); } catch {}
  };
  for (const el of [back, link]) {
    if (!el) continue;
    el.addEventListener("click", e => { e.preventDefault(); goBack(el.href); }, true);
  }
  // The overlay shows only when "Stop me when Claude replies" is ticked and Claude has replied.
  new MutationObserver(() => {
    if (!overlay.hidden) goBack(back.href);
  }).observe(overlay, { attributes: true, attributeFilter: ["hidden"] });
})();
