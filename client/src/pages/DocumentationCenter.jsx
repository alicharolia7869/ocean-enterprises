import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Compass,
  Layers,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Droplet,
  MessageSquare
} from 'lucide-react';
import {
  DOCS_CONTACT,
  DOCS_ROUTES,
  DOCS_ARTICLES_MAP,
  searchDocumentation
} from '../data/docsContent';

const ARTICLE_ICONS = {
  'getting-started': Compass,
  'user-guide': BookOpen,
  'features': Layers,
  'troubleshooting': AlertTriangle,
  'faq': HelpCircle
};

export default function DocumentationCenter({
  activeSlug = 'getting-started',
  onSelectSlug,
  onExitDocs,
  onQuickWater,
  onOpenWhatsApp,
  isAuthenticated = false,
  standalone = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('All');
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);
  const searchInputRef = useRef(null);

  const currentArticle = DOCS_ARTICLES_MAP[activeSlug] || DOCS_ROUTES[0];
  const currentIndex = DOCS_ROUTES.findIndex(r => r.slug === currentArticle.slug);
  const prevArticle = currentIndex > 0 ? DOCS_ROUTES[currentIndex - 1] : null;
  const nextArticle =
    currentIndex >= 0 && currentIndex < DOCS_ROUTES.length - 1
      ? DOCS_ROUTES[currentIndex + 1]
      : null;

  const trimmedQuery = searchQuery.trim();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = isSearching ? searchDocumentation(trimmedQuery) : [];

  // Update document title & meta description for accessibility & SEO
  useEffect(() => {
    const previousTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    document.title = `${currentArticle.title} | Ocean Enterprises Help & Documentation`;
    if (metaDesc) {
      metaDesc.setAttribute('content', currentArticle.summary);
    }

    return () => {
      document.title = previousTitle || 'Ocean Enterprises | Business Management System';
      if (metaDesc && previousDesc) {
        metaDesc.setAttribute('content', previousDesc);
      }
    };
  }, [currentArticle.title, currentArticle.summary]);

  // Keyboard shortcuts: "/" to focus search, "Escape" to clear search or close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (mobileTopicsOpen) {
          setMobileTopicsOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileTopicsOpen, searchQuery]);

  const handleNavigateArticle = (slug, sectionId = '') => {
    setMobileTopicsOpen(false);
    setSearchQuery('');
    if (onSelectSlug) {
      onSelectSlug(slug);
    }
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderCallout = (callout) => {
    if (!callout) return null;
    const palette =
      callout.type === 'warning'
        ? { bg: '#fffbeb', border: '#fde68a', title: '#92400e', text: '#78350f', badge: 'IMPORTANT' }
        : callout.type === 'tip'
        ? { bg: '#ecfdf5', border: '#a7f3d0', title: '#065f46', text: '#064e3b', badge: 'PRO TIP' }
        : { bg: '#f0f9ff', border: '#bae6fd', title: '#0369a1', text: '#0c4a6e', badge: 'NOTE' };

    return (
      <div
        role="note"
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: '10px',
          padding: '14px 16px',
          marginTop: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '800',
              letterSpacing: '0.05em',
              padding: '2px 7px',
              borderRadius: '9999px',
              background: '#ffffff',
              color: palette.title,
              border: `1px solid ${palette.border}`
            }}
          >
            {palette.badge}
          </span>
          <strong style={{ fontSize: '13.5px', color: palette.title }}>{callout.title}</strong>
        </div>
        <p style={{ fontSize: '13px', color: palette.text, margin: 0, lineHeight: 1.6 }}>
          {callout.text}
        </p>
      </div>
    );
  };

  const sidebarContent = (
    <nav aria-label="Documentation topics" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="ocean-card" style={{ padding: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b'
            }}
          >
            Documentation Guides
          </span>
          {mobileTopicsOpen && (
            <button
              type="button"
              onClick={() => setMobileTopicsOpen(false)}
              className="btn-secondary docs-focusable"
              style={{ padding: '4px 6px', borderRadius: '6px' }}
              aria-label="Close documentation menu"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {DOCS_ROUTES.map((item) => {
            const Icon = ARTICLE_ICONS[item.slug] || BookOpen;
            const isActive = item.slug === currentArticle.slug && !isSearching;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleNavigateArticle(item.slug)}
                aria-current={isActive ? 'page' : undefined}
                className="docs-focusable"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#0284c7' : '#334155',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.14s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#0284c7' : '#64748b'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.shortTitle}
                  </div>
                  <div style={{ fontSize: '10.5px', color: isActive ? '#0369a1' : '#94a3b8', fontWeight: '500' }}>
                    {item.category}
                  </div>
                </div>
                <ChevronRight size={14} color={isActive ? '#0284c7' : '#cbd5e1'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Verified Plant Support & Contact Card */}
      <div className="ocean-card" style={{ padding: '16px', background: '#f8fafc' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#0284c7',
            marginBottom: '8px'
          }}
        >
          Plant & Dispatch Support
        </div>
        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
          {DOCS_CONTACT.businessName}
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>
          {DOCS_CONTACT.tagline}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <MapPin size={14} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{DOCS_CONTACT.address}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={14} color="#0284c7" style={{ flexShrink: 0 }} />
            <a
              href={`tel:${DOCS_CONTACT.phone.replace(/\s+/g, '')}`}
              style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '600' }}
            >
              {DOCS_CONTACT.phone}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={14} color="#0284c7" style={{ flexShrink: 0 }} />
            <a
              href={`mailto:${DOCS_CONTACT.email}`}
              style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '600' }}
            >
              {DOCS_CONTACT.email}
            </a>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div
      style={{
        minHeight: standalone ? '100vh' : 'auto',
        background: standalone ? '#f8fafc' : 'transparent',
        padding: standalone ? '0 0 64px' : '0'
      }}
    >
      {/* Standalone Top Bar when visiting /docs outside the workspace shell */}
      {standalone && (
        <header
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 24px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px'
              }}
            >
              🌊
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                Ocean Enterprises
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>
                Help & Documentation Center
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onExitDocs && (
              <button
                type="button"
                onClick={onExitDocs}
                className="btn btn-primary docs-focusable"
                style={{ fontSize: '12.5px', padding: '7px 14px' }}
              >
                <ArrowLeft size={14} />
                <span>{isAuthenticated ? 'Back to Workspace' : 'Sign In to Workspace'}</span>
              </button>
            )}
          </div>
        </header>
      )}

      <div
        style={{
          maxWidth: standalone ? '1380px' : '100%',
          margin: '0 auto',
          padding: standalone ? '24px 20px 0' : '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Hero Banner + Breadcrumbs + Search */}
        <section
          aria-label="Documentation header and search"
          className="ocean-card"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            borderColor: '#bae6fd'
          }}
        >
          {/* Breadcrumb Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px'
            }}
          >
            <nav aria-label="Breadcrumb">
              <ol
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '600'
                }}
              >
                <li>
                  {onExitDocs ? (
                    <button
                      type="button"
                      onClick={onExitDocs}
                      className="docs-focusable"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0284c7',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Ocean Enterprises
                    </button>
                  ) : (
                    <span>Ocean Enterprises</span>
                  )}
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigateArticle('getting-started')}
                    className="docs-focusable"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#475569',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Help & Docs
                  </button>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" style={{ color: '#0f172a', fontWeight: '700' }}>
                  {currentArticle.shortTitle}
                </li>
              </ol>
            </nav>

            {/* Quick Workspace Jump Buttons when authenticated */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setMobileTopicsOpen(!mobileTopicsOpen)}
                aria-expanded={mobileTopicsOpen}
                className="btn btn-secondary docs-mobile-drawer-btn docs-focusable"
                style={{ padding: '6px 11px', fontSize: '12px' }}
              >
                <Menu size={14} />
                <span>Topics ({DOCS_ROUTES.length})</span>
              </button>

              {isAuthenticated && onQuickWater && (
                <button
                  type="button"
                  onClick={onQuickWater}
                  className="btn btn-secondary docs-focusable"
                  style={{ padding: '6px 11px', fontSize: '12px', color: '#0284c7', borderColor: '#bae6fd' }}
                >
                  <Droplet size={13} />
                  <span>Open Rapid Water</span>
                </button>
              )}

              {isAuthenticated && onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={onOpenWhatsApp}
                  className="btn btn-secondary docs-focusable"
                  style={{ padding: '6px 11px', fontSize: '12px' }}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp Parser</span>
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ maxWidth: '680px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
                Ocean Enterprises Help & Documentation Center
              </h1>
              <p style={{ fontSize: '13.5px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
                Official operator manual, feature reference, financial ledger rules, and troubleshooting for 20L water supply and beverage distribution.
              </p>
            </div>

            {/* Search Input */}
            <div role="search" style={{ width: '100%', maxWidth: '420px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guides, workflows, FAQs... (Press /)"
                  aria-label="Search documentation articles and FAQs"
                  className="form-input docs-focusable"
                  style={{
                    paddingLeft: '36px',
                    paddingRight: searchQuery ? '34px' : '12px',
                    height: '40px',
                    background: '#ffffff',
                    borderColor: '#93c5fd',
                    fontSize: '13px'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="docs-focusable"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Route Quick-Switch Pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid #e0f2fe'
            }}
          >
            {DOCS_ROUTES.map((r) => {
              const active = r.slug === currentArticle.slug && !isSearching;
              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => handleNavigateArticle(r.slug)}
                  className="docs-focusable"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: active ? '1px solid #0284c7' : '1px solid #bae6fd',
                    background: active ? '#0284c7' : '#ffffff',
                    color: active ? '#ffffff' : '#0369a1',
                    transition: 'all 0.14s ease'
                  }}
                >
                  {r.shortTitle}
                </button>
              );
            })}
          </div>
        </section>

        {/* Mobile Drawer Backdrop */}
        {mobileTopicsOpen && (
          <div
            onClick={() => setMobileTopicsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 65
            }}
          />
        )}

        {/* Main 3-Column Documentation Layout */}
        <div className="docs-layout-grid">
          {/* Left Column: Documentation Sidebar (Desktop sticky + Mobile slide-out drawer) */}
          <aside className={`docs-sidebar-panel ${mobileTopicsOpen ? 'mobile-open' : ''}`}>
            {sidebarContent}
          </aside>

          {/* Center Column: Search Results OR Active Article */}
          <main aria-live="polite" style={{ minWidth: 0 }}>
            {isSearching ? (
              <div className="ocean-card" style={{ padding: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Search Results for &ldquo;{trimmedQuery}&rdquo;
                    </h2>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0' }}>
                      Found {searchResults.length} matching {searchResults.length === 1 ? 'topic' : 'topics'} across documentation guides and FAQs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="btn btn-secondary docs-focusable"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Clear Search
                  </button>
                </div>

                {searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                      }}
                    >
                      <Search size={22} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      No matching documentation found
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 16px' }}>
                      We couldn&apos;t find any articles or FAQs matching &ldquo;{trimmedQuery}&rdquo;. Try searching for a simpler keyword or browse one of these popular topics:
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {['water', 'whatsapp', 'payment', 'gps', 'password', 'csv'].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSearchQuery(term)}
                          className="btn btn-secondary docs-focusable"
                          style={{ fontSize: '12px', padding: '5px 12px' }}
                        >
                          Search &ldquo;{term}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleNavigateArticle(res.slug, res.sectionId)}
                        className="docs-focusable"
                        style={{
                          textAlign: 'left',
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'border-color 0.14s ease, box-shadow 0.14s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: '#eff6ff',
                              color: '#0284c7',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            {res.articleTitle}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            {res.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                          {res.sectionHeading}
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                          {res.snippet}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <article className="ocean-card" style={{ padding: '28px' }}>
                {/* Article Header */}
                <header
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '18px',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        background: '#eff6ff',
                        color: '#0284c7',
                        border: '1px solid #bfdbfe'
                      }}
                    >
                      {currentArticle.category}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      • {currentArticle.readTime}
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: 'auto' }}>
                      Route: <code>{currentArticle.path}</code>
                    </span>
                  </div>

                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
                    {currentArticle.title}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                    {currentArticle.summary}
                  </p>
                </header>

                {/* Article Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {currentArticle.sections.map((section) => {
                    const faqCategories = section.faqs
                      ? ['All', ...Array.from(new Set(section.faqs.map(f => f.category)))]
                      : [];
                    const filteredFaqs = section.faqs
                      ? section.faqs.filter(
                          f => faqCategoryFilter === 'All' || f.category === faqCategoryFilter
                        )
                      : [];

                    return (
                      <section
                        key={section.id}
                        id={section.id}
                        style={{ scrollMarginTop: '92px' }}
                      >
                        <h3
                          style={{
                            fontSize: '17.5px',
                            fontWeight: '800',
                            color: '#0f172a',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {section.heading}
                        </h3>

                        {(section.paragraphs || []).map((p, idx) => (
                          <p
                            key={idx}
                            style={{
                              fontSize: '13.5px',
                              color: '#334155',
                              lineHeight: 1.65,
                              marginBottom: '10px'
                            }}
                          >
                            {p}
                          </p>
                        ))}

                        {/* Highlights Cards */}
                        {section.highlights && (
                          <div className="docs-highlights-grid" style={{ marginTop: '12px' }}>
                            {section.highlights.map((h, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '14px 16px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  background: '#f8fafc'
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    color: '#0f172a',
                                    marginBottom: '4px'
                                  }}
                                >
                                  <CheckCircle2 size={15} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>{h.label}</span>
                                </div>
                                <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.55 }}>
                                  {h.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ordered Step-by-Step Instructions */}
                        {section.steps && (
                          <ol
                            style={{
                              listStyle: 'none',
                              padding: 0,
                              margin: '12px 0 0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            {section.steps.map((stepText, idx) => (
                              <li
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  padding: '11px 14px',
                                  borderRadius: '9px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '13.5px',
                                  color: '#1e293b',
                                  lineHeight: 1.55
                                }}
                              >
                                <span
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    fontWeight: '700',
                                    fontSize: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '1px'
                                  }}
                                >
                                  {idx + 1}
                                </span>
                                <span>{stepText}</span>
                              </li>
                            ))}
                          </ol>
                        )}

                        {/* Structured Table */}
                        {section.table && (
                          <div style={{ overflowX: 'auto', marginTop: '14px' }}>
                            <table className="ocean-table">
                              <thead>
                                <tr>
                                  {section.table.headers.map((th, idx) => (
                                    <th key={idx}>{th}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {section.table.rows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {row.map((cell, cIdx) => (
                                      <td
                                        key={cIdx}
                                        style={cIdx === 0 ? { fontWeight: '700', color: '#0f172a' } : {}}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Callout Box */}
                        {renderCallout(section.callout)}

                        {/* FAQ List with Category Filter */}
                        {section.faqs && (
                          <div style={{ marginTop: '14px' }}>
                            <div
                              style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                                marginBottom: '16px'
                              }}
                            >
                              {faqCategories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setFaqCategoryFilter(cat)}
                                  className="docs-focusable"
                                  style={{
                                    padding: '5px 11px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    border:
                                      faqCategoryFilter === cat
                                        ? '1px solid #0284c7'
                                        : '1px solid #e2e8f0',
                                    background: faqCategoryFilter === cat ? '#eff6ff' : '#ffffff',
                                    color: faqCategoryFilter === cat ? '#0284c7' : '#475569'
                                  }}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {filteredFaqs.map((faq, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      color: '#0284c7',
                                      marginBottom: '4px'
                                    }}
                                  >
                                    {faq.category}
                                  </div>
                                  <h4
                                    style={{
                                      fontSize: '14.5px',
                                      fontWeight: '700',
                                      color: '#0f172a',
                                      margin: '0 0 6px'
                                    }}
                                  >
                                    {faq.question}
                                  </h4>
                                  <p
                                    style={{
                                      fontSize: '13px',
                                      color: '#334155',
                                      margin: 0,
                                      lineHeight: 1.6
                                    }}
                                  >
                                    {faq.answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>

                {/* Previous / Next Article Pagination */}
                <nav
                  aria-label="Pagination"
                  className="docs-prev-next-grid"
                  style={{
                    marginTop: '32px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0'
                  }}
                >
                  {prevArticle ? (
                    <button
                      type="button"
                      onClick={() => handleNavigateArticle(prevArticle.slug)}
                      className="docs-focusable"
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}
                      >
                        <ArrowLeft size={13} />
                        <span>Previous Guide</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7' }}>
                        {prevArticle.title}
                      </div>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextArticle ? (
                    <button
                      type="button"
                      onClick={() => handleNavigateArticle(nextArticle.slug)}
                      className="docs-focusable"
                      style={{
                        textAlign: 'right',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}
                      >
                        <span>Next Guide</span>
                        <ArrowRight size={13} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7' }}>
                        {nextArticle.title}
                      </div>
                    </button>
                  ) : (
                    <div />
                  )}
                </nav>
              </article>
            )}
          </main>

          {/* Right Column: Sticky Table of Contents ("On this page") */}
          <aside aria-label="On this page" className="docs-toc-panel">
            <div className="ocean-card" style={{ padding: '16px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748b',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                On This Page
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {currentArticle.sections.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection(sec.id)}
                      className="docs-focusable"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        textAlign: 'left',
                        width: '100%',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#475569',
                        cursor: 'pointer',
                        lineHeight: 1.4
                      }}
                    >
                      {sec.heading}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

