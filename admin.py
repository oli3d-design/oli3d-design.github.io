#!/usr/bin/env python3
"""
Oli3D Design - Admin Manager (Web Version with Git Integration)
A local web-based admin panel for managing products and categories.
Features: Large image preview, git commit integration for non-programmers.

Usage:
    python3 admin.py
    
Then open http://localhost:5050 in your browser.

Requirements: pip install flask
"""

import json
import os
import subprocess
import webbrowser
from datetime import datetime
from pathlib import Path
from threading import Timer

try:
    from flask import Flask, render_template_string, request, jsonify, redirect, url_for, send_from_directory
except ImportError:
    print("\n❌ Flask not found. Please install it:")
    print("   pip install flask")
    print("\nThen run: python3 admin.py\n")
    exit(1)

# Paths
BASE_DIR = Path(__file__).parent
DB_DIR = BASE_DIR / "db"
PRODUCTS_FILE = DB_DIR / "products.json"
CATEGORIES_FILE = DB_DIR / "categories.json"

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path='/static')

# ============== JSON Helpers ==============

def load_products():
    try:
        with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f).get('products', [])
    except:
        return []

def save_products(products):
    with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump({'products': products}, f, indent=4, ensure_ascii=False)

def load_categories():
    try:
        with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f).get('categories', [])
    except:
        return []

def save_categories(categories):
    with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump({'categories': categories}, f, indent=4, ensure_ascii=False)


# ============== Settings Helpers ==============

SETTINGS_FILE = DB_DIR / "settings.json"

def load_settings():
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        # Default settings if file doesn't exist
        return {'showPrices': True}

def save_settings(settings):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=4, ensure_ascii=False)


# ============== Git Helpers ==============

