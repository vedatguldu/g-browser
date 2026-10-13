/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import styles from "@/components/common/settings-sections.module.css";
import { useTranslation } from "react-i18next";
import { MediaDownloaderSettings } from "@/app/downloader/components/MediaDownloaderSettings.tsx";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className={`floorp-settings-page ${styles.page}`}>
      <div className="floorp-page-header">
        <h1 className="floorp-page-heading">
          {t("downloader.pageTitle", { defaultValue: "Ortam ve Video İndirici" })}
        </h1>
        <p className="floorp-page-description">
          {t("downloader.pageDescription", {
            defaultValue:
              "Ziyaret ettiğiniz sayfalardaki video, ses ve canlı yayın ortamlarını algılayıp doğrudan cihazınıza indirin.",
          })}
        </p>
      </div>

      <div className={styles.sections}>
        <MediaDownloaderSettings />
      </div>
    </div>
  );
}
