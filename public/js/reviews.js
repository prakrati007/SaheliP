(function() {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  function openModal(modal) { if (modal) modal.hidden = false; }
  function closeModal(modal) { if (modal) modal.hidden = true; }

  function initReviewModal() {
    const modal = $('#reviewModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('[data-dismiss]');
    closeBtn?.addEventListener('click', () => closeModal(modal));
    cancelBtn?.addEventListener('click', () => closeModal(modal));

    const stars = $$('.star-input .star', modal);
    const ratingInput = $('#reviewRating', modal);
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = Number(star.dataset.value);
        ratingInput.value = val;
        stars.forEach(s => s.classList.toggle('active', Number(s.dataset.value) <= val));
      });
    });

    const form = $('#reviewForm', modal);
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookingId = $('#reviewBookingId', modal).value;
      const rating = $('#reviewRating', modal).value;
      const reviewText = $('#reviewText', modal).value.trim();
      const imageInput = $('#reviewImage', modal);
      const body = new FormData();
      body.append('bookingId', bookingId);
      body.append('rating', rating);
      body.append('reviewText', reviewText);
      if (imageInput.files[0]) body.append('reviewImage', imageInput.files[0]);

      clearErrors(modal);
      try {
        const res = await fetch('/reviews', { method: 'POST', body });
        const data = await res.json();
        if (!data.success) {
          handleErrors(modal, data);
          return;
        }
        // Success - reload or update UI dynamically
        window.location.reload();
      } catch (err) {
        console.error('Review submit failed', err);
      }
    });
  }

  function initReplyModal() {
    const modal = $('#replyModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('[data-dismiss]');
    closeBtn?.addEventListener('click', () => closeModal(modal));
    cancelBtn?.addEventListener('click', () => closeModal(modal));

    const form = $('#replyForm', modal);
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = $('#replyReviewId', modal).value;
      const replyText = $('#replyText', modal).value.trim();
      clearErrors(modal);
      try {
        const res = await fetch(`/reviews/${id}/reply`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyText })
        });
        const data = await res.json();
        if (!data.success) {
          handleErrors(modal, data);
          return;
        }
        window.location.reload();
      } catch (err) {
        console.error('Reply submit failed', err);
      }
    });
  }

  function wireReviewButtons() {
    // Open review modal with bookingId from buttons having [data-open-review]
    $$('[data-open-review]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-booking-id');
        const modal = $('#reviewModal');
        if (!modal) return;
        $('#reviewBookingId', modal).value = bookingId || '';
        openModal(modal);
      });
    });

    // Open reply modal with reviewId from buttons in review cards
    $$('.review-card .reply-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.review-card');
        const reviewId = card?.dataset.reviewId;
        const modal = $('#replyModal');
        if (!modal) return;
        $('#replyReviewId', modal).value = reviewId || '';
        openModal(modal);
      });
    });
  }

  function handleErrors(scope, data) {
    if (data.errors && Array.isArray(data.errors)) {
      // Map first field error
      const fieldError = data.errors[0];
      if (fieldError.path) {
        const el = scope.querySelector(`[data-error-for="${fieldError.path}"]`);
        if (el) el.textContent = fieldError.msg || fieldError.message || 'Invalid value';
      }
    } else if (data.message) {
      alert(data.message);
    }
  }

  function clearErrors(scope) {
    $$('.error', scope).forEach(e => e.textContent = '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReviewModal();
    initReplyModal();
    wireReviewButtons();
  });
})();
