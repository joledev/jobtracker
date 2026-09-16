#!/bin/sh
# Respaldo de la base de JobTracker (PostgreSQL en Docker Compose) con copia
# fuera del servidor en Cloudflare R2.
#
# JobTracker no corre en K3s, asi que no entra en el CronJob de respaldo del cluster
# del cluster: ese monta PVCs y usa `sqlite3 .backup`. Este script replica su
# logica sobre `pg_dump` y se instala como cron del host.
#
# Instalacion en el VPS:
#   sudo install -m 750 respaldo-jobtracker.sh /usr/local/bin/
#   sudo crontab -e   ->   0 5 * * *  /usr/local/bin/respaldo-jobtracker.sh >> /var/log/respaldo-jobtracker.log 2>&1
#
# Variables requeridas (en /etc/default/respaldo-jobtracker, modo 600):
#   COMPOSE_DIR, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT
# Opcional: NTFY_URL, NTFY_TOPIC

# A proposito SIN `set -e`, por el mismo motivo que el script del cluster: las
# funciones se invocan dentro de `|| fallos=...` y en ese contexto POSIX
# desactiva errexit para todo el cuerpo de la funcion. Cada paso se comprueba.
set -u

[ -r /etc/default/respaldo-jobtracker ] && . /etc/default/respaldo-jobtracker

# La ruta real del despliegue se define en /etc/default/respaldo-jobtracker.
# El valor por defecto es neutro a proposito: no debe revelar el usuario
# ni la distribucion de directorios del servidor.
COMPOSE_DIR="${COMPOSE_DIR:-/opt/jobtracker/services/api}"
SERVICIO_DB="${SERVICIO_DB:-postgres}"
BASE="${BASE:-jobtracker}"
USUARIO="${USUARIO:-jobtracker}"

marca="$(date +%Y%m%d-%H%M%S)"
destino="${DESTINO:-/var/backups/jobtracker}"
trabajo=/tmp/verificacion-jobtracker
# Una copia diaria: 30 archivos son 30 dias reales de cobertura, no 7.5 como en
# el CronJob del cluster, que corre cuatro veces al dia con el mismo tope.
conservar=30
fallos=0
nombre=jobtracker

mkdir -p "$destino" "$trabajo" || { echo "ERROR: no se pudieron crear los directorios" >&2; exit 1; }

fallo() {
  echo "ERROR: $*" >&2
  fallos=$((fallos + 1))
}

# Devuelve 0 solo si el volcado existe, es restaurable y tiene contenido real.
respaldar() {
  salida="$destino/$nombre-$marca.dump"

  if ! docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps --status running "$SERVICIO_DB" 2>/dev/null | grep -q "$SERVICIO_DB"; then
    fallo "$nombre: el servicio $SERVICIO_DB no esta corriendo"
    return 1
  fi

  # -Fc es el formato custom de pg_dump: consistente con escrituras concurrentes
  # (toma un snapshot transaccional) y restaurable con pg_restore de forma
  # selectiva. El equivalente de `sqlite3 .backup` frente a un `cp`.
  if ! docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T "$SERVICIO_DB" \
       pg_dump -U "$USUARIO" -d "$BASE" -Fc > "$salida" 2>/dev/null; then
    fallo "$nombre: pg_dump fallo"
    rm -f "$salida"
    return 1
  fi

  # `pg_restore -l` lee el indice del volcado. Es lo mas cercano a un
  # integrity_check: si el archivo esta truncado o corrupto, falla aqui.
  if ! pg_restore -l "$salida" > "$trabajo/toc.txt" 2>/dev/null; then
    fallo "$nombre: el volcado no es legible por pg_restore"
    rm -f "$salida" "$trabajo/toc.txt"
    return 1
  fi

  if ! gzip -f "$salida"; then
    fallo "$nombre: gzip fallo"
    rm -f "$salida" "$salida.gz"
    return 1
  fi

  # Se verifica el ARTEFACTO FINAL, no el intermedio: un .gz truncado por disco
  # lleno sobrevivia como respaldo aparentemente valido en la version anterior
  # del script del cluster, y esa leccion aplica igual aqui.
  if ! gzip -dc "$salida.gz" > "$trabajo/$nombre.dump" 2>/dev/null; then
    fallo "$nombre: el .gz no se puede descomprimir"
    rm -f "$salida.gz" "$trabajo/$nombre.dump"
    return 1
  fi
  if ! pg_restore -l "$trabajo/$nombre.dump" > "$trabajo/toc.txt" 2>/dev/null; then
    fallo "$nombre: el .gz descomprimido no pasa pg_restore -l"
    rm -f "$salida.gz" "$trabajo/$nombre.dump" "$trabajo/toc.txt"
    return 1
  fi

  # Comprobacion semantica minima: un volcado estructuralmente valido pero sin
  # tablas seria un respaldo inutil que pg_restore -l aprueba igual.
  tablas="$(grep -c 'TABLE DATA' "$trabajo/toc.txt" 2>/dev/null || echo 0)"
  if [ "$tablas" -lt 1 ]; then
    fallo "$nombre: el respaldo no contiene datos de ninguna tabla"
    rm -f "$salida.gz" "$trabajo/$nombre.dump" "$trabajo/toc.txt"
    return 1
  fi

  rm -f "$trabajo/$nombre.dump" "$trabajo/toc.txt"
  tam="$(wc -c < "$salida.gz")"
  echo "ok: $nombre -> $salida.gz ($tam bytes, $tablas tablas con datos)"
  return 0
}

