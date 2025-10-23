/**
 * Customer Dashboard JavaScript
 * Handles tab switching, booking actions, and interactions for customers
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initBookingTabs();
  initPaymentHistory();
  
  // Handle deep linking (URL hash)
  const hash = window.location.hash.replace('#', '');
  if (hash && ['upcoming', 'completed', 'cancelled'].includes(hash)) {
    switchTab(hash);
  }
});

/**
 * Initialize booking tabs
 */
function initBookingTabs() {
  const tabs = document.querySelectorAll('.booking-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      switchTab(tabName);
    });
  });
}

/**
 * Switch between booking tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  const tabs = document.querySelectorAll('.booking-tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab content
  const contents = document.querySelectorAll('.booking-tab-content');
  contents.forEach(content => {
    content.classList.remove('active');
  });

  const activeContent = document.getElementById(`${tabName}Tab`);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Update URL hash (optional, for deep linking)
  window.location.hash = tabName;

  // Smooth scroll to bookings section
  const bookingsSection = document.querySelector('.booking-tabs').closest('.dashboard-section');
  if (bookingsSection) {
    bookingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Initialize payment history interactions
 */
function initPaymentHistory() {
  const paymentRows = document.querySelectorAll('.payment-row');
  
  paymentRows.forEach(row => {
    row.addEventListener('click', function() {
      const bookingId = this.dataset.bookingId;
      if (bookingId) {
        openBookingDetailModal(bookingId);
      }
    });
  });
}

/**
 * Handle cancel booking action
 */
async function handleCancelBooking(bookingId) {
  // Show confirmation modal with refund info
  const confirmed = confirm('Are you sure you want to cancel this booking? Refund policy applies based on time until service start.');
  
  if (!confirmed) return;

  const reason = prompt('Please provide a reason for cancellation (optional):');

  try {
    const response = await fetch(`/booking/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ reason: reason || '' })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Booking cancelled successfully!', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      showToast(data.message || 'Failed to cancel booking', 'error');
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
}

/**
 * Handle pay remaining balance
 */
async function handlePayRemaining(bookingId) {
  try {
    // Create Razorpay order for remaining payment
    const orderResponse = await fetch(`/booking/${bookingId}/payment/remaining`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const orderData = await orderResponse.json();

    if (!orderData.success) {
      showToast(orderData.message || 'Failed to create payment order', 'error');
      return;
    }

    // Initialize Razorpay checkout
    const options = {
      key: orderData.razorpayKeyId,
      amount: orderData.razorpayOrder.amount,
      currency: orderData.razorpayOrder.currency,
      name: 'Saheli Plus',
      description: 'Remaining Payment',
      order_id: orderData.razorpayOrder.id,
      handler: async function(response) {
        // Verify payment on backend
        const verifyResponse = await fetch('/booking/payment/verify-remaining', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            bookingId: bookingId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          showToast('Payment completed successfully!', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          showToast('Payment verification failed', 'error');
        }
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: {
        color: '#F6A5C0'
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Error processing remaining payment:', error);
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
      populateBookingModal(data.booking, 'customer');
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

  // Contact info (provider for customer view)
  if (userRole === 'customer' && booking.providerId) {
    document.getElementById('contactInfoTitle').textContent = 'Provider Information';
    document.getElementById('contactName').textContent = booking.providerId.name;
    document.getElementById('contactEmail').textContent = booking.providerId.email;
    document.getElementById('contactCity').textContent = booking.providerId.city || 'N/A';
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

  // Cancellation details
  if (booking.status === 'Cancelled') {
    const section = document.getElementById('cancellationSection');
    section.style.display = 'block';
    const grid = document.getElementById('cancellationDetailsGrid');
    grid.innerHTML = `
      <div class="booking-detail-item">
        <span class="booking-detail-label">Cancelled By:</span>
        <span class="booking-detail-value">${booking.cancelledBy || 'N/A'}</span>
      </div>
      <div class="booking-detail-item">
        <span class="booking-detail-label">Cancellation Date:</span>
        <span class="booking-detail-value">${booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleDateString('en-IN') : 'N/A'}</span>
      </div>
      ${booking.cancellationReason ? `
        <div class="booking-detail-item full-width">
          <span class="booking-detail-label">Reason:</span>
          <span class="booking-detail-value">${booking.cancellationReason}</span>
        </div>
      ` : ''}
      ${booking.refundAmount > 0 ? `
        <div class="booking-detail-item">
          <span class="booking-detail-label">Refund Amount:</span>
          <span class="booking-detail-value">₹${booking.refundAmount.toLocaleString('en-IN')}</span>
        </div>
      ` : ''}
    `;
  }

  // Modal footer actions
  populateModalActions(booking, userRole);

  // Review CTA section
  const reviewCta = document.getElementById('reviewCtaSection');
  const reviewBtn = document.getElementById('openReviewFromModal');
  if (userRole === 'customer' && booking.status === 'Completed' && !booking.isReviewed) {
    reviewCta.style.display = 'block';
    reviewBtn.setAttribute('data-booking-id', booking._id);
    reviewBtn.onclick = () => {
      const modal = document.getElementById('reviewModal');
      if (!modal) return;
      document.getElementById('reviewBookingId').value = booking._id;
      modal.hidden = false;
    };
  } else {
    reviewCta.style.display = 'none';
  }
}

/**
 * Populate modal footer with role-specific actions
 */
function populateModalActions(booking, userRole) {
  const footer = document.getElementById('bookingModalFooter');
  footer.innerHTML = '';

  if (userRole === 'customer') {
    if (booking.status === 'Confirmed') {
      footer.innerHTML += `<button class="btn btn-outline-danger" onclick="handleCancelBooking('${booking._id}')">Cancel Booking</button>`;
    }
    
    if (booking.status === 'Completed' && booking.paymentStatus === 'AdvancePaid') {
      footer.innerHTML += `<button class="btn btn-primary" onclick="handlePayRemaining('${booking._id}')">Pay Remaining Balance</button>`;
    }

    // Review button handled by review CTA section
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
