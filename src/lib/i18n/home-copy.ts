import type { Locale } from "./config";
import { getCopy } from "./copy-localizer";

type HomeCopy = {
  finalCta: {
    eyebrow: string;
    body: string;
  };
  problem: {
    eyebrow: string;
    stats: { numeral: string; label: string }[];
  };
  brandBible: {
    eyebrow: string;
    title: string;
    body: string;
    completion: string;
    fileName: string;
    synced: string;
    readBy: string;
    fields: { key: string; value: string }[];
    readers: string[];
  };
  workforce: {
    eyebrow: string;
    title: string;
    body: string;
    seeAll: string;
    available: string;
    coming: string;
    hireAs: string;
    roles: {
      category: string;
      title: string;
      summary: string;
      status: "available" | "q3";
    }[];
  };
  how: {
    eyebrow: string;
    title: string;
    steps: { title: string; body: string }[];
  };
  dashboard: {
    live: string;
    appPath: string;
    activityTitle: string;
    activityCount: string;
    workforceTitle: string;
    online: string;
    kpis: { label: string; value: string; delta: string; positive: boolean }[];
    workers: { initials: string; name: string; load: number }[];
    activity: {
      time: string;
      worker: string;
      action: string;
      status: string;
      pending: boolean;
    }[];
  };
  showcase: {
    statusPill: string;
    workerCard: {
      name: string;
      role: string;
      userMessage: string;
      assistantReply: string;
    };
    bibleCard: { label: string; title: string; meta: string };
    approvalCard: {
      label: string;
      badge: string;
      body: string;
      approve: string;
      edit: string;
    };
    planCard: { label: string; badge: string; title: string; price: string; bullets: string[] };
    channelsCard: { label: string; channels: string[] };
    revenueCard: { label: string; value: string; delta: string };
  };
};

