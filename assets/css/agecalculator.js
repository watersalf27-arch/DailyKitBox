/* ==========================================================================
   DailyKitBox — style.css
   Professional JPG to PDF Converter Website
   Mobile-first, Accessible (WCAG AA), Core Web Vitals Optimized
   ========================================================================== */

/* ==========================================================================
   1. CSS VARIABLES
   ========================================================================== */
:root {
  /* Colors */
  --dkb-primary: #0A192F;
  --dkb-secondary: #1E293B;
  --dkb-accent: #2563EB;
  --dkb-accent-dark: #1D4ED8;
  --dkb-success: #16A34A;
  --dkb-success-dark: #15803D;
  --dkb-danger: #DC2626;
  --dkb-danger-dark: #B91C1C;
  --dkb-warning: #F59E0B;
  --dkb-warning-dark: #D97706;
  --dkb-bg: #F8FAFC;
  --dkb-white: #FFFFFF;
  --dkb-border: #E2E8F0;
  --dkb-text: #334155;
  --dkb-text-muted: #64748B;
  --dkb-text-light: #94A3B8;

  /* Typography */
  --dkb-font: 'Inter', Arial, sans-serif;
  --dkb-fs-xs: 0.8rem;
  --dkb-fs-sm: 0.9rem;
  --dkb-fs-base: 1rem;
  --dkb-fs-md: 1.1rem;
  --dkb-fs-lg: 1.35rem;
  --dkb-fs-xl: 1.8rem;
  --dkb-fs-2xl: 2.4rem;
  --dkb-fs-3xl: 3rem;
  --dkb-lh-base: 1.7;
  --dkb-lh-tight: 1.3;

  /* Spacing */
  --dkb-space-xs: 8px;
  --dkb-space-sm: 12px;
  --dkb-space-md: 20px;
  --dkb-space-lg: 30px;
  --dkb-space-xl: 45px;
  --dkb-space-2xl: 60px;

  /* Radius & Shadow */
  --dkb-radius-sm: 8px;
  --dkb-radius: 14px;
  --dkb-radius-lg: 20px;
  --dkb-shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.06);
  --dkb-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  --dkb-shadow-lg: 0 20px 45px rgba(15, 23, 42, 0.12);

  /* Layout */
  --dkb-container-width: 1200px;
  --dkb-transition: 0.3s ease;
  --dkb-transition-fast: 0.15s ease;

  /* Focus ring */
  --dkb-focus-ring: 0 0 0 3px rgba(37, 99, 235, 0.35);
}

/* ==========================================================================
   2. RESET
   ========================================================================== */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

body {
  background: var(--dkb-bg);
  color: var(--dkb-text);
  font-family: var(--dkb-font);
  font-size: var(--dkb-fs-base);
  line-height: var(--dkb-lh-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  text-rendering: optimizeSpeed;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
  border-style: none;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
}

button {
  cursor: pointer;
}

a {
  text-decoration: none;
  color: var(--dkb-accent);
  transition: color var(--dkb-transition-fast);
}

a:hover {
  color: var(--dkb-accent-dark);
  text-decoration: underline;
}

ul,
ol {
  padding-left: 22px;
  list-style-position: outside;
}

h1, h2, h3, h4, h5, h6 {
  line-height: var(--dkb-lh-tight);
  font-weight: 700;
  color: var(--dkb-primary);
}

p {
  margin-bottom: var(--dkb-space-sm);
}

p:last-child {
  margin-bottom: 0;
}

/* ==========================================================================
   3. FOCUS STYLES / ACCESSIBILITY
   ========================================================================== */
:focus {
  outline: none;
}

:focus-visible {
  outline: 3px solid var(--dkb-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus-visible,
.dkb-btn:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  box-shadow: var(--dkb-focus-ring);
  outline: 2px solid var(--dkb-accent);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Text selection color */
::selection {
  background: var(--dkb-accent);
  color: var(--dkb-white);
}

::-moz-selection {
  background: var(--dkb-accent);
  color: var(--dkb-white);
}

/* ==========================================================================
   4. SCROLLBAR STYLING
   ========================================================================== */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--dkb-accent) var(--dkb-bg);
}

*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: var(--dkb-bg);
}

