/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const COSMETIC_AD_BLOCK_RULES = `
  /* AdSense & Display Ads */
  ins.adsbygoogle,
  [id^="google_ads_"],
  [id^="div-gpt-ad"],
  iframe[src*="doubleclick.net"],
  iframe[src*="googlesyndication.com"],
  div[data-ad-slot],
  div[data-ad-unit],
  div[id*="ScriptRoot"],
  .ad-container,
  .ad-banner,
  .adsbox,
  .sponsor-post,
  [class*="sponsored-post"],

  /* Video & Stream Ads (YouTube, Dailymotion, Player Ads) */
  .ytp-ad-module,
  .ytp-ad-overlay-container,
  .ytp-ad-player-overlay,
  .ytp-ad-image-overlay,
  .video-ads:not([style*="display: none"]),
  ytd-promoted-video-renderer,
  ytd-display-ad-renderer,
  ytd-ad-slot-renderer,
  ytd-in-feed-ad-layout-renderer,
  #masthead-ad,
  .videoAdUi,
  .ima-ad-container,
  .jw-flag-ads,

  /* Outbrain / Taboola Content Ads */
  .trc_related_container,
  .outbrain,
  .taboola,
  [class*="revcontent"],

  /* Annoying Floating Cookie/GDPR Nag Overlays */
  #onetrust-banner-sdk,
  div[class*="cookie-banner"]:not(body),
  div[class*="cookie-consent"]:not(body) {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

export function injectCosmeticFilters(doc: Document): void {
  try {
    if (!doc || !doc.head || doc.getElementById("floorp-adshield-styles")) return;
    const styleEl = doc.createElement("style");
    styleEl.id = "floorp-adshield-styles";
    styleEl.textContent = COSMETIC_AD_BLOCK_RULES;
    doc.head.appendChild(styleEl);
  } catch {
    // Content document might be cross-origin or restricted
  }
}
