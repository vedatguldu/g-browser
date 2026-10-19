using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

public class InstallerLocale {
    public string Code;
    public string Bcp47;
    public string NativeName;
    public string WindowTitle;
    public string HeaderTitle;
    public string HeaderSubtitle;
    public string LanguageLabel;
    public string InstallDirLabel;
    public string BrowseButton;
    public string DesktopShortcut;
    public string StartMenuShortcut;
    public string LaunchAfterInstall;
    public string ReadyStatus;
    public string InstallButton;
    public string CancelButton;
    public string FinishButton;
    public string ExtractingPackage;
    public string CopyingFilesFormat;
    public string CreatingShortcuts;
    public string ConfiguringRegistry;
    public string CompletedStatus;
    public string ErrorPrefix;
    public string AppDescription;
    public string FolderDialogDescription;

    public override string ToString() {
        return NativeName;
    }
}

public static class LocalizationManager {
    public static readonly List<InstallerLocale> SupportedLocales = new List<InstallerLocale> {
        new InstallerLocale {
            Code = "tr",
            Bcp47 = "tr",
            NativeName = "T\u00fcrk\u00e7e",
            WindowTitle = "G-Browser Kurulum Sihirbaz\u0131",
            HeaderTitle = "G-Browser Kurulumu",
            HeaderSubtitle = "Modern, h\u0131zl\u0131, gizlilik odakl\u0131 ve tam eri\u015filebilir web taray\u0131c\u0131s\u0131",
            LanguageLabel = "Dil:",
            InstallDirLabel = "Kurulum Dizini:",
            BrowseButton = "G\u00f6zat...",
            DesktopShortcut = "Masa\u00fcst\u00fcne k\u0131sayol olu\u015ftur",
            StartMenuShortcut = "Ba\u015flat Men\u00fcs\u00fcne k\u0131sayol ekle",
            LaunchAfterInstall = "Kurulum tamamland\u0131\u011f\u0131nda G-Browser'\u0131 ba\u015flat",
            ReadyStatus = "Kuruluma ba\u015flamak i\u00e7in 'Kur' d\u00fc\u011fmesine bas\u0131n\u0131z.",
            InstallButton = "Kur",
            CancelButton = "\u0130ptal",
            FinishButton = "Bitir",
            ExtractingPackage = "Kurulum paketi a\u00e7\u0131l\u0131yor...",
            CopyingFilesFormat = "Dosyalar kopyalan\u0131yor ({0}/{1})...",
            CreatingShortcuts = "K\u0131sayollar olu\u015fturuluyor...",
            ConfiguringRegistry = "Sistem ayarlar\u0131 ve kay\u0131t defteri yap\u0131land\u0131r\u0131l\u0131yor...",
            CompletedStatus = "Kurulum ba\u015far\u0131yla tamamland\u0131!",
            ErrorPrefix = "Hata olu\u015ftu: ",
            AppDescription = "G-Browser - Modern, H\u0131zl\u0131 ve Eri\u015filebilir Web Taray\u0131c\u0131s\u0131",
            FolderDialogDescription = "G-Browser'\u0131n kurulaca\u011f\u0131 klas\u00f6r\u00fc se\u00e7in:"
        },
        new InstallerLocale {
            Code = "en",
            Bcp47 = "en-US",
            NativeName = "English",
            WindowTitle = "G-Browser Setup Wizard",
            HeaderTitle = "G-Browser Setup",
            HeaderSubtitle = "Modern, fast, privacy-focused and fully accessible web browser",
            LanguageLabel = "Language:",
            InstallDirLabel = "Installation Directory:",
            BrowseButton = "Browse...",
            DesktopShortcut = "Create a desktop shortcut",
            StartMenuShortcut = "Add shortcut to Start Menu",
            LaunchAfterInstall = "Launch G-Browser when installation completes",
            ReadyStatus = "Click 'Install' to begin the installation.",
            InstallButton = "Install",
            CancelButton = "Cancel",
            FinishButton = "Finish",
            ExtractingPackage = "Extracting installation package...",
            CopyingFilesFormat = "Copying files ({0}/{1})...",
            CreatingShortcuts = "Creating shortcuts...",
            ConfiguringRegistry = "Configuring system settings and registry...",
            CompletedStatus = "Installation completed successfully!",
            ErrorPrefix = "An error occurred: ",
            AppDescription = "G-Browser - Modern, Fast and Accessible Web Browser",
            FolderDialogDescription = "Select the destination folder for G-Browser:"
        },
        new InstallerLocale {
            Code = "de",
            Bcp47 = "de",
            NativeName = "Deutsch",
            WindowTitle = "G-Browser Installationsassistent",
            HeaderTitle = "G-Browser Installation",
            HeaderSubtitle = "Moderner, schneller, datenschutzorientierter und barrierefreier Webbrowser",
            LanguageLabel = "Sprache:",
            InstallDirLabel = "Installationsverzeichnis:",
            BrowseButton = "Durchsuchen...",
            DesktopShortcut = "Desktop-Verkn\u00fcpfung erstellen",
            StartMenuShortcut = "Verkn\u00fcpfung zum Startmen\u00fc hinzuf\u00fcgen",
            LaunchAfterInstall = "G-Browser nach Abschluss der Installation starten",
            ReadyStatus = "Klicken Sie auf 'Installieren', um zu beginnen.",
            InstallButton = "Installieren",
            CancelButton = "Abbrechen",
            FinishButton = "Fertigstellen",
            ExtractingPackage = "Installationspaket wird entpackt...",
            CopyingFilesFormat = "Dateien werden kopiert ({0}/{1})...",
            CreatingShortcuts = "Verkn\u00fcpfungen werden erstellt...",
            ConfiguringRegistry = "Systemeinstellungen und Registrierung werden konfiguriert...",
            CompletedStatus = "Installation erfolgreich abgeschlossen!",
            ErrorPrefix = "Fehler aufgetreten: ",
            AppDescription = "G-Browser - Moderner, schneller und barrierefreier Webbrowser",
            FolderDialogDescription = "W\u00e4hlen Sie den Installationsordner f\u00fcr G-Browser:"
        },
        new InstallerLocale {
            Code = "fr",
            Bcp47 = "fr",
            NativeName = "Fran\u00e7ais",
            WindowTitle = "Assistant d'installation de G-Browser",
            HeaderTitle = "Installation de G-Browser",
            HeaderSubtitle = "Navigateur web moderne, rapide, ax\u00e9 sur la confidentialit\u00e9 et accessible",
            LanguageLabel = "Langue :",
            InstallDirLabel = "R\u00e9pertoire d'installation :",
            BrowseButton = "Parcourir...",
            DesktopShortcut = "Cr\u00e9er un raccourci sur le Bureau",
            StartMenuShortcut = "Ajouter un raccourci au menu D\u00e9marrer",
            LaunchAfterInstall = "Lancer G-Browser \u00e0 la fin de l'installation",
            ReadyStatus = "Cliquez sur 'Installer' pour commencer.",
            InstallButton = "Installer",
            CancelButton = "Annuler",
            FinishButton = "Terminer",
            ExtractingPackage = "Extraction du paquet d'installation...",
            CopyingFilesFormat = "Copie des fichiers ({0}/{1})...",
            CreatingShortcuts = "Cr\u00e9ation des raccourcis...",
            ConfiguringRegistry = "Configuration des param\u00e8tres syst\u00e8me et du registre...",
            CompletedStatus = "Installation termin\u00e9e avec succ\u00e8s !",
            ErrorPrefix = "Une erreur est survenue : ",
            AppDescription = "G-Browser - Navigateur web moderne, rapide et accessible",
            FolderDialogDescription = "S\u00e9lectionnez le dossier d'installation de G-Browser :"
        },
        new InstallerLocale {
            Code = "es",
            Bcp47 = "es-ES",
            NativeName = "Espa\u00f1ol",
            WindowTitle = "Asistente de instalaci\u00f3n de G-Browser",
            HeaderTitle = "Instalaci\u00f3n de G-Browser",
            HeaderSubtitle = "Navegador web moderno, r\u00e1pido, centrado en la privacidad y accesible",
            LanguageLabel = "Idioma:",
            InstallDirLabel = "Directorio de instalaci\u00f3n:",
            BrowseButton = "Examinar...",
            DesktopShortcut = "Crear un acceso directo en el Escritorio",
            StartMenuShortcut = "A\u00f1adir acceso directo al Men\u00fa Inicio",
            LaunchAfterInstall = "Iniciar G-Browser al finalizar la instalaci\u00f3n",
            ReadyStatus = "Haga clic en 'Instalar' para comenzar.",
            InstallButton = "Instalar",
            CancelButton = "Cancelar",
            FinishButton = "Finalizar",
            ExtractingPackage = "Extrayendo el paquete de instalaci\u00f3n...",
            CopyingFilesFormat = "Copiando archivos ({0}/{1})...",
            CreatingShortcuts = "Creando accesos directos...",
            ConfiguringRegistry = "Configurando ajustes del sistema y registro...",
            CompletedStatus = "\u00a1Instalaci\u00f3n completada con \u00e9xito!",
            ErrorPrefix = "Ocurri\u00f3 un error: ",
            AppDescription = "G-Browser - Navegador web moderno, r\u00e1pido y accesible",
            FolderDialogDescription = "Seleccione la carpeta de instalaci\u00f3n para G-Browser:"
        },
        new InstallerLocale {
            Code = "ru",
            Bcp47 = "ru",
            NativeName = "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
            WindowTitle = "\u041c\u0430\u0441\u0442\u0435\u0440 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 G-Browser",
            HeaderTitle = "\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 G-Browser",
            HeaderSubtitle = "\u0421\u043e\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439, \u0431\u044b\u0441\u0442\u0440\u044b\u0439, \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u044b\u0439 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 \u0432\u0435\u0431-\u0431\u0440\u0430\u0443\u0437\u0435\u0440",
            LanguageLabel = "\u042f\u0437\u044b\u043a:",
            InstallDirLabel = "\u041f\u0430\u043f\u043a\u0430 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438:",
            BrowseButton = "\u041e\u0431\u0437\u043e\u0440...",
            DesktopShortcut = "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u044f\u0440\u043b\u044b\u043a \u043d\u0430 \u0440\u0430\u0431\u043e\u0447\u0435\u043c \u0441\u0442\u043e\u043b\u0435",
            StartMenuShortcut = "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u044f\u0440\u043b\u044b\u043a \u0432 \u043c\u0435\u043d\u044e \u00ab\u041f\u0443\u0441\u043a\u00bb",
            LaunchAfterInstall = "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c G-Browser \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438",
            ReadyStatus = "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c\u00bb, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0443.",
            InstallButton = "\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c",
            CancelButton = "\u041e\u0442\u043c\u0435\u043d\u0430",
            FinishButton = "\u0413\u043e\u0442\u043e\u0432\u043e",
            ExtractingPackage = "\u0420\u0430\u0441\u043f\u0430\u043a\u043e\u0432\u043a\u0430 \u043f\u0430\u043a\u0435\u0442\u0430 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438...",
            CopyingFilesFormat = "\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0444\u0430\u0439\u043b\u043e\u0432 ({0}/{1})...",
            CreatingShortcuts = "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u044f\u0440\u043b\u044b\u043a\u043e\u0432...",
            ConfiguringRegistry = "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0445 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u043e\u0432 \u0438 \u0440\u0435\u0435\u0441\u0442\u0440\u0430...",
            CompletedStatus = "\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430!",
            ErrorPrefix = "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430: ",
            AppDescription = "G-Browser - \u0421\u043e\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439, \u0431\u044b\u0441\u0442\u0440\u044b\u0439 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 \u0432\u0435\u0431-\u0431\u0440\u0430\u0443\u0437\u0435\u0440",
            FolderDialogDescription = "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0430\u043f\u043a\u0443 \u0434\u043b\u044f \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 G-Browser:"
        },
        new InstallerLocale {
            Code = "ar",
            Bcp47 = "ar",
            NativeName = "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
            WindowTitle = "\u0645\u0639\u0627\u0644\u062c \u062a\u062b\u0628\u064a\u062a G-Browser",
            HeaderTitle = "\u062a\u062b\u0628\u064a\u062a G-Browser",
            HeaderSubtitle = "\u0645\u062a\u0635\u0641\u062d \u0648\u064a\u0628 \u062d\u062f\u064a\u062b \u0648\u0633\u0631\u064a\u0639 \u0648\u064a\u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0648\u0633\u0647\u0648\u0644\u0629 \u0627\u0644\u0648\u0635\u0648\u0644",
            LanguageLabel = "\u0627\u0644\u0644\u063a\u0629:",
            InstallDirLabel = "\u0645\u062c\u0644\u062f \u0627\u0644\u062a\u062b\u0628\u064a\u062a:",
            BrowseButton = "\u0627\u0633\u062a\u0639\u0631\u0627\u0636...",
            DesktopShortcut = "\u0625\u0646\u0634\u0627\u0621 \u0627\u062e\u062a\u0635\u0627\u0631 \u0639\u0644\u0649 \u0633\u0637\u062d \u0627\u0644\u0645\u0643\u062a\u0628",
            StartMenuShortcut = "\u0625\u0636\u0627\u0641\u0629 \u0627\u062e\u062a\u0635\u0627\u0631 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0628\u062f\u0623",
            LaunchAfterInstall = "\u062a\u0634\u063a\u064a\u0644 G-Browser \u0639\u0646\u062f \u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u062a\u062b\u0628\u064a\u062a",
            ReadyStatus = "\u0627\u0646\u0642\u0631 \u0641\u0648\u0642 '\u062a\u062b\u0628\u064a\u062a' \u0644\u0628\u062f\u0621 \u0627\u0644\u062a\u062b\u0628\u064a\u062a.",
            InstallButton = "\u062a\u062b\u0628\u064a\u062a",
            CancelButton = "\u0625\u0644\u063a\u0627\u0621",
            FinishButton = "\u0625\u0646\u0647\u0627\u0621",
            ExtractingPackage = "\u062c\u0627\u0631\u064d \u0641\u0643 \u0636\u063a\u0637 \u062d\u0632\u0645\u0629 \u0627\u0644\u062a\u062b\u0628\u064a\u062a...",
            CopyingFilesFormat = "\u062c\u0627\u0631\u064d \u0646\u0633\u062e \u0627\u0644\u0645\u0644\u0641\u0627\u062a ({0}/{1})...",
            CreatingShortcuts = "\u062c\u0627\u0631\u064d \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u062e\u062a\u0635\u0627\u0631\u0627\u062a...",
            ConfiguringRegistry = "\u062c\u0627\u0631\u064d \u062a\u0643\u0648\u064a\u0646 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0633\u062c\u0644...",
            CompletedStatus = "\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u062a\u062b\u0628\u064a\u062a \u0628\u0646\u062c\u0627\u062d!",
            ErrorPrefix = "\u062d\u062f\u062b \u062e\u0637\u0623: ",
            AppDescription = "G-Browser - \u0645\u062a\u0635\u0641\u062d \u0648\u064a\u0628 \u062d\u062f\u064a\u062b \u0648\u0633\u0631\u064a\u0639 \u0648\u0633\u0647\u0644 \u0627\u0644\u0648\u0635\u0648\u0644",
            FolderDialogDescription = "\u0627\u062e\u062a\u0631 \u0645\u062c\u0644\u062f \u0627\u0644\u062a\u062b\u0628\u064a\u062a \u0644\u0640 G-Browser:"
        },
        new InstallerLocale {
            Code = "ja",
            Bcp47 = "ja",
            NativeName = "\u65e5\u672c\u8a9e",
            WindowTitle = "G-Browser \u30bb\u30c3\u30c8\u30a2\u30c3\u30d7\u30a6\u30a3\u30b6\u30fc\u30c9",
            HeaderTitle = "G-Browser \u306e\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb",
            HeaderSubtitle = "\u30e2\u30c0\u30f3\u3067\u9ad8\u901f\u3001\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u91cd\u8996\u306e\u5b8c\u5168\u30a2\u30af\u30bb\u30b7\u30d6\u30eb\u306a\u30a6\u30a7\u30d6\u30d6\u30e9\u30a6\u30b6",
            LanguageLabel = "\u8a00\u8a9e:",
            InstallDirLabel = "\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u5148\u30d5\u30a9\u30eb\u30c0:",
            BrowseButton = "\u53c2\u7167...",
            DesktopShortcut = "\u30c7\u30b9\u30af\u30c8\u30c3\u30d7\u306b\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u3092\u4f5c\u6210",
            StartMenuShortcut = "\u30b9\u30bf\u30fc\u30c8\u30e1\u30cb\u30e5\u30fc\u306b\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u3092\u8ffd\u52a0",
            LaunchAfterInstall = "\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u5b8c\u4e86\u5f8c\u306b G-Browser \u3092\u8d77\u52d5\u3059\u308b",
            ReadyStatus = "\u300c\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u300d\u3092\u30af\u30ea\u30c3\u30af\u3057\u3066\u958b\u59cb\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
            InstallButton = "\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb",
            CancelButton = "\u30ad\u30e3\u30f3\u30bb\u30eb",
            FinishButton = "\u5b8c\u4e86",
            ExtractingPackage = "\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u30d1\u30c3\u30b1\u30fc\u30b8\u3092\u5c55\u958b\u3057\u3066\u3044\u307e\u3059...",
            CopyingFilesFormat = "\u30d5\u30a1\u30a4\u30eb\u3092\u30b3\u30d4\u30fc\u3057\u3066\u3044\u307e\u3059 ({0}/{1})...",
            CreatingShortcuts = "\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u3092\u4f5c\u6210\u3057\u3066\u3044\u307e\u3059...",
            ConfiguringRegistry = "\u30b7\u30b9\u30c6\u30e0\u8a2d\u5b9a\u3068\u30ec\u30b8\u30b9\u30c8\u30ea\u3092\u69cb\u6210\u3057\u3066\u3044\u307e\u3059...",
            CompletedStatus = "\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u304c\u6b63\u5e38\u306b\u5b8c\u4e86\u3057\u307e\u3057\u305f\uff01",
            ErrorPrefix = "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f: ",
            AppDescription = "G-Browser - \u30e2\u30c0\u30f3\u3067\u9ad8\u901f\u3001\u30a2\u30af\u30bb\u30b7\u30d6\u30eb\u306a\u30a6\u30a7\u30d6\u30d6\u30e9\u30a6\u30b6",
            FolderDialogDescription = "G-Browser \u306e\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u5148\u30d5\u30a9\u30eb\u30c0\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044:"
        },
        new InstallerLocale {
            Code = "zh",
            Bcp47 = "zh-CN",
            NativeName = "\u7b80\u4f53\u4e2d\u6587",
            WindowTitle = "G-Browser \u5b89\u88c5\u5411\u5bfc",
            HeaderTitle = "G-Browser \u5b89\u88c5",
            HeaderSubtitle = "\u73b0\u4ee3\u3001\u5feb\u901f\u3001\u6ce8\u91cd\u9690\u79c1\u4e14\u5b8c\u5168\u65e0\u969c\u788d\u7684\u7f51\u7edc\u6d4f\u89c8\u5668",
            LanguageLabel = "\u8bed\u8a00:",
            InstallDirLabel = "\u5b89\u88c5\u76ee\u5f55:",
            BrowseButton = "\u6d4f\u89c8...",
            DesktopShortcut = "\u521b\u5efa\u684c\u9762\u5feb\u6377\u65b9\u5f0f",
            StartMenuShortcut = "\u6dfb\u52a0\u5feb\u6377\u65b9\u5f0f\u5230\u5f00\u59cb\u83dc\u5355",
            LaunchAfterInstall = "\u5b89\u88c5\u5b8c\u6210\u540e\u542f\u52a8 G-Browser",
            ReadyStatus = "\u70b9\u51fb\u201c\u5b89\u88c5\u201d\u6309\u94ae\u5f00\u59cb\u5b89\u88c5\u3002",
            InstallButton = "\u5b89\u88c5",
            CancelButton = "\u53d6\u6d88",
            FinishButton = "\u5b8c\u6210",
            ExtractingPackage = "\u6b63\u5728\u89e3\u538b\u5b89\u88c5\u5305...",
            CopyingFilesFormat = "\u6b63\u5728\u590d\u5236\u6587\u4ef6 ({0}/{1})...",
            CreatingShortcuts = "\u6b63\u5728\u521b\u5efa\u5feb\u6377\u65b9\u5f0f...",
            ConfiguringRegistry = "\u6b63\u5728\u914d\u7f6e\u7cfb\u7edf\u8bbe\u7f6e\u548c\u6ce8\u518c\u8868...",
            CompletedStatus = "\u5b89\u88c5\u5df2\u6210\u529f\u5b8c\u6210\uff01",
            ErrorPrefix = "\u53d1\u751f\u9519\u8bef: ",
            AppDescription = "G-Browser - \u73b0\u4ee3\u3001\u5feb\u901f\u4e14\u65e0\u969c\u788d\u7684\u7f51\u7edc\u6d4f\u89c8\u5668",
            FolderDialogDescription = "\u8bf7\u9009\u62e9 G-Browser \u7684\u5b89\u88c5\u76ee\u5f55:"
        }
    };

