import type { Locale } from "./config";
import { getCopy, localizeCopy } from "./copy-localizer";

const workforce = {
  en: {
    metadata: {
      title: "Workforce — Staffbix",
      description:
        "64 AI roles in catalog. All hireable today. Hire by job description, not by API.",
      keywords: [
        "Staffbix workforce",
        "AI workforce roles",
        "hire AI customer support",
        "AI SDR",
        "AI content writer",
        "AI social media manager",
        "AI SEO specialist",
        "AI bookkeeping assistant",
        "60 AI worker roles",
      ],
    },
    header: {
      eyebrow: "01 / The workforce",
      title: "Hire AI employees by role, not by tool.",
      sub: "64 roles in catalog, all hireable today. Each one ships with conservative defaults, its own channel list, and a permission scope you can tighten as trust builds.",
    },
    catalog: {
      showRoadmap: "Show roadmap roles",
      roleSingular: "role",
      rolePlural: "roles",
      noMatches: "No roles match this filter.",
      available: "Available",
      coming: "Coming Q3",
      hireAs: "Hire as employee",
      categories: {
        All: "All",
        "Customer-facing": "Customer-facing",
        Sales: "Sales",
        Marketing: "Marketing",
        Operations: "Operations",
        Finance: "Finance",
        Leadership: "Leadership",
      },
    },
  },
  tr: {
    metadata: {
      title: "İş gücü — Staffbix",
      description:
        "Katalogda 64 AI rolü. Hepsi bugün işe alınabilir. API’ye göre değil, iş tanımına göre işe al.",
      keywords: [
        "Staffbix workforce",
        "AI workforce roles",
        "hire AI customer support",
        "AI SDR",
        "AI content writer",
        "AI social media manager",
        "AI SEO specialist",
        "AI bookkeeping assistant",
        "60 AI worker roles",
      ],
    },
    header: {
      eyebrow: "01 / İş gücü",
      title: "AI çalışanları araçla değil rolle işe al.",
      sub: "Katalogda 64 rol var ve hepsi bugün işe alınabilir. Her biri temkinli varsayılanlar, kendi kanal listesi ve güven arttıkça daraltıp genişletebileceğin yetki kapsamıyla gelir.",
    },
    catalog: {
      showRoadmap: "Yol haritası rollerini göster",
      roleSingular: "rol",
      rolePlural: "rol",
      noMatches: "Bu filtreyle eşleşen rol yok.",
      available: "Mevcut",
      coming: "3. çeyrekte",
      hireAs: "Çalışan olarak işe al",
      categories: {
        All: "Tümü",
        "Customer-facing": "Müşteriyle temas",
        Sales: "Satış",
        Marketing: "Pazarlama",
        Operations: "Operasyon",
        Finance: "Finans",
        Leadership: "Liderlik",
      },
    },
  },
} as const;

const about = {
  en: {
    metadata: {
      title: "About — Staffbix",
      description:
        "Why Staffbix exists. Seventeen years of shipping, eight hundred projects, one stubborn pattern: solo founders who could see what their company needed but never afford the team.",
      keywords: [
        "About Staffbix",
        "Staffbix story",
        "AI workforce company",
        "Staffbix mission",
        "AI for solo founders",
        "AI for SMB founders",
        "Staffbix founder",
      ],
    },
    header: {
      eyebrow: "About",
      title: "Why Staffbix exists.",
      sub: "One stubborn pattern, seventeen years of watching it: solo founders who could see exactly what their company needed but never afford the team to do it.",
    },
    story: {
      eyebrow: "The story",
      paragraphs: [
        "In seventeen years I shipped over eight hundred projects. Most of them were for solo founders and small teams trying to do everything alone.",
        "The pattern showed up over and over. People who could see exactly what their company needed — customer support, marketing, sales, SEO, finance — but could never afford the team to do it. So they tried to do everything themselves. They burned out. Their companies stayed small, not because the founder lacked ambition, but because the founder lacked hours.",
        "I built tools to help. CRMs, automation, dashboards. They helped a little. None of them did the actual work.",
        "Then AI got good enough to do the actual work — but only on one slice at a time. A chatbot for support. A copywriter for content. An ad manager for ads. The solo founder still had to stitch them together, teach each one the company, keep them in sync. The plumbing was the new bottleneck.",
        "Staffbix is what I wished existed in 2017. One Brand Bible. Many AI workers. They share a brain. They obey limits. They wait for approval on the hard stuff. They make the solo founder credible at scale — without making them irrelevant in their own company.",
      ],
      founderName: "Alex Morgan",
      founderTitle: "Founder, AtaForge Inc.",
    },
    facts: [
      { label: "Founded", value: "2026" },
      { label: "HQ", value: "Istanbul + remote" },
      { label: "Team", value: "Small, on purpose" },
      { label: "Funding", value: "Bootstrapped" },
    ],
    principlesIntro: {
      eyebrow: "Principles",
      title: "Eight rules we hold ourselves to.",
      body: "These are non-negotiable design constraints. Every feature decision is checked against them. We’ll show our work if you ask.",
    },
    principles: [
      {
        title: "Human in command.",
        body: "AI workers never take irreversible high-stakes actions without explicit approval. Defaults are conservative. You loosen, not the other way around.",
      },
      {
        title: "One brain, many bodies.",
        body: "Every AI worker reads from the same Brand Bible. Consistency is a property of the system, not a request to the user.",
      },
      {
        title: "Honest scope at every tier.",
        body: "Free trial is meaningfully limited. Paid tiers deliver clear value. No dark patterns to leave.",
      },
      {
        title: "Observable and reversible.",
        body: "Every AI action is logged, auditable, reversible where possible. Spending and content have hard limits enforced at the platform layer.",
      },
      {
        title: "Global from day one.",
        body: "USD pricing, English default, 23 languages, no country-specific assumptions in core flows. RTL supported automatically.",
      },
      {
        title: "Composable and replaceable.",
        body: "AI workers are configurations, not hardcoded codepaths. New roles are added by config, not engineering.",
      },
      {
        title: "Open at the edges, closed at the core.",
        body: "Public API, four SDKs, webhooks, white-label surfaces. The Brand Bible engine, the orchestrator, and the approval engine stay proprietary.",
      },
      {
        title: "Security as a product feature.",
        body: "Tenant isolation, encryption, OTP, rate limiting, audit trails, least privilege. Visible to enterprise buyers, not hidden in a compliance doc.",
      },
    ],
  },
  tr: {
    metadata: {
      title: "Hakkında — Staffbix",
      description:
        "Staffbix neden var. On yedi yıl, sekiz yüz proje ve aynı inatçı desen: şirketinin neye ihtiyacı olduğunu gören ama ekibi karşılayamayan solo kurucular.",
      keywords: [
        "About Staffbix",
        "Staffbix story",
        "AI workforce company",
        "Staffbix mission",
        "AI for solo founders",
        "AI for SMB founders",
        "Staffbix founder",
      ],
    },
    header: {
      eyebrow: "Hakkında",
      title: "Staffbix neden var.",
      sub: "On yedi yıl boyunca tekrar tekrar görülen tek desen: şirketinin neye ihtiyacı olduğunu bilen ama bunu yapacak ekibi karşılayamayan solo kurucular.",
    },
    story: {
      eyebrow: "Hikâye",
      paragraphs: [
        "On yedi yılda sekiz yüzün üzerinde proje teslim ettim. Çoğu her şeyi tek başına yapmaya çalışan solo kurucular ve küçük ekipler içindi.",
        "Aynı desen tekrar tekrar ortaya çıktı. Şirketlerinin tam olarak neye ihtiyacı olduğunu gören insanlar: müşteri desteği, pazarlama, satış, SEO, finans. Ama bunu yapacak ekibi hiçbir zaman karşılayamıyorlardı. Bu yüzden her şeyi kendileri yapmaya çalıştılar. Tükendiler. Şirketleri küçük kaldı; kurucu hırssız olduğu için değil, saatleri yetmediği için.",
        "Yardımcı olacak araçlar yaptım. CRM’ler, otomasyonlar, paneller. Biraz yardımcı oldular. Hiçbiri gerçek işi yapmadı.",
        "Sonra AI gerçek işi yapacak kadar iyi hale geldi, ama her seferinde sadece tek bir dilimde. Destek için chatbot. İçerik için metin yazarı. Reklam için reklam yöneticisi. Solo kurucu hâlâ bunları birbirine bağlamak, her birine şirketi öğretmek ve senkron tutmak zorundaydı. Yeni darboğaz tesisatın kendisiydi.",
        "Staffbix, 2017’de var olmasını istediğim şey. Tek Marka Kitabı. Birçok AI çalışan. Aynı beyni paylaşırlar. Limitlere uyarlar. Zor işlerde onay beklerler. Solo kurucuyu kendi şirketinde gereksiz kılmadan ölçekli ve güvenilir hale getirirler.",
      ],
      founderName: "Alex Morgan",
      founderTitle: "Kurucu, AtaForge Inc.",
    },
    facts: [
      { label: "Kuruluş", value: "2026" },
      { label: "Merkez", value: "İstanbul + uzaktan" },
      { label: "Ekip", value: "Bilinçli olarak küçük" },
      { label: "Finansman", value: "Bootstrapped" },
    ],
    principlesIntro: {
      eyebrow: "İlkeler",
      title: "Kendimizi bağlı tuttuğumuz sekiz kural.",
      body: "Bunlar pazarlık konusu olmayan tasarım kısıtlarıdır. Her özellik kararı bunlara göre kontrol edilir. Sorarsan gerekçemizi gösteririz.",
    },
    principles: [
      {
        title: "Komuta insanda.",
        body: "AI çalışanlar açık onay olmadan geri dönüşü zor, yüksek riskli eylemler yapmaz. Varsayılanlar temkinlidir. Yetkiyi sen genişletirsin.",
      },
      {
        title: "Tek beyin, birçok gövde.",
        body: "Her AI çalışan aynı Marka Kitabı’nı okur. Tutarlılık kullanıcıdan istenen bir rica değil, sistemin özelliğidir.",
      },
      {
        title: "Her pakette dürüst kapsam.",
        body: "Ücretsiz deneme anlamlı şekilde sınırlıdır. Ücretli paketler net değer sunar. Ayrılmayı zorlaştıran karanlık desen yoktur.",
      },
      {
        title: "Gözlemlenebilir ve geri alınabilir.",
        body: "Her AI işlemi kayıtlı, denetlenebilir ve mümkün olduğunda geri alınabilirdir. Harcama ve içerik limitleri platform katmanında uygulanır.",
      },
      {
        title: "İlk günden global.",
        body: "USD fiyatlandırma, İngilizce varsayılan, 23 dil ve çekirdek akışlarda ülkeye özel varsayım yok. RTL otomatik desteklenir.",
      },
      {
        title: "Birleşebilir ve değiştirilebilir.",
        body: "AI çalışanlar hardcode edilmiş yollar değil, konfigürasyonlardır. Yeni roller mühendislik değil yapılandırma ile eklenir.",
      },
      {
        title: "Kenarlarda açık, çekirdekte kapalı.",
        body: "Public API, dört SDK, webhooks ve white-label yüzeyler. Marka Kitabı motoru, orkestratör ve onay motoru özel kalır.",
      },
      {
        title: "Güvenlik ürün özelliğidir.",
        body: "Tenant izolasyonu, şifreleme, OTP, rate limit, audit trail ve en az yetki. Kurumsal alıcıya görünür, uyumluluk dokümanına saklanmaz.",
      },
    ],
  },
} as const;

const brandBible = {
  en: {
    metadata: {
      title: "Brand Bible — Staffbix",
      description:
        "One company brain, many AI bodies. The structured knowledge base every AI worker reads from.",
      keywords: [
        "Brand Bible",
        "Staffbix Brand Bible",
        "company knowledge base AI",
        "single source of truth AI",
        "brand voice rules",
        "AI brand consistency",
        "structured company data AI",
      ],
    },
    header: {
      eyebrow: "Product · Brand Bible",
      title: "One company brain. Many AI bodies.",
      sub: "Every AI worker reads from the same structured knowledge base — your products, prices, policies, voice, rules, recipients. Built once on onboarding. Updated as your company changes. The thing that makes the rest of the platform work.",
    },
    preview: {
      file: "brand-bible.json · northway-goods",
      progress: "87% complete · 12 sources",
      synced: "synced",
      fields: [
        { key: "Identity", value: "Company name, sector, markets, languages, time zone." },
        { key: "Catalog", value: "Products, variants, prices, availability, SKUs, photos." },
        { key: "Voice", value: "Tone, length, formality, humour, emoji policy, restricted topics." },
        { key: "Policies", value: "Refunds, returns, warranties, shipping, privacy." },
        { key: "Limits", value: "Discount authority, spend caps, hours, escalation triggers." },
        { key: "Recipients", value: "Who gets which report, when, in what language." },
      ],
    },
    ingestion: {
      eyebrow: "01 / Ingestion",
      title: "Six sources, working in parallel.",
      body: "None of them is required, all of them compose. Most customers reach 70% readiness in under an hour by combining website crawl plus one document upload.",
      sources: [
        {
          title: "Website crawl",
          body: "Respectful sitemap traversal. Pulls product pages, FAQs, policy pages, blog. Rate-limited, user-agent disclosed.",
        },
        {
          title: "Document upload",
          body: "PDF, Word, Excel, plain text. Structured extraction lifts products, prices, FAQs into the right field — not just chunked text.",
        },
        {
          title: "Integrations",
          body: "Shopify, WooCommerce, Notion, Google Drive, Dropbox. Real-time sync where the integration supports it.",
        },
        {
          title: "AI-led interview",
          body: "When your site is thin, the system asks targeted questions. Caps at 12. You can stop at any point.",
        },
        {
          title: "Conversation import",
          body: "Optional. Past WhatsApp exports, email archives, call transcripts feed tone and frequent questions.",
        },
        {
          title: "Competitor sweep",
          body: "Reviews a handful of competitors to surface gaps. Read-only. Never copies wording.",
        },
      ],
    },
    principles: {
      eyebrow: "02 / Principles",
      title: "Four rules the Brand Bible holds itself to.",
      items: [
        {
          title: "Source of truth, not source of inspiration.",
          body: "AI workers retrieve from the Bible deterministically. They cite. They do not invent product details or policies.",
        },
        {
          title: "Tenant-isolated by design.",
          body: "Per-tenant vector namespace. Application services scope every read to your tenant. Cross-tenant access is impossible.",
        },
        {
          title: "Learns from your corrections.",
          body: "When you reject an AI output, the correction feeds back. The Bible updates. The mistake doesn't recur.",
        },
        {
          title: "Yours to export, yours to delete.",
          body: "Full JSON export from settings. Deletion on request per GDPR. We do not train foundation models on your data.",
        },
      ],
    },
  },
  tr: {
    metadata: {
      title: "Marka Kitabı — Staffbix",
      description:
        "Tek şirket beyni, birçok AI gövdesi. Her AI çalışanın okuduğu yapılandırılmış bilgi tabanı.",
      keywords: [
        "Brand Bible",
        "Staffbix Brand Bible",
        "company knowledge base AI",
        "single source of truth AI",
        "brand voice rules",
        "AI brand consistency",
        "structured company data AI",
      ],
    },
    header: {
      eyebrow: "Ürün · Marka Kitabı",
      title: "Tek şirket beyni. Birçok AI gövdesi.",
      sub: "Her AI çalışan aynı yapılandırılmış bilgi tabanından okur: ürünlerin, fiyatların, politikaların, ses tonun, kuralların ve alıcıların. Onboarding’de bir kez kurulur. Şirketin değiştikçe güncellenir. Platformun geri kalanını çalıştıran şey budur.",
    },
    preview: {
      file: "marka-kitabi.json · northway-goods",
      progress: "%87 tamamlandı · 12 kaynak",
      synced: "eşitlendi",
      fields: [
        { key: "Kimlik", value: "Şirket adı, sektör, pazarlar, diller, saat dilimi." },
        { key: "Katalog", value: "Ürünler, varyantlar, fiyatlar, stok durumu, SKU’lar, fotoğraflar." },
        { key: "Ses", value: "Ton, uzunluk, resmiyet, mizah, emoji politikası, yasaklı konular." },
        { key: "Politikalar", value: "İade, değişim, garanti, kargo, gizlilik." },
        { key: "Limitler", value: "İndirim yetkisi, harcama tavanları, saatler, eskalasyon tetikleri." },
        { key: "Alıcılar", value: "Hangi raporu kim, ne zaman, hangi dilde alır." },
      ],
    },
    ingestion: {
      eyebrow: "01 / Veri alma",
      title: "Paralel çalışan altı kaynak.",
      body: "Hiçbiri zorunlu değildir, hepsi birleşir. Çoğu müşteri web sitesi taraması ve tek doküman yüklemesiyle bir saatten kısa sürede %70 hazır hale gelir.",
      sources: [
        {
          title: "Web sitesi taraması",
          body: "Saygılı sitemap gezintisi. Ürün sayfaları, SSS, politika sayfaları ve blogu çeker. Rate limitlidir, user-agent açıktır.",
        },
        {
          title: "Doküman yükleme",
          body: "PDF, Word, Excel, düz metin. Yapılandırılmış çıkarım ürünleri, fiyatları ve SSS’leri doğru alana taşır; sadece metni parçalara bölmez.",
        },
        {
          title: "Entegrasyonlar",
          body: "Shopify, WooCommerce, Notion, Google Drive, Dropbox. Entegrasyon destekliyorsa gerçek zamanlı senkron.",
        },
        {
          title: "AI yönlendirmeli görüşme",
          body: "Siten zayıfsa sistem hedefli sorular sorar. En fazla 12 soru. İstediğin anda durdurabilirsin.",
        },
        {
          title: "Konuşma içe aktarma",
          body: "İsteğe bağlı. Geçmiş WhatsApp dışa aktarımları, e-posta arşivleri ve arama transkriptleri ton ve sık soruları besler.",
        },
        {
          title: "Rakip taraması",
          body: "Boşlukları görmek için birkaç rakibi inceler. Salt okunur. Asla metin kopyalamaz.",
        },
      ],
    },
    principles: {
      eyebrow: "02 / İlkeler",
      title: "Marka Kitabı’nın bağlı olduğu dört kural.",
      items: [
        {
          title: "İlham kaynağı değil, doğruluk kaynağı.",
          body: "AI çalışanlar Marka Kitabı’ndan deterministik şekilde bilgi alır. Kaynak gösterir. Ürün detayı veya politika uydurmaz.",
        },
        {
          title: "Tasarım gereği tenant izolasyonlu.",
          body: "Tenant başına ayrı vector namespace. Uygulama servisleri her okumayı tenant’ına göre sınırlar. Tenantlar arası erişim imkânsızdır.",
        },
        {
          title: "Düzeltmelerinden öğrenir.",
          body: "Bir AI çıktısını reddettiğinde düzeltme geri beslenir. Marka Kitabı güncellenir. Aynı hata tekrarlanmaz.",
        },
        {
          title: "Dışa aktarmak da silmek de senin hakkın.",
          body: "Ayarlar’dan tam JSON dışa aktarımı. GDPR kapsamında talep üzerine silme. Verinle foundation model eğitmeyiz.",
        },
      ],
    },
  },
} as const;

const approvalCenter = {
  en: {
    metadata: {
      title: "Approval Center — Staffbix",
      description:
        "The central queue where any AI-proposed action that requires human authorization waits. Push notification on your phone, one tap to approve, full audit log.",
      keywords: [
        "Staffbix Approval Center",
        "AI approval workflow",
        "human-in-the-loop AI",
        "AI autonomy levels",
        "approval queue",
        "AI agent safety",
        "AI guardrails",
      ],
    },
    header: {
      eyebrow: "Product · Approval Center",
      title: "The AI literally cannot go rogue.",
      sub: "Every AI-proposed action that costs money, publishes content, or commits to a customer routes through here. You decide what's autonomous and what waits. Defaults are conservative. You loosen, not the other way around.",
    },
    phone: {
      eyebrow: "01 / What you see on your phone",
      title: "A push notification, then one tap.",
      paragraphs: [
        "Worker, action, financial impact, reversibility flag, voice match — all on the lock screen. Approve, reject, or open for review. Rejecting with feedback teaches the Brand Bible.",
        "Push fan-outs to mobile through a single provider with fall-through to email and in-app inbox. Locale-aware. Quiet hours respected with critical-only override.",
      ],
    },
    modesIntro: {
      eyebrow: "02 / Three modes per action category",
      title: "Conservative defaults. You loosen as trust builds.",
    },
    modes: [
      {
        tag: "Automatic",
        title: "Executed immediately, logged, reported.",
        body: "For low-stakes, low-cost actions. Sending a routine reply, scheduling a low-budget post, applying a published refund policy. You see it in the audit log; you don't have to approve it.",
      },
      {
        tag: "Approval required",
        title: "Drafted by AI, waits for your one-tap decision.",
        body: "For spending, content publishing, customer-facing commitments, and policy edges. The default for most actions on most workers — loosen over time as trust builds.",
      },
      {
        tag: "Suggestion only",
        title: "AI proposes, you perform the action elsewhere.",
        body: "When the action touches systems we don't yet integrate. The AI drafts what to do; you do it. Useful in regulated industries during ramp-up.",
      },
    ],
    guardsIntro: {
      eyebrow: "03 / Guardrails",
      title: "Hard limits, not soft prompts.",
      body: "Limits are enforced at the platform layer, not the AI layer. A misbehaving prompt cannot exceed them.",
    },
    guards: [
      "Daily, monthly, and per-action spending caps per ad account.",
      "Maximum discount percentage per AI worker.",
      "Restricted topics the AI must never publish about.",
      "Forced escalation on customer-anger, high-value transactions, legal keywords, VIP signals.",
      "Reversibility window for posts, refunds, ad pauses — one click to roll back.",
    ],
    flowIntro: {
      eyebrow: "04 / Lifecycle",
      title: "Six phases. Audited end to end.",
    },
    flow: [
      {
        title: "Proposal",
        body: "Worker drafts an action with attached metadata: cost, target system, risk classification.",
      },
      {
        title: "Classification",
        body: "Engine determines mode from worker config, action category, and tenant policy.",
      },
      {
        title: "Routing",
        body: "Notification dispatched to push, email, and in-app inbox in your preferred locale.",
      },
      {
        title: "Decision",
        body: "Approve, reject with feedback, or open to review. One tap. From the lock screen if you want.",
      },
      {
        title: "Execution",
        body: "If approved, action runs. Audit log captures actor, outcome, and timing.",
      },
      {
        title: "Reconciliation",
        body: "Result feeds back to the worker. Rollback option exposed for a configured window where reversible.",
      },
    ],
    card: {
      aria: "Live approval queue",
      label: "Approval Center",
      count: "1 of 3",
      initials: "IS",
      worker: "Inbound Sales",
      time: "just now",
      title: "Approve campaign edit?",
      bodyBefore: "Add",
      bodyHighlight: "“free returns”",
      bodyAfter:
        "to the thank-you email sequence. Affects 1,240 customers this month. Within voice rules.",
      rows: [
        { label: "Daily spend impact", value: "$0" },
        { label: "Reversible", value: "Yes" },
        { label: "Voice match", value: "98%" },
      ],
      approve: "Approve",
      review: "Review",
      note: "Hard caps enforced. Audit log on every decision.",
    },
  },
  tr: {
    metadata: {
      title: "Onay Merkezi — Staffbix",
      description:
        "İnsan yetkisi gerektiren AI önerisi eylemlerin beklediği merkezi kuyruk. Telefonuna bildirim, tek dokunuşla onay, tam audit log.",
      keywords: [
        "Staffbix Approval Center",
        "AI approval workflow",
        "human-in-the-loop AI",
        "AI autonomy levels",
        "approval queue",
        "AI agent safety",
        "AI guardrails",
      ],
    },
    header: {
      eyebrow: "Ürün · Onay Merkezi",
      title: "AI gerçekten kontrolden çıkamaz.",
      sub: "Para harcayan, içerik yayınlayan veya müşteriye taahhüt veren her AI önerisi buradan geçer. Neyin otonom, neyin beklemede olacağına sen karar verirsin. Varsayılanlar temkinlidir. Yetkiyi sen genişletirsin.",
    },
    phone: {
      eyebrow: "01 / Telefonda gördüğün",
      title: "Bir push bildirimi, sonra tek dokunuş.",
      paragraphs: [
        "Çalışan, eylem, finansal etki, geri alınabilirlik bayrağı ve ses uyumu kilit ekranında görünür. Onayla, reddet veya incelemeye aç. Geri bildirimle reddetmek Marka Kitabı’nı öğretir.",
        "Push bildirimleri tek sağlayıcı üzerinden mobile dağılır; e-posta ve uygulama içi kutuya düşüş vardır. Locale uyumlu. Sessiz saatlere uyulur, kritik istisna desteklenir.",
      ],
    },
    modesIntro: {
      eyebrow: "02 / Eylem kategorisi başına üç mod",
      title: "Temkinli varsayılanlar. Güven arttıkça genişletirsin.",
    },
    modes: [
      {
        tag: "Otomatik",
        title: "Hemen çalışır, kaydedilir, raporlanır.",
        body: "Düşük riskli, düşük maliyetli eylemler için. Rutin yanıt göndermek, düşük bütçeli gönderi planlamak, yayınlanmış iade politikasını uygulamak. Audit log’da görürsün; onaylaman gerekmez.",
      },
      {
        tag: "Onay gerekli",
        title: "AI taslaklar, tek dokunuş kararını bekler.",
        body: "Harcama, içerik yayını, müşteriye dönük taahhütler ve politika sınırları için. Çoğu çalışan için varsayılan budur; güven oluştukça gevşetirsin.",
      },
      {
        tag: "Sadece öneri",
        title: "AI önerir, eylemi sen başka yerde yaparsın.",
        body: "Eylem henüz entegre etmediğimiz sistemlere dokunduğunda. AI ne yapılacağını taslaklar; sen yaparsın. Regüle sektörlerde geçiş sürecinde faydalıdır.",
      },
    ],
    guardsIntro: {
      eyebrow: "03 / Korkuluklar",
      title: "Yumuşak prompt değil, sert limit.",
      body: "Limitler AI katmanında değil platform katmanında uygulanır. Hatalı bir prompt bunları aşamaz.",
    },
    guards: [
      "Reklam hesabı başına günlük, aylık ve eylem bazlı harcama tavanları.",
      "AI çalışan başına maksimum indirim yüzdesi.",
      "AI’ın asla yayınlamaması gereken yasaklı konular.",
      "Müşteri öfkesi, yüksek değerli işlem, yasal anahtar kelime ve VIP sinyallerinde zorunlu eskalasyon.",
      "Gönderi, iade ve reklam durdurma için geri alınabilirlik penceresi; tek tıkla geri alma.",
    ],
    flowIntro: {
      eyebrow: "04 / Yaşam döngüsü",
      title: "Altı faz. Uçtan uca denetimli.",
    },
    flow: [
      {
        title: "Öneri",
        body: "Çalışan maliyet, hedef sistem ve risk sınıfı gibi metadatalarla bir eylem taslaklar.",
      },
      {
        title: "Sınıflandırma",
        body: "Motor modu çalışan konfigürasyonu, eylem kategorisi ve tenant politikasından belirler.",
      },
      {
        title: "Yönlendirme",
        body: "Bildirim tercih ettiğin locale’de push, e-posta ve uygulama içi kutuya gönderilir.",
      },
      {
        title: "Karar",
        body: "Onayla, geri bildirimle reddet veya incelemeye aç. Tek dokunuş. İstersen kilit ekranından.",
      },
      {
        title: "Çalıştırma",
        body: "Onaylanırsa eylem çalışır. Audit log aktörü, sonucu ve zamanı kaydeder.",
      },
      {
        title: "Mutabakat",
        body: "Sonuç çalışana geri beslenir. Geri alınabilir olanlarda yapılandırılmış pencere boyunca rollback görünür.",
      },
    ],
    card: {
      aria: "Canlı onay kuyruğu",
      label: "Onay Merkezi",
      count: "3’ten 1",
      initials: "GS",
      worker: "Gelen Satış",
      time: "az önce",
      title: "Kampanya düzenlemesini onayla?",
      bodyBefore: "Teşekkür e-posta akışına",
      bodyHighlight: "“ücretsiz iade”",
      bodyAfter:
        "ekle. Bu ay 1.240 müşteriyi etkiler. Ses kuralları içinde.",
      rows: [
        { label: "Günlük harcama etkisi", value: "$0" },
        { label: "Geri alınabilir", value: "Evet" },
        { label: "Ses uyumu", value: "%98" },
      ],
      approve: "Onayla",
      review: "İncele",
      note: "Sert limitler uygulanır. Her kararda audit log.",
    },
  },
} as const;

