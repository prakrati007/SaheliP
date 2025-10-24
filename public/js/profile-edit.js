// Profile Edit Page - Enhanced Functionality

document.addEventListener('DOMContentLoaded', function() {
  // Profile Picture Preview
  const profilePicInput = document.getElementById('profilePic');
  const picturePreview = document.getElementById('picturePreview');
  const pictureOverlay = document.querySelector('.picture-overlay');

  if (profilePicInput && picturePreview) {
    // Click on preview to trigger file input
    if (pictureOverlay) {
      pictureOverlay.addEventListener('click', function() {
        profilePicInput.click();
      });
    }

    // Handle file selection
    profilePicInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      
      if (file) {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          profilePicInput.value = '';
          return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert('Please select a valid image file (JPEG, PNG, or WebP)');
          profilePicInput.value = '';
          return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
          if (picturePreview.tagName === 'IMG') {
            picturePreview.src = e.target.result;
          } else {
            // Replace placeholder with img
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Profile Preview';
            img.className = 'picture-preview-img';
            img.id = 'picturePreview';
            picturePreview.parentNode.replaceChild(img, picturePreview);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Bio Character Counter
  const bioTextarea = document.getElementById('bio');
  const bioCounter = document.getElementById('bioCounter');

  if (bioTextarea && bioCounter) {
    function updateBioCounter() {
      const length = bioTextarea.value.length;
      const maxLength = 500;
      bioCounter.textContent = `${length}/${maxLength}`;

      // Update counter color based on length
      bioCounter.classList.remove('warning', 'danger');
      if (length > maxLength * 0.9) {
        bioCounter.classList.add('danger');
      } else if (length > maxLength * 0.75) {
        bioCounter.classList.add('warning');
      }
    }

    // Initialize counter
    updateBioCounter();

    // Update on input
    bioTextarea.addEventListener('input', updateBioCounter);
  }

  // Form Validation
  const form = document.getElementById('profileEditForm');

  if (form) {
    form.addEventListener('submit', function(e) {
      // Validate name
      const nameInput = document.getElementById('name');
      if (nameInput && nameInput.value.trim().length < 2) {
        e.preventDefault();
        alert('Name must be at least 2 characters long');
        nameInput.focus();
        return;
      }

      // Validate city
      const cityInput = document.getElementById('city');
      if (cityInput && cityInput.value.trim().length < 2) {
        e.preventDefault();
        alert('City must be at least 2 characters long');
        cityInput.focus();
        return;
      }

      // Validate pincode
      const pincodeInput = document.getElementById('pincode');
      if (pincodeInput) {
        const pincode = pincodeInput.value.trim();
        if (!/^\d{6}$/.test(pincode)) {
          e.preventDefault();
          alert('Please enter a valid 6-digit pincode');
          pincodeInput.focus();
          return;
        }
      }

      // Validate experience years (if present)
      const experienceInput = document.getElementById('experienceYears');
      if (experienceInput && experienceInput.value) {
        const experience = parseInt(experienceInput.value);
        if (experience < 0 || experience > 50) {
          e.preventDefault();
          alert('Experience years must be between 0 and 50');
          experienceInput.focus();
          return;
        }
      }

      // Show loading state on submit button
      const submitBtn = form.querySelector('.btn-save');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Saving Changes...
        `;
      }
    });
  }

  // Input animations and focus effects
  const inputs = document.querySelectorAll('.form-input, .form-textarea');
  inputs.forEach(input => {
    // Add filled class if input has value
    if (input.value) {
      input.classList.add('filled');
    }

    input.addEventListener('input', function() {
      if (this.value) {
        this.classList.add('filled');
      } else {
        this.classList.remove('filled');
      }
    });

    // Smooth focus animation
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  });

  // Auto-resize textareas
  const textareas = document.querySelectorAll('.form-textarea');
  textareas.forEach(textarea => {
    function autoResize() {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    textarea.addEventListener('input', autoResize);
    autoResize(); // Initial resize
  });

  // Languages input helper
  const languagesInput = document.getElementById('languages');
  if (languagesInput) {
    languagesInput.addEventListener('blur', function() {
      // Clean up language input (trim spaces, proper capitalization)
      const languages = this.value
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang.length > 0)
        .map(lang => lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase())
        .join(', ');
      this.value = languages;
    });
  }

  // Certifications input helper
  const certificationsInput = document.getElementById('certifications');
  if (certificationsInput) {
    certificationsInput.addEventListener('blur', function() {
      // Clean up certifications input (trim spaces)
      const certifications = this.value
        .split(',')
        .map(cert => cert.trim())
        .filter(cert => cert.length > 0)
        .join(', ');
      this.value = certifications;
    });
  }

  // Pincode validation on input
  const pincodeInput = document.getElementById('pincode');
  if (pincodeInput) {
    pincodeInput.addEventListener('input', function() {
      // Only allow digits
      this.value = this.value.replace(/\D/g, '');
      
      // Limit to 6 digits
      if (this.value.length > 6) {
        this.value = this.value.slice(0, 6);
      }
    });
  }

  // Smooth scroll to error
  const alertBanner = document.querySelector('.alert-banner');
  if (alertBanner) {
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Add CSS for spinner animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spinner {
      animation: spin 1s linear infinite;
      width: 20px;
      height: 20px;
    }
    .form-field.focused .form-label {
      color: #F06EA9;
    }
    .form-input.filled,
    .form-textarea.filled {
      background: white;
    }
  `;
  document.head.appendChild(style);
});
