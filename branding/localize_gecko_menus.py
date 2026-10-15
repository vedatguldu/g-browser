#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Localizes Gecko menu bars, context menus, and app menu to 100% Turkish
with pure G-Browser branding:
- browser/localization/en-US/browser/menubar.ftl
- browser/localization/en-US/browser/appmenu.ftl
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = ROOT / "_dist" / "package" / "floorp"
BROWSER_L10N = PACKAGE_DIR / "browser" / "localization" / "en-US" / "browser"

TURKISH_MENUBAR_FTL = """# G-Browser Turkish Menubar Localization

menu-application-preferences =
    .label = Tercihler
menu-application-settings =
    .label = Ayarlar…
menu-application-set-as-default =
    .label = G-Browser'ı Varsayılan Tarayıcı Yap
menu-application-referrals2 =
    .label = G-Browser'ı Paylaş
menu-application-services =
    .label = Servisler
menu-application-hide-this =
    .label = G-Browser'ı Gizle
menu-application-hide-other =
    .label = Diğerlerini Gizle
menu-application-show-all =
    .label = Tümünü Göster
menu-application-touch-bar =
    .label = Touch Bar'ı Özelleştir…

menu-quit =
    .label = Çıkış
    .accesskey = x

menu-quit-mac =
    .label = G-Browser'dan Çık
menu-about =
    .label = G-Browser Hakkında
    .accesskey = H

# Dosya Menüsü
menu-file =
    .label = Dosya
    .accesskey = D
menu-file-new-tab =
    .label = Yeni Sekme
    .accesskey = T
menu-file-new-container-tab =
    .label = Yeni Konteyner Sekmesi
    .accesskey = K
menu-file-new-window =
    .label = Yeni Pencere
    .accesskey = P
menu-file-new-private-window =
    .label = Yeni Gizli Pencere
    .accesskey = G
menu-file-open-location =
    .label = Konum Aç…
menu-file-open-file =
    .label = Dosya Aç…
    .accesskey = A
menu-file-close-tab =
    .label = Sekmeyi Kapat
    .accesskey = C
menu-file-close-window =
    .label = Pencereyi Kapat
    .accesskey = W
menu-file-save-page =
    .label = Sayfayı Farklı Kaydet…
    .accesskey = S
menu-file-email-link =
    .label = Bağlantıyı E-posta ile Gönder…
    .accesskey = E
menu-file-share-url =
    .label = Paylaş
    .accesskey = y
menu-file-share-qrcode =
    .label = QR Kod Oluştur…
    .accesskey = Q
menu-file-share-qrcode2 =
    .label = QR Kod Oluştur
    .accesskey = Q
menu-file-print-setup =
    .label = Sayfa Yapısı…
    .accesskey = u
menu-file-print =
    .label = Yazdır…
    .accesskey = Y
menu-file-import-from-another-browser =
    .label = Başka Bir Tarayıcıdan İçe Aktar…
    .accesskey = I
menu-file-go-offline =
    .label = Çevrimdışı Çalış
    .accesskey = k

# Düzen Menüsü
menu-edit =
    .label = Düzen
    .accesskey = z
menu-edit-undo =
    .label = Geri Al
    .accesskey = G
menu-edit-redo =
    .label = Yinele
    .accesskey = Y
menu-edit-cut =
    .label = Kes
    .accesskey = K
menu-edit-copy =
    .label = Kopyala
    .accesskey = C
menu-edit-paste =
    .label = Yapıştır
    .accesskey = P
menu-edit-delete =
    .label = Sil
    .accesskey = S
menu-edit-select-all =
    .label = Tümünü Seç
    .accesskey = A
menu-edit-find-on-page =
    .label = Sayfada Bul…
    .accesskey = F
menu-edit-find-again =
    .label = Sonrakini Bul
    .accesskey = N
menu-edit-find-previous =
    .label = Öncekini Bul
    .accesskey = v
menu-edit-bidi-switch-text-direction =
    .label = Metin Yönünü Değiştir
    .accesskey = M

# Görünüm Menüsü
menu-view =
    .label = Görünüm
    .accesskey = G
menu-view-toolbars-menu =
    .label = Araç Çubukları
    .accesskey = T
menu-view-customize-toolbar2 =
    .label = Araç Çubuğunu Özelleştir…
    .accesskey = C
menu-view-sidebar =
    .label = Kenar Çubuğu
    .accesskey = B
menu-view-bookmarks =
    .label = Yer İmleri
menu-view-history-button =
    .label = Geçmiş
menu-view-synced-tabs-sidebar =
    .label = Eşitlenmiş Sekmeler
menu-view-full-zoom =
    .label = Yakınlaştırma
    .accesskey = Z
menu-view-full-zoom-enlarge =
    .label = Yakınlaştır
    .accesskey = I
menu-view-full-zoom-reduce =
    .label = Uzaklaştır
    .accesskey = O
menu-view-full-zoom-actual-size =
    .label = Sıfırla
    .accesskey = R
menu-view-full-zoom-toggle =
    .label = Yalnızca Metni Yakınlaştır
    .accesskey = T
menu-view-page-style-menu =
    .label = Sayfa Stili
    .accesskey = y
menu-view-page-style-no-style =
    .label = Stil Yok
    .accesskey = N
menu-view-page-basic-style =
    .label = Temel Sayfa Stili
    .accesskey = b
menu-view-repair-text-encoding =
    .label = Metin Kodlamasını Onar
    .accesskey = c
menu-view-enter-full-screen =
    .label = Tam Ekran
    .accesskey = F
menu-view-exit-full-screen =
    .label = Tam Ekrandan Çık
    .accesskey = F
menu-view-full-screen =
    .label = Tam Ekran
    .accesskey = F

# Geçmiş Menüsü
menu-history =
    .label = Geçmiş
    .accesskey = e
menu-history-show-all-history =
    .label = Tüm Geçmişi Göster
    .accesskey = H
menu-history-clear-recent-history =
    .label = Yakın Geçmişi Temizle…
    .accesskey = S
menu-history-synced-tabs =
    .label = Eşitlenmiş Sekmeler
    .accesskey = y
menu-history-restore-last-session =
    .label = Önceki Oturumu Geri Yükle
    .accesskey = R
menu-history-hidden-tabs =
    .label = Gizli Sekmeler
    .accesskey = d
menu-history-undo-menu =
    .label = Son Kapatılan Sekmeler
    .accesskey = C
menu-history-undo-window-menu =
    .label = Son Kapatılan Pencereler
    .accesskey = W

# Yer İmleri Menüsü
menu-bookmarks-menu =
    .label = Yer İmleri
    .accesskey = B
menu-bookmarks-all-bookmarks =
    .label = Tüm Yer İmlerini Yönet
    .accesskey = M
menu-bookmark-this-page =
    .label = Bu Sayfayı Yer İmlerine Ekle
    .accesskey = d
menu-bookmark-edit =
    .label = Bu Yer İmini Düzenle
    .accesskey = E
menu-bookmarks-current-tab =
    .label = Sekmeyi Yer İmlerine Ekle…
    .accesskey = T
menu-bookmarks-search =
    .label = Yer İmlerinde Ara
    .accesskey = S
menu-bookmarks-toolbar =
    .label = Yer İmleri Araç Çubuğu
    .accesskey = B
menu-bookmarks-other =
    .label = Diğer Yer İmleri
    .accesskey = O
menu-bookmarks-mobile =
    .label = Mobil Yer İmleri
    .accesskey = M

# Araçlar Menüsü
menu-tools =
    .label = Araçlar
    .accesskey = T
menu-tools-downloads =
    .label = İndirilenler
    .accesskey = D
menu-tools-addons-and-themes =
    .label = Eklentiler ve Temalar
    .accesskey = A
menu-tools-fxa-sign-in2 =
    .label = Giriş Yap…
    .accesskey = g
menu-tools-turn-on-sync2 =
    .label = Eşitlemeyi Aç…
    .accesskey = n
menu-tools-sync-now2 =
    .label = Şimdi Eşitle
    .accesskey = S
menu-tools-browser-tools =
    .label = Tarayıcı Araçları
    .accesskey = B
menu-tools-task-manager =
    .label = Görev Yöneticisi
    .accesskey = M
menu-tools-page-source =
    .label = Sayfa Kaynağı
    .accesskey = u
menu-tools-page-info =
    .label = Sayfa Bilgisi
    .accesskey = I
menu-settings =
    .label = Ayarlar
    .accesskey = S

# Pencere Menüsü
menu-window-menu =
    .label = Pencere
    .accesskey = P
menu-window-bring-all-to-front =
    .label = Tümünü Öne Getir

# Yardım Menüsü
menu-help =
    .label = Yardım
    .accesskey = Y
menu-get-help =
    .label = G-Browser Yardımı
    .accesskey = H
menu-help-more-troubleshooting-info =
    .label = Sorun Giderme Bilgileri
    .accesskey = T
menu-help-share-ideas =
    .label = Fikir ve Geri Bildirim Paylaş…
    .accesskey = S
menu-help-enter-troubleshoot-mode2 =
    .label = Sorun Giderme Modu…
    .accesskey = M
menu-help-exit-troubleshoot-mode =
    .label = Sorun Giderme Modunu Kapat
    .accesskey = M
menu-help-switch-device =
    .label = Yeni Cihaza Geçiş
    .accesskey = N
menu-help-report-deceptive-site =
    .label = Yanıltıcı Siteyi Bildir…
    .accesskey = D
menu-help-not-deceptive =
    .label = Bu Site Yanıltıcı Değil…
    .accesskey = D
menu-report-broken-site =
    .label = Bozuk Siteyi Bildir
menu-referrals2 =
    .label = G-Browser'ı Paylaş
"""

