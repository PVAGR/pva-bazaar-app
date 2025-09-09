import { api } from '../api/client';

function readValue(id) { return document.getElementById(id)?.value?.trim(); }

async function onSubmit(e) {
  e.preventDefault();
  try {
    const body = {
      name: readValue('name'),
      title: readValue('title'),
      description: readValue('description'),
      imageUrl: readValue('imageUrl'),
      price: Number(readValue('price')) || 0,
      category: readValue('category'),
      materials: (readValue('materials') || '').split(',').map(s => s.trim()).filter(Boolean),
      artisan: readValue('artisan')
    };
    const res = await api.post('/artifacts', body);
    alert(res?.ok ? 'Artifact created' : (res?.message || 'Failed'));
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function boot() {
  const form = document.getElementById('artifact-form');
  if (form) form.addEventListener('submit', onSubmit);
}

window.addEventListener('DOMContentLoaded', boot);
