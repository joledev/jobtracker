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

#[tauri::command]
pub fn compile_latex(latex_source: String) -> Result<String, String> {
    let dir = tempfile::tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let tex_path = dir.path().join("input.tex");
    let pdf_path = dir.path().join("input.pdf");

    std::fs::write(&tex_path, &latex_source)
        .map_err(|e| format!("Failed to write .tex file: {}", e))?;

    let output = Command::new("pdflatex")
        .args([
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-output-directory",
            dir.path().to_str().unwrap_or("."),
            tex_path.to_str().unwrap_or("input.tex"),
        ])
        .output()
        .map_err(|e| format!("Failed to run pdflatex: {}", e))?;

    if !output.status.success() {
        let log = String::from_utf8_lossy(&output.stdout);
        return Err(format!("pdflatex failed:\n{}", log));
    }

    if !pdf_path.exists() {
        return Err("PDF file was not generated".to_string());
    }

    let pdf_bytes =
        std::fs::read(&pdf_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
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