TURKISH_APPMENU_FTL = """# G-Browser Turkish AppMenu Localization

appmenuitem-banner-update-downloading =
    .label = G-Browser güncellemesi indiriliyor
appmenuitem-banner-update-available =
    .label = Güncelleme mevcut — şimdi indir
appmenuitem-banner-update-manual =
    .label = Güncelleme mevcut — şimdi indir
appmenuitem-banner-update-unsupported =
    .label = Güncellenemiyor — sistem uyumsuz
appmenuitem-banner-update-restart =
    .label = Güncelleme hazır — yeniden başlat

appmenu-nova-update-title = G-Browser'ı güncellemek için yeniden başlatın
appmenu-nova-update-description = Sekmeleriniz otomatik olarak yeniden açılacaktır.

appmenu-nova-fxa-sign-in = Giriş yap
appmenu-nova-switch-device-promo =
    .message = Yeni bir cihaza mı geçiyorsunuz? G-Browser'ı yanınıza alın!
appmenu-nova-switch-device-link = Verilerinizi nasıl aktarabilirsiniz?

appmenuitem-new-tab =
    .label = Yeni Sekme
appmenuitem-new-window =
    .label = Yeni Pencere
appmenuitem-new-private-window =
    .label = Yeni Gizli Pencere
appmenuitem-history =
    .label = Geçmiş
appmenuitem-tab-groups =
    .label = Sekme Grupları
appmenuitem-downloads =
    .label = İndirilenler
appmenuitem-passwords =
    .label = Şifreler
appmenuitem-extensions-and-themes =
    .label = Eklentiler ve Temalar
appmenuitem-extensions =
    .label = Eklentiler
appmenuitem-print =
    .label = Yazdır…
appmenuitem-find-in-page =
    .label = Sayfada Bul…
appmenuitem-translate =
    .label = Sayfayı Çevir…
appmenuitem-zoom =
    .value = Yakınlaştır

appmenuitem-referrals =
    .label = G-Browser'ı Paylaş
appmenuitem-more-tools =
    .label = Diğer Araçlar
appmenuitem-help-and-report =
    .label = Yardım ve Destek
appmenuitem-exit2 =
    .label = Çıkış
appmenu-menu-button-closed2 =
    .tooltiptext = Uygulama menüsünü aç
    .label = G-Browser
appmenu-menu-button-opened2 =
    .tooltiptext = Uygulama menüsünü kapat
    .label = G-Browser

appmenuitem-settings =
    .label = Ayarlar

appmenuitem-zoom-enlarge =
    .label = Yakınlaştır
appmenuitem-zoom-reduce =
    .label = Uzaklaştır
appmenuitem-fullscreen =
    .label = Tam Ekran

appmenu-remote-tabs-sign-into-sync =
    .label = Eşitleme için giriş yap…
appmenu-remote-tabs-turn-on-sync =
    .label = Eşitlemeyi aç…
appmenu-remote-tabs-showmore =
    .label = Daha fazla sekme göster
    .tooltiptext = Bu cihazdaki daha fazla sekmeyi göster
appmenu-remote-tabs-show-inactive-tabs =
    .label = Etkin olmayan sekmeler
    .tooltiptext = Bu cihazdaki etkin olmayan sekmeleri inceleyin
appmenu-remote-tabs-notabs = Açık sekme yok
"""