const en: HomeCopy = {
  finalCta: {
    eyebrow: "Last word",
    body: "Onboard in under an hour. Hire your first three AI workers today. Loosen the leash as trust builds. No surprises, ever.",
  },
  problem: {
    eyebrow: "The premise",
    stats: [
      { numeral: "1", label: "Brand Bible per company" },
      { numeral: "60+", label: "AI roles, by employment" },
      { numeral: "0", label: "Generic chatbots" },
    ],
  },
  brandBible: {
    eyebrow: "01 / The moat",
    title: "One company brain. Many AI bodies.",
    body: "Every AI worker reads from the same Brand Bible — your products, your prices, your voice, your rules. Structured once. Updated as your company changes. Consistency is a property of the system, not a request to the user.",
    completion: "87% complete",
    fileName: "brand-bible.json",
    synced: "synced",
    readBy: "Read by 6 of 18 workers today",
    fields: [
      { key: "Identity", value: "Company name, sector, markets, languages" },
      { key: "Catalog", value: "Products, variants, prices, availability" },
      { key: "Voice", value: "Tone, length, formality, restricted topics" },
      { key: "Policies", value: "Refunds, returns, warranties, shipping" },
      { key: "Limits", value: "Discount authority, spend caps, hours" },
      { key: "Recipients", value: "Who gets which report, when" },
    ],
    readers: [
      "Customer Support",
      "Inbound Sales",
      "Social Media",
      "SEO Specialist",
      "Content Writer",
      "Bookkeeping",
    ],
  },
  workforce: {
    eyebrow: "02 / The workforce",
    title: "64 roles in catalog. All hireable today.",
    body: "Hire by job description, not by API. Every role ships with conservative defaults, its own channel list, and a permission scope you can tighten.",
    seeAll: "See all 60 roles",
    available: "Available now",
    coming: "Coming Q3 2026",
    hireAs: "Hire as employee",
    roles: [
      {
        category: "Customer-facing",
        title: "Customer Support",
        summary:
          "Answers on web chat, WhatsApp, email. Knows your products, policies, and limits.",
        status: "available",
      },
      {
        category: "Sales",
        title: "Inbound Sales Closer",
        summary:
          "Qualifies leads, books meetings, follows up. Hands off when a human should.",
        status: "available",
      },
      {
        category: "Marketing",
        title: "Social Media Manager",
        summary:
          "Drafts posts for IG, X, FB, LinkedIn. Schedules. Replies to comments.",
        status: "available",
      },
      {
        category: "Marketing",
        title: "SEO Specialist",
        summary:
          "Audits the site, picks keywords, writes the content, fixes the meta.",
        status: "available",
      },
      {
        category: "Marketing",
        title: "Content Writer",
        summary:
          "Long-form blog posts, product descriptions, and landing copy in your voice.",
        status: "available",
      },
      {
        category: "Finance",
        title: "Bookkeeping Assistant",
        summary:
          "Tracks income, expenses, and invoices. Monthly report to your accountant.",
        status: "available",
      },
      {
        category: "Customer-facing",
        title: "Voice Agent",
        summary: "Inbound and outbound calls in 23 languages. Transcripts archived.",
        status: "q3",
      },
      {
        category: "Marketing",
        title: "Backlink AI",
        summary:
          "Browser-automated outreach for high-quality backlinks. Anti-penalty discipline.",
        status: "q3",
      },
      {
        category: "Operations",
        title: "Marketplace Ops",
        summary:
          "Amazon, eBay, Etsy listings. Repricing. Customer messaging. Returns.",
        status: "q3",
      },
    ],
  },
  how: {
    eyebrow: "03 / How it works",
    title: "Six steps. Then the work runs without you.",
    steps: [
      {
        title: "Onboard in under an hour",
        body: "The wizard pulls from your site, your docs, and a short interview. No questionnaire fatigue.",
      },
      {
        title: "Build the Brand Bible",
        body: "Products, prices, policies, voice, rules — structured once. Every AI worker reads from it. This is the moat.",
      },
      {
        title: "Hire roles, not tools",
        body: "Pick from the catalog. Customer Support, SEO, Social, Sales, more. Conservative defaults out of the box.",
      },
      {
        title: "Set the limits before they spend",
        body: "Daily and monthly caps. Restricted topics. Discount ceilings. Enforced at the platform layer, not the prompt.",
      },
      {
        title: "Risky actions wait for you",
        body: "The Approval Center routes high-stakes drafts to your phone. One tap to approve. You loosen the leash as trust builds.",
      },
      {
        title: "Audit, reverse, repeat",
        body: "Every action logged. Reversible where possible. Daily briefing in your inbox. No black box.",
      },
    ],
  },
  dashboard: {
    live: "Live",
    appPath: "app.staffbix.com / dashboard",
    activityTitle: "Activity · last 30 min",
    activityCount: "18 today",
    workforceTitle: "Workforce · 4 of 18",
    online: "Online",
    kpis: [
      { label: "Messages today", value: "412", delta: "+18%", positive: true },
      { label: "Approvals pending", value: "7", delta: "3 high", positive: true },
      { label: "Spend today", value: "$43", delta: "of $200 cap", positive: true },
      { label: "Voice match", value: "98%", delta: "across 6 roles", positive: true },
    ],
    workers: [
      { initials: "CS", name: "Customer Support", load: 64 },
      { initials: "IS", name: "Inbound Sales", load: 41 },
      { initials: "SM", name: "Social Media", load: 27 },
      { initials: "SE", name: "SEO Specialist", load: 52 },
    ],
    activity: [
      {
        time: "14:23",
        worker: "Inbound Sales",
        action: "Drafted “free returns” addition for the thank-you sequence",
        status: "Pending",
        pending: true,
      },
      {
        time: "14:21",
        worker: "Customer Support",
        action: "Replied to order #1843 (delivery question)",
        status: "Sent",
        pending: false,
      },
      {
        time: "14:18",
        worker: "Social Media",
        action: "Scheduled 3 posts for Instagram this week",
        status: "Pending",
        pending: true,
      },
      {
        time: "14:05",
        worker: "SEO Specialist",
        action: "Published blog: “Why solo founders skip CRMs”",
        status: "Live",
        pending: false,
      },
    ],
  },
  showcase: {
    statusPill: "18 workers · online",
    workerCard: {
      name: "Cyrus",
      role: "Customer Support",
      userMessage: "Hi! When can I return this order?",
      assistantReply: "You have 14 days from delivery — I'll send the label now.",
    },
    bibleCard: {
      label: "Brand Bible",
      title: "Returns policy",
      meta: "14 days · synced 2 min ago",
    },
    approvalCard: {
      label: "Approval queue",
      badge: "$120",
      body: "Refund order #1843 — Cyrus drafted reply for your approval.",
      approve: "Approve",
      edit: "Edit",
    },
    planCard: {
      label: "Current plan",
      badge: "Active",
      title: "Growth",
      price: "$149 / mo",
      bullets: ["3 workers", "$250 AI / mo", "All channels"],
    },
    channelsCard: {
      label: "Channels",
      channels: ["Web", "WhatsApp", "Email", "Instagram"],
    },
    revenueCard: {
      label: "Messages · 7d",
      value: "1,342",
      delta: "+18% vs prev",
    },
  },
};