    public static InstallerLocale GetLocale(string code) {
        if (!string.IsNullOrEmpty(code)) {
            string normalized = code.Trim().ToLowerInvariant();
            if (normalized.Contains("-")) normalized = normalized.Split('-')[0];
            foreach (var loc in SupportedLocales) {
                if (loc.Code == normalized) return loc;
            }
        }
        return SupportedLocales[1]; // Default fallback: English for unrecognized languages
    }

    public static InstallerLocale DetectInitialLocale(string[] args) {
        if (args != null) {
            foreach (var arg in args) {
                if (arg.StartsWith("/LANG=", StringComparison.OrdinalIgnoreCase) ||
                    arg.StartsWith("-lang=", StringComparison.OrdinalIgnoreCase)) {
                    string code = arg.Substring(6).Trim();
                    return GetLocale(code);
                }
            }
        }
        try {
            string osIso = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            foreach (var loc in SupportedLocales) {
                if (loc.Code == osIso) return loc;
            }
        } catch {}
        return SupportedLocales[0]; // Default to Turkish if detection fails
    }
}

static class Program {
    [STAThread]
    static void Main(string[] args) {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        bool silent = false;
        foreach (var arg in args) {
            if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) || arg.Equals("-s", StringComparison.OrdinalIgnoreCase)) {
                silent = true;
            }
        }

        InstallerLocale initialLocale = LocalizationManager.DetectInitialLocale(args);

        string defaultTarget = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "G-Browser"
        );

        if (silent) {
            RunSilentInstall(defaultTarget, initialLocale);
            return;
        }

        Application.Run(new InstallerForm(defaultTarget, initialLocale));
    }

    public static void RunSilentInstall(string targetDir, InstallerLocale locale) {
        try {
            DoInstall(targetDir, true, true, locale, null);
        } catch {}
    }

    public static void DoInstall(
        string targetDir,
        bool createDesktopShortcut,
        bool createStartShortcut,
        InstallerLocale locale,
        Action<string, int> progressCallback
    ) {
        if (locale == null) locale = LocalizationManager.SupportedLocales[0];

        foreach (var p in Process.GetProcessesByName("g-browser")) {
            try { p.Kill(); p.WaitForExit(2000); } catch {}
        }
        foreach (var p in Process.GetProcessesByName("floorp")) {
            try { p.Kill(); p.WaitForExit(2000); } catch {}
        }

        if (!Directory.Exists(targetDir)) {
            Directory.CreateDirectory(targetDir);
        }

        if (progressCallback != null) progressCallback(locale.ExtractingPackage, 10);

        var assembly = Assembly.GetExecutingAssembly();
        using (var stream = assembly.GetManifestResourceStream("app.zip")) {
            if (stream == null) {
                throw new InvalidOperationException("Embedded app.zip resource not found.");
            }
            using (var archive = new ZipArchive(stream, ZipArchiveMode.Read)) {
                int totalEntries = archive.Entries.Count;
                int count = 0;
                foreach (var entry in archive.Entries) {
                    count++;
                    string destinationPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                    if (string.IsNullOrEmpty(entry.Name)) {
                        if (!Directory.Exists(destinationPath)) {
                            Directory.CreateDirectory(destinationPath);
                        }
                    } else {
                        string dir = Path.GetDirectoryName(destinationPath);
                        if (!Directory.Exists(dir)) {
                            Directory.CreateDirectory(dir);
                        }
                        entry.ExtractToFile(destinationPath, true);
                    }
                    if (progressCallback != null && count % 200 == 0) {
                        int pct = 10 + (int)((double)count / totalEntries * 70);
                        progressCallback(string.Format(locale.CopyingFilesFormat, count, totalEntries), pct);
                    }
                }
            }
        }

        // Configure installed browser locale and menu language according to chosen setup language
        try {
            string prefDir = Path.Combine(targetDir, "browser", "defaults", "preferences");
            if (!Directory.Exists(prefDir)) Directory.CreateDirectory(prefDir);
            string langPrefFile = Path.Combine(prefDir, "zzz-installer-lang.js");
            string bcp = locale.Bcp47;
            string prefContent =
                "// Configured by G-Browser Setup Wizard\n" +
                "pref(\"intl.locale.requested\", \"" + bcp + ",en-US\");\n" +
                "pref(\"intl.accept_languages\", \"" + bcp + ", en-US, en\");\n";
            File.WriteAllText(langPrefFile, prefContent, new UTF8Encoding(false));

            string l10nBrowserDir = Path.Combine(targetDir, "browser", "localization", "en-US", "browser");
            if (Directory.Exists(l10nBrowserDir)) {
                string suffix = (locale.Code == "tr") ? ".tr.ftl" : ".en.ftl";
                string srcMenubar = Path.Combine(l10nBrowserDir, "menubar" + suffix);
                string dstMenubar = Path.Combine(l10nBrowserDir, "menubar.ftl");
                if (File.Exists(srcMenubar)) File.Copy(srcMenubar, dstMenubar, true);

                string srcAppmenu = Path.Combine(l10nBrowserDir, "appmenu" + suffix);
                string dstAppmenu = Path.Combine(l10nBrowserDir, "appmenu.ftl");
                if (File.Exists(srcAppmenu)) File.Copy(srcAppmenu, dstAppmenu, true);
            }
        } catch {}

        if (progressCallback != null) progressCallback(locale.CreatingShortcuts, 85);

        string exePath = Path.Combine(targetDir, "g-browser.exe");
        if (!File.Exists(exePath)) {
            string altPath = Path.Combine(targetDir, "floorp.exe");
            if (File.Exists(altPath)) exePath = altPath;
        }

        try {
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            if (createDesktopShortcut) {
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string desktopLnk = Path.Combine(desktopDir, "G-Browser.lnk");
                dynamic sc = shell.CreateShortcut(desktopLnk);
                sc.TargetPath = exePath;
                sc.WorkingDirectory = targetDir;
                sc.Description = locale.AppDescription;
                sc.IconLocation = exePath + ",0";
                sc.Save();
            }

            if (createStartShortcut) {
                string startDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string startLnk = Path.Combine(startDir, "G-Browser.lnk");
                dynamic sc = shell.CreateShortcut(startLnk);
                sc.TargetPath = exePath;
                sc.WorkingDirectory = targetDir;
                sc.Description = locale.AppDescription;
                sc.IconLocation = exePath + ",0";
                sc.Save();
            }

            // Remove legacy Floorp shortcuts
            try {
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string oldFloorpLnk = Path.Combine(desktopDir, "Floorp.lnk");
                if (File.Exists(oldFloorpLnk)) File.Delete(oldFloorpLnk);

                string startDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string[] oldStartLnks = new string[] {
                    Path.Combine(startDir, "Floorp.lnk"),
                    Path.Combine(startDir, "Floorp Daylight Private Browsing.lnk"),
                    Path.Combine(startDir, "Floorp Gizli Gezinti.lnk")
                };
                foreach (string oldLnk in oldStartLnks) {
                    if (File.Exists(oldLnk)) File.Delete(oldLnk);
                }
            } catch {}
        } catch {}

        if (progressCallback != null) progressCallback(locale.ConfiguringRegistry, 95);

        try {
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\g-browser.exe")) {
                if (key != null) {
                    key.SetValue("", exePath);
                    key.SetValue("Path", targetDir);
                }
            }

            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Clients\StartMenuInternet\G-Browser")) {
                if (key != null) {
                    key.SetValue("", "G-Browser");
                    using (var cmd = key.CreateSubKey(@"shell\open\command")) {
                        if (cmd != null) cmd.SetValue("", "\"" + exePath + "\"");
                    }
                    using (var icon = key.CreateSubKey("DefaultIcon")) {
                        if (icon != null) icon.SetValue("", exePath + ",0");
                    }
                    using (var cap = key.CreateSubKey("Capabilities")) {
                        if (cap != null) {
                            cap.SetValue("ApplicationDescription", locale.AppDescription);
                            cap.SetValue("ApplicationIcon", exePath + ",0");
                            cap.SetValue("ApplicationName", "G-Browser");
                            using (var fa = cap.CreateSubKey("FileAssociations")) {
                                if (fa != null) {
                                    fa.SetValue(".htm", "GBrowserHTML");
                                    fa.SetValue(".html", "GBrowserHTML");
                                }
                            }
                            using (var ua = cap.CreateSubKey("URLAssociations")) {
                                if (ua != null) {
                                    ua.SetValue("http", "GBrowserHTML");
                                    ua.SetValue("https", "GBrowserHTML");
                                }
                            }
                        }
                    }
                }
            }

            using (var regApps = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications")) {
                if (regApps != null) {
                    regApps.SetValue("G-Browser", @"Software\Clients\StartMenuInternet\G-Browser\Capabilities");
                }
            }

            using (var unKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\G-Browser")) {
                if (unKey != null) {
                    unKey.SetValue("DisplayName", "G-Browser");
                    unKey.SetValue("DisplayVersion", "12.20.1");
                    unKey.SetValue("Publisher", "Vedat G\u00fcld\u00fc (G-Browser)");
                    unKey.SetValue("InstallLocation", targetDir);
                    unKey.SetValue("DisplayIcon", exePath + ",0");
                    unKey.SetValue("InstallerLanguage", locale.Code);
                    string uninstallExe = Path.Combine(targetDir, "uninstall.exe");
                    unKey.SetValue("UninstallString", "\"" + uninstallExe + "\"");
                    unKey.SetValue("QuietUninstallString", "\"" + uninstallExe + "\" /S");
                    unKey.SetValue("NoModify", 1, RegistryValueKind.DWord);
                    unKey.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    unKey.SetValue("EstimatedSize", 480000, RegistryValueKind.DWord);
                }
            }
        } catch {}

        if (progressCallback != null) progressCallback(locale.CompletedStatus, 100);
    }
}

