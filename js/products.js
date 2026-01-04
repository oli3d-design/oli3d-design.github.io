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
  return categories.filter(c => c.popular && c.id !== 'all');
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
 * Render a product card (preview version for shop grid)
 */
async function renderProductCard(product, showPrice = null) {
  // If showPrice not explicitly set, check settings
  if (showPrice === null) {
    showPrice = await shouldShowPrices();
  }

  const card = document.createElement('article');
  card.className = 'card product-card';
  card.setAttribute('data-product-id', product.id);

  card.innerHTML = `
    <div class="product-badges">
      ${product.highlighted ? '<span class="product-badge">Destacado</span>' : ''}
      ${product.customizable ? '<span class="product-badge badge-customizable">Personalizable</span>' : ''}
    </div>
    <div class="product-image">
      <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='resources/LOGO_SIN_FONDO.png'">
    </div>
    <div class="product-info">
      <h3 class="product-name">${product.name}</h3>
      ${showPrice ? `<p class="product-price">${formatPrice(product.price)}</p>` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `product.html?id=${product.id}`;
  });

  return card;
}

/**
 * Render a category card
 */
function renderCategoryCard(category, onClick) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.setAttribute('data-category-id', category.id);

  card.innerHTML = `
    <span class="category-icon">${category.icon}</span>
    <span class="category-name">${category.name}</span>
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
${showPrices ? `Precio: ${formatPrice(product.price)}
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
 * Show loading spinner
 */
function showLoading(container) {
  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmptyState(container, message = 'No se encontraron productos') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <p>${message}</p>
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
  getBasePath
};

