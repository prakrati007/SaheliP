/**
 * Password strength calculation and meter for reset password page
 */
function calculatePasswordStrength(password) {
  let score = 0;
  if (!password) return { level: 'weak', percent: 0 };
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  let percent = (score / 5) * 100;
  let level = 'weak';
  if (score >= 4) level = 'strong';
  else if (score >= 2) level = 'medium';
  return { level, percent };
}

function updatePasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');
  const strengthLabel = document.getElementById('strengthLabel');
  if (!passwordInput || !strengthBar || !strengthLabel) return;
  passwordInput.addEventListener('input', function () {
    const val = passwordInput.value;
    const { level, percent } = calculatePasswordStrength(val);
    strengthBar.style.width = percent + '%';
    strengthBar.className = 'strength-bar strength-' + level;
    strengthLabel.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    strengthLabel.style.color = level === 'strong' ? 'green' : level === 'medium' ? 'orange' : 'red';
  });
}

function validateResetPasswordForm() {
  const form = document.getElementById('resetPasswordForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const otp = document.getElementById('otpValue').value;
    let valid = true;
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      showNotification('Please enter a valid 6-digit OTP.', 'error');
      valid = false;
    }
    if (password.length < 8) {
      showNotification('Password must be at least 8 characters.', 'error');
      valid = false;
    }
    if (password !== confirmPassword) {
      showNotification('Passwords do not match.', 'error');
      valid = false;
    }
    if (!valid) {
      e.preventDefault();
    }
  });
}

function initPasswordStrength() {
  updatePasswordStrength();
  validateResetPasswordForm();
}
/**
 * Authentication page client-side JavaScript
 */

/**
 * Toggle password visibility
 * @param {string} inputId - ID of the password input field
 */
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      // Show password
      input.type = 'text';
      
      // Auto-hide after 5 seconds
      setTimeout(function() {
        input.type = 'password';
      }, 5000);
    } else {
      // Hide password immediately if clicked again
      input.type = 'password';
    }
  }
}

/**
 * Validate password match on signup forms
 */
function validatePasswordMatch() {
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const errorElement = document.getElementById('passwordMatchError');
  const form = document.getElementById('signupForm');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (password && confirmPassword && errorElement) {
    // Function to check password match and update button state
    function checkPasswordMatch() {
      if (confirmPassword.value && password.value !== confirmPassword.value) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.5';
          submitBtn.style.cursor = 'not-allowed';
        }
        return false;
      } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
        }
        return true;
      }
    }

    // Check on both password and confirmPassword input
    password.addEventListener('input', checkPasswordMatch);
    confirmPassword.addEventListener('input', checkPasswordMatch);

    // Validate on form submit
    if (form) {
      form.addEventListener('submit', function (e) {
        if (!checkPasswordMatch()) {
          e.preventDefault();
          showNotification('Passwords do not match', 'error');
          confirmPassword.focus();
        }
      });
    }
  }
}

/**
 * Validate pincode format
 */
function validatePincode() {
  const pincodeInput = document.getElementById('pincode');
  if (pincodeInput) {
    pincodeInput.addEventListener('input', function (e) {
      // Allow only digits
      e.target.value = e.target.value.replace(/\D/g, '');
      // Limit to 6 digits
      if (e.target.value.length > 6) {
        e.target.value = e.target.value.slice(0, 6);
      }
    });
  }
}

/**
 * Switch between login tabs (password/OTP)
 * @param {string} tab - Tab to switch to ('password' or 'otp')
 */
function switchLoginTab(tab) {
  const passwordTab = document.getElementById('passwordLoginTab');
  const otpTab = document.getElementById('otpLoginTab');
  const tabButtons = document.querySelectorAll('.tab-button');

  if (tab === 'password') {
    passwordTab.classList.add('active');
    otpTab.classList.remove('active');
    tabButtons[0].classList.add('active');
    tabButtons[1].classList.remove('active');
  } else {
    otpTab.classList.add('active');
    passwordTab.classList.remove('active');
    tabButtons[1].classList.add('active');
    tabButtons[0].classList.remove('active');
  }
}

/**
 * Initialize OTP inputs with auto-advance and paste handling
 */
