import { mountHeader } from '../js/components/header.js';

mountHeader(document.querySelector('[data-site-header]')).catch(error => {
  console.error('Unable to load navigation:', error);
});
