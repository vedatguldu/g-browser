using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

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

        string defaultTarget = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "Floorp"
        );

        if (silent) {
            RunSilentInstall(defaultTarget);
            return;
        }

        Application.Run(new InstallerForm(defaultTarget));
    }

    public static void RunSilentInstall(string targetDir) {
        try {
            DoInstall(targetDir, true, true, null);
        } catch {}
    }

    public static void DoInstall(string targetDir, bool createDesktopShortcut, bool createStartShortcut, Action<string, int> progressCallback) {
        foreach (var p in Process.GetProcessesByName("floorp")) {
            try { p.Kill(); p.WaitForExit(2000); } catch {}
        }

        if (!Directory.Exists(targetDir)) {
            Directory.CreateDirectory(targetDir);
        }

        if (progressCallback != null) progressCallback("Kurulum paketi aciliyor...", 10);

        var assembly = Assembly.GetExecutingAssembly();
        using (var stream = assembly.GetManifestResourceStream("app.zip")) {
            if (stream == null) {
                throw new InvalidOperationException("Gomulu app.zip kaynagi bulunamadi.");
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
                        progressCallback(string.Format("Dosyalar kopyalaniyor ({0}/{1})...", count, totalEntries), pct);
                    }
                }
            }
        }

        if (progressCallback != null) progressCallback("Kisayollar olusturuluyor...", 85);

        string exePath = Path.Combine(targetDir, "floorp.exe");

        try {
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            if (createDesktopShortcut) {
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string desktopLnk = Path.Combine(desktopDir, "Floorp.lnk");
                dynamic sc = shell.CreateShortcut(desktopLnk);
                sc.TargetPath = exePath;
                sc.WorkingDirectory = targetDir;
                sc.Description = "Ablaze Floorp Web Tarayicisi";
                sc.IconLocation = exePath + ",0";
                sc.Save();
            }

            if (createStartShortcut) {
                string startDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string startLnk = Path.Combine(startDir, "Floorp.lnk");
                dynamic sc = shell.CreateShortcut(startLnk);
                sc.TargetPath = exePath;
                sc.WorkingDirectory = targetDir;
                sc.Description = "Ablaze Floorp Web Tarayicisi";
                sc.IconLocation = exePath + ",0";
                sc.Save();
            }
        } catch {}

        if (progressCallback != null) progressCallback("Kayit defteri yapilandiriliyor...", 95);

        try {
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\floorp.exe")) {
                if (key != null) {
                    key.SetValue("", exePath);
                    key.SetValue("Path", targetDir);
                }
            }

            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Clients\StartMenuInternet\Floorp")) {
                if (key != null) {
                    key.SetValue("", "Ablaze Floorp");
                    using (var cmd = key.CreateSubKey(@"shell\open\command")) {
                        if (cmd != null) cmd.SetValue("", "\"" + exePath + "\"");
                    }
                    using (var icon = key.CreateSubKey("DefaultIcon")) {
                        if (icon != null) icon.SetValue("", exePath + ",0");
                    }
                    using (var cap = key.CreateSubKey("Capabilities")) {
                        if (cap != null) {
                            cap.SetValue("ApplicationDescription", "Ablaze Floorp Web Tarayicisi");
                            cap.SetValue("ApplicationIcon", exePath + ",0");
                            cap.SetValue("ApplicationName", "Floorp");
                            using (var fa = cap.CreateSubKey("FileAssociations")) {
                                if (fa != null) {
                                    fa.SetValue(".htm", "FloorpHTML");
                                    fa.SetValue(".html", "FloorpHTML");
                                }
                            }
                            using (var ua = cap.CreateSubKey("URLAssociations")) {
                                if (ua != null) {
                                    ua.SetValue("http", "FloorpHTML");
                                    ua.SetValue("https", "FloorpHTML");
                                }
                            }
                        }
                    }
                }
            }

            using (var regApps = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications")) {
                if (regApps != null) {
                    regApps.SetValue("Floorp", @"Software\Clients\StartMenuInternet\Floorp\Capabilities");
                }
            }

            using (var unKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Floorp")) {
                if (unKey != null) {
                    unKey.SetValue("DisplayName", "Ablaze Floorp");
                    unKey.SetValue("DisplayVersion", "12.20.1");
                    unKey.SetValue("Publisher", "Ablaze");
                    unKey.SetValue("InstallLocation", targetDir);
                    unKey.SetValue("DisplayIcon", exePath + ",0");
                    string uninstallExe = Path.Combine(targetDir, "uninstall.exe");
                    unKey.SetValue("UninstallString", "\"" + uninstallExe + "\"");
                    unKey.SetValue("QuietUninstallString", "\"" + uninstallExe + "\" /S");
                    unKey.SetValue("NoModify", 1, RegistryValueKind.DWord);
                    unKey.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    unKey.SetValue("EstimatedSize", 480000, RegistryValueKind.DWord);
                }
            }
        } catch {}

        if (progressCallback != null) progressCallback("Kurulum tamamlandi!", 100);
    }
}

public class InstallerForm : Form {
    private string targetDir;
    private TextBox txtPath;
    private Button btnBrowse;
    private CheckBox chkDesktop;
    private CheckBox chkStart;
    private CheckBox chkLaunch;
    private ProgressBar progressBar;
    private Label lblStatus;
    private Button btnAction;
    private Button btnCancel;
    private bool isInstalled = false;

