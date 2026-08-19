import type { Locale } from "@/lib/i18n/config";
import type { Role } from "@/lib/roles";
import type { AgentEnrichment, LocalizedAgent } from "./types";
import { GENERATED_HELP_TRANSLATIONS } from "./translations.generated";
import { GENERATED_AGENT_HELP } from "./agents-enriched.generated";

/**
 * Per-agent rich help. Each entry expands the role-catalog row with the
 * step-by-step + integration guide that operators actually need.
 *
 * Authoring policy:
 *   - Every slug here is opt-in. Roles without an entry render through
 *     `buildFallbackAgentHelp` — a baseline page that pulls from the
 *     catalog summary + channels so we always have something to show.
 *   - EN + TR are authored natively. Other locales fall back to EN via
 *     `getAgentHelp` and the page renders the machine-translation
 *     banner per the existing convention.
 *   - Keep the prose short: each section under 60 words. Operators
 *     skim help pages, they don't read them.
 */
export const ENRICHMENT: AgentEnrichment[] = [
  {
    slug: "customer-support",
    content: {
      en: {
        title: "Customer Support",
        tagline:
          "First-line replies on chat, WhatsApp, and email. Knows your products, policies, and limits.",
        whatItDoes: [
          "Answers product, order, and policy questions across web chat, WhatsApp, and email — in 23 languages.",
          "Cites your Brand Bible for every factual claim. If the answer isn't in the Bible, it escalates instead of guessing.",
          "Drafts refunds and policy exceptions but always queues them for your sign-off, even on Auto mode.",
        ],
        integrationsRequired: [
          "Email SMTP (for email replies).",
          "WhatsApp Cloud API (for WhatsApp).",
          "The Brand Bible should at least include your refund policy and contact rules.",
        ],
        steps: [
          "Connect your SMTP integration if you want email replies.",
          "Connect WhatsApp if you want WhatsApp replies.",
          "Ingest your refund + returns policy and product catalog into Brand Bible.",
          "Hire the Customer Support role. Pick the channels you connected.",
          "Set approval mode to Approval required for the first week.",
          "Send a test message. Approve the draft from Approval Center. After a week of good drafts, flip individual channels to Auto.",
        ],
        exampleTasks: [
          "Reply to 'Where's my order?' with the Stripe / Shopify order status.",
          "Issue a refund request when the customer cites a policy you've published.",
          "Escalate to a human when the customer asks for a discount the worker isn't authorised to give.",
          "Translate an inbound German email and reply in German, citing your Brand Bible.",
        ],
        approvalNote:
          "Approval required for the first week. Refund drafts always queue — they don't auto-send.",
        tips: [
          "Add concrete examples of past replies you liked to the Brand Bible — the worker learns your tone faster from examples than from instructions.",
          "Put your hard rules in the worker's custom instructions field, not the Brand Bible. The instructions field is read on every call; the Bible is consulted only when relevant.",
        ],
      },
      tr: {
        title: "Müşteri Destek",
        tagline:
          "Sohbet, WhatsApp ve e-postada birinci hat yanıt. Ürünlerini, politikalarını ve sınırlarını bilir.",
        whatItDoes: [
          "Web sohbeti, WhatsApp ve e-postada ürün, sipariş ve politika sorularını 23 dilde yanıtlar.",
          "Her olgusal iddia için Brand Bible'a referans verir. Yanıt Bible'da yoksa tahmin yerine eskale eder.",
          "İade ve politika istisnası taslakları hazırlar ama Otomatik modda bile her zaman onayın için kuyruğa alır.",
        ],
        integrationsRequired: [
          "E-posta SMTP (e-posta yanıtları için).",
          "WhatsApp Cloud API (WhatsApp için).",
          "Brand Bible en azından iade politikanı ve iletişim kurallarını içermeli.",
        ],
        steps: [
          "E-posta yanıtı istiyorsan SMTP entegrasyonunu bağla.",
          "WhatsApp yanıtı istiyorsan WhatsApp'ı bağla.",
          "İade + geri ödeme politikanı ve ürün kataloğunu Brand Bible'a al.",
          "Müşteri Destek rolünü işe al. Bağladığın kanalları seç.",
          "İlk hafta için onay modunu Onay gerekli yap.",
          "Bir test mesajı gönder. Onay Merkezi'nden taslağı onayla. Bir hafta iyi taslaklardan sonra kanalları tek tek Otomatik'e geçir.",
        ],
        exampleTasks: [
          "'Siparişim nerede?' sorusunu Stripe / Shopify sipariş durumuyla yanıtla.",
          "Müşteri yayınladığın bir politikaya atıfta bulunduğunda iade talebi çıkar.",
          "Çalışanın yetkisi olmayan bir indirimi müşteri isterse insana eskale et.",
          "Almanca gelen bir e-postayı çevir ve Brand Bible'a atıfla Almanca yanıtla.",
        ],
        approvalNote:
          "İlk hafta Onay gerekli. İade taslakları her zaman kuyruğa alınır — otomatik gönderilmez.",
        tips: [
          "Brand Bible'a beğendiğin geçmiş yanıtların somut örneklerini ekle — çalışan tonunu talimatlardan değil, örneklerden daha hızlı öğrenir.",
          "Sert kuralları çalışanın özel talimatlar alanına koy, Brand Bible'a değil. Talimatlar alanı her çağrıda okunur; Bible yalnızca konuyla ilgili olduğunda.",
        ],
      },
    },
  },
  {
    slug: "inbound-sales",
    content: {
      en: {
        title: "Inbound Sales Closer",
        tagline:
          "Qualifies inbound leads, books meetings, follows up — and hands off when a human should close.",
        whatItDoes: [
          "Engages every inbound lead on web or email within seconds. Asks the qualifying questions you specify.",
          "Books meetings against your calendar (Calendly / Google Calendar) directly.",
          "Runs follow-up sequences for cold replies. Stops the sequence the moment a human reply lands.",
        ],
        integrationsRequired: [
          "Email SMTP (for the follow-ups).",
          "A calendar (Google / Calendly) for meeting booking.",
          "Brand Bible with your pricing + qualification rules.",
        ],
        steps: [
          "Connect SMTP and Calendar.",
          "Ingest your sales playbook + ICP into Brand Bible.",
          "Hire Inbound Sales Closer. Put your qualification rules in the custom instructions ('Refuse meetings if budget < $X; route ICP-fit replies to me').",
          "Wire your website's contact form / chat widget to the worker's web channel.",
          "Watch the first 20 conversations in Conversations; approve any messages that need a human touch.",
        ],
        exampleTasks: [
          "Reply to a contact-form submission within 30 seconds and propose three meeting times.",
          "Disqualify a lead politely when their budget is below the floor you've set.",
          "Re-engage a stalled prospect after 3 days with a relevant case study.",
        ],
        approvalNote:
          "Approval required for the first 50 conversations. Meeting bookings always require your sign-off.",
        tips: [
          "Spell out the disqualification path in custom instructions. The worker is good at saying yes; you have to teach it when to say no.",
        ],
      },
      tr: {
        title: "Gelen Satış Kapatıcısı",
        tagline:
          "Gelen ilgileri elerken nitelendirir, görüşme ayarlar, takip eder — ve insan kapatmalıysa devreder.",
        whatItDoes: [
          "Web veya e-postadaki her gelen ilgiyi saniyeler içinde karşılar. Belirlediğin nitelendirme sorularını sorar.",
          "Takvimine (Calendly / Google Takvim) doğrudan görüşme ayarlar.",
          "Soğuk yanıtlar için takip dizileri çalıştırır. İnsan yanıtı geldiği an diziyi durdurur.",
        ],
        integrationsRequired: [
          "E-posta SMTP (takipler için).",
          "Görüşme ayarlamak için bir takvim (Google / Calendly).",
          "Fiyatlandırma + nitelendirme kurallarını içeren Brand Bible.",
        ],
        steps: [
          "SMTP ve Takvim'i bağla.",
          "Satış playbook'unu + ICP'ni Brand Bible'a al.",
          "Gelen Satış Kapatıcısı'nı işe al. Nitelendirme kurallarını özel talimatlara koy ('Bütçe < $X ise görüşmeyi reddet; ICP-fit yanıtları bana yönlendir').",
          "Web sitendeki iletişim formunu / sohbet widget'ını çalışanın web kanalına bağla.",
          "Konuşmalar'da ilk 20 konuşmayı izle; insan dokunuşu gerektiren mesajları onayla.",
        ],
        exampleTasks: [
          "Bir iletişim-formu gönderimini 30 saniye içinde yanıtla ve üç görüşme saati öner.",
          "Bütçesi belirlediğin tabanın altında olan bir ilgiyi nazikçe diskalifiye et.",
          "3 gün sessiz kalan bir potansiyel müşteriyi alakalı bir vaka çalışmasıyla tekrar yakalat.",
        ],
        approvalNote:
          "İlk 50 konuşma için Onay gerekli. Görüşme rezervasyonları her zaman onayını ister.",
        tips: [
          "Diskalifiye yolunu özel talimatlarda net yaz. Çalışan evet demekte iyidir; hayır demeyi sen öğretmelisin.",
        ],
      },
    },
  },
  {
    slug: "social-media",
    content: {
      en: {
        title: "Social Media Manager",
        tagline: "Drafts and schedules posts across IG, X, FB, LinkedIn. Replies to comments and DMs.",
        whatItDoes: [
          "Generates platform-specific drafts (length, tone, hashtags) from a single content brief.",
          "Schedules to your connected accounts at the cadence you set per channel.",
          "Triages comments + DMs: questions go to the worker; spam / negative sentiment lands in your queue.",
        ],
        integrationsRequired: [
          "Per-platform OAuth (IG, X, FB, LinkedIn) on Integrations → Social.",
          "Brand Bible — voice guide + product photos.",
        ],
        steps: [
          "Connect at least one social platform.",
          "Ingest your voice guide and 5–10 example posts into Brand Bible.",
          "Hire Social Media Manager.",
          "Define a cadence per channel (e.g., IG 1/day, LinkedIn 3/week).",
          "Send the first week through Approval required. Every draft you edit teaches the worker.",
        ],
        exampleTasks: [
          "Repurpose a long-form blog post into a 4-tweet thread and an IG carousel.",
          "Reply to comment-section questions with citations to your help center.",
          "Flag a hateful DM for human review, archive it, and continue triage.",
        ],
        approvalNote:
          "Approval required by default. Real publishing today requires the per-platform OAuth — see status on the Integrations page.",
        tips: [
          "Don't try to schedule everything at once. Start with one channel and one post type.",
        ],
      },
      tr: {
        title: "Sosyal Medya Yöneticisi",
        tagline:
          "IG, X, FB, LinkedIn'de gönderi taslakları ve programlama. Yorum ve DM'lere yanıt.",
        whatItDoes: [
          "Tek bir içerik özetinden platforma-özel taslaklar üretir (uzunluk, ton, hashtag).",
          "Bağlı hesaplarına, kanal başına belirlediğin sıklıkta programlar.",
          "Yorum ve DM'leri elemden geçirir: sorular çalışana gider; spam / olumsuz duygu senin kuyruğuna düşer.",
        ],
        integrationsRequired: [
          "Entegrasyonlar → Sosyal'de platform başına OAuth (IG, X, FB, LinkedIn).",
          "Brand Bible — ses kılavuzu + ürün fotoğrafları.",
        ],
        steps: [
          "En az bir sosyal platformu bağla.",
          "Ses kılavuzunu ve 5–10 örnek gönderiyi Brand Bible'a al.",
          "Sosyal Medya Yöneticisi'ni işe al.",
          "Kanal başına bir sıklık tanımla (örn. IG 1/gün, LinkedIn 3/hafta).",
          "İlk haftayı Onay gerekli'de geçir. Düzenlediğin her taslak çalışana öğretir.",
        ],
        exampleTasks: [
          "Uzun bir blog yazısını 4-tweet'lik bir thread ve IG carousel'e dönüştür.",
          "Yorum bölümü sorularını yardım merkezine atıflarla yanıtla.",
          "Nefret içeren bir DM'yi insan incelemesine işaretle, arşivle ve eleme devam et.",
        ],
        approvalNote:
          "Varsayılan olarak Onay gerekli. Bugün gerçek yayınlama platform-başına OAuth ister — Entegrasyonlar sayfasında durumu gör.",
        tips: [
          "Her şeyi bir anda programlamaya çalışma. Bir kanal ve bir gönderi türüyle başla.",
        ],
      },
    },
  },
  {
    slug: "seo-specialist",
    content: {
      en: {
        title: "SEO Specialist",
        tagline:
          "Audits your site, picks keywords, writes the content, fixes the meta.",
        whatItDoes: [
          "Crawls your site, scores each page on technical + content SEO, and publishes a prioritised audit report.",
          "Picks keyword opportunities based on your product space + competitor visibility.",
          "Writes briefs (sent to the Content Writer) and fixes meta titles / descriptions inline on the page.",
        ],
        integrationsRequired: [
          "WordPress, Shopify, or webhook integration for the CMS where edits land.",
          "Optional: Search Console for query data.",
          "Brand Bible — product list + glossary.",
        ],
        steps: [
          "Connect your CMS.",
          "Ingest product catalog + glossary into Brand Bible.",
          "Hire SEO Specialist. Set approval mode to Approval required (meta edits are reversible but you want to see them first).",
          "The worker runs a baseline audit on first start. Review it from the worker's detail page.",
        ],
        exampleTasks: [
          "Identify the 10 product pages with the largest unrealised search volume.",
          "Draft new meta titles + descriptions for those 10 pages.",
          "Brief the Content Writer to produce 3 long-tail articles per month based on the audit.",
        ],
        approvalNote:
          "Approval required by default. Inline meta edits queue as one batch per page.",
        tips: [
          "Pair the SEO Specialist with the Content Writer. Solo, the SEO Specialist surfaces opportunities; the duo executes on them.",
        ],
      },
      tr: {
        title: "SEO Uzmanı",
        tagline:
          "Siteni denetler, anahtar kelimeleri seçer, içeriği yazar, meta'yı düzeltir.",
        whatItDoes: [
          "Sitenizi tarar, her sayfayı teknik + içerik SEO açısından puanlar ve önceliklendirilmiş bir denetim raporu yayınlar.",
          "Ürün alanına + rakip görünürlüğüne dayalı anahtar kelime fırsatları seçer.",
          "Brief'ler yazar (İçerik Yazarı'na gönderilir) ve sayfada meta başlık / açıklamaları inline düzeltir.",
        ],
        integrationsRequired: [
          "Düzenlemelerin gideceği CMS için WordPress, Shopify veya webhook entegrasyonu.",
          "Opsiyonel: Sorgu verisi için Search Console.",
          "Brand Bible — ürün listesi + sözlük.",
        ],
        steps: [
          "CMS'ini bağla.",
          "Ürün kataloğu + sözlüğü Brand Bible'a al.",
          "SEO Uzmanı'nı işe al. Onay modunu Onay gerekli yap (meta düzenlemeleri geri alınabilir ama önce görmek istersin).",
          "Çalışan ilk başlangıçta bir taban denetimi çalıştırır. Çalışan detay sayfasından incele.",
        ],
        exampleTasks: [
          "En büyük gerçekleşmemiş arama hacmine sahip 10 ürün sayfasını belirle.",
          "Bu 10 sayfa için yeni meta başlık + açıklama taslakları hazırla.",
          "Denetime dayalı olarak İçerik Yazarı'na ayda 3 long-tail makale üretmesi için brief gönder.",
        ],
        approvalNote:
          "Varsayılan olarak Onay gerekli. Inline meta düzenlemeleri sayfa başına tek bir parti olarak kuyruğa alınır.",
        tips: [
          "SEO Uzmanı'nı İçerik Yazarı ile eşleştir. Tek başına SEO Uzmanı fırsatları yüzeye çıkarır; ikili bu fırsatları uygular.",
        ],
      },
    },
  },
  {
    slug: "bookkeeping",
    content: {
      en: {
        title: "Bookkeeping Assistant",
        tagline: "Tracks income, expenses, and invoices. Monthly report to your accountant.",
        whatItDoes: [
          "Pulls transactions from Stripe + your bank (via Plaid / Open Banking) on a schedule.",
          "Categorises each transaction against a chart of accounts you provide.",
          "Generates a month-end pack: P&L summary, expense breakdown, anomalies, and a CSV your accountant can import.",
        ],
        integrationsRequired: [
          "Stripe (mandatory).",
          "Bank integration (Plaid / Open Banking) for non-Stripe income + expenses.",
          "Brand Bible — your chart of accounts and any vendor-specific categorisation rules.",
        ],
        steps: [
          "Connect Stripe.",
          "Connect your bank (Plaid for US, Tink for EU).",
          "Upload your chart of accounts into Brand Bible.",
          "Hire Bookkeeping Assistant. Set approval mode to Approval required for the first month.",
          "Review the first weekly categorisation batch. Approve / reject — these decisions teach the worker.",
        ],
        exampleTasks: [
          "Categorise 200 transactions for the previous week and surface 3 that look unusual.",
          "Generate the May P&L summary and email it to the configured accountant.",
          "Flag a refund that looks like fraud.",
        ],
        approvalNote:
          "Approval required for the first month. Switching to Auto only recommended once your categorisation accuracy stabilises above 95%.",
        tips: [
          "Don't skip the chart of accounts. The worker without one will invent categories that don't match your accountant's books.",
        ],
      },
      tr: {
        title: "Muhasebe Asistanı",
        tagline:
          "Gelir, gider ve faturaları takip eder. Muhasebecine aylık rapor.",
        whatItDoes: [
          "Stripe + bankandan (Plaid / Açık Bankacılık üzerinden) program dahilinde işlemleri çeker.",
          "Her işlemi sağladığın hesap planına göre kategorize eder.",
          "Ay sonu paketi üretir: K&Z özeti, gider dağılımı, sapmalar ve muhasebecinin içe aktarabileceği bir CSV.",
        ],
        integrationsRequired: [
          "Stripe (zorunlu).",
          "Stripe dışı gelir + gider için banka entegrasyonu (Plaid / Açık Bankacılık).",
          "Brand Bible — hesap planın ve satıcı-özel kategorize etme kuralların.",
        ],
        steps: [
          "Stripe'ı bağla.",
          "Bankanı bağla (ABD için Plaid, AB için Tink).",
          "Hesap planını Brand Bible'a yükle.",
          "Muhasebe Asistanı'nı işe al. İlk ay için onay modunu Onay gerekli yap.",
          "İlk haftalık kategorize etme partisini incele. Onayla / reddet — bu kararlar çalışana öğretir.",
        ],
        exampleTasks: [
          "Önceki haftanın 200 işlemini kategorize et ve sıra dışı görünen 3'ünü öne çıkar.",
          "Mayıs K&Z özetini oluştur ve yapılandırılmış muhasebeciye e-postala.",
          "Dolandırıcılık gibi görünen bir iadeyi işaretle.",
        ],
        approvalNote:
          "İlk ay Onay gerekli. Otomatik'e geçmek yalnızca kategorize etme doğruluğun %95 üstünde stabilize olduktan sonra önerilir.",
        tips: [
          "Hesap planını atlama. Hesap planı olmayan çalışan, muhasebecinin defterleriyle uyuşmayan kategoriler uydurur.",
        ],
      },
    },
  },
  {
    slug: "ceo-advisor",
    content: {
      en: {
        title: "CEO Advisor",
        tagline:
          "Reads everything. Frames decisions weekly. Pushes back when you wobble.",
        whatItDoes: [
          "Reads every report your other workers generate, every audit-log line, every approval, and every conversation summary.",
          "Builds a weekly decision-frame: 'Here are the three decisions you need to make this week. Here is the case for and against each.'",
          "Logs your decision on each, then revisits the outcome 30 / 60 / 90 days later.",
        ],
        integrationsRequired: [
          "None directly — this worker only reads your existing data.",
          "Effective only if other workers are producing data. Hire CEO Advisor last, not first.",
        ],
        steps: [
          "Hire CEO Advisor.",
          "It runs silently for the first week, building a model of your operations.",
          "On Monday morning, it publishes the first decision-frame to your dashboard + Reports.",
          "Open it, log your decision on each item, and the worker schedules the follow-up review.",
        ],
        exampleTasks: [
          "'Your customer support volume is up 38% week-over-week. Decision: hire a second support worker, raise prices, or accept the load. Here's the case for each.'",
          "'You set a goal in March to ship the new pricing page. It's June. Either de-prioritise it explicitly or stop pretending it'll happen.'",
        ],
        approvalNote:
          "Read-only — this worker does not send outbound messages. Its outputs are decision-frames in your dashboard, never customer-facing.",
        tips: [
          "Be brutally honest in your decision log. The CEO Advisor is only as useful as the truth you tell it.",
        ],
      },
      tr: {
        title: "CEO Danışmanı",
        tagline:
          "Her şeyi okur. Haftalık karar çerçeveleri kurar. Sallandığında geri iter.",
        whatItDoes: [
          "Diğer çalışanlarının ürettiği her raporu, her denetim-log satırını, her onayı ve her konuşma özetini okur.",
          "Haftalık bir karar çerçevesi inşa eder: 'Bu hafta vermen gereken üç karar. Her birinin lehine ve aleyhine durum.'",
          "Her birindeki kararını loglar, sonra 30 / 60 / 90 gün sonra sonucu yeniden gözden geçirir.",
        ],
        integrationsRequired: [
          "Doğrudan yok — bu çalışan yalnızca mevcut verilerini okur.",
          "Yalnızca diğer çalışanlar veri üretiyorsa etkili. CEO Danışmanı'nı önce değil, en sonda işe al.",
        ],
        steps: [
          "CEO Danışmanı'nı işe al.",
          "İlk hafta sessizce çalışır, operasyonlarının bir modelini kurar.",
          "Pazartesi sabahı, ilk karar çerçevesini panoda + Raporlar'da yayınlar.",
          "Onu aç, her maddedeki kararını logla, çalışan takip incelemesini programlar.",
        ],
        exampleTasks: [
          "'Müşteri destek hacmin haftaya göre %38 arttı. Karar: ikinci bir destek çalışanı işe al, fiyatları yükselt veya yükü kabul et. Her birinin gerekçesi şu.'",
          "'Mart'ta yeni fiyat sayfasını yayınlama hedefi koymuştun. Haziran oldu. Ya açıkça önceliksizleştir ya da olacağını söylemeyi bırak.'",
        ],
        approvalNote:
          "Salt okunur — bu çalışan giden mesaj göndermez. Çıktıları panondaki karar çerçeveleridir, hiçbir zaman müşteriye yönelik değil.",
        tips: [
          "Karar loguna acımasızca dürüst ol. CEO Danışmanı sadece ona söylediğin gerçek kadar faydalıdır.",
        ],
      },
    },
  },
];