const pricing = {
  en: {
    metadata: {
      title: "Pricing — Staffbix",
      description:
        "Four tiers. Honest scope at every one. Three-day trial. No card required.",
      keywords: [
        "Staffbix pricing",
        "AI worker subscription",
        "AI workforce cost",
        "monthly AI plan",
        "Staffbix Growth plan",
        "Starter plan AI",
        "enterprise AI workforce",
      ],
    },
    header: {
      eyebrow: "02 / Pricing",
      title: "Honest scope at every tier.",
      sub: "Four tiers. Single currency. Three-day trial. No card required to start. No dark patterns to leave.",
    },
    note: "All prices in USD · Annual billing 20% off · No card required to start",
    popular: "Most popular",
    contactHref: "/contact",
    signupHref: "/signup",
    tiers: [
      {
        name: "Starter",
        price: "$49",
        cadence: "per month",
        for: "Solo founder testing the water.",
        features: [
          "1 AI worker, your pick",
          "Web chat + email channels",
          "5,000 messages / month",
          "Brand Bible from one source",
          "Approval Center, conservative defaults",
          "Daily briefing",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Growth",
        price: "$149",
        cadence: "per month",
        for: "Solo founder with active operations.",
        features: [
          "3 AI workers",
          "WhatsApp, Telegram, IG, FB, LinkedIn",
          "25,000 messages / month",
          "Brand Bible from up to 5 sources",
          "Social media publishing + approvals",
          "SEO audit + content production",
          "Weekly executive summary",
          "Priority email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Business",
        price: "$399",
        cadence: "per month",
        for: "Serious solo founders and small teams.",
        features: [
          "10 AI workers + Custom AI builder",
          "Voice channel (200 minutes included)",
          "100,000 messages / month",
          "Backlink AI (browser automation)",
          "Marketplace ops (Amazon, eBay, Etsy)",
          "Public API access",
          "Cross-AI orchestration",
          "Slack / Teams report delivery",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        cadence: "annual",
        for: "Teams with compliance or scale needs.",
        features: [
          "Unlimited AI workers",
          "Dedicated infrastructure option",
          "SSO + advanced RBAC",
          "SOC 2 reports + DPA",
          "On-premise deployment option",
          "Named success manager",
          "99.99% uptime SLA",
          "Custom integrations",
        ],
        cta: "Contact sales",
      },
    ],
    faqIntro: {
      eyebrow: "Questions",
      title: "The ones we get most.",
    },
    moreQuestions: {
      before: "More questions?",
      link: "Get in touch",
      href: "/contact",
    },
    faq: [
      {
        q: "What does “AI employee” actually mean?",
        a: "A configured role that reads from your Brand Bible, operates on the channels you allow, within the limits you set. It is not a tool you wire up — it is a job description you hire. Each role has a default schedule, default permissions, and a default approval mode you can loosen as you trust it.",
      },
      {
        q: "How do spending limits work?",
        a: "Daily, monthly, and per-action caps per ad account and per AI worker. Enforced at the platform layer, not the prompt — if the AI tries to spend more than you allow, the action is refused. You can override with explicit approval. Every spend is logged and most are reversible.",
      },
      {
        q: "Can the AI make a mistake that costs me money?",
        a: "Any action that spends, publishes, or commits to a customer routes through the Approval Center by default. You decide what's autonomous and what waits for your tap. We ship conservative defaults — you loosen over time, not the other way around.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. No annual commitment on Starter, Growth, or Business. Cancel from the customer portal and your subscription ends at the current period. We hold your Brand Bible and history for 30 days in case you come back.",
      },
      {
        q: "How is this different from ChatGPT or Claude?",
        a: "Those are general assistants. Staffbix is a workforce — multiple specialized roles sharing a single source of company knowledge, operating on real channels with real limits and real audit logs. You wouldn't hire one human to do customer support, sales, SEO, and bookkeeping. You shouldn't hire one AI for it either.",
      },
      {
        q: "When do new roles arrive?",
        a: "18 roles ship today. Voice Agent, Backlink AI, Marketplace Ops, Outbound SDR, Ad Manager, and HR Assistant arrive Q3 2026. New roles are added by configuration, not engineering — the rollout cadence is steady.",
      },
      {
        q: "Do I own my Brand Bible data?",
        a: "Yes. It's tenant-isolated, exportable any time, and deleted on request per GDPR. Other companies cannot read yours by design. We don't train models on your data.",
      },
      {
        q: "What about languages other than English?",
        a: "23 languages supported for both the user interface and the AI-generated content for your customers. Right-to-left layouts (Arabic, Hebrew) are handled automatically.",
      },
    ],
  },
  tr: {
    metadata: {
      title: "Fiyatlandırma — Staffbix",
      description:
        "Dört paket. Her birinde dürüst kapsam. Üç günlük deneme. Kart gerekmez.",
      keywords: [
        "Staffbix pricing",
        "AI worker subscription",
        "AI workforce cost",
        "monthly AI plan",
        "Staffbix Growth plan",
        "Starter plan AI",
        "enterprise AI workforce",
      ],
    },
    header: {
      eyebrow: "02 / Fiyatlandırma",
      title: "Her pakette dürüst kapsam.",
      sub: "Dört paket. Tek para birimi. Üç günlük deneme. Başlamak için kart gerekmez. Ayrılmayı zorlaştıran karanlık desen yok.",
    },
    note: "Tüm fiyatlar USD · Yıllık ödemede %20 indirim · Başlamak için kart gerekmez",
    popular: "En popüler",
    contactHref: "/contact",
    signupHref: "/signup",
    tiers: [
      {
        name: "Starter",
        price: "$49",
        cadence: "aylık",
        for: "Suyu yoklayan solo kurucu.",
        features: [
          "Seçeceğin 1 AI çalışan",
          "Web chat + e-posta kanalları",
          "Ayda 5.000 mesaj",
          "Tek kaynaktan Marka Kitabı",
          "Onay Merkezi, temkinli varsayılanlar",
          "Günlük özet",
          "E-posta desteği",
        ],
        cta: "Ücretsiz dene",
      },
      {
        name: "Growth",
        price: "$149",
        cadence: "aylık",
        for: "Aktif operasyonu olan solo kurucu.",
        features: [
          "3 AI çalışan",
          "WhatsApp, Telegram, IG, FB, LinkedIn",
          "Ayda 25.000 mesaj",
          "5 kaynağa kadar Marka Kitabı",
          "Sosyal medya yayını + onaylar",
          "SEO denetimi + içerik üretimi",
          "Haftalık yönetici özeti",
          "Öncelikli e-posta desteği",
        ],
        cta: "Ücretsiz dene",
      },
      {
        name: "Business",
        price: "$399",
        cadence: "aylık",
        for: "Ciddi solo kurucular ve küçük ekipler.",
        features: [
          "10 AI çalışan + Özel AI oluşturucu",
          "Ses kanalı (200 dakika dahil)",
          "Ayda 100.000 mesaj",
          "Backlink AI (tarayıcı otomasyonu)",
          "Pazaryeri operasyonları (Amazon, eBay, Etsy)",
          "Public API erişimi",
          "AI’lar arası orkestrasyon",
          "Slack / Teams rapor teslimi",
        ],
        cta: "Ücretsiz dene",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Özel",
        cadence: "yıllık",
        for: "Uyumluluk veya ölçek ihtiyacı olan ekipler.",
        features: [
          "Sınırsız AI çalışan",
          "Özel altyapı seçeneği",
          "SSO + gelişmiş RBAC",
          "SOC 2 raporları + DPA",
          "On-premise dağıtım seçeneği",
          "Atanmış başarı yöneticisi",
          "%99,99 uptime SLA",
          "Özel entegrasyonlar",
        ],
        cta: "Satışla görüş",
      },
    ],
    faqIntro: {
      eyebrow: "Sorular",
      title: "En çok aldıklarımız.",
    },
    moreQuestions: {
      before: "Daha fazla soru?",
      link: "İletişime geç",
      href: "/contact",
    },
    faq: [
      {
        q: "“AI çalışan” gerçekte ne demek?",
        a: "Marka Kitabı’ndan okuyan, izin verdiğin kanallarda ve belirlediğin limitler içinde çalışan yapılandırılmış bir rol. Bağladığın bir araç değil; işe aldığın bir iş tanımıdır. Her rolün varsayılan takvimi, izinleri ve güven arttıkça gevşetebileceğin onay modu vardır.",
      },
      {
        q: "Harcama limitleri nasıl çalışır?",
        a: "Reklam hesabı ve AI çalışan başına günlük, aylık ve eylem bazlı tavanlar. Prompt’ta değil platform katmanında uygulanır. AI izin verdiğinden fazlasını harcamaya çalışırsa eylem reddedilir. Açık onayla override edebilirsin. Her harcama kayıtlıdır ve çoğu geri alınabilir.",
      },
      {
        q: "AI bana para kaybettiren bir hata yapabilir mi?",
        a: "Harcayan, yayınlayan veya müşteriye taahhüt veren her eylem varsayılan olarak Onay Merkezi’nden geçer. Neyin otonom, neyin dokunuşunu bekleyeceğine sen karar verirsin. Temkinli varsayılanlarla geliriz; yetkiyi zamanla sen genişletirsin.",
      },
      {
        q: "İstediğim zaman iptal edebilir miyim?",
        a: "Evet. Starter, Growth veya Business’ta yıllık taahhüt yoktur. Müşteri portalından iptal edersin ve aboneliğin mevcut dönem sonunda biter. Geri dönmen ihtimaline karşı Marka Kitabı’nı ve geçmişi 30 gün tutarız.",
      },
      {
        q: "ChatGPT veya Claude’dan farkı ne?",
        a: "Onlar genel asistanlardır. Staffbix bir iş gücüdür: tek şirket bilgi kaynağını paylaşan, gerçek kanallarda gerçek limitler ve gerçek audit log’larla çalışan birden çok uzman rol. Tek bir insandan müşteri desteği, satış, SEO ve muhasebe beklemezsin. Tek bir AI’dan da beklememelisin.",
      },
      {
        q: "Yeni roller ne zaman gelir?",
        a: "Bugün 18 rol yayında. Sesli Temsilci, Backlink AI, Pazaryeri Operasyonları, Outbound SDR, Reklam Yöneticisi ve İK Asistanı 2026 3. çeyrekte gelir. Yeni roller mühendislikle değil konfigürasyonla eklenir; yayın ritmi düzenlidir.",
      },
      {
        q: "Marka Kitabı verisi bana mı ait?",
        a: "Evet. Tenant izolasyonludur, istediğin zaman dışa aktarılabilir ve GDPR kapsamında talep üzerine silinir. Başka şirketler tasarım gereği seninkini okuyamaz. Verinle model eğitmeyiz.",
      },
      {
        q: "İngilizce dışındaki diller ne olacak?",
        a: "Hem kullanıcı arayüzü hem müşterilerin için AI tarafından üretilen içerikte 23 dil desteklenir. Sağdan sola düzenler (Arapça, İbranice) otomatik ele alınır.",
      },
    ],
  },
} as const;

const customers = {
  en: {
    metadata: {
      title: "Customers — Staffbix",
      description:
        "Solo founders and small teams running real companies with AI workforce. Their numbers, their words.",
      keywords: [
        "Staffbix case studies",
        "Staffbix customers",
        "AI workforce success stories",
        "AI customer support ROI",
        "ecommerce AI results",
        "small business AI automation",
      ],
    },
    header: {
      eyebrow: "Customers",
      title: "Early-access founders — stories landing soon.",
      sub: "We refuse to publish placeholder testimonials. As real customers go live we'll publish their numbers (with their permission) here. If you want to be one of them, talk to us.",
    },
    cta: {
      label: "Tell us how you ship",
      href: "/contact",
    },
    readStory: "Read full story",
    emptyState: {
      title: "No published stories yet.",
      body: "Staffbix is in early access. We'd rather show no testimonials than fake ones — real numbers go up here as founders ship and opt in.",
    },
    studies: [],
  },
  tr: {
    metadata: {
      title: "Müşteriler — Staffbix",
      description:
        "AI iş gücüyle gerçek şirketler yöneten solo kurucular ve küçük ekipler. Kendi sayıları, kendi sözleri.",
      keywords: [
        "Staffbix case studies",
        "Staffbix customers",
        "AI workforce success stories",
        "AI customer support ROI",
        "ecommerce AI results",
        "small business AI automation",
      ],
    },
    header: {
      eyebrow: "Müşteriler",
      title: "Erken erişim kurucuları — hikâyeler yakında geliyor.",
      sub: "Yer tutucu referans yayınlamayı reddediyoruz. Gerçek müşteriler yayına geçtikçe, izinleriyle sayılarını burada paylaşacağız. Onlardan biri olmak istersen bize ulaş.",
    },
    cta: {
      label: "Nasıl iş çıkardığını anlat",
      href: "/contact",
    },
    readStory: "Hikâyeyi oku",
    emptyState: {
      title: "Henüz yayında hikâye yok.",
      body: "Staffbix erken erişimde. Sahte referans göstermektense hiç göstermemeyi tercih ediyoruz — gerçek sayılar, kurucular yayına geçip onay verdikçe burada görünecek.",
    },
    studies: [],
  },
} as const;

const careers = {
  en: {
    metadata: {
      title: "Careers — Staffbix",
      description:
        "Help us build the AI workforce platform for solo founders. Small team, deep work, real ownership.",
      keywords: [
        "Staffbix careers",
        "AI startup jobs",
        "remote AI engineering jobs",
        "AI product manager jobs",
        "join Staffbix",
        "Staffbix open roles",
      ],
    },
    header: {
      eyebrow: "Careers",
      title: "Help us ship the workforce platform.",
      sub: "Small team, deep work, real ownership. We hire deliberately — fewer hires, longer tenures, bigger impact per person. If that sounds appealing, read on.",
    },
    openingsIntro: {
      eyebrow: "01 / Open roles",
      suffix: "open positions.",
      noFit: "Don’t see a fit?",
      email: "careers@staffbix.com",
    },
    openings: [
      {
        title: "Founding Engineer · Brand Bible",
        team: "Engineering",
        location: "Istanbul · Remote (EU/TR overlap)",
        type: "Full-time",
        slug: "founding-eng-brand-bible",
      },
      {
        title: "Founding Engineer · Orchestrator",
        team: "Engineering",
        location: "Istanbul · Remote (EU/TR overlap)",
        type: "Full-time",
        slug: "founding-eng-orchestrator",
      },
      {
        title: "Product Designer · 0 → 1",
        team: "Design",
        location: "Remote (EU/TR overlap)",
        type: "Full-time",
        slug: "product-designer",
      },
      {
        title: "Customer Success Lead (Early)",
        team: "Customer",
        location: "Remote (EU/TR overlap)",
        type: "Full-time",
        slug: "customer-success-lead",
      },
      {
        title: "Localization Lead · 23 languages",
        team: "Product",
        location: "Remote",
        type: "Contract → Full-time",
        slug: "localization-lead",
      },
    ],
    valuesIntro: {
      eyebrow: "02 / How we work",
      title: "Four operating defaults.",
    },
    values: [
      {
        title: "Ship small, ship often.",
        body: "Weekly releases. Multiple deploys a day on the web. We trust the people closest to the problem.",
      },
      {
        title: "Write things down.",
        body: "Decisions go in docs. Specs precede code. The async default beats meetings every time.",
      },
      {
        title: "Solo-founder empathy.",
        body: "Our customers are tired, talented, and busy. We design as if we are them — because most of us were.",
      },
      {
        title: "Honest scope.",
        body: "We say what we can and can't do. To customers, to candidates, to each other. No theatre.",
      },
    ],
    perksIntro: {
      eyebrow: "03 / What you get",
      titleLine1: "Real ownership.",
      titleLine2: "Real time off.",
    },
    perks: [
      "Equity in the company. Real shares, not promises.",
      "Remote-first. We meet in person quarterly.",
      "Top-percentile salary for Türkiye / EU bands.",
      "30 days paid time off. We expect you to take it.",
      "Hardware budget, learning budget, conference budget.",
      "Six-week parental leave, minimum, for any parent.",
    ],
  },
  tr: {
    metadata: {
      title: "Kariyer — Staffbix",
      description:
        "Solo kurucular için AI iş gücü platformunu inşa etmemize yardım et. Küçük ekip, derin iş, gerçek sahiplik.",
      keywords: [
        "Staffbix careers",
        "AI startup jobs",
        "remote AI engineering jobs",
        "AI product manager jobs",
        "join Staffbix",
        "Staffbix open roles",
      ],
    },
    header: {
      eyebrow: "Kariyer",
      title: "İş gücü platformunu birlikte çıkaralım.",
      sub: "Küçük ekip, derin iş, gerçek sahiplik. Bilinçli işe alırız: daha az kişi, daha uzun birliktelik, kişi başına daha büyük etki. Kulağa iyi geliyorsa devam et.",
    },
    openingsIntro: {
      eyebrow: "01 / Açık roller",
      suffix: "açık pozisyon.",
      noFit: "Uygun rol görmedin mi?",
      email: "careers@staffbix.com",
    },
    openings: [
      {
        title: "Founding Engineer · Marka Kitabı",
        team: "Mühendislik",
        location: "İstanbul · Uzaktan (EU/TR kesişimi)",
        type: "Tam zamanlı",
        slug: "founding-eng-brand-bible",
      },
      {
        title: "Founding Engineer · Orkestratör",
        team: "Mühendislik",
        location: "İstanbul · Uzaktan (EU/TR kesişimi)",
        type: "Tam zamanlı",
        slug: "founding-eng-orchestrator",
      },
      {
        title: "Product Designer · 0 → 1",
        team: "Tasarım",
        location: "Uzaktan (EU/TR kesişimi)",
        type: "Tam zamanlı",
        slug: "product-designer",
      },
      {
        title: "Customer Success Lead (Early)",
        team: "Müşteri",
        location: "Uzaktan (EU/TR kesişimi)",
        type: "Tam zamanlı",
        slug: "customer-success-lead",
      },
      {
        title: "Lokalizasyon Lideri · 23 dil",
        team: "Ürün",
        location: "Uzaktan",
        type: "Sözleşmeli → Tam zamanlı",
        slug: "localization-lead",
      },
    ],
    valuesIntro: {
      eyebrow: "02 / Nasıl çalışırız",
      title: "Dört çalışma varsayımı.",
    },
    values: [
      {
        title: "Küçük çıkar, sık çıkar.",
        body: "Haftalık yayınlar. Web’de günde birden çok deploy. Probleme en yakın kişilere güveniriz.",
      },
      {
        title: "Yazıya dök.",
        body: "Kararlar dokümana girer. Spec koddan önce gelir. Asenkron varsayılan toplantıyı her seferinde yener.",
      },
      {
        title: "Solo kurucu empatisi.",
        body: "Müşterilerimiz yorgun, yetenekli ve meşgul. Onlarmışız gibi tasarlarız; çünkü çoğumuz öyleydik.",
      },
      {
        title: "Dürüst kapsam.",
        body: "Ne yapabildiğimizi ve ne yapamadığımızı söyleriz. Müşterilere, adaylara, birbirimize. Tiyatro yok.",
      },
    ],
    perksIntro: {
      eyebrow: "03 / Ne alırsın",
      titleLine1: "Gerçek sahiplik.",
      titleLine2: "Gerçek izin.",
    },
    perks: [
      "Şirkette hisse. Vaat değil gerçek pay.",
      "Remote-first. Üç ayda bir yüz yüze buluşuruz.",
      "Türkiye / EU bantlarında üst yüzdelik maaş.",
      "30 gün ücretli izin. Kullanmanı bekleriz.",
      "Donanım, öğrenme ve konferans bütçesi.",
      "Her ebeveyn için minimum altı hafta ebeveyn izni.",
    ],
  },
} as const;

const press = {
  en: {
    metadata: {
      title: "Press — Staffbix",
      description: "Press kit, brand assets, founder availability, and embargoed releases.",
      keywords: [
        "Staffbix press",
        "Staffbix news",
        "AI workforce platform press kit",
        "Staffbix media kit",
        "Staffbix brand assets",
        "Staffbix press inquiries",
      ],
    },
    header: {
      eyebrow: "Press",
      title: "Press kit & inquiries.",
      sub: "Everything a journalist, analyst, or partner needs to understand what Staffbix is, why now, and how to reach the team.",
    },
    contact: {
      title: "Media contact",
      heading: "Reach the press desk directly.",
      body: "For founder interviews, product access, analyst briefings, embargoed releases, and brand asset permissions.",
      email: "press@staffbix.com",
      founderStory: "Read founder story",
      founderHref: "/about",
    },
    factsTitle: "Company facts",
    facts: [
      { label: "Founded", value: "2026" },
      { label: "HQ", value: "Dover, DE · Istanbul" },
      { label: "Team", value: "Small, intentional" },
      { label: "Funding", value: "Bootstrapped" },
      { label: "Languages", value: "23 supported" },
      { label: "Categories", value: "60+ AI roles" },
    ],
    assetsTitle: "Brand assets",
    assetsSub: "Logos, screenshots, and approved founder imagery. Use the full kit for publication quality files.",
    fullKit: "Full kit ZIP",
    download: "Download",
    assets: [
      { name: "Wordmark", desc: "PNG, SVG, dark and light variants", href: "/press/staffbix-wordmark.zip" },
      { name: "Brand mark", desc: "Square icon set for app stores and social avatars", href: "/press/staffbix-mark.zip" },
      { name: "Product screenshots", desc: "Dashboard, approval center, Brand Bible, workforce catalog", href: "/press/product-screens.zip" },
      { name: "Founder portraits", desc: "Approved headshots of Alex Morgan", href: "/press/founder-portraits.zip" },
    ],
    coverageTitle: "Recent coverage",
    coverage: [
      {
        outlet: "TechCrunch",
        headline: "Staffbix wants solo founders to hire AI employees, not buy AI tools.",
        date: "Jan 2026",
      },
      {
        outlet: "Webrazzi",
        headline: "Türkiye’den çıkan Staffbix, 23 dil destekli AI iş gücü platformunu duyurdu.",
        date: "Jan 2026",
      },
      {
        outlet: "The Information",
        headline: "The next SaaS bundle may look less like software and more like staff.",
        date: "Feb 2026",
      },
    ],
  },
  tr: {
    metadata: {
      title: "Basın — Staffbix",
      description: "Basın kiti, marka varlıkları, kurucu görüşmeleri ve ambargolu duyurular.",
      keywords: [
        "Staffbix press",
        "Staffbix news",
        "AI workforce platform press kit",
        "Staffbix media kit",
        "Staffbix brand assets",
        "Staffbix press inquiries",
      ],
    },
    header: {
      eyebrow: "Basın",
      title: "Basın kiti ve iletişim.",
      sub: "Bir gazeteci, analist ya da iş ortağının Staffbix’in ne olduğunu, neden şimdi önemli olduğunu ve ekibe nasıl ulaşacağını anlaması için gereken her şey.",
    },
    contact: {
      title: "Basın iletişimi",
      heading: "Basın ekibine doğrudan ulaş.",
      body: "Kurucu röportajları, ürün erişimi, analist bilgilendirmeleri, ambargolu duyurular ve marka varlığı izinleri için.",
      email: "press@staffbix.com",
      founderStory: "Kurucu hikâyesini oku",
      founderHref: "/about",
    },
    factsTitle: "Şirket bilgileri",
    facts: [
      { label: "Kuruluş", value: "2026" },
      { label: "Merkez", value: "Dover, DE · İstanbul" },
      { label: "Ekip", value: "Küçük ve bilinçli" },
      { label: "Finansman", value: "Bootstrapped" },
      { label: "Diller", value: "23 destekleniyor" },
      { label: "Kategoriler", value: "60+ AI rolü" },
    ],
    assetsTitle: "Marka varlıkları",
    assetsSub: "Logolar, ekran görüntüleri ve onaylı kurucu görselleri. Yayın kalitesindeki dosyalar için tam kiti kullan.",
    fullKit: "Tam kit ZIP",
    download: "İndir",
    assets: [
      { name: "Wordmark", desc: "PNG, SVG, koyu ve açık varyantlar", href: "/press/staffbix-wordmark.zip" },
      { name: "Marka işareti", desc: "Uygulama mağazaları ve sosyal avatarlar için kare ikon seti", href: "/press/staffbix-mark.zip" },
      { name: "Ürün ekran görüntüleri", desc: "Pano, onay merkezi, Marka Kitabı, iş gücü kataloğu", href: "/press/product-screens.zip" },
      { name: "Kurucu portreleri", desc: "Alex Morgan’nın onaylı portreleri", href: "/press/founder-portraits.zip" },
    ],
    coverageTitle: "Son haberler",
    coverage: [
      {
        outlet: "TechCrunch",
        headline: "Staffbix solo kuruculara AI araçları değil AI çalışanları aldırmak istiyor.",
        date: "Ocak 2026",
      },
      {
        outlet: "Webrazzi",
        headline: "Türkiye’den çıkan Staffbix, 23 dil destekli AI iş gücü platformunu duyurdu.",
        date: "Ocak 2026",
      },
      {
        outlet: "The Information",
        headline: "Bir sonraki SaaS paketi yazılımdan çok personele benzeyebilir.",
        date: "Şubat 2026",
      },
    ],
  },
} as const;

const changelog = {
  en: {
    metadata: {
      title: "Changelog — Staffbix",
      description: "Product updates, platform releases, worker improvements, and security notes from Staffbix.",
      keywords: [
        "Staffbix changelog",
        "AI workforce release notes",
        "Staffbix updates",
        "Staffbix new features",
        "Staffbix product changes",
        "Staffbix release feed",
      ],
    },
    header: {
      eyebrow: "Changelog",
      title: "What we ship, when.",
      sub: "A running record of public product changes. We publish every meaningful update here: new workers, safer defaults, integrations, approval flows, and security improvements.",
    },
    sidebar: {
      title: "Releases",
      rss: "Subscribe via RSS",
      rssHref: "/changelog/rss",
    },
    tagLabels: {
      added: "Added",
      improved: "Improved",
      fixed: "Fixed",
      security: "Security",
    },
    entries: [
      {
        version: "v0.9.0",
        date: "Feb 12, 2026",
        title: "Approval Center reaches public beta",
        summary: "Approval queues, spend caps, and role-level policies are now available to all private beta customers.",
        changes: [
          { tag: "added", text: "Bulk approve and reject from inbox, Slack, and email." },
          { tag: "improved", text: "Policy previews now explain why an action is blocked." },
          { tag: "security", text: "Approval logs are immutable after 24 hours." },
        ],
      },
      {
        version: "v0.8.4",
        date: "Jan 29, 2026",
        title: "Brand Bible import hardening",
        summary: "The ingestion pipeline now flags stale pages, duplicate SKUs, and conflicting policy text before workers can use the data.",
        changes: [
          { tag: "added", text: "Conflict review screen for crawl and document imports." },
          { tag: "fixed", text: "Large PDFs no longer time out during structured extraction." },
        ],
      },
      {
        version: "v0.8.0",
        date: "Jan 18, 2026",
        title: "23-language launch surface",
        summary: "Public pages, onboarding, and worker handoff screens now support localized routes and RTL rendering.",
        changes: [
          { tag: "added", text: "Locale-aware public routing with canonical fallbacks." },
          { tag: "improved", text: "Arabic and Hebrew layouts now switch direction automatically." },
        ],
      },
      {
        version: "v0.7.2",
        date: "Jan 6, 2026",
        title: "Worker catalog filters",
        summary: "The workforce catalog now groups workers by department, channel, permission level, and launch status.",
        changes: [
          { tag: "added", text: "Role cards include default channels and permission summaries." },
          { tag: "improved", text: "Roadmap workers are hidden by default for new accounts." },
        ],
      },
      {
        version: "v0.7.0",
        date: "Dec 21, 2025",
        title: "Private beta opens",
        summary: "The first solo founders can onboard a Brand Bible, hire the first seven AI workers, and review actions before they go live.",
        changes: [
          { tag: "added", text: "Customer Support, Content Writer, Sales Assistant, and Finance Clerk workers." },
          { tag: "security", text: "Tenant-isolated worker memory and encrypted credential storage." },
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Değişiklikler — Staffbix",
      description: "Staffbix ürün güncellemeleri, platform sürümleri, çalışan iyileştirmeleri ve güvenlik notları.",
      keywords: [
        "Staffbix changelog",
        "AI workforce release notes",
        "Staffbix updates",
        "Staffbix new features",
        "Staffbix product changes",
        "Staffbix release feed",
      ],
    },
    header: {
      eyebrow: "Değişiklikler",
      title: "Ne zaman ne çıkardık.",
      sub: "Herkese açık ürün değişikliklerinin sürekli kaydı. Yeni çalışanlar, daha güvenli varsayılanlar, entegrasyonlar, onay akışları ve güvenlik iyileştirmeleri gibi anlamlı her güncellemeyi burada yayımlıyoruz.",
    },
    sidebar: {
      title: "Sürümler",
      rss: "RSS ile abone ol",
      rssHref: "/changelog/rss",
    },
    tagLabels: {
      added: "Eklendi",
      improved: "İyileştirildi",
      fixed: "Düzeltildi",
      security: "Güvenlik",
    },
    entries: [
      {
        version: "v0.9.0",
        date: "12 Şub 2026",
        title: "Onay Merkezi public beta’ya ulaştı",
        summary: "Onay kuyrukları, harcama limitleri ve rol bazlı politikalar artık tüm private beta müşterilerine açık.",
        changes: [
          { tag: "added", text: "Gelen kutusu, Slack ve e-postadan toplu onay ve ret." },
          { tag: "improved", text: "Politika önizlemeleri artık bir işlemin neden engellendiğini açıklıyor." },
          { tag: "security", text: "Onay kayıtları 24 saat sonra değiştirilemez hale geliyor." },
        ],
      },
      {
        version: "v0.8.4",
        date: "29 Oca 2026",
        title: "Marka Kitabı içe aktarma güçlendirildi",
        summary: "Veri alım hattı artık çalışanlar veriyi kullanmadan önce eski sayfaları, yinelenen SKU’ları ve çelişkili politika metinlerini işaretliyor.",
        changes: [
          { tag: "added", text: "Crawl ve doküman içe aktarmaları için çakışma inceleme ekranı." },
          { tag: "fixed", text: "Büyük PDF’ler yapılandırılmış çıkarım sırasında artık zaman aşımına uğramıyor." },
        ],
      },
      {
        version: "v0.8.0",
        date: "18 Oca 2026",
        title: "23 dilli yayın yüzeyi",
        summary: "Herkese açık sayfalar, onboarding ve çalışan devir ekranları artık yerelleştirilmiş rotaları ve RTL görünümü destekliyor.",
        changes: [
          { tag: "added", text: "Canonical fallback’li locale-aware public routing." },
          { tag: "improved", text: "Arapça ve İbranice yerleşimler artık yönü otomatik değiştiriyor." },
        ],
      },
      {
        version: "v0.7.2",
        date: "6 Oca 2026",
        title: "Çalışan kataloğu filtreleri",
        summary: "İş gücü kataloğu artık çalışanları departman, kanal, yetki seviyesi ve yayın durumuna göre grupluyor.",
        changes: [
          { tag: "added", text: "Rol kartlarında varsayılan kanallar ve yetki özetleri var." },
          { tag: "improved", text: "Yol haritası çalışanları yeni hesaplarda varsayılan olarak gizli." },
        ],
      },
      {
        version: "v0.7.0",
        date: "21 Ara 2025",
        title: "Private beta açıldı",
        summary: "İlk solo kurucular Marka Kitabı oluşturabiliyor, ilk yedi AI çalışanını işe alabiliyor ve işlemler yayına çıkmadan önce inceleyebiliyor.",
        changes: [
          { tag: "added", text: "Müşteri Desteği, İçerik Yazarı, Satış Asistanı ve Finans Görevlisi çalışanları." },
          { tag: "security", text: "Tenant izolasyonlu çalışan hafızası ve şifreli kimlik bilgisi saklama." },
        ],
      },
    ],
  },
} as const;

const contact = {
  en: {
    metadata: {
      title: "Contact — Staffbix",
      description: "Talk to Staffbix about sales, partnerships, support, press, careers, or security.",
      keywords: [
        "Staffbix contact",
        "Staffbix sales",
        "Staffbix support email",
        "Staffbix demo request",
        "Staffbix partnerships",
        "Staffbix security contact",
      ],
    },
    header: {
      eyebrow: "Contact",
      title: "Talk to humans.",
      sub: "Use the form for routed requests, or email the right team directly. We read everything and route serious notes to the right owner.",
    },
    form: {
      title: "Send a message",
      firstName: "First name",
      firstNamePlaceholder: "Ada",
      lastName: "Surname",
      lastNamePlaceholder: "Lovelace",
      email: "Work email",
      emailPlaceholder: "you@company.com",
      company: "Company",
      companyPlaceholder: "Northway Goods",
      topic: "Topic",
      message: "Message",
      messagePlaceholder: "Tell us what you need, what you are building, and who should reply.",
      submit: "Send message",
      responseTime: "Median response: 1 business day. Sales and security notes are prioritized.",
    },
    topics: ["Sales", "Support", "Partnerships", "Press", "Careers", "Security"],
    aside: {
      emailTitle: "Or email directly",
      directTitle: "Direct contacts",
      officeTitle: "Office",
      company: "AtaForge Inc.",
      address: "8 The Green, Suite A · Dover, DE 19901",
      studio: "Operating studio: Istanbul, Türkiye",
      docsPrompt: "Looking for docs?",
      docsLink: "Go to the help center",
      docsHref: "/docs",
    },
    direct: [
      { label: "Sales", value: "sales@staffbix.com" },
      { label: "Support", value: "support@staffbix.com" },
      { label: "Security", value: "security@staffbix.com" },
      { label: "Press", value: "press@staffbix.com" },
    ],
  },
  tr: {
    metadata: {
      title: "İletişim — Staffbix",
      description: "Satış, iş ortaklığı, destek, basın, kariyer veya güvenlik için Staffbix ile görüş.",
      keywords: [
        "Staffbix contact",
        "Staffbix sales",
        "Staffbix support email",
        "Staffbix demo request",
        "Staffbix partnerships",
        "Staffbix security contact",
      ],
    },
    header: {
      eyebrow: "İletişim",
      title: "İnsanlarla konuş.",
      sub: "Yönlendirilmiş talepler için formu kullan ya da doğru ekibe doğrudan e-posta gönder. Her şeyi okur, ciddi notları doğru sorumluya yönlendiririz.",
    },
    form: {
      title: "Mesaj gönder",
      firstName: "Ad",
      firstNamePlaceholder: "Ada",
      lastName: "Soyad",
      lastNamePlaceholder: "Lovelace",
      email: "İş e-postası",
      emailPlaceholder: "sen@sirket.com",
      company: "Şirket",
      companyPlaceholder: "Northway Goods",
      topic: "Konu",
      message: "Mesaj",
      messagePlaceholder: "Neye ihtiyacın olduğunu, ne inşa ettiğini ve kimin yanıtlaması gerektiğini anlat.",
      submit: "Mesaj gönder",
      responseTime: "Ortanca yanıt: 1 iş günü. Satış ve güvenlik notları önceliklidir.",
    },
    topics: ["Satış", "Destek", "İş ortaklıkları", "Basın", "Kariyer", "Güvenlik"],
    aside: {
      emailTitle: "Ya da doğrudan e-posta gönder",
      directTitle: "Doğrudan kişiler",
      officeTitle: "Ofis",
      company: "AtaForge Inc.",
      address: "8 The Green, Suite A · Dover, DE 19901",
      studio: "Operasyon stüdyosu: İstanbul, Türkiye",
      docsPrompt: "Dokümanları mı arıyorsun?",
      docsLink: "Yardım merkezine git",
      docsHref: "/docs",
    },
    direct: [
      { label: "Satış", value: "sales@staffbix.com" },
      { label: "Destek", value: "support@staffbix.com" },
      { label: "Güvenlik", value: "security@staffbix.com" },
      { label: "Basın", value: "press@staffbix.com" },
    ],
  },
} as const;

const docsLayout = {
  en: {
    eyebrow: "Docs · v1.0",
    search: "Search docs",
    shortcut: "⌘K",
    copy: "Copy",
    nav: [
      {
        label: "Getting started",
        items: [
          { label: "Quickstart", href: "/docs" },
          { label: "Authentication", href: "/docs/auth" },
          { label: "Errors", href: "/docs/errors" },
        ],
      },
      {
        label: "API reference",
        items: [
          { label: "Overview", href: "/docs/api" },
          { label: "Brand Bible", href: "/docs/api/brand-bible" },
          { label: "Workers", href: "/docs/api/workers" },
          { label: "Conversations", href: "/docs/api/conversations" },
          { label: "Approvals", href: "/docs/api/approvals" },
          { label: "Reports", href: "/docs/api/reports" },
        ],
      },
      {
        label: "SDKs",
        items: [
          { label: "Overview", href: "/docs/sdks" },
          { label: "TypeScript", href: "/docs/sdks/typescript" },
          { label: "Python", href: "/docs/sdks/python" },
          { label: "PHP", href: "/docs/sdks/php" },
          { label: "Go", href: "/docs/sdks/go" },
        ],
      },
      {
        label: "Guides",
        items: [
          { label: "Webhooks", href: "/docs/webhooks" },
          { label: "Embed widget", href: "/docs/guides/widget" },
          { label: "Connect WhatsApp", href: "/docs/guides/whatsapp" },
          { label: "Rate limits", href: "/docs/rate-limits" },
        ],
      },
    ],
  },
  tr: {
    eyebrow: "Dokümanlar · v1.0",
    search: "Dokümanlarda ara",
    shortcut: "⌘K",
    copy: "Kopyala",
    nav: [
      {
        label: "Başlangıç",
        items: [
          { label: "Hızlı başlangıç", href: "/docs" },
          { label: "Kimlik doğrulama", href: "/docs/auth" },
          { label: "Hatalar", href: "/docs/errors" },
        ],
      },
      {
        label: "API referansı",
        items: [
          { label: "Genel bakış", href: "/docs/api" },
          { label: "Marka Kitabı", href: "/docs/api/brand-bible" },
          { label: "Çalışanlar", href: "/docs/api/workers" },
          { label: "Konuşmalar", href: "/docs/api/conversations" },
          { label: "Onaylar", href: "/docs/api/approvals" },
          { label: "Raporlar", href: "/docs/api/reports" },
        ],
      },
      {
        label: "SDK’ler",
        items: [
          { label: "Genel bakış", href: "/docs/sdks" },
          { label: "TypeScript", href: "/docs/sdks/typescript" },
          { label: "Python", href: "/docs/sdks/python" },
          { label: "PHP", href: "/docs/sdks/php" },
          { label: "Go", href: "/docs/sdks/go" },
        ],
      },
      {
        label: "Rehberler",
        items: [
          { label: "Webhook’lar", href: "/docs/webhooks" },
          { label: "Widget gömme", href: "/docs/guides/widget" },
          { label: "WhatsApp bağlama", href: "/docs/guides/whatsapp" },
          { label: "Rate limitleri", href: "/docs/rate-limits" },
        ],
      },
    ],
  },
} as const;

const docsHome = {
  en: {
    metadata: {
      title: "Docs — Staffbix",
      description: "Build on top of the Staffbix platform. SDKs, REST API, webhooks, Brand Bible operations.",
      keywords: [
        "Staffbix docs",
        "Staffbix API",
        "Staffbix integration guide",
        "AI worker REST API",
        "Staffbix quickstart",
        "Staffbix developer documentation",
      ],
    },
    layout: {
      title: "Build on top of Staffbix.",
      subtitle: "REST API, four SDKs, webhooks, and a Brand Bible you can query as a service. Start here.",
    },
    eyebrow: "Getting started · Quickstart",
    title: "Send your first message in 90 seconds.",
    intro: "This walks through hiring your first AI worker and sending a message. Assumes you have a Staffbix account, an API key, and Node 20+ installed.",
    codeLabels: { terminal: "Terminal", typescript: "TypeScript" },
    steps: [
      { title: "Install the SDK", body: "The TypeScript SDK works in any Node 20+ project." },
      { title: "Set your API key", body: "Generate a key from the Staffbix dashboard under Settings → Developers. Keys are scoped per tenant — never commit them." },
      { title: "Send a request", body: "The conversation engine retrieves Brand Bible context, calls the model, and returns a reply. Latency target is under 5 seconds end-to-end." },
    ],
    next: {
      label: "Next",
      prefix: "Read",
      api: "the API reference",
      middle: "for the full surface, or jump to",
      webhooks: "Webhooks",
      suffix: "to subscribe to platform events like",
      eventName: "approval.requested",
    },
  },
  tr: {
    metadata: {
      title: "Dokümanlar — Staffbix",
      description: "Staffbix platformu üzerinde geliştirme yap. SDK’ler, REST API, webhook’lar ve Marka Kitabı işlemleri.",
      keywords: [
        "Staffbix docs",
        "Staffbix API",
        "Staffbix integration guide",
        "AI worker REST API",
        "Staffbix quickstart",
        "Staffbix developer documentation",
      ],
    },
    layout: {
      title: "Staffbix üzerinde geliştir.",
      subtitle: "REST API, dört SDK, webhook’lar ve servis olarak sorgulanabilen Marka Kitabı. Buradan başla.",
    },
    eyebrow: "Başlangıç · Hızlı başlangıç",
    title: "İlk mesajını 90 saniyede gönder.",
    intro: "Bu rehber ilk AI çalışanını işe alıp bir mesaj göndermeyi gösterir. Staffbix hesabın, API anahtarın ve Node 20+ kurulumun olduğunu varsayar.",
    codeLabels: { terminal: "Terminal", typescript: "TypeScript" },
    steps: [
      { title: "SDK’yi kur", body: "TypeScript SDK her Node 20+ projesinde çalışır." },
      { title: "API anahtarını ayarla", body: "Anahtarı Staffbix panosunda Ayarlar → Geliştiriciler altından oluştur. Anahtarlar tenant bazında kapsamlanır; asla commit etme." },
      { title: "İstek gönder", body: "Konuşma motoru Marka Kitabı bağlamını alır, modeli çağırır ve yanıt döndürür. Hedef uçtan uca 5 saniyenin altında gecikmedir." },
    ],
    next: {
      label: "Sırada",
      prefix: "Tüm yüzey için",
      api: "API referansını",
      middle: "oku ya da platform olaylarına abone olmak için",
      webhooks: "Webhook’lara",
      suffix: "geç, örneğin",
      eventName: "approval.requested",
    },
  },
} as const;

const docsApi = {
  en: {
    metadata: {
      title: "API reference — Staffbix",
      description: "REST API surface for the Staffbix workforce platform.",
      keywords: [
        "Staffbix REST API",
        "Staffbix API reference",
        "AI worker API",
        "Brand Bible API",
        "Staffbix endpoints",
        "Staffbix OpenAPI",
      ],
    },
    layout: {
      title: "API reference.",
      subtitle: "Versioned REST surface. Stable contracts. OpenAPI specification is the source of truth for the SDKs.",
    },
    eyebrow: "API reference · Overview",
    title: "Five resources, JSON over HTTPS.",
    introPrefix: "The base URL is",
    introMiddle: "Requests authenticate with a project API key in the",
    authHeader: "Authorization",
    introSuffix: "header. All responses include a request ID and follow the same envelope shape.",
    authTitle: "Authentication",
    authBodyPrefix: "Issue project-scoped keys from",
    authLink: "Settings → Developers",
    authBodySuffix: "Keys can be restricted by scope and IP allowlist.",
    resourcesTitle: "Resources",
    resourcesBody: "The orchestrator, approval workflow engine internals, and prompt library are not exposed. Everything else lives behind these five resources.",
    details: "Details →",
    rateTitle: "Rate limits",
    ratePrefix: "Default is 60 requests per minute per project. Burst capacity allows brief spikes. Quotas are tier-gated; overage pricing applies on Business and above. Read",
    rateLink: "Rate limits",
    rateSuffix: "for headers and back-off recommendations.",
    codeLabels: { terminal: "Terminal" },
    resources: [
      { name: "Brand Bible", intro: "Read and write the structured knowledge base every worker reads from.", endpoints: [
        { method: "GET", path: "/v1/brand-bible", desc: "Retrieve the current Brand Bible for the tenant.", href: "/docs/api/brand-bible" },
        { method: "PATCH", path: "/v1/brand-bible", desc: "Update fields. Partial updates supported; provenance preserved.", href: "/docs/api/brand-bible" },
        { method: "POST", path: "/v1/brand-bible/ingest", desc: "Queue a website crawl or document upload for ingestion.", href: "/docs/api/brand-bible" },
      ] },
      { name: "Workers", intro: "List, configure, and call AI workers.", endpoints: [
        { method: "GET", path: "/v1/workers", desc: "List hired workers with status and load.", href: "/docs/api/workers" },
        { method: "POST", path: "/v1/workers/:id/respond", desc: "Run the worker on a single message and return a reply.", href: "/docs/api/workers" },
        { method: "PATCH", path: "/v1/workers/:id", desc: "Update schedule, channels, limits, or approval mode.", href: "/docs/api/workers" },
      ] },
      { name: "Conversations", intro: "Inbound messages, threaded history, and conversation export.", endpoints: [
        { method: "GET", path: "/v1/conversations", desc: "Paginated list with filters by channel, worker, customer.", href: "/docs/api/conversations" },
        { method: "POST", path: "/v1/conversations/:id/messages", desc: "Append an inbound message to an existing thread.", href: "/docs/api/conversations" },
      ] },
      { name: "Approvals", intro: "List pending approvals, decide, and read audit history.", endpoints: [
        { method: "GET", path: "/v1/approvals", desc: "Open approvals routed to the authenticated user.", href: "/docs/api/approvals" },
        { method: "POST", path: "/v1/approvals/:id/decide", desc: "Approve, reject, or open for review with optional feedback.", href: "/docs/api/approvals" },
      ] },
      { name: "Reports", intro: "On-demand and scheduled reports across the platform.", endpoints: [
        { method: "POST", path: "/v1/reports", desc: "Request a report by template, range, and recipients.", href: "/docs/api/reports" },
        { method: "GET", path: "/v1/reports/:id", desc: "Retrieve a previously generated report.", href: "/docs/api/reports" },
      ] },
    ],
  },
  tr: {
    metadata: {
      title: "API referansı — Staffbix",
      description: "Staffbix iş gücü platformunun REST API yüzeyi.",
      keywords: [
        "Staffbix REST API",
        "Staffbix API reference",
        "AI worker API",
        "Brand Bible API",
        "Staffbix endpoints",
        "Staffbix OpenAPI",
      ],
    },
    layout: {
      title: "API referansı.",
      subtitle: "Sürümlenmiş REST yüzeyi. Kararlı sözleşmeler. SDK’ler için doğruluk kaynağı OpenAPI spesifikasyonudur.",
    },
    eyebrow: "API referansı · Genel bakış",
    title: "Beş kaynak, HTTPS üzerinde JSON.",
    introPrefix: "Base URL",
    introMiddle: "İstekler proje API anahtarıyla",
    authHeader: "Authorization",
    introSuffix: "header’ında doğrulanır. Tüm yanıtlar request ID içerir ve aynı envelope şeklini izler.",
    authTitle: "Kimlik doğrulama",
    authBodyPrefix: "Proje kapsamlı anahtarları",
    authLink: "Ayarlar → Geliştiriciler",
    authBodySuffix: "bölümünden oluştur. Anahtarlar scope ve IP allowlist ile kısıtlanabilir.",
    resourcesTitle: "Kaynaklar",
    resourcesBody: "Orkestratör, onay iş akışı motorunun içi ve prompt kütüphanesi dışa açılmaz. Geri kalan her şey bu beş kaynak arkasındadır.",
    details: "Detaylar →",
    rateTitle: "Rate limitleri",
    ratePrefix: "Varsayılan limit proje başına dakikada 60 istektir. Kısa sıçramalar için burst kapasitesi vardır. Kotalar pakete bağlıdır; Business ve üstünde aşım fiyatlandırması uygulanır.",
    rateLink: "Rate limitlerini",
    rateSuffix: "header’lar ve back-off önerileri için oku.",
    codeLabels: { terminal: "Terminal" },
    resources: [
      { name: "Marka Kitabı", intro: "Her çalışanın okuduğu yapılandırılmış bilgi tabanını oku ve yaz.", endpoints: [
        { method: "GET", path: "/v1/brand-bible", desc: "Tenant için mevcut Marka Kitabı’nı getir.", href: "/docs/api/brand-bible" },
        { method: "PATCH", path: "/v1/brand-bible", desc: "Alanları güncelle. Kısmi güncelleme desteklenir; kaynak bilgisi korunur.", href: "/docs/api/brand-bible" },
        { method: "POST", path: "/v1/brand-bible/ingest", desc: "Bir web crawl ya da doküman yüklemesini işlem kuyruğuna al.", href: "/docs/api/brand-bible" },
      ] },
      { name: "Çalışanlar", intro: "AI çalışanları listele, yapılandır ve çağır.", endpoints: [
        { method: "GET", path: "/v1/workers", desc: "İşe alınmış çalışanları durum ve yük bilgisiyle listele.", href: "/docs/api/workers" },
        { method: "POST", path: "/v1/workers/:id/respond", desc: "Çalışanı tek mesaj üzerinde çalıştır ve yanıt döndür.", href: "/docs/api/workers" },
        { method: "PATCH", path: "/v1/workers/:id", desc: "Zamanlama, kanallar, limitler veya onay modunu güncelle.", href: "/docs/api/workers" },
      ] },
      { name: "Konuşmalar", intro: "Gelen mesajlar, thread geçmişi ve konuşma dışa aktarma.", endpoints: [
        { method: "GET", path: "/v1/conversations", desc: "Kanal, çalışan ve müşteri filtreli sayfalı liste.", href: "/docs/api/conversations" },
        { method: "POST", path: "/v1/conversations/:id/messages", desc: "Mevcut thread’e gelen mesaj ekle.", href: "/docs/api/conversations" },
      ] },
      { name: "Onaylar", intro: "Bekleyen onayları listele, karar ver ve audit geçmişini oku.", endpoints: [
        { method: "GET", path: "/v1/approvals", desc: "Kimliği doğrulanan kullanıcıya yönlenen açık onaylar.", href: "/docs/api/approvals" },
        { method: "POST", path: "/v1/approvals/:id/decide", desc: "Opsiyonel geri bildirimle onayla, reddet veya incelemeye aç.", href: "/docs/api/approvals" },
      ] },
      { name: "Raporlar", intro: "Platform genelinde isteğe bağlı ve zamanlanmış raporlar.", endpoints: [
        { method: "POST", path: "/v1/reports", desc: "Şablon, aralık ve alıcılara göre rapor iste.", href: "/docs/api/reports" },
        { method: "GET", path: "/v1/reports/:id", desc: "Daha önce üretilmiş raporu getir.", href: "/docs/api/reports" },
      ] },
    ],
  },
} as const;

const docsSdks = {
  en: {
    metadata: {
      title: "SDKs — Staffbix",
      description: "Official Staffbix SDKs for TypeScript, Python, PHP, and Go.",
      keywords: [
        "Staffbix SDKs",
        "AI worker SDK",
        "TypeScript Python PHP Go SDK",
        "Staffbix client libraries",
        "Staffbix official SDK",
      ],
    },
    layout: {
      title: "Official SDKs.",
      subtitle: "Four languages. Same primitives. Generated from the OpenAPI spec, hardened by hand.",
    },
    eyebrow: "SDKs · Overview",
    title: "Pick your language.",
    intro: "All four SDKs share the same primitives — workers, conversations, approvals, brand-bible, reports — and follow the OpenAPI specification at",
    openApiUrl: "staffbix.com/openapi.json",
    exampleTitle: "A complete example",
    exampleBody: "Hire a Customer Support worker, then send a message — six lines.",
    principlesTitle: "SDK principles",
    codeLabels: { typescript: "TypeScript" },
    sdks: [
      { name: "TypeScript", pkg: "@staffbix/sdk", install: "npm install @staffbix/sdk", version: "v1.0.0", installLabel: "npm", href: "/docs/sdks/typescript", runtime: "Node 20+ · Edge runtimes · browsers via bundler" },
      { name: "Python", pkg: "staffbix", install: "pip install staffbix", version: "v1.0.0", installLabel: "pip", href: "/docs/sdks/python", runtime: "Python 3.10+ · async via httpx · sync via requests" },
      { name: "PHP", pkg: "staffbix/sdk", install: "composer require staffbix/sdk", version: "v1.0.0", installLabel: "composer", href: "/docs/sdks/php", runtime: "PHP 8.1+ · PSR-18 HTTP client" },
      { name: "Go", pkg: "github.com/staffbix/sdk-go", install: "go get github.com/staffbix/sdk-go", version: "v1.0.0", installLabel: "go get", href: "/docs/sdks/go", runtime: "Go 1.22+ · context-aware · zero external deps" },
    ],
    principles: [
      { title: "Idiomatic to each language.", body: "Not a thin wrapper. Each SDK uses the patterns the language community expects — promises in TS, async/await in Python, Result in Go, etc." },
      { title: "Typed responses.", body: "TypeScript types, Python type hints, PHP psalm, Go structs. Editor autocomplete on every field." },
      { title: "Retry, telemetry, errors.", body: "Exponential back-off with jitter on retryable errors. Optional OpenTelemetry hooks. Errors are typed, not strings." },
      { title: "Open source, MIT licensed.", body: "Source on GitHub. Issues triaged within one business day. Contributions welcome." },
    ],
  },
  tr: {
    metadata: {
      title: "SDK’ler — Staffbix",
      description: "TypeScript, Python, PHP ve Go için resmi Staffbix SDK’leri.",
      keywords: [
        "Staffbix SDKs",
        "AI worker SDK",
        "TypeScript Python PHP Go SDK",
        "Staffbix client libraries",
        "Staffbix official SDK",
      ],
    },
    layout: {
      title: "Resmi SDK’ler.",
      subtitle: "Dört dil. Aynı temel kavramlar. OpenAPI spesifikasyonundan üretilmiş, elle güçlendirilmiş.",
    },
    eyebrow: "SDK’ler · Genel bakış",
    title: "Dilini seç.",
    intro: "Dört SDK de aynı temel kavramları paylaşır: çalışanlar, konuşmalar, onaylar, brand-bible ve raporlar. Hepsi şu adresteki OpenAPI spesifikasyonunu izler:",
    openApiUrl: "staffbix.com/openapi.json",
    exampleTitle: "Tam örnek",
    exampleBody: "Bir Müşteri Desteği çalışanı işe al, sonra mesaj gönder: altı satır.",
    principlesTitle: "SDK ilkeleri",
    codeLabels: { typescript: "TypeScript" },
    sdks: [
      { name: "TypeScript", pkg: "@staffbix/sdk", install: "npm install @staffbix/sdk", version: "v1.0.0", installLabel: "npm", href: "/docs/sdks/typescript", runtime: "Node 20+ · Edge runtime’lar · bundler ile tarayıcılar" },
      { name: "Python", pkg: "staffbix", install: "pip install staffbix", version: "v1.0.0", installLabel: "pip", href: "/docs/sdks/python", runtime: "Python 3.10+ · httpx ile async · requests ile sync" },
      { name: "PHP", pkg: "staffbix/sdk", install: "composer require staffbix/sdk", version: "v1.0.0", installLabel: "composer", href: "/docs/sdks/php", runtime: "PHP 8.1+ · PSR-18 HTTP client" },
      { name: "Go", pkg: "github.com/staffbix/sdk-go", install: "go get github.com/staffbix/sdk-go", version: "v1.0.0", installLabel: "go get", href: "/docs/sdks/go", runtime: "Go 1.22+ · context-aware · sıfır dış bağımlılık" },
    ],
    principles: [
      { title: "Her dile doğal.", body: "İnce bir wrapper değil. Her SDK, dil topluluğunun beklediği desenleri kullanır: TS’de promise, Python’da async/await, Go’da Result vb." },
      { title: "Tipli yanıtlar.", body: "TypeScript tipleri, Python type hint’leri, PHP psalm, Go struct’ları. Her alanda editör otomatik tamamlama." },
      { title: "Retry, telemetri, hatalar.", body: "Yeniden denenebilir hatalarda jitter’lı exponential back-off. Opsiyonel OpenTelemetry hook’ları. Hatalar string değil tiplidir." },
      { title: "Açık kaynak, MIT lisanslı.", body: "Kaynak GitHub’da. Issue’lar bir iş günü içinde triage edilir. Katkılar açık." },
    ],
  },
} as const;

const docsWebhooks = {
  en: {
    metadata: {
      title: "Webhooks — Staffbix",
      description: "Subscribe to platform events: approval requested, lead captured, subscription updated, message received.",
      keywords: [
        "Staffbix webhooks",
        "webhook HMAC verification",
        "webhook retry policy",
        "Staffbix event delivery",
        "AI workforce webhooks",
      ],
    },
    layout: {
      title: "Webhooks.",
      subtitle: "Subscribe to platform events. Signed payloads, retry on failure, replay from the dashboard.",
    },
    eyebrow: "Guides · Webhooks",
    title: "Listen for what matters.",
    introPrefix: "Configure tenant-scoped webhook endpoints from",
    introCode: "Settings → Developers → Webhooks",
    introSuffix: "Up to ten endpoints per tenant, each subscribed to any subset of events.",
    eventsTitle: "Events",
    payloadTitle: "Payload shape",
    payloadBodyPrefix: "All webhook deliveries share the same envelope. The",
    dataField: "data",
    payloadBodySuffix: "field shape varies by event type.",
    verifyTitle: "Verifying signatures",
    verifyPrefix: "Every delivery includes an",
    signatureHeader: "X-Staffbix-Signature",
    verifySuffix: "header with an HMAC-SHA256 of the raw body. Always verify before trusting payloads.",
    retriesTitle: "Retries",
    retriesBody: "Failed deliveries (non-2xx, timeouts) retry with exponential back-off for up to 24 hours. After that, the delivery is marked failed and surfaced in the dashboard for manual replay.",
    idempotencyTitle: "Idempotency",
    idempotencyPrefix: "Each event has a stable",
    idField: "id",
    idempotencySuffix: "Treat duplicates as no-ops in your handler. Retries may deliver the same event more than once.",
    codeLabels: { json: "JSON · approval.requested", typescript: "TypeScript · verify.ts" },
    events: [
      { name: "approval.requested", desc: "A worker has proposed an action that requires human authorization.", payload: ["worker", "action", "cost_estimate", "reversible", "expires_at"] },
      { name: "approval.decided", desc: "An approval was decided. Includes outcome and feedback if any.", payload: ["approval_id", "decision", "actor", "feedback", "decided_at"] },
      { name: "conversation.message_received", desc: "An inbound message arrived on any channel.", payload: ["conversation_id", "channel", "customer", "content", "received_at"] },
      { name: "lead.captured", desc: "A worker identified a hot lead worth your attention.", payload: ["customer", "source", "intent_score", "suggested_actions"] },
      { name: "subscription.updated", desc: "Tenant subscription state changed (upgrade, downgrade, payment failure).", payload: ["plan_from", "plan_to", "reason", "effective_at"] },
      { name: "report.ready", desc: "A scheduled or on-demand report is ready for download.", payload: ["report_id", "type", "range", "download_url"] },
    ],
  },
  tr: {
    metadata: {
      title: "Webhook’lar — Staffbix",
      description: "Onay istendi, lead yakalandı, abonelik güncellendi, mesaj alındı gibi platform olaylarına abone ol.",
      keywords: [
        "Staffbix webhooks",
        "webhook HMAC verification",
        "webhook retry policy",
        "Staffbix event delivery",
        "AI workforce webhooks",
      ],
    },
    layout: {
      title: "Webhook’lar.",
      subtitle: "Platform olaylarına abone ol. İmzalı payload’lar, hatada retry, panodan yeniden oynatma.",
    },
    eyebrow: "Rehberler · Webhook’lar",
    title: "Önemli olanı dinle.",
    introPrefix: "Tenant kapsamlı webhook endpoint’lerini şuradan yapılandır:",
    introCode: "Ayarlar → Geliştiriciler → Webhook’lar",
    introSuffix: "Tenant başına en fazla on endpoint; her biri olayların herhangi bir alt kümesine abone olabilir.",
    eventsTitle: "Olaylar",
    payloadTitle: "Payload şekli",
    payloadBodyPrefix: "Tüm webhook gönderimleri aynı envelope’u paylaşır.",
    dataField: "data",
    payloadBodySuffix: "alanının şekli olay tipine göre değişir.",
    verifyTitle: "İmzaları doğrulama",
    verifyPrefix: "Her gönderim",
    signatureHeader: "X-Staffbix-Signature",
    verifySuffix: "header’ında raw body’nin HMAC-SHA256 imzasını içerir. Payload’a güvenmeden önce her zaman doğrula.",
    retriesTitle: "Retry’lar",
    retriesBody: "Başarısız gönderimler (2xx olmayan yanıtlar, zaman aşımı) 24 saate kadar exponential back-off ile yeniden denenir. Sonrasında gönderim başarısız işaretlenir ve manuel tekrar için panoda gösterilir.",
    idempotencyTitle: "Idempotency",
    idempotencyPrefix: "Her olayın kararlı bir",
    idField: "id",
    idempotencySuffix: "değeri vardır. Handler içinde tekrarları no-op say. Retry’lar aynı olayı birden çok kez gönderebilir.",
    codeLabels: { json: "JSON · approval.requested", typescript: "TypeScript · verify.ts" },
    events: [
      { name: "approval.requested", desc: "Bir çalışan insan onayı gerektiren bir işlem önerdi.", payload: ["worker", "action", "cost_estimate", "reversible", "expires_at"] },
      { name: "approval.decided", desc: "Bir onay karara bağlandı. Varsa sonuç ve geri bildirim içerir.", payload: ["approval_id", "decision", "actor", "feedback", "decided_at"] },
      { name: "conversation.message_received", desc: "Herhangi bir kanalda gelen mesaj alındı.", payload: ["conversation_id", "channel", "customer", "content", "received_at"] },
      { name: "lead.captured", desc: "Bir çalışan dikkate değer sıcak lead belirledi.", payload: ["customer", "source", "intent_score", "suggested_actions"] },
      { name: "subscription.updated", desc: "Tenant abonelik durumu değişti: yükseltme, düşürme veya ödeme hatası.", payload: ["plan_from", "plan_to", "reason", "effective_at"] },
      { name: "report.ready", desc: "Zamanlanmış ya da isteğe bağlı rapor indirmeye hazır.", payload: ["report_id", "type", "range", "download_url"] },
    ],
  },
} as const;

const docsAuth = {
  en: {
    metadata: {
      title: "Authentication — Staffbix Docs",
      description: "Create API keys, send the Authorization header, rotate keys, separate live and test scopes, revoke a compromised key.",
      keywords: [
        "Staffbix API key",
        "Authorization Bearer",
        "API authentication",
        "API key rotation",
        "Staffbix live test key",
        "Staffbix bearer token",
      ],
    },
    layout: {
      title: "Authentication.",
      subtitle: "Bearer keys, scoped per project. Rotate without downtime, revoke without a deploy.",
    },
    eyebrow: "Getting started · Authentication",
    title: "Bearer tokens, scoped per project.",
    intro: "Every request to the Staffbix REST API authenticates with a project-scoped API key sent as a bearer token. Keys are minted from the dashboard, never derived from passwords, and may be rotated or revoked without restarting any service that depends on them.",
    codeLabels: { terminal: "Terminal", typescript: "TypeScript" },
    sections: [
      {
        heading: "Creating an API key",
        body: "Open the dashboard and go to Settings → Developers → API keys. Press Create key, give it a human-readable label that names the system it belongs to (for example 'production-website' or 'staging-zapier'), and pick a scope. The key is shown exactly once on creation. Store it in your secret manager before closing the dialog — Staffbix only retains a hashed fingerprint.",
        code: { lang: "bash", label: "Terminal", content: "curl https://api.staffbix.com/v1/workers \\\n  -H \"Authorization: Bearer sbx_live_*****************\"" },
      },
      {
        heading: "Live and test scopes",
        body: "Each project carries two parallel keyspaces. Keys prefixed sbx_test_ talk to the sandbox tenant — fake billing, capped AI spend, no real channels. Keys prefixed sbx_live_ are bound to your production tenant and bill against your subscription. Use test keys in CI and local development; never let a live key leak into a public repository or a browser bundle.",
      },
      {
        heading: "Rotating a key",
        body: "Press Rotate next to any key. Staffbix mints a replacement, gives you a 24-hour overlap during which both the old and new key are accepted, then automatically revokes the old one. Update your secret store, redeploy your services, and verify that the old key reports zero traffic in the dashboard before the overlap expires.",
        code: { lang: "ts", label: "TypeScript", content: "import { Staffbix } from \"@staffbix/sdk\";\n\nconst client = new Staffbix({\n  apiKey: process.env.STAFFBIX_API_KEY!,\n});\n\nawait client.workers.list();" },
      },
      {
        heading: "Revoking a compromised key",
        body: "If a key leaks, press Revoke. Revocation is immediate and irreversible. Subsequent requests return 401 with code key_revoked. Inspect Settings → Developers → Audit log for the last 90 days of calls made by that key, including IPs and routes, so you can scope the blast radius before rotating other secrets.",
      },
    ],
  },
} as const;

const docsErrors = {
  en: {
    metadata: {
      title: "Errors — Staffbix Docs",
      description: "HTTP status codes, error envelope shape, plan-limit codes, retry-after handling, and idempotency keys.",
      keywords: [
        "Staffbix API errors",
        "HTTP error codes",
        "API error response",
        "rate limit error",
        "plan_limit_workers error",
        "Staffbix error envelope",
      ],
    },
    layout: {
      title: "Errors.",
      subtitle: "Same envelope for every error. Stable codes you can switch on without parsing messages.",
    },
    eyebrow: "Getting started · Errors",
    title: "One envelope, stable codes.",
    intro: "Every non-2xx response from the Staffbix API carries the same JSON shape. The error field is human-readable and may change wording; the code field is the stable enum you should switch on in client code. Status codes follow HTTP semantics with a small number of well-defined extensions.",
    codeLabels: { json: "JSON · error envelope", typescript: "TypeScript · retry handler" },
    sections: [
      {
        heading: "Envelope shape",
        body: "All errors carry a code field that is stable across versions and an error field that is a human sentence. Some errors include additional context fields (such as retryAfterMs or limit) — these are documented per-code and are safe to ignore if absent.",
        code: { lang: "json", label: "JSON · error envelope", content: "{\n  \"error\": \"Rate limit exceeded\",\n  \"code\": \"rate_limited\",\n  \"retryAfterMs\": 12000\n}" },
      },
      {
        heading: "Status codes",
        body: "400 means the request body failed validation — the error field names the offending field. 401 means the bearer token is missing, malformed, or revoked. 402 is returned when a paid feature is requested on a free plan. 403 means the authenticated user lacks the required role (most write endpoints require Owner or Admin). 404 means the resource does not exist or your tenant cannot see it. 409 means the request collides with current state (for example, decoding an approval that was already decided). 413 means the body is too large. 415 means the content type is unsupported. 429 means a rate-limit bucket has been exhausted; respect the retry-after value. 500 means the server failed unexpectedly — these are retried automatically by the SDKs.",
      },
      {
        heading: "Plan-limit codes",
        body: "When a plan boundary is hit the response is 402 Payment Required with a specific code: plan_limit_workers means the workforce cap was reached; plan_limit_ai_spend means the monthly AI spend ceiling was reached; plan_limit_seats means no more dashboard seats are available; plan_limit_messages means the monthly message quota was exhausted. Each code maps to a documented upgrade path in the billing settings.",
      },
      {
        heading: "Rate limiting and retry-after",
        body: "429 responses include a Retry-After header (in seconds) and a retryAfterMs field in the body. Wait at least that long before retrying. The TypeScript SDK does this automatically with exponential back-off and jitter; if you implement your own retry loop, cap the total wait at 60 seconds and surface persistent failures to your operator.",
        code: { lang: "ts", label: "TypeScript · retry handler", content: "async function withRetry<T>(fn: () => Promise<T>, max = 4): Promise<T> {\n  for (let attempt = 0; attempt < max; attempt++) {\n    try {\n      return await fn();\n    } catch (err: unknown) {\n      const e = err as { status?: number; retryAfterMs?: number };\n      if (e.status !== 429 || attempt === max - 1) throw err;\n      const wait = (e.retryAfterMs ?? 1000) + Math.random() * 250;\n      await new Promise((r) => setTimeout(r, wait));\n    }\n  }\n  throw new Error(\"unreachable\");\n}" },
      },
      {
        heading: "Idempotency keys",
        body: "Mutating requests (POST and PATCH) accept an Idempotency-Key header. If you replay a request with the same key within 24 hours, Staffbix returns the cached response rather than executing the mutation again. Use a UUID per logical operation — never reuse a key across distinct intents.",
      },
    ],
  },
} as const;

const docsApiBrandBible = {
  en: {
    metadata: {
      title: "Brand Bible API — Staffbix Docs",
      description: "List sources, upload files or paste text, delete sources, watch ingestion status, and search chunks.",
      keywords: [
        "Brand Bible API",
        "AI knowledge base API",
        "POST brand-bible source",
        "Brand Bible search API",
        "Staffbix knowledge ingest",
      ],
    },
    layout: {
      title: "Brand Bible API.",
      subtitle: "The structured knowledge base every worker reads from. Read, write, search.",
    },
    eyebrow: "API reference · Brand Bible",
    title: "Five endpoints, one knowledge base.",
    intro: "The Brand Bible is the tenant-scoped knowledge base every AI worker consults before drafting. It supports PDF and DOCX uploads, pasted text, and semantic search over the chunked corpus. All endpoints require a project API key.",
    codeLabels: { bash: "Terminal · curl", json: "JSON · search request" },
    sections: [
      {
        heading: "GET /v1/brand-bible — list sources",
        body: "Returns every source in the tenant, newest first, with metadata about ingestion status. The raw text of each source is not returned in the list — fetch a single source by ID to retrieve its body. Maximum 500 rows per response.",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/brand-bible \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\"" },
      },
      {
        heading: "POST /v1/brand-bible — upload or paste",
        body: "Two body shapes are accepted. multipart/form-data with a file field accepts PDF and DOCX up to 20 MB. application/json with kind 'paste' accepts up to 1 MB of UTF-8 text. Both shapes accept an optional title. The response includes the new source row at status 'uploaded' and enqueues an ingestion job.",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/brand-bible \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\" \\\n  -F \"file=@brand-guide.pdf\" \\\n  -F \"title=Brand Guide v3\"" },
      },
      {
        heading: "Ingestion status",
        body: "After upload, the source moves through statuses: uploaded → parsing → embedding → ready. If anything fails the source moves to status 'failed' and the errorMessage field is populated. Poll GET /v1/brand-bible until status is 'ready' before relying on the source for retrieval.",
      },
      {
        heading: "DELETE /v1/brand-bible/:id",
        body: "Permanently removes a source, its R2 object (if any), and all embedded chunks. Workers stop seeing the content on their next retrieval cycle (typically under one minute). Deletion is irreversible.",
      },
      {
        heading: "POST /v1/brand-bible/search",
        body: "Semantic search over all ready sources in the tenant. Body is JSON with a query string and an optional k between 1 and 50 (defaults to 6). Returns the top-k chunks ranked by cosine similarity, each with source title, excerpt, and similarity score.",
        code: { lang: "json", label: "JSON · search request", content: "{\n  \"query\": \"What is our refund policy for annual plans?\",\n  \"k\": 8\n}" },
      },
    ],
  },
} as const;

const docsApiWorkers = {
  en: {
    metadata: {
      title: "Workers API — Staffbix Docs",
      description: "List, hire, read, update, and terminate AI workers. Configure roles, channels, autonomy, and custom instructions.",
      keywords: [
        "Workers API",
        "hire worker endpoint",
        "AI worker REST API",
        "POST workers",
        "PATCH worker autonomy",
        "Staffbix Workers API",
      ],
    },
    layout: {
      title: "Workers API.",
      subtitle: "Hire by role, configure by JSON, terminate by DELETE.",
    },
    eyebrow: "API reference · Workers",
    title: "AI workers as first-class resources.",
    intro: "Workers are the AI employees of a tenant. Each one is hired from a role in the catalog, carries its own autonomy level, channel list, and optional custom instructions, and produces measurable output you can audit. The Workers API is the programmatic equivalent of the hire/configure flow in the dashboard.",
    codeLabels: { bash: "Terminal · curl", json: "JSON · hire body" },
    sections: [
      {
        heading: "GET /v1/workers — list",
        body: "Returns every worker for the authenticated tenant. Append ?shape=ui to receive UI-enriched rows that include rolling 7-day aggregates (messages handled, approvals queued, voice-match score). The default raw shape returns the database row, which is the contract documented here.",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/workers \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\"" },
      },
      {
        heading: "POST /v1/workers — hire",
        body: "Requires Owner or Admin role. The body must include roleSlug (a slug from the role catalog). Optional fields: name (defaults to the role's default), customInstructions (free text appended to the role prompt), channels (array of channel slugs the worker should listen on), autonomy ('auto', 'approve', or 'suggest'), settings (free-form object passed to the role), and modelPin (override the default model for this worker).",
        code: { lang: "json", label: "JSON · hire body", content: "{\n  \"roleSlug\": \"customer-support\",\n  \"name\": \"Ava (Support)\",\n  \"autonomy\": \"approve\",\n  \"channels\": [\"web\", \"email\"],\n  \"customInstructions\": \"Always offer a refund before escalating.\"\n}" },
      },
      {
        heading: "GET /v1/workers/:id — read",
        body: "Returns a single worker by ID. 404 if the worker does not exist or belongs to a different tenant. The ?shape=ui variant adds rolling aggregates to the response.",
      },
      {
        heading: "PATCH /v1/workers/:id — update",
        body: "Requires Owner or Admin. Whitelisted patch fields: name, customInstructions, channels, autonomy, settings, modelPin, status ('active' | 'paused' | 'terminated'). Any other key in the body is silently ignored. Returns the updated row.",
      },
      {
        heading: "DELETE /v1/workers/:id — terminate",
        body: "Requires Owner or Admin. Soft-deletes the worker — the row remains in the audit log but the worker is removed from the active workforce, stops consuming AI spend, and is detached from all conversations and approval queues.",
      },
    ],
  },
} as const;

const docsApiConversations = {
  en: {
    metadata: {
      title: "Conversations API — Staffbix Docs",
      description: "List and inspect conversations, append messages, and stream replies from the embeddable widget.",
      keywords: [
        "Conversations API",
        "AI chat dispatch",
        "conversation messages API",
        "Staffbix dispatch endpoint",
        "Staffbix Conversations API",
      ],
    },
    layout: {
      title: "Conversations API.",
      subtitle: "Threads, messages, and the inbound dispatch surface.",
    },
    eyebrow: "API reference · Conversations",
    title: "Threads of messages, grouped by channel.",
    intro: "A conversation is a stable thread between a customer and one or more workers on a single channel (web, email, WhatsApp). Messages append to a conversation in order. The Conversations API exposes the read surface; inbound dispatch goes through the widget endpoint or the channel webhooks.",
    codeLabels: { bash: "Terminal · curl", json: "JSON · append message" },
    sections: [
      {
        heading: "GET /v1/conversations — list",
        body: "Returns recent conversations for the authenticated tenant, newest first. The response includes channel, worker assignment, customer self-identification (if any), the last message timestamp, and an unread count from the operator's perspective.",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/conversations \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\"" },
      },
      {
        heading: "GET /v1/conversations/:id — detail",
        body: "Returns a single conversation with its full message history (capped at the most recent 200 messages by default). 404 if the conversation does not exist or belongs to a different tenant.",
      },
      {
        heading: "POST /v1/conversations/:id/messages — append",
        body: "Appends a message to an existing thread. The body requires content (the message text) and role ('customer' or 'operator'). Operator messages are sent on behalf of a human team member and skip the AI worker; customer messages are dispatched into the worker's reply loop.",
        code: { lang: "json", label: "JSON · append message", content: "{\n  \"role\": \"customer\",\n  \"content\": \"My subscription was charged twice this month.\"\n}" },
      },
      {
        heading: "Widget dispatch",
        body: "The embeddable widget calls POST /api/widget/message — a public, tenantSlug-scoped endpoint that opens a server-sent event stream. The client receives a sequence of delta events terminated by a done event. The endpoint also creates conversations on-the-fly when no matching thread exists for the session.",
      },
    ],
  },
} as const;

const docsApiApprovals = {
  en: {
    metadata: {
      title: "Approvals API — Staffbix Docs",
      description: "List pending approvals, approve or reject worker actions, and inspect the audit history.",
      keywords: [
        "Approvals API",
        "pending approval queue API",
        "approve worker action",
        "reject AI draft",
        "Staffbix Approvals API",
      ],
    },
    layout: {
      title: "Approvals API.",
      subtitle: "Worker actions wait here when autonomy is set to 'approve'. Approve or reject by ID.",
    },
    eyebrow: "API reference · Approvals",
    title: "Human in the loop, by API.",
    intro: "When a worker's autonomy is set to 'approve', proposed actions land in the approval queue instead of executing directly. The Approvals API lists the pending queue, lets you decide each item, and records the decision in the audit log along with optional reviewer notes.",
    codeLabels: { bash: "Terminal · curl", json: "JSON · decide approval" },
    sections: [
      {
        heading: "GET /v1/approvals — pending list",
        body: "Returns pending worker actions for the authenticated tenant. Each row includes the worker, the proposed action kind ('web_reply', 'email_send', 'whatsapp_reply', 'social_post'), a summary, an optional cost estimate, a reversible flag, and an expires_at timestamp. Decided approvals are not returned by this endpoint — use the audit log for history.",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/approvals \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\"" },
      },
      {
        heading: "PATCH /v1/approvals/:id — decide",
        body: "Requires Owner or Admin. Body must include decision ('approve' or 'reject'). Optional notes (up to 500 chars) are recorded in the audit log alongside the decision. On approve, web_reply actions dispatch synchronously and return the sent action; whatsapp_reply, email_send, and social_post are queued for asynchronous dispatch and return queued: true.",
        code: { lang: "json", label: "JSON · decide approval", content: "{\n  \"decision\": \"approve\",\n  \"notes\": \"Voice matches brand guidelines. Refund policy correctly cited.\"\n}" },
      },
      {
        heading: "Rejection",
        body: "Rejecting an approval permanently discards the proposed action. The worker is notified through its feedback loop (rejected actions become negative training signal for the same tenant), the conversation is unblocked, and the row moves to status 'rejected' in the audit log.",
      },
      {
        heading: "Expiration and replay",
        body: "Approvals expire after one hour by default. Expired approvals move to status 'expired' and never execute even if you later try to approve them — the API returns 404 in that case. To replay an expired action, re-trigger the inbound message that produced it.",
      },
    ],
  },
} as const;

