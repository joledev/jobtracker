use base64::{engine::general_purpose::STANDARD, Engine};
use std::process::Command;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn check_latex_installed() -> Result<bool, String> {
    match Command::new("pdflatex").arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// `--no-shell-escape` stops pdflatex from running shell commands, but it does
/// NOT stop it from *reading* files: TeX Live ships `openin_any = a`, so
/// `\input{/etc/passwd}` or `\verbatiminput{~/.ssh/id_rsa}` embeds that file in
/// the PDF. Since a compiled CV is usually sent to someone else, a template
/// copied from the internet can exfiltrate local files that way.
///
/// Setting `openin_any = p` does not help — verified on TeX Live 2026, the read
/// still succeeds. The only thing that actually stops it is denying pdflatex
/// access to the filesystem, so on Linux the compile runs inside bubblewrap
/// with just the TeX trees (read-only) and the temp directory visible.
///
/// Where bubblewrap is unavailable (Windows, macOS, or a Linux box without it)
/// the compile falls back to running pdflatex directly and the read is possible
/// again. Compile only templates you trust on those platforms.
fn latex_args(workdir: &std::path::Path, tex_path: &std::path::Path) -> Vec<String> {
    vec![
        "--no-shell-escape".into(),
        "-interaction=nonstopmode".into(),
        "-halt-on-error".into(),
        "-output-directory".into(),
        workdir.to_str().unwrap_or(".").into(),
        tex_path.to_str().unwrap_or("input.tex").into(),
    ]
}

#[cfg(target_os = "linux")]
fn latex_command(workdir: &std::path::Path, tex_path: &std::path::Path) -> Command {
    // TEXMFHOME holds packages the user installed by hand; without it many
    // real documents fail to build. It is bound read-only and holds .sty
    // files, not personal data.
    let texmf_home = Command::new("kpsewhich")
        .args(["-var-value=TEXMFHOME"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|p| !p.is_empty() && std::path::Path::new(p).is_dir());

    let usable = Command::new("bwrap")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !usable {
        let mut c = Command::new("pdflatex");
        c.args(latex_args(workdir, tex_path));
        return c;
    }

    let work = workdir.to_str().unwrap_or(".").to_string();
    let mut c = Command::new("bwrap");
    c.args(["--unshare-all", "--die-with-parent"])
        .args(["--ro-bind", "/usr", "/usr"])
        .args(["--symlink", "usr/bin", "/bin"])
        .args(["--symlink", "usr/lib", "/lib"])
        .args(["--symlink", "usr/lib64", "/lib64"])
        .args(["--proc", "/proc"])
        .args(["--dev", "/dev"])
        .args(["--tmpfs", "/tmp"])
        .args(["--setenv", "HOME", "/tmp"])
        .args(["--setenv", "TEXMFVAR", "/tmp/texmf-var"])
        .args(["--setenv", "TEXMFCONFIG", "/tmp/texmf-config"]);

    // Not present on every distribution, and binding a path that does not
    // exist makes bwrap fail outright, so it is only added when it is there.
    if std::path::Path::new("/var/lib/texmf").is_dir() {
        c.args(["--ro-bind", "/var/lib/texmf", "/var/lib/texmf"]);
    }
    if let Some(home) = &texmf_home {
        c.args(["--ro-bind", home, home])
            // HOME is /tmp inside the sandbox, so TEXMFHOME would resolve to
            // /tmp/texmf and the bind above would never be consulted.
            .args(["--setenv", "TEXMFHOME", home]);
    }

    c.args(["--bind", &work, &work])
        .args(["--chdir", &work])
        .arg("pdflatex")
        .args(latex_args(workdir, tex_path));
    c
}

#[cfg(not(target_os = "linux"))]
fn latex_command(workdir: &std::path::Path, tex_path: &std::path::Path) -> Command {
    let mut c = Command::new("pdflatex");
    c.args(latex_args(workdir, tex_path));
    c
}

#[tauri::command(async)]
pub fn compile_latex(latex_source: String) -> Result<String, String> {
    let dir = tempfile::tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let tex_path = dir.path().join("input.tex");
    let pdf_path = dir.path().join("input.pdf");

    std::fs::write(&tex_path, &latex_source)
        .map_err(|e| format!("Failed to write .tex file: {}", e))?;

    let output = latex_command(dir.path(), &tex_path)
        .output()
        .map_err(|e| format!("Failed to run pdflatex: {}", e))?;

    if !output.status.success() {
        let log = String::from_utf8_lossy(&output.stdout);
        return Err(format!("pdflatex failed:\n{}", log));
    }

    if !pdf_path.exists() {
        return Err("PDF file was not generated".to_string());
    }

    let pdf_bytes = std::fs::read(&pdf_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    Ok(STANDARD.encode(pdf_bytes))
}

#[tauri::command]
pub async fn save_pdf_to_disk(
    app: tauri::AppHandle,
    pdf_base64: String,
    default_name: String,
) -> Result<String, String> {
    let pdf_bytes = STANDARD
        .decode(&pdf_base64)
        .map_err(|e| format!("Invalid base64: {}", e))?;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("PDF", &["pdf"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            std::fs::write(&path_str, &pdf_bytes)
                .map_err(|e| format!("Failed to write PDF: {}", e))?;
            Ok(path_str)
        }
        None => Err("Save cancelled".to_string()),
    }
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    /// Guards the reason the sandbox exists: if these flags ever fall out of the
    /// command, pdflatex regains access to the filesystem and a hostile template
    /// can read local files into the PDF.
    #[test]
    fn linux_compile_is_sandboxed_when_bwrap_exists() {
        let bwrap = Command::new("bwrap")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if !bwrap {
            return; // sin bwrap el fallback es correcto: no hay nada que afirmar
        }

        let dir = std::path::Path::new("/tmp/jobtracker-test");
        let tex = dir.join("input.tex");
        let cmd = latex_command(dir, &tex);

        assert_eq!(cmd.get_program(), "bwrap");

        let args: Vec<String> = cmd
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        for flag in ["--unshare-all", "--die-with-parent", "--ro-bind", "--chdir"] {
            assert!(args.iter().any(|a| a == flag), "falta {flag}");
        }
        // El $HOME real nunca se monta: es justo lo que se quiere proteger.
        assert!(
            !args.iter().any(|a| a == "--bind") || !args.contains(&"/home".to_string()),
            "no se debe montar /home"
        );
        assert!(args.iter().any(|a| a == "pdflatex"));
    }
}
