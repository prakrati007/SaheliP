/**
 * Search page interactions
 * Filter management, star rating selector, mobile filter toggle
 */

(function () {
  'use strict';

  // Mobile filter toggle
  const filterPanel = document.querySelector('.filters-sidebar');
  const resultsSection = document.querySelector('.search-results');

  // Create mobile filter toggle button
  if (window.innerWidth <= 768 && filterPanel) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-secondary filter-toggle-btn';
    toggleBtn.textContent = 'Filters';
    toggleBtn.style.cssText = 'width: 100%; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;';
    
    const icon = document.createElement('span');
    icon.textContent = '▼';
    icon.style.transition = 'transform 0.3s ease';
    toggleBtn.appendChild(icon);

    filterPanel.parentElement.insertBefore(toggleBtn, filterPanel);

    // Initially hide filters on mobile
    filterPanel.style.display = 'none';

    toggleBtn.addEventListener('click', function () {
      const isVisible = filterPanel.style.display !== 'none';
      filterPanel.style.display = isVisible ? 'none' : 'block';
      icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  }

  // Star rating selector - click handlers for stars
  const ratingStars = document.querySelectorAll('#ratingFilter .star');
  const ratingInput = document.getElementById('ratingInput');
  
  ratingStars.forEach(star => {
    star.addEventListener('click', function () {
      const rating = this.getAttribute('data-rating');
      
      // Set hidden input value
      if (ratingInput) {
        ratingInput.value = rating;
      }
      
      // Toggle active class on stars
      ratingStars.forEach((s, index) => {
        if (index < parseInt(rating)) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });

  // Price range inputs
  const minPriceInput = document.querySelector('input[name="priceMin"]');
  const maxPriceInput = document.querySelector('input[name="priceMax"]');

  if (minPriceInput && maxPriceInput) {
    function validatePriceRange() {
      const minPrice = parseFloat(minPriceInput.value) || 0;
      const maxPrice = parseFloat(maxPriceInput.value) || 0;

      if (maxPrice > 0 && minPrice > maxPrice) {
        maxPriceInput.setCustomValidity('Max price must be greater than min price');
      } else {
        maxPriceInput.setCustomValidity('');
      }
    }

    minPriceInput.addEventListener('input', validatePriceRange);
    maxPriceInput.addEventListener('input', validatePriceRange);
  }

  // Date picker validation (no past dates)
  const dateInput = document.querySelector('input[name="availableDate"]');
  if (dateInput) {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    dateInput.addEventListener('change', function () {
      const selectedDate = new Date(this.value);
      const todayDate = new Date(today);

      if (selectedDate < todayDate) {
        alert('Please select a future date');
        this.value = '';
      }
    });
  }

  // Clear filters functionality
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    const clearLink = document.querySelector('.clear-filters-link');
    if (clearLink) {
      clearLink.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = '/services';
      });
    }
  }

  // Sort select enhancement
  const sortSelect = document.querySelector('select[name="sort"]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      // Auto-submit form when sort changes
      this.form.submit();
    });
  }

  // Active filter badges
  function createActiveFilterBadges() {
    const urlParams = new URLSearchParams(window.location.search);
    const activeFilters = [];

    const filterMappings = {
      search: 'Search',
      category: 'Category',
      city: 'City',
      priceMin: 'Min Price',
      priceMax: 'Max Price',
      rating: 'Rating',
      availableDate: 'Date'
    };

    for (const [key, label] of Object.entries(filterMappings)) {
      const value = urlParams.get(key);
      if (value) {
        activeFilters.push({ key, label, value });
      }
    }

    if (activeFilters.length > 0 && resultsSection) {
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'active-filters-badges';
      badgesContainer.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;';

      activeFilters.forEach(filter => {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.cssText = 'background: var(--light-pink); color: var(--secondary-blush); padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;';
        
        const text = document.createElement('span');
        text.textContent = `${filter.label}: ${filter.value}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'background: none; border: none; color: var(--secondary-blush); font-size: 1.25rem; cursor: pointer; padding: 0; line-height: 1;';
        removeBtn.addEventListener('click', function () {
          urlParams.delete(filter.key);
          window.location.href = `/services?${urlParams.toString()}`;
        });

        badge.appendChild(text);
        badge.appendChild(removeBtn);
        badgesContainer.appendChild(badge);
      });

      // Insert before results header
      const resultsHeader = resultsSection.querySelector('h2, .results-grid');
      if (resultsHeader) {
        resultsHeader.parentElement.insertBefore(badgesContainer, resultsHeader);
      }
    }
  }

  createActiveFilterBadges();

  // Query parameter helpers for pagination (preserve filters)
  window.getSearchParams = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key, value] of urlParams.entries()) {
      if (key !== 'page') {
        params[key] = value;
      }
    }
    
    return params;
  };

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

  // Smooth scroll to results after filter change
  if (window.location.search && resultsSection) {
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  console.log('Search page initialized');
})();