function initOtpInputs() {
  const otpInputs = document.querySelectorAll('.otp-input');
  const otpForm = document.getElementById('otpForm');
  const otpValueInput = document.getElementById('otpValue');

  if (!otpInputs.length) return;

  // Auto-focus first input
  otpInputs[0].focus();

  otpInputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', function (e) {
      const value = e.target.value;

      // Allow only digits
      if (!/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Auto-advance to next input
      if (value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }

      // Update hidden input with complete OTP
      updateOtpValue();
    });

    // Handle backspace
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').trim();

      // Check if pasted data is 6 digits
      if (/^\d{6}$/.test(pastedData)) {
        // Distribute digits across inputs
        pastedData.split('').forEach((digit, i) => {
          if (otpInputs[i]) {
            otpInputs[i].value = digit;
          }
        });
        // Focus last input
        otpInputs[5].focus();
        // Update hidden input
        updateOtpValue();
      }
    });
  });

  // Update hidden OTP value
  function updateOtpValue() {
    const otp = Array.from(otpInputs)
      .map((input) => input.value)
      .join('');
    if (otpValueInput) {
      otpValueInput.value = otp;
    }
  }

  // Validate before submit
  if (otpForm) {
    otpForm.addEventListener('submit', function (e) {
      updateOtpValue();
      const otp = otpValueInput.value;
      if (otp.length !== 6) {
        e.preventDefault();
        showNotification('Please enter all 6 digits', 'error');
        otpInputs[0].focus();
      }
    });
  }
}

/**
 * Start resend cooldown timer
 * @param {number} seconds - Cooldown duration in seconds
 */
function startResendCooldown(seconds) {
  const resendLink = document.getElementById('resendLink');
  const countdown = document.getElementById('countdown');

  if (!resendLink || !countdown) return;

  let remaining = seconds;

  resendLink.style.display = 'none';
  countdown.style.display = 'inline';

  const interval = setInterval(function () {
    countdown.textContent = `(${remaining}s)`;
    remaining--;

    if (remaining < 0) {
      clearInterval(interval);
      resendLink.style.display = 'inline';
      countdown.style.display = 'none';
    }
  }, 1000);
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type}`;
  notification.textContent = message;

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'alert-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function () {
    notification.remove();
  };
  notification.appendChild(closeBtn);

  // Insert at top of auth container
  const container = document.querySelector('.auth-container');
  if (container) {
    container.insertBefore(notification, container.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      notification.remove();
    }, 5000);
  }
}

/**
 * Handle form submissions with loading states
 */
function setupFormSubmitHandlers() {
  const forms = document.querySelectorAll('form');

  forms.forEach((form) => {
    form.addEventListener('submit', function () {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';
      }
    });
  });
}

/**
 * Handle OTP login form
 */
function setupOtpLoginForm() {
  const otpLoginForm = document.getElementById('otpLoginForm');
  if (otpLoginForm) {
    otpLoginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

  const email = document.getElementById('otpEmail').value;
  const role = document.getElementById('otpRole')?.value;
      const submitBtn = this.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const response = await fetch('/auth/login/otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, role }),
        });

        const data = await response.json();

        if (data.success) {
          showNotification(data.message, 'success');
          // Redirect to verify page with login_otp purpose
          setTimeout(function () {
            const q = new URLSearchParams({ email: data.email, token: data.token, purpose: 'login_otp', role: role || '' });
            window.location.href = `/auth/verify-otp?${q.toString()}`;
          }, 1000);
        } else {
          showNotification(data.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send OTP';
        }
      } catch (error) {
        showNotification('An error occurred. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send OTP';
      }
    });
  }
}

// Initialize on page load

function setupResendOtpHandler() {
  const resendLink = document.getElementById('resendLink');
  if (resendLink) {
    resendLink.addEventListener('click', async function (e) {
      e.preventDefault();
      showNotification('Resending OTP...', 'info');
      resendLink.disabled = true;
      try {
        // Collect required data from hidden inputs
        const email = document.getElementById('otpEmail')?.value || document.querySelector('input[name="email"]')?.value;
  const purpose = document.querySelector('input[name="purpose"]')?.value || 'email_verify';
  const role = document.querySelector('input[name="role"]')?.value || document.getElementById('otpRole')?.value || '';
        const response = await fetch('/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, purpose, role })
        });
        const data = await response.json();
        if (data.success) {
          showNotification('OTP sent! Check your email.', 'success');
          startResendCooldown(60);
        } else {
          showNotification(data.message || 'Failed to resend OTP.', 'error');
        }
      } catch (err) {
        showNotification('Error resending OTP. Please try again.', 'error');
      }
      resendLink.disabled = false;
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  validatePasswordMatch();
  validatePincode();
  setupFormSubmitHandlers();
  setupOtpLoginForm();
  setupResendOtpHandler();
  if (document.getElementById('resetPasswordForm')) {
    initPasswordStrength();
  }
});