*::-webkit-scrollbar-thumb {
  background: var(--dkb-text-light);
  border-radius: 999px;
  border: 2px solid var(--dkb-bg);
}

*::-webkit-scrollbar-thumb:hover {
  background: var(--dkb-accent);
}

/* ==========================================================================
   5. LAYOUT / CONTAINER
   ========================================================================== */
.dkb-container {
  width: min(100%, var(--dkb-container-width));
  margin: 0 auto;
  padding: 0 var(--dkb-space-md);
}

.dkb-main {
  padding: var(--dkb-space-lg) 0;
}

/* ==========================================================================
   6. HEADER
   ========================================================================== */
.dkb-header {
  background: linear-gradient(135deg, var(--dkb-primary), var(--dkb-secondary));
  padding: var(--dkb-space-xl) var(--dkb-space-md);
  text-align: center;
  color: var(--dkb-white);
  position: relative;
  overflow: hidden;
}

.dkb-header::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.25), transparent 55%);
  pointer-events: none;
}

.dkb-title {
  font-size: clamp(2rem, 4vw, var(--dkb-fs-3xl));
  font-weight: 800;
  margin-bottom: var(--dkb-space-sm);
  color: var(--dkb-white);
  position: relative;
  letter-spacing: -0.02em;
}

.dkb-subtitle {
  max-width: 760px;
  margin: 0 auto;
  font-size: var(--dkb-fs-md);
  opacity: 0.95;
  position: relative;
  color: var(--dkb-white);
}

/* ==========================================================================
   7. SECTION CARDS (shared style)
   ========================================================================== */
.dkb-tool-section,
.dkb-preview-section,
.dkb-progress-section,
.dkb-convert-section,
.dkb-info-section,
.dkb-features-section,
.dkb-howto-section,
.dkb-seo-section,
.dkb-faq-section {
  background: var(--dkb-white);
  border: 1px solid var(--dkb-border);
  border-radius: var(--dkb-radius);
  box-shadow: var(--dkb-shadow);
  padding: var(--dkb-space-md);
  margin-bottom: var(--dkb-space-md);
  transition: box-shadow var(--dkb-transition);
}

.dkb-tool-section:hover,
.dkb-preview-section:hover,
.dkb-info-section:hover,
.dkb-features-section:hover {
  box-shadow: var(--dkb-shadow-lg);
}

.dkb-section-title {
  font-size: var(--dkb-fs-xl);
  color: var(--dkb-primary);
  margin-bottom: var(--dkb-space-md);
  font-weight: 700;
}

/* ==========================================================================
   8. UPLOAD AREA
   ========================================================================== */
.dkb-upload-area {
  border: 3px dashed var(--dkb-accent);
  border-radius: var(--dkb-radius);
  padding: var(--dkb-space-xl) var(--dkb-space-md);
  text-align: center;
  background: #F8FBFF;
  transition: background var(--dkb-transition), border-color var(--dkb-transition), transform var(--dkb-transition);
  cursor: pointer;
}

.dkb-upload-area:hover {
  background: #EEF6FF;
  border-color: var(--dkb-accent-dark);
  transform: translateY(-2px);
}

.dkb-upload-area.dragover {
  border-color: var(--dkb-success);
  background: #ECFDF5;
  transform: scale(1.01);
}

.dkb-upload-icon {
  font-size: 64px;
  margin-bottom: var(--dkb-space-sm);
  animation: dkbFloat 3s ease-in-out infinite;
}

.dkb-upload-area h2 {
  font-size: var(--dkb-fs-xl);
  color: var(--dkb-primary);
  margin-bottom: var(--dkb-space-xs);
}

.dkb-upload-area p {
  margin-bottom: var(--dkb-space-xs);
}

.dkb-upload-note {
  font-size: var(--dkb-fs-sm);
  color: var(--dkb-text-muted);
}

/* ==========================================================================
   9. BUTTONS
   ========================================================================== */
.dkb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: var(--dkb-fs-base);
  background: var(--dkb-white);
  color: var(--dkb-primary);
  border: 1px solid var(--dkb-border);
  transition: transform var(--dkb-transition-fast), box-shadow var(--dkb-transition), background var(--dkb-transition);
}

.dkb-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--dkb-shadow-sm);
}

.dkb-btn:active {
  transform: scale(0.98);
}

