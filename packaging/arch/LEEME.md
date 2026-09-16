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

El empaquetado AppImage de Tauri falla en Arch al ejecutar `linuxdeploy`.

**No es por FUSE**, aunque sea la causa habitual y asi se documento aqui en un
primer momento: `fuse2` y `fuse3` estan instalados en la maquina. El motivo real
es que **Tauri documenta que el AppImage debe construirse sobre el sistema base
mas antiguo que se quiera soportar**, porque enlaza contra las bibliotecas del
sistema donde se compila. Una distribucion rolling como Arch trae versiones mas
nuevas que las de la mayoria de destinos, asi que compilar ahi es justo lo que la
documentacion desaconseja.

Por eso el CI usa Ubuntu y aqui se usa `--no-bundle`: no hay nada que arreglar,
es el comportamiento correcto. Para instalar en local, `makepkg` produce un
paquete nativo que ademas se integra con pacman para actualizar y desinstalar.

## Por que no algo mas elaborado

Se evaluo montar un sistema de release para Arch —PKGBUILD contra la release de
GitHub, publicacion en AUR, repositorio propio de pacman firmado, o un job de CI
que genere el paquete— y **ninguna compensa** con un solo usuario en una sola
maquina:

- **AUR** exige que el paquete sea util para mas de unas pocas personas, y esta
  aplicacion necesita una API privada para arrancar. Ademas, un paquete marcado
  desactualizado durante 180 dias se adopta automaticamente.
- **PKGBUILD desde la release** no funciona mientras el repositorio sea privado:
  la fuente no se descarga sin credencial.
- **Repositorio propio de pacman** traslada el coste a la maquina diaria: si la
  base de datos del repositorio falla, `pacman -Syu` deja de funcionar para todo
  el sistema, no solo para esta aplicacion.
- **Job de CI para Arch** es viable, pero necesita contenedor `archlinux` y
  usuario no root, y solo se justifica cuando haya una segunda maquina.

La señal para reconsiderarlo seria una segunda maquina Arch o alguien mas
necesitando binarios. En ese caso, la primera opcion a mirar es ampliar el CI.
