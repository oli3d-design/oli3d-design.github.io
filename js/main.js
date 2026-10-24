/**
 * Oli3D Design - Main Module
 * Common functionality: navigation, footer, utilities
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFooter();
    setActiveNavLink();
});

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Mobile menu toggle
    if (navToggle && navMenu) {
        const setMenuOpen = (open) => {
            navToggle.classList.toggle('open', open);
            navMenu.classList.toggle('open', open);
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        };

        navToggle.addEventListener('click', () => {
            setMenuOpen(!navMenu.classList.contains('open'));
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => setMenuOpen(false));
        });

        // Close with Escape and return focus to the toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('open')) {
                setMenuOpen(false);
                navToggle.focus();
            }
        });
    }

    // Navbar scroll effect
    if (navbar) {
        const onScroll = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
}

/**
 * Set active navigation link based on current page
 */
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * Initialize footer with dynamic content
 */
function initFooter() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    const currentYear = new Date().getFullYear();
    const footerBottom = footer.querySelector('.footer-bottom');

    if (footerBottom) {
        footerBottom.innerHTML = `
      <p>&copy; ${currentYear} Oli3D Design. Todos los derechos reservados.</p>
      <p>Hecho con <span role="img" aria-label="cariño">❤️</span> y mucha impresión 3D en España</p>
    `;
    }
}

/**
 * Smooth scroll to element
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Debounce function for performance
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Get URL parameter
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set URL parameter without reload
 */
function setUrlParam(param, value) {
    const url = new URL(window.location);
    if (value) {
        url.searchParams.set(param, value);
    } else {
        url.searchParams.delete(param);
    }
    window.history.pushState({}, '', url);
}

// Export utilities
window.MainUtils = {
    scrollToElement,
    debounce,
    getUrlParam,
    setUrlParam
};
