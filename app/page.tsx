import type { Metadata } from "next";
import Link from "next/link";
import {
  Droplets,
  Truck,
  Users,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  MessageCircle,
  Package,
  Layers,
  Sparkles,
  ChevronDown,
  CalendarCheck,
  Boxes,
  Grid3x3,
  Settings,
  BadgeCheck,
  ShoppingBag,
  Link2,
  Waves,
} from "lucide-react";
import { BRANDING } from "@/lib/branding";
import LogoImage from "@/components/LogoImage";
import LandingNav from "@/components/LandingNav";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  metadataBase: new URL(BRANDING.siteUrl),
  title: `${BRANDING.companyName} — Premium Bath Fittings & Sanitary Ware Wholesaler`,
  description: BRANDING.metaDescription,
  keywords: BRANDING.metaKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${BRANDING.companyName} — Premium Bath Fittings & Sanitary Ware`,
    description: BRANDING.metaDescription,
    url: BRANDING.siteUrl,
    siteName: BRANDING.companyName,
    images: [{ url: BRANDING.logoSrc }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${BRANDING.companyName} — Premium Bath Fittings & Sanitary Ware`,
    description: BRANDING.metaDescription,
    images: [BRANDING.logoSrc],
  },
};

// Podium order (display order, not warranty length): runner-up, headline
// tier (center, elevated), then entry tier — gold/silver/bronze accents
// make the hierarchy read at a glance instead of three identical boxes.
const WARRANTIES = [
  {
    icon: Settings,
    years: "2",
    unit: "Years",
    label: "Spindle & Head",
    tier: "silver",
    ring: "ring-slate-300",
    gradient: "from-slate-400 to-slate-600",
    glow: "bg-slate-300/40",
  },
  {
    icon: ShieldCheck,
    years: "10",
    unit: "Years",
    label: "CP Fittings Body",
    tier: "gold",
    ribbon: "Longest Coverage",
    ring: "ring-amber-300",
    gradient: "from-amber-400 to-amber-700",
    glow: "bg-amber-300/50",
  },
  {
    icon: BadgeCheck,
    years: "1",
    unit: "Year",
    label: "Accessories",
    tier: "bronze",
    ring: "ring-orange-300",
    gradient: "from-orange-400 to-orange-700",
    glow: "bg-orange-300/40",
  },
];

// Best-effort icon per product category — falls back to a generic droplet
// for anything not explicitly matched, so this never breaks for a
// deployment with different category names.
const CATEGORY_ICON_MAP: Record<string, typeof Droplets> = {
  concealed: Layers,
  "health faucet": Droplets,
  coupling: Link2,
  shower: Waves,
  "soap dish": Package,
  "towel rod": Package,
  "grab bar": ShieldCheck,
  accessories: Sparkles,
  jally: Grid3x3,
  sink: Droplets,
};

function getCategoryIcon(name: string) {
  const key = name.trim().toLowerCase();
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
  const match = Object.keys(CATEGORY_ICON_MAP).find((k) => key.includes(k));
  return match ? CATEGORY_ICON_MAP[match] : Droplets;
}

const SERVICES = [
  {
    icon: Package,
    title: "Wholesale Distribution",
    desc: `Bulk pricing and dedicated B2B support for retailers and contractors sourcing from ${BRANDING.companyName}.`,
  },
  {
    icon: Truck,
    title: "Reliable Delivery",
    desc: BRANDING.serviceAreaText || "Dependable dispatch and delivery to your store or project site.",
  },
  {
    icon: Users,
    title: "Dedicated Sales Support",
    desc: "A knowledgeable team ready to help you find the right products and build a custom quotation fast.",
  },
];

