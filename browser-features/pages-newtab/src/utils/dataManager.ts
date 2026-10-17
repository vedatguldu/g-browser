import { rpc } from "@/lib/rpc/rpc.ts";
import { callNRWithRetry } from "@/utils/nrRetry.ts";

declare global {
  interface Window {
    NRGetFolderPathFromDialog: (callback: (data: string) => void) => void;
    NRGetRandomImageFromFolder: (
      folderPath: string,
      callback: (data: string) => void,
    ) => void;
  }
}

export interface PinnedSite {
  url: string;
  title: string;
}

export interface NewTabSettings {
  components: {
    topSites: boolean;
    clock: boolean;
    searchBar?: boolean;
    firefoxLayout?: boolean;
  };
  background: {
    type: "none" | "random" | "custom" | "folderPath" | "floorp";
    customImage: string | null;
    fileName: string | null;
    folderPath?: string | null;
    selectedFloorp?: string | null;
    slideshowEnabled?: boolean;
    slideshowInterval?: number;
  };
  searchBar: {
    searchEngine: string;
  };
  topSites: {
    pinned: PinnedSite[];
    blocked: string[];
  };
}

export interface FolderPathResult {
  path: string | null;
  success: boolean;
}

export interface RandomImageResult {
  image: string | null;
  fileName: string | null;
  success: boolean;
}

export const DEFAULT_SUGGESTED_SITES: PinnedSite[] = [
  { url: "https://youtube.com", title: "YouTube" },
  { url: "https://x.com", title: "X" },
  { url: "https://www.reddit.com/", title: "Reddit" },
  { url: "https://wikipedia.org/", title: "Wikipedia" },
  { url: "https://instagram.com", title: "Instagram" },
];

const DEFAULT_SETTINGS: NewTabSettings = {
  components: {
    topSites: true,
    clock: true,
    searchBar: true,
    firefoxLayout: true,
  },
  background: {
    type: "random",
    customImage: null,
    fileName: null,
    folderPath: null,
    selectedFloorp: null,
    slideshowEnabled: false,
    slideshowInterval: 30,
  },
  searchBar: {
    searchEngine: "default",
  },
  topSites: {
    pinned: [
      { url: "https://vedatguldu.com", title: "Vedat Güldü" },
      {
        url: "https://github.com/vedatguldu/g-browser",
        title: "G-Browser",
      },
    ],
    blocked: [],
  },
};

let savePromise: Promise<void> | null = null;

export async function saveNewTabSettings(
  settings: Partial<NewTabSettings>,
): Promise<void> {
  try {
    if (savePromise) {
      await savePromise;
    }

    savePromise = (async () => {
      const current = await getNewTabSettings();

      const newSettings = {
        ...current,
        ...settings,
        components: {
          ...current.components,
          ...(settings.components as object),
        },
        background: {
          ...current.background,
          ...(settings.background as object),
        },
        searchBar: { ...current.searchBar, ...(settings.searchBar as object) },
        topSites: { ...current.topSites, ...(settings.topSites as object) },
      };

      await rpc.setStringPref(
        "floorp.newtab.configs",
        JSON.stringify(newSettings),
      );
    })();

    await savePromise;
  } catch (e) {
    console.error("Failed to save newtab settings status message:", e);
    throw e;
  } finally {
    savePromise = null;
  }
}

export async function getNewTabSettings(): Promise<NewTabSettings> {
  try {
    const result = await rpc.getStringPref("floorp.newtab.configs");
    if (!result) {
      return DEFAULT_SETTINGS;
    }

    const settings = JSON.parse(result);
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      components: {
        ...DEFAULT_SETTINGS.components,
        ...(settings.components as object),
      },
      background: {
        ...DEFAULT_SETTINGS.background,
        ...(settings.background as object),
      },
      searchBar: {
        ...DEFAULT_SETTINGS.searchBar,
        ...(settings.searchBar as object),
      },
      topSites: {
        ...DEFAULT_SETTINGS.topSites,
        ...(settings.topSites as object),
      },
    };

    if (mergedSettings.topSites && Array.isArray(mergedSettings.topSites.pinned)) {
      mergedSettings.topSites.pinned = mergedSettings.topSites.pinned.map((site) => {
        if (!site) return site;
        const u = (site.url || "").toLowerCase();
        const t = (site.title || "").toLowerCase();
        if (u.includes("cube-soft") || t.includes("cubesoft")) {
          return { url: "https://vedatguldu.com", title: "Vedat Güldü" };
        }
        if (u.includes("floorp") || u.includes("ablaze") || t.includes("floorp") || t.includes("ablaze")) {
          return { url: "https://vedatguldu.github.io/g-browser/", title: "G-Browser Rehberi" };
        }
        return site;
      });
    }

    return mergedSettings;
  } catch (e) {
    console.error("Failed to load newtab settings status message:", e);
    return DEFAULT_SETTINGS;
  }
}

export async function getFolderPathFromDialog(): Promise<FolderPathResult> {
  try {
    return await callNRWithRetry<FolderPathResult>(
      (cb) => (globalThis as unknown as Window).NRGetFolderPathFromDialog(cb),
      (data) => JSON.parse(data),
      {
        retries: 3,
        timeoutMs: 5000,
        delayMs: 400,
        shouldRetry: (v) => !v || v.success === false,
      },
    );
  } catch (e) {
    console.error("Failed to get folder path from dialog status message:", e);
    return { path: null, success: false };
  }
}

export async function getRandomImageFromFolder(
  folderPath: string,
): Promise<RandomImageResult> {
  try {
    return await callNRWithRetry<RandomImageResult>(
      (cb) =>
        (globalThis as unknown as Window).NRGetRandomImageFromFolder(
          folderPath,
          cb,
        ),
      (data) => JSON.parse(data),
      {
        retries: 3,
        timeoutMs: 5000,
        delayMs: 400,
        shouldRetry: (v) => !v || v.success === false,
      },
    );
  } catch (e) {
    console.error("Failed to get random image from folder status message:", e);
    return { image: null, fileName: null, success: false };
  }
}
