/**
 * Service detail page interactions
 * Image gallery, lightbox, availability calendar, related services scroll
 */

(function () {
  'use strict';

  // ===== IMAGE GALLERY =====
  const galleryMain = document.querySelector('.gallery-main');
  const galleryThumbnails = document.querySelectorAll('.gallery-thumbnail');
  const lightbox = document.querySelector('.gallery-lightbox');
  const lightboxImage = document.querySelector('.gallery-lightbox-image');
  const lightboxClose = document.querySelector('.gallery-lightbox-close');
  const lightboxPrev = document.querySelector('.gallery-lightbox-prev');
  const lightboxNext = document.querySelector('.gallery-lightbox-next');

  let currentImageIndex = 0;
  const images = Array.from(galleryThumbnails).map(thumb => 
    thumb.querySelector('img')?.src || ''
  ).filter(src => src);

  // Thumbnail click - update main image
  galleryThumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', function () {
      const imgSrc = this.querySelector('img')?.src;
      if (imgSrc && galleryMain) {
        const mainImg = galleryMain.querySelector('img');
        if (mainImg) {
          mainImg.src = imgSrc;
        }
        currentImageIndex = index;
        updateActiveThumbnail(index);
      }
    });
  });

  // Main image click - open lightbox
  if (galleryMain && images.length > 0) {
    galleryMain.addEventListener('click', function () {
      openLightbox(currentImageIndex);
    });
  }

  // Lightbox close
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  // Close lightbox on overlay click
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Lightbox navigation
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function (e) {
      e.stopPropagation();
      navigateLightbox(-1);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', function (e) {
      e.stopPropagation();
      navigateLightbox(1);
    });
  }

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        navigateLightbox(-1);
        break;
      case 'ArrowRight':
        navigateLightbox(1);
        break;
    }
  });

  function openLightbox(index) {
    if (!lightbox || !lightboxImage || images.length === 0) return;
    
    currentImageIndex = index;
    lightboxImage.src = images[index];
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    if (images.length === 0) return;
    
    currentImageIndex += direction;
    
    if (currentImageIndex < 0) {
      currentImageIndex = images.length - 1;
    } else if (currentImageIndex >= images.length) {
      currentImageIndex = 0;
    }
    
    if (lightboxImage) {
      lightboxImage.src = images[currentImageIndex];
    }
    updateActiveThumbnail(currentImageIndex);
  }

  function updateActiveThumbnail(index) {
    galleryThumbnails.forEach((thumb, i) => {
      if (i === index) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }

  // Set initial active thumbnail
  if (galleryThumbnails.length > 0) {
    updateActiveThumbnail(0);
  }

  // ===== AVAILABILITY CALENDAR =====
  const dateInput = document.querySelector('input[name="bookingDate"]');
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
        return;
      }

      // Visual feedback for selected date
      this.classList.add('date-selected');
    });
  }

  // ===== RELATED SERVICES SCROLL =====
  const relatedScroll = document.querySelector('.related-services-scroll');
  if (relatedScroll) {
    // Smooth scroll behavior
    relatedScroll.style.scrollBehavior = 'smooth';

    // Optional: Add scroll buttons for desktop
    if (window.innerWidth > 768 && relatedScroll.scrollWidth > relatedScroll.clientWidth) {
      const scrollContainer = relatedScroll.parentElement;
      
      const scrollLeftBtn = document.createElement('button');
      scrollLeftBtn.className = 'scroll-btn scroll-left';
      scrollLeftBtn.innerHTML = '&#8249;';
      scrollLeftBtn.style.cssText = `
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        border: 1px solid var(--border-gray);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 10;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const scrollRightBtn = document.createElement('button');
      scrollRightBtn.className = 'scroll-btn scroll-right';
      scrollRightBtn.innerHTML = '&#8250;';
      scrollRightBtn.style.cssText = scrollLeftBtn.style.cssText.replace('left: 0', 'right: 0');

      scrollContainer.style.position = 'relative';
      scrollContainer.appendChild(scrollLeftBtn);
      scrollContainer.appendChild(scrollRightBtn);

      scrollLeftBtn.addEventListener('click', () => {
        relatedScroll.scrollBy({ left: -320, behavior: 'smooth' });
      });

      scrollRightBtn.addEventListener('click', () => {
        relatedScroll.scrollBy({ left: 320, behavior: 'smooth' });
      });

      // Hide buttons when at edges
      function updateScrollButtons() {
        scrollLeftBtn.style.display = relatedScroll.scrollLeft > 10 ? 'flex' : 'none';
        scrollRightBtn.style.display = 
          relatedScroll.scrollLeft < relatedScroll.scrollWidth - relatedScroll.clientWidth - 10 
            ? 'flex' 
            : 'none';
      }

      relatedScroll.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
    }
  }

  // ===== CTA BUTTON TOOLTIPS =====
  const ctaButtons = document.querySelectorAll('.cta-container .btn:disabled');
  ctaButtons.forEach(btn => {
    // Tooltip is shown via CSS on hover
    // Additional functionality can be added here if needed
  });

  // ===== CONTACT PROVIDER BUTTON =====
  const contactBtn = document.querySelector('.cta-btn-secondary');
  if (contactBtn && !contactBtn.disabled) {
    contactBtn.addEventListener('click', function (e) {
      // Check if user is logged in
      const isLoggedIn = document.querySelector('[data-user-authenticated]')?.dataset.userAuthenticated === 'true';
      
      if (!isLoggedIn) {
        e.preventDefault();
        alert('Please log in to contact the provider');
        window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    });
  }

  // ===== BOOK NOW BUTTON =====
  const bookBtn = document.querySelector('.cta-btn-primary');
  if (bookBtn && !bookBtn.disabled) {
    bookBtn.addEventListener('click', function (e) {
      // Check if user is logged in
      const isLoggedIn = document.querySelector('[data-user-authenticated]')?.dataset.userAuthenticated === 'true';
      
      if (!isLoggedIn) {
        e.preventDefault();
        alert('Please log in to book this service');
        window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    });
  }

  // ===== SHARE BUTTON (OPTIONAL ENHANCEMENT) =====
  function addShareButton() {
    const ctaContainer = document.querySelector('.cta-container');
    if (!ctaContainer) return;

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-secondary';
    shareBtn.innerHTML = '🔗 Share';
    shareBtn.style.flex = '0 0 auto';

    shareBtn.addEventListener('click', async function () {
      const shareData = {
        title: document.querySelector('h1')?.textContent || 'Service',
        text: document.querySelector('.service-description')?.textContent?.substring(0, 100) || '',
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    });

    ctaContainer.appendChild(shareBtn);
  }

  // Add share button if Web Share API or Clipboard API is supported
  if (navigator.share || navigator.clipboard) {
    addShareButton();
  }

  // ===== BREADCRUMB ENHANCEMENT =====
  const breadcrumbLinks = document.querySelectorAll('.breadcrumb-link');
  breadcrumbLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      // Allow normal navigation
    });
  });

  // ===== PRICE BREAKDOWN TOGGLE (FOR PACKAGES) =====
  const packageCards = document.querySelectorAll('.package-card');
  packageCards.forEach(card => {
    card.addEventListener('click', function () {
      // Add visual selection
      packageCards.forEach(c => c.style.borderColor = 'var(--border-gray)');
      this.style.borderColor = 'var(--primary-pink)';
    });
  });

  // ===== LAZY LOADING FOR IMAGES =====
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

  // ===== SCROLL TO TOP BUTTON =====
  function addScrollToTop() {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '↑';
    scrollBtn.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--primary-pink);
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      z-index: 100;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(scrollBtn);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        scrollBtn.style.display = 'block';
      } else {
        scrollBtn.style.display = 'none';
      }
    });

    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  addScrollToTop();

  console.log('Service detail page initialized');

  // ===== REVIEWS LOADER =====
  const reviewsSection = document.getElementById('reviewsSection');
  if (reviewsSection) {
    const serviceId = reviewsSection.getAttribute('data-service-id');
    const list = document.getElementById('reviewsList');
    const sortSel = document.getElementById('reviewSort');
    const pager = document.getElementById('reviewsPagination');
    const prevBtn = document.getElementById('reviewsPrev');
    const nextBtn = document.getElementById('reviewsNext');
    const pageInfo = document.getElementById('reviewsPageInfo');
    let page = 1;
    const limit = 5;
    let sort = sortSel ? sortSel.value : 'newest';

    async function loadReviews() {
      try {
        const res = await fetch(`/reviews/service/${serviceId}?page=${page}&limit=${limit}&sort=${sort}`);
        const data = await res.json();
        if (!data.success) return;
        const { reviews, total } = data.data;
        list.innerHTML = '';
        if (!reviews || reviews.length === 0) {
          list.innerHTML = '<p class="reviews-placeholder">No reviews yet.</p>';
        } else {
          reviews.forEach(r => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
              <div class="review-header">
                <div class="reviewer">
                  <div class="avatar"><span>${(r.customerId?.name || 'U').slice(0,1)}</span></div>
                  <div class="meta">
                    <div class="name">${r.customerId?.name || 'Customer'}</div>
                    <div class="date">${new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div class="stars" aria-label="Rating: ${r.rating} out of 5">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
              </div>
              <div class="review-body">
                <p class="text"></p>
                ${r.reviewImage ? `<div class="image"><img src="${r.reviewImage}" alt="Review image" loading="lazy" /></div>` : ''}
              </div>
            `;
            card.querySelector('.text').textContent = r.reviewText;
            list.appendChild(card);
          });
        }
        const totalPages = Math.ceil(total / limit);
        if (totalPages > 1) {
          pager.hidden = false;
          pageInfo.textContent = `Page ${page} of ${totalPages}`;
          prevBtn.disabled = page <= 1;
          nextBtn.disabled = page >= totalPages;
        } else {
          pager.hidden = true;
        }
      } catch (err) {
        console.error('Failed to load reviews', err);
      }
    }

    sortSel?.addEventListener('change', () => { sort = sortSel.value; page = 1; loadReviews(); });
    prevBtn?.addEventListener('click', () => { if (page > 1) { page--; loadReviews(); } });
    nextBtn?.addEventListener('click', () => { page++; loadReviews(); });

    loadReviews();
  }
})();
