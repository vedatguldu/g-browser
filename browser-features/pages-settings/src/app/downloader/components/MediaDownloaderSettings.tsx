/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import styles from "@/components/common/settings-sections.module.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Film,
  Music,
  Radio,
  Bell,
  ScanSearch,
  HardDriveDownload,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/card.tsx";
import { Switch } from "@/components/common/switch.tsx";
import { rpc } from "@/lib/rpc/rpc.ts";

export function MediaDownloaderSettings() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [autoScan, setAutoScan] = useState(true);
  const [detectVideo, setDetectVideo] = useState(true);
  const [detectAudio, setDetectAudio] = useState(true);
  const [detectStream, setDetectStream] = useState(true);
  const [notifyDetected, setNotifyDetected] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const en = await rpc.getBoolPref("floorp.mediadownloader.enabled");
        let as = true;
        let dv = true;
        let da = true;
        let ds = true;
        let nd = true;

        try { as = await rpc.getBoolPref("floorp.mediadownloader.auto_scan"); } catch { /* default */ }
        try { dv = await rpc.getBoolPref("floorp.mediadownloader.detect.video"); } catch { /* default */ }
        try { da = await rpc.getBoolPref("floorp.mediadownloader.detect.audio"); } catch { /* default */ }
        try { ds = await rpc.getBoolPref("floorp.mediadownloader.detect.stream"); } catch { /* default */ }
        try { nd = await rpc.getBoolPref("floorp.mediadownloader.notify.detected"); } catch { /* default */ }

        if (mounted) {
          setEnabled(en);
          setAutoScan(as);
          setDetectVideo(dv);
          setDetectAudio(da);
          setDetectStream(ds);
          setNotifyDetected(nd);
        }
      } catch (e) {
        console.error("[MediaDownloaderSettings] Error loading prefs:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    await rpc.setBoolPref("floorp.mediadownloader.enabled", checked);
  };

  const handleToggleAutoScan = async (checked: boolean) => {
    setAutoScan(checked);
    await rpc.setBoolPref("floorp.mediadownloader.auto_scan", checked);
  };

  const handleToggleVideo = async (checked: boolean) => {
    setDetectVideo(checked);
    await rpc.setBoolPref("floorp.mediadownloader.detect.video", checked);
  };

  const handleToggleAudio = async (checked: boolean) => {
    setDetectAudio(checked);
    await rpc.setBoolPref("floorp.mediadownloader.detect.audio", checked);
  };

  const handleToggleStream = async (checked: boolean) => {
    setDetectStream(checked);
    await rpc.setBoolPref("floorp.mediadownloader.detect.stream", checked);
  };

  const handleToggleNotify = async (checked: boolean) => {
    setNotifyDetected(checked);
    await rpc.setBoolPref("floorp.mediadownloader.notify.detected", checked);
  };

  return (
    <div className="space-y-6">
      {/* Ana Ortam İndirici Kartı */}
      <Card className={styles.section}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5 text-blue-600 dark:text-blue-400" />
            {t("downloader.title", { defaultValue: "Dahili Ortam ve Video İndirici" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("downloader.description", {
              defaultValue:
                "Ziyaret ettiğiniz web sayfalarındaki video, ses ve canlı yayın akışlarını tarayıcının yerel çekirdeği ile tespit eder. Harici uzantılara, reklamlı üçüncü parti indirme sitelerine veya ek yazılımlara gerek kalmadan doğrudan güvenli indirme sağlar.",
            })}
          </p>

          {/* Ana Etkinleştirme Anahtarı */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-downloader-master" className="font-semibold block">
                {t("downloader.masterEnable", { defaultValue: "Ortam İndiriciyi Etkinleştir" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.masterEnableDesc", {
                  defaultValue: "Adres çubuğunda indirme butonunu görüntüler ve sayfalardaki medya içeriklerini listeler.",
                })}
              </span>
            </div>
            <Switch
              id="pref-downloader-master"
              checked={enabled}
              aria-label={t("downloader.masterEnable", { defaultValue: "Ortam İndiriciyi Etkinleştir" })}
              onChange={(e) => handleToggleEnabled(e.currentTarget.checked)}
            />
          </div>

          {/* Otomatik Sayfa Taraması */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-downloader-autoscan" className="font-semibold block flex items-center gap-1.5">
                <ScanSearch className="size-4 text-emerald-500" />
                {t("downloader.autoScan", { defaultValue: "Otomatik Medya Taraması" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.autoScanDesc", {
                  defaultValue: "Sayfa yüklendiğinde ve sekmeler arasında geçiş yapıldığında arka planda ortam içeriklerini sessizce tara.",
                })}
              </span>
            </div>
            <Switch
              id="pref-downloader-autoscan"
              checked={autoScan}
              disabled={!enabled}
              aria-label={t("downloader.autoScan", { defaultValue: "Otomatik Medya Taraması" })}
              onChange={(e) => handleToggleAutoScan(e.currentTarget.checked)}
            />
          </div>

          {/* Adres Çubuğu Sayaç Rozeti */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-downloader-notify" className="font-semibold block flex items-center gap-1.5">
                <Bell className="size-4 text-amber-500" />
                {t("downloader.badgeCount", { defaultValue: "Adres Çubuğu Sayaç Rozeti" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.badgeCountDesc", {
                  defaultValue: "Sayfada indirilebilir video veya ses içeriği tespit edildiğinde simge üzerinde bulunan dosya adedini göster.",
                })}
              </span>
            </div>
            <Switch
              id="pref-downloader-notify"
              checked={notifyDetected}
              disabled={!enabled}
              aria-label={t("downloader.badgeCount", { defaultValue: "Adres Çubuğu Sayaç Rozeti" })}
              onChange={(e) => handleToggleNotify(e.currentTarget.checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Algılanacak Medya Türleri Kartı */}
      <Card className={styles.section}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveDownload className="size-5 text-indigo-600 dark:text-indigo-400" />
            {t("downloader.typesTitle", { defaultValue: "Algılanacak Medya Türleri" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("downloader.typesDesc", {
              defaultValue:
                "Tarayıcının hangi ortam dosyalarını yakalayacağını seçin. Seçilen tüm formatlar tek tıkla doğrudan işletim sisteminin yerel indirme klasörüne kaydedilebilir.",
            })}
          </p>

          {/* Video Dosyaları */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-detect-video" className="font-semibold block flex items-center gap-1.5">
                <Film className="size-4 text-cyan-500" />
                {t("downloader.detectVideo", { defaultValue: "Video Dosyaları (MP4, WebM, MKV, M4V)" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.detectVideoDesc", {
                  defaultValue: "HTML5 video etiketlerini ve doğrudan video bağlantılarını tespit eder.",
                })}
              </span>
            </div>
            <Switch
              id="pref-detect-video"
              checked={detectVideo}
              disabled={!enabled}
              aria-label={t("downloader.detectVideo", { defaultValue: "Video Dosyaları" })}
              onChange={(e) => handleToggleVideo(e.currentTarget.checked)}
            />
          </div>

          {/* Ses Dosyaları */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-detect-audio" className="font-semibold block flex items-center gap-1.5">
                <Music className="size-4 text-violet-500" />
                {t("downloader.detectAudio", { defaultValue: "Ses Dosyaları (MP3, WAV, OGG, FLAC, AAC)" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.detectAudioDesc", {
                  defaultValue: "Müzik çalarları, podcast ses dosyalarını ve ses bağlantılarını tespit eder.",
                })}
              </span>
            </div>
            <Switch
              id="pref-detect-audio"
              checked={detectAudio}
              disabled={!enabled}
              aria-label={t("downloader.detectAudio", { defaultValue: "Ses Dosyaları" })}
              onChange={(e) => handleToggleAudio(e.currentTarget.checked)}
            />
          </div>

          {/* Canlı Yayın ve HLS Akışları */}
          <div className={styles.row}>
            <div>
              <label htmlFor="pref-detect-stream" className="font-semibold block flex items-center gap-1.5">
                <Radio className="size-4 text-rose-500" />
                {t("downloader.detectStream", { defaultValue: "HLS ve Canlı Yayın Akışları (M3U8)" })}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("downloader.detectStreamDesc", {
                  defaultValue: "Canlı yayın ve parçalı akış oynatma listelerini yakalar, doğrudan akış adresini kopyalama veya kaydetme imkanı sunar.",
                })}
              </span>
            </div>
            <Switch
              id="pref-detect-stream"
              checked={detectStream}
              disabled={!enabled}
              aria-label={t("downloader.detectStream", { defaultValue: "HLS ve Canlı Yayın Akışları" })}
              onChange={(e) => handleToggleStream(e.currentTarget.checked)}
            />
          </div>

          {/* Güvenlik & Gizlilik Bilgi Kutusu */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 mt-2">
            <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
              <span className="font-medium block mb-0.5">
                {t("downloader.privacyNoticeTitle", { defaultValue: "Tamamen Yerel ve Güvenli Çalışma Mantığı" })}
              </span>
              {t("downloader.privacyNoticeText", {
                defaultValue:
                  "Floorp Ortam İndirici, tarama ve indirme işlemlerini doğrudan Gecko yerel indirme motoru (Downloads.sys.mjs) ile cihazınızda gerçekleştirir. Hiçbir URL veya ortam verisi harici sunuculara veya üçüncü parti servislere iletilmez.",
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
