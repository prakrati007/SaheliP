// Profile page JS
function initImagePreview() {
  const input = document.getElementById('profilePic');
  const preview = document.getElementById('profile-picture-preview');
  if (!input || !preview) return;
  input.addEventListener('change', function () {
    preview.innerHTML = '';
    const file = input.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      preview.innerHTML = '<span style="color:red">Invalid file type.</span>';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      preview.innerHTML = '<span style="color:red">File too large (max 5MB).</span>';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" class="profile-picture" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  });
}
function initCharacterCounter() {
  const bio = document.getElementById('bio');
  const counter = document.getElementById('bioCounter');
  if (!bio || !counter) return;
  bio.addEventListener('input', function () {
    const len = bio.value.length;
    counter.textContent = `${len}/500`;
    counter.className = 'character-counter';
    if (len > 450 && len < 500) counter.classList.add('counter-warning');
    if (len >= 500) counter.classList.add('counter-danger');
  });
  bio.dispatchEvent(new Event('input'));
}
function confirmRemovePicture() {
  const btn = document.querySelector('.remove-picture-btn');
  if (btn) {
    btn.addEventListener('click', function (e) {
      if (!confirm('Remove profile picture?')) e.preventDefault();
    });
  }
}
document.addEventListener('DOMContentLoaded', function () {
  initImagePreview();
  initCharacterCounter();
  confirmRemovePicture();
});
