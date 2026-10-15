/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: "video" | "audio" | "stream";
  format: string;
  size?: string;
  browserId?: number;
  timestamp: number;
}

// Minimal structural types for the chrome-window globals used here.
interface TabBrowser {
  browserId?: number;
  contentTitle?: string;
}
interface GBrowserLike {
  browsers?: TabBrowser[];
  selectedBrowser?: TabBrowser;
  getTabForBrowser?: (b: TabBrowser) => { label?: string } | null;
}
interface ChannelLike {
  URI?: { spec?: string };
  contentType?: string;
  contentLength?: number;
  browserId?: number;
  loadInfo?: { browsingContextID?: number };
}

const LOG_PREFIX = "[MediaDetector]";
const MAX_ITEMS_PER_TAB = 40;
const MIN_MEDIA_BYTES = 30 * 1024;

// Media is stored per tab (browserId). The observer is registered once per
// chrome window and only accepts channels that belong to a tab of that window,
// so nothing is processed twice and nothing is attributed to the wrong tab.
const mediaByBrowser = new Map<number, MediaItem[]>();
let mediaUpdateListeners: Array<() => void> = [];
let observerRegistered = false;
let itemCounter = 0;

function getGBrowser(): GBrowserLike | null {
  return (globalThis as unknown as { gBrowser?: GBrowserLike }).gBrowser ?? null;
}

export function addMediaUpdateListener(listener: () => void): () => void {
  mediaUpdateListeners.push(listener);
  return () => {
    mediaUpdateListeners = mediaUpdateListeners.filter((l) => l !== listener);
  };
}

function notifyMediaUpdated(): void {
  for (const listener of mediaUpdateListeners) {
    try {
      listener();
    } catch (e) {
      console.warn(`${LOG_PREFIX} media update listener failed:`, e);
    }
  }
}

function getBoolPrefSafe(pref: string, defVal = true): boolean {
  try {
    return Services.prefs.getBoolPref(pref, defVal);
  } catch (e) {
    console.warn(`${LOG_PREFIX} could not read pref ${pref}, using default:`, e);
    return defVal;
  }
}

function formatBytes(bytes: number): string | undefined {
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function getActiveBrowserId(): number | null {
  return getGBrowser()?.selectedBrowser?.browserId ?? null;
}

export function getMediaItemsForActiveTab(): MediaItem[] {
  const browserId = getActiveBrowserId();
  if (browserId === null) return [];
  return mediaByBrowser.get(browserId) ?? [];
}

export function clearMediaForTab(browserId: number): void {
  if (mediaByBrowser.delete(browserId)) {
    notifyMediaUpdated();
  }
}

/**
 * Returns the tab browser of THIS window that issued the request, or null when
 * the request belongs to another window, a background service, or cannot be
 * attributed. Unattributable requests are dropped instead of being guessed.
 */
function findOwnBrowser(channel: ChannelLike): TabBrowser | null {
  const browsers = getGBrowser()?.browsers;
  if (!browsers || browsers.length === 0) return null;

  let browserId = 0;
  try {
    browserId = Number(channel.browserId ?? 0);
  } catch (e) {
    console.debug(`${LOG_PREFIX} channel.browserId unavailable:`, e);
  }

  if (!browserId) {
    try {
      const bcid = channel.loadInfo?.browsingContextID;
      if (bcid) {
        browserId = BrowsingContext.get(bcid)?.top?.browserId ?? 0;
      }
    } catch (e) {
      console.debug(`${LOG_PREFIX} browsing context lookup failed:`, e);
    }
  }

  if (!browserId) return null;
  return browsers.find((b) => b.browserId === browserId) ?? null;
}

function getCleanTabTitle(browser: TabBrowser): string {
  const tab = getGBrowser()?.getTabForBrowser?.(browser);
  const raw = tab?.label || browser.contentTitle || "";
  const title = raw
    .replace(/\s*-\s*YouTube$/i, "")
    .replace(/\s*\/\s*X$/i, "")
    .replace(/\s*-\s*Vimeo$/i, "")
    .replace(/\s*-\s*Dailymotion$/i, "")
    .trim();
  return title || "Medya";
}

// HLS/DASH segments are pieces of a stream, not standalone files. Listing them
// would flood the panel with unplayable fragments; the playlist is listed instead.
const SEGMENT_PATTERN = /\.(m4s|ts|m4f|cmfv|cmfa)(\?|$)|[/_-](seg|segment|frag|fragment|chunk)[-_]?\d+/i;
const VIDEO_EXT = /\.(mp4|webm|mkv|m4v|ogv|flv|avi|mov)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)(\?|$)/i;
const STREAM_EXT = /\.(m3u8|mpd)(\?|$)/i;