# Solo corre si el respaldo local quedo bien: subir un archivo roto
# sobreescribiria la unica copia sana que quedara afuera.
empujar_offsite() {
  archivo="$destino/$nombre-$marca.dump.gz"

  if [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
    # El script del cluster sale con 0 aqui, y eso deja el job en verde sin copia
    # off-site. Aqui se cuenta como fallo: un respaldo que solo vive en el mismo
    # servidor que la base no es una copia de seguridad.
    fallo "$nombre: sin credenciales de R2, no hay copia fuera del servidor"
    return 1
  fi

  export RCLONE_CONFIG_R2_TYPE=s3
  export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
  export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_R2_ENDPOINT="${R2_ENDPOINT:-}"

  # --s3-no-check-bucket: el token tiene permiso de objeto, no de bucket, y sin
  # esta bandera rclone intenta un CreateBucket que devuelve 403.
  if ! rclone copy --s3-no-check-bucket "$archivo" "R2:$R2_BUCKET/$nombre/"; then
    fallo "$nombre: fallo la subida a R2"
    return 1
  fi

  # Una subida que "no falla" pero deja 0 bytes es el modo de fallo tipico.
  local_bytes="$(wc -c < "$archivo")"
  remoto_bytes="$(rclone size --s3-no-check-bucket --json "R2:$R2_BUCKET/$nombre/$(basename "$archivo")" 2>/dev/null | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"
  if [ "$remoto_bytes" != "$local_bytes" ]; then
    fallo "$nombre: en R2 quedaron '$remoto_bytes' bytes y en local $local_bytes"
    return 1
  fi
  echo "offsite ok: $nombre -> R2:$R2_BUCKET/$nombre/ ($remoto_bytes bytes)"
  return 0
}

rotar() {
  # Solo se rota si no hubo fallos: una base que hoy no se pudo respaldar no
  # debe llevarse por delante las copias buenas de dias anteriores.
  if [ "$fallos" -ne 0 ]; then
    echo "aviso: hubo fallos, no se rota"
    return 0
  fi
  sobrantes="$(ls -1t "$destino/$nombre-"*.dump.gz 2>/dev/null | tail -n +$((conservar + 1)))"
  [ -z "$sobrantes" ] && return 0
  echo "$sobrantes" | while read -r viejo; do
    rm -f "$viejo" && echo "rotado: $viejo"
  done
}

respaldar || true
[ "$fallos" -eq 0 ] && { empujar_offsite || true; }
rotar

# Latido a ntfy, best-effort y solo si todo salio bien. Topic propio: compartirlo
# con otros respaldos hace que el latido de uno enmascare el fallo del otro.
if [ "$fallos" -eq 0 ] && [ -n "${NTFY_URL:-}" ] && [ -n "${NTFY_TOPIC:-}" ]; then
  curl -fsS -m 10 -d "jobtracker respaldado y verificado en R2 ($marca)" \
    "$NTFY_URL/$NTFY_TOPIC" >/dev/null 2>&1 || echo "aviso: el latido a ntfy no se entrego"
fi

if [ "$fallos" -ne 0 ]; then
  echo "FALLO: $fallos error(es) en el respaldo de $nombre" >&2
  exit 1
fi
echo "respaldo de $nombre completo"