def has_uncommitted_changes():
    """Check if there are uncommitted changes in db/ folder"""
    try:
        result = subprocess.run(
            ['git', 'status', '--porcelain', 'db/'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        return bool(result.stdout.strip())
    except:
        return False

def get_git_status():
    """Get readable git status"""
    try:
        result = subprocess.run(
            ['git', 'status', '--porcelain', 'db/'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        changes = result.stdout.strip().split('\n') if result.stdout.strip() else []
        return [c.strip() for c in changes if c.strip()]
    except:
        return []

def validate_database():
    """Validate database integrity before commit"""
    errors = []
    warnings = []
    
    products = load_products()
    categories = load_categories()
    
    category_ids = {c['id'] for c in categories}
    
    # Check products
    product_ids = set()
    for p in products:
        # Check required fields
        if not p.get('id'):
            errors.append(f"Producto sin ID encontrado")
        elif p['id'] in product_ids:
            errors.append(f"ID duplicado: {p['id']}")
        else:
            product_ids.add(p['id'])
        
        if not p.get('name'):
            errors.append(f"Producto '{p.get('id', '?')}' sin nombre")
        
        if not p.get('price') and p.get('price') != 0:
            errors.append(f"Producto '{p.get('id', '?')}' sin precio")
        
        if not p.get('categories'):
            warnings.append(f"Producto '{p.get('name', p.get('id', '?'))}' sin categorías")
        else:
            for cat in p.get('categories', []):
                if cat not in category_ids:
                    errors.append(f"Producto '{p.get('name', '?')}' tiene categoría inexistente: {cat}")
        
        if not p.get('image'):
            warnings.append(f"Producto '{p.get('name', '?')}' sin imagen")
    
    # Check categories
    cat_ids = set()
    for c in categories:
        if not c.get('id'):
            errors.append("Categoría sin ID encontrada")
        elif c['id'] in cat_ids:
            errors.append(f"ID de categoría duplicado: {c['id']}")
        else:
            cat_ids.add(c['id'])
        
        if not c.get('name'):
            errors.append(f"Categoría '{c.get('id', '?')}' sin nombre")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'product_count': len(products),
        'category_count': len(categories)
    }

def git_commit(message):
    """Commit changes to git"""
    try:
        # Add db folder
        subprocess.run(['git', 'add', 'db/'], cwd=BASE_DIR, check=True)
        
        # Commit
        result = subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return {'success': True, 'message': 'Cambios guardados correctamente'}
        else:
            return {'success': False, 'message': result.stderr or 'Error al guardar'}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# Serve static files (images)
@app.route('/files/<path:filename>')
def serve_file(filename):
    return send_from_directory(BASE_DIR, filename)


# ============== HTML Templates ==============

BASE_STYLES = '''
:root {
    --bg: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --text: #c9d1d9;
    --text-muted: #8b949e;
    --primary: #58a6ff;
    --primary-hover: #79b8ff;
    --success: #3fb950;
    --danger: #f85149;
    --warning: #d29922;
    --border: #30363d;
    --radius: 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    min-height: 100vh;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    padding: 16px 0;
    margin-bottom: 24px;
}

header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

h1 {
    font-size: 20px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.tab {
    padding: 10px 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
}

.tab:hover {
    background: var(--bg-tertiary);
    color: var(--text);
}

.tab.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    text-decoration: none;
}

.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-success { background: var(--success); color: white; }
.btn-success:hover { opacity: 0.9; }
.btn-danger { background: var(--danger); color: white; }
.btn-danger:hover { opacity: 0.9; }
.btn-secondary { background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border); }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.btn-lg { padding: 14px 24px; font-size: 16px; }

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    margin-right: 4px;
}

.badge-hidden { background: var(--danger); color: white; }
.badge-highlight { background: var(--warning); color: black; }
.badge-popular { background: var(--success); color: white; }
.badge-changes { background: var(--warning); color: black; }

.flash-message {
    padding: 12px 16px;
    border-radius: var(--radius);
    margin-bottom: 16px;
    font-weight: 500;
}

.flash-success { background: rgba(63, 185, 80, 0.15); border: 1px solid var(--success); color: var(--success); }
.flash-error { background: rgba(248, 81, 73, 0.15); border: 1px solid var(--danger); color: var(--danger); }

.count-badge {
    background: var(--bg-tertiary);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 13px;
    color: var(--text-muted);
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
}

.search-box {
    flex: 1;
    max-width: 300px;
}

.search-box input {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
}

.search-box input:focus {
    outline: none;
    border-color: var(--primary);
}

/* Product Grid with large images */
.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
}

.product-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 0;
}

.product-card:hover {
    border-color: var(--primary);
}

.product-image {
    width: 140px;
    height: 140px;
    object-fit: cover;
    background: var(--bg-tertiary);
}

.product-details {
    padding: 14px;
    display: flex;
    flex-direction: column;
}

.product-name {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
}

.product-meta {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 8px;
    flex: 1;
}

.product-price {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 10px;
}

.product-actions {
    display: flex;
    gap: 8px;
}

/* Category list */
.category-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
}

.category-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.category-card:hover {
    border-color: var(--primary);
}

.category-icon {
    font-size: 28px;
}

.category-info {
    flex: 1;
}

.category-name {
    font-weight: 600;
}

.category-id {
    font-size: 12px;
    color: var(--text-muted);
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
}

/* Modal */
.modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal-overlay.show {
    display: flex;
}

.modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    font-size: 16px;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.validation-list {
    list-style: none;
}

.validation-list li {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.validation-list li:last-child {
    border-bottom: none;
}

.validation-error { color: var(--danger); }
.validation-warning { color: var(--warning); }
.validation-success { color: var(--success); }
'''

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oli3D Admin Manager</title>
    <style>''' + BASE_STYLES + '''</style>
</head>
<body>
    <header>
        <div class="container">
            <h1>🖨️ Oli3D Admin Manager</h1>
            <div class="header-actions">
                <span class="count-badge">{{ products|length }} productos · {{ categories|length }} categorías</span>
                {% if has_changes %}
                <span class="badge badge-changes">⚠️ Cambios sin guardar</span>
                {% endif %}
                <button class="btn btn-success btn-lg" onclick="showSaveModal()" {{ 'disabled' if not has_changes else '' }}>
                    💾 Guardar Cambios
                </button>
            </div>
        </div>
    </header>
    
    <div class="container">
        {% if message %}
        <div class="flash-message flash-{{ message_type or 'success' }}">{{ message }}</div>
        {% endif %}
        
        <div class="tabs">
            <a href="/?tab=products" class="tab {{ 'active' if tab == 'products' else '' }}">📦 Productos</a>
            <a href="/?tab=categories" class="tab {{ 'active' if tab == 'categories' else '' }}">🏷️ Categorías</a>
            <a href="/?tab=settings" class="tab {{ 'active' if tab == 'settings' else '' }}">⚙️ Ajustes</a>
        </div>
        
        {% if tab == 'products' %}
        <!-- Products Tab -->
        <div class="toolbar">
            <a href="/product/new" class="btn btn-primary">➕ Nuevo Producto</a>
            <div class="search-box">
                <input type="text" id="search" placeholder="🔍 Buscar productos..." onkeyup="filterItems()">
            </div>
        </div>
        
        <div class="product-grid">
            {% for product in products %}
            <div class="product-card" data-name="{{ product.name|lower }}">
                <img src="/files/{{ product.image }}" alt="" class="product-image" onerror="this.src='/files/resources/LOGO_SIN_FONDO.png'">
                <div class="product-details">
                    <div class="product-name">
                        {% if product.hidden %}<span class="badge badge-hidden">Oculto</span>{% endif %}
                        {% if product.highlighted %}<span class="badge badge-highlight">⭐</span>{% endif %}
                        {{ product.name }}
                    </div>
                    <div class="product-meta">{{ product.categories|join(', ') }}</div>
                    <div class="product-price">€{{ "%.2f"|format(product.price) }}</div>
                    <div class="product-actions">
                        <a href="/product/edit/{{ product.id }}" class="btn btn-secondary btn-sm">✏️ Editar</a>
                        <a href="/product/delete/{{ product.id }}" class="btn btn-danger btn-sm" onclick="return confirm('¿Eliminar este producto?')">🗑️</a>
                    </div>
                </div>
            </div>
            {% else %}
            <div class="empty-state">No hay productos</div>
            {% endfor %}
        </div>
        
        {% elif tab == 'categories' %}
        <!-- Categories Tab -->
        <div class="toolbar">
            <a href="/category/new" class="btn btn-primary">➕ Nueva Categoría</a>
        </div>
        
        <div class="category-list">
            {% for category in categories %}
            <div class="category-card">
                <span class="category-icon">{{ category.icon }}</span>
                <div class="category-info">
                    <div class="category-name">
                        {{ category.name }}
                        {% if category.hidden %}<span class="badge badge-hidden">Oculto</span>{% endif %}
                        {% if category.popular %}<span class="badge badge-popular">Popular</span>{% endif %}
                    </div>
                    <div class="category-id">ID: {{ category.id }}</div>
                </div>
                <div class="product-actions">
                    <a href="/category/edit/{{ category.id }}" class="btn btn-secondary btn-sm">✏️</a>
                    {% if category.id != 'all' %}
                    <a href="/category/delete/{{ category.id }}" class="btn btn-danger btn-sm" onclick="return confirm('¿Eliminar?')">🗑️</a>
                    {% endif %}
                </div>
            </div>
            {% else %}
            <div class="empty-state">No hay categorías</div>
            {% endfor %}
        </div>
        
        {% elif tab == 'settings' %}
        <!-- Settings Tab -->
        <div class="form-card" style="max-width: 600px; margin: 0 auto; background: var(--bg-secondary); padding: 20px; border-radius: var(--radius); border: 1px solid var(--border);">
            <div class="form-title" style="font-size: 18px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">⚙️ Ajustes Globales</div>
            <form method="POST" action="/settings/save">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="checkbox-item" style="font-size: 16px; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); display: flex; gap: 12px; align-items: flex-start; cursor: pointer;">
                        <input type="checkbox" name="showPrices" {{ 'checked' if settings.showPrices else '' }} style="width: 20px; height: 20px; margin-top: 2px;">
                        <span>
                            <strong style="display: block; margin-bottom: 4px;">💰 Mostrar precios</strong>
                            <small style="color: var(--text-muted); font-size: 13px;">Si está desactivado, los precios no se mostrarán en la web pública. Útil para modo catálogo/consulta.</small>
                        </span>
                    </label>
                </div>
                <div class="form-actions" style="display: flex; justify-content: flex-end;">
                    <button type="submit" class="btn btn-primary btn-lg">💾 Guardar Ajustes</button>
                </div>
            </form>
        </div>
        {% endif %}
    </div>
    
    <!-- Save Changes Modal -->
    <div class="modal-overlay" id="saveModal">
        <div class="modal">
            <div class="modal-header">💾 Guardar Cambios</div>
            <div class="modal-body" id="modalBody">
                <p>Validando cambios...</p>
            </div>
            <div class="modal-footer" id="modalFooter">
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    </div>
    
    <script>
        function filterItems() {
            const search = document.getElementById('search').value.toLowerCase();
            document.querySelectorAll('.product-card, .category-card').forEach(card => {
                const name = card.dataset.name || card.querySelector('.category-name')?.textContent.toLowerCase() || '';
                card.style.display = name.includes(search) ? '' : 'none';
            });
        }
        
        function showSaveModal() {
            document.getElementById('saveModal').classList.add('show');
            validateAndShowResults();
        }
        
        function closeModal() {
            document.getElementById('saveModal').classList.remove('show');
        }
        
        async function validateAndShowResults() {
            const body = document.getElementById('modalBody');
            const footer = document.getElementById('modalFooter');
            
            body.innerHTML = '<p>⏳ Validando base de datos...</p>';
            
            try {
                const response = await fetch('/api/validate');
                const data = await response.json();
                
                let html = '';
                
                if (data.errors.length > 0) {
                    html += '<h4 style="color: var(--danger); margin-bottom: 8px;">❌ Errores (deben corregirse)</h4>';
                    html += '<ul class="validation-list">';
                    data.errors.forEach(e => {
                        html += `<li class="validation-error">⛔ ${e}</li>`;
                    });
                    html += '</ul>';
                }
                
                if (data.warnings.length > 0) {
                    html += '<h4 style="color: var(--warning); margin: 16px 0 8px;">⚠️ Advertencias</h4>';
                    html += '<ul class="validation-list">';
                    data.warnings.forEach(w => {
                        html += `<li class="validation-warning">⚠️ ${w}</li>`;
                    });
                    html += '</ul>';
                }
                
                if (data.valid) {
                    html += `<div style="margin-top: 16px; padding: 12px; background: rgba(63,185,80,0.1); border-radius: 8px;">
                        <p style="color: var(--success); margin: 0;">✅ Base de datos válida</p>
                        <p style="margin: 8px 0 0; color: var(--text-muted);">${data.product_count} productos, ${data.category_count} categorías</p>
                    </div>`;
                    
                    footer.innerHTML = `
                        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="btn btn-success" onclick="commitChanges()">✅ Confirmar y Guardar</button>
                    `;
                } else {
                    footer.innerHTML = `
                        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                    `;
                }
                
                body.innerHTML = html;
                
            } catch (error) {
                body.innerHTML = `<p class="validation-error">Error al validar: ${error.message}</p>`;
            }
        }
        
        async function commitChanges() {
            const body = document.getElementById('modalBody');
            const footer = document.getElementById('modalFooter');
            
            body.innerHTML = '<p>⏳ Guardando cambios...</p>';
            footer.innerHTML = '';
            
            try {
                const response = await fetch('/api/commit', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    body.innerHTML = `<div style="text-align: center; padding: 20px;">
                        <p style="font-size: 48px; margin-bottom: 16px;">✅</p>
                        <p style="font-size: 18px; font-weight: 600;">¡Cambios guardados!</p>
                        <p style="color: var(--text-muted); margin-top: 8px;">Los cambios se han guardado en el repositorio.</p>
                    </div>`;
                    footer.innerHTML = `<button class="btn btn-primary" onclick="location.reload()">Aceptar</button>`;
                } else {
                    body.innerHTML = `<p class="validation-error">Error: ${data.message}</p>`;
                    footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
                }
            } catch (error) {
                body.innerHTML = `<p class="validation-error">Error: ${error.message}</p>`;
                footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
            }
        }
    </script>
</body>
</html>
'''

PRODUCT_FORM_TEMPLATE = '''
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ "Editar" if product else "Nuevo" }} Producto - Oli3D Admin</title>
    <style>
        ''' + BASE_STYLES + '''
        .form-layout {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 30px;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        @media (max-width: 768px) {
            .form-layout {
                grid-template-columns: 1fr;
            }
        }
        
        .image-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
        }
        
        .image-preview {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            border-radius: var(--radius);
            background: var(--bg-tertiary);
            margin-bottom: 16px;
        }
        
        .form-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
        }
        
        .form-title {
            font-size: 18px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text);
            font-size: 14px;
            font-family: inherit;
        }
        
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        .checkbox-group {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            background: var(--bg-tertiary);
            padding: 12px;
            border-radius: var(--radius);
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .checkbox-item input {
            width: 18px;
            height: 18px;
        }
        
        .form-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
        }
        
        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 8px;
            background: var(--bg-tertiary);
            padding: 12px;
            border-radius: var(--radius);
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>🖨️ {{ "✏️ Editar" if product else "➕ Nuevo" }} Producto</h1>
        </div>
    </header>
    
    <div class="container">
        <form method="POST" class="form-layout">
            <div class="image-section">
                <img id="imagePreview" src="/files/{{ product.image if product else 'resources/LOGO_SIN_FONDO.png' }}" class="image-preview" onerror="this.src='/files/resources/LOGO_SIN_FONDO.png'">
                
                <div class="form-group">
                    <label>Imagen principal</label>
                    <input type="text" name="image" id="imageInput" value="{{ product.image if product else 'products/' }}" oninput="updatePreview()">
                </div>

                <div class="form-group">
                    <label>Imágenes adicionales (Galería)</label>
                    <textarea name="additional_images" style="min-height: 80px;" placeholder="products/foto2.jpg&#10;products/foto3.jpg">{% if product and product.images and product.images|length > 1 %}{% for img in product.images[1:] %}{{ img }}
{% endfor %}{% endif %}</textarea>
                    <small style="color: var(--text-muted); font-size: 12px; display: block; margin-top: 4px;">Una ruta por línea. La primera será la principal.</small>
                </div>
                
                <div class="form-group">
                    <label>Opciones</label>
                    <div class="checkbox-group" style="flex-direction: column;">
                        <label class="checkbox-item">
                            <input type="checkbox" name="highlighted" {{ 'checked' if product and product.highlighted else '' }}>
                            ⭐ Destacado
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" name="hidden" {{ 'checked' if product and product.hidden else '' }}>
                            👁 Oculto
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-row">
                    <div class="form-group">
                        <label>ID (único, sin espacios)</label>
                        <input type="text" name="id" value="{{ product.id if product else '' }}" {{ 'readonly style="opacity:0.6"' if product else '' }} required pattern="[a-z0-9_]+">
                    </div>
                    <div class="form-group">
                        <label>Precio (€)</label>
                        <input type="number" step="0.01" name="price" value="{{ product.price if product else '' }}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="name" value="{{ product.name if product else '' }}" required>
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description">{{ product.description if product else '' }}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Tamaño</label>
                        <input type="text" name="size" value="{{ product.size if product else '' }}">
                    </div>
                    <div class="form-group">
                        <label>Material</label>
                        <input type="text" name="material" value="{{ product.material if product else 'PLA' }}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Link Wallapop (opcional)</label>
                    <input type="url" name="wallapopLink" value="{{ product.wallapopLink if product else '' }}">
                </div>
                
                <div class="form-group">
                    <label>Categorías</label>
                    <div class="categories-grid">
                        {% for cat in categories %}
                        {% if cat.id != 'all' %}
                        <label class="checkbox-item">
                            <input type="checkbox" name="categories" value="{{ cat.id }}" {{ 'checked' if product and cat.id in product.categories else '' }}>
                            {{ cat.icon }} {{ cat.name }}
                        </label>
                        {% endif %}
                        {% endfor %}
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Ofertas por cantidad (una por línea: cantidad,precio,etiqueta)</label>
                    <textarea name="priceOffers" placeholder="3,7.99,3+ unidades&#10;6,6.99,6+ unidades">{% if product and product.priceOffers %}{% for o in product.priceOffers %}{{ o.quantity }},{{ o.price }},{{ o.label }}
{% endfor %}{% endif %}</textarea>
                </div>
                
                <div class="form-actions">
                    <a href="/?tab=products" class="btn btn-secondary">← Cancelar</a>
                    <button type="submit" class="btn btn-primary">💾 Guardar</button>
                </div>
            </div>
        </form>
    </div>
    
    <script>
        function updatePreview() {
            var img = document.getElementById('imagePreview');
            var input = document.getElementById('imageInput');
            img.src = '/files/' + input.value;
        }
    </script>