// YouTube itags that carry both picture and sound in one file.
const YT_MUXED_ITAGS = new Set(["18", "22"]);

interface YouTubeInfo {
  downloadUrl: string;
  dedupeKey: string;
  format: string;
  type: "video" | "audio";
  totalBytes: number;
}

function parseYouTube(url: string): YouTubeInfo | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch (e) {
    console.debug(`${LOG_PREFIX} invalid YouTube URL:`, e);
    return null;
  }
  const itag = u.searchParams.get("itag") ?? "";
  const mime = u.searchParams.get("mime") ?? "";
  const id = u.searchParams.get("id") ?? "";
  const clen = Number(u.searchParams.get("clen") ?? "0");

  // The player fetches byte ranges; dropping the range parameters requests the
  // whole stream for that itag. Whether YouTube serves it this way depends on
  // the current player protocol and is not guaranteed.
  for (const p of ["range", "rn", "rbuf", "ump", "srfvp"]) {
    u.searchParams.delete(p);
  }

  const isAudio = mime.startsWith("audio");
  let format: string;
  if (isAudio) {
    format = itag === "140" ? "M4A (ses)" : itag === "251" ? "Opus (ses)" : "Ses";
  } else if (YT_MUXED_ITAGS.has(itag)) {
    format = itag === "22" ? "MP4 720p" : "MP4 360p";
  } else {
    // Adaptive video streams contain no audio track.
    format = `Video itag ${itag || "?"} (sessiz görüntü)`;
  }

  return {
    downloadUrl: u.toString(),
    dedupeKey: `yt:${id}:${itag}`,
    format,
    type: isAudio ? "audio" : "video",
    totalBytes: clen,
  };
}

function processChannel(channel: ChannelLike): void {
  const url = channel.URI?.spec ?? "";
  if (!/^https?:/i.test(url)) return;

  let contentType = "";
  try {
    contentType = (channel.contentType ?? "").toLowerCase();
  } catch (e) {
    console.debug(`${LOG_PREFIX} contentType unavailable:`, e);
  }

  const isYouTube = url.includes("googlevideo.com/videoplayback");
  const isStream = contentType.includes("mpegurl") || contentType.includes("dash+xml") || STREAM_EXT.test(url);
  const isAudio = contentType.startsWith("audio/") || AUDIO_EXT.test(url);
  const isVideo = contentType.startsWith("video/") || VIDEO_EXT.test(url);

  if (!isYouTube && !isStream && !isAudio && !isVideo) return;
  if (!isYouTube && !isStream && SEGMENT_PATTERN.test(url)) return;

  const browser = findOwnBrowser(channel);
  if (!browser?.browserId) return;

  let contentLength = -1;
  try {
    contentLength = Number(channel.contentLength ?? -1);
  } catch (e) {
    console.debug(`${LOG_PREFIX} contentLength unavailable:`, e);
  }

  let type: MediaItem["type"];
  let format: string;
  let downloadUrl = url;
  let dedupeKey = url.split("?")[0];
  let totalBytes = contentLength;

  if (isYouTube) {
    const yt = parseYouTube(url);
    if (!yt) return;
    type = yt.type;
    format = yt.format;
    downloadUrl = yt.downloadUrl;
    dedupeKey = yt.dedupeKey;
    totalBytes = yt.totalBytes;
  } else if (isStream) {
    type = "stream";
    format = url.includes(".mpd") || contentType.includes("dash") ? "DASH (MPD)" : "HLS (M3U8)";
  } else {
    // Tiny responses are usually tracking pixels or UI sounds.
    if (contentLength > 0 && contentLength < MIN_MEDIA_BYTES) return;
    type = isAudio ? "audio" : "video";
    const ext = url.match(type === "audio" ? AUDIO_EXT : VIDEO_EXT)?.[1];
    format = (ext ?? contentType.split("/")[1] ?? type).toUpperCase();
  }

  if (type === "video" && !getBoolPrefSafe("floorp.mediadownloader.detect.video")) return;
  if (type === "audio" && !getBoolPrefSafe("floorp.mediadownloader.detect.audio")) return;
  if (type === "stream" && !getBoolPrefSafe("floorp.mediadownloader.detect.stream")) return;

  const browserId = browser.browserId;
  const list = mediaByBrowser.get(browserId) ?? [];
  const size = formatBytes(totalBytes) ?? (type === "stream" ? "Akış" : undefined);
  const existing = list.find((item) => item.id.endsWith(`|${dedupeKey}`));

  if (existing) {
    // Keep the freshest URL (tokens expire) and the best known size.
    existing.url = downloadUrl;
    if (size) existing.size = size;
  } else {
    itemCounter += 1;
    list.unshift({
      id: `media-${itemCounter}|${dedupeKey}`,
      url: downloadUrl,
      title: `${getCleanTabTitle(browser)} (${format})`,
      type,
      format,
      size,
      browserId,
      timestamp: Date.now(),
    });
    if (list.length > MAX_ITEMS_PER_TAB) list.pop();
  }
  mediaByBrowser.set(browserId, list);

  if (browserId === getActiveBrowserId()) {
    notifyMediaUpdated();
  }
}

