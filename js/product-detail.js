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
  const images = getProductImages(product);

  if (images.length === 0) {
    return `<img src="${basePath}resources/LOGO_SIN_FONDO.png" alt="${product.name}">`;
  }

  if (images.length === 1) {
    // Single image - simple display
    return `
      <img src="${basePath}${images[0]}" alt="${product.name}" 
           onerror="this.src='${basePath}resources/LOGO_SIN_FONDO.png'">
    `;
  }

  // Multiple images - gallery with thumbnails
  return `
    <div class="gallery-main">
      <button class="gallery-arrow prev" onclick="changeGalleryImage(-1)" aria-label="Anterior">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <img id="gallery-main-image" src="${basePath}${images[0]}" alt="${product.name}" 
           onerror="this.src='${basePath}resources/LOGO_SIN_FONDO.png'">

      <button class="gallery-arrow next" onclick="changeGalleryImage(1)" aria-label="Siguiente">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
    <div class="gallery-thumbnails">
      ${images.map((img, index) => `
        <div class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
             data-image="${basePath}${img}" 
             onclick="selectGalleryImage(this)">
          <img src="${basePath}${img}" alt="${product.name} - ${index + 1}"
               onerror="this.src='${basePath}resources/LOGO_SIN_FONDO.png'">
        </div>
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

  // Update main image
  mainImage.src = thumbnail.dataset.image;

  // Update active state
  document.querySelectorAll('.gallery-thumbnail').forEach(t => t.classList.remove('active'));
  thumbnail.classList.add('active');
};

/**
 * Load and display product details
 */
async function loadProductDetail(productId) {
  const galleryContainer = document.getElementById('product-gallery');
  const detailsContainer = document.getElementById('product-details');

  if (!galleryContainer || !detailsContainer) return;

  try {
    const { getProductById, formatPrice, generateMailtoLink, getBasePath, shouldShowPrices } = window.ProductsModule;
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
      priceSectionHTML = `
        <div class="product-price-section">
          <div class="product-price-main">${formatPrice(product.price)}</div>
          ${product.priceOffers && product.priceOffers.length > 0 ? `
            <p style="margin: 0; font-size: 13px; color: var(--gray-500);">Ofertas por cantidad:</p>
            <div class="price-offers">
              ${product.priceOffers.map(offer => `
                <div class="price-offer">
                  <span class="quantity">${offer.label}</span>
                  <span class="price">${formatPrice(offer.price)}/ud</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Render details
    detailsContainer.innerHTML = `
      <h1>${product.name}</h1>
      
      <div class="product-meta">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          ${product.size || 'Tamaño estándar'}
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          ${product.material || 'PLA'}
        </span>
      </div>
      
      ${priceSectionHTML}
      
      <div class="product-description">
        <p>${product.description}</p>
      </div>
      
      <div class="product-actions">
        <a href="${generateMailtoLink(product, 1, '', showPrices)}" class="btn btn-primary btn-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          ${showPrices ? 'Consultar Precio' : 'Contactar'}
        </a>
        ${product.wallapopLink ? `
          <a href="${product.wallapopLink}" target="_blank" rel="noopener" class="btn btn-secondary">
            <img src="resources/wallapop-logo.svg" alt="Wallapop" style="width: 18px; height: 18px;">
            Ver en Wallapop
          </a>
        ` : ''}
      </div>
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

  if (gallery) gallery.innerHTML = '';
  if (details) {
    details.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--gray-400);">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p>${message}</p>
        <a href="shop.html" class="btn btn-primary mt-lg">Ver todos los productos</a>
      </div>
    `;
  }
}
