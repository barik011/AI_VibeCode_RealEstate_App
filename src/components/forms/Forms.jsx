import { useLanguage, useFormValidation } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import { visitorService } from '../../services/visitorService';
import { isSupabase } from '../../services/supabase/client';
import { Button, useToast } from '../ui';
import { inquiryService } from '../../services/inquiryService';
export function NewsletterForm() {
  const validation = useFormValidation();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const notify = useToast();
  const [pending, setPending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    try {
      await visitorService.subscribe(email);
      setDone(true);
      notify(
        isSupabase
          ? 'Your newsletter preference has been saved.'
          : 'Your newsletter preference is saved in this demo.',
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="newsletter" onSubmit={submit} {...validation}>
      <label htmlFor="newsletter-email">{t('Subscribe to our newsletter')}</label>
      <p>{t('A little inspiration. A world of possibilities.')}</p>
      <div>
        <input
          id="newsletter-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          placeholder={t('Your email address')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setDone(false);
          }}
        />
        <button disabled={pending} aria-label={t('Subscribe to newsletter')}>
          {done ? <CheckCircle2 size={19} /> : <ArrowRight size={20} />}
        </button>
      </div>
      {done && (
        <small role="status">
          {t(
            isSupabase
              ? 'Your newsletter preference has been saved.'
              : 'Saved locally. No emails are sent in this demo.',
          )}
        </small>
      )}
    </form>
  );
}
export function ContactForm({ property, expert = false, preferredLocation = '' }) {
  const validation = useFormValidation();
  const { t } = useLanguage();
  const { locations } = useCatalog();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [messageDraft, setMessageDraft] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    setError('');
    try {
      await inquiryService.submit(data, property);
      setDone(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  };
  if (done)
    return (
      <div className="form-success" role="status">
        <CheckCircle2 size={38} />
        <h3>{t('A new beginning starts here.')}</h3>
        <p>
          {t('Thank you. Your property inquiry has been received.')}
          {t(' ')}
          {t(
            isSupabase
              ? 'Our team can now review your inquiry.'
              : 'No message has been sent to an advisor.',
          )}
        </p>
        <Button onClick={() => setDone(false)} arrow={false}>
          {t('Make another inquiry')}
        </Button>
      </div>
    );
  return (
    <form className="contact-form" onSubmit={submit} {...validation}>
      <div className="form-grid">
        <label>
          {t('Full name')}
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            pattern=".*\S.*"
            placeholder={t('Your name')}
          />
        </label>
        <label>
          {t('Email address')}
          <input
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            placeholder={t('you@example.com')}
          />
        </label>
        <label>
          {t('Phone number')}
          <input
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            required
            pattern={String.raw`[+0-9\s\(\)\-]{7,20}`}
            title={t('Enter 7–20 characters using numbers, spaces, +, parentheses or hyphens.')}
            placeholder={t('+971')}
          />
        </label>
        <label>
          {t('Country')}
          <input
            name="country"
            autoComplete="country-name"
            required
            placeholder={t('Country of residence')}
          />
        </label>
        <label>
          {t('I’m interested in')}
          <select name="interest" defaultValue={property?.purpose || (expert ? 'advice' : 'buy')}>
            <option value="buy">{t('Buying a property')}</option>
            <option value="rent">{t('Renting a property')}</option>
            <option value="off-plan">{t('Off-plan opportunities')}</option>
            <option value="commercial">{t('Commercial property')}</option>
            <option value="advice">{t('Speaking to an expert')}</option>
          </select>
        </label>
        <label>
          {t('Preferred location')}
          <select name="location" defaultValue={property?.locationSlug || preferredLocation}>
            <option value="">{t('Open to recommendations')}</option>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {t(l.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Preferred contact method')}
          <select name="preferredContact">
            <option value="Call">{t('Call')}</option>
            <option value="Email">{t('Email')}</option>
            <option value="WhatsApp">{t('WhatsApp')}</option>
          </select>
        </label>
        <label className="full-width">
          {t('Budget (AED)')}
          <select name="budget" defaultValue="">
            <option value="">{t('I’d like some guidance')}</option>
            <option value="Under 1 million">{t('Under 1 million')}</option>
            <option value="1–5 million">{t('1–5 million')}</option>
            <option value="5–15 million">{t('5–15 million')}</option>
            <option value="15 million and above">{t('15 million and above')}</option>
          </select>
        </label>
        <label className="full-width">
          {t('Your message')}
          <textarea
            name="message"
            rows={4}
            required
            minLength={10}
            value={
              messageDraft ??
              (property
                ? t('I would like to learn more about {0}.', {
                    0: property.title,
                  })
                : '')
            }
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder={t('Tell us a little about your plans…')}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" required />
        {t(
          isSupabase
            ? 'I agree to share these details with the property advisory team.'
            : 'I agree to save this inquiry in my browser for this demo.',
        )}
      </label>
      {error && <p role="alert">{t(error)}</p>}
      <Button type="submit" disabled={pending}>
        {t('Let’s start a conversation')}
      </Button>
      <p className="form-note">
        {t(
          isSupabase
            ? 'Your inquiry is saved securely for our advisory team.'
            : 'A frontend demonstration. Your details stay in this browser.',
        )}
      </p>
    </form>
  );
}
