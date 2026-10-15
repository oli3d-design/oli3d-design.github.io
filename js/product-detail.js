/**
 * Oli3D Design - Product Detail Page Module
 * Handles individual product page display and actions
 */

document.addEventListener('DOMContentLoaded', () => {
  initProductDetailPage();
});

async function initProductDetailPage() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError('Producto no encontrado');
    return;
  }

  await loadProductDetail(productId);
  await loadRelatedProducts(productId);
}

/**
 * Get all images for a product (supports both single image and images array)
 */
function getProductImages(product) {
  // If product has images array, use it
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }
  // Fallback to single image field
  if (product.image) {
    return [product.image];
  }
  return [];
}

/**
 * Render the image gallery with thumbnails
 */
function renderGallery(product, basePath) {
  const { escapeHtml } = window.ProductsModule;
  const images = getProductImages(product);
  const name = escapeHtml(product.name);
  const fallback = `this.onerror=null;this.src='${basePath}resources/LOGO_SIN_FONDO.png'`;

  if (images.length === 0) {
    return `<img src="${basePath}resources/LOGO_SIN_FONDO.png" alt="${name}">`;
  }

  if (images.length === 1) {
    // Single image - simple display
    return `
      <img src="${basePath}${escapeHtml(images[0])}" alt="${name}" width="900" height="900"
           onerror="${fallback}">
    `;
  }

  // Multiple images - gallery with thumbnails
  return `
    <div class="gallery-main">
      <button type="button" class="gallery-arrow prev" onclick="changeGalleryImage(-1)" aria-label="Imagen anterior">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <img id="gallery-main-image" src="${basePath}${escapeHtml(images[0])}" alt="${name}" width="900" height="900"
           onerror="${fallback}">

      <button type="button" class="gallery-arrow next" onclick="changeGalleryImage(1)" aria-label="Imagen siguiente">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
    <div class="gallery-thumbnails" role="group" aria-label="Imágenes del producto">
      ${images.map((img, index) => `
        <button type="button" class="gallery-thumbnail ${index === 0 ? 'active' : ''}"
             data-image="${basePath}${escapeHtml(img)}"
             aria-label="Ver imagen ${index + 1} de ${images.length}"
             aria-pressed="${index === 0 ? 'true' : 'false'}"
             onclick="selectGalleryImage(this)">
          <img src="${basePath}${escapeHtml(img)}" alt="" loading="lazy" decoding="async"
               onerror="${fallback}">
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Change gallery image by offset
 */
window.changeGalleryImage = function (offset) {
  const thumbnails = Array.from(document.querySelectorAll('.gallery-thumbnail'));
  const activeThumb = document.querySelector('.gallery-thumbnail.active');

  if (!thumbnails.length || !activeThumb) return;

  let index = thumbnails.indexOf(activeThumb);
  let newIndex = (index + offset + thumbnails.length) % thumbnails.length;

  thumbnails[newIndex].click();
};

/**
 * Handle thumbnail click to change main image
 */
window.selectGalleryImage = function (thumbnail) {
  const mainImage = document.getElementById('gallery-main-image');
  if (!mainImage) return;

  // Update main image with a short cross-fade
  mainImage.classList.add('is-swapping');
  const swap = () => {
    mainImage.src = thumbnail.dataset.image;
    mainImage.classList.remove('is-swapping');
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swap();
  } else {
    setTimeout(swap, 150);
  }

  // Update active state
  document.querySelectorAll('.gallery-thumbnail').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-pressed', 'false');
  });
  thumbnail.classList.add('active');
  thumbnail.setAttribute('aria-pressed', 'true');
};

// Arrow keys browse the gallery when focus is inside it
document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const gallery = document.getElementById('product-gallery');
  if (!gallery || !gallery.contains(document.activeElement)) return;
  e.preventDefault();
  window.changeGalleryImage(e.key === 'ArrowLeft' ? -1 : 1);
});

const ICONS = {
  size: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
  material: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
  weight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5h10c0-2.76-2.24-5-5-5Z"></path><path d="M7 12H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2"></path><path d="M15 12h-6"></path></svg>',
  pencil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="m2 2 7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  vinted: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.028 6c0 7.695 -.292 11.728 0 12c2.046 -5 4.246 -12.642 5.252 -14.099c.343 -.497 .768 -.93 1.257 -1.277c.603 -.39 1.292 -.76 1.463 -.575c-.07 2.319 -4.023 15.822 -4.209 16.314a6.135 6.135 0 0 1 -3.465 3.386c-3.213 .78 -3.429 -.446 -3.836 -1.134c-.95 -2.103 -1.682 -14.26 -1.445 -15.615c.05 -.523 .143 -1.851 2.491 -2c2.359 -.354 2.547 1.404 2.492 3z"></path></svg>'
};

/**
 * Load and display product details
 */
