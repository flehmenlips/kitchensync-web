/**
 * KitchenSync Reservation Widget
 *
 * Embed this script on any website to add a reservation booking widget.
 *
 * Usage:
 * <div id="kitchensync-reservations"></div>
 * <script src="https://[YOUR_DOMAIN]/widget/reservations.js"
 *         data-business-slug="coq-au-vin-j7t0"
 *         data-theme="light"
 *         data-accent-color="#8B4513">
 * </script>
 */

(function() {
  'use strict';

  // Get script element and configuration
  const script = document.currentScript;
  const businessSlug = script.getAttribute('data-business-slug');
  const theme = script.getAttribute('data-theme') || 'light';
  const accentColor = script.getAttribute('data-accent-color') || '#8B4513';
  const containerId = script.getAttribute('data-container') || 'kitchensync-reservations';
  const buttonOnly = script.getAttribute('data-button-only') === 'true';
  const buttonText = script.getAttribute('data-button-text') || 'Book a Table';

  // Base URL for the reservation system
  const BASE_URL = script.src.replace('/widget/reservations.js', '');

  if (!businessSlug) {
    console.error('KitchenSync Widget: data-business-slug is required');
    return;
  }

  // Styles for the widget
  const styles = `
    .ks-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .ks-reservation-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      background-color: ${accentColor};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .ks-reservation-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      filter: brightness(1.1);
    }

    .ks-reservation-button:active {
      transform: translateY(0);
    }

    .ks-reservation-button svg {
      width: 20px;
      height: 20px;
    }

    .ks-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .ks-modal-overlay.ks-visible {
      opacity: 1;
      visibility: visible;
    }

    .ks-modal-content {
      position: relative;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      transform: scale(0.95) translateY(20px);
      transition: all 0.3s ease;
    }

    .ks-modal-overlay.ks-visible .ks-modal-content {
      transform: scale(1) translateY(0);
    }

    .ks-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      transition: background 0.2s ease;
    }

    .ks-modal-close:hover {
      background: ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    }

    .ks-modal-close svg {
      width: 18px;
      height: 18px;
      color: ${theme === 'dark' ? '#ffffff' : '#333333'};
    }

    .ks-iframe {
      width: 100%;
      height: 600px;
      border: none;
    }

    .ks-inline-widget {
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .ks-inline-widget iframe {
      width: 100%;
      height: 700px;
      border: none;
    }

    .ks-powered-by {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: ${theme === 'dark' ? '#888' : '#666'};
      background: ${theme === 'dark' ? '#111' : '#f9f9f9'};
    }

    .ks-powered-by a {
      color: ${accentColor};
      text-decoration: none;
    }

    .ks-powered-by a:hover {
      text-decoration: underline;
    }

    @media (max-width: 520px) {
      .ks-modal-content {
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
      }

      .ks-iframe {
        height: 100vh;
      }
    }
  `;

  // Calendar icon SVG
  const calendarIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  `;

  // Close icon SVG
  const closeIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Get the container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`KitchenSync Widget: Container #${containerId} not found`);
    return;
  }

  container.classList.add('ks-widget-container');

  // Build the reservation URL
  const reservationUrl = `${BASE_URL}/reserve/${businessSlug}?embed=true&theme=${theme}&accent=${encodeURIComponent(accentColor)}`;

  if (buttonOnly) {
    // Render just a button that opens a modal
    const button = document.createElement('button');
    button.className = 'ks-reservation-button';
    button.innerHTML = `${calendarIcon} ${buttonText}`;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'ks-modal-overlay';
    modal.innerHTML = `
      <div class="ks-modal-content">
        <button class="ks-modal-close">${closeIcon}</button>
        <iframe class="ks-iframe" src="" title="Make a Reservation"></iframe>
        <div class="ks-powered-by">Powered by <a href="https://kitchensync.app" target="_blank">KitchenSync</a></div>
      </div>
    `;

    // Event handlers
    button.addEventListener('click', () => {
      const iframe = modal.querySelector('iframe');
      if (iframe && !iframe.src) {
        iframe.src = reservationUrl;
      }
      modal.classList.add('ks-visible');
      document.body.style.overflow = 'hidden';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.ks-modal-close')) {
        modal.classList.remove('ks-visible');
        document.body.style.overflow = '';
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('ks-visible')) {
        modal.classList.remove('ks-visible');
        document.body.style.overflow = '';
      }
    });

    container.appendChild(button);
    document.body.appendChild(modal);
  } else {
    // Render inline widget
    const widget = document.createElement('div');
    widget.className = 'ks-inline-widget';
    widget.innerHTML = `
      <iframe src="${reservationUrl}" title="Make a Reservation"></iframe>
      <div class="ks-powered-by">Powered by <a href="https://kitchensync.app" target="_blank">KitchenSync</a></div>
    `;
    container.appendChild(widget);
  }

  // Listen for messages from iframe (e.g., successful booking)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'kitchensync-reservation') {
      if (event.data.action === 'close') {
        const modal = document.querySelector('.ks-modal-overlay');
        if (modal) {
          modal.classList.remove('ks-visible');
          document.body.style.overflow = '';
        }
      }

      if (event.data.action === 'success') {
        // Dispatch custom event for the host page to handle
        const customEvent = new CustomEvent('kitchensync:reservation', {
          detail: event.data.reservation
        });
        window.dispatchEvent(customEvent);
      }

      if (event.data.action === 'resize') {
        const iframe = document.querySelector('.ks-iframe, .ks-inline-widget iframe');
        if (iframe && event.data.height) {
          iframe.style.height = event.data.height + 'px';
        }
      }
    }
  });

})();
