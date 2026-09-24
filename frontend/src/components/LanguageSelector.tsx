import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, SupportedLanguage } from '../services/i18n';

export function LanguageSelector() {
  const { currentLang, setLang, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentInfo = languages.find((l) => l.code === currentLang) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLang(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)] hover:border-amber-400/50 text-xs text-[var(--text-primary)] transition-all focus:outline-none"
        title="Select Language / Seleccionar Idioma"
      >
        <span className="text-sm leading-none">{currentInfo.flag}</span>
        <span className="font-semibold hidden sm:inline">{currentInfo.nativeName}</span>
        <span className="font-mono sm:hidden">{currentInfo.code.toUpperCase()}</span>
        <ChevronDown size={12} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl backdrop-blur-md z-50 py-1.5 overflow-hidden fade-up">
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] flex items-center gap-1.5">
            <Globe size={11} className="text-amber-500" />
            <span>Language / Idioma</span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {languages.map((lang) => {
              const isActive = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{lang.nativeName}</span>
                      <span className={`text-[10px] ${isActive ? 'text-black/70' : 'text-slate-400'}`}>
                        {lang.name}
                      </span>
                    </div>
                  </div>
                  {isActive && <Check size={14} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
