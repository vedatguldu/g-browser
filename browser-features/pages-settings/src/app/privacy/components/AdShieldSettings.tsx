/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import styles from "@/components/common/settings-sections.module.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, ShieldAlert, Fingerprint, Ban, Cookie } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/card.tsx";
import { Switch } from "@/components/common/switch.tsx";
import { rpc } from "@/lib/rpc/rpc.ts";

export function AdShieldSettings() {
  const { t } = useTranslation();
  const [adshieldEnabled, setAdshieldEnabled] = useState(true);
  const [trackingProtection, setTrackingProtection] = useState(true);
  const [totalCookieProtection, setTotalCookieProtection] = useState(true);
  const [queryStripping, setQueryStripping] = useState(true);
  const [cryptomining, setCryptomining] = useState(true);
  const [fingerprinting, setFingerprinting] = useState(true);
  const [socialTracking, setSocialTracking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const as = await rpc.getBoolPref("floorp.adshield.enabled");
        const tp = await rpc.getBoolPref("privacy.trackingprotection.enabled");
        const cb = await rpc.getIntPref("network.cookie.cookieBehavior");
        const qs = await rpc.getBoolPref("privacy.query_stripping.enabled");
        const cm = await rpc.getBoolPref("privacy.trackingprotection.cryptomining.enabled");
        const fp = await rpc.getBoolPref("privacy.trackingprotection.fingerprinting.enabled");
        const st = await rpc.getBoolPref("privacy.trackingprotection.socialtracking.enabled");

        if (mounted) {
          setAdshieldEnabled(as);
          setTrackingProtection(tp);
          setTotalCookieProtection(cb === 5);
          setQueryStripping(qs);
          setCryptomining(cm);
          setFingerprinting(fp);
          setSocialTracking(st);
        }
      } catch (e) {
        console.error("[AdShieldSettings] Error loading prefs:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleAdshield = async (checked: boolean) => {
    setAdshieldEnabled(checked);
    await rpc.setBoolPref("floorp.adshield.enabled", checked);
  };

  const handleToggleTracking = async (checked: boolean) => {
    setTrackingProtection(checked);
    await rpc.setBoolPref("privacy.trackingprotection.enabled", checked);
  };

  const handleToggleCookieProtection = async (checked: boolean) => {
    setTotalCookieProtection(checked);
    await rpc.setIntPref("network.cookie.cookieBehavior", checked ? 5 : 4);
  };

  const handleToggleQueryStripping = async (checked: boolean) => {
    setQueryStripping(checked);
    await rpc.setBoolPref("privacy.query_stripping.enabled", checked);
  };

  const handleToggleCryptomining = async (checked: boolean) => {
    setCryptomining(checked);
    await rpc.setBoolPref("privacy.trackingprotection.cryptomining.enabled", checked);
  };

  const handleToggleFingerprinting = async (checked: boolean) => {
    setFingerprinting(checked);
    await rpc.setBoolPref("privacy.trackingprotection.fingerprinting.enabled", checked);
  };

  const handleToggleSocialTracking = async (checked: boolean) => {
    setSocialTracking(checked);
    await rpc.setBoolPref("privacy.trackingprotection.socialtracking.enabled", checked);
  };

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
          {t("privacy.adshield.title", { defaultValue: "Dahili Reklam ve İzleyici Kalkanı (AdShield)" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("privacy.adshield.description", {
            defaultValue: "Herhangi bir harici eklentiye ihtiyaç duymadan, doğrudan tarayıcı çekirdeğinde çalışan yerel reklam, izleyici ve gizlilik koruması sağlar.",
          })}
        </p>

        {/* Ana AdShield Anahtarı */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-adshield-master" className="font-semibold block">
              {t("privacy.adshield.masterEnable", { defaultValue: "AdShield Kalkanını Etkinleştir" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.adshield.masterEnableDesc", {
                defaultValue: "Web sayfalarındaki bannerları, video öncesi reklamları ve rahatsız edici bildirimleri DOM düzeyinde temizler.",
              })}
            </span>
          </div>
          <Switch
            id="pref-adshield-master"
            checked={adshieldEnabled}
            aria-label={t("privacy.adshield.masterEnable", { defaultValue: "AdShield Kalkanını Etkinleştir" })}
            onChange={(e) => handleToggleAdshield(e.currentTarget.checked)}
          />
        </div>

        {/* Toplam Çerez İzolasyonu */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-cookie-isolation" className="font-semibold block flex items-center gap-1.5">
              <Cookie className="size-4 text-blue-500" />
              {t("privacy.adshield.cookieIsolation", { defaultValue: "Toplam Çerez İzolasyonu (Total Cookie Protection)" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.adshield.cookieIsolationDesc", {
                defaultValue: "Her web sitesi için ayrı bir çerez kavanozu oluşturur; reklam ağlarının siteler arasında sizi izlemesini engeller.",
              })}
            </span>
          </div>
          <Switch
            id="pref-cookie-isolation"
            checked={totalCookieProtection}
            aria-label={t("privacy.adshield.cookieIsolation", { defaultValue: "Toplam Çerez İzolasyonu" })}
            onChange={(e) => handleToggleCookieProtection(e.currentTarget.checked)}
          />
        </div>

        {/* URL Takip Parametresi Temizleme */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-query-stripping" className="font-semibold block flex items-center gap-1.5">
              <Ban className="size-4 text-amber-500" />
              {t("privacy.adshield.queryStripping", { defaultValue: "URL İzleme Parametresi Temizleme" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.adshield.queryStrippingDesc", {
                defaultValue: "Adres çubuğundaki bağlantılardan gözetleme kodlarını (fbclid, gclid, utm_* vb.) otomatik temizler.",
              })}
            </span>
          </div>
          <Switch
            id="pref-query-stripping"
            checked={queryStripping}
            aria-label={t("privacy.adshield.queryStripping", { defaultValue: "URL İzleme Parametresi Temizleme" })}
            onChange={(e) => handleToggleQueryStripping(e.currentTarget.checked)}
          />
        </div>

        {/* Parmak İzi Toplayıcıları Engelleme */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-fingerprinting" className="font-semibold block flex items-center gap-1.5">
              <Fingerprint className="size-4 text-purple-500" />
              {t("privacy.adshield.fingerprintProtection", { defaultValue: "Parmak İzi ve Font Analiz Koruması" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.adshield.fingerprintProtectionDesc", {
                defaultValue: "Cihaz donanımınız ve sistem fontlarınız üzerinden kimliğinizi tespit etmeye çalışan scriptleri durdurur.",
              })}
            </span>
          </div>
          <Switch
            id="pref-fingerprinting"
            checked={fingerprinting}
            aria-label={t("privacy.adshield.fingerprintProtection", { defaultValue: "Parmak İzi Koruması" })}
            onChange={(e) => handleToggleFingerprinting(e.currentTarget.checked)}
          />
        </div>

        {/* Kripto Madenci Engelleme */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-cryptomining" className="font-semibold block flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-red-500" />
              {t("privacy.adshield.cryptomining", { defaultValue: "Kripto Para Madenciliği Koruması" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.adshield.cryptominingDesc", {
                defaultValue: "İzniniz olmadan işlemcinizi kripto madencilik amacıyla kullanan arka plan scriptlerini bloke eder.",
              })}
            </span>
          </div>
          <Switch
            id="pref-cryptomining"
            checked={cryptomining}
            aria-label={t("privacy.adshield.cryptomining", { defaultValue: "Kripto Para Madenciliği Koruması" })}
            onChange={(e) => handleToggleCryptomining(e.currentTarget.checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
