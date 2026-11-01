import './globals.css';
import './components.css';
import './ui-cleanup.css';
import './curriculum-readings.css';
import './readiness-fix.css';
import './sticky-nav-fix.css';
import './footer-cleanup.css';
import './study-log-reading-dialog.css';
import './liquid-glass.css';
import './revision-redesign.css';
import './responsive-polish.css';
import './frosted-liquid-glass.css';
import DataTransfer from './components/DataTransfer';
import DynamicDateController from './components/DynamicDateController';
import MockEmptyStateEnhancer from './components/MockEmptyStateEnhancer';

export const metadata = {
  title: 'CFA Study Tracker',
  description: 'A configurable CFA exam study tracker',
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>
    <svg className="liquidGlassDefs" aria-hidden="true" focusable="false" width="0" height="0" colorInterpolationFilters="sRGB">
      <defs>
        <filter id="cfa-liquid-glass" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="2" seed="8" result="glassNoise" />
          <feDisplacementMap in="SourceGraphic" in2="glassNoise" scale="6" xChannelSelector="R" yChannelSelector="G" result="refracted" />
          <feGaussianBlur in="refracted" stdDeviation=".18" />
        </filter>
      </defs>
    </svg>
    {children}<MockEmptyStateEnhancer /><DynamicDateController /><DataTransfer />
  </body></html>;
}
