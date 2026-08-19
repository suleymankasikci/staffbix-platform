import { DEFAULT_LOCALE, type Locale } from "./config";
import { localizeCopy } from "./copy-localizer";

type CommonCopy = {
  tagline: string;
  subtagline: string;
  description: string;
  trialLine: string;
  problemQuote: string;
  homeKeywords: string[];
  nav: Record<"workforce" | "pricing" | "docs" | "customers", string>;
  footer: Record<"product" | "developers" | "company" | "legal", string>;
  links: Record<string, string>;
  cta: Record<"primary" | "secondary" | "login", string>;
  labels: Record<string, string>;
};

const en: CommonCopy = {
  tagline: "Run a real company. Alone.",
  subtagline: "One company brain. 60+ AI workers. Zero chatbots.",
  description:
    "Hire AI employees by role, not by tool. They share one Brand Bible — your products, your prices, your voice, your rules. You stay in command.",
  trialLine: "Three-day trial. No card.",
  problemQuote: "A solo founder needs a team's capacity, but cannot afford one.",
  homeKeywords: [
    "Staffbix",
    "AI workforce platform",
    "hire AI workers",
    "AI customer service software",
    "WhatsApp AI automation",
    "Brand Bible AI",
    "AI for ecommerce",
    "alternative to chatbots",
  ],
  nav: {
    workforce: "Workforce",
    pricing: "Pricing",
    docs: "Docs",
    customers: "Customers",
  },
  footer: {
    product: "Product",
    developers: "Developers",
    company: "Company",
    legal: "Legal",
  },
  links: {
    "Brand Bible": "Brand Bible",
    "Approval Center": "Approval Center",
    Changelog: "Changelog",
    Docs: "Docs",
    "API reference": "API reference",
    SDKs: "SDKs",
    Webhooks: "Webhooks",
    Status: "Status",
    About: "About",
    Customers: "Customers",
    Careers: "Careers",
    Press: "Press",
    Contact: "Contact",
    Privacy: "Privacy",
    Terms: "Terms",
    Security: "Security",
    DPA: "DPA",
    Cookies: "Cookies",
    Workforce: "Workforce",
    Pricing: "Pricing",
  },
  cta: {
    primary: "Start free trial",
    secondary: "See how it works",
    login: "Log in",
  },
  labels: {
    "AI Workforce Platform": "AI Workforce Platform",
    "All systems operational": "All systems operational",
    Language: "Language",
    available: "available",
    "Change language": "Change language",
    "Select language": "Select language",
    "Open menu": "Open menu",
    "Close menu": "Close menu",
    "404 page": "404 · Page not found",
    "Page not shipped": "This page hasn’t shipped yet.",
    "Page placeholder note":
      "Some routes in the nav are placeholders while we build the rest of the site. Head back home or start a trial.",
    "Back home": "Back home",
    Confirm: "Confirm",
    Cancel: "Cancel",
    Close: "Close",
    "Expand sidebar": "Expand sidebar",
    "Collapse sidebar": "Collapse sidebar",
    "Primary navigation": "Primary navigation",
    Workspace: "Workspace",
    Account: "Account",
    Dashboard: "Dashboard",
    Approvals: "Approvals",
    Conversations: "Conversations",
    Reports: "Reports",
    Integrations: "Integrations",
    Billing: "Billing",
    Team: "Team",
    Settings: "Settings",
    Logs: "Logs",
    Help: "Help",
    "Log out": "Log out",
    "Choose workspace": "Choose workspace",
    "Switch workspace": "Switch workspace",
    "Add workspace": "Add workspace",
    "Workspace settings": "Workspace settings",
    "Search placeholder": "Search workers, conversations, reports…",
    "Search shortcut": "⌘K",
    "Open search": "Open search",
    "Language settings": "Language settings →",
    "Notifications pending": "Notifications · 7 pending",
    Profile: "Profile",
    Notifications: "Notifications",
    "Search dialog": "Search",
    "Search input placeholder": "Search workers, conversations, reports, settings...",
    "Close search": "Close search",
    "No matches prefix": "No matches for",
    "No matches suffix": ".",
    "Search empty hint": "Try a worker name, customer, or section.",
    "Navigate shortcut": "↑↓ Navigate",
    "Open shortcut": "↵ Open",
    "Esc close": "ESC Close",
    Breadcrumb: "Breadcrumb",
  },
};