const mediaHttpObserver = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),

  observe(subject: nsISupports, topic: string) {
    if (
      topic !== "http-on-examine-response" &&
      topic !== "http-on-examine-cached-response"
    ) {
      return;
    }
    if (!(subject instanceof Ci.nsIHttpChannel)) return;
    if (!getBoolPrefSafe("floorp.mediadownloader.enabled")) return;
    try {
      processChannel(subject as unknown as ChannelLike);
    } catch (e) {
      console.warn(`${LOG_PREFIX} failed to process response:`, e);
    }
  },
};

export function startMediaObserver(): void {
  if (observerRegistered) return;
  try {
    Services.obs.addObserver(mediaHttpObserver, "http-on-examine-response");
    Services.obs.addObserver(mediaHttpObserver, "http-on-examine-cached-response");
    observerRegistered = true;
  } catch (e) {
    console.error(`${LOG_PREFIX} failed to register HTTP observer:`, e);
  }
}

export function stopMediaObserver(): void {
  if (!observerRegistered) return;
  try {
    Services.obs.removeObserver(mediaHttpObserver, "http-on-examine-response");
    Services.obs.removeObserver(mediaHttpObserver, "http-on-examine-cached-response");
  } catch (e) {
    console.warn(`${LOG_PREFIX} failed to remove HTTP observer:`, e);
  }
  observerRegistered = false;
  mediaByBrowser.clear();
}

function fileExtensionFor(item: MediaItem): string {
  const f = item.format.toUpperCase();
  if (item.type === "stream") return f.includes("DASH") ? "mpd" : "m3u8";
  if (f.includes("OPUS") || f.includes("WEBM")) return "webm";
  if (f.includes("MP3")) return "mp3";
  if (f.includes("M4A")) return "m4a";
  const known = f.match(/^(MP4|MKV|M4V|OGV|FLV|AVI|MOV|WAV|OGG|OGA|AAC|FLAC)$/);
  if (known) return known[1].toLowerCase();
  return item.type === "audio" ? "m4a" : "mp4";
}

export async function downloadMediaItem(item: MediaItem): Promise<boolean> {
  const safeTitle = item.title.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 120) || "medya";
  const fileName = `${safeTitle}.${fileExtensionFor(item)}`;

  try {
    const { Downloads } = ChromeUtils.importESModule(
      "resource://gre/modules/Downloads.sys.mjs",
    );
    const downloadsDir = await Downloads.getPreferredDownloadsDirectory();
    const download = await Downloads.createDownload({
      source: { url: item.url, isPrivate: false },
      target: { path: PathUtils.join(downloadsDir, fileName) },
    });
    const list = await Downloads.getList(Downloads.ALL);
    await list.add(download);
    // Adding to the list makes the toolbar download indicator track it.
    download.start().catch((e: unknown) => {
      console.error(`${LOG_PREFIX} download failed:`, e);
    });
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} could not start download:`, error);
    return false;
  }
}

export function openDownloadManager(): void {
  // Same command as Ctrl+J: opens the Library "Downloads" view
  // (about:downloads tab in private windows).
  const win = globalThis as unknown as {
    BrowserCommands?: { downloadsUI?: () => void };
    switchToTabHavingURI?: (uri: string, openNew: boolean) => void;
  };
  if (typeof win.BrowserCommands?.downloadsUI === "function") {
    win.BrowserCommands.downloadsUI();
    return;
  }
  if (typeof win.switchToTabHavingURI === "function") {
    win.switchToTabHavingURI("about:downloads", true);
    return;
  }
  console.error(`${LOG_PREFIX} no download manager entry point available`);
}

export function copyMediaUrlToClipboard(url: string): boolean {
  try {
    const helper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
      Ci.nsIClipboardHelper,
    );
    helper.copyString(url);
    return true;
  } catch (e) {
    console.error(`${LOG_PREFIX} could not copy URL to clipboard:`, e);
    return false;
  }
}
