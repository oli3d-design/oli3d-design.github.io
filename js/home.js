/**
 * Oli3D Design - Home Page Module
 * Handles home page specific functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
});

async function initHomePage() {
    await Promise.all([
        loadHighlightedProducts(),
        loadLatestProducts(),
        loadPopularCategories()
    ]);
}

/**
 * Load and display highlighted products
 */
async function loadHighlightedProducts() {
    const container = document.getElementById('highlighted-products');
    if (!container) return;

    const { showLoading, getHighlightedProducts, renderProductCard } = window.ProductsModule;

    showLoading(container);

    try {
        const products = await getHighlightedProducts();
        container.innerHTML = '';

        // Show max 4 highlighted products on home
        products.slice(0, 4).forEach(product => {
            container.appendChild(renderProductCard(product));
        });
    } catch (error) {
        console.error('Error loading highlighted products:', error);
        container.innerHTML = '<p class="text-center">Error al cargar productos destacados</p>';
    }
}

/**
 * Load and display latest products
 */
async function loadLatestProducts() {
    const container = document.getElementById('latest-products');
    if (!container) return;

    const { showLoading, getLatestProducts, renderProductCard } = window.ProductsModule;

    showLoading(container);

    try {
        const products = await getLatestProducts(4);
        container.innerHTML = '';

        products.forEach(product => {
            container.appendChild(renderProductCard(product));
        });
    } catch (error) {
        console.error('Error loading latest products:', error);
        container.innerHTML = '<p class="text-center">Error al cargar últimos productos</p>';
    }
}

/**
 * Load and display popular categories
 */
async function loadPopularCategories() {
    const container = document.getElementById('popular-categories');
    if (!container) return;

    const { getPopularCategories, renderCategoryCard } = window.ProductsModule;

    try {
        const categories = await getPopularCategories();
        container.innerHTML = '';

        categories.forEach(category => {
            const card = renderCategoryCard(category, (cat) => {
                // Navigate to shop with category filter
                window.location.href = `shop.html?category=${cat.id}`;
            });
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}
