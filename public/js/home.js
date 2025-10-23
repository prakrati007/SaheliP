/**
 * Homepage interactions
 * Search validation, category tracking, smooth scroll
 */

(function () {
  'use strict';

  // Search form validation
  const searchForm = document.querySelector('.search-bar form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      const searchInput = this.querySelector('input[name="search"]');
      const cityInput = this.querySelector('input[name="city"]');

      // Trim whitespace
      if (searchInput) {
        searchInput.value = searchInput.value.trim();
      }
      if (cityInput) {
        cityInput.value = cityInput.value.trim();
      }

      // Allow form submission even with empty query
      // (will show all services with optional city filter)
    });
  }

  // Category card click tracking (optional analytics)
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', function () {
      const categoryName = this.querySelector('h3')?.textContent;
      if (categoryName) {
        console.log('Category clicked:', categoryName);
        // You can send analytics here
      }
    });
  });

  // Featured services carousel (optional enhancement)
  const featuredGrid = document.querySelector('.featured-services .services-grid');
  if (featuredGrid && featuredGrid.children.length > 3) {
    // Optional: Add carousel navigation if more than 3 services
    // This is a placeholder for future enhancement
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href !== '#!') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Search input focus effect
  const searchInput = document.querySelector('.search-bar input[name="search"]');
  if (searchInput) {
    searchInput.addEventListener('focus', function () {
      this.parentElement.classList.add('focused');
    });

    searchInput.addEventListener('blur', function () {
      this.parentElement.classList.remove('focused');
    });
  }

  // Lazy loading for service images
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Add hover effect class to service cards
  const serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-8px)';
    });

    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
    });
  });

  console.log('Homepage initialized');
})();
