(function loadCloudflareWebAnalytics() {
  const token = window.HEXFORGE_CONFIG?.cloudflareWebAnalyticsToken;
  if (!token || token.startsWith("REPLACE_WITH_")) return;

  const beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(beacon);
})();

window.hexforgeTrack = function trackHexforgeEvent(name, properties = {}) {
  const detail = Object.freeze({ name, properties: { ...properties } });
  document.dispatchEvent(new CustomEvent("hexforge:analytics", { detail }));

  if (typeof window.gtag === "function") {
    window.gtag("event", name, properties);
  }
};
