/**
 * Level Up - Website Accessibility Services
 * Main JavaScript
 *
 * ACCESSIBILITY FEATURES:
 * - Focus trap for mobile menu (keyboard users don't escape)
 * - ARIA attribute management for menus and modals
 * - Scroll-based animations that respect prefers-reduced-motion
 * - Form validation with live ARIA error announcements
 * - Skip link focus management
 * - Keyboard-accessible sticky CTA dismissal
 */

'use strict';

/* ============================================
   UTILITY: Check reduced motion preference
   ============================================ */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================
   UTILITY: Announce to screen readers
   Uses a live region for dynamic announcements
   ============================================ */
let announcer = null;

function announce(message, assertive = false) {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.id = 'sr-announcer';
    document.body.appendChild(announcer);
  }
  announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  // Clear first so repeated messages are re-read
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/* ============================================
   HEADER: Scroll-based styling + active state
   ============================================ */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    const scrolled = window.scrollY > 20;
    header.classList.toggle('scrolled', scrolled);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run on init
}

/* ============================================
   MOBILE MENU
   ACCESSIBILITY:
   - aria-expanded reflects state
   - Focus trap keeps keyboard users inside menu
   - Escape key closes menu
   - Focus returns to toggle on close
   ============================================ */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('mobile-nav');
  if (!toggle || !nav) return;

  let isOpen = false;

  // Get all focusable elements in the nav
  const getFocusables = () =>
    Array.from(
      nav.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));

  const openMenu = () => {
    isOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    nav.classList.add('is-open');
    nav.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    // Move focus into the nav
    const firstFocusable = getFocusables()[0];
    if (firstFocusable) firstFocusable.focus();
    announce('Navigation menu opened');
  };

  const closeMenu = () => {
    isOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    nav.classList.remove('is-open');
    nav.setAttribute('hidden', '');
    document.body.style.overflow = '';
    toggle.focus(); // Return focus
    announce('Navigation menu closed');
  };

  toggle.addEventListener('click', () => {
    isOpen ? closeMenu() : openMenu();
  });

  // Escape key closes menu
  document.addEventListener('keydown', (e) => {
    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  });

  // Focus trap: Tab cycles within nav when open
  nav.addEventListener('keydown', (e) => {
    if (!isOpen || e.key !== 'Tab') return;
    const focusables = getFocusables();
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Close on nav link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !nav.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  // Set initial state
  toggle.setAttribute('aria-expanded', 'false');
  nav.setAttribute('hidden', '');
}

/* ============================================
   SMOOTH SCROLL: For anchor links
   ACCESSIBILITY: Manages focus after scroll
   ============================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      if (!prefersReducedMotion()) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        target.scrollIntoView({ block: 'start' });
      }

      // Move focus to target for keyboard/screen reader users
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    });
  });
}

/* ============================================
   SCROLL ANIMATIONS
   ACCESSIBILITY: Skipped for reduced-motion users
   Uses IntersectionObserver for performance
   ============================================ */
function initScrollAnimations() {
  if (prefersReducedMotion()) {
    // Make all animated elements visible without animation
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Only animate once
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

/* ============================================
   METRIC BARS ANIMATION
   Animates the score bars in hero card
   ============================================ */
function initMetricBars() {
  if (prefersReducedMotion()) return;

  const bars = document.querySelectorAll('.metric-bar[data-width]');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const targetWidth = bar.getAttribute('data-width');
          setTimeout(() => {
            bar.style.width = targetWidth;
          }, 200);
          observer.unobserve(bar);
        }
      });
    },
    { threshold: 0.3 }
  );

  bars.forEach(bar => {
    bar.style.width = '0%';
    observer.observe(bar);
  });
}

/* ============================================
   STICKY CTA BAR
   ACCESSIBILITY: Keyboard-dismissible, ARIA-labeled
   ============================================ */
function initStickyCTA() {
  const ctaBar = document.getElementById('sticky-cta');
  const closeBtn = document.getElementById('sticky-cta-close');
  const DISMISS_KEY = 'levelup_sticky_dismissed';

  if (!ctaBar) return;

  // Check if dismissed this session
  if (sessionStorage.getItem(DISMISS_KEY)) return;

  let ctaVisible = false;

  const showCTA = () => {
    if (ctaVisible) return;
    ctaVisible = true;
    ctaBar.classList.add('is-visible');
    ctaBar.removeAttribute('hidden');
    announce('Free accessibility audit offer available at bottom of page');
  };

  const hideCTA = () => {
    ctaBar.classList.remove('is-visible');
    ctaBar.setAttribute('hidden', '');
    sessionStorage.setItem(DISMISS_KEY, '1');
    ctaVisible = false;
  };

  // Show after scrolling 40% of page
  const onScroll = () => {
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrollPercent > 0.4) showCTA();
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  if (closeBtn) {
    closeBtn.addEventListener('click', hideCTA);
    closeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hideCTA();
      }
    });
  }

  // Initial state
  ctaBar.setAttribute('hidden', '');
}

