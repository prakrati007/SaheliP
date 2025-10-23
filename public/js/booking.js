// Booking Modal and Payment Integration
(function() {
  // Utility formatters
  function formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
    } catch (_) {
      return `₹${(amount || 0).toFixed(2)}`;
    }
  }

  function parseDateInput(value) {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  // Modal controls
  window.openBookingModal = function openBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Elements
  const overlay = document.getElementById('bookingModalOverlay');
  const closeBtn = document.getElementById('closeBookingModal');
  const cancelBtn = document.getElementById('cancelBookingBtn');
  const submitBtn = document.getElementById('submitBookingBtn');
  const bookingDateInput = document.getElementById('bookingDate');
  const timeSlotContainer = document.getElementById('timeSlotContainer');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const addressText = document.getElementById('bookingAddress');
  const notesText = document.getElementById('bookingNotes');

  // Hidden inputs with service data
  const serviceId = document.getElementById('modalServiceId')?.value;
  const pricingType = document.getElementById('modalPricingType')?.value;
  const basePrice = parseFloat(document.getElementById('modalBasePrice')?.value || '0');
  const advancePercentage = parseFloat(document.getElementById('modalAdvancePercentage')?.value || '0');
  const travelFee = parseFloat(document.getElementById('modalTravelFee')?.value || '0');
  const weekendPremiumPercent = parseFloat(document.getElementById('modalWeekendPremium')?.value || '0');
  const mode = document.getElementById('modalMode')?.value;
  const packages = (() => { try { return JSON.parse(document.getElementById('modalPackages')?.value || '[]'); } catch(_) { return []; } })();
  const weeklySchedule = (() => { try { return JSON.parse(document.getElementById('modalWeeklySchedule')?.value || '[]'); } catch(_) { return []; } })();
  const unavailableDates = (() => { try { return JSON.parse(document.getElementById('modalUnavailableDates')?.value || '[]'); } catch(_) { return []; } })();

  const priceBaseEl = document.getElementById('priceBase');
  const priceTravelEl = document.getElementById('priceTravel');
  const priceWeekendRowEl = document.getElementById('priceWeekendRow');
  const priceWeekendEl = document.getElementById('priceWeekend');
  const priceTotalEl = document.getElementById('priceTotal');
  const priceAdvanceEl = document.getElementById('priceAdvance');
  const priceRemainingEl = document.getElementById('priceRemaining');

  // Character counters
  const addressCharCount = document.getElementById('addressCharCount');
  const notesCharCount = document.getElementById('notesCharCount');
  if (addressText && addressCharCount) {
    addressText.addEventListener('input', () => { addressCharCount.textContent = addressText.value.length; });
  }
  if (notesText && notesCharCount) {
    notesText.addEventListener('input', () => { notesCharCount.textContent = notesText.value.length; });
  }

  function isWeekend(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  function parseTimeToMinutes(timeString) {
    const [h, m] = (timeString || '0:0').split(':').map(Number);
    return (h * 60) + m;
  }

  function minutesToTimeString(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function calculatePrice() {
    const date = parseDateInput(bookingDateInput?.value);
    const start = startTimeInput?.value;
    const end = endTimeInput?.value;
    if (!date || !start || !end) return;

    const duration = (parseTimeToMinutes(end) - parseTimeToMinutes(start)) / 60;
    let baseAmount = 0;

    if (pricingType === 'Hourly') baseAmount = basePrice * duration;
    if (pricingType === 'Fixed') baseAmount = basePrice;
    if (pricingType === 'Package') {
      const selected = document.querySelector('input[name="selectedPackageIndex"]:checked');
      const idx = selected ? parseInt(selected.value, 10) : 0;
      const pkg = packages[idx];
      baseAmount = pkg ? pkg.price : 0;
    }

    let weekendPremium = 0;
    if (isWeekend(date) && weekendPremiumPercent) {
      weekendPremium = Math.round(baseAmount * (weekendPremiumPercent / 100));
      if (priceWeekendRowEl) priceWeekendRowEl.style.display = '';
    } else {
      if (priceWeekendRowEl) priceWeekendRowEl.style.display = 'none';
    }

    const travel = (mode === 'Onsite' || mode === 'Hybrid') ? (travelFee || 0) : 0;
    const total = baseAmount + weekendPremium + travel;
    const advance = Math.round(total * (advancePercentage / 100));
    const remaining = total - advance;

    if (priceBaseEl) priceBaseEl.textContent = formatCurrency(baseAmount);
    if (priceWeekendEl) priceWeekendEl.textContent = formatCurrency(weekendPremium);
    if (priceTotalEl) priceTotalEl.textContent = formatCurrency(total);
    if (priceAdvanceEl) priceAdvanceEl.textContent = formatCurrency(advance);
    if (priceRemainingEl) priceRemainingEl.textContent = formatCurrency(remaining);
  }

  async function renderTimeSlotsForDate(date) {
    if (!timeSlotContainer) return;
    timeSlotContainer.innerHTML = '<p class="booking-form-helper">Loading available slots...</p>';
    const d = parseDateInput(date);
    if (!d) {
      timeSlotContainer.innerHTML = '<p class="booking-form-helper">Select a valid date</p>';
      return;
    }

    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if ((unavailableDates || []).includes(dateStr)) {
      timeSlotContainer.innerHTML = '<p class="booking-form-helper">This date is marked as unavailable</p>';
      return;
    }

    try {
      // Fetch availability from API
      const response = await fetch(`/booking/availability/${serviceId}?date=${dateStr}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        timeSlotContainer.innerHTML = '<p class="booking-form-helper">Failed to load availability</p>';
        return;
      }

      if (!data.slots || data.slots.length === 0) {
        timeSlotContainer.innerHTML = '<p class="booking-form-helper">No available time slots for this day</p>';
        return;
      }

      // Clear and render slots with availability status
      timeSlotContainer.innerHTML = '';
      data.slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking-time-slot';
        btn.textContent = `${slot.start} - ${slot.end}`;
        
        if (!slot.available) {
          btn.classList.add('booked');
          btn.disabled = true;
          btn.title = 'This slot is already booked';
        } else {
          btn.addEventListener('click', () => {
            // Select slot
            document.querySelectorAll('.booking-time-slot').forEach(el => el.classList.remove('selected'));
            btn.classList.add('selected');
            startTimeInput.value = slot.start;
            endTimeInput.value = slot.end;
            calculatePrice();
            // Enable submit when valid
            if (submitBtn) submitBtn.disabled = false;
          });
        }
        
        timeSlotContainer.appendChild(btn);
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      timeSlotContainer.innerHTML = '<p class="booking-form-helper">Error loading time slots</p>';
    }
  }

  // Event listeners
  if (closeBtn) closeBtn.addEventListener('click', closeBookingModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBookingModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBookingModal(); });

  if (bookingDateInput) bookingDateInput.addEventListener('change', (e) => {
    renderTimeSlotsForDate(e.target.value);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBookingModal();
  });

  // Update pricing on interactions
  ['change', 'input'].forEach(evt => {
    if (bookingDateInput) bookingDateInput.addEventListener(evt, calculatePrice);
    if (startTimeInput) startTimeInput.addEventListener(evt, calculatePrice);
    if (endTimeInput) endTimeInput.addEventListener(evt, calculatePrice);
    document.querySelectorAll('input[name="selectedPackageIndex"]').forEach(r => r.addEventListener(evt, calculatePrice));
  });

  // Submit handler
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      try {
        submitBtn.disabled = true;
        submitBtn.classList.add('booking-btn-loading');
        const spinner = submitBtn.querySelector('.booking-spinner');
        if (spinner) spinner.style.display = 'inline-block';

        // Validate
        const dateVal = bookingDateInput?.value;
        const startVal = startTimeInput?.value;
        const endVal = endTimeInput?.value;
        if (!dateVal || !startVal || !endVal) {
          alert('Please select a date and time slot');
          return;
        }
        if ((mode === 'Onsite' || mode === 'Hybrid') && !addressText?.value) {
          alert('Please enter the service address');
          return;
        }

        // Collect data
        const selectedPkgInput = document.querySelector('input[name="selectedPackageIndex"]:checked');
        const payload = {
          serviceId,
          date: dateVal,
          startTime: startVal,
          endTime: endVal,
          address: addressText?.value || '',
          notes: notesText?.value || '',
          selectedPackageIndex: selectedPkgInput ? parseInt(selectedPkgInput.value, 10) : undefined
        };

        // Create booking
        const res = await fetch('/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to create booking');
        }

        // Open Razorpay checkout
        const rzpKey = document.getElementById('razorpayKeyId')?.value;
        if (!rzpKey) throw new Error('Payment gateway not configured');

        const options = {
          key: rzpKey,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: 'Saheli Plus',
          description: data.booking.serviceTitle,
          order_id: data.razorpayOrder.id,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/booking/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  bookingId: data.booking.id
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || 'Payment verification failed');
              closeBookingModal();
              window.location.href = verifyData.redirectUrl || `/booking/${data.booking.id}/confirmation`;
            } catch (err) {
              alert(err.message || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: function() {
              alert('Payment cancelled. Your booking will expire in 15 minutes.');
            }
          },
          theme: { color: '#F6A5C0' }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

      } catch (err) {
        alert(err.message || 'Something went wrong');
      } finally {
        const spinner = submitBtn.querySelector('.booking-spinner');
        if (spinner) spinner.style.display = 'none';
        submitBtn.classList.remove('booking-btn-loading');
        submitBtn.disabled = false;
      }
    });
  }
})();