const ENRICHMENT_MAP = new Map(ENRICHMENT.map((e) => [e.slug, e]));

/**
 * Resolve the per-agent help page content for a (role, locale) pair.
 * Strategy:
 *   1. If the slug has an authored enrichment in the target locale → use it.
 *   2. Else if EN enrichment exists → use it (UI flags via banner).
 *   3. Else fall back to the generated baseline from the role catalog row.
 */
export function getAgentHelp(role: Role, locale: Locale): LocalizedAgent {
  const enriched = ENRICHMENT_MAP.get(role.slug);
  // 1. Hand-authored ENRICHMENT (highest quality; 6 agents, en/tr).
  const handAuthored = enriched?.content[locale];
  if (handAuthored) return handAuthored;
  // 2. Generated rich content for the other 58 agents — native en/tr.
  if (locale === "en" || locale === "tr") {
    const rich = GENERATED_AGENT_HELP[role.slug]?.[locale];
    if (rich) return rich;
  }
  // 3. Machine-translated rich content for the other 21 locales.
  const generated = GENERATED_HELP_TRANSLATIONS[locale]?.agents?.[role.slug];
  if (generated) return generated;
  // 4. English rich content (hand-authored, else generated).
  const enRich = enriched?.content.en ?? GENERATED_AGENT_HELP[role.slug]?.en;
  if (enRich) return enRich;
  // 5. Last resort — templated baseline from the catalog row.
  return buildFallbackAgentHelp(role, locale);
}

