/**
 * Oli3D Design - Home Page Module
 * Handles home page specific functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
});

async function initHomePage() {
    await Promise.all([
        loadSeasonalBanner(),
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

/**
 * Load and display seasonal banner (only if a seasonal category is visible)
 */
async function loadSeasonalBanner() {
    const section = document.getElementById('seasonal-banner-section');
    const banner = document.getElementById('seasonal-banner');
    if (!section || !banner) return;

    try {
        const { loadCategories, getProductsByCategory } = window.ProductsModule;
        const categories = await loadCategories();

        // Find first visible seasonal category
        const seasonalCategory = categories.find(c => c.seasonal && !c.hidden);

        if (!seasonalCategory) {
            // No visible seasonal category, keep banner hidden
            return;
        }

        // Get products from this category for images
        const products = await getProductsByCategory(seasonalCategory.id);
        const productImages = products.slice(0, 3).map(p => p.image);

        // Seasonal descriptions map
        const descriptions = {
            'christmas': 'Descubre nuestra colección navideña de figuras y decoración para regalar.',
            'halloween': 'Decora tu hogar con nuestras espeluznantes creaciones de Halloween.',
            'default': `Explora nuestra nueva colección de ${seasonalCategory.name.toLowerCase()}.`
        };
        const description = descriptions[seasonalCategory.id] || descriptions.default;

        // Render the banner
        banner.innerHTML = `
            <div class="featured-banner-bg"></div>
            <div class="featured-banner-content">
                <span class="seasonal-tag">${seasonalCategory.icon} Temporada</span>
                <h3>${seasonalCategory.name}</h3>
                <p>${description}</p>
                <a href="shop.html?category=${seasonalCategory.id}" class="btn btn-primary btn-glow">Ver Colección</a>
            </div>
            <div class="featured-banner-showcase">
                ${productImages.map((img, i) => `
                    <div class="showcase-item" style="animation-delay: ${i * 0.1}s">
                        <img src="${img}" alt="Producto" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;

        // Show the section
        section.style.display = 'block';

    } catch (error) {
        console.error('Error loading seasonal banner:', error);
    }
}
