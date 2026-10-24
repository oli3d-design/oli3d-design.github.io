/**
 * Oli3D Design - Home Page Module
 * Handles home page specific functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    initHeroVideo();
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

const ARROW_ICON = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6"></path>
    </svg>`;

/**
 * Hero timelapse: the 28 MB video is never preloaded. It only starts after the page
 * has loaded, and not at all for reduced-motion or data-saver users (they keep the poster).
 * Includes a pause/play control and pauses itself while off-screen.
 */
function initHeroVideo() {
    const video = document.querySelector('.hero-video');
    const toggle = document.querySelector('.video-toggle');
    if (!video) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduceMotion || saveData) return;

    let userPaused = false;

    const setPausedUI = (paused) => {
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.setAttribute('aria-label', paused ? 'Reproducir vídeo' : 'Pausar vídeo');
    };

    const tryPlay = () => {
        const playPromise = video.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(() => setPausedUI(true));
        }
    };

    if (toggle) {
        toggle.addEventListener('click', () => {
            if (video.paused) {
                userPaused = false;
                tryPlay();
            } else {
                userPaused = true;
                video.pause();
            }
        });
    }

    video.addEventListener('play', () => setPausedUI(false));
    video.addEventListener('pause', () => setPausedUI(true));

    const start = () => {
        video.preload = 'auto';
        if (toggle) toggle.hidden = false;
        tryPlay();

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (userPaused) return;
                    if (entry.isIntersecting) {
                        tryPlay();
                    } else {
                        video.pause();
                    }
                });
            }, { threshold: 0.15 });
            observer.observe(video);
        }
    };

    if (document.readyState === 'complete') {
        start();
    } else {
        window.addEventListener('load', start, { once: true });
    }
}

/**
 * Load and display highlighted products
 */
async function loadHighlightedProducts() {
    const container = document.getElementById('highlighted-products');
    if (!container) return;

    const { showLoading, getHighlightedProducts, renderProductCard } = window.ProductsModule;

    showLoading(container, 'Cargando productos…');

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
        container.innerHTML = '<p class="inline-error">No se han podido cargar los productos destacados. Recarga la página o visita el catálogo.</p>';
    }
}

/**
 * Load and display latest products
 */
async function loadLatestProducts() {
    const container = document.getElementById('latest-products');
    if (!container) return;

    const { showLoading, getLatestProducts, renderProductCard } = window.ProductsModule;

    showLoading(container, 'Cargando productos…');

    try {
        const products = await getLatestProducts(4);
        container.innerHTML = '';

        for (const product of products) {
            const card = await renderProductCard(product);
            container.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading latest products:', error);
        container.innerHTML = '<p class="inline-error">No se han podido cargar las novedades. Recarga la página o visita el catálogo.</p>';
    }
}

/**
 * Load and display popular categories
 */
async function loadPopularCategories() {
    const container = document.getElementById('popular-categories');
    if (!container) return;

    const { getPopularCategories, escapeHtml } = window.ProductsModule;

    try {
        const categories = await getPopularCategories();
        container.innerHTML = '';

        categories.forEach(category => {
            const card = document.createElement('a');
            card.href = `shop.html?category=${category.id}`;
            card.className = 'cat-tile';

            // Images are decorative: the category name labels the link
            const images = (category.images && category.images.length > 0)
                ? category.images
                : ['resources/LOGO_SIN_FONDO.png'];

            const imagesHtml = images.map(img =>
                `<img src="${escapeHtml(img)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='resources/LOGO_SIN_FONDO.png'">`
            ).join('');

            card.innerHTML = `
                <div class="cat-tile-media">${imagesHtml}</div>
                <div class="cat-tile-label">
                    <span class="cat-tile-name">${escapeHtml(category.name)}</span>
                    <span class="cat-tile-go" aria-hidden="true">${ARROW_ICON}</span>
                </div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = '<p class="inline-error">No se han podido cargar las categorías. Puedes verlas todas en el catálogo.</p>';
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
        const { loadCategories, getProductsByCategory, escapeHtml } = window.ProductsModule;
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
            <div>
                <span class="seasonal-tag"><span aria-hidden="true">${seasonalCategory.icon}</span> Temporada</span>
                <h2>${escapeHtml(seasonalCategory.name)}</h2>
                <p>${description}</p>
                <a href="shop.html?category=${seasonalCategory.id}" class="btn btn-sky btn-lg">Ver colección</a>
            </div>
            <div class="seasonal-showcase">
                ${productImages.map(img => `
                    <img src="${escapeHtml(img)}" alt="" loading="lazy" decoding="async">
                `).join('')}
            </div>
        `;

        // Show the section
        section.style.display = 'block';

    } catch (error) {
        console.error('Error loading seasonal banner:', error);
    }
}
