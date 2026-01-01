# Oli3D Design - Sitio Web Portfolio

Sitio web portfolio para Oli3D Design, especialistas en diseño e impresión 3D personalizada.

## 🚀 Despliegue en GitHub Pages

Para publicar este sitio en GitHub Pages:

1. **Crear un repositorio en GitHub:**
   - Ve a GitHub y crea un nuevo repositorio
   - El nombre del repositorio determinará la URL (ej: `oli3d` → `usuario.github.io/oli3d`)

2. **Subir los archivos:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

3. **Configurar GitHub Pages:**
   - Ve a Settings → Pages en tu repositorio
   - En "Source", selecciona la rama `main` y la carpeta `/ (root)`
   - Guarda los cambios
   - Tu sitio estará disponible en `https://TU_USUARIO.github.io/TU_REPOSITORIO`

## 📁 Estructura del Proyecto

```
oli3d/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Funcionalidad JavaScript
├── resources/          # Recursos (logos, imágenes)
│   ├── LOGO.svg
│   ├── LOGO.png
│   └── LOGO_SIN_FONDO.png
└── README.md          # Este archivo
```

## 🎨 Características

- ✅ Diseño responsive y moderno
- ✅ Sección "Sobre Nosotros"
- ✅ Portfolio con búsqueda y filtros
- ✅ Modal para detalles de proyectos
- ✅ Sección de contacto
- ✅ Botones de redes sociales
- ✅ Paleta de colores basada en el logo
- ✅ Navegación suave entre secciones
- ✅ Compatible con GitHub Pages

## 🔧 Personalización

### Actualizar enlaces de redes sociales

Edita los enlaces en `index.html`:
- Busca los elementos con clase `social-link` en el footer
- Actualiza los atributos `href` con tus URLs reales

### Agregar proyectos al portfolio

Edita el array `portfolioItems` en `script.js`:

```javascript
{
    id: 10,
    title: "Nombre del Proyecto",
    description: "Descripción del proyecto",
    tags: ["regalo", "decoracion"],
    image: null, // O ruta a imagen: "resources/proyecto1.jpg"
    link: "https://wallapop.com/item/..." // O "mailto:contacto@oli3d.com?subject=..."
}
```

### Actualizar información de contacto

Edita la sección de contacto en `index.html` y actualiza:
- Textos descriptivos
- Enlaces de email (reemplaza `contacto@oli3d.com`)

## 📱 Responsive Design

El sitio está optimizado para:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)

## 🌐 Navegadores Compatibles

- Chrome (últimas versiones)
- Firefox (últimas versiones)
- Safari (últimas versiones)
- Edge (últimas versiones)

## 📝 Notas

- El sitio está completamente en español (España)
- Los proyectos del portfolio son placeholders - reemplázalos con tus proyectos reales
- Las imágenes de proyectos se pueden agregar en la carpeta `resources/` y referenciarlas en `script.js`

## 📧 Soporte

Para cualquier pregunta o modificación, contacta al desarrollador.

---

© 2024 Oli3D Design. Todos los derechos reservados.

