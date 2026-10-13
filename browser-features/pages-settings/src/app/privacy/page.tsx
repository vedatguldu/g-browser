/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import styles from "@/components/common/settings-sections.module.css";
import { useTranslation } from "react-i18next";
import { AdShieldSettings } from "@/app/privacy/components/AdShieldSettings.tsx";
import { DnsSecuritySettings } from "@/app/privacy/components/DnsSecuritySettings.tsx";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className={`floorp-settings-page ${styles.page}`}>
      <div className="floorp-page-header">
        <h1 className="floorp-page-heading">
          {t("privacy.pageTitle", { defaultValue: "Gizlilik, Güvenlik ve Ağ Koruması" })}
        </h1>
        <p className="floorp-page-description">
          {t("privacy.pageDescription", {
            defaultValue:
              "Dahili AdShield reklam kalkanı, DNS-over-HTTPS (DoH), şifreli istemci selamlama (ECH) ve gelişmiş izleme koruması ayarlarını yapılandırın.",
          })}
        </p>
      </div>

      <div className={styles.sections}>
        <AdShieldSettings />
        <DnsSecuritySettings />
      </div>
    </div>
  );
}
