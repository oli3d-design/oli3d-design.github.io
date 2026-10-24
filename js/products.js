/**
 * Oli3D Design - Products Module
 * Handles loading and rendering products from JSON database
 */

// Cache for loaded data
let productsCache = null;
let categoriesCache = null;
let settingsCache = null;

/**
 * Load settings from JSON database
 */
async function loadSettings() {
  if (settingsCache) return settingsCache;

  try {
    const cacheBuster = '?v=' + Date.now();
    const response = await fetch(getBasePath() + 'db/settings.json' + cacheBuster);
    if (!response.ok) throw new Error('Failed to load settings');
    settingsCache = await response.json();
    return settingsCache;
  } catch (error) {
    console.error('Error loading settings:', error);
    // Return default settings if file doesn't exist
    return { showPrices: true };
  }
}

/**
 * Check if prices should be shown
 */
async function shouldShowPrices() {
  const settings = await loadSettings();
  return settings.showPrices !== false;
}

// Determine base path for JSON files (works both locally and on GitHub Pages)
function getBasePath() {
  const path = window.location.pathname;
  // If we're in a subdirectory (like product.html?id=x), go back to root
  if (path.includes('.html')) {
    return './';
  }
  return './';
}

/**
 * Load categories from JSON database (raw, including hidden)
 */
async function loadCategoriesRaw() {
  if (categoriesCache) return categoriesCache;

  try {
    // Add cache-busting to ensure we get the latest data
    const cacheBuster = '?v=' + Date.now();
    const response = await fetch(getBasePath() + 'db/categories.json' + cacheBuster);
    if (!response.ok) throw new Error('Failed to load categories');
    const data = await response.json();
    categoriesCache = data.categories;
    return categoriesCache;
  } catch (error) {
    console.error('Error loading categories:', error);
    return [];
  }
}

/**
 * Load categories from JSON database (only visible ones)
 */
async function loadCategories() {
  const categories = await loadCategoriesRaw();
  return categories.filter(c => !c.hidden);
}

/**
 * Get IDs of hidden categories
 */
async function getHiddenCategoryIds() {
  const categories = await loadCategoriesRaw();
  return categories.filter(c => c.hidden).map(c => c.id);
}

/**
 * Load products from JSON database (raw, including hidden)
 */
