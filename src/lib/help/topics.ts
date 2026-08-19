import type { HelpTopic } from "./types";

/**
 * Top-level help center topics. EN is the source-of-truth, TR is the
 * second native language. Other 21 locales currently fall back to EN
 * with a machine-translation-pending banner — populated in a follow-up
 * batch via the same translation pipeline used elsewhere in i18n/.
 *
 * Topic ordering reflects the natural learning path: quickstart →
 * concepts → integrations → operations. Admin-only topics are tagged
 * `audience: "admin"` and only appear in `/admin/help`.
 */
export const HELP_TOPICS: HelpTopic[] = [
  /* ── 1. Quickstart ─────────────────────────────────────────────── */
  {
    slug: "quickstart",
    audience: "both",
    order: 10,
    iconGlyph: "→",
    content: {
      en: {
        title: "Quickstart",
        tagline: "Hire your first AI worker and route the first message in under five minutes.",
        body: [
          {
            heading: "Before you start",
            paragraphs: [
              "Staffbix is an AI workforce that you hire, configure, and supervise from one panel. You bring your brand, your customer channels, and your judgement. Staffbix brings the workers, the model access, and the audit trail.",
              "Every account starts on a free trial. You can ship live work in the trial — the only cap is the worker count on your plan.",
            ],
          },
          {
            heading: "Steps",
            steps: [
              "Open the Workforce page from the sidebar and click Hire from catalog.",
              "Pick a role — for most teams, Customer Support is the right starter pick. Read the role's summary and the channels it can run on.",
              "On the hire form, give the worker a name, pick the channels you want it on, paste any internal instructions that change how it should answer, and choose an approval mode. We recommend Approval required for the first week.",
              "Confirm. The worker appears in your Workforce list with a small green dot indicating it is live.",
              "Open Brand Bible from the sidebar and add at least one source — your website URL, an About PDF, or a product spec. The worker uses this to answer in your voice and on your facts.",
              "Send a test message via the channel you connected. The worker drafts a reply, which lands in the Approval Center. Approve or edit it before it goes out.",
            ],
          },
          {
            callout:
              "Tip: the Approval Center is where you supervise everything. Treat the first week as on-the-job training — your edits teach the worker your judgement.",
          },
        ],
      },
      tr: {
        title: "Hızlı başlangıç",
        tagline:
          "İlk AI çalışanını işe al ve ilk mesajı beş dakikadan kısa sürede yönlendir.",
        body: [
          {
            heading: "Başlamadan önce",
            paragraphs: [
              "Staffbix, tek bir panelden işe aldığın, yapılandırdığın ve denetlediğin bir AI iş gücü. Sen markanı, müşteri kanallarını ve kararlarını getirirsin. Staffbix çalışanları, model erişimini ve denetim izini getirir.",
              "Her hesap ücretsiz denemeyle başlar. Denemede gerçek iş çıkarabilirsin — tek üst sınır planındaki çalışan sayısıdır.",
            ],
          },
          {
            heading: "Adımlar",
            steps: [
              "Yan menüden İş gücü sayfasını aç ve Katalogdan işe al butonuna tıkla.",
              "Bir rol seç — çoğu ekip için doğru başlangıç Müşteri Destek rolüdür. Rolün özetini ve çalışabileceği kanalları oku.",
              "İşe alım formunda çalışana bir isim ver, açmak istediğin kanalları seç, davranışını değiştirecek dahili talimatları yaz ve bir onay modu seç. İlk hafta için Onay gerekli modunu öneririz.",
              "Onayla. Çalışan, canlı olduğunu gösteren küçük yeşil noktayla İş gücü listende belirir.",
              "Yan menüden Brand Bible'ı aç ve en az bir kaynak ekle — web sitesi URL'in, bir Hakkımızda PDF'i veya bir ürün dokümanı. Çalışan, senin sesinle ve senin bilgilerinle cevap vermek için bunu kullanır.",
              "Bağladığın kanaldan bir test mesajı gönder. Çalışan bir taslak hazırlar, Onay Merkezi'ne düşer. Gönderilmeden önce onayla ya da düzenle.",
            ],
          },
          {
            callout:
              "İpucu: Onay Merkezi her şeyi denetlediğin yerdir. İlk haftayı iş başı eğitim gibi düşün — yaptığın düzenlemeler çalışana kararlarını öğretir.",
          },
        ],
      },
    },
  },

  /* ── 2. Panel tour ────────────────────────────────────────────── */
  {
    slug: "panel-tour",
    audience: "user",
    order: 20,
    iconGlyph: "▦",
    content: {
      en: {
        title: "User panel tour",
        tagline: "Every page in the customer app and what you do there.",
        body: [
          {
            heading: "Sidebar — workspace",
            bullets: [
              "Dashboard — KPI snapshot, today's activity, briefings, anomalies.",
              "Workforce — every AI worker you've hired. Hire from catalog, pause, edit, or terminate from here.",
              "Brand Bible — sources (URLs, PDFs, docs) that train every worker on your voice + facts.",
              "Approvals — outbound drafts (emails, posts, replies) waiting for your sign-off. The central control surface.",
              "Conversations — every customer thread across every channel. Search, filter, and jump back in.",
              "Reports — scheduled briefings (daily, weekly, monthly) plus on-demand exports.",
            ],
          },
          {
            heading: "Sidebar — account",
            bullets: [
              "Integrations — connect your channels (email SMTP, WhatsApp, Stripe, Shopify, etc.). Credentials are encrypted per tenant.",
              "Billing — current plan, usage versus caps, invoices, and the customer portal link.",
              "Team — workspace members and their roles (Owner, Admin, Editor, Reviewer).",
              "Settings — profile, password + 2FA, language, notifications.",
              "Logs — security + audit events for your tenant. Read-only.",
              "Help — what you are reading right now.",
            ],
          },
        ],
      },
      tr: {
        title: "Kullanıcı paneli turu",
        tagline:
          "Müşteri uygulamasındaki her sayfa ve orada ne yapacağın.",
        body: [
          {
            heading: "Yan menü — çalışma alanı",
            bullets: [
              "Pano — KPI özeti, bugünün etkinliği, brifingler, sapmalar.",
              "İş gücü — işe aldığın her AI çalışanı. Katalogdan işe alma, duraklatma, düzenleme veya sonlandırma buradan.",
              "Brand Bible — her çalışanı senin sesin ve gerçeklerin üzerine eğiten kaynaklar (URL, PDF, doküman).",
              "Onaylar — onayını bekleyen giden taslaklar (e-postalar, gönderiler, yanıtlar). Merkezi kontrol yüzeyi.",
              "Konuşmalar — tüm kanallardaki her müşteri konuşması. Ara, filtrele, kaldığın yere dön.",
              "Raporlar — programlı brifingler (günlük, haftalık, aylık) ve isteğe bağlı dışa aktarımlar.",
            ],
          },
          {
            heading: "Yan menü — hesap",
            bullets: [
              "Entegrasyonlar — kanallarını bağla (e-posta SMTP, WhatsApp, Stripe, Shopify vb.). Kimlik bilgileri kiracı başına şifreli.",
              "Faturalandırma — mevcut plan, limitlere karşı kullanım, faturalar ve müşteri portalı bağlantısı.",
              "Ekip — çalışma alanı üyeleri ve rolleri (Sahip, Yönetici, Editör, Gözden Geçiren).",
              "Ayarlar — profil, parola + 2FA, dil, bildirimler.",
              "Loglar — kiracına ait güvenlik + denetim olayları. Salt okunur.",
              "Yardım — şu an okuduğun sayfa.",
            ],
          },
        ],
      },
    },
  },

  /* ── 3. Admin panel tour ──────────────────────────────────────── */
  {
    slug: "admin-panel-tour",
    audience: "admin",
    order: 25,
    iconGlyph: "⌘",
    content: {
      en: {
        title: "Admin panel tour",
        tagline: "Platform-staff console — what's here and who uses it.",
        body: [
          {
            heading: "Audience",
            paragraphs: [
              "The admin panel is for Staffbix platform staff, not tenant operators. Access is gated on the `staff` table — being an Owner of your own tenant does NOT grant admin access in production.",
            ],
          },
          {
            heading: "Sections",
            bullets: [
              "Dashboard — MRR, signups, plan mix, recent activity across all tenants.",
              "Tenants — list of customers. Detail page for plan changes, suspensions, key rotations.",
              "Users — tenant members across the platform. Useful for support escalations.",
              "Plans — pricing catalog. Edit names, taglines, feature lists, and caps; archive deprecated plans.",
              "Catalog — the 64 AI role definitions surfaced to tenants. Edit titles, summaries, channels.",
              "Integrations — platform-level integration registry (Anthropic, Stripe, Resend, etc.) with health labels.",
              "Reports — admin-scope reports across the whole platform.",
              "Support — tenant support tickets pulled from inbound emails + in-app reports.",
              "Announcements — global banners shown to tenants (info, notice, critical).",
              "Audit — security ledger across all tenants. Append-only.",
              "Team — platform staff roster.",
              "Settings — platform-wide settings.",
            ],
          },
        ],
      },
      tr: {
        title: "Yönetici paneli turu",
        tagline: "Platform personeli konsolu — ne var ve kim kullanır.",
        body: [
          {
            heading: "Kim için",
            paragraphs: [
              "Yönetici paneli, kiracı operatörleri için değil, Staffbix platform personeli içindir. Erişim `staff` tablosuna bağlıdır — kendi kiracının Sahibi olmak, üretimde yönetici erişimi vermez.",
            ],
          },
          {
            heading: "Bölümler",
            bullets: [
              "Pano — MRR, kayıtlar, plan dağılımı, tüm kiracılardaki son etkinlik.",
              "Kiracılar — müşteri listesi. Plan değişikliği, askıya alma, anahtar döndürme için detay sayfası.",
              "Kullanıcılar — platform genelindeki kiracı üyeleri. Destek eskalasyonları için faydalı.",
              "Planlar — fiyat kataloğu. İsim, sloganı, özellik listesi ve limitleri düzenle; eski planları arşivle.",
              "Katalog — kiracılara gösterilen 64 AI rol tanımı. Başlık, özet, kanalları düzenle.",
              "Entegrasyonlar — platform düzeyindeki entegrasyon kaydı (Anthropic, Stripe, Resend vb.) sağlık etiketleriyle.",
              "Raporlar — tüm platform genelinde yönetici kapsamlı raporlar.",
              "Destek — gelen e-postalardan + uygulama içi raporlardan toplanan kiracı destek talepleri.",
              "Duyurular — kiracılara gösterilen global afişler (bilgi, uyarı, kritik).",
              "Denetim — tüm kiracılarda güvenlik defteri. Yalnızca ekleme.",
              "Ekip — platform personel kadrosu.",
              "Ayarlar — platform genelinde ayarlar.",
            ],
          },
        ],
      },
    },
  },

  /* ── 4. Hiring an AI agent ────────────────────────────────────── */
  {
    slug: "hire-agent",
    audience: "user",
    order: 30,
    iconGlyph: "+",
    content: {
      en: {
        title: "Hiring an AI agent",
        tagline: "Walkthrough for the hire flow, end to end.",
        body: [
          {
            heading: "Where to start",
            paragraphs: [
              "Open the Workforce page from the sidebar, then click Hire from catalog. The catalog lists 64 roles across six categories: Customer-facing, Sales, Marketing, Operations, Finance, Leadership.",
            ],
          },
          {
            heading: "Picking a role",
            paragraphs: [
              "Read the role summary and the channels it can run on. If you are not sure, the first hire of most teams is Customer Support — it gives you the fastest visible win and is the easiest to supervise.",
            ],
          },
          {
            heading: "The hire form",
            steps: [
              "Name the worker (something the team will recognise — 'Lina (Customer Support)' is better than 'Worker 1').",
              "Pick channels. Only channels you have integrations for can be enabled. If a channel is greyed out, set up the integration first.",
              "Pick approval mode. Approval required is safest. Suggest forwards drafts as suggestions without queueing them; Auto sends without your sign-off (use only after a week of supervised work).",
              "Add internal instructions — anything that changes how the worker should behave. Examples: 'Don't promise discounts. If a customer asks for one, escalate to me.' or 'Always reply in the customer's language; default to Turkish.'",
              "Confirm.",
            ],
          },
          {
            heading: "Plan limit",
            paragraphs: [
              "Each plan caps the number of active workers and the number of channels per worker. If you are at or near a cap, a banner appears above the catalog with the current usage and an Upgrade plan link.",
            ],
          },
        ],
      },
      tr: {
        title: "AI ajan işe alma",
        tagline: "İşe alım akışı, baştan sona.",
        body: [
          {
            heading: "Nereden başla",
            paragraphs: [
              "Yan menüden İş gücü sayfasını aç, sonra Katalogdan işe al'a tıkla. Katalogda altı kategoride 64 rol bulunur: Müşteriyle temas, Satış, Pazarlama, Operasyon, Finans, Liderlik.",
            ],
          },
          {
            heading: "Rol seçimi",
            paragraphs: [
              "Rolün özetini ve çalışabileceği kanalları oku. Emin değilsen, çoğu ekibin ilk işe alımı Müşteri Destek olur — en hızlı görünür kazancı sağlar ve denetlemesi en kolayıdır.",
            ],
          },
          {
            heading: "İşe alım formu",
            steps: [
              "Çalışana bir isim ver (ekibin tanıyabileceği bir şey — 'Lina (Müşteri Destek)' 'Worker 1'den iyidir).",
              "Kanalları seç. Yalnızca entegrasyonu olan kanalları açabilirsin. Bir kanal gri görünüyorsa, önce entegrasyonu kur.",
              "Onay modunu seç. Onay gerekli en güvenlisidir. Öner taslakları kuyruğa almadan öneri olarak iletir; Otomatik onayın olmadan gönderir (yalnızca bir hafta denetlenmiş çalışmadan sonra kullan).",
              "Dahili talimatlar ekle — çalışanın davranışını değiştirecek her şey. Örnek: 'İndirim sözü verme. Müşteri isterse bana eskale et.' veya 'Her zaman müşterinin dilinde yanıtla; varsayılan Türkçe.'",
              "Onayla.",
            ],
          },
          {
            heading: "Plan limiti",
            paragraphs: [
              "Her plan, aktif çalışan sayısını ve çalışan başına kanal sayısını sınırlar. Limite ulaştığında veya yaklaştığında, katalog üstünde mevcut kullanım ve Planı yükselt bağlantısıyla bir afiş görünür.",
            ],
          },
        ],
      },
    },
  },

  /* ── 5. Integrations ──────────────────────────────────────────── */
  {
    slug: "integrations",
    audience: "user",
    order: 40,
    iconGlyph: "⇄",
    content: {
      en: {
        title: "Integrations",
        tagline: "Connect the channels and tools your workers operate on.",
        body: [
          {
            heading: "How integrations work",
            paragraphs: [
              "Staffbix is BYOI — bring your own integration. You connect your accounts to your tenant; we never share credentials across tenants. Secrets are AES-256-GCM encrypted at rest using a per-tenant data key.",
              "Open Integrations from the sidebar to see what's connected and what's available.",
            ],
          },
          {
            heading: "Email (SMTP)",
            steps: [
              "Get the SMTP host, port, username, and password from your email provider (Postmark, Resend, Sendgrid, Yandex, Gmail Workspace app password, etc.).",
              "On Integrations → Email, paste them in.",
              "Click Send test. A test email goes out to the address on your profile.",
              "If the test passes, the integration is live and any worker on the email channel can now draft and send.",
            ],
          },
          {
            heading: "WhatsApp Cloud API",
            steps: [
              "Create a Meta Business account if you don't have one.",
              "In Meta's WhatsApp Business setup, get a phone-number ID and a permanent system-user token.",
              "On Integrations → WhatsApp, paste the phone-number ID and token.",
              "Set the webhook callback URL Meta shows you to the value displayed on the integration page.",
              "Send a test message. If it arrives, you're done.",
            ],
          },
          {
            heading: "Stripe (billing for your own customers)",
            paragraphs: [
              "Stripe is required for the Bookkeeping and Invoice Specialist agents to read your sales data. Connect your Stripe account via the Connect flow on Integrations → Stripe.",
            ],
          },
          {
            heading: "Shopify, Amazon, eBay, Etsy",
            paragraphs: [
              "Marketplace integrations let the Marketplace Ops agent reprice, edit listings, and respond to buyer messages. Each has its own OAuth flow on Integrations → Marketplaces.",
            ],
          },
          {
            callout:
              "If an integration is broken (auth expired, webhook unreachable), the affected channel shows a yellow status in the worker list. Open the integration to re-authenticate.",
          },
        ],
      },
      tr: {
        title: "Entegrasyonlar",
        tagline: "Çalışanların üzerinde çalıştığı kanalları ve araçları bağla.",
        body: [
          {
            heading: "Entegrasyonlar nasıl çalışır",
            paragraphs: [
              "Staffbix BYOI'dir — kendi entegrasyonunu getir. Hesaplarını kendi kiracına bağlarsın; kimlik bilgilerini kiracılar arasında asla paylaşmayız. Sırlar, kiracı başına bir veri anahtarı kullanılarak AES-256-GCM ile şifreli durur.",
              "Bağlı olanları ve mevcut olanları görmek için yan menüden Entegrasyonlar'ı aç.",
            ],
          },
          {
            heading: "E-posta (SMTP)",
            steps: [
              "E-posta sağlayıcından (Postmark, Resend, Sendgrid, Yandex, Gmail Workspace uygulama parolası vb.) SMTP host, port, kullanıcı adı ve parolasını al.",
              "Entegrasyonlar → E-posta'da bunları yapıştır.",
              "Test gönder'e tıkla. Profilindeki adrese bir test e-postası gider.",
              "Test geçerse entegrasyon canlıdır ve e-posta kanalındaki herhangi bir çalışan artık taslak hazırlayıp gönderebilir.",
            ],
          },
          {
            heading: "WhatsApp Cloud API",
            steps: [
              "Yoksa Meta Business hesabı oluştur.",
              "Meta'nın WhatsApp Business kurulumunda bir telefon-numarası kimliği ve kalıcı bir sistem-kullanıcı belirteci al.",
              "Entegrasyonlar → WhatsApp'a telefon-numarası kimliğini ve belirteci yapıştır.",
              "Meta'nın gösterdiği webhook geri-arama URL'ini entegrasyon sayfasındaki değere ayarla.",
              "Bir test mesajı gönder. Geldiyse, tamam.",
            ],
          },
          {
            heading: "Stripe (kendi müşterilerin için faturalama)",
            paragraphs: [
              "Stripe, Muhasebe ve Fatura Uzmanı ajanlarının satış verini okuyabilmesi için gereklidir. Entegrasyonlar → Stripe'taki Connect akışıyla Stripe hesabını bağla.",
            ],
          },
          {
            heading: "Shopify, Amazon, eBay, Etsy",
            paragraphs: [
              "Pazaryeri entegrasyonları, Pazaryeri Ops ajanının yeniden fiyatlama yapmasına, listeleri düzenlemesine ve alıcı mesajlarına yanıt vermesine olanak verir. Her birinin Entegrasyonlar → Pazaryerleri'nde kendi OAuth akışı vardır.",
            ],
          },
          {
            callout:
              "Bir entegrasyon bozulursa (oturum süresi dolmuş, webhook ulaşılamaz), etkilenen kanal çalışan listesinde sarı durum gösterir. Yeniden kimlik doğrulamak için entegrasyonu aç.",
          },
        ],
      },
    },
  },

  /* ── 6. Approval Center ───────────────────────────────────────── */
  {
    slug: "approvals",
    audience: "user",
    order: 50,
    iconGlyph: "✓",
    content: {
      en: {
        title: "Approval Center",
        tagline:
          "Where every outbound action is staged for your sign-off — or fires automatically once you trust it.",
        body: [
          {
            heading: "What lands here",
            paragraphs: [
              "Anything a worker wants to send out — an email reply, a WhatsApp message, a social post, a refund — goes through the Approval Center first when the worker is in Approval required mode.",
            ],
          },
          {
            heading: "The three modes",
            bullets: [
              "Approval required (default for first week): every outbound action queues. You approve, edit, or reject.",
              "Suggest: drafts surface as suggestions in the conversation panel but don't queue. Useful for high-volume channels where you want options, not control.",
              "Auto: the worker sends without queueing. Use only on channels you've supervised through a week of approvals.",
            ],
          },
          {
            heading: "Per channel, not per worker",
            paragraphs: [
              "You can mix modes on the same worker. A common pattern: keep Email on Approval required, switch WhatsApp to Auto once you trust the worker's tone.",
            ],
          },
          {
            heading: "Audit",
            paragraphs: [
              "Every approve / reject / edit / auto-send is logged. Open Logs from the sidebar to see your tenant's audit trail.",
            ],
          },
        ],
      },
      tr: {
        title: "Onay Merkezi",
        tagline:
          "Her giden eylemin onayın için bekletildiği yer — ya da güvendiğin anda otomatik tetiklenir.",
        body: [
          {
            heading: "Buraya ne düşer",
            paragraphs: [
              "Bir çalışanın göndermek istediği her şey — bir e-posta yanıtı, bir WhatsApp mesajı, bir sosyal medya gönderisi, bir iade — çalışan Onay gerekli modundayken önce Onay Merkezi'nden geçer.",
            ],
          },
          {
            heading: "Üç mod",
            bullets: [
              "Onay gerekli (ilk hafta için varsayılan): her giden eylem kuyruğa alınır. Onayla, düzenle veya reddet.",
              "Öner: taslaklar konuşma panelinde öneri olarak görünür ama kuyruğa alınmaz. Kontrolden çok seçenek istediğin yüksek hacimli kanallar için kullanışlı.",
              "Otomatik: çalışan kuyruğa almadan gönderir. Yalnızca bir hafta onaylarla denetlediğin kanallarda kullan.",
            ],
          },
          {
            heading: "Çalışana göre değil, kanala göre",
            paragraphs: [
              "Aynı çalışanda modları karıştırabilirsin. Yaygın bir desen: E-postayı Onay gerekli'de tut, çalışanın tonuna güvendiğin anda WhatsApp'ı Otomatik'e geçir.",
            ],
          },
          {
            heading: "Denetim",
            paragraphs: [
              "Her onay / red / düzenleme / otomatik-gönderim kaydedilir. Kiracının denetim izini görmek için yan menüden Loglar'ı aç.",
            ],
          },
        ],
      },
    },
  },

  /* ── 7. Brand Bible ───────────────────────────────────────────── */
  {
    slug: "brand-bible",
    audience: "user",
    order: 60,
    iconGlyph: "✻",
    content: {
      en: {
        title: "Brand Bible",
        tagline: "The source of truth your workers consult to answer in your voice and on your facts.",
        body: [
          {
            heading: "What it is",
            paragraphs: [
              "The Brand Bible is a private corpus per tenant. Workers retrieve from it before answering — RAG (retrieval-augmented generation). The Bible is what keeps the AI on your facts instead of inventing them.",
            ],
          },
          {
            heading: "What to add",
            bullets: [
              "Your website (URL — we crawl).",
              "About / company overview document.",
              "Product spec sheets.",
              "Pricing policy.",
              "Return / refund policy.",
              "Voice + tone guide.",
              "Past customer Q&A.",
              "Internal FAQs.",
            ],
          },
          {
            heading: "How to add",
            steps: [
              "Open Brand Bible from the sidebar.",
              "Click Add source.",
              "Pick a kind: URL, PDF, DOCX, plain text, or HTML paste.",
              "Provide the content. We extract it, chunk it, embed it, and store the chunks in your tenant's private index.",
              "When indexing completes (typically under a minute) the source shows status `indexed`.",
            ],
          },
          {
            heading: "Updating",
            paragraphs: [
              "When you change a source, re-ingest it. Workers see the new content within seconds of re-indexing.",
            ],
          },
        ],
      },
      tr: {
        title: "Brand Bible",
        tagline:
          "Çalışanlarının senin sesinle ve senin gerçeklerinle cevap vermek için başvurduğu doğruluk kaynağı.",
        body: [
          {
            heading: "Nedir",
            paragraphs: [
              "Brand Bible, kiracı başına özel bir derlemdir. Çalışanlar yanıt vermeden önce ondan getirim yapar — RAG (getirim-destekli üretim). Bible, AI'ı senin gerçeklerinden uydurmaya değil, üzerinde tutar.",
            ],
          },
          {
            heading: "Ne eklenmeli",
            bullets: [
              "Web siten (URL — tarayıp alırız).",
              "Hakkımızda / şirket genel görünüm dokümanı.",
              "Ürün spesifikasyon sayfaları.",
              "Fiyatlandırma politikası.",
              "İade / geri ödeme politikası.",
              "Ses + ton kılavuzu.",
              "Geçmiş müşteri Soru-Cevapları.",
              "Dahili SSS.",
            ],
          },
          {
            heading: "Nasıl eklenir",
            steps: [
              "Yan menüden Brand Bible'ı aç.",
              "Kaynak ekle'ye tıkla.",
              "Bir tür seç: URL, PDF, DOCX, düz metin veya HTML yapıştırma.",
              "İçeriği sağla. İçeriği çıkarır, parçalara ayırır, gömeriz ve parçaları kiracının özel dizininde saklarız.",
              "Dizinleme tamamlandığında (genellikle bir dakikadan kısa sürede) kaynak `dizinlendi` durumunu gösterir.",
            ],
          },
          {
            heading: "Güncelleme",
            paragraphs: [
              "Bir kaynağı değiştirdiğinde yeniden al. Çalışanlar yeniden-dizinden saniyeler içinde yeni içeriği görür.",
            ],
          },
        ],
      },
    },
  },

  /* ── 8. Plans & limits ────────────────────────────────────────── */
  {
    slug: "plans-and-limits",
    audience: "user",
    order: 70,
    iconGlyph: "$",
    content: {
      en: {
        title: "Plans & limits",
        tagline: "What each plan includes and how the caps are enforced.",
        body: [
          {
            heading: "Plan caps (the four real limits)",
            bullets: [
              "Workers — how many active AI workers you can have at once. Terminating a worker frees its slot.",
              "Monthly AI dollars — total dollar value of model calls in a calendar month. Resets on the first of each UTC month.",
              "Team seats — active workspace members plus pending invitations. Pending invitations count.",
              "Channels per worker — how many channels (web, email, WhatsApp, etc.) a single worker can run on.",
            ],
          },
          {
            heading: "What happens at a cap",
            paragraphs: [
              "At 80% of any cap, a yellow banner appears on the relevant page (Team for seats, Workforce for workers, etc.). At 100% the banner turns red and the action that would cross the cap is refused with HTTP 402 — both server-side and in the UI.",
              "The Workforce and Team page action buttons are disabled when you're at the cap. The Billing page progress bars are colour-coded ink → amber → red.",
            ],
          },
          {
            heading: "Upgrading",
            paragraphs: [
              "Open Billing from the sidebar, click Change plan, pick a tier. The new plan takes effect immediately and the cap banners clear once your usage fits the new limits.",
            ],
          },
        ],
      },
      tr: {
        title: "Planlar ve limitler",
        tagline: "Her planın içeriği ve limitlerin nasıl uygulandığı.",
        body: [
          {
            heading: "Plan limitleri (dört gerçek limit)",
            bullets: [
              "Çalışanlar — aynı anda kaç aktif AI çalışanın olabileceği. Bir çalışanı sonlandırmak yerini serbest bırakır.",
              "Aylık AI doları — bir takvim ayındaki model çağrılarının toplam dolar değeri. Her UTC ayının ilkinde sıfırlanır.",
              "Ekip koltukları — aktif çalışma alanı üyeleri artı bekleyen davetler. Bekleyen davetler de sayılır.",
              "Çalışan başına kanal — tek bir çalışanın kaç kanalda (web, e-posta, WhatsApp vb.) çalışabileceği.",
            ],
          },
          {
            heading: "Limite ulaşınca ne olur",
            paragraphs: [
              "Herhangi bir limitin %80'inde ilgili sayfada (koltuklar için Ekip, çalışanlar için İş gücü vb.) sarı bir afiş görünür. %100'de afiş kırmızıya döner ve limiti aşacak eylem HTTP 402 ile reddedilir — hem sunucu tarafında hem arayüzde.",
              "İş gücü ve Ekip sayfasındaki eylem butonları limitteyken devre dışıdır. Faturalandırma sayfasındaki ilerleme çubukları renk kodludur: mürekkep → kehribar → kırmızı.",
            ],
          },
          {
            heading: "Yükseltme",
            paragraphs: [
              "Yan menüden Faturalandırma'yı aç, Planı değiştir'e tıkla, bir kademe seç. Yeni plan hemen yürürlüğe girer ve kullanımın yeni limitlere uyduğunda limit afişleri kalkar.",
            ],
          },
        ],
      },
    },
  },

  /* ── 9. Billing ───────────────────────────────────────────────── */
  {
    slug: "billing",
    audience: "user",
    order: 80,
    iconGlyph: "₿",
    content: {
      en: {
        title: "Billing",
        tagline: "Plan, usage, invoices, payment method.",
        body: [
          {
            heading: "Where to look",
            paragraphs: [
              "Open Billing from the sidebar. The page shows: your current plan, usage versus caps, last 12 invoices, and the link to Stripe's customer portal where you update your card, tax details, and address.",
            ],
          },
          {
            heading: "Changing plans",
            steps: [
              "On Billing, click Change plan.",
              "Pick a tier. Pro-rating is handled automatically by Stripe — you pay the difference for the rest of the current cycle and the new price kicks in next renewal.",
              "Confirm. Caps refresh immediately.",
            ],
          },
          {
            heading: "Updating card details",
            paragraphs: [
              "On Billing → Payment method → Update card opens the Stripe-hosted customer portal in a new tab. We do not handle card numbers ourselves.",
            ],
          },
          {
            heading: "Annual vs monthly",
            paragraphs: [
              "Annual billing is 20% cheaper. Switch via Billing → Switch to annual.",
            ],
          },
          {
            heading: "Cancelling",
            paragraphs: [
              "Cancel any time on Billing → Cancel plan. Your workers continue running until the end of the paid period; on that date your tenant goes to suspended and no further charges happen.",
            ],
          },
        ],
      },
      tr: {
        title: "Faturalandırma",
        tagline: "Plan, kullanım, faturalar, ödeme yöntemi.",
        body: [
          {
            heading: "Nereye bak",
            paragraphs: [
              "Yan menüden Faturalandırma'yı aç. Sayfa şunları gösterir: mevcut planın, limitlere karşı kullanım, son 12 fatura ve kartını, vergi bilgilerini ve adresini güncellediğin Stripe müşteri portalı bağlantısı.",
            ],
          },
          {
            heading: "Plan değiştirme",
            steps: [
              "Faturalandırma'da Planı değiştir'e tıkla.",
              "Bir kademe seç. Pro-rating Stripe tarafından otomatik yapılır — mevcut döngünün geri kalanı için farkı ödersin ve yeni fiyat bir sonraki yenilemede devreye girer.",
              "Onayla. Limitler hemen yenilenir.",
            ],
          },
          {
            heading: "Kart bilgilerini güncelleme",
            paragraphs: [
              "Faturalandırma → Ödeme yöntemi → Kartı güncelle, Stripe tarafından sunulan müşteri portalını yeni sekmede açar. Kart numaralarını kendimiz tutmayız.",
            ],
          },
          {
            heading: "Yıllık ve aylık",
            paragraphs: [
              "Yıllık faturalandırma %20 daha ucuzdur. Faturalandırma → Yıllığa geç ile değiştir.",
            ],
          },
          {
            heading: "İptal",
            paragraphs: [
              "İstediğin zaman Faturalandırma → Planı iptal et'ten iptal et. Çalışanların ödenmiş dönemin sonuna kadar çalışmaya devam eder; o tarihte kiracın askıya alınır ve başka ücret çıkmaz.",
            ],
          },
        ],
      },
    },
  },

  /* ── 10. Troubleshooting ──────────────────────────────────────── */
  {
    slug: "troubleshooting",
    audience: "user",
    order: 90,
    iconGlyph: "⚠",
    content: {
      en: {
        title: "Troubleshooting",
        tagline: "Common errors and how to clear them.",
        body: [
          {
            heading: "The worker isn't responding",
            bullets: [
              "Check Workforce — is the worker status `paused` or `terminated`? Resume it.",
              "Check Integrations — is the relevant channel showing yellow (auth expired) or red (broken)? Re-authenticate.",
              "Check Billing — are you at your AI-spend cap for the month?",
            ],
          },
          {
            heading: "402 Payment Required when hiring",
            paragraphs: [
              "You've hit a plan cap (workers, team seats, channels, or AI dollars). The error message names the specific cap. Open Billing, upgrade the plan, and retry.",
            ],
          },
          {
            heading: "An invite email never arrived",
            bullets: [
              "Check the spam folder.",
              "Verify the address has no typo in Team.",
              "If still missing, revoke the invitation and re-issue. A fresh email gets queued.",
            ],
          },
          {
            heading: "Brand Bible source stuck on `processing`",
            paragraphs: [
              "Large PDFs can take a minute. If a source is still processing after five minutes, delete it and re-ingest. If the same source fails twice, file a support ticket from the help center.",
            ],
          },
          {
            heading: "Login keeps asking for OTP",
            paragraphs: [
              "OTP is required every time you sign in from a new device. To clear all sessions and start fresh, open Settings → Security → Revoke all sessions.",
            ],
          },
        ],
      },
      tr: {
        title: "Sorun giderme",
        tagline: "Yaygın hatalar ve bunları nasıl çözeceğin.",
        body: [
          {
            heading: "Çalışan yanıt vermiyor",
            bullets: [
              "İş gücü'nü kontrol et — çalışan durumu `duraklatıldı` ya da `sonlandırıldı` mı? Devam ettir.",
              "Entegrasyonlar'ı kontrol et — ilgili kanal sarı (oturum süresi dolmuş) ya da kırmızı (bozuk) mu? Yeniden kimlik doğrula.",
              "Faturalandırma'yı kontrol et — bu ay AI harcama limitine ulaştın mı?",
            ],
          },
          {
            heading: "İşe alırken 402 Payment Required",
            paragraphs: [
              "Bir plan limitine ulaştın (çalışanlar, ekip koltukları, kanallar veya AI doları). Hata mesajı hangi limit olduğunu söyler. Faturalandırma'yı aç, planı yükselt ve tekrar dene.",
            ],
          },
          {
            heading: "Davet e-postası gelmedi",
            bullets: [
              "Spam klasörünü kontrol et.",
              "Ekip'te adreste yazım hatası olmadığını doğrula.",
              "Hâlâ yoksa daveti iptal edip yeniden gönder. Yeni bir e-posta kuyruğa alınır.",
            ],
          },
          {
            heading: "Brand Bible kaynağı `işleniyor`'da takıldı",
            paragraphs: [
              "Büyük PDF'ler bir dakika sürebilir. Beş dakika sonra hâlâ işleniyorsa, kaynağı sil ve yeniden al. Aynı kaynak iki kez başarısız olursa, yardım merkezinden destek talebi aç.",
            ],
          },
          {
            heading: "Giriş sürekli OTP istiyor",
            paragraphs: [
              "OTP, yeni bir cihazdan her oturum açtığında istenir. Tüm oturumları temizleyip baştan başlamak için Ayarlar → Güvenlik → Tüm oturumları iptal et'i aç.",
            ],
          },
        ],
      },
    },
  },

  /* ── 11. FAQ ──────────────────────────────────────────────────── */
  {
    slug: "faq",
    audience: "both",
    order: 100,
    iconGlyph: "?",
    content: {
      en: {
        title: "FAQ",
        tagline: "Quick answers to questions we hear most.",
        body: [
          {
            heading: "Can I use my own AI model?",
            paragraphs: [
              "Today, no. The platform routes calls to a curated set of providers (Anthropic, OpenAI, Google) and aggregates usage for billing. A BYO-model feature is on the roadmap for tenants with strict data-residency needs.",
            ],
          },
          {
            heading: "Where is my data stored?",
            paragraphs: [
              "Postgres on Railway (EU region). Files in Cloudflare R2 (EU region). Per-tenant data keys encrypt every credential at rest. Every cross-tenant query is gated on `tenant_id` enforcement in the SQL layer; isolation is mandatory.",
            ],
          },
          {
            heading: "Can I cancel any time?",
            paragraphs: [
              "Yes. Cancel from Billing → Cancel plan. Workers run until the end of the paid period.",
            ],
          },
          {
            heading: "How is AI spend calculated?",
            paragraphs: [
              "Every model call is logged in microcents. Cap is enforced per UTC calendar month. The Billing page shows live month-to-date spend versus your plan's monthly cap.",
            ],
          },
          {
            heading: "Why does the worker sometimes refuse to do what I ask?",
            paragraphs: [
              "Workers refuse when an action would cross a safety policy, a brand-bible rule you set, or a plan cap. The Approval Center shows the reason on every refusal.",
            ],
          },
        ],
      },
      tr: {
        title: "SSS",
        tagline: "En çok duyduğumuz soruların hızlı yanıtları.",
        body: [
          {
            heading: "Kendi AI modelimi kullanabilir miyim?",
            paragraphs: [
              "Bugün hayır. Platform çağrıları seçili bir sağlayıcı setine (Anthropic, OpenAI, Google) yönlendirir ve faturalandırma için kullanımı toplar. Sıkı veri-yer kısıtlamalı kiracılar için BYO-model özelliği yol haritasında.",
            ],
          },
          {
            heading: "Verilerim nerede saklanıyor?",
            paragraphs: [
              "Postgres, Railway'de (AB bölgesi). Dosyalar, Cloudflare R2'de (AB bölgesi). Kiracı başına veri anahtarları, her kimlik bilgisini şifreli durumda tutar. Kiracılar arası her sorgu, SQL katmanında `tenant_id` zorlamasıyla kapatılır; izolasyon zorunludur.",
            ],
          },
          {
            heading: "İstediğim zaman iptal edebilir miyim?",
            paragraphs: [
              "Evet. Faturalandırma → Planı iptal et'ten iptal et. Çalışanlar ödenmiş dönemin sonuna kadar çalışır.",
            ],
          },
          {
            heading: "AI harcaması nasıl hesaplanıyor?",
            paragraphs: [
              "Her model çağrısı mikrosent olarak loglanır. Limit, UTC takvim ayı bazında uygulanır. Faturalandırma sayfası, planının aylık limitine karşı canlı ay-bugüne kadar harcamayı gösterir.",
            ],
          },
          {
            heading: "Çalışan bazen istediğimi neden yapmıyor?",
            paragraphs: [
              "Çalışanlar, bir eylem güvenlik politikasını, senin koyduğun bir Brand Bible kuralını veya bir plan limitini ihlal edecekse reddeder. Onay Merkezi her redde gerekçeyi gösterir.",
            ],
          },
        ],
      },
    },
  },
];
