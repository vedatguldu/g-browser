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

ENGLISH_MENUBAR_FTL = """# G-Browser English/International Menubar Localization

menu-application-preferences =
    .label = Preferences
menu-application-settings =
    .label = Settings…
menu-application-set-as-default =
    .label = Set G-Browser as Default Browser
menu-application-referrals2 =
    .label = Share G-Browser
menu-application-services =
    .label = Services
menu-application-hide-this =
    .label = Hide G-Browser
menu-application-hide-other =
    .label = Hide Others
menu-application-show-all =
    .label = Show All
menu-application-touch-bar =
    .label = Customize Touch Bar…

menu-quit =
    .label = Exit
    .accesskey = x

menu-quit-mac =
    .label = Quit G-Browser
menu-about =
    .label = About G-Browser
    .accesskey = A

menu-file =
    .label = File
    .accesskey = F
menu-file-new-tab =
    .label = New Tab
    .accesskey = T
menu-file-new-container-tab =
    .label = New Container Tab
    .accesskey = b
menu-file-new-window =
    .label = New Window
    .accesskey = N
menu-file-new-private-window =
    .label = New Private Window
    .accesskey = W
menu-file-open-location =
    .label = Open Location…
menu-file-open-file =
    .label = Open File…
    .accesskey = O
menu-file-close-tab =
    .label = Close Tab
    .accesskey = C
menu-file-close-window =
    .label = Close Window
    .accesskey = d
menu-file-save-page =
    .label = Save Page As…
    .accesskey = A
menu-file-email-link =
    .label = Email Link…
    .accesskey = E
menu-file-share-url =
    .label = Share
    .accesskey = h
menu-file-share-qrcode =
    .label = Generate QR Code…
    .accesskey = Q
menu-file-share-qrcode2 =
    .label = Generate QR Code
    .accesskey = Q
menu-file-print-setup =
    .label = Page Setup…
    .accesskey = u
menu-file-print =
    .label = Print…
    .accesskey = P
menu-file-import-from-another-browser =
    .label = Import from Another Browser…
    .accesskey = I
menu-file-go-offline =
    .label = Work Offline
    .accesskey = k

menu-edit =
    .label = Edit
    .accesskey = E
menu-edit-find-in-page =
    .label = Find in Page…
    .accesskey = F
menu-edit-find-again =
    .label = Find Again
    .accesskey = g
menu-edit-bidi-switch-text-direction =
    .label = Switch Text Direction
    .accesskey = w

menu-view =
    .label = View
    .accesskey = V
menu-view-toolbars-menu =
    .label = Toolbars
    .accesskey = T
menu-view-customize-toolbar2 =
    .label = Customize Toolbar…
    .accesskey = C
menu-view-sidebar =
    .label = Sidebar
    .accesskey = e
menu-view-bookmarks =
    .label = Bookmarks
menu-view-history-button =
    .label = History
menu-view-synced-tabs-sidebar =
    .label = Synced Tabs
menu-view-full-zoom =
    .label = Zoom
    .accesskey = Z
menu-view-full-zoom-enlarge =
    .label = Zoom In
    .accesskey = I
menu-view-full-zoom-reduce =
    .label = Zoom Out
    .accesskey = O
menu-view-full-zoom-actual-size =
    .label = Actual Size
    .accesskey = A
menu-view-full-zoom-toggle =
    .label = Zoom Text Only
    .accesskey = T
menu-view-page-style-menu =
    .label = Page Style
    .accesskey = y
menu-view-page-style-no-style =
    .label = No Style
    .accesskey = n
menu-view-page-basic-style =
    .label = Basic Page Style
    .accesskey = B
menu-view-repair-text-encoding =
    .label = Repair Text Encoding
    .accesskey = c
menu-view-enter-full-screen =
    .label = Enter Full Screen
    .accesskey = F
menu-view-exit-full-screen =
    .label = Exit Full Screen
    .accesskey = F
menu-view-full-screen =
    .label = Full Screen
    .accesskey = F
menu-view-enter-readerview =
    .label = Enter Reader View
    .accesskey = R
menu-view-close-readerview =
    .label = Close Reader View
    .accesskey = R
menu-view-show-all-tabs =
    .label = Show All Tabs
    .accesskey = A
menu-view-bidi-switch-page-direction =
    .label = Switch Page Direction
    .accesskey = D

menu-history =
    .label = History
    .accesskey = s
menu-history-show-all-history =
    .label = Show All History
menu-history-clear-recent-history =
    .label = Clear Recent History…
menu-history-synced-tabs =
    .label = Synced Tabs
menu-history-restore-last-session =
    .label = Restore Previous Session
menu-history-hidden-tabs =
    .label = Hidden Tabs
menu-history-undo-menu =
    .label = Recently Closed Tabs
menu-history-undo-window-menu =
    .label = Recently Closed Windows
menu-history-search =
    .label = Search History

menu-bookmarks-menu =
    .label = Bookmarks
    .accesskey = B
menu-bookmarks-manage =
    .label = Manage Bookmarks
menu-bookmark-tab =
    .label = Bookmark Current Tab…
menu-edit-bookmark =
    .label = Edit This Bookmark…
menu-bookmarks-all-tabs =
    .label = Bookmark All Tabs…
menu-bookmarks-toolbar =
    .label = Bookmarks Toolbar
menu-bookmarks-other =
    .label = Other Bookmarks
menu-bookmarks-mobile =
    .label = Mobile Bookmarks
menu-bookmarks-search =
    .label = Search Bookmarks

menu-tools =
    .label = Tools
    .accesskey = T
menu-tools-downloads =
    .label = Downloads
    .accesskey = D
menu-tools-addons-and-themes =
    .label = Add-ons and Themes
    .accesskey = A
menu-tools-fxa-sign-in2 =
    .label = Sign in to Sync…
    .accesskey = S
menu-tools-turn-on-sync2 =
    .label = Turn on Sync…
    .accesskey = n
menu-tools-sync-now =
    .label = Sync Now
    .accesskey = N
menu-tools-fxa-re-auth =
    .label = Reconnect to { -brand-product-name }…
    .accesskey = R
menu-tools-browser-tools =
    .label = Browser Tools
    .accesskey = B
menu-tools-task-manager =
    .label = Task Manager
    .accesskey = M
menu-tools-page-source =
    .label = Page Source
    .accesskey = o
menu-tools-page-info =
    .label = Page Info
    .accesskey = I
menu-settings =
    .label = Settings
    .accesskey = S
menu-preferences =
    .label = Preferences
    .accesskey = P
menu-tools-layout-debugger =
    .label = Layout Debugger
    .accesskey = L

menu-window-menu =
    .label = Window
menu-window-bring-all-to-front =
    .label = Bring All to Front

menu-help =
    .label = Help
    .accesskey = H
menu-get-help =
    .label = Get Help
    .accesskey = H
menu-help-more-troubleshooting-info =
    .label = More Troubleshooting Information
    .accesskey = T
menu-help-report-site-issue =
    .label = Report Site Issue…
menu-help-share-ideas =
    .label = Share Ideas and Feedback…
    .accesskey = S
menu-help-enter-troubleshoot-mode2 =
    .label = Troubleshoot Mode…
    .accesskey = M
menu-help-exit-troubleshoot-mode =
    .label = Turn Troubleshoot Mode Off
    .accesskey = M
menu-help-switch-device =
    .label = Switching to a New Device
    .accesskey = N
menu-help-safe-mode-without-addons =
    .label = Restart with Add-ons Disabled…
    .accesskey = R
menu-help-safe-mode-with-addons =
    .label = Restart with Add-ons Enabled
    .accesskey = R
menu-help-import-from-another-browser =
    .label = Import from Another Browser…
    .accesskey = I
menu-help-report-deceptive-site =
    .label = Report Deceptive Site…
    .accesskey = D
menu-help-not-deceptive =
    .label = This Isn't a Deceptive Site…
    .accesskey = d
menu-report-broken-site =
    .label = Report Broken Site
"""