async function loadProductsRaw() {
  if (productsCache) return productsCache;

  try {
    // Add cache-busting to ensure we get the latest data
    const cacheBuster = '?v=' + Date.now();
    const response = await fetch(getBasePath() + 'db/products.json' + cacheBuster);
    if (!response.ok) throw new Error('Failed to load products');
    const data = await response.json();
    productsCache = data.products;
    return productsCache;
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

/**
 * Check if a product should be visible
 * A product is hidden if:
 * - product.hidden === true
 * - ALL of the product's categories are hidden
 */
async function isProductVisible(product, hiddenCategoryIds) {
  // If product is explicitly hidden, hide it
  if (product.hidden === true) {
    return false;
  }

  // If product has no categories, show it
  if (!product.categories || product.categories.length === 0) {
    return true;
  }

  // Check if ALL categories are hidden
  const allCategoriesHidden = product.categories.every(catId =>
    hiddenCategoryIds.includes(catId)
  );

  // If all categories are hidden, hide the product
  // If at least one category is visible, show the product
  return !allCategoriesHidden;
}

/**
 * Load products from JSON database (only visible ones)
 */
async function loadProducts() {
  const products = await loadProductsRaw();
  const hiddenCategoryIds = await getHiddenCategoryIds();

  const visibleProducts = [];
  for (const product of products) {
    if (await isProductVisible(product, hiddenCategoryIds)) {
      visibleProducts.push(product);
    }
  }

  return visibleProducts;
}

/**
 * Get a single product by ID
 */
async function getProductById(productId) {
  const products = await loadProducts();
  return products.find(p => p.id === productId) || null;
}

/**
 * Get products by category
 */
async function getProductsByCategory(categoryId) {
  const products = await loadProducts();
  if (categoryId === 'all') return products;
  return products.filter(p => p.categories.includes(categoryId));
}

/**
 * Get highlighted products
 */
async function getHighlightedProducts() {
  const products = await loadProducts();
  return products.filter(p => p.highlighted);
}

/**
 * Get latest products (sorted by createdAt)
 */
async function getLatestProducts(count = 8) {
  const products = await loadProducts();
  return [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, count);
}

/**
 * Get popular categories
 */
async function getPopularCategories() {
  const categories = await loadCategories();
  const popularCategories = categories.filter(c => c.popular && c.id !== 'all');

  // Pre-fetch products for all categories to sort by scarcity
  const categoriesWithProducts = [];
  for (const category of popularCategories) {
    const products = await getProductsByCategory(category.id);
    categoriesWithProducts.push({ category, products });
  }

  // Sort by product count (ascending) to prioritize categories with fewer options
  categoriesWithProducts.sort((a, b) => a.products.length - b.products.length);

  const usedImages = new Set();
  const resultCategories = [];

  for (const item of categoriesWithProducts) {
    const { category, products } = item;

    // Filter out products with already used images
    const availableProducts = products.filter(p => !usedImages.has(p.image));

    let images = [];
    if (availableProducts.length > 0) {
      // Prioritize highlighted products first
      const highlighted = availableProducts.filter(p => p.highlighted);
      const regular = availableProducts.filter(p => !p.highlighted);

      const sortedProducts = [...highlighted, ...regular];

      // Take up to 2 images (simplify collage)
      images = sortedProducts.slice(0, 2).map(p => p.image);

      // Mark as used
      images.forEach(img => usedImages.add(img));
    }

    // Handle fallback if 0
    if (images.length === 0) {
      images = ['resources/LOGO_SIN_FONDO.png'];
    }

    category.images = images;
    resultCategories.push(category);
  }

  // Restore original popular categories order (by ID)
  // This ensures the UI order matches the Admin Panel order
  return popularCategories.map(c =>
    resultCategories.find(res => res.id === c.id) || c
  );
}

/**
 * Get all categories (excluding 'all' for display, keeping for filtering)
 */
async function getAllCategories() {
  const categories = await loadCategories();
  return categories;
}

/**
 * Sort products by different criteria
 */
function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * Paginate products
 */
function paginateProducts(products, page = 1, perPage = 8) {
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;

  return {
    items: products.slice(startIndex, endIndex),
    currentPage: page,
    totalPages: Math.ceil(products.length / perPage),
    totalItems: products.length,
    hasNext: endIndex < products.length,
    hasPrev: page > 1
  };
}

/**
 * Format price with currency
 */
function formatPrice(price) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
}

/**
 * Escape text for safe use inside HTML attributes and content
 */
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a product card (preview version for shop grid)
 * The whole card is a real link so it works with keyboard, middle-click and screen readers.
 */
async function renderProductCard(product, showPrice = null) {
  // If showPrice not explicitly set, check settings
  if (showPrice === null) {
    showPrice = await shouldShowPrices();
  }

  const card = document.createElement('article');
  card.className = 'product-card';
  card.setAttribute('data-product-id', product.id);

  const badges = [
    product.highlighted ? '<span class="product-badge">Destacado</span>' : '',
    product.customizable ? '<span class="product-badge badge-customizable">Personalizable</span>' : ''
  ].join('');

  card.innerHTML = `
    <a class="product-link" href="product.html?id=${encodeURIComponent(product.id)}">
      <div class="product-image">
        ${badges ? `<div class="product-badges">${badges}</div>` : ''}
        <img src="${escapeHtml(product.image)}" alt="" width="600" height="600" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='resources/LOGO_SIN_FONDO.png'">
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        ${showPrice ? `<p class="product-price">${product.priceOnRequest ? '<span class="product-price-request">Consultar / A medida</span>' : formatPrice(product.price)}</p>` : ''}
      </div>
    </a>
  `;

  return card;
}

/**
 * Render a category card
 */
function renderCategoryCard(category, onClick) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'category-card';
  card.setAttribute('data-category-id', category.id);

  card.innerHTML = `
    <span class="category-icon" aria-hidden="true">${category.icon}</span>
    <span class="category-name">${escapeHtml(category.name)}</span>
  `;

  if (onClick) {
    card.addEventListener('click', () => onClick(category));
  }

  return card;
}