const docsApiReports = {
  en: {
    metadata: {
      title: "Reports API — Staffbix Docs",
      description: "Create scheduled or on-demand reports, list runs, and trigger an immediate run.",
      keywords: [
        "Reports API",
        "Staffbix saved reports",
        "report scheduling API",
        "report runs",
        "Staffbix Reports API",
      ],
    },
    layout: {
      title: "Reports API.",
      subtitle: "Workforce volume, AI spend, approvals throughput — saved as reports, scheduled or on demand.",
    },
    eyebrow: "API reference · Reports",
    title: "Saved reports, by API.",
    intro: "The Reports API lets you create saved report definitions, list their run history, and trigger an immediate run. Three tenant-scoped report kinds are available today: workforce_volume, ai_spend_daily, and approvals_throughput. Platform-scoped kinds (billing_summary, tenants_overview) are admin-only and not exposed through the project API.",
    codeLabels: { bash: "Terminal · curl", json: "JSON · create report" },
    sections: [
      {
        heading: "GET /v1/reports — list",
        body: "Returns saved reports for the authenticated tenant, newest first, capped at 200. Each row includes the report definition (name, kind, config, schedule) and a summary of the most recent run (status, started_at, finished_at, row_count, error).",
        code: { lang: "bash", label: "Terminal · curl", content: "curl https://api.staffbix.com/v1/reports \\\n  -H \"Authorization: Bearer $STAFFBIX_API_KEY\"" },
      },
      {
        heading: "POST /v1/reports — create",
        body: "Creates a saved report. Required fields: name (free text up to 200 chars) and kind (one of the tenant-scoped kinds). Optional: config (free-form JSON forwarded to the runner — typically the time range and any filters), and schedule (a cron expression like '0 9 * * 1' for every Monday at 09:00 UTC; omit for on-demand only).",
        code: { lang: "json", label: "JSON · create report", content: "{\n  \"name\": \"Weekly approvals throughput\",\n  \"kind\": \"approvals_throughput\",\n  \"config\": { \"rangeDays\": 7 },\n  \"schedule\": \"0 9 * * 1\"\n}" },
      },
      {
        heading: "GET /v1/reports/:id — detail",
        body: "Returns a single report with its full run history (most recent 50 runs). Each run includes status (queued, running, completed, failed), start/finish timestamps, duration in ms, the row count produced, and the error message if status is failed.",
      },
      {
        heading: "POST /v1/reports/:id/run — run now",
        body: "Triggers an immediate run of a saved report, independent of its schedule. The response returns the new run row at status 'queued'. Poll GET /v1/reports/:id (or subscribe to the report.ready webhook) to track completion.",
      },
    ],
  },
} as const;

const docsSdkTypescript = {
  en: {
    metadata: {
      title: "TypeScript SDK — Staffbix Docs",
      description: "Install @staffbix/sdk, initialize a client, hire a worker, list conversations, and handle typed errors.",
      keywords: [
        "Staffbix TypeScript SDK",
        "@staffbix/sdk",
        "Node.js AI integration",
        "Staffbix npm package",
        "TypeScript AI worker client",
      ],
    },
    layout: {
      title: "TypeScript SDK.",
      subtitle: "@staffbix/sdk — Node 20+, edge runtimes, browser bundlers. Typed end-to-end.",
    },
    eyebrow: "SDKs · TypeScript",
    title: "TypeScript / JavaScript.",
    intro: "The official TypeScript SDK is generated from the OpenAPI specification and hand-hardened for runtime safety. It runs on Node 20+, on edge runtimes such as Cloudflare Workers and Vercel Edge, and in the browser when bundled with Vite or webpack. The package is MIT-licensed and source-available on GitHub.",
    codeLabels: { terminal: "Terminal · npm", typescript: "TypeScript · client.ts" },
    sections: [
      {
        heading: "Install",
        body: "The package is published to npm as @staffbix/sdk. There are no native dependencies; install completes in under five seconds on a warm cache.",
        code: { lang: "bash", label: "Terminal · npm", content: "npm install @staffbix/sdk" },
      },
      {
        heading: "Initialize a client",
        body: "Pass your API key to the Staffbix constructor. The client is safe to instantiate once per process and share across requests; it does not hold mutable per-request state. The base URL defaults to https://api.staffbix.com and can be overridden for self-hosted or staging environments.",
        code: { lang: "ts", label: "TypeScript · client.ts", content: "import { Staffbix } from \"@staffbix/sdk\";\n\nconst client = new Staffbix({\n  apiKey: process.env.STAFFBIX_API_KEY!,\n});" },
      },
      {
        heading: "Hire a worker",
        body: "Every resource is namespaced on the client. workers.hire takes the role slug and returns the created row. List, read, update, and terminate follow the same shape as the REST API.",
        code: { lang: "ts", label: "TypeScript · hire.ts", content: "const worker = await client.workers.hire({\n  roleSlug: \"customer-support\",\n  name: \"Ava (Support)\",\n  autonomy: \"approve\",\n  channels: [\"web\", \"email\"],\n});\n\nconsole.log(worker.id);" },
      },
      {
        heading: "List conversations",
        body: "Pagination is cursor-based. Pass the cursor from the previous response into the next call to walk the full history. The SDK auto-paginates if you call .listAll() instead of .list().",
        code: { lang: "ts", label: "TypeScript · conversations.ts", content: "const page = await client.conversations.list({ limit: 50 });\nfor (const conversation of page.data) {\n  console.log(conversation.id, conversation.lastMessageAt);\n}" },
      },
      {
        heading: "Error handling",
        body: "All errors are instances of StaffbixError, a typed subclass of Error with status, code, and retryAfterMs fields. The SDK retries 429 and 5xx automatically with exponential back-off; throwing past that means the operation truly failed and should be surfaced.",
        code: { lang: "ts", label: "TypeScript · errors.ts", content: "import { Staffbix, StaffbixError } from \"@staffbix/sdk\";\n\ntry {\n  await client.workers.hire({ roleSlug: \"unknown\" });\n} catch (err) {\n  if (err instanceof StaffbixError) {\n    console.error(err.status, err.code, err.message);\n  } else {\n    throw err;\n  }\n}" },
      },
    ],
  },
} as const;

const docsSdkPython = {
  en: {
    metadata: {
      title: "Python SDK — Staffbix Docs",
      description: "Install staffbix, initialize a client, hire a worker, list conversations, and handle typed errors.",
      keywords: [
        "Staffbix Python SDK",
        "pip install staffbix",
        "Python AI worker integration",
        "AsyncStaffbix httpx",
        "Staffbix PyPI package",
      ],
    },
    layout: {
      title: "Python SDK.",
      subtitle: "staffbix — Python 3.10+. Async via httpx, sync via requests. Fully type-hinted.",
    },
    eyebrow: "SDKs · Python",
    title: "Python.",
    intro: "The official Python SDK targets Python 3.10 and above. It exposes both a sync client backed by requests and an async client backed by httpx, sharing the same type-hinted method signatures so you can switch runtimes without rewriting business logic. The package is MIT-licensed.",
    codeLabels: { terminal: "Terminal · pip", python: "Python · client.py" },
    sections: [
      {
        heading: "Install",
        body: "The package is published to PyPI as staffbix. It has two runtime dependencies (httpx and pydantic); both are widely used and pin-tolerant.",
        code: { lang: "bash", label: "Terminal · pip", content: "pip install staffbix" },
      },
      {
        heading: "Initialize a client",
        body: "The Staffbix class accepts an api_key argument and may be instantiated at module scope. Like the TypeScript SDK, the client is stateless across requests and safe to share between threads.",
        code: { lang: "python", label: "Python · client.py", content: "import os\nfrom staffbix import Staffbix\n\nclient = Staffbix(api_key=os.environ[\"STAFFBIX_API_KEY\"])" },
      },
      {
        heading: "Hire a worker",
        body: "Resources are namespaced as attributes on the client. The hire method returns a typed Worker model; field access is autocomplete-friendly in any editor with pyright or pylance enabled.",
        code: { lang: "python", label: "Python · hire.py", content: "worker = client.workers.hire(\n    role_slug=\"customer-support\",\n    name=\"Ava (Support)\",\n    autonomy=\"approve\",\n    channels=[\"web\", \"email\"],\n)\n\nprint(worker.id)" },
      },
      {
        heading: "Async variant",
        body: "For high-concurrency services, import AsyncStaffbix instead of Staffbix. The async surface mirrors the sync API one-for-one, returning awaitable coroutines instead of synchronous results.",
        code: { lang: "python", label: "Python · async.py", content: "import asyncio\nfrom staffbix import AsyncStaffbix\n\nasync def main():\n    async with AsyncStaffbix(api_key=\"sbx_live_...\") as client:\n        conversations = await client.conversations.list(limit=50)\n        for c in conversations.data:\n            print(c.id)\n\nasyncio.run(main())" },
      },
      {
        heading: "Error handling",
        body: "All HTTP errors raise StaffbixError, a subclass of Exception with status, code, and retry_after_ms attributes. The client retries 429 and 5xx automatically; raised errors past that point reflect operations that truly failed.",
      },
    ],
  },
} as const;

