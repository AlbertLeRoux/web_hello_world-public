document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('commentForm');
const status = document.getElementById('formStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = 'Sending...';

  if (document.getElementById('hp').value.trim() !== '') {
    status.textContent = 'Submission rejected.';
    return;
  }

  const data = new URLSearchParams(new FormData(form));
  try {
    const resp = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data
    });

    if (resp.ok) {
      status.textContent = 'Thanks — your message was received.';
      form.reset();
    } else {
      const text = await resp.text();
      status.textContent = text || 'Server error.';
    }
  } catch (err) {
    status.textContent = 'Network error.';
  }
});

