# Paquete de Arch para JobTracker

Instala JobTracker como paquete nativo, en vez de dejar el binario suelto en
`~/.local/bin`.

```bash
cd packaging/arch
makepkg -si
```

**Construye desde el arbol de trabajo local, no desde la release de GitHub.** La
`v1.0.0` publicada es del 7 de marzo de 2026 y es anterior a los arreglos del 15
de septiembre: arrastra la lista de ofertas vacia en modo local, el cambio de
etapa sin transaccion y el borrado de workspaces que fallaba en silencio.

## Actualizar

```bash
git pull
cd packaging/arch && makepkg -si
```

`makepkg` recompila y `pacman` reemplaza la version anterior.

## Desinstalar

```bash
sudo pacman -R jobtracker
```

## Por que no AppImage

El empaquetado AppImage de Tauri falla en Arch al ejecutar `linuxdeploy`,
normalmente por FUSE. No es un problema del proyecto y no hace falta resolverlo:
`makepkg` produce un paquete nativo, que ademas se integra mejor con el sistema
para actualizar y desinstalar. El CI de GitHub Actions si genera los binarios
para distribuir, en un entorno donde `linuxdeploy` funciona.