/**
 * Baseline help page generated from the role catalog row. Used when
 * we haven't authored a rich enrichment for the slug yet — so every
 * one of the 64 catalog roles has SOMETHING coherent to show.
 */
function buildFallbackAgentHelp(role: Role, locale: Locale): LocalizedAgent {
  // Machine-translated fallback template for non-native locales.
  const gen = GENERATED_HELP_TRANSLATIONS[locale]?.fallback;
  if (gen) {
    const fill = (s: string, channel?: string) =>
      s
        .replaceAll("{title}", role.title)
        .replaceAll("{category}", role.category)
        .replaceAll("{summary}", role.summary)
        .replaceAll("{channel}", channel ?? "");
    return {
      title: role.title,
      tagline: role.summary,
      whatItDoes: [fill(gen.whatItDoes)],
      integrationsRequired: [
        gen.brandBibleReq,
        ...role.channels.map((c) => fill(gen.channelReq, c)),
      ],
      steps: [
        fill(gen.step1),
        gen.step2,
        gen.step3,
        gen.step4,
        gen.step5,
      ],
      exampleTasks: [gen.exampleHint],
      approvalNote: gen.approvalNote,
      tips: [gen.tip],
    };
  }

  const t = locale === "tr" ? TR_FALLBACK : EN_FALLBACK;
  return {
    title: role.title,
    tagline: role.summary,
    whatItDoes: [t.whatItDoes(role)],
    integrationsRequired: [
      t.brandBibleReq,
      ...role.channels.map((c) => t.channelReq(c)),
    ],
    steps: [
      t.step1(role),
      t.step2,
      t.step3,
      t.step4,
      t.step5,
    ],
    exampleTasks: [t.exampleHint],
    approvalNote: t.approvalNote,
    tips: [t.tip],
  };
}

