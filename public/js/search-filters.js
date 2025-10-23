/**
 * Modern Search Filters - Interactive Rating Selection
 */

document.addEventListener('DOMContentLoaded', function() {
  // Rating Filter Interaction
  const ratingFilter = document.getElementById('ratingFilter');
  const ratingInput = document.getElementById('ratingInput');
  
  if (ratingFilter && ratingInput) {
    const starButtons = ratingFilter.querySelectorAll('.star-btn');
    
    starButtons.forEach((starBtn, index) => {
      starBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const rating = this.getAttribute('data-rating');
        
        // Toggle rating selection
        if (ratingInput.value === rating) {
          // Deselect if clicking the same rating
          ratingInput.value = '';
          starButtons.forEach(btn => btn.classList.remove('active'));
        } else {
          // Select new rating
          ratingInput.value = rating;
          starButtons.forEach((btn, btnIndex) => {
            if (btnIndex < index + 1) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
        }
      });
      
      // Hover effect
      starBtn.addEventListener('mouseenter', function() {
        starButtons.forEach((btn, btnIndex) => {
          if (btnIndex <= index) {
            btn.style.transform = 'scale(1.1)';
          }
        });
      });
      
      starBtn.addEventListener('mouseleave', function() {
        starButtons.forEach(btn => {
          btn.style.transform = 'scale(1)';
        });
      });
    });
  }
  
  // Auto-submit on filter change (optional - can be enabled)
  const autoSubmit = false; // Set to true to enable auto-submit
  
  if (autoSubmit) {
    const filterForm = document.getElementById('filterForm');
    const filterInputs = filterForm.querySelectorAll('input, select');
    
    filterInputs.forEach(input => {
      if (input.type !== 'submit') {
        input.addEventListener('change', function() {
          filterForm.submit();
        });
      }
    });
  }
});