/**
 * Generate mailto link for product inquiry
 */
function generateMailtoLink(product, quantity = 1, customMessage = '', showPrices = true) {
  const email = 'oli3d.design@gmail.com';
  const subject = encodeURIComponent(`Consulta sobre: ${product.name}`);

  let body = `¡Hola Oli3D Design!

Me interesa el siguiente producto:

Producto: ${product.name}
${showPrices ? `Precio: ${product.priceOnRequest ? 'A consultar / A medida' : formatPrice(product.price)}
` : ''}Tamaño: ${product.size}
Cantidad: ${quantity}

`;

  if (showPrices && product.priceOffers && product.priceOffers.length > 0) {
    body += `Ofertas disponibles:
`;
    product.priceOffers.forEach(offer => {
      body += `   - ${offer.label}: ${formatPrice(offer.price)}/ud
`;
    });
    body += `
`;
  }

  if (customMessage) {
    body += `Mensaje adicional:
${customMessage}

`;
  }

  body += `¡Gracias!`;

  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

/**
 * Illustrations for empty and error states
 * - emptyBed: a clean build plate with the nozzle waiting (nothing to show)
 * - spaghetti: the classic failed print (something went wrong / not found)
 */
const STATE_ART = {
  emptyBed: `
    <svg class="empty-state-art" viewBox="0 0 260 150" aria-hidden="true" focusable="false">
      <rect x="96" y="8" width="68" height="34" rx="8" fill="#0A3F6E"></rect>
      <path d="M122 42h16l-4 14h-8z" fill="#1A6FB3"></path>
      <path d="M130 62v44" stroke="#5CC6F3" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"></path>
      <rect x="30" y="112" width="200" height="12" rx="6" fill="#8792A2"></rect>
      <rect x="44" y="124" width="172" height="8" rx="4" fill="#0A3F6E"></rect>
    </svg>`,
  spaghetti: `
    <svg class="empty-state-art" viewBox="0 0 260 150" aria-hidden="true" focusable="false">
      <rect x="150" y="6" width="68" height="34" rx="8" fill="#0A3F6E" transform="rotate(8 184 23)"></rect>
      <path d="M170 44h16l-4 14h-8z" fill="#1A6FB3" transform="rotate(8 184 23)"></path>
      <path d="M176 60c-10 18 18 22 4 36s-42-6-46 10 30 16 14 26-58-4-64-18 22-26 6-34-34 10-28 24 34 18 46 8" fill="none" stroke="#5CC6F3" stroke-width="4" stroke-linecap="round"></path>
      <path d="M150 74c-20-6-30 14-14 20s10 22-8 18" fill="none" stroke="#1A6FB3" stroke-width="3" stroke-linecap="round"></path>
      <rect x="30" y="126" width="200" height="12" rx="6" fill="#8792A2"></rect>
      <rect x="44" y="138" width="172" height="8" rx="4" fill="#0A3F6E"></rect>
    </svg>`
};

/**
 * Show loading indicator (layers stacking on the bed)
 */
function showLoading(container, label = 'Cargando…') {
  container.innerHTML = `
    <div class="loading-container" role="status">
      <span class="loader-layers" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span>${label}</span>
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmptyState(container, message = 'No se encontraron productos', hint = '') {
  container.innerHTML = `
    <div class="empty-state">
      ${STATE_ART.emptyBed}
      <h3>${message}</h3>
      ${hint ? `<p>${hint}</p>` : ''}
    </div>
  `;
}

// Export functions for use in other modules
window.ProductsModule = {
  loadProducts,
  loadProductsRaw,
  loadCategories,
  loadCategoriesRaw,
  loadSettings,
  shouldShowPrices,
  getHiddenCategoryIds,
  isProductVisible,
  getProductById,
  getProductsByCategory,
  getHighlightedProducts,
  getLatestProducts,
  getPopularCategories,
  getAllCategories,
  sortProducts,
  paginateProducts,
  formatPrice,
  renderProductCard,
  renderCategoryCard,
  generateMailtoLink,
  showLoading,
  showEmptyState,
  escapeHtml,
  STATE_ART,
  getBasePath
};

