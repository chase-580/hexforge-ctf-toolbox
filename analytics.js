(function loadCloudflareWebAnalytics() {
  const token = window.HEXFORGE_CONFIG?.cloudflareWebAnalyticsToken;
  if (!token || token.startsWith("REPLACE_WITH_")) return;

  const beacon = document.createElement("script");
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(beacon);
})();
