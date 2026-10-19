using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

public class UninstallerLocale {
    public string Code;
    public string Title;
    public string ConfirmMessage;
    public string SuccessMessage;
    public string ErrorTitle;
    public string ErrorPrefix;
}

static class Program {
    private static readonly List<UninstallerLocale> SupportedLocales = new List<UninstallerLocale> {
        new UninstallerLocale {
            Code = "tr",
            Title = "G-Browser Kald\u0131r\u0131c\u0131",
            ConfirmMessage = "G-Browser taray\u0131c\u0131s\u0131n\u0131 bilgisayar\u0131n\u0131zdan kald\u0131rmak istedi\u011finizden emin misiniz?",
            SuccessMessage = "G-Browser ba\u015far\u0131yla kald\u0131r\u0131ld\u0131.",
            ErrorTitle = "Hata",
            ErrorPrefix = "Kald\u0131rma s\u0131ras\u0131nda hata olu\u015ftu: "
        },
        new UninstallerLocale {
            Code = "en",
            Title = "G-Browser Uninstaller",
            ConfirmMessage = "Are you sure you want to completely remove G-Browser from your computer?",
            SuccessMessage = "G-Browser was successfully uninstalled.",
            ErrorTitle = "Error",
            ErrorPrefix = "An error occurred during uninstallation: "
        },
        new UninstallerLocale {
            Code = "de",
            Title = "G-Browser Deinstallation",
            ConfirmMessage = "M\u00f6chten Sie G-Browser wirklich vollst\u00e4ndig von Ihrem Computer entfernen?",
            SuccessMessage = "G-Browser wurde erfolgreich deinstalliert.",
            ErrorTitle = "Fehler",
            ErrorPrefix = "Fehler bei der Deinstallation: "
        },
        new UninstallerLocale {
            Code = "fr",
            Title = "D\u00e9sinstallation de G-Browser",
            ConfirmMessage = "Voulez-vous vraiment supprimer compl\u00e8tement G-Browser de votre ordinateur ?",
            SuccessMessage = "G-Browser a \u00e9t\u00e9 d\u00e9sinstall\u00e9 avec succ\u00e8s.",
            ErrorTitle = "Erreur",
            ErrorPrefix = "Une erreur est survenue lors de la d\u00e9sinstallation : "
        },
        new UninstallerLocale {
            Code = "es",
            Title = "Desinstalador de G-Browser",
            ConfirmMessage = "\u00bfEst\u00e1 seguro de que desea eliminar por completo G-Browser de su equipo?",
            SuccessMessage = "G-Browser se desinstal\u00f3 correctamente.",
            ErrorTitle = "Error",
            ErrorPrefix = "Ocurri\u00f3 un error durante la desinstalaci\u00f3n: "
        },
        new UninstallerLocale {
            Code = "ru",
            Title = "\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 G-Browser",
            ConfirmMessage = "\u0412\u044b \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0445\u043e\u0442\u0438\u0442\u0435 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u0443\u0434\u0430\u043b\u0438\u0442\u044c G-Browser \u0441 \u0432\u0430\u0448\u0435\u0433\u043e \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u0430?",
            SuccessMessage = "G-Browser \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0443\u0434\u0430\u043b\u0435\u043d.",
            ErrorTitle = "\u041e\u0448\u0438\u0431\u043a\u0430",
            ErrorPrefix = "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0438: "
        },
        new UninstallerLocale {
            Code = "ar",
            Title = "\u0625\u0632\u0627\u0644\u0629 \u062a\u062b\u0628\u064a\u062a G-Browser",
            ConfirmMessage = "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0623\u0646\u0643 \u062a\u0631\u064a\u062f \u0625\u0632\u0627\u0644\u0629 G-Browser \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0646 \u062c\u0647\u0627\u0632\u0643\u061f",
            SuccessMessage = "\u062a\u0645\u062a \u0625\u0632\u0627\u0644\u0629 \u062a\u062b\u0628\u064a\u062a G-Browser \u0628\u0646\u062c\u0627\u062d.",
            ErrorTitle = "\u062e\u0637\u0623",
            ErrorPrefix = "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062a\u062b\u0628\u064a\u062a: "
        },
        new UninstallerLocale {
            Code = "ja",
            Title = "G-Browser \u30a2\u30f3\u30a4\u30f3\u30b9\u30c8\u30fc\u30e9\u30fc",
            ConfirmMessage = "G-Browser \u3092\u30b3\u30f3\u30d4\u30e5\u30fc\u30bf\u30fc\u304b\u3089\u5b8c\u5168\u306b\u524a\u9664\u3057\u3066\u3082\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f",
            SuccessMessage = "G-Browser \u306f\u6b63\u5e38\u306b\u30a2\u30f3\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3055\u308c\u307e\u3057\u305f\u3002",
            ErrorTitle = "\u30a8\u30e9\u30fc",
            ErrorPrefix = "\u30a2\u30f3\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f: "
        },
        new UninstallerLocale {
            Code = "zh",
            Title = "G-Browser \u5378\u8f7d\u7a0b\u5e8f",
            ConfirmMessage = "\u60a8\u786e\u5b9a\u8981\u4ece\u8ba1\u7b97\u673a\u4e2d\u5b8c\u5168\u5378\u8f7d G-Browser \u5417\uff1f",
            SuccessMessage = "G-Browser \u5df2\u6210\u529f\u5378\u8f7d\u3002",
            ErrorTitle = "\u9519\u8bef",
            ErrorPrefix = "\u5378\u8f7d\u8fc7\u7a0b\u4e2d\u53d1\u751f\u9519\u8bef: "
        }
    };

