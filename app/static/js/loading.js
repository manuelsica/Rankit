// Enhanced Loading System
class LoadingManager {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
    this.isLoading = false;
    this.loadingTimeout = null;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.setupLoadingStates();
  }
  
  bindEvents() {
    // Search form submission
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        this.showLoading('Ricerca in corso...');
      });
    }
    
    // Pagination links
    const paginationLinks = document.querySelectorAll('.pagination-link');
    paginationLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        this.showLoading('Caricamento pagina...');
      });
    });
    
    // HTMX events for ranking updates
    document.addEventListener('htmx:beforeRequest', () => {
      this.showLoading('Aggiornamento ranking...');
    });
    
    document.addEventListener('htmx:afterRequest', () => {
      this.hideLoading();
    });
    
    // Page navigation
    const siteTitle = document.querySelector('.site-title a');
    if (siteTitle) {
      siteTitle.addEventListener('click', (e) => {
        if (window.location.pathname !== '/') {
          this.showLoading('Caricamento...');
        }
      });
    }
    
    // Handle browser back/forward - removed to prevent constant loading
  }

  setupLoadingStates() {
    // Add loading states for various actions
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        this.showMiniLoading();
      });
    });

    // Add loading state for dropdown
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    if (dropdownToggle) {
      dropdownToggle.addEventListener('click', () => {
        this.addDropdownLoadingEffect();
      });
    }
  }

  showLoading(text = 'Caricamento...') {
    if (this.isLoading) return;

    this.isLoading = true;
    const loadingText = this.overlay.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = text;
    }

    this.overlay.style.display = 'flex';
    this.overlay.classList.add('show');
    document.body.classList.add('loading');

    // Add enhanced particle effects during loading
    this.enhanceLoadingEffects();

    // Auto-hide after maximum time (fallback)
    this.loadingTimeout = setTimeout(() => {
      this.hideLoading();
    }, 10000);
  }

  hideLoading() {
    if (!this.isLoading) return;

    this.isLoading = false;
    this.overlay.classList.remove('show');
    document.body.classList.remove('loading');

    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 300);

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  showMiniLoading() {
    // Show subtle loading indicator for quick actions
    const miniLoader = this.createMiniLoader();
    document.body.appendChild(miniLoader);

    setTimeout(() => {
      miniLoader.remove();
    }, 800);
  }

  createMiniLoader() {
    const loader = document.createElement('div');
    loader.className = 'mini-loader';
    loader.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border: 3px solid rgba(59, 130, 246, 0.3);
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: miniSpin 1s linear infinite;
      z-index: 9998;
      pointer-events: none;
    `;
    return loader;
  }

  addDropdownLoadingEffect() {
    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
      dropdown.classList.add('loading-effect');
      setTimeout(() => {
        dropdown.classList.remove('loading-effect');
      }, 300);
    }
  }

  enhanceLoadingEffects() {
    // Add special loading class for enhanced effects
    document.body.classList.add('loading-enhanced');

    setTimeout(() => {
      document.body.classList.remove('loading-enhanced');
    }, 5000);
  }
}

// Add loading styles
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
  @keyframes miniSpin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  
  .loading {
    overflow: hidden;
  }
  
  .loading-enhanced .floating-particles .particle {
    animation-duration: 10s !important;
    opacity: 0.9 !important;
    filter: blur(1px);
  }
  
  .loading-enhanced .animated-bg .bg-orb {
    animation-duration: 15s !important;
    opacity: 0.4 !important;
    filter: blur(100px);
  }
  
  .loading-effect {
    position: relative;
    overflow: hidden;
  }
  
  .loading-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
    animation: loadingSweep 0.8s ease-out;
    pointer-events: none;
    z-index: 1;
  }
  
  @keyframes loadingSweep {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  
  /* Enhanced loading particles */
  .loading .loading-particles .loading-particle {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    animation-duration: 1s !important;
  }
  
  /* Smooth transitions for loading states */
  .search-input-wrapper,
  .dropdown-content,
  .card,
  .pagination-btn {
    transition: all 0.3s ease-out;
  }
  
  .loading .search-input-wrapper {
    filter: blur(2px);
    opacity: 0.7;
  }
  
  .loading .card {
    filter: blur(1px);
    opacity: 0.8;
  }
  
  /* Loading button states */
  .search-button.loading {
    position: relative;
    color: transparent;
  }
  
  .search-button.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: buttonSpin 1s linear infinite;
  }
  
  @keyframes buttonSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Pagination loading states */
  .pagination-btn.loading {
    opacity: 0.6;
    transform: scale(0.95);
    pointer-events: none;
  }
  
  /* Responsive loading adjustments */
  @media (max-width: 768px) {
    .loading-container {
      padding: 2rem;
      margin: 1rem;
    }
    
    .loading-particles {
      gap: 0.3rem;
    }
    
    .loading-particle {
      width: 8px;
      height: 8px;
    }
  }
`;
document.head.appendChild(loadingStyle);

// Initialize loading manager
document.addEventListener('DOMContentLoaded', () => {
  window.loadingManager = new LoadingManager();
});

// Enhanced form handling with loading states
document.addEventListener('DOMContentLoaded', () => {
  // Add loading states to form elements
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const submitButton = this.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.disabled = true;
      }
    });
  });

  // Add loading states to all links
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      // Skip external links and anchors
      if (this.hostname !== location.hostname || this.getAttribute('href').startsWith('#')) {
        return;
      }

      this.classList.add('loading');

      // Remove loading state after a delay (fallback)
      setTimeout(() => {
        this.classList.remove('loading');
      }, 3000);
    });
  });
});

// Add page transition effects
window.addEventListener('load', () => {
  document.body.classList.add('page-loaded');

  // Hide loading on page load
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('show');
  }
});

// Page load animation
const pageLoadStyle = document.createElement('style');
pageLoadStyle.textContent = `
  .page-loaded .main-content {
    animation: pageSlideIn 0.8s ease-out;
  }
  
  @keyframes pageSlideIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(pageLoadStyle);
