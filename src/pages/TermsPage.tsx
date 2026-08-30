import { usePageTitle } from '../hooks/usePageTitle';
import { ShieldCheck, Scale, FileText, Mail, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  usePageTitle('Terms of Service & Disclaimer');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="border-b border-zinc-800 pb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-4 h-4" /> Legal Notice & Disclaimer
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Terms of Service & Content Disclaimer
        </h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
          Last updated: August 2026. Please read these terms carefully before using the WATCHD platform.
        </p>
      </div>

      {/* Critical Legal Disclaimer Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-800/40 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Non-Hosting & Third-Party Content Disclaimer</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <strong className="text-white">WATCHD does NOT host, store, upload, manage, or distribute any video files, media streams, or copyrighted content on its servers.</strong> All video playback is provided by independent, third-party embed hosting providers over which WATCHD has no ownership or control. WATCHD operates strictly as an automated media index and search engine.
        </p>
      </div>

      {/* Structured Policy Sections */}
      <div className="space-y-8">
        {/* Section 1 */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Scale className="w-5 h-5 text-red-500 shrink-0" />
            <h2>1. Service Description & Operation</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            WATCHD provides a modern interface for discovering and browsing publicly available film and television metadata. The platform indexes links and video embed frames provided by third-party services on the internet. We do not participate in the reproduction, transmission, or storage of any media files.
          </p>
        </section>

        {/* Section 2 */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <h2>2. Intellectual Property & Metadata Attribution</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            All movie titles, synopses, release dates, cast information, poster images, and promotional backdrops displayed on this platform are powered by <strong>The Movie Database (TMDB) API</strong>. This product uses the TMDB API but is not endorsed or certified by TMDB. All trademarks, registered trademarks, logos, and copyright materials remain the property of their respective owners.
          </p>
        </section>

        {/* Section 3 */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
            <h2>3. DMCA & Copyright Takedown Policy</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            WATCHD respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (17 U.S.C. § 512). If you believe that your copyrighted work is referenced or linked through our catalog without authorization, please note that we do not host the files and cannot delete them directly from third-party hosting servers.
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            However, we will promptly remove any infringing indexed links or media pages from our search catalog upon receipt of a valid notice containing:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-zinc-400 space-y-1.5 pl-2">
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>The exact URL(s) on WATCHD where the material is referenced.</li>
            <li>Your contact information (name, address, telephone number, and email).</li>
            <li>A statement made in good faith that the disputed use is not authorized by the copyright owner.</li>
            <li>A physical or electronic signature of the authorized copyright holder or representative.</li>
          </ul>

          <div className="pt-3">
            <a
              href="mailto:contact@kingori.co.ke?subject=DMCA%20Takedown%20Notice%20-%20WATCHD"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold transition"
            >
              <Mail className="w-4 h-4" /> Submit DMCA Takedown Notice
            </a>
          </div>
        </section>

        {/* Section 4 */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Scale className="w-5 h-5 text-red-500 shrink-0" />
            <h2>4. Limitation of Liability</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            In no event shall WATCHD, its creators, or affiliates be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this service, or from content accessed via third-party external links and servers.
          </p>
        </section>

        {/* Section 5 */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ExternalLink className="w-5 h-5 text-red-500 shrink-0" />
            <h2>5. Contact & Support</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            For general inquiries, legal notices, or feedback regarding these terms, please contact our administration team at: <a href="mailto:contact@kingori.co.ke" className="text-red-400 hover:underline font-semibold">contact@kingori.co.ke</a>.
          </p>
        </section>
      </div>

      {/* Back to Home Button */}
      <div className="text-center pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-white transition"
        >
          ← Return to Home Catalog
        </Link>
      </div>
    </div>
  );
}