.dkb-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.dkb-btn-primary {
  background: var(--dkb-primary);
  color: var(--dkb-white);
  border-color: var(--dkb-primary);
}

.dkb-btn-primary:hover {
  background: #13294B;
}

.dkb-btn-success {
  background: var(--dkb-success);
  color: var(--dkb-white);
  border-color: var(--dkb-success);
}

.dkb-btn-success:hover {
  background: var(--dkb-success-dark);
}

/* ==========================================================================
   10. FORM ELEMENTS
   ========================================================================== */
input,
select,
textarea {
  padding: 12px;
  border: 1px solid var(--dkb-border);
  border-radius: 10px;
  background: var(--dkb-white);
  outline: none;
  width: 100%;
  transition: border-color var(--dkb-transition-fast), box-shadow var(--dkb-transition-fast);
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--dkb-accent);
  box-shadow: var(--dkb-focus-ring);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

select {
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' stroke='%23334155' stroke-width='2' fill='none' fill-rule='evenodd'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

/* ==========================================================================
   11. TOOLBAR
   ========================================================================== */
.dkb-toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--dkb-space-sm);
  margin: var(--dkb-space-md) 0;
}

.dkb-toolbar-item {
  background: var(--dkb-bg);
  border: 1px solid var(--dkb-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: transform var(--dkb-transition-fast);
}

.dkb-toolbar-item:hover {
  transform: translateY(-2px);
}

.dkb-toolbar-item span {
  display: block;
  font-size: var(--dkb-fs-sm);
  color: var(--dkb-text-muted);
  margin-bottom: 6px;
}

.dkb-toolbar-item strong {
  display: block;
  font-size: var(--dkb-fs-lg);
  color: var(--dkb-primary);
  font-weight: 800;
}

/* ==========================================================================
   12. IMAGE PREVIEW / CARDS
   ========================================================================== */
.dkb-image-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--dkb-space-sm);
  margin: var(--dkb-space-md) 0;
}

.dkb-image-card {
  background: var(--dkb-white);
  border: 1px solid var(--dkb-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--dkb-shadow-sm);
  transition: transform var(--dkb-transition), box-shadow var(--dkb-transition), border-color var(--dkb-transition-fast);
  cursor: pointer;
  animation: dkbFadeIn 0.35s ease both;
}

.dkb-image-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--dkb-shadow);
}

.dkb-image-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  transition: transform var(--dkb-transition);
}

.dkb-image-card.selected {
  border: 2px solid var(--dkb-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

.dkb-image-card.rotate90 img {
  transform: rotate(90deg);
}

.dkb-image-card.rotate180 img {
  transform: rotate(180deg);
}

.dkb-image-card.rotate270 img {
  transform: rotate(270deg);
}

.dkb-image-info {
  padding: 10px 12px;
  text-align: center;
  font-size: var(--dkb-fs-sm);
  color: var(--dkb-text);
  border-top: 1px solid var(--dkb-border);
}

/* ==========================================================================
   13. ACTION GRID
   ========================================================================== */
.dkb-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--dkb-space-sm);
  margin-top: var(--dkb-space-md);
}

/* ==========================================================================
   14. PROGRESS BAR
   ========================================================================== */
.dkb-progress {
  width: 100%;
  height: 14px;
  background: var(--dkb-border);
  border-radius: 999px;
  overflow: hidden;
  margin: var(--dkb-space-sm) 0;
}

.dkb-progress-bar {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, var(--dkb-accent), var(--dkb-success));
  background-size: 200% 100%;
  transition: width 0.3s ease;
  animation: dkbProgressShine 2s linear infinite;
  border-radius: 999px;
}

#progressText {
  text-align: center;
  font-weight: 700;
  margin-top: var(--dkb-space-xs);
  color: var(--dkb-primary);
}

#liveStatus {
  text-align: center;
  font-weight: 600;
  margin-top: 6px;
  color: var(--dkb-text-muted);
}

/* ==========================================================================
   15. SETTINGS GRID
   ========================================================================== */
.dkb-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--dkb-space-sm);
}

.dkb-settings-grid label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  font-size: var(--dkb-fs-sm);
  color: var(--dkb-primary);
}

.dkb-settings-grid input,
.dkb-settings-grid select {
  margin-top: var(--dkb-space-xs);
}