ENGLISH_APPMENU_FTL = """# G-Browser English/International AppMenu Localization

appmenuitem-banner-update-downloading =
    .label = Downloading G-Browser update
appmenuitem-banner-update-available =
    .label = Update available — download now
appmenuitem-banner-update-manual =
    .label = Update available — download now
appmenuitem-banner-update-unsupported =
    .label = Unable to update — system incompatible
appmenuitem-banner-update-restart =
    .label = Update available — restart now

appmenuitem-new-tab =
    .label = New Tab
appmenuitem-new-window =
    .label = New Window
appmenuitem-new-private-window =
    .label = New Private Window
appmenuitem-history =
    .label = History
appmenuitem-downloads =
    .label = Downloads
appmenuitem-passwords =
    .label = Passwords
appmenuitem-addons-and-themes =
    .label = Add-ons and Themes
appmenuitem-print =
    .label = Print…
appmenuitem-find-in-page =
    .label = Find in Page…
appmenuitem-translate =
    .label = Translate Page…
appmenuitem-zoom =
    .value = Zoom
appmenuitem-more-tools =
    .label = More Tools
appmenuitem-help =
    .label = Help
appmenuitem-exit2 =
    .label = Exit
appmenu-menu-button-closed2 =
    .tooltiptext = Open Application Menu
    .label = G-Browser
appmenu-menu-button-opened2 =
    .tooltiptext = Close Application Menu
    .label = G-Browser
appmenuitem-settings =
    .label = Settings
appmenuitem-zoom-enlarge =
    .label = Zoom In
appmenuitem-zoom-reduce =
    .label = Zoom Out
appmenuitem-fullscreen =
    .label = Full Screen
"""


