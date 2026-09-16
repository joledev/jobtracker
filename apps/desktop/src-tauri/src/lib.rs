mod commands;

/// WebKitGTK arranca su renderizador DMA-BUF por defecto, y bajo algunos
/// compositores Wayland eso aborta la aplicacion antes de dibujar nada:
/// `Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display`.
/// El proceso muere de inmediato, asi que desde el menu de aplicaciones parece
/// que la aplicacion simplemente no abre.
///
/// Desactivar DMA-BUF es la unica de las salidas conocidas que conserva Wayland
/// y el compositing; las otras dos —`WEBKIT_DISABLE_COMPOSITING_MODE` y caer a
/// X11 con `GDK_BACKEND`— cuestan mas. Se aplica solo en Linux bajo Wayland, y
/// **nunca pisa un valor que el usuario ya haya puesto**, para que siga siendo
/// posible probar el comportamiento original.
///
/// Tiene que correr antes de que GTK se inicialice, es decir antes de construir
/// el `tauri::Builder`.
#[cfg(target_os = "linux")]
fn ajustar_render_wayland() {
    let bajo_wayland = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let ya_definido = std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_some();
    if bajo_wayland && !ya_definido {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn ajustar_render_wayland() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ajustar_render_wayland();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_latex_installed,
            commands::compile_latex,
            commands::save_pdf_to_disk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
