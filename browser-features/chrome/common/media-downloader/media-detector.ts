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
}

const MEDIA_EXTENSIONS = /\.(mp4|webm|mkv|m4v|ogv|m3u8|mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;

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

export function extractMediaFromDocument(doc: Document | null): MediaItem[] {
  if (!doc) return [];
  const items: MediaItem[] = [];
  const seenUrls = new Set<string>();

  const detectVideo = getBoolPrefSafe("floorp.mediadownloader.detect.video", true);
  const detectAudio = getBoolPrefSafe("floorp.mediadownloader.detect.audio", true);
  const detectStream = getBoolPrefSafe("floorp.mediadownloader.detect.stream", true);

  const addItem = (url: string, type: "video" | "audio" | "stream", label?: string) => {
    if (!url || url.startsWith("blob:") || url.startsWith("javascript:") || seenUrls.has(url)) return;
    if (type === "video" && !detectVideo) return;
    if (type === "audio" && !detectAudio) return;
    if (type === "stream" && !detectStream) return;
    seenUrls.add(url);

    let format = "MP4";
    const match = url.match(/\.([a-zA-Z0-9]{3,4})(\?|$)/);
    if (match && match[1]) {
      format = match[1].toUpperCase();
    } else if (type === "stream" || url.includes(".m3u8")) {
      format = "HLS/M3U8";
      type = "stream";
    }

    let title = label || "";
    if (!title) {
      try {
        const u = new URL(url);
        const parts = u.pathname.split("/").filter(Boolean);
        title = parts[parts.length - 1] || doc.title || "Media File";
      } catch {
        title = doc.title || "Media File";
      }
    }

    items.push({
      id: `media-${items.length + 1}`,
      url,
      title: title.slice(0, 60),
      type,
      format,
    });
  };

  try {
    // 1. Scan <video> and child <source>
    const videos = doc.querySelectorAll("video");
    for (const v of Array.from(videos)) {
      if (v.src) addItem(v.src, "video", v.getAttribute("title") || v.getAttribute("aria-label") || undefined);
      if (v.currentSrc) addItem(v.currentSrc, "video");
      const sources = v.querySelectorAll("source");
      for (const s of Array.from(sources)) {
        if (s.src) addItem(s.src, "video");
      }
    }

    // 2. Scan <audio> and child <source>
    const audios = doc.querySelectorAll("audio");
    for (const a of Array.from(audios)) {
      if (a.src) addItem(a.src, "audio", a.getAttribute("title") || a.getAttribute("aria-label") || undefined);
      if (a.currentSrc) addItem(a.currentSrc, "audio");
      const sources = a.querySelectorAll("source");
      for (const s of Array.from(sources)) {
        if (s.src) addItem(s.src, "audio");
      }
    }

    // 3. Scan <a> links pointing directly to media files
    const links = doc.querySelectorAll("a[href]");
    for (const a of Array.from(links)) {
      const href = a.getAttribute("href");
      if (href && MEDIA_EXTENSIONS.test(href)) {
        try {
          const absoluteUrl = new URL(href, doc.location.href).href;
          const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)/i.test(absoluteUrl);
          addItem(absoluteUrl, isAudio ? "audio" : "video", a.textContent?.trim() || undefined);
        } catch {
          // Relative URL parse fallback
        }
      }
    }

    // 4. Scan meta tags: og:video, twitter:player:stream
    const ogVideo = doc.querySelector('meta[property="og:video"], meta[property="og:video:url"]')?.getAttribute("content");
    if (ogVideo) addItem(ogVideo, "video", doc.title);
  } catch {
    // Document scan safe fallback
  }

  return items;
}

export async function downloadMediaItem(item: MediaItem): Promise<boolean> {
  const sanitize = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_").trim() || "download";
  const ext = item.format.toLowerCase().replace(/[^a-z0-9]/g, "");
  const defaultFileName = `${sanitize(item.title)}.${ext || "mp4"}`;

  try {
    // Try Gecko's native saveURL first
    const win = globalThis as unknown as { saveURL?: (...args: unknown[]) => void };
    if (typeof win.saveURL === "function") {
      win.saveURL(item.url, defaultFileName, null, false, true, null, document);
      return true;
    }

    // Try Downloads.sys.mjs
    const { Downloads } = ChromeUtils.importESModule("resource://gre/modules/Downloads.sys.mjs");
    const { PathUtils } = ChromeUtils.importESModule("resource://gre/modules/PathUtils.sys.mjs");
    const defaultDownloadsDir = await PathUtils.getDefaultDownloadsDir();
    const targetPath = PathUtils.join(defaultDownloadsDir, defaultFileName);

    const download = await Downloads.createDownload({
      source: item.url,
      target: targetPath,
    });
    const list = await Downloads.getList(Downloads.ALL);
    await list.add(download);
    await download.start();
    return true;
  } catch (error) {
    console.error("[MediaDownloader] Native download error status message:", error);
    // Fallback: open URL in tab so browser handles download
    try {
      const gBrowser = (globalThis as unknown as { gBrowser?: { addTrustedTab?: (u: string) => void } }).gBrowser;
      gBrowser?.addTrustedTab?.(item.url);
      return true;
    } catch {
      return false;
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
    // Fallback: standard navigator clipboard
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
