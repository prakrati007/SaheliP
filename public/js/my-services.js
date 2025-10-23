// My Services client-side logic
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    initToggleHandlers();
    initDeleteHandlers();
    initFilterSort();
  });

  // 1. Toggle Status Handlers
  function initToggleHandlers() {
    const toggleButtons = document.querySelectorAll('[data-action="toggle-status"]');
    
    toggleButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const serviceId = this.dataset.serviceId;
        const card = this.closest('.service-card');
        const badge = card ? card.querySelector('.badge-status') : null;
        
        // Disable button during request
        this.disabled = true;
        const originalText = this.textContent;
        this.textContent = 'Processing...';
        
        fetch(`/services/${serviceId}/toggle`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          if (data.success) {
            // Update badge
            if (badge) {
              badge.className = 'badge-status ' + (data.isPaused ? 'badge-status-paused' : 'badge-status-active');
              badge.textContent = data.isPaused ? 'Paused' : 'Active';
            }
            
            // Update button text
            btn.textContent = data.isPaused ? 'Activate' : 'Pause';
            btn.disabled = false;
            
            // Show success message
            showMessage(data.message || 'Status updated successfully', 'success');
          } else {
            btn.textContent = originalText;
            btn.disabled = false;
            showMessage(data.message || 'Failed to toggle status', 'error');
          }
        })
        .catch(function(error) {
          console.error('Error toggling status:', error);
          btn.textContent = originalText;
          btn.disabled = false;
          showMessage('Failed to toggle status. Please try again.', 'error');
        });
      });
    });
  }

  // 2. Delete Handlers
  function initDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('[data-action="delete-service"]');
    
    deleteButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const serviceId = this.dataset.serviceId;
        const serviceTitle = this.dataset.serviceTitle || 'this service';
        
        if (!confirm(`Are you sure you want to delete "${serviceTitle}"? This action cannot be undone.`)) {
          return;
        }
        
        // Disable button
        this.disabled = true;
        this.textContent = 'Deleting...';
        
        // Create and submit a form for DELETE request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/services/${serviceId}?_method=DELETE`;
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
      });
    });
  }

  // 3. Filter and Sort (Optional enhancement)
  function initFilterSort() {
    const filterSelect = document.getElementById('filterStatus');
    const sortSelect = document.getElementById('sortBy');
    const serviceCards = document.querySelectorAll('.service-card');
    
    if (!serviceCards.length) return;
    
    // Filter by status
    if (filterSelect) {
      filterSelect.addEventListener('change', function() {
        const filterValue = this.value;
        
        serviceCards.forEach(function(card) {
          const badge = card.querySelector('.badge-status');
          if (!badge) return;
          
          const isActive = badge.classList.contains('badge-status-active');
          const isPaused = badge.classList.contains('badge-status-paused');
          
          if (filterValue === 'all') {
            card.style.display = '';
          } else if (filterValue === 'active' && isActive) {
            card.style.display = '';
          } else if (filterValue === 'paused' && isPaused) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }
    
    // Sort services
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        const sortValue = this.value;
        const container = document.querySelector('.services-grid');
        if (!container) return;
        
        const cardsArray = Array.from(serviceCards);
        
        cardsArray.sort(function(a, b) {
          if (sortValue === 'title') {
            const titleA = a.querySelector('.service-title').textContent.toLowerCase();
            const titleB = b.querySelector('.service-title').textContent.toLowerCase();
            return titleA.localeCompare(titleB);
          } else if (sortValue === 'price') {
            const priceA = parseFloat(a.dataset.price) || 0;
            const priceB = parseFloat(b.dataset.price) || 0;
            return priceA - priceB;
          } else if (sortValue === 'date') {
            const dateA = new Date(a.dataset.created);
            const dateB = new Date(b.dataset.created);
            return dateB - dateA; // Newest first
          }
          return 0;
        });
        
        // Re-append in sorted order
        cardsArray.forEach(function(card) {
          container.appendChild(card);
        });
      });
    }
  }

  // Helper: Show message to user
  function showMessage(message, type) {
    // Check if there's an existing alert
    let alert = document.querySelector('.alert-message');
    
    if (!alert) {
      alert = document.createElement('div');
      alert.className = 'alert-message';
      document.body.appendChild(alert);
    }
    
    alert.className = 'alert-message alert-' + type;
    alert.textContent = message;
    alert.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(function() {
      alert.style.display = 'none';
    }, 3000);
  }

})();