export default function LandingPage() {
  const whatsappDigits = BRANDING.contactPhone.replace(/\D/g, "");
  const waHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.startsWith("91") ? whatsappDigits : `91${whatsappDigits}`}?text=${encodeURIComponent(
        `Hi, I'd like to know more about your products.`
      )}`
    : null;
  const telHref = whatsappDigits ? `tel:+${whatsappDigits.startsWith("91") ? whatsappDigits : `91${whatsappDigits}`}` : null;
  const mapsEmbedSrc = BRANDING.mapEmbedCid
    ? `https://www.google.com/maps?cid=${BRANDING.mapEmbedCid}&output=embed`
    : BRANDING.addressLine
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${BRANDING.companyName}, ${BRANDING.addressLine}`)}&output=embed`
      : null;
  const yearsInBusiness = BRANDING.foundedYear ? new Date().getFullYear() - BRANDING.foundedYear : null;

  const stats = [
    yearsInBusiness && {
      icon: CalendarCheck,
      value: `${yearsInBusiness}+`,
      label: "Years of Trust",
    },
    BRANDING.productSeries.length > 0 && {
      icon: Boxes,
      value: `${BRANDING.productSeries.length}+`,
      label: "Collections",
    },
    BRANDING.productTypes.length > 0 && {
      icon: Grid3x3,
      value: `${BRANDING.productTypes.length}+`,
      label: "Product Categories",
    },
    BRANDING.serviceAreaText && {
      icon: MapPin,
      value: "Kerala",
      label: "Wide Delivery",
    },
  ].filter(Boolean) as { icon: typeof CalendarCheck; value: string; label: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeGoodsStore",
    name: BRANDING.companyName,
    description: BRANDING.metaDescription,
    url: BRANDING.siteUrl,
    ...(BRANDING.contactPhone ? { telephone: BRANDING.contactPhone } : {}),
    ...(BRANDING.contactEmail ? { email: BRANDING.contactEmail } : {}),
    ...(BRANDING.addressLine
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: BRANDING.addressLine.split(",")[0]?.trim(),
            addressRegion: "Kerala",
            addressCountry: "IN",
          },
        }
      : {}),
    areaServed: "Kerala, India",
  };

  return (
    <div className="select-text bg-white text-slate-900">
      <script
        type="application/ld+json"
        // Defends against a "</script><script>..." breakout if any BRANDING
        // env value ever contained that sequence — JSON.stringify alone
        // doesn't escape "<".
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white">
        <div className="absolute inset-0 bg-[url('/hero-image.jpg')] bg-cover bg-center mix-blend-overlay opacity-15 pointer-events-none" />
        
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl animate-float-slower" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-float-slow" />

        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Concentric water-ripple motif — on-theme decorative graphic */}
        <svg
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[46rem] w-[46rem] opacity-[0.07]"
          viewBox="0 0 200 200"
          fill="none"
        >
          {[24, 46, 68, 90].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} stroke="white" strokeWidth="0.6" />
          ))}
        </svg>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-28 md:pb-36 text-center">
          <ScrollReveal delayMs={0} className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
              <Sparkles className="h-3 w-3" /> Wholesale Bath Fittings &amp; Sanitary Ware
            </span>
          </ScrollReveal>
          
          <ScrollReveal delayMs={100}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-[-0.02em] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
              {BRANDING.companyName}
            </h1>
          </ScrollReveal>
          
          <ScrollReveal delayMs={200}>
            <p className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              {BRANDING.tagline}
            </p>
          </ScrollReveal>
          
          <ScrollReveal delayMs={300}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/catalog"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white/90 backdrop-blur-md text-brand-950 font-bold uppercase tracking-wide text-sm pl-3 pr-6 py-3 rounded-full shadow-lg border border-white/40 hover:bg-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.97] transition duration-150 ease-out-ui"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
                View Sales Catalogue
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.97] text-white font-bold uppercase tracking-wide text-sm px-7 py-3.5 rounded-full shadow-lg transition duration-150 ease-out-ui"
                >
                  <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                </a>
              )}
            </div>
          </ScrollReveal>



          {/* Scroll hint */}
          <div className="hidden sm:flex justify-center mt-12 sm:mt-16">
            <ChevronDown className="h-5 w-5 text-white/40 animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* ── Stats strip (overlaps hero/about boundary) ──────────────────── */}
      {stats.length > 0 && (
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 md:-mt-16 z-10">
          <ScrollReveal delayMs={400} className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 divide-y divide-x sm:divide-y-0 divide-slate-100">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-center">
                <stat.icon className="h-5 w-5 text-brand-700 mb-1" />
                <span className="text-xl sm:text-2xl font-black text-slate-900">{stat.value}</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </ScrollReveal>
        </div>
      )}

      {/* ── About ────────────────────────────────────────────────────── */}
      <section id="about" className="relative py-16 md:py-28 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/marble-texture.jpg')] bg-cover bg-center opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-transparent opacity-5 pointer-events-none" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 md:gap-16 items-start">
            <ScrollReveal className="md:col-span-3 space-y-6">
              <div className="flex items-center gap-5">
                {BRANDING.foundedYear && (
                  <div className="shrink-0 h-20 w-20 rounded-full border border-white/10 flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md shadow-2xl">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-brand-400">Est.</span>
                    <span className="text-xl font-black text-white leading-none mt-0.5">{BRANDING.foundedYear}</span>
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">About Us</span>
                  <h2 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                    Trusted Bath Fittings Specialists
                  </h2>
                </div>
              </div>

              <p className="relative pl-5 border-l-4 border-brand-500 text-lg sm:text-xl font-bold text-white/90 leading-snug">
                Where luxury meets functionality in the world of sanitary ware.
              </p>

              <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-prose">
                {BRANDING.aboutTextShort || BRANDING.aboutText}
              </p>
            </ScrollReveal>
            <div className="md:col-span-2 space-y-4 md:pt-2">
              {[
                { icon: ShieldCheck, label: "Premium Quality", desc: "Meticulously crafted with superior craftsmanship for lasting durability." },
                { icon: Droplets, label: "Diverse Styles", desc: "From modern minimalism to classic elegance, for every space." },
                { icon: Users, label: "Customer First", desc: "A knowledgeable team dedicated to your complete satisfaction." },
              ].map((item, i) => (
                <ScrollReveal key={item.label} delayMs={i * 100}>
                  <div className="group flex items-start gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.97] duration-150 ease-out-ui">
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-3">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white/90">{item.label}</div>
                      <div className="text-xs text-white/50 leading-relaxed mt-1">{item.desc}</div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────── */}
      {(BRANDING.productSeries.length > 0 || BRANDING.productTypes.length > 0) && (
        <section id="products" className="relative py-16 md:py-24 bg-slate-50 border-y border-slate-200 overflow-hidden">
          <div className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 -left-24 h-64 w-64 rounded-full bg-brand-100/40 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-brand-700 uppercase tracking-widest">Our Products</span>
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                A Collection for Every Bathroom
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Explore our range of series and product categories — from concealed diverters to
                premium accessories.
              </p>
            </ScrollReveal>

            <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
              <div className="lg:col-span-12 flex flex-col gap-6 md:gap-8">
              {BRANDING.productSeries.length > 0 && (
                <ScrollReveal>
                  <div className="h-full bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-5 md:p-8 shadow-xl">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-brand-500" /> Collections
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {BRANDING.productSeries.map((series, i) => (
                        <ScrollReveal key={series} delayMs={i * 20}>
                          <div className="group relative flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-full px-4 sm:px-5 py-2.5 hover:border-brand-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 active:scale-95 cursor-default">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight">{series}</span>
                            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </ScrollReveal>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
              {BRANDING.productTypes.length > 0 && (
                <ScrollReveal delayMs={120}>
                  <div className="h-full bg-white/90 backdrop-blur-md border border-slate-200 rounded-[32px] p-5 md:p-8 shadow-xl">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4 text-brand-500" /> Categories
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {BRANDING.productTypes.map((type, i) => {
                        const Icon = getCategoryIcon(type);
                        return (
                          <ScrollReveal key={type} delayMs={i * 20}>
                            <div className="group flex items-center gap-3 bg-white border border-slate-100 rounded-full px-4 sm:px-5 py-2.5 hover:border-brand-200 hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-default">
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-900 group-hover:text-white group-hover:scale-110 shadow-inner">
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </div>
                              <span className="text-[10px] sm:text-xs font-extrabold text-slate-700 tracking-widest uppercase">{type}</span>
                            </div>
                          </ScrollReveal>
                        );
                      })}
                    </div>
                  </div>
                </ScrollReveal>
              )}
              </div>
            </div>

            <ScrollReveal className="text-center mt-12 md:mt-16" delayMs={200}>
              <Link
                href="/catalog"
                className="group btn-sheen relative inline-flex items-center gap-2.5 bg-brand-900 hover:bg-brand-800 text-white font-bold uppercase tracking-wide text-sm pl-3 pr-6 py-3 rounded-full shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.97] transition duration-150 ease-out-ui"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
                Browse Full Sales Catalogue
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <p className="text-xs text-slate-400 mt-3">Pricing &amp; stock availability inside — sales access required.</p>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── Warranty ─────────────────────────────────────────────────── */}
      <section id="warranty" className="relative py-16 md:py-28 bg-slate-950 overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[32rem] w-[32rem] rounded-full bg-brand-500/10 blur-[100px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">Quality Assurance</span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight">
              Warranty You Can Rely On
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/60">
              Every {BRANDING.companyName} product is backed by a clear, straightforward warranty —
              no fine print, no surprises.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-6 md:gap-8 items-end">
            {WARRANTIES.map((w, i) => (
              <ScrollReveal key={w.label} delayMs={i * 120} className={w.tier === "gold" ? "sm:-translate-y-4" : ""}>
                <div
                  className={`group relative h-full text-center bg-white/5 border backdrop-blur-md rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${
                    w.tier === "gold"
                      ? "border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] hover:shadow-[0_0_60px_rgba(245,158,11,0.25)] hover:border-amber-500/50 pt-10"
                      : "border-white/10 shadow-lg hover:shadow-2xl hover:border-white/20"
                  }`}
                >
                  {w.ribbon && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                      &#9733; {w.ribbon}
                    </span>
                  )}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 ${w.glow}`}
                  />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-16 rounded-full bg-gradient-to-r from-brand-400 to-brand-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className={`relative mx-auto ${w.tier === "gold" ? "h-24 w-24" : "h-20 w-20"} rounded-full bg-gradient-to-br ${w.gradient} shadow-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <div className={`absolute inset-0 rounded-full ring-4 ${w.ring} ring-offset-2 ring-offset-slate-950`} />
                    <w.icon className={w.tier === "gold" ? "h-10 w-10 text-white" : "h-8 w-8 text-white"} />
                  </div>
                  <div className="relative flex items-baseline justify-center gap-1.5">
                    <span className={`${w.tier === "gold" ? "text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500" : "text-4xl md:text-5xl text-white"} font-black`}>{w.years}</span>
                    <span className="text-sm font-bold text-white/50 uppercase tracking-wide">{w.unit}</span>
                  </div>
                  <p className="relative mt-2 text-sm font-bold text-brand-300 uppercase tracking-wide">Warranty</p>
                  <div className="relative mt-4 h-px w-12 bg-white/10 mx-auto" />
                  <p className="relative mt-4 text-sm text-white/70">{w.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <section id="services" className="py-16 md:py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold text-brand-700 uppercase tracking-widest">What We Offer</span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Built for B2B Buyers</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <ScrollReveal key={s.title} delayMs={i * 90}>
                <div className="group h-full bg-white border border-slate-200 hover:border-brand-300 hover:shadow-2xl hover:shadow-brand-900/5 rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-2">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-800 to-brand-950 text-white flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 shadow-lg">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <section id="contact" className="relative py-16 md:py-28 bg-slate-950 text-white overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-600/10 blur-[100px] animate-float-slow" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-brand-400/10 blur-[100px] animate-float-slower" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <ScrollReveal>
            <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">Get In Touch</span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-5xl font-black tracking-tight">
              Talk to Our Sales Team
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed max-w-md">
              {BRANDING.serviceAreaText ||
                "Reach out to us for wholesale pricing, product samples, or bulk order enquiries."}
            </p>

            <div className="mt-8 space-y-4">
              {telHref && (
                <a href={telHref} className="flex items-center gap-3.5 group">
                  <div className="h-10 w-10 shrink-0 rounded-md bg-white/10 group-hover:bg-white/20 group-hover:scale-110 flex items-center justify-center transition-all">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">{BRANDING.contactPhone}</span>
                </a>
              )}
              {BRANDING.contactEmail && (
                <a href={`mailto:${BRANDING.contactEmail}`} className="flex items-center gap-3.5 group">
                  <div className="h-10 w-10 shrink-0 rounded-md bg-white/10 group-hover:bg-white/20 group-hover:scale-110 flex items-center justify-center transition-all">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">{BRANDING.contactEmail}</span>
                </a>
              )}
              {BRANDING.addressLine && (
                <a
                  href={BRANDING.mapUrl || "#"}
                  target={BRANDING.mapUrl ? "_blank" : undefined}
                  rel={BRANDING.mapUrl ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3.5 group"
                >
                  <div className="h-10 w-10 shrink-0 rounded-md bg-white/10 group-hover:bg-white/20 group-hover:scale-110 flex items-center justify-center transition-all">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">{BRANDING.addressLine}</span>
                </a>
              )}
            </div>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sheen mt-8 inline-flex items-center gap-2 bg-white text-brand-950 font-bold uppercase tracking-wide text-sm px-6 py-3 rounded-md shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </a>
            )}
          </ScrollReveal>

          {mapsEmbedSrc && (
            <ScrollReveal delayMs={150}>
              <div className="rounded-xl overflow-hidden border border-white/15 min-h-[280px] h-full shadow-2xl ring-1 ring-white/5">
                <iframe
                  src={mapsEmbedSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: 280 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${BRANDING.companyName} location map`}
                />
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative bg-slate-950 text-slate-400 py-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoImage width={120} height={30} className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
          </div>
          <p className="text-xs text-center sm:text-right">
            &copy; {new Date().getFullYear()} {BRANDING.companyName}. All rights reserved.
            {BRANDING.poweredByLabel && (
              <>
                {" "}
                &middot;{" "}
                {BRANDING.poweredByUrl ? (
                  <a href={BRANDING.poweredByUrl} className="hover:text-white transition-colors">
                    {BRANDING.poweredByLabel}
                  </a>
                ) : (
                  BRANDING.poweredByLabel
                )}
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
