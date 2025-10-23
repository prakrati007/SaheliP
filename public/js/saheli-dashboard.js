/**
 * Saheli Dashboard JavaScript
 * Handles charts, transactions, and booking actions for providers
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  if (!document.querySelector('.dashboard-container[data-role="saheli"]')) {
    // Check if we're on the saheli dashboard by looking for specific elements
    const earningsChart = document.getElementById('earningsChart');
    if (earningsChart) {
      initEarningsChart();
    }
  }
  
  initTransactionTable();
  initBookingActions();
});

/**
 * Initialize Frappe Charts for earnings visualization
 */
function initEarningsChart() {
  try {
    const chartContainer = document.getElementById('earningsChart');
    if (!chartContainer) return;

    // Extract earnings data from data attribute
    const earningsData = JSON.parse(chartContainer.dataset.earnings || '[]');
    
    if (earningsData.length === 0) {
      chartContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No earnings data available yet.</p>';
      return;
    }

    // Transform data for Frappe Charts
    const labels = earningsData.map(d => d.month);
    const values = earningsData.map(d => d.earnings);

    // Create chart
    new frappe.Chart(chartContainer, {
      data: {
        labels: labels,
        datasets: [{
          name: 'Earnings',
          values: values
        }]
      },
      type: 'line',
      height: 280,
      colors: ['#F6A5C0'],
      axisOptions: {
        xAxisMode: 'tick',
        xIsSeries: true
      },
      lineOptions: {
        regionFill: 1,
        hideDots: 0,
        heatline: 0
      },
      tooltipOptions: {
        formatTooltipY: value => '₹' + formatCurrency(value)
      }
    });
  } catch (error) {
    console.error('Error initializing earnings chart:', error);
  }
}

/**
 * Initialize transaction table interactions
 */
function initTransactionTable() {
  const transactionRows = document.querySelectorAll('.transaction-row');
  
  transactionRows.forEach(row => {
    row.addEventListener('click', function() {
      const bookingId = this.dataset.bookingId;
      if (bookingId) {
        openBookingDetailModal(bookingId);
      }
    });
  });
}

/**
 * Initialize booking action buttons
 */
function initBookingActions() {
  // Event delegation is handled inline in the HTML
  // This function can be extended for additional setup
}

/**
 * Handle start booking action
 */