public class InstallerForm : Form {
    private string targetDir;
    private InstallerLocale currentLocale;
    private Label lblTitle;
    private Label lblSubtitle;
    private Label lblLang;
    private ComboBox cmbLanguage;
    private Label lblDir;
    private TextBox txtPath;
    private Button btnBrowse;
    private CheckBox chkDesktop;
    private CheckBox chkStart;
    private CheckBox chkLaunch;
    private ProgressBar progressBar;
    private Label lblStatus;
    private Button btnAction;
    private Button btnCancel;
    private bool isInstalling = false;
    private bool isInstalled = false;

    public InstallerForm(string defaultTarget, InstallerLocale initialLocale) {
        this.targetDir = defaultTarget;
        this.currentLocale = initialLocale ?? LocalizationManager.SupportedLocales[0];
        InitializeComponents();
        ApplyLocale(this.currentLocale);
    }

    private void InitializeComponents() {
        this.Size = new Size(560, 405);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
        this.BackColor = Color.FromArgb(248, 249, 250);

        Panel header = new Panel {
            Dock = DockStyle.Top,
            Height = 76,
            BackColor = Color.White
        };

        lblTitle = new Label {
            Font = new Font("Segoe UI", 12F, FontStyle.Bold),
            ForeColor = Color.FromArgb(30, 41, 59),
            Location = new Point(20, 14),
            AutoSize = true
        };

        lblSubtitle = new Label {
            Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
            ForeColor = Color.FromArgb(100, 116, 139),
            Location = new Point(21, 42),
            AutoSize = true
        };

        lblLang = new Label {
            Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
            ForeColor = Color.FromArgb(71, 85, 105),
            Location = new Point(350, 17),
            Size = new Size(65, 20),
            TextAlign = ContentAlignment.MiddleRight
        };

        cmbLanguage = new ComboBox {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Font = new Font("Segoe UI", 8.75F, FontStyle.Regular),
            Location = new Point(420, 14),
            Size = new Size(105, 24),
            TabIndex = 0
        };
        foreach (var loc in LocalizationManager.SupportedLocales) {
            cmbLanguage.Items.Add(loc);
        }
        cmbLanguage.SelectedItem = this.currentLocale;
        cmbLanguage.SelectedIndexChanged += delegate {
            var selected = cmbLanguage.SelectedItem as InstallerLocale;
            if (selected != null) {
                this.currentLocale = selected;
                ApplyLocale(selected);
            }
        };

        header.Controls.Add(lblTitle);
        header.Controls.Add(lblSubtitle);
        header.Controls.Add(lblLang);
        header.Controls.Add(cmbLanguage);
        this.Controls.Add(header);

        int top = 92;

        lblDir = new Label {
            Location = new Point(20, top),
            AutoSize = true,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        this.Controls.Add(lblDir);

        top += 22;
        txtPath = new TextBox {
            Text = targetDir,
            Location = new Point(20, top),
            Size = new Size(405, 24),
            ReadOnly = true,
            BackColor = Color.White,
            TabIndex = 1
        };
        btnBrowse = new Button {
            Location = new Point(432, top - 1),
            Size = new Size(95, 26),
            TabIndex = 2
        };
        btnBrowse.Click += delegate {
            using (var fbd = new FolderBrowserDialog()) {
                fbd.Description = this.currentLocale.FolderDialogDescription;
                fbd.SelectedPath = txtPath.Text;
                if (fbd.ShowDialog() == DialogResult.OK) {
                    txtPath.Text = fbd.SelectedPath;
                    targetDir = fbd.SelectedPath;
                }
            }
        };
        this.Controls.Add(txtPath);
        this.Controls.Add(btnBrowse);

        top += 38;
        chkDesktop = new CheckBox {
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true,
            TabIndex = 3
        };
        this.Controls.Add(chkDesktop);

        top += 25;
        chkStart = new CheckBox {
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true,
            TabIndex = 4
        };
        this.Controls.Add(chkStart);

        top += 25;
        chkLaunch = new CheckBox {
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true,
            TabIndex = 5
        };
        this.Controls.Add(chkLaunch);

        top += 32;
        lblStatus = new Label {
            Location = new Point(20, top),
            Size = new Size(505, 20),
            ForeColor = Color.FromArgb(71, 85, 105)
        };
        this.Controls.Add(lblStatus);

        top += 22;
        progressBar = new ProgressBar {
            Location = new Point(20, top),
            Size = new Size(507, 16),
            Value = 0
        };
        this.Controls.Add(progressBar);

        btnAction = new Button {
            Location = new Point(320, 315),
            Size = new Size(100, 32),
            BackColor = Color.FromArgb(37, 99, 235),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold),
            TabIndex = 6
        };
        btnAction.FlatAppearance.BorderSize = 0;
        btnAction.Click += BtnAction_Click;
        this.Controls.Add(btnAction);

        btnCancel = new Button {
            Location = new Point(427, 315),
            Size = new Size(100, 32),
            TabIndex = 7
        };
        btnCancel.Click += delegate { this.Close(); };
        this.Controls.Add(btnCancel);
    }

