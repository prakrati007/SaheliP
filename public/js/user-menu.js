/**
 * User Menu Dropdown Functionality
 * Handles toggle, click outside to close, and keyboard navigation
 */

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const userMenuTrigger = document.getElementById('userMenuTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userMenuTrigger || !userDropdownMenu) {
      return; // User not logged in, no menu to initialize
    }
    
    /**
     * Toggle dropdown menu
     */
    function toggleDropdown(event) {
      event.preventDefault();
      event.stopPropagation();
      
      const isExpanded = userMenuTrigger.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }
    
    /**
     * Open dropdown
     */
    function openDropdown() {
      userDropdownMenu.classList.add('show');
      userMenuTrigger.setAttribute('aria-expanded', 'true');
      
      // Add click outside listener
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }
    
    /**
     * Close dropdown
     */
    function closeDropdown() {
      userDropdownMenu.classList.remove('show');
      userMenuTrigger.setAttribute('aria-expanded', 'false');
      
      // Remove click outside listener
      document.removeEventListener('click', handleClickOutside);
    }
    
    /**
     * Handle click outside dropdown
     */
    function handleClickOutside(event) {
      if (!userDropdownMenu.contains(event.target) && 
          !userMenuTrigger.contains(event.target)) {
        closeDropdown();
      }
    }
    
    /**
     * Handle escape key
     */
    function handleEscapeKey(event) {
      if (event.key === 'Escape' && userMenuTrigger.getAttribute('aria-expanded') === 'true') {
        closeDropdown();
        userMenuTrigger.focus();
      }
    }
    
    // Event listeners
    userMenuTrigger.addEventListener('click', toggleDropdown);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Prevent dropdown from closing when clicking inside it
    userDropdownMenu.addEventListener('click', function(event) {
      // Allow logout form to submit and close
      if (event.target.closest('.logout-item')) {
        return;
      }
      event.stopPropagation();
    });
    
    // Close dropdown when clicking on links inside (except logout)
    const dropdownLinks = userDropdownMenu.querySelectorAll('.user-dropdown-item:not(.logout-item)');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function() {
        closeDropdown();
      });
    });
  });
})();
