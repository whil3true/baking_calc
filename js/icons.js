/* BakeCalc local icon renderer. Replaces the external Lucide runtime. */
(() => {
  'use strict';

  const iconPaths = {
    'calculator': '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/>',
    'cake-slice': '<path d="M4 17 18 7l2 10Z"/><path d="M7 15h12"/><path d="M9 11h8"/><path d="M12 8c0-2 2-2 2-4"/>',
    'package-open': '<path d="m12 3-8 4 8 4 8-4-8-4Z"/><path d="m4 7 8 4 8-4"/><path d="M4 7v9l8 5 8-5V7"/><path d="M12 11v10"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'sparkles': '<path d="m12 3-1.2 3.2L8 7.4l2.8 1.2L12 12l1.2-3.4L16 7.4l-2.8-1.2L12 3Z"/><path d="m5 14-.8 2.1L2 17l2.2.9L5 20l.8-2.1L8 17l-2.2-.9L5 14Z"/><path d="m19 13-.7 1.8-1.8.7 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.7L19 13Z"/>',
    'coins': '<ellipse cx="8" cy="8" rx="5" ry="3"/><path d="M3 8v4c0 1.7 2.2 3 5 3 1.1 0 2.1-.2 3-.6"/><ellipse cx="16" cy="14" rx="5" ry="3"/><path d="M11 14v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4"/>',
    'circle': '<circle cx="12" cy="12" r="9"/>',
    'square': '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    'arrow-left-right': '<path d="M8 7h12l-3-3m3 3-3 3"/><path d="M16 17H4l3 3m-3-3 3-3"/>',
    'flask-conical': '<path d="M9 3h6M10 3v6l-5 8a3 3 0 0 0 2.6 4h8.8a3 3 0 0 0 2.6-4l-5-8V3"/><path d="M8 14h8"/>',
    'badge-russian-ruble': '<circle cx="12" cy="12" r="9"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9m0 2h6"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    'cup-soda': '<path d="M5 4h14l-1.5 17h-11L5 4Z"/><path d="M8 8h8M15 4l2-2"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'trash-2': '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'check': '<path d="m5 12 4 4L19 6"/>',
    'copy': '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
  };

  const fallback = '<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>';

  function createIcon(node) {
    if (!node || node.tagName === 'SVG') return;
    const name = node.getAttribute('data-lucide') || '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const attr of node.attributes) {
      if (attr.name !== 'data-lucide') svg.setAttribute(attr.name, attr.value);
    }
    svg.setAttribute('data-icon', name);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', node.getAttribute('aria-hidden') || 'true');
    svg.innerHTML = iconPaths[name] || fallback;
    node.replaceWith(svg);
  }

  function createIcons(root = document) {
    root.querySelectorAll?.('[data-lucide]').forEach(createIcon);
  }

  window.lucide = { createIcons };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => createIcons(), { once: true });
  } else {
    createIcons();
  }
})();