    private static UninstallerLocale DetectLocale() {
        try {
            using (var unKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\G-Browser")) {
                if (unKey != null) {
                    string savedLang = unKey.GetValue("InstallerLanguage") as string;
                    if (!string.IsNullOrEmpty(savedLang)) {
                        foreach (var loc in SupportedLocales) {
                            if (loc.Code == savedLang.ToLowerInvariant()) return loc;
                        }
                    }
                }
            }
        } catch {}

        try {
            string osIso = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            foreach (var loc in SupportedLocales) {
                if (loc.Code == osIso) return loc;
            }
        } catch {}

        return SupportedLocales[1]; // Default fallback to English
    }

    [STAThread]
    static void Main(string[] args) {
        bool silent = false;
        foreach (var arg in args) {
            if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) || arg.Equals("-s", StringComparison.OrdinalIgnoreCase)) {
                silent = true;
            }
        }

        UninstallerLocale loc = DetectLocale();

        if (!silent) {
            var confirm = MessageBox.Show(
                loc.ConfirmMessage,
                loc.Title,
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (confirm != DialogResult.Yes) return;
        }

        try {
            foreach (var p in Process.GetProcessesByName("g-browser")) {
                try { p.Kill(); p.WaitForExit(2000); } catch {}
            }
            foreach (var p in Process.GetProcessesByName("floorp")) {
                try { p.Kill(); p.WaitForExit(2000); } catch {}
            }

            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string startMenuDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);

            string gDesktopLnk = Path.Combine(desktopDir, "G-Browser.lnk");
            if (File.Exists(gDesktopLnk)) File.Delete(gDesktopLnk);

            string gStartLnk = Path.Combine(startMenuDir, "G-Browser.lnk");
            if (File.Exists(gStartLnk)) File.Delete(gStartLnk);

            string desktopLnk = Path.Combine(desktopDir, "Floorp.lnk");
            if (File.Exists(desktopLnk)) File.Delete(desktopLnk);

            string startLnk = Path.Combine(startMenuDir, "Floorp.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);

            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\G-Browser", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\App Paths\g-browser.exe", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Clients\StartMenuInternet\G-Browser", false); } catch {}
            try {
                using (var reg = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true)) {
                    if (reg != null) reg.DeleteValue("G-Browser", false);
                }
            } catch {}

            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Floorp", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\App Paths\floorp.exe", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Clients\StartMenuInternet\Floorp", false); } catch {}
            try {
                using (var reg = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true)) {
                    if (reg != null) reg.DeleteValue("Floorp", false);
                }
            } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Ablaze\Floorp", false); } catch {}

            if (!silent) {
                MessageBox.Show(loc.SuccessMessage, loc.Title, MessageBoxButtons.OK, MessageBoxIcon.Information);
            }

            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/C ping 127.0.0.1 -n 2 > nul & rmdir /S /Q \"" + appDir + "\"") {
                CreateNoWindow = true,
                UseShellExecute = false
            };
            Process.Start(psi);
        } catch (Exception ex) {
            if (!silent) {
                MessageBox.Show(loc.ErrorPrefix + ex.Message, loc.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