    public InstallerForm(string defaultTarget) {
        this.targetDir = defaultTarget;
        InitializeComponents();
    }

    private void InitializeComponents() {
        this.Text = "Ablaze Floorp Kurulum Sihirbazi";
        this.Size = new Size(540, 390);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
        this.BackColor = Color.FromArgb(248, 249, 250);

        Panel header = new Panel {
            Dock = DockStyle.Top,
            Height = 70,
            BackColor = Color.White
        };
        Label lblTitle = new Label {
            Text = "Ablaze Floorp Kurulumu",
            Font = new Font("Segoe UI", 12F, FontStyle.Bold),
            ForeColor = Color.FromArgb(30, 41, 59),
            Location = new Point(20, 12),
            AutoSize = true
        };
        Label lblSubtitle = new Label {
            Text = "Modern, gizlilik odakli ve tam erisilebilir web tarayicisi",
            Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
            ForeColor = Color.FromArgb(100, 116, 139),
            Location = new Point(21, 38),
            AutoSize = true
        };
        header.Controls.Add(lblTitle);
        header.Controls.Add(lblSubtitle);
        this.Controls.Add(header);

        int top = 85;

        Label lblDir = new Label {
            Text = "Kurulum Dizini:",
            Location = new Point(20, top),
            AutoSize = true,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        this.Controls.Add(lblDir);

        top += 22;
        txtPath = new TextBox {
            Text = targetDir,
            Location = new Point(20, top),
            Size = new Size(390, 24),
            ReadOnly = true,
            BackColor = Color.White
        };
        btnBrowse = new Button {
            Text = "Gozat...",
            Location = new Point(418, top - 1),
            Size = new Size(85, 26)
        };
        btnBrowse.Click += delegate {
            using (var fbd = new FolderBrowserDialog()) {
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
            Text = "Masaustune kisayol olustur",
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true
        };
        this.Controls.Add(chkDesktop);

        top += 24;
        chkStart = new CheckBox {
            Text = "Baslat Menusune kisayol ekle",
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true
        };
        this.Controls.Add(chkStart);

        top += 24;
        chkLaunch = new CheckBox {
            Text = "Kurulum tamamlandiginda Floorp'u baslat",
            Checked = true,
            Location = new Point(22, top),
            AutoSize = true
        };
        this.Controls.Add(chkLaunch);

        top += 32;
        lblStatus = new Label {
            Text = "Kuruluma baslamak icin 'Kur' butonuna basiniz.",
            Location = new Point(20, top),
            Size = new Size(480, 20),
            ForeColor = Color.FromArgb(71, 85, 105)
        };
        this.Controls.Add(lblStatus);

        top += 22;
        progressBar = new ProgressBar {
            Location = new Point(20, top),
            Size = new Size(483, 16),
            Value = 0
        };
        this.Controls.Add(progressBar);

        btnAction = new Button {
            Text = "Kur",
            Location = new Point(310, 305),
            Size = new Size(95, 30),
            BackColor = Color.FromArgb(37, 99, 235),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        btnAction.FlatAppearance.BorderSize = 0;
        btnAction.Click += BtnAction_Click;
        this.Controls.Add(btnAction);

        btnCancel = new Button {
            Text = "Iptal",
            Location = new Point(412, 305),
            Size = new Size(90, 30)
        };
        btnCancel.Click += delegate { this.Close(); };
        this.Controls.Add(btnCancel);
    }

    private void BtnAction_Click(object sender, EventArgs e) {
        if (isInstalled) {
            if (chkLaunch.Checked) {
                try {
                    Process.Start(Path.Combine(targetDir, "floorp.exe"));
                } catch {}
            }
            this.Close();
            return;
        }

        btnAction.Enabled = false;
        btnBrowse.Enabled = false;
        btnCancel.Enabled = false;
        chkDesktop.Enabled = false;
        chkStart.Enabled = false;

        bool desktop = chkDesktop.Checked;
        bool start = chkStart.Checked;
        string path = txtPath.Text;

        var bw = new BackgroundWorker();
        bw.WorkerReportsProgress = true;
        bw.DoWork += delegate {
            Program.DoInstall(path, desktop, start, delegate(string msg, int pct) {
                bw.ReportProgress(pct, msg);
            });
        };
        bw.ProgressChanged += delegate(object s, ProgressChangedEventArgs ev) {
            progressBar.Value = Math.Min(100, Math.Max(0, ev.ProgressPercentage));
            lblStatus.Text = ev.UserState as string;
        };
        bw.RunWorkerCompleted += delegate(object s, RunWorkerCompletedEventArgs ev) {
            if (ev.Error != null) {
                lblStatus.Text = "Hata olustu: " + ev.Error.Message;
                lblStatus.ForeColor = Color.Red;
                btnAction.Enabled = true;
                btnCancel.Enabled = true;
            } else {
                isInstalled = true;
                progressBar.Value = 100;
                lblStatus.Text = "Kurulum basariyla tamamlandi!";
                lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
                btnAction.Text = "Bitir";
                btnAction.Enabled = true;
                btnCancel.Visible = false;
            }
        };
        bw.RunWorkerAsync();
    }
}
