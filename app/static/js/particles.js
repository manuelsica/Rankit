// Enhanced Particle System
class EnhancedParticleSystem {
  constructor() {
    this.particles = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseMoving = false;
    this.mouseTimeout = null;
    
    this.init();
    this.bindEvents();
    this.animate();
  }
  
  init() {
    // Create interactive particles
    this.createInteractiveParticles();
    
    // Add mouse tracking
    this.setupMouseTracking();
  }
  
  createInteractiveParticles() {
    const particleContainer = document.querySelector('.floating-particles');
    if (!particleContainer) return;
    
    // Create additional interactive particles
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle interactive-particle';
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 6 + 2}px;
        height: ${Math.random() * 6 + 2}px;
        background: radial-gradient(circle, rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 255, 0.8) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
        left: ${Math.random() * 100}%;
        animation: interactiveFloat ${15 + Math.random() * 10}s infinite ease-in-out;
        animation-delay: ${Math.random() * -10}s;
      `;
      
      particleContainer.appendChild(particle);
      this.particles.push({
        element: particle,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    // Add CSS animation for interactive particles
    this.addInteractiveParticleStyles();
  }
  
  addInteractiveParticleStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes interactiveFloat {
        0% { 
          transform: translateY(100vh) translateX(0) rotate(0deg) scale(0.8);
          opacity: 0;
        }
        5% {
          opacity: 0.6;
        }
        25% {
          transform: translateY(75vh) translateX(${Math.random() * 40 - 20}px) rotate(90deg) scale(1);
        }
        50% {
          transform: translateY(50vh) translateX(${Math.random() * 60 - 30}px) rotate(180deg) scale(1.1);
          opacity: 0.8;
        }
        75% {
          transform: translateY(25vh) translateX(${Math.random() * 40 - 20}px) rotate(270deg) scale(0.9);
        }
        95% {
          opacity: 0.4;
        }
        100% { 
          transform: translateY(-50px) translateX(${Math.random() * 80 - 40}px) rotate(360deg) scale(0.6);
          opacity: 0;
        }
      }
      
      .interactive-particle:hover {
        animation-play-state: paused;
        transform: scale(1.5) !important;
        opacity: 1 !important;
        transition: all 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
  
  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.isMouseMoving = true;
      
      // Create mouse trail particles
      this.createMouseTrail(e.clientX, e.clientY);
      
      // Clear timeout
      clearTimeout(this.mouseTimeout);
      this.mouseTimeout = setTimeout(() => {
        this.isMouseMoving = false;
      }, 100);
    });
  }
  
  createMouseTrail(x, y) {
    // Limit trail particle creation
    if (Math.random() > 0.3) return;
    
    const trail = document.createElement('div');
    trail.className = 'mouse-trail-particle';
    trail.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 4px;
      height: 4px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: trailFade 1s ease-out forwards;
    `;
    
    document.body.appendChild(trail);
    
    // Remove after animation
    setTimeout(() => {
      trail.remove();
    }, 1000);
  }
  
  animate() {
    // Update interactive particles based on mouse position
    this.particles.forEach((particle, index) => {
      if (this.isMouseMoving) {
        const dx = this.mouseX - particle.x;
        const dy = this.mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const force = (150 - distance) / 150;
          particle.vx += (dx / distance) * force * 0.01;
          particle.vy += (dy / distance) * force * 0.01;
        }
      }
      
      // Apply velocity
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Boundary check
      if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -0.8;
      if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -0.8;
      
      // Friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;
      
      // Update position
      if (particle.element) {
        particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
      }
    });
    
    requestAnimationFrame(() => this.animate());
  }
  
  bindEvents() {
    // Add scroll-based particle effects
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      document.body.classList.add('scrolling');
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 200);
    });
    
    // Add resize handling
    window.addEventListener('resize', () => {
      this.particles.forEach(particle => {
        particle.x = Math.min(particle.x, window.innerWidth);
        particle.y = Math.min(particle.y, window.innerHeight);
      });
    });
  }
}

// Add trail particle animation
const trailStyle = document.createElement('style');
trailStyle.textContent = `
  @keyframes trailFade {
    0% {
      opacity: 0.8;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  
  .scrolling .floating-particles .particle {
    animation-duration: 12s !important;
  }
  
  .scrolling .animated-bg .bg-orb {
    animation-duration: 15s !important;
  }
`;
document.head.appendChild(trailStyle);

// Initialize enhanced particle system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedParticleSystem();
});

// Add particle interaction on search focus
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('input[name="q"]');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      document.body.classList.add('search-focused');
    });

    searchInput.addEventListener('blur', () => {
      document.body.classList.remove('search-focused');
    });
  }
});

// Add search focus effects
const searchFocusStyle = document.createElement('style');
searchFocusStyle.textContent = `
  .search-focused .floating-particles .particle {
    animation-duration: 12s !important;
    opacity: 0.8 !important;
  }
  
  .search-focused .animated-bg .bg-orb {
    animation-duration: 18s !important;
    opacity: 0.6 !important;
  }
`;
document.head.appendChild(searchFocusStyle);