const tr: HomeCopy = {
  ...en,
  finalCta: {
    eyebrow: "Son söz",
    body: "Bir saatten kısa sürede başla. İlk üç AI çalışanını bugün işe al. Güven oluştukça yetkileri genişlet. Sürpriz yok.",
  },
  problem: {
    eyebrow: "Önerme",
    stats: [
      { numeral: "1", label: "Şirket başına Marka Kitabı" },
      { numeral: "60+", label: "İstihdama göre AI rolleri" },
      { numeral: "0", label: "Genel chatbot" },
    ],
  },
  brandBible: {
    ...en.brandBible,
    eyebrow: "01 / Savunma hattı",
    title: "Tek şirket beyni. Birçok AI gövdesi.",
    body: "Her AI çalışan aynı Marka Kitabı’ndan okur: ürünlerin, fiyatların, ses tonun ve kuralların. Bir kez yapılandırılır. Şirketin değiştikçe güncellenir. Tutarlılık kullanıcıdan istenen bir rica değil, sistemin özelliğidir.",
    completion: "%87 tamamlandı",
    fileName: "brand-bible.json",
    synced: "eşitlendi",
    readBy: "Bugün 18 çalışanın 6’sı tarafından okundu",
    fields: [
      { key: "Kimlik", value: "Şirket adı, sektör, pazarlar, diller" },
      { key: "Katalog", value: "Ürünler, varyantlar, fiyatlar, stok durumu" },
      { key: "Ses", value: "Ton, uzunluk, resmiyet, yasaklı konular" },
      { key: "Politikalar", value: "İadeler, değişimler, garantiler, kargo" },
      { key: "Limitler", value: "İndirim yetkisi, harcama tavanları, saatler" },
      { key: "Alıcılar", value: "Hangi raporu kim, ne zaman alır" },
    ],
    readers: [
      "Müşteri Desteği",
      "Gelen Satış",
      "Sosyal Medya",
      "SEO Uzmanı",
      "İçerik Yazarı",
      "Muhasebe",
    ],
  },
  workforce: {
    ...en.workforce,
    eyebrow: "02 / İş gücü",
    title: "Katalogda 64 rol. Hepsi bugün işe alınabilir.",
    body: "API’ye göre değil, iş tanımına göre işe al. Her rol temkinli varsayılanlarla, kendi kanal listesiyle ve daraltabileceğin yetki kapsamıyla gelir.",
    seeAll: "60 rolün tamamını gör",
    available: "Şimdi mevcut",
    coming: "2026 3. çeyrekte geliyor",
    hireAs: "Çalışan olarak işe al",
    roles: [
      {
        category: "Müşteriyle temas",
        title: "Müşteri Desteği",
        summary:
          "Web chat, WhatsApp ve e-postada yanıt verir. Ürünlerini, politikalarını ve limitlerini bilir.",
        status: "available",
      },
      {
        category: "Satış",
        title: "Gelen Satış Kapatıcı",
        summary:
          "Lead’leri nitelendirir, toplantı ayarlar, takip eder. İnsan gerektiğinde devreder.",
        status: "available",
      },
      {
        category: "Pazarlama",
        title: "Sosyal Medya Yöneticisi",
        summary:
          "IG, X, FB ve LinkedIn için gönderi taslakları hazırlar. Planlar. Yorumlara yanıt verir.",
        status: "available",
      },
      {
        category: "Pazarlama",
        title: "SEO Uzmanı",
        summary: "Siteyi denetler, anahtar kelime seçer, içerik yazar, metayı düzeltir.",
        status: "available",
      },
      {
        category: "Pazarlama",
        title: "İçerik Yazarı",
        summary:
          "Uzun blog yazıları, ürün açıklamaları ve landing metinlerini senin sesinle yazar.",
        status: "available",
      },
      {
        category: "Finans",
        title: "Muhasebe Asistanı",
        summary:
          "Gelirleri, giderleri ve faturaları izler. Muhasebecine aylık rapor hazırlar.",
        status: "available",
      },
      {
        category: "Müşteriyle temas",
        title: "Sesli Temsilci",
        summary: "23 dilde gelen ve giden aramalar. Transkriptler arşivlenir.",
        status: "q3",
      },
      {
        category: "Pazarlama",
        title: "Backlink AI",
        summary:
          "Kaliteli backlink için tarayıcı otomasyonlu erişim. Ceza riskine karşı disiplinli.",
        status: "q3",
      },
      {
        category: "Operasyon",
        title: "Pazaryeri Operasyonları",
        summary: "Amazon, eBay, Etsy listeleri. Yeniden fiyatlama. Müşteri mesajları. İadeler.",
        status: "q3",
      },
    ],
  },
  how: {
    eyebrow: "03 / Nasıl çalışır",
    title: "Altı adım. Sonra iş sensiz akar.",
    steps: [
      {
        title: "Bir saatten kısa sürede başla",
        body: "Sihirbaz sitenden, dokümanlarından ve kısa bir görüşmeden veri çeker. Anket yorgunluğu yok.",
      },
      {
        title: "Marka Kitabı’nı oluştur",
        body: "Ürünler, fiyatlar, politikalar, ses tonu ve kurallar bir kez yapılandırılır. Her AI çalışan buradan okur.",
      },
      {
        title: "Araç değil, rol işe al",
        body: "Katalogdan seç. Müşteri Desteği, SEO, Sosyal, Satış ve daha fazlası. Varsayılanlar temkinlidir.",
      },
      {
        title: "Harcama öncesi limit koy",
        body: "Günlük ve aylık tavanlar. Yasaklı konular. İndirim sınırları. Prompt’ta değil platform katmanında uygulanır.",
      },
      {
        title: "Riskli işler seni bekler",
        body: "Onay Merkezi yüksek riskli taslakları telefonuna yollar. Tek dokunuşla onayla. Güven arttıkça yetkiyi genişlet.",
      },
      {
        title: "Denetle, geri al, tekrarla",
        body: "Her işlem kayıtlıdır. Mümkün olanlar geri alınabilir. Günlük özet gelen kutunda. Kara kutu yok.",
      },
    ],
  },
  dashboard: {
    ...en.dashboard,
    live: "Canlı",
    appPath: "app.staffbix.com / panel",
    activityTitle: "Aktivite · son 30 dk",
    activityCount: "Bugün 18",
    workforceTitle: "İş gücü · 18’den 4’ü",
    online: "Çevrimiçi",
    kpis: [
      { label: "Bugünkü mesajlar", value: "412", delta: "+%18", positive: true },
      { label: "Bekleyen onaylar", value: "7", delta: "3 yüksek", positive: true },
      { label: "Bugünkü harcama", value: "$43", delta: "$200 tavan içinde", positive: true },
      { label: "Ses uyumu", value: "%98", delta: "6 rolde", positive: true },
    ],
    workers: [
      { initials: "MD", name: "Müşteri Desteği", load: 64 },
      { initials: "GS", name: "Gelen Satış", load: 41 },
      { initials: "SM", name: "Sosyal Medya", load: 27 },
      { initials: "SE", name: "SEO Uzmanı", load: 52 },
    ],
    activity: [
      {
        time: "14:23",
        worker: "Gelen Satış",
        action: "Teşekkür akışı için “ücretsiz iade” ekini taslakladı",
        status: "Bekliyor",
        pending: true,
      },
      {
        time: "14:21",
        worker: "Müşteri Desteği",
        action: "#1843 siparişine yanıt verdi (teslimat sorusu)",
        status: "Gönderildi",
        pending: false,
      },
      {
        time: "14:18",
        worker: "Sosyal Medya",
        action: "Bu hafta Instagram için 3 gönderi planladı",
        status: "Bekliyor",
        pending: true,
      },
      {
        time: "14:05",
        worker: "SEO Uzmanı",
        action: "Blog yayınladı: “Solo kurucular neden CRM atlar”",
        status: "Yayında",
        pending: false,
      },
    ],
  },
  showcase: {
    statusPill: "18 çalışan · çevrimiçi",
    workerCard: {
      name: "Cyrus",
      role: "Müşteri Destek",
      userMessage: "Merhaba! Siparişimi ne zamana kadar iade edebilirim?",
      assistantReply:
        "Teslimattan itibaren 14 gününüz var — etiketi şimdi gönderiyorum.",
    },
    bibleCard: {
      label: "Marka Kitabı",
      title: "İade politikası",
      meta: "14 gün · 2 dk önce senkron",
    },
    approvalCard: {
      label: "Onay sırası",
      badge: "$120",
      body: "#1843 siparişinin iadesi — Cyrus onayınız için yanıt hazırladı.",
      approve: "Onayla",
      edit: "Düzenle",
    },
    planCard: {
      label: "Mevcut plan",
      badge: "Aktif",
      title: "Growth",
      price: "$149 / ay",
      bullets: ["3 çalışan", "$250 AI / ay", "Tüm kanallar"],
    },
    channelsCard: {
      label: "Kanallar",
      channels: ["Web", "WhatsApp", "E-posta", "Instagram"],
    },
    revenueCard: {
      label: "Mesajlar · 7g",
      value: "1.342",
      delta: "+%18 önceki",
    },
  },
};

const copies: Partial<Record<Locale, HomeCopy>> = { en, tr };

export function getHomeCopy(locale: Locale) {
  return getCopy(copies as { en: HomeCopy; tr: HomeCopy }, locale) as HomeCopy;
}
