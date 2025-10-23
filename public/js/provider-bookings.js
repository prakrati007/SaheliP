// Provider Bookings Management Script

let currentFilter = 'all';
let bookings = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupFilterTabs();
  loadBookings();
});

// Setup filter tab listeners
function setupFilterTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update filter and reload
      currentFilter = tab.dataset.status;
      renderBookings();
    });
  });
}

// Load bookings from API
async function loadBookings() {
  const listContainer = document.getElementById('bookingsList');
  listContainer.innerHTML = '<div class="loading-indicator">Loading bookings...</div>';
  
  try {
    const response = await fetch('/booking/provider/list');
    if (!response.ok) throw new Error('Failed to load bookings');
    
    const data = await response.json();
    bookings = data.bookings || [];
    renderBookings();
  } catch (error) {
    console.error('Error loading bookings:', error);
    listContainer.innerHTML = `<div class="error-message">Failed to load bookings. Please try again.</div>`;
  }
}

// Render bookings based on current filter
function renderBookings() {
  const listContainer = document.getElementById('bookingsList');
  const emptyState = document.getElementById('emptyState');
  
  // Filter bookings
  let filtered = bookings;
  if (currentFilter !== 'all') {
    filtered = bookings.filter(b => b.status === currentFilter);
  }
  
  if (filtered.length === 0) {
    listContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  listContainer.style.display = 'block';
  emptyState.style.display = 'none';
  
  // Render booking cards
  listContainer.innerHTML = filtered.map(booking => createBookingCard(booking)).join('');
  
  // Attach event listeners
  attachActionListeners();
}

// Create booking card HTML
function createBookingCard(booking) {
  const bookingDate = new Date(booking.date);
  const formattedDate = bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const bookingId = booking._id.slice(-8).toUpperCase();
  
  const statusClass = {
    'Confirmed': 'status-confirmed',
    'InProgress': 'status-in-progress',
    'Completed': 'status-completed',
    'Cancelled': 'status-cancelled',
    'Pending': 'status-pending'
  }[booking.status] || 'status-default';
  
  const actions = getAvailableActions(booking);
  
  return `
    <div class="booking-card" data-booking-id="${booking._id}">
      <div class="booking-header">
        <div class="booking-id">#${bookingId}</div>
        <div class="booking-status ${statusClass}">${booking.status}</div>
      </div>
      
      <div class="booking-content">
        <div class="booking-service">
          <h3>${escapeHtml(booking.serviceId.title)}</h3>
          <p class="service-category">${escapeHtml(booking.serviceId.category)}</p>
        </div>
        
        <div class="booking-customer">
          <strong>Customer:</strong> ${escapeHtml(booking.customerId.name)}
          <br><small>${escapeHtml(booking.customerId.email)}</small>
        </div>
        
        <div class="booking-details">
          <div class="detail-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
            </svg>
            <span>${formattedDate}</span>
          </div>
          <div class="detail-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
            </svg>
            <span>${booking.startTime} - ${booking.endTime}</span>
          </div>
          ${booking.address ? `
          <div class="detail-item">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            <span>${escapeHtml(booking.address)}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="booking-payment">
          <div class="payment-row">
            <span>Total:</span>
            <span class="amount">₹${booking.totalAmount.toFixed(2)}</span>
          </div>
          <div class="payment-row">
            <span>Advance Paid:</span>
            <span class="amount amount-paid">₹${booking.advancePaid.toFixed(2)}</span>
          </div>
          ${booking.remainingAmount > 0 ? `
          <div class="payment-row">
            <span>Remaining:</span>
            <span class="amount amount-remaining">₹${booking.remainingAmount.toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      ${actions.length > 0 ? `
      <div class="booking-actions">
        ${actions.map(action => `
          <button class="btn btn-${action.type}" data-action="${action.action}" data-booking-id="${booking._id}">
            ${action.label}
          </button>
        `).join('')}
      </div>
      ` : ''}
    </div>
  `;
}

// Determine available actions based on booking status
function getAvailableActions(booking) {
  const actions = [];
  
  if (booking.status === 'Confirmed') {
    actions.push({ action: 'start', label: 'Start Service', type: 'primary' });
    actions.push({ action: 'cancel', label: 'Cancel', type: 'danger' });
  }
  
  if (booking.status === 'InProgress') {
    actions.push({ action: 'complete', label: 'Mark Complete', type: 'success' });
  }
  
  // View details always available
  actions.push({ action: 'view', label: 'View Details', type: 'secondary' });
  
  return actions;
}

// Attach event listeners to action buttons
function attachActionListeners() {
  const actionButtons = document.querySelectorAll('.booking-actions button');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', handleAction);
  });
}

// Handle booking action
async function handleAction(event) {
  const button = event.target;
  const action = button.dataset.action;
  const bookingId = button.dataset.bookingId;
  
  if (action === 'view') {
    window.location.href = `/booking/${bookingId}`;
    return;
  }
  
  // Show confirmation modal
  showActionModal(action, bookingId);
}

// Show action confirmation modal
function showActionModal(action, bookingId) {
  const modal = document.getElementById('actionModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const confirmBtn = document.getElementById('confirmBtn');
  
  const actionConfig = {
    start: {
      title: 'Start Service',
      body: 'Are you sure you want to mark this service as started? The customer will be notified.',
      confirmLabel: 'Start Service',
      confirmClass: 'btn-primary'
    },
    complete: {
      title: 'Complete Service',
      body: 'Are you sure the service is complete? This will trigger remaining payment collection.',
      confirmLabel: 'Mark Complete',
      confirmClass: 'btn-success'
    },
    cancel: {
      title: 'Cancel Booking',
      body: `
        <p>Are you sure you want to cancel this booking? The customer will receive a full refund.</p>
        <textarea id="cancelReason" class="form-control" placeholder="Reason for cancellation (optional)" rows="3"></textarea>
      `,
      confirmLabel: 'Cancel Booking',
      confirmClass: 'btn-danger'
    }
  };
  
  const config = actionConfig[action];
  if (!config) return;
  
  modalTitle.textContent = config.title;
  modalBody.innerHTML = config.body;
  confirmBtn.textContent = config.confirmLabel;
  confirmBtn.className = `btn ${config.confirmClass}`;
  
  // Show modal
  modal.style.display = 'block';
  
  // Remove old listeners and add new one
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', async () => {
    await executeAction(action, bookingId);
    hideActionModal();
  });
  
  // Close modal handlers
  document.getElementById('cancelBtn').onclick = hideActionModal;
  document.querySelector('.close-modal').onclick = hideActionModal;
  window.onclick = (e) => {
    if (e.target === modal) hideActionModal();
  };
}

// Hide action modal
function hideActionModal() {
  document.getElementById('actionModal').style.display = 'none';
}

// Execute booking action via API
async function executeAction(action, bookingId) {
  try {
    const endpoints = {
      start: `/booking/${bookingId}/start`,
      complete: `/booking/${bookingId}/complete`,
      cancel: `/booking/${bookingId}/provider-cancel`
    };
    
    const endpoint = endpoints[action];
    if (!endpoint) return;
    
    const body = {};
    if (action === 'cancel') {
      const reason = document.getElementById('cancelReason')?.value;
      body.reason = reason;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Action failed');
    }
    
    // Show success message
    showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`, 'success');
    
    // Reload bookings
    await loadBookings();
  } catch (error) {
    console.error('Action error:', error);
    showToast(error.message || 'Failed to perform action', 'error');
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