const overrides: Partial<Record<Locale, Partial<CommonCopy>>> = {
  tr: {
    tagline: "Gerçek bir şirketi tek başına yönet.",
    subtagline: "Tek şirket beyni. 60+ AI çalışan. Sıfır chatbot.",
    description:
      "AI çalışanları araçla değil rolle işe al. Ürünlerini, fiyatlarını, sesini ve kurallarını bilen tek bir Marka Kitabı paylaşırlar. Kontrol sende kalır.",
    trialLine: "Üç günlük deneme. Kart gerekmez.",
    problemQuote:
      "Solo kurucunun bir ekibin kapasitesine ihtiyacı var, ama bunu karşılayamaz.",
    nav: {
      workforce: "İş gücü",
      pricing: "Fiyatlandırma",
      docs: "Dokümanlar",
      customers: "Müşteriler",
    },
    footer: {
      product: "Ürün",
      developers: "Geliştiriciler",
      company: "Şirket",
      legal: "Yasal",
    },
    links: {
      Workforce: "İş gücü",
      Pricing: "Fiyatlandırma",
      "Brand Bible": "Marka Kitabı",
      "Approval Center": "Onay Merkezi",
      Changelog: "Değişiklikler",
      Docs: "Dokümanlar",
      "API reference": "API referansı",
      SDKs: "SDK'lar",
      Webhooks: "Web kancaları",
      Status: "Durum",
      About: "Hakkında",
      Customers: "Müşteriler",
      Careers: "Kariyer",
      Press: "Basın",
      Contact: "İletişim",
      Privacy: "Gizlilik",
      Terms: "Şartlar",
      Security: "Güvenlik",
      DPA: "VİS",
      Cookies: "Çerezler",
    },
    cta: {
      primary: "Ücretsiz dene",
      secondary: "Nasıl çalışır",
      login: "Giriş yap",
    },
    labels: {
      "AI Workforce Platform": "AI İş Gücü Platformu",
      "All systems operational": "Tüm sistemler çalışıyor",
      Language: "Dil",
      available: "mevcut",
      "Change language": "Dili değiştir",
      "Select language": "Dil seç",
      "Open menu": "Menüyü aç",
      "Close menu": "Menüyü kapat",
      "404 page": "404 · Sayfa bulunamadı",
      "Page not shipped": "Bu sayfa henüz yayına çıkmadı.",
      "Page placeholder note":
        "Menüdeki bazı rotalar sitenin kalanını inşa ederken yer tutucu. Ana sayfaya dönebilir veya denemeyi başlatabilirsin.",
      "Back home": "Ana sayfaya dön",
      Confirm: "Onayla",
      Cancel: "İptal",
      Close: "Kapat",
      "Expand sidebar": "Kenar menüyü genişlet",
      "Collapse sidebar": "Kenar menüyü daralt",
      "Primary navigation": "Ana navigasyon",
      Workspace: "Çalışma alanı",
      Account: "Hesap",
      Dashboard: "Pano",
      Approvals: "Onaylar",
      Conversations: "Konuşmalar",
      Reports: "Raporlar",
      Integrations: "Entegrasyonlar",
      Billing: "Faturalama",
      Team: "Ekip",
      Settings: "Ayarlar",
      Logs: "Kayıtlar",
      Help: "Yardım",
      "Log out": "Çıkış yap",
      "Choose workspace": "Çalışma alanı seç",
      "Switch workspace": "Çalışma alanı değiştir",
      "Add workspace": "Çalışma alanı ekle",
      "Workspace settings": "Çalışma alanı ayarları",
      "Search placeholder": "Çalışan, konuşma, rapor ara…",
      "Search shortcut": "⌘K",
      "Open search": "Aramayı aç",
      "Language settings": "Dil ayarları →",
      "Notifications pending": "Bildirimler · 7 bekliyor",
      Profile: "Profil",
      Notifications: "Bildirimler",
      "Search dialog": "Arama",
      "Search input placeholder": "Çalışan, konuşma, rapor, ayar ara...",
      "Close search": "Aramayı kapat",
      "No matches prefix": "Eşleşme yok:",
      "No matches suffix": ".",
      "Search empty hint": "Bir çalışan adı, müşteri veya bölüm dene.",
      "Navigate shortcut": "↑↓ Gezin",
      "Open shortcut": "↵ Aç",
      "Esc close": "ESC Kapat",
      Breadcrumb: "Breadcrumb",
    },
  },
  de: {
    tagline: "Führe ein echtes Unternehmen. Allein.",
    subtagline: "Ein Unternehmensgehirn. 60+ KI-Mitarbeiter. Keine Chatbots.",
    trialLine: "Drei Tage testen. Keine Karte.",
  },
  fr: {
    tagline: "Gérez une vraie entreprise. Seul.",
    subtagline: "Un cerveau d’entreprise. 60+ employés IA. Zéro chatbot.",
    trialLine: "Essai de trois jours. Aucune carte.",
  },
  es: {
    tagline: "Dirige una empresa real. Solo.",
    subtagline: "Un cerebro empresarial. 60+ trabajadores IA. Cero chatbots.",
    trialLine: "Prueba de tres días. Sin tarjeta.",
  },
  pt: {
    tagline: "Comande uma empresa real. Sozinho.",
    subtagline: "Um cérebro de empresa. 60+ trabalhadores IA. Zero chatbots.",
    trialLine: "Teste de três dias. Sem cartão.",
  },
};

export function getCommonCopy(locale: Locale): CommonCopy {
  const localeCopy = overrides[locale] ?? {};
  const base = locale === DEFAULT_LOCALE ? en : localizeCopy(en, locale);
  return {
    ...base,
    ...localeCopy,
    nav: { ...base.nav, ...localeCopy.nav },
    footer: { ...base.footer, ...localeCopy.footer },
    links: { ...base.links, ...localeCopy.links },
    cta: { ...base.cta, ...localeCopy.cta },
    labels: { ...base.labels, ...localeCopy.labels },
  };
}

export function commonText(locale: Locale, text: string) {
  const copy = getCommonCopy(locale);
  const merged = {
    ...copy.labels,
    ...copy.links,
    [en.tagline]: copy.tagline,
    [en.subtagline]: copy.subtagline,
    [en.description]: copy.description,
    [en.trialLine]: copy.trialLine,
    [en.problemQuote]: copy.problemQuote,
  };

  return merged[text] ?? (locale === DEFAULT_LOCALE ? text : text);
}
