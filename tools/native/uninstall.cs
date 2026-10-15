using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

static class Program {
    [STAThread]
    static void Main(string[] args) {
        bool silent = false;
        foreach (var arg in args) {
            if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) || arg.Equals("-s", StringComparison.OrdinalIgnoreCase)) {
                silent = true;
            }
        }

        if (!silent) {
            var confirm = MessageBox.Show(
                "G-Browser tarayicisini bilgisayarinizdan kaldirmak istediginizden emin misiniz?",
                "G-Browser Kaldirici",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (confirm != DialogResult.Yes) return;
        }

        try {
            // Kill running g-browser and floorp processes
            foreach (var p in Process.GetProcessesByName("g-browser")) {
                try { p.Kill(); p.WaitForExit(2000); } catch {}
            }
            foreach (var p in Process.GetProcessesByName("floorp")) {
                try { p.Kill(); p.WaitForExit(2000); } catch {}
            }

            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string startMenuDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);

            // Remove shortcuts (both G-Browser and legacy Floorp)
            string gDesktopLnk = Path.Combine(desktopDir, "G-Browser.lnk");
            if (File.Exists(gDesktopLnk)) File.Delete(gDesktopLnk);

            string gStartLnk = Path.Combine(startMenuDir, "G-Browser.lnk");
            if (File.Exists(gStartLnk)) File.Delete(gStartLnk);

            string desktopLnk = Path.Combine(desktopDir, "Floorp.lnk");
            if (File.Exists(desktopLnk)) File.Delete(desktopLnk);

            string startLnk = Path.Combine(startMenuDir, "Floorp.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);

            // Remove Registry Keys (G-Browser)
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\G-Browser", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\App Paths\g-browser.exe", false); } catch {}
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Clients\StartMenuInternet\G-Browser", false); } catch {}
            try {
                using (var reg = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true)) {
                    if (reg != null) reg.DeleteValue("G-Browser", false);
                }
            } catch {}

            // Clean legacy keys
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
                MessageBox.Show("G-Browser basariyla kaldirildi.", "G-Browser", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }

            // Self-delete app directory
            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/C ping 127.0.0.1 -n 2 > nul & rmdir /S /Q \"" + appDir + "\"") {
                CreateNoWindow = true,
                UseShellExecute = false
            };
            Process.Start(psi);
        } catch (Exception ex) {
            if (!silent) {
                MessageBox.Show("Kaldirma sirasinda hata olustu: " + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
