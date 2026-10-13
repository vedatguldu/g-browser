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
                "Ablaze Floorp tarayicisini bilgisayarinizdan kaldirmak istediginizden emin misiniz?",
                "Ablaze Floorp Kaldirici",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (confirm != DialogResult.Yes) return;
        }

        try {
            // Kill running floorp processes
            foreach (var p in Process.GetProcessesByName("floorp")) {
                try { p.Kill(); p.WaitForExit(2000); } catch {}
            }

            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string startMenuDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);

            // Remove shortcuts
            string desktopLnk = Path.Combine(desktopDir, "Floorp.lnk");
            if (File.Exists(desktopLnk)) File.Delete(desktopLnk);

            string startLnk = Path.Combine(startMenuDir, "Floorp.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);

            // Remove Registry Keys
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
                MessageBox.Show("Ablaze Floorp basariyla kaldirildi.", "Ablaze Floorp", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
