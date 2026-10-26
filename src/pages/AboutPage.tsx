import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Zap,
  ShieldCheck,
  Phone,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';


export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-12 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 text-blue-900 dark:bg-blue-950/90 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-amber-400" />
          <span>{language === 'ne' ? 'सार्वजनिक नागरिक सेवा' : 'Official Public Service Portal'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.aboutPage.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          {t.aboutPage.tagline}
        </p>
      </div>

      {/* Mission & Purpose Card */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-10 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'ne' ? 'उद्देश्य तथा कार्यक्षेत्र' : 'Platform Mission & Objective'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bheemdatta Municipality • Sudurpashchim Province, Nepal
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          <p>{t.aboutPage.body1}</p>
          <p>{t.aboutPage.body2}</p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{t.aboutPage.feat1Title}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.aboutPage.feat1Desc}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>{t.aboutPage.feat2Title}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.aboutPage.feat2Desc}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-amber-500" />
              <span>{t.aboutPage.feat3Title}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.aboutPage.feat3Desc}
            </p>
          </div>
        </div>
      </div>

      {/* Official Contacts Section */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          <span>{t.aboutPage.contactsTitle}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* NEA Distribution Center */}
          <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-slate-850 border border-blue-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-amber-400">
              Technical Authority
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.aboutPage.neaOffice}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t.aboutPage.neaAddress}
            </p>
            <p className="text-xs font-bold text-blue-900 dark:text-amber-400 pt-1">
              {t.aboutPage.neaPhone}
            </p>
          </div>

          {/* Bheemdatta Municipality */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Local Government
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.aboutPage.bheemdattaMuni}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Mahendranagar, Kanchanpur
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 pt-1">
              {t.aboutPage.muniPhone}
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          <span>{t.aboutPage.faqTitle}</span>
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Q: {t.aboutPage.faq1Q}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {t.aboutPage.faq1A}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Q: {t.aboutPage.faq2Q}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {t.aboutPage.faq2A}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