def localize_menus():
    if not BROWSER_L10N.exists():
        print(f"Browser l10n directory not found: {BROWSER_L10N}")
        return

    # 1. menubar.ftl
    menubar_file = BROWSER_L10N / "menubar.ftl"
    menubar_file.write_text(TURKISH_MENUBAR_FTL, encoding="utf-8")
    print(f"  Localized: {menubar_file.relative_to(ROOT)}")

    # 2. appmenu.ftl
    appmenu_file = BROWSER_L10N / "appmenu.ftl"
    appmenu_file.write_text(TURKISH_APPMENU_FTL, encoding="utf-8")
    print(f"  Localized: {appmenu_file.relative_to(ROOT)}")

    # 3. tabContextMenu.ftl and toolbarContextMenu.ftl brand replacements
    for ftl_name in ["tabContextMenu.ftl", "toolbarContextMenu.ftl", "allTabsMenu.ftl", "sidebarMenu.ftl"]:
        fp = BROWSER_L10N / ftl_name
        if fp.exists():
            content = fp.read_text(encoding="utf-8")
            content = content.replace("Floorp", "G-Browser").replace("Ablaze", "G-Browser")
            fp.write_text(content, encoding="utf-8")
            print(f"  Rebranded: {fp.relative_to(ROOT)}")


if __name__ == "__main__":
    print("[branding] Localizing Gecko Alt menus and application menu to Turkish...")
    localize_menus()
    print("[branding] Menu localization complete.")
