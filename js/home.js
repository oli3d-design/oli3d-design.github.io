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
        for (const product of products.slice(0, 4)) {
            const card = await renderProductCard(product);
            container.appendChild(card);
        }
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

        for (const product of products) {
            const card = await renderProductCard(product);
            container.appendChild(card);
        }
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
            const card = document.createElement('a');
            card.href = `shop.html?category=${category.id}`;
            card.className = 'category-image-card';

            let imagesHtml = '';

            if (!category.images || category.images.length <= 1) {
                // Single image
                const imgSrc = (category.images && category.images[0]) || 'resources/LOGO_SIN_FONDO.png';
                imagesHtml = `<img src="${imgSrc}" alt="${category.name}" loading="lazy" class="category-single-img">`;
            } else {
                // Collage (2 or 4 images)
                const count = category.images.length;
                const gridClass = count === 2 ? 'grid-2' : 'grid-4';

                imagesHtml = `<div class="category-collage ${gridClass}">`;
                category.images.forEach((img, index) => {
                    imagesHtml += `<img src="${img}" alt="${category.name} ${index + 1}" loading="lazy">`;
                });
                imagesHtml += `</div>`;
            }

            card.innerHTML = `
                ${imagesHtml}
                <div class="category-image-overlay">
                    <span>${category.name}</span>
                </div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = '<p class="text-center">Error al cargar categorías</p>';
    }
}
