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
  bitrate?: string;
  browserId?: number;
  timestamp: number;
}

const mediaByBrowser = new Map<number, MediaItem[]>();
const globalFallbackMedia: MediaItem[] = [];
let mediaUpdateListeners: Array<() => void> = [];
let observerRegistered = false;

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
    } catch {
      // Ignore listener error
    }
  }
}

function getBoolPrefSafe(pref: string, defVal = true): boolean {
  try {
    const Services = (globalThis as unknown as { Services?: { prefs?: { getBoolPref?: (p: string, d?: boolean) => boolean } } }).Services;
    if (Services?.prefs?.getBoolPref) {
      return Services.prefs.getBoolPref(pref, defVal);
    }
  } catch {
    // fallback
  }
  return defVal;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "Bilinmiyor";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function getActiveBrowserId(): number | null {
  try {
    // deno-lint-ignore no-explicit-any
    const gBrowser = (globalThis as any).gBrowser;
    const selected = gBrowser?.selectedBrowser;
    if (selected?.browserId) return selected.browserId;
  } catch {
    // fallback
  }
  return null;
}

export function getMediaItemsForActiveTab(): MediaItem[] {
  const browserId = getActiveBrowserId();
  if (browserId && mediaByBrowser.has(browserId)) {
    return mediaByBrowser.get(browserId) || [];
  }
  return globalFallbackMedia;
}

export function clearMediaForTab(browserId: number): void {
  mediaByBrowser.delete(browserId);
  notifyMediaUpdated();
}

// deno-lint-ignore no-explicit-any
function getBrowserIdForChannel(channel: any): number | null {
  try {
    if (channel.browserId && channel.browserId > 0) {
      return channel.browserId;
    }
  } catch {
    // ignore
  }

  try {
    const bcid = channel.loadInfo?.browsingContextID;
    if (bcid) {
      // deno-lint-ignore no-explicit-any
      const gBrowser = (globalThis as any).gBrowser;
      if (gBrowser?.browsers) {
        for (const b of gBrowser.browsers) {
          if (b.browsingContext?.id === bcid || b.browsingContext?.top?.id === bcid) {
            return b.browserId || null;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const ref = channel.referrer?.spec || channel.loadInfo?.loadingPrincipal?.URI?.spec;
    if (ref) {
      // deno-lint-ignore no-explicit-any
      const gBrowser = (globalThis as any).gBrowser;
      if (gBrowser?.browsers) {
        for (const b of gBrowser.browsers) {
          if (b.currentURI?.spec && (ref.startsWith(b.currentURI.spec) || b.currentURI.spec.startsWith(ref))) {
            return b.browserId || null;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return getActiveBrowserId();
}

function getCleanTabTitle(browserId: number | null): string {
  try {
    // deno-lint-ignore no-explicit-any
    const gBrowser = (globalThis as any).gBrowser;
    if (gBrowser?.browsers && browserId) {
      for (const b of gBrowser.browsers) {
        if (b.browserId === browserId) {
          const tab = gBrowser.getTabForBrowser?.(b);
          let title = tab?.label || b.contentTitle || "";
          title = title.replace(/\s*-\s*YouTube$/i, "")
                       .replace(/\s*\/\s*X$/i, "")
                       .replace(/\s*:\s*Twitter$/i, "")
                       .replace(/\s*-\s*Vimeo$/i, "")
                       .replace(/\s*-\s*Dailymotion$/i, "")
                       .trim();
          if (title) return title;
        }
      }
    }
    // Fallback to selected tab
    const selected = gBrowser?.selectedBrowser;
    let title = selected?.contentTitle || "";
    title = title.replace(/\s*-\s*YouTube$/i, "").trim();
    if (title) return title;
  } catch {
    // ignore
  }
  return "Medya Dosyası";
}

// deno-lint-ignore no-explicit-any
function processChannel(channel: any): void {
  if (!getBoolPrefSafe("floorp.mediadownloader.enabled", true)) return;

  const detectVideo = getBoolPrefSafe("floorp.mediadownloader.detect.video", true);
  const detectAudio = getBoolPrefSafe("floorp.mediadownloader.detect.audio", true);
  const detectStream = getBoolPrefSafe("floorp.mediadownloader.detect.stream", true);

  const url = channel.URI?.spec || "";
  if (!url || url.startsWith("chrome:") || url.startsWith("resource:") || url.startsWith("about:") || url.startsWith("data:")) {
    return;
  }

  let contentType = "";
  try {
    contentType = channel.contentType?.toLowerCase() || "";
  } catch {
    // ignore
  }

  let contentLength = -1;
  try {
    contentLength = channel.contentLength;
  } catch {
    // ignore
  }

  const isVideoExt = /\.(mp4|webm|mkv|m4v|ogv|flv|ts|m4s|avi)(\?.*)?$/i.test(url);
  const isAudioExt = /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?.*)?$/i.test(url);
  const isStreamExt = /\.(m3u8|mpd)(\?.*)?$/i.test(url) || url.includes(".m3u8") || url.includes(".mpd");

  const isYouTubePlayback = url.includes("googlevideo.com/videoplayback");
  const isTwitterVideo = url.includes("video.twimg.com");
  const isRedditVideo = url.includes("v.redd.it");
  const isTiktokVideo = url.includes("tiktokcdn.com") && (contentType.includes("video") || url.includes("video"));
  const isVimeoVideo = url.includes("vimeocdn.com") && (contentType.includes("video") || isVideoExt || isStreamExt);

  const isVideoType = contentType.startsWith("video/") || isVideoExt || isTwitterVideo || isRedditVideo || isTiktokVideo || isVimeoVideo;
  const isAudioType = contentType.startsWith("audio/") || isAudioExt;
  const isStreamType = contentType.includes("mpegurl") || contentType.includes("dash+xml") || isStreamExt;

  if (!isVideoType && !isAudioType && !isStreamType && !isYouTubePlayback) {
    return;
  }

  // Filter out tiny files (likely tracking pings or sound effects) unless it's a playlist
  if (contentLength > 0 && contentLength < 30720 && !isStreamType && !url.includes(".m3u8")) {
    return;
  }

  let mediaType: "video" | "audio" | "stream" = "video";
  if (isStreamType) mediaType = "stream";
  else if (isAudioType) mediaType = "audio";
  else if (isYouTubePlayback && url.includes("mime=audio")) mediaType = "audio";

  if (mediaType === "video" && !detectVideo) return;
  if (mediaType === "audio" && !detectAudio) return;
  if (mediaType === "stream" && !detectStream) return;

  const browserId = getBrowserIdForChannel(channel);
  const baseTitle = getCleanTabTitle(browserId);

  let format = "MP4";
  let title = baseTitle;
  let dedupeKey = url.split("?")[0];

  if (isYouTubePlayback) {
    // Parse YouTube parameters
    try {
      const u = new URL(url);
      const itag = u.searchParams.get("itag") || "";
      const mime = u.searchParams.get("mime") || "";
      dedupeKey = `yt-${itag}`;

      if (itag === "18") format = "MP4 (360p)";
      else if (itag === "22") format = "MP4 (720p HD)";
      else if (itag === "137") format = "MP4 (1080p FHD)";
      else if (itag === "248") format = "WebM (1080p)";
      else if (itag === "140") {
        format = "M4A (Ses)";
        mediaType = "audio";
      } else if (itag === "251") {
        format = "Opus (Ses)";
        mediaType = "audio";
      } else if (mime.includes("audio")) {
        format = `Ses (${itag || "Akış"})`;
        mediaType = "audio";
      } else {
        format = `Video (${itag || "Akış"})`;
      }

      title = `${baseTitle} [${format}]`;
    } catch {
      format = "YouTube Akışı";
    }
  } else if (isStreamType) {
    format = url.includes(".mpd") ? "DASH / MPD" : "HLS / M3U8";
    title = `${baseTitle} (${format})`;
  } else if (mediaType === "audio") {
    const extMatch = url.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/i);
    format = extMatch ? extMatch[1].toUpperCase() : (contentType.split("/")[1] || "Ses").toUpperCase();
    title = `${baseTitle} (${format})`;
  } else {
    const extMatch = url.match(/\.(mp4|webm|mkv|m4v|ogv|flv|ts)(\?|$)/i);
    format = extMatch ? extMatch[1].toUpperCase() : (contentType.split("/")[1] || "Video").toUpperCase();
    title = `${baseTitle} (${format})`;
  }

  // Format size
  const sizeStr = contentLength > 0 ? formatBytes(contentLength) : (isStreamType ? "Canlı Akış" : "Bilinmiyor");

  const newItem: MediaItem = {
    id: `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    url,
    title,
    type: mediaType,
    format,
    size: sizeStr,
    browserId: browserId || undefined,
    timestamp: Date.now(),
  };

  // Add to target store
  const targetList = browserId ? (mediaByBrowser.get(browserId) || []) : globalFallbackMedia;

  // Check if item already exists with matching dedupe key
  const existingIdx = targetList.findIndex((item) => {
    if (isYouTubePlayback && item.url.includes("googlevideo.com")) {
      const itag1 = new URL(item.url).searchParams.get("itag");
      const itag2 = new URL(url).searchParams.get("itag");
      return itag1 === itag2;
    }
    return item.url.split("?")[0] === dedupeKey;
  });

  if (existingIdx >= 0) {
    // Update existing item with newer URL (fresher token) and size
    targetList[existingIdx].url = url;
    if (contentLength > 0) targetList[existingIdx].size = sizeStr;
  } else {
    targetList.unshift(newItem);
    // Keep max 40 items per tab
    if (targetList.length > 40) targetList.pop();
  }

  if (browserId) {
    mediaByBrowser.set(browserId, targetList);
  }

  const activeId = getActiveBrowserId();
  if (!browserId || browserId === activeId) {
    notifyMediaUpdated();
  }
}

const mediaHttpObserver = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),

  observe(subject: nsISupports, topic: string) {
    if (
      (topic !== "http-on-examine-response" && topic !== "http-on-examine-cached-response") ||
      !(subject instanceof Ci.nsIHttpChannel)
    ) {
      return;
    }

    try {
      const channel = subject as nsIHttpChannel;
      processChannel(channel);
    } catch {
      // Safe guard
    }
  },
};

export function startMediaObserver(): void {
  if (observerRegistered) return;
  try {
    const Services = (globalThis as unknown as { Services?: { obs?: { addObserver?: (o: unknown, t: string) => void } } }).Services;
    if (Services?.obs?.addObserver) {
      Services.obs.addObserver(mediaHttpObserver, "http-on-examine-response");
      Services.obs.addObserver(mediaHttpObserver, "http-on-examine-cached-response");
      observerRegistered = true;
    }
  } catch (e) {
    console.error("[MediaDetector] Failed to register HTTP observer:", e);
  }
}

export function stopMediaObserver(): void {
  if (!observerRegistered) return;
  try {
    const Services = (globalThis as unknown as { Services?: { obs?: { removeObserver?: (o: unknown, t: string) => void } } }).Services;
    if (Services?.obs?.removeObserver) {
      Services.obs.removeObserver(mediaHttpObserver, "http-on-examine-response");
      Services.obs.removeObserver(mediaHttpObserver, "http-on-examine-cached-response");
      observerRegistered = false;
    }
  } catch {
    // ignore
  }
}

export async function downloadMediaItem(item: MediaItem): Promise<boolean> {
  const sanitize = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_").trim() || "medya";
  let ext = "mp4";
  if (item.type === "audio") ext = "m4a";
  if (item.format.includes("MP3")) ext = "mp3";
  if (item.format.includes("WEBM")) ext = "webm";
  if (item.format.includes("M3U8")) ext = "m3u8";

  const defaultFileName = `${sanitize(item.title)}.${ext}`;

  try {
    const { Downloads } = ChromeUtils.importESModule("resource://gre/modules/Downloads.sys.mjs");
    const { PathUtils } = ChromeUtils.importESModule("resource://gre/modules/PathUtils.sys.mjs");
    const { DownloadsCommon } = ChromeUtils.importESModule("resource:///modules/DownloadsCommon.sys.mjs");

    const defaultDownloadsDir = await PathUtils.getDefaultDownloadsDir();
    const targetPath = PathUtils.join(defaultDownloadsDir, defaultFileName);

    const download = await Downloads.createDownload({
      source: {
        url: item.url,
        isPrivate: false,
      },
      target: {
        path: targetPath,
      },
    });

    const list = await Downloads.getList(Downloads.ALL);
    await list.add(download);
    await download.start();

    // Trigger visual feedback in browser toolbar download indicator
    try {
      if (typeof DownloadsCommon?.showDownloadsPanel === "function") {
        DownloadsCommon.showDownloadsPanel();
      }
    } catch {
      // ignore
    }

    return true;
  } catch (error) {
    console.error("[MediaDownloader] Error in native download:", error);
    try {
      // Fallback to window.saveURL
      const win = globalThis as unknown as { saveURL?: (...args: unknown[]) => void };
      if (typeof win.saveURL === "function") {
        win.saveURL(item.url, defaultFileName, null, false, false, null, document);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

export function openDownloadManager(): void {
  try {
    // deno-lint-ignore no-explicit-any
    const win = globalThis as any;
    if (typeof win.DownloadsPanel?.showPanel === "function") {
      win.DownloadsPanel.showPanel();
      return;
    }
    if (typeof win.DownloadsCommon?.showDownloadsPanel === "function") {
      win.DownloadsCommon.showDownloadsPanel();
      return;
    }
    if (win.gBrowser?.addTrustedTab) {
      win.gBrowser.addTrustedTab("about:downloads");
      return;
    }
  } catch {
    try {
      // deno-lint-ignore no-explicit-any
      (globalThis as any).gBrowser?.addTrustedTab?.("about:downloads");
    } catch {
      // ignore
    }
  }
}

export function copyMediaUrlToClipboard(url: string): void {
  try {
    const { Cc, Ci } = specialPowersCcCi();
    const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
      Ci.nsIClipboardHelper,
    );
    clipboardHelper.copyString(url);
  } catch {
    try {
      navigator?.clipboard?.writeText(url);
    } catch {
      // Ignored
    }
  }
}

function specialPowersCcCi() {
  const c = Components;
  return { Cc: c.classes, Ci: c.interfaces };
}