/* ============================================
   CONTACT FORM VALIDATION
   ACCESSIBILITY:
   - aria-required on required fields
   - aria-invalid set on error
   - aria-describedby links field to error message
   - Error announced via live region
   - Success/error status in aria-live region
   ============================================ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('form-status');

  // Validation rules
  const validators = {
    name: {
      test: (v) => v.trim().length >= 2,
      message: 'Please enter your full name (at least 2 characters).'
    },
    email: {
      test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      message: 'Please enter a valid email address (e.g. you@example.com).'
    },
    phone: {
      test: (v) => v.trim() === '' || /^[\+]?[\d\s\-\(\)]{7,15}$/.test(v.trim()),
      message: 'Please enter a valid phone number or leave blank.'
    },
    service: {
      test: (v) => v !== '',
      message: 'Please select a service you are interested in.'
    },
    message: {
      test: (v) => v.trim().length >= 10,
      message: 'Please describe your needs (at least 10 characters).'
    },
    consent: {
      test: (v) => v,
      message: 'Please agree to being contacted before submitting.'
    }
  };

  function getField(name) {
    return form.querySelector(`[name="${name}"]`);
  }

  function getErrorEl(name) {
    return form.querySelector(`#error-${name}`);
  }

  function setError(name, show, message) {
    const field = getField(name);
    const errorEl = getErrorEl(name);
    if (!field || !errorEl) return;

    if (show) {
      field.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    } else {
      field.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }
  }

  function validateField(name) {
    const field = getField(name);
    if (!field) return true;

    const value = name === 'consent' ? field.checked : field.value;
    const rule = validators[name];
    if (!rule) return true;

    const valid = rule.test(value);
    setError(name, !valid, rule.message);
    return valid;
  }

  // Live validation on blur
  Object.keys(validators).forEach(name => {
    const field = getField(name);
    if (field) {
      field.addEventListener('blur', () => validateField(name));
      field.addEventListener('input', () => {
        // Clear error as user types
        if (field.getAttribute('aria-invalid') === 'true') {
          validateField(name);
        }
      });
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    const results = Object.keys(validators).map(name => validateField(name));
    const allValid = results.every(Boolean);

    if (!allValid) {
      // Focus first invalid field
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();

      announce(
        'There are errors in the form. Please review and correct them before submitting.',
        true
      );
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    announce('Submitting your request, please wait…');

    // Simulate form submission (replace with real endpoint)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success
      showFormStatus(
        'success',
        '✅ Message sent! We\'ll be in touch within 24 hours for your free audit.'
      );
      form.reset();
      announce(
        'Form submitted successfully. We will contact you within 24 hours.',
        true
      );
    } catch (err) {
      showFormStatus(
        'error',
        '❌ Something went wrong. Please try again or email us directly at LevelUpwcag@gmail.com'
      );
      announce('Form submission failed. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  function showFormStatus(type, message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `form-status form-status--${type} is-visible`;
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('tabindex', '-1');
    statusEl.focus();
  }
}

/* ============================================
   ACTIVE NAV LINK
   Highlights nav item based on scroll position
   ============================================ */
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.primary-nav a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
            if (isActive) {
              link.removeAttribute('aria-current');
              link.setAttribute('aria-current', 'page');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    },
    { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
  );

  sections.forEach(section => observer.observe(section));
}

/* ============================================
   COUNTER ANIMATION
   Animates numeric statistics on scroll
   ============================================ */
function initCounters() {
  if (prefersReducedMotion()) return;

  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-counter'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1500;
        const start = performance.now();

        const update = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ============================================
   INIT: Run all modules on DOMContentLoaded
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initSmoothScroll();
  initScrollAnimations();
  initMetricBars();
  initStickyCTA();
  initContactForm();
  initActiveNav();
  initCounters();

  // Log for developers
  console.log(
    '%cLevel Up Accessibility - WCAG 2.2 AA Compliant Website',
    'color: #1245b8; font-weight: bold; font-size: 14px;'
  );
  console.log(
    '%cAccessibility features: Skip link, ARIA, focus management, reduced motion support, form validation',
    'color: #e85d04; font-size: 12px;'
  );
});
