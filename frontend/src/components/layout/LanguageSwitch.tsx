import { LOCALES, type Locale } from '../../i18n/detect'
import { useI18n } from '../../i18n'

/** Select the interface language and save the preference. */
export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n()
  const labels: Record<Locale, string> = {
    en: 'English',
    zh: '中文',
    vi: 'Tiếng Việt',
  }

  return (
    <div className="pf-nav-lang" role="group" aria-label={t('nav.language')}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'is-active' : undefined}
          aria-pressed={locale === code}
          aria-label={labels[code]}
          onClick={() => setLocale(code)}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  )
}
