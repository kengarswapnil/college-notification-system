// Flash message auto-dismiss
document.addEventListener('DOMContentLoaded', function() {
  // Auto-dismiss flash messages after 5 seconds
  const flashMessages = document.querySelectorAll('.alert');
  flashMessages.forEach(function(message) {
    setTimeout(function() {
      message.style.opacity = '0';
      setTimeout(function() {
        message.remove();
      }, 300);
    }, 5000);
  });

  // Password confirmation validation
  const passwordForm = document.querySelector('form[data-validate-password]');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      const password = this.querySelector('input[name="password"]');
      const confirmPassword = this.querySelector('input[name="password2"]');
      
      if (password && confirmPassword && password.value !== confirmPassword.value) {
        e.preventDefault();
        alert('Passwords do not match!');
      }
    });
  }

  // Enable tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Enable popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
}); 