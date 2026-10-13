/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import styles from "@/components/common/settings-sections.module.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Lock, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/card.tsx";
import { Switch } from "@/components/common/switch.tsx";
import { rpc } from "@/lib/rpc/rpc.ts";

const DOH_PROVIDERS = [
  {
    id: "cloudflare",
    name: "Cloudflare (1.1.1.1 - Hızlı ve Gizlilik Odaklı)",
    uri: "https://cloudflare-dns.com/dns-query",
    bootstrap: "1.1.1.1",
  },
  {
    id: "quad9",
    name: "Quad9 (9.9.9.9 - Kötü Amaçlı Yazılım Engelleme)",
    uri: "https://dns.quad9.net/dns-query",
    bootstrap: "9.9.9.9",
  },
  {
    id: "nextdns",
    name: "NextDNS (Özelleştirilebilir Güvenlik)",
    uri: "https://dns.nextdns.io/dns-query",
    bootstrap: "45.90.28.0",
  },
];

export function DnsSecuritySettings() {
  const { t } = useTranslation();
  const [trrMode, setTrrMode] = useState<number>(2);
  const [selectedUri, setSelectedUri] = useState<string>("https://cloudflare-dns.com/dns-query");
  const [customUri, setCustomUri] = useState<string>("");
  const [echEnabled, setEchEnabled] = useState<boolean>(true);
  const [http3Enabled, setHttp3Enabled] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mode = await rpc.getIntPref("network.trr.mode");
        const uri = await rpc.getStringPref("network.trr.uri");
        const ech = await rpc.getBoolPref("network.dns.echconfig.enabled");
        const h3 = await rpc.getBoolPref("network.http.http3.enable");

        if (mounted) {
          setTrrMode(mode);
          setSelectedUri(uri);
          setEchEnabled(ech);
          setHttp3Enabled(h3);
          if (!DOH_PROVIDERS.some((p) => p.uri === uri)) {
            setCustomUri(uri);
          }
        }
      } catch (e) {
        console.error("[DnsSecuritySettings] Error loading prefs:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleModeChange = async (mode: number) => {
    setTrrMode(mode);
    await rpc.setIntPref("network.trr.mode", mode);
  };

  const handleProviderChange = async (uri: string) => {
    setSelectedUri(uri);
    await rpc.setStringPref("network.trr.uri", uri);
    await rpc.setStringPref("network.trr.custom_uri", uri);

    const match = DOH_PROVIDERS.find((p) => p.uri === uri);
    if (match) {
      await rpc.setStringPref("network.trr.bootstrapAddress", match.bootstrap);
    }
  };

  const handleCustomUriCommit = async (val: string) => {
    setCustomUri(val);
    if (val) {
      setSelectedUri(val);
      await rpc.setStringPref("network.trr.uri", val);
      await rpc.setStringPref("network.trr.custom_uri", val);
    }
  };

  const handleToggleEch = async (checked: boolean) => {
    setEchEnabled(checked);
    await rpc.setBoolPref("network.dns.echconfig.enabled", checked);
  };

  const handleToggleHttp3 = async (checked: boolean) => {
    setHttp3Enabled(checked);
    await rpc.setBoolPref("network.http.http3.enable", checked);
  };

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-5 text-blue-600 dark:text-blue-400" />
          {t("privacy.doh.title", { defaultValue: "Güvenli DNS (DoH) ve Ağ Şifreleme" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("privacy.doh.description", {
            defaultValue: "DNS sorgularınızı şifreli HTTPS kanalı üzerinden ileterek internet servis sağlayıcınızın izlemesini ve sansürünü engeller. Ayrıca paylaşımlı IP kaynaklı bot uyarılarını önlemeye yardımcı olur.",
          })}
        </p>

        {/* DoH Modu Seçimi */}
        <div className="space-y-2">
          <label className="font-semibold block text-sm">
            {t("privacy.doh.modeLabel", { defaultValue: "DNS Güvenlik Seviyesi" })}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              type="button"
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                trrMode === 2
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
              onClick={() => handleModeChange(2)}
              aria-pressed={trrMode === 2}
            >
              <div className="font-bold text-sm mb-1 text-blue-600 dark:text-blue-400">
                {t("privacy.doh.modeRecommended", { defaultValue: "Şifreli DNS (Önerilen)" })}
              </div>
              <div>DoH üzerinden güvenli sorgular; DoH ulaşılamazsa kesinti olmaması için yerel DNS'e döner.</div>
            </button>

            <button
              type="button"
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                trrMode === 3
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
              onClick={() => handleModeChange(3)}
              aria-pressed={trrMode === 3}
            >
              <div className="font-bold text-sm mb-1 text-purple-600 dark:text-purple-400">
                {t("privacy.doh.modeStrict", { defaultValue: "Yalnızca Şifreli DNS" })}
              </div>
              <div>Her koşulda yalnızca DoH kullanır; hiçbir koşulda açık metin yerel DNS sızıntısı yapmaz.</div>
            </button>

            <button
              type="button"
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                trrMode === 0
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-semibold"
                  : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
              onClick={() => handleModeChange(0)}
              aria-pressed={trrMode === 0}
            >
              <div className="font-bold text-sm mb-1 text-gray-700 dark:text-gray-300">
                {t("privacy.doh.modeDisabled", { defaultValue: "Standart DNS" })}
              </div>
              <div>İnternet sağlayıcınızın sağladığı varsayılan şifresiz DNS kullanılır.</div>
            </button>
          </div>
        </div>

        {/* DoH Sağlayıcı Seçici */}
        {trrMode !== 0 && (
          <div className="space-y-2 pt-2">
            <label htmlFor="doh-provider-select" className="font-semibold block text-sm">
              {t("privacy.doh.providerLabel", { defaultValue: "Güvenli DNS Sağlayıcısı" })}
            </label>
            <select
              id="doh-provider-select"
              className="w-full p-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2B2A33] text-sm font-medium"
              value={DOH_PROVIDERS.some((p) => p.uri === selectedUri) ? selectedUri : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") {
                  handleProviderChange(e.target.value);
                } else {
                  handleProviderChange(customUri || "https://");
                }
              }}
            >
              {DOH_PROVIDERS.map((prov) => (
                <option key={prov.id} value={prov.uri}>
                  {prov.name}
                </option>
              ))}
              <option value="custom">Özel Sağlayıcı URL'si Girin...</option>
            </select>

            {(!DOH_PROVIDERS.some((p) => p.uri === selectedUri) || selectedUri.startsWith("custom")) && (
              <input
                type="url"
                placeholder="https://your-doh-provider.com/dns-query"
                value={customUri}
                onChange={(e) => handleCustomUriCommit(e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm mt-2"
                aria-label="Özel DoH Sunucu Adresi"
              />
            )}
          </div>
        )}

        {/* ECH (Encrypted Client Hello) */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-ech-sni" className="font-semibold block flex items-center gap-1.5">
              <Lock className="size-4 text-emerald-500" />
              {t("privacy.doh.echTitle", { defaultValue: "Encrypted Client Hello (ECH / SNI Şifreleme)" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.doh.echDesc", {
                defaultValue: "TLS bağlantılarında ziyaret ettiğiniz sitenin alan adını şifreler, ağ dinleyicilerinin alan adı adınızı görmesini engeller.",
              })}
            </span>
          </div>
          <Switch
            id="pref-ech-sni"
            checked={echEnabled}
            aria-label={t("privacy.doh.echTitle", { defaultValue: "ECH SNI Şifreleme" })}
            onChange={(e) => handleToggleEch(e.currentTarget.checked)}
          />
        </div>

        {/* HTTP/3 (QUIC) */}
        <div className={styles.row}>
          <div>
            <label htmlFor="pref-http3-quic" className="font-semibold block flex items-center gap-1.5">
              <Zap className="size-4 text-amber-500" />
              {t("privacy.doh.http3Title", { defaultValue: "HTTP/3 (QUIC) Protokol Hızlandırması" })}
            </label>
            <span className="text-xs text-muted-foreground">
              {t("privacy.doh.http3Desc", {
                defaultValue: "UDP tabanlı modern HTTP/3 protokolü ile bağlantı kurma süresini ve paket kaybı kaynaklı yavaşlamaları önler.",
              })}
            </span>
          </div>
          <Switch
            id="pref-http3-quic"
            checked={http3Enabled}
            aria-label={t("privacy.doh.http3Title", { defaultValue: "HTTP/3 Protokolü" })}
            onChange={(e) => handleToggleHttp3(e.currentTarget.checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
