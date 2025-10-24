// My Services client-side logic - Modern UI
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    initToggleHandlers();
    initDeleteHandlers();
    initFilterSort();
  });

  // 1. Toggle Status Handlers (Active/Pause)
  function initToggleHandlers() {
    const toggleButtons = document.querySelectorAll('.toggle-status-btn');
    
    toggleButtons.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const serviceId = this.dataset.id;
        const card = this.closest('.my-service-card-modern');
        
        if (!serviceId || !card) return;
        
        // Disable button during request
        this.disabled = true;
        const originalHTML = this.innerHTML;
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Processing...
        `;
        
        fetch(`/services/${serviceId}/toggle`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(function(data) {
          if (data.success) {
            // Update card status
            card.dataset.status = data.isPaused ? 'paused' : 'active';
            
            // Update status badge
            const statusBadge = card.querySelector('.card-status-badge-modern');
            if (statusBadge) {
              statusBadge.className = 'card-status-badge-modern ' + (data.isPaused ? 'status-paused' : 'status-active');
              statusBadge.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  ${data.isPaused ? 
                    '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>' :
                    '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>'
                  }
                </svg>
                ${data.isPaused ? 'Paused' : 'Active'}
              `;
            }
            
            // Update button
            btn.dataset.status = data.isPaused ? 'paused' : 'active';
            btn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${data.isPaused ? 
                  '<polygon points="5 3 19 12 5 21 5 3"></polygon>' :
                  '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'
                }
              </svg>
              ${data.isPaused ? 'Activate' : 'Pause'}
            `;
            btn.disabled = false;
            
            // Show success message
            showNotification(data.message || 'Status updated successfully', 'success');
          } else {
            throw new Error(data.message || 'Failed to toggle status');
          }
        })
        .catch(function(error) {
          console.error('Error toggling status:', error);
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          showNotification(error.message || 'Failed to toggle status. Please try again.', 'error');
        });
      });
    });
  }

  // 2. Delete Handlers
  function initDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('.delete-service-btn');
    
    deleteButtons.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const serviceId = this.dataset.id;
        const card = this.closest('.my-service-card-modern');
        const serviceTitle = card ? card.querySelector('.card-title-modern')?.textContent : 'this service';
        
        if (!confirm(`Are you sure you want to delete "${serviceTitle}"?\n\nThis action cannot be undone.`)) {
          return;
        }
        
        // Disable button
        this.disabled = true;
        const originalHTML = this.innerHTML;
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
          </svg>
          Deleting...
        `;
        
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

  // 3. Filter and Sort
  function initFilterSort() {
    const filterButtons = document.querySelectorAll('.filter-btn-modern');
    const sortSelect = document.getElementById('sortSelect');
    const servicesGrid = document.getElementById('servicesGrid');
    
    if (!servicesGrid) return;
    
    // Filter by status
    filterButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const filterValue = this.dataset.filter;
        
        // Update active button
        filterButtons.forEach(function(b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        
        // Filter cards
        const cards = servicesGrid.querySelectorAll('.my-service-card-modern');
        cards.forEach(function(card) {
          const status = card.dataset.status;
          
          if (filterValue === 'all') {
            card.style.display = '';
          } else if (filterValue === status) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
    
    // Sort services
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        const sortValue = this.value;
        const cards = Array.from(servicesGrid.querySelectorAll('.my-service-card-modern'));
        
        cards.sort(function(a, b) {
          const titleA = a.querySelector('.card-title-modern')?.textContent.toLowerCase() || '';
          const titleB = b.querySelector('.card-title-modern')?.textContent.toLowerCase() || '';
          const viewsA = parseInt(a.querySelector('.card-info-item-modern span')?.textContent) || 0;
          const viewsB = parseInt(b.querySelector('.card-info-item-modern span')?.textContent) || 0;
          
          switch(sortValue) {
            case 'titleAZ':
              return titleA.localeCompare(titleB);
            case 'mostViewed':
              return viewsB - viewsA;
            case 'oldest':
              return 1; // Keep original order for oldest
            case 'newest':
            default:
              return -1; // Reverse for newest
          }
        });
        
        // Re-append in sorted order
        cards.forEach(function(card) {
          servicesGrid.appendChild(card);
        });
      });
    }
  }

  // Helper: Show notification to user
  function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast-modern');
    if (existing) {
      existing.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'notification-toast-modern notification-' + type;
    notification.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'success' ? 
          '<polyline points="20 6 9 17 4 12"></polyline>' :
          '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
        }
      </svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(function() {
      notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 3 seconds
    setTimeout(function() {
      notification.classList.remove('show');
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Add spin animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .notification-toast-modern {
      position: fixed;
      top: 2rem;
      right: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transform: translateX(400px);
      transition: transform 0.3s ease;
    }
    
    .notification-toast-modern.show {
      transform: translateX(0);
    }
    
    .notification-toast-modern svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .notification-success {
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
      color: #ffffff;
    }
    
    .notification-error {
      background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
      color: #ffffff;
    }
    
    @media (max-width: 768px) {
      .notification-toast-modern {
        left: 1rem;
        right: 1rem;
        top: 1rem;
        transform: translateY(-200px);
      }
      
      .notification-toast-modern.show {
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

})();
