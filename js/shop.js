/**
 * Oli3D Design - Shop Page Module
 * Handles shop page: search, filtering, sorting, pagination
 */

// State
let selectedCategories = ['all'];
let currentSort = 'newest';
let currentPage = 1;
let currentSearch = '';
let allProducts = [];
let allCategories = [];
const PRODUCTS_PER_PAGE = 12;

document.addEventListener('DOMContentLoaded', () => {
    initShopPage();
});

async function initShopPage() {
    try {
        // Check for category in URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlCategory = urlParams.get('category');
        if (urlCategory) {
            selectedCategories = [urlCategory];
        }

        await loadCategoryFilters();
        initSearchHandler();
        initSortHandler();
        initClearFilters();
        await loadProducts();
    } catch (error) {
        console.error('Error initializing shop page:', error);
    }
}

/**
 * Load and display category filters
 */
async function loadCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    try {
        const { getAllCategories, loadProducts: loadAllProducts } = window.ProductsModule;
        allCategories = await getAllCategories();
        allProducts = await loadAllProducts();

        container.innerHTML = '';

        // Count products per category
        const categoryCounts = {};
        allCategories.forEach(cat => {
            if (cat.id === 'all') {
                categoryCounts[cat.id] = allProducts.length;
            } else {
                categoryCounts[cat.id] = allProducts.filter(p => p.categories.includes(cat.id)).length;
            }
        });

        allCategories.forEach(category => {
            const isActive = selectedCategories.includes('all')
                ? category.id === 'all'
                : selectedCategories.includes(category.id);

            const btn = document.createElement('button');
            btn.className = `category-item ${isActive ? 'active' : ''}`;
            btn.setAttribute('data-category', category.id);

            btn.innerHTML = `
        <span class="check-icon">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
        <span>${category.name}</span>
        <span class="category-count">${categoryCounts[category.id] || 0}</span>
      `;

            btn.addEventListener('click', () => handleCategoryClick(category.id));
            container.appendChild(btn);
        });

        updateClearFiltersVisibility();
    } catch (error) {
        console.error('Error loading category filters:', error);
        container.innerHTML = '<p style="color: var(--gray-500); font-size: 13px; padding: 8px;">Error cargando categorías</p>';
    }
}

/**
 * Handle category click
 */
function handleCategoryClick(categoryId) {
    if (categoryId === 'all') {
        selectedCategories = ['all'];
    } else {
        // Remove 'all' if selecting specific category
        selectedCategories = selectedCategories.filter(c => c !== 'all');

        // Toggle this category
        if (selectedCategories.includes(categoryId)) {
            selectedCategories = selectedCategories.filter(c => c !== categoryId);
            if (selectedCategories.length === 0) {
                selectedCategories = ['all'];
            }
        } else {
            selectedCategories.push(categoryId);
        }
    }

    updateCategoryUI();
    updateClearFiltersVisibility();
    currentPage = 1;
    loadProducts();
}

/**
 * Update category button states
 */
function updateCategoryUI() {
    document.querySelectorAll('.category-item').forEach(btn => {
        const catId = btn.getAttribute('data-category');
        const isActive = selectedCategories.includes('all')
            ? catId === 'all'
            : selectedCategories.includes(catId);
        btn.classList.toggle('active', isActive);
    });
}

/**
 * Update clear filters button visibility
 */
function updateClearFiltersVisibility() {
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.style.display = selectedCategories.includes('all') ? 'none' : 'block';
    }
}

/**
 * Initialize clear filters button
 */
function initClearFilters() {
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selectedCategories = ['all'];
            updateCategoryUI();
            updateClearFiltersVisibility();
            currentPage = 1;
            loadProducts();
        });
    }
}

/**
 * Initialize search input handler
 */
function initSearchHandler() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 1;
            loadProducts();
        }, 300);
    });
}

/**
 * Initialize sort dropdown handler
 */
function initSortHandler() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        loadProducts();
    });
}

/**
 * Load and display products with current filters
 */
async function loadProducts() {
    const container = document.getElementById('products-grid');
    const countEl = document.getElementById('products-count');
    if (!container) return;

    container.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
        const {
            loadProducts: loadProductsData,
            sortProducts,
            paginateProducts,
            renderProductCard
        } = window.ProductsModule;

        let products = allProducts.length > 0 ? allProducts : await loadProductsData();

        // Filter by selected categories
        if (!selectedCategories.includes('all')) {
            products = products.filter(p =>
                p.categories.some(cat => selectedCategories.includes(cat))
            );
        }

        // Filter by search term
        if (currentSearch) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(currentSearch) ||
                p.description.toLowerCase().includes(currentSearch)
            );
        }

        // Sort products
        products = sortProducts(products, currentSort);

        // Paginate
        const paginated = paginateProducts(products, currentPage, PRODUCTS_PER_PAGE);

        // Update count
        if (countEl) {
            countEl.textContent = `${paginated.totalItems} producto${paginated.totalItems !== 1 ? 's' : ''}`;
        }

        container.innerHTML = '';

        if (paginated.items.length === 0) {
            container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📦</div>
          <p>No se encontraron productos</p>
        </div>
      `;
            hidePagination();
            return;
        }

        for (const product of paginated.items) {
            const card = await renderProductCard(product);
            container.appendChild(card);
        }

        renderPagination(paginated);

    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <p>Error al cargar productos</p>
      </div>
    `;
    }
}

/**
 * Render pagination controls
 */
function renderPagination(paginated) {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (paginated.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '←';
    prevBtn.disabled = !paginated.hasPrev;
    prevBtn.addEventListener('click', () => {
        if (paginated.hasPrev) {
            currentPage--;
            loadProducts();
            scrollToTop();
        }
    });
    container.appendChild(prevBtn);

    for (let i = 1; i <= paginated.totalPages; i++) {
        if (paginated.totalPages > 7) {
            if (i > 3 && i < paginated.totalPages - 2 && Math.abs(i - paginated.currentPage) > 1) {
                if (i === 4 || i === paginated.totalPages - 3) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'page-btn';
                    ellipsis.textContent = '...';
                    ellipsis.style.cursor = 'default';
                    container.appendChild(ellipsis);
                }
                continue;
            }
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === paginated.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            loadProducts();
            scrollToTop();
        });
        container.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '→';
    nextBtn.disabled = !paginated.hasNext;
    nextBtn.addEventListener('click', () => {
        if (paginated.hasNext) {
            currentPage++;
            loadProducts();
            scrollToTop();
        }
    });
    container.appendChild(nextBtn);
}

function hidePagination() {
    const container = document.getElementById('pagination');
    if (container) container.innerHTML = '';
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