    private void ApplyLocale(InstallerLocale loc) {
        if (loc == null) return;
        this.Text = loc.WindowTitle;
        this.RightToLeft = (loc.Code == "ar") ? RightToLeft.Yes : RightToLeft.No;
        this.RightToLeftLayout = (loc.Code == "ar");

        lblTitle.Text = loc.HeaderTitle;
        lblSubtitle.Text = loc.HeaderSubtitle;
        lblLang.Text = loc.LanguageLabel;
        cmbLanguage.AccessibleName = loc.LanguageLabel;
        cmbLanguage.AccessibleDescription = loc.NativeName;

        lblDir.Text = loc.InstallDirLabel;
        txtPath.AccessibleName = loc.InstallDirLabel;
        btnBrowse.Text = loc.BrowseButton;
        btnBrowse.AccessibleName = loc.BrowseButton;

        chkDesktop.Text = loc.DesktopShortcut;
        chkDesktop.AccessibleName = loc.DesktopShortcut;

        chkStart.Text = loc.StartMenuShortcut;
        chkStart.AccessibleName = loc.StartMenuShortcut;

        chkLaunch.Text = loc.LaunchAfterInstall;
        chkLaunch.AccessibleName = loc.LaunchAfterInstall;

        if (!isInstalling && !isInstalled) {
            lblStatus.Text = loc.ReadyStatus;
            btnAction.Text = loc.InstallButton;
            btnAction.AccessibleName = loc.InstallButton;
        } else if (isInstalled) {
            lblStatus.Text = loc.CompletedStatus;
            btnAction.Text = loc.FinishButton;
            btnAction.AccessibleName = loc.FinishButton;
        }

        btnCancel.Text = loc.CancelButton;
        btnCancel.AccessibleName = loc.CancelButton;
    }

