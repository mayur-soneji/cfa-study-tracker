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
import DataTransfer from './components/DataTransfer';
import DynamicDateController from './components/DynamicDateController';
import MockEmptyStateEnhancer from './components/MockEmptyStateEnhancer';

export const metadata = {
  title: 'CFA Study Tracker',
  description: 'A configurable CFA exam study tracker',
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<MockEmptyStateEnhancer /><DynamicDateController /><DataTransfer /></body></html>;
}
