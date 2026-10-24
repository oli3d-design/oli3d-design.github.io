# 📦 Subir Pokeballs a Wallapop — Guía paso a paso

## Requisitos previos

- Python 3 con las dependencias instaladas (`pip install playwright cryptography`)
- Playwright browsers instalados (`python3 -m playwright install chromium`)
- Estar logueado en Wallapop en Chrome con la cuenta de pokeballs

---

## 📁 Estructura de la carpeta de Pokeballs

La carpeta debe seguir esta estructura:

```
Mi_Carpeta_Pokeballs/
├── 0001 - Bulbasaur/          ← Pokeball individual (NNNN - Nombre)
│   ├── foto1.jpg
│   ├── foto2.jpg
│   └── metadata.yaml          ← ✨ NUEVO: precio de esta pokeball
├── 0025 - Pikachu/
│   ├── foto1.jpg
│   └── metadata.yaml
├── 0016 - Pidgey/             ← Pokeball NUEVA
│   ├── foto1.jpg
│   └── metadata.yaml
├── Masterball/                ← Pokeballs especiales (sin número de Pokédex)
│   ├── foto1.jpg
│   └── metadata.yaml
└── 0000 - Packs/              ← Carpeta de packs
    ├── Eevee/
    │   ├── foto_pack.jpg
    │   └── metadata.yaml
    └── Mew y Mewtwo/
        ├── foto_pack.jpg
        └── metadata.yaml
```

> **Importante:** La carpeta debe contener TODAS las pokeballs, no solo las nuevas.
> El script regenera toda la base de datos de pokeballs, pero conserva los datos
> existentes (links de Wallapop, descripciones) de las que ya estaban.

---

## ✨ El archivo `metadata.yaml`

Cada subcarpeta debe tener un archivo `metadata.yaml` con el precio de esa pokeball o pack:

```yaml
# metadata.yaml
price: 8.5
```

- **Si la carpeta NO tiene `metadata.yaml`**, el script usará el precio por defecto (8.5€ para individuales, o el configurado en `PACK_INFO` para packs) y mostrará un aviso.
- Para **packs nuevos**, también hay que añadir la entrada en `PACK_INFO` dentro de `local/import_pokeballs.py` (ver más abajo).

### Flujo de trabajo en Google Drive

Cuando añades una pokeball nueva:
1. Crea la subcarpeta `NNNN - NombrePokemon/`
2. Sube las fotos
3. Crea el archivo `metadata.yaml` con el precio:
   ```yaml
   price: 9.5
   ```

---

## Paso 1: Descarga la carpeta con TODAS las pokeballs

Descarga la carpeta completa con todas las pokeballs (las que ya existían + las nuevas).

> **Importante:** La carpeta debe contener TODAS las pokeballs, no solo las nuevas.

---

## Paso 2: Ejecuta el script de importación

```bash
cd /Users/josematez/Desktop/oli3d_web

# Opción A: Pasando la ruta como argumento
python3 local/import_pokeballs.py /ruta/a/mi/carpeta/Pokeballs

# Opción B: Sin argumento (usa la ruta por defecto ~/Downloads/Pokeballs 3)
python3 local/import_pokeballs.py
```

Esto hará:
- ✅ Copiar las imágenes a la carpeta `products/`
- ✅ Leer el precio de cada `metadata.yaml`
- ✅ Regenerar las entradas de pokeballs en `db/products.json`
- ✅ Conservar los wallapopLinks y datos de pokeballs que ya existían
- ⚠️ Avisar si alguna carpeta no tiene `metadata.yaml` (usará precio por defecto)

---

## Paso 3: Verifica qué pokeballs son nuevas

```bash
python3 -c "
import json
with open('db/products.json') as f:
    data = json.load(f)
poke = [p for p in data['products'] if 'pokeballs' in p.get('categories', [])]
no_link = [p for p in poke if not p.get('wallapopLink', '').strip()]
print(f'Total pokeballs: {len(poke)}')
print(f'Sin link de Wallapop (se subirán): {len(no_link)}')
for p in no_link:
    print(f'  ➕ {p[\"id\"]} -> {p[\"name\"]} @ {p[\"price\"]}€')
"
```

Si ves las nuevas pokeballs listadas como "sin link", todo está correcto.

---

## Paso 4: Actualiza la sesión de Wallapop

La sesión de Wallapop puede caducar. Antes de subir, actualízala:

```bash
# Si estás logueado en Chrome con la cuenta de pokeballs:
python3 local/extract_chrome_session.py --pokeballs
```

Si eso no funciona o la sesión ha caducado, haz login manual:

```bash
python3 local/upload_wallapop.py --login --pokeballs --profile
# → Se abre un navegador, inicia sesión manualmente, y pulsa Enter en la terminal
```

---

## Paso 5: Sube las pokeballs nuevas a Wallapop

```bash
# Sube solo las pokeballs sin link (las nuevas), sin comprobar los links existentes
python3 local/upload_wallapop.py --pokeballs --skip-check
```

El script automáticamente:
- ⏩ Salta las pokeballs que ya tienen link de Wallapop
- 🚀 Sube las que no tienen link
- 💾 Guarda el nuevo link en `products.json` tras cada subida exitosa
- ⏳ Espera 12 segundos entre subidas para no saturar Wallapop

### Opciones útiles

```bash
# Ver el navegador mientras sube (modo visual)
python3 local/upload_wallapop.py --pokeballs --skip-check --headed

# Guardar capturas de pantalla de cada paso (debug)
python3 local/upload_wallapop.py --pokeballs --skip-check --debug

# Subir solo una pokeball concreta
python3 local/upload_wallapop.py --id pokeball_0016_pidgey --headed

# Comprobar también que los links existentes siguen activos (más lento)
python3 local/upload_wallapop.py --pokeballs
```

---

## Resumen rápido (copiar y pegar)

```bash
cd /Users/josematez/Desktop/oli3d_web

# 1. Importar pokeballs desde la carpeta
python3 local/import_pokeballs.py /ruta/a/Pokeballs

# 2. Actualizar sesión de Wallapop
python3 local/extract_chrome_session.py --pokeballs

# 3. Subir las nuevas a Wallapop
python3 local/upload_wallapop.py --pokeballs --skip-check
```

---

## Archivos clave

| Archivo | Qué hace |
|---------|----------|
| `db/products.json` | Base de datos de todos los productos |
| `local/import_pokeballs.py` | Importa carpetas de pokeballs → regenera DB + copia imágenes |
| `local/extract_chrome_session.py` | Extrae cookies de Wallapop de Chrome |
| `local/upload_wallapop.py` | Sube productos a Wallapop automáticamente |
| `local/sessions/wallapop_pokeballs.json` | Sesión guardada de Wallapop |

---

## ⚠️ Notas importantes

- **Precio por complejidad**: Cada subcarpeta debe tener un `metadata.yaml` con `price: X.X`. Si falta, se usa 8.5€ por defecto para individuales.
- Si añades un **pack nuevo**, debes:
  1. Crear la carpeta en `0000 - Packs/NombrePack/` con sus fotos y `metadata.yaml`
  2. Añadir una entrada en `PACK_INFO` dentro de `local/import_pokeballs.py`
- La carpeta de pokeballs debe tener **todas** las pokeballs, no solo las nuevas.
- Si una subida falla, puedes volver a ejecutar el comando — solo intentará las que no tienen link.