.dkb-settings-grid input:focus,
.dkb-settings-grid select:focus {
  border-color: var(--dkb-accent);
  box-shadow: var(--dkb-focus-ring);
}

/* ==========================================================================
   16. FEATURES GRID
   ========================================================================== */
.dkb-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--dkb-space-sm);
  margin-top: var(--dkb-space-md);
}

.dkb-feature-card {
  background: var(--dkb-bg);
  border: 1px solid var(--dkb-border);
  border-radius: 12px;
  padding: 16px;
  font-weight: 600;
  transition: transform var(--dkb-transition), box-shadow var(--dkb-transition), border-color var(--dkb-transition-fast);
}

.dkb-feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--dkb-shadow-sm);
  border-color: var(--dkb-accent);
}

/* ==========================================================================
   17. HOW-TO SECTION
   ========================================================================== */
.dkb-howto-section ol li {
  margin-bottom: var(--dkb-space-sm);
  padding-left: 6px;
}

.dkb-howto-section ol li::marker {
  color: var(--dkb-accent);
  font-weight: 700;
}

/* ==========================================================================
   18. SEO SECTION
   ========================================================================== */
.dkb-seo-section p {
  line-height: 1.8;
  color: var(--dkb-text);
}

/* ==========================================================================
   19. FAQ SECTION
   ========================================================================== */
.dkb-faq-item {
  padding: var(--dkb-space-sm) 0;
  border-bottom: 1px solid var(--dkb-border);
}

.dkb-faq-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.dkb-faq-item h3 {
  margin-bottom: var(--dkb-space-xs);
  color: var(--dkb-primary);
  font-size: var(--dkb-fs-md);
}

/* ==========================================================================
   20. FOOTER
   ========================================================================== */
.dkb-footer {
  background: var(--dkb-primary);
  color: var(--dkb-white);
  text-align: center;
  padding: var(--dkb-space-lg) var(--dkb-space-md);
  border-radius: var(--dkb-radius);
  margin-top: var(--dkb-space-lg);
}

.dkb-footer a {
  color: var(--dkb-white);
  opacity: 0.85;
}

.dkb-footer a:hover {
  opacity: 1;
}

/* ==========================================================================
   21. DIVIDER & BADGE
   ========================================================================== */
.dkb-divider {
  height: 1px;
  background: var(--dkb-border);
  margin: var(--dkb-space-md) 0;
  border: none;
}

.dkb-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--dkb-accent);
  color: var(--dkb-white);
  font-size: var(--dkb-fs-xs);
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* ==========================================================================
   22. UTILITY CLASSES
   ========================================================================== */
.dkb-hidden {
  display: none !important;
}

.dkb-show {
  display: block !important;
}

.dkb-loading {
  pointer-events: none;
  opacity: 0.7;
  position: relative;
}

.dkb-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  border-radius: inherit;
}

.dkb-success-text {
  color: var(--dkb-success);
  font-weight: 600;
}

.dkb-error-text {
  color: var(--dkb-danger);
  font-weight: 600;
}

.dkb-warning-text {
  color: var(--dkb-warning);
  font-weight: 600;
}

.dkb-text-center {
  text-align: center;
}

.dkb-mt-20 {
  margin-top: 20px;
}

.dkb-mb-20 {
  margin-bottom: 20px;
}

/* ==========================================================================
   23. ANIMATIONS
   ========================================================================== */
@keyframes dkbFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dkbScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes dkbFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes dkbProgressShine {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

@keyframes dkbSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ==========================================================================
   24. RESPONSIVE BREAKPOINTS (Mobile-first overrides for larger screens)
   ========================================================================== */

/* ---- 480px and up ---- */
@media (min-width: 480px) {
  .dkb-header {
    padding: var(--dkb-space-xl) var(--dkb-space-md);
  }

  .dkb-upload-icon {
    font-size: 56px;
  }
}

/* ---- 768px and up ---- */
@media (min-width: 768px) {
  .dkb-container {
    padding: 0 var(--dkb-space-lg);
  }

  .dkb-toolbar,
  .dkb-action-grid,
  .dkb-settings-grid,
  .dkb-features-grid,
  .dkb-image-preview {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .dkb-btn {
    width: auto;
  }

  .dkb-upload-area h2 {
    font-size: 1.6rem;
  }
}