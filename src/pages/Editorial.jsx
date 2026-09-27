import { useLanguage } from '../i18n/LanguageProvider';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { siteConfig } from '../config/siteConfig';
import { Breadcrumb, Button, Photo, Reveal, SectionHeader, SEO } from '../components/ui';
import {
  Categories,
  FinalCTA,
  InvestmentBenefits,
  PageHero,
  StoryPoints,
} from '../components/sections/Sections';
import { PropertyGrid } from '../components/property/PropertyCard';
import { ContactForm } from '../components/forms/Forms';
import NotFound from './NotFound';
export function About() {
  const { t } = useLanguage();
  return (
    <>
      <SEO title={t('Our Story')} />
      <PageHero
        eyebrow={t('A global outlook. A personal approach.')}
        title={
          <>
            {t('More Than Properties.')}
            <br />
            {t('A Better Future.')}
          </>
        }
        text={t('Connecting people, places and possibilities since 2011.')}
        image={siteConfig.images.residence}
      />
      <section className="page-shell about-story">
        <Reveal>
          <p className="eyebrow">{t('This is Dubai bayt')}</p>
          <h2>
            {t('Great places.')}
            <br />
            {t('Even better beginnings.')}
          </h2>
          <p>
            {t(
              'We believe finding a property is about seeing what life could become. A space to build your future. A neighbourhood to belong to. A new chapter to call your own.',
            )}
          </p>
          <p>
            {t(
              'Our approach brings local perspective and a global outlook together. From your first conversation to your next move, we make room for the details that matter to you.',
            )}
          </p>
          <p className="muted">
            {t(
              'Dubai bayt is a fictional brand created for this frontend demonstration. The story, team, statistics and testimonials are illustrative.',
            )}
          </p>
        </Reveal>
        <Photo
          src={siteConfig.images.interior}
          alt={t('A light-filled contemporary living space')}
        />
      </section>
      <section className="values-section">
        <div>
          <span className="eyebrow">{t('Our mission')}</span>
          <h2>
            {t('Make the exceptional')}
            <br />
            {t('feel personal.')}
          </h2>
          <p>
            {t(
              'To help people make considered property decisions through thoughtful listening, clear communication and neighbourhood knowledge.',
            )}
          </p>
        </div>
        <div>
          <span className="eyebrow">{t('Our vision')}</span>
          <h2>
            {t('A brighter tomorrow,')}
            <br />
            {t('built together.')}
          </h2>
          <p>
            {t(
              'To become a trusted starting point for people building a life, a home or a long-term connection with Dubai.',
            )}
          </p>
        </div>
        <StoryPoints />
      </section>
      <section className="page-shell">
        <SectionHeader
          title={t('Experience that sees the whole picture')}
          subtitle={t('An investor approach grounded in your priorities.')}
        />
        <div className="process-grid">
          {[
            [
              '01',
              'We listen first',
              'Your plans, your timeline and your priorities shape the search from the beginning.',
            ],
            [
              '02',
              'We bring perspective',
              'Compare neighbourhoods, property types and ownership considerations with clear context.',
            ],
            [
              '03',
              'We stay connected',
              'Thoughtful support throughout the search, viewing and decision-making process.',
            ],
          ].map(([n, title, text]) => (
            <div key={n}>
              <span>{t(n)}</span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </div>
          ))}
        </div>
        <div className="about-stats">
          <span>
            <strong>15+</strong>
            {t('Years in Dubai')}
          </span>
          <span>
            <strong>2,500+</strong>
            {t('Properties')}
          </span>
          <span>
            <strong>98%</strong>
            {t('Client satisfaction')}
          </span>
          <span>
            <strong>{t('Global')}</strong>
            {t('Perspective')}
          </span>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
export function Invest() {
  const { t } = useLanguage();
  const { locations } = useCatalog();
  return (
    <>
      <SEO title={t('Invest in Dubai')} />
      <PageHero
        eyebrow={t('Think beyond the address')}
        title={
          <>
            {t('A Global City.')}
            <br />
            {t('A World of Possibility.')}
          </>
        }
        text={t('Explore Dubai property with a clear perspective and a plan that is yours.')}
        image={siteConfig.images.skyline}
      />
      <div className="page-shell">
        <InvestmentBenefits />
        <p className="disclaimer">
          {t(
            'Explore opportunities with care. Values, rental demand, costs and rules can change; returns are not guaranteed. Obtain current independent financial and legal advice before investing.',
          )}
        </p>
        <section className="content-section">
          <SectionHeader
            title={t('A considered way forward')}
            subtitle={t('From your first question to a confident decision.')}
          />
          <div className="process-grid">
            {[
              [
                '01',
                'Define your goals',
                'Start with your budget, time horizon and plans for the property.',
              ],
              [
                '02',
                'Explore the possibilities',
                'Compare locations, ongoing costs, property condition and relevant documents.',
              ],
              [
                '03',
                'Make an informed choice',
                'Seek independent advice and review the details before any commitment.',
              ],
            ].map(([n, title, text]) => (
              <div key={n}>
                <span>{t(n)}</span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="content-section">
          <SectionHeader title={t('Places with Perspective')} to="/locations" />
          <div className="location-grid">
            {locations.slice(0, 3).map((l) => (
              <LocationCard key={l.slug} location={l} />
            ))}
          </div>
        </section>
        <Categories />
        <section className="faq-section">
          <div>
            <p className="eyebrow">{t('A little clarity')}</p>
            <h2>
              {t('Your questions.')}
              <br />
              {t('Thoughtfully answered.')}
            </h2>
          </div>
          <div>
            {[
              [
                'Where should I begin?',
                'Start with your goals, budget and preferred time horizon. Our demo property collection can help you compare different locations and property types.',
              ],
              [
                'What is an off-plan property?',
                'An off-plan property is marketed before construction is complete. Review the developer, project documentation, payment schedule and completion risks with qualified advisors.',
              ],
              [
                'What costs should I consider?',
                'Consider acquisition costs, ongoing service charges, maintenance, financing and any applicable charges. Obtain current itemised estimates for your specific situation.',
              ],
              [
                'Are returns guaranteed?',
                'No. Property values and rental income can rise or fall. Sample listing prices on this site are illustrative and do not represent forecasts or available offers.',
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>{t(question)}</summary>
                <p>{t(answer)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <FinalCTA />
    </>
  );
}
function LocationCard({ location }) {
  const { t } = useLanguage();
  return (
    <Link to={`/location/${location.slug}`} className="location-card">
      <Photo src={location.image} alt={t(location.name)} />
      <div>
        <span className="eyebrow">{t('Dubai neighbourhoods')}</span>
        <h3>{t(location.name)}</h3>
        <p>{t(location.tagline)}</p>
        <ArrowRight size={19} />
      </div>
    </Link>
  );
}
export function Locations() {
  const { t } = useLanguage();
  const { locations } = useCatalog();
  return (
    <>
      <SEO title={t('Dubai Locations')} />
      <PageHero
        eyebrow={t('Find where you belong')}
        title={t('Iconic Places. Extraordinary Living.')}
        text={t('Eight distinct neighbourhoods. Endless ways to feel at home.')}
      />
      <div className="page-shell">
        <div className="location-grid">
          {locations.map((l) => (
            <LocationCard key={l.slug} location={l} />
          ))}
        </div>
      </div>
      <FinalCTA />
    </>
  );
}
export function LocationDetails() {
  const { t } = useLanguage();
  const { slug } = useParams();
  const { locations, properties } = useCatalog();
  const location = locations.find((l) => l.slug === slug);
  if (!location) return <NotFound />;
  return (
    <>
      <SEO title={t(location.name)} />
      <PageHero
        eyebrow={t('An address with a different perspective')}
        title={t(location.name)}
        text={t(location.tagline)}
        image={location.image}
      />
      <div className="page-shell">
        <Breadcrumb
          items={[
            {
              label: 'Locations',
              to: '/locations',
            },
            {
              label: location.name,
            },
          ]}
        />
        <div className="location-intro">
          <h2>{t('A place to belong.')}</h2>
          <div>
            <p>{t(location.description)}</p>
            <p>
              {t(
                'Discover homes selected for their space, setting and everyday possibilities. Explore our sample collection below, or tell us what matters to you.',
              )}
            </p>
            <Button to={`/contact?location=${location.slug}`}>
              {t('Talk about this neighbourhood')}
            </Button>
          </div>
        </div>
        <SectionHeader
          title={t('At Home in {0}', {
            0: location.name,
          })}
          to={`/properties?location=${location.slug}`}
        />
        <PropertyGrid properties={properties.filter((p) => p.locationSlug === location.slug)} />
      </div>
      <FinalCTA />
    </>
  );
}
function BlogCard({ article }) {
  const { t, locale } = useLanguage();
  return (
    <article className="blog-card">
      <Link to={`/blog/${article.slug}`}>
        <Photo src={article.image} alt={t(article.title)} />
        <div>
          <span className="eyebrow">
            {t(article.category)} <span>·</span>
            {t(' ')}
            {t(
              new Date(article.date).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            )}
          </span>
          <h2>{t(article.title)}</h2>
          <p>{t(article.excerpt)}</p>
          <span className="text-link">
            {t('Read the story ')}
            <ArrowRight size={15} />
          </span>
        </div>
      </Link>
    </article>
  );
}
export function Blog() {
  const { t } = useLanguage();
  const { articles } = useCatalog();
  const [params, setParams] = useSearchParams();
  const category = params.get('category');
  const filtered = category ? articles.filter((a) => a.category === category) : articles;
  return (
    <>
      <SEO title={t('The Journal')} />
      <PageHero
        eyebrow={t('Ideas. Insights. Inspiration.')}
        title={t('The Dubai bayt Journal')}
        text={t('Fresh perspectives on property, places and living well in Dubai.')}
      />
      <div className="page-shell">
        <div className="blog-tabs">
          {['All stories', ...new Set(articles.map((a) => a.category))].map((c) => (
            <button
              key={c}
              className={(category || 'All stories') === c ? 'active' : ''}
              aria-pressed={(category || 'All stories') === c}
              onClick={() =>
                setParams(
                  c === 'All stories'
                    ? {}
                    : {
                        category: c,
                      },
                )
              }
            >
              {t(c)}
            </button>
          ))}
        </div>
        <div className="blog-grid">
          {filtered.map((a) => (
            <BlogCard key={a.slug} article={a} />
          ))}
        </div>
        {!filtered.length && (
          <p>{t('No stories in this category. Select All stories to continue.')}</p>
        )}
      </div>
      <FinalCTA />
    </>
  );
}
export function BlogDetails() {
  const { t, locale } = useLanguage();
  const { slug } = useParams();
  const { articles } = useCatalog();
  const article = articles.find((a) => a.slug === slug);
  if (!article) return <NotFound />;
  return (
    <>
      <SEO title={t(article.title)} description={t(article.excerpt)} />
      <PageHero eyebrow={t(article.category)} title={t(article.title)} image={article.image} />
      <article className="article-body">
        <Breadcrumb
          items={[
            {
              label: 'Journal',
              to: '/blog',
            },
            {
              label: article.title,
            },
          ]}
        />
        <p className="eyebrow">
          {t(
            new Date(article.date).toLocaleDateString(locale, {
              dateStyle: 'long',
            }),
          )}
          {t(' · Dubai bayt Editorial')}
        </p>
        <p className="article-lead">{t(article.excerpt)}</p>
        {article.paragraphs.map((p, i) => (
          <section key={p}>
            {i > 0 && <h2>{t(['', 'A closer look', 'Your next step'][i])}</h2>}
            <p>{t(p)}</p>
          </section>
        ))}
        <Button to="/blog" light>
          {t('Back to the journal')}
        </Button>
      </article>
      <div className="page-shell">
        <SectionHeader title={t('A Little More Inspiration')} />
        <div className="blog-grid related-articles">
          {articles
            .filter((a) => a.slug !== slug)
            .slice(0, 2)
            .map((a) => (
              <BlogCard key={a.slug} article={a} />
            ))}
        </div>
      </div>
    </>
  );
}
export function Contact() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  return (
    <>
      <SEO title={t('Contact Our Experts')} />
      <PageHero
        eyebrow={t('Every great story starts with a conversation')}
        title={t('Let’s Find Your Tomorrow.')}
        text={t(
          'A place to live. A new investment. A fresh beginning. We’re here to help you explore.',
        )}
      />
      <div className="page-shell contact-layout">
        <aside>
          <Photo src={siteConfig.images.residence} alt={t('An inviting contemporary home')} />
          <h2>
            {t('Personal advice.')}
            <br />
            {t('A world of perspective.')}
          </h2>
          <p>
            {t(
              'Tell us a little about what you have in mind. We’ll help you consider the possibilities.',
            )}
          </p>
          <div className="contact-detail">
            <MapPin />
            <span>
              {t('Dubai, United Arab Emirates')}
              <small>{t('Illustrative agency location')}</small>
            </span>
          </div>
          <div className="contact-detail">
            <Mail />
            <span>
              {t(siteConfig.email)}
              <small>{t('Demo address · not monitored')}</small>
            </span>
          </div>
          <div className="contact-detail">
            <MessageCircle />
            <span>
              {t('Your details stay with you')}
              <small>{t('This form saves locally; it does not send a message.')}</small>
            </span>
          </div>
        </aside>
        <div className="contact-form-panel">
          <span className="eyebrow">{t('A new beginning')}</span>
          <h2>{t('Tell us your story.')}</h2>
          <ContactForm
            expert={params.get('type') === 'expert'}
            preferredLocation={params.get('location')}
          />
        </div>
      </div>
    </>
  );
}
export function Legal({ type }) {
  const { t } = useLanguage();
  const privacy = type === 'privacy';
  return (
    <div className="page-shell legal-page">
      <SEO title={t(privacy ? 'Privacy Policy' : 'Terms & Conditions')} />
      <Breadcrumb
        items={[
          {
            label: privacy ? 'Privacy policy' : 'Terms & conditions',
          },
        ]}
      />
      <h1>{t(privacy ? 'Privacy Policy' : 'Terms & Conditions')}</h1>
      <p className="article-lead">
        {t('This is a frontend demonstration of a fictional real estate brand.')}
      </p>
      {t(
        privacy ? (
          <>
            <h2>{t('Your browser, your data')}</h2>
            <p>
              {t(
                'Favorites, newsletter preferences and submitted inquiries are stored in this browser’s localStorage. They are not sent to a company or backend. Clear site data through your browser settings to remove them.',
              )}
            </p>
            <h2>{t('External resources')}</h2>
            <p>
              {t(
                'Photography is hosted by Unsplash and fonts by Google Fonts. Loading these resources shares normal request information, such as your IP address, with their providers. External social and map links take you to other websites.',
              )}
            </p>
            <h2>{t('No accounts or tracking')}</h2>
            <p>
              {t(
                'This demo has no authentication, analytics or advertising trackers. Please use sample details when trying the forms.',
              )}
            </p>
          </>
        ) : (
          <>
            <h2>{t('Illustrative content')}</h2>
            <p>
              {t(
                'All properties, prices, availability, agency details, testimonials and statistics are sample content. They do not represent real offers, client experiences or verified business claims.',
              )}
            </p>
            <h2>{t('No transactions')}</h2>
            <p>
              {t(
                'This website does not process purchases, deposits, bookings or payments. Submitting a form only saves a demo inquiry in your browser.',
              )}
            </p>
            <h2>{t('Independent advice')}</h2>
            <p>
              {t(
                'Editorial content is general information. It is not legal, tax or financial advice. Seek qualified, current advice before making a real property decision.',
              )}
            </p>
          </>
        ),
      )}
      <Button to="/">{t('Back home')}</Button>
    </div>
  );
}
