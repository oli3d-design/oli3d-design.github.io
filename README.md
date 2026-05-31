# Oli3D Website & Admin Panel

Bienvenido al repositorio de la web de Oli3D. Aquí tienes una guía rápida para empezar.

## 🛠️ 1. Configuración Inicial (Setup)

### Requisitos
Necesitas tener **Python** instalado en tu ordenador.
- **Mac**: Suele venir instalado. Abre la terminal y escribe `python3 --version` para comprobar.
- **Windows**: Descárgalo desde [python.org](https://www.python.org/downloads/). Asegúrate de marcar "Add Python to PATH" durante la instalación.

### Descargar el código
1.  Clona este repositorio o descarga el ZIP y descomprímelo.
2.  Abre una terminal (CMD o PowerShell en Windows) en la carpeta del proyecto.

### Instalar dependencias
El panel de administración necesita una librería llamada `Flask`. Instálala con este comando:

**Mac / Linux:**
```bash
pip3 install flask
```

**Windows:**
```bash
pip install flask
```

---

## 🌍 2. Probar la web en tu PC (Local)

Para ver la tienda tal como la verán los clientes:

1.  Abre la terminal en la carpeta del proyecto.
2.  Ejecuta:
    *   **Mac**: `python3 -m http.server 3000`
    *   **Windows**: `python -m http.server 3000`
3.  Abre tu navegador y entra en: **[http://localhost:3000](http://localhost:3000)**

*(Para parar el servidor, pulsa `Ctrl + C` en la terminal)*

---

## ⚙️ 3. Usar el Panel de Administración (Admin)

Para añadir productos, cambiar precios o subir fotos:

1.  Abre una **nueva** terminal (no cierres la de la web si quieres ver los cambios al momento).
2.  Ejecuta:
    *   **Mac**: `python3 local/admin.py`
    *   **Windows**: `python local/admin.py`
3.  Se abrirá automáticamente en tu navegador: **[http://localhost:5050](http://localhost:5050)**

### ¿Cómo funciona?
*   **Añadir/Editar**: Rellena los datos y pulsa "Guardar".
*   **Fotos**: Escribe la ruta de la foto (ej: `products/foto.jpg`).
*   **Precios**: Puedes ocultar todos los precios desde la pestaña "Ajustes".
*   **IMPORTANT**: Cuando termines de hacer cambios, pulsa el botón verde **"💾 Guardar Cambios"** (arriba a la derecha). Esto guarda los datos en los archivos.

---

## 🚀 4. Publicar cambios (Subir a Internet)

Cuando hayas guardado los cambios en el Admin y comprobado que todo está bien en local:

1.  Abre la terminal.
2.  Escribe estos tres comandos:
    ```bash
    git add .
    git commit -m "Actualización de productos"
    git push
    ```
3.  En unos minutos, la web pública se actualizará sola.
