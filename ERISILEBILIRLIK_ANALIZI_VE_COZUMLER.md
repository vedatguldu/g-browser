# Floorp Browser (Floorp 12 - Noraneko) Kapsamlı Erişilebilirlik Analizi ve Çözüm Planı

Bu belge, Floorp Browser kaynak kodları üzerinde gerçekleştirilen derinlemesine erişilebilirlik incelemesini, tespit edilen kritik eksiklikleri ve WCAG 2.2 Seviye AAA ile WAI-ARIA 1.2 standartlarına tam uyum sağlayacak mimari çözümleri içerir.

---

## 1. Mimari Temel ve Gecko Erişilebilirlik Altyapısı

### Mimari Katmanlar
Floorp 12 üç farklı arayüz ve çalışma katmanından oluşur:
* Gecko Çekirdek Motoru: Firefox'un yerel erişilebilirlik motoru olan `nsAccessibilityService`, işletim sistemine IAccessible2 (Windows), MSAA ve UI Automation (UIA) erişilebilirlik ağaçlarını sunar.
* Browser Chrome Katmanı (SolidJS + `@nora/solid-xul`): Sekme çubuğu, bölünmüş ekran, komut paleti, yan paneller ve durum çubuğu SolidJS reaktifliği ile doğrudan Gecko XUL düğümleri (`document.createXULElement`) üzerinden render edilir.
* Ayarlar ve Dahili Sayfalar Katmanı (React + Tailwind): `about:preferences` ve Floorp'a özgü ayar sayfaları standart HTML ve React DOM üzerinde çalışır.

### Karşılaşılan Temel Mimari Sorun
`@nora/solid-xul` kütüphanesi ile dinamik olarak oluşturulan özel XUL kutuları (`<box>`, `<vbox>`, `<hbox>`), varsayılan olarak Gecko erişilebilirlik motoru tarafından anlamsız yerleşim kapsayıcısı (generic container) olarak değerlendirilir. Bu elemanlara açık WAI-ARIA rolleri (`role`), erişilebilir isimler (`accessible name`), durum bilgileri (`state`) ve klavye etkileşimleri bağlanmadığı takdirde NVDA, JAWS ve Windows Ekran Okuyucusu (Narrator) bu bileşenleri tamamen atlar veya sessiz kalır.

---

## 2. Komut Paleti (Command Palette)

İlgili Dosyalar:
* `browser-features/chrome/common/command-palette/components/SearchInput.tsx`
* `browser-features/chrome/common/command-palette/components/CommandList.tsx`
* `browser-features/chrome/common/command-palette/components/CommandItem.tsx`
* `browser-features/chrome/common/command-palette/components/CommandPalette.tsx`

### Tespit Edilen Sorunlar
* `SearchInput.tsx` dosyasında arama kutusu standart bir `<input type="text">` olarak tanımlanmıştır. WAI-ARIA 1.2 Combobox deseninin gerektirdiği `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="true"`, `aria-haspopup="listbox"` ve `aria-controls="command-palette-list"` öznitelikleri bulunmamaktadır.
* Sanal odak eksikliği: Kullanıcı arama kutusundayken Aşağı ve Yukarı ok tuşlarına bastığında odak fiziksel olarak arama kutusunda kalır. Ancak seçili liste elemanının kimliği `aria-activedescendant` üzerinden arama kutusuna iletilmediği için ekran okuyucu seçilen komutun adını, açıklamasını ve klavye kısayolunu seslendiremez.
* ARIA hiyerarşi kırılması: `CommandItem.tsx` içindeki her komut elemanı `role="option"` almışken, `CommandList.tsx` içindeki üst liste elemanı `role="listbox"` ve benzersiz bir kimlik (`id`) almamıştır. Bu durum erişilebilirlik denetleyicilerinde sözdizimi ve semantik hatasına yol açar.
* Canlı sonuç anonsu eksikliği: Arama terimi yazıldığında filtrelenen komut sayısı (örneğin "8 komut bulundu" veya "Eşleşen komut yok") ekran okuyucuya canlı olarak bildirilmemektedir.
* Odak iadesi (Focus Restoration) eksikliği: ESC tuşuna basılarak palet kapatıldığında veya bir komut çalıştırıldığında odak bazen kaybolmakta, palet açılmadan önce kullanıcının bulunduğu web içeriğine veya araç çubuğuna kararlı şekilde geri dönmemektedir.

### Mimari Çözümler
* WAI-ARIA 1.2 Combobox Deseni:
  * Arama girişine `role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"`, `aria-haspopup="listbox"` ve `aria-controls="command-palette-listbox"` öznitelikleri eklenecektir.
* Dinamik `aria-activedescendant` Senkronizasyonu:
  * Listedeki her komut elemanına `id={"cp-item-" + index}` atanacaktır.
  * Arama kutusuna `aria-activedescendant={selectedIndex() >= 0 ? "cp-item-" + selectedIndex() : undefined}` bağlanarak ok tuşlarıyla gezinildiği anda ekran okuyucunun doğrudan aktif öğeyi okuması sağlanacaktır.
* Doğru Liste Semantiği:
  * `CommandList.tsx` bileşeninin dış kapsayıcısına `role="listbox"` ve `id="command-palette-listbox"` atanacaktır.
* Canlı Durum Anonsörü (Live Region):
  * Arama kutusunun yanına ekran okuyuculara özel `<div role="status" aria-live="polite" class="sr-only">` alanı yerleştirilecek; arama yapıldığında "X komut bulundu" veya "Hiçbir komut bulunamadı" anonsu yapılacaktır.
* Kararlı Odak İadesi:
  * Palet açılmadan hemen önce `document.activeElement` bir değişkende saklanacak, palet kapatıldığında odak doğrudan bu saklanan elemana geri verilecektir.

---

## 3. Çoklu Bölünmüş Ekran (Split-View)

İlgili Dosyalar:
* `browser-features/chrome/common/split-view/components/split-view-splitters.tsx`
* `browser-features/chrome/common/split-view/split-view-manager.ts`
* `browser-features/chrome/common/split-view/patches/event-listeners.ts`

### Tespit Edilen Sorunlar
* Çubukların yalnızca fareye bağlı olması: Bölünmüş ekran panelleri arasındaki ayırıcı çubuklar (`floorp-split-handle`) birer `<box>` elemanı olarak oluşturulmuş ve yalnızca fare olayını (`mousedown`) dinlemektedir.
* Klavye odağı eksikliği: Ayırıcı çubukta `tabindex="0"` bulunmadığından klavye kullanan veya görme engelli bir birey çubuğa odaklanamaz.
* WAI-ARIA Separator eksikliği: Çubuk üzerinde `role="separator"` yoktur. Ekran okuyucu bunun bir panel ayırıcı olduğunu anlayamaz.
* Boyut ve yönelim bilgisi eksikliği: Çubuğun mevcut panel paylaşım yüzdesini belirten `aria-valuenow`, `aria-valuemin`, `aria-valuemax` ve `aria-orientation` öznitelikleri tanımlanmamıştır.
* Bölmeler arası klavye geçiş kısayolunun olmaması: İki veya dört panel açıkken sol panelden sağ panele veya üst panelden alt panele klavyeyle doğrudan atlamayı sağlayan bir kısayol ve bu geçişi seslendiren canlı bildirim bulunmamaktadır.

### Mimari Çözümler
* WAI-ARIA Window Splitter Standardı:
  * Ayırıcı çubuklara `role="separator"`, `tabindex="0"`, `aria-orientation="vertical|horizontal"` öznitelikleri atanacaktır.
  * Anlık genişlik yüzdesi `aria-valuenow` (örneğin "50"), minimum sınır `aria-valuemin="10"`, maksimum sınır `aria-valuemax="90"` ve `aria-label="Sol ve sağ bölme boyutu ayırıcı çubuğu"` şeklinde tanımlanacaktır.
* Klavyeyle Boyutlandırma Desteği:
  * Çubuk odaklandığında klavye dinleyicisi (`keydown`) devreye girecektir:
    * Sol Ok / Yukarı Ok: Aktif bölmeyi %1 daraltır.
    * Sağ Ok / Aşağı Ok: Aktif bölmeyi %1 genişletir.
    * Shift + Ok Tuşları: %5 adımlarla hassas hızlı ayar yapar.
    * PageUp / PageDown: %10 adımlarla büyük boyut değişikliği yapar.
    * Home / End: Panelleri eşit orana (%50 / %50 veya dörtlüde %25) sıfırlar.
* Canlı Boyut Anonsu:
  * Boyut değiştiğinde debounced olarak "Sol bölme yüzde 60, sağ bölme yüzde 40" anonsu yapılacaktır.
* Paneller Arası Hızlı Odak Atlama:
  * `F6` veya `Ctrl + Alt + Ok Tuşları` ile aktif bölmeler arasında döngüsel odak geçişi sağlanacaktır.
  * Geçiş anında "Sol bölme etkin: [Sekme Başlığı]" anonsu iletilecektir.

---

## 4. Çalışma Alanları (Workspaces)

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/toolbar-element.tsx`
* `browser-features/chrome/common/workspaces/workspace-modal.tsx`
* `browser-features/chrome/common/workspaces/workspacesService.ts`

### Tespit Edilen Sorunlar
* Araç çubuğu butonunda durum eksikliği: `toolbar-element.tsx` içindeki buton yalnızca aktif çalışma alanının ismini görsel olarak yazmakta; ekran okuyucuya toplam çalışma alanı sayısı veya o alanda kaç sekme bulunduğu aktarılmamaktadır.
* Sessiz çalışma alanı değişimi: Kısayolla veya menüden bir çalışma alanından diğerine geçildiğinde tarayıcıdaki tüm sekmeler gizlenip yenileri gelir; ancak ekran okuyucuya hiçbir bilgi verilmediği için görme engelli kullanıcı sekmelerin kaybolduğunu sanabilir.
* Modal odak hapsi (Focus Trap) eksikliği: `workspace-modal.tsx` çalışma alanı yönetim penceresi açıldığında odak pencere içine kilitlenmemekte, arka plandaki adres çubuğuna kaçabilmektedir.

### Mimari Çözümler
* Zenginleştirilmiş Buton Erişilebilirliği:
  * Butona `role="button"`, `aria-haspopup="menu"`, `aria-expanded` bağlanacaktır.
  * `aria-label` değeri dinamik olarak oluşturulacaktır (Örn: "Çalışma Alanları menüsü. Aktif: İş, 6 sekme açık. Toplam 3 çalışma alanı").
* Çalışma Alanı Değişim Canlı Duyurusu:
  * `WorkspacesService` içine erişilebilirlik duyurucu servisi entegre edilecektir: "Çalışma alanı değiştirildi: Kişisel. 4 sekme yüklendi."
* Katı Odak Kapsayıcı (Focus Trap):
  * Çalışma alanı modalı açıldığında ilk odaklanabilir elemana otomatik odak verilecek; `Tab` ve `Shift+Tab` tuşları modal içinde sınırlandırılacak; `ESC` ile kapatıldığında odak araç çubuğundaki çalışma alanı butonuna geri dönecektir.

---

## 5. Web Panelleri ve Yan Çubuk (Panel Sidebar)

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/sidebar-panel-button.tsx`
* `browser-features/chrome/common/panel-sidebar/components/sidebar.tsx`
* `browser-features/chrome/common/panel-sidebar/components/floating-splitter.tsx`

### Tespit Edilen Sorunlar
* Ham URL seslendirme rezaleti: `sidebar-panel-button.tsx` içinde butonun etiketi doğrudan `aria-label={props.panel.url || ...}` olarak atanmıştır. Kullanıcı bir web sayfası eklediğinde ekran okuyucu insan dostu bir başlık yerine yüzlerce harften oluşan ham web adresini ("https iki nokta üst üste bölü bölü...") okumaktadır.
* Dekoratif favicon görselleri: `<img src={faviconURL()} />` elemanında `alt=""` veya `aria-hidden="true"` bulunmadığı için ekran okuyucu "Grafik, resim" anonsu yapmaktadır.
* Klavyeyle panel sıralama imkansızlığı: Panellerin sırasını değiştirme işlemi yalnızca HTML5 fare sürükle-bırak (`onDragStart`, `onDrop`) olaylarına bağlanmıştır. Klavye kullanan biri panelleri yeniden sıralayamaz.

### Mimari Çözümler
* İnsan Dostu İsim Hiyerarşisi:
  * Etiketleme şu öncelikle çözülecektir: `props.panel.title || props.panel.customName || URL_Domain_Adı`.
  * Konteyner sekmesi kullanılıyorsa konteyner adı da eklenecektir (Örn: "İş konteyneri, Slack paneli").
* Görsel Temizliği:
  * Favicon etiketlerine `alt=""` ve `aria-hidden="true"` eklenerek görsel çöplüğü engellenecektir.
* Klavyeyle Yeniden Sıralama:
  * Panel butonuna odaklanıldığında `Alt + Yukarı Ok` veya `Alt + Aşağı Ok` tuşlarıyla panelin sırası değiştirilebilecek; değişim anında "Slack paneli 2. sıraya taşındı" anonsu yapılacaktır.

---

## 6. Ayarlar Sayfaları ve UI Kontrolleri (Settings UI & libs/ui)

İlgili Dosyalar:
* `libs/ui/switch.tsx`
* `libs/ui/button.tsx`
* `browser-features/pages-settings/src/App.tsx`
* `libs/ui/controls.module.css`

### Tespit Edilen Sorunlar
* Etiketsiz Switch/Toggle Tehlikesi: `libs/ui/switch.tsx` içindeki `<input type="checkbox" role="switch">` elemanı bir ayar başlığı ile görsel olarak yan yana dursa dahi, `aria-labelledby` veya `id`/`htmlFor` bağı kurulmadığında ekran okuyucu yalnızca "Geçiş düğmesi, basılı değil" demekte; neyi açıp kapattığını söylememektedir.
* Rota Değişim Sessizliği: React Router ile sol menüden sekmeler değiştirildiğinde (`/dashboard`, `/design`, `/workspaces`) sayfa başlığı (`document.title`) güncellenmemekte ve ekran okuyucu sayfa içeriğinin değiştiğini fark edememektedir.
* Odak Halkalarının Kaybolması: Tailwind stillerinde varsayılan tarayıcı odak çerçevesi kaldırılmış (`outline-none`), ancak yerine her temada açıkça görünen yüksek kontrastlı odak halkaları eklenmemiştir.
* Kontrast Seviyesi: WCAG 2.2 AAA standardı normal metinlerde en az 7:1, büyük metinlerde ve grafik nesnelerde en az 3:1 kontrast gerektirir. Bazı gri tonları açık temada bu şartı sağlamamaktadır.

### Mimari Çözümler
* Çift Yönlü Etiketleme Zorunluluğu:
  * `Switch` ve `Input` bileşenleri prop olarak bir `labelId` veya doğrudan metin alacak; otomatik olarak `aria-labelledby` ile ayar başlığına kilitlenecektir.
* Route Announcer Bileşeni:
  * `App.tsx` içine bir rota izleyici eklenecek; kategori değiştiğinde ekran okuyucuya "Floorp Tasarım Ayarları Sayfası Yüklendi" anonsu gönderilecek ve odak sayfanın ana `<h1>` başlığına odaklanacaktır.
* Yüksek Kontrastlı Odak Halkası (`:focus-visible`):
  * Tüm etkileşimli elemanlara en az 3px kalınlığında, açık temada `#005FB8`, koyu temada `#4CC2FF` renginde, 2px boşluklu (offset) odak halkaları tanımlanacaktır.
* Kontrast ve Renk Uyumu:
  * Açık ve koyu temadaki metin ve kontrol renkleri WCAG 2.2 AAA (7:1) oranına göre güncellenecektir.

---

## 7. Fare Hareketleri (Mouse Gestures) ve Zen Modu

İlgili Dosyalar:
* `browser-features/chrome/common/mouse-gesture/`
* `browser-features/chrome/common/zen-mode/`

### Tespit Edilen Sorunlar
* Fare hareketleri motor engelli ve klavye/ekran okuyucu kullanıcıları için fiziksel olarak erişilemez bir etkileşim türüdür.
* Zen Modu etkinleştirildiğinde tarayıcının tüm araç çubukları, sekmeleri ve kenar çubukları gizlenir. Görme engelli veya az gören bir kullanıcı yanlışlıkla Zen moduna girdiğinde arayüzün kaybolduğunu anlayamaz ve nasıl çıkacağını bilemez.

### Mimari Çözümler
* %100 Klavye Eşdeğerliği:
  * Fare hareketleriyle yapılabilen her eylem (Sekme Kapat, Geri, İleri, Yenile, Bölünmüş Ekran, Yeni Sekme) `keyboard-shortcut` ayarları üzerinden erişilebilir bir kısayol eşdeğerine bağlanacaktır.
* Zen Modu Sesli ve Canlı Bildirimleri:
  * Zen moduna geçildiği anda ekran okuyucuya "Zen modu etkinleştirildi. Tüm araç çubukları gizlendi. Çıkmak için ESC veya F11 tuşuna basınız" uyarısı iletilecektir. Moddan çıkıldığında ise "Zen modundan çıkıldı, normal görünüme dönüldü" bilgisi verilecektir.

---

## 8. Durum Çubuğu (Statusbar) ve Sekme İçi Düzenleme (Tab-Inline-Edit)

İlgili Dosyalar:
* `browser-features/chrome/common/statusbar/`
* `browser-features/chrome/common/tab-inline-edit/controller.ts`

### Tespit Edilen Sorunlar
* Durum çubuğundaki zoom seviyesi ve durum bildirimleri ekran okuyucu tarafından takip edilememektedir.
* Sekme başlığı veya URL'si satır içi düzenlendiğinde işlem başarıyla bittiğinde veya doğrulama hatası alındığında ekran okuyucuya geri bildirim verilmemektedir.

### Mimari Çözümler
* Durum çubuğuna `role="status"` ve `aria-live="polite"` tanımlanarak zoom değişikliklerinde "Yakınlaştırma seviyesi: %120" anonsu yapılacaktır.
* Sekme düzenleme tamamlandığında "Sekme adresi güncellendi: [Yeni Adres]" anonsu iletilecek; geçersiz adres durumunda `aria-invalid="true"` ve `aria-errormessage` devreye girecektir.

---

## 9. Test ve Doğrulama Metodolojisi

Yapılacak tüm erişilebilirlik geliştirmeleri şu aşamalı doğrulama sürecinden geçirilecektir:
* NVDA Konuşma Denetimi (Speech Viewer): NVDA 2024+ ile her özellik test edilecek; gezinme sırasında gereksiz tekrarlar veya sessiz kalan yerler tespit edilecektir.
* JAWS ve Windows Narrator Uyumluluğu: Windows 11 Ekran Okuyucusu ile tüm sanal odak ve dialog geçişleri kontrol edilecektir.
* Gecko IAccessible2 Ağaç Denetimi: Firefox Developer Tools / Accessibility Inspector ile her düğümün Role, Name, Value ve State değerleri teyit edilecektir.
* Sıfır Fare (Pure Keyboard) Testi: Fareye hiç dokunulmadan tüm tarayıcı akışları (bölünmüş ekran boyutlandırma, yan panel yönetimi, komut paleti, ayarlar) baştan sona çalıştırılacaktır.
* Yüksek Kontrast ve Azaltılmış Hareket (Reduced Motion): Sistem düzeyinde hareket azaltma ve yüksek kontrast açıldığında tüm CSS animasyonları kapatılacak ve renk paletleri doğrulanacaktır.

---

## 10. Dahili Notlar Uygulaması (Floorp Notes)

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteItem.tsx`
* `browser-features/pages-notes/src/components/notes/NoteList.tsx`
* `browser-features/pages-notes/src/components/editor/RichTextEditor.tsx`
* `browser-features/pages-notes/src/App.tsx`

### Tespit Edilen Sorunlar
* İç İçe Düğme (Nested Interactive Elements) Hatası: `NoteItem.tsx` dosyasında not öğesini seçen bir `<button role="option">` elemanının içine notu silmeye yarayan `<button aria-label="notes.delete">` düğmesi yerleştirilmiştir. Bu durum HTML5 semantiğinin ve WCAG 4.1.2 standardının doğrudan ihlalidir. NVDA ve JAWS gibi ekran okuyucular iç içe butonlarla karşılaştığında sanal imleç çökmesi yaşar veya silme butonunu ana butonla karıştırıp yanlış işlemi tetikler.
* Tıklama ve Odak Engelleme: `NoteList.tsx` dosyasında kapsayıcı div üzerinde `onMouseDown={(e) => e.preventDefault()}` kullanılmıştır. Bu müdahale, ekran okuyucu kullanıcılarının veya fiziksel fare emülatörü kullanan motor engelli bireylerin listeye odaklanmasını bozmaktadır.
* Editör Araç Çubuğu Durumları: Zengin metin editöründeki kalın, italik, liste ve başlık butonlarında `aria-pressed="true|false"` durum bilgisi eksiktir. Görme engelli kullanıcı o an kalın yazıp yazmadığını anlayamaz.

### Mimari Çözümler
* Semantik Düğme Ayrıştırması:
  * Not öğesi bir `<div role="option">` veya `<article>` içine alınacak; notu seçme işlemi ile silme butonu DOM hiyerarşisinde yan yana (kardeş/sibling elemanlar) olarak konumlandırılacaktır.
* Doğal Odak Akışı:
  * `onMouseDown preventDefault` çağrısı kaldırılacak, standart WAI-ARIA Listbox klavye navigasyonu (Yukarı/Aşağı ok ile dolaşma) devreye alınacaktır.
* Editör Araç Çubuğu Erişilebilirliği:
  * Tüm biçimlendirme düğmelerine `aria-pressed` özniteliği ve klavye kısayolu anonsu (Örn: "Kalın, basılı, Ctrl+B") eklenecektir.

---

## 11. Kalıcı Modal Pencereler ve Diyalog Altyapısı (Modal Framework)

İlgili Dosyalar:
* `browser-features/chrome/common/modal-parent/components/modal.tsx`
* `browser-features/chrome/common/modal-parent/modalManager.tsx`
* `browser-features/chrome/common/modal-parent/modalElement.tsx`

### Tespit Edilen Sorunlar
* Rol ve Modal Bayrağı Eksikliği: `components/modal.tsx` içindeki ana taşıyıcı `#modal-parent-container`, hiçbir `role="dialog"` veya `role="alertdialog"` almamıştır. `aria-modal="true"` özniteliği bulunmamaktadır.
* Arka Plan İzolasyonu (Inert) Yokluğu: Modal açıldığında arkada kalan ana tarayıcı penceresi ve sekmeler `inert` veya `aria-hidden="true"` ile kilitlenmemektedir. Görme engelli kullanıcı Tab tuşuna bastığında istemeden modal pencerenin dışına çıkıp açık sekmelerde veya araç çubuğunda kaybolabilmektedir.
* Başlık ve Açıklama Bağımsızlığı: Modalların kendilerine ait bir `aria-labelledby` veya `aria-describedby` bağı bulunmamaktadır; pencere açıldığında ne için onay istendiği ekran okuyucuya doğrudan anons edilmemektedir.

### Mimari Çözümler
* WAI-ARIA 1.2 Modal Dialog Standardı:
  * `#modal-parent-container` bileşenine `role="dialog"`, `aria-modal="true"` ve dinamik `aria-labelledby` eklenecektir.
* Tam Arka Plan Hapsi (Inert Trapping):
  * Modal açıldığı anda ana tarayıcı penceresinin gövdesine (`#main-window`) `inert` özniteliği verilecek; modal kapandığında bu kilit kaldırılacaktır.
* Odak Giriş ve Çıkış Garantisi:
  * Modal açıldığında odak derhal ilk mantıksal öğeye (varsayılan onay butonu veya ilk giriş alanı) taşınacak; ESC basıldığında modal kapanıp odak tetikleyici butona iade edilecektir.

---

## 12. Sekme Yığınları ve Çok Satırlı Sekmeler (Tab Stacks & Multirow Tabbar)

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`
* `browser-features/chrome/common/tab-stacks/proxy-drag.ts`
* `browser-features/chrome/common/tabbar/multirow-tabbar/multirow-tabbar.tsx`

### Tespit Edilen Sorunlar
* İsimsiz Kapatma Düğmeleri: `stack-bar.tsx` içindeki sekme çiplerinde bulunan `floorp-stack-tab-close` butonunda yalnızca `tooltiptext="Close tab"` yer almaktadır. `aria-label` tanımlanmadığı için ekran okuyucu her çipte "Close tab, button" anonsu yapar; hangi sekmenin kapatılacağını kullanıcı ayırt edemez.
* Yığın İçi Dolaşım Eksikliği: Sekme yığını çipleri (`StackTabProxy`) `role="tab"` semantiğine ve ok tuşlarıyla sıralı geçiş desteğine sahip değildir.
* Çok Satırlı Sekmelerde (Multirow) İki Boyutlu Klavye Kopukluğu: Sekmeler 2 veya 3 satıra dizildiğinde, Sol/Sağ ok tuşları DOM sırasıyla giderken, görsel olarak bir üstteki veya bir alttaki sekmeye Yukarı/Aşağı ok tuşlarıyla geçiş yapılamamaktadır.

### Mimari Çözümler
* Tekil ve Açıklayıcı Kapatma Etiketleri:
  * Kapatma düğmesine `aria-label={"Sekmeyi kapat: " + (props.tab.label || "Sekme")}` atanacaktır.
* WAI-ARIA Tablist Deseni:
  * Sekme yığını çubuğuna `role="tablist"`, her çiğe `role="tab"`, `aria-selected` ve ok tuşları ile geçiş yeteneği kazandırılacaktır.
* 2D Çok Satırlı Sekme Navigasyonu:
  * `multirow-tabbar.tsx` içine dikey konum hesaplayıcı entegre edilerek Yukarı ve Aşağı ok tuşlarının görsel olarak dikey eksende hizalanan sekmeye doğrudan odak taşıması sağlanacaktır.

---

## 13. QR Kod Üreticisi (QR Code Generator)

İlgili Dosyalar:
* `browser-features/chrome/common/qr-code-generator/qr-code-panel.tsx`
* `browser-features/chrome/common/qr-code-generator/qr-code-manager.tsx`

### Tespit Edilen Sorunlar
* Tamamen Sessiz Görsel (Canvas Körlüğü): `#qrcode-img-vbox` içine çizilen QR kodu HTML5 Canvas olarak üretilir. Bu canvas üzerinde hiçbir `role="img"`, `aria-label` veya alternatif metin bulunmaz. Görme engelli bir kullanıcı açılan panelde hiçbir içerik göremez veya duyamaz.
* Alternatif Paylaşım Eksikliği: Panelde QR kodun temsil ettiği URL yazılı olarak sunulmamakta ve tek tuşla panoya kopyalama imkanı verilmemektedir.

### Mimari Çözümler
* Erişilebilir Görsel Semantiği:
  * Üretilen canvas elemanına `role="img"` ve `aria-label={"Mevcut sayfanın QR kodu: " + currentUrl()}` bağlanacaktır.
* Erişilebilir URL Kutusu ve Kopyalama Düğmesi:
  * QR görselinin altına sayfa adresini gösteren salt okunur bir giriş alanı ve klavyeyle odaklanılabilen bir "Bağlantıyı Panoya Kopyala" düğmesi eklenecektir. Kopyalandığında "Bağlantı panoya kopyalandı" canlı anonsu (`aria-live="polite"`) üretilecektir.

---

## 14. Bellek Tasarrufu ve Gizli Konteyner Sekmeleri (Tab Sleep & Private Containers)

İlgili Dosyalar:
* `browser-features/chrome/common/idle-memory-reclaim/index.ts`
* `browser-features/chrome/common/private-container/browser-private-container.tsx`

### Tespit Edilen Sorunlar
* Uykuya Alınan (Discarded) Sekmelerin Belirsizliği: RAM tasarrufu için arka planda uyutulan sekmeler görsel olarak soluklaşırken, ekran okuyucu bu durumu fark edemez. Kullanıcı sekmeye geçtiğinde sayfanın neden yeniden internetten yüklendiğini anlayamaz.
* Gizli Konteynerin Duyurulmaması: Bir sekme "Private Container" olarak açıldığında geçmiş kaydı kapatılır, ancak ekran okuyucu sekme başlığını okurken bu sekmenin gizli konteynerde olduğunu belirtmez.

### Mimari Çözümler
* Durum Rozetlerinin Erişilebilir İsimlere Eklenmesi:
  * Uyutulan sekmelerin erişilebilir ismine dinamik olarak ", Uyku modunda (seçildiğinde yeniden yüklenecek)" soneki eklenecektir.
  * Gizli konteyner sekmelerine ", Gizli Konteyner Sekmesi (Geçmiş kaydedilmiyor)" ibaresi bağlanacaktır.

---

## 15. Windows Yüksek Kontrast Modu ve Sistem Renkleri (Forced Colors)

İlgili Dosyalar:
* `browser-features/chrome/common/split-view/styles/split-view.css`
* `browser-features/chrome/common/command-palette/style.css`
* `browser-features/chrome/common/panel-sidebar/components/style.css`
* `browser-features/pages-notes/src/globals.css`

### Tespit Edilen Sorunlar
* Yüksek Kontrast Kayıpları: Tüm projede `@media (forced-colors: active)` yalnızca 3 dosyada tanımlanmıştır. Windows Yüksek Kontrast Modu açıldığında:
  * Bölünmüş ekran ayırıcı çubuğu şeffaflaşıp kaybolmaktadır.
  * Komut paletinin pencere sınırları ve seçili öğe vurgusu arka planla aynı renge bürünmektedir.
  * Yan panel butonları ve notlar listesindeki aktiflik çerçeveleri görünmez hale gelmektedir.

### Mimari Çözümler
* Sistem Renklerinin (System Colors) Entegrasyonu:
  * Tüm arayüz CSS dosyalarına `@media (forced-colors: active)` blokları eklenecektir.
  * Seçili elemanlar için `Highlight` ve `HighlightText`, buton çerçeveleri için `ButtonBorder`, genel metinler için `CanvasText` ve arka planlar için `Canvas` sistem belirteçleri bağlanacaktır.
  * Ayırıcı çubuklara ve odak halkalarına yüksek kontrast modunda zorunlu 2px katı `ButtonBorder` veya `Highlight` çerçevesi tanımlanacaktır.

---

## 16. Medya Oynatma ve Güvenlik Göstergeleri (Audio / Video / Kamera)

İlgili Dosyalar:
* `browser-features/chrome/common/tab/`
* `browser-features/modules/modules/`

### Tespit Edilen Sorunlar
* Sessiz Medya İkonları: Sekmeler üzerinde ses çaldığında, mikrofon kullanıldığında veya ekran paylaşıldığında beliren ikonlar görsel olarak görünürken ekran okuyucu kullanıcılarına bu durum sesli olarak bildirilmemektedir.

### Mimari Çözümler
* Sekme Durum Göstergesi Entegrasyonu:
  * Sekme ses çalıyorsa sekme etiketine ", Ses oynatılıyor", mikrofon açıksa ", Mikrofon aktif" bilgisi eklenecektir.
  * Tek tuşla veya kısayolla sekmeyi susturma eylemi yapıldığında ekran okuyucuya "Sekme sesi kapatıldı" canlı anonsu iletilecektir.

---

## 17. Ekran Paylaşım Modu (Browser Share Mode)

İlgili Dosyalar:
* `browser-features/chrome/common/browser-share-mode/browser-share-mode.tsx`
* `browser-features/chrome/common/browser-share-mode/share-mode.css`

### Tespit Edilen Sorunlar
* Görsel Gizleme ve Ekran Okuyucu İletişimsizliği: Paylaşım modu açıldığında kişisel araç çubuğu, indirmeler ve aktif olmayan tüm sekmeler `display: none !important;` ile DOM'da görsel olarak gizlenir. Ancak bu mod açıldığında veya kapandığında ekran okuyucuya hiçbir canlı anons (`aria-live`) yapılmaz. Görme engelli kullanıcı sekmelerin veya araç çubuklarının neden aniden ulaşılamaz olduğunu anlayamaz.
* CSS Pseudo Element Körlüğü: `share-mode.css` dosyasında durum göstergesi olarak `content: "Share Mode"` sözde elemanı (`:before`) kullanılmıştır. Bu metin yalnızca görsel bir çizimdir; ekran okuyucu erişilebilirlik ağacına (Accessibility Tree) yansımaz.

### Mimari Çözümler
* Sesli Durum Anonsu:
  * Paylaşım modu açıldığında "Ekran Paylaşım Modu etkinleştirildi. Kişisel araç çubukları ve arka plan sekmeleri gizlendi. Kapatmak için Shift+S tuşuna basınız" anonsu yapılacaktır. Mod kapatıldığında da durum bildirilecektir.
* Semantik Durum Göstergesi:
  * CSS `:before` yerine erişilebilir araç çubuğu rozetine `role="status"` ve `aria-label="Ekran Paylaşım Modu Aktif"` tanımlanacaktır.

---

## 18. Kapanan Sekmeyi Geri Al Butonu (Undo Closed Tab)

İlgili Dosyalar:
* `browser-features/chrome/common/undo-closed-tab/index.ts`

### Tespit Edilen Sorunlar
* Boş Geçmişte Sahte Aktiflik: Kapatılan hiçbir sekme bulunmadığında dahi araç çubuğu butonu tıklanabilir ve etkin (`aria-disabled="false"`) kalır. Kullanıcı butona bastığında hiçbir işlem gerçekleşmez ve kullanıcı tarayıcının donduğunu düşünebilir.
* İşlem Başarı Anonsu Eksikliği: Bir sekme geri açıldığında odak yeni açılan sekmeye otomatik geçmezse, hangi sekmenin geri getirildiği kullanıcıya seslendirilmez.

### Mimari Çözümler
* Dinamik Durum Yönetimi:
  * Kapatılan sekme geçmişi boş olduğunda butona `disabled="true"` ve `aria-disabled="true"` atanacaktır.
* Canlı Geri Yükleme Bildirimi:
  * Sekme geri açıldığında "Son kapatılan sekme geri yüklendi: [Sekme Başlığı]" anonsu iletilecektir.

---

## 19. Dinamik Sekme Renkleri ve Kontrast Riski (Browser Tab Color)

İlgili Dosyalar:
* `browser-features/chrome/common/browser-tab-color/index.ts`

### Tespit Edilen Sorunlar
* Yakalanmayan Çökme Hatası (Unhandled Error): Web sitesinin manifest dosyasında geçersiz veya tanınmayan bir renk kodu varsa `getTextColor` fonksiyonu `throw Error(...)` fırlatır ve eklenti akışını keser.
* Yetersiz Kontrast Formülü: Metin rengi seçiminde kullanılan `chroma.luminance() >= 0.5 ? "black" : "white"` mantığı WCAG 2.2 Seviye AA (4.5:1) ve AAA (7:1) kontrast gereksinimlerini sağlamaz. Örneğin 0.45 parlaklıktaki ara renklerde kontrast oranı 2.1:1 seviyesine düşerek metni az gören veya renk körü bireyler için tamamen okunamaz hale getirir.

### Mimari Çözümler
* Gerçek WCAG Kontrast Algoritması:
  * Sabit 0.5 eşiği yerine, arka plan rengi ile beyaz (`#ffffff`) ve siyah (`#000000`) arasındaki gerçek WCAG bağıl parlaklık kontrast oranı (`(L1 + 0.05) / (L2 + 0.05)`) hesaplanacak; en az 7:1 (AAA) veya 4.5:1 (AA) kontrastı sağlayan renk otomatik seçilecektir.
* Güvenli Fallback:
  * Geçersiz renk formatlarında hata fırlatmak yerine sistemin varsayılan tema renklerine dönülecektir.

---

## 20. Sekme Üzerine Gelince Yenileme (Hover Reload)

İlgili Dosyalar:
* `browser-features/chrome/common/tab-refresh/controller.ts`

### Tespit Edilen Sorunlar
* İstem Dışı Sayfa Kaybı: Fare imleci bir sekmenin üzerinde 700ms durduğunda sayfa otomatik olarak yeniden yüklenir. El titremesi (tremor), motor engeli olan veya yavaş fare kullanan bireyler sekmelerin üzerinden geçerken sayfaların kontrolsüzce yenilenmesine ve form verilerinin kaybolmasına yol açar (WCAG 2.2.1 ve 1.4.13 ihlali).
* Klavye Desteği Eksikliği: Bu özellik yalnızca fare imleci üzerine gelince (`mouseover`) çalışır; klavye odağında (`focusin`) hiçbir karşılığı yoktur (WCAG 2.1.1 ihlali).

### Mimari Çözümler
* Güvenli Varsayılan ve Onay Eşiği:
  * Bu özellik varsayılan olarak kapalı tutulacak, açıldığında ise gecikme süresi kullanıcı tarafından ayarlanabilir olacaktır.
* Klavye Tetikleyicisi ve İptal İmkanı:
  * Klavye ile sekme üzerindeyken yenileme isteğe bağlı özel bir tuşla (`Ctrl+R` veya menü) yapılabilecek; fare kazara üzerine geldiğinde `ESC` tuşuyla yenileme sayacı anında iptal edilebilecektir.

---

## 21. Klavye Kısayolları ve Ekran Okuyucu Çakışması (Keyboard Shortcuts)

İlgili Dosyalar:
* `browser-features/chrome/common/keyboard-shortcut/controller.ts`

### Tespit Edilen Sorunlar
* Capturing Phase Tuş Yutulması: Kısayol dinleyicisi pencere düzeyinde `addEventListener("keydown", handleKeyDown, true)` (yakalama evresi) ile çalışmakta ve eşleşen bir kısayol bulduğunda `event.stopPropagation()` çağırmaktadır. Bu durum NVDA, JAWS veya Windows işletim sisteminin yardımcı teknoloji komutlarını (örneğin sanal imleç gezinme tuşları, F6 vb.) tarayıcıya veya ekrana ulaşmadan yutarak klavyeyi kilitleyebilir.
* Yardımcı Teknoloji Geçiş Modu Yokluğu: Ekran okuyucu kullanıcılarının Floorp'un özel kısayollarını tek tuşla askıya almasını (Bypass / Pass-through mode) sağlayan bir mekanizma yoktur.

### Mimari Çözümler
* Yardımcı Teknoloji Tuş Koruma Filtresi:
  * Ekran okuyucuların kullandığı standart gezinti tuşları (`F6`, `Tab`, `Insert/Capslock` kombinasyonları) Floorp kısayol motorunda engellenemez (reserved) olarak işaretlenecektir.
* Global Kısayol Askıya Alma (Bypass Mode):
  * Kullanıcı `Ctrl+Alt+P` gibi özel bir kombinasyona bastığında "Floorp özel kısayolları askıya alındı, ekran okuyucu modu aktif" anonsu ile tüm müdahaleler kapatılabilecektir.

---

## 22. Web Panellerinde Klavye Tuzağı (Panel Sidebar Keyboard Trap)

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/browser-box.tsx`
* `browser-features/chrome/common/panel-sidebar/components/sidebar.tsx`

### Tespit Edilen Sorunlar
* Klavye Tuzağı (WCAG 2.1.2 İhlali): Yan panelde açılan üçüncü taraf sitelerde (WhatsApp, Twitter, çeviri araçları) klavye odağı panelin içine girdiğinde, Tab tuşu site içerisindeki yüzlerce bağlantı arasında sonsuz döngüye girer. Kullanıcı klavyeyi kullanarak yan paneli kapatamaz veya ana tarayıcı sekmesine geri dönemez.

### Mimari Çözümler
* Global Paneli Terk Etme Kısayolu:
  * Yan panel açık ve odak içerideyken `F6` veya `Ctrl+Alt+W` kombinasyonu odağı doğrudan yan panelin kapatma butonuna veya ana sekme çubuğuna geri fırlatacaktır.
  * Bu kısayol ekran okuyucuya panel açıldığı anda "Yan panel açıldı. Tarayıcıya geri dönmek için F6 tuşuna basınız" şeklinde anons edilecektir.

---

## 23. Dokunma ve Tıklama Hedef Boyutu İhlalleri (Target Size)

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteItem.tsx`
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`
* `libs/ui/button.tsx`

### Tespit Edilen Sorunlar
* Mikro Boyutlu Kontroller (WCAG 2.5.5 ve 2.5.8 İhlali):
  * Notlar listesindeki silme butonu yalnızca 16x16 pikseldir.
  * Sekme yığını kapatma butonu yalnızca 16x16 pikseldir.
  * Minimum erişilebilirlik standardı en az 24x24 piksel (tercihen 44x44 piksel) hedef alanı gerektirir. Küçük hedefler el titremesi olan motor engelli bireylerin veya dokunmatik ekran kullanıcılarının hedefi kaçırmasına ve yanlış yere tıklamasına neden olur.

### Mimari Çözümler
* Güvenli Dokunma Alanı (Hitbox Expansion):
  * Görsel ikon 16px kalsa dahi, `padding` veya şeffaf `:after` sahte elemanları ile tıklanabilir alan en az 32x32 piksele (ayarlarda 44x44 piksele) genişletilecektir.

---

## 24. Metin Büyütme (%200 Zoom) ve Esnek Boyutlandırma (Resize Text)

İlgili Dosyalar:
* `browser-features/chrome/common/command-palette/components/CommandPalette.tsx`
* `browser-features/chrome/common/split-view/components/split-view-splitters.tsx`
* `browser-features/pages-notes/src/App.tsx`

### Tespit Edilen Sorunlar
* Sabit Piksel Kırılmaları (WCAG 1.4.4 İhlali): Komut paleti, bölünmüş ekran bindirmeleri ve not listesinde `--cp-max-height: 400px` gibi sabit piksel değerleri kullanılmıştır. Windows Ayarları'ndan sistem metin boyutu %200'e çıkarıldığında metinler kutuların dışına taşmakta, kırpılmakta (`overflow: hidden`) veya birbirinin üzerine binmektedir.

### Mimari Çözümler
* Göreli Birimler ve Otomatik Akış:
  * Sabit `px` değerleri `rem` / `em` ve `min-content` esnek ölçülerine dönüştürülecektir.
  * %200 metin büyütmede hiçbir metnin kesilmemesi ve dikey kaydırma çubuğunun doğru devreye girmesi sağlanacaktır.

---

## 25. Lokalizasyon ve Dil Etiketleme (Language of Parts)

İlgili Dosyalar:
* `i18n/tr-TR/browser-chrome.json`
* `i18n/tr-TR/default.json`

### Tespit Edilen Sorunlar
* Fonetik Bozulma (WCAG 3.1.2 İhlali): `tr-TR` dil dosyalarında henüz çevrilmemiş İngilizce kalan kelimeler (örneğin `"Reload tab"`) bulunmaktadır. Tarayıcı dili Türkçe seçildiğinde, ekran okuyucu bu İngilizce kelimeleri Türkçe fonetik kurallarıyla ("Re-lo-ad tab" şeklinde heceleyerek) seslendirir ve ortaya anlaşılmaz bir gürültü çıkar.

### Mimari Çözümler
* Eksiksiz Türkçe Çeviri Kapsamı:
  * Tüm arayüz ve erişilebilirlik metinleri eksiksiz Türkçeleştirilecektir.
  * Zorunlu yabancı terimlerde ise ilgili HTML/XUL elemanına `lang="en"` etiketi konularak ekran okuyucunun geçici olarak İngilizce ses motoruna geçmesi sağlanacaktır.

---

## 26. Yeni Sekme Sayfası Sahte Arama ve Öne Çıkan Siteler (NewTab A11y)

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/SearchBar/index.tsx`
* `browser-features/pages-newtab/src/components/TopSites/TopSiteTile.tsx`

### Tespit Edilen Sorunlar
* Sahte Arama Girişi (Klavye ve Rol Körlüğü): `SearchBar/index.tsx` içindeki arama çubuğu aslında bir `<div onClick={handleClick}>` kapsayıcısı içine yerleştirilmiş `readOnly` bir input kutusudur. Kapsayıcıda `role="button"` veya `role="search"` yoktur; `tabindex="0"` ve `onKeyDown` dinleyicisi bulunmamaktadır. Klavyeyle gezinirken Tab tuşu bu arama çubuğunu tamamen atlar. Sanal imleçle input'a gelindiğinde ekran okuyucu "Salt okunur metin kutusu" der ve kullanıcı içine yazamaz; tıklandığında ise adres çubuğunu açacağını kullanıcıya bildirmez.
* Çift İsim Tekrarı ve Sabitleme Sessizliği (TopSiteTile): Öne çıkan sitelerde favicon görseline `alt={site.title}` verilmiş, hemen altındaki metin etiketine de aynı başlık yazılmıştır. Ekran okuyucu her bağlantıda ismi iki kere art arda okur ("Bağlantı, YouTube, YouTube"). Ayrıca site sabitlenmişse (`PinIcon`), bu sabitleme durumunun ekran okuyucuya aktarılacağı hiçbir erişilebilir etiket bulunmamaktadır. Karoların bağlam menüsü (`onContextMenu`) için klavye alternatifi sunulmamıştır.

### Mimari Çözümler
* Gerçek Arama Tetikleyici Semantiği:
  * `SearchBar` kapsayıcısına `role="button"`, `tabindex="0"`, `aria-label="Adres çubuğuna git ve web'de ara"` tanımlanacak; `Enter` ve `Space` tuşları doğrudan adres çubuğu odağını (`NRFocusUrlBar`) tetikleyecektir.
* Temiz ve Zenginleştirilmiş Karo Semantiği:
  * Favicon görseli dekoratif (`alt="" aria-hidden="true"`) hale getirilecek; `<a>` etiketine `aria-label={isPinned ? site.title + " (Sabitlenmiş)" : site.title}` bağlanacaktır.
  * Klavye kullanıcılarının karoyu kaldırabilmesi veya sabitleyebilmesi için `Shift+F10` veya odaklandığında görünen üç nokta aksiyon düğmesi eklenecektir.

---

## 27. Açılır Seçim Kutularında Etiketleme Eksikliği (libs/ui DropDown & Select)

İlgili Dosyalar:
* `libs/ui/dropdown.tsx`

### Tespit Edilen Sorunlar
* İsimsiz Seçim Kontrolleri: `libs/ui/dropdown.tsx` içindeki `Select` ve `DropDown` bileşenleri doğrudan `<select>` elemanını bir `div` içine sarar. Ancak prop olarak bir `label` alsa dahi bunu `<label htmlFor="...">` ile bağlamaz veya `aria-label` / `aria-labelledby` zorunlu tutmaz. Ayarlar sayfalarında bu açılır kutular NVDA ve JAWS tarafından "isimsiz açılır kutu" olarak seslendirilir; kullanıcının neyi seçtiği bağlamdan kopar.

### Mimari Çözümler
* Zorunlu Erişilebilir İsim Eşleştirmesi:
  * `Select` ve `DropDown` bileşenleri `useId` ile benzersiz bir kimlik üretecek veya dışarıdan gelen `labelId` prop'unu doğrudan `<select aria-labelledby={labelId}>` veya `<label htmlFor={id}>` olarak bağlayacaktır.

---

## 28. Durum Çubuğunda Klavyenin Tamamen Devre Dışı Olması (Status Bar Keyboard Bug)

İlgili Dosyalar:
* `browser-features/chrome/common/statusbar/statusbar-manager.tsx`

### Tespit Edilen Sorunlar
* Yalnızca `mousedown` Olayının Dinlenmesi: `statusbar-manager.tsx` dosyasında durum çubuğu butonlarının (`firefox-view-button`, `downloads-button`, `alltabs-button`, `library-button`) tıklama yakalayıcısı **yalnızca `mousedown` (fare basımı)** olayına bağlanmıştır (`statusbarNode.addEventListener("mousedown", ...)`). Bir klavye kullanıcısı Tab tuşuyla durum çubuğundaki bu butonlara odaklanıp `Enter` veya `Space` tuşuna bastığında `mousedown` tetiklenmediği için hiçbir eylem gerçekleşmez! Durum çubuğu klavyeyle tamamen çalışamaz durumdadır (WCAG 2.1.1 doğrudan ihlali).

### Mimari Çözümler
* Yerel XUL Komut Dinleyicisi (`command`):
  * `mousedown` yerine veya ona ek olarak hem fare tıklamasını hem de klavye `Enter`/`Space` tuş basımını evrensel olarak karşılayan XUL `command` veya `click` olayı kullanılacak; klavye kullanıcılarının butonları eksiksiz çalıştırması sağlanacaktır.

---

## 29. Fare Hareketi Tanıma Ekranında Canlı Metin Eksikliği (Gesture Display A11y)

İlgili Dosyalar:
* `browser-features/chrome/common/mouse-gesture/components/GestureDisplay.tsx`

### Tespit Edilen Sorunlar
* Sessiz Görsel Geri Bildirim: Fare hareketi çizildiğinde tanınan komut adı (`this.labelEl`) ekranın ortasında 50px boyutunda bir div içinde görsel olarak gösterilir. Ancak bu div üzerinde hiçbir `role="status"` veya `aria-live="polite"` tanımlanmamıştır. Az gören veya ekran okuyucu kullanan bireyler hangi hareketin algılandığını duyamaz. Ayrıca hareket algılandığında veya tanınamadığında hiçbir sesli geri bildirim (earcon/chime) verilmemektedir.

### Mimari Çözümler
* Canlı Durum ve Ses İmzası:
  * `this.labelEl` elemanına `role="status"` ve `aria-live="polite"` bağlanacaktır.
  * Hareket tanındığında hafif bir pozitif ses sinyali, tanınamadığında ise hafif bir uyarı sinyali çalınarak görsel olmayan anlık geri bildirim sağlanacaktır.

---

## 30. Karşılama ve Kurulum Sihirbazında Odak Kaybı (Welcome Wizard Focus Loss)

İlgili Dosyalar:
* `browser-features/pages-welcome/src/components/Navigation.tsx`
* `browser-features/pages-welcome/src/components/ProgressBar.tsx`
* `browser-features/pages-welcome/src/App.tsx`

### Tespit Edilen Sorunlar
* Odak Düşmesi (Focus Loss): Adım adım karşılama sihirbazında kullanıcı "İleri" butonuna tıkladığında React Router bir sonraki adıma geçer (`navigate(welcomeSteps[index + 1].path)`). Ancak tıklanan buton DOM'dan değiştiği için odak `<body>` etiketine düşüp kaybolur. Ekran okuyucu kullanıcısı yeni adımın başlığına (`<h1>`) taşınmaz ve sayfanın neresinde olduğunu kaybeder.

### Mimari Çözümler
* Adım Odak Yöneticisi (Step Focus Restoration):
  * Her adım değiştiğinde `useEffect` ile yeni adım sayfasının ana başlığına (`<h1>`) programatik odak (`h1Ref.current?.focus()`) gönderilecek; ekran okuyucu derhal yeni adımın adını ve içeriğini okuyacaktır.

---

## 31. PWA Kurulum Panelinde Odaklanmama ve Animasyon Hatası (PWA PageAction A11y)

İlgili Dosyalar:
* `browser-features/chrome/common/pwa/SsbPageAction.tsx`

### Tespit Edilen Sorunlar
* Buton Semantiği Eksikliği: Adres çubuğundaki PWA yükleme butonu bir `<xul:hbox>` olarak eklenmiş; üzerinde `role="button"` veya `aria-label` tanımlanmamıştır.
* `noautofocus` Tuzağı: Açılan PWA paneline (`#ssb-panel`) doğrudan `noautofocus` özniteliği verilmiştir. Bu nedenle kullanıcı butona tıkladığında odak panelin içine girmez, adres çubuğunda kalır. Görme engelli kullanıcı panelin açıldığından habersiz kalır ve "Yükle / Aç" butonlarına Tab tuşuyla ulaşamaz.
* Sonsuz Yükleme Animasyonu (WCAG 2.2.2 İhlali): Kurulum sırasında gösterilen `installing.gif` animasyonunda alternatif metin bulunmamaktadır ve durdurma/gizleme mekanizması sunulmamıştır.

### Mimari Çözümler
* Erişilebilir Düğme ve Odak Yönetimi:
  * Sayfa eylemine `role="button"`, `tabindex="0"` ve `aria-label={"Uygulama olarak yükle: " + title()}` atanacaktır.
  * `noautofocus` kaldırılarak panel açıldığında odak otomatik olarak panel başlığına veya ilk işlem butonuna yönlendirilecektir.
  * Yükleme animasyonuna `role="progressbar"` ve `aria-label="Uygulama yükleniyor..."` tanımlanacaktır.

---

## 32. Hakkında Penceresinde Hatalı Bağlantı ve Canlı Durum Eksikliği (AboutDialog A11y)

İlgili Dosyalar:
* `browser-features/pages-aboutDialog/src/AboutDialog.tsx`

### Tespit Edilen Sorunlar
* Diyezli Bağlantı Sözdizimi: GitHub, Discord, X ve Reddit bağlantıları `<a href="#" onClick={...}>` olarak yazılmıştır. Ekran okuyucular hedef URL yerine "Bağlantı, diyez (#)" okumaktadır. İçlerindeki SVG ikonlarında `aria-hidden="true"` eksiktir.
* Canlı Güncelleme Durumu Eksikliği: Güncelleme kontrol satırında (`ad-update-row`) `aria-busy` kullanılmasına rağmen `aria-live="polite"` veya `role="status"` tanımlanmamıştır. Güncelleme durumu "Kontrol ediliyor..."dan "Floorp güncel" durumuna geçtiğinde ekran okuyucu sessiz kalır.

### Mimari Çözümler
* Standart Dış Bağlantı Semantiği:
  * `href="#"` yerine gerçek URL'ler (`href="https://github.com/..."`) yazılacak; `target="_blank"` ve `aria-label="GitHub (Yeni sekmede açılır)"` eklenecektir.
* Canlı Güncelleme Bölgesi:
  * Güncelleme alanına `role="status"` ve `aria-live="polite"` tanımlanarak tüm durum geçişlerinin otomatik seslendirilmesi sağlanacaktır.

---

## 33. Çalışma Alanı İkon Seçicisinde 2 Boyutlu Izgara Klavye Kopukluğu

İlgili Dosyalar:
* `browser-features/pages-modal-child/src/components/WorkspaceIconPickerField.tsx`

### Tespit Edilen Sorunlar
* 2D Izgara Uyumsuzluğu: 6 sütunlu bir ızgara (`grid-cols-6`) içinde listelenen onlarca radyo butonu görsel olarak 2 boyutlu yerleşmişken, klavye ok tuşları DOM sırasına göre 1 boyutlu çalışır. Kullanıcı Aşağı Ok tuşuna bastığında görsel olarak altındaki ikona değil, sağındaki ikona geçer.
* Arama Canlı Sayacı Eksikliği: İkon arama kutusuna yazıldığında filtreleme yapılır ancak kaç ikonun eşleştiği ekran okuyucuya canlı anons edilmez.

### Mimari Çözümler
* WAI-ARIA Grid Klavye Gezinmesi:
  * İkon seçiciye 2 boyutlu ok tuşu desteği (Yukarı/Aşağı ok ile tam 6 eleman atlayarak dikey eksende hareket) kazandırılacaktır.
  * Arama kutusunun altına "X ikon bulundu" bildiren `aria-live="polite"` bölgesi eklenecektir.

---

## 34. Tek Tuşla Yeniden Başlatmada Onaysız Veri Kaybı Riski (WCAG 3.3.4 Error Prevention)

İlgili Dosyalar:
* `browser-features/chrome/common/reboot-panel-menu/RebootPanelMenu.tsx`

### Tespit Edilen Sorunlar
* Onaysız Kritik Eylem (Veri Kaybı): Menüdeki "Normal Yeniden Başlat" veya "Önbelleği Temizleyerek Yeniden Başlat" butonuna klavye veya fare ile basıldığı anda hiçbir onay diyalogu (`alertdialog`) çıkmadan tüm tarayıcı anında kapatılıp yeniden başlatılır. Kullanıcının açık web formlarında, notlarında veya sekmelerindeki veriler geri döndürülemez şekilde kaybolabilir.

### Mimari Çözümler
* Erişilebilir Onay Diyalogu (Accessible Confirmation Modal):
  * Yeniden başlatma komutu verildiğinde `role="alertdialog"` içeren bir onay penceresi açılarak "Tarayıcı yeniden başlatılacak. Açık sekmeleriniz korunacak ancak form verileriniz kaybolabilir. Devam etmek istiyor musunuz?" uyarısı verilecek; `Enter` ile onaylanıp `ESC` ile iptal edilebilecektir.


---

## 35. Sekme İçi URL Düzenlemede (Tab-Inline-Edit) Hata İletişimi ve Odak Güvenliği

İlgili Dosyalar:
* `browser-features/chrome/common/tab-inline-edit/controller.ts`

### Tespit Edilen Sorunlar
* Sessiz Hata Oluşumu: Kullanıcı sekme üzerinde URL düzenlerken geçersiz bir sözdizimi girdiğinde veya URL çözümleme işlemi başarısız olduğunda sistem düzenleyiciyi kapatır ve hatayı yalnızca tarayıcı konsoluna (`console.error`) yazar. Ekran okuyucu kullanıcısına hiçbir hata uyarısı veya sesli geri bildirim iletilmez; kullanıcı sekmenin yeni adrese gittiğini zanneder.
* Durum Duyurusu Eksikliği: Giriş kutusu açıldığında mevcut sekmenin URL'si ile doldurulur ancak giriş kutusunun amacı ("Sekme URL'sini düzenleyin, kaydetmek için Enter, iptal etmek için Escape tuşuna basın") ekran okuyucuya bir `aria-description` ile aktarılmaz.

### Mimari Çözümler
* Erişilebilir Hata ve Başarı Geri Bildirimi:
  * URL geçersiz olduğunda veya yükleme başarısız olduğunda küresel erişilebilir bildirim sistemi üzerinden `role="alert"` ile "Geçersiz web adresi. Sekme güncellenmedi." uyarısı seslendirilecektir.
  * Giriş kutusuna `aria-description="Kaydetmek için Enter, iptal için Escape tuşuna basın"` eklenerek klavye yardımcısı oluşturulacaktır.

---

## 36. Profil Yöneticisinde (pages-profile-manager) Bağlamsız Butonlar ve Durum Körlüğü

İlgili Dosyalar:
* `browser-features/pages-profile-manager/src/App.tsx`

### Tespit Edilen Sorunlar
* Bağlamdan Kopuk Eylem Butonları (WCAG 2.4.4 / 2.4.9 İhlali): Profil kartlarında yer alan açma butonu yalnızca "Aç" metnini taşımaktadır. Ekran okuyucu ile sayfa içi butonlar taranırken kör kullanıcı peş peşe "Aç düğmesi, Aç düğmesi, Aç düğmesi" duyar; hangi profilin açılacağını anlayamaz.
* Aktif Profil Butonu Korumasızlığı: Zaten kullanılmakta olan profil için buton durumu devre dışı bırakılmamış veya `aria-current="true"` belirtilmemiştir.
* İkon Erişilebilirlik İhlali: Butonlar ve başlıklar içindeki Lucide SVG ikonlarında (`Plus`, `RefreshCw`, `ShareIcon`) `aria-hidden="true"` özniteliği eksiktir.
* Canlı Durum Eksikliği: Yükleme durumunda gösterilen "Yükleniyor..." mesajında `role="status"` veya `aria-live="polite"` tanımlanmamıştır. Sihirbaz çalıştırıldığında uygulanan rastgele `setTimeout(loadAll, 800)` süreci kullanıcıya seslendirilmez.

### Mimari Çözümler
* Spesifik ve Anlamlı Buton İsimlendirmesi:
  * Butonlara `aria-label={t("profileManager.actions.openProfile", { name: p.name })}` ("{p.name} profilini yeni pencerede aç") atanacaktır.
  * Aktif profil için buton `disabled` yapılacak veya `aria-disabled="true"` ile "Şu anda açık profil" durumu belirtilecektir.
  * Tüm dekoratif ikonlara `aria-hidden="true"` eklenecektir.
  * Profil listesi yüklenirken ve yenilendiğinde `role="status"` ve `aria-live="polite"` konteyneri canlı geri bildirim sağlayacaktır.

---

## 37. Otomasyon İş Akışı Penceresinde (pages-workflow-progress) Canlı Durum Körlüğü ve Karşıtlık İhlali

İlgili Dosyalar:
* `browser-features/pages-workflow-progress/src/App.tsx`

### Tespit Edilen Sorunlar
* Agresif Polling ve Canlı İletişim Eksikliği: 100ms aralıklarla aralıksız durum sorgulanmakta ancak adımların durumu değiştiğinde ekran okuyuculara yönelik hiçbir `aria-live` veya `role="log"` alanı bulunmamaktadır. Görme engelli kullanıcı adımların başlayıp bittiğinden tamamen habersiz kalır.
* Yetersiz Renk Karşıtlığı (WCAG 1.4.3 İhlali): Bekleyen adımların metin rengi `text-zinc-600` (`#52525b`) olarak ayarlanmıştır. Siyah arka plan (`#000000`) üzerindeki kontrast oranı yalnızca **2.9:1**'dir (WCAG AA asgari sınırı olan 4.5:1'in çok altındadır).
* Anlamsız Liste Yapısı: İş akışı adımları anlamsız `<div>` etiketleri ile listelenmiştir; ekran okuyucu toplam kaç adım olduğunu ve kullanıcının kaçıncı adımda olduğunu anlayamaz (`<ol>` veya `role="list"` eksik).
* Yalnızca Renge Dayalı Durum Bildirimi (WCAG 1.4.1 İhlali): Adımların tamamlandığı, çalıştığı veya hata verdiği yalnızca ikon ve renklerle gösterilmekte; ekran okuyucu için açık metinsel durum ("Tamamlandı", "Çalışıyor", "Bekliyor") sunulmamaktadır.
* Başlıksız Kapat Butonu: Başlık çubuğundaki kapat butonu yalnızca İngilizce `title="Close"` içermekte, `aria-label` veya yerelleştirilmiş metin barındırmamaktadır.

### Mimari Çözümler
* Semantik Sıralı Liste ve Canlı Bölge:
  * Adım listesi `<ol role="list">` ve `<li role="listitem">` semantiğine kavuşturulacaktır.
  * Ana konteynere `role="log"` ve `aria-live="polite"` tanımlanarak yeni bir adım başladığında veya bittiğinde sesli anons yapılması sağlanacaktır.
* Karşıtlık ve Durum Metni İyileştirmesi:
  * Bekleyen adımların metin rengi en az 4.5:1 kontrast sağlayan `text-zinc-400` veya daha açık renge çekilecektir.
  * Her adımın içine ekran okuyucunun okuyacağı gizli metin (`<span className="sr-only">Durum: Tamamlandı</span>`) eklenecektir.
  * Kapat butonuna yerelleştirilmiş `aria-label={t("common.close")}` eklenecektir.

---

## 38. Zen Modunda (zen-mode) Yalnızca Fareye Bağımlı Arayüz ve Klavye Odak Görünürlüğü İhlali

İlgili Dosyalar:
* `browser-features/chrome/common/zen-mode/zen-mode.tsx`

### Tespit Edilen Sorunlar
* Klavye ile Gezinirken Arayüzün Gizli Kalması (WCAG 2.1.1 & 2.4.7 İhlali): Zen Modu etkinleştirildiğinde araç çubuğu, kenar çubuğu ve durum çubuğu tamamen gizlenir. Sistem bu panelleri YALNIZCA fare imleci ekran kenarlarına yaklaştığında (`clientY <= 10px` veya `clientX <= 10px`) ya da sadece URL çubuğuna odaklanıldığında (`handleUrlbarFocusIn`) açar. Klavye kullanan veya ekran okuyucu çalıştıran bir kullanıcı Tab veya kısayol tuşlarıyla sekme çubuğuna, durum çubuğu butonlarına veya kenar çubuğu simgelerine odaklandığında paneller açılmaz; kullanıcı görünmeyen ve ekranda olmayan hayalet elemanlara odaklanmak zorunda kalır.
* Canlı Durum ve İşitilebilir İpucu Eksikliği: Zen moduna girildiğinde veya çıkıldığında ekran okuyucu kullanıcısına "Zen Modu etkinleştirildi: Araç çubukları gizlendi. Açmak için F6 veya fareyi kenara getirin" uyarısı verilmez.

### Mimari Çözümler
* Küresel Odak Takibi (Global Focusin Synchronization):
  * `zen-mode.tsx` içine kapsamlı bir `focusin` dinleyicisi eklenecektir. Araç çubuğu (`#navigator-toolbox`), durum çubuğu (`#nora-statusbar`) veya kenar çubuğu (`#panel-sidebar-box`) içindeki herhangi bir eleman klavye odağı aldığında, ilgili panel otomatik olarak görünür hale getirilecek (`zenmode-reveal-top`, `zenmode-reveal-bottom`, `zenmode-reveal-side`); odak o panelin içinden ayrılana kadar (`focusout`) panel asla gizlenmeyecektir.
* Erişilebilir Canlı Durum Bildirimi:
  * Zen modu açılıp kapandığında `role="status"` ve `aria-live="polite"` ile anlık durum duyurusu yapılacaktır.

---

## 39. Bağlam Menüsü Yöneticisinde (context-menu) Sürükle-Bırak Dil Uyumsuzluğu ve Canlı Duyuru Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/context-menu/components/ContextMenuEditor.tsx`

### Tespit Edilen Sorunlar
* Sürükle-Bırak Kütüphanesinde Sabit İngilizce Seslendirme (WCAG 3.1.2 İhlali): `@dnd-kit/core` kütüphanesinin varsayılan ekran okuyucu anonsları İngilizce'dir ("Picked up draggable item", "Draggable item was moved over..."). Floorp Türkçe arayüzle kullanılırken menü öğeleri klavyeyle taşındığında ekran okuyucu Türkçe menü adını İngilizce cümlelerin arasında okur ve dil kirliliği oluşturur.
* Hedef Seçim Butonlarında Canlı Açıklama Eksikliği: Klavyeyle konum belirleme moduna geçildiğinde aralara yerleştirilen `PlacementGap` butonları arasında gezinirken, hedef konumun sırası ve toplam konum adedi canlı olarak duyurulmaz.

### Mimari Çözümler
* Yerelleştirilmiş Dnd-Kit Erişilebilirlik Anonsları:
  * `<DndContext>` bileşenine `accessibility` prop'u bağlanarak i18n üzerinden yerelleştirilmiş Türkçe anonslar tanımlanacaktır:
    * Öğe tutulduğunda: "{label} öğesi taşınmak üzere tutuldu. Yukarı ve aşağı ok tuşları ile taşıyın, bırakmak için boşluk tuşuna basın."
    * Öğe taşındığında: "{label} öğesi {position}. sıraya taşındı."
    * Bırakıldığında: "{label} öğesi bırakıldı."
    * İptal edildiğinde: "Taşıma işlemi iptal edildi."

---

## 40. Harici Tarayıcı Menüsünde (external-browser) Asenkron Boş Menü Tuzağı ve Hata Bildirimi Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/external-browser/link-context-menu.tsx`
* `browser-features/chrome/common/external-browser/tab-context-menu.tsx`

### Tespit Edilen Sorunlar
* Asenkron Yükleme Odak Tuzağı: Menü açılma anında (`onPopupShowing`), mevcut alt menü elemanları temizlenir (`while (popup.firstChild) popup.removeChild(...)`) ve ardından `await this.loadBrowsers()` asenkron olarak çağrılır. Klavyeyle sağ ok tuşuna basılarak alt menüye girildiğinde menü henüz boş olduğundan ekran okuyucu boş veya tanımsız bir menüye odaklanır; tarayıcı listesi milisaniyeler sonra yüklendiğinde odak kaybolur.
* Sessiz Başarısızlık: Seçilen harici tarayıcı çalıştırılamadığında (yol bulunamadı, izin reddedildi vb.) hata yalnızca `console.error` ile bastırılır. Kullanıcı menüden seçim yapar, menü kapanır ve hiçbir şey olmaz; ne görsel ne de sesli bir hata mesajı üretilmez.

### Mimari Çözümler
* Önceden Önbelleğe Alınmış Menü ve Canlı Güncelleme:
  * Yüklü harici tarayıcılar menü açılmadan önce arka planda taranıp önbelleğe alınacak; `onPopupShowing` anında senkron olarak DOM'a basılarak odak kaybı tamamen önlenecektir.
* Erişilebilir Hata Bildirimi:
  * Harici tarayıcı başlatılamadığında Gecko'nun bildirim kutusu (`notificationbox`) veya sesli uyarı kanalı üzerinden kullanıcıya "Hedef tarayıcı başlatılamadı. Lütfen sistem izinlerini kontrol edin." uyarısı iletilecektir.

---

## 41. Kenar Çubuğu Konum Değiştirme Butonunda (reverse-sidebar-position) Kayıp Çeviri ve Durum Bildirimi

İlgili Dosyalar:
* `browser-features/chrome/common/reverse-sidebar-position/reverse-sidebar-position.tsx`
* `browser-features/chrome/utils/browser-action.tsx`

### Tespit Edilen Sorunlar
* Eksik Çeviri Anahtarı ve Başlıksız Buton: Araç çubuğu butonu kaydedilirken Fluent yerelleştirme kimliği olarak `"sidebar-reverse-position-toolbar"` iletilmektedir. Ancak kaynak kodda bu isimde hiçbir `.ftl` veya i18n anahtarı bulunmamaktadır. Sonuç olarak `document.l10n?.formatValue` boş dönmekte veya ham kimlik metnini döndürmektedir. Ekran okuyucular butonu "sidebar-reverse-position-toolbar, düğme" olarak okur.
* Tıklama Sonrası Durum Körlüğü: Butona basıldığında kenar çubuğu anında sol taraftan sağ tarafa (veya sağdan sola) geçer. Görme engelli kullanıcıya kenar çubuğunun nereye taşındığına dair hiçbir sesli geri bildirim (`aria-live="polite"`) verilmez.

### Mimari Çözümler
* Güvenli i18n Etiketi ve Canlı Konum Duyurusu:
  * Buton oluşturucuya geçerli bir yerelleştirme etiketi tanımlanacak; etiket bulunamadığında varsayılan Türkçe "Kenar Çubuğu Konumunu Değiştir" metni kullanılacaktır.
  * Konum değiştirme fonksiyonuna (`SidebarController.reversePosition`) sesli/canlı duyurucu bağlanarak "Kenar çubuğu sağ tarafa taşındı" / "Kenar çubuğu sol tarafa taşındı" duyurusu yapılacaktır.

---

## 42. Chrome Eklenti Kurulum Bildirimlerinde (addons) Kritik Karşıtlık İhlali ve Güvenlik Uyarısı İzolasyonu

İlgili Dosyalar:
* `browser-features/chrome/common/addons/notification-customizer.ts`

### Tespit Edilen Sorunlar
* Ağır Karşıtlık İhlali (WCAG 1.4.3 İhlali): Chrome Web Store üzerinden eklenti yükleme uyarısı eklenirken `warning.style.cssText` içinde `color: #f9ab00` ve `background: rgba(249, 171, 0, 0.1)` tanımlanmıştır. Beyaz veya açık gri bildirim arka planında `#f9ab00` (açık turuncu/sarı) renginin karşıtlık oranı **1.96:1** düzeyindedir (asgari gereksinim 4.5:1). Az gören veya renk körlüğü olan kullanıcılar bu kritik uyarı metnini kesinlikle okuyamaz.
* Güvenlik Uyarısının Ekran Okuyucudan Gizlenmesi: Eklenen uyarı kutusu (`description`) standart bildirim hiyerarşisinin dışına eklenmekte; üzerinde `role="alert"` veya `aria-describedby` bulunmamaktadır. Ekran okuyucu kullanıcıları onay butonuna ulaştığında uyumluluk uyarısını atlayabilir.

### Mimari Çözümler
* Yüksek Karşıtlıklı Güvenlik Teması:
  * Uyarı rengi açık temada en az 4.5:1 karşıtlık sağlayan `#9a5b00` veya `--text-warning-high-contrast` rengine çekilecek; karanlık temada uygun açık renk kullanılacaktır.
  * Uyarı kutusuna `role="note"` ve bildirim ana gövdesine `aria-describedby="chrome-extension-warning"` bağlanarak ekran okuyucunun kurulum onayından önce uyarıyı zorunlu seslendirmesi sağlanacaktır.

---

## 43. Floorp OS Yönetim Panelinde (floorp-os) Belirteç Geri Bildirimi ve Erişilebilir İlerleme Göstergesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/floorp-os/page.tsx`

### Tespit Edilen Sorunlar
* Panoya Kopyalama Durum Körlüğü: Sunucu erişim belirteci ("Server Token") kopyalama butonuna tıklandığında panoya kopyalama yapılır ancak ekranda hiçbir onay mesajı çıkmaz ve ekran okuyucuya sesli bildirim iletilmez.
* Başlıksız İlerleme Göstergesi: Servis başlatılırken/durdurulurken gösterilen `<progress className="progress w-56"></progress>` elemanında `aria-label` veya `aria-valuenow` bulunmamaktadır.
* Mesaj ve Hata Kutularında Rol Eksikliği: İşlem sonucunda gösterilen mavi bilgilendirme kutusunda `role="status"`, kırmızı hata kutusunda `role="alert"` tanımlanmamıştır.
* SVG İkonlarında `aria-hidden` Eksikliği: `CheckCircle`, `XCircle`, `Download`, `Power`, `AlertCircle` ikonlarının tamamında `aria-hidden="true"` eksiktir.

### Mimari Çözümler
* Erişilebilir Geri Bildirim ve Canlı İlerleme:
  * Belirteç kopyalandığında geçici olarak buton üzerinde "Kopyalandı!" gösterilecek ve `role="status"` canlı bölgesi üzerinden "Sunucu belirteci panoya kopyalandı" duyurulacaktır.
  * `<progress>` elemanına `aria-label={t("floorpOS.messages.inProgress")}` atanacaktır.
  * Hata ve bilgi kutularına sırasıyla `role="alert"` ve `role="status"` tanımlanacak; tüm ikonlara `aria-hidden="true"` verilecektir.

---

## 44. Lepton ve İçerik CSS Temalarında Klavye Odak Halkalarının Ezilmesi (outline: none !important)

İlgili Dosyalar:
* `browser-features/skin/lepton/css/leptonChrome.css`
* `browser-features/skin/lepton/css/leptonContent.css`

### Tespit Edilen Sorunlar
* Odak Göstergesinin Yok Edilmesi (WCAG 2.4.7 Focus Visible & 2.4.11 Focus Not Obscured İhlali):
  * `leptonChrome.css` satır 2962: `xul|menulist:-moz-focusring > xul|*.menulist-label-box { outline: none !important; }` kuralı menü listelerindeki odak halkasını tamamen siler.
  * `leptonChrome.css` satır 22581: `.tab-background[multiselected="true"] { outline: none !important; }` kuralı çoklu sekme seçildiğinde sekmelerin odak halkasını tamamen ortadan kaldırır.
  * `leptonContent.css` satır 2842 ve 6687: İçerik sayfalarındaki çeşitli kontrol kutularında `outline: none` kullanılarak görsel odak sıfırlanmıştır.

### Mimari Çözümler
* Koşulsuz Odak Görünürlüğü (Unconditional Focus Visible):
  * Tüm `outline: none !important` ve `outline: 0` kuralları denetlenecektir.
  * Odak halkası asla tamamen silinmeyecek; tasarım gereği özel bir stil isteniyorsa yerine en az 3:1 karşıtlığa sahip belirgin bir odak halkası (`outline: 2px solid var(--focus-outline-color); outline-offset: 2px;`) tanımlanacaktır.
  * Çoklu sekme seçiminde (`multiselected="true"`) seçili sekmeleri ayırt eden çift çizgili veya yüksek karşıtlıklı kenarlık korunacaktır.

---

## 45. Pasif Menü Öğelerinin Görünmez Yapılması (hidden-disabled-menu.css A11y İhlali)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-disabled-menu.css`

### Tespit Edilen Sorunlar
* Menü Öngörülebilirliğinin Bozulması (WCAG 3.2.1 Predictability & WCAG 4.1.2 İhlali):
  * `hidden-disabled-menu.css` dosyası içindeki `menu[disabled="true"], menuitem:not(#context-back, #context-forward)[disabled="true"] { visibility: collapse !important; }` kuralı, o anda seçili içerik bulunmadığı için devre dışı olan menü öğelerini (örneğin Kes, Kopyala, Geri Al) tamamen DOM görünümünden çökerterek gizler.
  * Görme engelli veya bilişsel engeli olan kullanıcılar menü içinde ok tuşlarıyla gezinirken hangi özelliklerin var olduğunu anlayamaz; menü boyutu içeriğe göre sürekli uzayıp kısalır ve zihinsel harita bozulur. WCAG standartlarına göre menü öğeleri yerinde kalmalı, sadece `disabled="true"` veya `aria-disabled="true"` olarak duyurulmalıdır.

### Mimari Çözümler
* Standart Menü Öğesi Durum Bildirimi:
  * Menü öğelerini `visibility: collapse` ile çökertmek yerine öğeler menüde tutulmalı; standart Gecko temasıyla grileştirilerek ekran okuyucunun "Devre dışı" / "Kullanılamaz" anonsu yapması sağlanmalıdır.
  * Bu stil etkinleştirildiğinde bile ekran okuyucu veya klavye modu tespit edildiğinde kural devre dışı bırakılmalıdır.

---

## 46. Otomatik Gizlenen Sekmelerde Odak Görünürlüğü Kusuru (autohide-tab.css Focus Invisible)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/autohide-tab.css`

### Tespit Edilen Sorunlar
* Klavye Odağında Sekmenin Gizli Kalması (WCAG 2.4.7 Focus Visible İhlali):
  * `.tabbrowser-tab:not([multiselected]) .tab-content:not(:hover):not([selected]) { margin-bottom: -64px; }` kuralı uygulanmaktadır.
  * Seçicide `:not(:focus-within)` istisnası yer almamaktadır! Klavye ile Tab tuşu kullanılarak seçili olmayan bir sekmeye gelindiğinde, sekme fareyle üzerine gelinmediği (`hover`) ve henüz seçilmediği için `-64px` ile çökertilmeye devam eder. Kullanıcı ekranda göremediği görünmez bir sekmeye odaklanır.

### Mimari Çözümler
* `:focus-within` Odak Güvencesi:
  * CSS kuralı `.tabbrowser-tab:not([multiselected]) .tab-content:not(:hover):not([selected]):not(:focus-within) { margin-bottom: -64px; }` olarak güncellenecek; sekme klavye odağı aldığı anda derhal tam yüksekliğine dönerek ekranda belirginleşecektir.

---

## 47. Sekme Ses Kontrolü ve Kapat Butonunun Gizlenmesi (WCAG 1.4.2 Audio Control & 2.1.1)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-tab-audio-indicator.css`
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-tab-close-button.css`

### Tespit Edilen Sorunlar
* Ses Çalan Sekmeyi Susturma İmkansızlığı (WCAG 1.4.2 Audio Control İhlali):
  * `hidden-tab-audio-indicator.css` içinde yer alan `#tabbrowser-tabs .tab-audio-button:not([crashed]) { display: none !important; }` kuralı, sekme üzerindeki ses butonunu erişilebilirlik ağacından tamamen siler. Arka planda aniden yüksek sesli video veya ses çalan bir sekmeyi klavye veya fare ile doğrudan susturmak imkansız hale gelir.
* Tek Tıkla Sekme Kapatma Butonunun Yok Edilmesi (Motor Beceri İhlali):
  * `hidden-tab-close-button.css` içinde `.tab-close-button { display: none !important; }` kuralı uygulanır. Klavye kısayollarını kullanamayan, göz izleme cihazı veya tek tuşlu fare kullanan motor engelli bireyler sekmeleri kapatamaz hale gelir.

### Mimari Çözümler
* Erişilebilir Susturma ve Kapatma Alternatifleri:
  * Görsel olarak gizlense dahi butonlar `display: none` yapılmamalı; klavye odaklandığında veya ekran okuyucu gezindiğinde erişilebilir ağaçta korunmalıdır.
  * Sekme çubuğunda ses kontrolü için küresel bir erişilebilir ses kapatma kısayolu ve menü öğesi garanti altına alınmalıdır.

---

## 48. Yeni Sekme Sık Kullanılanlar Izgarasında (TopSiteTile) Bağlamsız Menü ve Yinelenen Başlıklar

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/TopSites/TopSiteTile.tsx`

### Tespit Edilen Sorunlar
* Fareye Bağımlı Bağlam Menüsü (Klavye Desteği Yok):
  * Sık kullanılan site kutucuğundaki işlemler (sabitleme, düzenleme, silme) yalnızca `onContextMenu` fare sağ tıkı ile açılabilmektedir. Kutucuk üzerinde klavyeyle odaklanıldığında açılacak bir 3 nokta menü butonu veya klavye tetikleyicisi yoktur.
* Yinelenen Başlık Okuması (Screen Reader Clutter):
  * Favicon görseline `alt={site.title}` verilmiş, hemen altındaki metne de `title={site.title}` atanmıştır. Ekran okuyucu kullanıcısı her kartta site adını peş peşe 2 kez duymaktadır.
* Sabitlenmiş Durum Körlüğü:
  * Sabitlenmiş sitelerde gösterilen `PinIcon` görseli hiçbir metinsel alternatif veya ARIA özniteliği taşımamaktadır; ekran okuyucu sitenin sabitlenmiş olup olmadığını anlayamaz.

### Mimari Çözümler
* Erişilebilir Kart Mimarisi:
  * Favicon görseli `aria-hidden="true"` ve `alt=""` yapılarak dekoratif hale getirilecektir.
  * Karta `aria-label={`${site.title}${isPinnedSite ? " (Sabitlenmiş)" : ""}`}` atanacaktır.
  * Klavye ile erişilebilen ve Shift+F10 veya butonla açılan standart bir seçenekler menüsü eklenecektir.

---

## 49. Yeni Sekme Ayarları Engellenen Siteler Listesinde Bağlamsız Butonlar (WCAG 2.4.4 / 2.4.9)

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/Settings/index.tsx`

### Tespit Edilen Sorunlar
* Bağlamsız Kaldırma Butonları:
  * Engellenen siteler listesinde her satırdaki buton yalnızca "Engellemeyi Kaldır" (`t("settings.unblock")`) metnini taşımaktadır. Ekran okuyucu kullanıcısı Tab ile butonlar arasında gezinirken arka arkaya "Engellemeyi Kaldır, düğme" duyar, hangi sitenin engelinin kalkacağını bilemez.
* Canlı Durum Eksikliği:
  * Bir sitenin engeli kaldırıldığında listeden silinir ancak ekran okuyucuya `role="status"` ile "{url} sitesinin engeli kaldırıldı" anonsu yapılmaz.

### Mimari Çözümler
* URL Belirtimli Buton Etiketleri ve Canlı Bildirim:
  * Butonlara `aria-label={t("settings.unblockSite", { url })}` ("{url} sitesinin engellemesini kaldır") atanacaktır.
  * İşlem tamamlandığında `role="status"` ve `aria-live="polite"` konteyneri üzerinden anlık sesli bilgilendirme yapılacaktır.

---

## 50. Notlar Zengin Metin Editöründe (RichTextEditor) Ok Tuşlarının Zorla Yutulması

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/RichTextEditor.tsx`

### Tespit Edilen Sorunlar
* NVDA / JAWS Sanal İmleç Çökmesi (Ok Tuşlarının Yutulması):
  * `RichTextEditor.tsx` satır 79-115 arasında `handleKeyDown` olayı içinde tüm yön okları (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) yakalanmakta ve `event.preventDefault()` yapılarak `return true` (olay tüketildi) döndürülmektedir.
  * Bu zorlama işlem, NVDA ve JAWS ekran okuyucularının sanal imleç (browse mode) ile metni satır satır veya karakter karakter okuma mekanizmasını tamamen felç eder. Ekran okuyucu kullanıcısı notun içinde ok tuşlarıyla serbestçe gezinemez ve imleç takılı kalır.
  * Ayrıca ProseMirror iç seçimi `sel.anchorOffset` ile senkronize edilmeye çalışılmakta, çok paragraflı notlarda metin ofseti saparak seçimi bozmaktadır.
* Başlıksız Editör Kutusu:
  * Editör gövdesinde `role="textbox"` ve `aria-label={t("notes.editorContent")}` eksiktir.

### Mimari Çözümler
* Doğal Bakım ve Ekran Okuyucu Uyumluluğu:
  * Ok tuşu manipülasyonu yalnızca içerik dışı XUL pencerelerinde gerektiğinde sınırlandırılacak; ekran okuyucu veya sanal imleç aktifken yön okları engellenmeyecektir.
  * Editör konteynerine `role="textbox"`, `aria-multiline="true"` ve yerelleştirilmiş `aria-label` tanımlanacaktır.

---

## 51. Notlar Görsel Yeniden Boyutlandırma Kulpunda (ResizableImage) 12 Piksellik Tıklama Hedefi

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/ResizableImage.tsx`

### Tespit Edilen Sorunlar
* Yetersiz Hedef Boyutu (WCAG 2.5.8 Target Size Minimum İhlali):
  * Eklenen görsellerin sağ alt köşesinde beliren yeniden boyutlandırma kulpu `w-3 h-3` yani tam **12x12 piksel** boyutundadır! Bu boyut WCAG 2.5.8 standardının (en az 24x24 piksel) yarısı kadardır. Titreme, kas kontrol güçlüğü veya motor engeli olan kullanıcıların bu kulpu yakalaması imkansızdır.
* Klavye Desteğinin Tamamen Yokluğu (WCAG 2.1.1 Keyboard Parity):
  * Boyutlandırma yalnızca fareyle `onMouseDown` sürüklemesi ile yapılabilmektedir. Klavyeyle görsel boyutunu büyütüp küçültecek hiçbir mekanizma sunulmamıştır.

### Mimari Çözümler
* Erişilebilir Boyutlandırma ve Slider Semantiği:
  * Kulp boyutu en az 24x24 piksel dokunma/tıklama alanına yükseltilecek (görsel olarak küçük kalsa bile `::after` ile tıklama alanı 24px yapılacaktır).
  * Kulp elemanına `role="slider"`, `tabIndex={0}`, `aria-label="Görsel genişliğini ayarla"`, `aria-valuenow` atanacak; `ArrowLeft` / `ArrowRight` tuşlarıyla klavyeden boyutlandırma desteği sağlanacaktır.

---

## 52. Not Arama Kutusunda Canlı Sonuç Sayacı Eksikliği ve Minik Temizle Butonu

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteSearch.tsx`

### Tespit Edilen Sorunlar
* Canlı Sonuç Körlüğü: Not arama kutusuna metin girildiğinde not listesi dinamik olarak filtrelenir ancak kaç notun eşleştiği ekran okuyucuya bildirilmez.
* Küçük Temizleme Butonu: Arama kutusu içindeki temizleme (X) ikonu `h-3 w-3` (12x12px) boyutundadır ve dokunma alanı tanımlanmamıştır.
* SVG Erişilebilirlik İhlali: Arama büyüteç ikonunda `aria-hidden="true"` eksiktir.

### Mimari Çözümler
* Canlı Durum Sayacı ve Erişilebilir Buton:
  * Arama alanının altına `role="status"` ve `aria-live="polite"` içeren gizli bir sayaç eklenecek ("3 not bulundu" / "Eşleşen not yok").
  * Temizleme butonunun tıklama alanı en az 24x24 piksele genişletilecek ve tüm dekoratif ikonlara `aria-hidden="true"` eklenecektir.

---

## 53. Ayarlar Genel Arama Sonuçlarında Üst Link Nedeniyle Eşleşme Özetinin Gizlenmesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/search/page.tsx`
* `browser-features/pages-settings/src/header/SearchInput.tsx`

### Tespit Edilen Sorunlar
* Erişilebilir İsim Önceliği Tuzağı (Accessible Name Computation Hatası):
  * `<Link to={...} aria-label={openLabel}>` sarmalayıcısı kullanılmıştır. W3C Erişilebilir İsim Hesaplama kurallarına göre, bir bağlantı üzerinde `aria-label` tanımlandığında, bağlantının içindeki TÜM çocuk elemanların metinleri ekran okuyucu tarafından yok sayılır!
  * Sonuç olarak kartın içindeki arama eşleşme özeti (`snippet`) ve eşleşen metin (`matchedText`) ekran okuyucu tarafından asla okunmaz! Kullanıcı ayarın neden arama sonucunda çıktığını duyamaz.
* Canlı Arama Sonuç Sayacı Eksikliği: Arama sonuçları güncellendiğinde sonuç sayısı (`results.length`) ekran okuyucuya `aria-live` ile aktarılmaz.

### Mimari Çözümler
* Doğal DOM Başlığı ve Canlı Bölge:
  * `<Link>` üzerindeki baskılayıcı `aria-label` kaldırılacak; ekran okuyucunun hem ayar başlığını (`CardTitle`) hem de eşleşme metnini (`CardContent`) sırasıyla okuması sağlanacaktır.
  * Arama sonuçları alanına `role="status"` ve `aria-live="polite"` tanımlanarak "{count} arama sonucu bulundu" anonsu yapılacaktır.

---

## 54. Çok Satırlı Sekme Çubuğunda (Multirow-tabbar) Dikey Klavye Taşıma Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/multirow-tabbar/tab-drag-drop-manager.ts`

### Tespit Edilen Sorunlar
* Yalnızca Fareye Bağımlı Dikey Yeniden Sıralama:
  * Çok satırlı sekme çubuğunda sekmelerin bir üst veya bir alt satıra taşınması yalnızca fare sürükle-bırak (`dragover`, `drop`) olayları ile yönetilmektedir.
  * Klavyeyle sekme taşımak isteyen kullanıcılar için yalnızca Firefox'un varsayılan yatay hareket tuşları (`Ctrl+Shift+PageUp/PageDown`) mevcuttur; sekmeyi doğrudan üst satıra veya alt satıra geçirecek hiçbir klavye kısayolu veya WAI-ARIA taşıma protokolü bulunmamaktadır.
* Görsel Sürükleme Göstergesi Körlüğü: Sürükleme sırasındaki bırakma çizgisi (`dropIndicator`) yalnızca görsel CSS dönüşümü ile gösterilmekte, ekran okuyucuya sekmenin hangi konuma yerleşeceği bildirilmemektedir.

### Mimari Çözümler
* Klavye ile Satırlar Arası Sekme Hareketi:
  * Çok satırlı sekme çubuğuna dikey sekme taşıma kısayolları (`Ctrl+Shift+Yukarı Ok` ve `Ctrl+Shift+Aşağı Ok`) eklenecektir.
  * Sekme satır değiştirdiğinde sesli/canlı bildirim yapılarak "Sekme 2. satır, 3. sıraya taşındı" duyurulacaktır.

---

## 55. Sekme Boyutu Özelleştirmesinde 20 Piksellik Dokunma Alanı İhlali (WCAG 2.5.8)

İlgili Dosyalar:
* `browser-features/chrome/common/tab/sizeSpecification/index.tsx`

### Tespit Edilen Sorunlar
* Kritik Hedef Boyutu İhlali (WCAG 2.5.8 Target Size Minimum):
  * `sizeSpecification/index.tsx` dosyası satır 25'te sekme asgari yüksekliğinin `20px` değerine kadar düşürülmesine izin vermektedir (`validatedMinH < 20`).
  * Bir sekmenin yüksekliği 20 piksele indirildiğinde, sekme ve içindeki kapat butonu WCAG 2.5.8 standardının zorunlu kıldığı asgari 24x24 piksel sınırını doğrudan deler. Motor engeli veya görme azlığı olan bireyler için sekmeyi tıklamak veya seçmek aşırı zorlaşır.

### Mimari Çözümler
* Erişilebilir Alt Sınır Güvencesi:
  * Sekme asgari yüksekliği (`tabMinHeight`) yazılımsal olarak en az 24 piksele (tercihen erişilebilir modda 32-44 piksele) kilitlenecek; kullanıcının 24 pikselin altında bir değer girmesi engellenecektir.

---

## 56. Sabitlenmiş Sekme Başlığı Gösteriminde 60 Piksellik Zorunlu Kırpılma

İlgili Dosyalar:
* `browser-features/chrome/common/tab/pinnedTabCustomization/style.css`

### Tespit Edilen Sorunlar
* Aşırı Metin Kırpılması ve Metin Büyütme Çökmesi (WCAG 1.4.4 Resize Text):
  * `.tab-label-container[pinned] { max-width: 60px !important; }` kuralı uygulanmaktadır.
  * Sabitlenmiş sekmelerde başlık gösterimi açıldığında başlık alanı zorla 60 piksel ile sınırlandırılır. Kullanıcı sistem yazı boyutunu %200 büyüttüğünde veya Türkçe gibi uzun başlıklarda sekmede yalnızca 2-3 harf görünür, metin okunamaz hale gelir.
  * Tam başlığı gösteren erişilebilir bir ipucu (`tooltip`) entegre edilmemiştir.

### Mimari Çözümler
* Dinamik Genişlik ve Tam İpucu Desteği:
  * `max-width: 60px` sınırı esnek hale getirilecek veya kullanıcı yazı tipi büyütüldüğünde göreceli birimlere (`em/rem`) bağlanacaktır.
  * Sabitlenmiş sekme üzerine gelindiğinde veya klavye ile odaklanıldığında tam sayfa başlığını bildiren yerel araç ipucu (`tooltiptext`) zorunlu tutulacaktır.

---

## 57. Chrome Web Store Eklenti Kurulum Butonunda Odak Düşmesi ve Otomatik Kapanan Hata

İlgili Dosyalar:
* `browser-features/modules/actors/NRChromeWebStoreChild.sys.mts`

### Tespit Edilen Sorunlar
* Buton Pasifleştirmede Odak Kaybı:
  * Kullanıcı "Floorp'a Ekle" butonuna tıkladığında `updateButtonState` fonksiyonu `button.disabled = true` atamaktadır. HTML standartları gereği odakta olan bir buton devre dışı bırakıldığında odak anında `<body>` etiketine düşer ve kaybolur.
* Zaman Ayarlı Hata Kutusu (WCAG 2.2.1 Timing Adjustable İhlali):
  * Kurulum hatası oluştuğunda gösterilen hata bildirimi (`#floorp-cws-error`), `setTimeout(..., NOTICE_TIMEOUT)` ile birkaç saniye içinde kullanıcıdan habersiz otomatik olarak silinmektedir. Ekran okuyucu kullanıcısı veya yavaş okuyan bir birey hatayı algılayamadan kutu kaybolur.
  * Hata kutusunda `role="alert"` tanımlanmamıştır. Kapatma butonu 16x16 pikseldir (WCAG 2.5.8 ihlali).

### Mimari Çözümler
* `aria-busy` Odak Koruması ve Kalıcı Uyarı:
  * Buton `disabled` yapılmak yerine `aria-busy="true"` ve `aria-disabled="true"` yapılacak; odak buton üzerinde korunacaktır.
  * Hata bildirimine `role="alert"` eklenecek; zamanlayıcıyla otomatik silinme kaldırılacak ve yalnızca kullanıcı kapat butonuna basana kadar ekranda kalması sağlanacaktır. Kapatma butonu en az 24x24 piksele genişletilecektir.

---

## 58. IP Koruması (IP Protection) Entegrasyonunda Sessiz Başarısızlık ve Kalıcı Görünmezlik

İlgili Dosyalar:
* `browser-features/modules/modules/ipprotection/FloorpIPProtectionUI.sys.mts`

### Tespit Edilen Sorunlar
* Sessiz Kaybolma (Silent Vanishing):
  * `FloorpIPProtectionUI` paneli hazırlarken `#ipprotection-button` ve `#PanelUI-ipprotection` elemanlarına `visibility: hidden !important; pointer-events: none !important;` koruma stili uygular.
  * Eğer panel 120 kare (~2 saniye) içinde hazır hale gelemezse, sistem denemeyi bırakır ve hatayı yalnızca konsola yazar (`console.error`). IP koruma butonu ve paneli sonsuza kadar görünmez ve tıklanamaz kalır; kullanıcı özelliğin neden kaybolduğunu anlayamaz.

### Mimari Çözümler
* Erişilebilir Hata Fallback'i:
  * Yeniden deneme limiti aşıldığında öğeleri sonsuza kadar gizlemek yerine buton görünür yapılmalı ve tıklandığında "IP Koruması servisi başlatılamadı. Lütfen tarayıcıyı yeniden başlatın." erişilebilir hata diyalogu gösterilmelidir.

---

## 59. İş Akışı Yönetim Penceresinde Başlıksız Çerçeve ve Zorunlu En Üstte Kalma Tuzağı

İlgili Dosyalar:
* `browser-features/modules/modules/os-automotor/OSFrontEndManager.sys.mts`

### Tespit Edilen Sorunlar
* Sistem Menüsü ve Başlık Çubuğu Yokluğu:
  * İş akışı ilerleme penceresi açılırken `windowFeatures` listesinde `titlebar=no`, `alwaysontop`, `alwaysRaised` bayrakları kullanılmaktadır.
  * `titlebar=no` yüzünden pencerenin yerel Windows başlık çubuğu silinir; ekran okuyucular `Alt+Tab` ile pencereye geçtiğinde pencere başlığını duyuramaz ve kullanıcı `Alt+Space` sistem menüsünü (Simge durumuna küçült, Taşı, Kapat) kullanamaz.
  * `alwaysontop` bayrağı, ekran büyütücü (ZoomText vb.) kullanan bireylerin görüş alanını kalıcı olarak bloke eder.

### Mimari Çözümler
* Erişilebilir Yerel Pencere Çerçevesi:
  * Zorunlu `titlebar=no` bayrağı kaldırılarak standart erişilebilir pencere başlığı ("İş Akışı İlerlemesi") sağlanacaktır.
  * `alwaysontop` davranışı isteğe bağlı hale getirilecek; `Escape` veya `Alt+F4` ile pencerenin kolayca kapatılabilmesi temin edilecektir.

---

## 60. QR Kod Sayfa Eylem Butonunda tabindex Yokluğu ve Boş Panel Odak Tuzağı

İlgili Dosyalar:
* `browser-features/chrome/common/qr-code-generator/qr-code-button.tsx`
* `browser-features/chrome/common/qr-code-generator/qr-code-panel.tsx`
* `browser-features/chrome/common/qr-code-generator/qr-code-manager.tsx`

### Tespit Edilen Sorunlar
* Klavye Odaklanamazlığı:
  * `QRCodePageActionButton` bir `<xul:hbox>` olarak render edilir ve `role="button"` taşır. Ancak `tabindex="0"` özniteliği atanmamıştır! Klavyeyle adres çubuğundaki eylemler taranırken bu buton tamamen atlanır.
* Boş Panel ve Odak Tuzağı:
  * Açılan `qrcode-panel` içinde hiçbir odaklanabilir buton veya metin kutusu yoktur; yalnızca statik başlık ve QR görseli bulunur. Panel açıldığında odak gidecek bir yer bulamaz ve kaybolur. QR kod içeriğindeki URL kopyalanamaz veya panoya aktarılamaz.

### Mimari Çözümler
* Erişilebilir Buton ve Etkileşimli Panel:
  * Butona `tabindex="0"`, `aria-label="Bu sayfa için QR kod oluştur"` ve `aria-haspopup="dialog"` eklenecektir.
  * Panel içine "Bağlantıyı Kopyala" ve "QR Kodu İndir" butonları ile `role="img"` ve `aria-label="Geçerli sayfa URL'sini içeren QR Kod"` taşıyan erişilebilir bir görsel sarmalayıcı eklenecektir.

---

## 61. Firefox Kenar Çubuğu Boyutlandırıcısında (resizer) WAI-ARIA Değer Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/firefox-sidebar/overlay.ts`

### Tespit Edilen Sorunlar
* Eksik Ayırıcı (Separator/Splitter) Değerleri:
  * `overlay.ts` satır 125'te ayırıcıya `role="separator"` ve `tabIndex = 0` verilmiştir. WAI-ARIA 1.2 şartnamesine göre odaklanabilir bir ayırıcı (pencere bölücü) zorunlu olarak `aria-valuenow`, `aria-valuemin` ve `aria-valuemax` özniteliklerini taşımak zorundadır. Bu öznitelikler eksik olduğunda ekran okuyucular bölücünün boyutunu veya sınırlarını duyuramaz.
* Klavyeyle Kapatmada Odak Boşluğu:
  * Satır 167'de `(event as MouseEvent).detail > 0` kontrolü yapılmaktadır. Klavye ile Enter/Space basıldığında `detail === 0` olduğu için odak güvenli alana (`selectedBrowser`) taşınmaz ve panel kapanırken odak boşluğa düşer.

### Mimari Çözümler
* Tam WAI-ARIA Splitter Semantiği ve Klavye Odak Transferi:
  * Ayırıcıya güncel genişlik değerleri (`aria-valuenow={currentWidth}`, `aria-valuemin="150"`, `aria-valuemax="800"`, `aria-valuetext={`${currentWidth} piksel`}`) bağlanacaktır.
  * Klavye ile kapatıldığında odak doğrudan web sayfası alanına yönlendirilecektir.


---

## 62. İndirme Çubuğunda (Downloadbar) `disablekeynav="true"`, Etiketsiz İkon Butonları ve 2px İlerleme Çubuğu

İlgili Dosyalar:
* `browser-features/chrome/static/downloadbar/downloadbar.tsx`
* `browser-features/chrome/static/downloadbar/downloadbar.css`
* `browser-features/chrome/static/downloadbar/downloadbar-manager.tsx`

### Tespit Edilen Sorunlar
* Kasıtlı Klavye Engellemesi (`disablekeynav="true"`):
  * `downloadbar.tsx` satır 113'te `#downloadsPanel-multiView` kapsayıcısına doğrudan `disablekeynav="true"` özniteliği verilmiştir. Bu öznitelik, Firefox'un yerel klavye gezinti motorunu devre dışı bırakarak kullanıcının Ok tuşlarıyla veya Tab ile indirilen dosyalar arasında dolaşmasını tamamen engeller.
* Tamamen Etiketsiz ve İsimsiz Butonlar (WCAG 4.1.2):
  * Satır 133-142 arasında yer alan `#downloadIcon` (İndirme Geçmişi) ve `#closeIcon` (Listeyi Temizle) butonları hiçbir metin, `aria-label`, `title` veya `data-l10n-id` taşımaz. Ekran okuyucular bu butonları "isimsiz düğme" (unlabelled button) veya tamamen sessiz olarak geçer.
* Eksik WAI-ARIA İlerleme Göstergesi (WCAG 4.1.2 / 1.3.1):
  * Satır 158-162'de yer alan `<progress id="downloadsSummaryProgress">` öğesi `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` ve `aria-label` özniteliklerinden yoksundur. Ekran okuyucu kullanıcıları indirmenin yüzde kaçta olduğunu duyamaz.
* Semantiksiz Tıklanabilir Kapsayıcı (WCAG 4.1.2):
  * Satır 149-154'teki `#downloadsSummary` kutusu `onkeydown` ve `onclick` olaylarını dinlemesine rağmen düz bir `<hbox>` olarak kalmıştır; `role="button"` ve `tabindex="0"` verilmemiştir.
* Görünmez Kaydırma Çubuğu ve Gizlenen Boş Durum (WCAG 1.4.10 / 2.1.1):
  * `downloadbar.css` satır 11'de `#downloadsListBox` için `scrollbar-width: none;` verilmiştir. Yatay kaydırma çubuğu gizlendiğinde, motor kısıtlılığı olan veya az gören kullanıcılar listenin sağa doğru taştığını anlayamaz.
  * Satır 31'de `#emptyDownloads { display: none !important; }` kuralı ile indirme listesi boş olduğunda gösterilecek bilgilendirme metni zorla yok edilmiştir.
  * Satır 81'de `.downloadProgress { height: 2px; }` kuralı ile ilerleme çubuğu 2 piksele düşürülmüştür; bu durum WCAG 1.4.11 ve 2.5.8 uyarınca düşük görüşlü kullanıcılar için neredeyse görünmezdir.
  * İndirme butonlarının hover stilleri tanımlanmış ancak klavye odağını belirten `:focus-visible` stilleri yazılmamıştır.

### Mimari Çözümler
* Tam Klavye Erişilebilirliği ve Etiketleme:
  * `disablekeynav="true"` kaldırılacak, liste içi klavye odak halkası aktif edilecektir.
  * `#downloadIcon` ve `#closeIcon` butonlarına `data-l10n-id="downloads-history"` ve `data-l10n-id="downloads-cmd-clear-downloads"` atanacaktır.
  * İlerleme çubuğuna `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` ve `aria-valuetext` eklenecektir.
  * CSS'te ilerleme çubuğu yüksekliği minimum 6 piksele çıkarılacak ve yüksek kontrastlı odak halkaları tanımlanacaktır.

---

## 63. Sekme Çubuğu Konumlandırmasında DOM Sırası Ayrışması ve Odak Kopukluğu (WCAG 1.3.2 / 2.4.3)

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/tabbbar-style/tabbbar-style-functions.tsx`
* `browser-features/chrome/common/tabbar/tabbbar-style/tabbar-style.ts`

### Tespit Edilen Sorunlar
* Sekme Çubuğunun Web Sayfası Arkasına Taşınması (`bottomOfWindow`):
  * `tabbbar-style-functions.tsx` satır 124'te `browserElement.after(tabbarElement)` kodu çalıştırılarak `#TabsToolbar` öğesi DOM hiyerarşisinde `#browser` (web sayfası içerik alanı) öğesinin arkasına taşınmaktadır.
  * Bu durum WCAG 1.3.2 Anlamlı Sıralama ve WCAG 2.4.3 Odaklanma Sırası ilkelerini derinden zedeler. Adres çubuğundan sekme listesine geçmek isteyen bir klavye kullanıcısı, normalde üst araç çubuğunda dolaşması gerekirken, web sayfasının içindeki yüzlerce bağlantı ve butonun üzerinden geçmek zorunda kalır.
* Dikey Sekmeye Geçişte Sekmelerin Erişilebilirlik Ağacından Silinmesi:
  * `optimiseToVerticalTabbar()` çağrıldığında satır 93'te `tabbarElement?.setAttribute("hidden", "true");` çalıştırılmaktadır. Dikey sekme bileşeni henüz hazır veya odaklanabilir değilse, kullanıcı tarayıcıdaki tüm sekmelerin erişilebilirlik ağacından silindiği bir duruma düşer.

### Mimari Çözümler
* Mantıksal Sıralamanın Korunması ve Odak Zinciri Güvencesi:
  * Sekme çubuğunun pencere altında görünmesi işlemi DOM sırası bozulmadan, CSS flex/grid yerleşimiyle görsel olarak konumlandırılmalı; DOM'da araç çubukları hiyerarşisi (`navigator-toolbox`) korunmalıdır.
  * F6 döngüsü (cycle panels) sekme çubuğunun konumu nerede olursa olsun adres çubuğu ile web içeriği arasında kesintisiz odak transferi sağlayacak şekilde güncellenmelidir.

---

## 64. Chrome-Extras Gizli Araç Çubuğu (`hiddenNavbar`) ve Gizli Güvenlik Etiketi (`hiddenUrlbarIconbox`)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-navbar.css`
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-urlbar-iconbox.css`
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-tab-sharing-indicator.css`
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-tab-attention-indicator.css`
* `browser-features/chrome/common/designs/chrome-extras-css/hidden-bookmarkbar-label.css`

### Tespit Edilen Sorunlar
* Çöken Gezinti Çubuğu ve Görünmez Odak Tuzağı:
  * `hidden-navbar.css` satır 11-13'te `#nav-bar { visibility: collapse; }` kuralı uygulanır. Bu durumda adres çubuğu, geri/ileri butonları ve eklentiler çöker. Kullanıcı Ctrl+L veya Alt+D ile adres çubuğuna odaklandığında, odak çökmüş ve görünmez bir kutuda sıkışır (WCAG 2.4.7 Odak Görünürlüğü).
* Güvensiz Bağlantı ("Not Secure") Etiketinin Yok Edilmesi:
  * `hidden-urlbar-iconbox.css` satır 15'te `#identity-box[pageproxystate="valid"].notSecureText #identity-icon-label { display: none; }` kuralı yer alır. HTTP üzerinden çalışan güvensiz bir siteye girildiğinde kullanıcıya gösterilmesi zorunlu olan "Güvenli Değil" metin uyarısı sessizce yok edilir. Bu, kritik bir güvenlik ve bilişsel erişilebilirlik zafiyetidir.
* Donanım Paylaşım Göstergelerinin Kapatılması:
  * `hidden-tab-sharing-indicator.css` satır 7-9'da `#tabbrowser-tabs .tab-sharing-icon-overlay { display: none !important; }` kuralı ile sekmelerde yer alan kamera, mikrofon ve ekran paylaşımı rozetleri tamamen kapatılır. Kullanıcı hangi sekmenin ortam dinlemesi veya görüntü kaydı yaptığını takip edemez.
* Dikkat Göstergesinin ve Kalın Fontun Silinmesi:
  * `hidden-tab-attention-indicator.css` satır 7-12'de dikkat bekleyen sekmelerin bildirim noktası ve kalın yazı tipi stili sıfırlanarak ekran okuyucu ve az gören kullanıcılar için durum uyarısı yok edilir.
* Yer İmi Metinlerinin Çökertilmesi:
  * `hidden-bookmarkbar-label.css` satır 11-13'te yer imi metinleri `visibility: collapse;` ile yok edilir. Simgesi olmayan veya simgesi ayırt edilemeyen yer imleri ekranda tamamen kör kalır.

### Mimari Çözümler
* Koşullu Görünürlük ve Güvenlik Göstergelerinin Dokunulmazlığı:
  * `hiddenNavbar` aktif olsa dahi adres çubuğu klavyeyle odaklandığında (`:focus-within`) veya kısayolla çağrıldığında anında görünür hale gelmelidir.
  * Güvenlik kritik rozetleri ("Güvenli Değil", "Kamera/Mikrofon Aktif") için CSS ile gizleme seçeneği tamamen kaldırılmalı veya ekran okuyucu erişilebilirlik ağacında canlı bölge uyarısı korunmalıdır.

---

## 65. Chrome-Extras Sayfa Eylemlerinde Görünmez Odak (`autohidePageAction`) ve 8px Tetikleyici Butonu

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/autohide-page-action.css`
* `browser-features/chrome/common/designs/chrome-extras-css/autohide-sidebar.css`

### Tespit Edilen Sorunlar
* Görünmez Eleman Odak Tuzağı (WCAG 2.4.7):
  * `autohide-page-action.css` satır 15-18'de `#page-action-buttons > .urlbar-page-action` butonlarına varsayılan olarak `opacity: 0` ve negatif kenar boşluğu verilmiştir. Ancak bu butonlar DOM'da etkindir ve Tab tuşuyla odak alabilirler. Kullanıcı Tab ile gezindiğinde odak görünmez bir öğeye geçer; nereye basıldığı bilinemez.
* 8 Piksellik Hedef Boyutu İhlali (WCAG 2.5.8):
  * `autohide-sidebar.css` satır 27-28'de `#floorp-firefox-sidebar-edge-toggle` kenar çubuğu açma butonunun genişliği `width: 8px;` olarak belirlenmiştir. WCAG 2.5.8 asgari 24x24 piksel hedef boyutu şartı koşar. 8 piksel genişlikteki dikey çizgi, el titremesi olan veya dokunmatik ekran kullanan bireyler için tıklanması imkansız bir engeldir.

### Mimari Çözümler
* Odaklandığında Anında Görünürlük ve Ergonomik Tıklama Alanı:
  * Sayfa eylemi butonları odaklandığında (`:focus-visible`) geçiş gecikmesi olmadan anında `opacity: 1` ve `margin-inline-end: 0` durumuna geçmelidir.
  * Kenar çubuğu tetikleyicisi görsel olarak ince olsa bile, CSS `::before` veya `padding` yardımıyla en az 28 piksellik etkin bir tıklama alanına (`pointer-events: auto`) sahip olmalıdır.

---

## 66. Tek Satırlı Sekme Çubuğunda (`tabbarOneLiner`) Yüksek Yakınlaştırmada Sıkışma ve Taşma

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/tabbar-one-liner.css`

### Tespit Edilen Sorunlar
* %200-%400 Yakınlaştırmada Sekmelerin Yok Olması (WCAG 1.4.4 / 1.4.10):
  * `tabbar-one-liner.css` içinde adres çubuğunun genişliği `--uc-navbar-width-origin: 40vw` olarak sabitlenmiş, adres çubuğu açıldığında ise satır 83-85'te zorunlu minimum genişlik yaklaşık 370 piksele çekilmiştir.
  * Geriye kalan alan sekmelere tahsis edilmiştir (`calc(100vw - var(--uc-navbar-width))`).
  * Ekran büyütüldüğünde veya tarayıcı penceresi daraltıldığında, sekmeler 0 piksele sıkışır. Sekme başlıkları okunamaz, sekme kapatma butonları görünmez hale gelir ve sekmeler ekran dışına taşarak kaybolur.

### Mimari Çözümler
* Duyarlı Kırılma (Responsive Reflow) Mekanizması:
  * `@media (max-width: 850px)` durumunda veya yakınlaştırma %150'yi aştığında tek satırlı düzen otomatik olarak devre dışı kalmalı; adres çubuğu ve sekme çubuğu güvenli bir şekilde iki ayrı satıra ayrılmalıdır.

---

## 67. Kenar Çubuğu Flex-Order Değişikliğinde Görsel ve Mantıksal Odak Sırası Uyuşmazlığı

İlgili Dosyalar:
* `browser-features/chrome/common/flex-order/flex-order.tsx`

### Tespit Edilen Sorunlar
* CSS `order` ile DOM Sırası Arasındaki Ayrışma (WCAG 1.3.2 / 2.4.3):
  * `flex-order.tsx` dosyasında kenar çubuğunun sağa veya sola yerleştirilmesi CSS flexbox `order: 1000` (sağ) ve `order: -3` (sol) değerleri üzerinden yürütülmektedir.
  * CSS `order` yalnızca görsel yerleşimi değiştirir; DOM ağacındaki fiziksel sıralamaya dokunmaz.
  * Kenar çubuğu ekranın en sağına alındığında, klavye ile Tab basan kullanıcı görsel olarak soldaki ana içerikten önce sağdaki kenar çubuğuna odaklanır, oradan tekrar ekranın soluna geri zıplar.
  * Bu kopukluk büyüteç ve ekran okuyucu kullanan bireylerde yön ve bağlam kaybına yol açar.

### Mimari Çözümler
* DOM Yerleşim Senkronizasyonu ve Odak Döngüsü:
  * Kullanıcı kenar çubuğunu sağa veya sola aldığında yalnızca CSS değil, DOM elemanının fiziksel pozisyonu da (`#browser` öncesi veya sonrası) güncellenmeli veya F6 paneller arası gezinti akışı görsel yöne tam uyumlu hale getirilmelidir.

---

## 68. Fare Hareketiyle Pencere Taşımada (Chord-Drag) Klavyeyle Eşleniksizlik ve Ekran Okuyucu Çatışması

İlgili Dosyalar:
* `browser-features/chrome/common/window-drag/index.ts`
* `browser-features/chrome/common/window-drag/drag-session.ts`

### Tespit Edilen Sorunlar
* NVDA ve JAWS Klavye Kısayollarının Gasp Edilmesi:
  * `window-drag/index.ts` içinde Windows üzerinde `Ctrl+Alt+Sürükle` hareketi yakalanır ve `onMouseDown` içinde `e.stopImmediatePropagation()` çağrılır.
  * `Ctrl+Alt` kombinasyonu Windows üzerinde ekran okuyucuların temel tablo ve metin inceleme tuşudur. Tarayıcı bu olayı yuttuğunda ekran okuyucu donar veya kısayolu kaçırır.
* Sürükleme Hareketine Klavye Alternatifinin Sunulmaması (WCAG 2.5.7 / 2.1.1):
  * Pencereyi taşımak için yalnızca fareyle sürükleme sağlanmış, klavye ile çalışan bireyler için pencereyi ekranın sağına/soluna yaslama veya taşıma alternatifi sunulmamıştır.

### Mimari Çözümler
* Çakışmasız Kısayol Mimarisi ve Komut Paleti Entegrasyonu:
  * Taşıma mekanizması ekran okuyucu tuşlarıyla çakışmayacak bir tetikleyiciye bağlanmalı, Komut Paleti üzerinden "Pencereyi Ekranda Taşı / Konumlandır" erişilebilir klavye eylemleri eklenmelidir.

---

## 69. Çalışma Alanları (Workspaces) Sıfırlama Bildiriminde Canlı Bölge (`aria-live`) Yokluğu

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/workspaces/components/BasicSettings.tsx`

### Tespit Edilen Sorunlar
* Sessiz Başarı/Hata Bildirimi (WCAG 4.1.3):
  * Satır 180-192'de çalışma alanları sıfırlandığında basılan "Çalışma alanları başarıyla sıfırlandı" veya "Sıfırlama başarısız oldu" metni düz bir `<p>` olarak render edilmektedir.
  * Bu alanda `role="status"`, `role="alert"` veya `aria-live` bulunmadığı için ekran okuyucu kullanıcısı işlemin sonucundan haberdar olamaz.
* Yeni Sekmede Açılan Harici Bağlantı Uyarısızlığı (WCAG 3.2.5):
  * Satır 107-115'teki yardım bağlantısı `target="_blank"` ile harici dokümantasyona gider; ancak ekran okuyucuya yeni pencere açılacağı bildirilmez.

### Mimari Çözümler
* Canlı Durum Bölgesi ve Erişilebilir Bağlantı Metni:
  * Durum mesajına `role="status"` ve `aria-live="polite"` eklenecektir.
  * Harici bağlantıya `aria-label={`${t("workspaceRefresh.help")} (yeni sekmede açılır)`}` eklenecektir.

---

## 70. Kenar Çubuğu Panel Düzenleme Modalinde Güvenlik İkonu ve Hata Etiketi Hataları

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/sidebar/components/PanelEditModal.tsx`

### Tespit Edilen Sorunlar
* Metinsiz Güvenlik Durumu Emojileri (WCAG 1.1.1 / 1.3.1):
  * Satır 258-262'de URL girildiğinde gösterilen "🔒" ve "⚠️" sembolleri `pointer-events-none` div içinde yer alır; metin alternatifi yoktur. Ekran okuyucu kullanıcısı adresin güvensiz HTTP olduğunu öğrenemez.
* Hata Mesajlarının Yanlış `<label>` ile Sarmalanması (WCAG 3.3.1 / 3.3.2):
  * Satır 265-271'de doğrulama hata mesajı `<label>` etiketiyle basılmış, ancak girdi alanına `aria-describedby` veya `aria-invalid="true"` bağlanmamıştır.
* Bağlantısız Onay Kutusu (WCAG 4.1.2):
  * Satır 410-422'de "User-Agent Kullan" onay kutusunda `<input>` ile `<label>` arasında `id` ve `htmlFor` ilişkisi yoktur.

### Mimari Çözümler
* Semantik Form Bağlantıları ve Erişilebilir Güvenlik Durumu:
  * Güvenlik sembollerine `role="img"` ve `aria-label` verilecektir.
  * Hata mesajları girdilere `aria-describedby` ve `aria-invalid="true"` ile bağlanacaktır.
  * Onay kutusuna benzersiz `id` ve `htmlFor` tanımlanacaktır.

---

## 71. Panel Listesinde Sabit İngilizce Dnd Etiketi ve İsimsiz Eylem Butonları

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/sidebar/components/PanelList.tsx`

### Tespit Edilen Sorunlar
* Odaklanamayan İngilizce Tutamaç:
  * Satır 87'deki sürükleme tutamacı `<div aria-label="Drag to reorder">` düz bir div'dir; klavyeyle odaklanamaz (`role="button"`, `tabindex="0"` yoktur) ve etiketi Türkçe arayüzde İngilizce kalmıştır.
* Yinelenen İsimsiz Eylem Butonları (WCAG 2.4.4 / 2.4.9):
  * Satır 110-126'da her panel için "Paneli düzenle" ve "Sil" butonları basılmaktadır. Ekranda 5 panel varsa 5 adet özdeş "Sil" butonu oluşur; ekran okuyucu hangi panelin silineceğini duyuramaz.

### Mimari Çözümler
* Odaklanabilir Buton ve Açıklayıcı ARIA Etiketi:
  * Tutamaç odaklanabilir butona dönüştürülecek ve Türkçe yerelleştirilecektir.
  * Butonlara `aria-label={`${t("panelSidebar.editPanel")}: ${displayName}`}` formatında panel adını içeren benzersiz etiket bağlanacaktır.

---

## 72. Sürüm Notları Ayarlarında Fieldset Kapatılınca Odak Kaybı (WCAG 2.4.3)

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/updates/ReleaseNotesSettings.tsx`

### Tespit Edilen Sorunlar
* Kaydetme Anında Odağın `<body>`ye Düşmesi:
  * Satır 68'de kullanıcı bir radyo seçeneğini tıkladığında `saving` durumu `true` olur ve tüm `<fieldset disabled={!ready || saving}>` pasife alınır. Odaklanmış durumdaki radyo butonu aniden devre dışı kaldığı için tarayıcı odağı pencere gövdesine (`<body>`) düşürür.

### Mimari Çözümler
* Odak Korunarak Kaydetme Durumu Yönetimi:
  * Fieldset öğesini toptan `disabled` yapmak yerine, bileşene `aria-busy="true"` verilmeli ve odaklanmış radyo butonunun durumu korunmalıdır.

---

## 73. Karşılama Sihirbazı Özellik Demolarında Durdurulamayan Zamanlayıcı (WCAG 2.2.2)

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/features/FeatureDemos.tsx`

### Tespit Edilen Sorunlar
* Durdurulamayan Animasyon Döngüsü:
  * `GestureDemo` bileşeni her 1100 milisaniyede bir `setTimeout` ile adımları otomatik olarak ilerletir. Hareketi durduracak (Pause/Stop) bir buton veya `prefers-reduced-motion` denetimi yoktur.
  * `WorkspaceDemo` sahte sekme kapatma butonları (`<X size={14} aria-hidden="true" />`) içerir; klavye kullanıcısı etkileşime giremez.

### Mimari Çözümler
* Evrensel Duraklatma ve Erişilebilir Demo Kontrolü:
  * Otomatik demoya Duraklat/Oynat kontrolü eklenecek, `prefers-reduced-motion: reduce` aktif olduğunda otomatik ilerleme durdurulacaktır.

---

## 74. Fluerial Temasında %5 Opaklıkta Görünmez Hover Rengi ve 30px Sekme Yüksekliği

İlgili Dosyalar:
* `browser-features/skin/fluerial/css/fluerial.css`

### Tespit Edilen Sorunlar
* Algılanamaz Düşük Kontrastlı Hover Rengi (WCAG 1.4.11):
  * Satır 4-8'de araç çubuğu butonlarının hover arka planı `rgb(255 255 255 / 0.05)` (açık temada `rgb(0 0 0 / 0.05)`) olarak tanımlanmıştır. %5 opaklık insan gözüyle ayırt edilemez (1.05:1 kontrast farkı) ve butonun üzerine gelindiğini hissettirmez.
  * Satır 14'te sekme yüksekliği `--tab-min-height: 30px;` olarak daraltılmıştır; ergonomik tıklama sınırını zorlar.

### Mimari Çözümler
* Görünür Hover Kontrastı ve Ergonomik Yükseklik:
  * Hover opaklığı en az %15-%20 seviyesine çekilecek, sekme yüksekliği asgari 36 piksel seviyesinde tutulacaktır.

---

## 75. Lepton İçerik CSS Dosyasında Deneysel Özellik Açıklamalarının Gizlenmesi

İlgili Dosyalar:
* `browser-features/skin/lepton/css/leptonContent.css`

### Tespit Edilen Sorunlar
* Açıklama Metinlerinin Kasıtlı Gizlenmesi (WCAG 1.3.1):
  * Satır 24-26'da `#firefoxExperimentalCategory .description-deemphasized { display: none; }` kuralı ile `about:preferences` altındaki deneysel ayarların açıklamaları tamamen gizlenmiştir.
  * Satır 35'te `.more-options-button` için `padding: 0 !important;` verilerek tıklama alanı ezilmiştir.

### Mimari Çözümler
* Açıklayıcı Metinlerin Korunması ve Asgari Tıklama Alanı:
  * Açıklama metinlerinin gizlenmesi iptal edilecek, butonlara en az 24x24 piksel tıklama alanı verilecektir.

---

## 76. Klavye Kısayolu Odak Denetleyicisinde Dar "Düzenlenebilir Alan" Tanımı (Kısayol Gaspı)

İlgili Dosyalar:
* `browser-features/modules/actors/NRKeyboardShortcutFocusChild.sys.mts`

### Tespit Edilen Sorunlar
* WAI-ARIA Bileşenlerinde ve Ekran Okuyucu Sanal İmlecinde Kısayol Gaspı:
  * `isKeyboardShortcutEditableTarget` fonksiyonu yalnızca `<input>`, `<textarea>` ve `contenteditable` öğelerini düzenlenebilir kabul eder.
  * Özel WAI-ARIA bileşenleri (`role="slider"`, `role="treeitem"`, `role="tab"`, `role="combobox"`) ve NVDA/JAWS sanal göz atma kipi (tek harfli gezinme: H, T, F, K) düzenlenebilir sayılmaz.
  * Floorp bu öğelerde basılan tuşları çalarak kendi tarayıcı kısayolu olarak tüketir; web sayfasında gezinmeyi bozar.

### Mimari Çözümler
* Kapsamlı ARIA Odak Tanıma Motoru:
  * `isKeyboardShortcutEditableTarget` fonksiyonu WAI-ARIA etkileşimli rollerini (`slider`, `tab`, `treeitem`, `combobox`, `spinbutton`, `menuitem`) tanıyacak şekilde genişletilmelidir.

---

## 77. Fare Hareketi Kaydırma İşleminde Zorunlu "Smooth" Animasyon (Vestibüler Rahatsızlık)

İlgili Dosyalar:
* `browser-features/modules/actors/NRMouseGestureScrollChild.sys.mts`

### Tespit Edilen Sorunlar
* Azaltılmış Hareket Tercihine Rağmen Zorunlu Animasyon (WCAG 2.3.3 - Seviye AAA):
  * Satır 36'da `const BEHAVIOR = "smooth";` sabit olarak kodlanmıştır. Fare hareketleriyle sayfa kaydırılırken zorla yumuşak animasyon yürütülür.
  * Vestibüler bozukluğu olan kullanıcılar için bu durum baş dönmesi ve mide bulantısı yaratır.

### Mimari Çözümler
* Kullanıcı Hareket Tercihine Saygı:
  * `win.matchMedia('(prefers-reduced-motion: reduce)').matches` denetlenmeli ve azaltılmış hareket talep edildiğinde `behavior: "auto"` kullanılmalıdır.

---

## 78. Web Kazıyıcı ve Otomasyon Katmanında Sabit Japonca Metin ve Sayfa Kilitlenmesi

İlgili Dosyalar:
* `browser-features/modules/actors/webscraper/HighlightManager.ts`

### Tespit Edilen Sorunlar
* Sabit Japonca Bildirim Metni:
  * Satır 965'te `label.textContent = "Floorp が操作中...";` ifadesi Japonca olarak sabit kodlanmıştır. Uluslararası kullanıcılara Japonca sunulur.
  * Bu etiket `role="status"` veya `aria-live` taşımaz.
  * Sayfaya `pointer-events: none !important;` ve `overflow: hidden !important;` verilerek kullanıcı kilitlenir; işlem takıldığında acil çıkış yolu sunulmaz.

### Mimari Çözümler
* Yerelleştirme, Canlı Duyuru ve Acil İptal Mekanizması:
  * Metin `t("webscraper.operating")` ile yerelleştirilecek, `role="status"` canlı duyurusu verilecek ve Escape tuşu ile işlem güvenle iptal edilebilecektir.

---

## 79. Yeni Sekme Saat Bileşeninde Sürekli Yanıp Sönen İki Nokta (WCAG 2.2.2) ve Eksik Semantik `<time>`

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/Clock/index.tsx`

### Tespit Edilen Sorunlar
* Durdurulamayan Yanıp Sönme ve Eksik Semantik:
  * Satır 22'de `<span className="animate-pulse mx-0.5">:</span>` sürekli yanıp söner. Durdurma seçeneği yoktur.
  * Saat bilgisi semantik `<time>` elementi içinde sunulmaz ve ekran okuyucu için birleşik bir telaffuz etiketi taşımaz.

### Mimari Çözümler
* Hareketi Azaltma Desteği ve Semantik `<time>`:
  * `motion-reduce:animate-none` sınıfı eklenecek, `<time dateTime={time.toISOString()} aria-label={`${hours}:${minutes}`}>` semantiği kurulacaktır.

---

## 80. Yeni Sekme Sabit Ayarlar Butonunda Odak Halkası Eksikliği ve Ekranı Örtme Kusuru

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/SettingsButton/index.tsx`

### Tespit Edilen Sorunlar
* Odak Halkası Yokluğu ve Görsel Çakışma:
  * `fixed bottom-4 right-4` ile konumlandırılan buton yüksek yakınlaştırmada alttaki kartların üzerine biner.
  * Klavyeyle odaklandığında belirgin bir `:focus-visible` halkası içermez.

### Mimari Çözümler
* Görünür Odak Halkası ve Güvenli Kenar Boşluğu:
  * `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary` sınıfları eklenecektir.

---

## 81. Yeni Sekme DaisyUI Modalinde Dialog Rolü, Odak Tuzağı ve Başlangıç Odağı Eksikliği

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/Modal/index.tsx`

### Tespit Edilen Sorunlar
* WAI-ARIA Dialog Standartlarının Yokluğu:
  * Dış sarmalayıcı düz bir `<div>` olup `role="dialog"`, `aria-modal="true"`, `aria-labelledby` taşımaz.
  * Odak açılışta kapatma butonuna veya ilk alana gitmez; Tab tuşuna basıldığında odak modal dışındaki arka plan öğelerine kaçar.

### Mimari Çözümler
* Tam WAI-ARIA Modal Mimarisi:
  * `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ve `focus-trap` mekanizması entegre edilecektir.

---

## 82. Notlar Editör Araç Çubuğunda Açılır Menülerin Klavyeyle Kapatılamaması ve Escape Eksikliği

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/Toolbar.tsx`

### Tespit Edilen Sorunlar
* Sadece Fareyle Kapanan Menüler ve Escape İhmali:
  * Başlık ve Hizalama açılır menüleri yalnızca fare `mousedown` olayı ile kapanır; Escape tuşuna basıldığında menü kapanmaz.
  * Sol/Sağ ok tuşlarıyla butonlar arasında gezinme (WAI-ARIA Toolbar standardı) desteklenmez.
  * Butonlar `btn-xs` (14px ikonlar) ile aşırı küçük tıklama alanına sahiptir.

### Mimari Çözümler
* WAI-ARIA Toolbar Gezintisi ve Escape Desteği:
  * Escape dinleyicisi eklenecek, ok tuşlarıyla dolaşım sağlanacak ve dokunma hedefleri minimum 24px yapılacaktır.

---

## 83. Profil Yöneticisinde Canlı Yükleme Bildirimi ve "Mevcut Profil" ARIA Etiketi Eksikliği

İlgili Dosyalar:
* `browser-features/pages-profile-manager/src/App.tsx`

### Tespit Edilen Sorunlar
* Sessiz Yükleme ve Eksik Profil Durumu:
  * Satır 88'de `{loading && <div>{t("profileManager.loading")}</div>}` alanı `role="status"` ve `aria-live="polite"` taşımaz; ekran okuyucular profillerin yüklendiğini sessizce atlar.
  * Aktif profil yalnızca görsel rozet ile gösterilir, buton veya karta `aria-current="true"` bağlanmaz.

### Mimari Çözümler
* Canlı Durum ve Semantik Mevcut Profil Göstergesi:
  * Yükleme alanına canlı bölge öznitelikleri verilecek ve geçerli profile `aria-current="true"` eklenecektir.

---

## 84. Modal-Child Dinamik Formunda Bağlantısız Etiketler, İsimsiz Radyo Grupları ve Sabit İngilizce Buton

İlgili Dosyalar:
* `browser-features/pages-modal-child/src/App.tsx`

### Tespit Edilen Sorunlar
* Bağlantısız Form Etiketleri ve Sahte Açılır Menü:
  * Girdi alanlarındaki `<label>` etiketleri `htmlFor` taşımaz ve girdilerin `id` değeri yoktur; ekran okuyucu alan adlarını okuyamaz (WCAG 4.1.2).
  * Açılır menü (`dropdown`) `role="listbox"` taşımaz, seçenekler `role="option"` taşımaz ve klavyeyle seçilemez; yalnızca fareyle tıklanabilir.
  * Radyo butonlarında `name` özniteliği eksiktir; tarayıcı bunları aynı grupta saymaz ve ok tuşlarıyla gezinilemez.
  * Form onay butonu varsayılan olarak sabit İngilizce `"Submit"` metnine düşer.
  * Modal içinde Escape tuşu dinlenmez.

### Mimari Çözümler
* Tam Semantik Form Standartları:
  * Tüm form bileşenleri `id`/`htmlFor` ile birbirine bağlanacak, radyo butonlarına `name` ve `role="radiogroup"` verilecek, açılır menü tam WAI-ARIA listbox standardına dönüştürülecektir.

---

## 85. Komut Paleti Adım Seçeneklerinde Eksik Listbox Etiketi ve Canlı Hata Bildirimi Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/command-palette/components/StepChoices.tsx`
* `browser-features/chrome/common/command-palette/components/StepIndicator.tsx`
* `browser-features/chrome/common/command-palette/components/CommandPalette.tsx`

### Tespit Edilen Sorunlar
* Eksik Listbox Etiketi ve Sessiz Giriş Hataları:
  * `StepChoices.tsx` içinde `role="listbox"` taşıyan öğe `aria-label` veya `aria-labelledby` taşımaz.
  * `CommandPalette.tsx` satır 130'da `<div class="command-palette-step-error">{error()}</div>` hata bildirimi `role="alert"` ve `aria-live="assertive"` taşımaz; hatalı URL girildiğinde ekran okuyucu sessiz kalır.
  * `StepIndicator.tsx` çok adımlı ilerlemede `role="status"` canlı duyurusundan yoksundur.

### Mimari Çözümler
* WAI-ARIA Listbox Etiketleme ve Canlı Hata Duyurusu:
  * Listbox'a `aria-label` verilecek, hata mesajına `role="alert"` eklenecek ve adım geçişleri canlı olarak duyurulacaktır.

---

## 86. Ayarlar ve Notlar Modüllerinde Kritik Türkçe Dil Çevirisi Eksiklikleri (WCAG 3.1.2)

İlgili Dosyalar:
* `browser-features/pages-settings/src/lib/i18n/locales/tr-TR.json`
* `browser-features/pages-notes/src/lib/i18n/locales/tr-TR.json`
* `i18n/tr-TR/browser-chrome.json`

### Tespit Edilen Sorunlar
* Eksik Çeviriler Yüzünden Ekran Okuyucu Fonetik Bozulması:
  * Ayarlar Türkçe dosyasında `contextMenu` ve `commandPalette` ana bölümleri tamamen eksiktir.
  * Sekme kapatma butonu, paylaşım göstergesi, dikkat göstergesi ve firefox kenar çubuğu ayarları dahil 17 kritik yaprak anahtar Türkçe dosyada yoktur.
  * Notlar Türkçe dosyasında dışa aktarma anahtarları (`notes.export`, `error.exportFailed`) eksiktir.
  * Bu durum Türkçe konuşan ekran okuyucuların (NVDA Yelda, Narrator Tolga vb.) İngilizce teknik anahtarları Türkçe fonetikle anlaşılmaz biçimde hecelemesine yol açar.

### Mimari Çözümler
* Tam Çeviri Bütünlüğü:
  * Tüm eksik anahtarlar eksiksiz ve doğal Türkçe çevirilerle dosyalara eklenecektir.

---

## 87. Fare Tekerleği ile Sekme Değiştirme Kazara Tetiklenme Tehlikesi ve İşitsel Onay Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/tab/scroll/index.ts`

### Tespit Edilen Sorunlar
* Motor Titremesinde ve Büyüteç Gezintisinde Sekme Kaybı (WCAG 3.2.1 / 3.2.2):
  * Sekme çubuğunda tekerlek çevrildiğinde sekmeler anında değişir.
  * Ekran büyüteci kullanan veya el titremesi olan kullanıcılar kazara tekerleği oynattığında bağlam aniden değişir. Ekran okuyucuya hangi sekmenin açıldığına dair duyuru yapılmaz.

### Mimari Çözümler
* Eşik Dengeleme ve Canlı Sekme Duyurusu:
  * Tekerlek ile sekme geçişi gecikmeli eşik (debounce/threshold) filtresine bağlanmalı ve geçiş gerçekleştiğinde sekme başlığı canlı bölgeden duyurulmalıdır.

---

## 88. Sekme Yığınlarında (Tab-Stacks) Klavye ile Sekme Taşıma / Sıralama Alternatifinin Olmaması

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/proxy-drag.ts`
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`

### Tespit Edilen Sorunlar
* Sürükleme Hareketine Klavye Alternatifinin Sunulmaması (WCAG 2.5.7 / 2.1.1):
  * Sekmeleri yığınlar arasında taşımak veya yığın içinde sıralamak yalnızca fareyle sürükle-bırak (`dragstart`, `dragover`, `dragend`) yöntemiyle mümkündür.
  * Klavyeyle çalışan bir kullanıcı için "Sekmeyi sonraki/önceki yığına taşı" veya "Yığın içinde yukarı/aşağı taşı" alternatifi yoktur.

### Mimari Çözümler
* Klavye ve Bağlam Menüsü ile Yığın Dolaşımı:
  * Sekme bağlam menüsüne ve kısayol yöneticisine klavyeyle yığınlar arası taşıma komutları eklenecektir.

---

## 89. Paylaşımlı UI Modalinde (`libs/ui/modal.tsx`) Odak Restorasyonu ve Yedek Kapatma Sembolü Kusuru

İlgili Dosyalar:
* `libs/ui/modal.tsx`

### Tespit Edilen Sorunlar
* Odak Kaybı ve Anlamsız Kapatma Karakteri:
  * `ConfirmModal` bileşeninin aksine `Modal` bileşeni `initialFocusEl` ve `finalFocusEl` referanslarına sahip değildir. Modal kapandığında odak açan butona dönemez ve `<body>` öğesine düşer.
  * Kapatma butonu `aria-label={closeLabel}` alır; ancak `closeLabel` sağlanmadığında buton etiketi salt çarpı karakteri "×" (U+00D7) olur. Ekran okuyucu bunu "çarpı işareti düğmesi" veya "times button" olarak seslendirir.

### Mimari Çözümler
* Güvenli Odak Restorasyonu ve Evrensel Kapatma Etiketi:
  * `initialFocusEl` ve `finalFocusEl` mantığı eklenecek, kapatma butonuna varsayılan olarak `t("ui.close", { defaultValue: "Kapat" })` bağlanacaktır.


---

## 90. Klavye Kısayolu Düzenleyicisinde (`ShortcutEditor.tsx`) Klavye Tuzağı (Keyboard Trap) ve Görsel/İşitsel Durum İletişim Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/keyboard-shortcut/components/ShortcutEditor.tsx`

### Tespit Edilen Sorunlar
* Klavye Tuzağı ve Odak Hapsi (WCAG 2.1.2 No Keyboard Trap - Level A):
  * Düzenleyici penceresi açıldığında veya tuş girdi kutusu odak aldığında `isRecording` durumu `true` olur.
  * `isRecording` aktifken çalışan `handleKeyDown` olayı, basılan her tuş için koşulsuz olarak `e.preventDefault(); e.stopPropagation();` çağırır.
  * Sonuç olarak klavye kullanıcısı Tab, Shift+Tab, Escape veya Enter tuşlarına basarak girdi kutusundan ayrılamaz veya kaydı iptal edemez.
  * Dahası, modal bileşeninin Escape ile kapanma davranışı `closeOnEscape={!isRecording}` kuralıyla kayıt anında açıkça engellenmiştir. Klavyeyle çalışan bir kullanıcı bu modal içinde kilitli kalır.
* Dinamik Durum İletişim Eksikliği (WCAG 4.1.3 Status Messages - Level AA):
  * Kayıt modu başladığında girdi kutusu üzerine binen `"Kayıt ediliyor..."` (`recording`) görsel katmanı ve tuş önizleme kutusu `role="status"` veya `aria-live="polite"` barındırmaz.
  * Ekran okuyucu kullanıcısı sistemin tuş dinleme moduna geçtiğinden tamamen habersiz kalır.
* Semantik Olmayan Değiştirici Tuş Simgeleri (WCAG 1.1.1 Non-text Content):
  * Tuş önizleme fonksiyonunda macOS simgeleri (`⌥`, `⌃`, `⌘`, `⇧`) ekrana metin olarak yazılır. Ekran okuyucular bu sembolleri ya sessiz geçer ya da anlamsız karakter adlarıyla okur.

### Mimari Çözümler
* Güvenli Tuş Dinleme ve Klavye Tuzağı İptali:
  * `handleKeyDown` fonksiyonu Tab ve Escape tuşlarını kayıt dışı bırakmalı; Escape basıldığında kayıt modunu derhal iptal etmeli (`setIsRecording(false)`), Tab tuşunda ise odağın bir sonraki butona geçmesine izin vermelidir.
* Canlı Durum Bölgesi (`aria-live="polite"`):
  * Kayıt durumunu ve seçilen yeni kısayolu seslendiren gizli bir canlı bölge (`sr-only` live region) entegre edilmelidir.
* Erişilebilir Değiştirici Tuş İsimleri:
  * Simgelerin yanına veya `aria-label` alanına platforma duyarlı tam isimler (`Option / Alt`, `Control`, `Command / Windows`, `Shift`) bağlanmalıdır.

---

## 91. Kısayol Ayarları Tablosunda (`ShortcutsSettings.tsx`) Bağlamdan Kopuk Yinelenen Butonlar ve Eksik Tablo Semantiği

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/keyboard-shortcut/components/ShortcutsSettings.tsx`

### Tespit Edilen Sorunlar
* Bağlamsız Buton İsimleri (WCAG 2.4.4 Link Purpose / Button Purpose in Context - Level A & WCAG 4.1.2):
  * Tablodaki onlarca satırda yer alan butonlar yalnızca "Düzenle" / "Ekle" (`t("keyboardShortcut.edit")`) ve "Sil" (`t("keyboardShortcut.delete")`) metinlerine sahiptir.
  * Ekran okuyucu ile sayfa içi butonlar listesi (Elements List / Rotor) açıldığında veya Tab ile gezildiğinde art arda 40 kez "Düzenle, düğme", "Sil, düğme" okunur; kullanıcının hangi işlevi düzenlediği anlaşılamaz.
* Tablo Başlık ve İlişki Semantiği Bozukluğu (WCAG 1.3.1 Info and Relationships - Level A):
  * Tablo başlığındaki `<th>` öğeleri `scope="col"` niteliği taşımaz.
  * Satırların ilk hücresinde bulunan eylem adı (`<td>{action.name}</td>`) satır başlığı (`<th scope="row">`) olarak tanımlanmamıştır. Ekran okuyucu hücreler arasında gezinirken sütun-satır ilişkisini kuramaz.
* Değiştirici Tuşların Ekran Okuyucuya Okunmaması:
  * `formatModifierSymbol` çıktısı alan `<span>` etiketleri erişilebilir bir `aria-label` taşımaz.

### Mimari Çözümler
* Eylem İsimli Erişilebilir Buton Etiketleri:
  * Butonlara `aria-label={`${shortcut ? t("keyboardShortcut.edit") : t("keyboardShortcut.add")}: ${action.name}`}` ve `aria-label={`${t("keyboardShortcut.delete")}: ${action.name}`}` atanmalıdır.
* Semantik Tablo Başlıkları:
  * Başlık hücrelerine `scope="col"`, eylem adı hücresine `<th scope="row">` eklenmelidir.
* Kısayol Gösteriminde Canlı Metin:
  * Kısayol hücresine tam sesletilebilir `aria-label={getAriaShortcutLabel(shortcut)}` tanımlanmalıdır.

---

## 92. Fare Hareketi Düzenleyicisinde (`ActionEditModal.tsx`) İsimsiz Yön Butonları, İsimsiz Silme Butonları ve Sessiz Model Güncellemesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/gesture/components/ActionEditModal.tsx`

### Tespit Edilen Sorunlar
* İsimsiz Yön Butonları (WCAG 1.1.1 Non-text Content - Level A & WCAG 4.1.2):
  * Modal içinde yer alan 8 yön butonu (`↖`, `↑`, `↗`, `←`, `→`, `↙`, `↓`, `↘`) yalnızca Unicode ok piktogramları içerir ve hiçbir `aria-label` taşımaz.
  * Görme engelli bir kullanıcı tırnak içinde anlamsız ok karakterleri duyar, butonların desene yön eklediğini anlayamaz.
* İsimsiz Yön Silme Butonları (WCAG 4.1.2 Name, Role, Value):
  * Desendeki her bir yön adımının yanındaki kaldırma butonu salt `×` (çarpı) karakteri içerir ve `aria-label` taşımaz ("Çarpı düğmesi").
* Desende Dinamik Geri Bildirim Yokluğu (WCAG 4.1.3 Status Messages):
  * Yön butonlarına basıldığında veya adım silindiğinde desende kaç eleman olduğunu ve güncel sırayı bildiren hiçbir canlı bölge (`aria-live`) yoktur.
* Form Etiketi İlişki Eksikliği (WCAG 1.3.1 Info and Relationships):
  * Eylem seçimi `<Select>` öğesi üstündeki `<label>` ile `id` / `htmlFor` ilişkisine sahip değildir.

### Mimari Çözümler
* Yön Butonlarına Açık Etiketler:
  * 8 yöne yerelleştirilmiş `aria-label={t(`mouseGesture.direction.${dir}`)}` (örn. "Yukarı ve Sol yönü ekle") tanımlanmalıdır.
* Silme Butonlarına Sıra ve İsim Bilgisi:
  * Silme butonuna `aria-label={`${t("ui.remove")}: ${getDirectionName(direction)} (${index + 1}. adım)`}` bağlanmalıdır.
* Canlı Desen Bildirim Alanı:
  * Desen kutusuna `role="status"` ve `aria-live="polite"` eklenerek her yön eklendiğinde veya silindiğinde güncel desen işitsel olarak duyurulmalıdır.

---

## 93. Fare Hareketi Eylemleri Listesinde (`ActionsSettings.tsx`) İsimsiz İkon Butonları, İngilizce Yön İpuçları ve Boş Tablo Başlığı

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/gesture/components/ActionsSettings.tsx`

### Tespit Edilen Sorunlar
* Eylem Bağlamı Olmayan İkon Butonları (WCAG 4.1.2 Name, Role, Value & WCAG 2.4.4):
  * Tablodaki eylem satırlarında Düzenle (`Edit`), Çoğalt (`Copy`) ve Sil (`Trash2`) butonları yalnızca `title` özniteliği taşır; `aria-label` içermez. Ekran okuyucu kullanıcıları hangi jesti düzenlediklerini bilemez.
* Sabit İngilizce Yön Araç İpuçları (WCAG 3.1.2 Language of Parts - Level AA):
  * Yön adımları üzerindeki `title={direction}` ifadesi doğrudan dahili İngilizce anahtarları ("up", "down", "upLeft", "downRight") ekrana basar. Türkçe arayüz kullanan kullanıcıya İngilizce teknik metinler sunulur.
* Boş Tablo Başlık Hücresi (WCAG 1.3.1 Info and Relationships):
  * Tablonun işlem butonları sütununda `<th className="... w-[140px]" />` şeklinde içi tamamen boş bir `<th>` bulunur. Boş başlıklar ekran okuyucu tablo gezintisini bozar.

### Mimari Çözümler
* Eylem Bilgili Buton Etiketleri:
  * İkon butonlarına `aria-label={`${t("mouseGesture.edit")}: ${actionName}`}`, `aria-label={`${t("mouseGesture.duplicate")}: ${actionName}`}` ve `aria-label={`${t("mouseGesture.delete")}: ${actionName}`}` atanmalıdır.
* Yerelleştirilmiş Yön İpuçları ve Sesletim:
  * Yön simgelerine `title={t(`mouseGesture.direction.${direction}`)}` ve uygun `aria-label` verilmelidir.
* Tablo Başlık Onarımı:
  * Boş başlık hücresine `<th scope="col">{t("mouseGesture.actions")}</th>` eklenmelidir.

---

## 94. Boşta Bellek Geri Kazanımı Ayarlarında (`IdleMemoryReclaim.tsx`) Birimsiz Spinbutton, Erişilemeyen Hata Uyarısı ve Canlı Yükleme Yokluğu

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/performance/components/IdleMemoryReclaim.tsx`

### Tespit Edilen Sorunlar
* Birim ve Açıklama Eksikliği (WCAG 1.3.1 Info and Relationships & WCAG 3.3.2 Labels or Instructions):
  * Girdi alanları eşik süresi (saniye), minimum aralık (saniye) ve bellek boyutu (MB) değerleri alır. Ancak girdilere bağlı hiçbir `aria-describedby` veya birim ipucu tanımlanmamıştır.
  * Ekran okuyucu girdi alanında yalnızca "300" okur; kullanıcının bunun 300 saniye mi, 300 dakika mı yoksa 300 megabayt mı olduğunu bilmesi imkansızdır.
* Kayıt Hatasının Ekran Okuyucuya Ulaşmaması (WCAG 4.1.3 Status Messages):
  * Ayarlar kaydedilemediğinde ekrana gelen `saveFailed` metni (`<p className="text-sm text-destructive">`) `role="alert"` veya `aria-live="assertive"` taşımaz; hata görme engelli kullanıcıdan gizlenir.
* Canlı Yükleme Bölgesi Yokluğu (WCAG 4.1.3):
  * Yükleme durumundaki animasyonlu div `role="status"` veya `aria-live="polite"` barındırmaz.

### Mimari Çözümler
* Erişilebilir Birim Tanımlaması:
  * Her `NumberField` bileşenine `aria-describedby` ile birim metni ("Saniye cinsinden süre", "Megabayt cinsinden bellek") bağlanmalıdır.
* Hata Uyarısına Canlı Bölge:
  * Hata mesajına `role="alert"` ve `aria-live="assertive"` eklenmelidir.
* Yükleme Göstergesi Standartlaştırılması:
  * Yükleme kartına `role="status"` ve `aria-live="polite"` yerleştirilmelidir.

---

## 95. Yüklü PWA Uygulamaları Listesinde (`InstalledApps.tsx`) Yinelenen Butonlar, Görsel/Metin İkilemi ve Yalnızca Renkle Durum Belirtimi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/pwa/components/InstalledApps.tsx`

### Tespit Edilen Sorunlar
* Bağlamsız Yinelenen PWA Butonları (WCAG 2.4.4 Link Purpose in Context & WCAG 4.1.2):
  * Listelenen her PWA uygulamasında "Kapsayıcı", "Uygulamayı Yeniden Adlandır" ve "Uygulamayı Kaldır" butonları yer alır.
  * Butonların hiçbirinde hangi uygulamanın etkilendiği belirtilmez. Ekran okuyucu kullanıcısı art arda 10 kez "Uygulamayı Kaldır, düğme" dinler.
* Gereksiz Görsel Açıklaması (WCAG 1.1.1 Non-text Content):
  * Uygulama logosu `alt={app.name}` taşırken hemen yanındaki `<p>` etiketinde de `{app.name}` metni bulunur. Ekran okuyucu uygulama ismini iki kez peş peşe seslendirir ("YouTube grafik, YouTube metin").
* Durumun Yalnızca Renkle Gösterilmesi (WCAG 1.4.1 Use of Color - Level A):
  * PWA'nın ait olduğu kapsayıcı yalnızca `borderColor: containerColor` ile kart kenarlığına yansıtılır; renk körü kullanıcılar için metinsel veya semantik destek eksiktir.
* Modal Pencerelerde Odak Yönetimi Bozukluğu (WCAG 2.4.3 Focus Order):
  * PWA yeniden adlandırma veya kaldırma modal pencereleri açıldığında odak otomatik olarak modal içine aktarılmaz, kapandığında ise tetikleyen butona geri dönmez.

### Mimari Çözümler
* Uygulama İsimli Buton Etiketleri:
  * Butonlara `aria-label={`${t("progressiveWebApp.renameApp")}: ${app.name}`}` ve `aria-label={`${t("progressiveWebApp.uninstallApp")}: ${app.name}`}` atanmalıdır.
* Dekoratif İkon İşaretlemesi:
  * Uygulama ikonlarına `alt=""` ve `aria-hidden="true"` verilerek mükerrer seslendirme önlenmelidir.
* Metinsel Kapsayıcı Göstergesi:
  * Renk kenarlığının yanına ekran okuyucu için `aria-label` veya görsel rozet ile kapsayıcı adı eklenmelidir.
* Odak Yakalama ve İadesi:
  * Modallar açıldığında ilk girdi/onay butonuna odaklanmalı, kapanışta tetikleyici butona odak iade edilmelidir.

---

## 96. Hesap ve Profil Ayarlarında (`Accounts.tsx` / `Profile.tsx`) Sahte Bağlantılar (Pseudo-Links), Bildirimsiz Yeni Pencere ve Yinelenen Avatar Metni

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/accounts/components/Accounts.tsx`
* `browser-features/pages-settings/src/app/accounts/components/Profile.tsx`

### Tespit Edilen Sorunlar
* Sahte Bağlantılar (Pseudo-Links) ile Eylem Tetikleme (WCAG 4.1.2 Name, Role, Value):
  * Profil yöneticisini açma (`openProfileManager`) ve profil klasörünü açma (`openProfileSaveLocation`) eylemleri `<a href="#" onClick={...}>` etiketleri ile kurulmuştur.
  * Klavyeyle gezinen kullanıcı Space tuşuna bastığında tetiklenmez; ekran okuyucu bunları buton yerine bağlantı olarak duyurur.
* Bildirimsiz Yeni Pencere Açılışı (WCAG 3.2.5 Change on Request - Level AAA):
  * Firefox hesabı yönetim bağlantısı `target="_blank"` ile harici sekmede açılır ancak kullanıcıya yeni bir pencere/sekme açılacağına dair görsel ve işitsel uyarı verilmez.
* Yinelenen Avatar Metni (WCAG 1.1.1 Non-text Content):
  * Avatar bileşenindeki `AvatarImage` alt metninde kullanıcı adı/e-postası yer alırken hemen altındaki paragrafta da aynı veri tekrarlanır.

### Mimari Çözümler
* Semantik Buton Dönüşümü:
  * `<a href="#" onClick={...}>` yapıları `<Button variant="link">` veya `<button>` öğesine çevrilmelidir.
* Yeni Pencere Uyarısı:
  * Harici bağlantıya `aria-label={`${t("accounts.manageMozillaAccount")} (${t("common.opensInNewWindow")})`}` veya gizli yardımcı metin eklenmelidir.
* Avatar Erişilebilirlik Filtresi:
  * Kullanıcı adı metin olarak mevcut olduğundan avatar görseli `aria-hidden="true"` ile gizlenmelidir.

---

## 97. Bölünmüş Görünüm Ayırıcılarında (`split-view-splitters.tsx`) Klavye Boyutlandırma Yeteneğinin Bulunmaması ve Ayrık XUL Ayırıcı Kusuru

İlgili Dosyalar:
* `browser-features/chrome/common/split-view/components/split-view-splitters.tsx`

### Tespit Edilen Sorunlar
* Klavye Boyutlandırmasının Tamamen İmkânsız Olması (WCAG 2.1.1 Keyboard - Level A & WCAG 2.5.7 Dragging Movements - Level AA):
  * Bölünmüş görünüm panellerini boyutlandıran `floorp-split-handle` ve `floorp-grid-handle` öğeleri XUL `<box>` olarak üretilir ve yalnızca `mousedown` olayını dinler.
  * Klavyeyle bu ayırıcılara ulaşılamaz (`tabindex="0"` yoktur), Ok tuşlarıyla paneller büyütülüp küçültülemez.
* Ayırıcı Semantiği ve Değer Bildirimi Eksikliği (WCAG 4.1.2 Name, Role, Value):
  * Ayırıcılar `role="separator"`, `aria-orientation`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` ve `aria-label` özniteliklerinden tamamen yoksundur.
* Sürükleme Anında Bütün Sayfanın Kilitlenmesi:
  * Sürükleme başladığında `data-floorp-dragging="true"` özniteliğiyle tüm sekmelere `pointer-events: none` uygulanır; klavye kullanıcıları için iptal veya kılavuz desteği sunulmaz.

### Mimari Çözümler
* Tam Klavye Erişilebilir Ayırıcı Motoru:
  * Ayırıcı öğelere `tabindex="0"`, `role="separator"` ve `aria-orientation={orientation}` eklenmelidir.
  * `keydown` dinleyicisi ile Sol/Sağ veya Yukarı/Aşağı ok tuşlarına basıldığında paneller %5 / 20px adımlarla boyutlandırılmalı, Home/End ile eşit dağıtım sağlanmalıdır.
* Canlı Değer ve Konum Bildirimi:
  * Ayırıcının `aria-valuenow` özniteliği panelin flex yüzdesine göre anlık güncellenmelidir.

---

## 98. Bölünmüş Görünüm Düzen Seçicide (`split-view-layout-picker.tsx`) Grupsuz Radyo Menü Öğeleri ve Canlı DOM Yıkımı

İlgili Dosyalar:
* `browser-features/chrome/common/split-view/components/split-view-layout-picker.tsx`

### Tespit Edilen Sorunlar
* Radyo Grubu Kümeleme Eksikliği (WCAG 4.1.2 Name, Role, Value):
  * Düzen seçenekleri (`horizontal`, `vertical`, `grid-2x2` vb.) XUL `<menuitem type="radio">` olarak üretilir ancak bir `name` özniteliği taşımaz.
  * Ekran okuyucular seçeneklerin birbirini dışlayan bir radyo grubu olduğunu algılayamaz; "1 / 4 radyo düğmesi" pozisyon bilgisi verilemez.
* Canlı DOM Yıkımı ile Odak Dağılması (WCAG 2.4.3 Focus Order):
  * Menü her açıldığında (`popupshowing`) tüm Floorp menü öğeleri DOM'dan tamamen silinip sıfırdan eklenir (`removeFloorpMenuItems`). Ekran okuyucu odaklandığı anda menü ağacı parçalanır.
* Menü Öğelerinde Erişim Tuşu (Accesskey) Yokluğu (WCAG 2.1.1 Keyboard):
  * Panel ekleme ve çıkarma öğelerinde tek tuşla hızlı çalıştırma sağlayan `accesskey` özniteliği atanmamıştır.

### Mimari Çözümler
* `name` ile Radyo Grubu Bütünlüğü:
  * Tüm radyo menü öğelerine `name="floorp-split-layout-group"` atanmalıdır.
* Kararlı DOM Yapısı:
  * Menü her açılışta silinip baştan yaratılmak yerine, mevcut DOM korunmalı ve sadece `checked` öznitelikleri güncellenmelidir.
* Yerelleştirilmiş Klavye Erişim Tuşları:
  * Panel ekleme ve çıkarma öğelerine `accesskey` bağlanmalıdır.

---

## 99. Tarayıcı Paylaşım Modunda (`browser-share-mode.tsx` / `share-mode.css`) Sabit İngilizce, Kontrast Çöküşü ve Odak Kaybı Tuzağı

İlgili Dosyalar:
* `browser-features/chrome/common/browser-share-mode/browser-share-mode.tsx`
* `browser-features/chrome/common/browser-share-mode/share-mode.css`

### Tespit Edilen Sorunlar
* Sabit İngilizce Metin ve Yerelleştirilememe (WCAG 3.1.2 Language of Parts - Level AA):
  * Menü öğesi `label="Toggle Share Mode"` ve CSS'teki `&:before { content: "Share Mode"; }` tamamen sabit İngilizce olarak kodlanmıştır. Türkçe arayüzde İngilizce metin görünür ve okunur.
* Ciddi Kontrast Başarısızlığı (WCAG 1.4.3 Minimum Contrast - Level AA):
  * `#fxa-toolbar-menu-button` üzerinde kullanılan `color: lightgreen !important;` açık temalı araç çubuğunda beyaz zemin üzerinde **1.38:1 kontrast oranı** üretir (okunması imkânsızdır, 4.5:1 gereksinimi çiğnenir).
* Arayüzün Aniden Gizlenmesiyle Odak Kaybı (WCAG 2.4.7 Focus Visible & WCAG 2.4.3 Focus Order):
  * Paylaşım modu aktifleştiğinde `#downloads-button`, `#unified-extensions-button`, `#alltabs-button`, `#PersonalToolbar` ve aktif olmayan tüm sekmeler `display: none !important;` ile yok edilir.
  * Kullanıcı klavyeyle bu butonlardan birindeyken mod açılırsa odak anında yok olur ve `<body>` öğesine düşer.
* Durum Mesajı Eksikliği (WCAG 4.1.3 Status Messages):
  * Mod açıldığında veya kapandığında ekran okuyucuya canlı bildirim verilmez.

### Mimari Çözümler
* i18n/Fluent ile Yerelleştirme:
  * Menü öğesi ve rozet metni yerelleştirme motoruna bağlanmalıdır.
* Yüksek Kontrastlı Rozet Tasarımı:
  * Rozet metin ve arka plan renkleri her temada en az **4.5:1 kontrast** garantileyecek şekilde CSS değişkenlerine bağlanmalıdır.
* Güvenli Odak Koruma Mekanizması:
  * Gizlenen butonlarda odak varsa, mod devreye girmeden önce odak adres çubuğuna (`#urlbar`) güvenle aktarılmalıdır.
* Canlı Durum Bildirimi:
  * Mod açıldığında "Tarayıcı Paylaşım Modu Aktif", kapandığında "Tarayıcı Paylaşım Modu Kapatıldı" canlı bölgeden duyurulmalıdır.

---

## 100. Çalışma Alanları Araç Çubuğu Butonunda (`toolbar-element.tsx`) İsimsiz Buton Çöküşü ve Arşiv Geri Yüklemede Klavye Dışlanması

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/toolbar-element.tsx`
* `browser-features/chrome/common/workspaces/toolbar/popup-element.tsx`

### Tespit Edilen Sorunlar
* İsimsiz Buton Çöküşü (WCAG 4.1.2 Name, Role, Value - Level A):
  * `showWorkspaceNameOnToolbar` ayarı kapalı olduğunda kod `xulElement.removeAttribute("label");` çalıştırır.
  * Sonuç olarak araç çubuğu butonu tüm erişilebilir adını kaybeder ve ekran okuyucular butonu salt "Düğme" olarak duyurur.
* Arşiv Geri Yükleme Öğesinde Klavye Dışlanması (WCAG 2.1.1 Keyboard & WCAG 4.1.2):
  * Arşivlenmiş çalışma alanını geri yükleme öğesi (`workspaceRestoreItemButton`) bir `<xul:hbox>` içine gömülü salt fare `onClick` dinleyicisidir.
  * `role="button"` yoktur, `tabindex="0"` yoktur, klavye ile odaklanılamaz ve Enter/Space ile çalıştırılamaz.
* Eksik Etiketli Araç Butonları:
  * Arşiv silme ve geri yükleme modu butonlarında `label` veya `aria-label` bulunmaz, yalnızca `title` vardır.
* Canlı Durum Bildirimi Eksikliği (WCAG 4.1.3 Status Messages):
  * Arşivler yüklenirken, boşken veya hata alındığında beliren durum alanları canlı bölge (`aria-live`) taşımaz.

### Mimari Çözümler
* Kalıcı Erişilebilir İsim:
  * Buton üstündeki görsel metin gizlense dahi `xulElement.setAttribute("aria-label", workspace.name || "Çalışma Alanları")` ve `tooltiptext` mutlaka korunmalıdır.
* Semantik ve Klavyeye Uyumlu Geri Yükleme Butonu:
  * Geri yükleme öğesi gerçek bir `<xul:toolbarbutton>` bileşenine dönüştürülmeli veya `role="button"`, `tabindex="0"` ve `onKeyDown` dinleyicileriyle donatılmalıdır.
* Canlı Durum Bölgesi:
  * Arşiv durum etiketlerine `role="status"` ve `aria-live="polite"` eklenmelidir.

---

## 101. Çalışma Alanı Bloklarında (`popup-block-element.tsx`) Sürükle-Bırak Sıralamasına Klavye Alternatifi Yokluğu ve Seçim Bildirimi Kusuru

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/popup-block-element.tsx`

### Tespit Edilen Sorunlar
* Sürükleme Hareketine Klavye Alternatifinin Olmaması (WCAG 2.5.7 Dragging Movements - Level AA):
  * Çalışma alanları listesindeki butonlar yalnızca HTML5 fare sürükle-bırak (`onDragStart`, `onDrop`) ile yeniden sıralanabilir.
  * Klavyeyle çalışan bir kullanıcı için çalışma alanlarını yukarı/aşağı taşıma alternatifi sunulmamıştır.
* Seçili Çalışma Alanının Bildirilmemesi (WCAG 4.1.2 Name, Role, Value):
  * Seçili çalışma alanı `data-selected={props.isSelected}` olarak işaretlenir ancak ekran okuyucu için `aria-selected` veya `aria-current="true"` özniteliği atanmaz.
  * Ekran okuyucu kullanıcısı hangi çalışma alanının aktif olduğunu duyamaz.
* Kapsayıcı Bilgisinin Gizli Kalması (WCAG 1.3.1 Info and Relationships):
  * Kapsayıcı kimliği ve rengi (`data-container-color`) butonun erişilebilir etiketine yansıtılmaz.

### Mimari Çözümler
* Klavye ile Yeniden Sıralama Desteği:
  * Butonlara klavye odaklı Ctrl+Yukarı/Aşağı ok kısayolu ve bağlam menüsü üzerinden "Yukarı Taşı" / "Aşağı Taşı" komutları eklenmelidir.
* Semantik Seçim Bildirimi:
  * Butonlara `aria-current={props.isSelected ? "true" : undefined}` atanmalıdır.
* Kapsayıcı Adının Duyurulması:
  * Kapsayıcıya bağlı çalışma alanlarının etiketine kapsayıcı adı eklenmelidir (`aria-label={`${ws().name} (${containerName})`}`).

---

## 102. Zen Modunda (`zen-mode.tsx`) Klavye Odağında Kenar Çubuğu ve Durum Çubuğunun Görünmez Kalması Kusuru

İlgili Dosyalar:
* `browser-features/chrome/common/zen-mode/zen-mode.tsx`

### Tespit Edilen Sorunlar
* Klavye Odağında Arayüzün Gizli Kalması (WCAG 2.4.7 Focus Visible - Level AA & WCAG 2.1.1 Keyboard):
  * Zen modu araç çubuğunu, yan kenar çubuğunu ve durum çubuğunu gizler.
  * Fare kenara yaklaştığında arayüz açılırken, klavye odak dinleyicisi (`handleUrlbarFocusIn`) yalnızca adres çubuğunu (`urlbar`) kontrol eder!
  * Klavye kullanıcısı `F6` veya `Tab` tuşlarıyla kenar çubuğuna (`#panel-sidebar-box`, `#panel-sidebar-select-box`), sekme çubuğuna veya durum çubuğuna (`#nora-statusbar`) odaklandığında arayüz açılmaz; odaklanılan butonlar tamamen görünmez kalır.
  * Kullanıcı ve ekran büyüteci odağın nerede olduğunu takip edemez.

### Mimari Çözümler
* Evrensel Odak Açılış Denetleyicisi:
  * `focusin` dinleyicisi genişletilmeli; odak `#navigator-toolbox` içindeyse `zenmode-reveal-top`, `#panel-sidebar-box` veya `#panel-sidebar-select-box` içindeyse `zenmode-reveal-side`, `#nora-statusbar` içindeyse `zenmode-reveal-bottom` öznitelikleri anında devreye sokulmalıdır.

---

## 103. Sayfa İçi QR Kod Üreticisinde (`qr-code-button.tsx` / `qr-code-panel.tsx` / `qr-code-manager.tsx`) Odaksız Sayfa Butonu ve SVG Ekran Okuyucu Körlüğü

İlgili Dosyalar:
* `browser-features/chrome/common/qr-code-generator/qr-code-button.tsx`
* `browser-features/chrome/common/qr-code-generator/qr-code-panel.tsx`
* `browser-features/chrome/common/qr-code-generator/qr-code-manager.tsx`

### Tespit Edilen Sorunlar
* Klavye ile Ulaşılamayan Sayfa Eylemi Butonu (WCAG 2.1.1 Keyboard & WCAG 4.1.2 Name, Role, Value):
  * Adres çubuğundaki QR kod butonu (`QRCodeGeneratePageAction`) bir `<xul:hbox role="button">` öğesidir; `tabindex="0"` taşımaz ve klavye dinleyicisi yoktur. Adres çubuğunda Tab ile gezinirken bu butona ulaşılamaz.
* Ekran Okuyucuya Anlamsız SVG Şekil Yığını (WCAG 1.1.1 Non-text Content):
  * Panelde üretilen QR kodu bir SVG'dir ve yüzlerce ham çizim öğesi içerir; hiçbir `role="img"` veya `aria-label` taşımaz.
* URL Kopyalama Alternatifinin Bulunmaması:
  * Görme engelli veya telefon kamerası kullanamayan bireyler için QR kodun temsil ettiği adresi kopyalama seçeneği sunulmamıştır.
* Panel Diyalog Semantiği Yokluğu:
  * QR panelinde `role="dialog"`, `aria-labelledby` ve odak hapsi bulunmaz.

### Mimari Çözümler
* Erişilebilir Sayfa Eylemi Butonu:
  * Butona `tabindex="0"`, `aria-label={tooltip()}`, `aria-haspopup="dialog"` ve klavye Enter/Space dinleyicileri eklenmelidir.
* SVG İçin Semantik Görüntü Etiketi:
  * QR kod SVG'sine `role="img"` ve `aria-label={t("qrcode.qrCodeForUrl", { url })}` atanmalıdır.
* Metinsel Adres ve Panoya Kopyalama Desteği:
  * Panel içine kodlanan URL'yi gösteren bir metin alanı ve "URL'yi Panoya Kopyala" butonu eklenmelidir.

---

## 104. Sekme URL Satır İçi Düzenleyicisinde (`tab-inline-edit/controller.ts`) Sekme Kimliği Belirsizliği, Sessiz Hata ve İstenmeyen Bulanıklık İptali

İlgili Dosyalar:
* `browser-features/chrome/common/tab-inline-edit/controller.ts`

### Tespit Edilen Sorunlar
* Düzenlenen Sekmenin Belirtilmemesi (WCAG 4.1.2 Name, Role, Value):
  * Girdi kutusuna `aria-label="Tab URL"` atanır ancak hangi sekmenin URL'sinin düzenlendiği (sekme başlığı veya sırası) belirtilmez. Ekran okuyucu kullanıcısı 20 açık sekme arasından hangi sekmenin adresini değiştirdiğini teyit edemez.
* Sessiz Hata İhmali (WCAG 4.1.3 Status Messages):
  * Girilen URL geçersiz olduğunda veya gezinme işlemi çöktüğünde düzenleyici sessizce kapanır; kullanıcıya hiçbir görsel veya işitsel hata bildirimi sunulmaz.
* İnceleme İmleci ile Çakışan Bulanıklık İptali:
  * Ekran okuyucu inceleme imlecine (review cursor) geçildiğinde tetiklenen geçici odak kaybı (`onBlur`) düzenleyiciyi derhal yok eder ve yazılan metni siler.

### Mimari Çözümler
* Sekme Başlıklı Erişilebilir Etiket:
  * Girdi alanına `aria-label={`${t("tabInlineEdit.inputLabel")}: ${tabLabel}`}` bağlanmalıdır.
* Canlı Hata Bildirimi:
  * Hatalı URL girişinde `role="alert"` ile hata mesajı duyurulmalıdır.
* Akıllı Odak Toleransı:
  * Bulanıklık (blur) durumunda gecikmeli kontrol yapılarak inceleme imlecinde veri kaybı engellenmelidir.

---

## 105. Araç Çubuğu Buton Oluşturucusunda (`browser-action.tsx`) Promise Nesnesinin Doğrudan Atanmasıyla Oluşan `[object Promise]` Erişilebilirlik Faciası

İlgili Dosyalar:
* `browser-features/chrome/utils/browser-action.tsx`

### Tespit Edilen Sorunlar
* `[object Promise]` Erişilebilir İsim Faciası (WCAG 4.1.2 Name, Role, Value & Gecko Erişilebilirlik API İhlali):
  * `BrowserActionUtils.createMenuToolbarButton` fonksiyonunda (satır 119-120), `document?.l10n?.formatValue(l10nId)` fonksiyonu çağrılır ancak **`await` edilmez**.
  * `formatValue` bir `Promise<string>` döner ve bu Promise nesnesi doğrudan XUL widget'ının `tooltiptext` ve `label` alanına atanır!
  * Gecko ve XUL motoru bu nesneyi string'e dönüştürdüğünde butonun erişilebilir adı ve araç ipucu kelimesi kelimesine `"[object Promise]"` haline gelir!
  * Ekran okuyucu kullanıcıları araç çubuğu menü butonuna odaklandıklarında işlev adı yerine `"[object Promise], düğme"` duyar!

### Mimari Çözümler
* Asenkron Çözümleme ve Senkron Fallback:
  * `createMenuToolbarButton` içinde `document?.l10n?.formatValue` çağrıları `await` edilmeli; asenkron çözümleme gecikirse i18next senkron sözlüğünden geçerli etiket atanarak `"[object Promise]"` hatası kesin olarak engellenmelidir.

---

## 106. Kenar Çubuğu Başlığında (`panel-sidebar/components/sidebar-header.tsx`) 7 Adet Tamamen İsimsiz Buton ve Durumsuz Float Düğmesi

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/sidebar-header.tsx`

### Tespit Edilen Sorunlar
* 7 Adet Tamamen İsimsiz Buton (WCAG 4.1.2 Name, Role, Value - Level A & WCAG 1.1.1 Non-text Content):
  * Kenar çubuğu üst başlığında yer alan 7 buton (`#panel-sidebar-back`, `#panel-sidebar-forward`, `#panel-sidebar-reload`, `#panel-sidebar-go-index`, `#panel-sidebar-float`, `#panel-sidebar-open-in-main-window`, `#panel-sidebar-close`) hiçbir `label`, `aria-label` veya `tooltiptext` taşımaz!
  * Ekran okuyucu kullanıcıları başlıkta gezinirken ardı ardına 7 kez "Düğme" duyar; hiçbirinin ne işe yaradığı bilinemez.
* Durum Bildirmeyen Kayan Panel Düğmesi:
  * `#panel-sidebar-float` butonu durum bildiren `aria-pressed={isFloating()}` özniteliğine sahip değildir.
* Geçmiş Kontrolü Yokluğu:
  * Geri ve ileri butonları geçmiş olmadığında `disabled` durumuna geçirilmez.

### Mimari Çözümler
* Tüm Butonlara Yerelleştirilmiş Erişilebilir İsimler:
  * 7 butona da yerelleştirilmiş `aria-label` ve `tooltiptext` atanmalıdır (örn. "Kenar Çubuğunda Geri", "Kenar Çubuğunda Yenile", "Kayan Pencereye Dönüştür", "Kenar Çubuğunu Kapat").
* `aria-pressed` Entegrasyonu:
  * `#panel-sidebar-float` butonuna `aria-pressed={isFloating()}` eklenmelidir.

---

## 107. Kayan Kenar Çubuğu Ayırıcılarında (`floating-splitter.tsx`) 8 Adet Odaksız Ayırıcı ve Klavye ile Boyutlandırma İmkânsızlığı

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/floating-splitter.tsx`

### Tespit Edilen Sorunlar
* Klavye Boyutlandırma Yokluğu (WCAG 2.1.1 Keyboard - Level A & WCAG 2.5.7 Dragging Movements):
  * Kayan kenar çubuğunun 8 kenar ve köşe ayırıcısı (`#floating-splitter-left`, `right`, `top`, `bottom`, `corner-topleft` vb.) yalnızca `<xul:box>` olarak tanımlanmış olup sadece fare `onMouseDown` olayını dinler.
  * Klavyeyle odaklanılamaz (`tabindex="0"` yoktur), Ok tuşlarıyla boyutlandırılamaz!
* Ayırıcı Rol ve Değer Yokluğu (WCAG 4.1.2 Name, Role, Value):
  * `role="separator"` ve ARIA değer özniteliklerinden (`aria-valuenow`) yoksundur.

### Mimari Çözümler
* Klavye Uyumlu Çok Yönlü Ayırıcılar:
  * Ayırıcılara `role="separator"`, `tabindex="0"` ve Ok tuşlarıyla en/boy koordinatlarını artıran/azaltan klavye dinleyicisi eklenmelidir.
  * Canlı boyut bilgisi `aria-valuenow` üzerinden duyurulmalıdır.

---

## 108. Yeniden Başlatma Menüsünde (`RebootPanelMenu.tsx`) Geri Dönüş Butonu Yokluğu ve Klavyenin Menü İçinde Kilitlenmesi

İlgili Dosyalar:
* `browser-features/chrome/common/reboot-panel-menu/RebootPanelMenu.tsx`

### Tespit Edilen Sorunlar
* Alt Panelde Geri Butonu Yokluğu ve Klavye Tuzağı (WCAG 2.1.2 No Keyboard Trap & WCAG 2.4.4):
  * Firefox alt görünüm (subview) mimarisinde her alt panelin başında bir "Geri" (`subviewbutton-back`) butonu bulunmalıdır. `PanelUI-reboot` panelinde geri butonu yoktur!
  * Klavyeyle bu menüye giren kullanıcı önceki menü düzeyine dönemez, tüm menüyü kapatıp baştan başlamak zorunda kalır.
* Alt Görünüm Sinyali Yokluğu:
  * Ana menüdeki "Yeniden Başlat" butonunda `aria-haspopup="true"` bulunmaz; kullanıcı bunun bir alt panel açtığını kestiremez.
* Onaysız Kritik Eylem (WCAG 3.3.4 Error Prevention):
  * Normal ve önbellek temizlemeli yeniden başlatma butonlarına basıldığında onay sorulmadan tarayıcı anında kapatılır.

### Mimari Çözümler
* Standart Alt Görünüm Başlığı ve Geri Butonu:
  * `PanelUI-reboot` paneline standart `subviewbutton-back` eklenmelidir.
* `aria-haspopup="true"` Tanımı:
  * Tetikleyici butona alt görünüm sinyali verilmelidir.
* Kritik İşlem Onay Modalı:
  * Yeniden başlatma komutları öncesinde onay penceresi sunulmalıdır.

---

## 109. Harici Tarayıcı Menüsünde (`link-context-menu.tsx`) Asenkron Boş Menü Açılışı ve Ekran Okuyucu Odak Kaybı

İlgili Dosyalar:
* `browser-features/chrome/common/external-browser/link-context-menu.tsx`
* `browser-features/chrome/common/external-browser/tab-context-menu.tsx`

### Tespit Edilen Sorunlar
* Asenkron Boş Menü Açılışı (WCAG 4.1.2 Name, Role, Value & WCAG 2.4.3 Focus Order):
  * `onPopupShowing` tetiklendiğinde `populateMenu()` asenkron çalışır ve `await this.loadBrowsers()` tamamlanana kadar menü boştur.
  * Menü açıldığı anda ekran okuyucu "0 öğe" duyurusu yapar; kullanıcı aşağı oka bastığında odak menüden kaçar.
* Klavye Erişim Tuşu (Accesskey) Yokluğu (WCAG 2.1.1 Keyboard):
  * Harici tarayıcı menü öğelerinde klavye erişim tuşu bulunmaz.

### Mimari Çözümler
* Önceden Önbelleğe Alınmış Tarayıcı Listesi:
  * Yüklü tarayıcı listesi başlangıçta taranarak bellekte tutulmalı, menü açılışında senkron ve anında DOM'a basılmalıdır.
* Menü Öğelerine Erişim Tuşları:
  * Her tarayıcı seçeneğine benzersiz `accesskey` atanmalıdır.

---

## 110. Sekme Yığını Çubuğunda (`stack-bar.tsx`) Sekme Semantiği Yokluğu, İsimsiz İkon Düğmeleri ve Sabit İngilizce İpuçları

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`

### Tespit Edilen Sorunlar
* Sekme Semantiği Yokluğu (WCAG 1.3.1 Info and Relationships & WCAG 4.1.2):
  * İkinci satırdaki yığın sekme öğeleri (`floorp-stack-tab-item`) `<xul:hbox>` olarak yaratılmıştır. `role="tab"` yoktur, `aria-selected` yoktur, klavyeyle odaklanılamaz (`tabindex="0"` yoktur), Enter/Space ile seçilemez.
* Sabit İngilizce Araç İpuçları (WCAG 3.1.2 Language of Parts - Level AA):
  * Kapatma butonu `tooltiptext="Close tab"`, yenileme ikonu `tooltiptext="Reload tab"`, kaydırma butonları `tooltiptext="Scroll tabs left/right"`, yeni sekme butonu `tooltiptext="New tab in stack"` — hepsi sabit İngilizcedir!
* Buton Yerine Görsel Kullanımı:
  * Yenileme işlemi için bir `<xul:image>` kullanılmıştır; klavye erişimi ve buton rolü yoktur.

### Mimari Çözümler
* Tam Sekme Semantiği ve Klavye Gezintisi:
  * Yığın sekmelerine `role="tab"`, `tabindex="0"`, `aria-selected` ve klavye Enter/Space dinleyicileri bağlanmalıdır.
* Tüm İpuçlarının Yerelleştirilmesi:
  * Sabit İngilizce metinler i18next sözlüğüne taşınmalıdır.
* Yenileme Görselinin Butona Dönüştürülmesi:
  * `<xul:toolbarbutton>` kullanılarak klavye ile yenileme sağlanmalıdır.

---

## 111. Favicon Rengi ile Sekme Boyama Özelliğinde (`browser-tab-color` / `configs.ts`) Yetersiz Kontrast (1.1:1) ve Okunamaz Metin Riski

İlgili Dosyalar:
* `browser-features/chrome/common/browser-tab-color/tabcolor-manager.tsx`
* `browser-features/chrome/common/designs/configs.ts`

### Tespit Edilen Sorunlar
* Dinamik Kontrast Çöküşü (WCAG 1.4.3 Minimum Contrast - Level AA & WCAG 1.4.6 Enhanced Contrast - Level AAA):
  * `floorp.titlebar.favicon.color` özelliği etkinleştirildiğinde sekme arka planı sitenin favicon ana rengine boyanır.
  * Açık sarı, açık gri veya beyaz favicon'a sahip web sitelerinde, beyaz sekme metni **1.1:1 kontrast oranı** üretir ve sekme başlığı tamamen okunamaz hale gelir.
  * Metin rengi arka plan parlaklığına göre dinamik olarak hesaplanmaz.

### Mimari Çözümler
* Akıllı Bağıl Parlaklık (Relative Luminance) Hesaplayıcısı:
  * Favicon rengi uygulandığında WCAG formülü ile bağıl parlaklık hesaplanmalı; parlak zeminlerde sekme metin rengi otomatik olarak koyu renge (`#000000` / `#1a1a1a`), koyu zeminlerde açık renge (`#ffffff`) dönüştürülerek en az **4.5:1 (AAA için 7:1)** kontrast garantilenmelidir.

---

## 112. Modal Ebeveyninde (`modal-parent/components/modal.tsx`) Eksik Dialog Rolü, Odak Kaçışı ve İnert Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/modal-parent/components/modal.tsx`

### Tespit Edilen Sorunlar
* Dialog Rolü ve Modal Özniteliği Yokluğu (WCAG 4.1.2 Name, Role, Value):
  * `modal-parent-container` bileşeni sıradan bir `<div>` olarak render edilir. `role="dialog"` veya `role="alertdialog"` taşımaz; `aria-modal="true"` taşımaz.
* Odak Kaçışı ve İnert Yokluğu (WCAG 2.1.2 No Keyboard Trap & WCAG 2.4.3 Focus Order):
  * Modal açıkken arkadaki ana pencereye `inert` uygulanmaz. Klavye kullanıcısı Tab tuşuna bastığında modal dışına çıkıp arkadaki web sayfasına ve araç çubuğuna kaçabilir.

### Mimari Çözümler
* Standart ARIA Dialog Mimarisi:
  * Konteyner öğesine `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ve güvenli odak hapsi (focus trap) eklenmelidir.
* Arka Plan İnert Kilidi:
  * Modal açıldığında arka plandaki tüm ana pencere köklerine `inert="true"` uygulanmalı, kapandığında kaldırılmalıdır.
---

## 113. Hakkında Diyaloğunda (`pages-aboutDialog/src/AboutDialog.tsx`) Sözde Bağlantılar (Pseudo-Links), Sabit Japonca URL'ler ve İsimsiz Sosyal Ağ İkonları

İlgili Dosyalar:
* `browser-features/pages-aboutDialog/src/AboutDialog.tsx`

### Tespit Edilen Sorunlar
* Sözde Bağlantılar (Pseudo-Links) ve Sahte Navigasyon (WCAG 4.1.2 Name, Role, Value & WCAG 2.1.1 Keyboard):
  * Topluluk bağlantıları (GitHub, Discord, X, Reddit) ve yardım/gizlilik bağlantıları `<a href="#" onClick={...}>` şeklinde yazılmıştır.
  * Gerçek bir `href` adresi içermezler; ekran okuyucu kullanıcısı bağlantı URL'sini kopyalayamaz, bağlantı menüsünden ("Bağlantı adresini kopyala", "Yeni sekmede aç") faydalanamaz.
  * Enter tuşu haricinde Space tuşuyla tetiklenemezler; semantik olarak buton veya gerçek harici bağlantı olmalıdırlar.
* Sabit Japonca URL'ler (WCAG 3.1.2 Language of Parts - Level AA):
  * Gizlilik politikası ve kullanım koşulları bağlantıları (`https://ja.floorp.app/privacy`, `https://ja.floorp.app/terms`) Türkçe veya İngilizce arayüz kullanan kullanıcılara dahi zorla Japonca adres bağlantısı açar.
  * Kullanıcının seçili diliyle uyumlu dinamik rota çözümlemesi yapılmamıştır.
* İsimsiz ve Odaklanabilir Sosyal Medya SVG'leri (WCAG 1.1.1 Non-text Content):
  * Topluluk ikonları (GitHub, Discord, X, Reddit SVGs) `aria-hidden="true"` ve `focusable="false"` özniteliklerinden yoksundur; ekran okuyucular iç içe gereksiz grafik düğümleri okur.
* Yeni Sekmede Açılma Bildirimi Yokluğu (WCAG 3.2.2 On Input):
  * Bağlantılar harici tarayıcı veya yeni sekme açtığında ekran okuyucuya "(yeni sekmede açılır)" uyarısı verilmez.

### Mimari Çözümler
* Gerçek ve Güvenli Harici Bağlantı Semantiği:
  * Tüm bağlantılar `<a href="https://..." target="_blank" rel="noopener noreferrer">` formatına geçirilmeli; görsel ve işitsel olarak "(yeni sekmede açılır)" ibaresi eklenmelidir.
* Dile Duyarlı Bağlantı Haritalaması:
  * `i18n.language` durumuna göre ilgili dilin dokümantasyon ve gizlilik URL'leri dinamik olarak bağlanmalıdır (örn. `https://floorp.app/{locale}/privacy`).
* Dekoratif SVG Yalıtımı:
  * Tüm sosyal medya vektörlerine `aria-hidden="true"` ve `focusable="false"` eklenmelidir.

---

## 114. Ayarlar Canlı Arama Sayfasında (`pages-settings/src/app/search/page.tsx`) Canlı Bölge (Live Region) Yokluğu ve Kart Düzeyinde `aria-label` ile Metin Ezilmesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/search/page.tsx`

### Tespit Edilen Sorunlar
* Canlı Arama Sonuçlarında Durum Bildirimi Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * Kullanıcı arama kutusuna yazdıkça sonuç listesi anında güncellenir; ancak arama başlığı ("Results for: X", bulunan sonuç sayısı) ve sonuç bulunamadı uyarısı (`noResults`) bir `aria-live="polite"` veya `role="status"` bölgesi içinde yer almaz.
  * Ekran okuyucu kullanıcısı yazdığı sorgunun kaç sonuç ürettiğini veya hiç sonuç çıkmadığını duyamaz; sürekli sanal imleçle aşağı kayıp listeyi elle aramak zorunda kalır.
* Tüm Kartı Saran `aria-label` ile Snippet ve Eşleşen Metnin Buharlaşması (WCAG 4.1.2 Name, Role, Value):
  * Arama sonucu kartı olan `<Link>` bileşeni üzerine `aria-label={openLabel}` yerleştirilmiştir.
  * ARIA şartnamesine göre etkileşimli bir öğe üzerine `aria-label` konulduğunda, kartın içindeki tüm alt DOM ağacı (özellik başlığı, açıklama snippet'i, vurgulanan arama terimleri) ekran okuyucu tarafından tamamen yoksayılır!
  * Kullanıcı arama sonucunda kartın üzerine geldiğinde yalnızca "Genel ayarlarını aç" duyar; aradığı terimin hangi alt ayarda eşleştiğini veya açıklamasını asla okuyamaz!

### Mimari Çözümler
* Dinamik Canlı Bölge (`aria-live="polite"`):
  * Arama sonuç özeti (`resultsFor` ve sonuç adedi) bir `role="status"` ve `aria-live="polite"` kapsayıcısına alınarak sorgu sonlandığında otomatik duyurulmalıdır.
* Kart İçeriği Doğal Erişilebilirlik Hiyerarşisi:
  * `<Link>` üzerinden yıkıcı `aria-label` kaldırılmalı; kart içi başlık `aria-labelledby` ile, snippet açıklaması ise `aria-describedby` ile karta bağlanarak tüm içerik erişilebilir kılınmalıdır.

---

## 115. Ayarlar Kenar Gezinti Menüsünde (`sidebar.tsx` & `nav-features.tsx`) Semantik Liste Yokluğu, Mobil Çekmece Kapanışında Odak Kaybı ve Harici Bağlantı Uyarısı Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/components/common/sidebar.tsx`
* `browser-features/pages-settings/src/components/common/nav-features.tsx`

### Tespit Edilen Sorunlar
* Semantik Liste Yapısı Yokluğu (WCAG 1.3.1 Info and Relationships):
  * `SidebarMenu` bileşenleri semantik `<ul>` ve `<li>` etiketleri yerine ardışık `<div>` blokları olarak render edilir.
  * Ekran okuyucu kullanıcıları gezinti menüsüne girdiklerinde menünün kaç öğeden oluştuğunu ("Öğe 1 / 12") duyamaz, liste gezinti kısayollarıyla (NVDA 'L' ve 'I' tuşları) menü öğeleri arasında atlayamaz.
* Mobil Çekmece Kapanışında Odak Kaybı (WCAG 2.4.3 Focus Order):
  * Dar ekranlarda veya yüksek yakınlaştırmada (%200-%400) açılan kenar çubuğu çekmecesi (drawer) kapatıldığında odak tetikleyici `SidebarTrigger` butonuna geri döndürülmez; odak sayfa gövdesine (`<body>`) düşer.
* Harici Bağlantı Butonunda İşlev Belirsizliği:
  * `ExternalItem` butonu yeni sekmede harici bir Floorp sayfası açar; ancak buton üzerinde veya araç ipucunda yeni sekme açılacağına dair işitsel bildirim bulunmaz. İkonlar `aria-hidden="true"` taşımaz.

### Mimari Çözümler
* Semantik Gezinti Listesi (`<nav>`, `<ul>`, `<li>`):
  * Kenar çubuğu ana yapısı `<nav aria-label={t("sidebar.navigation")}>` içine alınmalı, grup ve menü öğeleri standart `<ul>` ve `<li>` elemanlarıyla yapılandırılmalıdır.
* Çekmece Odak Belleği:
  * Çekmece açılmadan önceki aktif odak referansı saklanmalı, çekmece kapandığı anda odak doğrudan tetikleyici butona iade edilmelidir.
* Harici Bağlantı İşitsel Bildirimi:
  * Harici butonlara `aria-label={`${item.title} (${t("common.opensInNewTab")})`}` eklenmelidir.

---

## 116. Otomatik Gizlenen Geri/İleri Butonlarında (`autohide-back-button.css` & `autohide-forward-button.css`) Opaklık Gizlemesi ile Erişilebilirlik Ağacında Hayalet Butonlar ve Düzen Titremesi (Reflow Jitter)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/autohide-back-button.css`
* `browser-features/chrome/common/designs/chrome-extras-css/autohide-forward-button.css`

### Tespit Edilen Sorunlar
* Erişilebilirlik Ağacında Hayalet Butonlar (WCAG 4.1.2 Name, Role, Value & WCAG 2.4.3 Focus Order):
  * Geri ve ileri butonları devre dışı (`disabled="true"`) kaldığında, CSS kuralı olarak `opacity: 0 !important; pointer-events: none;` uygulanır.
  * Ancak `visibility: collapse` veya `display: none` uygulanmaz!
  * Görsel olarak tamamen görünmez olan bu butonlar Gecko erişilebilirlik ağacında varlığını sürdürmeye devam eder. Ekran okuyucu sanal imleci araç çubuğunda gezinirken boşlukta "Geri butonu, devre dışı" duyurusu yapar ve kafa karışıklığı yaratır.
* Düzen Titremesi ve Reflow Sıçraması (WCAG 2.4.11 Focus Not Obscured & Bilişsel/Düşük Görüş Engeli):
  * Buton gizlendiğinde veya açıldığında `margin-left: -32px` ile 0.5 saniyelik animasyon çalıştırılır.
  * Bu animasyon adres çubuğunun (URL bar) sol kenarını yatay olarak sürekli sarsar ve genişletip daraltır.
  * Düşük görüşlü, disleksik veya dikkat dağınıklığı yaşayan kullanıcılar adres çubuğuna odaklanmaya çalışırken tüm arayüzün kayması odaklanmayı bozar.
  * `prefers-reduced-motion` sorgusu bulunmadığından hareket hassasiyeti olan kullanıcılarda baş dönmesi yaratır.

### Mimari Çözümler
* Tam Erişilebilirlik Ağacı Yalıtımı:
  * Devre dışı butonlara `visibility: collapse !important;` atanarak hem görsel hem de ekran okuyucu ağacından temiz bir şekilde gizlenmesi sağlanmalıdır.
* Hareketsiz ve Stabil Düzen Geçişi:
  * Negatif kenar boşluğu sarsıntısı yerine yerinde yumuşak solma tercih edilmeli; `@media (prefers-reduced-motion: reduce)` altında animasyonlar derhal sıfırlanmalıdır.

---

## 117. Kenar Çubuğu Örtüşme Tasarımında (`sidebar-overlap.css`) Web İçeriğinin %20-40'ının Gizlenmesi ve WCAG 2.2 Odak Örtünmesi (Focus Not Obscured) İhlali

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/sidebar-overlap.css`

### Tespit Edilen Sorunlar
* WCAG 2.2 Kriter 2.4.11 ve 2.4.12 Odak Örtünmesi (Focus Not Obscured - Level AA & AAA) Doğrudan İhlali:
  * `sidebar-overlap.css` dosyası kenar çubuğunu normal tarayıcı düzen akışından çıkarır ve `position: absolute !important; z-index: 6 !important;` ile doğrudan aktif web sayfasının üzerine bindirir.
  * Web sayfasının sol veya sağ kenarındaki içeriğin (gezinme menüleri, form alanları, ana metinler) %20 ila %40'ı kenar çubuğunun arkasında kalır.
  * Klavye kullanıcısı web sayfasında Tab ile ilerlerken odak kenar çubuğunun altında kalan butonlara veya girdi kutularına girdiğinde odak tamamen örtünür ve görünmez olur.
* İşaretçi Olayları Tıkanması:
  * Sayfa içeriğinin kenar çubuğu altında kalan kısımları fare veya dokunmatik ekran kullanıcıları tarafından tıklanamaz hale gelir.

### Mimari Çözümler
* Esnek Kutu (Flexbox) Düzen İzolasyonu:
  * Kenar çubuğu asla web tarayıcısı gövdesinin üzerine `absolute` bindirilmemeli; tarayıcı görüntüleme alanı (`#browser`) genişliği kenar çubuğu açıkken esnek olarak daraltılmalı ve web içeriği hiçbir zaman örtülmemelidir.
* Odak Takibi ve Otomatik Çekilme:
  * Kenar çubuğu örtüşme modundayken web sayfasındaki bir öğeye klavye odağı geçtiğinde kenar çubuğunun otomatik olarak şeffaflaşması veya gizlenmesi sağlanmalıdır.

---

## 118. Ortalanmış Adres Çubuğu Tasarımında (`centered-urlbar.css`) Odaklanma Anında Metnin Sola Sıçraması ve Düşük Görüşlü/Disleksik Kullanıcılarda Yön Kaybı

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/centered-urlbar.css`

### Tespit Edilen Sorunlar
* Odaklanma Anında Metin Sıçraması (Cognitive & Low Vision Usability Defect):
  * `#urlbar:not([focused]) #urlbar-input { text-align: center !important; }` kuralı uygulanır.
  * Adres çubuğu odaksızken URL tam ortada durur; ancak kullanıcı adres çubuğuna tıkladığında veya `Ctrl+L` / `F6` ile odaklandığında metin aniden ekranın sol kenarına fırlar!
  * Ekran büyütücü (magnifier) kullanan az gören bireyler büyütülmüş alanda ortadaki metne bakarken odaklanma anında metin görüş alanından tamamen çıkar.
  * Disleksik ve bilişsel engelli bireylerde metnin sıçraması okuma ve düzenleme bütünlüğünü bozar.

### Mimari Çözümler
* Tutarlı Metin Hizalaması:
  * Metin daima standart okuma yönünde (`text-align: start`) tutulmalı; ortalama efekti gerekiyorsa girdi alanı metni yerine yalnızca odaksız durumdaki dekoratif etiket simgesi ortalanmalıdır.

---

## 119. Ortalanmış Sekme Tasarımında (`centered-tab.css`) `max-width: min-content` Kısıtıyla Sekme Başlıklarının 1-2 Karaktere Kırpılması

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/centered-tab.css`

### Tespit Edilen Sorunlar
* Sekme Başlığı Metin Budanması (WCAG 1.4.4 Resize Text & WCAG 1.4.10 Reflow):
  * Ortalanmış sekme CSS'inde `.tab-label-container { max-width: min-content; }` kuralı yer alır.
  * Kullanıcı sistem yazı tipi boyutunu büyüttüğünde veya %200 yakınlaştırma uyguladığında `min-content` kuralı sekme başlık alanını kelimenin en kısa hecesine kadar sıkıştırır.
  * Sekme başlıkları "Goo...", "Tr..." gibi 1-2 karaktere düşer ve tamamen okunamaz hale gelir.

### Mimari Çözümler
* Esnek ve Uyarlanabilir Genişlik:
  * `max-width: min-content` kısıtı kaldırılmalı, esnek genişlik (`max-width: 100%`) ve metin taşma kontrolü (`text-overflow: ellipsis; white-space: nowrap;`) ile yakınlaştırmada okunabilirlik güvenceye alınmalıdır.

---

## 120. İş Akışı İlerleme Penceresinde (`pages-workflow-progress/src/App.tsx`) İsimsiz Durum Noktası, Yalnızca Renge Dayalı Adım İkonları, Eksik `role="progressbar"` ve Canlı Bölge Yokluğu

İlgili Dosyalar:
* `browser-features/pages-workflow-progress/src/App.tsx`

### Tespit Edilen Sorunlar
* İsimsiz ve Yalnızca Renkli Durum Noktası (WCAG 1.4.1 Use of Color & WCAG 1.1.1):
  * Başlıkta yer alan durum göstergesi `<div className="h-2.5 w-2.5 rounded-full ... animate-pulse" />` tamamen renkle durum bildirir (beyaz, gri, yanıp sönen beyaz). Hiçbir metin alternatifi, `aria-label` veya ekran okuyucu duyurusu yoktur.
* Yalnızca Renge ve İkona Dayalı Adım Durumları (WCAG 1.4.1 & WCAG 1.3.1):
  * Adım ikonları (Check, Loader2, AlertCircle, Circle) metin alternatifi olmaksızın render edilir. Adımın tamamlandığı, çalıştığı veya hata verdiği bilgisi DOM'da metin olarak yer almaz. Ekran okuyucu kullanıcısı yalnızca fonksiyon adını duyar; adımın başarılı olup olmadığını bilemez!
* Semantik Sıralı Liste Yokluğu (WCAG 1.3.1 Info and Relationships):
  * İş akışı adımları sıralı bir süreç olmasına rağmen `<ol>` ve `<li>` yerine ardışık `<div>` bloklarıyla basılmıştır. Ekran okuyucu "Adım 1 / 4" bilgisini sunamaz.
* İlerleme Çubuğu Rolü Yokluğu:
  * Altbilgideki "2 / 5 steps" göstergesi görseldir; `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` özniteliklerini taşımaz.
* Canlı Bölge (Live Region) Yokluğu (WCAG 4.1.3 Status Messages):
  * 100 ms'de bir güncellenen iş akışında adımlar tamamlandıkça veya hata oluştuğunda ekran okuyucu kullanıcısına hiçbir bildirim iletilmez (`aria-live="polite"` yoktur). Kullanıcı sessizlik içinde sürecin bitmesini bekler.
* Kritik Kontrast Yetersizliği (WCAG 1.4.3):
  * `text-zinc-600` rengi siyah zemin üzerinde yaklaşık 2.5:1 kontrast verir; AA sınırı olan 4.5:1'in ve AAA sınırı olan 7:1'in fersah fersah altındadır.

### Mimari Çözümler
* Tam Semantik Sıralı Liste (`<ol>`, `<li>`):
  * Adımlar semantik `<ol role="list">` ve `<li>` yapısına geçirilmeli; her adıma gizli metinle durum eklenmelidir (`<span className="sr-only">Tamamlandı: </span>`).
* Canlı Durum Bildiricisi (`aria-live="polite"`):
  * Adım geçişlerinde "Adım X tamamlandı, Adım Y yürütülüyor" mesajını seslendiren canlı bölge kurulmalıdır.
* Standart ARIA `progressbar`:
  * İlerleme göstergesine `role="progressbar"`, `aria-valuenow={completedCount}`, `aria-valuemax={totalCount}` bağlanmalıdır.
* Kontrast Düzeltmesi:
  * Soluk metinler en az 7:1 kontrast sağlayan `text-zinc-300` veya açık tonlarla değiştirilmelidir.

---

## 121. Karşılama Özellik Tanıtımlarında (`FeatureDemos.tsx`) İsimsiz SVG İkonları, Sahte Sekmeler, Gizlenen Adım Numaraları ve Yetersiz İndirgenmiş Hareket Koruması

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/features/FeatureDemos.tsx`
* `browser-features/pages-welcome/src/app/features/demos.module.css`

### Tespit Edilen Sorunlar
* Sahte Sekme Şeridi Semantiksizliği (WCAG 1.3.1 Info and Relationships):
  * Çalışma alanı demosundaki sekme çubuğu (`.tabStrip`) görsel olarak sekmelerden oluşur ancak semantik olarak sıradan `<span>` etiketleridir. `role="tablist"` veya `role="tab"` içermez.
* Adım Numaralarının Ekran Okuyucudan Gizlenmesi (WCAG 1.3.1):
  * Çalışma alanı sayfa maddelerindeki sıra numaraları ve onay simgeleri `<span aria-hidden="true">` içine hapsedilmiştir. Ekran okuyucu kullanıcısı maddelerin numaralı olduğunu veya tamamlandığını duyamaz.
* Fare Hareketi Demosunda Aktif Adım Belirsizliği:
  * `GestureDemo` içindeki `<li data-active={step === value}>` listesinde aktif adımı bildiren `aria-current="step"` bulunmaz.
* İndirgenmiş Hareketin Kısmi Bastırılması:
  * `demos.module.css` içinde `@media (prefers-reduced-motion: reduce)` yalnızca iz çizgisinin (`.trail`) geçişini kapatır; farenin kendisi (`.mouse`), darbe animasyonları ve diğer geçişler hareket etmeye devam eder.
* İsimsiz SVG İkonları (WCAG 1.1.1):
  * Globe, BookOpen, Music, Calendar gibi onlarca SVG `aria-hidden="true"` taşımaksızın buton ve metinlerin içine gömülmüştür.

### Mimari Çözümler
* Semantik ARIA Sekme ve Liste Rolleri:
  * Demo tarayıcı sekme çubuğuna `role="tablist"` ve `role="tab"` tanımlanmalıdır.
* Anlamlı Numaralandırma:
  * Sıra numaralarından `aria-hidden="true"` kaldırılmalı, doğal metin akışına bırakılmalıdır.
* `aria-current="step"` Entegrasyonu:
  * Fare hareketi adımlarına aktif adım özniteliği bağlanmalıdır.
* Kapsamlı `prefers-reduced-motion` Desteği:
  * CSS düzeyinde fare ve elemanların tüm transform/transition animasyonları indirgenmiş hareket modunda anında sonlandırılmalıdır.

---

## 122. Demo Oynatma ve Özellik Hikayelerinde (`DemoPlayback.tsx` & `FeatureStories.tsx`) Klavyeyle Erken Kesilme, Gizli İlerleme Çubuğu ve 10 Saniyelik Otomatik Sekme Atlama (WCAG 2.2.2 İhlali)

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/features/DemoPlayback.tsx`
* `browser-features/pages-welcome/src/app/features/FeatureStories.tsx`

### Tespit Edilen Sorunlar
* 10 Saniyelik Otomatik Sekme Atlama (WCAG 2.2.2 Pause, Stop, Hide - Level A & WCAG 3.2.1 On Focus):
  * `FeatureStories.tsx` bileşeninde her tanıtım 10 saniye sürer ve süre dolduğunda `onComplete()` fonksiyonu **otomatik olarak sonraki sekmeye geçer** (`setActive(next.key)`).
  * Ekran okuyucu kullanan bir birey çalışma alanları tanıtımını incelerken 10 saniye dolduğu anda sayfa kullanıcının altından kayar ve yan panel tanıtımına zıplar! Kullanıcının okuduğu içerik DOM'dan silinir. Bu durum bilişsel ve görme engelli bireyler için en ağır engellerdendir.
* Tuş Yakalama ile Zamansız Oynatma İptali:
  * `DemoPlayback.tsx` içindeki `onKeyDownCapture={interrupt}` dinleyicisi sahne içindeki **herhangi bir tuşa** (Tab, Shift+Tab, Oklar) basıldığı anda oynatmayı keser ve manuel moda geçirir. Ekran okuyucu kullanıcısı demo içeriğini keşfetmek için Tab tuşuna bastığı anda oynatıcı sessizce durur ve durum değişimi kullanıcıya duyurulmaz.
* İlerleme Çubuğunun Ekran Okuyucudan Gizlenmesi (WCAG 4.1.2):
  * Oynatma ilerleme çubuğu `<div className={styles.playbackProgress} aria-hidden="true">` şeklinde tamamen gizlenmiştir. Ekran okuyucu kullanıcısı 10 saniyenin neresinde olunduğunu bilemez.

### Mimari Çözümler
* Kullanıcı Denetimli Sekme Geçişi:
  * Otomatik sekme geçişi varsayılan olarak devre dışı bırakılmalı veya kullanıcı "Sonraki Özellik" butonuna basmadıkça sekme asla kendiliğinden değişmemelidir.
* Akıllı Klavye Gezinme Toleransı:
  * Gezinme tuşları (Tab, Shift+Tab) kesici eylemden muaf tutulmalı; oynatma durumu değiştiğinde `role="status"` ile "Oynatma duraklatıldı" duyurusu yapılmalıdır.
* Erişilebilir İlerleme Çubuğu:
  * İlerleme çubuğuna `role="progressbar"`, `aria-valuenow={Math.round(elapsed / 1000)}`, `aria-valuemax={10}` atanmalıdır.

---

## 123. Karşılama Sahnesinde (`WelcomeScene.tsx`) Semantiksiz Adım Butonları, Değişen Açıklamada Canlı Bölge Yokluğu ve 3.3 Saniyelik Kontrolsüz Animasyon Atlama

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/welcome/WelcomeScene.tsx`

### Tespit Edilen Sorunlar
* Semantiksiz Adım Butonları (WCAG 1.3.1 Info and Relationships & WCAG 4.1.2):
  * Sahne adımları bir `<div>` içine serpiştirilmiş `<button aria-pressed={phase === index}>` elemanlarıdır.
  * Birbirini dışlayan bu adımlar aslında sekme (`role="tablist"` / `role="tab"`) veya radyo grubu yapısındadır; `aria-pressed` iki durumlu butonlar için tasarlandığından semantik olarak yanıltıcıdır.
* Sürekli Değişen Açıklamada Canlı Bölge Yokluğu (WCAG 4.1.3 Status Messages):
  * Her 3.3 saniyede bir (`10000 / 3`) `phase` değişir ve alttaki açıklama metni güncellenir; ancak bu metin `role="status"` veya `aria-live="polite"` taşımaz.
  * Ekran okuyucu kullanıcıları dönen animasyonun ne anlattığını ve sahne geçişlerini asla işitemez.
* Kontrolsüz Otomatik Animasyon (WCAG 2.2.2 Pause, Stop, Hide):
  * Kullanıcı indirgenmiş hareket (reduced-motion) bayrağına sahip değilse animasyonu durdurma (Pause) düğmesi sunulmaz; yalnızca bittiğinde tekrar oynatma (Replay) düğmesi çıkar.

### Mimari Çözümler
* Semantik Sekme / Adım Yapısı:
  * Adım göstergeleri `<div role="tablist">` ve `<button role="tab" aria-selected={phase === index}>` yapısına geçirilmelidir.
* Canlı Açıklama Bölgesi:
  * Açıklama kapsayıcısına `role="status"` ve `aria-live="polite"` atanmalıdır.
* Duraklatma (Pause) Kontrolü:
  * Animasyonu istediği zaman durdurup inceleyebilmesi için belirgin bir "Duraklat" butonu eklenmelidir.

---

## 124. Bağlam Menüsü Özelleştiricisinde (`context-menu/transaction.ts` & `style.ts`) XUL Menü Öğelerinin Yalnızca CSS `display: none` ile Gizlenmesi, Yerel Ayırıcıların Zorla Görünür Kılınması ve Ok Tuşları ile Hayalet Odaklanma Riski

İlgili Dosyalar:
* `browser-features/chrome/common/context-menu/transaction.ts`
* `browser-features/chrome/common/context-menu/style.ts`
* `browser-features/chrome/common/context-menu/separator-policy.ts`

### Tespit Edilen Sorunlar
* Yalnızca CSS `display: none` ile Gizleme ve XUL Ağaç Çatışması (WCAG 4.1.2 Name, Role, Value & Gecko XUL Klavye API İhlali):
  * Floorp, kullanıcının bağlam menüsünden kaldırmak istediği menü öğelerine `data-floorp-context-hidden="true"` özniteliği atar ve bir CSS kuralıyla `display: none !important;` uygular.
  * Ancak XUL menü motorunda menü öğesinin gerçek anlamda gizlenmesi `element.hidden = true` veya `hidden="true"` / `collapsed="true"` özniteliğine bağlıdır!
  * XUL öğesine `hidden="true"` konulmadığında Gecko'nun klavye gezinme motoru (Aşağı/Yukarı ok tuşları, ilk harfe göre atlama) ve ekran okuyucu nesne gezinme ağacı (NVDA/JAWS object navigation), CSS ile gizlenmiş öğeleri potansiyel olarak aktif sanabilir; odak kaybolabilir veya menüde gezinirken takılmalar yaşanabilir.
* Yerel Ayırıcıların Zorla Görünür Kılınması (`separator.hidden = false`):
  * `transaction.ts` 629. satırında, Firefox'un kendi mantığıyla gizlediği yerel menü ayırıcıları taranarak zorla `separator.hidden = false` yapılır!
  * Ardından Floorp kendi ayırıcı politikasına göre (`findSeparatorsToHide`) bazılarını tekrar CSS ile gizlemeye çalışır. Bu müdahale, Firefox'un dinamik menü ayırıcı mantığını bozar ve ekran okuyuculara art arda iki ayırıcı veya boş bölümler duyurulmasına yol açar.
* Yeniden Sıralamada Erişim Tuşlarının (Accesskey) Çakışması ve Değişmesi:
  * Menü öğeleri DOM içinde yer değiştirdiğinde, aynı erişim tuşuna sahip seçeneklerin öncelik sırası kullanıcıya haber verilmeksizin değişir.

### Mimari Çözümler
* Gerçek XUL `hidden` Özniteliği Desteği:
  * Gizlenen menü öğelerine CSS özniteliğinin yanı sıra doğrudan `element.hidden = true` atanmalı, geri alma (rollback) anında eski değeri iade edilmelidir.
* Yerel Ayırıcı Bütünlüğünün Korunması:
  * Firefox'un gizlediği ayırıcıların `hidden` durumu korunmalı; ayırıcı zinciri temizliği yerel motoru sakatlamadan yürütülmelidir.
* Erişim Tuşu Güvenliği:
  * Menü öğeleri yeniden sıralandığında erişim tuşlarının çatışıp çatışmadığı denetlenmelidir.

---

## 125. Eklenti Bildirim Özelleştiricisinde (`addons/notification-customizer.ts`) Katastrofik Kontrast Çöküşü (~2.1:1), Görsel Olmayan Uyarı Eksikliği ve Ekran Okuyucuya Duyurulmayan Güvenlik Uyarısı

İlgili Dosyalar:
* `browser-features/chrome/common/addons/notification-customizer.ts`

### Tespit Edilen Sorunlar
* Katastrofik Kontrast Çöküşü (WCAG 1.4.3 Contrast Minimum - Level AA & WCAG 1.4.6 Level AAA):
  * Chrome Web Mağazası uzantısı yüklendiğinde beliren uyarı rozeti ve uyarı metni doğrudan satır içi (inline) CSS stilleriyle tanımlanmıştır.
  * Uyarı metni stili: `color: #f9ab00; ... background: rgba(249, 171, 0, 0.1);`
  * Açık renk bildirim arka planı (`#ffffff`) üzerinde `#f9ab00` sarı-turuncu renginin kontrast oranı yalnızca **2.1:1**'dir!
  * Bu metin az gören bireyler için neredeyse tamamen görünmezdir ve WCAG AA kriterini (asgari 4.5:1) ağır biçimde ihlal eder.
  * Rozet metni: `color: #4285f4;` beyaz üzerinde **3.28:1** kontrast verir ve yine 4.5:1 eşiğini karşılayamaz.
* Yüksek Karşıtlık Modu (Windows Forced Colors) Kırılması:
  * Sabit hex renkleri (`#f9ab00`, `#4285f4`) Windows Yüksek Karşıtlık Modunda sistem temasına uyum sağlayamaz.
* Ekran Okuyucuya Duyurulmayan Kritik Uyarı (WCAG 4.1.3 Status Messages):
  * `addCompatibilityWarning` fonksiyonu uyarıyı `popupnotificationcontent` içine ham bir `<description>` olarak ekler.
  * Bildirimin `aria-describedby` özniteliğine bu uyarının kimliği eklenmez; uyarı `role="alert"` taşımaz!
  * Ekran okuyucu kullanıcısı uzantıyı yüklerken "Bu uzantı Floorp ile tam uyumlu olmayabilir" şeklindeki kritik güvenlik uyarısını asla duyamaz; yalnızca standart yükleme onayını işitir.

### Mimari Çözümler
* Sistem Temasına Uyumlu Yüksek Kontrastlı Renk Paleti:
  * Satır içi stil yerine CSS değişkenleri kullanılmalı; uyarı rengi açık temada koyu kehribar/kahverengi (`#8a5300`, kontrast > 7:1), koyu temada açık sarı (`#ffd54f`) olmalıdır.
  * `forced-colors: active` durumunda `CanvasText` ve `Highlight` sistem renkleri benimsenmelidir.
* `aria-describedby` ve `role="alert"` Entegrasyonu:
  * Uyarı elemanına benzersiz bir kimlik verilmeli ve bildirim kutusunun `aria-describedby` listesine eklenerek ekran okuyucu tarafından zorunlu olarak seslendirilmesi sağlanmalıdır.

---

## 126. Pencere Sürükleme Özelliğinde (`window-drag/index.ts`) `Ctrl+Alt+Sürükle` Kısayolunun Uluslararası `AltGr` Tuşu ve Ekran Büyütücüleriyle Çakışarak Pencereyi İstemsiz Yer Değiştirmesi

İlgili Dosyalar:
* `browser-features/chrome/common/window-drag/index.ts`
* `browser-features/chrome/common/window-drag/drag-session.ts`

### Tespit Edilen Sorunlar
* Uluslararası Klavye Düzenlerinde `AltGr` Felaketi (WCAG 2.1.1 Keyboard & WCAG 2.5.1 Pointer Gestures):
  * Windows ve Linux sistemlerinde `chordHeld` kontrolü `e.ctrlKey && e.altKey` olarak yazılmıştır.
  * Windows işletim sistemi, Türkçe (Türkçe Q ve F), Almanca, Fransızca, Lehçe, İskandinav vb. klavyelerde yer alan `AltGr` tuşuna basıldığında donanımsal olarak **`ctrlKey: true` VE `altKey: true`** sinyali üretir!
  * Kullanıcı `AltGr` tuşunu basılı tutarak metin seçmek istediğinde (örn. kod içinde `@`, `€`, `₺`, `[`, `{`, `\`, `~` karakterlerini fareyle seçerken) veya metni sürüklerken, Floorp yakalama aşamasında (`addEventListener("mousedown", onMouseDown, true)`) tıklamayı kapar!
  * `e.preventDefault()` ve `e.stopImmediatePropagation()` çalıştırarak metin seçimini iptal eder ve **bütün işletim sistemi tarayıcı penceresini ekranda sürüklemeye başlar!**
  * Kullanıcı metin seçmeye çalışırken tarayıcı penceresi masaüstünde fırlar ve kaybolur!
* Ekran Büyütücü (Magnifier) Kısayollarıyla Çakışma:
  * Windows Büyüteç ve ZoomText gibi az görenlerin kullandığı yazılımlar büyütülmüş alanı kaydırmak için `Ctrl+Alt+Fare Hareketi` kısayolunu kullanır. Floorp bu eylemi gasp ederek Büyüteç yerine pencereyi hareket ettirir.
* Klavye ile Geri Alma Yokluğu:
  * Yanlışlıkla ekrandan taşan pencereyi eski yerine getirmek için hiçbir erişilebilir klavye mekanizması sunulmaz.

### Mimari Çözümler
* `AltGr` Algılama ve Muafiyet Koruması:
  * Windows'ta `AltGr` basıldığında klavye olayının `KeyboardEvent.code === "AltRight"` olup olmadığı denetlenmeli; `AltRight` aktifken pencere sürükleme kesinlikle engellenmelidir.
* Yakalama Aşamasından Kaçınma ve Web İçeriği Koruması:
  * Olay yakalama (`capture: true`) kaldırılmalı; web içeriği (`#content`, `<browser>`) üzerinde gerçekleşen tıklamalarda pencere sürükleme asla devreye girmemelidir.
* Kullanıcı Tercih Anahtarı ve Klavye Alternatifi:
  * Bu davranış ayarlar sayfasından kapatılabilir bir seçenek haline getirilmeli ve motor engelli kullanıcılar için klavye alternatifleri sağlanmalıdır.

---

## 127. Temalarda (`fluerial.css` & `leptonContent.css`) Sekmelerde ve Salt Okunur Alanlarda Odak Çizgisinin Yok Edilmesi (`outline: none !important`), Hedef Boyut Yetersizliği (28x28px) ve Yüksek Karşıtlık Modu Ayrım Kaybı

İlgili Dosyalar:
* `browser-features/skin/fluerial/css/fluerial.css`
* `browser-features/skin/lepton/css/leptonContent.css`

### Tespit Edilen Sorunlar
* Salt Okunur Girdilerde Odak Çizgisinin Yok Edilmesi (WCAG 2.4.7 Focus Visible - Level AA):
  * `leptonContent.css` içinde (satır 2842 ve 6687):
    `#places input:not(:read-write):focus { outline: none !important; }`
  * Yer İmleri ve Geçmiş Düzenleyicisinde (Places Organizer) salt okunur bir adrese veya klasör yoluna klavyeyle odaklanan kullanıcının odak çizgisi zorla yok edilir! Klavye kullanıcısı odağın nerede olduğunu göremez.
* Fluerial Temasında Odaksız Sekmeler ve Yüksek Karşıtlık Modu Ayrım Kaybı:
  * `fluerial.css` içinde `.tab-background` elemanına `box-shadow: none !important; border: 0 !important;` verilir.
  * Windows Yüksek Karşıtlık Modunda (Forced Colors) sekmelerin birbirini ayırabilmesi için kenarlık (`border`) zorunludur. Kenarlık sıfırlandığında sekmeler tek bir düz şerit halinde birbirine karışır.
  * Ayrıca sekmelerde yalnızca `:hover` durumu stillendirilir; klavyeyle odaklanıldığında (`:focus-visible`) hiçbir görsel odak halkası gösterilmez.
* Hedef Boyut Yetersizliği (WCAG 2.5.8 Target Size Minimum - Level AA & WCAG 2.5.5 Level AAA):
  * Fluerial araç çubuğu buton yığın boyutu `width: 28px; height: 28px;` olarak sabitlenmiştir. 28 piksel boyutu etrafında yeterli tampon alan bulunmadığında motor engeli olan bireyler için dokunma/tıklama zorluğu yaratır; AAA seviyesindeki 44x44 piksel hedefini karşılayamaz.

### Mimari Çözümler
* Odak Çizgisinin İadesi:
  * `outline: none !important` kuralları derhal temizlenmeli; `:not(:read-write):focus` dahil tüm odaklanabilir alanlara görünür, yüksek kontrastlı odak halkası (`outline: 2px solid -moz-accent-color; outline-offset: 2px;`) tanımlanmalıdır.
* Yüksek Karşıtlık Modu Koruyucusu:
  * `@media (forced-colors: active)` bloğunda sekmelere `border: 1px solid ButtonText !important;` atanarak sistem paletinde ayrışmaları güvenceye alınmalıdır.
* Hedef Boyutun Standartlaştırılması:
  * Dokunmatik ve fare hedefleri asgari 32x32 px (tamponla birlikte 44x44 px) standardına yükseltilmelidir.
---

## 128. Windows Kurulum Sihirbazı Çekirdeğinde (`stub-win64-installer/src/App.tsx` & `NavBar.tsx`) Küresel Bağlam Menüsü Engeli, Sabit Japonca Donanım Hataları ve Tamamen İsimsiz Kapatma Butonu

İlgili Dosyalar:
* `static/installers/stub-win64-installer/src/App.tsx`
* `static/installers/stub-win64-installer/src/app/layout/NavBar.tsx`

### Tespit Edilen Sorunlar
* Küresel Bağlam Menüsünün Engellenmesi (WCAG 2.1.1 Keyboard & WCAG 1.3.1 Info and Relationships):
  * `App.tsx` içinde 61-70 satırlarında `document.addEventListener("contextmenu", (e) => e.preventDefault())` dinleyicisi kurulmuştur.
  * Kurulum sihirbazının tamamında sağ tık bağlam menüsü küresel olarak iptal edilmiştir.
  * Görme engelli bireylerin ekran okuyucu imleciyle metin seçip bağlam menüsü üzerinden sesli okutması veya kopyalaması, motor engelli bireylerin yardımcı yazılım bağlam menülerini kullanması imkânsız hale getirilmiştir.
* Sabit Japonca Donanım Hata Ekranı (WCAG 3.1.2 Language of Parts - Level AA):
  * Kullanıcının işlemcisi SSE4.1 talimat kümesini desteklemediğinde veya CPU kontrolü başarısız olduğunda (satır 134-169):
    * `<h2>サポートされていないデバイス</h2>`
    * `<p>FloorpはSSE4.1をサポートするプロセッサーが必要です。<br />このデバイスはサポート対象外です。</p>`
    * `<button>終了</button>`
  * Türkçe, İngilizce veya Fransızca konuşan bir kullanıcı eski bir donanıma Floorp yüklemeye çalıştığında hiçbir i18n çevirisi olmaksızın sabit Japonca bir hata ekranıyla karşılaşır; neden kurulum yapamadığını anlayamaz.
* Tamamen İsimsiz Kapatma Butonu (WCAG 4.1.2 Name, Role, Value - Level A):
  * `NavBar.tsx` bileşeninde pencereyi kapatma onay penceresini açan buton (`<button className="btn btn-ghost btn-sm" onClick={handleCloseClick}>`) yalnızca 12x12 piksellik bir SVG ikonu barındırır.
  * Hiçbir `aria-label`, `title` veya metin içermez!
  * Ekran okuyucu kullanıcıları sihirbaz başlığında gezinirken yalnızca "Düğme" duyar; bunun kurulumu sonlandırma butonu olduğunu bilemez.
* Modalda Eksik ARIA İlişkisi:
  * Çıkış onay diyaloğunda (`<dialog ref={modalRef}>`) `aria-labelledby` ve `aria-describedby` bağlanmamıştır.

### Mimari Çözümler
* Bağlam Menüsü Özgürlüğü:
  * `e.preventDefault()` engeli kaldırılmalı veya yalnızca web görünümü içiyle sınırlandırılmalı, yardımcı teknolojilerin menü erişimi korunmalıdır.
* Çok Dilli Donanım Denetimi:
  * Tüm hata mesajları ve CPU kontrol ekranları i18next sözlüğüne taşınarak kullanıcının sistem dilinde gösterilmelidir.
* Erişilebilir Başlık Çubuğu:
  * Kapatma butonuna yerelleştirilmiş `aria-label={t("app.nav.close")}` veya `aria-label="Kurulumu Kapat"` atanmalıdır.
* Standart Dialog ARIA Öznitelikleri:
  * Çıkış modalına `aria-labelledby="exit-modal-title"` ve `aria-describedby="exit-modal-desc"` bağlanmalıdır.

---

## 129. Kurulum Karşılama ve Konum Seçiminde (`InstallerWelcome.tsx` & `BackgroundDecoration.tsx`) 150+ Parçalı Dekoratif SVG Çöpü, Modal `aria-labelledby` Yokluğu ve İsimsiz Yol Alanı

İlgili Dosyalar:
* `static/installers/stub-win64-installer/src/components/InstallerWelcome.tsx`
* `static/installers/stub-win64-installer/src/app/layout/BackgroundDecoration.tsx`

### Tespit Edilen Sorunlar
* Erişilebilirlik Ağacını Kilitleyen 150+ Parçalı Dekoratif SVG Çöpü (WCAG 1.1.1 Non-text Content):
  * `BackgroundDecoration.tsx` bileşeni arka planda 24 SVG çemberi, 25 SVG üçgeni, 16 daire, 9 kare ve 100 nokta olmak üzere **174 adet dekoratif vektör öğesi** üretir.
  * Bu öğelerin hiçbirinde `aria-hidden="true"` bulunmaz!
  * CSS'teki `pointer-events-none` kuralı öğeleri ekran okuyucu ağacından GİZLEMEZ. Ekran okuyucu kullanıcıları sayfayı sanal imleçle gezerken yüzlerce anlamsız, boş grafik ve grup düğümüyle karşılaşarak boğulur.
* Konum Seçim Modalı ve İsimsiz Yol Alanı (WCAG 4.1.2 Name, Role, Value):
  * Özel kurulum dizini seçme diyaloğu (`<dialog ref={modalRef}>`) `aria-labelledby` taşımaz.
  * Konum giriş alanı (`<input type="text" ... readOnly />`) bir `id` ve `<label>` ilişkisine sahip değildir; ekran okuyucu alanın kurulum yolu olduğunu söyleyemez.
  * Karşılama ekranındaki geçerli dizin göstergesi sıradan bir `<div>` olup erişilebilir isme sahip değildir.
* Gereksiz/Yinelenen Alternatif Metin:
  * Floorp logosu `alt="Floorp Installer"` olarak etiketlenmiştir; hemen altında `<h1>Floorp Installer</h1>` başlığı yer aldığından ekran okuyucu aynı adı iki kez ardışık okur.

### Mimari Çözümler
* Arka Plan Dekorasyonunun Tamamen Yalıtılması:
  * `BackgroundDecoration` bileşeninin en dış kapsayıcısına `aria-hidden="true"` atanarak 174 görsel öğenin tamamı ekran okuyucudan tek satırla gizlenmelidir.
* Semantik Dizin Seçim Formu:
  * Girdi alanına `aria-label={t("app.modal.installPath")}` veya `id` ile bağlı `<label>` atanmalıdır.
* Modala `aria-labelledby`:
  * Modal başlığına kimlik verilerek `<dialog aria-labelledby="path-modal-title">` şeklinde bağlanmalıdır.
* Logo `alt=""` Düzenlemesi:
  * Başlığın yanında yer alan logoya `alt=""` veya `aria-hidden="true"` verilerek yineleme engellenmelidir.

---

## 130. Kurulum Slayt Gösterisi ve İlerleme Çubuğunda (`Slideshow.tsx`, `ProgressBar.tsx` & `InstallComplete.tsx`) Sabit Japonca Geri Dönüşler ("前へ", "次へ"), Otomatik Dönen Karusel, İsimsiz İlerleme Çubuğu ve Ekran Okuyucuya Bildirilmeyen İndirme Durumu

İlgili Dosyalar:
* `static/installers/stub-win64-installer/src/components/Slideshow.tsx`
* `static/installers/stub-win64-installer/src/components/ProgressBar.tsx`
* `static/installers/stub-win64-installer/src/components/InstallComplete.tsx`

### Tespit Edilen Sorunlar
* Sabit Japonca Geri Dönüş Metinleri (WCAG 3.1.2 Language of Parts):
  * `Slideshow.tsx` içinde gezinme butonlarının `aria-label` değerlerinde çeviri bulunamadığında kullanılan varsayılan metinler sabit Japoncadır:
    * `aria-label={t("slides.navigation.previous", "前へ")}` (Önceki yerine "Mae e")
    * `aria-label={t("slides.navigation.next", "次へ")}` (Sonraki yerine "Tsugi e")
    * `aria-label={t("slides.navigation.goto", "スライド{{number}}へ", ...)}` ("Suraido X e")
  * İngilizce veya Türkçe işletim sistemlerinde çeviri anahtarı eksik olduğunda görme engelli kullanıcılara Japonca seslendirme yapılır!
* Durdurma Butonu Olmayan Otomatik Karusel (WCAG 2.2.2 Pause, Stop, Hide):
  * `App.tsx` içinde her 8 saniyede bir (`setInterval(..., 8000)`) slayt kendiliğinden ilerler.
  * Slayt gösterisinde duraklatma (Pause) düğmesi yoktur; kullanıcı slayttaki tanıtım metnini okurken içerik altından kayıp gider.
* İsimsiz ve Sessiz İlerleme Çubuğu (WCAG 4.1.2 & WCAG 4.1.3 Status Messages):
  * `ProgressBar.tsx` bileşenindeki `<progress className="progress progress-primary w-full"></progress>` elemanı hiçbir `aria-label` veya `aria-labelledby` taşımaz.
  * Altındaki `{status}` metni (dosyalar indiriliyor, açılıyor vb.) canlı bölge (`aria-live="polite"`, `role="status"`) içinde değildir; ekran okuyucu kullanıcısı kurulumun ilerleyip ilerlemediğini duyamaz.
  * Hata uyarısı (`alert alert-error`) `role="alert"` taşımaz.
* Tamamlanma Ekranında Düşük Kontrast ve Sahte Buton:
  * İndirme hatası aldığında sunulan eski sürüm indirme düğmesi `<button>` olarak yazılmıştır ama gerçekte tarayıcıda harici sayfa açar; "(harici tarayıcıda açılır)" uyarısı yoktur.

### Mimari Çözümler
* Güvenli İngilizce/Türkçe Geri Dönüş Metinleri:
  * Japonca yedek metinler kaldırılarak uluslararası standart geri dönüşler atanmalıdır (`aria-label={t("slides.navigation.previous", "Previous")}`).
* Karusel Duraklatma Mekanizması:
  * Otomatik ilerlemeyi durdurup başlatabilen bir "Duraklat/Oynat" butonu eklenmeli; fare üzerine gelindiğinde veya klavye odaklandığında zamanlayıcı duraklatılmalıdır.
* Erişilebilir Canlı İlerleme Çubuğu:
  * `<progress aria-label={t("app.progress.installing")}>` tanımlanmalı; durum metnine `role="status"` ve `aria-live="polite"`, hata metnine `role="alert"` bağlanmalıdır.

---

## 131. Paylaşılan Çekirdek UI Kütüphanesinde (`libs/ui`) Modal Kapatma Butonu `×` Karakter İlanı, Seçim İkonları ve Yüksek Karşıtlık Modunda Geçersizlik Belirteci Kaybı

İlgili Dosyalar:
* `libs/ui/modal.tsx`
* `libs/ui/dropdown.tsx`
* `libs/ui/controls.module.css`
* `libs/ui/brand.tsx`

### Tespit Edilen Sorunlar
* Modal Kapatma Butonunda Ham Karakter İlanı (WCAG 4.1.2 Name, Role, Value):
  * `libs/ui/modal.tsx` (satır 42) içinde kapatma butonu `<Button variant="ghost" aria-label={closeLabel} onClick={onClose}>×</Button>` şeklinde yazılmıştır.
  * Eğer modalı çağıran sayfa `closeLabel` prop'unu boş geçerse veya unuttuysa, `aria-label` `undefined` olur.
  * Ekran okuyucular butonun erişilebilir adını metin içeriğinden alır ve kelimesi kelimesine "Çarpı işareti, düğme" veya "Times, button" okur!
* Açılır Menüde (Select) Ok İşaretçisi İzolasyonu:
  * `dropdown.tsx` içinde `NativeSelect.Indicator` bileşeni açıkça `aria-hidden="true"` ile işaretlenmemiştir; bazı tarayıcılarda gereksiz grafik öğesi olarak okunabilir.
* Yüksek Karşıtlık Modunda Geçersiz Girdi Belirteci Kaybı (WCAG 1.4.1 Use of Color & WCAG 1.4.11 Non-text Contrast):
  * `controls.module.css` içinde `.input[aria-invalid="true"] { border-color: var(--floorp-danger); }` kuralı geçerlidir.
  * Windows Yüksek Karşıtlık Modunda (`forced-colors: active`) özel CSS renk değişkenleri yok sayılarak `CanvasText` rengine eşitlenir.
  * Hatalı ve geçerli girdiler arasındaki kenarlık rengi farkı tamamen kaybolur; yüksek karşıtlık modundaki kullanıcı hangi alanın hatalı olduğunu anlayamaz.
* Marka Logosunda Yinelenen Alternatif Metin:
  * `brand.tsx` bileşeni sabit `alt="Floorp"` taşır. Yanında metin başlığı olan yerlerde ekran okuyucu iki kez "Floorp" okur.

### Mimari Çözümler
* Zorunlu Güvenli Kapatma Etiketi Fallback'i:
  * `aria-label={closeLabel || t("common.close", "Kapat")}` kuralı işletilerek hiçbir kapatma butonunun ham "×" okutmasına izin verilmemelidir.
* Yüksek Karşıtlık Modunda Geçersizlik Çizgisi:
  * `@media (forced-colors: active)` bloğunda `[aria-invalid="true"]` girdilerine `outline: 2px dashed LinkText !important;` atanarak sistem paletinde belirgin bir doku farkı sağlanmalıdır.
* Koşullu Logo Alternatif Metni:
  * `BrandProps` içine `decorative?: boolean` eklenmeli; dekoratif kullanımda `alt=""` ve `aria-hidden="true"` verilmelidir.

---

## 132. Ayarlar Türkçe Yerelleştirmesinde (`pages-settings/src/lib/i18n/locales/tr-TR.json`) Bağlam Menüsü ve Komut Paleti Bölümlerinin (132 Anahtar) Toptan Yokluğu ve Ekran Okuyucuya Ham Kod Anahtarı Okutulması

İlgili Dosyalar:
* `browser-features/pages-settings/src/lib/i18n/locales/tr-TR.json`
* `browser-features/pages-settings/src/lib/i18n/locales/en-US.json`

### Tespit Edilen Sorunlar
* 132 Çeviri Anahtarının Toptan Yokluğu (WCAG 3.1.2 Language of Parts - Level AA & WCAG 4.1.2 Name, Role, Value):
  * `pages-settings/src/lib/i18n/locales/tr-TR.json` dosyasında `contextMenu` (74 anahtar) ve `commandPalette` (58 anahtar) ana bölümleri **tamamen eksiktir!**
  * Türkçe dilini kullanan bir kullanıcı Ayarlar -> Bağlam Menüsü veya Komut Paleti sayfasına girdiğinde:
    * Sayfa başlığı, açıklamalar, arama kutusu yer tutucusu, butonlar, sıfırlama onayları, kısayol etiketleri ve uyarıların tamamı çevirisiz kalır.
    * Ekran okuyucu kullanıcısına buton ismi olarak `"contextMenu.resetAll.confirm"` veya `"commandPalette.placeholder"` şeklinde çiğ kod değişkenleri okunur!
    * Bu durum kullanıcı için arayüzü anlaşılmaz ve kullanılamaz kılar.

### Mimari Çözümler
* Eksiksiz Türkçe Sözlük Entegrasyonu:
  * `en-US.json` dosyasındaki `contextMenu` ve `commandPalette` ağaçları eksiksiz, doğal ve profesyonel Türkçe terimlerle `tr-TR.json` dosyasına işlenmeli; hiçbir anahtarın tanımsız kalmasına izin verilmemelidir.

---

## 133. Tarayıcı Çekirdek Yerelleştirmesinde (`i18n/tr-TR/browser-chrome.json` & `pages-notes`) Kenar Çubuğu Ayırıcıları ve Komut Paleti Erişilebilir Etiketlerinin (11 Anahtar) Eksikliği

İlgili Dosyalar:
* `i18n/tr-TR/browser-chrome.json`
* `i18n/en-US/browser-chrome.json`
* `browser-features/pages-notes/src/lib/i18n/locales/tr-TR.json`

### Tespit Edilen Sorunlar
* Çekirdek Arayüzde 9 Kritik Anahtarın Eksikliği (WCAG 4.1.2 Name, Role, Value):
  * `i18n/tr-TR/browser-chrome.json` dosyasında şu 9 anahtar yer almamaktadır:
    * `firefoxSidebar.edgeToggle` (Kenar çubuğu kenar sabitleyicisi)
    * `firefoxSidebar.resize` (Firefox kenar çubuğu boyutlandırma tutamacı erişilebilir adı)
    * `panelSidebar.resize` (Nora kenar çubuğu boyutlandırma tutamacı erişilebilir adı)
    * `commandPalette.shortcutLabel` (Komut paleti kısayol etiketi)
    * `commandPalette.shortcutWithArgsLabel` (Argümanlı kısayol etiketi)
    * `commandPalette.searchShortcutDescription` (Arama kısayolu açıklaması)
    * `commandPalette.shortcuts.reservedTabSearch` (Açık sekme arama filtre etiketi)
    * `commandPalette.shortcuts.reservedBookmarkSearch` (Yer imi arama filtre etiketi)
    * `commandPalette.shortcuts.reservedHistorySearch` (Geçmiş arama filtre etiketi)
  * Özellikle kenar çubuğu boyutlandırma ayırıcılarının (`role="separator"`) erişilebilir adları doğrudan `panelSidebar.resize` ve `firefoxSidebar.resize` anahtarlarından beslenir. Bu anahtarlar eksik olduğunda ayırıcılar isimsiz kalır!
* Notlar Sayfasında Dışa Aktarma Çeviri Eksikliği:
  * `pages-notes/src/lib/i18n/locales/tr-TR.json` dosyasında `notes.export` ("Notları Dışa Aktar") ve `error.exportFailed` ("Dışa aktarma başarısız oldu") anahtarları eksiktir. Dışa aktarma butonu ve hata duyuruları çiğ anahtar gösterir.

### Mimari Çözümler
* Eksik Çekirdek ve Notlar Anahtarlarının Tamamlanması:
  * `browser-chrome.json` ve `pages-notes` dosyalarına eksik olan 11 anahtarın tamamı terminolojiye uygun Türkçe karşılıklarıyla eklenmelidir.
---

## 134. Kenar Çubuğu Konumu Tersine Çevirme Butonunda (`reverse-sidebar-position.tsx`) Var Olmayan `l10nId` Nedeniyle Tamamen İsimsiz Araç Çubuğu Butonu

İlgili Dosyalar:
* `browser-features/chrome/common/reverse-sidebar-position/reverse-sidebar-position.tsx`
* `browser-features/chrome/utils/browser-action.tsx`
* `i18n/tr-TR/browser-chrome.json`
* `i18n/en-US/browser-chrome.json`

### Tespit Edilen Sorunlar
* Tamamen İsimsiz Araç Çubuğu Butonu (WCAG 4.1.2 Name, Role, Value - Level A):
  * `ReverseSidebarPosition` sınıfı `BrowserActionUtils.createToolbarClickActionButton` fonksiyonuna `l10nId` parametresi olarak `"sidebar-reverse-position-toolbar"` değerini geçer.
  * Ancak `"sidebar-reverse-position-toolbar"` kimliği ne `en-US/browser-chrome.json` ne `tr-TR/browser-chrome.json` ne de Firefox'un Fluent dosyalarında mevcuttur!
  * `document.l10n?.formatValue("sidebar-reverse-position-toolbar")` çözümlenemediğinde `null` döner ve butonun `label` ile `tooltiptext` alanlarına `null` atanır.
  * Gezinme araç çubuğuna (navbar) eklenen bu buton tamamen etiketsiz ve isimsiz kalır. Ekran okuyucu kullanıcıları odaklandığında yalnızca "Düğme" duyar; işlevi kestirilemez.

### Mimari Çözümler
* Geçerli Yerelleştirme Kimliği ve Senkron Yedek:
  * Dil dosyalarına `"sidebarReversePosition.toolbarLabel"` anahtarı eklenmeli; `formatValue` başarısız olduğunda i18next sözlüğünden senkron yedek atanmalıdır.
* Erişilebilir Durum Göstergesi:
  * Butona mevcut kenar çubuğu yönünü (sol veya sağ) bildiren `aria-pressed` veya açıklayıcı araç ipucu bağlanmalıdır.

---

## 135. Tarayıcı Çekirdeğinde (`i18n/tr-TR/browser-chrome.json`) Bölünmüş Görünüm, Zen Modu ve Fare Hareketlerinde 30+ Eylem ve Açıklamanın İngilizce Bırakılması (WCAG 3.1.2 İhlali)

İlgili Dosyalar:
* `i18n/tr-TR/browser-chrome.json`

### Tespit Edilen Sorunlar
* 30'dan Fazla Çekirdek Eylemin İngilizce Bırakılması (WCAG 3.1.2 Language of Parts - Level AA):
  * Türkçe dil dosyası `i18n/tr-TR/browser-chrome.json` içinde Bölünmüş Görünüm (Split View), Zen Modu, Komut Paleti ve Sekme Düzenleme komutlarının isim ve açıklamaları çevrilmemiş, ham İngilizce bırakılmıştır:
    * `"floorp-split-view-open-left": "Split View Left"`
    * `"floorp-split-view-open-right": "Split View Right"`
    * `"floorp-split-view-open-top": "Split View Top"`
    * `"floorp-split-view-open-bottom": "Split View Bottom"`
    * `"floorp-split-view-close": "Close Split View"`
    * `"floorp-split-view-swap-panes": "Swap Split Panes"`
    * `"floorp-split-view-cycle-layout": "Cycle Split Layout"`
    * `"floorp-split-view-add-pane": "Add Pane to Split View"`
    * `"floorp-split-view-remove-pane": "Remove Pane from Split View"`
    * `"floorp-toggle-zen-mode": "Toggle Zen Mode"`
    * `"floorp-toggle-command-palette": "Toggle Command Palette"`
    * `"floorp-open-settings": "Open Settings"`
    * `"floorp-toggle-share-mode": "Toggle Share Mode"`
    * `"floorp-copy-page-url-as-markdown": "Copy Page URL as Markdown"`
    * `"gecko-close-other-tabs": "Close Other Tabs"`
    * `"gecko-close-tabs-to-start": "Close Tabs to Left"`
    * `"gecko-close-tabs-to-start-vertical": "Close Tabs Above"`
    * `"gecko-close-tabs-to-end": "Close Tabs to Right"`
    * `"gecko-close-tabs-to-end-vertical": "Close Tabs Below"`
  * Türkçe sentezleyici kullanan ekran okuyucular bu İngilizce terimleri Türkçe fonetik kurallarıyla okumaya çalışarak bozuk, anlaşılmaz sesler üretir.

### Mimari Çözümler
* Tam ve Doğal Türkçe Terminoloji Entegrasyonu:
  * Tüm Bölünmüş Görünüm eylemleri ("Bölünmüş Görünümü Sola Aç", "Bölmeleri Takas Et", "Bölünmüş Düzeni Değiştir" vb.) ve sekme işlemleri eksiksiz Türkçeleştirilmelidir.

---

## 136. Fare ile Sekme Yenileme Denetleyicisinde (`tab-refresh/controller.ts`) Yalnızca Fareyle Ortaya Çıkış, `tabindex="-1"` Klavye Dışlaması, Tuş Dinleyicisi Yokluğu ve Sabit İngilizce İpuçları

İlgili Dosyalar:
* `browser-features/chrome/common/tab-refresh/controller.ts`

### Tespit Edilen Sorunlar
* Klavyeden Tamamen Dışlanmış Buton (WCAG 2.1.1 Keyboard - Level A):
  * Sekme üzerindeki yenileme butonu yalnızca fareyle sekmenin üzerine gelindiğinde (`mouseover`, 700 ms gecikmeyle) oluşturulur.
  * Butona açıkça `tabindex="-1"` ve `keyNav="false"` atanmıştır; klavye sekme sırasına asla giremez.
  * Buton olay dinleyicilerinde (`pointerdown`, `mousedown`, `click`) sadece fare tıklaması kontrol edilir; klavye `keydown` (Enter/Space) dinleyicisi yoktur.
* Sabit İngilizce Yedek İsim (WCAG 3.1.2 Language of Parts):
  * `this.label = options.label ?? "Reload tab";` kuralıyla yerelleştirme yüklenemediğinde veya geciktiğinde daima sabit İngilizce "Reload tab" atanır.
* Motor Engelli Kullanıcılar İçin Kararsızlık (WCAG 1.4.13 Content on Hover or Focus):
  * Baş faresi veya göz izleyici kullanan bireylerde işaretçi sekme kapatma butonuna veya milimetrik olarak dışarı taştığı anda buton derhal DOM'dan yok edilir (`removeGlyph()`).

### Mimari Çözümler
* Klavye ve Odak Paritesi:
  * Sekme klavyeyle odaklandığında veya sekme bağlam menüsünde yenileme kısayolu (`Ctrl+R` / `F5`) açıkça duyurulmalı; görsel buton klavye ile odaklanabilir kılınmalı veya sekme menüsüne tam entegre edilmelidir.
* Güvenli i18n Sözlük Bağlantısı:
  * Sabit "Reload tab" metni yerine dinamik ve yerelleştirilmiş i18next anahtarı atanmalıdır.

---

## 137. Kapatılan Sekmeyi Geri Alma Aracında (`undo-closed-tab/index.ts`) macOS'ta Yanıltıcı Kısayol (`Ctrl+Shift+T`), Başlangıçta Sabit İngilizce İsim ve Eksik Dinamik Başlatma

İlgili Dosyalar:
* `browser-features/chrome/common/undo-closed-tab/index.ts`

### Tespit Edilen Sorunlar
* macOS Kullanıcılarına Yanıltıcı Kısayol Duyurusu (WCAG 2.4.4 Link Purpose / Platform Parity):
  * `index.ts` içinde araç ipucu metnine sabit `"(Ctrl+Shift+T)"` iliştirilmiştir.
  * macOS işletim sisteminde sekmeyi geri alma kısayolu **`Cmd+Shift+T`**dir. Mac kullanıcıları ekran okuyucu veya araç ipucunda `Ctrl+Shift+T` duyurusu alarak yanlış yönlendirilir.
* Başlangıçta Sabit İngilizce İsim (WCAG 3.1.2 Language of Parts):
  * Buton başlatılırken `defaultTexts = { buttonLabel: "Undo Closed Tab", ... }` nesnesi doğrudan XUL butonunun `label` özniteliğine atanır.
  * Dil gözlemcisi (`addI18nObserver`) ilk tetiklenene kadar buton Türkçe arayüzde İngilizce `"Undo Closed Tab"` olarak kalır.

### Mimari Çözümler
* Platforma Duyarlı Kısayol Şablonu:
  * İşletim sistemi `AppConstants.platform === "macosx"` ise `Cmd+Shift+T`, aksi halde `Ctrl+Shift+T` atanmalıdır.
* Senkron Yerelleştirme Başlatması:
  * Buton oluşturulduğu anda `i18next.t("undo-closed-tab.label")` senkron çağrılarak sabit İngilizce metin tamamen kaldırılmalıdır.

---

## 138. Yer İmleri Çubuğu Açılma Tasarımlarında (`bookmarkbar_autohide.css` & `bookmarkbar_focus_expand.css`) Klavyeyle Odaklanıldığında Görünmezlik (`opacity: 0`), 3D Döndürme (`rotateX(90deg)`) ile Odaklanan Öğenin Yok Olması ve Eksik `:focus-within`

İlgili Dosyalar:
* `browser-features/chrome/common/ui-custom/styles/css/options/bookmarkbar_autohide.css`
* `browser-features/chrome/common/ui-custom/styles/css/options/bookmarkbar_focus_expand.css`

### Tespit Edilen Sorunlar
* Klavyeyle Odaklanıldığında Görünmez Yer İmleri Çubuğu (WCAG 2.4.7 Focus Visible - Level AA):
  * `bookmarkbar_autohide.css` dosyası yer imleri çubuğuna `opacity: 0 !important;` verir ve yalnızca fareyle üzerine gelindiğinde (`#navigator-toolbox:hover > #PersonalToolbar`) görünür kılar (`opacity: 1`).
  * `:focus-within` kuralı yazılmamıştır! Klavye kullanıcısı `Ctrl+B` veya Tab ile yer imleri çubuğuna girdiğinde çubuk **tamamen görünmez** kalır; kullanıcı nereye odaklandığını göremez.
* 3D Döndürme ile Odaklanan Öğenin Buharlaşması:
  * `bookmarkbar_focus_expand.css` içinde `#PersonalToolbar` 90 derece dikey döndürülerek (`transform: rotateX(90deg)`) gizlenir.
  * Yalnızca `#nav-bar:focus-within + #PersonalToolbar` durumunda düzeltilir (`rotateX(0deg)`).
  * Ancak odak adres çubuğundan çıkıp yer imleri çubuğuna doğrudan girdiğinde `#nav-bar:focus-within` bozulur ve çubuk **klavye kullanıcısı içindeyken aniden tekrar 90 derece dönerek sıfır piksellik bir çizgiye dönüşür ve yok olur!**
  * Üstelik adres çubuğu alta taşındığında (`dom-manipulator.ts`) bitişik kardeş seçici (`+ #PersonalToolbar`) tamamen kırılır.

### Mimari Çözümler
* Tam `:focus-within` Desteği:
  * Hem `#PersonalToolbar:focus-within` hem de araç çubuğu odağı durumlarında çubuk tam opaklığa (`opacity: 1`) ve düz açıya (`transform: none`) getirilmeli, klavye odağı varken asla kapanmamalıdır.
* İndirgenmiş Hareket Uyumu:
  * `@media (prefers-reduced-motion: reduce)` altında 3D döndürme animasyonu iptal edilmeli, basit ve ani durum geçişi sağlanmalıdır.

---

## 139. Dikey Sekme Fare Vurgusu Tasarımında (`native-verticaltab-hover.css`) Sekme Başlıklarının `visibility: collapse` ile Gizlenmesi, Klavyede Kapalı Kalması ve Ayırıcının Zorla Yok Edilmesi (`#verticaltab-splitter { display: none !important; }`)

İlgili Dosyalar:
* `browser-features/chrome/common/ui-custom/styles/css/options/native-verticaltab-hover.css`

### Tespit Edilen Sorunlar
* Sekme Başlıklarının Erişilebilirlik Ağacından Silinmesi (WCAG 4.1.2 Name, Role, Value & WCAG 2.1.1 Keyboard):
  * Fare üzerinde olmadığında (`:not(:hover)`), sekme başlık konteyneri `.tab-label-container` elemanına `visibility: collapse; opacity: 0;` verilir.
  * Gecko motorunda `visibility: collapse` elemanı hem görselden hem de erişilebilirlik ağacından siler.
  * Genişleme kuralı yalnızca `#TabsToolbar:hover` olarak tanımlanmıştır; **`:focus-within` kuralı yoktur!**
  * Klavye kullanıcısı `Ctrl+Tab`, `Alt+1..9` veya Tab ile sekme çubuğuna girdiğinde araç çubuğu 45 piksellik dar modda kilitli kalır; sekme başlıkları açılmaz ve ekran okuyucu başlıkları okuyamaz.
* Boyutlandırma Ayırıcısının Zorla İptal Edilmesi (WCAG 1.4.4 Resize Text & WCAG 1.4.10 Reflow):
  * `#verticaltab-splitter { display: none !important; }` kuralıyla kullanıcının dikey sekme çubuğunu fare veya klavyeyle genişletmesini sağlayan yerel ayırıcı tamamen yok edilmiştir. Az gören kullanıcılar çubuk genişliğini yazı tipi boyutuna göre ayarlayamaz.

### Mimari Çözümler
* Odakla Genişleme (`:focus-within` Paritesi):
  * `#TabsToolbar:is(:hover, :focus-within)` kuralı işletilmeli; klavye odağı sekme çubuğuna girdiğinde çubuk otomatik olarak tam genişliğe (250px) açılmalı ve başlıklar görünür kılınmalıdır.
* Ayırıcının Korunması:
  * Ayırıcı zorla silinmemeli, klavye ile yeniden boyutlandırılabilir erişilebilir ayırıcı (`role="separator"`) olarak korunmalıdır.

---

## 140. DOM Düzen Yöneticisinde (`dom-manipulator.ts`) Canlı Duyuru Elemanının (`#a11y-announcement`) Ekleme Çapası Olarak Kullanılarak Ekran Okuyucu Akışının Bozulması ve URL Çubuğundan `popover` Özniteliğinin Silinmesi

İlgili Dosyalar:
* `browser-features/chrome/common/ui-custom/layout/dom-manipulator.ts`

### Tespit Edilen Sorunlar
* Erişilebilirlik Canlı Bölgesinin Yapısal Eleman Olarak Gasp Edilmesi (WCAG 1.3.2 Meaningful Sequence & WCAG 4.1.3 Status Messages):
  * `DOMLayoutManager` sınıfında (satır 852-855), Firefox'un ekran okuyucu duyuruları için ayırdığı `#a11y-announcement` canlı bölgesi `fullscreenWrapper` adıyla alınır.
  * Adres çubuğu veya yer imleri çubuğu alta taşındığında (satır 1004 ve 1019), `#a11y-announcement` bir DOM **ekleme çapası (insertion anchor)** olarak kullanılır (`insertionAnchor.after(navbar)`).
  * Ekran okuyucu canlı bölgesi pencerenin altında yer alırken, tarayıcının tüm ana gezinme çubuğu (`#nav-bar`) bu canlı bölgenin arkasına takılır!
  * Okuma sırası (DOM hiyerarşisi) tamamen bozulur; web sayfasından sonra canlı duyuru düğümü, ardından adres çubuğu gelir.
* URL Çubuğundan `popover` Özniteliğinin Silinmesi (Gecko Popover API Sakatlanması):
  * Satır 975'te `urlbar.removeAttribute("popover");` çağrısı yapılır.
  * Modern Firefox'ta adres çubuğu açılır paneli, erişilebilir üst katman (top-layer) odak yönetimi için standart Web Popover API'sini kullanır. Bu özniteliğin silinmesi sonuç listesinin erişilebilir odağını bozar.

### Mimari Çözümler
* Canlı Duyuru Bölgesine Müdahale Yasağı:
  * `#a11y-announcement` elemanına kesinlikle dokunulmamalı; düzen taşımalarında tarayıcı görüntüleme alanı (`#browser` veya `#appcontent`) kapsayıcıları kullanılmalıdır.
* Doğal `popover` Bütünlüğü:
  * `urlbar` üzerindeki `popover` özniteliği korunmalı; düzen taşıması CSS değişkenleri üzerinden yönetilmelidir.

---

## 141. Floorp Hub Panel Menüsünde (`HubPanelMenu.tsx`) `open="true"` Mutasyonu Sonrası Geç Solid-XUL Render ile Ekran Okuyucu Sanal İmleç Çöküşü ve Eksik Erişim Tuşları

İlgili Dosyalar:
* `browser-features/chrome/common/hub-panel-menu/HubPanelMenu.tsx`

### Tespit Edilen Sorunlar
* Menü Açıldıktan Sonra Gerçekleşen Asenkron Render (WCAG 4.1.2 Name, Role, Value & WCAG 2.4.3 Focus Order):
  * `HubPanelMenu`, ana uygulama menüsü butonundaki (`#PanelUI-menu-button`) `open="true"` öznitelik mutasyonunu dinler.
  * Menü ekranda açılıp boyandıktan sonra `renderPanel()` fonksiyonu çağrılarak `<xul:toolbarbutton id="appMenu-floorp-hub-button">` butonu menü gövdesine enjekte edilir.
  * Ekran okuyucu menü açıldığı anda menü ağacını oluşturduğu için, sonradan eklenen bu buton ekran okuyucu tarafından algılanamaz veya kullanıcı Aşağı Ok ile gezinirken odak atlamalarına ve odak kaybına sebep olur.
* Menü Butonunda Erişim Tuşu (Accesskey) Yokluğu:
  * Butona erişim tuşu atanmamıştır; klavye kullanıcısı harf kısayoluyla bu seçeneğe doğrudan ulaşamaz.

### Mimari Çözümler
* Menü Öncesi Senkron Yerleşim (`popupshowing` Entegrasyonu):
  * Buton, menü açıldıktan sonra mutasyonla değil; menü açılmadan önce (`popupshowing` yakalama aşamasında) menü ağacına statik olarak eklenmelidir.
* Standart Alt Görünüm ve Erişim Tuşu Tanımı:
  * Butona yerelleştirilmiş `accesskey` tanımlanmalıdır.
---

## 142. Sekme Boyutu Özelleştirmesinde (`tab/sizeSpecification/index.tsx` & `style.css`) Sekme Yüksekliğinin 20px'e Kadar Düşürülebilmesi, WCAG 2.5.8 Hedef Boyutu (Hedef Boyutu Minimum 24x24 px) ve AAA 2.5.5 (44x44 px) İhlali, Kapatma Butonları ve Ses Göstergelerinin Kırpılması

İlgili Dosyalar:
* `browser-features/chrome/common/tab/sizeSpecification/index.tsx`
* `browser-features/chrome/common/tab/sizeSpecification/style.css`

### Tespit Edilen Sorunlar
* Kritik Hedef Boyutu İhlali (WCAG 2.5.8 Target Size Minimum - Level AA & WCAG 2.5.5 Target Size - Level AAA):
  * `sizeSpecification/index.tsx` dosyasında kullanıcının sekme yüksekliğini ayarlayabildiği doğrulanmış minimum yükseklik değeri (`validatedMinH`) 20 piksele kadar düşürülebilmektedir (`--floorp-tab-min-height: 20px;`).
  * WCAG 2.5.8 standardı, dokunmatik veya tıklanabilir herhangi bir etkileşimli hedef için minimum 24x24 CSS pikseli zorunlu kılmaktadır. WCAG AAA 2.5.5 ise 44x44 CSS pikselini hedefler.
  * Sekme yüksekliği 20px yapıldığında, sekme çubuğundaki her bir sekme bu küresel kuralı doğrudan çiğner.
* Kapatma Butonları ve Ses/Medya Rozetlerinin Kırpılması ve Yanlış Tıklama Riski:
  * 20px yüksekliğe sahip bir sekmede, standart sekme kapatma butonu (`.tab-close-button`, varsayılan 16x16px veya 18x18px) dikeyde neredeyse sıfır piksel toleransla oturur.
  * Motor beceri kısıtlılığı, titreme veya parkinson hastası kullanıcılar sekmeyi seçmek isterken kapatma butonuna veya ses kapatma rozetine (`.tab-icon-sound`) yanlışlıkla tıklar; sekme aniden kapanarak veri kaybına yol açar.
* Yazı Tipi Alt Uzantılarının (Descenders) Kırpılması (WCAG 1.4.4 Resize Text & WCAG 1.4.12 Text Spacing):
  * Az gören kullanıcılar işletim sistemi düzeyinde büyük yazı tipi veya yüzde 200 metin büyütme kullandığında, 20px yükseklik sınırında sekme başlığındaki `g`, `y`, `p`, `q`, `j` gibi alt uzantılı harfler dikeyde kesilir ve okunamaz hale gelir.

### Mimari Çözümler
* Katı Minimum Boyut Sınırı (En Az 24px, Tercihen 28px):
  * `validatedMinH` değeri için mantıksal taban sınırı en az 24px (tavsiye edilen erişilebilir taban: 28px veya 32px) olarak sınırlandırılmalıdır. Kullanıcı tercihlerinden 20px girilse bile minifier kuralı `Math.max(val, 24)` uygulamalıdır.
* Kompakt Modda Akıllı Kapatma Butonu Koruması:
  * Sekme yüksekliği 28px altına indiğinde, sekme kapatma butonu ile sekme yüzeyi arasına güvenli tıklama boşluğu (`padding/margin`) konulmalı veya kapatma işlemi yalnızca klavye/orta tuş ile yapılabilir hale getirilerek istem dışı tıklamalar önlenmelidir.

---

## 143. Sabitlenmiş Sekme Özelleştirmesinde (`pinnedTabCustomization/style.css`) Başlık Açıkken `max-width: 60px !important;` ile Metnin 2-3 Harfe Kırpılması, Ses ve Paylaşım Simgelerinin Sıkıştırılması

İlgili Dosyalar:
* `browser-features/chrome/common/tab/pinnedTabCustomization/style.css`

### Tespit Edilen Sorunlar
* Aşırı Genişlik Kısıtlaması ile Başlıkların Anlamsızlaşması (WCAG 1.4.4 Resize Text & WCAG 1.3.1 Info and Relationships):
  * Sabitlenmiş sekmelerde başlık gösterme özelliği etkinleştirildiğinde, `.tab-label-container[pinned]` elemanına zorla `max-width: 60px !important;` uygulanır.
  * 60 piksellik bir alanda, 12px veya 13px sistem yazı tipiyle yalnızca 3 ila 4 karakter görüntülenebilir (örneğin "Goo..." veya "Gma...").
  * Az gören kullanıcı metin boyutunu yüzde 150 veya 200'e çıkardığında bu alan yalnızca 1-2 harfe düşer ve sekmenin ne olduğu görsel olarak tamamen belirsizleşir.
* Medya ve Gösterge Simgelerinin Metinle Üst Üste Binmesi:
  * Sabitlenmiş sekmede ses çalan (`[soundplaying]`) veya ekran paylaşımı yapan göstergeler `.tab-icon-sound[pinned]` içine zorlanır ve `margin-inline-end: 5.5px` ile sıkıştırılır.
  * 60 piksellik kısıtlı alanda ses simgesi ile kırpılmış metin birbirine girer; görsel hiyerarşi bozulur.

### Mimari Çözümler
* Dinamik ve Esnek Minimum Genişlik (`min-width: fit-content; max-width: 140px;`):
  * Başlık etkinleştirilmiş sabit sekmelerde genişlik katı 60px ile sınırlandırılmamalı; en az 100px - 140px aralığında dinamik esneklik (`max-width: clamp(80px, 12ch, 160px)`) sağlanmalıdır.
* Metin Boyutlandırma Duyarlılığı:
  * Sabit piksel (`px`) yerine göreceli `ch` veya `em` birimleri kullanılmalı, metin büyütüldüğünde sekme genişliği orantılı olarak genişlemelidir.

---

## 144. Çok Satırlı Sekme Çubuğunda (`tabbar/multirow-tabbar/`) 2 Boyutlu Ok Tuşları (`ArrowUp`/`ArrowDown`) Gezinmesinin Yokluğu ve Satırlar Arası Klavye ile Sıralama (WCAG 2.5.7 Dragging Movements Paritesi) Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/multirow-tabbar/`
* `browser-features/chrome/common/tabbar/tab-drag-drop-manager.ts`

### Tespit Edilen Sorunlar
* İki Boyutlu Klavye Dolaşımının Desteklenmemesi (WCAG 2.1.1 Keyboard & WAI-ARIA Composite Widget Pattern):
  * Sekmeler çok satırlı (multi-row) düzende alt alta birden fazla satıra yayıldığında, görsel olarak bir ızgara (grid) veya çok satırlı sekme şeridi oluşur.
  * Ancak mevcut sekme konteyneri odak yöneticisi yalnızca tek boyutlu `ArrowLeft` ve `ArrowRight` tuşlarını destekler.
  * Klavye kullanıcısı 3. satırın ortasındaki bir sekmeden doğrudan üstündeki 2. satırdaki sekmeye geçmek için `ArrowUp` tuşuna bastığında hiçbir şey gerçekleşmez. Kullanıcı 20 sekme boyunca tek tek yatayda basmak zorunda kalır.
* Satırlar Arası Sürükleme Hareketi Alternatifinin Bulunmaması (WCAG 2.2 Criterion 2.5.7 Dragging Movements - Level AA):
  * Çok satırlı sekme çubuğunda bir sekmeyi üst satıra veya alt satıra taşımak yalnızca fareyle sürükle-bırak (`drag-and-drop`) ile mümkündür.
  * Klavye ile sekmeyi bir üst satıra veya alt satıra taşımayı sağlayan tek dokunuşlu/klavyeli kısayol (`Ctrl+Shift+PageUp/PageDown` veya içerik menüsü "Üst/Alt Satıra Taşı") sunulmamıştır. Motor engelli kullanıcılar sekmeleri satırlar arasında yeniden düzenleyemez.

### Mimari Çözümler
* 2B Ok Tuşları Gezinme Motoru:
  * Çok satırlı sekme modunda `ArrowUp` ve `ArrowDown` tuş olayları dinlenmeli; sekmelerin `getBoundingClientRect()` geometrik koordinatlarına göre dikey eksende en yakın hizada bulunan üst/alt satırdaki sekmeye odak aktarılmalıdır.
* Erişilebilir Yeniden Sıralama Kısayolları:
  * Sekme içerik menüsüne veya klavye kısayol yöneticisine "Sekmeyi Önceki/Sonraki Satıra Taşı" komutu eklenmeli, WCAG 2.5.7 gereği sürükleme yapamayan kullanıcılar için eşdeğer mekanizma sunulmalıdır.

---

## 145. Yatay Sekme Çubuğunu Gizleme Tasarımında (`hide-horizontal-tabbar.css`) `#TabsToolbar-customization-target` Elemanının `display: none !important;` ile Yok Edilmesiyle Özel Araç Çubuğu Butonlarının ve Gecko Yerel Sekme Listesi Erişilebilirlik Ağacının Tahrip Edilmesi

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/tabbbar-style/styles/hide-horizontal-tabbar.css`

### Tespit Edilen Sorunlar
* Araç Çubuğu Butonlarının ve Eklentilerin Erişilebilirlik Ağacından Silinmesi (WCAG 4.1.2 Name, Role, Value & WCAG 2.1.1 Keyboard):
  * `hide-horizontal-tabbar.css` dosyasında yatay sekme çubuğu gizlenirken şu kural işletilir:
    `#TabsToolbar-customization-target { display: none !important; }`
  * Firefox Gecko mimarisinde `#TabsToolbar-customization-target`, kullanıcıların araç çubuğunu özelleştirirken sekme çubuğunun yanına koyduğu tüm uzantı butonlarını, yeni sekme butonunu (`#new-tab-button`), tüm sekmeleri listele butonunu (`#alltabs-button`) ve yerel sekme listesi (`#tabbrowser-tabs`) erişilebilirlik çerçevesini barındırır.
  * `display: none !important;` verildiğinde bu konteyner içindeki tüm etkileşimli bileşenler klavye odak halkasından ve erişilebilirlik ağacından tamamen buharlaşır. Kullanıcı dikey sekmeleri veya kenar çubuğunu kullansa bile buraya yerleştirilmiş araçlara klavyeyle asla erişemez.

### Mimari Çözümler
* Yalnızca Sekme Elemanının Şartlı Gizlenmesi:
  * Bütün `#TabsToolbar-customization-target` yok edilmemelidir. Yalnızca `#tabbrowser-tabs` konteyneri hedef alınmalı veya özelleştirilebilir butonlar `#nav-bar` konteynerine güvenli bir şekilde taşınmalıdır.
* Erişilebilir Yedek Dolaşım:
  * Yatay sekme çubuğu gizlendiğinde, dikey sekme çubuğunun ekran okuyucu odak zincirinde birincil sekme konteyneri olarak yer alması sağlanmalıdır.

---

## 146. Firefox Kenar Çubuğu Kenar Geçiş Butonunda (`overlay.ts`) Aynı Butonda `aria-pressed="false"` ve `aria-expanded="false"` Çakışması (Anti-Pattern) ve Ekran Okuyucu Durum Karmaşası

İlgili Dosyalar:
* `browser-features/chrome/common/firefox-sidebar/overlay.ts`

### Tespit Edilen Sorunlar
* İki Farklı ARIA Durum Modelinin Aynı Elemana Basılması (WAI-ARIA 1.2 Anti-Pattern & WCAG 4.1.2 Name, Role, Value):
  * `overlay.ts` dosyasında kenar çubuğu açma-kapama kenar butonu olan `#floorp-firefox-sidebar-edge-toggle` elemanına hem `aria-pressed="false"` (Basmalı Buton / Toggle Button) hem de `aria-expanded="false"` (Açılır-Kapanır Panel / Disclosure Widget) öznitelikleri aynı anda verilmektedir.
  * WAI-ARIA spesifikasyonuna göre bir buton ya iki durumlu bir basmalı butondur (`aria-pressed`) ya da bir paneli/menüyü kontrol eden genişletilebilir bir tetikleyicidir (`aria-expanded`).
  * NVDA, JAWS ve Narrator ekran okuyucuları her iki özniteliğin bir arada bulunduğu durumlarda tutarsız anonslar yapar; kimi zaman "basılmadı, daraltıldı, düğme" derken kimi zaman durumlardan birini tamamen yutar ve kullanıcının düğmenin panel mi açtığını yoksa bir ayarı mı değiştirdiğini anlamasını engeller.
* Kontrol Edilen Panelle İlinti Eksikliği (`aria-controls` Yokluğu):
  * Butonda `aria-expanded` kullanıldığı halde hangi panelin açılıp kapandığını belirten `aria-controls="sidebar-box"` özniteliği bulunmamaktadır.

### Mimari Çözümler
* Anlamsal Durum Modelinin Standartlaştırılması:
  * Bu buton bir paneli (drawer/sidebar) kontrol ettiği için `aria-pressed` kaldırılmalı; yalnızca `aria-expanded` korunmalıdır.
* `aria-controls` ile Panel İlişkilendirmesi:
  * Butona `aria-controls="sidebar-box"` (veya ilgili kenar çubuğu id'si) eklenmeli, ekran okuyucu kullanıcısının butona bastığında hangi bölgenin açıldığını doğrudan tanıması sağlanmalıdır.

---

## 147. Özel Kısayol Tuşları Deney Sayfasında (`experiment/csk/csk/page.tsx`) Yüzde Yüz Sabit Kodlanmış Japonca Başlıklar, İpuçları ve 80+ Kısayol Girdi Kutusunda `id`, `<label>` veya `aria-labelledby` Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/experiment/csk/csk/page.tsx`

### Tespit Edilen Sorunlar
* Sabit Kodlanmış Japonca Arayüz Metinleri (WCAG 3.1.2 Language of Parts):
  * Deneyler altındaki özel kısayol tuşları yapılandırma sayfasında başlıklar, açıklamalar ve etiketler i18n altyapısına bağlanmamış; doğrudan Japonca sabit metinlerle yazılmıştır:
    - `"カスタムショートカットキー"` (Özel Kısayol Tuşları)
    - `"ショートカットキーを無効化する"` (Kısayol Tuşlarını Devre Dışı Bırak)
    - `"キーの組み合わせを入力してください"` (Tuş Kombinasyonunu Girin)
  * Türkçe veya İngilizce kullanan bir ekran okuyucu bu Japonca metinleri kendi dil sentezleyicisiyle okumaya çalışarak anlamsız sesler çıkarır.
* 80'den Fazla Kısayol Girdi Kutusunun İsimsiz Olması (WCAG 4.1.2 Name, Role, Value & WCAG 1.3.1 Info and Relationships):
  * Sayfada tarayıcının tüm fonksiyonları için 80'den fazla girdi kutusu (`<input readonly placeholder="Type a shortcut" />`) yer almaktadır.
  * Bu girdi kutularının hiçbirinde `id`, `<label htmlFor>`, `aria-label` veya `aria-labelledby` özniteliği yoktur!
  * Ekran okuyucu kullanıcısı Tab tuşu ile sayfada ilerlediğinde aralıksız 80 kez yalnızca şunu duyar:
    "Type a shortcut, salt okunur, metin kutusu", "Type a shortcut, salt okunur, metin kutusu"...
  * Kullanıcının hangi kutunun "Yeni Sekme", hangi kutunun "Geçmişi Temizle", hangi kutunun "Tam Ekran" olduğunu anlaması imkansızdır.

### Mimari Çözümler
* Tam i18n Entegrasyonu:
  * Tüm Japonca metinler `csk.json` dil dosyalarına taşınmalı ve `i18next` üzerinden yerelleştirilmelidir.
* Her Girdi Kutusuna Birebir `aria-labelledby` Bağlantısı:
  * Her bir işlem satırındaki fonksiyon başlığına benzersiz bir id (örneğin `id="csk-action-newtab"`) verilmeli ve girdi kutusu `aria-labelledby="csk-action-newtab"` ile etiketlenmelidir. Ekran okuyucu kutuya odaklandığında doğrudan "Yeni Sekme: Kısayol girin, metin kutusu" anonsunu yapmalıdır.

---

## 148. Sekme URL Satır İçi Düzenleyicisinde (`tab-inline-edit/controller.ts`) Giriş Kutusunun `blur` Olayında Doğrudan Kapanması (IME, Büyüteç ve Ekran Okuyucu Sanal İmleç Çöküşü), Erişim Tuşu Yokluğu ve Gereksiz `role="textbox"`

İlgili Dosyalar:
* `browser-features/chrome/common/tab-inline-edit/controller.ts`

### Tespit Edilen Sorunlar
* `blur` Tetikleyicisinde Veri Kaybı ve Zamansız Kapanma (WCAG 2.1.1 Keyboard & WCAG 3.2.1 On Focus):
  * `controller.ts` dosyasında satır 547-551'de şu mantık yer alır:
    ```ts
    const onBlur = () => {
      if (!state.submitting) {
        this.navigationEpoch++;
        this.closeEditor(true);
      }
    };
    ```
  * Ekran okuyucu kullanıcıları (NVDA Sanal İmleç, JAWS Virtual PC Cursor, Narrator Scan Mode) girdi kutusunun etrafındaki içeriği okumak için ok tuşlarına bastığında veya ekran okuyucu kısayolu çalıştırdığında odak anlık olarak pencereye veya sanal katmana kayar ve `blur` tetiklenir.
  * Japonca/Çince IME (Input Method Editor) aday penceresi açıldığında veya ekran büyüteci pencere odağını değiştirdiğinde de `blur` tetiklenir.
  * Sonuç olarak düzenleyici kullanıcının yazmakta olduğu URL'yi anında silerek pencereyi kapatır ve odağı başa döndürür! Kullanıcı metin yazmayı tamamlayamaz.
* Sekme İçerik Menüsünde Erişim Tuşu (Accesskey) Bulunmaması:
  * Satır 436-440'ta eklenen menü elemanına (`menuitem`) hiçbir `accesskey` atanmamıştır. Klavye kullanıcısı sekme içerik menüsünü açtığında harf kısayoluyla bu özelliğe erişemez.
* Gereksiz ve Hatalı `role="textbox"` Kullanımı:
  * Satır 486-495'te standart HTML `<input type="text">` elemanına açıkça `setAttribute("role", "textbox")` verilmektedir. Standart HTML5 input elemanları zaten örtük olarak textbox rolüne sahiptir; WAI-ARIA kurallarına göre yerel rolleri ezen bu gereksiz tanımlama ekran okuyucuların yerel girdi işleme mantığını bozar.

### Mimari Çözümler
* Akıllı Odak Kapanma Koruması:
  * Doğrudan `blur` ile kapatmak yerine, kapanma yalnızca açıkça `Escape` tuşuna basıldığında veya fareyle düzenleyici sınırları dışına tıklandığında (`pointerdown` dış alan kontrolü) gerçekleşmelidir. Odak başka bir yardımcı teknolojiye kaysa dahi düzenleyici durumu korunmalıdır.
* Erişim Tuşu ve Standart Semantik:
  * Menü elemanına yerelleştirilmiş `accesskey` (Türkçe için `accesskey="D"` - Düzenle) eklenmeli, input üzerindeki gereksiz `role="textbox"` kaldırılmalıdır.

---

## 149. Tarayıcı Paylaşım Modunda (`browser-share-mode.tsx` ve `share-mode.css`) Seçili Olmayan Sekmelerin `.tab-content:not([selected="true"])` ile `display: none !important;` Yapılarak Erişilebilirlik Ağacından Silinmesi, Sabit İngilizce Metinler ve 1.37:1 Kontrast Felaketi

İlgili Dosyalar:
* `browser-features/chrome/common/browser-share-mode/browser-share-mode.tsx`
* `browser-features/chrome/common/browser-share-mode/share-mode.css`

### Tespit Edilen Sorunlar
* Seçili Olmayan Sekmelerin Erişilebilirlik Ağacından Toptan Silinmesi (WCAG 4.1.2 Name, Role, Value & WCAG 2.1.1 Keyboard):
  * `share-mode.css` satır 17-20'de şu kural uygulanmaktadır:
    ```css
    .tab-content:not([selected="true"]),
    .tab-background:not([selected="true"]) {
      display: none !important;
    }
    ```
  * Firefox Gecko'da her sekmenin başlığı, simgesi ve etkileşimli nesneleri `.tab-content` içinde yer alır.
  * Bu kural işletildiğinde, o anda aktif olmayan tüm sekmelerin içerikleri `display: none` yapılarak erişilebilirlik ağacından tamamen yok edilir!
  * Klavye kullanıcısı `Ctrl+Tab` veya `ArrowLeft`/`ArrowRight` ile sekmeler arasında gezinmek istediğinde, pasif sekmelerin tümü 0 piksellik boş hayalet düğümlere dönüşür; ekran okuyucu hiçbir sekme başlığı okuyamaz ("boş, sekme").
* Sabit Kodlanmış İngilizce Menü Elemanı ve Erişim Tuşu:
  * `browser-share-mode.tsx` dosyasında `label="Toggle Share Mode"` ve `accesskey="S"` sabit İngilizce olarak yazılmıştır; hiçbir dil dosyasına bağlanmamıştır.
* 1.37:1 Kritik Kontrast İhlali (WCAG 1.4.3 Contrast Minimum):
  * `share-mode.css` satır 31-38'de `#fxa-toolbar-menu-button` üzerine şu stil verilir:
    ```css
    color: lightgreen !important;
    border: solid 2px green;
    ```
  * Açık renk temada (arka plan beyaz `#ffffff`), `lightgreen` (`#90EE90`) renginin metin kontrastı yalnızca **1.37:1**'dir! Bu oran okunabilirlik eşiğinin (4.5:1) fersah fersah altındadır ve metin neredeyse tamamen görünmezdir.
* Buton İsmine CSS ile Metin Enjeksiyonu (`&:before { content: "Share Mode"; }`):
  * Satır 40-46'da CSS `:before` sözde elemanıyla butona sabit "Share Mode" metni enjekte edilir. Bu durum Firefox Hesap butonunun yerel ekran okuyucu etiketini bozar ve çok dilli desteği felç eder.

### Mimari Çözümler
* Sekme İçeriğini Erişilebilirlik Ağacından Silmeden Gizleme / Maskeleme:
  * Gizlilik amacıyla paylaşım modunda sekme başlıkları gizlenecekse, `display: none` yerine bulanıklaştırma (`filter: blur(8px)`) veya metin maskelemesi (`text-security` / sembolik yer tutucu) kullanılmalı; ancak erişilebilirlik ağacında sekme yapısı korunmalıdır.
* Yerelleştirilmiş Menü ve WCAG Uyumlu Kontrast:
  * Menü metni `i18next` üzerinden çevrilmeli; buton rengi için tema zeminine göre en az 4.5:1 kontrast sağlayan sistem vurgu rengi (`var(--toolbar-color)`) kullanılmalıdır.
* CSS `:before` Metin Enjeksiyonunun Kaldırılması:
  * Araç çubuğu butonuna metin CSS ile değil, DOM üzerinde yerelleştirilmiş `label` ve `aria-label` ile verilmelidir.

---

## 150. Tasarım Çekirdek CSS'inde (`designs/browser.css`) `#tabbrowser-tabbox & *` Üzerindeki Tüm Odak Çerçevelerinin Kaldırılması (`outline: none !important;`), İndirgenmiş Hareket Koruması Olmayan Sonsuz Sekme Titremesi (`floorp-automated-pulse`) ve Gizli Gezinti İndikatörünün Kontrast Çöküşü (1.45:1)

İlgili Dosyalar:
* `browser-features/chrome/common/designs/browser.css`

### Tespit Edilen Sorunlar
* Sekme Kutusundaki Tüm Elemanların Odak Çerçevelerinin Küresel Olarak Silinmesi (WCAG 2.4.7 Focus Visible - Level A):
  * `browser.css` satır 261-267'de şu dehşet verici kural yer alır:
    ```css
    #tabbrowser-tabbox {
      outline: none !important;

      & * {
        outline: none !important;
      }
    }
    ```
  * `#tabbrowser-tabbox`, Firefox'ta hem sekme panellerini (`#tabbrowser-tabpanels`) hem de içerik alanlarını barındıran üst konteynerdir.
  * Bu konteynerin altındaki tüm çocuklara (`& *`) `outline: none !important;` basılması, klavye ile gezinirken sekme kutusu içindeki odak çerçevelerinin yok olmasına yol açar. Klavye kullanıcısı odağın nerede olduğunu hiçbir şekilde göremez.
* Sonsuz Titreme ve Parlama Animasyonlarında `prefers-reduced-motion` Yokluğu (WCAG 2.2.2 Pause, Stop, Hide & WCAG 2.3.3 Animation from Interactions):
  * Satır 156-247 arasında Floorp OS otomatik sekme göstergesi (`[data-floorp-os-automated="true"]`) için tanımlanan `floorp-automated-pulse 2s infinite` ve `floorp-automated-glow 3s infinite` animasyonları ekranda sürekli titreşir ve büyüyüp küçülür.
  * Bu animasyonlar için `@media (prefers-reduced-motion: reduce)` sorgusu tanımlanmamıştır! Vestibüler bozukluğu, dikkat dağınıklığı veya epilepsi hassasiyeti olan kullanıcılar için bu sürekli hareket mide bulantısı ve baş dönmesine neden olur.
* Gizli Gezinti İndikatöründe 1.45:1 Kontrast Çöküşü (WCAG 1.4.3 Contrast Minimum):
  * Satır 53-59'da `:root[privatebrowsingmode] #fxa-toolbar-menu-button` üzerine çok renkli degrade arka plan (`linear-gradient(90deg, #9059ff 0%, #ff4aa2 52.08%, #ffbd4f 100%)`) verilir ve yazı rengi `color: var(--toolbar-background-color) !important;` yapılır.
  * Açık temada yazı rengi beyazdır (`#ffffff`); degrade sonundaki parlak sarı/turuncu (`#ffbd4f`) üzerinde beyaz yazının kontrastı yalnızca **1.45:1**'dir. Yazı tamamen silinir.
* Firefox Yerel Gizli Gezinti Göstergesinin Sessizce Yok Edilmesi:
  * Satır 119-120'de `#private-browsing-indicator-with-label { display: none !important; }` yapılarak ekran okuyucunun gizli pencereye girildiğini duyurmasını sağlayan yerel ve yerelleştirilmiş gösterge yok edilmiştir.

### Mimari Çözümler
* Küresel `outline: none` Kuralının Derhal Kaldırılması:
  * `#tabbrowser-tabbox & *` kuralı derhal silinmeli; görünür ve belirgin erişilebilir odak halkası (`outline: 2px solid var(--focus-outline-color)`) muhafaza edilmelidir.
* İndirgenmiş Hareket Koruması:
  * `@media (prefers-reduced-motion: reduce)` bloğu eklenmeli, otomatik sekme göstergesinde animasyonlar `animation: none !important;` yapılarak statik bir çerçeveye dönüştürülmelidir.
* Erişilebilir Gizli Gezinti Rozeti:
  * Degrade arka plan üzerine zıt kontrastlı metin rengi verilmeli veya yerel `#private-browsing-indicator-with-label` gizlenmek yerine korunmalıdır.

---

## 151. Durum Çubuğunda (`statusbar/statusbar.tsx` ve `context-menu.tsx`) Durum Metninde (`#status-text`) `role="status"` ve `aria-live="polite"` Eksikliği, Sabit İngilizce "Status bar" ve Menü Elemanında Olmayan Erişim Tuşu

İlgili Dosyalar:
* `browser-features/chrome/common/statusbar/statusbar.tsx`
* `browser-features/chrome/common/statusbar/context-menu.tsx`

### Tespit Edilen Sorunlar
* Durum Mesajlarının Ekran Okuyucu Tarafından Duyurulamaması (WCAG 4.1.3 Status Messages - Level AA):
  * `statusbar.tsx` dosyasında durum metni şu şekilde tanımlanmıştır:
    `<xul:hbox id="status-text" align="center" flex="1" class="status-text" />`
  * Tarayıcılarda durum çubuğu, kullanıcının fareyle veya klavyeyle üzerine geldiği bağlantı adreslerini (URL önizleme), TLS şifreleme durumunu ve sayfa yükleme ilerlemesini gösterir.
  * Bu kutuda `role="status"` ve `aria-live="polite"` öznitelikleri bulunmadığından, görme engelli bir ekran okuyucu kullanıcısı bir bağlantının üzerine geldiğinde bağlantının nereye gideceğini (URL hedefini) durum çubuğundan asla öğrenemez.
* Sabit Kodlanmış İngilizce Araç Çubuğu Adı:
  * `<xul:toolbar id="nora-statusbar" toolbarname="Status bar" ... accesskey="A">`
  * `toolbarname="Status bar"` sabit İngilizcedir; Türkçe kullanan ekranda ekran okuyucu çubuğu "Status bar, araç çubuğu" olarak seslendirir.
* Sabit ve Çakışan Erişim Tuşu:
  * `accesskey="A"` sabit harftir. Türkçe klavye düzeninde ve Firefox yerel menülerinde "A" harfi Arama veya Dosya menüsüyle çakışır.
* Menü Elemanında Etikette Gösterilen Erişim Tuşunun Kodda Olmaması:
  * `context-menu.tsx` satır 17'de etiket güncellenirken `setLabel(i18next.t(TRANSLATION_KEY, { mark: "(S)" }))` çağrılır ve görsel olarak "(S)" harfi yazılır.
  * Ancak `<xul:menuitem>` elemanına `accesskey="S"` özniteliği konulmamıştır! Klavye kullanıcısı 'S' harfine bastığında menü elemanı tetiklenmez.

### Mimari Çözümler
* Canlı Durum Bölgesi Tanımı:
  * `#status-text` elemanına `role="status"` ve `aria-live="polite"` öznitelikleri verilmeli; bağlantı hedefleri ve yükleme durumları ekran okuyucuya kibarca anons edilmelidir.
* Yerelleştirilmiş `toolbarname` ve `accesskey`:
  * Çubuk adı `toolbarname={i18next.t("statusbar.name", { defaultValue: "Durum Çubuğu" })}` yapılmalı; menü elemanına da eşleşen `accesskey` özniteliği eklenmelidir.

---

## 152. Çalışma Alanları Kenar Paneli ve Açılır Menüsünde (`workspaces-panels.tsx` ve `popup-element.tsx`) Çalışma Alanı Seçiminde `role="button"` ve `data-checked` Kullanılarak Seçili Durumun Ekran Okuyucudan Gizlenmesi, Klavye ile Sıralama Paritesi Yokluğu ve Arşiv Geri Yükleme Butonlarında Erişilemeyen XUL Elemanları

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/workspaces-panels.tsx`
* `browser-features/chrome/common/workspaces/toolbar/popup-element.tsx`

### Tespit Edilen Sorunlar
* Seçili Çalışma Alanının Ekran Okuyucu Tarafından Bilinememesi (WCAG 4.1.2 Name, Role, Value):
  * `workspaces-panels.tsx` satır 146-155'te çalışma alanı butonu şöyle tanımlanır:
    ```tsx
    <div
      role="button"
      tabIndex={0}
      data-checked={isSelected() ? "true" : undefined}
      aria-label={workspaceName()}
      draggable="true"
    ```
  * `data-checked` bir HTML veri özniteliğidir; ekran okuyucular tarafından okunmaz!
  * Butona `aria-pressed={isSelected()}` verilmemiştir (veya `role="tab"` ile `aria-selected`).
  * Görme engelli kullanıcı 5 çalışma alanı arasında dolaşırken her birini yalnızca "İş, düğme", "Kişisel, düğme" olarak duyar; şu anda hangi çalışma alanında aktif olduğunu anlamasının hiçbir yolu yoktur.
* Klavye ile Çalışma Alanı Yeniden Sıralama Yokluğu (WCAG 2.5.7 Dragging Movements):
  * Çalışma alanları `draggable="true"` ile yalnızca fareyle sürüklenerek yeniden sıralanabilir. Klavye ile çalışma alanını yukarı/aşağı taşımayı sağlayan hiçbir mekanizma veya kısayol yoktur.
* Arşiv Geri Yükleme Elemanlarının Klavye ile Erişilemez Olması (WCAG 2.1.1 Keyboard & 4.1.2 Name, Role, Value):
  * `popup-element.tsx` satır 241-270'te arşivlenmiş çalışma alanını geri yükleme düğmesi şöyle kurulmuştur:
    `<xul:hbox class="workspaceRestoreItemButton" onClick={() => handleRestore(item.archiveId)}>`
  * Bu eleman bir `<xul:hbox>`'tur; `tabindex="0"` yoktur, `role="button"` yoktur, klavye olay dinleyicisi (`onKeyDown` veya `onCommand`) yoktur!
  * Klavye kullanıcısı Tab ile arşiv listesindeki öğelere odaklanamaz ve geri yükleme yapamaz.
* İsimsiz Silme Butonları ve Sessiz Durum Değişiklikleri:
  * Satır 271-278'deki silme butonunda (`workspaceRestoreDeleteButton`) yalnızca `title` vardır; `aria-label` veya `label` yoktur.
  * Hata mesajları (`restoreError`) ve yükleme durumları (`restoreLoading`) düz `<xul:label>` olarak basılır; `role="status"` veya `role="alert"` olmadığı için ekran okuyucu sessiz kalır.

### Mimari Çözümler
* Erişilebilir Durum Gösterimi:
  * Çalışma alanı butonuna `aria-pressed={isSelected()}` veya sekme şeridi semantiğinde `role="tab"` ve `aria-selected={isSelected()}` verilmelidir.
* Klavye ile Yeniden Sıralama Kısayolu:
  * Çalışma alanları üzerinde `Ctrl+Up` ve `Ctrl+Down` tuşlarıyla veya içerik menüsünden "Yukarı Taşı / Aşağı Taşı" seçenekleriyle klavyeli sıralama paritesi sağlanmalıdır.
* Etkileşimli XUL Elemanlarının Düzeltilmesi:
  * `<xul:hbox onClick>` yerine erişilebilir `<xul:toolbarbutton role="button" tabindex="0">` kullanılmalı, `onCommand` veya klavye tetikleyicisi bağlanmalı ve silme butonlarına `aria-label={texts().restoreDeleteTooltip}` verilmelidir. Durum mesajlarına `role="status"` eklenmelidir.

---

## 153. Sekme Uyku Hariç Tutma Ayarlarında (`TabSleepExclusion.tsx`) Çoklu Silme Butonlarının Aynı Genel Etikete (`aria-label="Kaldır"`) Sahip Olması, `pointer-events-none` ile Klavye Odağının Kapatılamaması ve Canlı Duyuru Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/design/components/TabSleepExclusion.tsx`

### Tespit Edilen Sorunlar
* Ayırt Edilemeyen Silme Butonları (WCAG 2.4.6 Headings and Labels & WCAG 4.1.2 Name, Role, Value):
  * Hariç tutulan alan adları listesinde (satır 222-229), her bir kuralın yanındaki silme butonuna şu etiket verilmiştir:
    `aria-label={t("design.tabSleepExclusion.remove")}`
  * Listede 10 kural varsa, ekran okuyucu buton listesini açan kullanıcı art arda 10 kez yalnızca "Kaldır, düğme" anonsu duyar. Hangi alan adını sileceğini bilmek imkansızdır.
* `pointer-events-none` ile Klavye Odağının Engellenememesi (WCAG 2.1.1 Keyboard & WCAG 3.2.1 On Focus):
  * Özellik devre dışı bırakıldığında (satır 134-136), alt bölüm `className="opacity-50 pointer-events-none"` ile görsel olarak soluklaştırılır.
  * Ancak `pointer-events-none` yalnızca fare tıklamalarını engeller; klavye kullanıcısı Tab tuşuna bastığında pasif olan girdi kutusuna (`<Input>`), "Ekle" butonuna (`<Button>`) ve `<details>` elemanına odaklanmaya devam eder. Bu elemanlar gerçekte `disabled` yapılmadığı için kafa karışıklığı yaratır.
* Kural Ekleme/Çıkarma Sonrası Ekran Okuyucu Geri Bildirimi Yokluğu:
  * Yeni bir kural eklendiğinde veya silindiğinde listeye bir `aria-live="polite"` bölgesi eşlik etmez; kullanıcı işlemin başarılı olduğunu teyit edemez.

### Mimari Çözümler
* Parametrik Erişilebilir Etiket:
  * Silme butonunun etiketi `aria-label={t("design.tabSleepExclusion.removePattern", { pattern })}` (örneğin "github.com kuralını kaldır") olarak dinamikleştirilmelidir.
* Gerçek Klavye Devre Dışı Bırakma:
  * Özellik kapalıyken içindeki tüm form kontrollerine `disabled={!settings.enabled}` ve `tabIndex={settings.enabled ? 0 : -1}` uygulanmalıdır.
* Canlı Durum Duyurusu:
  * Kural eklendiğinde veya silindiğinde "Kural başarıyla eklendi / silindi" anonsu yapan `aria-live="polite"` canlı bölgesi eklenmelidir.

---

## 154. Kenar Çubuğu Konum Değişiminde CSS Flex Order Kullanımı (`flex-order.tsx`) ile DOM Sırası ve Klavye Sekme Gezinme Sırası Arasında Ayrışma (Focus Order Disconnect)

İlgili Dosyalar:
* `browser-features/chrome/common/flex-order/flex-order.tsx`

### Tespit Edilen Sorunlar
* Görsel Sıra ile Klavye Sırası Arasında Derin Uyuşmazlık (WCAG 2.4.3 Focus Order - Level A):
  * `gFlexOrder.applyFlexOrder` fonksiyonunda (satır 44-61), Floorp kenar çubuğunun konumu değiştirildiğinde elemanların DOM içindeki sırası değiştirilmez; bunun yerine CSS `order` öznitelikleri değiştirilir:
    - Sağda konumlandığında: Splitter: 1000, Panel: 1001, SelectBox: 1002.
    - Solda konumlandığında: SelectBox: -3, Panel: -2, Splitter: -1.
  * CSS `order` kuralı elemanları görsel olarak en sağa veya en sola taşır, fakat DOM sırasına dokunmaz.
  * Klavye kullanıcısı ve ekran okuyucu sanal imleci DOM sırasını takip eder. Kenar çubuğu görsel olarak pencerenin en sağındayken (web içeriğinden sonra), klavye odağı DOM hiyerarşisine bağlı olarak web içeriğinden önce veya beklenmedik bir sırada kenar çubuğuna sıçrar.
* Yeniden Boyutlandırma Ayırıcısının Mantıksız Klavye Sırası:
  * Sağ konumda Splitter (`1000`) görsel ve yapısal olarak Panel (`1001`) ve Buton Barı (`1002`) önüne geçer; klavye kullanıcısı kenar çubuğu butonlarına ulaşmadan önce boyutlandırma ayırıcısından geçmek zorunda kalır.

### Mimari Çözümler
* DOM Hiyerarşisi ile Senkronize Konumlandırma:
  * Yalnızca CSS `order` ile görsel yanılsama yaratmak yerine, kenar çubuğu konumu değiştiğinde DOM elemanları (`#panel-sidebar-box`, `#panel-sidebar-select-box`) `#browser` hiyerarşisinde gerçek görsel konumlarına uygun olarak yerleştirilmeli veya Gecko'nun CSS `reading-flow: flex-visual` / erişilebilir sıra yönergeleriyle senkronize edilmelidir.
* Mantıksal Odak Dolaşımı:
  * Klavye dolaşım sırasının her iki konumda da mantıksal olarak "Buton Çubuğu -> Panel İçeriği -> Ayırıcı" zincirini izlemesi güvence altına alınmalıdır.
---

## 155. Notlar Düzenleyicisinde Resim Boyutlandırmada (`ResizableImage.tsx`) 12x12px Mikroskobik Hedef Boyutu (WCAG 2.5.8 İhlali), Fareye Bağımlı Boyutlandırma (Klavye Paritesi Yokluğu) ve Boş `alt` Özniteliği

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/ResizableImage.tsx`

### Tespit Edilen Sorunlar
* Mikroskobik Tutamaç ve Hedef Boyutu İhlali (WCAG 2.5.8 Target Size Minimum - Level AA & WCAG 2.5.5 - Level AAA):
  * `ResizableImage.tsx` satır 53-58'de resim seçildiğinde sağ altta boyutlandırma tutamacı gösterilir:
    `<div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize shadow" onMouseDown={handleResize} />`
  * `w-3 h-3` boyutu tam olarak **12x12 pikseldir**!
  * WCAG 2.5.8 standardı minimum 24x24 piksel, WCAG 2.5.5 ise 44x44 piksel hedef boyutu şart koşar. 12x12 piksel boyutundaki bu tutamaç, motor engeli, el titremesi olan veya dokunmatik ekran kullanan kullanıcılar için tıklanması imkansız bir hedeftir.
* Klavye ile Boyutlandırma Alternatifinin Bulunmaması (WCAG 2.1.1 Keyboard & WCAG 2.5.7 Dragging Movements):
  * Tutamaç yalnızca `onMouseDown` olayını dinler. Elemana `tabIndex={0}`, `role="separator"` veya `role="slider"` atanmamıştır.
  * Klavyeyle ok tuşları (`ArrowLeft`/`ArrowRight` veya `+`/`-`) kullanılarak resmi küçültüp büyütmeyi sağlayan hiçbir klavye mekanizması yoktur. Klavye kullanıcıları notlarındaki resimleri yeniden boyutlandıramaz.
* Boş `alt` Özniteliği ile İçerik Resimlerinin Gizlenmesi (WCAG 1.1.1 Non-text Content):
  * Satır 48'de `alt={node.attrs.alt || ""}` kodu yer alır. Düzenleyicide kullanıcı resim eklediğinde alternatif metin girebileceği bir arayüz sunulmadığı için `alt` sürekli boş kalır.
  * Ekran okuyucu boş `alt=""` gördüğünde resmi salt dekoratif (`role="presentation"`) kabul ederek tamamen atlar. Görme engelli kullanıcı notta önemli bir ekran görüntüsü veya diyagram olduğunu bile fark edemez.

### Mimari Çözümler
* Erişilebilir Tutamaç Boyutu ve Görünür Dokunma Alanı:
  * Tutamacın görsel boyutu korunsa dahi dokunma/tıklama alanı görünmez dolguyla (`p-2` veya `::before` pseudo-elementiyle) en az 24x24px (tavsiye edilen 32x32px) boyutuna çıkarılmalıdır.
* Klavye Boyutlandırma ve Slider/Separator Semantiği:
  * Tutamaca `role="separator"` veya `role="slider"`, `tabIndex={0}`, `aria-label="Resim boyutunu ayarla"`, `aria-valuenow={currentWidth}`, `aria-valuemin={40}` ve `aria-valuemax={1200}` verilmeli; `ArrowLeft`/`ArrowRight` tuşlarıyla 10'ar piksellik adımlarla klavyeden boyutlandırılabilmelidir.
* Resim Alternatif Metin (Alt Text) Düzenleme Arayüzü:
  * Resim seçildiğinde veya içerik menüsünde "Görsel Açıklaması Ekle (Alt Metin)" modalı sunulmalıdır.

---

## 156. Yeni Sekme Sayfası Sık Ziyaret Edilen Sitelerde (`TopSiteTile.tsx`) Fareye Bağımlı İçerik Menüsü (`onContextMenu`), Çift Anonslanan Başlık ve Sabitlenmiş Durumun Duyurulamaması

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/TopSites/TopSiteTile.tsx`

### Tespit Edilen Sorunlar
* Klavye ile İçerik Menüsüne Erişilememesi (WCAG 2.1.1 Keyboard):
  * `TopSiteTile.tsx` satır 41'de içerik menüsü tetikleyicisi yalnızca fare olayına bağlanmıştır:
    `onContextMenu={(e) => onContextMenu(e, site)}`
  * Klavye kullanıcısı bağlantı üzerine odaklandığında klavye menü tuşuna (`ContextMenu` tuşu veya `Shift+F10`) bastığında bu olay yakalanmaz.
  * Sonuç olarak klavye kullanıcıları bir siteyi sabitleyemez, kaldıramaz veya adresini düzenleyemez.
* Gereksiz ve Tekrarlı Ekran Okuyucu Anonsu (WCAG 1.1.1 Non-text Content & WCAG 4.1.2):
  * Bağlantı (`<a>`) içerisinde hem `<img alt={site.title} />` (satır 57) hem de `<span>{truncateTopSiteTitle(site.title)}</span>` (satır 82) yer almaktadır.
  * Aynı bağlantı içinde hem resim hem metin aynı ismi taşıdığında, ekran okuyucular başlığı iki kez okur ("Google, grafik Google, bağlantı"). Resim simgesi dekoratif kabul edilerek `alt=""` yapılmalıdır.
* Sabitlenmiş (Pinned) Durumun Ekran Okuyucudan Gizlenmesi:
  * Satır 72'de sabitlenen siteler için görsel bir raptiye simgesi (`<PinIcon className="w-3 h-3" />`) gösterilir.
  * Bu simgeye hiçbir `aria-label="Sabitlenmiş"` veya metin eşlik etmez. Görme engelli kullanıcı sitenin organik bir geçmiş önerisi mi yoksa sabitlenmiş bir kısayol mu olduğunu anlayamaz.
* Duvar Kağıdı Üzerinde Kontrast Yetersizliği (WCAG 1.4.3 Contrast Minimum):
  * Site başlığı `text-gray-200` rengindedir. Kullanıcı açık renkli veya beyaz tonlarında özel bir duvar kağıdı ayarladığında, şeffaf arka plan üzerindeki açık gri metin tamamen okunmaz hale gelir (kontrast oranı 1.2:1 seviyesine düşer).

### Mimari Çözümler
* Klavye İçerik Menüsü Dinleyicisi:
  * `onKeyDown` dinleyicisi eklenmeli; `e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")` algılandığında içerik menüsü klavye koordinatlarında açılmalıdır.
* Erişilebilir Bağlantı İçeriği:
  * Favicon görseli `alt=""` yapılmalı; sabitlenmiş simgesi `<span className="sr-only">({t("topSites.pinned")})</span>` ile ekran okuyucuya tanıtılmalıdır.
* Arka Plan Koruma Katmanı (Adaptive Scrim):
  * Metin altına veya kart zeminine hafif yarı saydam koyu bir tabaka (`bg-black/40 backdrop-blur-xs`) konularak açık temalı duvar kağıtlarında bile 4.5:1 kontrast garanti edilmelidir.

---

## 157. Yeni Sekme Arama Çubuğunda (`SearchBar/index.tsx`) Sahte Metin Girişi ile Klavye Tuzağı Kurulması, `readOnly` Girişin Fareye Mahkum Edilmesi ve Odak Çerçevesinin Yok Edilmesi (`outline-none`)

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/SearchBar/index.tsx`

### Tespit Edilen Sorunlar
* Sahte Metin Kutusu ve Klavye Kırılması (WCAG 2.1.1 Keyboard & WCAG 4.1.2 Name, Role, Value):
  * `SearchBar/index.tsx` bileşeninde arama çubuğu gerçek bir arama formu değildir; yerel adres çubuğuna (`urlbar`) odak fırlatan sahte bir arayüz kuklasıdır:
    ```tsx
    <div className="group ..." onClick={handleClick}>
      <input type="text" placeholder={...} readOnly className="... outline-none cursor-pointer" />
    </div>
    ```
  * `onClick={handleClick}` tetikleyicisi dıştaki `<div>` üzerine konulmuştur. İçteki `<input>` ise `readOnly` yapılmıştır ve hiçbir `onFocus` ya da `onKeyDown` dinleyicisine sahip değildir!
  * Klavye kullanıcısı Tab tuşu ile arama çubuğuna girdiğinde `<input>` elemanına odaklanır. Yazmaya başladığında veya Enter'a bastığında girdi `readOnly` olduğu için hiçbir şey yazılmaz ve `handleClick` tetiklenmez. Klavye kullanıcısı ne olduğunu anlayamaz ve aramaya geçemez.
* Odak Çerçevesinin Kasıtlı Olarak Silinmesi (WCAG 2.4.7 Focus Visible):
  * `className="... outline-none ..."` kuralıyla klavye odağının görsel halkası tamamen yok edilmiştir. Tab ile kutuya gelindiğinde nerede olunduğunu gösteren hiçbir işaret yoktur.
* Etiket ve Yardımcı Teknoloji Uyuşmazlığı:
  * Kutuda `<label>` veya `aria-label` yoktur. Ekran okuyucu bunu "salt okunur metin kutusu" olarak tanıtır; oysa eleman bir butondur.

### Mimari Çözümler
* Doğrudan Odak Yönlendirmesi:
  * `<input onFocus={() => globalThis.NRFocusUrlBar?.()}>` şeklinde `onFocus` olayı dinlenmeli; klavye kullanıcısı kutuya Tab ile bastığı anda odak pürüzsüzce yerel URL çubuğuna aktarılmalıdır.
* Belirgin Odak Halkası (`focus-visible:ring-2`):
  * `outline-none` yerine klavye odağında net görünen kontrastlı bir odak çerçevesi verilmelidir.
* Anlamsal Buton veya Erişilebilir Etiket:
  * Arama girişine `aria-label={t("searchBar.searchOrEnterUrl")}` verilmeli veya yapı doğrudan bir `<button role="searchbox">` olarak tasarlanmalıdır.

---

## 158. Profil Yöneticisi Sayfasında (`pages-profile-manager/src/App.tsx`) Bütün Kartlarda Aynı Genel "Aç" Butonunun Kullanılması, Sessiz Durum Değişiklikleri ve Rastgele Zamanlayıcılar

İlgili Dosyalar:
* `browser-features/pages-profile-manager/src/App.tsx`

### Tespit Edilen Sorunlar
* İsimsiz ve Birbirinin Kopyası Butonlar (WCAG 2.4.6 Headings and Labels & WCAG 4.1.2 Name, Role, Value):
  * `App.tsx` satır 113-121'de listelenen her bir profil için şu buton üretilir:
    ```tsx
    <button type="button" className="btn btn-sm btn-primary w-full" onClick={() => handleOpenProfile(p.name)}>
      <ShareIcon size={16} />
      {t("profileManager.actions.open")}
    </button>
    ```
  * Sistemde 5 profil varsa ekran okuyucu buton listesini gezen kullanıcı art arda 5 kez yalnızca şunu duyar:
    "Aç, düğme", "Aç, düğme", "Aç, düğme"...
  * Kullanıcı hangi butonun hangi profili açacağını bilemez.
* Canlı Durum Bildirimi Eksikliği (WCAG 4.1.3 Status Messages):
  * Satır 87-94'teki `loading` ve `noProfiles` durumları standart `<div>` içinde gösterilir; `role="status"` ve `aria-live="polite"` tanımlanmamıştır. "Yenile" butonuna tıklandığında ekran okuyucu profillerin yüklendiğine veya listenin boş olduğuna dair hiçbir ses çıkarmaz.
* Belirsiz Zamanlayıcı ile Asenkron Durum Tahmini:
  * Satır 51-55'te yeni profil sihirbazı açıldığında `setTimeout(loadAll, 800)` ile 800 milisaniye sonra listenin güncellendiği varsayılır. Bu rastgele gecikme yardımcı teknolojilere hiçbir işlem sonucu bildirmez.

### Mimari Çözümler
* Profil Adını İçeren Erişilebilir Buton Etiketi:
  * Butona `aria-label={t("profileManager.actions.openProfileWithName", { name: p.name, defaultValue: `${p.name} profilini aç` })}` atanmalıdır.
* Canlı Durum Bölgesi (`role="status"`):
  * Yüklenme ve sonuç mesajlarına `role="status"` ve `aria-live="polite"` eklenmelidir.
* Sinyal / Olay Tabanlı Senkronizasyon:
  * Sihirbaz kapandığında `setTimeout` yerine gerçek geri çağırma (callback) dinlenmeli ve profil oluşturma sonucu canlı bölgeden anons edilmelidir.

---

## 159. Karşılama Sihirbazı Sayfalarında (`CustomizePage`, `WhatsNewPage`, `SupportPage` & `setup.module.css`) Başlık Hiyerarşisi Atlamaları, Dış Bağlantılarda Yeni Sekme Uyarısının Olmaması ve `outline: none` ile Başlık Odağının Silinmesi

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/customize/page.tsx`
* `browser-features/pages-welcome/src/app/whatsnew/page.tsx`
* `browser-features/pages-welcome/src/app/support/page.tsx`
* `browser-features/pages-welcome/src/setup.module.css`

### Tespit Edilen Sorunlar
* `<h1>` Başlığının Atlanarak Doğrudan `<h2>` ile Başlanması (WCAG 1.3.1 Info and Relationships - Level A):
  * `CustomizePage` (satır 63) ve `SupportPage` (satır 20) sayfalarında sayfa başlığı doğrudan `<h2>` olarak açılır; sayfada hiçbir `<h1>` bulunmaz.
  * Ekran okuyucu kullanıcıları sayfaya girdiklerinde "Başlık 1" arayarak ana konuyu anlar. `<h1>`'in bulunmaması belge yapısını bozar.
* Yeni Sekmede Açılan Bağlantılarda Uyarı Eksikliği (WCAG 3.2.5 Change on Request & WCAG 2.4.4 Link Purpose):
  * `WhatsNewPage` altındaki GitHub, X (Twitter), Discord, Terms, Privacy bağlantıları ve `CustomizePage` altındaki `about:hub`, `about:preferences` bağlantılarının tümü `target="_blank"` ile açılır.
  * Ancak hiçbirinde ekran okuyucuya yönelik `(yeni sekmede açılır)` uyarısı (`sr-only` veya `aria-label`) bulunmamaktadır.
* Başlık Odağının Kasıtlı Olarak Yok Edilmesi (WCAG 2.4.7 Focus Visible):
  * `setup.module.css` satır 111-113'te şu kural yer alır:
    `.explanation h1:focus { outline: none; }`
  * Sayfa içi atlama bağlantısıyla (Skip to content) veya sanal imleçle başlığa odaklanıldığında odak halkası zorla silinir.

### Mimari Çözümler
* Semantik Başlık Hiyerarşisi:
  * Her adımın sayfa başlığı `<h1>` olmalı, alt bölümler `<h2>` ve `<h3>` sırasını izlemelidir.
* Standart Dış Bağlantı Erişilebilirlik Bileşeni:
  * Tüm `target="_blank"` bağlantılarına `<span className="sr-only"> (yeni pencerede açılır)</span>` eklenmelidir.
* Başlık Odak Çerçevesinin Korunması:
  * `.explanation h1:focus` kuralındaki `outline: none` kaldırılmalı, belirgin odak göstergesi korunmalıdır.

---

## 160. PWA Pencere Modunda (`pwa-window-style.css` & `SsbWindowContainerIndicator.tsx`) URL Çubuğunun Şeffaf İmleç ve Tıklama Engelleyiciyle Gasp Edilmesi, Güvenlik/İzin Simgelerinin Yok Edilmesi ve Yüksek Kontrast Çöküşü

İlgili Dosyalar:
* `browser-features/chrome/common/pwa/pwa-window-style.css`
* `browser-features/chrome/common/pwa/SsbWindowContainerIndicator.tsx`

### Tespit Edilen Sorunlar
* Odak Zincirinde Kalan Ama Kullanılamayan Hayalet URL Çubuğu (WCAG 2.1.1 Keyboard & WCAG 3.2.1 On Focus):
  * `pwa-window-style.css` satır 49-67 arasında URL çubuğu pencere taşıma çubuğuna dönüştürülür:
    ```css
    #urlbar::after { content: ""; position: absolute; inset: 0; z-index: 1; -moz-window-dragging: drag; pointer-events: auto; }
    #urlbar-input { pointer-events: none; caret-color: transparent; }
    ```
  * Ancak `#urlbar-input` DOM'da odaklanabilir kalmaya devam eder! Klavye kullanıcısı pencerede Tab tuşuna bastığında odak `#urlbar-input` üzerine düşer.
  * Fakat imleç şeffaftır (`caret-color: transparent`), tıklamalar overlay tarafından emilir, kullanıcı hiçbir metin düzenleyemez. Ekran okuyucu "Adres çubuğu, metin kutusu" der ama kullanıcı hiçbir şey yapamaz; odak tuzağı hissi yaratır.
* Güvenlik, Sertifika ve Cihaz İzin Göstergelerinin Yok Edilmesi (WCAG 1.3.1 Info and Relationships & Güvenlik Erişilebilirliği):
  * Satır 85-89'da `#identity-box`, `#permissions-granted-icon` ve `#tracking-protection-icon-container` elemanlarına `display: none !important;` verilir.
  * PWA penceresinde kullanıcının sitenin kamera/mikrofon iznini kullandığını görmesi veya TLS güvenlik sertifikasını denetlemesi tamamen imkansız hale gelir. Görme engelli kullanıcı ekran okuyucu ile site izinlerine erişemez.
* Yüksek Kontrast Modunda Konteyner Renginin Kaybolması (WCAG 1.4.1 Use of Color & WCAG 1.4.11):
  * `SsbWindowContainerIndicator.tsx` içindeki `#ssb-container-indicator`, konteyner rengini ayırt etmek için yalnızca `border-left-color` kullanır.
  * Windows Karşıtlık Modunda (`forced-colors: active`) tüm kenarlıklar varsayılan sistem metin rengine (`CanvasText`) eşitlenir. Hangi konteynerde (İş, Banka, Kişisel) olunduğu bilgisi görsel olarak 100% kaybolur.

### Mimari Çözümler
* PWA Başlık Çubuğunun Temiz Odak Yönetimi:
  * `#urlbar-input` elemanına `tabindex="-1"` ve `aria-hidden="true"` verilmeli veya gerçek bir salt okunur etiket (`role="heading"` veya `role="status"`) olarak modellenmelidir.
* Güvenlik ve İzin İkonlarının Korunması:
  * `#permissions-granted-icon` ve `#identity-box` PWA modunda gizlenmemeli; kompakt bir güvenlik rozeti olarak korunmalıdır.
* Yüksek Kontrast Uyumlu Konteyner Göstergesi:
  * Gösterge yalnızca kenarlık rengine dayanmamalı; metin olarak konteyner adını yazmalı ve `forced-colors: active` durumunda sistem `Highlight` çerçevesiyle desteklenmelidir.

---

## 161. Solid-XUL Çekirdek Oluşturucusunda (`libs/solid-xul/index.ts`) Önceki Olay Dinleyicilerinin Temizlenmemesi (`_prev` İhmali) ile Klavye Olaylarının Sızıntısı ve Mükerrer Tetiklenmesi

İlgili Dosyalar:
* `libs/solid-xul/index.ts`

### Tespit Edilen Sorunlar
* Önceki Olay Dinleyicisinin Silinmemesi (Memory Leak & Duplicate Keyboard Handlers):
  * `libs/solid-xul/index.ts` satır 52-70'teki `setProperty` metodunda şu kod yer alır:
    ```ts
    if (isEventListener(value)) {
      const evName = name.slice(2).toLowerCase();
      node.addEventListener(evName, value as EventListener);
    }
    ```
  * Fonksiyon parametrelerinde `_prev` (önceki değer) alınmasına rağmen tamamen göz ardı edilmektedir!
  * Reaktif bir sinyal (signal) değiştiğinde veya bileşen yeniden render edildiğinde, yeni olay dinleyicisi `node.addEventListener` ile eklenirken **eski dinleyici asla kaldırılmaz (`removeEventListener` çağrılmaz)**!
  * Özellikle klavye dinleyicilerinde (`onKeyDown`, `onCommand`), odak ve seçim değiştikçe eski kapanışlar (closures) birikir. Kullanıcı Enter veya Space tuşuna bir kez bastığında, eski durumları hedefleyen 5-10 farklı olay dinleyicisi art arda tetiklenir; pencereler mükerrer açılır, sekmeler yanlış kapanır ve erişilebilirlik odak durumu çöker.

### Mimari Çözümler
* `_prev` Dinleyicisinin Kusursuz Temizlenmesi:
  * `setProperty` içine `if (_prev && isEventListener(_prev)) { node.removeEventListener(evName, _prev as EventListener); }` mantığı eklenmeli; reaktif güncellemelerde asla eski dinleyici bırakılmamalıdır.
* `null` veya `undefined` Durumunda Olayın Kaldırılması:
  * Değer `null` olduğunda yalnızca `removeAttribute` yapılmamalı; önceki dinleyici de `removeEventListener` ile sökülmelidir.

---

## 162. Sekme Yığınları Çubuğunda (`tab-stacks/stack-bar.tsx`) İkinci Satır Sekme Şeridinin (`floorp-stack-bar`) Rolü Olmayan `<xul:hbox>` ile Kurulması, Klavyeyle 100% Erişilemez Olması, Yenile Butonunun Sahte İmaj Olması ve Sabit İngilizce İpuçları

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`

### Tespit Edilen Sorunlar
* Klavyeye Yüzde Yüz Kapalı İkinci Satır Sekme Şeridi (WCAG 2.1.1 Keyboard & WAI-ARIA Tabs Pattern):
  * Floorp'un en öne çıkan özelliklerinden biri olan sekme yığınları (tab stacks) alt satırındaki `floorp-stack-bar`, sekmeleri temsil eden `StackTabProxy` elemanını şu şekilde üretir:
    `<xul:hbox class="floorp-stack-tab" align="center" data-selected={selected()} tooltiptext={label()} onClick={...}>`
  * Bu eleman bir `<xul:hbox>`'tur!
  * Elemana `role="tab"` verilmemiştir!
  * Elemana `tabindex="0"` verilmemiştir!
  * Elemana `aria-selected={selected() === "true"}` verilmemiştir!
  * Elemana hiçbir klavye olay dinleyicisi (`onKeyDown`) bağlanmamıştır! Yalnızca fare `onClick` dinleyicisi vardır.
  * Sonuç: Sekme yığını altındaki hiçbir sekmeye klavye ile ulaşılamaz! Tab, ArrowRight/Left veya F6 tuşları bu çubuğa asla odaklanamaz. Görme engelli veya motor kısıtlı kullanıcılar yığın içindeki sekmeleri klavyeyle seçemez.
* Etkileşimli Yenileme Butonunun Sahte İmaj Olarak Bırakılması:
  * Satır 303-316'da sekme yenileme kontrolü bir `<xul:image>` elemanıdır:
    `<xul:image class="floorp-stack-tab-refresh" src="..." tooltiptext="Reload tab" onClick={...} />`
  * Bir resim elemanına tıklama verilmiş fakat `role="button"` ve `tabindex="0"` atanmamıştır. Klavye ile yenileme yapılamaz.
* Sabit Kodlanmış İngilizce Araç İpuçları ve Fareye Bağımlı Butonlar:
  * `tooltiptext="Close tab"`, `tooltiptext="Reload tab"`, `tooltiptext="Scroll tabs left"`, `tooltiptext="Scroll tabs right"`, `tooltiptext="New tab in stack"`.
  * Tüm bu metinler sabit İngilizcedir; hiçbir i18n çevirisi yoktur. Üstelik butonlar XUL'un klavye-erişilebilir `onCommand` olayı yerine fareye özel `onClick` kullanır.

### Mimari Çözümler
* WAI-ARIA `tablist` ve `tab` Semantiği ile Tam Klavye Dolaşımı:
  * `#floorp-stack-items` elemanına `role="tablist"` ve `aria-orientation="horizontal"` verilmeli; her bir `StackTabProxy` elemanına `role="tab"`, `tabindex={props.tab.selected ? 0 : -1}`, `aria-selected={props.tab.selected}` ve `onKeyDown` (ArrowLeft/Right/Home/End/Enter/Space) dolaşımı eklenmelidir.
* Gerçek Buton Semantiği ve `onCommand` Entegrasyonu:
  * Yenileme imajı ve kapatma butonları erişilebilir `<xul:toolbarbutton role="button">` elemanlarına dönüştürülmeli ve `onCommand` ile klavyeye bağlanmalıdır.
* Dil Dosyaları Entegrasyonu:
  * Bütün ipucu ve buton metinleri `i18next` üzerinden yerelleştirilmelidir.


---

## 163. Fare Hareketi Desen Düzenleme Modalında (`ActionEditModal.tsx`) 8 Yön Butonunun (`↖`, `↑`, `↗`, `←`, `→`, `↙`, `↓`, `↘`) ve Çıkarma Butonunun (`×`) `aria-label` Yokluğu Nedeniyle Ekran Okuyucuya Ham Matematik Sembolü Okutulması

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/gesture/components/ActionEditModal.tsx`

### Tespit Edilen Sorunlar
* 8 Yön Düğmesinde Erişilebilir İsim Yokluğu (WCAG 4.1.2 Name, Role, Value - Level A):
  * `ActionEditModal.tsx` satır 180-240 arasında desen oluşturma ızgarasında 8 yön butonu yer alır:
    * `↖` (Sol Yukarı), `↑` (Yukarı), `↗` (Sağ Yukarı), `←` (Sol), `→` (Sağ), `↙` (Sol Aşağı), `↓` (Aşağı), `↘` (Sağ Aşağı).
  * Bu butonların hiçbirinde `aria-label` tanımlı değildir!
  * Ekran okuyucular (NVDA, JAWS, Narrator) bu karakterleri ya "North West Arrow, button" gibi anlaşılması güç İngilizce Unicode karakter adlarıyla ya da Türkçe sentezleyicide tamamen sessiz geçerek yalnızca "düğme" olarak okur.
  * Görme engelli bir kullanıcı hangi düğmenin hangi yöne çizim yaptığını asla anlayamaz ve fare jesti deseni tanımlayamaz.
* Ham Çarpı (`×`) İşaretiyle Desen Silme (WCAG 4.1.2 & WCAG 1.3.1):
  * Satır 163-169 arasında eklenmiş yön deseninin son adımını silmek için `<Button type="button" variant="ghost" onClick={() => removeDirection(index)}>×</Button>` kullanılmıştır.
  * Butonda hiçbir `aria-label` yoktur. Ekran okuyucu "Çarpı, düğme" veya "Times, button" okur. Hangi yön adımının silineceği belirtilmez.
* Canlı Desen Güncellemesi Bildirimi Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * Kullanıcı yön butonlarına bastıkça `action.pattern` dizisine yeni yön eklenir; ancak bu liste `<div role="status" aria-live="polite">` ile sarılmadığından ekran okuyucu kullanıcısı desenin başarıyla eklenip eklenmediğini duyamaz.

### Mimari Çözümler
* Yerelleştirilmiş `aria-label` Tanımlamaları:
  * Her bir yön butonuna `aria-label={t(`mouseGesture.direction.${dir}`)}` atanmalıdır (örneğin "Yukarı Sol", "Yukarı", "Aşağı Sağ").
* Belirgin Adım Silme Butonu:
  * Silme butonuna `aria-label={t("mouseGesture.removeStep", { step: patternToString([direction]), index: index + 1 })}` verilmelidir.
* Canlı Durum Bildiricisi:
  * Desen listesine `aria-live="polite"` ve `role="status"` atanarak her yön eklendiğinde veya silindiğinde güncel desen dizilimi ekrana duyurulmalıdır.

---

## 164. Kenar Çubuğu Panel Düzenleme Modalında (`PanelEditModal.tsx`) SSL Güvenlik Durumunun Ham Emoji (`🔒`/`⚠️`) Olarak Sunulması, Çift `id="panel-url"` Çakışması ve Doğrulama Hatalarının Girdilere Bağlanmaması

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/sidebar/components/PanelEditModal.tsx`

### Tespit Edilen Sorunlar
* Ham Emoji ile Güvenlik Seviyesi İletimi (WCAG 1.1.1 Non-text Content & WCAG 1.3.1 Info and Relationships):
  * `PanelEditModal.tsx` satır 257-263 arasında URL giriş alanının sağ kenarında HTTPS doğrulaması görsel olarak şu şekilde yapılır:
    `{editedPanel.url.startsWith("https://") ? "🔒" : "⚠️"}`
  * Bu emojiler `pointer-events-none` sınıfına sahip bir span içine konmuştur ve hiçbir `aria-label` veya `.sr-only` açıklama metni içermez.
  * Ekran okuyucular kilit veya uyarı emojisini atlarlar; görme engelli kullanıcı eklediği panel URL'sinin güvenli HTTPS mi yoksa güvensiz HTTP mi olduğunu denetleyemez.
* DOM İçinde Mükerrer `id="panel-url"` Kullanımı (WCAG 4.1.1 Parsing - Obsolete / W3C Validity):
  * Satır 251'deki Web URL metin kutusu `id="panel-url"` taşır.
  * Satır 283'teki Statik Panel `<Select>` bileşeni de `id="panel-url"` taşır!
  * Aynı form modalı içinde iki farklı elemana aynı `id` verilmesi, tarayıcı erişilebilirlik ağacının `<label htmlFor="panel-url">` eşleşmesini bozmasına ve ekran okuyucunun her iki alanı da aynı girdi sanmasına yol açar.
* Doğrulama Hatalarının Girdiye Bağlanmaması (WCAG 3.3.1 Error Identification & WCAG 3.3.2):
  * Satır 265-271'deki `{errors.url && (<label><span className="text-error">{errors.url}</span></label>)}` hata uyarısı metin kutusuna `aria-describedby` ile bağlı değildir.
  * Metin kutusuna hata anında `aria-invalid="true"` atanmaz.
  * Kullanıcı hatalı bir URL girdiğinde odak metin kutusundayken ekran okuyucu hatadan tamamen habersiz kalır.

### Mimari Çözümler
* Erişilebilir Güvenlik Göstergesi:
  * Gösterge `<span className="sr-only">{isHttps ? t("panelSidebar.secureHttps") : t("panelSidebar.insecureHttp")}</span>` ile donatılmalı; emojilere `aria-hidden="true"` verilmelidir.
* Tekil ID Ayrıştırması:
  * Web URL girdisine `id="panel-web-url"`, statik panel seçimine `id="panel-static-url"` verilmeli ve etiketlerin `htmlFor` özellikleri ayrılmalıdır.
* `aria-invalid` ve `aria-describedby` Entegrasyonu:
  * URL girdisine `aria-invalid={Boolean(errors.url)}` ve `aria-describedby={errors.url ? "panel-url-error" : undefined}` atanmalı, hata mesajına `id="panel-url-error"` verilmelidir.

---

## 165. Kenar Çubuğu Panel Listesinde (`PanelList.tsx`) Sabit İngilizce Sürükleme Metni (`aria-label="Drag to reorder"`), Mükerrer İsme Sahip "Düzenle/Sil" Butonları ve Sıralama Değişiminde Canlı Duyuru Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/sidebar/components/PanelList.tsx`

### Tespit Edilen Sorunlar
* Sabit Kodlanmış İngilizce Erişilebilir İsim (WCAG 3.1.2 Language of Parts - Level AA):
  * `PanelList.tsx` satır 82-89'da panel tutamacı elemanında sabit İngilizce etiket bulunur:
    `aria-label="Drag to reorder"`
  * Tarayıcı Türkçe veya başka bir dilde çalışırken ekran okuyucu yabancı dilde "Drag to reorder" okur; i18n çeviri sözlüğünden bağımsızdır.
* Sürükleme Tutamacının Klavyeye Kapalı Olması (WCAG 2.1.1 Keyboard & WCAG 2.5.7 Dragging Movements):
  * Tutamaç bir `<div>` elemanıdır; `role="button"` veya `tabindex="0"` verilmemiştir. Klavyeyle bu tutamaca odaklanılamaz; panelleri klavye ile (Yukarı/Aşağı ok tuşlarıyla) yeniden sıralamak imkansızdır.
* Mükerrer Buton İsimleri (WCAG 2.4.4 Link Purpose In Context - Level A):
  * Satır 114 ve 124'teki butonlar:
    `aria-label={t("panelSidebar.editPanel")}` ("Paneli Düzenle") ve `aria-label={t("panelSidebar.deletePanel")}` ("Paneli Sil").
  * Listede 10 panel olduğunda ekran okuyucunun buton listesinde 10 adet "Paneli Düzenle" ve 10 adet "Paneli Sil" yer alır. Hangi butonun hangi web paneline ait olduğu anlaşılamaz.
* Canlı Bölge Bildirimi Yokluğu (WCAG 4.1.3 Status Messages):
  * Sürükleme tamamlandığında yeni sıra hakkında ekran okuyucuya hiçbir sözel geri bildirim verilmez.

### Mimari Çözümler
* Yerelleştirilmiş ve Klavye Uyumlu Tutamaç:
  * Tutamaç `<button type="button" aria-label={t("panelSidebar.reorderPanel", { name: displayName })} ...>` olarak düzenlenmeli; `onKeyDown` ile klavyeden sıralama yeteneği kazandırılmalıdır.
* Kontekst İçeren Buton İsimleri:
  * Butonlara `aria-label={t("panelSidebar.editSpecificPanel", { name: displayName })}` ve `aria-label={t("panelSidebar.deleteSpecificPanel", { name: displayName })}` atanmalıdır.
* Canlı Durum Duyurusu:
  * Sıralama değiştiğinde bir `aria-live="polite"` bölgesine `t("panelSidebar.reorderSuccess", { name: displayName, position: newIndex + 1 })` yazdırılmalıdır.

---

## 166. Ayarlar Arama Girişinde (`SearchInput.tsx`) Her Tuş Vuruşunda Sessiz URL Yönlendirmesi Yapılması, Debounce Yokluğu ve Yönetim Paneli Dış Bağlantılarında Yeni Sekme Uyarısının Eksikliği

İlgili Dosyalar:
* `browser-features/pages-settings/src/header/SearchInput.tsx`
* `browser-features/pages-settings/src/app/dashboard/page.tsx`

### Tespit Edilen Sorunlar
* Her Harfte Rota Değişimi ve Ekran Okuyucu Odak Sarsıntısı (WCAG 3.2.2 On Input - Level A & WCAG 4.1.3):
  * `SearchInput.tsx` satır 69-90 arasında kullanıcı arama kutusuna her harf yazdığında `onChange` olayı anında `navigate({ pathname: "/search", search: `?q=${trimmed}` })` tetikler.
  * Hiçbir `debounce` (gecikmeli tetikleme) mekanizması yoktur.
  * Ekran okuyucu kullanıcısı "g", "e", "n", "e", "l" yazarken her harfte sayfa URL'si değişir ve ekran okuyucular yeni sayfa yüklendi duyuruları yaparak kullanıcının yazdığı harfleri duymasını engeller.
* Sonuç Sayısının Canlı Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Girdi bir `combobox` veya `search` landmark'ıdır ancak arama sonuçları sayfasında bulunan eşleşme sayısı (örn. "5 sonuç bulundu") arama kutusu odağındayken ekran okuyucuya duyurulmaz.
* Yönetim Paneli Dış Bağlantılarında Yeni Pencere Bildirimi Yokluğu (WCAG 3.2.5 Change on Request - Level AAA):
  * `dashboard/page.tsx` satır 98-104 arasında destek ve kaynak bağlantıları `target="_blank"` taşır ancak ekran okuyucular için `(yeni pencerede açılır)` gizli metni içermez.

### Mimari Çözümler
* Debounced ve Sakin Arama Navigasyonu:
  * `onChange` olayında URL güncellemesi en az 250-300ms gecikmeli (`debounce`) yürütülmeli; kullanıcının kesintisiz yazabilmesi sağlanmalıdır.
* Canlı Arama Sonucu Bildirimi:
  * Arama girişinin altına bir `aria-live="polite"` bölgesi eklenmeli; sonuç sayısı güncellendikçe "Arama sonuçları güncellendi, N ayar bulundu" şeklinde duyurulmalıdır.
* Erişilebilir Dış Bağlantı Kalıbı:
  * Dış bağlantıların içine `<span className="sr-only"> ({t("common.opensInNewWindow", "yeni sekmede açılır")})</span>` eklenmelidir.

---

## 167. Floorp OS Ayarlar Sayfasında (`floorp-os/page.tsx`) İlerleme Çubuğunun (`<progress>`) Etiketsiz Olması, Durum ve Hata Mesajlarının Canlı Bölgesiz Kalması ve Token Kopyalamada Ekran Okuyucuya Geri Bildirim Verilmemesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/floorp-os/page.tsx`

### Tespit Edilen Sorunlar
* Etiketsiz ve Değersiz İlerleme Çubuğu (WCAG 4.1.2 Name, Role, Value - Level A):
  * `floorp-os/page.tsx` satır 317'de işlem sürerken gösterilen `<progress className="progress w-56"></progress>` elemanının hiçbir `aria-label`'ı, `aria-valuenow`'u veya `aria-valuetext`'i yoktur.
  * Ekran okuyucu bu elemanı yalnızca "İlerleme çubuğu" olarak okur; neyin yüklendiğini belirtmez.
* Canlı Durum ve Hata Bildirimi Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 318'deki `<span>{message}</span>` mesajı ve satır 107-117'deki servis başlatma/durdurma durumları `aria-live` konteyneri içinde değildir. İşlem bittiğinde ekran okuyucu başarı veya hata mesajını seslendirmez.
* Sessiz Pano Kopyalama (WCAG 4.1.3 & WCAG 3.3.1):
  * Satır 256-268'deki sunucu token'ı kopyalama butonu tıklandığında `navigator.clipboard.writeText` çağrılır ancak ekranda hiçbir toast/bildirim ve ekran okuyucu duyurusu yapılmaz. Görme engelli kullanıcı kopyalamanın başarılı olup olmadığını bilemez.
* Yüksek Kontrat Modunda Rozet Renklerinin Kaybolması (WCAG 1.4.1 Use of Color & WCAG 1.4.11):
  * Satır 175-184'teki "Aktif" / "Devre Dışı" rozetleri `bg-green-100 text-green-800` gibi Tailwind renklerine güvenir. Windows Yüksek Karşıtlık Modunda arka plan silindiğinde rozet düz yazıya dönüşür ve görsel hiyerarşi çöker.

### Mimari Çözümler
* Tam Semantik İlerleme Göstergesi:
  * `<progress aria-label={message || t("floorpOS.processing")} aria-busy="true" ... />` şeklinde yapılandırılmalıdır.
* Canlı Bildirim Alanı:
  * Mesaj alanı `<div role="status" aria-live="polite">` ile sarılmalı; hatalar `role="alert"` ile anında bildirilmelidir.
* Kopyalama Geri Bildirimi:
  * Kopyalama butonuna tıklandığında geçici bir "Kopyalandı!" durumu ve `aria-live` duyurusu sağlanmalıdır.
* Yüksek Kontrast Çerçeveleri:
  * Rozetlere `@media (forced-colors: active) { border: 1px solid ButtonBorder; }` kuralı eklenmelidir.

---

## 168. QR Kod Üretecinde (`qr-code-manager.tsx`) Yüksek Kontrast Yıkımı ve Metin Eşdeğeri Yokluğu, Zen Modunun (`zen-mode.tsx`) Klavyeye Görünmez Olması ve Yeniden Başlatma Menüsünde (`RebootPanelMenu.tsx`) Onaysız Yıkıcı Çıkış Tuzağı

İlgili Dosyalar:
* `browser-features/chrome/common/qr-code-generator/qr-code-manager.tsx`
* `browser-features/chrome/common/zen-mode/zen-mode.tsx`
* `browser-features/chrome/common/reboot-panel-menu/RebootPanelMenu.tsx`

### Tespit Edilen Sorunlar
* QR Kod SVG'sinin Erişilebilir İsimsiz Olması ve Yüksek Kontrast Çöküşü (WCAG 1.1.1 Non-text Content & WCAG 1.4.11):
  * `qr-code-manager.tsx` satır 100-114 arasında QR kod oluşturulurken `#4267b2` (mavi) ve `#e9ebee` (açık gri) renkleri SVG içine sabit kodlanır.
  * Windows Karşıtlık Modunda bu hardcoded renkler sistem renklerine uyum sağlayamaz; beyaz zemin üzerinde silik kalabilir.
  * SVG kapsayıcısında (`#qrcode-img-vbox`) `role="img"` ve `aria-label` tanımlı değildir. Ekran okuyucu için bu kutu boştur; kodun hangi URL'yi temsil ettiği söylenmez.
* Zen Modunda Klavyeyle Araç Çubuğuna Erişilememesi (WCAG 2.1.1 Keyboard & WCAG 2.4.7 Focus Visible):
  * `zen-mode.tsx` satır 490-569 arasında araç çubuklarının görünmesi yalnızca fare hareketine (`handleMouseMove`) ve adres çubuğu odağına (`handleUrlbarFocusIn`) bağlanmıştır.
  * Klavye kullanıcısı `Ctrl+Tab` ile sekme değiştirdiğinde sekme çubuğu açılmaz!
  * Kullanıcı `F6` veya Tab ile durum çubuğuna (`#nora-statusbar`) veya yan panele (`#panel-sidebar-box`) odaklandığında bu çubuklar ekranda GİZLİ kalmaya devam eder! Klavye odağı görünmez elemanların üzerinde dolaşır.
* Yeniden Başlatma Menüsünde Onaysız Yıkıcı Eylem (WCAG 3.3.4 Error Prevention - Legal, Financial, Data):
  * `RebootPanelMenu.tsx` satır 170-188 arasında "Normal Yeniden Başlat", "Önbelleği Temizleyerek Yeniden Başlat" ve "Güvenli Modda Yeniden Başlat" butonları tıklandığı anda hiçbir onay istemeden tarayıcı sürecini anında kapatır (`Services.startup.quit`).
  * Yanlışlıkla veya klavyeyle gezinirken Enter'a basan kullanıcı kaydedilmemiş tüm form verilerini ve oturumunu anında kaybeder.
  * Ayrıca `#appMenu-restart-button` butonu bir alt menü açmasına rağmen `aria-haspopup` veya `aria-expanded` taşımaz.

### Mimari Çözümler
* Erişilebilir QR Kod Paneli:
  * QR kod kapsayıcısına `role="img"` ve `aria-label={t("qrcode.qrCodeFor", { url })}` verilmeli; altına panoya kopyalanabilir görünür URL metni eklenmelidir.
* Zen Modu Odak Dinleyicileri:
  * `zen-mode.tsx` içine `#navigator-toolbox`, `#nora-statusbar` ve `#panel-sidebar-box` odaklandığında ilgili çubuğu anında açan genel `focusin` dinleyicileri eklenmelidir.
* Güvenli Yeniden Başlatma Onay İletişim Kutusu:
  * Yıkıcı yeniden başlatma eylemlerinden önce `ConfirmModal` ile kullanıcıdan teyit alınmalıdır; ana butona `aria-haspopup="dialog"` eklenmelidir.

---

## 169. Klavye Kısayolları Düzenleyicisinde (`ShortcutEditor.tsx`) Tuş Kaydetme Modunun Global Dinleyiciyle Odak Tuzağı (Keyboard Trap) Oluşturması, Tab ve Escape Tuşlarını Gasp Etmesi, Modun Ekran Okuyucuya Duyurulmaması ve Değiştirici Tuşların Grupsuz Kalması

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/keyboard-shortcut/components/ShortcutEditor.tsx`

### Tespit Edilen Sorunlar
* Klavye Tuzağı (WCAG 2.1.2 No Keyboard Trap - Level A):
  * `ShortcutEditor.tsx` satır 242-243'te kullanıcı tuş giriş alanına odaklandığında (`onFocus`) `isRecording` durumu `true` olur.
  * Satır 74-99 arasında `isRecording` aktifken pencereye global `keydown` dinleyicisi eklenir:
    ```tsx
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code = getRecordedShortcutCode(e);
      ...
    };
    ```
  * Kullanıcı bu moddan çıkmak veya "İptal" butonuna gitmek için `Tab` veya `Shift+Tab` tuşuna bastığında, `handleKeyDown` tuşu yutar (`e.preventDefault()`), odağı ilerletmez!
  * Kullanıcı `Escape` tuşuna bastığında: Satır 152'de `closeOnEscape={!isRecording}` kuralı yüzünden modal kapanmaz!
  * Klavye kullanıcısı bu alana bir kez girdiğinde fareden başka hiçbir yolla bu alandan ve modaldan çıkamaz! Bu durum WCAG 2.1.2 kriterinin en ağır ihlalidir.
* Kayıt Durumunun Ekran Okuyucuya Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 245-251'de tuş kaydı başladığında ekranda görsel bir overlay belirir (`t("keyboardShortcut.recording")`), ancak bu eleman `role="status"` veya `aria-live="assertive"` taşımaz. Görme engelli kullanıcı tuş yakalama modunun başladığını anlayamaz.
* Değiştirici Tuş Onay Kutularının Grupsuz Olması (WCAG 1.3.1 Info and Relationships):
  * Satır 175-228 arasındaki 4 değiştirici kutu (`Alt`, `Ctrl`, `Meta`, `Shift`) bir `<div>` içindedir; `<fieldset>` ve `<legend>` veya `role="group"` ile sarılmamıştır. Ekran okuyucu kullanıcısı bu onay kutularının neyin değiştiricisi olduğunu duyamaz.

### Mimari Çözümler
* Klavye Tuzağının Ortadan Kaldırılması:
  * `handleKeyDown` içinde `Tab` ve `Escape` tuşları kaydedilecek tuşlar kapsamından muaf tutulmalıdır (`if (e.key === "Tab" || e.key === "Escape") return;`). Escape tuşuna basıldığında kayıt iptal edilmeli, Tab tuşuna basıldığında odak normal şekilde İptal/Kaydet butonlarına geçebilmelidir.
* Canlı Kayıt Durumu Duyurusu:
  * Kayıt başladığında `<div role="status" aria-live="assertive">{t("keyboardShortcut.recordingLiveNotice")}</div>` ile ekran okuyucuya "Tuş kaydı başladı, atamak istediğiniz tuşa basınız veya çıkmak için Escape'e basınız" bilgisi verilmelidir.
* Semantik Değiştirici Grubu:
  * Onay kutuları `<fieldset className="grid grid-cols-2 gap-4"><legend className="sr-only">{t("keyboardShortcut.modifiersGroup")}</legend>...</fieldset>` içine alınmalıdır.

---

## 170. Klavye Kısayolları Ayar Tablosunda (`ShortcutsSettings.tsx`) Semantik Tablo Eksiklikleri (`caption`, `scope="col"`, `<th scope="row">` Yokluğu) ve Onlarca Mükerrer İsme Sahip "Düzenle", "Ekle", "Sil" Butonları

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/keyboard-shortcut/components/ShortcutsSettings.tsx`

### Tespit Edilen Sorunlar
* Semantik Tablo Başlığı ve Hücre Kapsamlarının Yokluğu (WCAG 1.3.1 Info and Relationships - Level A):
  * `ShortcutsSettings.tsx` satır 75-132 arasında 50'den fazla kısayol eylemini listeleyen bir `<table>` yer alır.
  * Tabloda `<caption>` etiketi yoktur; ekran okuyucu tablonun ne tablosu olduğunu duyuramaz.
  * Başlık hücrelerinde (`<th>`) `scope="col"` tanımlı değildir.
  * Satır başlığı olan eylem adları (`<td>{action.name}</td>`) `<td>` olarak bırakılmıştır! `<th scope="row">` kullanılmadığı için ekran okuyucu tablo içinde gezinirken kısayol veya buton hücresinin hangi eyleme ait olduğunu hücreyle ilişkilendiremez.
* Mükerrer Buton İsimleri (WCAG 2.4.4 Link Purpose In Context - Level A & WCAG 4.1.2):
  * Satır 106-125 arasında her satırda şu butonlar üretilir:
    `{shortcut ? t("keyboardShortcut.edit") : t("keyboardShortcut.add")}` ("Düzenle" veya "Ekle") ve `{t("keyboardShortcut.delete")}` ("Sil").
  * Tabloda 50 satır olduğunda ekran okuyucu buton listesinde 50 adet "Düzenle" ve onlarca "Sil" listelenir. Kullanıcı hangi butona bastığında hangi eylemin kısayolunu düzenleyeceğini veya sileceğini bilemez.
* Kısayol Silme İşleminde Onay ve Duyuru Yokluğu (WCAG 3.3.4 Error Prevention & WCAG 4.1.3):
  * "Sil" butonuna tıklandığında kısayol anında ve hiçbir onay kutusu gösterilmeden silinir; ekran okuyucuya kısayolun silindiğine dair hiçbir canlı bildirim yapılmaz.

### Mimari Çözümler
* WAI Tablo Semantiği Uyumu:
  * Tabloya `<caption className="sr-only">{t("keyboardShortcut.tableCaption")}</caption>` eklenmeli; başlıklara `scope="col"`, eylem isimlerine `<th scope="row" className="font-normal">{action.name}</th>` verilmelidir.
* Bağlamsal Buton İsimleri:
  * Butonlara `aria-label={t("keyboardShortcut.editSpecific", { action: action.name })}`, `aria-label={t("keyboardShortcut.deleteSpecific", { action: action.name })}` atanmalıdır.
* Silme Onayı ve Canlı Geri Bildirim:
  * Silme işlemi `ConfirmModal` ile doğrulanmalı; tamamlandığında `aria-live="polite"` ile "Kısayol başarıyla silindi" duyurulmalıdır.

---

## 171. Arama Sonuçları Sayfasında (`app/search/page.tsx`) `<mark>` Vurgusunun Yüksek Kontrast Yıkımı ve Ekran Okuyuculara Duyurulmaması, Canlı Bölge Yokluğu ve `<Link aria-label>` ile Tüm Snippet İçeriğinin Ekran Okuyucudan Gizlenmesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/search/page.tsx`

### Tespit Edilen Sorunlar
* `<mark>` Elemanının Yüksek Karşıtlık Modunda Kaybolması ve Düşük Kontrastı (WCAG 1.4.3 Contrast Minimum & WCAG 1.4.11):
  * `app/search/page.tsx` satır 60-66 arasında arama eşleşmeleri şu şekilde vurgulanır:
    `<mark className="rounded bg-primary/20 px-1 py-0.5 text-base-content">{matched}</mark>`
  * `bg-primary/20` %20 opaklıkta soluk bir renktir. Açık ve koyu temalarda metin ile arka plan arasındaki kontrast oranı standart 4.5:1 eşiğinin altına düşebilir.
  * Windows Karşıtlık Modunda (`forced-colors: active`) sistem renkleri (`Mark` / `MarkText`) açıkça atanmadığı için arka plan silinir ve vurgulanan kelime diğer kelimelerden ayırt edilemez hale gelir.
* Ekran Okuyucunun Eşleşen Metni Vurgulayamaması (WCAG 1.3.1 Info and Relationships):
  * Varsayılan olarak ekran okuyucular `<mark>` etiketini seslendirmezler; görme engelli kullanıcı arama teriminin cümlenin neresinde geçtiğini duyamaz.
* `<Link aria-label>` İle Snippet Açıklamalarının Buharlaşması (WCAG 4.1.2 Name, Role, Value):
  * Satır 217-225'te arama kartı linki şu şekildedir:
    `<Link to={document.route} aria-label={t("pages.search.open", { title: document.title })}> ... </Link>`
  * WAI-ARIA kurallarına göre bir kapsayıcıya `aria-label` verildiğinde, kapsayıcının içindeki tüm çocuk metinler (kart başlığı, eşleşen metin, snippet özeti) ekran okuyucudan tamamen GİZLENİR!
  * Ekran okuyucu kullanıcısı yalnızca "Floorp Genel Ayarlarını Aç, link" duyar; arama teriminin geçtiği bağlam cümlesini (snippet) ASLA dinleyemez. Arama sonuçlarının amacı ortadan kalkar!
* Canlı Sonuç Sayısı Bildirimi Yokluğu (WCAG 4.1.3 Status Messages):
  * Sayfa yüklendiğinde bulunan sonuç sayısı veya "Sonuç bulunamadı" durumu canlı bölge (`role="status" aria-live="polite"`) ile duyurulmaz.

### Mimari Çözümler
* Yüksek Kontrast Uyumlu Vurgulama:
  * CSS'te `@media (forced-colors: active) { mark { background-color: Highlight; color: HighlightText; } }` tanımlanmalı; normal modda WCAG AAA uyumlu yüksek kontrastlı vurgulama renkleri kullanılmalıdır.
* Erişilebilir Bağlam Koruyucu Link Yapısı:
  * Link üzerindeki toptan `aria-label` kaldırılmalı; ekran okuyucunun kart başlığını ve eşleşen snippet metnini doğal DOM hiyerarşisinde okumasına izin verilmelidir.
* Canlı Arama Durum Duyurucusu:
  * Sonuç başlığına `role="status"` ve `aria-live="polite"` atanarak kaç sonuç bulunduğu sesli olarak bildirilmelidir.

---

## 172. Sekme Üzerine Gelindiğinde Yenileme Özelliğinde (`tab-refresh/controller.ts` & `styles.css`) 16x16px Hedef Boyutu İhlali, Klavyeyle/Odakla Asla Açılmama ve Yüksek Karşıtlık Modunda Çerçevesiz Görünmezlik

İlgili Dosyalar:
* `browser-features/chrome/common/tab-refresh/controller.ts`
* `browser-features/chrome/common/tab-refresh/styles.css`

### Tespit Edilen Sorunlar
* Yetersiz Dokunma/Tıklama Hedef Boyutu (WCAG 2.5.8 Target Size Minimum - Level AA & WCAG 2.5.5 - Level AAA):
  * `styles.css` satır 19-21'de sekmelerin üzerine gelindiğinde beliren yenileme butonunun boyutu şu şekilde tanımlanmıştır:
    `width: 16px; min-width: 16px; height: 16px; margin-inline: 2px;`
  * 16x16 piksel boyutu, WCAG 2.5.8 asgari 24x24 piksel ve WCAG 2.5.5 AAA 44x44 piksel kuralını ihlal eder.
  * Bu 16x16px boyutundaki buton, sekme kapatma butonunun (`.tab-close-button`) hemen 2 piksel yanına yerleştirilmiştir! Motor kısıtı veya el titremesi olan kullanıcılar sekmeyi yenilemek isterken sekmeyi kapatmakta, sekmeyi kapatmak isterken yenilemektedir!
* Klavyeye Yüzde Yüz Kapalı Olma (WCAG 2.1.1 Keyboard - Level A):
  * `controller.ts` satır 125-128 ve 472-479'da yenileme glifi yalnızca `TabHoverStart` (fareyle sekme üzerine gelme) olayıyla yaratılır.
  * `focus` veya `focusin` dinleyicisi yoktur! Klavye ile sekme üzerine gelen kullanıcı için buton ASLA üretilmez!
  * Üstelik üretilen elemana `tabindex="-1"` ve `keyNav="false"` verilmiştir; klavyeyle bu butona ulaşılamaz ve Enter/Space ile tetiklenemez.
* Yüksek Karşıtlık Modunda Çerçevesizlik (WCAG 1.4.11 Non-text Contrast):
  * `styles.css` satır 24-26'da `border: 0; background: transparent;` verilmiştir.
  * Windows Karşıtlık Modunda (`forced-colors: active`) sınır çizgisi olmadığı için buton simgesi sekme başlığı metniyle karışır ve ayırt edilemez.

### Mimari Çözümler
* Güvenli Hedef Boyutu ve Boşluk:
  * Buton tıklama alanı `::before` pseudo-elementi ile en az 24x24 piksele genişletilmeli; kapatma butonu ile arasına en az 8 piksel güvenlik mesafesi konmalıdır.
* Klavye ve Odak Desteği:
  * Sekme klavye odağı aldığında glif görünür hale getirilmeli; butona klavye erişilebilirliği veya sekmeye yerleşik erişilebilir bir bağlam menüsü kısayolu sağlanmalıdır.
* Yüksek Kontrast Kenarlığı:
  * `@media (forced-colors: active)` bloğunda butona `border: 1px solid ButtonBorder;` atanmalıdır.

---

## 173. Pencere Taşıma Çekirdeğinde (`window-drag/index.ts` & `drag-session.ts`) `Ctrl+Alt+Fare` Kısayolunun Global Capture ile Ekran Okuyucu Tuşlarını (NVDA / Tablo Dolaşımı) Gasp Etmesi, Sürüklemeye Alternatif Klavye Yolu ve Ayarlar Kapatma Anahtarının Bulunmaması

İlgili Dosyalar:
* `browser-features/chrome/common/window-drag/index.ts`
* `browser-features/chrome/common/window-drag/drag-session.ts`

### Tespit Edilen Sorunlar
* Ekran Okuyucu ve Yardımcı Teknoloji Tuş Kombinasyonlarının Gasp Edilmesi (WCAG 2.1.1 Keyboard & WCAG 2.5.7 Dragging Movements):
  * `window-drag/index.ts` satır 41-56 ve 99-103'te pencereyi taşımak için global `mousedown` ve `mousemove` olayları `useCapture: true` ile dinlenir:
    `chordHeld = IS_MAC ? e.metaKey && e.altKey : e.ctrlKey && e.altKey;`
  * Windows ve Linux'ta `Ctrl+Alt`, birçok klavye düzeninde AltGr tuşuna karşılık gelir ve ekran okuyucularda (özellikle NVDA ve JAWS'ta) tablo dolaşımı, metin seçimi ve fare yönlendirme (`mouse routing`) için yoğun olarak kullanılır.
  * NVDA kullanıcısı ekrandaki bir öğeyi incelemek veya seçmek için `Ctrl+Alt+Fare Tıklaması` yaptığında, `WindowDrag` olayı `capture: true` ile yakalar, `e.preventDefault()` ve `e.stopImmediatePropagation()` çağırarak fare olayını yutar ve tarayıcı penceresini ekranda sürüklemeye başlar!
  * Ekran okuyucu kullanıcısı metin seçemez veya öğeyi inceleyemez; pencere kullanıcının haberi olmadan ekranın dışına kayar!
* Sürüklemeye Alternatif Tek Tıklamalı veya Klavyeli Mekanizma Yokluğu (WCAG 2.5.7 Dragging Movements - Level AA):
  * WCAG 2.5.7 uyarınca, sürükleme hareketiyle çalışan tüm işlevler tek noktalı veya alternatif bir yöntemle de çalıştırılabilmelidir.
  * Pencereyi taşımak için hiçbir klavye kısayolu, menü komutu veya alternatif arayüz sunulmamıştır.
* Kapatma/Devre Dışı Bırakma Tercihi Yokluğu:
  * Floorp ayarlarında bu agresif global pencere sürükleme davranışını kapatacak hiçbir tercih anahtarı (`pref`) bulunmamaktadır.

### Mimari Çözümler
* Güvenli Yardımcı Teknoloji Koruması:
  * Tarayıcı bir ekran okuyucu veya erişilebilirlik API'si (`accessibility.loaded`) tespit ettiğinde veya kullanıcı web içeriği/form elemanları üzerindeyken `Ctrl+Alt+Sürükleme` davranışı web içeriği lehine iptal edilmelidir.
* Ayarlar Sayfasına Kapatma Seçeneği:
  * `floorp.browser.windowDrag.enabled` tercihi eklenmeli; Ayarlar -> Tasarım bölümünden bu davranışın tamamen kapatılabilmesi sağlanmalıdır.
* Klavye ile Pencere Konumlandırma Desteği:
  * Sistem menüsü (`Alt+Space -> Taşımak`) veya özel klavye kısayolu ile pencerenin ok tuşlarıyla taşınabilmesi güvenceye alınmalıdır.

---

## 174. Harici Tarayıcıda Aç Bağlam Menüsünde (`external-browser/link-context-menu.tsx`) `onPopupShowing` Olayında Asenkron `await` Nedeniyle Ekran Okuyuculara Boş Menü Bildirilmesi, `accesskey` Yokluğu ve Başarısızlık Durumunda Sessiz Hata

İlgili Dosyalar:
* `browser-features/chrome/common/external-browser/link-context-menu.tsx`

### Tespit Edilen Sorunlar
* `onPopupShowing` İçinde Asenkron Bekleme ve Boş Erişilebilirlik Ağacı (WCAG 4.1.2 Name, Role, Value - Level A):
  * `link-context-menu.tsx` satır 170-182'de menü açılırken şu kod yürütülür:
    ```ts
    while (popup.firstChild) { popup.removeChild(popup.firstChild); }
    await this.loadBrowsers();
    ```
  * Gecko XUL mimarisinde `onPopupShowing` olayı senkron çalışmak zorundadır! Menü açıldığı anda Gecko erişilebilirlik motoru alt menünün içeriğini sorgular.
  * Fonksiyon `await this.loadBrowsers()` satırına geldiğinde olay işleyici derhal geri döner; o anda menü içi tamamen boştur!
  * Ekran okuyucu kullanıcıya "Boş menü" duyurur veya alt menüyü odaklanılamaz sayar. Milisaniyeler sonra promise çözülüp elemanlar eklendiğinde ise ekran okuyucu çoktan menüyü geçmiş veya kapatmış olur.
* `accesskey` Yokluğu (WCAG 2.1.1 Keyboard):
  * Dinamik üretilen harici tarayıcı menü öğelerine hiçbir `accesskey` atanmamıştır. Klavyeyle hızlı harf tuşlamasıyla tarayıcı seçilemez.
* Başarısız Dış Tarayıcı Çağrısında Sessiz Başarısızlık (WCAG 3.3.1 Error Identification - Level A):
  * Satır 276-281'de harici tarayıcı açılamadığında yalnızca `console.error` yazılır; kullanıcıya ne görsel bir alert ne de ekran okuyucu için sesli bir hata uyarısı verilir. Kullanıcı tıkladığı bağlantının neden açılmadığını anlayamaz.

### Mimari Çözümler
* Senkron Menü Yapılandırması ve Önbellek:
  * Yüklü harici tarayıcılar arka planda önceden taranıp önbelleğe alınmalı; `onPopupShowing` anında hiçbir asenkron `await` yapılmadan önbellekten anında senkron olarak DOM'a eklenmelidir.
* `accesskey` Desteği:
  * Her tarayıcı seçeneğine otomatik veya ilk harfine göre bir `accesskey` atanmalıdır.
* Hata Bildirimi (Live Region Alert):
  * Harici tarayıcı başlatılamadığında kullanıcıya erişilebilir bir bildirim paneli veya sesli alert (`role="alert"`) sunulmalıdır.

---

## 175. Özel Konteyner ve Sekme Taşıma Mekanizmasında (`private-container/browser-private-container.tsx` & `PrivateContainer.ts`) Kalıcı Sabit Dil Adı Kaydı, Menüde `accesskey` Yokluğu ve Çoklu Sekme Taşınmasında Ekran Okuyucuya Canlı Duyuru Yapılmaması

İlgili Dosyalar:
* `browser-features/chrome/common/private-container/browser-private-container.tsx`
* `browser-features/chrome/common/private-container/PrivateContainer.ts`
* `browser-features/chrome/common/private-container/context-menu.tsx`

### Tespit Edilen Sorunlar
* Kalıcı Sabit Dil Adı Kaydı (WCAG 3.1.2 Language of Parts - Level AA):
  * `PrivateContainer.ts` satır 48-60 arasında tarayıcı ilk açıldığında `StartupCreatePrivateContainer()` çalışır ve konteyner kimliğini kaydeder:
    `name: i18next.t("privateContainer.name")`
  * Bu isim `ContextualIdentityService._identities.push(identity); ContextualIdentityService.saveSoon();` ile doğrudan Firefox profil diskine (`containers.json`) yazılır.
  * Kullanıcı daha sonra tarayıcı dilini Türkçe'ye veya başka bir dile değiştirdiğinde, diskteki bu konteyner adı ASLA güncellenmez!
  * Türkçe arayüz kullanan görme engelli bir kullanıcı sekmeler arasında gezerken ekran okuyucu bu konteyner sekmesini ilk kurulumdaki eski dille okumaya devam eder.
* Bağlam Menüsü Öğesinde `accesskey` Yokluğu (WCAG 2.1.1 Keyboard):
  * `context-menu.tsx` satır 17-25'te sekme bağlam menüsüne eklenen `context_toggleToPrivateContainer` menü öğesinde hiçbir `accesskey` tanımlı değildir.
* Çoklu Sekme Taşımasında Canlı Duyuru Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * `browser-private-container.tsx` satır 245-360 arasında kullanıcı seçili çoklu sekmeleri özel konteynere taşıdığında, eski sekmeler birer birer silinip yeni sekmeler açılır.
  * Bu büyük DOM değişiminde ekran okuyucuya "N sekme Özel Konteynere taşındı" şeklinde hiçbir canlı duyuru (`aria-live="polite"`) yapılmaz; kullanıcının sekme odağı kaybolur.

### Mimari Çözümler
* Dinamik Konteyner Adı Güncellemesi:
  * Dil değişikliği gözlemcisi (`addI18nObserver`) üzerinden `ContextualIdentityService` içindeki özel konteyner adı dil değiştikçe otomatik güncellenmeli ve kaydedilmelidir.
* Menü Öğesine `accesskey` Eklenmesi:
  * `context_toggleToPrivateContainer` öğesine yerelleştirilmiş `accesskey` eklenmelidir.
* Canlı Durum Bildiricisi:
  * Sekme taşıma tamamlandığında odak yeni aktif sekmeye taşınmalı ve taşınan sekme sayısı canlı bölge üzerinden ekran okuyucuya duyurulmalıdır.

---

## 176. Ayarlar Tasarım ve Sekme Davranışı Formlarında (`UICustomization.tsx` & `TabWindowBehavior.tsx`) Grupsuz Radyo Düğmeleri (Navbar / Bookmark Bar), `aria-describedby` İle Bağlanmamış Açıklamalar ve Yeniden Başlatma Modalının Erken Durum Değişimi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/design/components/UICustomization.tsx`
* `browser-features/pages-settings/src/app/design/components/TabWindowBehavior.tsx`

### Tespit Edilen Sorunlar
* Grupsuz Radyo Düğmeleri (WCAG 1.3.1 Info and Relationships - Level A):
  * `UICustomization.tsx` satır 52-77 (Gezinme Çubuğu Konumu) ve satır 214-243 (Yer İmleri Çubuğu Konumu) radyo düğmeleri hiçbir `<fieldset>` veya `role="radiogroup"` ile sarılmamıştır.
  * Ekran okuyucu kullanıcısı radyo butonuna geldiğinde yalnızca "Üst, radyo düğmesi" duyar; Gezinme Çubuğunun mu yoksa Yer İmleri Çubuğunun mu üstte olacağını bilemez.
* `aria-describedby` İle Bağlanmamış Yardımcı Metinler (WCAG 3.3.2 Labels or Instructions):
  * `TabWindowBehavior.tsx` satır 103-128 ve 133-150 arasında `<label>` altında yer alan `<p className="text-sm text-muted-foreground">` açıklamaları form girdilerine (`<Select>` ve `<Switch>`) `aria-describedby` ile bağlı değildir.
  * Form dolaşımı modundaki ekran okuyucu kullanıcısı bu kritik yönlendirme açıklamalarını duyamaz.
* Yeniden Başlatma İletişim Kutusunun İptalinde Erken Durum Değişimi (WCAG 3.3.4 Error Prevention):
  * `UICustomization.tsx` satır 59-62'de radyo butonu tıklandığı anda `setValue("navbarPosition", e.target.value)` ve `setShowRestartModal(true)` birlikte çalışır.
  * Kullanıcı yeniden başlatma modalında "İptal"e bassa bile ayar hafızada çoktan değiştirilmiş kalır; iptal işlemi işlevsiz hale gelir.

### Mimari Çözümler
* Semantik Radyo Grupları:
  * Radyo seçenekleri `<fieldset><legend className="text-base font-medium mb-2">{t("...")}</legend>...</fieldset>` içine alınmalıdır.
* Açıklamaların `aria-describedby` ile Bağlanması:
  * `<Select id="open-new-window-behavior" aria-describedby="open-new-window-desc" ...>` ve `<p id="open-new-window-desc">` eşleşmesi kurulmalıdır.
* Kontrollü Modal Durumu:
  * Yeniden başlatma onaylanana kadar form durumu geçici bir ara değişkende tutulmalı; kullanıcı modalı iptal ettiğinde ayar eski değerine sadık kalmalıdır.

---

## 177. Güncellemeler ve Deneyler Sayfasında (`app/updates/page.tsx` & `ReleaseNotesSettings.tsx`) Sonsuz Dönen İkonun `prefers-reduced-motion` İhlali, Yükleme Durumunun Ekran Okuyucuya Duyurulmaması, Düşük Kontrastlı Kartlar (`opacity-50`) ve Dış Bağlantılarda Yeni Sekme Uyarısı Yokluğu

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/updates/page.tsx`
* `browser-features/pages-settings/src/app/updates/ReleaseNotesSettings.tsx`

### Tespit Edilen Sorunlar
* Sonsuz Dönen Animasyonun Hareket Azaltma İhlali (WCAG 2.2.2 Pause, Stop, Hide - Level A):
  * `app/updates/page.tsx` satır 369-373 ve 475-479'da deneyler yüklenirken `<RefreshCw className={`h-4 w-4 mr-1 ${experimentsLoading ? "animate-spin" : ""}`} />` kullanılır.
  * Bu `animate-spin` CSS sınıfı işletim sisteminde "Hareketi Azalt" (`prefers-reduced-motion: reduce`) seçeneği açık olan kullanıcılarda durdurulmaz. Vestibüler bozukluğu olan kullanıcılar için baş dönmesi ve dikkat dağınıklığı riski oluşturur.
* Yükleme Durumunun Canlı Bölge Olarak Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 380-384 ve 486-490'daki `{t("common.loading")}` mesajları düz bir `<div>` içindedir; `role="status"` ve `aria-live="polite"` tanımlanmamıştır. Kullanıcı "Yenile" butonuna bastığında ekran okuyucu hiçbir geri bildirim vermez.
* Düşük Kontrastlı Devre Dışı Kartlar (WCAG 1.4.3 Contrast Minimum - Level AA):
  * Satır 397-400'de devre dışı bırakılmış deney kartları `opacity-50` sınıfı alır. Bu durum kart üzerindeki metinlerin arka planla kontrastını 2.2:1 seviyesine düşürerek metinleri az gören kullanıcılar için okunamaz hale getirir.
* Dış Bağlantılarda Yeni Sekme Uyarısı Yokluğu (WCAG 3.2.5 Change on Request - Level AAA):
  * `ReleaseNotesSettings.tsx` satır 100-107'deki `RELEASE_NOTES_SUPPORT_URL` bağlantısı `target="_blank"` taşır ancak ekran okuyucuya yeni pencerede açılacağı bildirilmez.

### Mimari Çözümler
* `prefers-reduced-motion` Desteği:
  * `@media (prefers-reduced-motion: reduce) { .animate-spin { animation: none !important; } }` kuralı eklenmeli veya yükleme durumu metin tabanlı statik bir rozetle gösterilmelidir.
* Canlı Durum Yükleme Bildirimi:
  * Yükleme alanına `<div role="status" aria-live="polite">{t("common.loading")}</div>` eklenmelidir.
* Yüksek Kontrastlı Devre Dışı Kart Tasarımı:
  * `opacity-50` yerine metin kontrastını düşürmeyen, kenarlık deseni (kesikli çizgi) ve açık bir "Devre Dışı" metin rozeti içeren tasarım tercih edilmelidir.
* Dış Bağlantı Bildirimi:
  * Bağlantı içine `<span className="sr-only"> ({t("common.opensInNewWindow")})</span>` yerleştirilmelidir.


---

## 178. Modal Alt Sayfası Dinamik Form Yapısında (`pages-modal-child/src/App.tsx`) İlişkilendirilmemiş Etiketler (`htmlFor` ve `id` Yokluğu), Özel Açılır Menüde (`dropdown`) ARIA ve Klavye Desteğinin Sıfır Olması (`role="listbox"`, `aria-haspopup`, `aria-expanded` Yokluğu), Gruplanmamış Radyo Düğmeleri ve Sabit İngilizce Gönder Butonu Metni

İlgili Dosyalar:
* `browser-features/pages-modal-child/src/App.tsx`

### Tespit Edilen Sorunlar
* Giriş Alanları ile İlişkilendirilmemiş Etiketler (WCAG 1.3.1 Info and Relationships - Level A, WCAG 4.1.2 Name, Role, Value - Level A):
  * `FormField` bileşeni içinde metin, URL, sayı, textarea ve seçim alanları (satır 137, 176, 203) için `<label className="...">{item.label}</label>` oluşturulmaktadır. Ancak bu etiketlerde hiçbir `htmlFor` niteliği bulunmamakta, altındaki `<input>`, `<textarea>` veya `<select>` elemanlarında ise hiçbir `id` tanımlanmamaktadır.
  * Bu ayrıklık nedeniyle ekran okuyucular alanlara odaklandığında etiketi okuyamaz; kullanıcı yalnızca "yazma alanı, boş" veya "açılır kutu" geri bildirimi alır, ne yazdığını bilemez.
* Özel Açılır Menüde (`dropdown`) Tam ARIA ve Klavye Dolaşımı Kilitlenmesi (WCAG 2.1.1 Keyboard - Level A, WCAG 4.1.2 Name, Role, Value - Level A):
  * Satır 244-288'deki özel `dropdown` kontrolünde tetikleyici buton yalnızca `<button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}>` şeklindedir; `aria-haspopup="listbox"`, `aria-expanded={dropdownOpen}` ve `aria-controls` niteliklerinden yoksundur.
  * Portalla gövdeye taşınan liste elemanları `<div>`, `<ul>` ve `<li>` etiketleridir; hiçbir `role="listbox"`, `role="option"`, `aria-selected` veya `tabIndex={0}` içermemektedir. Seçim işlemi yalnızca `onClick` ile yapılabilmektedir.
  * Klavyeyle `Tab` basan kullanıcı seçeneklerin hiçbirine odaklanamaz, `Yukarı/Aşağı Ok`, `Enter` veya `Space` tuşlarıyla seçim yapamaz, `Escape` tuşuyla menüyü kapatamaz. Menü klavye ve ekran okuyucu kullanıcıları için tamamen erişilemez durumdadır.
* Semantik Olarak Gruplanmamış Radyo Düğmeleri (WCAG 1.3.1 Info and Relationships - Level A):
  * Satır 336-376 arasındaki `case "radio"` bölümünde radyo düğmeleri bağımsız bir `<label>` ve `<div>` içine serpiştirilmiştir. `<fieldset>` ve `<legend>` ya da `role="radiogroup"` ve `aria-labelledby` bulunmamaktadır. Ekran okuyucu kullanıcıları her bir seçeneğin hangi ayara ait olduğunu duyamaz.
* Sabit Kodlanmış İngilizce Form Gönderme Düğmesi Metni (WCAG 3.1.2 Language of Parts - Level AA):
  * Satır 493'te `{formConfig.submitLabel || "Submit"}` kullanılarak yerelleştirilmemiş sabit İngilizce "Submit" metni fallback olarak verilmiştir. Türkçe arayüz kullanan bir kullanıcıya form butonunun "Gönder" veya "Kaydet" yerine İngilizce "Submit" çıkması dil tutarlılığını bozar.
* Yüksek Kontrast Modunda (`forced-colors`) Odak ve Kenarlık Kaybı (WCAG 1.4.11 Non-text Contrast - Level AA):
  * Gönderme düğmesi `bg-[#0061E0] text-white` stilindedir ve kenarlıksızdır (`border: none`). Windows Yüksek Kontrast modunda arka plan kaldırıldığında butonun sınırları tamamen görünmez hale gelir; `focus:ring-2` Tailwind kutu gölgesi sistemi yüksek kontrastta çizilmez.

### Mimari Çözümler
* Etiket ve Giriş Elemanı Kimlik Eşleştirmesi:
  * Her form öğesi için `const inputId = useId()` veya `item.id` kullanılarak `<label htmlFor={item.id}>{item.label}</label>` ve `<input id={item.id} ... />` bağlantısı kurulmalıdır.
* WAI-ARIA 1.2 Uyumlu Combobox/Listbox Uygulaması:
  * Tetikleyici butona `aria-haspopup="listbox"`, `aria-expanded={dropdownOpen}`, `aria-controls={`${item.id}-listbox`}` verilmelidir.
  * Seçenekler listesine `role="listbox"`, `id={`${item.id}-listbox`}` atanmalı; her `<li>` öğesine `role="option"`, `aria-selected={value === opt.value}`, `tabIndex={0}` ve klavye gezintisi (`onKeyDown` ile Ok Tuşları, Enter, Escape) eklenmelidir. Escape basıldığında menü kapanmalı ve odak tetikleyici butona geri verilmelidir.
* Radyo Düğmelerinin `<fieldset>` ve `<legend>` İle Sarmalanması:
  * Radyo grubu `<fieldset className="mb-4 w-full"><legend className="text-sm font-medium mb-2">{item.label}</legend>...</fieldset>` semantiğine kavuşturulmalıdır.
* Yerelleştirilmiş Gönderme Düğmesi:
  * Arayüz diline uygun Fluent / i18next anahtarı (`t("common.submit", "Kaydet")`) fallback olarak kullanılmalıdır.
* Yüksek Kontrast Odak ve Kenarlık Desteği:
  * Butona `@media (forced-colors: active) { border: 2px solid ButtonText; outline: 2px solid Highlight; }` kuralları eklenmelidir.

---

## 179. Çalışma Alanı Simge Seçici Bileşeninde (`pages-modal-child/src/components/WorkspaceIconPickerField.tsx`) Arama Girişinin Yanıltıcı `aria-label` Değeri, Yüksek Kontrast Modunda (`forced-colors`) Seçim Çerçevesinin Görünmez Olması ve Arama Filtreleme Sonuçlarının Canlı Bölge Olarak Duyurulmaması

İlgili Dosyalar:
* `browser-features/pages-modal-child/src/components/WorkspaceIconPickerField.tsx`

### Tespit Edilen Sorunlar
* Yanıltıcı ve Tekrarlayan Arama Alanı Erişilebilir Adı (WCAG 4.1.2 Name, Role, Value - Level A):
  * Satır 77-78'de simge arama kutusuna `aria-label={fieldLabel}` ve `placeholder={fieldLabel}` atanmıştır.
  * Eğer `fieldLabel` "Çalışma Alanı Simgesi" ise, arama alanının adı da tam olarak "Çalışma Alanı Simgesi" olur. Form kontrolleri arasında gezinen ekran okuyucu kullanıcısı alanın bir arama filtresi mi yoksa simge grubunun kendisi mi olduğunu ayırt edemez. Doğru ad "Çalışma Alanı Simgelerinde Ara" olmalıdır.
* Canlı Filtreleme ve Boş Sonuç Bildiriminin Eksikliği (WCAG 4.1.3 Status Messages - Level AA):
  * Kullanıcı arama kutusuna yazdıkça `visibleOptions` anlık olarak filtrelenir (satır 32-35). Ancak arama kutusunun altında veya grupta hiçbir `role="status"` veya `aria-live="polite"` bölgesi bulunmamaktadır.
  * Eşleşen simge sayısı (örneğin "12 simge bulundu") ya da eşleşme bulunamadığında ("Hiçbir simge bulunamadı") ekran okuyucuya hiçbir bilgi verilmez. Sıfır sonuç durumunda ızgara tamamen boşalır ve görme engelli kullanıcı işlemin takıldığını zanneder.
* Yüksek Kontrast Modunda Seçili Öğenin Görünmez Hale Gelmesi (WCAG 1.4.11 Non-text Contrast - Level AA):
  * Satır 111-114'te seçili simge ile seçilmemiş simge arasındaki fark `displayValue === option.value ? "border-[#0061E0] bg-blue-50" : "border-transparent"` sınıflarıyla sağlanmaktadır.
  * Windows Yüksek Kontrast modunda (`forced-colors: active`) tüm hex arka plan renkleri (`bg-blue-50`) ve özel kenarlık renkleri (`border-[#0061E0]`) sistem paleti tarafından ezilir. `border-transparent` ile `border-[#0061E0]` arasındaki ayrım kaybolur ve kullanıcının hangi simgeyi seçtiği görsel olarak anlaşılamaz.
* Tailwind Odak Halkasının Yüksek Kontrastta Kaybolması:
  * Satır 110'da odak belirtici olarak `peer-focus-visible:ring-2 peer-focus-visible:ring-[#0061E0]` kullanılmıştır. Kutu gölgesi (`box-shadow`) tabanlı bu halkalar yüksek kontrast modunda Windows tarafından devre dışı bırakılır; yalnızca yerel CSS `outline` özellikleri işlenir.

### Mimari Çözümler
* Açıklayıcı ve Yerelleştirilmiş Arama Alanı Adı:
  * Arama kutusuna `aria-label={t("workspace.searchIcons", "Simgelerde ara")}` veya `{`${fieldLabel} içinde ara`}` atanmalıdır.
* Canlı Sonuç Sayacı ve Boş Durum Bildirimi:
  * Arama alanının hemen altına ekran okuyucular için canli bölge eklenmelidir:
    `<div role="status" aria-live="polite" className="sr-only">{visibleOptions.length === 0 ? t("workspace.noIconsFound", "Eşleşen simge bulunamadı") : t("workspace.iconsFound", { count: visibleOptions.length, defaultValue: `${visibleOptions.length} simge bulundu` })}</div>`
* Yüksek Kontrast Seçim ve Odak Stili:
  * Seçili simge kabuğuna `@media (forced-colors: active) { outline: 3px solid Highlight; forced-color-adjust: none; }` kuralı eklenmeli; `peer-focus-visible` için `outline: 2px solid Highlight` tanımlanmalıdır.

---

## 180. İş Akışı İlerleme Alt Uygulamasında (`pages-workflow-progress/src/App.tsx`) Tamamen Sabit İngilizce Metinler, 100ms Sessiz Durum Yoklaması (`setInterval`), 1.8:1 Seviyesindeki Yetersiz Kontrast (`text-zinc-600` / `bg-zinc-950`), Dönen Yükleme İkonunda `prefers-reduced-motion` İhlali ve Kapat Butonunda `aria-label` Eksikliği

İlgili Dosyalar:
* `browser-features/pages-workflow-progress/src/App.tsx`

### Tespit Edilen Sorunlar
* Tamamen Sabit Kodlanmış İngilizce Dil Dizgileri (WCAG 3.1.2 Language of Parts - Level AA):
  * Uygulama içindeki tüm kullanıcı metinleri sabit İngilizce string olarak yazılmıştır:
    * Satır 144: `"Workflow Progress"`
    * Satır 152: `title="Close"` (erişilebilir isim eksik)
    * Satır 171: `"Loading..."`
    * Satır 178: `"No steps"`
    * Satır 248: `"{count} / {total} steps"`
    * Durum rozeti: `"idle"`, `"running"`, `"completed"`, `"error"`
  * Tarayıcı Türkçe veya başka bir dilde çalışırken kullanıcı bu alt uygulamada tamamen İngilizce metinlerle karşılaşır.
* 100 Milisaniyelik Yoklamanın Ekran Okuyucuya Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 58'de `setInterval(fetchProgress, 100)` ile iş akışı durumu sürekli çekilmektedir. Adımların durumu `pending` durumundan `running` ve `completed` durumuna geçerken arayüzde hiçbir `role="status"` veya `aria-live="polite"` bölgesi bulunmamaktadır.
  * Ekran okuyucu kullanıcısı iş akışının hangi adımda olduğunu veya bir hata oluşup oluşmadığını otomatik olarak duyamaz.
* Ağır Kontrast Yetersizliği (WCAG 1.4.3 Contrast Minimum - Level AA, WCAG 1.4.6 Contrast Enhanced - Level AAA):
  * `text-zinc-600` (`#52525b`) rengi koyu arka plan `bg-zinc-950` (`#09090b`) veya `bg-black` üzerinde kullanılmıştır:
    * Satır 110: Bekleyen adım ikonunun dairesi (`text-zinc-600`)
    * Satır 215-217: Bekleyen adımın başlık metni (`text-zinc-600`)
    * Satır 224-226: Fonksiyon ID metni (`text-zinc-600`)
    * Satır 170-178: Yükleme ve Boş adımlar metinleri (`text-zinc-500`)
    * Satır 250: Durum metni (`text-[10px] text-zinc-500`)
  * `#52525b` ile `#09090b` arasındaki kontrast oranı 2.3:1'dir. Bu oran WCAG AA standardı olan 4.5:1'in ve AAA standardı olan 7.0:1'in çok gerisindedir; az gören kullanıcılar için metinler neredeyse görünmezdir. Ayrıca `text-[10px]` yazı boyutu aşırı küçüktür.
* Dönen Animasyonlarda Hareket Azaltma İhlali (WCAG 2.2.2 Pause, Stop, Hide - Level A):
  * Satır 103 ve 170'teki `<Loader2 className="animate-spin" />` ile satır 135'teki `animate-pulse` efektleri, işletim sisteminde "Hareketi Azalt" seçeneğini etkinleştiren kullanıcılar için durdurulmamaktadır.
* Kapat Butonunda `aria-label` Eksikliği (WCAG 4.1.2 Name, Role, Value - Level A):
  * Satır 147-155'teki kapatma butonu yalnızca `title="Close"` niteliği ve iç içe bir SVG ikon taşımaktadır; `aria-label="Kapat"` tanımlanmamıştır. Bazı ekran okuyucular SVG içindeki butonlarda title özniteliğini güvenilir biçimde seslendiremez.

### Mimari Çözümler
* Yerelleştirme Entegrasyonu:
  * Floorp'un merkezi i18n yapısı alt uygulamaya bağlanarak tüm sabit metinler (`t("workflow.title")`, `t("common.close")`, `t("common.loading")`, `t("workflow.noSteps")`) çevrilebilir hale getirilmelidir.
* Adım Durumları İçin Canlı Bölge Bildirimi:
  * Aktif adım değişimlerini izleyen bir `aria-live="polite"` bölgesi kurulmalı; durum değiştiğinde `"Adım 2: [Adım Adı] yürütülüyor"`, `"İş akışı tamamlandı"` veya `"Hata oluştu: [Hata Metni]"` şeklinde anlık duyuru yapılmalıdır.
* Renk Kontrastı ve Yazı Boyutu Düzeltmesi:
  * Pasif ve ikincil metin renkleri en az `#a1a1aa` (zinc-400, kontrast oranı 6.5:1) veya `#d4d4d8` (zinc-300, 10.5:1) seviyesine çekilmelidir. En küçük yazı boyutu 12px (`text-xs`) altına düşürülmemelidir.
* `prefers-reduced-motion` Uyumu:
  * `@media (prefers-reduced-motion: reduce) { .animate-spin, .animate-pulse { animation: none !important; } }` kuralı globals.css içine eklenmelidir.
* Kapat Butonuna Erişilebilir İsim:
  * Butona `aria-label={t("common.close", "Kapat")}` eklenmeli ve klavye odak halkası belirginleştirilmelidir.

---

## 181. Floorp IP Koruma Bildirim ve Arayüz Sisteminde (`FloorpIPProtectionDisclosure.sys.mts` & `FloorpIPProtectionUI.sys.mts`) Japonca Dışındaki Tüm Dillerin (Türkçe Dahil) Sabit İngilizceye Zorlanması, Fluent `data-l10n-id` Niteliklerinin Zorla Silinmesi ve Çevrilemez Cümle Parçası Birleştirmeleri

İlgili Dosyalar:
* `browser-features/modules/modules/ipprotection/FloorpIPProtectionDisclosure.sys.mts`
* `browser-features/modules/modules/ipprotection/FloorpIPProtectionUI.sys.mts`

### Tespit Edilen Sorunlar
* Japonca Dışındaki Tüm Dünya Dillerinin Sabit İngilizceye Kilitlenmesi (WCAG 3.1.2 Language of Parts - Level AA):
  * `FloorpIPProtectionDisclosure.sys.mts` satır 146-153'teki `resolveFloorpIPProtectionDisclosureStrings(locale)` fonksiyonu incelendiğinde:
    `return locale.toLowerCase() === "ja" || locale.toLowerCase().startsWith("ja-") ? JAPANESE_STRINGS : ENGLISH_STRINGS;`
  * Sistemde Türkçe (`tr-TR`), Almanca (`de-DE`), Fransızca (`fr-FR`), İspanyolca (`es-ES`) vb. onlarca dil paketi bulunmasına rağmen, Floorp IP Koruması yalnızca Japonca kontrolü yapmakta ve diğer tüm dillerde doğrudan `ENGLISH_STRINGS` döndürmektedir.
* Fluent Yerelleştirme Niteliklerinin Zorla Silinmesi (Localization Regression):
  * `FloorpIPProtectionUI.sys.mts` satır 262, 277, 278 ve 279'da Gecko'nun yerel bileşenleri üzerindeki Fluent yerelleştirme nitelikleri bilinçli olarak silinmektedir:
    `title.removeAttribute("data-l10n-id"); footer.removeAttribute("data-l10n-id"); terms.removeAttribute("data-l10n-id"); privacy.removeAttribute("data-l10n-id");`
  * Bu silme işlemi Mozilla Gecko'nun dahili `.ftl` yerelleştirme motorunu devre dışı bırakmakta ve yukarıdaki hata nedeniyle arayüzü tamamen İngilizce metinlerle ezmektedir.
* Katı ve Dil Bilgisine Aykırı Cümle Birleştirme (WCAG 3.1.2 Language of Parts - Level AA):
  * Satır 280-297'de Kullanım Koşulları ve Gizlilik Bildirimi altbilgisi şu şekilde kodlanmıştır:
    `${strings.termsPrefix}${strings.termsOfUse}${strings.termsConjunction}${strings.privacyNotice}${strings.termsSuffix}`
  * İngilizce sözdizimine göre `By clicking you agree to the [Terms] and [Privacy Policy].` kalıbı; Türkçe gibi nesnesi ve yüklemi farklı konumlanan dillerde eklemeli yapıya uymayarak gramer hatalarına ve anlaşılmaz metinlere yol açar. Cümle parçaları ayrık düğümler olarak değil, yerelleştirme dosyasında tek bir parametrik kalıp olarak yönetilmelidir.
* Sessiz Başarısızlık ve Görünmez Eleman Koruma Stili:
  * Satır 19-32'deki `GUARD_STYLES` kuralında, `data-floorp-ipprotection-ready="true"` niteliği atanana kadar buton ve panel `visibility: hidden !important; pointer-events: none !important;` ile gizlenmektedir. Modülün başlatılmasında veya gölge kök (shadow DOM) enjeksiyonunda gecikme veya hata olduğunda buton sessizce görünmez kalır; ekran okuyucu kullanıcısına hiçbir hata veya durum bilgisi iletilmez.

### Mimari Çözümler
* Evrensel Dil Çözümleyicisi:
  * `resolveFloorpIPProtectionDisclosureStrings` fonksiyonu yalnızca `ja` kontrolü yapmak yerine, Floorp'un `i18n` klasöründeki tüm dilleri dinamik olarak çözümlemeli veya sistem varsayılan yerelini Fluent motoru üzerinden almalıdır.
* Fluent `data-l10n-id` Altyapısının Korunması:
  * Nitelikler `removeAttribute` ile silinmemeli; Gecko'nun `document.l10n.setAttributes()` API'si kullanılarak yerelleştirme motorunun doğal yaşam döngüsü korunmalıdır.
* Bütüncül Parametrik Yerelleştirme Dizgisi:
  * Altbilgi metni tek bir dize olarak tanımlanmalı (örn: `floorp-ipprotection-terms-footer = { $prefix }<a data-l10n-name="terms">{ $terms }</a>{ $conjunction }<a data-l10n-name="privacy">{ $privacy }</a>{ $suffix }`), sözdizimi ayrıştırması her dilin kendi dilbilgisi kuralına bırakılmalıdır.
* Erişilebilir Yükleme ve Hata Geri Bildirimi:
  * Başlatma sırasında `visibility: hidden` yerine `aria-busy="true"` ve yükleme tamamlandığında canlı bölge duyurusu uygulanmalıdır.

---

## 182. Chrome Web Mağazası Entegrasyon Aktöründe (`NRChromeWebStoreChild.sys.mts`) Enjekte Edilen Eklenti Butonunda `:focus-visible` Odak Çerçevesinin Olmaması, Yükleme Sırasında Butonun `disabled` Yapılarak Klavye Odağının `body`'ye Düşürülmesi ve Sabit Konumlu Hata Bildiriminin (`floorp-cws-error`) Canlı Bölge Bildiriminden Yoksun Olması

İlgili Dosyalar:
* `browser-features/modules/actors/NRChromeWebStoreChild.sys.mts`

### Tespit Edilen Sorunlar
* Odak Çerçevesi Yokluğu (WCAG 2.4.7 Focus Visible - Level AA):
  * `injectStyles()` metodu içindeki `.floorp-add-button` CSS tanımlarında (satır 521-540) hiçbir `:focus-visible` veya `:focus` kuralı bulunmamaktadır.
  * Klavyeyle `Tab` tuşuna basarak sayfada gezinen kullanıcı "Floorp'a Ekle" butonuna geldiğinde butonun etrafında hiçbir görsel odak halkası oluşmaz. Mavi zemin (`#0b57d0`) üzerinde tarayıcının varsayılan ince halkası seçilemez.
* Butonun `disabled` Edilmesiyle Klavye Odağının Kaybolması (WCAG 2.4.3 Focus Order - Level A):
  * Satır 1043, 1053, 1063 ve 1071'de durum geçişlerinde `(button as HTMLButtonElement).disabled = true;` uygulanmaktadır.
  * Klavyeyle butona odaklanıp `Enter` veya `Space` basan kullanıcı eklenti yükleme sürecini başlattığında, buton `disabled` olduğu an tarayıcı odağı doğrudan `document.body`'ye (sayfanın en tepesine) fırlatır. Kullanıcı klavye dolaşım bağlamını tamamen kaybeder.
* Hata Bildiriminde Canlı Bölge ve Odak Yönetimi Eksikliği (WCAG 4.1.3 Status Messages - Level AA, WCAG 3.3.1 Error Identification - Level A):
  * Eklenti yüklemesi başarısız olduğunda `showError()` metodu (satır 1224-1282) sayfaya `#floorp-cws-error` bildirim kutusu ekler. Bu kutu düz bir `<div>` olup `role="alert"` veya `aria-live="assertive"` niteliği taşımaz.
  * Eklenti yükleme hatası oluştuğunda ekran okuyucu kullanıcısına hiçbir bildirim gitmez; kullanıcı eklentinin yüklendiğini zanneder.
  * Kapat butonuna basıldığında (`notice.remove()`) odak "Floorp'a Ekle" butonuna iade edilmez, odak yine gövdede kaybolur.
* 10 Saniyelik Zaman Aşımının Kontrol Edilememesi (WCAG 2.2.1 Timing Adjustable - Level A):
  * Hata uyarısı 10 saniye sonra (`ERROR_NOTICE_TIMEOUT = 10000`) kullanıcıya hiçbir uzatma veya dondurma imkanı verilmeden DOM'dan silinir (`notice.remove()`). Az gören veya yavaş okuyan kullanıcılar hata mesajını okuyamadan uyarı kaybolur.
* Dönen Animasyonda `prefers-reduced-motion` İhlali (WCAG 2.2.2 Pause, Stop, Hide - Level A):
  * Satır 588-599'daki `floorp-spin` ve satır 619-625'teki `floorp-slide-in` CSS animasyonları işletim sistemi hareket azaltma tercihlerini dikkate almaz.

### Mimari Çözümler
* Görünür ve Yüksek Kontrastlı Odak Halkası:
  * CSS içine `.floorp-add-button:focus-visible { outline: 3px solid #0061E0; outline-offset: 2px; }` ve `@media (forced-colors: active) { .floorp-add-button:focus-visible { outline: 3px solid Highlight; } }` eklenmelidir.
* Odak Kaybını Önleyen `aria-disabled` Yaklaşımı:
  * Yükleme esnasında HTML `disabled` özelliği yerine `aria-disabled="true"` ve `aria-busy="true"` kullanılmalı; buton klavye odaklanabilirliğini korurken mükerrer tıklamalar kod içindeki bayrakla engellenmelidir.
* Erişilebilir Hata Uyarısı (`role="alert"`):
  * Bildirim kutusuna `notice.setAttribute("role", "alert"); notice.setAttribute("aria-live", "assertive");` eklenmelidir.
  * Kapat butonu tetiklendiğinde odak ana butona geri döndürülmelidir (`button.focus()`).
* Zaman Aşımının Durdurulabilmesi:
  * Fare kutu üzerine geldiğinde veya kutu klavye odağı aldığında (`focusin` / `mouseenter`) zaman aşımı sayacı durdurulmalı (`clearTimeout`), kullanıcı ayrıldığında yeniden başlatılmalıdır.
* Hareket Azaltma Desteği:
  * `@media (prefers-reduced-motion: reduce) { .floorp-add-button__spinner { animation: none !important; } .floorp-cws-notice { animation: none !important; } }` tanımlanmalıdır.

---

## 183. WebScraper Vurgulama ve Denetim Yöneticisinde (`HighlightManager.ts`) Otomatik Kazıma Bindirmesinde Sabit Japonca Metin ("Floorp が操作中..."), Ekran Okuyucu Canlı Bölge Bildiriminin Bulunmaması ve CSS `pointer-events: none` Nedeniyle Klavye Odağının Arka Plana Sızması

İlgili Dosyalar:
* `browser-features/modules/actors/webscraper/HighlightManager.ts`

### Tespit Edilen Sorunlar
* Sabit Kodlanmış Japonca Metin (WCAG 3.1.2 Language of Parts - Level AA):
  * `showControlOverlay()` metodunda (satır 963-965) otomatik kazıma bindirmesi oluşturulurken:
    `const label = doc.createElement("div"); label.className = "nr-webscraper-control-overlay__label"; label.textContent = "Floorp が操作中...";`
  * Kod içinde `this.translationHelper` nesnesi tanımlı olmasına rağmen kullanılmamış, tüm dünya kullanıcılarına sabit Japonca "Floorp が操作中..." (Floorp işlem yürütüyor...) metni zorunlu kılınmıştır.
* Ekran Okuyucu Durum Bildiriminin Bulunmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Bu bindirme tarayıcı web sayfası üzerinde otomatik form doldurma veya veri çekme işlemi yaparken kullanıcı etkileşimini kısıtlar. Ancak `label` veya `overlay` elemanında hiçbir `role="status"`, `aria-live="assertive"` veya `aria-busy="true"` bulunmamaktadır.
  * Ekran okuyucu kullanan bir görme engelli, tarayıcının o anda sayfayı otomatik olarak kontrol ettiğinden tamamen habersizdir.
* `pointer-events: none` Nedeniyle Klavye Odağının Arka Plana Sızması (WCAG 2.1.2 No Keyboard Trap & Incomplete Interaction Barrier):
  * Satır 998 ve 1005'te yazar `body.style.setProperty("pointer-events", "none", "important")` uygulayarak farenin sayfaya tıklamasını engellemiş, ancak JavaScript olay dinleyicilerine gerek kalmadığını düşünerek `this.controlOverlayHandlers = null;` bırakmıştır.
  * CSS `pointer-events: none` kuralı YALNIZCA fare işaretçisini engeller! `Tab`, `Shift+Tab`, `Enter` ve `Space` gibi klavye tuşlarını ve ekran okuyucu sanal imlecini kesinlikle engellemez!
  * Görme engelli veya klavye kullanıcısı `Tab` tuşuna basarak bindirmenin arkasında kalan butonlara ve form alanlarına odaklanabilir, `Enter` basarak veri gönderebilir ve Floorp'un otomatik kazıma işlemiyle çakışarak form durumunu bozabilir.

### Mimari Çözümler
* `TranslationHelper` İle Çok Dilli Metin:
  * `label.textContent = this.translationHelper.t("webscraper.overlay.operating", "Floorp işlem yürütüyor...");` entegrasyonu yapılmalıdır.
* Canlı Durum ve Erişilebilir Meşgul Bildirimi:
  * Etikete `label.setAttribute("role", "status"); label.setAttribute("aria-live", "assertive");` eklenmeli; sayfanın ana gövdesine işlem süresince `doc.body.setAttribute("aria-busy", "true")` tanımlanmalıdır.
* Klavye Olaylarının ve Sanal İmlecin Engellenmesi:
  * Bindirme aktifken `window.addEventListener("keydown", blockKeyboard, true)` ve `window.addEventListener("focus", trapFocus, true)` kurularak klavye odağının arka plandaki interaktif öğelere sızması engellenmeli veya odak bindirme etiketi üzerinde tutulmalıdır (`overlay.tabIndex = -1; overlay.focus()`).

---

## 184. Fare Hareketi Kaydırma İstemcisinde (`NRMouseGestureScrollChild.sys.mts`) Sabit `smooth` Kaydırma Davranışının `prefers-reduced-motion` Standardını Çiğnemesi ve Sayfa Başına/Sonuna Kaydırmalarda Odak Elemanının Desenkronize Olması

İlgili Dosyalar:
* `browser-features/modules/actors/NRMouseGestureScrollChild.sys.mts`

### Tespit Edilen Sorunlar
* Sabit Düzgün Kaydırmanın Hareket Azaltma İhlali (WCAG 2.3.3 Animation from Interactions - Level AAA):
  * `executeScroll` fonksiyonunda (satır 36) `const BEHAVIOR = "smooth";` sabit değeri tanımlanmıştır.
  * Bu değer `lineUp`, `lineDown`, `pageUp`, `pageDown` ve özellikle binlerce piksel atlayan `toTop` ve `toBottom` hareketlerinde (satır 72 ve 79) işletim sistemindeki `prefers-reduced-motion: reduce` ayarını denetlemeden sayfayı zorla animasyonlu olarak kaydırmaktadır.
  * Vestibüler sistem bozukluğu, hareket hastalığı veya odaklanma problemi yaşayan kullanıcılar için animasyonlu uzun kaydırmalar baş dönmesi, göz yorgunluğu ve yön kaybına neden olur.
* Sayfa Başına ve Sonuna Kaydırmalarda Odak Elemanı Desenkronizasyonu:
  * Fare hareketiyle sayfa en alta (`toBottom`) veya en üste (`toTop`) kaydırıldığında görünüm alanı (viewport) taşınır ancak klavye odak elemanı (`document.activeElement`) sayfanın ortasında veya görünmeyen bir yerinde kalır.
  * Kullanıcı daha sonra `Tab` veya yön tuşlarına bastığında tarayıcı görünüm alanını aniden eski odak noktasına geri fırlatarak (abrupt viewport snapping) görsel karmaşaya ve kullanıcının sayfadaki konumunu kaybetmesine yol açar.

### Mimari Çözümler
* Dinamik Hareket Azaltma Algılaması:
  * Kaydırma davranışı kullanıcının tercihlerine göre belirlenmelidir:
    ```ts
    const prefersReducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const BEHAVIOR: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    ```
* Kaydırma Sonrası Odak Senkronizasyonu:
  * `toTop` işlemi sonrasında odak sayfa başındaki atlama bağlantısına (skip-link) veya ana başlığa taşınmalı; `toBottom` sonrasında görünüm dışı kalan eski odak elemanının odağı güvenli şekilde temizlenmelidir.

---

## 185. Eklenti Mağazası Üst Süreç Aktöründe (`NRPluginStoreParent.sys.mts`) Sahte Rastgele Sürüm Üretimi (`Math.random()`), Çevrimdışı Yerel Arka Plan Servisine (`localhost:8081`) Kontrolsüz Yönlendirme ve Ekran Okuyucuya Duyurulmayan Yeni Sekme Geçişi

İlgili Dosyalar:
* `browser-features/modules/actors/NRPluginStoreParent.sys.mts`

### Tespit Edilen Sorunlar
* Sahte Rastgele Sürüm Numarası Üretimi (Anayasa Bölüm 2 Madde 25: Sahte Başarı ve Sahte Dönüş Yasağı):
  * Satır 133-138'deki `getFloorpVersion()` metodu incelendiğinde:
    `const randomVersion = `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}`; return { version: randomVersion };`
  * Gerçek `Services.appinfo.version` okunmak yerine her çağrıda tamamen rastgele (örneğin "12.87.4" ya da "3.11.95") bir sürüm dizesi üretilmektedir.
  * Eklenti mağazası Floorp minimum sürüm kontrolü (örn. >= 12.0.0) yaptığında, kullanıcı güncel bir Floorp kullanıyor olsa dahi rastgele üretilen düşük sürüm yüzünden eklenti yüklemesi engellenecek ve ekran okuyucuya tutarsız, teşhis edilemez hata bildirimleri gidecektir.
* Çevrimdışı HTTP Servisine Yönlendirmede Sessiz Çökme ve Erişilebilir Geri Bildirim Eksikliği:
  * Satır 165-214 arasında eklenti yükleme isteği doğrudan `http://localhost:8081/install-plugin` adresini yeni sekmede açmaktadır (`openTrustedLinkIn(frontendUrl, "tab")`).
  * Ancak yerel Sapphillon daemon servisi çalışmıyorsa veya çökmüşse, kullanıcı aniden "Bağlantı Kurulamadı / Sayfa Bulunamadı" şeklinde ölü bir ağ hatası sekmesine yönlendirilir. Kullanıcıya servisin başlatılması gerektiğine dair erişilebilir bir hata uyarısı veya durum iletisi sunulmaz.
* Ekran Okuyucuya Duyurulmayan Yeni Sekme Geçişi (WCAG 3.2.5 Change on Request - Level AAA):
  * Mağaza sayfasında "Yükle" butonuna tıklandığında kullanıcının isteği dışında ve önceden bir bildirim verilmeden yeni bir sekme açılarak odağın o sekmeye aktarılması bilişsel engeli olan kullanıcılar ve ekran okuyucular için ani bağlam değişikliği oluşturur.

### Mimari Çözümler
* Gerçek Sürüm Numarasının Alınması:
  * Sahte `Math.random()` kodu silinmeli; `Services.appinfo.version` kullanılarak tarayıcının gerçek sürümü döndürülmelidir.
* Servis Sağlık Denetimi ve Hata Bildirimi:
  * Yeni sekme açılmadan önce arka plan servisinin çalışıp çalışmadığı (`localhost:8081/health`) asenkron olarak sorgulanmalı; servis kapalıysa kullanıcıya ekran okuyucu uyumlu bir diyalog veya bildirim ile "Floorp OS servisi çalışmıyor, lütfen ayarlardan başlatın" mesajı verilmelidir.
* Yeni Sekme Açılacağı Bilgisinin Sağlanması:
  * Mağazadaki işlem butonuna `aria-description="Yeni sekmede açılır"` eklenmeli ve sekme açıldığında durum açıkça duyurulmalıdır.

---

## 186. Ekran Paylaşım Modu Bileşeninde (`browser-share-mode.tsx` & `share-mode.css`) Sabit İngilizce Menü Metni, Seçilmemiş Sekmelerin `display: none !important` ile Gizlenerek Ekran Okuyucu İsimlerinin Yok Edilmesi ve 1.3:1 Kontrast Oranına Sahip Açık Yeşil Metin (`lightgreen`)

İlgili Dosyalar:
* `browser-features/chrome/common/browser-share-mode/browser-share-mode.tsx`
* `browser-features/chrome/common/browser-share-mode/share-mode.css`

### Tespit Edilen Sorunlar
* Sabit Kodlanmış İngilizce Menü Öğesi Metni (WCAG 3.1.2 Language of Parts - Level AA):
  * `browser-share-mode.tsx` satır 18-26'da yer alan bağlam menüsü öğesi:
    `<xul:menuitem label="Toggle Share Mode" type="checkbox" id="toggle_sharemode" accesskey="S" ... />`
  * `label` metni doğrudan sabit İngilizce "Toggle Share Mode" olarak verilmiştir; Fluent veya i18n yerelleştirme anahtarı kullanılmamıştır.
* Seçilmemiş Sekme İçeriklerinin `display: none !important` İle Ekran Okuyuculardan Silinmesi (WCAG 4.1.2 Name, Role, Value - Level A):
  * `share-mode.css` satır 17-20'de gizlilik sağlamak amacıyla şu kural uygulanmıştır:
    `.tab-content:not([selected="true"]), .tab-background:not([selected="true"]) { display: none !important; }`
  * Gecko XUL yapısında `.tab-content`, sekmenin başlığını (`.tab-label`), simgesini ve kapatma butonunu barındırır. CSS `display: none` uygulandığında, sekme DOM'da var olmaya devam etmesine rağmen ekran okuyucular için tüm erişilebilir içeriği (Accessible Name) tamamen silinir. Ekran okuyucu kullanıcısı sekme çubuğunda gezinirken seçili olmayan sekmeleri adsız, boş düğmeler olarak duyar.
* Yetersiz Renk Kontrastı (WCAG 1.4.3 Contrast Minimum - Level AA):
  * `share-mode.css` satır 31-38'de `#fxa-toolbar-menu-button` butonu için:
    `color: lightgreen !important; border: solid 2px green;`
  * Açık yeşil (`lightgreen` - `#90ee90`) metin rengi, standart açık temalı tarayıcı arka planlarında (beyaz veya açık gri) yalnızca 1.3:1 kontrast oranına sahiptir. Metin az gören kullanıcılar için tamamen okunamazdır.
* CSS `:before` İle Sabit İngilizce Metin Enjeksiyonu:
  * Satır 40-46'da `content: "Share Mode";` kuralıyla butona sözde eleman üzerinden sabit İngilizce metin basılmaktadır. Bu metin yerelleştirilemez ve ekran okuyucu uyumluluğu belirsizdir.
* Araç Çubuklarının Ani Yok Edilmesiyle Odak Kaybı (WCAG 2.4.3 Focus Order - Level A):
  * Satır 5-20'de `#PersonalToolbar`, `#downloads-button`, `#sidebar-box` gibi temel bileşenler `display: none !important` ile gizlenir. Kullanıcı odağı bu butonlardan birindeyken Paylaşım Modu açıldığında odak aniden kök belgeye düşer.

### Mimari Çözümler
* Yerelleştirilmiş Menü Öğesi:
  * Menü öğesine `data-l10n-id="floorp-share-mode-toggle"` eklenmeli ve dil paketleriyle uyumlu hale getirilmelidir.
* Görsel Gizleme İçin Opaklık ve Bulanıklık Kullanımı:
  * Sekme başlıklarını `display: none` ile erişilebilirlik ağacından silmek yerine, ekran paylaşımında gizlemek için görsel gizleme teknikleri (örneğin CSS `filter: blur(8px)` veya `opacity: 0` ile `aria-label` değerini koruma) kullanılmalıdır.
* Standartlara Uygun Renk Kontrastı:
  * `lightgreen` yerine açık temada en az 4.5:1 kontrast sağlayan koyu yeşil (`#166534`), koyu temada ise yüksek kontrastlı yeşil (`#4ade80`) kullanılmalıdır.
* Durum Değişikliği Canlı Bölge Bildirimi:
  * Mod açılıp kapandığında `aria-live="polite"` ile "Ekran Paylaşım Modu Açıldı / Kapatıldı" duyurusu yapılmalıdır.

---

## 187. Sekme URL Satır İçi Düzenleyicisinde (`tab-inline-edit/controller.ts`) Giriş Alanının Hangi Sekmeye Ait Olduğunu Bildirmemesi (`aria-label="Tab URL"`), Başarısız Yönlendirmelerde Sessiz Kapanma ve Yüksek Kontrast Odak Halkası Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/tab-inline-edit/controller.ts`

### Tespit Edilen Sorunlar
* Eksik ve Bağlamdan Yoksun Erişilebilir İsim (WCAG 4.1.2 Name, Role, Value - Level A):
  * `createInput` ve `updateInputLocalizedLabel` fonksiyonlarında (satır 512-519) oluşturulan düzenleme metin kutusuna sabit `aria-label="Tab URL"` ve `placeholder="Tab URL"` atanmaktadır.
  * Kullanıcı açık olan 20 sekme arasından örneğin "GitHub" sekmesini düzenlerken bu alan açıldığında, ekran okuyucu yalnızca "Sekme URL'si, metin kutusu" okur. Hangi sekmenin URL'sinin düzenlendiği (örneğin "GitHub için Sekme URL'sini Düzenle") bilgisi verilmez.
* Başarısız Yönlendirmelerde Sessiz Kapanma ve Hata Bildirimi Yokluğu (WCAG 3.3.1 Error Identification - Level A, WCAG 4.1.3 Status Messages - Level AA):
  * Satır 714'te kullanıcı `Enter` tuşuna bastığı anda `this.closeEditor(true)` çağrılarak düzenleme alanı derhal kapatılır. Ardından `navigateFromInput` asenkron olarak çalışır (satır 718-751).
  * Kullanıcı geçersiz bir URL girdiğinde veya adres çözümlemesi başarısız olduğunda işlem sessizce `return;` yapar veya sadece konsola hata basar (`console.error`).
  * Düzenleme alanı kapanmış, ancak sekme yeni adrese gitmemiştir. Ekran okuyucu kullanıcısına hiçbir hata mesajı veya durum bildirimi iletilmez; kullanıcı işlemin başarılı olduğunu zanneder.
* Yüksek Kontrast Modunda (`forced-colors`) Odak Belirteci Eksikliği:
  * Satır 495-507'deki giriş kutusu stilinde `border: 1px solid var(--focus-outline-color, AccentColor)` ve `box-shadow` tanımlanmıştır.
  * Windows Yüksek Kontrast modunda kutu gölgeleri işlenmez. Giriş alanına özel bir `:focus-visible` veya `outline` tanımlanmadığı için az gören kullanıcılar düzenleme alanının sınırlarını ve odak durumunu ayırt etmekte zorlanır.
* Bağlam Menüsü Öğesinde Hızlı Erişim Tuşu (`accesskey`) Eksikliği:
  * Satır 436-440'ta oluşturulan `floorp-tab-inline-url-editor-context-item` menü öğesine hiçbir `accesskey` tanımlanmamıştır. Firefox sekme bağlam menüsündeki tüm standart öğeler (Yenile: R, Sekmeyi Çoğalt: D vb.) kısayol tuşuna sahipken bu öğede tuş bulunmaması klavye kullanımını yavaşlatır.

### Mimari Çözümler
* Sekme Başlığını İçeren Dinamik Erişilebilir İsim:
  * Düzenleyici açıldığında hedef sekmenin başlığı alınmalı ve `input.setAttribute("aria-label", t("tabInlineEdit.inputLabelWithTab", { title: targetTab.label, defaultValue: `${targetTab.label} için sekme adresini düzenle` }))` şeklinde dinamik ad verilmelidir.
* Başarısız İşlemlerde Kullanıcı Geri Bildirimi:
  * URL geçersiz olduğunda düzenleyici sessizce kapatılmamalı; `aria-invalid="true"` atanarak hata mesajı canlı bölgeyle bildirilmeli veya başarısızlık durumunda bildirim çubuğu (notification box) tetiklenmelidir.
* Yüksek Kontrast Modu ve Odak Uyumu:
  * CSS içine `@media (forced-colors: active) { #floorp-tab-inline-url-editor:focus { outline: 2px solid Highlight; } }` kuralı eklenmelidir.
* Menü Öğesine Hızlı Erişim Tuşu Atanması:
  * Menü öğesine çakışmayan bir erişim tuşu (`item.setAttribute("accesskey", "E")`) tanımlanmalıdır.

---

## 188. OS Ön Uç Yöneticisinde (`OSFrontEndManager.sys.mts`) İlerleme Penceresinde `titlebar=no` Nedeniyle Standart Klavye Sistem Menüsünün Kırılması, Zorla Üstte Kalma (`alwaysontop`) ve 100ms Döngüsel Konumlandırma İle Kullanıcı Pencere Yönetiminin Engellenmesi

İlgili Dosyalar:
* `browser-features/modules/modules/os-automotor/OSFrontEndManager.sys.mts`

### Tespit Edilen Sorunlar
* Başlık Çubuğunun Kaldırılması Nedeniyle Standart Klavye Sistem Menüsünün Kırılması (WCAG 2.1.1 Keyboard - Level A):
  * `openProgressWindow()` metodunda (satır 121-138) pencere özellikleri oluşturulurken:
    `const windowFeatures = ["chrome", "titlebar=no", "close", "dialog", "alwaysontop", "alwaysRaised", ...].join(",");`
  * `titlebar=no` parametresi işletim sisteminin yerel başlık çubuğunu ve pencere kontrollerini tamamen yok eder. Windows üzerinde `Alt+Space` tuş kombinasyonuyla açılan standart pencere sistem menüsü (Taşı, Yeniden Boyutlandır, Simge Durumuna Küçült, Kapat) çalışmaz hale gelir.
  * Fiziksel engeli nedeniyle fare kullanamayan ve pencere yönetimini yalnızca klavye ile yürüten kullanıcılar pencereyi taşıyamaz ve yönetemez.
* Zorla En Üstte Kalma ve Görsel İçerik Kapatma (`alwaysontop` / `alwaysRaised`):
  * Pencereye zorunlu olarak `alwaysontop` ve `alwaysRaised` özellikleri atanmıştır. Ekran büyütücü (magnifier) kullanan veya düşük çözünürlüklü ekrana sahip az gören kullanıcılar için bu pencere diğer tüm uygulamaların ve açık pencerelerin üzerine yapışarak içeriği kapatır.
* 100 Milisaniyelik Döngü İle Kullanıcı Pencere Konumlandırmasının Ezilmesi:
  * Satır 165-178 arasında yer alan `forcePosition` fonksiyonu:
    `const forcePosition = () => { win.moveTo(targetLeft, targetTop); win.resizeTo(realWidth, realHeight); }; const intervalId = setInterval(forcePosition, 100); setTimeout(() => clearInterval(intervalId), 1000);`
  * Pencere açıldıktan sonra 1 saniye boyunca her 100 milisaniyede bir zorla sağ üst köşeye taşınır ve tam ekran yüksekliğine zorlanır.
  * Özel pencere yöneticisi (PowerToys FancyZones, tiling window managers) veya ekran bölme araçları kullanan kullanıcıların pencereyi konumlandırma girişimleri bu döngü tarafından ezilerek titremelere ve erişilebilirlik araçlarıyla çatışmaya yol açar.

### Mimari Çözümler
* Standart Başlık Çubuğunun ve Klavye Sistem Menüsünün Korunması:
  * `titlebar=no` kaldırılmalı; pencere standart başlık çubuğu ve pencere kontrolleriyle açılarak `Alt+Space` sistem menüsü erişilebilirliği garanti edilmelidir.
* Kullanıcı Tercihli "Her Zaman Üstte" Ayarı:
  * `alwaysontop` ve `alwaysRaised` sabit kodlanmak yerine kullanıcı tercihine (`Services.prefs`) bağlanmalı; varsayılan olarak diğer pencereleri engellemeyecek şekilde standart modda açılmalıdır.
* Zorlayıcı Konumlandırma Döngüsünün Kaldırılması:
  * 100 milisaniyelik `setInterval` zorlaması kaldırılmalı; pencere ilk açılışta bir kez konumlandırılmalı, kullanıcının pencereyi istediği ekrana ve konuma taşımasına izin verilmelidir.


---

## 189. Çalışma Alanları Araç Çubuğu Butonunda (`popup-block-element.tsx`) Sürükle-Bırak Yeniden Sıralamanın Alternatifsiz Olması (Klavye Desteği Yokluğu), Seçili Durumun Özel `data-selected` İle Gizlenerek Ekran Okuyuculara `aria-selected` / `aria-current` Olarak Sunulmaması

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/popup-block-element.tsx`

### Tespit Edilen Sorunlar
* Sürükle-Bırak Hareketi İçin Klavye veya Menü Alternatifinin Bulunmaması (WCAG 2.5.7 Dragging Movements - Level AA):
  * `PopupToolbarElement` bileşeni içinde (satır 22-77, 100-105) çalışma alanlarının sırasını değiştirmek için yalnızca fareye dayalı HTML5 sürükle-bırak API'si (`draggable="true"`, `onDragStart`, `onDragOver`, `onDrop`) kullanılmıştır.
  * Klavyeyle `Tab` tuşuyla butona odaklanan veya ekran okuyucu kullanan bir kullanıcının çalışma alanını yukarı veya aşağı taşıyabileceği hiçbir klavye kısayolu (örn: `Ctrl+Yukarı/Aşağı Ok`) veya tek noktalı erişim alternatifi araç çubuğu üzerinde sunulmamaktadır.
* Seçili Çalışma Alanı Durumunun Ekran Okuyuculardan Gizlenmesi (WCAG 4.1.2 Name, Role, Value - Level A):
  * Satır 96'da aktif olan çalışma alanını belirtmek için yalnızca özel veri niteliği kullanılmıştır:
    `data-selected={props.isSelected}`
  * `data-selected` özel bir niteliktir; erişilebilirlik API'leri (MSAA, IAccessible2, UI Automation) bu niteliği tanımaz. Butonda hiçbir `aria-current="page"`, `aria-selected="true"` veya `aria-pressed="true"` tanımlanmamıştır.
  * Ekran okuyucu kullanıcısı araç çubuğundaki butonlar arasında dolaşırken "Çalışma Alanı 1, düğme", "Çalışma Alanı 2, düğme" anonslarını duyar; hangi çalışma alanının o anda ekranda açık olduğunu anlayamaz.
* Taşıma Sonrasında Canlı Bölge Bildiriminin Eksikliği (WCAG 4.1.3 Status Messages - Level AA):
  * Fareyle taşıma yapıldığında `props.ctx.reorderWorkspaceTo()` çalışır ancak çalışma alanının yeni sıra konumu (örneğin "Çalışma Alanı 2, 1. sıraya taşındı") ekran okuyucuya duyurulmaz.

### Mimari Çözümler
* Klavyeyle Sıralama Desteği:
  * Butona `onKeyDown` dinleyicisi eklenmeli; `Alt+Shift+Yukarı Ok` ve `Alt+Shift+Aşağı Ok` (veya sol/sağ ok) tuşlarına basıldığında çalışma alanı bir önceki veya sonraki sıraya kaydırılmalıdır.
* Semantik Durum Tanımı:
  * Butona `aria-current={props.isSelected ? "page" : undefined}` veya `aria-pressed={props.isSelected}` niteliği eklenmelidir.
* Canlı Durum Bildirimi:
  * Yeniden sıralama tamamlandığında ekran okuyucuya `aria-live="polite"` bölgesi üzerinden yer değiştirme bilgisi anons edilmelidir.

---

## 190. Çalışma Alanı Bağlam Menüsünde (`workspaces/contextMenu/contextMenu.tsx`) Onaysız Yıkıcı Silme İşlemi (`deleteWorkspace`), Hızlı Erişim Tuşu (`accesskey`) Yokluğu ve Ekran Okuyucu Silme Bildirimi Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/contextMenu/contextMenu.tsx`
* `browser-features/chrome/common/workspaces/workspacesService.ts`

### Tespit Edilen Sorunlar
* Onaysız Yıkıcı Veri Kaybı (WCAG 3.3.4 Error Prevention (Legal, Financial, Data) - Level AA):
  * `contextMenu.tsx` satır 64-68'de "Sil" menü öğesi yer alır:
    `<xul:menuitem data-floorp-context-menu-key="floorp.workspaces.delete" label={texts().delete} onCommand={() => props.ctx.deleteWorkspace(props.contextWorkspaceId)} />`
  * `workspacesService.ts` satır 227-248'deki `deleteWorkspace` metodu incelendiğinde, bu komut çağrıldığı anda HİÇBİR onay penceresi (`confirm()` veya `PromptService.confirm()`) açılmaksızın çalışma alanı derhal silinmekte ve o alana ait onlarca sekme anında kapatılmaktadır (`this.tabManagerCtx.removeTabByWorkspaceId()`).
  * Motor beceri kısıtlılığı olan veya ekran okuyucu kullanan bir kullanıcı, "Aşağı Taşı" veya "Yönet" yerine yanlışlıkla "Sil" seçeneğine bastığı anda tüm çalışma alanı ve açık sekmeleri geri döndürülemez biçimde yok olmaktadır.
* Menü Öğelerinde Hızlı Erişim Tuşu (`accesskey`) Yokluğu:
  * Menü öğelerinde (`move-up`, `move-down`, `delete`, `manage`, `archive`) yalnızca `data-floorp-context-menu-key` yer almakta, hiçbir `accesskey` özelliği atanmamaktadır.
  * Klavyeyle menüyü açan kullanıcılar tuş vuruşuyla doğrudan işlem seçemez, tüm listeyi ok tuşlarıyla tek tek gezmek zorunda kalır.
* Ekran Okuyucuya Silme ve Arşivleme Bildirimi Gitmemesi (WCAG 4.1.3 Status Messages - Level AA):
  * Çalışma alanı silindiğinde veya arşivlendiğinde menü aniden kapanır; ekran okuyucuya "Çalışma alanı silindi, [X] çalışma alanına geçildi" şeklinde hiçbir durum mesajı aktarılmaz.

### Mimari Çözümler
* Kritik Eylemlerde Onay İletişim Kutusu:
  * Silme komutu tetiklendiğinde çalışma alanında açık sekmeler varsa kullanıcıya erişilebilir bir onay modali (`Services.prompt.confirm(window, t("workspaces.deleteTitle"), t("workspaces.deleteConfirmMessage"))`) gösterilmeli; kullanıcı onaylamadıkça silme yürütülmemelidir.
* Hızlı Erişim Tuşlarının Tanımlanması:
  * Menü öğelerine yerelleştirme paketinden gelen veya çakışmayan erişim tuşları (`accesskey="U"`, `accesskey="D"`, `accesskey="M"`) eklenmelidir.
* Canlı Durum Geri Bildirimi:
  * İşlem sonrasında tarayıcının bildirim çubuğu veya canlı duyuru alanı üzerinden silme/arşivleme işlemi teyit edilmelidir.

---

## 191. Not Düzenleyicisinde Not Öğesi Kartında (`NoteItem.tsx`) İç İçe Buton İhlali (`<button>` içinde Silme `<button>`'u), Sağ Tıklamayla Kazara Not Silinmesi (`onContextMenu`), Görünmez Silme Butonu (`opacity-0`) ve Genel "Sil" Etiketi

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteItem.tsx`

### Tespit Edilen Sorunlar
* İç İçe Etkileşimli Buton İhlali (WCAG 4.1.2 Name, Role, Value - Level A & HTML Spec İhlali):
  * `NoteItem.tsx` satır 69-115 incelendiğinde, tüm not kartı bir `<button type="button" role="option">` elemanıdır.
  * Ancak bu butonun içinde satır 97-109'da silme işlemi için İKİNCİ bir `<button type="button" data-testid="notes-delete">` yer almaktadır.
  * HTML spesifikasyonuna göre bir `<button>` öğesi asla başka bir etkileşimli öğe (buton, bağlantı vb.) içeremez. Ekran okuyucu erişilebilirlik ağaçlarında bu durum geçersiz düğüm hiyerarşisi oluşturur. Ekran okuyucu kullanıcısı nota odaklanmaya çalışırken yanlışlıkla içteki butonu tetikleyebilir veya dıştaki butonun tıklama olayı silme butonuyla çakışır.
* Sağ Tıklamada Doğrudan Not Silinmesi (WCAG 3.3.4 Error Prevention - Level AA):
  * Satır 82-86'daki kod:
    `onContextMenu={(e) => { if (isReorderMode) return; e.preventDefault(); onDelete(note.id); }}`
  * Not öğesi üzerine SAĞ TIKLANDIĞINDA hiçbir bağlam menüsü açılmaksızın ve hiçbir onay sorulmaksızın `onDelete(note.id)` çağrılmaktadır!
  * Metin kopyalamak, not başlığını seçmek veya bağlam menüsüne bakmak için sağ tıklayan bir kullanıcının notu anında silinmektedir.
* Görünmez Silme Butonu (WCAG 2.4.7 Focus Visible - Level AA & WCAG 1.4.3 Contrast Minimum):
  * Satır 100'de silme butonu `className="... opacity-0 hover:opacity-100 focus-visible:opacity-100"` taşımaktadır.
  * Buton fareyle üzerine gelinene veya klavyeyle odaklanana kadar tamamen görünmezdir (`opacity: 0`). Dokunmatik ekran kullanan, ekran büyütücü kullanan veya bilişsel engeli olan kullanıcılar not kartında silme butonunun nerede olduğunu göremez.
* Hangi Notun Silineceğini Bildirmeyen Genel Etiket (WCAG 4.1.2 Name, Role, Value - Level A):
  * Silme butonunun erişilebilir adı satır 105'te yalnızca `aria-label={t("notes.delete")}` ("Sil") olarak verilmiştir.
  * Sayfada 10 not listelendiğinde ekran okuyucunun buton listesinde peş peşe 10 adet "Sil, düğme" yer alır; kullanıcının hangi notu sileceğini anlaması imkansızdır.

### Mimari Çözümler
* İç İçe Buton Yapısının Kaldırılması:
  * Dış kabuk `<button>` yerine `<div role="option" tabIndex={0} ...>` veya `<li>` yapılmalı; seçim tıklaması ve klavye aktivasyonu bu elemana verilmelidir. Silme butonu bu kapsayıcının içine bağımsız bir kardeş düğme olarak yerleştirilmelidir.
* `onContextMenu` Felaketinin Kaldırılması:
  * Sağ tıklamada notu doğrudan silen tehlikeli kod tamamen kaldırılmalı; standart bağlam menüsü sunulmalı veya silme için onay iletişim kutusu (`ConfirmModal`) zorunlu kılınmalıdır.
* Görünür ve Erişilebilir Silme Butonu:
  * `opacity-0` kaldırılmalı; buton hafif bir arka planla her zaman görünür olmalı ve klavyede belirgin bir odak halkası almalıdır.
* Nota Özel Erişilebilir İsim:
  * Butona `aria-label={t("notes.deleteNoteWithTitle", { title: note.title, defaultValue: `"${note.title}" notunu sil` })}` atanmalıdır.

---

## 192. Not Arama Bileşeninde (`NoteSearch.tsx`) Kapsayıcıda `onMouseDown.preventDefault` İle Doğal Odaklanmanın Engellenmesi ve Arama Filtreleme Sonuçlarının Canlı Bölge Olarak Duyurulmaması

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteSearch.tsx`

### Tespit Edilen Sorunlar
* Kapsayıcı Üzerinde Doğal Odaklanmanın Engellenmesi (WCAG 2.1.1 Keyboard - Level A):
  * `NoteSearch.tsx` satır 13'te arama kutusunu saran `<div>` elemanına `onMouseDown={(e) => e.preventDefault()}` atanmıştır.
  * Kullanıcı arama kutusunun dolgu (padding) alanına veya etrafına tıkladığında tarayıcının varsayılan odaklanma mekanizması engellenir; girdi alanı odak almaz. Bu durum motor becerisi zayıf kullanıcıların arama kutusunu hedeflemesini zorlaştırır.
* Arama Sonuçlarının Ekran Okuyucuya Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Kullanıcı arama kutusuna bir terim yazdığında not listesi dinamik olarak filtrelenir. Ancak bileşende hiçbir `role="status"` veya `aria-live="polite"` bölgesi bulunmamaktadır.
  * Eşleşen not sayısı (örneğin "3 not bulundu" veya "Aramayla eşleşen not yok") ekran okuyucuya iletilmez. Görme engelli kullanıcı aramanın tamamlanıp tamamlanmadığını anlayamaz.
* Temizleme Butonunun Odak Yönetimi Eksikliği:
  * Arama metnini silen çarpı butonuna (`X`) basıldığında arama temizlenir fakat odak arama giriş kutusuna iade edilmez, odak boşlukta kalır.

### Mimari Çözümler
* `onMouseDown.preventDefault` Kodunun Temizlenmesi:
  * Kapsayıcıdaki yapay fare engellemesi silinmeli, doğal odaklanma davranışına izin verilmelidir.
* Canlı Sonuç Sayacı Eklenmesi:
  * Arama alanına bağlı gizli bir canlı bölge tanımlanmalıdır:
    `<div role="status" aria-live="polite" className="sr-only">{value ? t("notes.searchResults", { count: filteredCount, defaultValue: `${filteredCount} not bulundu` }) : ""}</div>`
* Temizleme Sonrası Odağın Korunması:
  * Çarpı butonuna tıklandığında `inputRef.current?.focus()` çağrılarak odak arama kutusuna geri verilmelidir.

---

## 193. Not Listesi Kapsayıcısında (`NoteList.tsx`) `role="listbox"` Kullanımına Rağmen Ok Tuşları (`ArrowUp`/`ArrowDown`) Gezintisi Olmaması, İç İçe Geçersiz Seçenek Butonları ve Sıralama Değişiminde Sessiz Kalınması

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/notes/NoteList.tsx`

### Tespit Edilen Sorunlar
* WAI-ARIA Listbox Klavye Gezintisi Standardının İhlali (WCAG 2.1.1 Keyboard - Level A, WCAG 4.1.2 Name, Role, Value - Level A):
  * `NoteList.tsx` satır 47-52'de not listesi kapsayıcısına `role="listbox"` atanmıştır.
  * WAI-ARIA Listbox tasarım modeline göre, bir `listbox` bileşeni klavyede `Yukarı Ok` ve `Aşağı Ok` tuşlarıyla seçenekler arasında dolaşımı, `Home` ve `End` tuşlarıyla başa/sona gitmeyi zorunlu kılar.
  * Ancak `NoteList` bileşeninde hiçbir klavye olay dinleyicisi (`onKeyDown`) bulunmamaktadır. Kullanıcı ok tuşlarıyla notlar arasında gezemez; mecburen `Tab` tuşuna basarak her notun içindeki seçim butonu ve silme butonunu tek tek dolaşmak zorunda kalır.
* Kapsayıcıda Fare Tıklamasının Bastırılması:
  * Satır 51'de tüm liste kapsayıcısına `onMouseDown={(e) => e.preventDefault()}` atanmıştır. Bu kural kaydırma çubuğunun veya liste boşluklarının doğal fare odağını bozar.
* Not Sıralaması Değiştiğinde Canlı Duyurunun Olmaması (WCAG 4.1.3 Status Messages - Level AA):
  * `onReorderNotes` ile notların sırası değiştirildiğinde ekran okuyucuya hiçbir bilgi aktarılmaz. Kullanıcı notun taşındığını doğrulayamaz.

### Mimari Çözümler
* WAI-ARIA Klavye Gezintisi Entegrasyonu:
  * Listbox kapsayıcısına `onKeyDown` dinleyicisi eklenmeli; `ArrowDown` bir sonraki notu, `ArrowUp` bir önceki notu seçmeli ve odak `aria-activedescendant` veya roving `tabIndex` ile yönetilmelidir.
* Gereksiz `onMouseDown.preventDefault` Kodunun Silinmesi.
* Canlı Yeniden Sıralama Duyurusu:
  * Sıralama yapıldığında `aria-live="polite"` ile "Not [X], [Y]. sıraya taşındı" bildirimi yapılmalıdır.

---

## 194. Not Resim Boyutlandırma Bileşeninde (`ResizableImage.tsx`) Boyutlandırma Tutamacının Yalnızca Fareye Bağımlı Olması (Klavye ve Ekran Okuyucu Desteğinin Sıfır Olması), 12x12px Boyutundaki Yetersiz Dokunma Hedefi ve Yüksek Kontrasta Uyumsuzluk

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/ResizableImage.tsx`

### Tespit Edilen Sorunlar
* Yalnızca Fareye Bağımlı Boyutlandırma Tutamacı (WCAG 2.1.1 Keyboard - Level A, WCAG 2.5.7 Dragging Movements - Level AA):
  * `ResizableImage.tsx` satır 53-58 incelendiğinde, resim seçildiğinde sağ altta çıkan boyutlandırma tutamacı düz bir `<div>` elemanıdır:
    `<div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize shadow" onMouseDown={handleResize} />`
  * Bu tutamaçta hiçbir `role="separator"` veya `role="slider"`, hiçbir `tabIndex={0}` ve hiçbir klavye olay dinleyicisi (`onKeyDown`) bulunmamaktadır.
  * Klavyeyle çalışan veya ekran okuyucu kullanan bir kullanıcının eklenen bir resmi yeniden boyutlandırması kesinlikle imkansızdır.
* 12x12 Piksel Boyutundaki Dokunma Hedefi İhlali (WCAG 2.5.8 Target Size (Minimum) - Level AA, WCAG 2.5.5 Target Size - Level AAA):
  * Tutamacın boyutları `w-3 h-3` yani 12 piksele 12 pikseldir.
  * WCAG Level AA en az 24x24 piksel, Level AAA ise en az 44x44 piksel tıklama/dokunma alanı şart koşar. 12 piksellik bir noktaya motor beceri kısıtlılığı veya el titremesi olan bir kullanıcının tıklayabilmesi neredeyse imkansızdır.
* Yüksek Kontrast Modunda Görünmez Tutamaç (WCAG 1.4.11 Non-text Contrast - Level AA):
  * Tutamaç yalnızca `bg-primary` sınıfı ve gölge (`shadow`) taşır; kenarlığı yoktur. Windows Yüksek Kontrast modunda kutu gölgeleri ve tema renkleri silindiğinde tutamaç resmin köşesinde tamamen kaybolur.

### Mimari Çözümler
* WAI-ARIA Klavye Uyumlu Boyutlandırıcı (Slider / Separator):
  * Tutamaca `role="separator"`, `aria-orientation="horizontal"`, `tabIndex={0}`, `aria-label={t("editor.resizeImage")}`, `aria-valuenow={node.attrs.width || 200}` atanmalıdır.
  * `onKeyDown` dinleyicisi eklenmeli; `ArrowRight` veya `ArrowUp` resmi 20px genişletmeli, `ArrowLeft` veya `ArrowDown` 20px daraltmalıdır.
* Dokunma Alanının Genişletilmesi:
  * Görsel nokta küçük kalsa bile tıklama alanı sözde elemanla (`::before`) en az 24x24px (tercihen 32x32px) boyutuna genişletilmelidir.
* Yüksek Kontrast Kenarlık Desteği:
  * `@media (forced-colors: active) { outline: 2px solid ButtonText; }` kuralı eklenmelidir.

---

## 195. Not Düzenleyici Araç Çubuğunda (`Toolbar.tsx`) Açılır Başlık ve Stil Menülerinde `Escape` Tuşuyla Kapanma Eksikliği, `mousedown` Dışında Klavye Odak Kaybında Menünün Açık Kalması ve `btn-xs` Dokunma Hedefi İhlalleri

İlgili Dosyalar:
* `browser-features/pages-notes/src/components/editor/Toolbar.tsx`

### Tespit Edilen Sorunlar
* Açılır Menülerde `Escape` Tuşuyla Kapanma ve Odak İadesi Yokluğu (WCAG 2.1.1 Keyboard - Level A, WCAG 2.1.2 No Keyboard Trap):
  * `Toolbar.tsx` satır 126-157 (Başlık Menüsü) ve 159-195 (Metin Biçimlendirme Menüsü) butonlara basıldığında açılan alt menüler barındırır.
  * Ancak kod içinde yalnızca `mousedown` dış tıklama dinleyicisi yer almaktadır (satır 36-45). Klavye için hiçbir `Escape` tuşu dinleyicisi yazılmamıştır.
  * Klavyeyle menüyü açan kullanıcı `Escape` basarak menüyü kapatamaz; menüden vazgeçmek için tüm butonları `Tab` ile tek tek geçmek zorunda kalır.
* `aria-controls` Eksikliği (WCAG 4.1.2 Name, Role, Value - Level A):
  * Başlık ve Biçimlendirme açılır butonlarında `aria-expanded` vardır ancak açılan menü paneline bağlanan `aria-controls="heading-menu-panel"` özniteliği bulunmamaktadır.
* Aşırı Küçük `btn-xs` Dokunma Hedefleri (WCAG 2.5.8 Target Size Minimum - Level AA):
  * Araç çubuğundaki tüm butonlar `btn btn-xs` sınıfındadır ve butonlar arasında `gap-0.5` (2 piksel) boşluk vardır.
  * Butonların genişliği ve yüksekliği 24 piksel sınırının altındadır ve birbirine çok yakındır. Dokunmatik ekran veya fare kontrolünde titreme yaşayan kullanıcılar yanlış butonlara tıklar.

### Mimari Çözümler
* Klavye `Escape` ve Odak Yönetimi:
  * Menü paneline `onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpenMenu(null); triggerBtnRef.current?.focus(); } }}` eklenmelidir.
* `aria-controls` ve Menü Kimlikleri:
  * Buton ile panel arasına `aria-controls` ve `id` bağlantısı kurulmalıdır.
* Dokunma Alanlarının En Az 24x24px Seviyesine Yükseltilmesi:
  * Buton boyutları `btn-sm` seviyesine çekilmeli veya minimum tıklama alanı CSS ile en az 24x24px'e sabitlenmelidir.

---

## 196. Hoş Geldiniz Hareketli Sahnesinde (`WelcomeScene.tsx`) 10 Saniye Süren Otomatik Faz Geçişinde Durdurma/Duraklatma Butonunun Olmaması, Açıklama Değişiminin Ekran Okuyucuya Duyurulmaması ve `aria-pressed` Yanlışlığı

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/welcome/WelcomeScene.tsx`

### Tespit Edilen Sorunlar
* 5 Saniyeden Uzun Süren Otomatik Harekette Durdurma/Duraklatma Mekanizması Yokluğu (WCAG 2.2.2 Pause, Stop, Hide - Level A):
  * `WelcomeScene.tsx` satır 36-43 incelendiğinde, sahne açıldığında otomatik olarak fazlar arasında ilerlemekte ve toplam 10 saniye boyunca animasyonlu geçişler yapmaktadır (`10000 / 3` ms aralıklarla).
  * WCAG 2.2.2 başarı kriteri uyarınca: "Otomatik olarak başlayan ve 5 saniyeden uzun süren hareketli veya kayan içerikler için kullanıcının bunu duraklatması, durdurması veya gizlemesi için bir mekanizma bulunmalıdır."
  * Bileşende animasyon devam ederken hiçbir "Durdur" veya "Duraklat" butonu sunulmamaktadır; yalnızca animasyon bittikten sonra "Yeniden Oynat" (`Play`) butonu gösterilmektedir (satır 126-138).
* Dinamik Açıklama Metninin Canlı Bölge Olarak Duyurulmaması (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 124-126'da faz değiştikçe `<p>{t(`welcomeMotion.descriptions.${phase}`)}</p>` metni değişmektedir. Ancak bu alan düz bir `<div>` içindedir; hiçbir `role="status"` veya `aria-live="polite"` niteliği taşımamaktadır. Ekran okuyucu kullanıcısı sahnenin hangi özelliğe geçtiğini duyamaz.
* Adım Gezinti Butonlarında `aria-pressed` Yanlış Kullanımı (WCAG 4.1.2 Name, Role, Value - Level A):
  * Satır 108-115'te adımlar arasında geçiş sağlayan butonlara `aria-pressed={phase === index}` atanmıştır.
  * Bir görünümü veya slaytı seçen kontroller bir açma/kapama (toggle) butonu değildir; WAI-ARIA'da bunlar sekme (`role="tab"`, `aria-selected`) veya slayt gezinti düğmeleri (`aria-current="step"`) olarak tanımlanmalıdır.

### Mimari Çözümler
* Oynat / Duraklat Mekanizması:
  * Animasyon yürütülürken kullanıcıya görünür bir "Duraklat" butonu sunulmalı (`setRunning(false)`), klavyeyle erişilebilir olmalıdır.
* Canlı Durum Bildirimi:
  * Açıklama kapsayıcısına `<div className={styles.caption} role="status" aria-live="polite">` eklenmelidir.
* Semantik Sekme / Adım Desteği:
  * Gezinti butonlarına `role="tab"`, `aria-selected={phase === index}` verilmeli veya `aria-current={phase === index ? "step" : undefined}` atanmalıdır.

---

## 197. Dil Seçimi Ayarlarında (`LanguageSettings.tsx`) Kaydetme Sırasında `disabled` Olan Bileşenin Klavye Odağını `<body>`'ye Düşürmesi ve Yerel Dil İsimlerinde `lang` Niteliklerinin Bulunmaması Nedeniyle Ekran Okuyucu Ses Sentezleyicisinin Bozulması

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/localization/LanguageSettings.tsx`

### Tespit Edilen Sorunlar
* Kaydetme Esnasında Odağın Belge Başına Düşmesi (WCAG 2.4.3 Focus Order - Level A):
  * `LanguageSettings.tsx` satır 120-145'te dil seçildiğinde veya "Sistem Dilini Kullan" butonuna basıldığında `setSaving(true)` tetiklenir (satır 70).
  * Bu sırada `SetupSelect` ve `Button` bileşenlerine `disabled={saving}` verilir.
  * Kullanıcının klavyeyle odaklandığı buton veya açılır menü aniden `disabled={true}` haline geldiği anda tarayıcı odağı elemandan kopararak `document.body`'ye fırlatır. Dil paketinin indirilmesi ağ hızına bağlı olarak 5-10 saniye sürerken kullanıcı sayfanın en tepesine atılarak bağlamını kaybeder.
* Yerel Dil İsimlerinde `lang` Niteliğinin Bulunmaması Nedeniyle Ses Sentezleyici Bozulması (WCAG 3.1.2 Language of Parts - Level AA):
  * Satır 134-135'te diller kendi yerel alfabeleriyle listelenir: "Türkçe", "日本語", "Français", "Deutsch", "العربية", "Русский".
  * Ancak bu seçeneklerde hiçbir `lang={code}` niteliği (örn: `<option lang="ja">日本語</option>`, `<option lang="ar">العربية</option>`) bulunmamaktadır.
  * Türkçe veya İngilizce ses sentezleyicisi kullanan bir ekran okuyucu `lang` özniteliği görmediği için Japonca kanji veya Arapça harfleri Türkçe okuma kurallarıyla telaffuz etmeye çalışır; sonuçta anlaşılmaz mekanik gürültü veya tam bir sessizlik oluşur.

### Mimari Çözümler
* Odak Kaybını Engelleyen `aria-busy` Modeli:
  * Dil yüklenirken buton ve seçim elemanları HTML `disabled` yapılmamalı; `aria-disabled="true"` ve `aria-busy="true"` atanarak klavye odağı yerinde tutulmalıdır.
* Çok Dilli Seçeneklerde `lang` ve `dir` Tanımı:
  * Her dil seçeneğine `<option value={code} lang={code} dir={isRTL(code) ? "rtl" : "ltr"}>{names[code] || code}</option>` niteliği eklenerek ekran okuyucunun TTS ses motorunu otomatik olarak ilgili dile geçirmesi sağlanmalıdır.

---

## 198. Yenilikler Sayfasında (`WhatsNewPage.tsx`) Yeni Sekmede Açılan Dış Bağlantılarda Uyarı Yokluğu, Sayfa Kapatmada Odak Kopukluğu ve Yetersiz İkincil Metin Kontrastı

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/whatsnew/page.tsx`

### Tespit Edilen Sorunlar
* Yeni Pencere / Sekme Uyarısının Bulunmaması (WCAG 3.2.5 Change on Request - Level AAA):
  * `WhatsNewPage.tsx` satır 71-115 arasında yer alan GitHub, X (Twitter), Discord, Kullanım Şartları, Gizlilik Politikası ve Dokümantasyon bağlantılarının tamamında `target="_blank" rel="noopener noreferrer"` kullanılmıştır.
  * Ancak hiçbir bağlantı metninde veya etiketinde ekran okuyucuya yeni pencerede açılacağına dair görsel veya sesli bir uyarı yer almamaktadır. Görme engelli kullanıcı bağlantıya tıkladığında tarayıcı sekmesinin değiştiğinden habersiz kalır.
* Sayfa Kapatma Fonksiyonunda Odak Boşluğu:
  * Satır 24-27'de "Başlayın" butonuna tıklandığında çalışan `closePage()` fonksiyonu:
    `globalThis.open("about:newtab", "_blank"); setTimeout(() => globalThis.close(), 50);`
  * Yeni sekme açılırken mevcut sayfa 50ms sonra aniden kapatılmaktadır. Ekran okuyucu kullanıcısına sürecin tamamlandığına dair hiçbir geri bildirim verilmeden sayfa yok olur.
* Altbilgi Metinlerinde Kontrast Zafiyeti:
  * `welcome.module.css` içindeki altbilgi bağlantıları ve telif hakkı metni soluk gri renk alarak 4.5:1 kontrast sınırının altına düşmektedir.

### Mimari Çözümler
* Yeni Sekme Ekran Okuyucu Uyarısı:
  * Tüm dış bağlantılara `<span className="sr-only"> ({t("common.opensInNewWindow")})</span>` metni eklenmeli ve görsel bir dış bağlantı simgesi yerleştirilmelidir.
* Güvenli Sayfa Geçişi:
  * Yeni sekme odağı düzgünce devralana kadar kapatma işlemi aceleye getirilmemeli, standart pencere yaşam döngüsü işletilmelidir.
* Kontrast Güçlendirmesi:
  * Altbilgi bağlantı metinleri en az 4.5:1 kontrast sağlayacak renklere yükseltilmelidir.


---

## 199. Web Panel Kenar Çubuğu Başlığında (`sidebar-header.tsx`) 7 Adet İsimsiz Buton, `aria-label`/`label` Yokluğu ve Yüzen Panel Modunda `aria-pressed` Eksikliği

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/sidebar-header.tsx`

### Tespit Edilen Sorunlar
* 7 Ardışık İsimsiz Toolbar Butonu (WCAG 1.3.1 Info and Relationships, WCAG 4.1.2 Name, Role, Value - Level A):
  * `sidebar-header.tsx` satır 25-67 arasında yer alan web panel başlık araç çubuğu butonları:
    * `#panel-sidebar-back` (Geri git)
    * `#panel-sidebar-forward` (İleri git)
    * `#panel-sidebar-reload` (Yenile)
    * `#panel-sidebar-go-index` (Ana sayfaya / dizine git)
    * `#panel-sidebar-float` (Yüzen / sabit panel geçişi)
    * `#panel-sidebar-open-in-main-window` (Ana pencerede aç)
    * `#panel-sidebar-close` (Paneli kapat)
  * Bu butonların hiçbirinde `label`, `aria-label`, `tooltiptext` veya Fluent `data-l10n-id` niteliği tanımlanmamıştır.
  * NVDA, JAWS veya Windows Narrator kullanan görme engelli bir kullanıcı web paneline odaklandığında ve Tab tuşuyla başlık çubuğunda gezindiğinde ekran okuyucu art arda yedi kez yalnızca *"Düğme, Düğme, Düğme, Düğme, Düğme, Düğme, Düğme"* seslendirmesi yapar. Hangi düğmenin paneli kapattığı, hangisinin sayfayı yenilediği veya ana pencereye aktardığı tamamen belirsizdir.
* İki Durumlu Geçiş Butonunda Durum Bildirimi Eksikliği (WCAG 4.1.2 Name, Role, Value):
  * `#panel-sidebar-float` butonu paneli yerleşik (docked) mod ile yüzen (floating) mod arasında değiştiren iki durumlu bir toggle butondur (`setIsFloating(!isFloating())`).
  * Ancak buton üzerinde ne `aria-pressed`, ne `checked`, ne de durumu anlatan dinamik bir etiket bulunmaktadır. Kullanıcı butonun basılı mı yoksa serbest mi olduğunu, panelin ekranda yüzüp yüzmediğini anlayamaz.
* Kısayol Tuşu ve İpucu Yokluğu:
  * Butonların hiçbirinde `tooltiptext` bulunmadığı için fare ile üzerine gelindiğinde dahi gören kullanıcılar için metinsel ipucu çıkmamakta, yalnızca CSS ile yüklenen arka plan ikonlarına bağımlı kalınmaktadır.

### Mimari Çözümler
* Fluent Yerelleştirme ve Erişilebilir İsim Ataması:
  * Her bir toolbarbutton elemanına hem Fluent `data-l10n-id` hem de ekran okuyucu için açık `aria-label` ve `tooltiptext` eklenmelidir:
```tsx
<xul:toolbarbutton
  id="panel-sidebar-back"
  class="panel-sidebar-actions toolbarbutton-1 chromeclass-toolbar-additional"
  data-l10n-id="panel-sidebar-back-button"
  aria-label="Geri"
  tooltiptext="Geri"
  onCommand={() => PanelNavigator.back(selectedPanelId() ?? "")}
/>
<xul:toolbarbutton
  id="panel-sidebar-forward"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-forward-button"
  aria-label="İleri"
  tooltiptext="İleri"
  onCommand={() => PanelNavigator.forward(selectedPanelId() ?? "")}
/>
<xul:toolbarbutton
  id="panel-sidebar-reload"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-reload-button"
  aria-label="Yenile"
  tooltiptext="Yenile"
  onCommand={() => PanelNavigator.reload(selectedPanelId() ?? "")}
/>
<xul:toolbarbutton
  id="panel-sidebar-go-index"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-home-button"
  aria-label="Başlangıç Sayfasına Git"
  tooltiptext="Başlangıç Sayfası"
  onCommand={() => PanelNavigator.goIndexPage(selectedPanelId() ?? "")}
/>
<xul:toolbarbutton
  id="panel-sidebar-float"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-float-button"
  aria-label={isFloating() ? "Paneli Sabitle" : "Paneli Yüzdür"}
  aria-pressed={isFloating() ? "true" : "false"}
  tooltiptext={isFloating() ? "Paneli Sabitle" : "Paneli Yüzdür"}
  onCommand={() => setIsFloating(!isFloating())}
/>
<xul:toolbarbutton
  id="panel-sidebar-open-in-main-window"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-open-main-button"
  aria-label="Ana Pencerede Aç"
  tooltiptext="Ana Pencerede Aç"
  onCommand={() => gPanelSidebar.openInMainWindow(selectedPanelId() ?? "")}
/>
<xul:toolbarbutton
  id="panel-sidebar-close"
  class="panel-sidebar-actions"
  data-l10n-id="panel-sidebar-close-button"
  aria-label="Paneli Kapat"
  tooltiptext="Kapat"
  onCommand={() => gPanelSidebar.closePanel()}
/>
```

---

## 200. Kenar Çubuğu ve Yüzen Panel Ayırıcılarında (`sidebar-splitter.tsx`, `floating-splitter.tsx`, `overlay-splitter.tsx`) Klavye Kilitlenmesi ve WAI-ARIA `separator` Semantiği Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/sidebar-splitter.tsx`
* `browser-features/chrome/common/panel-sidebar/components/floating-splitter.tsx`
* `browser-features/chrome/common/panel-sidebar/components/overlay-splitter.tsx`

### Tespit Edilen Sorunlar
* Yalnızca Fareye Bağımlı Boyutlandırma (WCAG 2.1.1 Keyboard - Level A, WCAG 2.5.7 Dragging Movements - Level AA):
  * `floating-splitter.tsx` satır 14-416 arasında panelin yatay (sol/sağ), dikey (üst/alt) ve köşe boyutlandırma çubukları yer alır (`floating-splitter-left`, `floating-splitter-right`, `floating-splitter-top`, `floating-splitter-bottom`, `floating-splitter-corner-*`).
  * Bu bileşenler yalnızca fare olaylarına (`onMouseDown={onHorizontalMouseDown}`, `onMouseDown={onVerticalMouseDown}`, `onMouseDown={onDiagonalMouseDown}`) bağlanmıştır.
  * Hiçbir ayırıcıda `tabindex="0"` veya klavye olay dinleyicisi (`onKeyDown`) bulunmamaktadır. Yalnızca klavye kullanan bir kullanıcının panel boyutunu değiştirmesi imkansızdır.
* WAI-ARIA Rol ve Değer Bildirimi Eksikliği (WCAG 4.1.2 Name, Role, Value - Level A):
  * Ayırıcı kutular `<xul:box>` veya boş `<xul:splitter>` olarak render edilmiştir.
  * Hiçbirinde `role="separator"` tanımlanmamıştır.
  * `aria-valuenow`, `aria-valuemin`, `aria-valuemax` ve `aria-orientation` öznitelikleri atanmadığı için ekran okuyucular ayırıcının mevcut piksel boyutunu ve yönünü kullanıcıya seslendiremez.
* Erişilebilir Odak Göstergesi Yokluğu:
  * Splitter elemanları klavye odağı alamadığı gibi CSS düzeyinde de `:focus-visible` çerçevesine sahip değildir. Yüksek kontrast modunda ayırıcı sınır çizgileri tamamen kaybolmaktadır.

### Mimari Çözümler
* Klavye ile Boyutlandırma ve WAI-ARIA `separator` Entegrasyonu:
  * Ayırıcı elemanlara `tabindex="0"`, `role="separator"` ve klavye ok tuşları (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home`, `End`) ile boyutlandırma imkanı verilmelidir:
```tsx
<xul:box
  id="floating-splitter-left"
  class="floating-splitter-horizontal floating-splitter-left"
  tabindex="0"
  role="separator"
  aria-orientation="vertical"
  aria-label="Panel Sol Boyutlandırma Ayırıcısı"
  aria-valuenow={currentWidth}
  aria-valuemin="225"
  aria-valuemax={maxBrowserWidth}
  onKeyDown={(e: KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 10;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      resizePanelWidth(currentWidth + step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      resizePanelWidth(Math.max(225, currentWidth - step));
    }
  }}
  onMouseDown={onHorizontalMouseDown}
/>
```

---

## 201. Yüzen Web Paneli Konumlandırmasında (`floating.tsx`) `header.onmousedown` İle Yalnızca Fareye Bağımlı Taşıma ve Klavye Alternatifi Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/floating.tsx`

### Tespit Edilen Sorunlar
* Yalnızca Fare Sürüklemesine Bağımlı Pencere Taşıma (WCAG 2.1.1 Keyboard - Level A, WCAG 2.5.7 Dragging Movements - Level AA):
  * `floating.tsx` satır 171-251 arasında yüzen panelin ekrandaki koordinatları (`left`, `top`), panel başlığına eklenen `header.addEventListener("mousedown", ...)` olayı ile yönetilmektedir.
  * Kullanıcı başlığı fareyle tıklayıp sürüklediğinde `mousemove` ile piksel hesabı yapılarak panel taşınmaktadır.
  * Ancak klavye kullanan motor engelli veya görme engelli bir birey için paneli ekranın başka bir köşesine taşıyacak hiçbir mekanizma (ok tuşları, menü komutu veya kısayol) sunulmamıştır.
* Odak ve Sürükleme Çakışması:
  * Başlık tıklandığında `e.preventDefault()` çağrılmakta ve `docEl.style.setProperty("user-select", "none")` işletilmektedir. Bu işlem başlık içindeki butonların klavye odağını bozabilmekte ve klavye dolaşımında odağın donmasına yol açmaktadır.
* Ekran Okuyucuya Konum Değişimi Bildirimi Yokluğu:
  * Panel taşındığında yeni konumu (örneğin ekranın sol üstü, sağ altı vb.) ekran okuyucuya `aria-live` üzerinden seslendirilmemektedir.

### Mimari Çözümler
* Başlık Elemanına Klavye Taşıma Desteği Eklenmesi:
  * Başlık çubuğuna klavye odağı verilebilir alternatif bir taşıma tutamacı veya klavye kısayolu tanımlanmalıdır:
  * Başlık üzerinde `Ctrl + Ok Tuşları` veya `Alt + Ok Tuşları` ile panelin koordinatları 20'şer piksel adımlarla değiştirilebilmelidir:
```typescript
header.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    const step = e.shiftKey ? 50 : 20;
    let newLeft = currentLeft;
    let newTop = currentTop;
    if (e.key === "ArrowLeft") newLeft = Math.max(0, currentLeft - step);
    if (e.key === "ArrowRight") newLeft = Math.min(browserW - sidebarBox.clientWidth, currentLeft + step);
    if (e.key === "ArrowUp") newTop = Math.max(0, currentTop - step);
    if (e.key === "ArrowDown") newTop = Math.min(browserH - sidebarBox.clientHeight, currentTop + step);
    
    sidebarBox.style.setProperty("left", `${newLeft}px`);
    sidebarBox.style.setProperty("top", `${newTop}px`);
    this.savePosition();
    announceLiveRegion(`Panel konumu taşındı: Yatay ${newLeft} piksel, Dikey ${newTop} piksel`);
  }
});
```

---

## 202. Yüzen Web Panelinde Dış Tıklama İle Kapatma (`handleOutsideClick`) Sırasında `Escape` Tuşu Yokluğu ve Kapanışta Odağın `body` Elemanına Düşmesi

İlgili Dosyalar:
* `browser-features/chrome/common/panel-sidebar/components/floating.tsx`

### Tespit Edilen Sorunlar
* `Escape` Klavye Kapatma Desteğinin Bulunmaması (WCAG 2.1.2 No Keyboard Trap, WCAG 2.4.3 Focus Order - Level A):
  * `floating.tsx` satır 405-445 arasında `handleOutsideClick` fonksiyonu mevcuttur. Kullanıcı panel dışına fare ile tıkladığında `setSelectedPanelId(null)` çalışarak panel gizlenmektedir.
  * Ancak klavye kullanıcıları için `Escape` tuşuna basıldığında paneli kapatacak hiçbir `keydown` dinleyicisi eklenmemiştir. Klavye kullanıcısı paneli kapatmak için başlık çubuğundaki kapat düğmesine kadar onlarca kez Tab tuşuna basmak zorunda bırakılır.
* Panel Kapandığında Odak Kaybı (Focus Loss):
  * İster kapat butonuyla ister dış tıklamayla panel kapatıldığında (`setSelectedPanelId(null)`), o sırada panel içinde bulunan odak (örneğin web sayfası içeriği veya başlık butonu) DOM'dan aniden gizlenir.
  * Kod odak iadesi yapmadığı için tarayıcı odağı doğrudan `document.body` elemanına düşürür. Ekran okuyucu kullanıcısı tarayıcıdaki tüm bağlamını kaybeder.

### Mimari Çözümler
* Global `Escape` Tuşu Dinleyicisi:
  * Yüzen panel açıkken pencere düzeyinde bir `keydown` dinleyicisi kurulmalı ve `Escape` basıldığında panel kapatılmalıdır.
* Odağın Açılış Butonuna Güvenli İadesi:
  * Panel açılmadan önce o an odakta bulunan kenar çubuğu simgesi (`#panel-sidebar-select-box` içindeki ilgili buton) bir değişkende saklanmalı (`lastActiveTrigger`); panel kapandığında odak otomatik olarak bu tetikleyiciye döndürülmelidir:
```typescript
private handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isFloating() && selectedPanelId()) {
    event.preventDefault();
    event.stopPropagation();
    this.closeAndRestoreFocus();
  }
};

public closeAndRestoreFocus() {
  const trigger = this.lastFocusedTrigger;
  setSelectedPanelId(null);
  if (trigger && typeof trigger.focus === "function") {
    trigger.focus();
  }
}
```

---

## 203. Sekme Çubuğu Konumlandırma Fonksiyonlarında (`tabbbar-style-functions.tsx`) `bottomOfWindow()` İle DOM Ağacında Sekmelerin Web İçeriğinin Arkasına Taşınması ve Odak Sırasının Bozulması

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/tabbbar-style/tabbbar-style-functions.tsx`

### Tespit Edilen Sorunlar
* DOM Ağacı Sıralamasının Tersine Çevrilmesi (WCAG 1.3.2 Meaningful Sequence, WCAG 2.4.3 Focus Order - Level A):
  * `tabbbar-style-functions.tsx` satır 118-138 arasında yer alan `bottomOfWindow()` fonksiyonu:
    `browserElement.after(tabbarElement);`
    komutunu çalıştırarak sekme çubuğunu (`#TabsToolbar`) tüm web içeriğini barındıran `#browser` elemanının arkasına taşımaktadır.
  * Firefox ve Gecko mimarisinde standart F6 ve Tab klavye dolaşım sırası şöyledir: Araç Çubukları -> Adres Çubuğu -> Sekme Çubuğu -> Yer İmleri -> Web Sayfası İçeriği.
  * Sekme çubuğu `#browser` elemanının arkasına taşındığında, kullanıcı F6 veya Tab ile ilerlerken sekme çubuğuna ulaşamadan doğrudan web sayfasının içine düşer! Eğer web sayfasında yüzlerce bağlantı veya odak tuzağı varsa, kullanıcı sekme değiştirebilmek için sayfanın en sonuna kadar gitmek zorunda kalır veya sekmelere hiç ulaşamaz.
* Pencere Kontrollerinin Araç Çubuğuna Hatalı Enjeksiyonu:
  * Satır 108-112 ve 128-132'de:
    `panelUIMenuButton.after(document?.querySelector("#floorp-tabbar-window-manage-container"));`
  * Başlık çubuğundan koparılan pencere kontrol butonları (Simge durumuna küçült, Ekranı kapla, Kapat) `#nav-bar` adres çubuğu bölgesinde hamburger menü butonunun hemen arkasına enjekte edilmektedir.
  * Bu durum `#nav-bar` bölgesinin WAI-ARIA araç çubuğu hiyerarşisini bozmakta, ekran okuyucu kullanıcısı menü butonunun ardından aniden sistem kapatma butonlarına rastlamaktadır.
* `optimiseToVerticalTabbar()` Sırasında Tamamen Gizlenen Sekmeler:
  * Satır 86-96'da `tabbarElement?.setAttribute("hidden", "true")` yapılarak yatay sekme çubuğu tamamen kapatılmaktadır. Dikey sekme kenar çubuğu çökerse veya kapalıysa, erişilebilir sekme listesi bütünüyle yok olmakta ve kullanıcı sekmesiz kalmaktadır.

### Mimari Çözümler
* Görsel Konumlandırma İçin CSS Flex / Order Kullanımı (DOM Bütünlüğünün Korunması):
  * Sekme çubuğunun fiziksel DOM düğümü `#browser` arkasına taşınmamalıdır. Bunun yerine ana taşıyıcı üzerinde CSS Flexbox `order` veya `flex-direction: column-reverse` kullanılmalıdır. Böylece DOM hiyerarşisi ve mantıksal odak sırası bozulmadan görsel olarak alta yerleştirilebilir.
* `aria-controls` ve Odak Atlatma Köprüsü:
  * Eğer sekme çubuğu görsel olarak altta yer alıyorsa, adres çubuğunun hemen yanına gizli bir "Sekmelere Atla" (`Skip to Tabs`) erişilebilirlik bağlantısı yerleştirilmeli veya F6 döngüsünde sekme çubuğuna doğrudan geçiş sağlayan Gecko erişilebilirlik kancası güncellenmelidir.

---

## 204. Sabitlenmiş Sekme Başlığı Gösteriminde (`pinnedTabCustomization/style.css`) 60px Sabit Genişlik Kısıtı, Metin Kırpılması, %200 Yakınlaştırmada Bozulma ve RTL Dillerde Çakışma

İlgili Dosyalar:
* `browser-features/chrome/common/tab/pinnedTabCustomization/style.css`
* `browser-features/chrome/common/tab/pinnedTabCustomization/index.tsx`

### Tespit Edilen Sorunlar
* 60px Katı Genişlik Sınırı ve Metin Kesilmesi (WCAG 1.4.4 Resize Text - Level AA, WCAG 1.4.10 Reflow - Level AA):
  * `pinnedTabCustomization/style.css` satır 6-9'da:
    ```css
    .tab-label-container[pinned] {
      width: unset !important;
      max-width: 60px !important;
    }
    ```
  * Floorp, sabitlenmiş sekmelerde başlık gösterme özelliğini etkinleştirdiğinde başlık kapsayıcısına zorla `max-width: 60px !important;` uygulamaktadır.
  * 60 piksel, standart yazı tipi boyutunda ancak 4-6 latin karakterini sığdırabilir. Türkçe, Almanca veya Japonca gibi dillerde kelimeler anlamsızca kesilmektedir.
  * Kapsayıcıda `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` zorlaması eksik olduğu için metin ya alt satıra kayarak sekme yüksekliğini taşmakta ya da sekmenin odak çerçevesini parçalamaktadır.
  * Kullanıcı sistem metin boyutunu %150 veya %200 yaptığında 60px içine tek bir hece dahi sığmamakta, metin dikey olarak kırpılmaktadır.
* RTL (Sağdan Sola) Dillerde Sabit `margin-inline-end` Çakışması:
  * Satır 11-17'de `margin-inline-end: 5.5px !important;` atanmıştır. Arapça veya İbranice gibi dillerde ikonlar ve etiketler ters yönde konumlandığında sabit piksel aralığı sekme kapatma/ses ikonlarının başlığın üzerine binmesine yol açmaktadır.
* Yüksek Kontrast Modunda Sabitlenmiş Sekme Odak Hiyerarşisi:
  * Windows Yüksek Kontrast Modunda (`forced-colors: active`), `max-width: 60px` ile daraltılmış sekmenin odak halkası metin kapsayıcısının sınırında kesintiye uğramakta, odak göstergesi görünmez olmaktadır.

### Mimari Çözümler
* Esnek ve Taşmaya Dayanıklı CSS Tasarımı:
  * Sabit 60px yerine dinamik `ch` (karakter) birimi veya sistem yazı tipi ölçeğine uyum sağlayan `em` birimi kullanılmalı ve `text-overflow: ellipsis` zorunlu kılınmalıdır:
```css
.tab-label-container[pinned] {
  width: auto !important;
  max-width: 12ch !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

@media (prefers-contrast: more) {
  .tabbrowser-tab[pinned]:focus-visible {
    outline: 2px solid Highlight !important;
    outline-offset: -2px !important;
  }
}
```

---

## 205. Sekme Boyutu Yapılandırmasında (`sizeSpecification/index.tsx`, `style.css`) 20px Asgari Sekme Yüksekliği İzni, WCAG 2.5.8 (24px) ve 2.5.5 (44px) Hedef Boyutu İhlali

İlgili Dosyalar:
* `browser-features/chrome/common/tab/sizeSpecification/index.tsx`
* `browser-features/chrome/common/tab/sizeSpecification/style.css`

### Tespit Edilen Sorunlar
* Asgari Dokunma / Tıklama Hedef Boyutu İhlali (WCAG 2.5.8 Target Size (Minimum) - Level AA, WCAG 2.5.5 Target Size - Level AAA):
  * `sizeSpecification/index.tsx` satır 25'te sekme yüksekliği doğrulama kuralı şöyledir:
    `if (typeof validatedMinH !== "number" || validatedMinH < 20 || validatedMinH > 100)`
  * Floorp, kullanıcının sekme yüksekliğini 20 piksele (`--floorp-tab-min-height: 20px`) kadar düşürmesine izin vermektedir.
  * WCAG 2.5.8 asgari 24x24 CSS pikseli, WCAG 2.5.5 ise 44x44 CSS pikseli hedef boyutu şart koşar.
  * Sekme yüksekliği 20px olduğunda, sekme içerisindeki 16x16px boyutundaki sekme kapatma butonu (`.tab-close-button`), ses/sessize alma ikonu (`.tab-icon-overlay`) ve sekme başlığı dikey olarak birbirine çarpmaktadır.
  * Titreme, motor beceri kısıtı veya görme azlığı yaşayan kullanıcılar bir sekmeyi seçmek için tıkladıklarında yanlışlıkla sekme kapatma butonuna basmakta ve sekmeyi istem dışı kapatmaktadır.
* Odak Çerçevesinin Kırpılması:
  * Sekme çubuğu kaydırma kutusu (`#tabbrowser-arrowscrollbox`) içerisinde 20px yüksekliğindeki bir sekme klavye odağı aldığında, sekmenin üst ve alt odak çizgileri kaydırma kutusunun `overflow: hidden` sınırları tarafından kesilerek görünmez hale gelmektedir.

### Mimari Çözümler
* Asgari Güvenli Yükseklik Doğrulaması (Target Size Protection):
  * Asgari sekme yüksekliği en az 28px veya önerilen erişilebilirlik standardı olan 32px altına düşürülmemelidir:
```typescript
const ABSOLUTE_MIN_TAB_HEIGHT = 28; // WCAG 2.5.8 gereğince en az 24px + 4px güvenli aralık
if (typeof validatedMinH !== "number" || validatedMinH < ABSOLUTE_MIN_TAB_HEIGHT || validatedMinH > 100) {
  validatedMinH = Math.max(ABSOLUTE_MIN_TAB_HEIGHT, DEFAULT_MIN_H);
}
```
* İç Butonların Güvenli Ayrımı:
  * Düşük yükseklik ayarlarında sekme kapatma butonunun tıklama alanı sekme gövdesinden net ayrılmalı, gerekirse çok dar sekmelerde kapatma butonu yalnızca aktif sekmede gösterilmelidir.

---

## 206. Hakkında İletişim Kutusunda (`AboutDialog.tsx`) Sözde Bağlantılar (`<a href="#">`), Zorunlu Japonca Gizlilik/Şartlar Bağlantıları, Güncelleme Canlı Bölge Omission'ı ve Azaltılmış Hareket İhmali

İlgili Dosyalar:
* `browser-features/pages-aboutDialog/src/AboutDialog.tsx`

### Tespit Edilen Sorunlar
* Sözde Bağlantılar (`<a href="#">`) İle Standart Tarayıcı Davranışının Bozulması (WCAG 4.1.2 Name, Role, Value - Level A):
  * `AboutDialog.tsx` satır 408-446 ve 504-545 arasında yer alan tüm bağlantılar (GitHub, Discord, X, Reddit, Lisans, Sürüm Notları, Gizlilik, Şartlar) şu biçimde kodlanmıştır:
    `<a href="#" onClick={(e) => { e.preventDefault(); openExternalUrl(...); }}>`
  * Standart bir HTML bağlantısında geçerli bir hedef URL bulunmalıdır. `href="#"` kullanılması durumunda:
    * Kullanıcı bağlantıya sağ tıklayıp "Bağlantı Adresini Kopyala" diyemez (panoya yalnızca `#` kopyalanır).
    * Orta tuşla yeni sekmede açma veya sürükleyip bırakma çalışmaz.
    * Ekran okuyucular hedef URL yerine anlamsızca "Link, diyez / kare işareti" okur.
* Zorunlu Japonca URL Yönlendirmesi (Yerelleştirme İhlali):
  * Satır 530 ve 540'ta:
    `openExternalUrl("https://ja.floorp.app/privacy");`
    `openExternalUrl("https://ja.floorp.app/terms");`
  * Kullanıcının tarayıcı dili Türkçe (`tr-TR`), İngilizce veya Almanca olsa dahi Gizlilik Politikası ve Kullanım Şartları bağlantıları zorla Japonca alan adına yönlendirilmektedir.
* Güncelleme Durumlarında Ekran Okuyucu Canlı Bölge Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * Satır 343-355'te güncelleme kontrolü yapılırken (`checking`, `downloading`, `applying`, `upToDate`):
    `<div class="ad-update-row" aria-busy={busy}>`
    bileşeni kullanılır. Ancak bu alanda ne `role="status"`, ne de `aria-live="polite"` tanımlıdır. Güncelleme denetlenirken veya tamamlandığında ekran okuyucu kullanıcıya hiçbir şey söylemez.
* Buton Kaybolmasıyla Odak Boşluğu:
  * Güncelleme kontrol butonuna tıklandığında buton DOM'dan kaldırılmakta ve yerine spinner konmaktadır. Odak otomatik olarak `document.body`'ye düşmektedir.
* Yükleme Göstergesinde Azaltılmış Hareket İhlali:
  * `.ad-spinner` CSS animasyonu `@media (prefers-reduced-motion: reduce)` altında durdurulmamaktadır.

### Mimari Çözümler
* Gerçek `href` Niteliklerinin Tanımlanması:
  * Tüm bağlantılara gerçek hedef URL'leri verilmeli, `onClick` yalnızca gerekliyse dış tarayıcı tetiklemesi için kullanılmalı ancak `href` korunmalıdır:
```tsx
<a
  href="https://floorp.app/privacy"
  target="_blank"
  rel="noopener noreferrer"
  class="ad-bottom-link"
  data-l10n-id="bottom-links-privacy"
>
  {t("aboutDialog.links.privacy")}
  <span class="sr-only"> ({t("common.opensInNewWindow")})</span>
</a>
```
* Canlı Durum Bildirimi ve Odak Yönetimi:
  * Güncelleme kapsayıcısına `role="status"` ve `aria-live="polite"` eklenmeli; buton DOM'dan silinmek yerine `disabled` yapılmalı veya odak durumu açıklayan alana aktarılmalıdır.

---

## 207. Çalışma Alanları Ayarlarında (`BasicSettings.tsx`) Sıfırlama Bildirimlerinin Canlı Bölge Omission'ı, Dış Bağlantı Yeni Pencere Uyarısı Yokluğu ve Switch Açıklamalarının Etiket İçine Gömülmesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/workspaces/components/BasicSettings.tsx`

### Tespit Edilen Sorunlar
* Sıfırlama İşlemi Sonucu Canlı Bölge Yokluğu (WCAG 4.1.3 Status Messages - Level AA):
  * `BasicSettings.tsx` satır 180-192 arasında:
    ```tsx
    {initializeStatus === "success" ? (
      <p className="text-sm text-green-600 dark:text-green-400">
        {t("workspaces.initializeSuccess")}
      </p>
    ) : initializeStatus === "error" ? (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("workspaces.initializeFailure")}
      </p>
    ) : null}
    ```
  * Kullanıcı onay modalında çalışma alanlarını sıfırladığında, asenkron `initializeWorkspaces` fonksiyonu tamamlanır ve ekrana yeşil veya kırmızı metin basılır.
  * Bu `<p>` elemanlarında `role="status"`, `role="alert"` veya `aria-live="polite"` bulunmamaktadır. Modal kapandığında ekran okuyucu kullanıcısı işlemin başarılı mı olduğunu yoksa hata mı verdiğini duyamaz.
* Dış Yardım Bağlantısında Yeni Sekme Uyarısı Yokluğu:
  * Satır 107-115'te yer alan dokümantasyon bağlantısı `target="_blank"` ile açılmakta, içindeki `ExternalLink` ikonu ise `aria-hidden="true"` taşımaktadır. Ekran okuyucu kullanıcısına yeni pencere açılacağı bildirilmemektedir.
* Switch Açıklamalarının Doğrudan `<label>` İçine Yazılması:
  * Satır 119-124 ve 157-161'de açıklama metinleri doğrudan `<label htmlFor="...">` içine yerleştirilmiştir. Ekran okuyucu her odaklandığında iki paragraflık uzun açıklamayı switch'in adıymış gibi baştan sona okur. Bunun yerine `aria-describedby` kullanılmalıdır.

### Mimari Çözümler
* Canlı Durum Bildirimi Eklenmesi:
```tsx
<div role="status" aria-live="polite" className="space-y-1">
  {initializeStatus === "success" && (
    <p className="text-sm text-green-600 dark:text-green-400">
      {t("workspaces.initializeSuccess")}
    </p>
  )}
  {initializeStatus === "error" && (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {t("workspaces.initializeFailure")}
    </p>
  )}
</div>
```
* `aria-describedby` İle İsim ve Açıklamanın Ayrıştırılması:
```tsx
<div className={styles.row}>
  <label htmlFor="close-popup" className="font-medium">
    {t("workspaces.closePopupWhenSelectingWorkspace")}
  </label>
  <p id="close-popup-desc" className="text-sm text-base-content/70">
    {t("workspaces.closePopupWhenSelectingWorkspaceDescription")}
  </p>
  <Switch
    id="close-popup"
    aria-describedby="close-popup-desc"
    checked={!!getValues("closePopupAfterClick")}
    onChange={(e) => setValue("closePopupAfterClick", e.target.checked)}
  />
</div>
```

---

## 208. PWA Çalışma Zamanında (`NativeAppRuntime.sys.mts`) Uygulama Başlatma ve Zaman Aşımı Hatalarının Kullanıcıya Bildirilmemesi, Sessiz Pencere Kapatılması ve Odak Kaybı

İlgili Dosyalar:
* `browser-features/modules/modules/pwa/NativeAppRuntime.sys.mts`

### Tespit Edilen Sorunlar
* Sessiz Hata Yakalama ve Kullanıcı Bildirimi Yokluğu (WCAG 3.3.1 Error Identification - Level A, Küresel Anayasa Bölüm 2 Kural 24 Sessiz Catch Yasağı):
  * `NativeAppRuntime.sys.mts` satır 318-345 arasında PWA (Web Uygulaması) başlatılırken oluşan hatalar (`AppLaunchCancelled`, zaman aşımı veya yerel shim hatası) `catch (error)` bloğunda yakalanmaktadır:
    `console.error("[NativeAppRuntime] App Shim launch failed:", error);`
    `for (const window of session.windows.values()) { if (!window.closed) window.close(); }`
  * Açılan pencere anında kapatılmakta, hata konsola yazılmakta ancak kullanıcı arayüzüne hiçbir görsel veya işitsel bildirim (bildirim çubuğu, alert, canlı duyuru) gönderilmemektedir.
  * PWA ikonuna tıklayan görme engelli bir kullanıcı hiçbir geri bildirim alamaz; tarayıcı penceresi aniden kapanır veya odak kaybolur.
* Zaman Aşımı Süresinde Geri Bildirim Eksikliği:
  * Satır 285-291'de 30 saniyelik zaman aşımı (`setTimeout(..., 30000)`) çalışmaktadır. Ekran okuyucu veya büyüteç kullanan sistemlerde başlatma süresi uzadığında kullanıcı 30 saniye boyunca uygulamanın açılmasını bekler ve ardından hiçbir açıklama yapılmadan işlem iptal edilir.

### Mimari Çözümler
* Kullanıcı Bildirim Servisi ve Erişilebilir Uyarı Entegrasyonu:
  * PWA başlatma başarısız olduğunda ana tarayıcı penceresine kullanıcı dostu bir hata bildirimi (`Services.prompt` veya bildirim kutusu) iletilmelidir:
```typescript
} catch (error) {
  console.error("[NativeAppRuntime] App Shim launch failed:", error);
  // Kullanıcıya ve erişilebilirlik katmanına bildir
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  if (win?.gNotificationBox) {
    win.gNotificationBox.appendNotification(
      "floorp-pwa-launch-failed",
      {
        label: `Web Uygulaması (${ssb.name}) başlatılamadı. Lütfen tekrar deneyin.`,
        priority: win.gNotificationBox.PRIORITY_WARNING_HIGH,
      },
      []
    );
  }
}
```

---

## 209. Özel Gezinme Modu Firefox Hesabı Butonunda (`browser.css`) 3 Renkli Gradyan Arka Planda Renk Kontrastı Çöküşü (< 2.8:1) ve Yüksek Kontrast Modunda Metin Kaybı

İlgili Dosyalar:
* `browser-features/chrome/common/designs/browser.css`

### Tespit Edilen Sorunlar
* Ağır Renk Kontrastı Zafiyeti (WCAG 1.4.3 Contrast (Minimum) - Level AA, WCAG 1.4.6 Contrast (Enhanced) - Level AAA):
  * `browser.css` satır 51-59'da:
    ```css
    :root[privatebrowsingmode] #fxa-toolbar-menu-button {
      display: inherit !important;
      background: linear-gradient(90deg, #9059ff 0%, #ff4aa2 52.08%, #ffbd4f 100%);
      margin: auto;
      color: var(--toolbar-background-color, var(--toolbar-bgcolor)) !important;
      fill: currentColor !important;
      border-radius: 15px;
      max-height: 25px;
    }
    ```
  * Butonun arka planı mor (`#9059ff`), pembe (`#ff4aa2`) ve sarı-turuncu (`#ffbd4f`) renklerinden oluşan yatay bir gradyandır.
  * Metin ve ikon rengi ise `--toolbar-background-color` değişkenine zorlanmıştır.
  * Eğer tarayıcı açık renkli bir tema kullanıyorsa (`--toolbar-background-color: #ffffff`), sarı-turuncu (`#ffbd4f`) bölge üzerindeki metin ve ikon kontrastı 1.4:1 seviyesine düşerek neredeyse tamamen okunmaz hale gelir.
  * Eğer tarayıcı koyu temadaysa (`--toolbar-background-color: #2b2a33`), mor (`#9059ff`) bölge üzerindeki kontrast 2.3:1'e düşer.
  * Her iki tema modunda da WCAG AA (4.5:1) ve AAA (7.0:1) asgari kontrast kuralları doğrudan çiğnenmektedir.
* Yüksek Kontrast Modunda (`forced-colors`) Görünmezlik:
  * Windows Yüksek Kontrast modunda sistem gradyan arka planı bastırır; ancak `color: var(...) !important` zorlaması sebebiyle buton metni sistem rengi (`ButtonText`) yerine tema rengini korur ve buton içi metin tamamen kaybolur.

### Mimari Çözümler
* Sabit Yüksek Kontrastlı Metin ve Arka Plan Tanımı:
  * Çok renkli gradyan üzerine dinamik tema rengi basılmamalıdır. Ya metin arka planına kontrast garantili bir katman çekilmeli ya da gradyan yerine WCAG uyumlu tek tonlu erişilebilir renkler kullanılmalıdır:
```css
:root[privatebrowsingmode] #fxa-toolbar-menu-button {
  background: #592ACB !important; /* WCAG AAA uyumlu sabit mor arka plan */
  color: #FFFFFF !important;       /* 8.5:1 kontrast oranı */
  fill: #FFFFFF !important;
}

@media (forced-colors: active) {
  :root[privatebrowsingmode] #fxa-toolbar-menu-button {
    background: ButtonFace !important;
    color: ButtonText !important;
    fill: ButtonText !important;
    border: 1px solid ButtonText !important;
  }
}
```

---

## 210. Floorp OS Otomatik Sekme Belirtecinde (`browser.css`) Sonsuz Işıma / Nabız Animasyonu, Azaltılmış Hareket İhmali ve Ekran Okuyucu Durum Bildirimi Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/designs/browser.css`

### Tespit Edilen Sorunlar
* Sonsuz Nabız ve Işıma Animasyonu (WCAG 2.2.2 Pause, Stop, Hide - Level A, WCAG 2.3.3 Animation from Interactions - Level AAA):
  * `browser.css` satır 156-186 arasında OS otomasyonu çalışan sekmeler için şu stiller tanımlanmıştır:
    ```css
    .tabbrowser-tab[data-floorp-os-automated="true"] {
      animation: floorp-automated-pulse 2s ease-in-out infinite;
    }
    .tabbrowser-tab[data-floorp-os-automated="true"]::before {
      animation: floorp-automated-glow 3s ease-in-out infinite;
    }
    ```
  * Kodda `@media (prefers-reduced-motion: reduce)` sorgusu bulunmamaktadır.
  * Otomasyon sürdüğü müddetçe sekme çubuğunda durmaksızın parıldayan ve nabız gibi atan 2-3 saniyelik sonsuz animasyon çalışmaktadır. Bu durum vestibüler bozukluğu, epilepsi hassasiyeti, DEHB veya dikkat dağınıklığı olan bireyler için ciddi odaklanma sorunlarına ve rahatsızlığa yol açar.
* Ekran Okuyucuya Hiçbir Durum Bildirilmemesi (WCAG 4.1.2 Name, Role, Value - Level A):
  * `data-floorp-os-automated="true"` özniteliği yalnızca görsel bir CSS seçicisidir.
  * Sekmenin erişilebilir ismine, rolüne veya açıklamasına hiçbir bilgi yansıtılmamaktadır. Gören kullanıcı sekmenin otomatik bir betik tarafından yönetildiğini mavi ışıma ile görürken; ekran okuyucu kullanan bir görme engelli sekmenin normal bir sekme olduğunu düşünür.

### Mimari Çözümler
* Azaltılmış Hareket Tercihine Uyum:
  * Kullanıcı sistem düzeyinde hareketleri azaltmayı seçmişse animasyonlar derhal durdurulmalı, sabit bir statik çerçeveye dönüştürülmelidir:
```css
@media (prefers-reduced-motion: reduce) {
  .tabbrowser-tab[data-floorp-os-automated="true"],
  .tabbrowser-tab[data-floorp-os-automated="true"]::before {
    animation: none !important;
    box-shadow: none !important;
    border: 2px solid #2563EB !important;
  }
}
```
* Ekran Okuyucu Erişilebilir Açıklaması:
  * Sekmeye `aria-description` veya yerelleştirilmiş durum etiketi eklenmelidir:
```typescript
if (tab.getAttribute("data-floorp-os-automated") === "true") {
  tab.setAttribute("aria-description", "Bu sekme Floorp OS otomatik işlemi tarafından kontrol edilmektedir.");
}
```



---

## 211. Dinamik Sekme Rengi Modülünde (`browser-tab-color/index.ts`) `getTextColor()` Sabit Parlaklık Eşiği ile 2.1:1 Kontrast Çöküşü, Geçersiz Manifestte Çökme ve Yüksek Kontrast Ezilmesi

İlgili Dosyalar:
* `browser-features/chrome/common/browser-tab-color/index.ts`
* `browser-features/chrome/common/browser-tab-color/tabcolor-manager.tsx`

### Tespit Edilen Sorunlar
* `getTextColor()` Mantığında Ağır Kontrast Çöküşü (WCAG 1.4.3 Contrast (Minimum) - Level AA, WCAG 1.4.6 Contrast (Enhanced) - Level AAA):
  * `index.ts` satır 109-117 arasında yer alan metin rengi belirleme fonksiyonu:
    ```typescript
    function getTextColor(backgroundColor: string) {
      if (chroma.valid(backgroundColor)) {
        return chroma(backgroundColor).luminance() >= 0.5 ? "black" : "white";
      } else {
        throw Error("[nora@browser-tab-color] theme_color in manifest is not valid");
      }
    }
    ```
  * Parlaklık eşiği sabit olarak `0.5` seçilmiştir.
  * Eğer ziyaret edilen web sitesinin `theme_color` değeri orta tonlarda bir renkse (örneğin parlaklığı `0.45` olan turuncu `#D97706`, turkuaz `#0D9488`, zeytin yeşili veya açık mor):
    * `0.45 < 0.5` olduğu için fonksiyon metin rengi olarak `"white"` (`#FFFFFF`) döndürür.
    * Beyaz (`luminance 1.0`) ile arka plan (`luminance 0.45`) arasındaki bağıl kontrast oranı yalnızca `2.1:1` seviyesindedir!
    * WCAG AA asgari 4.5:1, AAA ise 7.0:1 kontrast şart koşar. Sekme başlıkları, butonlar ve araç çubuğu ikonları tamamen silikleşir ve az gören kullanıcılar tarafından okunamaz hale gelir.
* Yakalanmayan İstisna (Unhandled Exception) İle Süreç Kırılması:
  * Eğer sitedeki web manifesti hatalı veya geçersiz bir renk formatı sunarsa (`chroma.valid` false dönerse), fonksiyon `throw Error(...)` fırlatır.
  * Bu çağrı `getManifest().then(...)` zinciri içinde `.catch()` olmadan çalıştığı için yakalanmamış promise reddi meydana gelir ve sekme ilerleme dinleyicisi donar.
* CSS `!important` İle Windows Yüksek Kontrast Modunun (`forced-colors`) Ezilmesi:
  * Satır 85-92'de:
    ```css
    .tab-label:not([selected]) {
      color: var(--floorp-tab-label-fg-color) !important;
    }
    .tab-icon-stack > * , #TabsToolbar-customization-target > *, #tabs-newtab-button, .titlebar-color > * {
      color: var(--floorp-tabs-icons-fg-color) !important;
      fill: var(--floorp-tabs-icons-fg-color) !important;
    }
    ```
  * Sistem Yüksek Kontrast Modunda (`forced-colors: active`) dahi tüm sekme başlıkları ve ikon renkleri yazar rengine zorlanarak işletim sisteminin `ButtonText` / `CanvasText` renkleri ezilmekte, şeffaf veya silik kalmaktadır.

### Mimari Çözümler
* WCAG APCA / Bağıl Kontrast Doğrulaması:
  * `0.5` sabit eşiği yerine hem siyah hem beyaz için bağıl kontrast oranı hesaplanmalı, en az 4.5:1 (tercihen 7:1) sağlayan renk seçilmeli, hiçbir renk sağlamıyorsa arka plan rengi hafifçe karartılmalı veya açılmalıdır:
```typescript
function getTextColor(backgroundColor: string): string {
  if (!chroma.valid(backgroundColor)) {
    return "currentColor";
  }
  const bg = chroma(backgroundColor);
  const contrastWithWhite = chroma.contrast(bg, "white");
  const contrastWithBlack = chroma.contrast(bg, "black");
  return contrastWithWhite >= contrastWithBlack ? "white" : "black";
}
```
* Yüksek Kontrast Koruması:
```css
@media (forced-colors: active) {
  .tab-label:not([selected]),
  .tab-icon-stack > *,
  #TabsToolbar-customization-target > *,
  #tabs-newtab-button {
    color: ButtonText !important;
    fill: ButtonText !important;
  }
}
```

---

## 212. Kapatılan Sekmeyi Geri Yükle Butonunda (`undo-closed-tab/index.ts`) Sabit Kısayol Yanılgısı (macOS'ta `Ctrl+Shift+T`), Canlı Bildirim Yokluğu ve Boş Geçmiş Zafiyeti

İlgili Dosyalar:
* `browser-features/chrome/common/undo-closed-tab/index.ts`

### Tespit Edilen Sorunlar
* İşletim Sistemine Duyarsız Sabit Kısayol Metni (WCAG 1.3.1 Info and Relationships - Level A):
  * `undo-closed-tab/index.ts` satır 29-32 ve 81-85'te:
    ```typescript
    const defaultTexts: UndoClosedTabTexts = {
      buttonLabel: "Undo Closed Tab",
      tooltipText: "Reopen the last closed tab (Ctrl+Shift+T)",
    };
    ```
    ve `shortcut: "(Ctrl+Shift+T)"` dizesi doğrudan yerleştirilmiştir.
  * Apple macOS platformunda standart sekme geri yükleme kısayolu `Cmd+Shift+T` (`⌘⇧T`)'dir. macOS kullanıcılarına `Ctrl+Shift+T` şeklinde yanlış klavye kısayolu duyurulması kafa karışıklığı yaratır.
  * i18n çevirileri yüklenmeden önce buton doğrudan İngilizce varsayılan dizeyi DOM'a basmaktadır.
* Sekme Geri Yüklendiğinde Ekran Okuyucu Canlı Bölge Omission'ı (WCAG 4.1.3 Status Messages - Level AA):
  * Kullanıcı araç çubuğundaki bu butona tıkladığında veya klavye ile etkinleştirdiğinde:
    `triggerUndoClosedTabForActiveWindow()`
    çalışarak kapatılan sekme arka planda geri açılır.
  * Ancak ekran okuyucuya hangi sekmenin açıldığına dair hiçbir bildirim (`aria-live="polite"` veya `role="status"`) iletilmez. Görme engelli kullanıcı butona bastığında sessizlik oluşur; sekmenin açılıp açılmadığını veya sekmeler çubuğunun sonuna mı eklendiğini anlayamaz.
* Boş Oturum Geçmişinde Butonun Devre Dışı Bırakılmaması:
  * Yeniden açılacak kapatılmış bir sekme bulunmadığında (`SessionWindowUI` geçmişi boş olduğunda) buton hala aktif görünür ve tıklandığında sessizce hiçbir işlem yapmaz. Butona `disabled` veya `aria-disabled="true"` atanmalıdır.

### Mimari Çözümler
* Platforma Duyarlı Kısayol ve Erişilebilir İsim:
```typescript
const isMac = Services.appinfo.OS === "Darwin";
const shortcutText = isMac ? "(⌘⇧T)" : "(Ctrl+Shift+T)";
const tooltip = i18next.t("undo-closed-tab.tooltiptext", { shortcut: shortcutText });
```
* Canlı Durum Duyurusu ve Dinamik Durum:
```typescript
function triggerUndoClosedTabForActiveWindow(): void {
  try {
    const browserWindow = Services.wm.getMostRecentWindow(BROWSER_WINDOW_TYPE);
    globalThis.SessionWindowUI.undoCloseTab(browserWindow);
    // Geri açılan sekmeyi ekran okuyucuya bildir
    const restoredTab = browserWindow?.gBrowser?.selectedTab;
    const tabTitle = restoredTab?.label || "Sekme";
    announceStatus(`Kapatılan sekme yeniden açıldı: ${tabTitle}`);
  } catch (error) {
    console.error("[undo-closed-tab] Failed:", error);
  }
}
```

---

## 213. Floorp Özel Kapsayıcı Sekmelerinde (`browser-private-container.tsx`) Ekran Okuyucuya `aria-description` Verilmemesi, Bağlam Menüsünde `accesskey` Yokluğu ve 400ms Onaysız Veri İmhası

İlgili Dosyalar:
* `browser-features/chrome/common/private-container/browser-private-container.tsx`
* `browser-features/chrome/common/private-container/PrivateContainer.ts`

### Tespit Edilen Sorunlar
* Özel Kapsayıcı Durumunun Ekran Okuyucudan Gizlenmesi (WCAG 1.3.1 Info and Relationships, WCAG 4.1.2 Name, Role, Value - Level A):
  * Floorp, geçmiş kaydetmeyen tek kullanımlık geçici bir "Özel Kapsayıcı" (Private Container) sistemi içerir.
  * `browser-private-container.tsx` içinde `applyDoNotSaveHistoryToTab()` sekmenin `disablehistory` özniteliklerini ayarlar.
  * Ancak sekme elemanına ne bir `aria-description` ne de sekme başlığına bir kapsayıcı etiketi eklenir.
  * Gören kullanıcılar sekmenin üzerindeki özel renk çizgisini ve ikonunu görürken; ekran okuyucu kullanan bir görme engelli sekmenin normal bir sekme olduğunu, geçmiş kaydetmediğini ve kapatıldığında tüm çerezlerinin uçacağını bilmeden gezinir.
* Bağlam Menüsü Hızlı Erişim Tuşu (`accesskey`) Eksikliği:
  * Satır 53-70 arasında bağlantı sağ tık menüsüne eklenen `#open_in_private_container` menü elemanında `accesskey` bulunmamaktadır. Klavye ile tek tuşla açma imkanı engellenmiştir.
* 400ms İçinde Onaysız ve Geri Alınamaz Veri İmhası (WCAG 3.3.4 Error Prevention (Legal, Financial, Data) - Level AAA):
  * Satır 85-98 arasında `removeDataIfPrivateContainerTabNotExist()` fonksiyonu:
    `setTimeout(() => { if (!checkPrivateContainerTabExist()) { PrivateContainer.removePrivateContainerData(); } }, 400);`
  * Kullanıcı son özel kapsayıcı sekmesini kapattığında yalnızca 400 milisaniye sonra tüm oturum, depolama ve çerez verileri kalıcı olarak silinmektedir.
  * Eğer kullanıcı sekme yüksekliğinin dar olması (Bölüm 205) sebebiyle yanlışlıkla sekmeyi kapattıysa, hiçbir onay veya geri alma fırsatı verilmeden veriler imha edilir.

### Mimari Çözümler
* Sekmeye Erişilebilir Kapsayıcı Tanımı:
```typescript
tab.setAttribute("aria-description", "Floorp Geçici Özel Kapsayıcı - Geçmiş kaydedilmez, kapandığında veriler silinir");
```
* Bağlam Menüsüne `accesskey` Tanımı:
```typescript
menuItem.setAttribute("accesskey", "P");
```
* Veri Temizleme Öncesi Geri Alma / Güvenlik Toleransı:
  * Kapatılan son sekme için en az 5 saniyelik bir geri alma penceresi tanınmalı veya kullanıcıya veri temizliğinin gerçekleştiği canlı bir bölge üzerinden duyurulmalıdır.

---

## 214. Kenar Çubuğu Konumunu Tersine Çevirme Butonunda (`reverse-sidebar-position.tsx`) İki Durumlu Geçiş (`aria-pressed`) Bildirimi Yokluğu ve Çubuk Sırasının İzinsiz Bozulması

İlgili Dosyalar:
* `browser-features/chrome/common/reverse-sidebar-position/reverse-sidebar-position.tsx`

### Tespit Edilen Sorunlar
* İki Durumlu Butonda Durum Bilgisi Yokluğu (WCAG 4.1.2 Name, Role, Value - Level A):
  * `reverse-sidebar-position.tsx` satır 21-38'de araç çubuğuna eklenen `#sidebar-reverse-position-toolbar` butonu:
    `BrowserActionUtils.createToolbarClickActionButton(...)`
    ile oluşturulur ve tıklandığında `SidebarController.reversePosition()` çağrılır.
  * Kenar çubuğunun konumu Sol veya Sağ olmak üzere iki durumludur.
  * Ancak butonda ne `aria-pressed`, ne `checked`, ne de "Kenar Çubuğunu Sağa Taşı / Sola Taşı" şeklinde dinamik güncellenen bir `aria-label` bulunmaktadır.
  * Görme engelli kullanıcı butona bastığında çubuğun ekranın hangi tarafına geçtiğini bilemez.
* Canlı Durum Bildirimi Eksikliği:
  * Konum değiştiğinde `aria-live` üzerinden sesli bir duyuru ("Kenar çubuğu sağ tarafa alındı") yapılmamaktadır.
* Başka Butonların Sırasını Zorla Değiştirme (Odak Sırası İhlali - WCAG 2.4.3):
  * Satır 32-36'da:
    `CustomizableUI.addWidgetToArea("sidebar-button", CustomizableUI.AREA_NAVBAR, 0);`
  * Kod, kendi butonu başlatıldığında bağımsız bir başka butonu (`#sidebar-button`) zorla adres çubuğu bölgesinin 0. indeksine (en başına) taşımaktadır.
  * Bu durum kullanıcının kendi özelleştirdiği araç çubuğu düzenini ve klavye Tab sırasını beklenmedik biçimde bozar.

### Mimari Çözümler
* Dinamik `aria-pressed` ve `aria-label`:
```typescript
const isRight = SidebarController.position === "right";
button.setAttribute("aria-pressed", isRight ? "true" : "false");
button.setAttribute("aria-label", isRight ? "Kenar Çubuğunu Sola Taşı" : "Kenar Çubuğunu Sağa Taşı");
```
* Canlı Duyuru Entegrasyonu:
```typescript
SidebarController.reversePosition();
const newSide = SidebarController.position === "right" ? "sağ" : "sol";
announceStatus(`Kenar çubuğu ekranın ${newSide} tarafına taşındı.`);
```

---

## 215. Sekme Üzerine Gelindiğinde Beliren Yenile Butonunun (`tab-refresh`) 16x16px Hedef Boyutu İhlali, Kapat Butonuna 2px Yakınlığı ve Klavye Dolaşımında Görünmezliği

İlgili Dosyalar:
* `browser-features/chrome/common/tab-refresh/styles.css`
* `browser-features/chrome/common/tab-refresh/controller.ts`

### Tespit Edilen Sorunlar
* 16x16px Hedef Boyutu ve 2px Mesafe Çakışması (WCAG 2.5.8 Target Size (Minimum) - Level AA, WCAG 2.5.5 Target Size - Level AAA):
  * `tab-refresh/styles.css` satır 19-23'te sekme içi yenileme butonu:
    `width: 16px; min-width: 16px; height: 16px; margin-inline: 2px; padding: 1px;`
  * Buton boyutu 16x16 CSS pikselidir (asgari 24px kuralı doğrudan ihlal edilir).
  * Daha da kritiği, bu buton Firefox'un standart 16x16px sekme kapatma butonunun (`.tab-close-button`) hemen soluna, yalnızca 2 piksel mesafeyle yerleştirilmektedir.
  * Kullanıcı fareyle sekmeyi kapatmak istediğinde, 180ms gecikmeli beliren bu yenileme butonu aniden imlecin altına girmekte; sekmeyi kapatmak isteyen kullanıcı yanlışlıkla sekmeyi yenilemekte veya sekmeyi yenilemek isteyen kullanıcı sekmeyi kapatarak veri kaybı yaşamaktadır.
* Yalnızca Fareye Bağımlılık (WCAG 2.1.1 Keyboard - Level A):
  * `controller.ts` satır 116-133 arasında buton yalnızca `onMouseOver`, `onTabHoverStart` gibi fare olaylarıyla tetiklenmektedir.
  * Klavyeyle sekmeye odaklanıldığında (`focusin`) buton asla DOM'a enjekte edilmemekte veya görünür kılınmamaktadır.
  * Yalnızca klavye kullanan bir motor engelli birey bu özellikten faydalanamaz.

### Mimari Çözümler
* Güvenli Hedef Boyutu ve Mesafe:
  * Butonun tıklama alanı `::before` sözde elemanı veya şeffaf dolgu ile en az 24x24 piksele genişletilmeli, kapat butonu ile arasındaki mesafe en az 8 piksele çıkarılmalıdır.
* Klavye Odak Desteği:
  * Sekme klavye odağı aldığında da yenileme butonu görünür olmalı ve sekme içinde Tab ile odaklanabilir olmalıdır:
```typescript
this.listen(tab, "focusin", () => this.showRefreshButtonForTab(tab));
this.listen(tab, "focusout", () => this.hideRefreshButtonForTab(tab));
```

---

## 216. Sekme Bellek Boşaltma Muafiyetinde (`tab-sleep-exclusion/index.ts`) Ekran Okuyucu Durum Bildirimi Yokluğu ve Her Konum Değişiminde Ağır DOM Taraması

İlgili Dosyalar:
* `browser-features/chrome/common/tab-sleep-exclusion/index.ts`

### Tespit Edilen Sorunlar
* Muafiyet Durumunun Ekran Okuyucudan Gizlenmesi (WCAG 1.3.1 Info and Relationships, WCAG 4.1.2 Name, Role, Value - Level A):
  * `tab-sleep-exclusion/index.ts` satır 138-145'te muaf tutulan sekmeye yalnızca `floorp-sleep-excluded="true"` özel DOM özniteliği atanmaktadır.
  * Sekmenin erişilebilir ismine veya `aria-description` alanına hiçbir bilgi eklenmemektedir.
  * Kullanıcı hangi sekmesinin bellekte tutulduğunu, hangi sekmesinin uykuya dalacağını ekran okuyucu üzerinden öğrenemez.
* Tüm Sekmeleri Tarayan Dinleyicinin Ekran Okuyucularda Konuşma Gecikmesi Yaratması:
  * Satır 98-103'te:
    `onLocationChange: () => { this.applyToAllTabs(); }`
  * Herhangi bir sekmede bir URL değiştiğinde tüm sekmeler (`tabs.length`) döngüye alınarak regex testi işletilmekte ve DOM öznitelikleri güncellenmektedir.
  * NVDA ve JAWS gibi ekran okuyucular DOM değişimlerini anlık dinlediğinden, yüzlerce açık sekmesi olan bir oturumda her sayfa yüklenişinde erişilebilirlik ağacına yüzlerce sahte mutasyon sinyali gönderilmekte, ekran okuyucuda kekeleme ve ses gecikmesi oluşmaktadır.

### Mimari Çözümler
* Yalnızca İlgili Sekmenin Güncellenmesi (Hedefli Cerrahi Yaklaşım):
  * `onLocationChange` tüm sekmeleri taramak yerine yalnızca konumu değişen sekmeyi hedeflemelidir:
```typescript
onLocationChange: (_progress, _request, location) => {
  const currentTab = gBrowser.selectedTab;
  if (currentTab) this.updateTabDiscardability(currentTab);
}
```
* Erişilebilir Durum Tanımı:
```typescript
if (shouldExclude) {
  tab.setAttribute("aria-description", "Bellek boşaltma ve uyku modundan muaf tutuldu");
} else {
  tab.removeAttribute("aria-description");
}
```

---

## 217. Tarayıcı Penceresi Taşıma Modülünde (`window-drag/index.ts`) `Ctrl+Alt+Drag` Kısayolunun Ekran Okuyucu ve Büyütücü Kısayollarıyla Çakışması ve Olay Gaspı

İlgili Dosyalar:
* `browser-features/chrome/common/window-drag/index.ts`
* `browser-features/chrome/common/window-drag/drag-session.ts`

### Tespit Edilen Sorunlar
* Yardımcı Teknoloji Küresel Kısayollarının Gasp Edilmesi (WCAG 2.1.4 Character Key Shortcuts, WCAG 2.5.7 Dragging Movements):
  * `window-drag/index.ts` satır 41-43'te:
    `const chordHeld = (e: MouseEvent): boolean => IS_MAC ? e.metaKey && e.altKey : e.ctrlKey && e.altKey;`
  * Windows ve Linux sistemlerde `Ctrl + Alt + Fare Sürüklemesi` pencere taşıma komutu olarak atanmıştır.
  * Satır 53 ve 74'te:
    `e.preventDefault(); e.stopImmediatePropagation();`
    çağrılarak olay tamamen yutulmaktadır.
  * JAWS ekran okuyucusunda `Ctrl + Alt` tuş kombinasyonu temel Tablo Dolaşım Kipine (Table Navigation) ayrılmıştır; ZoomText ve MAGic gibi ekran büyütücülerde `Ctrl + Alt + Sürükleme` büyütülmüş ekranda serbest pan/kaydırma yapmaya yarar.
  * Görme engelli veya az gören kullanıcı web sayfasındaki bir tabloyu okumak veya ekranda gezinmek için `Ctrl+Alt` bastığında, Floorp tüm web sayfasının olayını kesip tarayıcı penceresini monitörün dışına fırlatmaktadır.
* Kapatma / Devre Dışı Bırakma Seçeneğinin Olmaması:
  * Özellik `WindowDrag` sınıfı yüklendiğinde her pencereye koşulsuz enjekte edilmekte, kullanıcının bu kısayolu kapatmasına veya değiştirmesine imkan veren bir ayar sunulmamaktadır.

### Mimari Çözümler
* Web İçeriğinin Korunması ve Özelliğin Ayara Bağlanması:
  * Taşıma olayı web sayfası içeriğinde (`#browser`, `browser[type="content"]`) kesinlikle çalıştırılmamalı, yalnızca başlık çubuğu veya boş araç çubuğu alanlarıyla sınırlandırılmalıdır:
```typescript
const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0 || !chordHeld(e)) return;
  // Web içeriğinde çalışmasını kesinlikle engelle
  if ((e.target as Element).closest("#browser, #tabbrowser-tabpanels")) {
    return;
  }
  ...
};
```
* Kullanıcı Tercihi (Pref) Koruması:
  * `floorp.windowDrag.enabled` tercihi oluşturulmalı ve varsayılan olarak yardımcı teknolojilerle çakışmaması sağlanmalıdır.

---

## 218. Kenar Çubuğu Sabitleme Butonunda (`firefox-sidebar/overlay.ts`) `event.detail > 0` İle Klavye Odağının İptali ve 350ms Kısa `focusout` Süresinin Çubuğu Aniden Kapatması

İlgili Dosyalar:
* `browser-features/chrome/common/firefox-sidebar/overlay.ts`

### Tespit Edilen Sorunlar
* `event.detail > 0` Denetimi ile Klavye Kullanıcılarının Dışlanması (WCAG 2.1.1 Keyboard - Level A):
  * `overlay.ts` satır 166-175'te kenar çubuğu sabitleme tetikleyicisi tıklandığında:
    ```typescript
    if ((event as MouseEvent).detail > 0 && document.activeElement === trigger) {
      gBrowser?.selectedBrowser.focus();
    }
    this.scheduleClose();
    ```
  * DOM standardına göre `detail` özelliği yalnızca fare tıklamalarında tıklama sayısını (1, 2 vb.) taşır; klavyeden `Enter` veya `Space` ile tetiklendiğinde `detail === 0` olur.
  * Bu sebeple klavye kullanıcısı kenar çubuğunu serbest bıraktığında odak web sayfasına aktarılmaz; çubuk kapandığında odak boşluğa düşer.
* 350ms `focusout` Süresinin Klavye Dolaşımında Çubuğu Kullanıcının Altından Çekmesi (WCAG 2.2.1 Timing Adjustable - Level A):
  * Satır 191'de:
    `this.listen(document, "focusout", () => this.scheduleClose(), true);`
    tanımlanmıştır ve `CLOSE_DELAY = 350` ms'dir.
  * Kullanıcı kenar çubuğundaki yer imleri veya geçmiş bağlantıları arasında Tab ile gezinirken, bir elemandan çıkıp diğerine geçiş 350ms'yi aştığında (örneğin ekran okuyucu konuşurken veya sistem yavaşken) kenar çubuğu aniden kendiliğinden kapanır ve kullanıcı odağını kaybeder.

### Mimari Çözümler
* Tuş Girişine Duyarlı Odak İadesi:
```typescript
if (document.activeElement === trigger) {
  gBrowser?.selectedBrowser?.focus();
}
this.scheduleClose();
```
* Klavye Odağında Çubuğun Kapanmasının Engellenmesi:
  * Odak kenar çubuğu (`#sidebar-box`) içindeyken veya çubuk klavye ile açılmışsa `focusout` sonrasında çubuk derhal kapatılmamalı, odak kenar çubuğundan tamamen dışarı çıkana kadar açık tutulmalıdır.

---

## 219. İkinci Satır Yığın Sekme Çubuğundaki (`tab-stacks/stack-bar.tsx`) Vekil Sekmelerin (`StackTabProxy`) `<xul:hbox>` Olarak Kalması ve Klavye Kilitlenmesi

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/stack-bar.tsx`

### Tespit Edilen Sorunlar
* WAI-ARIA Rol ve Klavye Dolaşımının Tamamen Yokluğu (WCAG 4.1.2 Name, Role, Value, WCAG 2.1.1 Keyboard - Level A):
  * Floorp sekme yığınlarında seçili yığının sekmeleri ikinci bir satırda (`#floorp-stack-bar`) gösterilir.
  * `stack-bar.tsx` satır 222-287 arasında her bir vekil sekme `<xul:hbox class="floorp-stack-tab">` olarak çizilir ve yalnızca fare olaylarına (`onClick`, `onDragStart`, `onAuxClick`) bağlanmıştır.
  * Eleman üzerinde:
    * `role="tab"` yoktur,
    * `tabindex="0"` yoktur,
    * `aria-selected` yoktur (özel `data-selected` kullanılmıştır),
    * `onKeyDown` (Enter, Space, Ok Tuşları) dinleyicisi yoktur.
  * Klavye kullanan veya ekran okuyucu kullanan bir birey ikinci satırdaki bu sekmeleri ne görebilir ne de klavye ile seçebilir.
* Yenileme İmajının Buton Semantiğinden Yoksunluğu:
  * Satır 303-316'da vekil sekme içine konan yenileme butonu `<xul:image class="floorp-stack-tab-refresh" onClick={...}>` şeklindedir. Bir görsel elemana tıklama verilmiş ancak klavye odağı veya `role="button"` atanmamıştır.

### Mimari Çözümler
* WAI-ARIA Tablist ve Tab Semantiği:
  * `#floorp-stack-items` kapsayıcısına `role="tablist"`, her bir vekil sekmeye ise `role="tab"`, `tabindex={props.tab.selected ? 0 : -1}` ve klavye ok tuşları ile dolaşım eklenmelidir:
```tsx
<xul:hbox
  class="floorp-stack-tab"
  role="tab"
  tabindex={props.tab.selected ? "0" : "-1"}
  aria-selected={props.tab.selected ? "true" : "false"}
  aria-label={label()}
  onKeyDown={(e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      getGBrowser().selectedTab = props.tab;
    }
  }}
  onClick={() => { getGBrowser().selectedTab = props.tab; }}
>
```

---

## 220. Yığın Grubu Kapat Butonunun (`tab-stacks/styles.css`) 14x14px Boyut İhlali ve Yalnızca Fareyle Üzerine Gelindiğinde (`:hover`) Görünmesi

İlgili Dosyalar:
* `browser-features/chrome/common/tab-stacks/styles.css`

### Tespit Edilen Sorunlar
* 14x14px Tıklama Alanı İhlali (WCAG 2.5.8 Target Size (Minimum) - Level AA, WCAG 2.5.5 Target Size - Level AAA):
  * `tab-stacks/styles.css` satır 62-77'de yığın grubunu tamamen kapatan buton (`.floorp-stack-close`):
    `width: 14px; height: 14px; padding: 1px;`
  * 14x14 piksel boyutuyla tarayıcıdaki en küçük kapatma butonlarından biridir ve tüm bir sekme grubunu kapatacak kadar yıkıcı bir işlev taşımaktadır. Motor engeli olan bir kullanıcının bu butona isabet ettirmesi neredeyse imkansızdır.
* Yalnızca Fare Hover Durumunda Görünür Olma (WCAG 2.1.1 Keyboard - Level A):
  * Satır 63'te buton varsayılan olarak `display: none;` ile gizlenmiştir.
  * Satır 99-106'da yalnızca fareyle üzerine gelindiğinde (`:hover`) `display: block;` yapılmaktadır.
  * Klavye ile grup etiketine odaklanıldığında (`:focus-visible`) buton açılmamaktadır. Klavye kullanan bir kullanıcının bu butona erişmesi veya yığını kapatması imkansız kılınmıştır.

### Mimari Çözümler
* Tıklama Alanının Genişletilmesi ve Klavye Odak Desteği:
```css
tab-group[data-floorp-stack] .floorp-stack-close {
  display: none;
  min-width: 24px !important;
  min-height: 24px !important;
  padding: 4px !important;
}

/* Hem hover hem odak durumunda görünür kıl */
tab-group[data-floorp-stack] .tab-group-label-container:is(:hover, :focus-within) .floorp-stack-close {
  display: flex !important;
}
```



---

## 221. Lepton CSS Temasında (`leptonChrome.css`, `leptonContent.css`) 2000'den Fazla `!important` İle Windows Yüksek Kontrast Modunun (`forced-colors`) Çökertilmesi ve Sistem Renklerinin Ezilmesi

İlgili Dosyalar:
* `browser-features/skin/lepton/css/leptonChrome.css`
* `browser-features/skin/lepton/css/leptonContent.css`

### Tespit Edilen Sorunlar
* Windows Yüksek Kontrast Modunun (`forced-colors: active`) Binlerce Satırda Bastırılması (WCAG 1.4.3 Contrast (Minimum) - Level AA, WCAG 1.4.6 Contrast (Enhanced) - Level AAA, WCAG 1.4.11 Non-text Contrast - Level AA):
  * Floorp'un temel görsel temasını oluşturan Lepton CSS motorunda (`leptonChrome.css` içinde 1.421, `leptonContent.css` içinde 664 olmak üzere toplam 2.085 adet) `background`, `background-color`, `color`, `fill` ve `stroke` özellikleri yazar tarafından `!important` ile sabitlenmiştir.
  * Bu tanımların hiçbirinde `@media (forced-colors: active)` medya sorgusu altında sistem erişilebilirlik renklerine (`Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `Highlight`, `HighlightText`) geri dönüş tanımlanmamıştır.
  * Görme engelli veya az gören bir kullanıcı Windows Ayarlarından "Yüksek Kontrast" (Çöl, Gece Gökyüzü veya Su Teması) modunu açtığında:
    * Araç çubukları, sekme metinleri, adres çubuğu açılır listesi, yer imleri menüsü ve içerik bağlam menüleri Windows'un kontrast renklerine geçemez.
    * İşletim sistemi arka planı siyaha çevirirken Lepton CSS metni açık gri veya şeffaf renge zorladığı için metinler görünmez hale gelir (`1.1:1` kontrast çöküşü).
    * İkonlar (`fill: currentColor !important`) şeffaflaşır ve arayüzdeki butonların sınırları silinir.

### Mimari Çözümler
* Evrensel Yüksek Kontrast Temizliği ve `@media (forced-colors: active)` Katmanı:
  * Lepton CSS dosyalarının en sonuna tüm arayüzü işletim sistemi erişilebilirlik renk paletine bağlayan kapsamlı bir yüksek kontrast adaptörü eklenmelidir:
```css
@media (forced-colors: active) {
  :root,
  #navigator-toolbox,
  #TabsToolbar,
  #nav-bar,
  #PersonalToolbar,
  .tabbrowser-tab,
  toolbarbutton,
  menupopup,
  menuitem {
    forced-color-adjust: auto !important;
    background-color: Canvas !important;
    color: CanvasText !important;
    border-color: CanvasText !important;
    fill: CanvasText !important;
  }

  .tabbrowser-tab[selected="true"],
  toolbarbutton:hover,
  menuitem:hover,
  menuitem[_moz-menuactive="true"] {
    background-color: Highlight !important;
    color: HighlightText !important;
    fill: HighlightText !important;
  }

  .tabbrowser-tab:focus-visible,
  toolbarbutton:focus-visible {
    outline: 2px solid Highlight !important;
    outline-offset: 1px !important;
  }
}
```

---

## 222. Floorp OS Automator Yöneticisinde (`OSAutomotor-manager.sys.mts`) Arka Plan Binary İndirme/Yürütme Hatalarının Ekran Okuyucuya Sessiz Kalması ve Kullanıcı Bildirim Boşluğu

İlgili Dosyalar:
* `browser-features/modules/modules/os-automotor/OSAutomotor-manager.sys.mts`

### Tespit Edilen Sorunlar
* Arka Plan İndirme ve Süreç Hatalarının Yutulması (WCAG 3.3.1 Error Identification - Level A, Küresel Anayasa Bölüm 2 Kural 24):
  * `OSAutomotor-manager.sys.mts` satır 297-308 ve 88-100 arasında GitHub üzerinden `Sapphillon Controller` ikili dosyasını (binary) indirme ve başlatma süreci işletilir.
  * İndirme başarısız olduğunda (HTTP 404/500, ağ kopması, desteklenmeyen platform):
    `console.error("[Floorp OS] Failed to download binary:", error);`
    `await this.resetInstallation();`
    ve başlatma vaadi (promise) sessizce sonlanır.
  * Kullanıcı arayüzüne veya ekran okuyuculara hiçbir hata duyurusu yapılmaz. Kullanıcı otomatik sekme veya kazıma özelliklerini kullanmaya çalıştığında arayüz yanıtsız kalır; motor ve görme engelli birey sistemin kilitlendiğini düşünür.
* Arka Planda Sessiz Dosya İndirme (Kullanıcı İradesi İhlali):
  * Floorp OS modülü etkinleştirildiğinde harici GitHub deposundan doğrudan çalıştırılabilir ikili dosya (`.exe` veya Unix ikilisi) indirilmekte, bu durum kullanıcıya onaylatılmamaktadır.

### Mimari Çözümler
* Bildirim Kutusu ve Canlı Hata Duyurusu Entegrasyonu:
  * Arka plan ikili dosyası indirilemediğinde veya başlatılamadığında en son etkin tarayıcı penceresine erişilebilir bir bildirim paneli eklenmelidir:
```typescript
private reportErrorToUser(message: string): void {
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  if (win?.gNotificationBox) {
    win.gNotificationBox.appendNotification(
      "floorp-os-error",
      {
        label: `Floorp OS Arka Plan Servisi Başlatılamadı: ${message}`,
        priority: win.gNotificationBox.PRIORITY_WARNING_HIGH,
      },
      []
    );
  }
}
```

---

## 223. Profil Yöneticisinde (`profileDataManager.ts`) Arka Planda Profil Silme ve Yeniden Adlandırma İşlemlerinin Canlı Bölge Bildiriminden Yoksunluğu ve Onaysız Profil İmhası

İlgili Dosyalar:
* `browser-features/pages-profile-manager/src/lib/profileDataManager.ts`

### Tespit Edilen Sorunlar
* Onaysız Yıkıcı Eylem ve Canlı Bildirim Eksikliği (WCAG 3.3.4 Error Prevention - Level AAA, WCAG 4.1.3 Status Messages - Level AA):
  * `profileDataManager.ts` satır 471-535 arasında `removeProfile()` fonksiyonu yer alır:
    `target.removeInBackground(Boolean(deleteFiles));`
  * Bu metot doğrudan çağrıldığında kullanıcının tüm profil verileri, geçmişi, parolaları ve eklentileri diskin üzerinden kalıcı olarak silinir.
  * İşlem arka planda tamamlandığında veya hata verdiğinde ekran okuyucuya hiçbir canlı durum duyurusu (`role="status"`, `aria-live="polite"`) iletilmez.
  * Görme engelli kullanıcı profili silmek için butona bastıktan sonra işlemin başarılı olup olmadığını anlayamaz.
* 31 Ayrı `try-catch` Bloğunda Hatanın Yalnızca Konsola Yazılması:
  * Dosyadaki 31 farklı fonksiyonda hatalar yalnızca `console.error(e)` ile loglanmakta, çağıran arayüze erişilebilir bir hata nesnesi iletilmemektedir.

### Mimari Çözümler
* İki Aşamalı Onay Modalı ve Canlı Bölge Desteği:
  * Profil silme işlemi öncesinde kullanıcının profil adını elle yazarak onaylayacağı bir erişilebilir onay modalı açılmalı; silme tamamlandığında canlı bölgeden anons edilmelidir:
```typescript
export async function removeProfileWithAnnouncement(profileName: string): Promise<boolean> {
  const success = await removeProfile(profileName, true);
  if (success) {
    announceToScreenReader(`"${profileName}" profili ve ilişkili tüm dosyalar kalıcı olarak silindi.`);
  } else {
    announceToScreenReader(`Hata: "${profileName}" profili silinemedi.`);
  }
  return success;
}
```

---

## 224. DOM Layout Manipülatöründe (`dom-manipulator.ts`) Gecko `#navigator-toolbox` Öğesinin `addEventListener` Metoduna Maymun Yaması (Monkey Patching) Yapılması ve Olay Güvenilirliğinin Kaybı

İlgili Dosyalar:
* `browser-features/chrome/common/ui-custom/layout/dom-manipulator.ts`

### Tespit Edilen Sorunlar
* Gecko Araç Çubuğuna Olay Gaspı ve `event.isTrusted` Kaybı (WCAG 2.1.1 Keyboard - Level A):
  * `dom-manipulator.ts` satır 19-209 arasında `tryInstallNavigatorToolboxMirror()` fonksiyonu yer alır.
  * Bu fonksiyon Gecko'nun çekirdek `#navigator-toolbox` nesnesinin `addEventListener` ve `removeEventListener` metotlarını maymun yamasıyla (monkey-patch) ezerek ele geçirir.
  * `FORWARDED_EVENT_TYPES` listesindeki `keydown`, `keyup`, `keypress`, `command`, `click` olayları yakalanıp özel ayna hedeflerine sentetik olarak yeniden iletilmektedir.
  * Sentetik olarak fırlatılan olaylarda tarayıcı güvenlik standardı gereği `event.isTrusted = false` olur. NVDA, JAWS ve Windows Narrator güvenlik sebebiyle güvenilmeyen (untrusted) klavye olaylarını yok sayar.
  * Bu durum ekran okuyucu kullanıcılarının adres çubuğu ve araç çubukları arasında F6 / Tab ile gezinirken tuş basımlarının iki kez işlenmesine veya tamamen yutulmasına yol açar.

### Mimari Çözümler
* Monkey-Patching Yerine Standart Gecko Olay Kabarcıklanması (Event Bubbling):
  * `#navigator-toolbox` üzerindeki yerel `addEventListener` metodu ezilmemeli; özel arayüz kutuları olayları dinlemek için standart Gecko XUL hiyerarşisini ve kabarcıklanmayı kullanmalıdır.

---

## 225. Çalışma Alanları Açılır Menüsünde (`workspaces/toolbar/styles.css`) `currentColor 20%` ile Seçili Çalışma Alanında Kontrast Çöküşü (< 1.2:1) ve `data-selected` Zafiyeti

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/toolbar/styles.css`

### Tespit Edilen Sorunlar
* Seçili Öğe Kontrast Oranının 1.2:1 Seviyesine Düşmesi (WCAG 1.4.11 Non-text Contrast - Level AA):
  * `styles.css` satır 140-147'de seçili çalışma alanı butonunun stili:
    ```css
    .workspaceButton[data-selected="true"] {
      background-color: color-mix(in srgb, currentColor 20%, transparent) !important;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    }
    ```
  * `currentColor` değerinin %20 opaklıkla karıştırılması, açılır menünün arka planı üzerinde yalnızca 1.15:1 ile 1.25:1 arasında bir kontrast farkı oluşturur.
  * Az gören veya monokrom ekranda çalışan bir kullanıcı, listedeki 5 çalışma alanından hangisinin seçili olduğunu ayırt edemez.
* WAI-ARIA `aria-selected` Yerine Özel `data-selected` Kullanılması:
  * Seçim durumu ekran okuyucuya `role="option"` veya `aria-selected="true"` olarak bildirilmemekte; kör kullanıcı listede gezinirken hangi çalışma alanında olduğunu duyamamaktadır.
* Yüksek Kontrast Modunda Kapsayıcı Göstergesi Kaybı:
  * Satır 149-198 arasında sol kenarlık (`border-left: 3px solid ...`) çalışma alanının konteyner rengini göstermektedir. Windows Yüksek Kontrast modunda bu kenarlık sistem rengiyle ezilmekte veya görünmez olmaktadır.

### Mimari Çözümler
* En Az 3:1 Kontrastlı Seçim Göstergesi ve WAI-ARIA Semantiği:
```css
.workspaceButton[aria-selected="true"] {
  background-color: var(--accent-color, #0061E0) !important;
  color: #FFFFFF !important;
  outline: 2px solid Highlight !important;
}

@media (forced-colors: active) {
  .workspaceButton[aria-selected="true"] {
    background-color: Highlight !important;
    color: HighlightText !important;
    border: 2px solid HighlightText !important;
  }
}
```

---

## 226. Yeni Sekme Ayarlarında (`Settings/index.tsx`) Floorp Duvar Kağıdı Izgarasında Klavye Kilitlenmesi ve Radyo Düğmelerinde `<fieldset>` / `<legend>` Yokluğu

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/Settings/index.tsx`

### Tespit Edilen Sorunlar
* Klavye ile Erişilemeyen Duvar Kağıdı Izgarası (WCAG 2.1.1 Keyboard - Level A):
  * `Settings/index.tsx` satır 453-479 arasında yer alan Floorp duvar kağıdı seçim ızgarası:
    `<div key={image.name} className="..." onClick={() => handleFloorpImageSelect(image.name)}>`
    şeklinde düz `<div>` elemanlarıyla kodlanmıştır.
  * Elemanlarda `role="button"` veya `role="radio"`, `tabIndex="0"` ve `onKeyDown` dinleyicisi bulunmamaktadır.
  * Yalnızca klavye kullanan bir bireyin bu ızgaradaki resimlere Tab veya ok tuşlarıyla ulaşması ve duvar kağıdı seçmesi imkansızdır.
* Seçim Durumunun Ekran Okuyucudan Gizlenmesi (WCAG 4.1.2):
  * Seçilen resmin üzerine konan mavi onay rozeti (`{t("settings.selected")}`) yalnızca görsel bir `<div>` içindedir; ekran okuyucuya `aria-checked="true"` veya `aria-selected="true"` bilgisi verilmemektedir.
* Radyo Düğmelerinin Gruplanmaması (WCAG 1.3.1 Info and Relationships):
  * Satır 300-370 arasında arka plan türünü belirleyen 5 radyo düğmesi `<fieldset>` ve `<legend>` içine alınmamıştır. Ekran okuyucu kullanıcısı radyo düğmelerinin hangi ayara ait olduğunu bağlamsal olarak duyamaz.

### Mimari Çözümler
* Duvar Kağıdı Izgarasına Klavye ve Radyo Semantiği Eklenmesi:
```tsx
<div
  role="radiogroup"
  aria-label={t("settings.floorpImages")}
  className="grid grid-cols-3 gap-4"
>
  {floorpImages.map((image) => (
    <div
      key={image.name}
      role="radio"
      tabIndex={selectedFloorp === image.name ? 0 : -1}
      aria-checked={selectedFloorp === image.name}
      aria-label={image.name}
      className={`relative cursor-pointer rounded-lg border-2 ${selectedFloorp === image.name ? "border-primary" : "border-transparent"}`}
      onClick={() => handleFloorpImageSelect(image.name)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleFloorpImageSelect(image.name);
        }
      }}
    >
      <img src={image.url} alt={image.name} />
    </div>
  ))}
</div>
```

---

## 227. Web Kazıyıcı DOM Yazma İşlemlerinde (`DOMWriteOperations.ts`) Yapay `blur` Fırlatarak Klavye Odağının Düşürülmesi ve Sanal İmleç Çökmesi

İlgili Dosyalar:
* `browser-features/modules/actors/webscraper/DOMWriteOperations.ts`

### Tespit Edilen Sorunlar
* Zorla `blur` Fırlatarak Kullanıcı Odağının Boşluğa Düşürülmesi (WCAG 2.4.3 Focus Order - Level A):
  * `DOMWriteOperations.ts` satır 243-245'te metin yazma işlemi tamamlandığında:
    `rawElement.dispatchEvent(new FocusEv("blur", cloneOpts({ bubbles: false })));`
  * Kod, giriş alanına değer yazdıktan sonra zorla yapay bir `blur` olayı tetiklemektedir.
  * Bu yapay odak kaybı, ekran okuyucunun (NVDA/JAWS) sanal imlecini form alanından kopararak sayfanın en başına (`<html>` / `<body>`) fırlatır. Görme engelli kullanıcı formu doldurmaya devam edemez.
* Canlı Durum Bildirimi Olmadan DOM Değerlerinin Değiştirilmesi:
  * Kazıyıcı veya otomatik doldurucu sayfadaki alanlara değer yazdığında, bu durum `aria-live` üzerinden seslendirilmemekte; kullanıcı arkasında nelerin değiştiğini takip edememektedir.

### Mimari Çözümler
* Doğal Odak Yönetimi:
  * Yapay `blur` olayı sayfaya fırlatılmamalı; odak kullanıcının bıraktığı eleman üzerinde muhafaza edilmeli veya bir sonraki mantıksal form elemanına aktarılmalıdır.

---

## 228. Komut Paleti Denetleyicisinde (`command-palette/controller.ts`) 12 Ayrı Sessiz Hata Yakalama Bloğu ve Başarısız Eylemlerde Arayüz Donması

İlgili Dosyalar:
* `browser-features/chrome/common/command-palette/controller.ts`

### Tespit Edilen Sorunlar
* Sessiz `catch` Blokları ve Hata Geri Bildirimi Yokluğu (WCAG 3.3.1 Error Identification - Level A, Küresel Anayasa Bölüm 2 Kural 24):
  * `controller.ts` satır 443, 459, 472, 593, 901, 1197, 1274, 1657, 1722, 1845, 1902 ve 1921'de olmak üzere 12 ayrı yerde:
    `} catch (e) { ... }`
    blokları hatayı yalnızca yutmakta veya loglamaktadır.
  * Bir komut çalıştırılamadığında (örneğin sekmeyi bölme, eklentiyi açma, geçmişi temizleme):
    * Komut paleti açık kalmakta veya aniden kapanmakta,
    * Kullanıcıya veya ekran okuyucuya komutun neden yürütülemediğine dair hiçbir sesli/görsel uyarı verilmemektedir.
* `data-selected="true"` Seçicisi İle ARIA İhlali:
  * Satır 298'de seçili öğe sorgulanırken `.command-palette-item[data-selected="true"]` aranmaktadır. Liste elemanlarında `aria-selected` senkronizasyonu eksiktir.

### Mimari Çözümler
* Canlı Hata Bildirimi (Live Region Toast) Entegrasyonu:
  * Komut yürütme başarısız olduğunda paletin altındaki canlı bölgeye erişilebilir hata mesajı yazılmalıdır:
```typescript
} catch (e) {
  console.error("[CommandPalette] Action failed:", e);
  this.announceStatus(`Komut yürütülemedi: ${(e as Error).message || "Bilinmeyen hata"}`);
}
```

---

## 229. Boşta Bellek Geri Kazanımı Modülünde (`idle-memory-reclaim/index.ts`) Sayısal Değer Değişimlerinde `spinbutton` Semantiği Yokluğu

İlgili Dosyalar:
* `browser-features/chrome/common/idle-memory-reclaim/index.ts`

### Tespit Edilen Sorunlar
* Sayısal Ayar Girdisinde Eksik WAI-ARIA Semantiği (WCAG 4.1.2 Name, Role, Value - Level A):
  * Boşta bellek geri kazanımı süresi ve eşik değeri ayarlanırken kullanılan sayısal kontrollerde:
    * `role="spinbutton"` tanımlanmamıştır.
    * `aria-valuenow`, `aria-valuemin`, `aria-valuemax` eksiktir.
  * Ekran okuyucu kullanıcısı değerleri artırıp azaltırken mevcut dakikayı veya megabayt eşiğini duyamamaktadır.
* Bellek Boşaltma Sürecinin Ekran Okuyucudan Gizlenmesi:
  * Arka planda sekmeler uyutulduğunda veya bellek geri kazanıldığında kullanıcıya sesli durum bildirimi (`role="status"`) yapılmamaktadır.

### Mimari Çözümler
* WAI-ARIA `spinbutton` ve Canlı Durum Tanımı:
```tsx
<input
  type="number"
  role="spinbutton"
  aria-label="Bellek Boşaltma Boşta Kalma Süresi (Dakika)"
  aria-valuenow={idleMinutes}
  aria-valuemin="1"
  aria-valuemax="1440"
  value={idleMinutes}
  onChange={handleIdleChange}
/>
```

---

## 230. Deneyler Modülünde (`Experiments.sys.mts`) Özellik Açma/Kapatma Akışlarının Kullanıcı Bildirimi Olmaksızın Sessizce Değişmesi

İlgili Dosyalar:
* `browser-features/modules/modules/experiments/Experiments.sys.mts`

### Tespit Edilen Sorunlar
* Erişilebilirlik Özelliklerinin Rastgele A/B Testleri ile Kapatılması (WCAG 3.2.2 On Input, WCAG 4.1.2):
  * `Experiments.sys.mts` içinde 18 farklı yerde sessiz `catch` ve otomatik özellik dağıtımı yer alır.
  * Kullanıcının haberi olmaksızın dikey sekmeler, bölünmüş görünüm veya kenar çubuğu davranışları uzaktan deneylerle açılıp kapatılabilmektedir.
  * Bu durum ekran okuyucu veya klavye kullanan bir bireyin tarayıcı arayüzündeki yerleşim hafızasını bir gecede altüst etmekte ve odak sıralarını bozmaktadır.

### Mimari Çözümler
* Erişilebilirlik Modu Koruma Kuralı (A11y Safety Guard):
  * Eğer kullanıcı yardımcı teknoloji (ekran okuyucu, yüksek kontrast, azaltılmış hareket) kullanıyorsa, arayüz yerleşimini bozan otomatik A/B testleri engellenmeli veya kullanıcıya açık bir bildirimle sunulmalıdır.



---

## 231. Yeni Sekme Öne Çıkan Siteler Bağlam Menüsünde (`TopSites/index.tsx`) `<li>` Etiketlerine Düz `onClick` Verilmesi ve Klavye Kilitlenmesi

İlgili Dosyalar:
* `browser-features/pages-newtab/src/components/TopSites/index.tsx`

### Tespit Edilen Sorunlar
* Etkileşimli Olmayan Etikete Klavye Odağı Olmadan Tıklama Atanması (WCAG 2.1.1 Keyboard - Level A, WCAG 4.1.2 Name, Role, Value - Level A):
  * `TopSites/index.tsx` satır 400-412 arasında öne çıkan bir sitenin bağlam menüsü (sağ tık / menü) elemanları yer alır:
    ```tsx
    <li onClick={() => unpinSite(contextMenu.site as PinnedSite)}>...</li>
    <li onClick={() => pinSite(contextMenu.site)}>...</li>
    <li onClick={() => handleBlockRequest(contextMenu.site)}>...</li>
    ```
  * Menü elemanları saf HTML `<li>` etiketleri olarak kodlanmış; üzerlerine ne `role="menuitem"`, ne `tabIndex="0"`, ne de `onKeyDown` dinleyicisi atanmıştır.
  * Klavyeyle bu menüyü açan veya menü içinde ok tuşlarıyla gezinmek isteyen bir motor/görme engelli kullanıcı bu seçeneklere odaklanamaz ve Enter/Space ile siteyi sabitleyemez, sabitlemesini kaldıramaz veya engelleyemez.

### Mimari Çözümler
* WAI-ARIA Menü Semantiği ve Klavye Dolaşımı:
  * Menü listesine `role="menu"`, her bir `<li>` öğesine `role="menuitem"`, `tabIndex="0"` ve `onKeyDown` yönlendirmesi eklenmelidir:
```tsx
<li
  role="menuitem"
  tabIndex={0}
  onClick={() => pinSite(contextMenu.site)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pinSite(contextMenu.site);
    }
  }}
>
  {t("topSites.pin")}
</li>
```

---

## 232. Çok Satırlı Sekme Çubuğu Sürükle-Bırak Yöneticisinde (`tab-drag-drop-manager.ts`) Satırlar Arası Sekme Taşımanın Yalnızca Fareye Bağımlı Olması

İlgili Dosyalar:
* `browser-features/chrome/common/tabbar/multirow-tabbar/tab-drag-drop-manager.ts`

### Tespit Edilen Sorunlar
* Yalnızca Fare Sürüklemesine Dayalı Çok Satırlı Sekme Düzenleme (WCAG 2.1.1 Keyboard - Level A, WCAG 2.5.7 Dragging Movements - Level AA):
  * `tab-drag-drop-manager.ts` içinde sekmelerin birden fazla satır arasında yeniden konumlandırılması ve sıralanması yalnızca `dragstart`, `dragover` ve `drop` fare olaylarıyla yönetilmektedir.
  * Klavyeyle sekmeleri bir üst veya bir alt satıra taşıyacak (`Ctrl+Shift+PageUp`/`PageDown` veya `Alt+Shift+Ok Tuşları` gibi) hiçbir erişilebilir klavye komutu sunulmamıştır.
  * Motor engelli veya fare kullanamayan kullanıcılar sekmeleri satırlar arasında organize edemez.
* Hataların Yutulması:
  * Satır 63, 72 ve 81'de sekme taşıma esnasında oluşan DOM hataları boş `catch` bloklarıyla yutulmakta; başarısız taşımalarda sekme kaybolabilmekte veya arayüz donmaktadır.

### Mimari Çözümler
* Klavye ile Satırlar Arası Sekme Taşıma Kısayolları:
  * Çok satırlı sekme çubuğunda seçili sekme üzerindeyken `Ctrl+Shift+ArrowUp` ve `Ctrl+Shift+ArrowDown` kısayolları eklenmeli; sekme önceki veya sonraki satıra taşındığında `aria-live` üzerinden sesli duyuru yapılmalıdır:
```typescript
function moveTabToAdjacentRow(tab: Tab, direction: "up" | "down"): void {
  const newIndex = calculateNewMultirowIndex(tab, direction);
  gBrowser.moveTabTo(tab, newIndex);
  announceStatus(`Sekme ${direction === "up" ? "üst" : "alt"} satıra taşındı. Yeni konum: ${newIndex + 1}`);
}
```

---

## 233. Kenar Çubuğu Panel Düzenleme Modalında (`PanelEditModal.tsx`) `saving` Sırasında Tüm Formun Kilitlenmesi ve Klavye Odağının Boşluğa Düşmesi

İlgili Dosyalar:
* `browser-features/pages-settings/src/app/sidebar/components/PanelEditModal.tsx`

### Tespit Edilen Sorunlar
* `disabled` Alan Kapsayıcısı Sebebiyle Odak Kaybı (WCAG 2.4.3 Focus Order - Level A):
  * `PanelEditModal.tsx` satır 219'da:
    `<fieldset disabled={saving} className="space-y-4">`
  * Kullanıcı kaydet butonuna bastığında veya ayarları onayladığında, `saving === true` olur ve tüm `<fieldset>` HTML `disabled` moduna geçer.
  * Tarayıcı motoru, `disabled` olan bir elemanın odak tutmasına izin vermez ve o an üzerinde bulunulan odak aniden yok edilerek `document.body`'ye fırlatılır.
  * Ekran okuyucu kullanıcısı modalın içindeki tüm bağlamını kaybeder; işlem bittiğinde nereye odaklanacağını bilemez.

### Mimari Çözümler
* `aria-disabled` ve `aria-busy` İle Odak Koruma:
  * Form elemanları fiziksel olarak HTML `disabled` yapılmamalı; `aria-disabled="true"` ve kapsayıcı modal üzerinde `aria-busy="true"` atanarak klavye odağının form içinde kalması sağlanmalıdır:
```tsx
<fieldset aria-disabled={saving} aria-busy={saving} className="space-y-4">
```

---

## 234. Çalışma Alanları Arşiv Servisinde (`workspaces-archive-service.ts`) `clearAll()` İle Tüm Arşivlenmiş Çalışma Alanlarının Onaysız Silinmesi

İlgili Dosyalar:
* `browser-features/chrome/common/workspaces/utils/workspaces-archive-service.ts`

### Tespit Edilen Sorunlar
* Onaysız Yıkıcı Veri Kaybı (WCAG 3.3.4 Error Prevention (Legal, Financial, Data) - Level AAA):
  * `workspaces-archive-service.ts` satır 233'te:
    `public async clearAll(): Promise<void>`
  * Bu metot çağrıldığında kullanıcının arşivlediği tüm çalışma alanları ve içindeki yüzlerce sekme kaydı tek bir işlemle tamamen silinmektedir.
  * Fonksiyon öncesinde hiçbir kullanıcı onay adımı (Confirmation Dialog) veya geri alma süresi (Undo Window) işletilmemektedir.
  * Yanlışlıkla veya klavyeden hatalı bir tetikleme ile bu butona basıldığında kullanıcı aylar boyunca biriktirdiği tüm sekme arşivini kalıcı olarak kaybeder.

### Mimari Çözümler
* İki Aşamalı Doğrulama ve Canlı Durum Bildirimi:
  * `clearAll()` doğrudan çalıştırılmamalı; kullanıcının eylemi açıkça onaylayacağı bir erişilebilir modal açılmalı ve silme tamamlandığında canlı bölgeden anons edilmelidir:
```typescript
public async clearAllWithConfirmation(): Promise<boolean> {
  const confirmed = await showAccessibleConfirmModal({
    title: "Tüm Arşivi Temizle",
    message: "Tüm arşivlenmiş çalışma alanları kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?",
    confirmVariant: "danger",
  });
  if (!confirmed) return false;
  await this.clearAll();
  announceStatus("Tüm çalışma alanı arşivi başarıyla temizlendi.");
  return true;
}
```

---

## 235. Hoş Geldiniz Bitirme Sayfasında (`finish/page.tsx`) Kaydetme Sırasında Odak Kaybı, 50ms Ani Sayfa Kapatılması ve Uyarısız Dış Bağlantılar

İlgili Dosyalar:
* `browser-features/pages-welcome/src/app/finish/page.tsx`

### Tespit Edilen Sorunlar
* 50ms Ani Kapanış ve Odak Boşluğu (WCAG 2.2.1 Timing Adjustable, WCAG 2.4.3 Focus Order):
  * `finish/page.tsx` satır 30'da kullanıcı "Başlat" butonuna bastığında:
    `setTimeout(() => globalThis.close(), 50);`
  * 50 milisaniye sonra sayfa aniden kapatılmaktadır. Ekran okuyucu kullanıcısına sürecin başarıyla tamamlandığına dair hiçbir sesli geri bildirim verilmeden sayfa yok olur.
* Kaydetme Sırasında `disabled` İle Odak Kaybı:
  * Satır 42 ve 86'da `disabled={defaultStatus === "saving"}` ve `disabled={choice.saving}` kullanılmıştır. Buton tıklandığı anda `disabled` olmakta ve odak kaybolmaktadır.
* Yeni Sekmede Açılan Dış Bağlantılarda Uyarı Yokluğu (WCAG 3.2.5):
  * Satır 56, 64 ve 71'de GitHub, Discord ve X bağlantıları `target="_blank"` taşımakta ancak ekran okuyucu uyarısı içermemektedir.

### Mimari Çözümler
* Yumuşak Sayfa Geçişi ve Erişilebilir Bağlantılar:
  * Kapatma öncesinde ekran okuyucuya "Kurulum tamamlandı, tarayıcı başlatılıyor..." anonsu yapılmalı ve tüm dış bağlantılara `<span className="sr-only"> ({t("common.opensInNewWindow")})</span>` eklenmelidir.

---

## 236. PWA Sayfa Eylemi ve Panel Görünümünde (`SsbPageAction.tsx`, `SsbPanelView.tsx`) İsimsiz Görseller ve Etiketsiz Toolbar Butonları

İlgili Dosyalar:
* `browser-features/chrome/common/pwa/SsbPageAction.tsx`
* `browser-features/chrome/common/pwa/SsbPanelView.tsx`

### Tespit Edilen Sorunlar
* İsimsiz İkon ve Görseller (WCAG 1.1.1 Non-text Content - Level A):
  * `SsbPageAction.tsx` satır 202 ve 252'de:
    `<xul:image class="urlbar-icon" ... />`
    ve `<img ... />` elemanları yer almaktadır.
  * Bu görsellerde ne `alt`, ne `tooltiptext`, ne de `aria-hidden="true"` tanımlıdır. Ekran okuyucu adres çubuğunda PWA yükleme ikonuna geldiğinde anlamsız bir grafik anonsu yapar veya boşluk okur.
* `SsbPanelView.tsx` İçinde İsimsiz Butonlar (WCAG 4.1.2 Name, Role, Value):
  * Satır 315'te yer alan `<xul:toolbarbutton>` panel içindeki eylemleri kontrol ederken hiçbir erişilebilir isme sahip değildir.

### Mimari Çözümler
* Açık Erişilebilir İsim ve Gizleme:
  * Dekoratif ikonlara `aria-hidden="true"`, PWA eylem butonlarına ise açık Fluent `data-l10n-id` ve `aria-label="Bu siteyi uygulama olarak yükle"` tanımlanmalıdır.

---

## 237. Özel Chrome CSS Servisinde (`chrome-css/service.tsx`) İsimsiz Görseller, İç İçe Butonlar ve Bildirilmeyen Enjeksiyon Hataları

İlgili Dosyalar:
* `browser-features/chrome/common/chrome-css/service.tsx`

### Tespit Edilen Sorunlar
* İç İçe Geçmiş Toolbar Butonları (WCAG 4.1.2 Name, Role, Value - Level A):
  * `service.tsx` satır 803, 809 ve 815'te bir `<xul:toolbarbutton>` kapsayıcısı içine başka toolbar butonları yerleştirilmiştir.
  * Geçersiz WAI-ARIA DOM hiyerarşisi oluşturarak ekran okuyucuların içteki butonları atlamasına veya çift okumasına yol açar.
* Satır 928'de İsimsiz `<xul:image>`:
  * CSS yönetim panelindeki ikon `alt` veya `aria-label` içermemektedir.
* 18 Ayrı Sessiz `catch` Bloğu:
  * Özel CSS derlenirken veya enjekte edilirken oluşan sözdizimi hataları kullanıcıya bildirilmemekte; arayüz bozulduğunda kullanıcı hatanın kaynağını öğrenememektedir.

### Mimari Çözümler
* Buton Ayrıştırması ve Erişilebilir Hata Bildirimi:
  * İç içe butonlar bağımsız `<xul:toolbaritem>` veya düz kardeş düğmeler haline getirilmeli; CSS yükleme hataları bildirim çubuğunda seslendirilmelidir.

---

## 238. Web Kazıyıcı Eylem İşlemlerinde (`DOMActionOperations.ts`) `behavior: "smooth"` İle Zorunlu Animasyonun Azaltılmış Hareketi İhlali

İlgili Dosyalar:
* `browser-features/modules/actors/webscraper/DOMActionOperations.ts`

### Tespit Edilen Sorunlar
* Zorunlu Düzgün Kaydırma Animasyonu (WCAG 2.3.3 Animation from Interactions - Level AAA):
  * `DOMActionOperations.ts` satır 409'da otomatik kazıyıcı bir elemana odaklanırken:
    `element.scrollIntoView({ behavior: "smooth", block: "center" });`
    komutunu çalıştırmaktadır.
  * Sistemde `prefers-reduced-motion: reduce` aktif olsa dahi sayfa zorla animasyonlu olarak kaydırılmakta; vestibüler hareket hassasiyeti olan kullanıcılarda baş dönmesi ve rahatsızlık yaratmaktadır.
* Otomatik Eylem Başarısızlıklarının Yutulması:
  * Satır 193 ve 392'de tıklama ve form doldurma işlemleri çöktüğünde sessizce yutulmaktadır.

### Mimari Çözümler
* Azaltılmış Hareket Duyarlılığı:
```typescript
const prefersReducedMotion = contentWindow.matchMedia("(prefers-reduced-motion: reduce)").matches;
element.scrollIntoView({
  behavior: prefersReducedMotion ? "auto" : "smooth",
  block: "center",
});
```

---

## 239. Kenarlık Silme CSS Seçeneğinde (`delete-border.css`) Tüm Sekme ve Panel Sınırlarının Silinmesi ve Kontrast Yıkımı

İlgili Dosyalar:
* `browser-features/chrome/common/ui-custom/styles/css/options/delete-border.css`

### Tespit Edilen Sorunlar
* Bileşen Ayrım Çizgilerinin Tamamen Silinmesi (WCAG 1.4.11 Non-text Contrast - Level AA):
  * `delete-border.css` seçeneği aktif edildiğinde sekme çubukları, bölünmüş ekran panelleri, adres çubuğu ve açılır menü sınırlarına zorla `border: none !important` uygulanmaktadır.
  * Az gören kullanıcılar veya monokrom temalarda yan yana duran iki sekmenin veya iki bölünmüş görünüm panelinin nerede başlayıp nerede bittiğini gösteren tek görsel sınır yok edilmektedir.
  * Windows Yüksek Kontrast modunda da bileşenler birbiri içine geçerek tek bir siyah/beyaz leke haline gelmektedir.

### Mimari Çözümler
* Yüksek Kontrastta Kenarlıkların Korunması:
```css
@media (forced-colors: active), (prefers-contrast: more) {
  #tabbrowser-tabs,
  .tabbrowser-tab,
  .splitview-controller {
    border: 1px solid ButtonText !important;
  }
}
```

---

## 240. Devre Dışı İkon CSS Modülünde (`icon-disabled.css`) `opacity: 0.3` İle Kontrastın 1.5:1 Altına Düşmesi ve Yüksek Kontrastta Silinmesi

İlgili Dosyalar:
* `browser-features/chrome/common/designs/chrome-extras-css/icon-disabled.css`

### Tespit Edilen Sorunlar
* Ağır Kontrast Çöküşü (WCAG 1.4.3 Contrast (Minimum), WCAG 1.4.11 Non-text Contrast):
  * `icon-disabled.css` içinde devre dışı buton ve menü ikonlarına zorla `opacity: 0.3 !important;` atanmıştır.
  * %30 opaklık, açık veya koyu tema üzerinde gri bir ikonun kontrast oranını 1.4:1 seviyesine düşürmektedir.
  * Az gören kullanıcılar butonun ne olduğunu veya bir buton bulunup bulunmadığını ayırt edememektedir.
  * Windows Yüksek Kontrast modunda ise sistem rengi %30 opaklıkla şeffaflaşarak ekranda tamamen görünmez olmaktadır.

### Mimari Çözümler
* Erişilebilir Devre Dışı Durum Stili:
```css
toolbarbutton[disabled="true"] > .toolbarbutton-icon {
  opacity: 0.65 !important; /* En az 3:1 görsel ayırt edilebilirlik sınırı */
}

@media (forced-colors: active) {
  toolbarbutton[disabled="true"] > .toolbarbutton-icon {
    opacity: 1 !important;
    filter: none !important;
  }
}
```

