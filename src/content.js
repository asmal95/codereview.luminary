'use strict';

import './styles.css';
import { FloatingReviewWindow } from './windows/FloatingReviewWindow.js';
import { FloatingExplainWindow } from './windows/FloatingExplainWindow.js';

// Singleton instances
const windowInstances = {
  review: null,
  explain: null
};

console.log('[CS] Content script loaded on:', window.location.href);

/**
 * Get or create window instance (singleton factory)
 */
function getWindowInstance(type, WindowClass) {
  // If instance exists but DOM was removed, recreate
  if (windowInstances[type] && !windowInstances[type].exists()) {
    console.log(`[CS] ${type} window DOM was removed, recreating`);
    windowInstances[type] = null;
  }
  
  // Create new instance if needed
  if (!windowInstances[type]) {
    console.log(`[CS] Creating new ${type} window instance`);
    windowInstances[type] = new WindowClass();
  }
  
  return windowInstances[type];
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'toggleFloatingWindow') {
    console.log('[CS] Toggle review window requested');
    const window = getWindowInstance('review', FloatingReviewWindow);
    window.toggle();
  } else if (request.action === 'explainText') {
    console.log('[CS] Explain text requested, text length:', request.text?.length);
    const window = getWindowInstance('explain', FloatingExplainWindow);
    window.show(request.text);
  }
  return true;
});

// Handle window resize - adjust positions if they go out of bounds
window.addEventListener('resize', () => {
  Object.values(windowInstances).forEach(instance => {
    if (instance && instance.exists() && instance.window.style.display !== 'none') {
      const rect = instance.window.getBoundingClientRect();
      const safe = instance.ensureWindowInBounds(rect);
      Object.assign(instance.window.style, {
        left: `${safe.left}px`,
        top: `${safe.top}px`,
        width: `${safe.width}px`,
        height: `${safe.height}px`
      });
    }
  });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  Object.values(windowInstances).forEach(instance => {
    if (instance) instance.destroy();
  });
});