</body>
</html>
'''

CATEGORY_FORM_TEMPLATE = '''
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ "Editar" if category else "Nueva" }} Categoría - Oli3D Admin</title>
    <style>
        ''' + BASE_STYLES + '''
        .form-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            max-width: 500px;
            margin: 40px auto;
        }
        .form-title { font-size: 18px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; }
        .form-group input { width: 100%; padding: 10px 12px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; }
        .form-group input:focus { outline: none; border-color: var(--primary); }
        .checkbox-group { display: flex; gap: 20px; flex-wrap: wrap; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius); }
        .checkbox-item { display: flex; align-items: center; gap: 8px; }
        .checkbox-item input { width: 18px; height: 18px; }
        .form-actions { display: flex; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
    </style>
</head>
<body>
    <div class="form-card">
        <h2 class="form-title">{{ "✏️ Editar" if category else "➕ Nueva" }} Categoría</h2>
        
        <form method="POST">
            <div class="form-group">
                <label>ID (único, sin espacios)</label>
                <input type="text" name="id" value="{{ category.id if category else '' }}" {{ 'readonly style="opacity:0.6"' if category else '' }} required pattern="[a-z0-9_]+">
            </div>
            
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" name="name" value="{{ category.name if category else '' }}" required>
            </div>
            
            <div class="form-group">
                <label>Icono (emoji)</label>
                <input type="text" name="icon" value="{{ category.icon if category else '📦' }}" required>
            </div>
            
            <div class="form-group">
                <label>Opciones</label>
                <div class="checkbox-group">
                    <label class="checkbox-item">
                        <input type="checkbox" name="popular" {{ 'checked' if category and category.popular else '' }}>
                        ⭐ Popular
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" name="seasonal" {{ 'checked' if category and category.seasonal else '' }}>
                        🗓️ Temporal
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" name="hidden" {{ 'checked' if category and category.hidden else '' }}>
                        👁 Oculto
                    </label>
                </div>
            </div>
            
            <div class="form-actions">
                <a href="/?tab=categories" class="btn btn-secondary">← Cancelar</a>
                <button type="submit" class="btn btn-primary">💾 Guardar</button>
            </div>
        </form>
    </div>
</body>
</html>
'''


# ============== Routes ==============

@app.route('/')
def index():
    tab = request.args.get('tab', 'products')
    message = request.args.get('message')
    message_type = request.args.get('type', 'success')
    return render_template_string(
        HTML_TEMPLATE,
        products=load_products(),
        categories=load_categories(),
        settings=load_settings(),
        tab=tab,
        message=message,
        message_type=message_type,
        has_changes=has_uncommitted_changes()
    )


@app.route('/api/validate')
def api_validate():
    return jsonify(validate_database())


@app.route('/api/commit', methods=['POST'])
def api_commit():
    # First validate
    validation = validate_database()
    if not validation['valid']:
        return jsonify({'success': False, 'message': 'La base de datos tiene errores'})
    
    # Commit
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
    result = git_commit(f"Actualización de productos/categorías - {timestamp}")
    return jsonify(result)


@app.route('/settings/save', methods=['POST'])
def save_settings_route():
    settings = {
        'showPrices': 'showPrices' in request.form
    }
    save_settings(settings)
    return redirect('/?tab=settings&message=Ajustes guardados (recuerda guardar los cambios)')


@app.route('/product/new', methods=['GET', 'POST'])
def new_product():
    if request.method == 'POST':
        products = load_products()
        
        new_id = request.form['id'].lower().replace(' ', '_')
        if any(p['id'] == new_id for p in products):
            return redirect('/?tab=products&message=Ya existe un producto con ese ID&type=error')
        
        # Handle images
        main_image = request.form.get('image', 'resources/LOGO_SIN_FONDO.png')
        images = [main_image]
        additional = request.form.get('additional_images', '').strip()
        if additional:
            for line in additional.split('\n'):
                if line.strip():
                    images.append(line.strip())

        product = {
            'id': new_id,
            'name': request.form['name'],
            'description': request.form.get('description', ''),
            'price': float(request.form['price']),
            'image': main_image,
            'images': images if len(images) > 1 else None,
            'highlighted': 'highlighted' in request.form,
            'categories': request.form.getlist('categories'),
            'size': request.form.get('size', ''),
            'material': request.form.get('material', 'PLA'),
            'createdAt': datetime.now().strftime('%Y-%m-%d')
        }
        
        # Clean None values
        if product['images'] is None:
            del product['images']
        
        if request.form.get('wallapopLink'):
            product['wallapopLink'] = request.form['wallapopLink']
        
        if 'hidden' in request.form:
            product['hidden'] = True
        
        offers_text = request.form.get('priceOffers', '').strip()
        if offers_text:
            offers = []
            for line in offers_text.split('\n'):
                parts = line.strip().split(',')
                if len(parts) >= 2:
                    try:
                        offers.append({
                            'quantity': int(parts[0]),
                            'price': float(parts[1]),
                            'label': parts[2] if len(parts) > 2 else f"{parts[0]}+ unidades"
                        })
                    except:
                        pass
            if offers:
                product['priceOffers'] = offers
        
        products.append(product)
        save_products(products)
        return redirect('/?tab=products&message=Producto creado (recuerda guardar los cambios)')
    
    return render_template_string(PRODUCT_FORM_TEMPLATE, product=None, categories=load_categories())


@app.route('/product/edit/<product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    products = load_products()
    product = next((p for p in products if p['id'] == product_id), None)
    
    if not product:
        return redirect('/?tab=products&message=Producto no encontrado&type=error')
    
    if request.method == 'POST':
        product['name'] = request.form['name']
        product['description'] = request.form.get('description', '')
        product['price'] = float(request.form['price'])
        # Handle images
        main_image = request.form.get('image', 'resources/LOGO_SIN_FONDO.png')
        product['image'] = main_image
        
        images = [main_image]
        additional = request.form.get('additional_images', '').strip()
        if additional:
            for line in additional.split('\n'):
                if line.strip():
                    images.append(line.strip())
        
        if len(images) > 1:
            product['images'] = images
        elif 'images' in product:
            del product['images']
        product['highlighted'] = 'highlighted' in request.form
        product['categories'] = request.form.getlist('categories')
        product['size'] = request.form.get('size', '')
        product['material'] = request.form.get('material', 'PLA')
        
        if request.form.get('wallapopLink'):
            product['wallapopLink'] = request.form['wallapopLink']
        elif 'wallapopLink' in product:
            del product['wallapopLink']
        
        if 'hidden' in request.form:
            product['hidden'] = True
        elif 'hidden' in product:
            del product['hidden']
        
        offers_text = request.form.get('priceOffers', '').strip()
        if offers_text:
            offers = []
            for line in offers_text.split('\n'):
                parts = line.strip().split(',')
                if len(parts) >= 2:
                    try:
                        offers.append({
                            'quantity': int(parts[0]),
                            'price': float(parts[1]),
                            'label': parts[2] if len(parts) > 2 else f"{parts[0]}+ unidades"
                        })
                    except:
                        pass
            if offers:
                product['priceOffers'] = offers
            elif 'priceOffers' in product:
                del product['priceOffers']
        elif 'priceOffers' in product:
            del product['priceOffers']
        
        save_products(products)
        return redirect('/?tab=products&message=Producto actualizado (recuerda guardar los cambios)')
    
    return render_template_string(PRODUCT_FORM_TEMPLATE, product=product, categories=load_categories())


@app.route('/product/delete/<product_id>')
def delete_product(product_id):
    products = load_products()
    products = [p for p in products if p['id'] != product_id]
    save_products(products)
    return redirect('/?tab=products&message=Producto eliminado (recuerda guardar los cambios)')


@app.route('/category/new', methods=['GET', 'POST'])
def new_category():
    if request.method == 'POST':
        categories = load_categories()
        
        new_id = request.form['id'].lower().replace(' ', '_')
        if any(c['id'] == new_id for c in categories):
            return redirect('/?tab=categories&message=Ya existe una categoría con ese ID&type=error')
        
        category = {
            'id': new_id,
            'name': request.form['name'],
            'icon': request.form.get('icon', '📦'),
            'popular': 'popular' in request.form
        }
        
        if 'seasonal' in request.form:
            category['seasonal'] = True
        if 'hidden' in request.form:
            category['hidden'] = True
        
        categories.append(category)
        save_categories(categories)
        return redirect('/?tab=categories&message=Categoría creada (recuerda guardar los cambios)')
    
    return render_template_string(CATEGORY_FORM_TEMPLATE, category=None)


@app.route('/category/edit/<category_id>', methods=['GET', 'POST'])
def edit_category(category_id):
    categories = load_categories()
    category = next((c for c in categories if c['id'] == category_id), None)
    
    if not category:
        return redirect('/?tab=categories&message=Categoría no encontrada&type=error')
    
    if request.method == 'POST':
        category['name'] = request.form['name']
        category['icon'] = request.form.get('icon', '📦')
        category['popular'] = 'popular' in request.form
        
        if 'seasonal' in request.form:
            category['seasonal'] = True
        elif 'seasonal' in category:
            del category['seasonal']
        
        if 'hidden' in request.form:
            category['hidden'] = True
        elif 'hidden' in category:
            del category['hidden']
        
        save_categories(categories)
        return redirect('/?tab=categories&message=Categoría actualizada (recuerda guardar los cambios)')
    
    return render_template_string(CATEGORY_FORM_TEMPLATE, category=category)


@app.route('/category/delete/<category_id>')
def delete_category(category_id):
    categories = load_categories()
    categories = [c for c in categories if c['id'] != category_id]
    save_categories(categories)
    return redirect('/?tab=categories&message=Categoría eliminada (recuerda guardar los cambios)')


def open_browser():
    webbrowser.open('http://localhost:5050')


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🖨️  Oli3D Admin Manager")
    print("="*50)
    print("\n📍 Opening http://localhost:5050 in your browser...")
    print("   Press Ctrl+C to stop the server\n")
    
    Timer(1.5, open_browser).start()
    app.run(host='127.0.0.1', port=5050, debug=False)