async function loadProductDetail(productId) {
  const galleryContainer = document.getElementById('product-gallery');
  const detailsContainer = document.getElementById('product-details');

  if (!galleryContainer || !detailsContainer) return;

  try {
    const { getProductById, formatPrice, generateMailtoLink, getBasePath, shouldShowPrices, escapeHtml } = window.ProductsModule;
    const product = await getProductById(productId);
    const showPrices = await shouldShowPrices();

    // Check if product exists and is visible
    if (!product) {
      showError('Producto no encontrado');
      return;
    }

    // If product has hidden flag, treat it as not found
    if (product.hidden === true) {
      showError('Este producto no está disponible');
      return;
    }

    // Update page title
    document.title = `${product.name} - Oli3D Design`;

    // Render gallery with multi-photo support
    const basePath = getBasePath();
    galleryContainer.innerHTML = renderGallery(product, basePath);

    // Build price section HTML (only if showPrices is true)
    let priceSectionHTML = '';
    if (showPrices) {
      if (product.priceOnRequest) {
        priceSectionHTML = `
          <div class="product-price-section">
            <div class="product-price-main">Consultar precio</div>
            <p class="price-note">Este producto se realiza a medida o bajo presupuesto.</p>
          </div>
        `;
      } else {
        priceSectionHTML = `
          <div class="product-price-section">
            <div class="product-price-main">${formatPrice(product.price)}</div>
            ${product.priceOffers && product.priceOffers.length > 0 ? `
              <p class="price-note">Ofertas por cantidad:</p>
              <ul class="price-offers">
                ${product.priceOffers.map(offer => `
                  <li class="price-offer">
                    <span class="quantity">${escapeHtml(offer.label)}</span>
                    <span class="price">${formatPrice(offer.price)}/ud</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
    }

    // Render details
    detailsContainer.innerHTML = `
      <h1>${escapeHtml(product.name)}</h1>
      ${product.customizable ? `
        <div class="detail-badges">
          <span class="customizable-badge">${ICONS.pencil} ¡Personalizable!</span>
        </div>
      ` : ''}

      <dl class="spec-sheet product-meta">
        <div>
          <dt>${ICONS.size} Tamaño</dt>
          <dd>${escapeHtml(product.size || 'Tamaño estándar')}</dd>
        </div>
        <div>
          <dt>${ICONS.material} Material</dt>
          <dd>${escapeHtml(product.material || 'PLA')}</dd>
        </div>
        ${product.weight ? `
        <div>
          <dt>${ICONS.weight} Peso</dt>
          <dd>${product.weight} kg</dd>
        </div>
        ` : ''}
      </dl>

      ${priceSectionHTML}

      <div class="product-description">
        <p>${escapeHtml(product.description)}</p>
      </div>

      <div class="product-actions">
        <a href="${generateMailtoLink(product, 1, '', showPrices)}" class="btn btn-primary btn-lg">
          ${ICONS.mail}
          ${showPrices ? 'Consultar Precio' : 'Contactar'}
        </a>
        ${product.wallapopLink ? `
          <a href="${escapeHtml(product.wallapopLink)}" target="_blank" rel="noopener" class="btn btn-wallapop">
            <img src="resources/wallapop-logo.svg" alt="" class="marketplace-logo">
            Ver en Wallapop
          </a>
        ` : ''}
        ${product.vintedLink ? `
          <a href="${escapeHtml(product.vintedLink)}" target="_blank" rel="noopener" class="btn btn-vinted">
            ${ICONS.vinted}
            Ver en Vinted
          </a>
        ` : ''}
      </div>
      <p class="action-hint">Se abrirá tu correo con la consulta ya escrita. Cuéntanos cantidad, colores o cualquier personalización.</p>
    `;

    // Store categories for related products
    detailsContainer.dataset.categories = JSON.stringify(product.categories);

  } catch (error) {
    console.error('Error loading product:', error);
    showError('Error al cargar el producto');
  }
}

/**
 * Load and display related products
 */
async function loadRelatedProducts(currentProductId) {
  const container = document.getElementById('related-products');
  const relatedSection = document.getElementById('related-section');
  const detailsContainer = document.getElementById('product-details');

  if (!container || !detailsContainer) return;

  try {
    const { loadProducts, renderProductCard } = window.ProductsModule;
    const categories = JSON.parse(detailsContainer.dataset.categories || '[]');
    const allProducts = await loadProducts();

    // Filter products that share at least one category, excluding current product
    const related = allProducts
      .filter(p => p.id !== currentProductId && p.categories.some(c => categories.includes(c)))
      .slice(0, 4);

    if (related.length === 0) {
      if (relatedSection) relatedSection.style.display = 'none';
      return;
    }

    if (relatedSection) relatedSection.style.display = 'block';

    container.innerHTML = '';
    for (const product of related) {
      const card = await renderProductCard(product);
      container.appendChild(card);
    }

  } catch (error) {
    console.error('Error loading related products:', error);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const gallery = document.getElementById('product-gallery');
  const details = document.getElementById('product-details');
  const grid = document.querySelector('.product-detail-grid');
  const art = window.ProductsModule ? window.ProductsModule.STATE_ART.spaghetti : '';

  if (gallery) gallery.innerHTML = '';
  if (grid) grid.classList.add('is-error');
  if (details) {
    details.innerHTML = `
      <div class="empty-state">
        ${art}
        <h1>${message}</h1>
        <p>Puede que el enlace esté incompleto o que el producto ya no esté a la venta. En el catálogo tienes todo lo disponible.</p>
        <a href="shop.html" class="btn btn-primary mt-lg">Ver todos los productos</a>
      </div>
    `;
  }
}