const EN_FALLBACK = {
  whatItDoes: (role: Role) =>
    `${role.title} is part of the ${role.category} group. ${role.summary}`,
  brandBibleReq:
    "Brand Bible with enough context for the role to answer in your voice.",
  channelReq: (channel: string) =>
    `${channel} channel integration (Integrations page).`,
  step1: (role: Role) =>
    `Add at least one Brand Bible source relevant to ${role.title}.`,
  step2: "Connect the channels listed under Required integrations.",
  step3: "Open Workforce → Hire from catalog, pick this role.",
  step4: "Set the worker name, channels, and Approval required mode.",
  step5: "Send a test message and approve the first drafts.",
  exampleHint:
    "Concrete example tasks for this role are added in a future release; in the meantime, treat the role summary as the spec.",
  approvalNote: "Approval required for the first week is recommended.",
  tip:
    "The first week is the calibration period. Edit drafts rather than rejecting them — your edits are how the worker learns.",
};

const TR_FALLBACK = {
  whatItDoes: (role: Role) =>
    `${role.title}, ${role.category} grubunun bir parçasıdır. ${role.summary}`,
  brandBibleReq:
    "Rolün senin sesinle cevap verebilmesi için yeterli bağlama sahip Brand Bible.",
  channelReq: (channel: string) =>
    `${channel} kanal entegrasyonu (Entegrasyonlar sayfası).`,
  step1: (role: Role) =>
    `${role.title} ile ilgili en az bir Brand Bible kaynağı ekle.`,
  step2: "Gerekli entegrasyonlar altında listelenen kanalları bağla.",
  step3: "İş gücü → Katalogdan işe al'ı aç, bu rolü seç.",
  step4: "Çalışanın adını, kanalları ve Onay gerekli modunu ayarla.",
  step5: "Bir test mesajı gönder ve ilk taslakları onayla.",
  exampleHint:
    "Bu rol için somut örnek görevler ileri bir sürümde eklenecek; bu arada rol özetini şartname olarak kullan.",
  approvalNote: "İlk hafta için Onay gerekli önerilir.",
  tip:
    "İlk hafta kalibrasyon dönemidir. Taslakları reddetmek yerine düzenle — çalışan düzenlemelerinden öğrenir.",
};
