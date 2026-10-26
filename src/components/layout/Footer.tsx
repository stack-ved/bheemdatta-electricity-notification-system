import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { Zap, Phone, MapPin, Globe, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();
  const { isAuthenticated, loading } = useAuth();

  return (
    <footer className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-300 dark:from-slate-950 dark:via-black dark:to-black dark:text-slate-400 border-t border-slate-800/80 transition-colors pb-16 lg:pb-0 relative overflow-hidden">
      {/* Decorative subtle ambient glow in footer */}
      <div className="absolute top-0 left-1/3 w-96 h-32 bg-blue-600/5 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand & Municipal Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-base font-extrabold text-white tracking-tight">
                  {language === 'ne' ? t.appNameNepali : t.appName}
                </span>
                <p className="text-xs text-slate-400">
                  {language === 'ne' ? 'भीमदत्त नगरपालिका, कञ्चनपुर' : 'Bheemdatta Municipality, Kanchanpur'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              {t.footer.aboutSummary}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{t.footer.quickLinks}</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link to="/outages" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                  {t.nav.outages}
                </Link>
              </li>
              {!loading && isAuthenticated && (
                <li>
                  <Link to="/locations" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                    {t.nav.locations}
                  </Link>
                </li>
              )}
              <li>
                <Link to="/alerts" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                  {t.nav.alerts}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-amber-400 hover:translate-x-1 inline-block transition-all duration-150">
                  {t.nav.login}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Emergency & Electricity Contacts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{t.footer.emergencySupport}</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">{t.footer.neaHotline}</span>
                  <p className="text-[11px] text-slate-400">Toll-free 24/7 Breakdown Service</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200">{t.footer.substationPhone}</span>
                  <p className="text-[11px] text-slate-400">Bheemdatta Substation Duty Desk</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200">{t.footer.municipalityPhone}</span>
                  <p className="text-[11px] text-slate-400">Municipal Control Room</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Location & Jurisdiction */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{language === 'ne' ? 'कार्यालय ठेगाना' : 'Office & Territory'}</span>
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-medium">Bheemdatta Municipal Office</span>
                  <p className="text-[11px] text-slate-400">Mahendranagar, Kanchanpur, Sudurpashchim, Nepal</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/5">
                <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <a
                    href="https://bheemdatta.gov.np"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    bheemdatta.gov.np
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 px-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>NEA Mahendranagar DC Auth</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Bheemdatta Electricity Alert. All rights reserved.</p>
          <p className="text-center sm:text-right">{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
};
