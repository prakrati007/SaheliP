// Service form client-side logic
(function() {
  'use strict';

  // SERVICE_CATEGORIES embedded from server (will be populated by EJS)
  const SERVICE_CATEGORIES = window.SERVICE_CATEGORIES || {};
  
  let packages = [];
  let weeklySchedule = [];
  let imagesToDelete = [];

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initSubcategoryDropdown();
    initPricingTypeToggle();
    initPackageBuilder();
    initAvailabilityBuilder();
    initImagePreview();
    initDescriptionCounter();
    initFormSubmit();
    initEditPageHandlers();
  });

  // 1. Subcategory Population
  function initSubcategoryDropdown() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    if (!categorySelect || !subcategorySelect) return;

    const currentSubcategory = subcategorySelect.dataset.value || '';

    categorySelect.addEventListener('change', function() {
      populateSubcategories(this.value, currentSubcategory);
    });

    // Populate on page load if category is selected
    if (categorySelect.value) {
      populateSubcategories(categorySelect.value, currentSubcategory);
    }
  }

  function populateSubcategories(category, selectedValue = '') {
    const subcategorySelect = document.getElementById('subcategory');
    if (!subcategorySelect) return;

    subcategorySelect.innerHTML = '<option value="">Select subcategory</option>';
    
    if (category && SERVICE_CATEGORIES[category] && SERVICE_CATEGORIES[category].subcategories) {
      SERVICE_CATEGORIES[category].subcategories.forEach(function(sub) {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        if (sub === selectedValue) option.selected = true;
        subcategorySelect.appendChild(option);
      });
    }
  }

  // 2. Pricing Type Toggle
  function initPricingTypeToggle() {
    const pricingTypeInputs = document.querySelectorAll('input[name="pricingType"]');
    const packageSection = document.getElementById('packageSection');
    if (!packageSection) return;

    pricingTypeInputs.forEach(function(input) {
      input.addEventListener('change', function() {
        if (this.value === 'Package') {
          packageSection.style.display = 'block';
        } else {
          packageSection.style.display = 'none';
          packages = [];
          renderPackages();
        }
      });
    });

    // Initialize on page load
    const checkedType = document.querySelector('input[name="pricingType"]:checked');
    if (checkedType && checkedType.value === 'Package') {
      packageSection.style.display = 'block';
    }
  }

  // 3. Package Builder
  function initPackageBuilder() {
    const addBtn = document.getElementById('addPackageBtn');
    if (!addBtn) return;

    addBtn.addEventListener('click', function() {
      if (packages.length >= 5) {
        alert('Maximum 5 packages allowed');
        return;
      }
      packages.push({ name: '', description: '', price: 0, duration: '' });
      renderPackages();
      updatePackageButton();
    });
    
    updatePackageButton();
  }

  function updatePackageButton() {
    const addBtn = document.getElementById('addPackageBtn');
    if (!addBtn) return;
    
    if (packages.length >= 5) {
      addBtn.disabled = true;
      addBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        Maximum Packages Reached (5/5)
      `;
    } else {
      addBtn.disabled = false;
      addBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        Add Package (${packages.length}/5)
      `;
    }
  }

  function renderPackages() {
    const packageList = document.getElementById('packageList');
    if (!packageList) return;

    packageList.innerHTML = '';
    packages.forEach(function(pkg, idx) {
      const div = document.createElement('div');
      div.className = 'package-item-modern';
      div.innerHTML = `
        <div class="package-header-modern">
          <div class="package-number-modern">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span class="package-title-modern">Package ${idx + 1}</span>
          </div>
          <button type="button" class="package-remove-btn-modern" data-index="${idx}" title="Remove package">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>
        <div class="package-fields-modern">
          <div class="package-field-modern package-field-full-modern">
            <label class="package-field-label-modern">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Package Name
            </label>
            <input type="text" class="package-input-modern" placeholder="e.g., Bridal Makeup Package" value="${pkg.name || ''}" data-index="${idx}" data-field="name" />
          </div>
          <div class="package-field-modern package-field-full-modern">
            <label class="package-field-label-modern">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"></line>
                <line x1="21" y1="6" x2="3" y2="6"></line>
                <line x1="21" y1="14" x2="3" y2="14"></line>
                <line x1="17" y1="18" x2="3" y2="18"></line>
              </svg>
              Description
            </label>
            <input type="text" class="package-input-modern" placeholder="Brief description of what's included" value="${pkg.description || ''}" data-index="${idx}" data-field="description" />
          </div>
          <div class="package-field-modern">
            <label class="package-field-label-modern">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Price (₹)
            </label>
            <input type="number" class="package-input-modern" placeholder="0" min="0" step="100" value="${pkg.price || 0}" data-index="${idx}" data-field="price" />
          </div>
          <div class="package-field-modern">
            <label class="package-field-label-modern">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Duration
            </label>
            <input type="text" class="package-input-modern" placeholder="e.g., 2 hours" value="${pkg.duration || ''}" data-index="${idx}" data-field="duration" />
          </div>
        </div>
      `;
      packageList.appendChild(div);
    });

    // Attach event listeners
    packageList.querySelectorAll('input').forEach(function(input) {
      input.addEventListener('input', function() {
        const idx = parseInt(this.dataset.index);
        const field = this.dataset.field;
        if (field === 'price') {
          packages[idx][field] = parseFloat(this.value) || 0;
        } else {
          packages[idx][field] = this.value;
        }
      });
    });

    packageList.querySelectorAll('.package-remove-btn-modern').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.index);
        packages.splice(idx, 1);
        renderPackages();
        updatePackageButton();
      });
    });
  }

  // 4. Availability Builder
  function initAvailabilityBuilder() {
    const builder = document.getElementById('availabilityBuilder');
    if (!builder) return;

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    builder.innerHTML = '<h3 class="availability-title-modern">Weekly Schedule</h3>';
    
    daysOfWeek.forEach(function(day) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'availability-day-modern';
      dayDiv.innerHTML = `
        <div class="availability-day-header-modern">
          <label class="day-checkbox-modern">
            <input type="checkbox" data-day="${day}" class="day-toggle-modern" />
            <span class="day-label-modern">${day}</span>
          </label>
        </div>
        <div class="availability-slots-modern" data-day="${day}" style="display:none;">
          <div class="slots-container-modern" data-day="${day}"></div>
          <button type="button" class="add-slot-btn-modern" data-day="${day}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Add Time Slot
          </button>
        </div>
      `;
      builder.appendChild(dayDiv);
    });

    // Day toggle
    builder.querySelectorAll('.day-toggle-modern').forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
        const day = this.dataset.day;
        const slotsDiv = builder.querySelector(`.availability-slots-modern[data-day="${day}"]`);
        if (this.checked) {
          slotsDiv.style.display = 'block';
          if (!weeklySchedule.find(d => d.day === day)) {
            weeklySchedule.push({ day: day, slots: [{ start: '09:00', end: '17:00' }] });
            renderSlots(day);
          }
        } else {
          slotsDiv.style.display = 'none';
          weeklySchedule = weeklySchedule.filter(d => d.day !== day);
        }
      });
    });

    // Add slot buttons
    builder.querySelectorAll('.add-slot-btn-modern').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const day = this.dataset.day;
        const daySchedule = weeklySchedule.find(d => d.day === day);
        if (daySchedule) {
          if (daySchedule.slots.length >= 5) {
            alert('Maximum 5 time slots per day allowed');
            return;
          }
          daySchedule.slots.push({ start: '09:00', end: '17:00' });
          renderSlots(day);
        }
      });
    });
  }

  function renderSlots(day) {
    const container = document.querySelector(`.slots-container-modern[data-day="${day}"]`);
    if (!container) return;

    const daySchedule = weeklySchedule.find(d => d.day === day);
    if (!daySchedule) return;

    container.innerHTML = '';
    daySchedule.slots.forEach(function(slot, idx) {
      const slotDiv = document.createElement('div');
      slotDiv.className = 'slot-item-modern';
      slotDiv.innerHTML = `
        <input type="time" class="slot-time-input-modern" value="${slot.start}" data-day="${day}" data-slot="${idx}" data-field="start" />
        <span class="slot-separator-modern">to</span>
        <input type="time" class="slot-time-input-modern" value="${slot.end}" data-day="${day}" data-slot="${idx}" data-field="end" />
        <button type="button" class="slot-remove-btn-modern" data-day="${day}" data-slot="${idx}" title="Remove time slot">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </button>
      `;
      container.appendChild(slotDiv);
    });

    // Attach listeners
    container.querySelectorAll('input[type="time"]').forEach(function(input) {
      input.addEventListener('change', function() {
        const day = this.dataset.day;
        const slotIdx = parseInt(this.dataset.slot);
        const field = this.dataset.field;
        const daySchedule = weeklySchedule.find(d => d.day === day);
        if (daySchedule && daySchedule.slots[slotIdx]) {
          daySchedule.slots[slotIdx][field] = this.value;
        }
      });
    });

    container.querySelectorAll('.slot-remove-btn-modern').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const day = this.dataset.day;
        const slotIdx = parseInt(this.dataset.slot);
        const daySchedule = weeklySchedule.find(d => d.day === day);
        if (daySchedule) {
          daySchedule.slots.splice(slotIdx, 1);
          renderSlots(day);
          
          // If no slots left, uncheck the day
          if (daySchedule.slots.length === 0) {
            const checkbox = document.querySelector(`.day-toggle-modern[data-day="${day}"]`);
            if (checkbox) {
              checkbox.checked = false;
              checkbox.dispatchEvent(new Event('change'));
            }
          }
        }
      });
    });
  }

  // 5. Image Preview
  function initImagePreview() {
    const fileInput = document.getElementById('serviceImages');
    const previewGrid = document.getElementById('imagePreviewGrid');
    if (!fileInput || !previewGrid) return;

    fileInput.addEventListener('change', function() {
      const files = Array.from(this.files);
      
      // Validate count
      const existingCount = previewGrid.querySelectorAll('.image-preview-item').length;
      if (existingCount + files.length > 5) {
        alert('Maximum 5 images allowed');
        this.value = '';
        return;
      }

      // Validate types and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      for (let file of files) {
        if (!validTypes.includes(file.type)) {
          alert('Only JPEG, PNG, and WebP images allowed');
          this.value = '';
          return;
        }
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds 5MB limit`);
          this.value = '';
          return;
        }
      }

      // Show previews (new uploads only)
      files.forEach(function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const div = document.createElement('div');
          div.className = 'image-preview-item image-preview-new';
          div.innerHTML = `
            <img class="image-preview-img" src="${e.target.result}" alt="New Image" />
            <span class="image-preview-label">New</span>
          `;
          previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // 6. Description Counter
  function initDescriptionCounter() {
    const textarea = document.getElementById('description');
    const counter = document.getElementById('descCounter');
    if (!textarea || !counter) return;

    function updateCounter() {
      counter.textContent = `${textarea.value.length}/2000`;
    }

    textarea.addEventListener('input', updateCounter);
    updateCounter();
  }

  // 7. Form Submit
  function initFormSubmit() {
    const form = document.getElementById('serviceForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      // First, validate basic required fields using native validation
      if (!form.checkValidity()) {
        // Let browser handle native validation UI without scrolling
        form.reportValidity();
        e.preventDefault();
        return false;
      }

      // Serialize weeklySchedule
      const scheduleInput = document.getElementById('weeklySchedule');
      if (scheduleInput) {
        scheduleInput.value = JSON.stringify(weeklySchedule);
      }

      // Serialize packages
      const packagesInput = document.getElementById('packages');
      const pricingType = document.querySelector('input[name="pricingType"]:checked');
      if (packagesInput && pricingType && pricingType.value === 'Package') {
        if (packages.length === 0) {
          e.preventDefault();
          alert('Please add at least one package for Package pricing type');
          return false;
        }
        packagesInput.value = JSON.stringify(packages);
      }

      // Validate schedule
      if (weeklySchedule.length === 0) {
        e.preventDefault();
        alert('Please set your availability schedule');
        return false;
      }

      // Validate time slots
      for (let daySchedule of weeklySchedule) {
        if (daySchedule.slots.length === 0) {
          e.preventDefault();
          alert(`Please add at least one time slot for ${daySchedule.day}`);
          return false;
        }
        for (let slot of daySchedule.slots) {
          if (slot.start >= slot.end) {
            e.preventDefault();
            alert(`Invalid time range for ${daySchedule.day}: start time must be before end time`);
            return false;
          }
        }
      }

      // If we get here, form is valid - show loading state
      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Service...';
      }
    });
  }

  // 9. Edit Page Handlers
  function initEditPageHandlers() {
    // Load existing data on edit page
    const form = document.getElementById('serviceForm');
    if (!form || form.action.indexOf('_method=PUT') === -1) return;

    // Load subcategory
    const subcategorySelect = document.getElementById('subcategory');
    const categorySelect = document.getElementById('category');
    if (subcategorySelect && categorySelect) {
      const currentSubcategory = subcategorySelect.dataset.value || form.dataset.subcategory || '';
      subcategorySelect.dataset.value = currentSubcategory;
      if (categorySelect.value) {
        populateSubcategories(categorySelect.value, currentSubcategory);
      }
    }

    // Load existing packages
    if (form.dataset.packages) {
      try {
        packages = JSON.parse(form.dataset.packages);
        renderPackages();
      } catch (e) {
        console.error('Failed to parse packages', e);
      }
    }

    // Load existing schedule
    if (form.dataset.schedule) {
      try {
        weeklySchedule = JSON.parse(form.dataset.schedule);
        const builder = document.getElementById('availabilityBuilder');
        if (builder) {
          weeklySchedule.forEach(function(daySchedule) {
            const checkbox = builder.querySelector(`.day-toggle[data-day="${daySchedule.day}"]`);
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dispatchEvent(new Event('change'));
              renderSlots(daySchedule.day);
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse schedule', e);
      }
    }

    // Image deletion
    const removeButtons = document.querySelectorAll('.image-remove-btn');
    removeButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.index);
        imagesToDelete.push(idx);
        this.parentElement.remove();
        
        const deleteInput = document.getElementById('deleteImages');
        if (deleteInput) {
          deleteInput.value = imagesToDelete.join(',');
        }

        const imageCount = document.getElementById('imageCount');
        if (imageCount) {
          const remaining = document.querySelectorAll('.image-preview-item:not(.image-preview-new)').length;
          imageCount.textContent = remaining;
        }
      });
    });

    // Delete service button
    const deleteBtn = document.getElementById('deleteServiceBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
          const serviceId = form.action.match(/\/services\/([^?]+)/)[1];
          const deleteForm = document.createElement('form');
          deleteForm.method = 'POST';
          deleteForm.action = `/services/${serviceId}?_method=DELETE`;
          document.body.appendChild(deleteForm);
          deleteForm.submit();
        }
      });
    }

    // Toggle status button
    const toggleBtn = document.getElementById('toggleStatusBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        const serviceId = form.action.match(/\/services\/([^?]+)/)[1];
        fetch(`/services/${serviceId}/toggle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert(data.message || 'Failed to toggle status');
          }
        })
        .catch(err => {
          alert('Failed to toggle status');
        });
      });
    }
  }

  // Expose for EJS to set categories
  window.setServiceCategories = function(categories) {
    window.SERVICE_CATEGORIES = categories;
  };

})();