def apply_menus_to_directory(base_l10n: Path):
    if not base_l10n.exists():
        return

    # 1. menubar.ftl (default Turkish + .tr.ftl and .en.ftl variants for multi-language installer)
    menubar_file = base_l10n / "menubar.ftl"
    menubar_file.write_text(TURKISH_MENUBAR_FTL, encoding="utf-8")
    (base_l10n / "menubar.tr.ftl").write_text(TURKISH_MENUBAR_FTL, encoding="utf-8")
    (base_l10n / "menubar.en.ftl").write_text(ENGLISH_MENUBAR_FTL, encoding="utf-8")
    print(f"  Localized menubar (tr + en variants): {menubar_file}")

    # 2. appmenu.ftl (default Turkish + .tr.ftl and .en.ftl variants for multi-language installer)
    appmenu_file = base_l10n / "appmenu.ftl"
    appmenu_file.write_text(TURKISH_APPMENU_FTL, encoding="utf-8")
    (base_l10n / "appmenu.tr.ftl").write_text(TURKISH_APPMENU_FTL, encoding="utf-8")
    (base_l10n / "appmenu.en.ftl").write_text(ENGLISH_APPMENU_FTL, encoding="utf-8")
    print(f"  Localized appmenu (tr + en variants): {appmenu_file}")

    # 3. context menus brand replacements
    for ftl_name in ["tabContextMenu.ftl", "toolbarContextMenu.ftl", "allTabsMenu.ftl", "sidebarMenu.ftl"]:
        fp = base_l10n / ftl_name
        if fp.exists():
            content = fp.read_text(encoding="utf-8")
            content = content.replace("Floorp", "G-Browser").replace("Ablaze", "G-Browser")
            fp.write_text(content, encoding="utf-8")
            print(f"  Rebranded: {fp}")


def localize_menus():
    targets = [
        PACKAGE_DIR / "browser" / "localization" / "en-US" / "browser",
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\G-Browser\browser\localization\en-US\browser")),
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Floorp\browser\localization\en-US\browser")),
    ]
    for target in targets:
        if target.exists():
            apply_menus_to_directory(target)


if __name__ == "__main__":
    print("[branding] Localizing Gecko Alt menus and application menu (TR + EN/Intl)...")
    localize_menus()
    print("[branding] Menu localization complete.")