async function handleStartBooking(bookingId) {
  if (!confirm('Are you sure you want to start this service?')) {
    return;
  }

  try {
    const response = await fetch(`/booking/${bookingId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      showToast('Service started successfully!', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      showToast(data.message || 'Failed to start service', 'error');
    }
  } catch (error) {
    console.error('Error starting booking:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
}

/**
 * Handle complete booking action
 */
async function handleCompleteBooking(bookingId) {
  if (!confirm('Are you sure you want to mark this service as completed?')) {
    return;
  }

  try {
    const response = await fetch(`/booking/${bookingId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      showToast('Service completed successfully!', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      showToast(data.message || 'Failed to complete service', 'error');
    }
  } catch (error) {
    console.error('Error completing booking:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
}

/**
 * Open booking detail modal
 */
async function openBookingDetailModal(bookingId) {
  const modal = document.getElementById('bookingDetailModal');
  const loadingEl = modal.querySelector('.booking-detail-loading');
  const contentEl = document.getElementById('bookingDetailContent');
  
  // Show modal and loading state
  modal.style.display = 'block';
  loadingEl.style.display = 'block';
  contentEl.style.display = 'none';

  try {
    const response = await fetch(`/booking/${bookingId}`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success && data.booking) {
      populateBookingModal(data.booking, 'saheli');
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } else {
      showToast('Failed to load booking details', 'error');
      closeBookingDetailModal();
    }
  } catch (error) {
    console.error('Error fetching booking details:', error);
    showToast('An error occurred while loading booking details', 'error');
    closeBookingDetailModal();
  }
}

/**
 * Close booking detail modal
 */
function closeBookingDetailModal() {
  const modal = document.getElementById('bookingDetailModal');
  modal.style.display = 'none';
}

/**
 * Populate booking modal with data
 */
function populateBookingModal(booking, userRole) {
  // Booking reference
  document.getElementById('bookingId').textContent = booking._id.slice(-8).toUpperCase();
  document.getElementById('bookingStatus').innerHTML = `<span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span>`;
  document.getElementById('bookingPaymentStatus').innerHTML = `<span class="payment-badge payment-${booking.paymentStatus.toLowerCase()}">${booking.paymentStatus}</span>`;
  document.getElementById('bookingCreatedAt').textContent = new Date(booking.createdAt).toLocaleDateString('en-IN');

  // Service details
  document.getElementById('serviceName').textContent = booking.serviceId?.title || 'N/A';
  document.getElementById('serviceCategory').textContent = booking.serviceId?.category || 'N/A';
  document.getElementById('serviceType').textContent = booking.serviceType || 'N/A';
  document.getElementById('serviceDuration').textContent = `${booking.duration} hours`;

  // Schedule
  document.getElementById('bookingDate').textContent = new Date(booking.date).toLocaleDateString('en-IN');
  document.getElementById('bookingTime').textContent = `${booking.startTime} - ${booking.endTime}`;
  
  if (booking.address) {
    document.getElementById('bookingAddressContainer').style.display = 'block';
    document.getElementById('bookingAddress').textContent = booking.address;
  } else {
    document.getElementById('bookingAddressContainer').style.display = 'none';
  }

  // Contact info (customer for provider view)
  if (userRole === 'saheli' && booking.customerId) {
    document.getElementById('contactInfoTitle').textContent = 'Customer Information';
    document.getElementById('contactName').textContent = booking.customerId.name;
    document.getElementById('contactEmail').textContent = booking.customerId.email;
    document.getElementById('contactCity').textContent = booking.customerId.city || 'N/A';
  }

  // Pricing
  document.getElementById('priceBase').textContent = '₹' + booking.baseAmount.toLocaleString('en-IN');
  document.getElementById('priceTravelFee').textContent = '₹' + (booking.travelFee || 0).toLocaleString('en-IN');
  document.getElementById('priceWeekend').textContent = '₹' + (booking.weekendPremium || 0).toLocaleString('en-IN');
  document.getElementById('priceTotal').textContent = '₹' + booking.totalAmount.toLocaleString('en-IN');
  document.getElementById('priceAdvance').textContent = '₹' + booking.advancePaid.toLocaleString('en-IN');
  document.getElementById('priceRemaining').textContent = '₹' + booking.remainingAmount.toLocaleString('en-IN');

  // Hide zero values
  if (!booking.travelFee) document.getElementById('priceTravelFeeRow').style.display = 'none';
  if (!booking.weekendPremium) document.getElementById('priceWeekendRow').style.display = 'none';

  // Notes
  if (booking.notes) {
    document.getElementById('notesSection').style.display = 'block';
    document.getElementById('bookingNotes').textContent = booking.notes;
  }

  // Modal footer actions
  populateModalActions(booking, userRole);
}

/**
 * Populate modal footer with role-specific actions
 */
function populateModalActions(booking, userRole) {
  const footer = document.getElementById('bookingModalFooter');
  footer.innerHTML = '';

  if (userRole === 'saheli') {
    if (booking.status === 'Confirmed') {
      footer.innerHTML += `<button class="btn btn-primary" onclick="handleStartBooking('${booking._id}')">Start Service</button>`;
      footer.innerHTML += `<button class="btn btn-outline-danger" onclick="handleCancelBooking('${booking._id}')">Cancel Booking</button>`;
    } else if (booking.status === 'InProgress') {
      footer.innerHTML += `<button class="btn btn-success" onclick="handleCompleteBooking('${booking._id}')">Complete Service</button>`;
    }
  }

  footer.innerHTML += `<button class="btn btn-outline" onclick="closeBookingDetailModal()">Close</button>`;
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('bookingDetailModal');
  if (e.target.classList.contains('booking-modal-overlay')) {
    closeBookingDetailModal();
  }
});
