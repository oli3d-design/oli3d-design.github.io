// Datos de ejemplo para el portfolio
const portfolioItems = [
    {
        id: 1,
        title: "Figura Personalizada de Mascota",
        description: "Una figura única de tu mascota favorita, diseñada con todos los detalles que la hacen especial.",
        tags: ["regalo", "figura", "personalizado"],
        image: null, // Se usará placeholder
        link: "https://wallapop.com/item/ejemplo1"
    },
    {
        id: 2,
        title: "Porta Llaves Decorativo",
        description: "Organizador de llaves moderno y funcional, perfecto para mantener el orden en casa.",
        tags: ["decoracion", "utilidad"],
        image: null,
        link: "mailto:contacto@oli3d.com?subject=Consulta sobre Porta Llaves"
    },
    {
        id: 3,
        title: "Lámpara 3D Personalizada",
        description: "Iluminación única con diseño personalizado, creando ambientes acogedores y modernos.",
        tags: ["decoracion", "regalo"],
        image: null,
        link: "https://wallapop.com/item/ejemplo3"
    },
    {
        id: 4,
        title: "Soporte para Auriculares",
        description: "Mantén tus auriculares organizados con este elegante soporte diseñado especialmente para ti.",
        tags: ["utilidad", "organizacion"],
        image: null,
        link: "mailto:contacto@oli3d.com?subject=Consulta sobre Soporte para Auriculares"
    },
    {
        id: 5,
        title: "Figura de Personaje",
        description: "Recreación detallada de tu personaje favorito, perfecta para coleccionistas y fans.",
        tags: ["figura", "regalo"],
        image: null,
        link: "https://wallapop.com/item/ejemplo5"
    },
    {
        id: 6,
        title: "Macetero Moderno",
        description: "Diseño contemporáneo para tus plantas, combinando funcionalidad y estética.",
        tags: ["decoracion", "utilidad"],
        image: null,
        link: "mailto:contacto@oli3d.com?subject=Consulta sobre Macetero"
    },
    {
        id: 7,
        title: "Juguete Personalizado",
        description: "Juguetes únicos diseñados especialmente para los más pequeños de la casa.",
        tags: ["regalo", "figura"],
        image: null,
        link: "https://wallapop.com/item/ejemplo7"
    },
    {
        id: 8,
        title: "Organizador de Escritorio",
        description: "Mantén tu espacio de trabajo ordenado con este práctico organizador personalizado.",
        tags: ["utilidad", "organizacion"],
        image: null,
        link: "mailto:contacto@oli3d.com?subject=Consulta sobre Organizador"
    },
    {
        id: 9,
        title: "Escultura Decorativa",
        description: "Pieza artística única que añade personalidad a cualquier espacio.",
        tags: ["decoracion", "figura"],
        image: null,
        link: "https://wallapop.com/item/ejemplo9"
    },
    {
        id: 10,
        title: "Pala Padel",
        description: "Pieza artística única que añade personalidad a cualquier espacio.",
        tags: ["decoracion", "figura"],
        image: null,
        link: "https://wallapop.com/item/ejemplo9"
    }
];

// Iconos SVG para placeholders
const placeholderIcons = [
    '<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#60CAF4"/><path d="M50 30L70 50L50 70L30 50L50 30Z" fill="white"/></svg>',
    '<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#006FB3"/><circle cx="50" cy="50" r="20" fill="white"/></svg>',
    '<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#064270"/><rect x="30" y="30" width="40" height="40" fill="white"/></svg>'
];

// Estado de filtros
let currentFilter = 'all';
let searchQuery = '';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    renderPortfolio();
    setupFilters();
    setupSearch();
    setupModal();
});

// Navegación móvil
function initializeNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
}

// Renderizar portfolio
function renderPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    const filteredItems = getFilteredItems();
    
    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-light);">
                <p style="font-size: 1.2rem;">No se encontraron proyectos que coincidan con tu búsqueda.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredItems.map(item => {
        const gradients = [
            'linear-gradient(135deg, #60CAF4 0%, #006FB3 100%)',
            'linear-gradient(135deg, #006FB3 0%, #064270 100%)',
            'linear-gradient(135deg, #064270 0%, #8692A2 100%)'
        ];
        const gradientIndex = (item.id - 1) % gradients.length;
        const emojis = ['📦', '🎁', '✨', '🏠', '🎨', '💡', '🔧', '🌟', '🎯'];
        const emojiIndex = (item.id - 1) % emojis.length;
        
        return `
            <div class="portfolio-item" data-id="${item.id}">
                <div class="portfolio-item-image" style="background: ${gradients[gradientIndex]};">
                    <div class="placeholder-icon">${emojis[emojiIndex]}</div>
                </div>
                <div class="portfolio-item-info">
                    <h3 class="portfolio-item-title">${item.title}</h3>
                    <p class="portfolio-item-description">${item.description}</p>
                    <div class="portfolio-item-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Agregar event listeners a los items
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const itemId = parseInt(item.dataset.id);
            openModal(itemId);
        });
    });
}

// Obtener items filtrados
function getFilteredItems() {
    return portfolioItems.filter(item => {
        // Filtro por categoría
        const matchesFilter = currentFilter === 'all' || item.tags.includes(currentFilter);
        
        // Filtro por búsqueda
        const matchesSearch = !searchQuery || 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesFilter && matchesSearch;
    });
}

// Configurar filtros
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            filterButtons.forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter;
            renderPortfolio();
        });
    });
}

// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderPortfolio();
        });
    }
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('project-modal');
    const closeBtn = document.querySelector('.modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeModal();
        }
    });
}

// Abrir modal
function openModal(itemId) {
    const item = portfolioItems.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.getElementById('project-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalTags = document.getElementById('modal-tags');
    const modalLink = document.getElementById('modal-link');
    
    if (!modal) return;
    
    // Configurar contenido
    const gradients = [
        'linear-gradient(135deg, #60CAF4 0%, #006FB3 100%)',
        'linear-gradient(135deg, #006FB3 0%, #064270 100%)',
        'linear-gradient(135deg, #064270 0%, #8692A2 100%)'
    ];
    const emojis = ['📦', '🎁', '✨', '🏠', '🎨', '💡', '🔧', '🌟', '🎯'];
    const gradientIndex = (item.id - 1) % gradients.length;
    const emojiIndex = (item.id - 1) % emojis.length;
    
    if (modalImage) {
        // Crear placeholder visual
        modalImage.style.background = gradients[gradientIndex];
        modalImage.innerHTML = `<div style="opacity: 0.9;">${emojis[emojiIndex]}</div>`;
        modalImage.setAttribute('aria-label', item.title);
    }
    
    if (modalTitle) modalTitle.textContent = item.title;
    if (modalDescription) modalDescription.textContent = item.description;
    
    if (modalTags) {
        modalTags.innerHTML = item.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    }
    
    if (modalLink) {
        modalLink.href = item.link;
        if (item.link.startsWith('mailto:')) {
            modalLink.textContent = 'Contactar por Email';
        } else {
            modalLink.textContent = 'Ver en Wallapop';
        }
    }
    
    // Mostrar modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Smooth scroll para navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