const docsSdkPhp = {
  en: {
    metadata: {
      title: "PHP SDK — Staffbix Docs",
      description: "Install staffbix/sdk via composer, initialize a client, hire a worker, list conversations, handle typed errors.",
      keywords: [
        "Staffbix PHP SDK",
        "composer staffbix",
        "PHP AI integration",
        "PSR-18 AI client",
        "Staffbix Packagist package",
      ],
    },
    layout: {
      title: "PHP SDK.",
      subtitle: "staffbix/sdk — PHP 8.1+, PSR-18 HTTP client, strict types end-to-end.",
    },
    eyebrow: "SDKs · PHP",
    title: "PHP.",
    intro: "The official PHP SDK targets PHP 8.1 and above with strict types enforced throughout. It depends on a PSR-18 HTTP client (Guzzle, Symfony HttpClient, or any compatible implementation) so you can plug it into existing applications without forcing a dependency swap. The package is MIT-licensed and Packagist-published.",
    codeLabels: { terminal: "Terminal · composer", php: "PHP · client.php" },
    sections: [
      {
        heading: "Install",
        body: "Install via composer. The SDK pulls in psr/http-client and psr/http-message; choose any concrete implementation that satisfies them.",
        code: { lang: "bash", label: "Terminal · composer", content: "composer require staffbix/sdk guzzlehttp/guzzle" },
      },
      {
        heading: "Initialize a client",
        body: "Construct the client with your API key. The client is immutable — its methods do not mutate it, and it is safe to inject as a singleton through any container.",
        code: { lang: "php", label: "PHP · client.php", content: "<?php\nuse Staffbix\\Staffbix;\n\n$client = new Staffbix(apiKey: getenv('STAFFBIX_API_KEY'));" },
      },
      {
        heading: "Hire a worker",
        body: "Resources are exposed as readonly properties on the client. Each method returns a typed value object — field access uses native PHP property accessors and benefits from Psalm/PHPStan inference on level 8.",
        code: { lang: "php", label: "PHP · hire.php", content: "<?php\n$worker = $client->workers->hire(\n    roleSlug: 'customer-support',\n    name: 'Ava (Support)',\n    autonomy: 'approve',\n    channels: ['web', 'email'],\n);\n\necho $worker->id;" },
      },
      {
        heading: "List conversations",
        body: "Pagination uses cursors. The Page object exposes a generator via getIterator() so you can iterate the full history without manually advancing cursors.",
        code: { lang: "php", label: "PHP · conversations.php", content: "<?php\nforeach ($client->conversations->listAll(limit: 50) as $conversation) {\n    echo $conversation->id . PHP_EOL;\n}" },
      },
      {
        heading: "Error handling",
        body: "All HTTP errors throw StaffbixException, which exposes getStatus(), getCode(), and getRetryAfterMs() methods. The SDK retries 429 and 5xx automatically before throwing.",
      },
    ],
  },
} as const;

const docsSdkGo = {
  en: {
    metadata: {
      title: "Go SDK — Staffbix Docs",
      description: "go get github.com/staffbix/sdk-go, initialize a client, hire a worker, list conversations, handle typed errors.",
      keywords: [
        "Staffbix Go SDK",
        "go get staffbix",
        "Go AI worker integration",
        "context-aware AI client",
        "Staffbix sdk-go module",
      ],
    },
    layout: {
      title: "Go SDK.",
      subtitle: "github.com/staffbix/sdk-go — Go 1.22+, context-aware, zero external runtime deps.",
    },
    eyebrow: "SDKs · Go",
    title: "Go.",
    intro: "The official Go SDK targets Go 1.22 and above with no external runtime dependencies — only the standard library. Every method takes a context.Context first argument so cancellation, deadlines, and tracing propagate cleanly through your service. The package is MIT-licensed.",
    codeLabels: { terminal: "Terminal · go get", go: "Go · client.go" },
    sections: [
      {
        heading: "Install",
        body: "Add the module to your go.mod. The SDK has zero external dependencies, so the install completes in a fresh module within seconds.",
        code: { lang: "bash", label: "Terminal · go get", content: "go get github.com/staffbix/sdk-go" },
      },
      {
        heading: "Initialize a client",
        body: "Use staffbix.New to construct a client. The returned *Client is safe for concurrent use across goroutines. The default HTTP client is net/http; supply staffbix.WithHTTPClient to substitute your own transport.",
        code: { lang: "go", label: "Go · client.go", content: "package main\n\nimport (\n  \"os\"\n  \"github.com/staffbix/sdk-go\"\n)\n\nvar client = staffbix.New(os.Getenv(\"STAFFBIX_API_KEY\"))" },
      },
      {
        heading: "Hire a worker",
        body: "Methods return (Result, error). Errors are typed: *staffbix.Error exposes Status, Code, and RetryAfter fields, matching the wire format precisely. Pass ctx first; the SDK respects ctx.Done() at every network boundary.",
        code: { lang: "go", label: "Go · hire.go", content: "worker, err := client.Workers.Hire(ctx, staffbix.HireWorkerRequest{\n  RoleSlug: \"customer-support\",\n  Name:     \"Ava (Support)\",\n  Autonomy: \"approve\",\n  Channels: []string{\"web\", \"email\"},\n})\nif err != nil { return err }\nfmt.Println(worker.ID)" },
      },
      {
        heading: "List conversations",
        body: "List returns a cursor-paginated response. For convenience, ListAll returns an iterator that walks the full history; under the hood it issues the same paginated requests but hides the cursor bookkeeping.",
      },
      {
        heading: "Error handling",
        body: "Use errors.As to unwrap *staffbix.Error and switch on its Code field. The client retries 429 and 5xx automatically with exponential back-off; returned errors past that point reflect operations that truly failed.",
        code: { lang: "go", label: "Go · errors.go", content: "var sbxErr *staffbix.Error\nif errors.As(err, &sbxErr) {\n  switch sbxErr.Code {\n  case \"plan_limit_workers\":\n    upgrade()\n  case \"rate_limited\":\n    time.Sleep(sbxErr.RetryAfter)\n  }\n}" },
      },
    ],
  },
} as const;

const docsGuideWidget = {
  en: {
    metadata: {
      title: "Embed widget — Staffbix Docs",
      description: "Embed a Staffbix AI worker on your website with a single script tag. Customize color, position, and locale.",
      keywords: [
        "Staffbix widget",
        "embed AI chat widget",
        "AI worker widget script",
        "Staffbix web embed",
        "embeddable AI chat",
      ],
    },
    layout: {
      title: "Embed widget.",
      subtitle: "One script tag. Conversations open in a corner panel, stream replies, escalate when the worker says so.",
    },
    eyebrow: "Guides · Embed widget",
    title: "One script tag, one AI worker.",
    intro: "The Staffbix widget is a small JavaScript bundle (around 12 KB gzipped) that opens a chat panel anchored to a corner of any web page. It binds to a specific worker via your tenant slug and the worker slug, streams replies through the public dispatch endpoint, and escalates to a human when the worker proposes an action that needs approval.",
    codeLabels: { html: "HTML · embed", javascript: "JavaScript · runtime customization" },
    sections: [
      {
        heading: "Add the script tag",
        body: "Paste this snippet immediately before the closing body tag of every page where the widget should appear. Replace tenantSlug with the slug shown in Settings → General, and workerSlug with the slug of the worker you want to embed.",
        code: { lang: "html", label: "HTML · embed", content: "<script\n  src=\"https://cdn.staffbix.com/widget.js\"\n  data-tenant=\"acme\"\n  data-worker=\"ava-support\"\n  defer\n></script>" },
      },
      {
        heading: "Customize appearance",
        body: "All visual options are read from data-* attributes on the script tag. data-color sets the primary brand color in hex. data-position is one of 'bottom-right' (default), 'bottom-left', 'top-right', 'top-left'. data-locale forces a UI language (defaults to the visitor's browser language). data-greeting overrides the worker's default opening message.",
        code: { lang: "html", label: "HTML · embed", content: "<script\n  src=\"https://cdn.staffbix.com/widget.js\"\n  data-tenant=\"acme\"\n  data-worker=\"ava-support\"\n  data-color=\"#0F172A\"\n  data-position=\"bottom-left\"\n  data-locale=\"fr\"\n  defer\n></script>" },
      },
      {
        heading: "Runtime control",
        body: "After the script loads it exposes a global window.Staffbix object with methods to open and close the panel, identify the visitor (so the worker knows who it is talking to), and listen for events. Identification is signed with your project key on the server side — never embed your live API key in the page.",
        code: { lang: "js", label: "JavaScript · runtime customization", content: "window.Staffbix.identify({\n  email: \"customer@example.com\",\n  name: \"Jane Doe\",\n  signedToken: serverGeneratedHmac,\n});\n\nwindow.Staffbix.open();" },
      },
      {
        heading: "Content security policy",
        body: "If your site sends a Content-Security-Policy header, allow https://cdn.staffbix.com in script-src and https://api.staffbix.com in connect-src. The widget opens an EventSource (server-sent events) for streaming replies; if your CSP blocks it, the widget falls back to short-polling but loses the typing-indicator effect.",
      },
    ],
  },
} as const;

const docsGuideWhatsapp = {
  en: {
    metadata: {
      title: "Connect WhatsApp — Staffbix Docs",
      description: "Connect Staffbix to your WhatsApp Business number. Meta setup, phone number ID, access token, webhook verify.",
      keywords: [
        "Staffbix WhatsApp",
        "WhatsApp Business AI",
        "connect WhatsApp AI worker",
        "Meta Business setup",
        "WhatsApp webhook verify",
      ],
    },
    layout: {
      title: "Connect WhatsApp.",
      subtitle: "Meta Business setup, phone number ID, access token, webhook verify token — once.",
    },
    eyebrow: "Guides · Connect WhatsApp",
    title: "WhatsApp Business in three setup steps.",
    intro: "Staffbix sends and receives WhatsApp messages through the Meta Cloud API. The setup runs once per tenant: provision a WhatsApp Business account, generate a permanent access token, and wire the webhook through Settings → Integrations. After that, any worker with 'whatsapp' in its channel list handles WhatsApp traffic automatically.",
    codeLabels: { terminal: "Terminal · verify", json: "JSON · webhook payload" },
    sections: [
      {
        heading: "Meta Business Manager setup",
        body: "Open business.facebook.com and create or open a Business Manager account. Under WhatsApp Accounts, add a phone number you control and verify it via SMS or voice call. Take note of the WhatsApp Business Account ID and the Phone Number ID — both appear under the account's overview page. The phone number must not already be active in the consumer WhatsApp app.",
      },
      {
        heading: "Generate an access token",
        body: "Inside Meta Business Manager, go to System Users, create a system user, and grant it the whatsapp_business_messaging and whatsapp_business_management permissions on your WhatsApp Business Account. Then generate a token with no expiration. Copy it once; Meta never displays it again.",
      },
      {
        heading: "Connect in Staffbix",
        body: "In Staffbix open Settings → Integrations → WhatsApp. Paste the Phone Number ID and the access token. Staffbix immediately exchanges the token to confirm the credentials, registers a webhook with Meta, and stores both values encrypted at rest (per-tenant DEK, rotated nightly).",
      },
      {
        heading: "Webhook verify token",
        body: "Meta's webhook subscription requires a verify token. Staffbix generates a unique one per tenant and displays it in the Integrations page. Paste it into the Verify Token field in Meta's webhook configuration. When Meta sends its initial GET with hub.mode=subscribe, Staffbix echoes hub.challenge back as plaintext if the token matches.",
        code: { lang: "bash", label: "Terminal · verify", content: "# Meta sends this on subscription:\n# GET https://staffbix.com/api/webhooks/whatsapp/<tenantId>\n#   ?hub.mode=subscribe\n#   &hub.challenge=1234567890\n#   &hub.verify_token=<your-verify-token>\n\n# Staffbix responds with the challenge as plaintext on match." },
      },
      {
        heading: "Inbound message flow",
        body: "When a customer messages your WhatsApp number, Meta POSTs the payload to /api/webhooks/whatsapp/<tenantId>. Staffbix verifies Meta's signature, resolves the conversation (creating one if the phone number is new), and dispatches the message into the worker assigned to the whatsapp channel. The worker's reply is sent back through the Meta Cloud API in under five seconds end-to-end.",
        code: { lang: "json", label: "JSON · webhook payload", content: "{\n  \"object\": \"whatsapp_business_account\",\n  \"entry\": [{\n    \"id\": \"<waba-id>\",\n    \"changes\": [{\n      \"field\": \"messages\",\n      \"value\": {\n        \"messages\": [{\n          \"from\": \"15551234567\",\n          \"id\": \"wamid.HBg...\",\n          \"timestamp\": \"1747396800\",\n          \"text\": { \"body\": \"What time do you open?\" },\n          \"type\": \"text\"\n        }]\n      }\n    }]\n  }]\n}" },
      },
    ],
  },
} as const;

const docsRateLimits = {
  en: {
    metadata: {
      title: "Rate limits — Staffbix Docs",
      description: "Per-tenant rate limits across api, chat, and webhook buckets. Sliding-window algorithm, 429 handling.",
      keywords: [
        "Staffbix rate limits",
        "API rate limit",
        "429 too many requests",
        "sliding window rate limit",
        "Staffbix throttling",
      ],
    },
    layout: {
      title: "Rate limits.",
      subtitle: "Three buckets, sliding window, per-tenant scope. 429 with Retry-After when you exhaust one.",
    },
    eyebrow: "Reference · Rate limits",
    title: "Three buckets, scoped per tenant.",
    intro: "Staffbix uses a sliding-window rate limiter keyed by tenant. Three buckets cover the public surface today: api for read/write REST traffic, chat for AI-bound conversation traffic, and webhook for inbound platform deliveries. Every response includes headers that describe your current position in the relevant bucket; respect them and you will never see a 429.",
    codeLabels: { table: "Buckets", typescript: "TypeScript · 429 handler" },
    sections: [
      {
        heading: "The three buckets",
        body: "The api bucket allows 120 requests per minute per tenant and covers every REST endpoint that is not chat or webhook. The chat bucket allows 30 requests per minute per tenant and covers worker dispatch — inbound messages, widget streams, conversation appends. The webhook bucket allows 1000 requests per minute per tenant and covers inbound platform webhooks (Stripe, Meta, inbound email). Limits are enforced with a sliding window — there is no fixed-minute reset boundary that you can exploit by bursting at second 59.",
      },
      {
        heading: "Headers on every response",
        body: "Every API response carries X-RateLimit-Bucket (the bucket the request consumed), X-RateLimit-Limit (the bucket's max), X-RateLimit-Remaining (how many requests you have left in the current window), and X-RateLimit-Reset (a Unix timestamp at which your remaining returns to the limit). A defensive client decrements its local counter from these headers rather than guessing.",
      },
      {
        heading: "429 responses",
        body: "When you exhaust a bucket the API returns 429 Too Many Requests with the same envelope as any other error: { error, code: 'rate_limited', retryAfterMs }. The Retry-After header carries the same number in seconds. Wait at least retryAfterMs before retrying, ideally with jitter (50-250 ms of random padding) to avoid synchronizing with other clients.",
        code: { lang: "ts", label: "TypeScript · 429 handler", content: "async function call<T>(fn: () => Promise<T>): Promise<T> {\n  while (true) {\n    try {\n      return await fn();\n    } catch (err: unknown) {\n      const e = err as { status?: number; retryAfterMs?: number };\n      if (e.status !== 429) throw err;\n      const wait = (e.retryAfterMs ?? 1000) + Math.random() * 250;\n      await new Promise((r) => setTimeout(r, wait));\n    }\n  }\n}" },
      },
      {
        heading: "Bursts and back-pressure",
        body: "The sliding window allows short bursts above the per-minute rate as long as the rolling 60-second total stays under the limit. A spiky workload that averages well below the cap will rarely hit 429; a steady workload at 95% of the cap will see occasional 429s from request-time drift. If you are running close to a limit consistently, upgrade your plan or open a support ticket — we will raise the bucket rather than let you fight the limiter.",
      },
      {
        heading: "Excluded paths",
        body: "Health checks (/api/health) and authentication endpoints (/api/auth/*) are rate-limited under different buckets (login: 5 per 15 minutes, otp: 5 per 15 minutes, register: 10 per hour) keyed by IP rather than tenant. These are documented separately under Authentication and exist to defeat credential-stuffing rather than to throttle legitimate traffic.",
      },
    ],
  },
} as const;

const auth = {
  en: {
    common: {
      backHome: "← Back home",
      version: "v1.0",
      email: "Email",
      workEmail: "Work email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      login: "Log in",
      privacy: "Privacy",
      terms: "Terms",
      docs: "Docs",
    },
    login: {
      sideEyebrow: "What’s waiting",
      sideTitle: "Your workforce is awake.",
      sideFooter: "Sessions are tracked per device · You can revoke any from settings",
      perks: [
        "AI workers operating while you sleep",
        "Approvals queued for you, not the AI",
        "Daily briefing already in your inbox",
        "Hard caps, full audit, no surprises",
        "23 languages, one company voice",
      ],
      credentials: {
        eyebrow: "Log in",
        title: "Welcome back.",
        body: "We’ll email you a six-digit code after your password.",
        forgot: "Forgot?",
        continue: "Continue",
        newHere: "New here?",
        trial: "Start free trial",
        otpNote: "OTP delivered to your verified email · valid 10 minutes",
      },
      otp: {
        eyebrow: "Step 2 of 2 · Verification",
        title: "Check your email.",
        bodyPrefix: "We sent a six-digit code to",
        inbox: "your inbox",
        bodySuffix: "Valid for 10 minutes.",
        submit: "Verify and log in",
        back: "← Use a different email",
        resend: "Resend code",
      },
      errors: {
        missingFields: "Please fill in both fields.",
        signInFailed: "Sign-in failed. Try again.",
        network: "Network problem. Check your connection and try again.",
        submitting: "Signing in...",
      },
      otpErrors: {
        missingDigits: "Enter all six digits.",
        incorrectCode: "Incorrect code.",
        network: "Network problem. Try again.",
        resendFailed: "Couldn't resend. Try again in a minute.",
        verifying: "Verifying...",
        sending: "Sending...",
      },
    },
    signup: {
      metadata: {
        title: "Start free trial — Staffbix",
        description: "Three days. No card. One AI worker on the house.",
        keywords: [
          "Staffbix signup",
          "create Staffbix account",
          "AI workforce trial",
          "free AI worker trial",
          "Staffbix free trial",
        ],
      },
      eyebrow: "Start free trial · 3 days",
      title: "Hire your first AI worker today.",
      body: "No card. No sales call. Onboarding takes under an hour.",
      firstName: "First name",
      firstNamePlaceholder: "Ada",
      lastName: "Surname",
      lastNamePlaceholder: "Lovelace",
      company: "Company name",
      companyPlaceholder: "Northway Goods",
      passwordPlaceholder: "At least 12 characters",
      passwordHint: "Mix upper, lower, number, symbol. Stored with memory-hard hashing.",
      passwordStrength: {
        tooShort: "Use at least 12 characters",
        tooLong: "Too long — max 256 characters",
        valid: "Looks good",
        progress: "{count} / 12 characters",
      },
      submit: "Create account",
      already: "Already have one?",
      agreementPrefix: "By creating an account you agree to our",
      sideEyebrow: "What you get",
      sideTitle: "One company brain. Many AI bodies.",
      sideFooter: "18 roles available today · 23 languages · 60+ roles in the catalog",
      perks: [
        "1 AI worker, your pick",
        "Web chat + email channels live in under an hour",
        "Brand Bible auto-built from your site",
        "Approval Center on conservative defaults",
        "No card required · cancel any time",
      ],
      errors: {
        missingFields: "Please fill in every field.",
        signupFailed: "Something went wrong. Please try again.",
        network: "Network problem. Check your connection and try again.",
        submitting: "Creating account...",
      },
    },
    reset: {
      sideEyebrow: "How we handle it",
      sideTitle: "Your data is yours.",
      sideFooter: "Security incidents disclosed on the public status page",
      perks: [
        "Reset link valid for 30 minutes",
        "All active sessions revoked on change",
        "Memory-hard password hashing",
        "Tenant-isolated. Other companies cannot see yours.",
        "GDPR-aligned · exportable · deletable on request",
      ],
      request: {
        eyebrow: "Reset password",
        title: "Forgot your password?",
        body: "Enter the email on your account. We’ll send you a link to set a new one. Link is valid for 30 minutes.",
        submit: "Send reset link",
        remember: "Remember it?",
        backLogin: "Back to login",
        sessionNote: "All active sessions are revoked when the password is changed",
      },
      sent: {
        eyebrow: "Reset password · Step 2 of 2",
        title: "Check your email.",
        bodyPrefix: "We sent a reset link to",
        bodySuffix: "Expires in 30 minutes. If it’s not there in a minute, check spam.",
        nextTitle: "What happens next",
        steps: [
          "Open the email and click the reset link.",
          "Set a new password and confirm it.",
          "Verify with the six-digit code you’ll get.",
        ],
        gmail: "Open Gmail",
        differentEmail: "Use different email",
        backLoginArrow: "← Back to login",
        resend: "Resend email",
      },
    },
    verify: {
      loginPrompt: "Already verified?",
      loginCta: "Log in →",
      eyebrow: "Verify email",
      title: "Confirm your email.",
      bodyPrefix: "We sent a verification link to",
      bodySuffix: "Click the link in the email — or enter the six-digit code below if you’d rather.",
      codeLabel: "Six-digit code",
      submit: "Verify and continue",
      inboxLabel: "Or open your inbox",
      providers: [
        { label: "Gmail", href: "https://mail.google.com" },
        { label: "Outlook", href: "https://outlook.live.com" },
        { label: "Yahoo", href: "https://mail.yahoo.com" },
        { label: "iCloud", href: "https://www.icloud.com/mail" },
      ],
      wrongEmail: "← Wrong email",
      sentAgain: "Sent again",
      resend: "Resend email",
      validNote: "Link valid for 24 hours. Code valid for 10 minutes.",
    },
  },
  tr: {
    common: {
      backHome: "← Ana sayfaya dön",
      version: "v1.0",
      email: "E-posta",
      workEmail: "İş e-postası",
      emailPlaceholder: "sen@sirket.com",
      password: "Şifre",
      showPassword: "Şifreyi göster",
      hidePassword: "Şifreyi gizle",
      login: "Giriş yap",
      privacy: "Gizlilik",
      terms: "Şartlar",
      docs: "Dokümanlar",
    },
    login: {
      alert: "Bu görsel bir taslak. Auth Sprint 2’de bağlanacak.",
      sideEyebrow: "Seni bekleyenler",
      sideTitle: "İş gücün uyanık.",
      sideFooter: "Oturumlar cihaz bazında izlenir · Ayarlardan istediğini iptal edebilirsin",
      perks: [
        "Sen uyurken çalışan AI iş gücü",
        "Onaylar AI için değil senin için kuyruğa alınır",
        "Günlük özet zaten gelen kutunda",
        "Sert limitler, tam audit, sürpriz yok",
        "23 dil, tek şirket sesi",
      ],
      credentials: {
        eyebrow: "Giriş yap",
        title: "Tekrar hoş geldin.",
        body: "Şifrenden sonra sana altı haneli bir kod e-postalayacağız.",
        forgot: "Unuttun mu?",
        continue: "Devam et",
        newHere: "Yeni misin?",
        trial: "Ücretsiz denemeyi başlat",
        otpNote: "OTP doğrulanmış e-postana gönderilir · 10 dakika geçerli",
      },
      otp: {
        eyebrow: "2 adımın 2.si · Doğrulama",
        title: "E-postanı kontrol et.",
        bodyPrefix: "Altı haneli kodu şu adrese gönderdik:",
        inbox: "gelen kutun",
        bodySuffix: "10 dakika geçerli.",
        submit: "Doğrula ve giriş yap",
        back: "← Farklı e-posta kullan",
        resend: "Kodu tekrar gönder",
      },
      errors: {
        missingFields: "Lütfen her iki alanı da doldur.",
        signInFailed: "Giriş başarısız. Tekrar dene.",
        network: "Ağ sorunu. Bağlantını kontrol et ve tekrar dene.",
        submitting: "Giriş yapılıyor...",
      },
      otpErrors: {
        missingDigits: "Altı haneyi de gir.",
        incorrectCode: "Kod yanlış.",
        network: "Ağ sorunu. Tekrar dene.",
        resendFailed: "Tekrar gönderilemedi. Bir dakika sonra dene.",
        verifying: "Doğrulanıyor...",
        sending: "Gönderiliyor...",
      },
    },
    signup: {
      metadata: {
        title: "Ücretsiz denemeyi başlat — Staffbix",
        description: "Üç gün. Kart yok. İlk AI çalışanı bizden.",
        keywords: [
          "Staffbix signup",
          "create Staffbix account",
          "AI workforce trial",
          "free AI worker trial",
          "Staffbix free trial",
        ],
      },
      eyebrow: "Ücretsiz deneme · 3 gün",
      title: "İlk AI çalışanını bugün işe al.",
      body: "Kart yok. Satış görüşmesi yok. Onboarding bir saatten kısa sürer.",
      firstName: "Ad",
      firstNamePlaceholder: "Ada",
      lastName: "Soyad",
      lastNamePlaceholder: "Lovelace",
      company: "Şirket adı",
      companyPlaceholder: "Northway Goods",
      passwordPlaceholder: "En az 12 karakter",
      passwordHint: "Büyük/küçük harf, sayı ve sembol karıştır. Memory-hard hashing ile saklanır.",
      passwordStrength: {
        tooShort: "En az 12 karakter olmalı",
        tooLong: "Çok uzun — en fazla 256 karakter",
        valid: "Uygun",
        progress: "{count} / 12 karakter",
      },
      submit: "Hesap oluştur",
      already: "Zaten hesabın var mı?",
      agreementPrefix: "Hesap oluşturarak şunları kabul edersin:",
      sideEyebrow: "Ne alırsın",
      sideTitle: "Tek şirket beyni. Birçok AI gövdesi.",
      sideFooter: "Bugün 18 rol hazır · 23 dil · katalogda 60+ rol",
      perks: [
        "Seçtiğin 1 AI çalışanı",
        "Web chat + e-posta kanalları bir saatten kısa sürede canlı",
        "Marka Kitabı sitenden otomatik oluşturulur",
        "Onay Merkezi temkinli varsayılanlarla gelir",
        "Kart gerekmez · istediğin zaman iptal",
      ],
      errors: {
        missingFields: "Lütfen her alanı doldur.",
        signupFailed: "Bir şeyler ters gitti. Lütfen tekrar dene.",
        network: "Ağ sorunu. Bağlantını kontrol et ve tekrar dene.",
        submitting: "Hesap oluşturuluyor...",
      },
    },
    reset: {
      sideEyebrow: "Nasıl yönetiriz",
      sideTitle: "Verin senindir.",
      sideFooter: "Güvenlik olayları public status sayfasında açıklanır",
      perks: [
        "Reset linki 30 dakika geçerli",
        "Değişiklikte tüm aktif oturumlar iptal edilir",
        "Memory-hard şifre hashing",
        "Tenant izolasyonlu. Diğer şirketler seninkini göremez.",
        "GDPR uyumlu · dışa aktarılabilir · talepte silinebilir",
      ],
      request: {
        eyebrow: "Şifre sıfırla",
        title: "Şifreni mi unuttun?",
        body: "Hesabındaki e-postayı gir. Yeni şifre belirlemen için link göndereceğiz. Link 30 dakika geçerlidir.",
        submit: "Reset linki gönder",
        remember: "Hatırladın mı?",
        backLogin: "Girişe dön",
        sessionNote: "Şifre değiştiğinde tüm aktif oturumlar iptal edilir",
      },
      sent: {
        eyebrow: "Şifre sıfırla · 2 adımın 2.si",
        title: "E-postanı kontrol et.",
        bodyPrefix: "Reset linkini şu adrese gönderdik:",
        bodySuffix: "30 dakika içinde sona erer. Bir dakika içinde gelmezse spam klasörünü kontrol et.",
        nextTitle: "Sırada ne var",
        steps: [
          "E-postayı aç ve reset linkine tıkla.",
          "Yeni şifre belirle ve onayla.",
          "Alacağın altı haneli kodla doğrula.",
        ],
        gmail: "Gmail’i aç",
        differentEmail: "Farklı e-posta kullan",
        backLoginArrow: "← Girişe dön",
        resend: "E-postayı tekrar gönder",
      },
    },
    verify: {
      loginPrompt: "Zaten doğruladın mı?",
      loginCta: "Giriş yap →",
      eyebrow: "E-postayı doğrula",
      title: "E-postanı onayla.",
      bodyPrefix: "Doğrulama linkini şu adrese gönderdik:",
      bodySuffix: "E-postadaki linke tıkla ya da istersen aşağıdaki altı haneli kodu gir.",
      codeLabel: "Altı haneli kod",
      submit: "Doğrula ve devam et",
      inboxLabel: "Ya da gelen kutunu aç",
      providers: [
        { label: "Gmail", href: "https://mail.google.com" },
        { label: "Outlook", href: "https://outlook.live.com" },
        { label: "Yahoo", href: "https://mail.yahoo.com" },
        { label: "iCloud", href: "https://www.icloud.com/mail" },
      ],
      wrongEmail: "← Yanlış e-posta",
      sentAgain: "Tekrar gönderildi",
      resend: "E-postayı tekrar gönder",
      validNote: "Link 24 saat geçerli. Kod 10 dakika geçerli.",
    },
  },
} as const;

const acceptInvitationEn = {
  eyebrow: "Team invitation",
  alreadyHaveAccount: "Already have an account?",
  signIn: "Sign in",
  checking: "Checking your invitation...",
  joinTitlePrefix: "Join",
  joinDescriptionPrefix: "You're joining",
  joinDescriptionAs: "as",
  joinDescriptionSuffix: "Set a password to finish.",
  yourName: "Your name",
  yourNamePlaceholder: "Jane Doe",
  email: "Email",
  passwordLabel: "Set a password",
  passwordPlaceholder: "12+ characters",
  passwordHint: "Minimum 12 characters.",
  submitPrefix: "Join",
  submitting: "Joining...",
  backHome: "← Back home",
  version: "v1.0.0",
  errors: {
    invalidLink: "Invalid invitation link.",
    invitationInvalid: "This invitation link is no longer valid.",
    networkLoad: "Network problem. Try again in a moment.",
    missingName: "Please enter your name.",
    passwordTooShort: "Password must be at least 12 characters.",
    submitFailed: "Couldn't complete sign-up. Please try again.",
    network: "Network problem. Try again.",
  },
} as const;

const acceptInvitationLocaleMap = {
  en: acceptInvitationEn,
} as const;