    private void BtnAction_Click(object sender, EventArgs e) {
        if (isInstalled) {
            if (chkLaunch.Checked) {
                try {
                    string runExe = Path.Combine(targetDir, "g-browser.exe");
                    if (!File.Exists(runExe)) runExe = Path.Combine(targetDir, "floorp.exe");
                    Process.Start(runExe);
                } catch {}
            }
            this.Close();
            return;
        }

        isInstalling = true;
        btnAction.Enabled = false;
        btnBrowse.Enabled = false;
        btnCancel.Enabled = false;
        chkDesktop.Enabled = false;
        chkStart.Enabled = false;
        cmbLanguage.Enabled = false;

        bool desktop = chkDesktop.Checked;
        bool start = chkStart.Checked;
        string path = txtPath.Text;
        InstallerLocale activeLocale = this.currentLocale;

        var bw = new BackgroundWorker();
        bw.WorkerReportsProgress = true;
        bw.DoWork += delegate {
            Program.DoInstall(path, desktop, start, activeLocale, delegate(string msg, int pct) {
                bw.ReportProgress(pct, msg);
            });
        };
        bw.ProgressChanged += delegate(object s, ProgressChangedEventArgs ev) {
            progressBar.Value = Math.Min(100, Math.Max(0, ev.ProgressPercentage));
            lblStatus.Text = ev.UserState as string;
        };
        bw.RunWorkerCompleted += delegate(object s, RunWorkerCompletedEventArgs ev) {
            isInstalling = false;
            if (ev.Error != null) {
                lblStatus.Text = activeLocale.ErrorPrefix + ev.Error.Message;
                lblStatus.ForeColor = Color.Red;
                btnAction.Enabled = true;
                btnCancel.Enabled = true;
                cmbLanguage.Enabled = true;
            } else {
                isInstalled = true;
                progressBar.Value = 100;
                lblStatus.Text = activeLocale.CompletedStatus;
                lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
                btnAction.Text = activeLocale.FinishButton;
                btnAction.AccessibleName = activeLocale.FinishButton;
                btnAction.Enabled = true;
                btnCancel.Visible = false;
            }
        };
        bw.RunWorkerAsync();
    }
}
