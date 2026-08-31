import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { WatchHistoryProvider } from './context/WatchHistoryContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdTipBanner from './components/AdTipBanner';
import SupportModal, { openSupportModal } from './components/SupportModal';
import InstallAppPrompt from './components/InstallAppPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import ExplorePage from './pages/ExplorePage';
import WatchPage from './pages/WatchPage';
import WatchlistPage from './pages/WatchlistPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WatchlistProvider>
          <WatchHistoryProvider>
            <Router>
              <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-red-600 selection:text-white">
                {/* Navigation Bar */}
                <Navbar />

                {/* Real-Time Network Offline & Reconnect Monitor */}
                <OfflineIndicator />

                {/* Social Auth Modal (Google, Facebook, Email) */}
                <AuthModal />

                {/* Live M-Pesa & Card Support / Tip Modal */}
                <SupportModal />

                {/* Smart Mobile PWA Install App Prompt Banner */}
                <InstallAppPrompt />

                {/* Pro-Tip Ad blocker guidance banner */}
                <AdTipBanner />

                {/* Main Routes */}
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movies" element={<MoviesPage />} />
                    <Route path="/series" element={<SeriesPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/watch/:type/:id" element={<WatchPage />} />
                    <Route path="/watch/:type/:id/:season/:episode" element={<WatchPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/dmca" element={<TermsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>

                {/* Global Footer */}
                <footer className="bg-zinc-950 border-t border-zinc-900 py-10 text-xs text-zinc-500 space-y-4">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-300">WATC<span className="text-red-500 font-bold">HD</span></span>
                      <span>— Modern Movie &amp; Series Streaming Platform</span>
                    </div>

                    {/* Legal, Support & Compliance Links */}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-400">
                      <button
                        onClick={openSupportModal}
                        className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>☕ Support Platform</span>
                      </button>
                      <span>•</span>
                      <Link to="/terms" className="hover:text-red-400 transition">
                        Terms of Service
                      </Link>
                      <span>•</span>
                      <Link to="/dmca" className="hover:text-red-400 transition">
                        DMCA Disclaimer
                      </Link>
                      <span>•</span>
                      <a href="mailto:contact@kingori.co.ke" className="hover:text-red-400 transition">
                        Contact Us
                      </a>
                    </div>
                  </div>

                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-zinc-600 text-[11px] leading-relaxed">
                    Disclaimer: WATCHD does not host or store any media files on its servers. All video streams and metadata are provided by independent third-party sources and TMDB.
                  </div>
                </footer>
              </div>
            </Router>
          </WatchHistoryProvider>
        </WatchlistProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