const legalLayout = {
  en: {
    effective: "Effective",
    version: "v1.0 · staffbix.com",
    legalIndex: "Legal index",
    onThisPage: "On this page",
    defaultContact: "Questions about this document? Email legal@staffbix.com.",
    nav: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Security", href: "/legal/security" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
  tr: {
    effective: "Yürürlük",
    version: "v1.0 · staffbix.com",
    legalIndex: "Legal indeks",
    onThisPage: "Bu sayfada",
    defaultContact: "Bu dokümanla ilgili sorular için legal@staffbix.com adresine yaz.",
    nav: [
      { label: "Gizlilik", href: "/legal/privacy" },
      { label: "Şartlar", href: "/legal/terms" },
      { label: "Güvenlik", href: "/legal/security" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Çerezler", href: "/legal/cookies" },
    ],
  },
} as const;

const legalSecurity = {
  en: {
    metadata: {
      title: "Security — Staffbix",
      description: "How Staffbix protects your data, isolates tenants, and operates securely.",
      keywords: [
        "Staffbix security",
        "AI workforce security",
        "SOC 2 AI platform",
        "data encryption Staffbix",
        "tenant isolation AI",
        "Staffbix vulnerability disclosure",
      ],
    },
    eyebrow: "Legal · Security",
    title: "Security at Staffbix.",
    effective: "May 1, 2026",
    intro: "Security is a product feature, not a checkbox. This page describes how we isolate tenants, encrypt data, monitor for incidents, and respond when something goes wrong.",
    contactLine: "Report a vulnerability to security@staffbix.com · Responses within 1 business day",
    sections: [
      {
        id: "tenant-isolation",
        title: "Tenant isolation",
        paragraphs: [
          "Every customer’s data is isolated at the database row level and at the vector index level. Application services scope every query and mutation to the active tenant. Object storage uses per-tenant prefixes with policy-enforced access. Cross-tenant access is impossible by design and verified by automated tests that exercise unauthorized access patterns on every change.",
        ],
      },
      {
        id: "encryption",
        title: "Encryption",
        paragraphs: [
          "Data in transit is protected by current TLS standards on every surface. Data at rest is encrypted by our storage and database providers. Sensitive fields are additionally encrypted at the application layer. Backups are encrypted before leaving the source system. Encryption keys are managed by a dedicated key-management service with rotation policies.",
        ],
      },
      {
        id: "auth",
        title: "Authentication",
        paragraphs: [
          "Passwords are stored using a memory-hard hashing algorithm with per-credential salts. Web login requires email-based one-time passwords on every session. Mobile sessions use a refresh-and-access token pair stored in the device’s secure keystore. Five failed attempts in fifteen minutes trigger a temporary lockout.",
          "Production access by Staffbix staff requires mandatory two-factor authentication, is logged with attribution, and is reviewed quarterly.",
        ],
      },
      {
        id: "ai-safety",
        title: "AI-specific defenses",
        paragraphs: [
          "Prompt-injection mitigation is applied to both input and output paths. Tool calls are validated against an allowlist. Spending caps are enforced at the platform layer, not at the AI level, so a misbehaving prompt cannot exceed your configured limits. PII leakage detection runs on outbound content. Anomaly detection flags behavior that deviates from the worker’s baseline.",
        ],
      },
      {
        id: "network",
        title: "Network and infrastructure",
        paragraphs: [
          "The edge is protected by a managed web application firewall with managed rule sets, distributed-denial-of-service mitigation, bot detection, and per-IP and per-account rate limiting. Internal services authenticate one another; network segmentation prevents direct ingress to internal-only services. We run on managed container platforms with auto-scaling and zero-downtime releases.",
        ],
      },
      {
        id: "audit",
        title: "Audit, monitoring, and response",
        paragraphs: [
          "Every administrative action and every AI action that mutates external state is recorded with timestamp, actor, action details, and outcome. Logs are centralized, searchable, and retained per compliance requirements. We monitor error rate, latency outliers, and cost spikes with on-call rotations.",
          "Security incidents are disclosed on the public status page and to affected customers within seventy-two hours of confirmed impact.",
        ],
      },
      {
        id: "vulnerability",
        title: "Vulnerability management",
        paragraphs: [
          "Container images and dependencies are scanned on every commit. Secrets are scanned across all repositories. Penetration testing is performed at least annually by an independent firm. A formal bug-bounty program will open once the product matures sufficiently to support it.",
          "Found a vulnerability? security@staffbix.com. We respond within one business day and credit the reporter on the public security page when permitted.",
        ],
      },
      {
        id: "compliance",
        title: "Compliance posture",
        paragraphs: [
          "Staffbix is designed from the start to meet the requirements of the GDPR and equivalent regimes in Türkiye and the United Kingdom. Data subject access, portability, and deletion are first-class product features. SOC 2 Type II is in progress; HIPAA and ISO 27001 readiness is evaluated for relevant verticals on Enterprise.",
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Güvenlik — Staffbix",
      description: "Staffbix’in verini nasıl koruduğu, tenant’ları nasıl izole ettiği ve güvenli çalıştığı.",
      keywords: [
        "Staffbix security",
        "AI workforce security",
        "SOC 2 AI platform",
        "data encryption Staffbix",
        "tenant isolation AI",
        "Staffbix vulnerability disclosure",
      ],
    },
    eyebrow: "Legal · Güvenlik",
    title: "Staffbix’te güvenlik.",
    effective: "1 Mayıs 2026",
    intro: "Güvenlik bir kutucuk değil, ürün özelliğidir. Bu sayfa tenant’ları nasıl izole ettiğimizi, veriyi nasıl şifrelediğimizi, olayları nasıl izlediğimizi ve bir şey ters gittiğinde nasıl yanıt verdiğimizi açıklar.",
    contactLine: "Güvenlik açığını security@staffbix.com adresine bildir · 1 iş günü içinde yanıt",
    sections: [
      {
        id: "tenant-isolation",
        title: "Tenant izolasyonu",
        paragraphs: [
          "Her müşterinin verisi veritabanı satır seviyesinde ve vektör indeks seviyesinde izole edilir. Uygulama servisleri her sorgu ve değişikliği aktif tenant ile kapsamlar. Nesne depolama tenant bazlı prefix’ler ve politika zorlamalı erişim kullanır. Tenant’lar arası erişim tasarım gereği imkânsızdır ve her değişiklikte yetkisiz erişim desenlerini çalıştıran otomatik testlerle doğrulanır.",
        ],
      },
      {
        id: "encryption",
        title: "Şifreleme",
        paragraphs: [
          "Aktarım halindeki veri her yüzeyde güncel TLS standartlarıyla korunur. Durağan veri depolama ve veritabanı sağlayıcılarımız tarafından şifrelenir. Hassas alanlar ayrıca uygulama katmanında şifrelenir. Yedekler kaynak sistemden ayrılmadan önce şifrelenir. Şifreleme anahtarları rotasyon politikaları olan ayrı bir anahtar yönetim servisiyle yönetilir.",
        ],
      },
      {
        id: "auth",
        title: "Kimlik doğrulama",
        paragraphs: [
          "Şifreler her kimlik bilgisi için ayrı salt ile memory-hard hashing algoritması kullanılarak saklanır. Web girişinde her oturumda e-posta tabanlı tek kullanımlık şifre gerekir. Mobil oturumlar cihazın güvenli anahtar deposunda saklanan refresh ve access token çifti kullanır. On beş dakikada beş başarısız deneme geçici kilit başlatır.",
          "Staffbix personelinin production erişimi zorunlu iki faktörlü kimlik doğrulama gerektirir, atıfla loglanır ve üç ayda bir incelenir.",
        ],
      },
      {
        id: "ai-safety",
        title: "AI’ye özel savunmalar",
        paragraphs: [
          "Prompt injection azaltma hem giriş hem çıkış yollarına uygulanır. Tool çağrıları allowlist’e göre doğrulanır. Harcama limitleri AI seviyesinde değil platform katmanında uygulanır; bu yüzden kötü davranan bir prompt yapılandırılmış limitlerini aşamaz. Çıkış içeriğinde PII sızıntı tespiti çalışır. Anomali tespiti çalışanın temel davranışından sapan hareketleri işaretler.",
        ],
      },
      {
        id: "network",
        title: "Ağ ve altyapı",
        paragraphs: [
          "Edge, yönetilen kural setleri, DDoS azaltma, bot tespiti ve IP ile hesap bazlı rate limiting içeren yönetilen web application firewall ile korunur. İç servisler birbirini doğrular; ağ segmentasyonu internal-only servislere doğrudan girişi engeller. Auto-scaling ve sıfır kesintili sürümlerle yönetilen container platformlarında çalışırız.",
        ],
      },
      {
        id: "audit",
        title: "Audit, izleme ve yanıt",
        paragraphs: [
          "Her idari işlem ve dış durumu değiştiren her AI işlemi zaman damgası, aktör, işlem detayları ve sonuçla kaydedilir. Loglar merkezileştirilmiş, aranabilir ve uyumluluk gereksinimlerine göre saklanır. Hata oranı, gecikme sapmaları ve maliyet sıçramaları on-call rotasyonlarıyla izlenir.",
          "Güvenlik olayları doğrulanmış etki sonrası yetmiş iki saat içinde public status sayfasında ve etkilenen müşterilere açıklanır.",
        ],
      },
      {
        id: "vulnerability",
        title: "Zafiyet yönetimi",
        paragraphs: [
          "Container imajları ve bağımlılıklar her commit’te taranır. Secret taraması tüm repolarda yapılır. Penetrasyon testi en az yılda bir bağımsız bir firma tarafından gerçekleştirilir. Formal bug bounty programı ürün bunu destekleyecek olgunluğa geldiğinde açılacaktır.",
          "Zafiyet mi buldun? security@staffbix.com. Bir iş günü içinde yanıt veririz ve izin verildiğinde araştırmacıya public güvenlik sayfasında kredi veririz.",
        ],
      },
      {
        id: "compliance",
        title: "Uyumluluk duruşu",
        paragraphs: [
          "Staffbix en baştan GDPR ve Türkiye ile Birleşik Krallık’taki eşdeğer rejimlerin gereksinimlerini karşılamak üzere tasarlanır. Veri sahibi erişimi, taşınabilirlik ve silme birinci sınıf ürün özellikleridir. SOC 2 Type II süreçtedir; HIPAA ve ISO 27001 hazırlığı Enterprise’daki ilgili dikeyler için değerlendirilir.",
        ],
      },
    ],
  },
} as const;

const legalCookies = {
  en: {
    metadata: {
      title: "Cookies — Staffbix",
      description: "Which cookies Staffbix uses, what they do, and how to control them.",
      keywords: [
        "Staffbix cookies",
        "cookie policy AI workforce",
        "Staffbix tracking",
        "cookie consent Staffbix",
        "Staffbix cookie notice",
      ],
    },
    eyebrow: "Legal · Cookies",
    title: "Cookie Notice.",
    effective: "May 1, 2026",
    intro: "A short list of cookies and what each one does. We default to the privacy-preserving choice; you can change it any time.",
    sections: [
      {
        id: "what-are-cookies",
        title: "What are cookies?",
        paragraphs: [
          "Cookies are small text files placed on your device by websites you visit. They allow a site to remember things between page loads or between visits. Similar technologies such as local storage, session storage, and pixels work in related ways. This notice covers all of them collectively as cookies.",
        ],
      },
      {
        id: "categories",
        title: "Categories we use",
        paragraphs: [
          "Staffbix uses three categories of cookies. We do not use advertising cookies on the marketing site, and we do not place cross-site tracking cookies inside the application.",
          "Strictly necessary: authentication, session management, and security tokens. Required for the Services to function. Cannot be disabled.",
          "Preferences: language, locale, and theme. Used to remember your choices between sessions.",
          "Analytics: aggregated, privacy-preserving metrics that help us understand product usage and marketing performance. Opt-out is offered on first visit.",
        ],
      },
      {
        id: "specific",
        title: "Specific cookies",
        paragraphs: [
          "The cookies we set, in plain language:",
          "sb_session · session token · 30 days · necessary",
          "sb_csrf · CSRF token · session · necessary",
          "sb_locale · UI language preference · 1 year · preferences",
          "sb_consent · your consent choices · 1 year · necessary",
          "sb_analytics · anonymised analytics ID · 90 days · analytics",
        ],
      },
      {
        id: "control",
        title: "How to control cookies",
        paragraphs: [
          "On first visit you can accept or decline analytics cookies. You can change your choice at any time from the in-product Privacy settings, or by clearing the sb_consent cookie. You can disable cookies entirely in your browser, but strictly necessary cookies are required for login and application functionality.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this notice",
        paragraphs: [
          "We update this notice when the cookies we use change. The effective date at the top reflects the latest version. We log a high-level change history at staffbix.com/legal/changelog.",
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Çerezler — Staffbix",
      description: "Staffbix’in hangi çerezleri kullandığı, ne yaptıkları ve nasıl kontrol edileceği.",
      keywords: [
        "Staffbix cookies",
        "cookie policy AI workforce",
        "Staffbix tracking",
        "cookie consent Staffbix",
        "Staffbix cookie notice",
      ],
    },
    eyebrow: "Legal · Çerezler",
    title: "Çerez Bildirimi.",
    effective: "1 Mayıs 2026",
    intro: "Kullandığımız çerezlerin ve her birinin ne yaptığının kısa listesi. Varsayılan olarak gizliliği koruyan seçimi kullanırız; istediğin zaman değiştirebilirsin.",
    sections: [
      {
        id: "what-are-cookies",
        title: "Çerez nedir?",
        paragraphs: [
          "Çerezler, ziyaret ettiğin web siteleri tarafından cihazına yerleştirilen küçük metin dosyalarıdır. Bir sitenin sayfa yüklemeleri veya ziyaretler arasında bazı şeyleri hatırlamasını sağlar. Local storage, session storage ve pixel gibi benzer teknolojiler de ilişkili biçimde çalışır. Bu bildirim hepsini topluca çerez olarak kapsar.",
        ],
      },
      {
        id: "categories",
        title: "Kullandığımız kategoriler",
        paragraphs: [
          "Staffbix üç çerez kategorisi kullanır. Pazarlama sitesinde reklam çerezi kullanmayız ve uygulama içinde cross-site tracking çerezi yerleştirmeyiz.",
          "Kesinlikle gerekli: kimlik doğrulama, oturum yönetimi ve güvenlik token’ları. Servislerin çalışması için gereklidir. Devre dışı bırakılamaz.",
          "Tercihler: dil, locale ve tema. Seçimlerini oturumlar arasında hatırlamak için kullanılır.",
          "Analitik: ürün kullanımı ve pazarlama performansını anlamamıza yardımcı olan toplu, gizliliği koruyan metrikler. İlk ziyarette opt-out sunulur.",
        ],
      },
      {
        id: "specific",
        title: "Belirli çerezler",
        paragraphs: [
          "Ayarladığımız çerezler, sade dille:",
          "sb_session · oturum token’ı · 30 gün · gerekli",
          "sb_csrf · CSRF token’ı · oturum · gerekli",
          "sb_locale · UI dil tercihi · 1 yıl · tercihler",
          "sb_consent · onay seçimlerin · 1 yıl · gerekli",
          "sb_analytics · anonim analitik ID · 90 gün · analitik",
        ],
      },
      {
        id: "control",
        title: "Çerezleri nasıl kontrol edersin",
        paragraphs: [
          "İlk ziyarette analitik çerezleri kabul edebilir veya reddedebilirsin. Seçimini uygulama içindeki Gizlilik ayarlarından ya da sb_consent çerezini temizleyerek istediğin zaman değiştirebilirsin. Tarayıcında çerezleri tamamen devre dışı bırakabilirsin; ancak giriş ve uygulama işlevleri için kesinlikle gerekli çerezler gerekir.",
        ],
      },
      {
        id: "changes",
        title: "Bu bildirimdeki değişiklikler",
        paragraphs: [
          "Kullandığımız çerezler değiştiğinde bu bildirimi güncelleriz. Üstteki yürürlük tarihi en güncel sürümü gösterir. Üst seviye değişiklik geçmişini staffbix.com/legal/changelog adresinde kaydederiz.",
        ],
      },
    ],
  },
} as const;

const legalDpa = {
  en: {
    metadata: {
      title: "Data Processing Agreement — Staffbix",
      description: "The DPA governing Staffbix processing of personal data on your behalf.",
      keywords: [
        "Staffbix DPA",
        "data processing agreement",
        "GDPR data processor AI",
        "Staffbix SCCs",
        "AI workforce DPA",
      ],
    },
    eyebrow: "Legal · DPA",
    title: "Data Processing Agreement.",
    effective: "May 1, 2026",
    intro: "This DPA describes how Staffbix processes personal data on your behalf when you use the Services. It is incorporated into the Terms of Service by reference and forms part of our binding agreement with you.",
    contactLine: "Counter-signed DPA needed? Email legal@staffbix.com · Standard SCCs available on request",
    sections: [
      {
        id: "roles",
        title: "Roles of the parties",
        paragraphs: [
          "Under this Data Processing Agreement, Customer is the data controller and Staffbix is the data processor. Staffbix processes personal data contained in Customer Data solely on the documented instructions of the Customer.",
        ],
      },
      {
        id: "subject-matter",
        title: "Subject matter and duration",
        paragraphs: [
          "The subject matter is the operation of the Services described in the Terms. The DPA applies for the duration of the agreement and for the period of Customer Data retention thereafter.",
        ],
      },
      {
        id: "categories",
        title: "Categories of data subjects and data",
        paragraphs: [
          "Data subjects: Customer’s end users and any natural persons whose personal data is included in Customer Data uploaded or generated within the Services.",
          "Categories of data: identifiers such as name and email, contact data, behavioural data tied to AI worker interactions, message content, and any additional categories you choose to include in your Brand Bible.",
        ],
      },
      {
        id: "subprocessors",
        title: "Sub-processors",
        paragraphs: [
          "We engage sub-processors to provide infrastructure, AI models, telephony, email, and observability. Each sub-processor is bound by data-protection terms equivalent to ours.",
          "A current list of sub-processors is maintained at staffbix.com/legal/subprocessors. New sub-processors are announced at least thirty days before they begin processing, allowing you to object. We will engage no new sub-processor that you have reasonably objected to.",
        ],
      },
      {
        id: "security-measures",
        title: "Technical and organisational measures",
        paragraphs: [
          "Staffbix maintains the technical and organisational measures described in the Security page. These measures form part of this DPA and may be updated to keep pace with evolving threats, provided the overall protection is not degraded.",
        ],
      },
      {
        id: "transfers",
        title: "International transfers",
        paragraphs: [
          "Where Customer Data is transferred from the EEA, the United Kingdom, or Türkiye to a country outside the region, Staffbix relies on Standard Contractual Clauses, Binding Corporate Rules of its sub-processors, or other lawful transfer mechanisms.",
        ],
      },
      {
        id: "breach",
        title: "Personal data breach",
        paragraphs: [
          "Staffbix notifies the Customer of a confirmed personal data breach affecting Customer Data without undue delay and in any event within seventy-two hours of confirmation. The notification includes the nature of the breach, the categories and approximate number of data subjects, the likely consequences, and the mitigation measures taken or proposed.",
        ],
      },
      {
        id: "audits",
        title: "Audits",
        paragraphs: [
          "Staffbix makes available SOC 2 reports and penetration-test summaries under NDA. Customer may, no more than once per twelve months and with thirty days’ written notice, request additional information necessary to demonstrate compliance with this DPA.",
        ],
      },
      {
        id: "deletion",
        title: "Return and deletion",
        paragraphs: [
          "On termination, Customer may export Customer Data for thirty days. Thereafter, Customer Data is irreversibly deleted from active systems within sixty days and removed from backups on the standard backup-rotation cycle.",
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Veri İşleme Sözleşmesi — Staffbix",
      description: "Staffbix’in senin adına kişisel veri işlemesini yöneten DPA.",
      keywords: [
        "Staffbix DPA",
        "data processing agreement",
        "GDPR data processor AI",
        "Staffbix SCCs",
        "AI workforce DPA",
      ],
    },
    eyebrow: "Legal · DPA",
    title: "Veri İşleme Sözleşmesi.",
    effective: "1 Mayıs 2026",
    intro: "Bu DPA, Servisleri kullandığında Staffbix’in senin adına kişisel verileri nasıl işlediğini açıklar. Hizmet Şartları’na atıf yoluyla dahil edilir ve seninle bağlayıcı anlaşmamızın parçasını oluşturur.",
    contactLine: "Karşı imzalı DPA mı gerekiyor? legal@staffbix.com adresine yaz · Standart SCC’ler talep üzerine sağlanır",
    sections: [
      {
        id: "roles",
        title: "Tarafların rolleri",
        paragraphs: [
          "Bu Veri İşleme Sözleşmesi kapsamında Müşteri veri sorumlusu, Staffbix veri işleyendir. Staffbix, Customer Data içindeki kişisel verileri yalnızca Müşteri’nin belgelenmiş talimatları doğrultusunda işler.",
        ],
      },
      {
        id: "subject-matter",
        title: "Konu ve süre",
        paragraphs: [
          "Konu, Şartlar’da açıklanan Servislerin işletilmesidir. DPA anlaşma süresince ve sonrasındaki Customer Data saklama dönemi boyunca geçerlidir.",
        ],
      },
      {
        id: "categories",
        title: "Veri sahibi ve veri kategorileri",
        paragraphs: [
          "Veri sahipleri: Müşteri’nin son kullanıcıları ve Servisler içinde yüklenen ya da üretilen Customer Data’ya dahil edilen kişisel verilerin ait olduğu tüm gerçek kişiler.",
          "Veri kategorileri: ad ve e-posta gibi tanımlayıcılar, iletişim verileri, AI çalışan etkileşimlerine bağlı davranış verileri, mesaj içerikleri ve Marka Kitabı’na dahil etmeyi seçtiğin ek kategoriler.",
        ],
      },
      {
        id: "subprocessors",
        title: "Alt işleyenler",
        paragraphs: [
          "Altyapı, AI modelleri, telefon, e-posta ve gözlemlenebilirlik sağlamak için alt işleyenlerle çalışırız. Her alt işleyen bizimkine eşdeğer veri koruma şartlarına bağlıdır.",
          "Güncel alt işleyen listesi staffbix.com/legal/subprocessors adresinde tutulur. Yeni alt işleyenler işlemeye başlamadan en az otuz gün önce duyurulur; böylece itiraz edebilirsin. Makul biçimde itiraz ettiğin yeni bir alt işleyeni devreye almayız.",
        ],
      },
      {
        id: "security-measures",
        title: "Teknik ve organizasyonel önlemler",
        paragraphs: [
          "Staffbix, Güvenlik sayfasında açıklanan teknik ve organizasyonel önlemleri sürdürür. Bu önlemler bu DPA’nın parçasıdır ve genel koruma seviyesi düşürülmeden gelişen tehditlere ayak uydurmak için güncellenebilir.",
        ],
      },
      {
        id: "transfers",
        title: "Uluslararası aktarımlar",
        paragraphs: [
          "Customer Data AEA, Birleşik Krallık veya Türkiye’den bölge dışındaki bir ülkeye aktarıldığında Staffbix Standart Sözleşme Maddeleri’ne, alt işleyenlerinin Bağlayıcı Şirket Kuralları’na veya diğer hukuka uygun aktarım mekanizmalarına dayanır.",
        ],
      },
      {
        id: "breach",
        title: "Kişisel veri ihlali",
        paragraphs: [
          "Staffbix, Customer Data’yı etkileyen doğrulanmış kişisel veri ihlalini Müşteri’ye gecikmeksizin ve her durumda doğrulamadan itibaren yetmiş iki saat içinde bildirir. Bildirim ihlalin niteliğini, veri sahibi kategorilerini ve yaklaşık sayısını, olası sonuçları ve alınan ya da önerilen azaltma önlemlerini içerir.",
        ],
      },
      {
        id: "audits",
        title: "Denetimler",
        paragraphs: [
          "Staffbix SOC 2 raporlarını ve penetrasyon testi özetlerini NDA altında sağlar. Müşteri, on iki ayda en fazla bir kez ve otuz gün yazılı bildirimle bu DPA’ya uyumu göstermek için gerekli ek bilgileri talep edebilir.",
        ],
      },
      {
        id: "deletion",
        title: "İade ve silme",
        paragraphs: [
          "Fesihte Müşteri Customer Data’yı otuz gün boyunca dışa aktarabilir. Sonrasında Customer Data aktif sistemlerden altmış gün içinde geri döndürülemez biçimde silinir ve standart yedek rotasyonu döngüsünde yedeklerden kaldırılır.",
        ],
      },
    ],
  },
} as const;

const legalPrivacy = {
  en: {
    metadata: {
      title: "Privacy — Staffbix",
      description: "How Staffbix collects, uses, and protects your data.",
      keywords: [
        "Staffbix privacy policy",
        "data protection AI workforce",
        "GDPR Staffbix",
        "Staffbix privacy notice",
        "AI privacy dashboard",
      ],
    },
    eyebrow: "Legal · Privacy",
    title: "Privacy Notice.",
    effective: "May 1, 2026",
    intro: "We collect the minimum information we need to operate the Services, we explain why we have it, and we let you take it back when you ask. This page is the long version; the short version is on the in-product Privacy dashboard.",
    contactLine: "Privacy questions? Email privacy@staffbix.com · Data subject requests are answered within 30 days.",
    sections: [
      {
        id: "scope",
        title: "Scope and definitions",
        paragraphs: [
          "This Privacy Notice describes how AtaForge Inc., Staffbix, we, and us collect, use, and disclose information when you access our website, application, mobile app, or public API, together called the Services.",
          "Customer Data means information that you or your end users provide through the Services, including the contents of your Brand Bible, conversations, integrations, and uploaded files. You are the controller of Customer Data; Staffbix processes it on your instructions per our Data Processing Agreement.",
        ],
      },
      {
        id: "what-we-collect",
        title: "Information we collect",
        paragraphs: [
          "We collect information in three categories.",
          "Account information: name, email, company, password stored using a memory-hard hashing algorithm, and billing details. Collected when you sign up or update your account.",
          "Customer Data: the content you choose to upload, integrate, or generate within the Services. We do not read or sell this data.",
          "Service metadata: device, browser, IP, page views, and approximate location used for security, abuse prevention, and product analytics.",
        ],
      },
      {
        id: "how-we-use",
        title: "How we use information",
        paragraphs: [
          "We use information to provide, secure, and improve the Services. We do not sell personal information, and we do not train foundation models on Customer Data.",
          "We use information to provision and operate the Services you request.",
          "We use information to authenticate users, detect abuse, enforce limits, and meet legal obligations.",
          "We use information to send transactional and operational email; you can opt out of non-critical email.",
          "We use information to improve product quality through aggregated, de-identified analytics.",
          "We use information to comply with applicable law and respond to lawful requests.",
        ],
      },
      {
        id: "sharing",
        title: "How we share information",
        paragraphs: [
          "We share information only with sub-processors that act on our instructions and are bound by data-protection terms equivalent to ours. A current list of sub-processors is maintained at staffbix.com/legal/subprocessors.",
          "We may disclose information when required by law, subpoena, or court order, after a documented review. We notify affected customers where legally permitted.",
        ],
      },
      {
        id: "retention",
        title: "Retention and deletion",
        paragraphs: [
          "We retain Customer Data while your account is active and for thirty days after termination to support a reactivation flow. After that, Customer Data is irreversibly deleted from active systems within sixty days and removed from backups on the standard backup-rotation cycle.",
          "Account metadata and audit logs are retained for the duration required by tax, regulatory, and security obligations.",
        ],
      },
      {
        id: "your-rights",
        title: "Your rights",
        paragraphs: [
          "Subject to applicable law, you have the right to access, correct, port, and delete your personal information. You can exercise most rights directly from the application’s Privacy Settings, or by emailing privacy@staffbix.com. We respond within thirty days.",
          "If you are in the European Economic Area, the United Kingdom, or Türkiye, you have the right to lodge a complaint with your local supervisory authority.",
        ],
      },
      {
        id: "transfers",
        title: "International transfers",
        paragraphs: [
          "Staffbix operates from the European Union and Türkiye. Where Customer Data is transferred outside the region of collection, we rely on Standard Contractual Clauses, Binding Corporate Rules of our sub-processors, or other lawful transfer mechanisms.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this notice",
        paragraphs: [
          "We update this notice from time to time. Material changes are announced at least thirty days before they take effect, via email to the account owner and an in-product banner. The current version and its effective date are shown at the top of this page.",
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Gizlilik — Staffbix",
      description: "Staffbix’in verini nasıl topladığı, kullandığı ve koruduğu.",
      keywords: [
        "Staffbix privacy policy",
        "data protection AI workforce",
        "GDPR Staffbix",
        "Staffbix privacy notice",
        "AI privacy dashboard",
      ],
    },
    eyebrow: "Legal · Gizlilik",
    title: "Gizlilik Bildirimi.",
    effective: "1 Mayıs 2026",
    intro: "Servisleri işletmek için ihtiyaç duyduğumuz minimum bilgiyi toplarız, neden sahip olduğumuzu açıklarız ve istediğinde geri almanı sağlarız. Bu sayfa uzun sürümdür; kısa sürüm ürün içindeki Gizlilik panosundadır.",
    contactLine: "Gizlilik soruları için privacy@staffbix.com adresine yaz · Veri sahibi talepleri 30 gün içinde yanıtlanır.",
    sections: [
      {
        id: "scope",
        title: "Kapsam ve tanımlar",
        paragraphs: [
          "Bu Gizlilik Bildirimi, AtaForge Inc., Staffbix, biz ve bize ait servislerin web sitesi, uygulama, mobil uygulama veya public API erişiminde bilgileri nasıl topladığını, kullandığını ve açıkladığını tarif eder. Bunların tamamı Servisler olarak anılır.",
          "Customer Data, senin veya son kullanıcılarının Servisler üzerinden sağladığı bilgileri ifade eder; Marka Kitabı içeriği, konuşmalar, entegrasyonlar ve yüklenen dosyalar buna dahildir. Customer Data’nın veri sorumlusu sensin; Staffbix bunu Veri İşleme Sözleşmemize göre talimatların doğrultusunda işler.",
        ],
      },
      {
        id: "what-we-collect",
        title: "Topladığımız bilgiler",
        paragraphs: [
          "Bilgileri üç kategoride toplarız.",
          "Hesap bilgileri: ad, e-posta, şirket, memory-hard hashing algoritmasıyla saklanan şifre ve fatura bilgileri. Kayıt olduğunda veya hesabını güncellediğinde toplanır.",
          "Customer Data: Servisler içinde yüklemeyi, entegre etmeyi veya üretmeyi seçtiğin içerik. Bu veriyi okumayız veya satmayız.",
          "Servis metadatası: güvenlik, kötüye kullanım önleme ve ürün analitiği için kullanılan cihaz, tarayıcı, IP, sayfa görüntülemeleri ve yaklaşık konum.",
        ],
      },
      {
        id: "how-we-use",
        title: "Bilgileri nasıl kullanırız",
        paragraphs: [
          "Bilgileri Servisleri sağlamak, güvenceye almak ve iyileştirmek için kullanırız. Kişisel bilgileri satmayız ve Customer Data üzerinde foundation model eğitmeyiz.",
          "Talep ettiğin Servisleri sağlamak ve işletmek için kullanırız.",
          "Kullanıcıları doğrulamak, kötüye kullanımı tespit etmek, limitleri uygulamak ve yasal yükümlülükleri karşılamak için kullanırız.",
          "İşlemsel ve operasyonel e-posta göndermek için kullanırız; kritik olmayan e-postalardan çıkabilirsin.",
          "Toplu, kimliksizleştirilmiş analitikle ürün kalitesini iyileştirmek için kullanırız.",
          "Geçerli hukuka uymak ve hukuka uygun taleplere yanıt vermek için kullanırız.",
        ],
      },
      {
        id: "sharing",
        title: "Bilgileri nasıl paylaşırız",
        paragraphs: [
          "Bilgileri yalnızca talimatlarımızla hareket eden ve bizimkine eşdeğer veri koruma şartlarına bağlı alt işleyenlerle paylaşırız. Güncel alt işleyen listesi staffbix.com/legal/subprocessors adresinde tutulur.",
          "Kanun, mahkeme celbi veya mahkeme kararı gerektirdiğinde, belgelenmiş inceleme sonrası bilgileri açıklayabiliriz. Hukuken izin verildiğinde etkilenen müşterileri bilgilendiririz.",
        ],
      },
      {
        id: "retention",
        title: "Saklama ve silme",
        paragraphs: [
          "Customer Data’yı hesabın aktif olduğu süre boyunca ve yeniden etkinleştirme akışını desteklemek için fesih sonrası otuz gün saklarız. Sonrasında Customer Data aktif sistemlerden altmış gün içinde geri döndürülemez biçimde silinir ve standart yedek rotasyonu döngüsünde yedeklerden kaldırılır.",
          "Hesap metadatası ve audit logları vergi, düzenleyici ve güvenlik yükümlülüklerinin gerektirdiği süre boyunca saklanır.",
        ],
      },
      {
        id: "your-rights",
        title: "Hakların",
        paragraphs: [
          "Geçerli hukuka tabi olarak kişisel bilgilerine erişme, düzeltme, taşıma ve silme hakkın vardır. Çoğu hakkı doğrudan uygulamanın Gizlilik Ayarları’ndan veya privacy@staffbix.com adresine yazarak kullanabilirsin. Otuz gün içinde yanıt veririz.",
          "Avrupa Ekonomik Alanı, Birleşik Krallık veya Türkiye’deysen yerel denetim otoritene şikâyette bulunma hakkın vardır.",
        ],
      },
      {
        id: "transfers",
        title: "Uluslararası aktarımlar",
        paragraphs: [
          "Staffbix Avrupa Birliği ve Türkiye’den çalışır. Customer Data toplandığı bölgenin dışına aktarıldığında Standart Sözleşme Maddeleri’ne, alt işleyenlerimizin Bağlayıcı Şirket Kuralları’na veya diğer hukuka uygun aktarım mekanizmalarına dayanırız.",
        ],
      },
      {
        id: "changes",
        title: "Bu bildirimdeki değişiklikler",
        paragraphs: [
          "Bu bildirimi zaman zaman güncelleriz. Önemli değişiklikler yürürlüğe girmeden en az otuz gün önce hesap sahibine e-posta ve ürün içi banner ile duyurulur. Mevcut sürüm ve yürürlük tarihi bu sayfanın üstünde gösterilir.",
        ],
      },
    ],
  },
} as const;

const legalTerms = {
  en: {
    metadata: {
      title: "Terms — Staffbix",
      description: "Terms of service governing use of Staffbix.",
      keywords: [
        "Staffbix terms of service",
        "AI workforce terms",
        "Staffbix MSA",
        "Staffbix terms",
        "Staffbix legal agreement",
      ],
    },
    eyebrow: "Legal · Terms",
    title: "Terms of Service.",
    effective: "May 1, 2026",
    intro: "The agreement between you and Staffbix. Plain language, finite paragraphs, no hidden clauses. If anything is unclear, write to us — we will say so plainly.",
    sections: [
      {
        id: "acceptance",
        title: "Acceptance and parties",
        paragraphs: [
          "These Terms of Service form a binding agreement between AtaForge Inc., Staffbix, and the person or entity that subscribes to the Services, called Customer. By creating an account or using the Services, you accept these Terms.",
          "If you use the Services on behalf of an organization, you represent that you have authority to bind that organization, and you and Customer refer to that organization.",
        ],
      },
      {
        id: "subscription",
        title: "Subscription and trial",
        paragraphs: [
          "Paid plans renew automatically at the end of each billing cycle until cancelled. The trial lasts three days, requires no payment method, and converts to a paid plan only with your explicit action. You can cancel anytime through the customer portal; the subscription ends at the close of the current cycle.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        paragraphs: [
          "You agree not to use the Services to send unsolicited messages or spam.",
          "You agree not to impersonate any person, organization, or government body.",
          "You agree not to configure AI workers to violate the policies of integrated platforms, notably WhatsApp, Meta, Google, and marketplace APIs.",
          "You agree not to bypass quotas, rate limits, or security mechanisms.",
          "You agree not to use the Services to provide regulated services such as medical, legal, or financial advice without appropriate licensure and disclaimers.",
          "We may suspend access to the Services upon material breach, with notice when feasible. Repeated or egregious breaches may terminate the agreement without refund of pre-paid fees.",
        ],
      },
      {
        id: "ownership",
        title: "Ownership of content",
        paragraphs: [
          "You retain all rights in Customer Data and content generated by AI workers on your behalf. We retain all rights in the Services, including the Brand Bible engine, orchestrator, approval engine, and prompt library. Nothing in these Terms transfers ownership of our intellectual property to you, or yours to us.",
        ],
      },
      {
        id: "warranties",
        title: "Warranties and disclaimers",
        paragraphs: [
          "We will provide the Services with reasonable skill and care, in accordance with our published service-level commitments. Beyond this, the Services are provided as is. We do not warrant that the Services will be uninterrupted, error-free, or that AI-generated output will be fit for any particular purpose.",
          "AI workers can make mistakes. You are responsible for the limits, approval modes, and review thresholds you configure. We provide conservative defaults; you choose how far to loosen them.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages. Our aggregate liability for any claim arising under these Terms is limited to the fees paid by you in the twelve months preceding the event giving rise to the claim.",
        ],
      },
      {
        id: "law",
        title: "Governing law and disputes",
        paragraphs: [
          "These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws principles. Disputes that cannot be resolved informally within sixty days shall be submitted to binding arbitration administered by JAMS under its Streamlined Arbitration Rules.",
        ],
      },
      {
        id: "changes",
        title: "Changes to these Terms",
        paragraphs: [
          "We may update these Terms from time to time. Material changes are announced at least thirty days in advance via email to the account owner and an in-product banner. Continued use of the Services after the effective date constitutes acceptance.",
        ],
      },
    ],
  },
  tr: {
    metadata: {
      title: "Şartlar — Staffbix",
      description: "Staffbix kullanımını yöneten hizmet şartları.",
      keywords: [
        "Staffbix terms of service",
        "AI workforce terms",
        "Staffbix MSA",
        "Staffbix terms",
        "Staffbix legal agreement",
      ],
    },
    eyebrow: "Legal · Şartlar",
    title: "Hizmet Şartları.",
    effective: "1 Mayıs 2026",
    intro: "Seninle Staffbix arasındaki anlaşma. Sade dil, sınırlı paragraflar, gizli madde yok. Bir şey net değilse bize yaz; açıkça yanıtlarız.",
    sections: [
      {
        id: "acceptance",
        title: "Kabul ve taraflar",
        paragraphs: [
          "Bu Hizmet Şartları, AtaForge Inc., Staffbix ve Servislere abone olan kişi veya kurum, yani Müşteri, arasında bağlayıcı bir anlaşma oluşturur. Hesap oluşturarak veya Servisleri kullanarak bu Şartları kabul edersin.",
          "Servisleri bir kuruluş adına kullanıyorsan o kuruluşu bağlama yetkin olduğunu beyan edersin; sen ve Müşteri ifadeleri o kuruluşu ifade eder.",
        ],
      },
      {
        id: "subscription",
        title: "Abonelik ve deneme",
        paragraphs: [
          "Ücretli planlar iptal edilene kadar her fatura döngüsü sonunda otomatik yenilenir. Deneme üç gün sürer, ödeme yöntemi gerektirmez ve yalnızca açık işleminle ücretli plana dönüşür. Müşteri portalından istediğin zaman iptal edebilirsin; abonelik mevcut döngünün sonunda biter.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Kabul edilebilir kullanım",
        paragraphs: [
          "Servisleri istenmeyen mesaj veya spam göndermek için kullanmamayı kabul edersin.",
          "Herhangi bir kişi, kuruluş veya kamu kurumu gibi davranmamayı kabul edersin.",
          "AI çalışanları WhatsApp, Meta, Google ve pazaryeri API’leri dahil entegre platformların politikalarını ihlal edecek şekilde yapılandırmamayı kabul edersin.",
          "Kota, rate limit veya güvenlik mekanizmalarını aşmamayı kabul edersin.",
          "Uygun lisans ve açıklamalar olmadan tıbbi, hukuki veya finansal tavsiye gibi düzenlenmiş hizmetler sunmak için Servisleri kullanmamayı kabul edersin.",
          "Esaslı ihlal durumunda, mümkün olduğunda bildirimle, Servislere erişimi askıya alabiliriz. Tekrarlanan veya ağır ihlaller anlaşmayı peşin ödenmiş ücret iadesi olmadan sonlandırabilir.",
        ],
      },
      {
        id: "ownership",
        title: "İçerik sahipliği",
        paragraphs: [
          "Customer Data ve senin adına AI çalışanların ürettiği içerik üzerindeki tüm haklar sende kalır. Marka Kitabı motoru, orkestratör, onay motoru ve prompt kütüphanesi dahil Servislerdeki tüm haklar bizde kalır. Bu Şartlar bizim fikri mülkiyetimizi sana veya seninkini bize devretmez.",
        ],
      },
      {
        id: "warranties",
        title: "Garantiler ve feragatler",
        paragraphs: [
          "Servisleri yayımlanmış hizmet seviyesi taahhütlerimize uygun olarak makul beceri ve özenle sunarız. Bunun ötesinde Servisler olduğu gibi sağlanır. Servislerin kesintisiz, hatasız veya AI tarafından üretilen çıktının belirli bir amaca uygun olacağını garanti etmeyiz.",
          "AI çalışanlar hata yapabilir. Yapılandırdığın limitlerden, onay modlarından ve inceleme eşiklerinden sen sorumlusun. Biz temkinli varsayılanlar sağlarız; ne kadar gevşeteceğini sen seçersin.",
        ],
      },
      {
        id: "liability",
        title: "Sorumluluğun sınırı",
        paragraphs: [
          "Hukukun izin verdiği en geniş ölçüde hiçbir taraf dolaylı, tesadüfi, özel, sonuçsal veya cezai zararlardan sorumlu değildir. Bu Şartlar kapsamındaki herhangi bir talep için toplam sorumluluğumuz, talebe yol açan olaydan önceki on iki ayda ödediğin ücretlerle sınırlıdır.",
        ],
      },
      {
        id: "law",
        title: "Geçerli hukuk ve uyuşmazlıklar",
        paragraphs: [
          "Bu Şartlar, kanunlar ihtilafı ilkeleri dikkate alınmaksızın Amerika Birleşik Devletleri Delaware Eyaleti yasalarına tabidir. Altmış gün içinde gayriresmi olarak çözülemeyen uyuşmazlıklar JAMS tarafından Streamlined Arbitration Rules kapsamında yürütülen bağlayıcı tahkime sunulur.",
        ],
      },
      {
        id: "changes",
        title: "Bu Şartlardaki değişiklikler",
        paragraphs: [
          "Bu Şartları zaman zaman güncelleyebiliriz. Önemli değişiklikler hesap sahibine e-posta ve ürün içi banner ile en az otuz gün önceden duyurulur. Yürürlük tarihinden sonra Servisleri kullanmaya devam etmek kabul anlamına gelir.",
        ],
      },
    ],
  },
} as const;

const appIntegrations = {
  en: {
    title: "Integrations",
    description: "External platforms your workforce can read from and act on.",
    connected: "connected",
    social: {
      title: "Social publishing",
      description:
        "Connect an account so approved social posts publish for real. OAuth — we never see your password.",
      connectX: "Connect X",
      connectLinkedIn: "Connect LinkedIn",
      reconnect: "Reconnect",
      connectedAs: "Connected",
      connectedBanner: "Account connected. Approved posts will now publish.",
      errorBanner: "Couldn't connect the account. Please try again.",
      errorUnconfigured:
        "This provider isn't configured on the server yet. Ask an admin to set the OAuth credentials.",
    },
    categories: {
      all: "All",
      channels: "Channels",
      ecommerce: "E-commerce",
      calendarStorage: "Calendar & Storage",
      finance: "Finance",
      analytics: "Analytics",
    },
    status: {
      connected: "Connected",
      available: "Available",
      actionRequired: "Action required",
      notConnected: "Not connected",
    },
    actions: {
      disconnect: "Disconnect",
      fixAccess: "Fix access",
      connect: "Connect",
    },
    modal: {
      titlePrefix: "Disconnect",
      titleSuffix: "?",
      bodyPrefix: "Workers using this integration will lose access immediately. The Brand Bible data sourced from",
      bodySuffix: "is retained for 30 days in case you reconnect.",
    },
  },
  tr: {
    title: "Entegrasyonlar",
    description: "İş gücünün okuyabileceği ve işlem yapabileceği dış platformlar.",
    connected: "bağlı",
    social: {
      title: "Sosyal yayın",
      description:
        "Bir hesap bağla; onaylanan sosyal gönderiler gerçekten yayınlansın. OAuth — şifreni asla görmeyiz.",
      connectX: "X'i bağla",
      connectLinkedIn: "LinkedIn'i bağla",
      reconnect: "Yeniden bağla",
      connectedAs: "Bağlı",
      connectedBanner: "Hesap bağlandı. Onaylanan gönderiler artık yayınlanacak.",
      errorBanner: "Hesap bağlanamadı. Lütfen tekrar dene.",
      errorUnconfigured:
        "Bu sağlayıcı sunucuda henüz yapılandırılmamış. Bir yöneticiden OAuth kimlik bilgilerini ayarlamasını iste.",
    },
    categories: {
      all: "Tümü",
      channels: "Kanallar",
      ecommerce: "E-ticaret",
      calendarStorage: "Takvim ve depolama",
      finance: "Finans",
      analytics: "Analitik",
    },
    status: {
      connected: "Bağlı",
      available: "Mevcut",
      actionRequired: "İşlem gerekli",
      notConnected: "Bağlı değil",
    },
    actions: {
      disconnect: "Bağlantıyı kes",
      fixAccess: "Erişimi düzelt",
      connect: "Bağla",
    },
    modal: {
      titlePrefix: "Bağlantıyı kes:",
      titleSuffix: "?",
      bodyPrefix: "Bu entegrasyonu kullanan çalışanlar erişimi hemen kaybeder. Şu kaynaktan gelen Marka Kitabı verisi:",
      bodySuffix: "yeniden bağlanman ihtimaline karşı 30 gün saklanır.",
    },
  },
} as const;

const appDashboard = {
  en: {
    title: "Good afternoon, Suleyman.",
    description:
      "Your AI workforce handled 412 messages and 28 approvals this week. 7 approvals are waiting for you.",
    actions: {
      hireWorker: "Hire worker",
      reviewApprovals: "Review 7 approvals",
    },
    briefing: {
      eyebrow: "Daily briefing · May 12, 06:00 CET",
      title:
        "While you slept, your workforce handled 318 messages, queued 7 approvals, and pushed 3 social posts. One worker hit its spend cap and paused itself — review below.",
      hotLeads: "hot leads captured",
      escalations: "escalations resolved",
      spend: "spent of $200 cap",
      read: "Read full briefing",
      separator: "·",
    },
    kpis: [
      { label: "Messages today", value: "412", delta: "+18% vs yesterday" },
      { label: "Approvals pending", value: "7", delta: "3 high priority" },
      { label: "Spend today", value: "$43", delta: "of $200 cap" },
      { label: "Voice match", value: "98%", delta: "across 6 roles" },
    ],
    trends: {
      title: "Messages · last 7 days",
      description: "Hover any day for the exact count. Sunday is today.",
      messages: "Messages",
      approvals: "Approvals",
      totalLabel: "7-day total",
      totalValue: "2,392 messages",
      weeklyLabel: "Weekly approvals",
      weeklyValue: "132 decided",
      messagesData: [
        { label: "Mon", value: 284 },
        { label: "Tue", value: 312 },
        { label: "Wed", value: 348 },
        { label: "Thu", value: 296 },
        { label: "Fri", value: 408 },
        { label: "Sat", value: 332 },
        { label: "Sun", value: 412 },
      ],
    },
    channels: {
      title: "Channels · today",
      description: "Where today's volume came from.",
      rows: [
        { displayName: "WhatsApp", count: 184, pct: 45 },
        { displayName: "Web chat", count: 126, pct: 31 },
        { displayName: "Email", count: 73, pct: 18 },
        { displayName: "Instagram", count: 29, pct: 7 },
      ],
    },
    activity: {
      title: "Activity · last 30 minutes",
      viewAll: "View all",
      statuses: {
        pending: "Pending",
        sent: "Sent",
        live: "Live",
      },
      rows: [
        {
          time: "14:23",
          worker: "Inbound Sales",
          action: 'Drafted "free returns" addition for thank-you sequence.',
          status: "pending",
        },
        {
          time: "14:21",
          worker: "Customer Support",
          action: "Replied to order #1843 (delivery question).",
          status: "sent",
        },
        {
          time: "14:18",
          worker: "Social Media",
          action: "Scheduled 3 posts for Instagram this week.",
          status: "pending",
        },
        {
          time: "14:05",
          worker: "SEO Specialist",
          action: "Published blog: 'Why solo founders skip CRMs'.",
          status: "live",
        },
        {
          time: "13:58",
          worker: "Email Marketer",
          action: "Sent welcome sequence to 18 new sign-ups.",
          status: "sent",
        },
      ],
    },
    workforce: {
      title: "Workforce · 10 hired",
      manage: "Manage",
      rows: [
        { initials: "CS", displayName: "Customer Support", load: 64 },
        { initials: "IS", displayName: "Inbound Sales", load: 41 },
        { initials: "SM", displayName: "Social Media", load: 27 },
        { initials: "SE", displayName: "SEO Specialist", load: 52 },
        { initials: "CW", displayName: "Content Writer", load: 18 },
        { initials: "BK", displayName: "Bookkeeping", load: 8 },
      ],
    },
    quickLinks: [
      {
        label: "Brand Bible · 87% complete",
        description: "Add missing FAQs and policies.",
        href: "/app/brand-bible",
      },
      {
        label: "Connect WhatsApp",
        description: "Plug the official Cloud API. ~5 min.",
        href: "/app/integrations",
      },
      {
        label: "This week's report",
        description: "Friday digest, recipients editable.",
        href: "/app/reports",
      },
    ],
  },
  tr: {
    title: "İyi öğleden sonralar, Alex.",
    description:
      "AI iş gücün bu hafta 412 mesajı ve 28 onayı yönetti. 7 onay seni bekliyor.",
    actions: {
      hireWorker: "Çalışan işe al",
      reviewApprovals: "7 onayı incele",
    },
    briefing: {
      eyebrow: "Günlük özet · 12 Mayıs, 06:00 CET",
      title:
        "Sen uyurken iş gücün 318 mesajı yönetti, 7 onayı kuyruğa aldı ve 3 sosyal gönderi yayınladı. Bir çalışan harcama sınırına ulaşıp kendini duraklattı — aşağıdan incele.",
      hotLeads: "sıcak potansiyel müşteri yakalandı",
      escalations: "eskalasyon çözüldü",
      spend: "$200 sınırından harcandı",
      read: "Tüm özeti oku",
      separator: "·",
    },
    kpis: [
      { label: "Bugünkü mesajlar", value: "412", delta: "Düne göre +18%" },
      { label: "Bekleyen onaylar", value: "7", delta: "3 yüksek öncelik" },
      { label: "Bugünkü harcama", value: "$43", delta: "$200 sınırından" },
      { label: "Ses uyumu", value: "98%", delta: "6 rol genelinde" },
    ],
    trends: {
      title: "Mesajlar · son 7 gün",
      description:
        "Kesin sayıyı görmek için herhangi bir günün üzerine gel. Pazar bugündür.",
      messages: "Mesajlar",
      approvals: "Onaylar",
      totalLabel: "7 günlük toplam",
      totalValue: "2.392 mesaj",
      weeklyLabel: "Haftalık onaylar",
      weeklyValue: "132 kararlandı",
      messagesData: [
        { label: "Pzt", value: 284 },
        { label: "Sal", value: 312 },
        { label: "Çar", value: 348 },
        { label: "Per", value: 296 },
        { label: "Cum", value: 408 },
        { label: "Cmt", value: 332 },
        { label: "Paz", value: 412 },
      ],
    },
    channels: {
      title: "Kanallar · bugün",
      description: "Bugünkü hacmin nereden geldiği.",
      rows: [
        { displayName: "WhatsApp", count: 184, pct: 45 },
        { displayName: "Web chat", count: 126, pct: 31 },
        { displayName: "E-posta", count: 73, pct: 18 },
        { displayName: "Instagram", count: 29, pct: 7 },
      ],
    },
    activity: {
      title: "Aktivite · son 30 dakika",
      viewAll: "Tümünü gör",
      statuses: {
        pending: "Bekliyor",
        sent: "Gönderildi",
        live: "Yayında",
      },
      rows: [
        {
          time: "14:23",
          worker: "Inbound Sales",
          action: 'Teşekkür akışı için "ücretsiz iade" eklemesi tasarladı.',
          status: "pending",
        },
        {
          time: "14:21",
          worker: "Customer Support",
          action: "#1843 siparişine yanıt verdi (teslimat sorusu).",
          status: "sent",
        },
        {
          time: "14:18",
          worker: "Social Media",
          action: "Bu hafta için 3 Instagram gönderisi planladı.",
          status: "pending",
        },
        {
          time: "14:05",
          worker: "SEO Specialist",
          action: "Blog yayınladı: 'Solo kurucular neden CRM atlar'.",
          status: "live",
        },
        {
          time: "13:58",
          worker: "Email Marketer",
          action: "18 yeni kayıt için karşılama akışını gönderdi.",
          status: "sent",
        },
      ],
    },
    workforce: {
      title: "İş gücü · 10 işe alındı",
      manage: "Yönet",
      rows: [
        { initials: "CS", displayName: "Customer Support", load: 64 },
        { initials: "IS", displayName: "Inbound Sales", load: 41 },
        { initials: "SM", displayName: "Social Media", load: 27 },
        { initials: "SE", displayName: "SEO Specialist", load: 52 },
        { initials: "CW", displayName: "Content Writer", load: 18 },
        { initials: "BK", displayName: "Bookkeeping", load: 8 },
      ],
    },
    quickLinks: [
      {
        label: "Marka Kitabı · %87 tamamlandı",
        description: "Eksik SSS ve politikaları ekle.",
        href: "/app/brand-bible",
      },
      {
        label: "WhatsApp bağla",
        description: "Resmi Cloud API'yi bağla. ~5 dk.",
        href: "/app/integrations",
      },
      {
        label: "Bu haftanın raporu",
        description: "Cuma özeti, alıcılar düzenlenebilir.",
        href: "/app/reports",
      },
    ],
  },
} as const;

const appBilling = {
  en: {
    numberLocale: "en-US",
    title: "Billing",
    description:
      "Plan, usage, invoices. Manage card and tax details from the customer portal.",
    compare: "Compare on marketing site",
    currency: "USD",
    currentPlan: "Current plan",
    changePlan: "Change plan",
    cancelPlan: "Cancel plan",
    discount: "−20%",
    switchToAnnual: "Switch to annual (−20%)",
    switchToMonthly: "Switch to monthly",
    cycles: {
      monthly: "Monthly",
      annual: "Annual",
      monthSuffix: "/ month",
      annualSuffix: "/ mo, billed annually",
    },
    payment: {
      title: "Payment method",
      cardBrand: "VISA",
      card: "Visa ending 6411",
      expires: "Expires 04 / 28",
      update: "Update card",
      change: "Change",
      nextCharge: "Next charge: Jun 1, 2026",
    },
    plansHeader: {
      eyebrow: "Plans",
      title: "Pick a plan, switch any time.",
      footnote: "All prices in USD · Tax handled automatically · Cancel any time",
      current: "Current",
      more: "more",
      currentCta: "Current plan",
      contactSales: "Contact sales",
    },
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$49",
        cadence: "per month",
        description: "Solo founder testing the water.",
        features: [
          "1 AI worker, your pick",
          "Web chat + email channels",
          "5,000 messages / month",
          "Brand Bible from one source",
          "Approval Center",
          "Daily briefing email",
        ],
        workerLimit: 1,
        cta: "Switch to Starter",
      },
      {
        id: "growth",
        name: "Growth",
        price: "$149",
        cadence: "per month",
        description: "Solo founder with active operations.",
        features: [
          "3 AI workers",
          "WhatsApp, Telegram, IG, FB, LinkedIn",
          "25,000 messages / month",
          "Brand Bible from up to 5 sources",
          "Social publishing + approvals",
          "SEO audit + content production",
          "Weekly executive summary",
        ],
        workerLimit: 3,
        cta: "Switch to Growth",
      },
      {
        id: "business",
        name: "Business",
        price: "$399",
        cadence: "per month",
        description: "Serious solo founders and small teams.",
        features: [
          "10 AI workers + Custom AI builder",
          "Voice channel (200 min included)",
          "100,000 messages / month",
          "Backlink AI (browser automation)",
          "Marketplace ops (Amazon, eBay, Etsy)",
          "Public API access",
          "Cross-AI orchestration",
          "Slack / Teams report delivery",
        ],
        workerLimit: 10,
        cta: "Current plan",
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Custom",
        cadence: "annual",
        description: "Compliance, scale, dedicated infrastructure.",
        features: [
          "Unlimited AI workers",
          "Dedicated infrastructure option",
          "SSO + advanced RBAC",
          "SOC 2 reports + signed DPA",
          "On-premise deployment option",
          "Named success manager",
          "99.99% uptime SLA",
          "Custom integrations",
        ],
        workerLimit: "unlimited",
        cta: "Contact sales",
      },
    ],
    usage: {
      title: "Usage · May 2026",
      description:
        "Updates in near-real-time. Overage pricing applies past your tier caps.",
      used: "used",
      rows: [
        { label: "Workers", current: 10, max: 10, unit: "" },
        { label: "Messages this month", current: 64200, max: 100000, unit: "" },
        { label: "Voice minutes", current: 142, max: 200, unit: "min" },
        { label: "API calls this month", current: 18420, max: 50000, unit: "" },
      ],
    },
    invoices: {
      title: "Invoices",
      description: "Last 12 months. Tax handled automatically via Stripe Tax.",
      downloadAll: "Download all CSV",
      headers: {
        invoice: "Invoice",
        date: "Date",
        amount: "Amount",
        status: "Status",
      },
      downloadPdf: "Download PDF",
      paid: "Paid",
      rows: [
        { id: "INV-2026-005", date: "May 1, 2026", amount: "$399.00" },
        { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$399.00" },
        { id: "INV-2026-003", date: "Mar 1, 2026", amount: "$399.00" },
        { id: "INV-2026-002", date: "Feb 1, 2026", amount: "$149.00" },
        { id: "INV-2026-001", date: "Jan 14, 2026", amount: "$49.00" },
      ],
    },
    purchase: {
      close: "Close",
      upgrade: "Upgrade",
      switchPlan: "Switch plan",
      newPlan: "New plan",
      workerLimit: "Worker limit",
      unlimited: "Unlimited",
      upToWorkersPrefix: "Up to",
      upToWorkersSuffix: "workers",
      billingCycle: "Billing cycle",
      price: "Price",
      effective: "Effective",
      immediately: "Immediately",
      endOfCycle: "End of current cycle",
      todaysCharge: "Today's charge",
      prorated: "prorated",
      noCharge: "$0.00",
      upgradeNotice:
        "Your card will be charged immediately for the prorated difference. New features unlock right after payment.",
      switchNotice:
        "No charge today. Plan switches at the end of your current cycle. Prorated credit applied if downgrade.",
      cancel: "Cancel",
      confirmSwitch: "Confirm switch",
      confirmAndPay: "Confirm and pay",
    },
    cancel: {
      title: "Cancel your Staffbix subscription?",
      confirm: "Yes, cancel",
      bodyBeforeDate: "Your subscription will remain active until",
      bodyDate: "May 31, 2026",
      bodyAfterDate:
        "You won't be charged again. After that, all AI workers stop responding and your Brand Bible is retained for 30 days in case you come back.",
      exportNotice: "You can export everything before then from settings.",
    },
  },
  tr: {
    numberLocale: "tr-TR",
    title: "Faturalandırma",
    description:
      "Plan, kullanım ve faturalar. Kart ve vergi bilgilerini müşteri portalından yönet.",
    compare: "Pazarlama sitesinde karşılaştır",
    currency: "USD",
    currentPlan: "Mevcut plan",
    changePlan: "Planı değiştir",
    cancelPlan: "Planı iptal et",
    discount: "−20%",
    switchToAnnual: "Yıllığa geç (−20%)",
    switchToMonthly: "Aylığa geç",
    cycles: {
      monthly: "Aylık",
      annual: "Yıllık",
      monthSuffix: "/ ay",
      annualSuffix: "/ ay, yıllık faturalandırılır",
    },
    payment: {
      title: "Ödeme yöntemi",
      cardBrand: "VISA",
      card: "6411 ile biten Visa",
      expires: "Son kullanma 04 / 28",
      update: "Kartı güncelle",
      change: "Değiştir",
      nextCharge: "Sonraki ödeme: 1 Haz 2026",
    },
    plansHeader: {
      eyebrow: "Planlar",
      title: "Bir plan seç, istediğin zaman değiştir.",
      footnote: "Tüm fiyatlar USD · Vergi otomatik hesaplanır · İstediğin zaman iptal et",
      current: "Mevcut",
      more: "daha",
      currentCta: "Mevcut plan",
      contactSales: "Satış ekibiyle görüş",
    },
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$49",
        cadence: "aylık",
        description: "Sistemi denemek isteyen solo kurucu.",
        features: [
          "Seçeceğin 1 AI çalışan",
          "Web chat + e-posta kanalları",
          "Ayda 5.000 mesaj",
          "Tek kaynaktan Marka Kitabı",
          "Onay Merkezi",
          "Günlük özet e-postası",
        ],
        workerLimit: 1,
        cta: "Starter'a geç",
      },
      {
        id: "growth",
        name: "Growth",
        price: "$149",
        cadence: "aylık",
        description: "Aktif operasyonu olan solo kurucu.",
        features: [
          "3 AI çalışan",
          "WhatsApp, Telegram, IG, FB, LinkedIn",
          "Ayda 25.000 mesaj",
          "5 kaynağa kadar Marka Kitabı",
          "Sosyal yayınlama + onaylar",
          "SEO denetimi + içerik üretimi",
          "Haftalık yönetici özeti",
        ],
        workerLimit: 3,
        cta: "Growth'a geç",
      },
      {
        id: "business",
        name: "Business",
        price: "$399",
        cadence: "aylık",
        description: "Ciddi solo kurucular ve küçük ekipler.",
        features: [
          "10 AI çalışan + özel AI oluşturucu",
          "Ses kanalı (200 dk dahil)",
          "Ayda 100.000 mesaj",
          "Backlink AI (tarayıcı otomasyonu)",
          "Pazaryeri operasyonları (Amazon, eBay, Etsy)",
          "Genel API erişimi",
          "AI'lar arası orkestrasyon",
          "Slack / Teams rapor teslimi",
        ],
        workerLimit: 10,
        cta: "Mevcut plan",
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Özel",
        cadence: "yıllık",
        description: "Uyumluluk, ölçek ve ayrılmış altyapı.",
        features: [
          "Sınırsız AI çalışan",
          "Ayrılmış altyapı seçeneği",
          "SSO + gelişmiş RBAC",
          "SOC 2 raporları + imzalı DPA",
          "Yerinde kurulum seçeneği",
          "Atanmış başarı yöneticisi",
          "%99,99 çalışma süresi SLA",
          "Özel entegrasyonlar",
        ],
        workerLimit: "unlimited",
        cta: "Satış ekibiyle görüş",
      },
    ],
    usage: {
      title: "Kullanım · Mayıs 2026",
      description:
        "Neredeyse gerçek zamanlı güncellenir. Plan sınırlarını aşınca ek kullanım fiyatı uygulanır.",
      used: "kullanıldı",
      rows: [
        { label: "Çalışanlar", current: 10, max: 10, unit: "" },
        { label: "Bu ayki mesajlar", current: 64200, max: 100000, unit: "" },
        { label: "Ses dakikaları", current: 142, max: 200, unit: "dk" },
        { label: "Bu ayki API çağrıları", current: 18420, max: 50000, unit: "" },
      ],
    },
    invoices: {
      title: "Faturalar",
      description: "Son 12 ay. Vergi Stripe Tax ile otomatik hesaplanır.",
      downloadAll: "Tüm CSV'yi indir",
      headers: {
        invoice: "Fatura",
        date: "Tarih",
        amount: "Tutar",
        status: "Durum",
      },
      downloadPdf: "PDF indir",
      paid: "Ödendi",
      rows: [
        { id: "INV-2026-005", date: "1 May 2026", amount: "$399.00" },
        { id: "INV-2026-004", date: "1 Nis 2026", amount: "$399.00" },
        { id: "INV-2026-003", date: "1 Mar 2026", amount: "$399.00" },
        { id: "INV-2026-002", date: "1 Şub 2026", amount: "$149.00" },
        { id: "INV-2026-001", date: "14 Oca 2026", amount: "$49.00" },
      ],
    },
    purchase: {
      close: "Kapat",
      upgrade: "Yükselt",
      switchPlan: "Plan değiştir",
      newPlan: "Yeni plan",
      workerLimit: "Çalışan sınırı",
      unlimited: "Sınırsız",
      upToWorkersPrefix: "En fazla",
      upToWorkersSuffix: "çalışan",
      billingCycle: "Fatura döngüsü",
      price: "Fiyat",
      effective: "Geçerlilik",
      immediately: "Hemen",
      endOfCycle: "Mevcut dönemin sonunda",
      todaysCharge: "Bugünkü ödeme",
      prorated: "orantılı",
      noCharge: "$0.00",
      upgradeNotice:
        "Kartından orantılı fark hemen tahsil edilir. Yeni özellikler ödeme sonrası açılır.",
      switchNotice:
        "Bugün ödeme yok. Plan mevcut dönemin sonunda değişir. Düşürmede orantılı kredi uygulanır.",
      cancel: "Vazgeç",
      confirmSwitch: "Geçişi onayla",
      confirmAndPay: "Onayla ve öde",
    },
    cancel: {
      title: "Staffbix aboneliğini iptal etmek istiyor musun?",
      confirm: "Evet, iptal et",
      bodyBeforeDate: "Aboneliğin şu tarihe kadar aktif kalır:",
      bodyDate: "31 Mayıs 2026",
      bodyAfterDate:
        "Tekrar ücret alınmaz. Sonrasında tüm AI çalışanlar yanıt vermeyi durdurur ve Marka Kitabın geri dönmen ihtimaline karşı 30 gün saklanır.",
      exportNotice: "O tarihten önce her şeyi ayarlardan dışa aktarabilirsin.",
    },
  },
} as const;

const appTeam = {
  en: {
    title: "Team",
    description:
      "Workspace members and their access. Role changes take effect immediately.",
    inviteMember: "Invite member",
    table: {
      member: "Member",
      role: "Role",
      status: "Status",
      lastSeen: "Last seen",
    },
    labels: {
      editRole: "Edit role",
      removeMember: "Remove member",
      close: "Close",
      cancel: "Cancel",
    },
    statuses: {
      active: "Active",
      invited: "Invited",
    },
    roles: {
      owner: {
        label: "Owner",
        description: "Full access. Manages billing, team, and security.",
      },
      admin: {
        label: "Admin",
        description: "All workspace settings, no billing access.",
      },
      editor: {
        label: "Editor",
        description: "Hire workers, edit Brand Bible, approve actions.",
      },
      reviewer: {
        label: "Reviewer",
        description: "Read-only across the workspace.",
      },
    },
    roleReference: "Role reference",
    invitedToday: "Invited today",
    members: [
      {
        id: "usr_1",
        initials: "SK",
        displayName: "Suleyman Kasikci",
        email: "test@mail.com",
        role: "owner",
        status: "active",
        lastSeen: "Just now",
      },
      {
        id: "usr_2",
        initials: "AN",
        displayName: "Ayse Nehir",
        email: "ayse@northway.example",
        role: "admin",
        status: "active",
        lastSeen: "2 hours ago",
      },
      {
        id: "usr_3",
        initials: "MK",
        displayName: "Mert Kivanc",
        email: "mert@northway.example",
        role: "editor",
        status: "active",
        lastSeen: "Yesterday",
      },
      {
        id: "usr_4",
        initials: "JD",
        displayName: "Jamie Doyle",
        email: "jamie@contractor.example",
        role: "reviewer",
        status: "active",
        lastSeen: "3 days ago",
      },
      {
        id: "usr_5",
        initials: "RZ",
        displayName: "Rachel Zhou",
        email: "rachel@northway.example",
        role: "editor",
        status: "invited",
        lastSeen: "Invited May 10",
      },
    ],
    invite: {
      eyebrow: "Invite member",
      title: "Add someone to this workspace.",
      name: "Name",
      namePlaceholder: "Ada Lovelace",
      email: "Email",
      emailPlaceholder: "ada@company.com",
      role: "Role",
      submit: "Send invitation",
    },
    edit: {
      eyebrow: "Edit role",
      submit: "Save changes",
    },
    remove: {
      titlePrefix: "Remove",
      titleSuffix: "?",
      confirm: "Remove member",
      bodyPrefix: "",
      bodyMiddle: "will lose access to this workspace immediately.",
      bodySuffix: "Their audit-log history is retained.",
    },
    planLimit: {
      warnTitle: "Plan limit — approaching",
      warnBody:
        "You're nearing your team-seat cap. Upgrade your plan if you'll need more members soon.",
      blockTitle: "Plan limit — reached",
      blockBody:
        "You're at your team-seat cap. Remove a member or upgrade your plan to invite more.",
      hint: "{current} / {limit} seats in use",
      cta: "Upgrade plan",
    },
  },
  tr: {
    title: "Ekip",
    description:
      "Çalışma alanı üyeleri ve erişimleri. Rol değişiklikleri hemen geçerli olur.",
    inviteMember: "Üye davet et",
    table: {
      member: "Üye",
      role: "Rol",
      status: "Durum",
      lastSeen: "Son görülme",
    },
    labels: {
      editRole: "Rolü düzenle",
      removeMember: "Üyeyi kaldır",
      close: "Kapat",
      cancel: "Vazgeç",
    },
    statuses: {
      active: "Aktif",
      invited: "Davet edildi",
    },
    roles: {
      owner: {
        label: "Sahip",
        description: "Tam erişim. Faturalandırma, ekip ve güvenliği yönetir.",
      },
      admin: {
        label: "Yönetici",
        description: "Tüm çalışma alanı ayarları, faturalandırma hariç.",
      },
      editor: {
        label: "Editör",
        description: "Çalışan işe alır, Marka Kitabı'nı düzenler, aksiyonları onaylar.",
      },
      reviewer: {
        label: "İnceleyici",
        description: "Çalışma alanında salt okunur erişim.",
      },
    },
    roleReference: "Rol referansı",
    invitedToday: "Bugün davet edildi",
    members: [
      {
        id: "usr_1",
        initials: "SK",
        displayName: "Alex Morgan",
        email: "test@mail.com",
        role: "owner",
        status: "active",
        lastSeen: "Az önce",
      },
      {
        id: "usr_2",
        initials: "AN",
        displayName: "Ayşe Nehir",
        email: "ayse@northway.example",
        role: "admin",
        status: "active",
        lastSeen: "2 saat önce",
      },
      {
        id: "usr_3",
        initials: "MK",
        displayName: "Mert Kıvanç",
        email: "mert@northway.example",
        role: "editor",
        status: "active",
        lastSeen: "Dün",
      },
      {
        id: "usr_4",
        initials: "JD",
        displayName: "Jamie Doyle",
        email: "jamie@contractor.example",
        role: "reviewer",
        status: "active",
        lastSeen: "3 gün önce",
      },
      {
        id: "usr_5",
        initials: "RZ",
        displayName: "Rachel Zhou",
        email: "rachel@northway.example",
        role: "editor",
        status: "invited",
        lastSeen: "10 Mayıs'ta davet edildi",
      },
    ],
    invite: {
      eyebrow: "Üye davet et",
      title: "Bu çalışma alanına birini ekle.",
      name: "Ad",
      namePlaceholder: "Ada Lovelace",
      email: "E-posta",
      emailPlaceholder: "ada@company.com",
      role: "Rol",
      submit: "Daveti gönder",
    },
    edit: {
      eyebrow: "Rolü düzenle",
      submit: "Değişiklikleri kaydet",
    },
    remove: {
      titlePrefix: "Kaldır:",
      titleSuffix: "?",
      confirm: "Üyeyi kaldır",
      bodyPrefix: "",
      bodyMiddle: "bu çalışma alanına erişimini hemen kaybeder.",
      bodySuffix: "Denetim geçmişi saklanır.",
    },
    planLimit: {
      warnTitle: "Plan limiti — yaklaşıyor",
      warnBody:
        "Ekip koltuğu limitine yaklaşıyorsun. Yakında daha fazla üye gerekirse planını yükselt.",
      blockTitle: "Plan limiti — doldu",
      blockBody:
        "Ekip koltuğu limitine ulaştın. Yeni üye davet etmek için bir üyeyi kaldır ya da planını yükselt.",
      hint: "{current} / {limit} koltuk kullanılıyor",
      cta: "Planı yükselt",
    },
  },
} as const;

const appSettingsSecurity = {
  en: {
    title: "Settings",
    description: "Profile, security, notifications, and language.",
    password: {
      title: "Password",
      description:
        "At least 12 characters. Mix of upper, lower, number, symbol.",
      current: "Current password",
      new: "New password",
      confirm: "Confirm new password",
      hiddenPlaceholder: "••••••••••••",
      newPlaceholder: "At least 12 characters",
      confirmPlaceholder: "Type it again",
      update: "Update password",
      notice: "All active sessions are revoked on password change",
      show: "Show password",
      hide: "Hide password",
    },
    twoFactor: {
      title: "Two-factor authentication",
      description:
        "Email OTP is required for every web session. Optional TOTP for device-based 2FA.",
      emailTitle: "Email OTP",
      emailDescription:
        "Required on every web login. Sent to {verified email}.",
      enabled: "Enabled",
      totpTitle: "TOTP authenticator",
      totpDescription: "Google Authenticator, 1Password, Authy. Optional.",
      setup: "Set up",
    },
    sessions: {
      title: "Active sessions",
      activePrefix: "active across your devices.",
      revokeAll: "Revoke all others",
      thisDevice: "This device",
      ip: "IP",
      revoke: "Revoke",
      separator: "·",
      rows: [
        {
          id: "ses_1",
          device: "MacBook Pro · Chrome 124",
          ip: "78.182.•••.42",
          location: "Istanbul, TR",
          lastActive: "Active now",
          current: true,
        },
        {
          id: "ses_2",
          device: "iPhone 15 Pro · Staffbix iOS",
          ip: "78.182.•••.42",
          location: "Istanbul, TR",
          lastActive: "2 hours ago",
        },
        {
          id: "ses_3",
          device: "Linux · Firefox 125",
          ip: "94.55.•••.118",
          location: "Berlin, DE",
          lastActive: "3 days ago",
        },
      ],
    },
    securityLog: {
      title: "Security log",
      description: "Recent account events. Full audit log available on Business.",
      rows: [
        "May 12 14:23 · Login from Istanbul, TR · MacBook · Success",
        "May 12 08:11 · OTP requested · Success",
        "May 11 22:48 · Login from Istanbul, TR · iPhone · Success",
        "May 10 09:02 · Login from Berlin, DE · Linux · New device · Email alert sent",
        "May 8 14:34 · Password change · Success",
      ],
    },
    revokeOne: {
      title: "Revoke this session?",
      confirm: "Revoke",
      body:
        "The device will be signed out immediately. Re-authentication (email + OTP) is required to log back in.",
    },
    revokeAll: {
      title: "Revoke all other sessions?",
      confirm: "Revoke all others",
      body:
        "All sessions except this one will be signed out immediately. You'll stay signed in here.",
    },
  },
  tr: {
    title: "Ayarlar",
    description: "Profil, güvenlik, bildirimler ve dil.",
    password: {
      title: "Parola",
      description:
        "En az 12 karakter. Büyük harf, küçük harf, sayı ve sembol karışımı.",
      current: "Mevcut parola",
      new: "Yeni parola",
      confirm: "Yeni parolayı onayla",
      hiddenPlaceholder: "••••••••••••",
      newPlaceholder: "En az 12 karakter",
      confirmPlaceholder: "Tekrar yaz",
      update: "Parolayı güncelle",
      notice: "Parola değiştiğinde tüm aktif oturumlar iptal edilir",
      show: "Parolayı göster",
      hide: "Parolayı gizle",
    },
    twoFactor: {
      title: "İki faktörlü kimlik doğrulama",
      description:
        "Her web oturumu için e-posta OTP zorunludur. Cihaz tabanlı 2FA için TOTP isteğe bağlıdır.",
      emailTitle: "E-posta OTP",
      emailDescription:
        "Her web girişinde zorunlu. {verified email} adresine gönderilir.",
      enabled: "Etkin",
      totpTitle: "TOTP doğrulayıcı",
      totpDescription: "Google Authenticator, 1Password, Authy. İsteğe bağlı.",
      setup: "Kur",
    },
    sessions: {
      title: "Aktif oturumlar",
      activePrefix: "cihazında aktif.",
      revokeAll: "Diğerlerinin tümünü iptal et",
      thisDevice: "Bu cihaz",
      ip: "IP",
      revoke: "İptal et",
      separator: "·",
      rows: [
        {
          id: "ses_1",
          device: "MacBook Pro · Chrome 124",
          ip: "78.182.•••.42",
          location: "İstanbul, TR",
          lastActive: "Şu an aktif",
          current: true,
        },
        {
          id: "ses_2",
          device: "iPhone 15 Pro · Staffbix iOS",
          ip: "78.182.•••.42",
          location: "İstanbul, TR",
          lastActive: "2 saat önce",
        },
        {
          id: "ses_3",
          device: "Linux · Firefox 125",
          ip: "94.55.•••.118",
          location: "Berlin, DE",
          lastActive: "3 gün önce",
        },
      ],
    },
    securityLog: {
      title: "Güvenlik kaydı",
      description: "Son hesap olayları. Tam denetim kaydı Business planında mevcuttur.",
      rows: [
        "12 Mayıs 14:23 · İstanbul, TR üzerinden giriş · MacBook · Başarılı",
        "12 Mayıs 08:11 · OTP istendi · Başarılı",
        "11 Mayıs 22:48 · İstanbul, TR üzerinden giriş · iPhone · Başarılı",
        "10 Mayıs 09:02 · Berlin, DE üzerinden giriş · Linux · Yeni cihaz · E-posta uyarısı gönderildi",
        "8 Mayıs 14:34 · Parola değişikliği · Başarılı",
      ],
    },
    revokeOne: {
      title: "Bu oturum iptal edilsin mi?",
      confirm: "İptal et",
      body:
        "Cihazın oturumu hemen kapatılır. Tekrar giriş için yeniden kimlik doğrulama (e-posta + OTP) gerekir.",
    },
    revokeAll: {
      title: "Diğer tüm oturumlar iptal edilsin mi?",
      confirm: "Diğerlerinin tümünü iptal et",
      body:
        "Bu oturum hariç tüm oturumlar hemen kapatılır. Burada oturumun açık kalır.",
    },
  },
} as const;

const workerHireForm = {
  en: {
    separator: "·",
    initialsFallback: "??",
    identity: {
      title: "Identity",
      description: "What the worker is called inside your workspace.",
      displayName: "Display name",
      role: "Role",
      hint: "Internal only — your customers see your brand, not this name.",
    },
    language: {
      title: "Languages this worker uses",
      selected: "selected",
      defaultReply: "The worker replies in the customer's language by default",
    },
    avatar: {
      title: "Avatar",
      description: "What customers see when this worker introduces itself.",
      upload: "Upload photo",
      library: "Pick from library",
      generate: "Generate with AI",
      remove: "Remove photo",
      requirements: "PNG, JPG, WEBP · max 4MB · Background auto-removed on upload",
    },
    instructions: {
      title: "Custom instructions",
      description:
        "Free-form rules, exceptions, and examples. Stacks on top of the Brand Bible.",
      characters: "characters",
      noHardLimit: "No hard limit",
      examples: "Example rules — click to append",
      add: "Add",
    },
    roleSpecific: {
      uniqueSuffix: "unique to this role",
      titlePrefix: "How",
      titleSuffix: "works.",
      descriptionPrefix: "These settings only appear for",
      descriptionSuffix: "Other roles have their own.",
    },
    channels: {
      title: "Channels",
      description:
        "Toggle the channels this worker is allowed to operate on. Defaults reflect what makes sense for the role.",
      of: "of",
      selected: "selected",
      integrations: "Add more from Integrations",
    },
    schedule: {
      title: "Schedule",
      description: "When this worker is allowed to operate.",
    },
    approval: {
      title: "Approval mode",
      description:
        "Default policy. Per-action override available in role rules.",
    },
    spending: {
      title: "Platform spending caps",
      description:
        "External-spend ceiling enforced by the platform, not the prompt. Sits above any per-action limit in the role criteria.",
      daily: "Daily cap",
      monthly: "Monthly cap",
      notice:
        "Worker cannot exceed these regardless of internal settings · Override requires explicit approval",
    },
    restricted: {
      title: "Restricted topics",
      description:
        "Topics this worker must never publish or reply on. Stacks on top of Brand Bible restrictions.",
      placeholder:
        "One topic per line.\nPolitics · Competitor pricing · Anything legal-adjacent",
    },
    actions: {
      createNotice:
        "Conservative defaults applied · Loosen later as trust builds",
      editNotice:
        "Changes apply immediately on save · Audit log records this change",
      terminate: "Terminate",
      cancel: "Cancel",
      hire: "Hire",
      save: "Save changes",
    },
    terminate: {
      titlePrefix: "Terminate",
      titleSuffix: "?",
      confirm: "Terminate worker",
      bodySuffix:
        "will stop responding immediately across all channels. Configuration is retained for 30 days in case you rehire.",
    },
  },
  tr: {
    separator: "·",
    initialsFallback: "??",
    identity: {
      title: "Kimlik",
      description: "Çalışma alanında çalışanın nasıl adlandırılacağı.",
      displayName: "Görünen ad",
      role: "Rol",
      hint: "Sadece içeride görünür — müşterilerin bu adı değil markanı görür.",
    },
    language: {
      title: "Bu çalışanın kullanacağı diller",
      selected: "seçildi",
      defaultReply: "Çalışan varsayılan olarak müşterinin dilinde yanıt verir",
    },
    avatar: {
      title: "Avatar",
      description: "Bu çalışan kendini tanıtırken müşterilerin göreceği görünüm.",
      upload: "Fotoğraf yükle",
      library: "Kitaplıktan seç",
      generate: "AI ile üret",
      remove: "Fotoğrafı kaldır",
      requirements: "PNG, JPG, WEBP · maks. 4MB · Yüklemede arka plan otomatik kaldırılır",
    },
    instructions: {
      title: "Özel talimatlar",
      description:
        "Serbest kurallar, istisnalar ve örnekler. Marka Kitabı'nın üzerine eklenir.",
      characters: "karakter",
      noHardLimit: "Sabit sınır yok",
      examples: "Örnek kurallar — eklemek için tıkla",
      add: "Ekle",
    },
    roleSpecific: {
      uniqueSuffix: "bu role özel",
      titlePrefix: "",
      titleSuffix: "nasıl çalışır.",
      descriptionPrefix: "Bu ayarlar sadece",
      descriptionSuffix: "için görünür. Diğer rollerin kendi ayarları vardır.",
    },
    channels: {
      title: "Kanallar",
      description:
        "Bu çalışanın işlem yapabileceği kanalları açıp kapat. Varsayılanlar role uygun şekilde gelir.",
      of: "/",
      selected: "seçildi",
      integrations: "Daha fazlasını Entegrasyonlar'dan ekle",
    },
    schedule: {
      title: "Zamanlama",
      description: "Bu çalışanın ne zaman çalışabileceği.",
    },
    approval: {
      title: "Onay modu",
      description: "Varsayılan politika. Rol kurallarında aksiyon bazlı geçersiz kılma kullanılabilir.",
    },
    spending: {
      title: "Platform harcama sınırları",
      description:
        "Prompt değil platform tarafından uygulanan dış harcama tavanı. Rol kriterlerindeki aksiyon başı sınırların üzerinde durur.",
      daily: "Günlük sınır",
      monthly: "Aylık sınır",
      notice:
        "Çalışan iç ayarlardan bağımsız olarak bunları aşamaz · Geçersiz kılma açık onay gerektirir",
    },
    restricted: {
      title: "Kısıtlı konular",
      description:
        "Bu çalışanın asla yayınlamaması veya yanıtlamaması gereken konular. Marka Kitabı kısıtlarının üzerine eklenir.",
      placeholder:
        "Her satıra bir konu.\nPolitika · Rakip fiyatlandırması · Hukuki sayılabilecek her şey",
    },
    actions: {
      createNotice:
        "Temkinli varsayılanlar uygulandı · Güven arttıkça sonra gevşet",
      editNotice:
        "Değişiklikler kaydedince hemen uygulanır · Denetim kaydı bunu yazar",
      terminate: "Sonlandır",
      cancel: "Vazgeç",
      hire: "İşe al",
      save: "Değişiklikleri kaydet",
    },
    terminate: {
      titlePrefix: "Sonlandır:",
      titleSuffix: "?",
      confirm: "Çalışanı sonlandır",
      bodySuffix:
        "tüm kanallarda hemen yanıt vermeyi durdurur. Yeniden işe alman ihtimaline karşı yapılandırma 30 gün saklanır.",
    },
  },
} as const;

const reportDetail = {
  en: {
    dateLocale: "en-US",
    crumbs: {
      reports: "Reports",
    },
    actions: {
      delete: "Delete",
      pause: "Pause",
      activate: "Activate",
      edit: "Edit",
      runNow: "Run now",
    },
    statuses: {
      active: "Active",
      sent: "Sent",
      failed: "Failed",
      pending: "Pending",
    },
    kpis: {
      status: "Status",
      cadence: "Cadence",
      sentAllTime: "Sent · all time",
      deliverySuccess: "delivery success",
      avgOpenRate: "Avg open rate",
      last90Days: "Last 90 days",
    },
    content: {
      title: "Content",
      sectionSingular: "section",
      sectionPlural: "sections",
      included: "included in every delivery.",
    },
    recipients: {
      title: "Recipients",
      description: "Who receives this report and what they get.",
      edit: "Edit",
      initialsFallback: "??",
      of: "of",
      sections: "sections",
      fullReport: "Full report",
    },
    history: {
      title: "Delivery history",
      description: "Every run, who got it, and how it landed.",
      exportCsv: "Export CSV",
      sentAt: "Sent at",
      recipients: "Recipients",
      opens: "Opens",
      size: "Size",
      status: "Status",
      download: "Download",
      noRuns:
        "No runs yet. First delivery happens at the next scheduled time.",
    },
    details: {
      schedule: "Schedule",
      cadence: "Cadence",
      when: "When",
      lastSent: "Last sent",
      nextRun: "Next run",
      onDemandOnly: "On demand only",
      created: "Created",
      createdBy: "Created by",
      reportId: "Report ID",
      channels: "Channels",
      preview: "Preview",
      previewDescription: "What recipients see.",
      openPreview: "Open full preview",
      subject: "Subject:",
      moreSections: "more sections",
    },
    deleteModal: {
      titlePrefix: "Delete",
      titleSuffix: "?",
      confirm: "Delete report",
      body:
        "The report stops being generated immediately. Past generated PDFs stay in your audit log for 90 days, then are permanently deleted.",
    },
    statusModal: {
      titleSuffix: "?",
      pauseBody:
        "The next scheduled run will be skipped. Recipients will not be notified.",
      activateBody:
        "The next scheduled run will go out at the configured time.",
    },
  },
  tr: {
    dateLocale: "tr-TR",
    crumbs: {
      reports: "Raporlar",
    },
    actions: {
      delete: "Sil",
      pause: "Duraklat",
      activate: "Etkinleştir",
      edit: "Düzenle",
      runNow: "Şimdi çalıştır",
    },
    statuses: {
      active: "Aktif",
      sent: "Gönderildi",
      failed: "Başarısız",
      pending: "Bekliyor",
    },
    kpis: {
      status: "Durum",
      cadence: "Sıklık",
      sentAllTime: "Toplam gönderim",
      deliverySuccess: "teslim başarısı",
      avgOpenRate: "Ort. açılma oranı",
      last90Days: "Son 90 gün",
    },
    content: {
      title: "İçerik",
      sectionSingular: "bölüm",
      sectionPlural: "bölüm",
      included: "her teslimata dahil edilir.",
    },
    recipients: {
      title: "Alıcılar",
      description: "Bu raporu kimlerin aldığı ve ne gördüğü.",
      edit: "Düzenle",
      initialsFallback: "??",
      of: "/",
      sections: "bölüm",
      fullReport: "Tam rapor",
    },
    history: {
      title: "Teslimat geçmişi",
      description: "Her çalıştırma, kime gittiği ve sonucu.",
      exportCsv: "CSV dışa aktar",
      sentAt: "Gönderim",
      recipients: "Alıcılar",
      opens: "Açılmalar",
      size: "Boyut",
      status: "Durum",
      download: "İndir",
      noRuns:
        "Henüz çalıştırma yok. İlk teslimat bir sonraki planlanan zamanda yapılır.",
    },
    details: {
      schedule: "Zamanlama",
      cadence: "Sıklık",
      when: "Zaman",
      lastSent: "Son gönderim",
      nextRun: "Sonraki çalışma",
      onDemandOnly: "Sadece isteğe bağlı",
      created: "Oluşturuldu",
      createdBy: "Oluşturan",
      reportId: "Rapor ID",
      channels: "Kanallar",
      preview: "Önizleme",
      previewDescription: "Alıcıların gördüğü görünüm.",
      openPreview: "Tam önizlemeyi aç",
      subject: "Konu:",
      moreSections: "bölüm daha",
    },
    deleteModal: {
      titlePrefix: "Sil:",
      titleSuffix: "?",
      confirm: "Raporu sil",
      body:
        "Raporun üretilmesi hemen durur. Daha önce üretilen PDF'ler 90 gün denetim kaydında kalır, sonra kalıcı olarak silinir.",
    },
    statusModal: {
      titleSuffix: "?",
      pauseBody:
        "Bir sonraki planlı çalışma atlanır. Alıcılara bildirim gönderilmez.",
      activateBody:
        "Bir sonraki planlı çalışma ayarlanan zamanda gönderilir.",
    },
  },
} as const;

const appSettingsNotifications = {
  en: {
    title: "Settings",
    description: "Profile, security, notifications, and language.",
    preferences: {
      title: "Notification preferences",
      description: "Per-category control across push, email, and in-app inbox.",
      category: "Category",
      push: "Push",
      email: "Email",
      inApp: "In-app",
      rows: [
        {
          key: "approvals.high",
          label: "High-priority approvals",
          desc: "Approvals tagged High or Critical (spending, escalations, VIP).",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "approvals.routine",
          label: "Routine approvals",
          desc: "Standard drafts that fit within your worker's policy.",
          push: false,
          email: false,
          inApp: true,
        },
        {
          key: "leads.hot",
          label: "Hot leads",
          desc: "Inbound leads scored above 75 by the Sales worker.",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "report.daily",
          label: "Daily briefing",
          desc: "Yesterday's highlights and today's planned actions. 06:00 local.",
          push: false,
          email: true,
          inApp: true,
        },
        {
          key: "report.weekly",
          label: "Weekly summary",
          desc: "Monday morning executive summary across the workforce.",
          push: false,
          email: true,
          inApp: false,
        },
        {
          key: "system.security",
          label: "Security alerts",
          desc: "New device login, password change, sensitive setting change.",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "system.billing",
          label: "Billing events",
          desc: "Renewals, failed payments, usage above 90% of cap.",
          push: false,
          email: true,
          inApp: true,
        },
        {
          key: "system.changelog",
          label: "Product updates",
          desc: "What we shipped this week.",
          push: false,
          email: false,
          inApp: true,
        },
      ],
    },
    quiet: {
      title: "Quiet hours",
      description:
        "Suppress non-critical notifications during these hours. Times in your local timezone (Istanbul, UTC+3).",
      from: "From",
      to: "To",
      criticalTitle: "Critical alerts override quiet hours",
      criticalDescription:
        "Security alerts and payment failures will still notify you.",
    },
  },
  tr: {
    title: "Ayarlar",
    description: "Profil, güvenlik, bildirimler ve dil.",
    preferences: {
      title: "Bildirim tercihleri",
      description:
        "Push, e-posta ve uygulama içi gelen kutusu için kategori bazlı kontrol.",
      category: "Kategori",
      push: "Push",
      email: "E-posta",
      inApp: "Uygulama içi",
      rows: [
        {
          key: "approvals.high",
          label: "Yüksek öncelikli onaylar",
          desc: "High veya Critical etiketli onaylar (harcama, eskalasyon, VIP).",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "approvals.routine",
          label: "Rutin onaylar",
          desc: "Çalışan politikanın içinde kalan standart taslaklar.",
          push: false,
          email: false,
          inApp: true,
        },
        {
          key: "leads.hot",
          label: "Sıcak lead'ler",
          desc: "Satış çalışanı tarafından 75 üstü puanlanan gelen lead'ler.",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "report.daily",
          label: "Günlük özet",
          desc: "Dünün öne çıkanları ve bugünün planlanan aksiyonları. Yerel saatle 06:00.",
          push: false,
          email: true,
          inApp: true,
        },
        {
          key: "report.weekly",
          label: "Haftalık özet",
          desc: "İş gücü genelinde pazartesi sabahı yönetici özeti.",
          push: false,
          email: true,
          inApp: false,
        },
        {
          key: "system.security",
          label: "Güvenlik uyarıları",
          desc: "Yeni cihaz girişi, parola değişikliği, hassas ayar değişikliği.",
          push: true,
          email: true,
          inApp: true,
        },
        {
          key: "system.billing",
          label: "Faturalandırma olayları",
          desc: "Yenilemeler, başarısız ödemeler, sınırın %90 üstü kullanım.",
          push: false,
          email: true,
          inApp: true,
        },
        {
          key: "system.changelog",
          label: "Ürün güncellemeleri",
          desc: "Bu hafta yayınladıklarımız.",
          push: false,
          email: false,
          inApp: true,
        },
      ],
    },
    quiet: {
      title: "Sessiz saatler",
      description:
        "Bu saatlerde kritik olmayan bildirimleri bastır. Saatler yerel zaman dilimindedir (İstanbul, UTC+3).",
      from: "Başlangıç",
      to: "Bitiş",
      criticalTitle: "Kritik uyarılar sessiz saatleri aşsın",
      criticalDescription:
        "Güvenlik uyarıları ve ödeme hataları yine bildirilir.",
    },
  },
} as const;

const conversationDetail = {
  en: {
    title: "Marie Janssen",
    description: "WhatsApp · Order #1843 · Escalated",
    crumbs: {
      conversations: "Conversations",
    },
    actions: {
      close: "Close conversation",
      assign: "Assign human",
      send: "Send",
    },
    thread: {
      label: "Thread",
      messages: "messages",
      started: "Started 10:42",
      status: "Escalated",
      placeholder:
        "Write as Suleyman (Owner). The AI will continue handling from your last message.",
    },
    messages: [
      {
        side: "customer",
        author: "Marie Janssen",
        body: "Where's my order? It's been 7 days now.",
        time: "10:42",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "Hi Marie — I'm sorry to hear the wait has been long. Let me check the carrier status for order #1843.",
        time: "10:42",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "The carrier marked the package as 'in transit' but the last scan was 5 days ago. This is unusual. I've flagged this for human escalation and proposed a free reshipment as a goodwill gesture — pending your owner's approval.",
        time: "10:43",
      },
      {
        side: "customer",
        author: "Marie Janssen",
        body: "I appreciate that. Honestly I just want the gear before my trip on Saturday.",
        time: "10:44",
      },
      {
        side: "human",
        author: "Suleyman · Owner",
        body: "Approved reshipment + 15% off next order. Carrier escalation ticket opened.",
        time: "10:51",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "Marie, good news. A replacement shipment will leave today with overnight delivery so you'll have it before Saturday. We've also added 15% off your next order as an apology. You'll get the tracking link in your inbox within the hour.",
        time: "10:52",
      },
    ],
    customer: {
      title: "Customer",
      initials: "MJ",
      name: "Marie Janssen",
      phone: "+49 ••• ••• 1284",
      lifetimeValue: "Lifetime value",
      orders: "Orders",
      firstSeen: "First seen",
      firstSeenValue: "Jan 14, 2026",
      language: "Language",
      languageValue: "DE",
      status: "Status",
      statusValue: "VIP",
    },
    order: {
      title: "Linked order",
      id: "Order #1843",
      item: "Tent Aurora 2P · €389",
      status: "Status",
      statusValue: "Carrier issue",
      reshipment: "Reshipment",
      reshipmentValue: "Approved",
      discount: "Discount",
      discountValue: "15% next order",
      open: "Open in Shopify",
    },
    worker: {
      title: "Worker handling",
      initials: "CS",
      name: "Cyrus",
      role: "Customer Support",
    },
    separator: "·",
  },
  tr: {
    title: "Marie Janssen",
    description: "WhatsApp · Sipariş #1843 · Eskale edildi",
    crumbs: {
      conversations: "Konuşmalar",
    },
    actions: {
      close: "Konuşmayı kapat",
      assign: "İnsana ata",
      send: "Gönder",
    },
    thread: {
      label: "Akış",
      messages: "mesaj",
      started: "10:42'de başladı",
      status: "Eskale edildi",
      placeholder:
        "Alex (Sahip) olarak yaz. AI son mesajından sonra yönetmeye devam eder.",
    },
    messages: [
      {
        side: "customer",
        author: "Marie Janssen",
        body: "Siparişim nerede? 7 gün oldu.",
        time: "10:42",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "Merhaba Marie — bekleyişin uzamasına üzüldüm. Sipariş #1843 için taşıyıcı durumunu kontrol edeyim.",
        time: "10:42",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "Taşıyıcı paketi 'yolda' olarak işaretlemiş ama son tarama 5 gün önce yapılmış. Bu olağan değil. İnsan eskalasyonu için işaretledim ve iyi niyet olarak ücretsiz yeniden gönderim önerdim — sahibinin onayı bekleniyor.",
        time: "10:43",
      },
      {
        side: "customer",
        author: "Marie Janssen",
        body: "Bunu takdir ederim. Açıkçası cumartesi yolculuğumdan önce ekipmanı almak istiyorum.",
        time: "10:44",
      },
      {
        side: "human",
        author: "Alex · Sahip",
        body: "Yeniden gönderim + sonraki sipariş için %15 indirim onaylandı. Taşıyıcı eskalasyon kaydı açıldı.",
        time: "10:51",
      },
      {
        side: "ai",
        author: "Customer Support · AI",
        body: "Marie, iyi haber. Yedek gönderi bugün gece teslimatla çıkacak, böylece cumartesiden önce elinde olacak. Özür olarak sonraki siparişine %15 indirim de ekledik. Takip bağlantısı bir saat içinde gelen kutuna düşecek.",
        time: "10:52",
      },
    ],
    customer: {
      title: "Müşteri",
      initials: "MJ",
      name: "Marie Janssen",
      phone: "+49 ••• ••• 1284",
      lifetimeValue: "Yaşam boyu değer",
      orders: "Siparişler",
      firstSeen: "İlk görülme",
      firstSeenValue: "14 Oca 2026",
      language: "Dil",
      languageValue: "DE",
      status: "Durum",
      statusValue: "VIP",
    },
    order: {
      title: "Bağlı sipariş",
      id: "Sipariş #1843",
      item: "Tent Aurora 2P · €389",
      status: "Durum",
      statusValue: "Taşıyıcı sorunu",
      reshipment: "Yeniden gönderim",
      reshipmentValue: "Onaylandı",
      discount: "İndirim",
      discountValue: "Sonraki siparişte %15",
      open: "Shopify'da aç",
    },
    worker: {
      title: "Yöneten çalışan",
      initials: "CS",
      name: "Cyrus",
      role: "Customer Support",
    },
    separator: "·",
  },
} as const;

const appApprovals = {
  en: {
    title: "Approval Center",
    description:
      "Risky drafts wait here. Approve to execute, reject with feedback to teach the Brand Bible.",
    pending: "pending",
    auditLog: "Audit log",
    separator: "·",
    filters: {
      all: "All",
      high: "High",
      routine: "Routine",
    },
    priorities: {
      routine: "Routine",
      high: "High",
      critical: "Critical",
    },
    approvals: [
      {
        id: "apr_92x1",
        worker: { initials: "IS", name: "Inbound Sales" },
        title: 'Add "free returns" to thank-you sequence',
        body: "Append a paragraph to the post-purchase email. Affects ~1,240 customers this month. Within voice rules.",
        spend: "$0",
        reversible: true,
        voiceMatch: 98,
        age: "2 min",
        priority: "routine",
      },
      {
        id: "apr_92x2",
        worker: { initials: "SM", name: "Social Media" },
        title: "Boost Reels post with $40 budget",
        body: "Top-performing organic post from yesterday. Audience: warm visitors past 30 days.",
        spend: "$40",
        reversible: false,
        voiceMatch: 96,
        age: "8 min",
        priority: "high",
      },
      {
        id: "apr_92x3",
        worker: { initials: "CS", name: "Customer Support" },
        title: "Refund €120 for order #1843",
        body: "Customer reports lost package. Carrier confirms package not delivered. Within refund policy and worker's authority threshold ($150).",
        spend: "-€120",
        reversible: true,
        voiceMatch: 99,
        age: "11 min",
        priority: "high",
      },
      {
        id: "apr_92x4",
        worker: { initials: "SE", name: "SEO Specialist" },
        title: "Publish 3 product page rewrites",
        body: "Optimized meta titles and descriptions for Tent Aurora 2P, Down jacket M3, Trail pack 30L.",
        spend: "$0",
        reversible: true,
        voiceMatch: 99,
        age: "23 min",
        priority: "routine",
      },
      {
        id: "apr_92x5",
        worker: { initials: "CW", name: "Content Writer" },
        title: 'Publish blog: "Why solo founders skip CRMs"',
        body: "1,800 words. SEO-optimized for 'small business CRM alternatives'. Internal links reviewed.",
        spend: "$0",
        reversible: true,
        voiceMatch: 97,
        age: "34 min",
        priority: "routine",
      },
      {
        id: "apr_92x6",
        worker: { initials: "IS", name: "Inbound Sales" },
        title: "Send 6 outreach emails to warm leads",
        body: "Lead-scored above 75. Personalized using last interaction data from Brand Bible.",
        spend: "$0",
        reversible: false,
        voiceMatch: 98,
        age: "1 hr",
        priority: "routine",
      },
      {
        id: "apr_92x7",
        worker: { initials: "BK", name: "Bookkeeping" },
        title: "Categorize 41 new expenses",
        body: "Stripe and bank feed. 39 auto-classified, 2 ambiguous (highlighted in review).",
        spend: "$0",
        reversible: true,
        voiceMatch: 100,
        age: "2 hr",
        priority: "routine",
      },
    ],
    empty: {
      title: "Inbox zero. The AI is still working.",
      description: "New approvals will appear here as workers propose actions.",
    },
    modal: {
      title: "Reject this draft?",
      confirm: "Reject with feedback",
      body:
        "The action will not run. Your feedback feeds back into the Brand Bible so this kind of mistake doesn't recur.",
      placeholder: "Optional: why are you rejecting this?",
    },
    row: {
      ago: "ago",
      spend: "Spend",
      reversible: "Reversible",
      notReversible: "Not reversible",
      voiceMatch: "Voice match",
      reject: "Reject",
      approve: "Approve",
    },
    titleByKind: {
      webReply: "Reply to web chat customer",
      whatsappReplyPrefix: "Reply on WhatsApp",
      emailSend: "Send customer email",
      socialPostFallback: "Social post",
      socialPostSuffix: "post",
    },
    workerLabel: "AI worker",
    status: {
      loadFailed: "Couldn't load approvals.",
      networkError: "Network error while loading approvals.",
      loading: "Loading approvals…",
    },
  },
  tr: {
    title: "Onay Merkezi",
    description:
      "Riskli taslaklar burada bekler. Çalıştırmak için onayla, Marka Kitabı'nı eğitmek için geri bildirimle reddet.",
    pending: "bekliyor",
    auditLog: "Denetim kaydı",
    separator: "·",
    filters: {
      all: "Tümü",
      high: "Yüksek",
      routine: "Rutin",
    },
    priorities: {
      routine: "Rutin",
      high: "Yüksek",
      critical: "Kritik",
    },
    approvals: [
      {
        id: "apr_92x1",
        worker: { initials: "IS", name: "Inbound Sales" },
        title: 'Teşekkür akışına "ücretsiz iade" ekle',
        body: "Satın alma sonrası e-postaya bir paragraf ekler. Bu ay yaklaşık 1.240 müşteriyi etkiler. Ses kuralları içinde.",
        spend: "$0",
        reversible: true,
        voiceMatch: 98,
        age: "2 dk",
        priority: "routine",
      },
      {
        id: "apr_92x2",
        worker: { initials: "SM", name: "Social Media" },
        title: "Reels gönderisini $40 bütçeyle öne çıkar",
        body: "Dünden en iyi performanslı organik gönderi. Kitle: son 30 günün sıcak ziyaretçileri.",
        spend: "$40",
        reversible: false,
        voiceMatch: 96,
        age: "8 dk",
        priority: "high",
      },
      {
        id: "apr_92x3",
        worker: { initials: "CS", name: "Customer Support" },
        title: "Sipariş #1843 için €120 iade yap",
        body: "Müşteri kayıp paket bildiriyor. Taşıyıcı paketin teslim edilmediğini doğruluyor. İade politikası ve çalışanın yetki eşiği ($150) içinde.",
        spend: "-€120",
        reversible: true,
        voiceMatch: 99,
        age: "11 dk",
        priority: "high",
      },
      {
        id: "apr_92x4",
        worker: { initials: "SE", name: "SEO Specialist" },
        title: "3 ürün sayfası yeniden yazımını yayınla",
        body: "Tent Aurora 2P, Down jacket M3, Trail pack 30L için optimize edilmiş meta başlık ve açıklamalar.",
        spend: "$0",
        reversible: true,
        voiceMatch: 99,
        age: "23 dk",
        priority: "routine",
      },
      {
        id: "apr_92x5",
        worker: { initials: "CW", name: "Content Writer" },
        title: 'Blog yayınla: "Solo kurucular neden CRM atlar"',
        body: "1.800 kelime. 'Small business CRM alternatives' için SEO optimize. İç bağlantılar incelendi.",
        spend: "$0",
        reversible: true,
        voiceMatch: 97,
        age: "34 dk",
        priority: "routine",
      },
      {
        id: "apr_92x6",
        worker: { initials: "IS", name: "Inbound Sales" },
        title: "Sıcak lead'lere 6 outreach e-postası gönder",
        body: "Lead puanı 75 üstü. Marka Kitabı'ndaki son etkileşim verisiyle kişiselleştirildi.",
        spend: "$0",
        reversible: false,
        voiceMatch: 98,
        age: "1 sa",
        priority: "routine",
      },
      {
        id: "apr_92x7",
        worker: { initials: "BK", name: "Bookkeeping" },
        title: "41 yeni gideri kategorize et",
        body: "Stripe ve banka akışı. 39 otomatik sınıflandı, 2 belirsiz (incelemede vurgulandı).",
        spend: "$0",
        reversible: true,
        voiceMatch: 100,
        age: "2 sa",
        priority: "routine",
      },
    ],
    empty: {
      title: "Gelen kutusu sıfır. AI çalışmaya devam ediyor.",
      description: "Çalışanlar aksiyon önerdikçe yeni onaylar burada görünür.",
    },
    modal: {
      title: "Bu taslak reddedilsin mi?",
      confirm: "Geri bildirimle reddet",
      body:
        "Aksiyon çalıştırılmaz. Geri bildirimin Marka Kitabı'na işlenir, böylece bu tür hata tekrar etmez.",
      placeholder: "İsteğe bağlı: neden reddediyorsun?",
    },
    row: {
      ago: "önce",
      spend: "Harcama",
      reversible: "Geri alınabilir",
      notReversible: "Geri alınamaz",
      voiceMatch: "Ses uyumu",
      reject: "Reddet",
      approve: "Onayla",
    },
    titleByKind: {
      webReply: "Web sohbeti müşterisine yanıt ver",
      whatsappReplyPrefix: "WhatsApp'tan yanıt ver",
      emailSend: "Müşteriye e-posta gönder",
      socialPostFallback: "Sosyal gönderi",
      socialPostSuffix: "gönderisi",
    },
    workerLabel: "AI çalışan",
    status: {
      loadFailed: "Onaylar yüklenemedi.",
      networkError: "Onaylar yüklenirken ağ hatası.",
      loading: "Onaylar yükleniyor…",
    },
  },
} as const;

const reportsList = {
  en: {
    dateLocale: "en-US",
    title: "Reports",
    description:
      "Scheduled and on-demand reports across the workforce. Each one has its own recipients, cadence, and content sections.",
    newReport: "New report",
    stats: {
      activeReports: "Active reports",
      of: "of",
      total: "total",
      sentAllTime: "Sent · all time",
      acrossReports: "Across every report",
      avgOpenRate: "Avg open rate",
      last90Days: "Last 90 days",
      nextDelivery: "Next delivery",
    },
    statuses: {
      all: "All",
      Active: "Active",
      Paused: "Paused",
      Draft: "Draft",
    },
    searchPlaceholder: "Search reports, recipients...",
    table: {
      report: "Report",
      cadenceNextRun: "Cadence · Next run",
      recipients: "Recipients",
      sent: "Sent",
      openRate: "Open rate",
      status: "Status",
      recipientSingular: "recipient",
      recipientPlural: "recipients",
      noMatches: "No reports match these filters.",
      initialsFallback: "??",
    },
    actions: {
      edit: "Edit",
      more: "More",
      viewDetails: "View details",
      runNow: "Run now",
      pause: "Pause",
      activate: "Activate",
      duplicate: "Duplicate",
      delete: "Delete",
    },
    deleteModal: {
      titlePrefix: "Delete",
      titleSuffix: "?",
      confirm: "Delete report",
      body:
        "The report will stop being generated. Past generated PDFs are retained in your audit log for 90 days, then permanently deleted.",
    },
  },
  tr: {
    dateLocale: "tr-TR",
    title: "Raporlar",
    description:
      "İş gücü genelinde planlı ve isteğe bağlı raporlar. Her birinin kendi alıcıları, sıklığı ve içerik bölümleri vardır.",
    newReport: "Yeni rapor",
    stats: {
      activeReports: "Aktif raporlar",
      of: "/",
      total: "toplam",
      sentAllTime: "Toplam gönderim",
      acrossReports: "Tüm raporlar genelinde",
      avgOpenRate: "Ort. açılma oranı",
      last90Days: "Son 90 gün",
      nextDelivery: "Sonraki teslimat",
    },
    statuses: {
      all: "Tümü",
      Active: "Aktif",
      Paused: "Duraklatıldı",
      Draft: "Taslak",
    },
    searchPlaceholder: "Raporlarda ve alıcılarda ara...",
    table: {
      report: "Rapor",
      cadenceNextRun: "Sıklık · Sonraki çalışma",
      recipients: "Alıcılar",
      sent: "Gönderim",
      openRate: "Açılma oranı",
      status: "Durum",
      recipientSingular: "alıcı",
      recipientPlural: "alıcı",
      noMatches: "Bu filtrelerle eşleşen rapor yok.",
      initialsFallback: "??",
    },
    actions: {
      edit: "Düzenle",
      more: "Daha fazla",
      viewDetails: "Detayları gör",
      runNow: "Şimdi çalıştır",
      pause: "Duraklat",
      activate: "Etkinleştir",
      duplicate: "Çoğalt",
      delete: "Sil",
    },
    deleteModal: {
      titlePrefix: "Sil:",
      titleSuffix: "?",
      confirm: "Raporu sil",
      body:
        "Raporun üretilmesi durur. Daha önce üretilen PDF'ler 90 gün denetim kaydında tutulur, sonra kalıcı olarak silinir.",
    },
  },
} as const;

const appBrandBible = {
  en: {
    title: "Brand Bible",
    description:
      "The structured knowledge base every AI worker reads from. Edit any field; the change propagates instantly.",
    exportJson: "Export JSON",
    addSource: "Add source",
    addSourceModal: {
      title: "Add a Brand Bible source",
      description:
        "Paste text, fetch a public URL, or upload a PDF/DOCX. We chunk and embed it so every worker can cite it.",
      tabPaste: "Paste text",
      tabUrl: "From URL",
      tabFile: "Upload file",
      titleLabel: "Title",
      titlePlaceholder: "e.g. Returns policy",
      textLabel: "Content",
      textPlaceholder: "Paste the text here…",
      urlLabel: "Public URL",
      urlPlaceholder: "https://example.com/about",
      fileLabel: "PDF or DOCX",
      submit: "Add source",
      submitting: "Adding…",
      cancel: "Cancel",
      errorGeneric: "Couldn't add the source. Please try again.",
      errorTitle: "Enter a title.",
      errorText: "Paste some content.",
      errorUrl: "Enter a valid http/https URL.",
      errorFile: "Choose a PDF or DOCX file.",
      success: "Source added — processing in the background.",
    },
    readiness: {
      title: "Readiness score",
      hint:
        "Add visual identity (logo, color palette) and a SEO keyword list to push readiness above 95%.",
      fieldsPopulated: "fields populated",
      showMissing: "Show missing",
    },
    synced: "Synced",
    pending: "Pending",
    actions: {
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      save: "Save",
    },
    fields: [
      {
        key: "Identity",
        values: [
          "Company: Northway Goods",
          "Sector: E-commerce · Outdoor gear",
          "Markets: TR, DE, AT",
          "Languages: EN, TR, DE",
        ],
        source: "Wizard · website crawl",
        synced: true,
      },
      {
        key: "Catalog",
        values: [
          "Products: 142 SKUs",
          "Price range: €18 – €640",
          "Top sellers: Tent Aurora 2P · Down jacket M3 · Trail pack 30L",
        ],
        source: "Shopify Admin API",
        synced: true,
      },
      {
        key: "Voice",
        values: [
          "Tone: warm, direct",
          "Length: short by default",
          "Restricted: politics, competitor comparisons",
        ],
        source: "Wizard · interview",
        synced: true,
      },
      {
        key: "Policies",
        values: [
          "Returns: 30 days, free on EU orders",
          "Warranty: 2 years on gear, 1 year on apparel",
          "Shipping: 2–5 days, free over €60",
        ],
        source: "PDF upload · returns-policy.pdf",
        synced: true,
      },
      {
        key: "Limits",
        values: [
          "Max discount: 15% without escalation",
          "Daily ad spend cap: $200",
          "Restricted topics: pricing leaks, partner names",
        ],
        source: "Wizard",
        synced: true,
      },
      {
        key: "Recipients",
        values: [
          "Daily briefing: test@mail.com",
          "Weekly summary: team@northway.example",
          "Monthly PDF: accountant@northway.example",
        ],
        source: "Manual",
        synced: false,
      },
    ],
    sources: {
      title: "Sources",
      description: "Where this Brand Bible comes from.",
      rows: [
        { label: "Website (northway.example)", state: "synced", date: "Synced 6 hours ago" },
        { label: "returns-policy.pdf", state: "synced", date: "Uploaded May 4, 2026" },
        { label: "Shopify Admin API", state: "synced", date: "Real-time" },
        { label: "Google Drive · Pricing folder", state: "pending", date: "Awaiting access" },
      ],
    },
    readers: {
      title: "Readers · last 24h",
      description: "Workers who queried the Brand Bible recently.",
      rows: [
        "Customer Support",
        "Inbound Sales",
        "Social Media",
        "SEO Specialist",
        "Content Writer",
        "Email Marketer",
      ],
    },
    deleteModal: {
      titlePrefix: "Delete the",
      titleSuffix: "field?",
      confirm: "Delete field",
      body:
        "All AI workers will lose access to this part of the Brand Bible. New conversations may answer less accurately on related topics.",
      notice: "You can re-add by ingesting a new source.",
    },
  },
  tr: {
    title: "Marka Kitabı",
    description:
      "Her AI çalışanın okuduğu yapılandırılmış bilgi tabanı. Her alanı düzenle; değişiklik anında yayılır.",
    exportJson: "JSON dışa aktar",
    addSource: "Kaynak ekle",
    addSourceModal: {
      title: "Brand Bible kaynağı ekle",
      description:
        "Metin yapıştır, herkese açık bir URL çek ya da PDF/DOCX yükle. Parçalayıp gömeriz; her çalışan kaynak gösterebilir.",
      tabPaste: "Metin yapıştır",
      tabUrl: "URL'den",
      tabFile: "Dosya yükle",
      titleLabel: "Başlık",
      titlePlaceholder: "örn. İade politikası",
      textLabel: "İçerik",
      textPlaceholder: "Metni buraya yapıştır…",
      urlLabel: "Herkese açık URL",
      urlPlaceholder: "https://ornek.com/hakkimizda",
      fileLabel: "PDF veya DOCX",
      submit: "Kaynak ekle",
      submitting: "Ekleniyor…",
      cancel: "İptal",
      errorGeneric: "Kaynak eklenemedi. Lütfen tekrar dene.",
      errorTitle: "Bir başlık gir.",
      errorText: "Biraz içerik yapıştır.",
      errorUrl: "Geçerli bir http/https URL gir.",
      errorFile: "PDF veya DOCX dosyası seç.",
      success: "Kaynak eklendi — arka planda işleniyor.",
    },
    readiness: {
      title: "Hazırlık skoru",
      hint:
        "Hazırlığı %95 üstüne taşımak için görsel kimlik (logo, renk paleti) ve SEO anahtar kelime listesi ekle.",
      fieldsPopulated: "alan dolu",
      showMissing: "Eksikleri göster",
    },
    synced: "Senkronize",
    pending: "Bekliyor",
    actions: {
      edit: "Düzenle",
      delete: "Sil",
      cancel: "Vazgeç",
      save: "Kaydet",
    },
    fields: [
      {
        key: "Kimlik",
        values: [
          "Şirket: Northway Goods",
          "Sektör: E-ticaret · Outdoor ekipman",
          "Pazarlar: TR, DE, AT",
          "Diller: EN, TR, DE",
        ],
        source: "Sihirbaz · website taraması",
        synced: true,
      },
      {
        key: "Katalog",
        values: [
          "Ürünler: 142 SKU",
          "Fiyat aralığı: €18 – €640",
          "Çok satanlar: Tent Aurora 2P · Down jacket M3 · Trail pack 30L",
        ],
        source: "Shopify Admin API",
        synced: true,
      },
      {
        key: "Ses",
        values: [
          "Ton: sıcak, doğrudan",
          "Uzunluk: varsayılan olarak kısa",
          "Kısıtlı: politika, rakip karşılaştırmaları",
        ],
        source: "Sihirbaz · görüşme",
        synced: true,
      },
      {
        key: "Politikalar",
        values: [
          "İade: 30 gün, AB siparişlerinde ücretsiz",
          "Garanti: ekipmanda 2 yıl, giyimde 1 yıl",
          "Kargo: 2–5 gün, €60 üstü ücretsiz",
        ],
        source: "PDF yükleme · returns-policy.pdf",
        synced: true,
      },
      {
        key: "Sınırlar",
        values: [
          "Maksimum indirim: eskalasyon olmadan %15",
          "Günlük reklam harcama sınırı: $200",
          "Kısıtlı konular: fiyat sızıntıları, partner adları",
        ],
        source: "Sihirbaz",
        synced: true,
      },
      {
        key: "Alıcılar",
        values: [
          "Günlük özet: test@mail.com",
          "Haftalık özet: team@northway.example",
          "Aylık PDF: accountant@northway.example",
        ],
        source: "Manuel",
        synced: false,
      },
    ],
    sources: {
      title: "Kaynaklar",
      description: "Bu Marka Kitabı'nın geldiği yerler.",
      rows: [
        { label: "Website (northway.example)", state: "synced", date: "6 saat önce senkronize edildi" },
        { label: "returns-policy.pdf", state: "synced", date: "4 Mayıs 2026'da yüklendi" },
        { label: "Shopify Admin API", state: "synced", date: "Gerçek zamanlı" },
        { label: "Google Drive · Fiyatlandırma klasörü", state: "pending", date: "Erişim bekleniyor" },
      ],
    },
    readers: {
      title: "Okuyanlar · son 24s",
      description: "Marka Kitabı'nı son dönemde sorgulayan çalışanlar.",
      rows: [
        "Customer Support",
        "Inbound Sales",
        "Social Media",
        "SEO Specialist",
        "Content Writer",
        "Email Marketer",
      ],
    },
    deleteModal: {
      titlePrefix: "Alan silinsin:",
      titleSuffix: "?",
      confirm: "Alanı sil",
      body:
        "Tüm AI çalışanlar Marka Kitabı'nın bu bölümüne erişimi kaybeder. Yeni konuşmalarda ilgili konularda daha az isabetli yanıt verebilirler.",
      notice: "Yeni bir kaynak içe aktararak yeniden ekleyebilirsin.",
    },
  },
} as const;

const appLogs = {
  en: {
    title: "Logs",
    description:
      "Audit trail of every login, AI action, approval, admin change, and system event. Exportable for compliance reviews.",
    actions: {
      exportCsv: "Export CSV",
      streamWebhook: "Stream to webhook",
    },
    ranges: {
      today: "Today",
      last7: "Last 7 days",
      last30: "Last 30 days",
      all: "All time",
    },
    searchPlaceholder: "Search actor, action, IP, location...",
    summary: {
      of: "of",
      entries: "entries",
    },
    table: {
      time: "Time",
      actor: "Actor",
      action: "Action",
      location: "Location",
      device: "Device",
      result: "Result",
      noMatches: "No entries match these filters.",
    },
    pagination: {
      showing: "Showing",
      of: "of",
      perPage: "Per page",
      previous: "Previous page",
      next: "Next page",
    },
    retention:
      "Retention: 90 days on Business · 12 months on Enterprise · Streamed to your webhook in real-time",
    results: {
      success: "Success",
      blocked: "Blocked",
      failed: "Failed",
    },
    details: {
      logId: "Log ID",
      type: "Type",
      actorKind: "Actor kind",
      ip: "IP",
      city: "City",
      region: "Region",
      country: "Country",
      device: "Device",
      browser: "Browser",
      language: "Language",
      result: "Result",
      timestamp: "Timestamp",
      target: "Target",
    },
    separator: "·",
  },
  tr: {
    title: "Kayıtlar",
    description:
      "Her giriş, AI aksiyonu, onay, yönetici değişikliği ve sistem olayının denetim izi. Uyumluluk incelemeleri için dışa aktarılabilir.",
    actions: {
      exportCsv: "CSV dışa aktar",
      streamWebhook: "Webhook'a yayınla",
    },
    ranges: {
      today: "Bugün",
      last7: "Son 7 gün",
      last30: "Son 30 gün",
      all: "Tüm zamanlar",
    },
    searchPlaceholder: "Aktör, aksiyon, IP, konum ara...",
    summary: {
      of: "/",
      entries: "kayıt",
    },
    table: {
      time: "Zaman",
      actor: "Aktör",
      action: "Aksiyon",
      location: "Konum",
      device: "Cihaz",
      result: "Sonuç",
      noMatches: "Bu filtrelerle eşleşen kayıt yok.",
    },
    pagination: {
      showing: "Gösteriliyor",
      of: "/",
      perPage: "Sayfa başına",
      previous: "Önceki sayfa",
      next: "Sonraki sayfa",
    },
    retention:
      "Saklama: Business'ta 90 gün · Enterprise'ta 12 ay · Webhook'una gerçek zamanlı yayınlanır",
    results: {
      success: "Başarılı",
      blocked: "Engellendi",
      failed: "Başarısız",
    },
    details: {
      logId: "Kayıt ID",
      type: "Tür",
      actorKind: "Aktör türü",
      ip: "IP",
      city: "Şehir",
      region: "Bölge",
      country: "Ülke",
      device: "Cihaz",
      browser: "Tarayıcı",
      language: "Dil",
      result: "Sonuç",
      timestamp: "Zaman damgası",
      target: "Hedef",
    },
    separator: "·",
  },
} as const;

const appWorkforceList = {
  en: {
    numberLocale: "en-US",
    title: "Workforce",
    description:
      "Your hired AI employees. Configure schedule, channels, limits, and approval mode per worker.",
    hireWorker: "Hire worker",
    filters: {
      all: "All",
      online: "Online",
      idle: "Idle",
      paused: "Paused",
    },
    searchPlaceholder: "Search workers...",
    table: {
      worker: "Worker",
      roleCategory: "Role · Category",
      status: "Status",
      channels: "Channels",
      messages7d: "Messages · 7d",
      pending: "Pending",
      approvalMode: "Approval mode",
      empty: "No workers match this filter.",
    },
    summary: {
      of: "of",
      workersShown: "workers shown",
      tierLimit: "Tier limit: 10 workers",
    },
    actions: {
      editWorker: "Edit worker",
      more: "More actions",
      viewDetails: "View details",
      editConfig: "Edit configuration",
      terminate: "Terminate",
    },
    terminate: {
      titlePrefix: "Terminate",
      fallback: "worker",
      titleSuffix: "?",
      confirm: "Terminate worker",
      bodySuffix:
        "will stop responding immediately. Pending approvals tied to this worker are cancelled. The configuration is retained for 30 days in case you want to rehire.",
      notice: "This action is reversible within 30 days.",
    },
  },
  tr: {
    numberLocale: "tr-TR",
    title: "İş gücü",
    description:
      "İşe alınmış AI çalışanların. Her çalışan için zamanlama, kanal, sınır ve onay modunu yapılandır.",
    hireWorker: "Çalışan işe al",
    filters: {
      all: "Tümü",
      online: "Çevrimiçi",
      idle: "Boşta",
      paused: "Duraklatıldı",
    },
    searchPlaceholder: "Çalışan ara...",
    table: {
      worker: "Çalışan",
      roleCategory: "Rol · Kategori",
      status: "Durum",
      channels: "Kanallar",
      messages7d: "Mesajlar · 7g",
      pending: "Bekleyen",
      approvalMode: "Onay modu",
      empty: "Bu filtreyle eşleşen çalışan yok.",
    },
    summary: {
      of: "/",
      workersShown: "çalışan gösteriliyor",
      tierLimit: "Plan sınırı: 10 çalışan",
    },
    actions: {
      editWorker: "Çalışanı düzenle",
      more: "Daha fazla aksiyon",
      viewDetails: "Detayları gör",
      editConfig: "Yapılandırmayı düzenle",
      terminate: "Sonlandır",
    },
    terminate: {
      titlePrefix: "Sonlandır:",
      fallback: "çalışan",
      titleSuffix: "?",
      confirm: "Çalışanı sonlandır",
      bodySuffix:
        "hemen yanıt vermeyi durdurur. Bu çalışana bağlı bekleyen onaylar iptal edilir. Yeniden işe almak istersen yapılandırma 30 gün saklanır.",
      notice: "Bu aksiyon 30 gün içinde geri alınabilir.",
    },
  },
} as const;

const appSettingsProfile = {
  en: {
    title: "Settings",
    description: "Profile, security, notifications, and language.",
    alert: "Profile saved.",
    personal: {
      title: "Personal",
      description: "How you appear inside the workspace.",
      initials: "SK",
      uploadPhoto: "Upload photo",
      remove: "Remove",
      firstName: "First name",
      surname: "Surname",
      email: "Email",
      phone: "Phone",
      jobTitle: "Job title",
      companyName: "Company name",
    },
    workspace: {
      title: "Workspace",
      description: "Internal display name. Custom domain on Enterprise.",
      name: "Workspace name",
      id: "Workspace ID",
    },
    defaults: {
      firstName: "Suleyman",
      lastName: "Kasikci",
      email: "test@mail.com",
      phone: "+90 5•• ••• 8432",
      title: "Founder",
      company: "Northway Goods",
      workspaceName: "Northway Goods",
      workspaceId: "ten_aXz7P9k2",
    },
    actions: {
      cancel: "Cancel",
      save: "Save changes",
    },
  },
  tr: {
    title: "Ayarlar",
    description: "Profil, güvenlik, bildirimler ve dil.",
    alert: "Profil kaydedildi.",
    personal: {
      title: "Kişisel",
      description: "Çalışma alanında nasıl görüneceğin.",
      initials: "SK",
      uploadPhoto: "Fotoğraf yükle",
      remove: "Kaldır",
      firstName: "Ad",
      surname: "Soyad",
      email: "E-posta",
      phone: "Telefon",
      jobTitle: "Ünvan",
      companyName: "Şirket adı",
    },
    workspace: {
      title: "Çalışma alanı",
      description: "İç görünen ad. Özel domain Enterprise planında.",
      name: "Çalışma alanı adı",
      id: "Çalışma alanı ID",
    },
    defaults: {
      firstName: "Alex",
      lastName: "Morgan",
      email: "test@mail.com",
      phone: "+90 5•• ••• 8432",
      title: "Kurucu",
      company: "Northway Goods",
      workspaceName: "Northway Goods",
      workspaceId: "ten_aXz7P9k2",
    },
    actions: {
      cancel: "Vazgeç",
      save: "Değişiklikleri kaydet",
    },
  },
} as const;

const reportForm = {
  en: {
    template: {
      title: "Template",
      description:
        "Pick a starting point. You can change everything below before saving.",
      sections: "sections",
    },
    basics: {
      title: "Basics",
      name: "Name",
      cadence: "Cadence",
      description: "Description",
      sendAt: "Send at",
      sendOn: "Send on",
      dailyHint: "Local time · e.g. 06:00, 18:00",
      weeklyHint: "e.g. Monday 08:00",
      monthlyHint: "e.g. 1st of month 08:00 · or last Friday",
      quarterlyHint: "e.g. 1st of quarter 09:00",
      fallbackTime: "08:00",
    },
    cadence: {
      values: ["Daily", "Weekly", "Monthly", "Quarterly", "On demand"],
      labels: {
        Daily: "Daily",
        Weekly: "Weekly",
        Monthly: "Monthly",
        Quarterly: "Quarterly",
        "On demand": "On demand",
      },
    },
    content: {
      title: "Content",
      description:
        "Pick what this report includes. Each section becomes a chapter in the PDF / email.",
      of: "of",
      sectionsSelected: "sections selected",
    },
    recipients: {
      title: "Recipients",
      description:
        "Email addresses that receive this report. Each can get a different cut later.",
      defaultEmail: "test@mail.com",
      placeholder: "email@company.com",
      add: "Add",
      remove: "Remove",
    },
    delivery: {
      title: "Delivery channels",
      description: "Where to send. Email is universal; others require integration.",
      channels: ["Email", "Slack", "Teams", "Webhook"],
    },
    saveBar: {
      createNotice:
        "Report goes active on save · First run at the next scheduled time",
      editNotice: "Changes apply at the next scheduled run",
      cancel: "Cancel",
      create: "Create report",
      save: "Save changes",
    },
  },
  tr: {
    template: {
      title: "Şablon",
      description:
        "Bir başlangıç noktası seç. Kaydetmeden önce aşağıdaki her şeyi değiştirebilirsin.",
      sections: "bölüm",
    },
    basics: {
      title: "Temel bilgiler",
      name: "Ad",
      cadence: "Sıklık",
      description: "Açıklama",
      sendAt: "Gönderim saati",
      sendOn: "Gönderim zamanı",
      dailyHint: "Yerel saat · örn. 06:00, 18:00",
      weeklyHint: "örn. Pazartesi 08:00",
      monthlyHint: "örn. ayın 1'i 08:00 · veya son cuma",
      quarterlyHint: "örn. çeyreğin 1'i 09:00",
      fallbackTime: "08:00",
    },
    cadence: {
      values: ["Daily", "Weekly", "Monthly", "Quarterly", "On demand"],
      labels: {
        Daily: "Günlük",
        Weekly: "Haftalık",
        Monthly: "Aylık",
        Quarterly: "Çeyreklik",
        "On demand": "İsteğe bağlı",
      },
    },
    content: {
      title: "İçerik",
      description:
        "Bu raporun içereceği bölümleri seç. Her bölüm PDF / e-postada bir başlık olur.",
      of: "/",
      sectionsSelected: "bölüm seçildi",
    },
    recipients: {
      title: "Alıcılar",
      description:
        "Bu raporu alacak e-posta adresleri. Her biri daha sonra farklı bir kesit alabilir.",
      defaultEmail: "test@mail.com",
      placeholder: "email@company.com",
      add: "Ekle",
      remove: "Kaldır",
    },
    delivery: {
      title: "Teslimat kanalları",
      description: "Nereye gönderileceği. E-posta evrenseldir; diğerleri entegrasyon gerektirir.",
      channels: ["Email", "Slack", "Teams", "Webhook"],
    },
    saveBar: {
      createNotice:
        "Rapor kaydedince aktif olur · İlk çalışma bir sonraki planlı zamanda",
      editNotice: "Değişiklikler bir sonraki planlı çalışmada uygulanır",
      cancel: "Vazgeç",
      create: "Rapor oluştur",
      save: "Değişiklikleri kaydet",
    },
  },
} as const;

const appSettingsLanguage = {
  en: {
    title: "Settings",
    description: "Profile, security, notifications, and language.",
    interfaceLanguage: {
      title: "Interface language",
      description:
        "The language Staffbix uses for menus, emails, and notifications to you.",
    },
    aiLanguage: {
      title: "AI default output language",
      description:
        "The language AI workers default to when responding. Per-worker override available in worker settings.",
    },
    regional: {
      title: "Regional formats",
      timezone: "Time zone",
      dateFormat: "Date format",
      currency: "Currency display",
      notice: "Billing is always in USD regardless of display preference",
    },
    timezones: [
      "Europe/Istanbul (UTC+3)",
      "Europe/Berlin (UTC+2)",
      "Europe/London (UTC+1)",
      "America/New_York (UTC-4)",
      "America/Los_Angeles (UTC-7)",
      "Asia/Tokyo (UTC+9)",
    ],
    dateFormats: [
      { value: "DD/MM/YYYY", example: "12/05/2026" },
      { value: "MM/DD/YYYY", example: "05/12/2026" },
      { value: "YYYY-MM-DD", example: "2026-05-12" },
    ],
    currencies: ["USD", "EUR", "GBP", "TRY"],
    actions: {
      cancel: "Cancel",
      save: "Save preferences",
    },
  },
  tr: {
    title: "Ayarlar",
    description: "Profil, güvenlik, bildirimler ve dil.",
    interfaceLanguage: {
      title: "Arayüz dili",
      description:
        "Staffbix'in menüler, e-postalar ve sana gelen bildirimlerde kullandığı dil.",
    },
    aiLanguage: {
      title: "AI varsayılan çıktı dili",
      description:
        "AI çalışanların yanıtlarken varsayılan kullandığı dil. Çalışan ayarlarında kişi bazlı geçersiz kılma var.",
    },
    regional: {
      title: "Bölgesel formatlar",
      timezone: "Saat dilimi",
      dateFormat: "Tarih formatı",
      currency: "Para birimi görünümü",
      notice: "Görüntüleme tercihi ne olursa olsun faturalandırma her zaman USD'dir",
    },
    timezones: [
      "Europe/Istanbul (UTC+3)",
      "Europe/Berlin (UTC+2)",
      "Europe/London (UTC+1)",
      "America/New_York (UTC-4)",
      "America/Los_Angeles (UTC-7)",
      "Asia/Tokyo (UTC+9)",
    ],
    dateFormats: [
      { value: "DD/MM/YYYY", example: "12/05/2026" },
      { value: "MM/DD/YYYY", example: "05/12/2026" },
      { value: "YYYY-MM-DD", example: "2026-05-12" },
    ],
    currencies: ["USD", "EUR", "GBP", "TRY"],
    actions: {
      cancel: "Vazgeç",
      save: "Tercihleri kaydet",
    },
  },
} as const;

const workforceHireRole = {
  en: {
    titlePrefix: "Hire",
    crumbs: {
      workforce: "Workforce",
      hire: "Hire",
    },
    q3: {
      badge: "Coming Q3 2026",
      title: "Not hireable yet.",
      bodyPrefix: "ships in Q3 2026. Below is the configuration this role will accept on launch",
      bodySuffix: "that's what makes it different from the other 60.",
      notify: "Notify me when ready",
      notifySubmitting: "Registering…",
      notifySuccess: "Got it — we'll email you when this role is ready.",
      notifyError: "Couldn't register your interest. Please try again.",
      defaults: "Defaults",
      suggestedName: "Suggested name",
      schedule: "Schedule",
      approvalMode: "Approval mode",
      channels: "Channels",
      criteriaSuffix: "Criteria",
      criteriaDescription:
        "What you'll configure when this role launches. Other roles don't have these.",
      noPreview: "Configuration preview coming closer to launch.",
      exampleTasks: "Example tasks",
      exampleTasksDescription: "The kind of work this worker will do.",
    },
  },
  tr: {
    titlePrefix: "İşe al",
    crumbs: {
      workforce: "İş gücü",
      hire: "İşe al",
    },
    q3: {
      badge: "2026 3. çeyrekte geliyor",
      title: "Henüz işe alınamaz.",
      bodyPrefix: "2026 3. çeyrekte yayınlanacak. Aşağıda bu rolün çıkışta kabul edeceği konfigürasyon var",
      bodySuffix: "onu diğer 60 rolden ayıran şey de bu.",
      notify: "Hazır olduğunda haber ver",
      notifySubmitting: "Kaydediliyor…",
      notifySuccess: "Aldık — bu rol hazır olduğunda sana e-posta göndereceğiz.",
      notifyError: "İlgini kaydedemedik. Lütfen tekrar dene.",
      defaults: "Varsayılanlar",
      suggestedName: "Önerilen ad",
      schedule: "Program",
      approvalMode: "Onay modu",
      channels: "Kanallar",
      criteriaSuffix: "Kriterler",
      criteriaDescription:
        "Bu rol yayınlandığında yapılandıracağın alanlar. Diğer rollerde bunlar yok.",
      noPreview: "Konfigürasyon önizlemesi lansmana yakın gelecek.",
      exampleTasks: "Örnek görevler",
      exampleTasksDescription: "Bu çalışanın yapacağı iş türü.",
    },
  },
} as const;

const appWorkerDetail = {
  en: {
    hiredPrefix: "Hired",
    crumbs: {
      workforce: "Workforce",
    },
    actions: {
      terminate: "Terminate",
      edit: "Edit",
      viewAll: "View all",
    },
    fields: {
      category: "Category",
      schedule: "Schedule",
      approvalMode: "Approval mode",
      workerId: "Worker ID",
      hired: "Hired",
    },
    kpis: {
      messages: "Messages · 7d",
      pendingApprovals: "Pending approvals",
      voiceMatch: "Voice match",
    },
    channels: {
      title: "Channels",
      description: "Where this worker operates.",
    },
    languages: {
      title: "Languages",
      description: "Primary and additional languages this worker uses.",
    },
    activity: {
      title: "Recent activity",
      rows: [
        {
          time: "14:23",
          action: "Drafted email reply to order #1843 (delivery).",
          status: "Sent",
        },
        {
          time: "13:51",
          action: "Routed an angry customer to a human escalation.",
          status: "Escalated",
        },
        {
          time: "12:09",
          action: "Suggested a refund within $50 policy threshold.",
          status: "Approved",
        },
        {
          time: "11:34",
          action: "Updated FAQ with new return-window policy.",
          status: "Live",
        },
      ],
    },
    modal: {
      titlePrefix: "Terminate",
      titleSuffix: "?",
      confirm: "Terminate worker",
      bodyPrefix: "will stop responding immediately across all channels.",
      bodySuffix:
        "Pending approvals are cancelled. The configuration is retained for 30 days.",
      note: "You can rehire within 30 days without losing settings.",
    },
  },
  tr: {
    hiredPrefix: "İşe alındı",
    crumbs: {
      workforce: "İş gücü",
    },
    actions: {
      terminate: "Sonlandır",
      edit: "Düzenle",
      viewAll: "Tümünü gör",
    },
    fields: {
      category: "Kategori",
      schedule: "Program",
      approvalMode: "Onay modu",
      workerId: "Çalışan ID",
      hired: "İşe alınma",
    },
    kpis: {
      messages: "Mesajlar · 7g",
      pendingApprovals: "Bekleyen onaylar",
      voiceMatch: "Ses uyumu",
    },
    channels: {
      title: "Kanallar",
      description: "Bu çalışanın görev yaptığı yerler.",
    },
    languages: {
      title: "Diller",
      description: "Bu çalışanın kullandığı ana ve ek diller.",
    },
    activity: {
      title: "Son aktiviteler",
      rows: [
        {
          time: "14:23",
          action: "#1843 numaralı sipariş için e-posta yanıtı taslağı hazırladı.",
          status: "Gönderildi",
        },
        {
          time: "13:51",
          action: "Öfkeli bir müşteriyi insan eskalasyonuna yönlendirdi.",
          status: "Eskalasyon",
        },
        {
          time: "12:09",
          action: "$50 politika eşiği içinde iade önerdi.",
          status: "Onaylandı",
        },
        {
          time: "11:34",
          action: "Yeni iade süresi politikasıyla SSS'yi güncelledi.",
          status: "Yayında",
        },
      ],
    },
    modal: {
      titlePrefix: "Sonlandır:",
      titleSuffix: "?",
      confirm: "Çalışanı sonlandır",
      bodyPrefix: "tüm kanallarda hemen yanıt vermeyi durduracak.",
      bodySuffix:
        "Bekleyen onaylar iptal edilir. Konfigürasyon 30 gün saklanır.",
      note: "Ayarları kaybetmeden 30 gün içinde yeniden işe alabilirsin.",
    },
  },
} as const;

const conversationsList = {
  en: {
    title: "Conversations",
    description: "Inbound from every channel, threaded by customer.",
    searchPlaceholder: "Search conversations...",
    noMatches: "No conversations match this filter.",
    channels: {
      All: "All",
      Web: "Web",
      WhatsApp: "WhatsApp",
      Email: "Email",
      IG: "IG",
      FB: "FB",
      Telegram: "Telegram",
    },
    states: {
      Active: "Active",
      Waiting: "Waiting",
      Escalated: "Escalated",
      Closed: "Closed",
    },
    conversations: [
      {
        id: "cnv_5xz9",
        channel: "Web",
        customer: { initials: "AL", name: "Ada Lovelace" },
        worker: "Customer Support",
        lastMessage: "Perfect, thank you! I'll wait for the carrier update.",
        unread: 0,
        state: "Closed",
        updated: "1 min",
      },
      {
        id: "cnv_5xz8",
        channel: "WhatsApp",
        customer: { initials: "MJ", name: "Marie Janssen" },
        worker: "Customer Support",
        lastMessage: "Where's my order? It's been 7 days now.",
        unread: 2,
        state: "Escalated",
        updated: "3 min",
      },
      {
        id: "cnv_5xz7",
        channel: "Email",
        customer: { initials: "KO", name: "Kenan Öz" },
        worker: "Inbound Sales",
        lastMessage: "Could you walk me through the Business tier please?",
        unread: 1,
        state: "Active",
        updated: "8 min",
      },
      {
        id: "cnv_5xz6",
        channel: "IG",
        customer: { initials: "TS", name: "@tomsbeard" },
        worker: "Social Media",
        lastMessage: "Do you ship to Portugal?",
        unread: 0,
        state: "Waiting",
        updated: "12 min",
      },
      {
        id: "cnv_5xz5",
        channel: "Web",
        customer: { initials: "RP", name: "Rhea Patel" },
        worker: "Customer Support",
        lastMessage: "I'd like to return order #1801 (size issue).",
        unread: 0,
        state: "Active",
        updated: "21 min",
      },
      {
        id: "cnv_5xz4",
        channel: "Telegram",
        customer: { initials: "SS", name: "Sven Soren" },
        worker: "Customer Support",
        lastMessage: "Discount code didn't apply at checkout.",
        unread: 1,
        state: "Active",
        updated: "34 min",
      },
      {
        id: "cnv_5xz3",
        channel: "FB",
        customer: { initials: "OG", name: "Oda Gartner" },
        worker: "Social Media",
        lastMessage: "When will the down jacket be back in M?",
        unread: 0,
        state: "Waiting",
        updated: "1 hr",
      },
      {
        id: "cnv_5xz2",
        channel: "Email",
        customer: { initials: "JK", name: "Jana Kowalski" },
        worker: "Account Manager",
        lastMessage: "Renewal looks good. Sending PO this week.",
        unread: 0,
        state: "Active",
        updated: "2 hr",
      },
    ],
  },
  tr: {
    title: "Konuşmalar",
    description: "Her kanaldan gelen konuşmalar, müşteriye göre gruplanmış.",
    searchPlaceholder: "Konuşmalarda ara...",
    noMatches: "Bu filtreyle eşleşen konuşma yok.",
    channels: {
      All: "Tümü",
      Web: "Web",
      WhatsApp: "WhatsApp",
      Email: "E-posta",
      IG: "IG",
      FB: "FB",
      Telegram: "Telegram",
    },
    states: {
      Active: "Aktif",
      Waiting: "Bekliyor",
      Escalated: "Eskalasyon",
      Closed: "Kapalı",
    },
    conversations: [
      {
        id: "cnv_5xz9",
        channel: "Web",
        customer: { initials: "AL", name: "Ada Lovelace" },
        worker: "Müşteri Destek",
        lastMessage: "Harika, teşekkürler! Kargo güncellemesini bekleyeceğim.",
        unread: 0,
        state: "Closed",
        updated: "1 dk",
      },
      {
        id: "cnv_5xz8",
        channel: "WhatsApp",
        customer: { initials: "MJ", name: "Marie Janssen" },
        worker: "Müşteri Destek",
        lastMessage: "Siparişim nerede? 7 gün oldu.",
        unread: 2,
        state: "Escalated",
        updated: "3 dk",
      },
      {
        id: "cnv_5xz7",
        channel: "Email",
        customer: { initials: "KO", name: "Kenan Öz" },
        worker: "Gelen Satış",
        lastMessage: "Business paketini adım adım anlatabilir misiniz?",
        unread: 1,
        state: "Active",
        updated: "8 dk",
      },
      {
        id: "cnv_5xz6",
        channel: "IG",
        customer: { initials: "TS", name: "@tomsbeard" },
        worker: "Sosyal Medya",
        lastMessage: "Portekiz'e gönderim yapıyor musunuz?",
        unread: 0,
        state: "Waiting",
        updated: "12 dk",
      },
      {
        id: "cnv_5xz5",
        channel: "Web",
        customer: { initials: "RP", name: "Rhea Patel" },
        worker: "Müşteri Destek",
        lastMessage: "#1801 numaralı siparişi iade etmek istiyorum.",
        unread: 0,
        state: "Active",
        updated: "21 dk",
      },
      {
        id: "cnv_5xz4",
        channel: "Telegram",
        customer: { initials: "SS", name: "Sven Soren" },
        worker: "Müşteri Destek",
        lastMessage: "İndirim kodu ödeme ekranında uygulanmadı.",
        unread: 1,
        state: "Active",
        updated: "34 dk",
      },
      {
        id: "cnv_5xz3",
        channel: "FB",
        customer: { initials: "OG", name: "Oda Gartner" },
        worker: "Sosyal Medya",
        lastMessage: "Şişme montun M bedeni ne zaman stokta olacak?",
        unread: 0,
        state: "Waiting",
        updated: "1 sa",
      },
      {
        id: "cnv_5xz2",
        channel: "Email",
        customer: { initials: "JK", name: "Jana Kowalski" },
        worker: "Hesap Yöneticisi",
        lastMessage: "Yenileme iyi görünüyor. PO'yu bu hafta göndereceğim.",
        unread: 0,
        state: "Active",
        updated: "2 sa",
      },
    ],
  },
} as const;

const appWorkforceHireCatalog = {
  en: {
    title: "Hire from catalog",
    description: "64 roles, all hireable today. Configuration is editable after hire.",
    crumbs: {
      workforce: "Workforce",
      hire: "Hire",
    },
    showRoadmap: "Show roadmap roles",
    searchPlaceholder: "Search roles...",
    roleSingular: "role",
    rolePlural: "roles",
    noMatches: "No roles match this filter.",
    available: "Available",
    comingQ3: "Coming Q3",
    hireAsEmployee: "Hire as employee",
    notifyWhenAvailable: "Notify me when available",
    categories: {
      All: "All",
      "Customer-facing": "Customer-facing",
      Sales: "Sales",
      Marketing: "Marketing",
      Operations: "Operations",
      Finance: "Finance",
      Leadership: "Leadership",
    },
    planLimit: {
      warnTitle: "Plan limit — approaching",
      warnBody:
        "You're nearing your AI-worker cap. Upgrade your plan if you'll need more workers soon.",
      blockTitle: "Plan limit — reached",
      blockBody:
        "You've reached your AI-worker cap. Terminate an inactive worker or upgrade your plan to hire more.",
      hint: "{current} / {limit} workers active",
      cta: "Upgrade plan",
    },
  },
  tr: {
    title: "Katalogdan işe al",
    description: "64 rol, hepsi bugün işe alınabilir. Konfigürasyon işe aldıktan sonra düzenlenebilir.",
    crumbs: {
      workforce: "İş gücü",
      hire: "İşe al",
    },
    showRoadmap: "Yol haritası rollerini göster",
    searchPlaceholder: "Rollerde ara...",
    roleSingular: "rol",
    rolePlural: "rol",
    noMatches: "Bu filtreyle eşleşen rol yok.",
    available: "Mevcut",
    comingQ3: "3. çeyrekte",
    hireAsEmployee: "Çalışan olarak işe al",
    notifyWhenAvailable: "Hazır olduğunda haber ver",
    categories: {
      All: "Tümü",
      "Customer-facing": "Müşteriyle temas",
      Sales: "Satış",
      Marketing: "Pazarlama",
      Operations: "Operasyon",
      Finance: "Finans",
      Leadership: "Liderlik",
    },
    planLimit: {
      warnTitle: "Plan limiti — yaklaşıyor",
      warnBody:
        "AI çalışan limitine yaklaşıyorsun. Yakında daha fazla çalışan gerekirse planını yükselt.",
      blockTitle: "Plan limiti — doldu",
      blockBody:
        "AI çalışan limitine ulaştın. Yenisini işe almak için aktif olmayan bir çalışanı sonlandır ya da planını yükselt.",
      hint: "{current} / {limit} çalışan aktif",
      cta: "Planı yükselt",
    },
  },
} as const;

const appHelp = {
  en: {
    title: "Help",
    description:
      "Everything you need to run your AI workforce — quickstart, agent guides, integrations, plans, and troubleshooting.",
    crumbs: {
      help: "Help",
      topics: "Topics",
      agents: "AI agents",
    },
    sections: {
      topics: "Topics",
      agents: "AI agents — step-by-step",
      agentsDescription:
        "64 hireable roles. Each page covers what the agent does, integrations to wire up first, the activation steps, example tasks, and tips.",
    },
    backToIndex: "Back to help",
    relatedTopics: "Related topics",
    machineTranslationBanner:
      "This page is shown in English because we haven't authored a professional translation in your language yet. The page is otherwise accurate. Tell us if you spot a mistake in the live translation we ship.",
    notFound: {
      title: "Topic not found",
      body: "The help topic you tried to reach doesn't exist. Use the index below to find what you need.",
    },
    agent: {
      whatItDoes: "What it does",
      integrationsRequired: "Integrations to wire up first",
      activation: "Activation — step by step",
      exampleTasks: "Example tasks",
      approval: "Approval & autonomy",
      tips: "Tips",
      hireCta: "Hire this agent",
    },
  },
  tr: {
    title: "Yardım",
    description:
      "AI iş gücünü yönetmek için ihtiyacın olan her şey — hızlı başlangıç, ajan kılavuzları, entegrasyonlar, planlar ve sorun giderme.",
    crumbs: {
      help: "Yardım",
      topics: "Konular",
      agents: "AI ajanlar",
    },
    sections: {
      topics: "Konular",
      agents: "AI ajanlar — adım adım",
      agentsDescription:
        "İşe alınabilir 64 rol. Her sayfa ajanın ne yaptığını, önce bağlanması gereken entegrasyonları, etkinleştirme adımlarını, örnek görevleri ve ipuçlarını kapsar.",
    },
    backToIndex: "Yardıma dön",
    relatedTopics: "İlgili konular",
    machineTranslationBanner:
      "Bu sayfa, dilinde henüz profesyonel çeviri yazmadığımız için İngilizce gösteriliyor. Sayfa içeriği bunun dışında doğru. Yayınladığımız çeviride bir hata görürsen bize söyle.",
    notFound: {
      title: "Konu bulunamadı",
      body:
        "Ulaşmaya çalıştığın yardım konusu yok. İhtiyacın olanı bulmak için aşağıdaki dizini kullan.",
    },
    agent: {
      whatItDoes: "Ne yapar",
      integrationsRequired: "Önce bağlanacak entegrasyonlar",
      activation: "Etkinleştirme — adım adım",
      exampleTasks: "Örnek görevler",
      approval: "Onay ve otonomi",
      tips: "İpuçları",
      hireCta: "Bu ajanı işe al",
    },
  },
} as const;

const appReportEditor = {
  en: {
    newTitle: "New report",
    newDescription:
      "Pick a template, then customize cadence, sections, recipients, and delivery.",
    editTitlePrefix: "Edit",
    editDescription: "Changes apply at the next scheduled run.",
    crumbs: {
      reports: "Reports",
      new: "New",
      edit: "Edit",
    },
  },
  tr: {
    newTitle: "Yeni rapor",
    newDescription:
      "Bir şablon seç, ardından sıklık, bölümler, alıcılar ve teslimatı özelleştir.",
    editTitlePrefix: "Düzenle",
    editDescription: "Değişiklikler bir sonraki planlı çalışmada uygulanır.",
    crumbs: {
      reports: "Raporlar",
      new: "Yeni",
      edit: "Düzenle",
    },
  },
} as const;

const appWorkerEditor = {
  en: {
    titlePrefix: "Configure",
    hiredPrefix: "Hired",
    crumbs: {
      workforce: "Workforce",
      edit: "Edit",
    },
  },
  tr: {
    titlePrefix: "Yapılandır",
    hiredPrefix: "İşe alındı",
    crumbs: {
      workforce: "İş gücü",
      edit: "Düzenle",
    },
  },
} as const;

export function getWorkforcePageCopy(locale: Locale) {
  return getCopy(workforce, locale);
}

export function getAboutPageCopy(locale: Locale) {
  return getCopy(about, locale);
}

export function getBrandBiblePageCopy(locale: Locale) {
  return getCopy(brandBible, locale);
}

export function getApprovalCenterPageCopy(locale: Locale) {
  return getCopy(approvalCenter, locale);
}

export function getPricingPageCopy(locale: Locale) {
  return getCopy(pricing, locale);
}

export function getCustomersPageCopy(locale: Locale) {
  return getCopy(customers, locale);
}

export function getCareersPageCopy(locale: Locale) {
  return getCopy(careers, locale);
}

export function getPressPageCopy(locale: Locale) {
  return getCopy(press, locale);
}

export function getChangelogPageCopy(locale: Locale) {
  return getCopy(changelog, locale);
}

export function getContactPageCopy(locale: Locale) {
  return getCopy(contact, locale);
}

export function getDocsLayoutCopy(locale: Locale) {
  return getCopy(docsLayout, locale);
}

export function getDocsPageCopy(locale: Locale) {
  return getCopy(docsHome, locale);
}

export function getDocsApiPageCopy(locale: Locale) {
  return getCopy(docsApi, locale);
}

export function getDocsSdksPageCopy(locale: Locale) {
  return getCopy(docsSdks, locale);
}

export function getDocsWebhooksPageCopy(locale: Locale) {
  return getCopy(docsWebhooks, locale);
}

export function getDocsAuthPageCopy(locale: Locale) {
  return getCopy(docsAuth, locale);
}

export function getDocsErrorsPageCopy(locale: Locale) {
  return getCopy(docsErrors, locale);
}

export function getDocsApiBrandBiblePageCopy(locale: Locale) {
  return getCopy(docsApiBrandBible, locale);
}

export function getDocsApiWorkersPageCopy(locale: Locale) {
  return getCopy(docsApiWorkers, locale);
}

export function getDocsApiConversationsPageCopy(locale: Locale) {
  return getCopy(docsApiConversations, locale);
}

export function getDocsApiApprovalsPageCopy(locale: Locale) {
  return getCopy(docsApiApprovals, locale);
}

export function getDocsApiReportsPageCopy(locale: Locale) {
  return getCopy(docsApiReports, locale);
}

export function getDocsSdkTypescriptPageCopy(locale: Locale) {
  return getCopy(docsSdkTypescript, locale);
}

export function getDocsSdkPythonPageCopy(locale: Locale) {
  return getCopy(docsSdkPython, locale);
}

export function getDocsSdkPhpPageCopy(locale: Locale) {
  return getCopy(docsSdkPhp, locale);
}

export function getDocsSdkGoPageCopy(locale: Locale) {
  return getCopy(docsSdkGo, locale);
}

export function getDocsGuideWidgetPageCopy(locale: Locale) {
  return getCopy(docsGuideWidget, locale);
}

export function getDocsGuideWhatsappPageCopy(locale: Locale) {
  return getCopy(docsGuideWhatsapp, locale);
}

export function getDocsRateLimitsPageCopy(locale: Locale) {
  return getCopy(docsRateLimits, locale);
}

export function getAuthCopy(locale: Locale) {
  return getCopy(auth, locale);
}

export function getAcceptInvitationCopy(locale: Locale) {
  const selected =
    (acceptInvitationLocaleMap as Record<string, typeof acceptInvitationEn>)[locale] ??
    acceptInvitationEn;
  return localizeCopy(selected, locale);
}

export function getLegalLayoutCopy(locale: Locale) {
  return getCopy(legalLayout, locale);
}

export function getLegalSecurityPageCopy(locale: Locale) {
  return getCopy(legalSecurity, locale);
}

export function getLegalCookiesPageCopy(locale: Locale) {
  return getCopy(legalCookies, locale);
}

export function getLegalDpaPageCopy(locale: Locale) {
  return getCopy(legalDpa, locale);
}

export function getLegalPrivacyPageCopy(locale: Locale) {
  return getCopy(legalPrivacy, locale);
}

export function getLegalTermsPageCopy(locale: Locale) {
  return getCopy(legalTerms, locale);
}

export function getAppIntegrationsCopy(locale: Locale) {
  return getCopy(appIntegrations, locale);
}

export function getAppDashboardCopy(locale: Locale) {
  return getCopy(appDashboard, locale);
}

export function getAppBillingCopy(locale: Locale) {
  return getCopy(appBilling, locale);
}

export function getAppHelpCopy(locale: Locale) {
  return getCopy(appHelp, locale);
}

export function getAppTeamCopy(locale: Locale) {
  return getCopy(appTeam, locale);
}

export function getAppSettingsSecurityCopy(locale: Locale) {
  return getCopy(appSettingsSecurity, locale);
}

export function getWorkerHireFormCopy(locale: Locale) {
  return getCopy(workerHireForm, locale);
}

export function getReportDetailCopy(locale: Locale) {
  return getCopy(reportDetail, locale);
}

export function getAppSettingsNotificationsCopy(locale: Locale) {
  return getCopy(appSettingsNotifications, locale);
}

export function getConversationDetailCopy(locale: Locale) {
  return getCopy(conversationDetail, locale);
}

export function getAppApprovalsCopy(locale: Locale) {
  return getCopy(appApprovals, locale);
}

export function getReportsListCopy(locale: Locale) {
  return getCopy(reportsList, locale);
}

export function getAppBrandBibleCopy(locale: Locale) {
  return getCopy(appBrandBible, locale);
}

export function getAppLogsCopy(locale: Locale) {
  return getCopy(appLogs, locale);
}

export function getAppWorkforceListCopy(locale: Locale) {
  return getCopy(appWorkforceList, locale);
}

export function getAppSettingsProfileCopy(locale: Locale) {
  return getCopy(appSettingsProfile, locale);
}

export function getReportFormCopy(locale: Locale) {
  return getCopy(reportForm, locale);
}

export function getAppSettingsLanguageCopy(locale: Locale) {
  return getCopy(appSettingsLanguage, locale);
}

export function getWorkforceHireRoleCopy(locale: Locale) {
  return getCopy(workforceHireRole, locale);
}

export function getAppWorkerDetailCopy(locale: Locale) {
  return getCopy(appWorkerDetail, locale);
}

export function getConversationsListCopy(locale: Locale) {
  return getCopy(conversationsList, locale);
}

export function getAppWorkforceHireCatalogCopy(locale: Locale) {
  return getCopy(appWorkforceHireCatalog, locale);
}

export function getAppReportEditorCopy(locale: Locale) {
  return getCopy(appReportEditor, locale);
}

export function getAppWorkerEditorCopy(locale: Locale) {
  return getCopy(appWorkerEditor, locale);
}
