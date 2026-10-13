import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import type React from "react";

declare global {
  var NRFocusUrlBar: (() => void) | undefined;
}

export function SearchBar() {
  const { t } = useTranslation();

  const handleActivate = () => {
    if (globalThis.NRFocusUrlBar) {
      globalThis.NRFocusUrlBar();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("searchBar.searchOrEnterUrl", { defaultValue: "Web'de ara veya adres yazın" })}
        className="group bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-sm flex items-center p-2 cursor-pointer hover:bg-gray-700/50 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex-1">
          <input
            id="newtab-search-bar-input"
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            placeholder={t("searchBar.searchOrEnterUrl", { defaultValue: "Web'de ara veya adres yazın" })}
            className="w-full bg-transparent border-none outline-none px-2 py-1 text-gray-100 cursor-pointer group-hover:text-white transition-colors pointer-events-none"
            readOnly
          />
        </div>

        <div className="p-2 text-gray-400 group-hover:text-white transition-colors" aria-hidden="true">
          <Search size={18} />
        </div>
      </div>
    </div>
  );
}
