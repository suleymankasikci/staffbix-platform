// AUTO-GENERATED — do not edit by hand.
// Rich per-agent help (EN + TR) for catalog roles without a hand-authored
// ENRICHMENT entry. Produced by scripts/generate-agent-help.mts (gpt-4o),
// grounded in each role's catalog row + real tool set. The other 21 locales
// are machine-translated from these via translations.generated.ts.
import type { LocalizedAgent } from "./types";

export const GENERATED_AGENT_HELP: Record<string, { en: LocalizedAgent; tr: LocalizedAgent }> =
{
  "recruiter": {
    "en": {
      "title": "Recruiter",
      "tagline": "Efficient candidate sourcing and management.",
      "whatItDoes": [
        "The Recruiter role on Staffbix automates candidate sourcing and management. It uses LinkedIn and Email channels to draft outreach messages and engage with potential candidates.",
        "This role leverages tools to parse CVs, score candidate fit, and track applicants, ensuring a streamlined recruitment process. It handles the initial stages of recruitment, from sourcing to scheduling interviews."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "Email"
      ],
      "steps": [
        "Connect your LinkedIn and Email accounts to Staffbix.",
        "Use 'draft_sourcing_outreach' to create candidate outreach messages.",
        "Parse incoming CVs with 'parse_cv' for structured data extraction.",
        "Score candidates using 'score_candidate_fit' to match them with roles.",
        "Track candidate progress with 'track_applicant' through the recruitment pipeline."
      ],
      "exampleTasks": [
        "Draft LinkedIn outreach messages for passive candidates.",
        "Parse and extract key information from candidate CVs.",
        "Score candidates based on role requirements and experience.",
        "Register candidates and update their status in the recruitment pipeline.",
        "Schedule interviews with shortlisted candidates."
      ],
      "approvalNote": "Ensure all candidate interactions comply with company policies and legal standards.",
      "tips": [
        "Regularly update candidate status in the pipeline for accurate tracking.",
        "Use 'escalate_to_human' for complex queries or when human intervention is needed.",
        "Always verify parsed CV data for accuracy before proceeding."
      ]
    },
    "tr": {
      "title": "İşe Alım Uzmanı",
      "tagline": "Verimli aday bulma ve yönetimi.",
      "whatItDoes": [
        "Staffbix üzerindeki İşe Alım Uzmanı rolü, aday bulma ve yönetimini otomatikleştirir. Potansiyel adaylarla iletişim kurmak için LinkedIn ve E-posta kanallarını kullanarak mesaj taslakları hazırlar.",
        "Bu rol, CV'leri ayrıştırmak, aday uygunluğunu puanlamak ve başvuru sahiplerini takip etmek için araçlardan yararlanarak, sorunsuz bir işe alım süreci sağlar. İşe alımın ilk aşamalarını, aday bulmadan mülakat planlamaya kadar yönetir."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "E-posta"
      ],
      "steps": [
        "LinkedIn ve E-posta hesaplarınızı Staffbix'e bağlayın.",
        "Aday iletişim mesajları oluşturmak için 'draft_sourcing_outreach' kullanın.",
        "Gelen CV'leri yapılandırılmış veri çıkarımı için 'parse_cv' ile ayrıştırın.",
        "Adayları rollerle eşleştirmek için 'score_candidate_fit' kullanarak puanlayın.",
        "Aday ilerlemesini işe alım süreci boyunca 'track_applicant' ile takip edin."
      ],
      "exampleTasks": [
        "Pasif adaylar için LinkedIn iletişim mesajları hazırlayın.",
        "Aday CV'lerinden anahtar bilgileri ayrıştırın ve çıkarın.",
        "Rol gereksinimleri ve deneyime göre adayları puanlayın.",
        "Adayları kaydedin ve işe alım sürecindeki durumlarını güncelleyin.",
        "Kısa listeye alınan adaylarla mülakatlar planlayın."
      ],
      "approvalNote": "Tüm aday etkileşimlerinin şirket politikalarına ve yasal standartlara uygun olduğundan emin olun.",
      "tips": [
        "Doğru takip için aday durumunu düzenli olarak süreçte güncelleyin.",
        "Karmaşık sorgular veya insan müdahalesi gerektiğinde 'escalate_to_human' kullanın.",
        "Devam etmeden önce ayrıştırılan CV verilerinin doğruluğunu her zaman kontrol edin."
      ]
    }
  },
  "content-writer": {
    "en": {
      "title": "Content Writer",
      "tagline": "Craft compelling content tailored to your brand's voice.",
      "whatItDoes": [
        "The Content Writer role on Staffbix creates long-form blog posts, product descriptions, and landing page copy. It uses the 'create_content_brief' tool to register content briefs, ensuring alignment with your brand's voice and objectives.",
        "Once a brief is registered, 'produce_drafts' generates drafts for each specified channel and variant. This role also utilizes 'research_keywords' to optimize content with relevant keywords, enhancing visibility and engagement."
      ],
      "integrationsRequired": [
        "CMS",
        "Email"
      ],
      "steps": [
        "Register a content brief using 'create_content_brief'.",
        "Research keywords with 'research_keywords' for SEO optimization.",
        "Generate content drafts with 'produce_drafts'.",
        "Review and refine drafts as needed.",
        "Publish content through your CMS and distribute via Email."
      ],
      "exampleTasks": [
        "Draft a blog post about new product features.",
        "Create a landing page copy for a promotional campaign.",
        "Write product descriptions for an e-commerce site."
      ],
      "approvalNote": "Ensure all content aligns with the Brand Bible and is approved via the Approval Center before publishing.",
      "tips": [
        "Always start with a clear content brief to guide your writing.",
        "Use 'research_keywords' to enhance SEO and reach the right audience.",
        "If content requirements are unclear, escalate to a human for clarification."
      ]
    },
    "tr": {
      "title": "İçerik Yazarı",
      "tagline": "Markanızın sesine uygun etkileyici içerikler oluşturun.",
      "whatItDoes": [
        "Staffbix'teki İçerik Yazarı rolü, uzun biçimli blog yazıları, ürün açıklamaları ve açılış sayfası metinleri oluşturur. İçerik özetlerini kaydetmek için 'create_content_brief' aracını kullanarak markanızın sesi ve hedefleriyle uyum sağlar.",
        "Bir özet kaydedildikten sonra, 'produce_drafts' her belirli kanal ve varyant için taslaklar oluşturur. Bu rol ayrıca içeriği optimize etmek ve görünürlüğü ile etkileşimi artırmak için 'research_keywords' kullanarak ilgili anahtar kelimeleri araştırır."
      ],
      "integrationsRequired": [
        "CMS",
        "Email"
      ],
      "steps": [
        "'create_content_brief' kullanarak bir içerik özeti kaydedin.",
        "SEO optimizasyonu için 'research_keywords' ile anahtar kelimeleri araştırın.",
        "'produce_drafts' ile içerik taslakları oluşturun.",
        "Gerekirse taslakları gözden geçirin ve düzenleyin.",
        "İçeriği CMS üzerinden yayınlayın ve Email ile dağıtın."
      ],
      "exampleTasks": [
        "Yeni ürün özellikleri hakkında bir blog yazısı taslağı oluşturun.",
        "Bir promosyon kampanyası için açılış sayfası metni oluşturun.",
        "Bir e-ticaret sitesi için ürün açıklamaları yazın."
      ],
      "approvalNote": "Tüm içeriğin Brand Bible ile uyumlu olduğundan emin olun ve yayınlamadan önce Approval Center üzerinden onay alın.",
      "tips": [
        "Yazınıza rehberlik edecek net bir içerik özeti ile başlayın.",
        "SEO'yu geliştirmek ve doğru kitleye ulaşmak için 'research_keywords' kullanın.",
        "İçerik gereksinimleri belirsizse, açıklama için bir insana yönlendirin."
      ]
    }
  },
  "email-marketer": {
    "en": {
      "title": "Email Marketer",
      "tagline": "Efficiently manage and execute email marketing campaigns.",
      "whatItDoes": [
        "The Email Marketer role on Staffbix enables you to segment your audience, draft compelling subject lines, and create content briefs for email campaigns. It helps you ensure your emails reach the right people with the right message.",
        "Using tools like 'segment_audience' and 'draft_subject_lines', you can preview and refine your audience and email content. Additionally, 'produce_drafts' allows you to generate email drafts based on predefined content briefs."
      ],
      "integrationsRequired": [
        "Stripe",
        "LinkedIn"
      ],
      "steps": [
        "Create a content brief using 'create_content_brief'.",
        "Segment your audience with 'segment_audience'.",
        "Draft subject lines using 'draft_subject_lines'.",
        "Produce email drafts with 'produce_drafts'.",
        "Queue emails using 'queue_outreach_email'."
      ],
      "exampleTasks": [
        "Segment an audience for a new product launch email.",
        "Draft and A/B test subject lines for a promotional campaign.",
        "Generate email content drafts for a monthly newsletter."
      ],
      "approvalNote": "All email content must be reviewed in the Approval Center before sending.",
      "tips": [
        "Use 'segment_audience' to ensure your email reaches the intended recipients.",
        "Draft multiple subject lines to test which resonates best with your audience."
      ]
    },
    "tr": {
      "title": "E-posta Pazarlamacısı",
      "tagline": "E-posta pazarlama kampanyalarını verimli bir şekilde yönetin ve yürütün.",
      "whatItDoes": [
        "Staffbix üzerindeki E-posta Pazarlamacısı rolü, kitlenizi segmentlere ayırmanıza, etkileyici konu başlıkları taslağı oluşturmanıza ve e-posta kampanyaları için içerik özetleri hazırlamanıza olanak tanır. E-postalarınızın doğru mesajla doğru kişilere ulaşmasını sağlar.",
        "'segment_audience' ve 'draft_subject_lines' gibi araçları kullanarak kitlenizi ve e-posta içeriğinizi önizleyebilir ve iyileştirebilirsiniz. Ayrıca, 'produce_drafts' ile önceden tanımlanmış içerik özetlerine dayalı e-posta taslakları oluşturabilirsiniz."
      ],
      "integrationsRequired": [
        "Stripe",
        "LinkedIn"
      ],
      "steps": [
        "'create_content_brief' kullanarak bir içerik özeti oluşturun.",
        "'segment_audience' ile kitlenizi segmentlere ayırın.",
        "'draft_subject_lines' kullanarak konu başlıkları taslağı oluşturun.",
        "'produce_drafts' ile e-posta taslakları hazırlayın.",
        "'queue_outreach_email' kullanarak e-postaları sıraya alın."
      ],
      "exampleTasks": [
        "Yeni bir ürün lansmanı e-postası için bir kitle segmenti oluşturun.",
        "Promosyon kampanyası için konu başlıkları taslağı hazırlayın ve A/B testi yapın.",
        "Aylık bülten için e-posta içerik taslakları oluşturun."
      ],
      "approvalNote": "Tüm e-posta içerikleri gönderilmeden önce Approval Center'da incelenmelidir.",
      "tips": [
        "E-postanızın hedeflenen alıcılara ulaşmasını sağlamak için 'segment_audience' kullanın.",
        "Hedef kitlenizle en iyi uyum sağlayanı test etmek için birden fazla konu başlığı taslağı hazırlayın."
      ]
    }
  },
  "visual-designer": {
    "en": {
      "title": "Visual Designer",
      "tagline": "Craft brand-consistent visuals for digital marketing.",
      "whatItDoes": [
        "The Visual Designer role on Staffbix creates structured design briefs for various digital assets like Instagram posts, Facebook ads, and email headers. It ensures brand consistency through detailed specifications including concept, palette, typography, and copy hierarchy.",
        "Using the 'create_design_brief' tool, it generates comprehensive briefs without creating images. The 'spec_image_variants' tool helps in defining size and format variants for different channels, ensuring the designs meet platform-specific requirements."
      ],
      "integrationsRequired": [
        "Instagram",
        "Facebook",
        "Email"
      ],
      "steps": [
        "Log into Staffbix and select the Visual Designer role.",
        "Use 'create_design_brief' to generate a design brief for your asset.",
        "Select channels to apply 'spec_image_variants' for size and format requirements.",
        "Review the specifications and ensure they align with the Brand Bible.",
        "Submit the brief for approval through the Approval Center."
      ],
      "exampleTasks": [
        "Create a brief for an Instagram carousel ad.",
        "Specify image variants for a Facebook feed post.",
        "Develop a design brief for an email newsletter header."
      ],
      "approvalNote": "All design briefs must be approved via the Approval Center before execution.",
      "tips": [
        "Always refer to the Brand Bible for consistency in design elements.",
        "Use 'escalate_to_human' if a task requires human creativity or judgment.",
        "Ensure all GDPR-related requests are recorded using 'gdpr_data_request'."
      ]
    },
    "tr": {
      "title": "Görsel Tasarımcı",
      "tagline": "Dijital pazarlama için marka tutarlılığına sahip görseller oluşturun.",
      "whatItDoes": [
        "Staffbix üzerindeki Görsel Tasarımcı rolü, Instagram gönderileri, Facebook reklamları ve e-posta başlıkları gibi çeşitli dijital varlıklar için yapılandırılmış tasarım brifingleri oluşturur. Marka tutarlılığını, konsept, palet, tipografi ve metin hiyerarşisi gibi detaylı spesifikasyonlar aracılığıyla sağlar.",
        "'create_design_brief' aracı kullanılarak, görüntü oluşturmadan kapsamlı brifingler oluşturulur. 'spec_image_variants' aracı, farklı kanallar için boyut ve format varyantlarını tanımlamaya yardımcı olur, böylece tasarımlar platforma özgü gereksinimleri karşılar."
      ],
      "integrationsRequired": [
        "Instagram",
        "Facebook",
        "E-posta"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Görsel Tasarımcı rolünü seçin.",
        "Varlığınız için bir tasarım brifingi oluşturmak üzere 'create_design_brief' kullanın.",
        "Boyut ve format gereksinimleri için 'spec_image_variants' uygulamak üzere kanalları seçin.",
        "Spesifikasyonları gözden geçirin ve Brand Bible ile uyumlu olduklarından emin olun.",
        "Brifingi onay için Approval Center üzerinden gönderin."
      ],
      "exampleTasks": [
        "Bir Instagram karusel reklamı için brifing oluşturun.",
        "Bir Facebook akış gönderisi için görüntü varyantlarını belirtin.",
        "Bir e-posta bülteni başlığı için tasarım brifingi geliştirin."
      ],
      "approvalNote": "Tüm tasarım brifingleri uygulanmadan önce Approval Center aracılığıyla onaylanmalıdır.",
      "tips": [
        "Tasarım öğelerinde tutarlılık için her zaman Brand Bible'a başvurun.",
        "Bir görev insan yaratıcılığı veya yargısı gerektiriyorsa 'escalate_to_human' kullanın.",
        "Tüm GDPR ile ilgili taleplerin 'gdpr_data_request' kullanılarak kaydedildiğinden emin olun."
      ]
    }
  },
  "pr-manager": {
    "en": {
      "title": "PR Manager",
      "tagline": "Streamline your press communications.",
      "whatItDoes": [
        "The PR Manager drafts structured press releases and personalized pitches to journalists. It ensures all drafts are review-ready, with placeholders for quotes and neutral positioning on competitors.",
        "The role also facilitates GDPR data requests, ensuring compliance by recording requests for data access, correction, or deletion, and pausing for human review."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the 'Roles' section and select 'PR Manager'.",
        "Connect your Email account for communication.",
        "Review and customize press release drafts as needed.",
        "Submit GDPR data requests for human review when necessary."
      ],
      "exampleTasks": [
        "Draft a press release for a new product launch.",
        "Write a personalized pitch to a journalist about a recent company achievement.",
        "Record a GDPR data erasure request from a customer."
      ],
      "approvalNote": "All press releases and pitches require operator review before distribution.",
      "tips": [
        "Always fill in quote placeholders with accurate information before finalizing a press release.",
        "Use the 'escalate_to_human' tool for complex or sensitive journalist interactions.",
        "Regularly check the Approval Center for pending GDPR requests."
      ]
    },
    "tr": {
      "title": "PR Yöneticisi",
      "tagline": "Basın iletişimlerinizi kolaylaştırın.",
      "whatItDoes": [
        "PR Yöneticisi, yapılandırılmış basın bültenleri ve gazetecilere kişiselleştirilmiş teklifler hazırlar. Tüm taslakların incelemeye hazır olmasını sağlar, alıntılar için yer tutucular ve rakipler hakkında tarafsız bir konum içerir.",
        "Bu rol ayrıca GDPR veri taleplerini kolaylaştırır, veri erişimi, düzeltme veya silme taleplerini kaydederek uyumluluğu sağlar ve insan incelemesi için duraklatır."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'PR Yöneticisi'ni seçin.",
        "İletişim için Email hesabınızı bağlayın.",
        "Basın bülteni taslaklarını gerektiği gibi gözden geçirin ve özelleştirin.",
        "Gerekli olduğunda GDPR veri taleplerini insan incelemesine gönderin."
      ],
      "exampleTasks": [
        "Yeni bir ürün lansmanı için basın bülteni taslağı hazırlayın.",
        "Son şirket başarısı hakkında bir gazeteciye kişiselleştirilmiş bir teklif yazın.",
        "Bir müşteriden gelen GDPR veri silme talebini kaydedin."
      ],
      "approvalNote": "Tüm basın bültenleri ve teklifler dağıtımdan önce operatör incelemesi gerektirir.",
      "tips": [
        "Bir basın bültenini sonlandırmadan önce alıntı yer tutucularını doğru bilgilerle doldurun.",
        "Karmaşık veya hassas gazeteci etkileşimleri için 'escalate_to_human' aracını kullanın.",
        "Bekleyen GDPR talepleri için düzenli olarak Approval Center'ı kontrol edin."
      ]
    }
  },
  "translator": {
    "en": {
      "title": "Translator",
      "tagline": "Localizes content into 23 languages with market-specific precision.",
      "whatItDoes": [
        "The Translator role on Staffbix ensures accurate and culturally appropriate translations of outbound content across 23 languages. It leverages the 'translate_text' tool to maintain brand consistency and market-appropriate formality.",
        "This role uses 'build_glossary' to create and update a glossary of terms that should remain untranslated, ensuring brand terms and technical jargon are preserved. It is crucial for maintaining the integrity of the Brand Bible."
      ],
      "integrationsRequired": [
        "Email",
        "Web",
        "CMS"
      ],
      "steps": [
        "Access the Staffbix platform and navigate to the Translator role.",
        "Use 'build_glossary' to establish or update the brand-specific glossary.",
        "Receive a translation request via Email, Web, or CMS.",
        "Apply 'translate_text' to translate content while adhering to the glossary.",
        "If issues arise, use 'escalate_to_human' for complex or sensitive cases."
      ],
      "exampleTasks": [
        "Translate a marketing email from English to French, ensuring brand terms remain unchanged.",
        "Localize a product description for the German market, maintaining technical jargon as per the Brand Bible.",
        "Handle a GDPR data request by recording it and pausing the conversation for human intervention."
      ],
      "approvalNote": "Ensure all translations align with the Brand Bible and market-specific guidelines before finalizing.",
      "tips": [
        "Always use 'translate_text' before responding to translation requests to ensure accuracy.",
        "Regularly update the glossary with 'build_glossary' to reflect any new brand terms or changes.",
        "Use 'escalate_to_human' for any requests that fall outside your translation authority."
      ]
    },
    "tr": {
      "title": "Çevirmen",
      "tagline": "İçeriği pazar odaklı hassasiyetle 23 dile yerelleştirir.",
      "whatItDoes": [
        "Staffbix üzerindeki Çevirmen rolü, 23 dildeki dışa dönük içeriğin doğru ve kültürel olarak uygun çevirilerini sağlar. Marka tutarlılığını ve pazara uygun resmiyeti korumak için 'translate_text' aracını kullanır.",
        "Bu rol, marka terimlerinin ve teknik jargonun korunmasını sağlamak için çevrilmemesi gereken terimlerin sözlüğünü oluşturmak ve güncellemek amacıyla 'build_glossary' kullanır. Marka Kitabı'nın bütünlüğünü korumak için kritik öneme sahiptir."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web",
        "CMS"
      ],
      "steps": [
        "Staffbix platformuna erişin ve Çevirmen rolüne gidin.",
        "Marka odaklı sözlüğü oluşturmak veya güncellemek için 'build_glossary' kullanın.",
        "E-posta, Web veya CMS üzerinden bir çeviri talebi alın.",
        "İçeriği sözlüğe uygun olarak çevirmek için 'translate_text' uygulayın.",
        "Sorunlar ortaya çıkarsa, karmaşık veya hassas durumlar için 'escalate_to_human' kullanın."
      ],
      "exampleTasks": [
        "Bir pazarlama e-postasını İngilizceden Fransızcaya çevirin, marka terimlerinin değişmeden kalmasını sağlayın.",
        "Alman pazarı için bir ürün açıklamasını yerelleştirin, Marka Kitabı'na uygun olarak teknik jargonu koruyun.",
        "Bir GDPR veri talebini kaydedip insan müdahalesi için konuşmayı durdurarak yönetin."
      ],
      "approvalNote": "Tüm çevirilerin Marka Kitabı ve pazar odaklı yönergelerle uyumlu olduğundan emin olunmadan önce sonlandırmayın.",
      "tips": [
        "Doğruluğu sağlamak için çeviri taleplerine yanıt vermeden önce her zaman 'translate_text' kullanın.",
        "Yeni marka terimleri veya değişiklikleri yansıtmak için sözlüğü düzenli olarak 'build_glossary' ile güncelleyin.",
        "Çeviri yetkinizin dışına çıkan talepler için 'escalate_to_human' kullanın."
      ]
    }
  },
  "exec-assistant": {
    "en": {
      "title": "Executive Assistant",
      "tagline": "Streamline operations with efficient inbox and calendar management.",
      "whatItDoes": [
        "The Executive Assistant role on Staffbix efficiently manages your inbox and calendar. It uses the triage_inbox tool to prioritize emails by urgency and importance, suggesting concise actions for each message.",
        "For meetings, the prepare_meeting_brief tool generates a comprehensive one-page summary, including key talking points and risks. This ensures you're well-prepared for discussions.",
        "The role also handles booking meetings and sending follow-up emails, ensuring seamless communication and scheduling."
      ],
      "integrationsRequired": [
        "Email",
        "Calendar"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Executive Assistant'.",
        "Connect your Email and Calendar accounts to Staffbix.",
        "Enable the triage_inbox and prepare_meeting_brief tools.",
        "Start managing your inbox and calendar through the Staffbix dashboard."
      ],
      "exampleTasks": [
        "Prioritize and suggest actions for 50 new emails.",
        "Prepare a meeting brief for a call with a potential client.",
        "Book a discovery call with a qualified lead.",
        "Draft a follow-up email for a prospect with a long decision timeline.",
        "Escalate a complex customer request to a human teammate."
      ],
      "approvalNote": "Ensure all integrations are authorized and comply with company data policies.",
      "tips": [
        "Regularly review your inbox triage to stay on top of urgent tasks.",
        "Use the meeting brief tool to quickly get up to speed before calls.",
        "Always escalate to a human when unsure about handling a request."
      ]
    },
    "tr": {
      "title": "Yönetici Asistanı",
      "tagline": "Verimli gelen kutusu ve takvim yönetimi ile operasyonları kolaylaştırın.",
      "whatItDoes": [
        "Staffbix üzerindeki Yönetici Asistanı rolü, gelen kutunuzu ve takviminizi verimli bir şekilde yönetir. triage_inbox aracı, e-postaları aciliyet ve öneme göre önceliklendirir ve her mesaj için özlü eylemler önerir.",
        "Toplantılar için, prepare_meeting_brief aracı, ana konuşma noktaları ve riskler dahil olmak üzere kapsamlı bir sayfalık özet oluşturur. Bu, tartışmalara iyi hazırlanmanızı sağlar.",
        "Rol ayrıca toplantı rezervasyonu yapar ve takip e-postaları gönderir, kesintisiz iletişim ve planlama sağlar."
      ],
      "integrationsRequired": [
        "E-posta",
        "Takvim"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Yönetici Asistanı'nı seçin.",
        "E-posta ve Takvim hesaplarınızı Staffbix'e bağlayın.",
        "triage_inbox ve prepare_meeting_brief araçlarını etkinleştirin.",
        "Gelen kutunuzu ve takviminizi Staffbix panosu üzerinden yönetmeye başlayın."
      ],
      "exampleTasks": [
        "50 yeni e-posta için önceliklendirme ve eylem önerileri yapın.",
        "Potansiyel bir müşteriyle yapılacak görüşme için toplantı özeti hazırlayın.",
        "Nitelikli bir adayla keşif görüşmesi ayarlayın.",
        "Uzun karar verme sürecine sahip bir aday için takip e-postası taslağı hazırlayın.",
        "Karmaşık bir müşteri talebini insan bir takım arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm entegrasyonların yetkilendirildiğinden ve şirket veri politikalarına uygun olduğundan emin olun.",
      "tips": [
        "Acil görevlerin üstesinden gelmek için gelen kutusu triyajınızı düzenli olarak gözden geçirin.",
        "Görüşmelerden önce hızlıca bilgi sahibi olmak için toplantı özeti aracını kullanın.",
        "Bir talebi nasıl ele alacağınızdan emin olmadığınızda her zaman bir insana yönlendirin."
      ]
    }
  },
  "business-analyst": {
    "en": {
      "title": "Business Analyst",
      "tagline": "Analyze metrics, identify anomalies, and draft business recommendations.",
      "whatItDoes": [
        "The Business Analyst role on Staffbix focuses on analyzing business metrics to identify significant changes. Using tools like compare_period_metric, it flags anomalies by comparing metrics over time.",
        "Once anomalies are detected, the generate_business_recommendation tool helps draft structured memos for business operators, suggesting potential actions based on the data insights.",
        "The role also involves querying lead breakdowns to understand lead sources and statuses, aiding in comprehensive business analysis."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Business Analyst role.",
        "Use compare_period_metric to analyze key business metrics.",
        "Identify and flag any anomalies detected in the data.",
        "Draft a business recommendation memo using generate_business_recommendation.",
        "Submit the memo for review in the Approval Center."
      ],
      "exampleTasks": [
        "Compare sales metrics from the current and previous week to identify anomalies.",
        "Generate a business recommendation memo after detecting a 25% drop in lead conversions.",
        "Query lead breakdowns to analyze the most effective lead sources.",
        "Compute monthly revenue metrics to assist in financial planning.",
        "Draft a Monday morning briefing summarizing key business insights."
      ],
      "approvalNote": "All business recommendations must be reviewed in the Approval Center before implementation.",
      "tips": [
        "Always use compute_metric before quoting any numbers to ensure accuracy.",
        "Flag anomalies only when the percentage change exceeds the set threshold.",
        "Use query_leads_breakdown to gain insights into lead performance and source effectiveness."
      ]
    },
    "tr": {
      "title": "İş Analisti",
      "tagline": "Metrikleri analiz edin, anormallikleri belirleyin ve iş önerileri hazırlayın.",
      "whatItDoes": [
        "Staffbix'teki İş Analisti rolü, önemli değişiklikleri belirlemek için iş metriklerini analiz etmeye odaklanır. compare_period_metric gibi araçlar kullanarak, metrikleri zaman içinde karşılaştırarak anormallikleri işaretler.",
        "Anormallikler tespit edildikten sonra, generate_business_recommendation aracı, veri içgörülerine dayalı olarak potansiyel eylemler öneren yapılandırılmış notlar hazırlamaya yardımcı olur.",
        "Rol ayrıca, kapsamlı iş analizi için potansiyel kaynaklarını ve durumlarını anlamak amacıyla potansiyel dökümlerini sorgulamayı içerir."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve İş Analisti rolüne gidin.",
        "Ana iş metriklerini analiz etmek için compare_period_metric kullanın.",
        "Verilerde tespit edilen anormallikleri belirleyin ve işaretleyin.",
        "generate_business_recommendation kullanarak bir iş önerisi notu hazırlayın.",
        "Notu onay için Approval Center'a gönderin."
      ],
      "exampleTasks": [
        "Anormallikleri belirlemek için mevcut ve önceki haftanın satış metriklerini karşılaştırın.",
        "Potansiyel dönüşümlerde %25 düşüş tespit ettikten sonra bir iş önerisi notu hazırlayın.",
        "En etkili potansiyel kaynaklarını analiz etmek için potansiyel dökümlerini sorgulayın.",
        "Finansal planlamaya yardımcı olmak için aylık gelir metriklerini hesaplayın.",
        "Önemli iş içgörülerini özetleyen bir Pazartesi sabahı brifingi hazırlayın."
      ],
      "approvalNote": "Tüm iş önerileri uygulamadan önce Approval Center'da incelenmelidir.",
      "tips": [
        "Herhangi bir sayıyı alıntılamadan önce doğruluğu sağlamak için her zaman compute_metric kullanın.",
        "Yüzde değişimi belirlenen eşiği aştığında yalnızca anormallikleri işaretleyin.",
        "Potansiyel performansı ve kaynak etkinliğini anlamak için query_leads_breakdown kullanın."
      ]
    }
  },
  "strategic-advisor": {
    "en": {
      "title": "Strategic Advisor",
      "tagline": "Enhance decision-making with strategic insights.",
      "whatItDoes": [
        "The Strategic Advisor reviews decisions by asking critical questions and suggesting alternatives. It ensures decisions align with past choices and offers counter-positions for balanced perspectives.",
        "It logs decisions for future reference, comparing metrics to identify anomalies. This aids in crafting informed business recommendations, ensuring strategic consistency and improvement."
      ],
      "integrationsRequired": [
        "Approval Center",
        "LinkedIn"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Strategic Advisor role.",
        "Integrate with the Approval Center for decision tracking.",
        "Connect your LinkedIn account for professional insights.",
        "Use 'review_decision' to evaluate strategic choices.",
        "Log decisions with 'log_decision' for future analysis."
      ],
      "exampleTasks": [
        "Review a potential partnership decision by asking critical questions.",
        "Log a strategic decision about market expansion.",
        "Compare quarterly revenue metrics to identify anomalies.",
        "Generate a business recommendation memo after a significant metric change.",
        "Surface past decisions to ensure alignment with current strategies."
      ],
      "approvalNote": "Ensure all decisions are logged in the Approval Center for compliance and future reference.",
      "tips": [
        "Always use 'surface_past_decisions' before advising on new strategies.",
        "Log every decision immediately to maintain an accurate strategic history.",
        "Use 'compare_period_metric' to justify any recommended strategic shifts."
      ]
    },
    "tr": {
      "title": "Stratejik Danışman",
      "tagline": "Stratejik içgörülerle karar alma süreçlerini geliştirin.",
      "whatItDoes": [
        "Stratejik Danışman, kritik sorular sorarak ve alternatifler önererek kararları gözden geçirir. Kararların geçmiş seçimlerle uyumlu olmasını sağlar ve dengeli bakış açıları için karşı pozisyonlar sunar.",
        "Gelecekteki referanslar için kararları kaydeder, metrikleri karşılaştırarak anormallikleri belirler. Bu, stratejik tutarlılık ve iyileştirme sağlamak için bilgilendirilmiş iş önerileri oluşturmaya yardımcı olur."
      ],
      "integrationsRequired": [
        "Approval Center",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Stratejik Danışman rolüne gidin.",
        "Karar takibi için Approval Center ile entegre olun.",
        "Profesyonel içgörüler için LinkedIn hesabınızı bağlayın.",
        "Stratejik seçimleri değerlendirmek için 'review_decision' kullanın.",
        "Gelecekteki analizler için kararları 'log_decision' ile kaydedin."
      ],
      "exampleTasks": [
        "Kritik sorular sorarak potansiyel bir ortaklık kararını gözden geçirin.",
        "Pazar genişlemesi hakkında stratejik bir kararı kaydedin.",
        "Anormallikleri belirlemek için üç aylık gelir metriklerini karşılaştırın.",
        "Önemli bir metrik değişikliğinden sonra bir iş öneri notu oluşturun.",
        "Mevcut stratejilerle uyumu sağlamak için geçmiş kararları ortaya çıkarın."
      ],
      "approvalNote": "Tüm kararların uyumluluk ve gelecekteki referanslar için Approval Center'da kaydedildiğinden emin olun.",
      "tips": [
        "Yeni stratejiler hakkında tavsiyede bulunmadan önce her zaman 'surface_past_decisions' kullanın.",
        "Doğru bir stratejik geçmişi korumak için her kararı hemen kaydedin.",
        "Önerilen stratejik değişiklikleri gerekçelendirmek için 'compare_period_metric' kullanın."
      ]
    }
  },
  "account-manager": {
    "en": {
      "title": "Account Manager",
      "tagline": "Manage customer relationships and drive account growth.",
      "whatItDoes": [
        "The Account Manager role focuses on maintaining and expanding existing customer relationships. It involves handling renewals, upsells, and monitoring churn signals to ensure customer satisfaction and retention.",
        "Utilize tools like 'track_expansion_opportunity' to identify growth signals and 'escalate_to_human' for complex issues. This role requires proactive communication and strategic planning to maximize account value."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Account Manager role.",
        "Use 'lookup_order' to verify customer order details before any discussions.",
        "Monitor accounts for upsell opportunities with 'track_expansion_opportunity'.",
        "Draft follow-up emails using 'send_followup_email' for nurturing leads.",
        "Escalate complex issues to a human agent with 'escalate_to_human'."
      ],
      "exampleTasks": [
        "Verify customer order status before promising delivery times.",
        "Identify and record upsell opportunities when a customer shows interest.",
        "Draft personalized follow-up emails for prospects with long timelines.",
        "Escalate a request for a large refund to a human teammate.",
        "Record a GDPR data request when a customer asks for data erasure."
      ],
      "approvalNote": "Ensure all customer interactions are logged in the Approval Center for compliance.",
      "tips": [
        "Always verify order details with 'lookup_order' before making commitments.",
        "Use 'track_expansion_opportunity' to proactively identify growth signals.",
        "Escalate issues beyond your authority to maintain customer trust."
      ]
    },
    "tr": {
      "title": "Hesap Yöneticisi",
      "tagline": "Müşteri ilişkilerini yönetin ve hesap büyümesini sağlayın.",
      "whatItDoes": [
        "Hesap Yöneticisi rolü, mevcut müşteri ilişkilerini sürdürmeye ve genişletmeye odaklanır. Yenilemeler, ek satışlar ve müşteri memnuniyetini ve bağlılığını sağlamak için müşteri kaybı sinyallerinin izlenmesini içerir.",
        "Büyüme sinyallerini belirlemek için 'track_expansion_opportunity' ve karmaşık sorunlar için 'escalate_to_human' gibi araçları kullanın. Bu rol, hesap değerini en üst düzeye çıkarmak için proaktif iletişim ve stratejik planlama gerektirir."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Hesap Yöneticisi rolüne gidin.",
        "Herhangi bir görüşmeden önce müşteri sipariş detaylarını doğrulamak için 'lookup_order' kullanın.",
        "'track_expansion_opportunity' ile ek satış fırsatlarını izleyin.",
        "Potansiyel müşterileri beslemek için 'send_followup_email' kullanarak takip e-postaları taslak hazırlayın.",
        "Karmaşık sorunları 'escalate_to_human' ile bir insan temsilciye yönlendirin."
      ],
      "exampleTasks": [
        "Teslimat süreleri vaat etmeden önce müşteri sipariş durumunu doğrulayın.",
        "Bir müşteri ilgi gösterdiğinde ek satış fırsatlarını belirleyin ve kaydedin.",
        "Uzun zaman çizelgeleri olan potansiyel müşteriler için kişiselleştirilmiş takip e-postaları taslak hazırlayın.",
        "Büyük bir geri ödeme talebini bir insan takım arkadaşına yönlendirin.",
        "Bir müşteri veri silme talebinde bulunduğunda bir GDPR veri talebini kaydedin."
      ],
      "approvalNote": "Uyumluluk için tüm müşteri etkileşimlerinin Approval Center'da kaydedildiğinden emin olun.",
      "tips": [
        "Taahhütlerde bulunmadan önce her zaman 'lookup_order' ile sipariş detaylarını doğrulayın.",
        "Büyüme sinyallerini proaktif olarak belirlemek için 'track_expansion_opportunity' kullanın.",
        "Müşteri güvenini korumak için yetkinizin ötesindeki sorunları yönlendirin."
      ]
    }
  },
  "customer-onboarder": {
    "en": {
      "title": "Customer Onboarder",
      "tagline": "Guide new customers through their onboarding journey efficiently.",
      "whatItDoes": [
        "The Customer Onboarder assists new users in completing their setup process. It tracks their progress using the 'record_onboarding_step' tool, ensuring they don't get stuck and helping them move smoothly through each step.",
        "If a customer encounters issues beyond the Onboarder's scope, it uses 'escalate_to_human' to transfer the case to a human teammate. This ensures that complex or sensitive issues are handled with care.",
        "The role also sends personalized follow-up emails using 'send_followup_email' to engage prospects who show interest but aren't ready for immediate action."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log in to Staffbix and navigate to the Customer Onboarder role.",
        "Use 'record_onboarding_step' to track customer progress through onboarding.",
        "Identify stalled users and use 'escalate_to_human' for complex issues.",
        "Draft and send follow-up emails with 'send_followup_email' for interested prospects.",
        "Monitor onboarding completion and adjust strategies as needed."
      ],
      "exampleTasks": [
        "Track a customer's progress through the onboarding process.",
        "Send a follow-up email to a prospect who needs more time.",
        "Escalate a complex customer issue to a human teammate.",
        "Record a GDPR data request for a customer.",
        "Identify and assist customers who are stuck in the onboarding process."
      ],
      "approvalNote": "Ensure all GDPR data requests are recorded accurately and escalated for human review.",
      "tips": [
        "Always use 'record_onboarding_step' to keep track of customer progress.",
        "Escalate issues promptly to avoid customer dissatisfaction.",
        "Personalize follow-up emails based on specific customer interactions."
      ]
    },
    "tr": {
      "title": "Müşteri Yönlendirme Uzmanı",
      "tagline": "Yeni müşterileri onboarding yolculuklarında verimli bir şekilde yönlendirin.",
      "whatItDoes": [
        "Müşteri Yönlendirme Uzmanı, yeni kullanıcıların kurulum süreçlerini tamamlamalarına yardımcı olur. 'record_onboarding_step' aracı ile ilerlemelerini takip eder, takılmalarını önler ve her adımı sorunsuz bir şekilde geçmelerine yardımcı olur.",
        "Bir müşteri, Yönlendirme Uzmanı'nın kapsamını aşan sorunlarla karşılaşırsa, durumu bir insan takım arkadaşına aktarmak için 'escalate_to_human' kullanılır. Bu, karmaşık veya hassas sorunların özenle ele alınmasını sağlar.",
        "Rol ayrıca, ilgi gösteren ancak hemen harekete geçmeye hazır olmayan potansiyel müşterilerle etkileşim kurmak için 'send_followup_email' kullanarak kişiselleştirilmiş takip e-postaları gönderir."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Müşteri Yönlendirme Uzmanı rolüne gidin.",
        "Müşteri ilerlemesini onboarding sürecinde izlemek için 'record_onboarding_step' kullanın.",
        "Takılmış kullanıcıları belirleyin ve karmaşık sorunlar için 'escalate_to_human' kullanın.",
        "İlgilenen potansiyel müşteriler için 'send_followup_email' ile takip e-postaları hazırlayın ve gönderin.",
        "Onboarding tamamlanmasını izleyin ve stratejileri gerektiği gibi ayarlayın."
      ],
      "exampleTasks": [
        "Bir müşterinin onboarding sürecindeki ilerlemesini takip edin.",
        "Daha fazla zamana ihtiyacı olan bir potansiyel müşteriye takip e-postası gönderin.",
        "Karmaşık bir müşteri sorununu bir insan takım arkadaşına aktarın.",
        "Bir müşteri için GDPR veri talebini kaydedin.",
        "Onboarding sürecinde takılan müşterileri belirleyin ve yardımcı olun."
      ],
      "approvalNote": "Tüm GDPR veri taleplerinin doğru bir şekilde kaydedildiğinden ve insan incelemesine aktarıldığından emin olun.",
      "tips": [
        "Müşteri ilerlemesini takip etmek için her zaman 'record_onboarding_step' kullanın.",
        "Müşteri memnuniyetsizliğini önlemek için sorunları hızlıca aktarın.",
        "Takip e-postalarını belirli müşteri etkileşimlerine göre kişiselleştirin."
      ]
    }
  },
  "it-helper": {
    "en": {
      "title": "IT Helper",
      "tagline": "Efficiently manage IT inquiries and support requests.",
      "whatItDoes": [
        "The IT Helper role on Staffbix addresses tool-related questions, performs password resets, and files support tickets for unresolved issues. It ensures swift responses to common IT inquiries via Slack and Email.",
        "When encountering issues beyond immediate resolution, the IT Helper creates internal IT support tickets using the 'create_it_ticket' tool, ensuring problems are logged and tracked effectively.",
        "For complex or sensitive requests, the role escalates conversations to human teammates using the 'escalate_to_human' tool, maintaining professionalism and compliance with GDPR regulations."
      ],
      "integrationsRequired": [
        "Slack",
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the 'Roles' section and select 'IT Helper'.",
        "Integrate your Slack and Email accounts for seamless communication.",
        "Familiarize yourself with the 'create_it_ticket' and 'escalate_to_human' tools.",
        "Start managing IT inquiries and support requests efficiently."
      ],
      "exampleTasks": [
        "Answer tool-related questions from employees via Slack.",
        "Reset passwords for users who are locked out.",
        "File an IT support ticket for a broken laptop.",
        "Escalate a conversation to a human for a large refund request.",
        "Record a GDPR data-subject request for data erasure."
      ],
      "approvalNote": "Ensure all escalations and GDPR requests are reviewed in the Approval Center for compliance.",
      "tips": [
        "Use 'create_it_ticket' for issues you can't resolve immediately.",
        "Always escalate sensitive or complex requests to a human.",
        "Record GDPR requests accurately to comply with legal requirements."
      ]
    },
    "tr": {
      "title": "IT Yardımcısı",
      "tagline": "BT taleplerini ve destek isteklerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Staffbix üzerindeki IT Yardımcısı rolü, araçlarla ilgili soruları yanıtlar, şifre sıfırlamaları yapar ve çözülemeyen sorunlar için destek talepleri oluşturur. Slack ve E-posta üzerinden yaygın BT taleplerine hızlı yanıtlar sağlar.",
        "Anında çözülemeyen sorunlarla karşılaşıldığında, IT Yardımcısı 'create_it_ticket' aracı kullanarak dahili BT destek talepleri oluşturur, sorunların etkili bir şekilde kaydedilmesini ve izlenmesini sağlar.",
        "Karmaşık veya hassas talepler için, rol 'escalate_to_human' aracı kullanarak konuşmaları insan takım arkadaşlarına yönlendirir, profesyonellik ve GDPR düzenlemelerine uyum sağlar."
      ],
      "integrationsRequired": [
        "Slack",
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'IT Yardımcısı'nı seçin.",
        "Kesintisiz iletişim için Slack ve E-posta hesaplarınızı entegre edin.",
        "'create_it_ticket' ve 'escalate_to_human' araçlarına aşina olun.",
        "BT taleplerini ve destek isteklerini verimli bir şekilde yönetmeye başlayın."
      ],
      "exampleTasks": [
        "Çalışanlardan gelen araçlarla ilgili soruları Slack üzerinden yanıtlayın.",
        "Kilitlenen kullanıcılar için şifreleri sıfırlayın.",
        "Bozuk bir dizüstü bilgisayar için BT destek talebi oluşturun.",
        "Büyük bir geri ödeme talebi için konuşmayı bir insana yönlendirin.",
        "Veri silme için bir GDPR veri konusu talebini kaydedin."
      ],
      "approvalNote": "Tüm yönlendirmelerin ve GDPR taleplerinin uyumluluk için Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Hemen çözemediğiniz sorunlar için 'create_it_ticket' kullanın.",
        "Hassas veya karmaşık talepleri her zaman bir insana yönlendirin.",
        "Yasal gerekliliklere uyum sağlamak için GDPR taleplerini doğru bir şekilde kaydedin."
      ]
    }
  },
  "legal-helper": {
    "en": {
      "title": "Legal Helper",
      "tagline": "Streamline legal document drafting and contract reviews.",
      "whatItDoes": [
        "The Legal Helper drafts initial versions of NDAs, MSAs, and other agreements for review. It ensures documents are ready for human and legal counsel assessment, always including a 'not legal advice' disclaimer.",
        "It reviews contract clauses, providing a structured risk assessment with suggested redlines. The tool flags unusual phrasing and jurisdiction concerns, but does not offer final legal authority.",
        "For complex issues or when the scope exceeds its capabilities, the Legal Helper escalates to a human teammate, ensuring seamless handoff and follow-up."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Legal Helper'.",
        "Connect your Email account for document and clause reviews.",
        "Activate the role to start drafting and reviewing documents.",
        "Monitor the Approval Center for escalations and follow-ups."
      ],
      "exampleTasks": [
        "Draft a non-disclosure agreement for a new partnership.",
        "Review a supplier contract for unusual clauses.",
        "Flag a high-risk clause in an employment offer.",
        "Escalate a complex contract issue to a human teammate.",
        "Record a GDPR data-subject request for data erasure."
      ],
      "approvalNote": "All drafts and reviews are for preliminary purposes only and require human and legal counsel review.",
      "tips": [
        "Always review drafts with legal counsel before finalizing.",
        "Use the escalate feature for complex or high-risk issues.",
        "Regularly check the Approval Center for updates on escalated tasks."
      ]
    },
    "tr": {
      "title": "Hukuk Yardımcısı",
      "tagline": "Hukuki belge taslağı hazırlama ve sözleşme incelemelerini kolaylaştırın.",
      "whatItDoes": [
        "Hukuk Yardımcısı, NDA'lar, MSA'lar ve diğer anlaşmaların ilk taslaklarını inceleme için hazırlar. Belgelerin insan ve hukuki danışman değerlendirmesine hazır olmasını sağlar, her zaman 'hukuki tavsiye değildir' uyarısını içerir.",
        "Sözleşme maddelerini inceleyerek yapılandırılmış bir risk değerlendirmesi sunar ve önerilen düzeltmeleri belirtir. Araç, alışılmadık ifadeleri ve yargı yetkisi endişelerini işaretler, ancak nihai hukuki yetki sunmaz.",
        "Karmaşık konular veya kapsam yeteneklerini aştığında, Hukuk Yardımcısı bir insan ekip arkadaşına yönlendirir, sorunsuz bir devretme ve takip sağlar."
      ],
      "integrationsRequired": [
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Hukuk Yardımcısı'nı seçin.",
        "Belge ve madde incelemeleri için E-posta hesabınızı bağlayın.",
        "Belgeleri taslak haline getirmek ve incelemek için rolü etkinleştirin.",
        "Yönlendirmeler ve takipler için Onay Merkezi'ni izleyin."
      ],
      "exampleTasks": [
        "Yeni bir ortaklık için gizlilik sözleşmesi taslağı hazırlayın.",
        "Tedarikçi sözleşmesini alışılmadık maddeler için inceleyin.",
        "Bir iş teklifi sözleşmesindeki yüksek riskli maddeyi işaretleyin.",
        "Karmaşık bir sözleşme sorununu bir insan ekip arkadaşına yönlendirin.",
        "Veri silme için bir GDPR veri konusu talebini kaydedin."
      ],
      "approvalNote": "Tüm taslaklar ve incelemeler yalnızca ön hazırlık amaçlıdır ve insan ve hukuki danışman incelemesi gerektirir.",
      "tips": [
        "Taslakları sonlandırmadan önce her zaman hukuki danışmanla inceleyin.",
        "Karmaşık veya yüksek riskli konular için yönlendirme özelliğini kullanın.",
        "Yönlendirilen görevlerle ilgili güncellemeler için Onay Merkezi'ni düzenli olarak kontrol edin."
      ]
    }
  },
  "voice-agent": {
    "en": {
      "title": "Voice Agent",
      "tagline": "Handle calls efficiently with structured summaries and escalation tools.",
      "whatItDoes": [
        "The Voice Agent manages inbound and outbound calls in 23 languages, providing full transcript archives. It utilizes tools to summarize calls, flag necessary transfers, and escalate to human agents when needed.",
        "Post-call, the summarize_call tool generates structured summaries, highlighting caller intent, sentiment, key facts, open issues, and suggested follow-ups. If a transfer is required, it logs the request for operator attention.",
        "For sensitive issues or requests beyond its scope, the escalate_to_human tool ensures seamless handoffs to human teammates. GDPR-related requests are recorded for compliance, pausing the conversation for human review."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Log into the Staffbix platform.",
        "Navigate to the Voice Agent role settings.",
        "Connect required integrations: WhatsApp, Stripe, Instagram, LinkedIn.",
        "Enable the summarize_call and flag_call_transfer tools.",
        "Test the setup with a sample call to ensure functionality."
      ],
      "exampleTasks": [
        "Summarize a customer support call and suggest follow-up actions.",
        "Flag a call for transfer due to a complex billing inquiry.",
        "Escalate a call to a human agent due to a customer expressing anger.",
        "Record a GDPR data request for account deletion.",
        "Handle a call requiring language support in Spanish."
      ],
      "approvalNote": "Ensure all call summaries and escalations are reviewed in the Approval Center for quality assurance.",
      "tips": [
        "Always use summarize_call post-call to maintain structured records.",
        "Escalate to human agents promptly when encountering complex or sensitive issues.",
        "Regularly review flagged transfers to ensure timely operator responses."
      ]
    },
    "tr": {
      "title": "Sesli Temsilci",
      "tagline": "Yapılandırılmış özetler ve yönlendirme araçlarıyla çağrıları verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Sesli Temsilci, 23 dilde gelen ve giden çağrıları yönetir, tam transkript arşivleri sağlar. Çağrıları özetlemek, gerekli aktarımları işaretlemek ve gerektiğinde insan temsilcilere yönlendirmek için araçlar kullanır.",
        "Çağrı sonrası, summarize_call aracı, arayanın niyetini, duygusunu, anahtar bilgileri, açık sorunları ve önerilen takipleri vurgulayarak yapılandırılmış özetler oluşturur. Bir aktarım gerekiyorsa, operatör dikkatine sunulmak üzere talebi kaydeder.",
        "Hassas konular veya kapsamı dışında talepler için, escalate_to_human aracı, insan ekip arkadaşlarına sorunsuz geçişler sağlar. GDPR ile ilgili talepler uyumluluk için kaydedilir ve insan incelemesi için konuşma duraklatılır."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix platformuna giriş yapın.",
        "Sesli Temsilci rol ayarlarına gidin.",
        "Gerekli entegrasyonları bağlayın: WhatsApp, Stripe, Instagram, LinkedIn.",
        "summarize_call ve flag_call_transfer araçlarını etkinleştirin.",
        "Fonksiyonelliği sağlamak için örnek bir çağrı ile kurulumu test edin."
      ],
      "exampleTasks": [
        "Bir müşteri destek çağrısını özetleyin ve takip eylemleri önerin.",
        "Karmaşık bir faturalama sorgusu nedeniyle bir çağrıyı aktarma için işaretleyin.",
        "Bir müşterinin öfkesini ifade etmesi nedeniyle bir çağrıyı insan temsilciye yönlendirin.",
        "Hesap silme için bir GDPR veri talebini kaydedin.",
        "İspanyolca dil desteği gerektiren bir çağrıyı yönetin."
      ],
      "approvalNote": "Kalite güvencesi için tüm çağrı özetlerinin ve yönlendirmelerin Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Yapılandırılmış kayıtları korumak için her zaman çağrı sonrası summarize_call kullanın.",
        "Karmaşık veya hassas konularla karşılaştığınızda insan temsilcilere hızlıca yönlendirin.",
        "Zamanında operatör yanıtlarını sağlamak için işaretlenen aktarımları düzenli olarak gözden geçirin."
      ]
    }
  },
  "backlink-ai": {
    "en": {
      "title": "Backlink AI",
      "tagline": "Automate outreach for quality backlinks with precision.",
      "whatItDoes": [
        "Backlink AI automates the process of acquiring high-quality backlinks by evaluating prospects for relevance and potential risks. It ensures that outreach efforts are targeted and compliant with best practices.",
        "The role uses tools to score link prospects, maintain anchor text diversity, and manage outreach emails. It prevents engagement with link farms and prioritizes genuine opportunities for link-building."
      ],
      "integrationsRequired": [
        "Web"
      ],
      "steps": [
        "Score the link prospect using score_link_prospect.",
        "Check anchor text diversity with check_anchor_diversity.",
        "Register the prospect using create_outreach_lead.",
        "Draft and queue the outreach email with queue_outreach_email.",
        "Monitor responses and escalate to human if needed."
      ],
      "exampleTasks": [
        "Evaluate a new link prospect for topical relevance.",
        "Ensure anchor text diversity before outreach.",
        "Register a new lead in the database.",
        "Draft a personalized outreach email.",
        "Escalate complex inquiries to a human teammate."
      ],
      "approvalNote": "Ensure all outreach emails are queued only after proper lead registration and scoring.",
      "tips": [
        "Always verify anchor text diversity before outreach.",
        "Avoid prospects flagged as link farms or PBNs.",
        "Use promptOverride to tailor email content effectively."
      ]
    },
    "tr": {
      "title": "Backlink AI",
      "tagline": "Kaliteli geri bağlantılar için erişimi hassasiyetle otomatikleştirin.",
      "whatItDoes": [
        "Backlink AI, potansiyel müşterileri alaka düzeyi ve potansiyel riskler açısından değerlendirerek yüksek kaliteli geri bağlantılar edinme sürecini otomatikleştirir. Erişim çabalarının hedefli ve en iyi uygulamalara uygun olmasını sağlar.",
        "Rol, bağlantı adaylarını puanlamak, çapa metni çeşitliliğini korumak ve erişim e-postalarını yönetmek için araçlar kullanır. Bağlantı çiftlikleriyle etkileşimi önler ve bağlantı kurma için gerçek fırsatlara öncelik verir."
      ],
      "integrationsRequired": [
        "Web"
      ],
      "steps": [
        "Bağlantı adayını score_link_prospect ile puanlayın.",
        "Çapa metni çeşitliliğini check_anchor_diversity ile kontrol edin.",
        "Adayı create_outreach_lead ile kaydedin.",
        "Erişim e-postasını taslak olarak hazırlayın ve queue_outreach_email ile sıraya alın.",
        "Yanıtları izleyin ve gerekirse insana yönlendirin."
      ],
      "exampleTasks": [
        "Yeni bir bağlantı adayını konuya uygunluk açısından değerlendirin.",
        "Erişimden önce çapa metni çeşitliliğini sağlayın.",
        "Veritabanına yeni bir adayı kaydedin.",
        "Kişiselleştirilmiş bir erişim e-postası taslağı hazırlayın.",
        "Karmaşık soruları insan bir takım arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm erişim e-postalarının yalnızca uygun aday kaydı ve puanlamadan sonra sıraya alındığından emin olun.",
      "tips": [
        "Erişimden önce her zaman çapa metni çeşitliliğini doğrulayın.",
        "Bağlantı çiftlikleri veya PBN'ler olarak işaretlenen adaylardan kaçının.",
        "E-posta içeriğini etkili bir şekilde özelleştirmek için promptOverride kullanın."
      ]
    }
  },
  "marketplace-ops": {
    "en": {
      "title": "Marketplace Ops",
      "tagline": "Efficiently manage your marketplace listings and customer interactions.",
      "whatItDoes": [
        "The Marketplace Ops role handles the creation and optimization of product listings on platforms like Amazon, eBay, and Etsy. It ensures listings are compliant, optimized for search, and accurately represent the product.",
        "It also manages pricing strategies using compute_repricing to adjust prices based on competitor analysis and predefined strategies. This ensures competitive pricing while maintaining margins.",
        "Customer interactions, including inquiries and returns, are managed efficiently. The role can escalate complex issues to human teammates, ensuring customer satisfaction and compliance with data protection laws."
      ],
      "integrationsRequired": [
        "Amazon",
        "eBay",
        "Etsy"
      ],
      "steps": [
        "Connect your Amazon, eBay, and Etsy accounts to Staffbix.",
        "Set up your repricing strategy and guardrails in the compute_repricing tool.",
        "Use optimize_listing to enhance your product listings for each marketplace.",
        "Monitor customer inquiries and use escalate_to_human for complex issues.",
        "Record any GDPR data requests with the gdpr_data_request tool."
      ],
      "exampleTasks": [
        "Optimize an Amazon listing for better keyword coverage and compliance.",
        "Adjust the price of an eBay product based on competitor analysis.",
        "Handle a customer return request on Etsy and escalate if necessary.",
        "Record a GDPR data request from a customer on any marketplace.",
        "Rewrite an Etsy product description to improve search visibility."
      ],
      "approvalNote": "Ensure all marketplace integrations and repricing strategies comply with your Brand Bible and are approved in the Approval Center.",
      "tips": [
        "Regularly review and update your repricing strategies to stay competitive.",
        "Use optimize_listing to maintain compliance and improve search rankings.",
        "Always escalate complex customer issues to ensure proper handling."
      ]
    },
    "tr": {
      "title": "Pazar Yeri Operasyonları",
      "tagline": "Pazar yeri listelemelerinizi ve müşteri etkileşimlerinizi verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Pazar Yeri Operasyonları rolü, Amazon, eBay ve Etsy gibi platformlarda ürün listelemelerinin oluşturulması ve optimize edilmesini yönetir. Listelemelerin uyumlu, arama için optimize edilmiş ve ürünü doğru bir şekilde temsil ettiğinden emin olur.",
        "Ayrıca, compute_repricing kullanarak rakip analizi ve önceden tanımlanmış stratejilere dayalı fiyat ayarlamaları yaparak fiyatlandırma stratejilerini yönetir. Bu, marjları korurken rekabetçi fiyatlandırmayı sağlar.",
        "Müşteri etkileşimleri, sorular ve iadeler dahil, verimli bir şekilde yönetilir. Rol, karmaşık sorunları insan ekip arkadaşlarına yönlendirebilir, böylece müşteri memnuniyeti ve veri koruma yasalarına uyum sağlanır."
      ],
      "integrationsRequired": [
        "Amazon",
        "eBay",
        "Etsy"
      ],
      "steps": [
        "Amazon, eBay ve Etsy hesaplarınızı Staffbix'e bağlayın.",
        "compute_repricing aracında fiyatlandırma stratejinizi ve koruma önlemlerinizi ayarlayın.",
        "Her pazar yeri için ürün listelemelerinizi optimize_listing kullanarak geliştirin.",
        "Müşteri sorularını izleyin ve karmaşık sorunlar için escalate_to_human kullanın.",
        "Herhangi bir GDPR veri talebini gdpr_data_request aracıyla kaydedin."
      ],
      "exampleTasks": [
        "Daha iyi anahtar kelime kapsamı ve uyumluluk için bir Amazon listelemesini optimize edin.",
        "Rakip analizi temelinde bir eBay ürününün fiyatını ayarlayın.",
        "Etsy'de bir müşteri iade talebini yönetin ve gerekirse yönlendirin.",
        "Herhangi bir pazaryerinde bir müşteriden gelen GDPR veri talebini kaydedin.",
        "Arama görünürlüğünü artırmak için bir Etsy ürün açıklamasını yeniden yazın."
      ],
      "approvalNote": "Tüm pazar yeri entegrasyonlarının ve fiyatlandırma stratejilerinin Brand Bible ile uyumlu olduğundan ve Approval Center'da onaylandığından emin olun.",
      "tips": [
        "Rekabetçi kalmak için fiyatlandırma stratejilerinizi düzenli olarak gözden geçirin ve güncelleyin.",
        "Uyumluluğu sürdürmek ve arama sıralamalarını iyileştirmek için optimize_listing kullanın.",
        "Doğru bir şekilde ele alınmasını sağlamak için her zaman karmaşık müşteri sorunlarını yönlendirin."
      ]
    }
  },
  "outbound-sdr": {
    "en": {
      "title": "Outbound SDR",
      "tagline": "Efficient cold outreach with personalized research.",
      "whatItDoes": [
        "The Outbound SDR role focuses on initiating contact with potential clients through cold outreach. It uses the enrich_prospect tool to gather detailed information about prospects, ensuring each email is tailored and relevant.",
        "Prospects are registered in the leads database using create_outreach_lead before any communication begins. This ensures all interactions are tracked and managed efficiently.",
        "Emails are drafted and queued using queue_outreach_email, leveraging personalized prompts to increase engagement. This role ensures that outreach is both strategic and informed by the latest prospect data."
      ],
      "integrationsRequired": [
        "Email",
        "LinkedIn"
      ],
      "steps": [
        "Use enrich_prospect to gather data on a potential client.",
        "Register the prospect with create_outreach_lead.",
        "Draft and queue the outreach email using queue_outreach_email.",
        "Monitor responses and escalate_to_human if needed.",
        "Record any GDPR data requests with gdpr_data_request."
      ],
      "exampleTasks": [
        "Research a prospect's recent funding news before emailing.",
        "Register a new lead in the database for tracking.",
        "Draft a personalized email highlighting a prospect's recent product launch.",
        "Escalate a complex query to a human teammate.",
        "Log a GDPR data request for a prospect."
      ],
      "approvalNote": "Ensure all outreach emails are queued only after thorough prospect research.",
      "tips": [
        "Always enrich prospect data before drafting emails for better personalization.",
        "Use promptOverride in queue_outreach_email to tailor messages to specific prospect signals.",
        "Escalate to a human when unsure about the next steps in a conversation."
      ]
    },
    "tr": {
      "title": "Outbound SDR",
      "tagline": "Kişiselleştirilmiş araştırma ile verimli soğuk iletişim.",
      "whatItDoes": [
        "Outbound SDR rolü, potansiyel müşterilerle soğuk iletişim yoluyla temas kurmaya odaklanır. Her e-postanın özel ve ilgili olmasını sağlamak için enrich_prospect aracı kullanılarak potansiyel müşteriler hakkında ayrıntılı bilgi toplanır.",
        "Herhangi bir iletişim başlamadan önce create_outreach_lead kullanılarak potansiyel müşteriler aday veritabanına kaydedilir. Bu, tüm etkileşimlerin verimli bir şekilde izlenmesini ve yönetilmesini sağlar.",
        "E-postalar, etkileşimi artırmak için kişiselleştirilmiş istemler kullanılarak queue_outreach_email ile taslak haline getirilir ve sıraya alınır. Bu rol, iletişimin hem stratejik hem de en son potansiyel müşteri verileriyle bilgilendirilmiş olmasını sağlar."
      ],
      "integrationsRequired": [
        "Email",
        "LinkedIn"
      ],
      "steps": [
        "Potansiyel bir müşteri hakkında veri toplamak için enrich_prospect kullanın.",
        "Potansiyel müşteriyi create_outreach_lead ile kaydedin.",
        "queue_outreach_email kullanarak iletişim e-postasını taslak haline getirin ve sıraya alın.",
        "Yanıtları izleyin ve gerekirse escalate_to_human yapın.",
        "Bir GDPR veri talebini gdpr_data_request ile kaydedin."
      ],
      "exampleTasks": [
        "E-posta göndermeden önce bir potansiyel müşterinin son finansman haberlerini araştırın.",
        "Takip için veritabanına yeni bir aday kaydedin.",
        "Bir potansiyel müşterinin son ürün lansmanını vurgulayan kişiselleştirilmiş bir e-posta taslağı hazırlayın.",
        "Karmaşık bir sorguyu insan bir takım arkadaşına yönlendirin.",
        "Bir potansiyel müşteri için GDPR veri talebini kaydedin."
      ],
      "approvalNote": "Tüm iletişim e-postalarının yalnızca kapsamlı potansiyel müşteri araştırmasından sonra sıraya alındığından emin olun.",
      "tips": [
        "Daha iyi kişiselleştirme için e-posta taslağı hazırlamadan önce her zaman potansiyel müşteri verilerini zenginleştirin.",
        "Belirli potansiyel müşteri sinyallerine mesajları uyarlamak için queue_outreach_email içinde promptOverride kullanın.",
        "Bir konuşmada bir sonraki adımlar hakkında emin olmadığınızda bir insana yönlendirin."
      ]
    }
  },
  "ad-manager": {
    "en": {
      "title": "Ad Manager",
      "tagline": "Optimize ad campaigns across Meta, Google, and TikTok.",
      "whatItDoes": [
        "The Ad Manager plans ad campaigns across Meta, Google, and TikTok, providing audience targeting, creative direction, and budget allocation. It ensures campaigns are staged for operator approval, never launching them directly.",
        "It checks ad copy for compliance with platform policies, preventing common violations. This ensures that all ads meet Meta, Google, and TikTok standards before being queued for launch."
      ],
      "integrationsRequired": [
        "Meta",
        "Google",
        "TikTok"
      ],
      "steps": [
        "Connect your Meta, Google, and TikTok accounts to Staffbix.",
        "Navigate to the Ad Manager role in your Staffbix dashboard.",
        "Use 'plan_ad_campaign' to draft your campaign details.",
        "Run 'check_ad_compliance' to ensure ad copy meets platform policies.",
        "Submit the campaign for approval in the Approval Center."
      ],
      "exampleTasks": [
        "Plan a Meta ad campaign targeting young adults with a $500 daily budget.",
        "Ensure Google ad copy complies with platform policies before launch.",
        "Draft TikTok ads with three A/B creative angles for a new product."
      ],
      "approvalNote": "All campaigns must be approved in the Approval Center before launch.",
      "tips": [
        "Always run 'check_ad_compliance' before submitting ads for approval.",
        "Use the 'plan_ad_campaign' tool to explore different creative angles.",
        "Regularly review campaign KPIs to adjust strategies as needed."
      ]
    },
    "tr": {
      "title": "Reklam Yöneticisi",
      "tagline": "Meta, Google ve TikTok genelinde reklam kampanyalarını optimize edin.",
      "whatItDoes": [
        "Reklam Yöneticisi, Meta, Google ve TikTok genelinde reklam kampanyaları planlayarak hedef kitle belirleme, yaratıcı yönlendirme ve bütçe tahsisi sağlar. Kampanyaların operatör onayı için hazırlandığından emin olur, asla doğrudan başlatmaz.",
        "Reklam metnini platform politikalarına uygunluk açısından kontrol eder, yaygın ihlalleri önler. Bu, tüm reklamların Meta, Google ve TikTok standartlarına uygun olmasını ve başlatılmak üzere sıraya alınmadan önce onaylanmasını sağlar."
      ],
      "integrationsRequired": [
        "Meta",
        "Google",
        "TikTok"
      ],
      "steps": [
        "Meta, Google ve TikTok hesaplarınızı Staffbix'e bağlayın.",
        "Staffbix kontrol panelinizde Reklam Yöneticisi rolüne gidin.",
        "Kampanya ayrıntılarınızı taslak olarak hazırlamak için 'plan_ad_campaign' kullanın.",
        "Reklam metninin platform politikalarına uygunluğunu sağlamak için 'check_ad_compliance' çalıştırın.",
        "Kampanyayı onay için Approval Center'a gönderin."
      ],
      "exampleTasks": [
        "Genç yetişkinleri hedefleyen ve günlük 500$ bütçeli bir Meta reklam kampanyası planlayın.",
        "Google reklam metninin platform politikalarına uygunluğunu başlatmadan önce sağlayın.",
        "Yeni bir ürün için üç A/B yaratıcı açıya sahip TikTok reklamları taslağı hazırlayın."
      ],
      "approvalNote": "Tüm kampanyalar başlatılmadan önce Approval Center'da onaylanmalıdır.",
      "tips": [
        "Reklamları onaya göndermeden önce her zaman 'check_ad_compliance' çalıştırın.",
        "Farklı yaratıcı açıları keşfetmek için 'plan_ad_campaign' aracını kullanın.",
        "Stratejileri gerektiği gibi ayarlamak için kampanya KPI'larını düzenli olarak gözden geçirin."
      ]
    }
  },
  "hr-assistant": {
    "en": {
      "title": "HR Assistant",
      "tagline": "Streamline hiring with precision and efficiency.",
      "whatItDoes": [
        "The HR Assistant role on Staffbix automates candidate screening and interview scheduling. Using the parse_cv tool, it extracts key information from resumes, ensuring a structured and unbiased analysis of applicants.",
        "With track_applicant, it registers candidates and updates their status in the hiring pipeline. This role also handles follow-up communications, ensuring no potential hire is overlooked.",
        "The HR Assistant seamlessly integrates with email to manage candidate interactions, ensuring a smooth and professional hiring process."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the HR Assistant role in the dashboard.",
        "Connect your email account for candidate communications.",
        "Upload candidate resumes for parsing and screening.",
        "Monitor the Approval Center for updates on candidate status."
      ],
      "exampleTasks": [
        "Extract and analyze key details from candidate resumes.",
        "Register new candidates and update their pipeline status.",
        "Send personalized follow-up emails to promising candidates.",
        "Schedule interviews with qualified candidates.",
        "Escalate complex candidate queries to human HR staff."
      ],
      "approvalNote": "Ensure all candidate data is handled in compliance with GDPR regulations.",
      "tips": [
        "Regularly check the Approval Center for candidate updates.",
        "Use parse_cv to maintain unbiased candidate evaluations.",
        "Escalate to human HR staff for sensitive candidate interactions."
      ]
    },
    "tr": {
      "title": "İK Asistanı",
      "tagline": "İşe alım sürecini hassasiyet ve verimlilikle kolaylaştırın.",
      "whatItDoes": [
        "Staffbix üzerindeki İK Asistanı rolü, aday tarama ve mülakat planlamasını otomatikleştirir. parse_cv aracı kullanılarak, özgeçmişlerden anahtar bilgiler çıkarılır ve adayların yapılandırılmış ve tarafsız bir analizi sağlanır.",
        "track_applicant ile adayları kaydeder ve işe alım sürecindeki durumlarını günceller. Bu rol ayrıca takip iletişimlerini yönetir, böylece potansiyel bir işe alım gözden kaçmaz.",
        "İK Asistanı, aday etkileşimlerini yönetmek için e-posta ile sorunsuz bir şekilde entegre olur, profesyonel bir işe alım süreci sağlar."
      ],
      "integrationsRequired": [
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Gösterge panelinde İK Asistanı rolüne gidin.",
        "Aday iletişimleri için e-posta hesabınızı bağlayın.",
        "Aday özgeçmişlerini yükleyin ve tarama için işleyin.",
        "Aday durumu güncellemeleri için Approval Center'ı izleyin."
      ],
      "exampleTasks": [
        "Aday özgeçmişlerinden anahtar detayları çıkarın ve analiz edin.",
        "Yeni adayları kaydedin ve süreçteki durumlarını güncelleyin.",
        "Umut vadeden adaylara kişiselleştirilmiş takip e-postaları gönderin.",
        "Nitelikli adaylarla mülakatlar planlayın.",
        "Karmaşık aday sorularını insan İK personeline yönlendirin."
      ],
      "approvalNote": "Tüm aday verilerinin GDPR düzenlemelerine uygun olarak işlendiğinden emin olun.",
      "tips": [
        "Aday güncellemeleri için Approval Center'ı düzenli olarak kontrol edin.",
        "Tarafsız aday değerlendirmeleri için parse_cv kullanın.",
        "Hassas aday etkileşimleri için insan İK personeline yönlendirin."
      ]
    }
  },
  "general-manager": {
    "en": {
      "title": "General Manager",
      "tagline": "Drive operational excellence with strategic oversight.",
      "whatItDoes": [
        "The General Manager role on Staffbix ensures smooth operations by managing the weekly cadence. It involves generating weekly plans and reviews, and monitoring key performance indicators (KPIs).",
        "This role uses tools to create structured plans and reviews, compare metrics, and handle lead breakdowns. It also escalates issues to human teammates when necessary."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "Stripe",
        "Instagram",
        "WhatsApp"
      ],
      "steps": [
        "Log into Staffbix and navigate to the General Manager role.",
        "Use 'generate_weekly_plan' to create the Monday plan with KPI-linked bullets.",
        "Employ 'generate_friday_review' to summarize weekly performance and lessons.",
        "Utilize 'compare_period_metric' to analyze KPI changes and identify anomalies.",
        "Escalate issues beyond your scope using 'escalate_to_human'."
      ],
      "exampleTasks": [
        "Draft a weekly operational plan with KPI alignment.",
        "Review weekly performance and identify focus areas for improvement.",
        "Analyze lead generation metrics and report anomalies.",
        "Escalate complex customer issues to human support.",
        "Record GDPR data requests for compliance."
      ],
      "approvalNote": "Ensure all plans and reviews are aligned with the Brand Bible before submission.",
      "tips": [
        "Always link actions to KPIs for clarity and accountability.",
        "Use 'compare_period_metric' to justify interventions only when anomalies are detected.",
        "Escalate promptly when issues exceed your authority or data access."
      ]
    },
    "tr": {
      "title": "Genel Müdür",
      "tagline": "Stratejik gözetimle operasyonel mükemmelliği yönetin.",
      "whatItDoes": [
        "Staffbix'teki Genel Müdür rolü, haftalık düzeni yöneterek sorunsuz operasyonlar sağlar. Haftalık planlar ve incelemeler oluşturmayı ve anahtar performans göstergelerini (KPI'lar) izlemeyi içerir.",
        "Bu rol, yapılandırılmış planlar ve incelemeler oluşturmak, metrikleri karşılaştırmak ve potansiyel müşteri analizlerini yönetmek için araçlar kullanır. Gerektiğinde insan takım arkadaşlarına sorunları iletir."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "Stripe",
        "Instagram",
        "WhatsApp"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Genel Müdür rolüne gidin.",
        "KPI bağlantılı maddelerle Pazartesi planını oluşturmak için 'generate_weekly_plan' kullanın.",
        "Haftalık performansı ve dersleri özetlemek için 'generate_friday_review' kullanın.",
        "KPI değişikliklerini analiz etmek ve anormallikleri belirlemek için 'compare_period_metric' kullanın.",
        "Yetkinizi aşan sorunları 'escalate_to_human' kullanarak iletin."
      ],
      "exampleTasks": [
        "KPI uyumlu haftalık operasyon planı taslağı hazırlayın.",
        "Haftalık performansı gözden geçirin ve iyileştirme için odak alanlarını belirleyin.",
        "Potansiyel müşteri oluşturma metriklerini analiz edin ve anormallikleri raporlayın.",
        "Karmaşık müşteri sorunlarını insan desteğine iletin.",
        "Uyumluluk için GDPR veri taleplerini kaydedin."
      ],
      "approvalNote": "Tüm planların ve incelemelerin Brand Bible ile uyumlu olduğundan emin olun.",
      "tips": [
        "Netlik ve hesap verebilirlik için her zaman eylemleri KPI'lara bağlayın.",
        "Anormallikler tespit edildiğinde müdahaleleri haklı çıkarmak için 'compare_period_metric' kullanın.",
        "Yetkinizi veya veri erişiminizi aşan sorunları derhal iletin."
      ]
    }
  },
  "ops-lead": {
    "en": {
      "title": "Operations Lead",
      "tagline": "Streamline workflows and prevent bottlenecks.",
      "whatItDoes": [
        "The Operations Lead role coordinates tasks across various roles, ensuring efficient workflow management. It uses the 'assess_worker_load' tool to monitor worker load percentages, flagging overloads and suggesting redistributions to maintain balance.",
        "When new systems are launched or documentation gaps are identified, the 'compose_runbook' tool is utilized to draft comprehensive runbooks, ensuring all team members have clear guidance on processes and procedures.",
        "For customer interactions requiring human intervention, the 'escalate_to_human' tool is employed to seamlessly transition the conversation to a human teammate, ensuring customer satisfaction and compliance with company policies."
      ],
      "integrationsRequired": [
        "Brand Bible",
        "Approval Center",
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Log into the Staffbix platform.",
        "Navigate to the 'Roles' section and select 'Operations Lead'.",
        "Enable the 'assess_worker_load' tool for load monitoring.",
        "Activate 'compose_runbook' for drafting new runbooks.",
        "Set up 'escalate_to_human' for customer interactions requiring escalation."
      ],
      "exampleTasks": [
        "Monitor and redistribute workload among team members to prevent overload.",
        "Draft a new runbook for a recently launched system.",
        "Escalate a customer request for a large refund to a human teammate."
      ],
      "approvalNote": "Ensure all integrations are approved in the Approval Center before activation.",
      "tips": [
        "Regularly check worker load to preemptively address potential bottlenecks.",
        "Keep runbooks updated to reflect any changes in processes or systems.",
        "Use 'escalate_to_human' for any customer interaction that requires a personal touch."
      ]
    },
    "tr": {
      "title": "Operasyon Lideri",
      "tagline": "İş akışlarını kolaylaştırın ve darboğazları önleyin.",
      "whatItDoes": [
        "Operasyon Lideri rolü, çeşitli roller arasında görevleri koordine ederek verimli iş akışı yönetimini sağlar. Çalışan yük yüzdelerini izlemek için 'assess_worker_load' aracını kullanır, aşırı yükleri işaretler ve dengeyi korumak için yeniden dağıtımlar önerir.",
        "Yeni sistemler başlatıldığında veya dokümantasyon eksiklikleri tespit edildiğinde, tüm ekip üyelerinin süreçler ve prosedürler hakkında net rehberlik almasını sağlamak için 'compose_runbook' aracı kullanılarak kapsamlı çalışma kitapları hazırlanır.",
        "İnsan müdahalesi gerektiren müşteri etkileşimleri için, müşteri memnuniyetini ve şirket politikalarına uyumu sağlamak amacıyla konuşmayı sorunsuz bir şekilde insan bir ekip arkadaşına aktarmak için 'escalate_to_human' aracı kullanılır."
      ],
      "integrationsRequired": [
        "Brand Bible",
        "Approval Center",
        "WhatsApp",
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix platformuna giriş yapın.",
        "'Roller' bölümüne gidin ve 'Operasyon Lideri'ni seçin.",
        "Yük izleme için 'assess_worker_load' aracını etkinleştirin.",
        "Yeni çalışma kitapları hazırlamak için 'compose_runbook'u etkinleştirin.",
        "Yükseltme gerektiren müşteri etkileşimleri için 'escalate_to_human' ayarlayın."
      ],
      "exampleTasks": [
        "Aşırı yüklenmeyi önlemek için ekip üyeleri arasında iş yükünü izleyin ve yeniden dağıtın.",
        "Yeni başlatılan bir sistem için yeni bir çalışma kitabı hazırlayın.",
        "Büyük bir geri ödeme talebini insan bir ekip arkadaşına yükseltin."
      ],
      "approvalNote": "Tüm entegrasyonların etkinleştirilmeden önce Approval Center'da onaylandığından emin olun.",
      "tips": [
        "Potansiyel darboğazları önceden ele almak için çalışan yükünü düzenli olarak kontrol edin.",
        "Süreçlerde veya sistemlerdeki değişiklikleri yansıtmak için çalışma kitaplarını güncel tutun.",
        "Kişisel bir dokunuş gerektiren herhangi bir müşteri etkileşimi için 'escalate_to_human' kullanın."
      ]
    }
  },
  "product-manager": {
    "en": {
      "title": "Product Manager",
      "tagline": "Owns the roadmap, drafts specs, prioritizes, writes release notes.",
      "whatItDoes": [
        "The Product Manager role on Staffbix involves drafting structured product specifications using the 'draft_product_spec' tool. This includes defining problems, user requirements, and acceptance criteria based on customer feedback.",
        "The role also requires drafting release notes with 'draft_release_notes', summarizing shipped items, bug fixes, and changes. Additionally, it involves searching the Brand Bible for existing content to avoid duplication."
      ],
      "integrationsRequired": [
        "Internal"
      ],
      "steps": [
        "Log into Staffbix.",
        "Navigate to the Product Manager role dashboard.",
        "Use 'draft_product_spec' to create product specifications.",
        "Utilize 'draft_release_notes' for release documentation.",
        "Search 'Brand Bible' for content verification."
      ],
      "exampleTasks": [
        "Draft a product spec for a new feature based on customer feedback.",
        "Write release notes for the latest software update.",
        "Search the Brand Bible to ensure new content aligns with existing guidelines."
      ],
      "approvalNote": "All drafted specs and release notes require review in the Approval Center before implementation.",
      "tips": [
        "Always verify content with the Brand Bible before drafting new sections.",
        "Use 'escalate_to_human' for requests outside your authority.",
        "Ensure GDPR requests are recorded with 'gdpr_data_request' for compliance."
      ]
    },
    "tr": {
      "title": "Ürün Yöneticisi",
      "tagline": "Yol haritasını sahiplenir, taslak hazırlar, önceliklendirir, sürüm notları yazar.",
      "whatItDoes": [
        "Staffbix'teki Ürün Yöneticisi rolü, 'draft_product_spec' aracı kullanılarak yapılandırılmış ürün spesifikasyonları hazırlamayı içerir. Bu, müşteri geri bildirimlerine dayalı olarak sorunları, kullanıcı gereksinimlerini ve kabul kriterlerini tanımlamayı içerir.",
        "Rol ayrıca, gönderilen öğeleri, hata düzeltmelerini ve değişiklikleri özetleyen 'draft_release_notes' ile sürüm notları hazırlamayı gerektirir. Ek olarak, çoğaltmayı önlemek için mevcut içeriği aramak amacıyla Brand Bible'ı aramayı içerir."
      ],
      "integrationsRequired": [
        "Dahili"
      ],
      "steps": [
        "Staffbix'e giriş yapın.",
        "Ürün Yöneticisi rolü kontrol paneline gidin.",
        "Ürün spesifikasyonları oluşturmak için 'draft_product_spec' kullanın.",
        "Sürüm belgeleri için 'draft_release_notes' kullanın.",
        "İçerik doğrulaması için 'Brand Bible'ı arayın."
      ],
      "exampleTasks": [
        "Müşteri geri bildirimlerine dayalı yeni bir özellik için ürün spesifikasyonu hazırlayın.",
        "En son yazılım güncellemesi için sürüm notları yazın.",
        "Yeni içeriğin mevcut yönergelerle uyumlu olmasını sağlamak için Brand Bible'ı arayın."
      ],
      "approvalNote": "Tüm hazırlanan spesifikasyonlar ve sürüm notları, uygulamadan önce Approval Center'da gözden geçirilmelidir.",
      "tips": [
        "Yeni bölümler hazırlamadan önce içeriği Brand Bible ile her zaman doğrulayın.",
        "Yetkiniz dışındaki talepler için 'escalate_to_human' kullanın.",
        "GDPR taleplerinin uyumluluk için 'gdpr_data_request' ile kaydedildiğinden emin olun."
      ]
    }
  },
  "marketing-director": {
    "en": {
      "title": "Marketing Director",
      "tagline": "Strategize, review, and optimize marketing efforts.",
      "whatItDoes": [
        "The Marketing Director role on Staffbix leverages data-driven tools to optimize marketing strategies. It reviews channel performance, reallocates budgets, and proposes growth experiments to enhance marketing efficiency.",
        "This role uses tools like 'review_channel_mix' to assess marketing channel performance and 'propose_growth_experiment' to design and implement focused growth initiatives. It ensures that marketing efforts align with business goals and deliver measurable results."
      ],
      "integrationsRequired": [
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Marketing Director'.",
        "Connect your Stripe, Instagram, and LinkedIn accounts under 'Integrations'.",
        "Use 'review_channel_mix' to evaluate current marketing spend and performance.",
        "Activate 'propose_growth_experiment' to plan and execute a new marketing initiative."
      ],
      "exampleTasks": [
        "Reallocate budget from underperforming channels to high ROAS channels using 'review_channel_mix'.",
        "Design a growth experiment with a clear hypothesis and metrics using 'propose_growth_experiment'.",
        "Analyze marketing performance changes over time with 'compare_period_metric'."
      ],
      "approvalNote": "Ensure all proposed budget reallocations and experiments are reviewed in the Approval Center before implementation.",
      "tips": [
        "Regularly check channel performance to stay ahead of underperformance issues.",
        "Use 'compare_period_metric' to identify significant changes that require immediate attention.",
        "Focus on one growth experiment at a time to maximize learning and impact."
      ]
    },
    "tr": {
      "title": "Pazarlama Direktörü",
      "tagline": "Pazarlama çabalarını strateji oluştur, gözden geçir ve optimize et.",
      "whatItDoes": [
        "Staffbix üzerindeki Pazarlama Direktörü rolü, veri odaklı araçları kullanarak pazarlama stratejilerini optimize eder. Kanal performansını gözden geçirir, bütçeleri yeniden tahsis eder ve pazarlama verimliliğini artırmak için büyüme deneyleri önerir.",
        "Bu rol, pazarlama kanal performansını değerlendirmek için 'review_channel_mix' ve odaklanmış büyüme girişimleri tasarlamak ve uygulamak için 'propose_growth_experiment' gibi araçlar kullanır. Pazarlama çabalarının iş hedefleriyle uyumlu olmasını ve ölçülebilir sonuçlar sunmasını sağlar."
      ],
      "integrationsRequired": [
        "Stripe",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Pazarlama Direktörü'nü seçin.",
        "'Entegrasyonlar' altında Stripe, Instagram ve LinkedIn hesaplarınızı bağlayın.",
        "Mevcut pazarlama harcamalarını ve performansını değerlendirmek için 'review_channel_mix' kullanın.",
        "Yeni bir pazarlama girişimi planlamak ve yürütmek için 'propose_growth_experiment'i etkinleştirin."
      ],
      "exampleTasks": [
        "'Review_channel_mix' kullanarak düşük performans gösteren kanallardan yüksek ROAS kanallarına bütçe yeniden tahsis edin.",
        "'Propose_growth_experiment' kullanarak net bir hipotez ve metriklerle bir büyüme deneyi tasarlayın.",
        "'Compare_period_metric' ile zaman içinde pazarlama performansı değişikliklerini analiz edin."
      ],
      "approvalNote": "Önerilen tüm bütçe yeniden tahsisleri ve deneylerin uygulanmadan önce Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Performans sorunlarının önüne geçmek için kanal performansını düzenli olarak kontrol edin.",
        "Acil dikkat gerektiren önemli değişiklikleri belirlemek için 'compare_period_metric' kullanın.",
        "Öğrenme ve etkiyi maksimize etmek için bir seferde bir büyüme deneyine odaklanın."
      ]
    }
  },
  "sales-director": {
    "en": {
      "title": "Sales Director",
      "tagline": "Optimize sales pipeline and coach SDRs effectively.",
      "whatItDoes": [
        "The Sales Director role leverages the forecast_pipeline tool to compute a weighted pipeline forecast, ensuring the sales team meets quotas. It provides a detailed breakdown of committed, best-case, and weighted forecasts, along with confidence levels.",
        "Using the coach_sdr tool, the role generates structured feedback for SDRs based on outreach examples. It offers specific rewrites and a skill drill for improvement, enhancing SDR performance without overstating success rates."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "WhatsApp",
        "Stripe"
      ],
      "steps": [
        "Log into the Staffbix platform.",
        "Navigate to the 'Roles' section and select 'Sales Director'.",
        "Connect your LinkedIn, WhatsApp, and Stripe accounts for full integration.",
        "Access the forecast_pipeline tool to review and adjust sales forecasts.",
        "Utilize the coach_sdr tool to provide feedback and coaching to SDRs."
      ],
      "exampleTasks": [
        "Compute a weighted sales forecast for the upcoming quarter.",
        "Provide feedback on SDR outreach messages using recent examples.",
        "Identify anomalies in sales metrics between current and previous periods.",
        "Escalate complex customer requests to human teammates.",
        "Record GDPR data requests from customers."
      ],
      "approvalNote": "Ensure all sales forecasts and SDR coaching feedback are reviewed in the Approval Center before implementation.",
      "tips": [
        "Regularly compare sales metrics across periods to spot anomalies.",
        "Use the coach_sdr tool to focus on one skill improvement per week for SDRs.",
        "Always escalate to a human when requests exceed your authority."
      ]
    },
    "tr": {
      "title": "Satış Direktörü",
      "tagline": "Satış hattını optimize edin ve SDR'leri etkili bir şekilde eğitin.",
      "whatItDoes": [
        "Satış Direktörü rolü, satış ekibinin kotaları karşılamasını sağlamak için forecast_pipeline aracını kullanarak ağırlıklı bir satış hattı tahmini hesaplar. Taahhüt edilen, en iyi durum ve ağırlıklı tahminlerin detaylı bir dökümünü, güven seviyeleriyle birlikte sunar.",
        "coach_sdr aracını kullanarak, rol SDR'ler için yapılandırılmış geri bildirimler oluşturur. İyileştirme için belirli yeniden yazımlar ve bir beceri tatbikatı sunar, SDR performansını başarı oranlarını abartmadan artırır."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "WhatsApp",
        "Stripe"
      ],
      "steps": [
        "Staffbix platformuna giriş yapın.",
        "'Roller' bölümüne gidin ve 'Satış Direktörü'nü seçin.",
        "Tam entegrasyon için LinkedIn, WhatsApp ve Stripe hesaplarınızı bağlayın.",
        "Satış tahminlerini gözden geçirmek ve ayarlamak için forecast_pipeline aracına erişin.",
        "SDR'lere geri bildirim ve koçluk sağlamak için coach_sdr aracını kullanın."
      ],
      "exampleTasks": [
        "Gelecek çeyrek için ağırlıklı bir satış tahmini hesaplayın.",
        "Son örnekleri kullanarak SDR iletişim mesajları hakkında geri bildirim sağlayın.",
        "Mevcut ve önceki dönemler arasındaki satış metriklerindeki anormallikleri belirleyin.",
        "Karmaşık müşteri taleplerini insan ekip arkadaşlarına yönlendirin.",
        "Müşterilerden gelen GDPR veri taleplerini kaydedin."
      ],
      "approvalNote": "Tüm satış tahminleri ve SDR koçluk geri bildirimlerinin uygulanmadan önce Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Anormallikleri tespit etmek için satış metriklerini düzenli olarak dönemler arasında karşılaştırın.",
        "SDR'ler için haftada bir beceri geliştirmeye odaklanmak için coach_sdr aracını kullanın.",
        "Yetkinizi aşan taleplerde her zaman bir insana yönlendirin."
      ]
    }
  },
  "video-editor": {
    "en": {
      "title": "Video Editor",
      "tagline": "Efficient short-form video creation for social media.",
      "whatItDoes": [
        "The Video Editor role focuses on creating short-form video content for platforms like Instagram Reels, TikTok, and YouTube Shorts. It utilizes the 'plan_short_clips' tool to identify and extract engaging clips from longer videos.",
        "Using 'generate_captions', it formats spoken text into captions suitable for various video formats, ensuring clarity and engagement. This role is crucial for maintaining brand consistency and enhancing viewer interaction."
      ],
      "integrationsRequired": [
        "Instagram",
        "TikTok",
        "YouTube"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Video Editor role.",
        "Upload the long-form video content you wish to edit.",
        "Use 'plan_short_clips' to generate potential short clips.",
        "Select preferred clips and apply 'generate_captions'.",
        "Review and publish the edited video to the desired platform."
      ],
      "exampleTasks": [
        "Extract a 30-second highlight from a webinar for Instagram Reels.",
        "Create a 15-second promotional clip for TikTok.",
        "Format captions for a YouTube Shorts video."
      ],
      "approvalNote": "Ensure all video edits align with the Brand Bible before publishing.",
      "tips": [
        "Always review the generated clips for brand alignment.",
        "Use captions to enhance accessibility and engagement.",
        "Regularly check platform-specific guidelines for video formats."
      ]
    },
    "tr": {
      "title": "Video Düzenleyici",
      "tagline": "Sosyal medya için verimli kısa video oluşturma.",
      "whatItDoes": [
        "Video Düzenleyici rolü, Instagram Reels, TikTok ve YouTube Shorts gibi platformlar için kısa video içerikleri oluşturmaya odaklanır. Uzun videolardan ilgi çekici klipleri belirlemek ve çıkarmak için 'plan_short_clips' aracını kullanır.",
        "'generate_captions' kullanarak, konuşulan metni çeşitli video formatlarına uygun altyazılara dönüştürür, netlik ve etkileşim sağlar. Bu rol, marka tutarlılığını korumak ve izleyici etkileşimini artırmak için kritik öneme sahiptir."
      ],
      "integrationsRequired": [
        "Instagram",
        "TikTok",
        "YouTube"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Video Düzenleyici rolüne gidin.",
        "Düzenlemek istediğiniz uzun video içeriğini yükleyin.",
        "Potansiyel kısa klipler oluşturmak için 'plan_short_clips' kullanın.",
        "Tercih edilen klipleri seçin ve 'generate_captions' uygulayın.",
        "Düzenlenen videoyu istediğiniz platformda inceleyin ve yayınlayın."
      ],
      "exampleTasks": [
        "Instagram Reels için bir webinardan 30 saniyelik bir öne çıkan bölüm çıkarın.",
        "TikTok için 15 saniyelik bir tanıtım klibi oluşturun.",
        "YouTube Shorts videosu için altyazıları biçimlendirin."
      ],
      "approvalNote": "Tüm video düzenlemelerinin Brand Bible ile uyumlu olduğundan emin olun.",
      "tips": [
        "Oluşturulan klipleri her zaman marka uyumu açısından gözden geçirin.",
        "Erişilebilirliği ve etkileşimi artırmak için altyazıları kullanın.",
        "Video formatları için platforma özgü yönergeleri düzenli olarak kontrol edin."
      ]
    }
  },
  "brand-manager": {
    "en": {
      "title": "Brand Manager",
      "tagline": "Ensure Brand Bible consistency across all communications.",
      "whatItDoes": [
        "The Brand Manager role ensures all communications align with the Brand Bible. It uses the score_voice_match tool to evaluate content for consistency, identifying drifts and suggesting revisions before anything is shipped.",
        "It proposes updates to the Brand Bible when recurring patterns are detected, using propose_brand_bible_update. This ensures the Brand Bible remains current and relevant, preventing confusion and maintaining brand integrity."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Search the Brand Bible using search_brand_bible to understand existing guidelines.",
        "Use score_voice_match to evaluate content against the Brand Bible.",
        "If drifts are detected, revise content or propose updates using propose_brand_bible_update.",
        "Submit proposed updates to the Approval Center for review.",
        "Ensure all communications are approved before shipping."
      ],
      "exampleTasks": [
        "Evaluate a new Instagram post for brand consistency.",
        "Propose an update to the Brand Bible after identifying a recurring tone issue.",
        "Review LinkedIn content drafts for alignment with brand guidelines.",
        "Suggest revisions to a press release based on voice match scores.",
        "Assist in updating the Brand Bible to reflect new branding strategies."
      ],
      "approvalNote": "All proposed Brand Bible updates must be reviewed in the Approval Center before implementation.",
      "tips": [
        "Always search the Brand Bible first to avoid duplicating content.",
        "Use score_voice_match before shipping any content to ensure alignment.",
        "Escalate to a human if unsure about a significant brand decision."
      ]
    },
    "tr": {
      "title": "Marka Yöneticisi",
      "tagline": "Tüm iletişimlerde Brand Bible tutarlılığını sağlayın.",
      "whatItDoes": [
        "Marka Yöneticisi rolü, tüm iletişimlerin Brand Bible ile uyumlu olmasını sağlar. İçeriği tutarlılık açısından değerlendirmek için score_voice_match aracını kullanır, sapmaları belirler ve herhangi bir şey gönderilmeden önce revizyon önerir.",
        "Tekrarlayan kalıplar tespit edildiğinde, Brand Bible güncellemeleri önermek için propose_brand_bible_update kullanır. Bu, Brand Bible'ın güncel ve alakalı kalmasını sağlar, karışıklığı önler ve marka bütünlüğünü korur."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Mevcut kılavuzları anlamak için search_brand_bible kullanarak Brand Bible'ı arayın.",
        "İçeriği Brand Bible'a karşı değerlendirmek için score_voice_match kullanın.",
        "Sapmalar tespit edilirse, içeriği revize edin veya propose_brand_bible_update kullanarak güncellemeler önerin.",
        "Önerilen güncellemeleri inceleme için Approval Center'a gönderin.",
        "Tüm iletişimlerin gönderilmeden önce onaylandığından emin olun."
      ],
      "exampleTasks": [
        "Yeni bir Instagram gönderisini marka tutarlılığı açısından değerlendirin.",
        "Tekrarlayan bir ton sorunu tespit ettikten sonra Brand Bible'a bir güncelleme önerin.",
        "LinkedIn içerik taslaklarını marka kılavuzlarıyla uyum açısından gözden geçirin.",
        "Ses uyumu puanlarına dayanarak bir basın bülteni için revizyon önerin.",
        "Yeni marka stratejilerini yansıtmak için Brand Bible'ı güncellemeye yardımcı olun."
      ],
      "approvalNote": "Önerilen tüm Brand Bible güncellemeleri uygulamadan önce Approval Center'da incelenmelidir.",
      "tips": [
        "İçeriği çoğaltmamak için her zaman önce Brand Bible'ı arayın.",
        "Herhangi bir içeriği göndermeden önce uyumu sağlamak için score_voice_match kullanın.",
        "Önemli bir marka kararı hakkında emin değilseniz bir insana yönlendirin."
      ]
    }
  },
  "community-manager": {
    "en": {
      "title": "Community Manager",
      "tagline": "Engage, moderate, and escalate in community spaces.",
      "whatItDoes": [
        "The Community Manager role focuses on engaging with members across Discord and Slack. It welcomes new members with personalized messages, ensuring they feel valued and integrated into the community.",
        "This role also involves flagging inappropriate or off-topic content for human moderation and escalating complex issues to human teammates. It ensures the community remains a safe and welcoming environment."
      ],
      "integrationsRequired": [
        "Discord",
        "Slack"
      ],
      "steps": [
        "Connect your Discord and Slack accounts to Staffbix.",
        "Enable 'welcome_new_member' to personalize welcome messages.",
        "Use 'flag_for_moderation' to report inappropriate content.",
        "Activate 'escalate_to_human' for complex issues.",
        "Regularly review flagged content in the Approval Center."
      ],
      "exampleTasks": [
        "Welcome a new Discord member by referencing their recent project.",
        "Flag a Slack message containing harassment for moderation.",
        "Escalate a Discord conversation about a large refund request.",
        "Summarize weekly community engagement highlights.",
        "Register a content brief for a new community event announcement."
      ],
      "approvalNote": "All flagged content requires human review in the Approval Center.",
      "tips": [
        "Always personalize welcome messages; never use templates.",
        "Flag content rather than engaging directly with problematic posts.",
        "Escalate issues promptly to maintain community trust."
      ]
    },
    "tr": {
      "title": "Topluluk Yöneticisi",
      "tagline": "Topluluk alanlarında etkileşim kurun, düzenleyin ve yükseltin.",
      "whatItDoes": [
        "Topluluk Yöneticisi rolü, Discord ve Slack genelinde üyelerle etkileşim kurmaya odaklanır. Yeni üyeleri kişiselleştirilmiş mesajlarla karşılar, onların değerli ve topluluğa entegre hissetmelerini sağlar.",
        "Bu rol aynı zamanda uygunsuz veya konu dışı içeriği insan moderasyonu için işaretlemeyi ve karmaşık sorunları insan ekip arkadaşlarına yükseltmeyi içerir. Topluluğun güvenli ve davetkar bir ortam olarak kalmasını sağlar."
      ],
      "integrationsRequired": [
        "Discord",
        "Slack"
      ],
      "steps": [
        "Discord ve Slack hesaplarınızı Staffbix'e bağlayın.",
        "Hoş geldin mesajlarını kişiselleştirmek için 'welcome_new_member' özelliğini etkinleştirin.",
        "Uygunsuz içeriği bildirmek için 'flag_for_moderation' özelliğini kullanın.",
        "Karmaşık sorunlar için 'escalate_to_human' özelliğini etkinleştirin.",
        "Onay Merkezi'nde işaretlenen içeriği düzenli olarak gözden geçirin."
      ],
      "exampleTasks": [
        "Yeni bir Discord üyesini son projesine atıfta bulunarak karşılayın.",
        "Taciz içeren bir Slack mesajını moderasyon için işaretleyin.",
        "Büyük bir geri ödeme talebi hakkında bir Discord konuşmasını yükseltin.",
        "Haftalık topluluk etkileşim özetlerini özetleyin.",
        "Yeni bir topluluk etkinliği duyurusu için içerik brifingi kaydedin."
      ],
      "approvalNote": "Tüm işaretlenen içerikler Onay Merkezi'nde insan incelemesi gerektirir.",
      "tips": [
        "Hoş geldin mesajlarını her zaman kişiselleştirin; asla şablon kullanmayın.",
        "Sorunlu gönderilerle doğrudan etkileşimde bulunmak yerine içeriği işaretleyin.",
        "Topluluk güvenini korumak için sorunları hızlıca yükseltin."
      ]
    }
  },
  "affiliate-manager": {
    "en": {
      "title": "Affiliate Manager",
      "tagline": "Manage affiliate partnerships efficiently.",
      "whatItDoes": [
        "The Affiliate Manager recruits and manages affiliate partners, tracks their payouts, and supports them through email communication. It ensures affiliates are onboarded with the right commission structures and discount codes.",
        "Using tools like create_outreach_lead and queue_outreach_email, the role efficiently handles outreach and communication with potential affiliates, ensuring they are properly registered and engaged.",
        "The role also audits for fraud signals and escalates complex issues to human teammates when necessary, ensuring compliance and smooth operations."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Register a new affiliate prospect using create_outreach_lead.",
        "Queue a personalized outreach email with queue_outreach_email.",
        "Assign a discount code and commission using create_affiliate_code.",
        "Monitor affiliate activities and audit for fraud signals.",
        "Escalate complex issues to human teammates using escalate_to_human."
      ],
      "exampleTasks": [
        "Register a new affiliate lead and send an outreach email.",
        "Assign a 10% commission code to a new affiliate partner.",
        "Escalate a complex refund request to a human teammate.",
        "Record a GDPR data request from an affiliate.",
        "Audit affiliate activities for potential fraud signals."
      ],
      "approvalNote": "Ensure all affiliate agreements are reviewed in the Approval Center before finalizing.",
      "tips": [
        "Use promptOverride in queue_outreach_email to tailor your outreach.",
        "Regularly audit affiliate activities to prevent fraud.",
        "Escalate issues promptly to maintain affiliate satisfaction."
      ]
    },
    "tr": {
      "title": "Ortaklık Yöneticisi",
      "tagline": "Ortaklık iş birliklerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Ortaklık Yöneticisi, ortaklık partnerlerini işe alır ve yönetir, ödemelerini takip eder ve e-posta iletişimi yoluyla destek sağlar. Ortakların doğru komisyon yapıları ve indirim kodları ile işe alınmasını sağlar.",
        "create_outreach_lead ve queue_outreach_email gibi araçları kullanarak, potansiyel ortaklarla iletişimi ve kaydını verimli bir şekilde yönetir, doğru bir şekilde kayıt olmalarını ve katılımlarını sağlar.",
        "Ayrıca dolandırıcılık sinyalleri için denetim yapar ve gerektiğinde karmaşık sorunları insan ekip arkadaşlarına ileterek uyumluluk ve sorunsuz operasyonlar sağlar."
      ],
      "integrationsRequired": [
        "E-posta"
      ],
      "steps": [
        "create_outreach_lead kullanarak yeni bir ortak adayını kaydedin.",
        "queue_outreach_email ile kişiselleştirilmiş bir tanıtım e-postası sıraya alın.",
        "create_affiliate_code kullanarak bir indirim kodu ve komisyon atayın.",
        "Ortak faaliyetlerini izleyin ve dolandırıcılık sinyalleri için denetim yapın.",
        "escalate_to_human kullanarak karmaşık sorunları insan ekip arkadaşlarına iletin."
      ],
      "exampleTasks": [
        "Yeni bir ortak adayını kaydedin ve bir tanıtım e-postası gönderin.",
        "Yeni bir ortaklık partnerine %10 komisyon kodu atayın.",
        "Karmaşık bir iade talebini insan ekip arkadaşına iletin.",
        "Bir ortaktan gelen GDPR veri talebini kaydedin.",
        "Potansiyel dolandırıcılık sinyalleri için ortak faaliyetlerini denetleyin."
      ],
      "approvalNote": "Tüm ortaklık anlaşmalarının onaylanmadan önce Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "queue_outreach_email içinde promptOverride kullanarak tanıtımınızı özelleştirin.",
        "Dolandırıcılığı önlemek için düzenli olarak ortak faaliyetlerini denetleyin.",
        "Ortak memnuniyetini sağlamak için sorunları hızlıca iletin."
      ]
    }
  },
  "event-marketer": {
    "en": {
      "title": "Event Marketer",
      "tagline": "Master event marketing with precision and efficiency.",
      "whatItDoes": [
        "The Event Marketer role on Staffbix orchestrates marketing for webinars, launches, and conferences. It manages invites, follow-ups, and content repurposing with precision.",
        "Using tools like plan_event_invite_sequence, it schedules event invites and follow-ups. The repurpose_event_recording tool transforms event recordings into engaging content across platforms."
      ],
      "integrationsRequired": [
        "Email",
        "Calendar"
      ],
      "steps": [
        "Integrate your Email and Calendar with Staffbix.",
        "Use plan_event_invite_sequence to schedule invites and follow-ups.",
        "Leverage repurpose_event_recording for content creation post-event.",
        "Queue outreach emails using queue_outreach_email for lead engagement.",
        "Escalate complex queries to human teammates with escalate_to_human."
      ],
      "exampleTasks": [
        "Schedule and send a webinar invite sequence with precise timing.",
        "Convert a conference recording into LinkedIn posts and Instagram stories.",
        "Draft and queue personalized outreach emails for event leads.",
        "Handle GDPR data requests related to event attendees.",
        "Escalate complex customer inquiries to human teammates."
      ],
      "approvalNote": "Ensure all event marketing activities align with the Brand Bible and are approved via the Approval Center.",
      "tips": [
        "Use plan_event_invite_sequence to optimize invite timing for maximum attendance.",
        "Repurpose event content creatively to extend the event's reach and engagement.",
        "Always escalate to human when unsure or when handling sensitive customer requests."
      ]
    },
    "tr": {
      "title": "Etkinlik Pazarlamacısı",
      "tagline": "Etkinlik pazarlamasında hassasiyet ve verimlilikle ustalaşın.",
      "whatItDoes": [
        "Staffbix üzerindeki Etkinlik Pazarlamacısı rolü, webinarlar, lansmanlar ve konferanslar için pazarlamayı organize eder. Davetiyeleri, takipleri ve içerik yeniden kullanımı hassasiyetle yönetir.",
        "plan_event_invite_sequence gibi araçları kullanarak etkinlik davetiyelerini ve takiplerini planlar. repurpose_event_recording aracı, etkinlik kayıtlarını platformlar arasında ilgi çekici içeriğe dönüştürür."
      ],
      "integrationsRequired": [
        "E-posta",
        "Takvim"
      ],
      "steps": [
        "E-posta ve Takviminizi Staffbix ile entegre edin.",
        "Davetiyeleri ve takipleri planlamak için plan_event_invite_sequence kullanın.",
        "Etkinlik sonrası içerik oluşturmak için repurpose_event_recording'den yararlanın.",
        "Potansiyel müşteri etkileşimi için queue_outreach_email kullanarak e-posta gönderimlerini sıraya alın.",
        "Karmaşık sorguları insan ekip arkadaşlarına yönlendirmek için escalate_to_human kullanın."
      ],
      "exampleTasks": [
        "Hassas zamanlamayla bir webinar davet dizisi planlayın ve gönderin.",
        "Bir konferans kaydını LinkedIn gönderilerine ve Instagram hikayelerine dönüştürün.",
        "Etkinlik potansiyel müşterileri için kişiselleştirilmiş e-posta taslakları hazırlayın ve sıraya alın.",
        "Etkinlik katılımcılarıyla ilgili GDPR veri taleplerini yönetin.",
        "Karmaşık müşteri sorgularını insan ekip arkadaşlarına yönlendirin."
      ],
      "approvalNote": "Tüm etkinlik pazarlama faaliyetlerinin Brand Bible ile uyumlu olduğundan emin olun ve Approval Center aracılığıyla onaylayın.",
      "tips": [
        "Maksimum katılım için davet zamanlamasını optimize etmek amacıyla plan_event_invite_sequence kullanın.",
        "Etkinliğin erişimini ve etkileşimini artırmak için etkinlik içeriğini yaratıcı bir şekilde yeniden kullanın.",
        "Emin olmadığınızda veya hassas müşteri taleplerini işlerken her zaman insanlara yönlendirin."
      ]
    }
  },
  "influencer-outreach": {
    "en": {
      "title": "Influencer Outreach",
      "tagline": "Efficiently connect with the right creators.",
      "whatItDoes": [
        "The Influencer Outreach role on Staffbix identifies suitable creators for your brand, drafts personalized pitches, and manages negotiations. It ensures you connect with influencers who align with your brand values and objectives.",
        "Using the find_influencer tool, it selects creators based on niche, follower count, and engagement rate. Once identified, it registers them as leads and crafts tailored outreach emails to initiate collaboration."
      ],
      "integrationsRequired": [
        "Email",
        "Instagram"
      ],
      "steps": [
        "Use find_influencer to identify potential creators.",
        "Register the creator using create_outreach_lead.",
        "Generate and queue a personalized email with queue_outreach_email.",
        "Monitor responses and escalate_to_human if necessary.",
        "Track deliverables and update the Brand Bible."
      ],
      "exampleTasks": [
        "Identify fashion influencers with high engagement rates.",
        "Register a new beauty influencer lead.",
        "Draft a pitch email for a tech influencer.",
        "Negotiate collaboration terms with a travel influencer.",
        "Track deliverables for a fitness campaign."
      ],
      "approvalNote": "All influencer collaborations must be approved via the Approval Center before proceeding.",
      "tips": [
        "Focus on engagement rates rather than follower count for better partnerships.",
        "Use promptOverride in queue_outreach_email for specific email angles.",
        "Regularly update the Brand Bible to reflect current influencer collaborations."
      ]
    },
    "tr": {
      "title": "Influencer Erişimi",
      "tagline": "Doğru yaratıcılarla verimli bir şekilde bağlantı kurun.",
      "whatItDoes": [
        "Staffbix üzerindeki Influencer Erişimi rolü, markanız için uygun yaratıcıları belirler, kişiselleştirilmiş teklifler hazırlar ve müzakereleri yönetir. Markanızın değerleri ve hedefleriyle uyumlu influencerlarla bağlantı kurmanızı sağlar.",
        "find_influencer aracı kullanılarak, niş, takipçi sayısı ve etkileşim oranına göre yaratıcılar seçilir. Belirlendikten sonra, potansiyel müşteri olarak kaydedilirler ve iş birliğini başlatmak için özel olarak hazırlanmış e-posta gönderilir."
      ],
      "integrationsRequired": [
        "Email",
        "Instagram"
      ],
      "steps": [
        "Potansiyel yaratıcıları belirlemek için find_influencer kullanın.",
        "create_outreach_lead ile yaratıcıyı kaydedin.",
        "queue_outreach_email ile kişiselleştirilmiş bir e-posta oluşturun ve sıraya alın.",
        "Yanıtları izleyin ve gerekirse escalate_to_human yapın.",
        "Teslimatları takip edin ve Brand Bible güncelleyin."
      ],
      "exampleTasks": [
        "Yüksek etkileşim oranına sahip moda influencerlarını belirleyin.",
        "Yeni bir güzellik influencer potansiyel müşterisi kaydedin.",
        "Bir teknoloji influencerı için teklif e-postası hazırlayın.",
        "Bir seyahat influencerı ile iş birliği şartlarını müzakere edin.",
        "Bir fitness kampanyası için teslimatları takip edin."
      ],
      "approvalNote": "Tüm influencer iş birlikleri, ilerlemeden önce Approval Center üzerinden onaylanmalıdır.",
      "tips": [
        "Daha iyi ortaklıklar için takipçi sayısından ziyade etkileşim oranlarına odaklanın.",
        "queue_outreach_email içinde belirli e-posta açıları için promptOverride kullanın.",
        "Brand Bible'ı mevcut influencer iş birliklerini yansıtacak şekilde düzenli olarak güncelleyin."
      ]
    }
  },
  "podcast-producer": {
    "en": {
      "title": "Podcast Producer",
      "tagline": "Streamline your podcast production with AI-driven efficiency.",
      "whatItDoes": [
        "The Podcast Producer role on Staffbix automates guest booking, show note drafting, and content repurposing. It crafts personalized guest invitations and outlines key podcast moments for easy reference.",
        "With tools like 'draft_show_notes' and 'draft_guest_invitation', it ensures seamless communication and content creation. The role also repurposes podcast content for various platforms, enhancing your reach."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Podcast Producer'.",
        "Connect your Email account for guest communication.",
        "Activate 'draft_show_notes' for automatic note generation.",
        "Use 'repurpose_event_recording' to create multi-platform content."
      ],
      "exampleTasks": [
        "Draft show notes from a podcast transcript.",
        "Send personalized guest invitations via email.",
        "Repurpose podcast recordings for Instagram posts.",
        "Queue outreach emails to potential podcast guests.",
        "Escalate complex guest requests to a human teammate."
      ],
      "approvalNote": "Ensure all guest communications are approved through the Approval Center before sending.",
      "tips": [
        "Use 'draft_show_notes' to quickly generate comprehensive notes.",
        "Leverage 'repurpose_event_recording' for maximum content reach.",
        "Always escalate sensitive guest issues to maintain professionalism."
      ]
    },
    "tr": {
      "title": "Podcast Üreticisi",
      "tagline": "Podcast üretiminizi yapay zeka destekli verimlilikle kolaylaştırın.",
      "whatItDoes": [
        "Staffbix üzerindeki Podcast Üreticisi rolü, konuk rezervasyonunu, program notları taslağını ve içerik yeniden kullanımını otomatikleştirir. Kişiselleştirilmiş konuk davetiyeleri hazırlar ve kolay referans için önemli podcast anlarını özetler.",
        "'draft_show_notes' ve 'draft_guest_invitation' gibi araçlarla, kesintisiz iletişim ve içerik oluşturulmasını sağlar. Rol ayrıca podcast içeriğini çeşitli platformlar için yeniden kullanarak erişiminizi artırır."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Podcast Üreticisi'ni seçin.",
        "Konuk iletişimi için Email hesabınızı bağlayın.",
        "Otomatik not oluşturma için 'draft_show_notes'u etkinleştirin.",
        "Çoklu platform içeriği oluşturmak için 'repurpose_event_recording'i kullanın."
      ],
      "exampleTasks": [
        "Bir podcast transkriptinden program notları taslağı oluşturun.",
        "Email yoluyla kişiselleştirilmiş konuk davetiyeleri gönderin.",
        "Podcast kayıtlarını Instagram gönderileri için yeniden kullanın.",
        "Potansiyel podcast konuklarına yönelik tanıtım emailleri sıraya alın.",
        "Karmaşık konuk taleplerini bir insan takım arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm konuk iletişimlerinin gönderilmeden önce Approval Center üzerinden onaylandığından emin olun.",
      "tips": [
        "Kapsamlı notları hızlıca oluşturmak için 'draft_show_notes'u kullanın.",
        "Maksimum içerik erişimi için 'repurpose_event_recording'den yararlanın.",
        "Profesyonelliği korumak için hassas konuk sorunlarını her zaman yükseltin."
      ]
    }
  },
  "webinar-host": {
    "en": {
      "title": "Webinar Host Assistant",
      "tagline": "Streamline webinar management from preparation to follow-up.",
      "whatItDoes": [
        "The Webinar Host Assistant prepares event invite sequences and manages registrant communication. It computes precise send schedules for invites and follow-ups, ensuring timely and targeted outreach.",
        "During live webinars, it triages Q&A, scoring relevance and urgency, and surfaces top questions with suggested angles for the host. Post-event, it drafts follow-up email drips tailored to attendee engagement."
      ],
      "integrationsRequired": [
        "Email",
        "Zoom"
      ],
      "steps": [
        "Connect your Email and Zoom accounts to Staffbix.",
        "Use 'plan_event_invite_sequence' to schedule invites and follow-ups.",
        "During the webinar, activate 'triage_live_qa' for efficient Q&A handling.",
        "Post-event, run 'draft_webinar_followup_drip' for attendee-specific emails.",
        "Review and send the proposed follow-up emails to registrants."
      ],
      "exampleTasks": [
        "Schedule a 3-part email invite sequence for an upcoming webinar.",
        "Triage live questions during a webinar, highlighting top queries for the host.",
        "Draft a post-event drip campaign for attendees and no-shows.",
        "Propose content repurposing ideas from the webinar recording.",
        "Escalate complex attendee inquiries to a human team member."
      ],
      "approvalNote": "Ensure all email content aligns with your Brand Bible before sending.",
      "tips": [
        "Regularly update your Brand Bible to maintain consistent messaging.",
        "Use the 'escalate_to_human' tool for any complex or sensitive attendee issues.",
        "Leverage 'repurpose_event_recording' to maximize content value post-webinar."
      ]
    },
    "tr": {
      "title": "Webinar Sunucu Asistanı",
      "tagline": "Hazırlıktan takip sürecine kadar webinar yönetimini kolaylaştırın.",
      "whatItDoes": [
        "Webinar Sunucu Asistanı, etkinlik davet dizilerini hazırlar ve kayıtlı katılımcı iletişimini yönetir. Davet ve takip gönderimlerini tam zamanında ve hedefe yönelik olarak sağlamak için kesin gönderim programlarını hesaplar.",
        "Canlı webinarlarda, Soru-Cevap bölümünü önceliklendirir, alaka düzeyi ve aciliyet puanlaması yapar ve sunucu için önerilen açılarla en iyi soruları öne çıkarır. Etkinlik sonrası, katılımcı etkileşimine göre uyarlanmış takip e-posta dizileri hazırlar."
      ],
      "integrationsRequired": [
        "Email",
        "Zoom"
      ],
      "steps": [
        "Email ve Zoom hesaplarınızı Staffbix'e bağlayın.",
        "Davet ve takipleri planlamak için 'plan_event_invite_sequence' kullanın.",
        "Webinar sırasında, etkili Soru-Cevap yönetimi için 'triage_live_qa' etkinleştirin.",
        "Etkinlik sonrası, katılımcıya özel e-postalar için 'draft_webinar_followup_drip' çalıştırın.",
        "Önerilen takip e-postalarını gözden geçirip kayıtlı katılımcılara gönderin."
      ],
      "exampleTasks": [
        "Yaklaşan bir webinar için 3 parçalı bir e-posta davet dizisi planlayın.",
        "Webinar sırasında canlı soruları önceliklendirin ve sunucu için en iyi soruları vurgulayın.",
        "Katılımcılar ve katılmayanlar için etkinlik sonrası bir damla kampanyası taslağı hazırlayın.",
        "Webinar kaydından içerik yeniden kullanımı fikirleri önerin.",
        "Karmaşık katılımcı sorularını insan bir ekip üyesine yönlendirin."
      ],
      "approvalNote": "Tüm e-posta içeriğinin Brand Bible ile uyumlu olduğundan emin olun.",
      "tips": [
        "Tutarlı mesajlaşmayı sürdürmek için Brand Bible'ınızı düzenli olarak güncelleyin.",
        "Karmaşık veya hassas katılımcı sorunları için 'escalate_to_human' aracını kullanın.",
        "Webinar sonrası içerik değerini en üst düzeye çıkarmak için 'repurpose_event_recording' kullanın."
      ]
    }
  },
  "bdr": {
    "en": {
      "title": "Business Development Rep",
      "tagline": "Efficient cold outreach and lead generation.",
      "whatItDoes": [
        "The Business Development Rep role focuses on cold outreach and booking discovery calls. It uses firmographic data and recent news to craft personalized emails.",
        "This role registers new prospects and drafts outreach emails, ensuring each lead is approached with relevant context and information."
      ],
      "integrationsRequired": [
        "Email",
        "LinkedIn"
      ],
      "steps": [
        "Use enrich_prospect with an email, company domain, or LinkedIn URL to gather prospect data.",
        "Call create_outreach_lead to register the prospect in the leads database.",
        "Receive a leadId from create_outreach_lead.",
        "Use queue_outreach_email with the leadId to draft and queue a personalized email.",
        "Monitor responses and escalate_to_human if necessary."
      ],
      "exampleTasks": [
        "Research and email a prospect using their recent Series B funding news.",
        "Register a new lead from LinkedIn and send a tailored outreach email.",
        "Escalate a complex inquiry to a human teammate for further handling."
      ],
      "approvalNote": "Ensure all outreach emails align with the Brand Bible before sending.",
      "tips": [
        "Always enrich prospect data before drafting an email to ensure relevance.",
        "Use promptOverride in queue_outreach_email to tailor the message to specific prospect signals."
      ]
    },
    "tr": {
      "title": "İş Geliştirme Temsilcisi",
      "tagline": "Etkili soğuk iletişim ve potansiyel müşteri oluşturma.",
      "whatItDoes": [
        "İş Geliştirme Temsilcisi rolü, soğuk iletişim ve keşif görüşmeleri ayarlamaya odaklanır. Kişiselleştirilmiş e-postalar oluşturmak için firma verileri ve güncel haberleri kullanır.",
        "Bu rol, yeni potansiyel müşterileri kaydeder ve iletişim e-postaları hazırlar, her bir potansiyel müşteriye ilgili bağlam ve bilgilerle yaklaşılmasını sağlar."
      ],
      "integrationsRequired": [
        "Email",
        "LinkedIn"
      ],
      "steps": [
        "Potansiyel müşteri verilerini toplamak için enrich_prospect ile bir e-posta, şirket alanı veya LinkedIn URL'si kullanın.",
        "Potansiyel müşteriyi lead veritabanına kaydetmek için create_outreach_lead çağrısı yapın.",
        "create_outreach_lead'den bir leadId alın.",
        "Kişiselleştirilmiş bir e-posta taslağı hazırlamak ve sıraya almak için leadId ile queue_outreach_email kullanın.",
        "Yanıtları izleyin ve gerekirse escalate_to_human yapın."
      ],
      "exampleTasks": [
        "Son Seri B fonlama haberlerini kullanarak bir potansiyel müşteri araştırın ve e-posta gönderin.",
        "LinkedIn'den yeni bir potansiyel müşteri kaydedin ve özel bir iletişim e-postası gönderin.",
        "Karmaşık bir sorguyu daha fazla işlem için bir insan ekip arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm iletişim e-postalarının gönderilmeden önce Brand Bible ile uyumlu olduğundan emin olun.",
      "tips": [
        "E-postayı tasarlamadan önce her zaman potansiyel müşteri verilerini zenginleştirin, böylece alaka düzeyini sağlayın.",
        "Mesajı belirli potansiyel müşteri sinyallerine göre uyarlamak için queue_outreach_email'de promptOverride kullanın."
      ]
    }
  },
  "sales-engineer": {
    "en": {
      "title": "Sales Engineer",
      "tagline": "Technical demos, custom proposals, integration queries resolved.",
      "whatItDoes": [
        "The Sales Engineer role on Staffbix assists in answering technical questions from potential buyers, ensuring that all responses are structured and within scope. It defers pricing and contract discussions to the Account Manager.",
        "It drafts integration architecture outlines, detailing components, data flows, and open questions, without committing to specific SLAs or delivery dates. When necessary, it escalates conversations to human teammates for complex issues.",
        "The role also records GDPR data-subject requests, ensuring compliance by pausing conversations for human review without attempting data deletion or modification."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Sales Engineer'.",
        "Connect your Email and Web channels for seamless communication.",
        "Familiarize yourself with the tools: answer_technical_question, draft_integration_outline, escalate_to_human, gdpr_data_request.",
        "Activate the role by clicking 'Enable' and start handling tasks."
      ],
      "exampleTasks": [
        "Answer a technical question about API integration capabilities.",
        "Draft an integration outline for a potential client's CRM system.",
        "Escalate a conversation to a human when a customer requests a large refund.",
        "Record a GDPR data request for data erasure from a customer.",
        "Inform a customer that a teammate will follow up on a complex contract change request."
      ],
      "approvalNote": "Ensure all responses are within the defined scope and escalate when necessary.",
      "tips": [
        "Always defer pricing and contract discussions to the Account Manager.",
        "Use 'escalate_to_human' for any requests outside your authority or when unsure.",
        "Record GDPR requests accurately and pause the conversation for legal compliance."
      ]
    },
    "tr": {
      "title": "Satış Mühendisi",
      "tagline": "Teknik demolar, özel teklifler, entegrasyon sorguları çözüldü.",
      "whatItDoes": [
        "Staffbix üzerindeki Satış Mühendisi rolü, potansiyel alıcılardan gelen teknik soruları yanıtlamaya yardımcı olur, tüm yanıtların yapılandırılmış ve kapsam dahilinde olmasını sağlar. Fiyatlandırma ve sözleşme görüşmelerini Hesap Yöneticisine devreder.",
        "Entegrasyon mimarisi taslaklarını hazırlar, bileşenleri, veri akışlarını ve açık soruları detaylandırır, belirli SLA'lara veya teslimat tarihlerine bağlı kalmadan. Gerektiğinde, karmaşık konular için insan ekip arkadaşlarına konuşmaları yükseltir.",
        "Rol ayrıca GDPR veri konusu taleplerini kaydeder, veri silme veya değiştirme girişiminde bulunmadan insan incelemesi için konuşmaları durdurarak uyumluluğu sağlar."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Satış Mühendisi'ni seçin.",
        "Sorunsuz iletişim için E-posta ve Web kanallarınızı bağlayın.",
        "Araçlarla tanışın: answer_technical_question, draft_integration_outline, escalate_to_human, gdpr_data_request.",
        "Rolü 'Etkinleştir' butonuna tıklayarak aktif hale getirin ve görevleri yönetmeye başlayın."
      ],
      "exampleTasks": [
        "API entegrasyon yetenekleri hakkında teknik bir soruyu yanıtlayın.",
        "Potansiyel bir müşterinin CRM sistemi için bir entegrasyon taslağı hazırlayın.",
        "Bir müşteri büyük bir geri ödeme talep ettiğinde konuşmayı bir insana yükseltin.",
        "Bir müşteriden gelen veri silme talebi için bir GDPR veri talebini kaydedin.",
        "Bir müşteriye, karmaşık bir sözleşme değişikliği talebi hakkında bir ekip arkadaşının takip edeceğini bildirin."
      ],
      "approvalNote": "Tüm yanıtların tanımlanmış kapsam dahilinde olduğundan emin olun ve gerektiğinde yükseltin.",
      "tips": [
        "Fiyatlandırma ve sözleşme görüşmelerini her zaman Hesap Yöneticisine devredin.",
        "Yetkiniz dışındaki veya emin olmadığınız talepler için 'escalate_to_human' kullanın.",
        "GDPR taleplerini doğru bir şekilde kaydedin ve yasal uyumluluk için konuşmayı durdurun."
      ]
    }
  },
  "proposal-writer": {
    "en": {
      "title": "Proposal Writer",
      "tagline": "Crafts tailored proposals and RFP responses.",
      "whatItDoes": [
        "The Proposal Writer drafts responses to Requests for Proposals (RFPs) and creates custom proposals and Statements of Work (SOWs) using structured templates. It ensures that all sections, such as executive summaries and scope matrices, are included.",
        "Pricing details are placeholders, requiring human input for finalization. The tool is designed to maintain your unique voice while ensuring consistency and professionalism in all documents."
      ],
      "integrationsRequired": [
        "Email",
        "Docs"
      ],
      "steps": [
        "Log in to your Staffbix account.",
        "Navigate to the 'Sales' category.",
        "Select 'Proposal Writer' from the list of roles.",
        "Connect your Email and Docs integrations.",
        "Begin drafting by selecting 'draft_rfp_response' or 'draft_sow'."
      ],
      "exampleTasks": [
        "Draft an RFP response with an executive summary and scope matrix.",
        "Create a Statement of Work outlining deliverables and milestones.",
        "Hand off complex proposal queries to a human teammate."
      ],
      "approvalNote": "Ensure all proposals are reviewed in the Approval Center before sending.",
      "tips": [
        "Use 'draft_rfp_response' for structured RFPs, ensuring all sections are covered.",
        "Remember to fill in pricing details manually in the SOW.",
        "Escalate to a human when dealing with complex or sensitive client requests."
      ]
    },
    "tr": {
      "title": "Teklif Yazarı",
      "tagline": "Özelleştirilmiş teklifler ve RFP yanıtları hazırlar.",
      "whatItDoes": [
        "Teklif Yazarı, Teklif Taleplerine (RFP'ler) yanıtlar hazırlar ve yapılandırılmış şablonlar kullanarak özel teklifler ve İş Tanımları (SOW'lar) oluşturur. Yönetici özetleri ve kapsam matrisleri gibi tüm bölümlerin dahil edilmesini sağlar.",
        "Fiyatlandırma detayları, nihai hale getirilmesi için insan girdisi gerektiren yer tutuculardır. Araç, tüm belgelerde tutarlılık ve profesyonellik sağlarken benzersiz sesinizi korumak için tasarlanmıştır."
      ],
      "integrationsRequired": [
        "E-posta",
        "Belgeler"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Satış' kategorisine gidin.",
        "Roller listesinden 'Teklif Yazarı'nı seçin.",
        "E-posta ve Belgeler entegrasyonlarınızı bağlayın.",
        "'draft_rfp_response' veya 'draft_sow' seçerek taslağı oluşturmaya başlayın."
      ],
      "exampleTasks": [
        "Yönetici özeti ve kapsam matrisi içeren bir RFP yanıtı hazırlayın.",
        "Teslimatlar ve kilometre taşlarını özetleyen bir İş Tanımı oluşturun.",
        "Karmaşık teklif sorgularını insan bir takım arkadaşına devredin."
      ],
      "approvalNote": "Göndermeden önce tüm tekliflerin Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Yapılandırılmış RFP'ler için 'draft_rfp_response' kullanın, tüm bölümlerin kapsandığından emin olun.",
        "SOW'da fiyatlandırma detaylarını manuel olarak doldurmayı unutmayın.",
        "Karmaşık veya hassas müşteri talepleriyle uğraşırken bir insana yönlendirin."
      ]
    }
  },
  "renewal-specialist": {
    "en": {
      "title": "Renewal Specialist",
      "tagline": "Manage renewals, mitigate churn, and optimize retention strategies.",
      "whatItDoes": [
        "The Renewal Specialist role focuses on managing the renewal cycle by identifying potential churn risks early. Using the score_churn_risk tool, it computes a churn-risk score based on account signals like usage trends and payment history.",
        "It drafts renewal save plays with the draft_renewal_play tool, ensuring offers are within authority limits. The role also tracks expansion opportunities, recording any upsell or cross-sell signals for further action."
      ],
      "integrationsRequired": [
        "Email",
        "Stripe",
        "LinkedIn"
      ],
      "steps": [
        "Integrate your email account with Staffbix.",
        "Use score_churn_risk to assess each account's renewal risk.",
        "Draft renewal save plays using draft_renewal_play.",
        "Record any upsell or cross-sell signals with track_expansion_opportunity.",
        "Escalate complex cases to a human using escalate_to_human."
      ],
      "exampleTasks": [
        "Compute churn-risk score for accounts nearing renewal.",
        "Draft renewal offers with fallback options for high-risk accounts.",
        "Record expansion opportunities when a customer shows interest in additional services.",
        "Send follow-up emails to prospects who need nurturing.",
        "Escalate requests for large discounts to a human teammate."
      ],
      "approvalNote": "Ensure all renewal offers comply with company policies before sending.",
      "tips": [
        "Regularly monitor churn-risk scores to preemptively address potential issues.",
        "Customize renewal plays based on specific account signals for higher success rates.",
        "Always escalate cases that exceed your authority to maintain compliance and customer trust."
      ]
    },
    "tr": {
      "title": "Yenileme Uzmanı",
      "tagline": "Yenilemeleri yönetin, müşteri kaybını azaltın ve müşteri tutma stratejilerini optimize edin.",
      "whatItDoes": [
        "Yenileme Uzmanı rolü, yenileme döngüsünü yönetmeye odaklanır ve potansiyel müşteri kaybı risklerini erken aşamada belirler. score_churn_risk aracı kullanılarak, kullanım eğilimleri ve ödeme geçmişi gibi hesap sinyallerine dayalı bir müşteri kaybı riski puanı hesaplanır.",
        "draft_renewal_play aracı ile yenileme kurtarma planları taslak olarak hazırlanır ve tekliflerin yetki sınırları içinde kalması sağlanır. Rol ayrıca genişleme fırsatlarını izler ve ileri işlem için herhangi bir yukarı satış veya çapraz satış sinyalini kaydeder."
      ],
      "integrationsRequired": [
        "E-posta",
        "Stripe",
        "LinkedIn"
      ],
      "steps": [
        "E-posta hesabınızı Staffbix ile entegre edin.",
        "Her hesabın yenileme riskini değerlendirmek için score_churn_risk kullanın.",
        "draft_renewal_play kullanarak yenileme kurtarma planları taslak olarak hazırlayın.",
        "track_expansion_opportunity ile herhangi bir yukarı satış veya çapraz satış sinyalini kaydedin.",
        "Karmaşık vakaları escalate_to_human kullanarak bir insana yönlendirin."
      ],
      "exampleTasks": [
        "Yenileme yaklaşan hesaplar için müşteri kaybı riski puanı hesaplayın.",
        "Yüksek riskli hesaplar için alternatif seçeneklerle yenileme teklifleri hazırlayın.",
        "Müşteri ek hizmetlere ilgi gösterdiğinde genişleme fırsatlarını kaydedin.",
        "İlgi gösteren potansiyel müşterilere takip e-postaları gönderin.",
        "Büyük indirim taleplerini bir insan ekip arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm yenileme tekliflerinin gönderilmeden önce şirket politikalarına uygun olduğundan emin olun.",
      "tips": [
        "Potansiyel sorunları önceden ele almak için müşteri kaybı riski puanlarını düzenli olarak izleyin.",
        "Daha yüksek başarı oranları için yenileme planlarını belirli hesap sinyallerine göre özelleştirin.",
        "Yetkinizi aşan vakaları her zaman yönlendirin, uyumluluğu ve müşteri güvenini koruyun."
      ]
    }
  },
  "partnership-manager": {
    "en": {
      "title": "Partnership Manager",
      "tagline": "Efficiently manage and nurture strategic partnerships.",
      "whatItDoes": [
        "The Partnership Manager identifies and evaluates potential partners using the 'score_partner_fit' tool, ensuring alignment in type, ARR, and region. It scores partners on audience, voice, and ecosystem alignment.",
        "It drafts comprehensive partnership proposals with 'draft_partnership_proposal', outlining joint go-to-market strategies and success metrics, while leaving financial terms for human negotiation.",
        "The role manages outreach by registering leads with 'create_outreach_lead' and sending personalized emails using 'queue_outreach_email', ensuring efficient communication with potential partners."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "Email"
      ],
      "steps": [
        "Use 'score_partner_fit' to evaluate potential partners.",
        "Draft a partnership proposal using 'draft_partnership_proposal'.",
        "Register new leads with 'create_outreach_lead'.",
        "Queue outreach emails with 'queue_outreach_email'.",
        "Escalate complex issues to a human with 'escalate_to_human'."
      ],
      "exampleTasks": [
        "Evaluate a new partner's fit based on ARR and region.",
        "Draft a joint marketing proposal for a potential partner.",
        "Register and email a lead about a co-marketing opportunity."
      ],
      "approvalNote": "Ensure all partnership proposals are reviewed in the Approval Center before finalizing.",
      "tips": [
        "Use 'promptOverride' in 'queue_outreach_email' to tailor messages.",
        "Always escalate to a human when unsure about a partner's request.",
        "Regularly update lead information to maintain accurate records."
      ]
    },
    "tr": {
      "title": "Ortaklık Yöneticisi",
      "tagline": "Stratejik ortaklıkları verimli bir şekilde yönetin ve geliştirin.",
      "whatItDoes": [
        "Ortaklık Yöneticisi, 'score_partner_fit' aracını kullanarak potansiyel ortakları belirler ve değerlendirir, tür, ARR ve bölge uyumunu sağlar. Ortakları, kitle, ses ve ekosistem uyumuna göre puanlar.",
        "'draft_partnership_proposal' ile kapsamlı ortaklık teklifleri hazırlar, ortak pazara giriş stratejilerini ve başarı ölçütlerini özetler, finansal şartları insan müzakeresine bırakır.",
        "Rol, 'create_outreach_lead' ile potansiyel müşterileri kaydederek ve 'queue_outreach_email' kullanarak kişiselleştirilmiş e-postalar göndererek potansiyel ortaklarla etkili iletişim sağlar."
      ],
      "integrationsRequired": [
        "LinkedIn",
        "E-posta"
      ],
      "steps": [
        "Potansiyel ortakları değerlendirmek için 'score_partner_fit' kullanın.",
        "'draft_partnership_proposal' kullanarak bir ortaklık teklifi hazırlayın.",
        "Yeni potansiyel müşterileri 'create_outreach_lead' ile kaydedin.",
        "'queue_outreach_email' ile tanıtım e-postalarını sıraya alın.",
        "Karmaşık sorunları 'escalate_to_human' ile bir insana yönlendirin."
      ],
      "exampleTasks": [
        "ARR ve bölgeye göre yeni bir ortağın uyumunu değerlendirin.",
        "Potansiyel bir ortak için ortak bir pazarlama teklifi hazırlayın.",
        "Bir ortak pazarlama fırsatı hakkında bir potansiyel müşteri kaydedin ve e-posta gönderin."
      ],
      "approvalNote": "Tüm ortaklık tekliflerinin sonlandırılmadan önce Approval Center'da incelendiğinden emin olun.",
      "tips": [
        "Mesajları özelleştirmek için 'queue_outreach_email' içinde 'promptOverride' kullanın.",
        "Bir ortağın talebi hakkında emin olmadığınızda her zaman bir insana yönlendirin.",
        "Doğru kayıtları sürdürmek için potansiyel müşteri bilgilerini düzenli olarak güncelleyin."
      ]
    }
  },
  "listing-manager": {
    "en": {
      "title": "Listing Manager",
      "tagline": "Efficiently manage real estate listings and inquiries.",
      "whatItDoes": [
        "The Listing Manager role drafts structured property listings using explicit attributes, ensuring compliance with Fair Housing regulations. It creates engaging titles, headlines, and feature bullets, while keeping price details on request.",
        "It classifies property inquiries by intent and urgency, extracting relevant details for scheduling viewings. The role can escalate complex issues to human teammates and handle GDPR data requests efficiently."
      ],
      "integrationsRequired": [
        "Web",
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Listing Manager'.",
        "Connect your Web and Email channels for seamless operation.",
        "Use 'draft_property_listing' to create new listings.",
        "Activate 'score_inquiry_intent' to manage inquiries."
      ],
      "exampleTasks": [
        "Draft a new property listing with virtual tour details.",
        "Classify an inquiry and extract viewing slots.",
        "Escalate a complex customer request to a human teammate.",
        "Record a GDPR data request for data access.",
        "Book a discovery call after qualifying a lead."
      ],
      "approvalNote": "Ensure all listings comply with Fair Housing standards before publishing.",
      "tips": [
        "Always use 'draft_property_listing' for accurate listing creation.",
        "Escalate to human when inquiries exceed your authority.",
        "Regularly check the Approval Center for listing compliance feedback."
      ]
    },
    "tr": {
      "title": "Liste Yöneticisi",
      "tagline": "Gayrimenkul ilanlarını ve taleplerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Liste Yöneticisi rolü, Fair Housing düzenlemelerine uygunluğu sağlamak için açık nitelikler kullanarak yapılandırılmış mülk ilanları hazırlar. İlgi çekici başlıklar, manşetler ve özellik maddeleri oluşturur, fiyat detaylarını talep üzerine tutar.",
        "Mülk taleplerini niyet ve aciliyetine göre sınıflandırır, görüntüleme planlaması için ilgili detayları çıkarır. Rol, karmaşık sorunları insan ekip arkadaşlarına yönlendirebilir ve GDPR veri taleplerini verimli bir şekilde ele alabilir."
      ],
      "integrationsRequired": [
        "Web",
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Liste Yöneticisi'ni seçin.",
        "Sorunsuz bir operasyon için Web ve E-posta kanallarınızı bağlayın.",
        "Yeni ilanlar oluşturmak için 'draft_property_listing'i kullanın.",
        "Talepleri yönetmek için 'score_inquiry_intent'i etkinleştirin."
      ],
      "exampleTasks": [
        "Sanal tur detaylarıyla yeni bir mülk ilanı hazırlayın.",
        "Bir talebi sınıflandırın ve görüntüleme zaman dilimlerini çıkarın.",
        "Karmaşık bir müşteri talebini insan bir ekip arkadaşına yönlendirin.",
        "Veri erişimi için bir GDPR veri talebini kaydedin.",
        "Bir potansiyel müşteriyi nitelendirdikten sonra keşif görüşmesi ayarlayın."
      ],
      "approvalNote": "Tüm ilanların yayınlanmadan önce Fair Housing standartlarına uygun olduğundan emin olun.",
      "tips": [
        "Doğru ilan oluşturma için her zaman 'draft_property_listing'i kullanın.",
        "Yetkinizi aşan talepleri insana yönlendirin.",
        "Liste uyumluluğu geri bildirimi için düzenli olarak Approval Center'ı kontrol edin."
      ]
    }
  },
  "purchasing-agent": {
    "en": {
      "title": "Purchasing Agent",
      "tagline": "Efficient supplier management and purchase order processing.",
      "whatItDoes": [
        "The Purchasing Agent role sources suppliers, requests quotes, and manages purchase orders through email. It ensures compliance with procurement policies by enforcing the three-quote rule and filtering out unapproved suppliers.",
        "This role leverages tools to draft quote-request emails, compare supplier quotes using a weighted scoring system, and escalate issues to human teammates when necessary. It streamlines procurement processes while maintaining supplier relationships."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Operations category and select Purchasing Agent.",
        "Integrate your email account for communication.",
        "Set up supplier criteria in the Brand Bible.",
        "Activate the role to start managing purchase orders."
      ],
      "exampleTasks": [
        "Draft and send quote requests to suppliers via email.",
        "Compare and score supplier quotes to recommend the best option.",
        "Escalate complex procurement issues to a human teammate."
      ],
      "approvalNote": "Ensure all supplier interactions comply with company procurement policies before activating the role.",
      "tips": [
        "Regularly update the approvedSuppliers list in the Brand Bible to avoid unnecessary drops.",
        "Use the compare_quotes tool to objectively assess supplier options.",
        "Escalate to human when facing complex or sensitive procurement issues."
      ]
    },
    "tr": {
      "title": "Satın Alma Temsilcisi",
      "tagline": "Etkili tedarikçi yönetimi ve satın alma siparişi işleme.",
      "whatItDoes": [
        "Satın Alma Temsilcisi rolü, tedarikçileri bulur, teklif talep eder ve satın alma siparişlerini e-posta yoluyla yönetir. Üç teklif kuralını uygulayarak ve onaylanmamış tedarikçileri filtreleyerek satın alma politikalarına uyumu sağlar.",
        "Bu rol, teklif talep e-postalarını taslak haline getirmek, ağırlıklı puanlama sistemi kullanarak tedarikçi tekliflerini karşılaştırmak ve gerektiğinde insan takım arkadaşlarına sorunları iletmek için araçlardan yararlanır. Tedarik süreçlerini kolaylaştırırken tedarikçi ilişkilerini sürdürür."
      ],
      "integrationsRequired": [
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Operasyonlar kategorisine gidin ve Satın Alma Temsilcisi'ni seçin.",
        "İletişim için e-posta hesabınızı entegre edin.",
        "Brand Bible'da tedarikçi kriterlerini ayarlayın.",
        "Satın alma siparişlerini yönetmeye başlamak için rolü etkinleştirin."
      ],
      "exampleTasks": [
        "Tedarikçilere e-posta yoluyla teklif talepleri hazırlayın ve gönderin.",
        "Tedarikçi tekliflerini karşılaştırın ve en iyi seçeneği önermek için puanlayın.",
        "Karmaşık satın alma sorunlarını insan takım arkadaşına iletin."
      ],
      "approvalNote": "Rolü etkinleştirmeden önce tüm tedarikçi etkileşimlerinin şirket satın alma politikalarına uygun olduğundan emin olun.",
      "tips": [
        "Gereksiz düşüşleri önlemek için Brand Bible'daki onaylıTedarikçiler listesini düzenli olarak güncelleyin.",
        "Tedarikçi seçeneklerini objektif olarak değerlendirmek için compare_quotes aracını kullanın.",
        "Karmaşık veya hassas satın alma sorunlarıyla karşılaştığınızda insanlara iletin."
      ]
    }
  },
  "logistics-coordinator": {
    "en": {
      "title": "Logistics Coordinator",
      "tagline": "Efficiently manage shipments and customer communications.",
      "whatItDoes": [
        "The Logistics Coordinator role on Staffbix handles shipment tracking, customer updates, and resolves carrier issues. It utilizes specific tools to ensure efficient logistics operations and customer satisfaction.",
        "Using the triage_shipment_status tool, it assesses shipment statuses and decides on actions based on urgency and value. The draft_shipping_update_email tool crafts precise customer emails without guessing ETAs or tracking details.",
        "For complex issues, the escalate_to_human tool transfers cases to human teammates, ensuring sensitive matters are handled appropriately. GDPR data requests are recorded using the gdpr_data_request tool, complying with legal requirements."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Operations section.",
        "Select the Logistics Coordinator role.",
        "Integrate Email and Web channels.",
        "Activate the role to start managing logistics tasks."
      ],
      "exampleTasks": [
        "Assess a delayed shipment using triage_shipment_status and decide on next steps.",
        "Draft a shipping update email for a customer with the draft_shipping_update_email tool.",
        "Escalate a complex refund request to a human using escalate_to_human.",
        "Record a customer's GDPR data deletion request with gdpr_data_request.",
        "Handle a carrier issue by determining urgency and recommending action."
      ],
      "approvalNote": "Ensure all escalations and GDPR requests are reviewed in the Approval Center.",
      "tips": [
        "Always use triage_shipment_status for accurate shipment assessments.",
        "Use escalate_to_human for any situation beyond your tool's capabilities.",
        "Regularly check the Approval Center for updates on escalated cases."
      ]
    },
    "tr": {
      "title": "Lojistik Koordinatörü",
      "tagline": "Sevkiyatları ve müşteri iletişimlerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Staffbix üzerindeki Lojistik Koordinatörü rolü, sevkiyat takibi, müşteri güncellemeleri ve taşıyıcı sorunlarının çözümünü yönetir. Verimli lojistik operasyonları ve müşteri memnuniyetini sağlamak için belirli araçlar kullanır.",
        "triage_shipment_status aracı ile sevkiyat durumlarını değerlendirir ve aciliyet ve değere göre eylemlere karar verir. draft_shipping_update_email aracı, ETA veya takip detayları tahmin etmeden kesin müşteri e-postaları hazırlar.",
        "Karmaşık sorunlar için, escalate_to_human aracı vakaları insan ekip arkadaşlarına aktarır, böylece hassas konular uygun şekilde ele alınır. GDPR veri talepleri, yasal gerekliliklere uygun olarak gdpr_data_request aracı kullanılarak kaydedilir."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Operasyonlar bölümüne gidin.",
        "Lojistik Koordinatörü rolünü seçin.",
        "Email ve Web kanallarını entegre edin.",
        "Lojistik görevlerini yönetmeye başlamak için rolü etkinleştirin."
      ],
      "exampleTasks": [
        "triage_shipment_status kullanarak gecikmiş bir sevkiyatı değerlendirin ve sonraki adımlara karar verin.",
        "draft_shipping_update_email aracı ile bir müşteri için sevkiyat güncelleme e-postası hazırlayın.",
        "Karmaşık bir iade talebini escalate_to_human kullanarak bir insana yönlendirin.",
        "Bir müşterinin GDPR veri silme talebini gdpr_data_request ile kaydedin.",
        "Taşıyıcı sorununu aciliyet belirleyerek ve eylem önererek ele alın."
      ],
      "approvalNote": "Tüm yönlendirmelerin ve GDPR taleplerinin Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "Doğru sevkiyat değerlendirmeleri için her zaman triage_shipment_status kullanın.",
        "Aracınızın yeteneklerini aşan durumlar için escalate_to_human kullanın.",
        "Yönlendirilen vakalarla ilgili güncellemeler için Approval Center'ı düzenli olarak kontrol edin."
      ]
    }
  },
  "inventory-manager": {
    "en": {
      "title": "Inventory Manager",
      "tagline": "Efficiently manage stock levels and demand forecasts.",
      "whatItDoes": [
        "The Inventory Manager role on Staffbix ensures optimal stock levels by utilizing tools to evaluate reorder needs and forecast demand. It calculates reorder quantities based on lead times and safety stock requirements.",
        "This role flags potential deadstock and alerts for replenishment, ensuring inventory aligns with demand trends. It uses arithmetic calculations to predict future stock needs and prevent overstocking."
      ],
      "integrationsRequired": [
        "Internal"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Inventory Manager role.",
        "Connect your internal inventory database to Staffbix.",
        "Set reorder thresholds and safety stock levels for each SKU.",
        "Enable demand forecasting with seasonality settings if needed.",
        "Monitor alerts and adjust stock levels as recommended."
      ],
      "exampleTasks": [
        "Evaluate if SKU123 needs reordering and determine the quantity.",
        "Forecast demand for the next 4 weeks for SKU456.",
        "Flag SKU789 as potential deadstock due to low demand."
      ],
      "approvalNote": "Ensure all inventory adjustments are approved through the Approval Center.",
      "tips": [
        "Regularly update lead times and reorder thresholds for accuracy.",
        "Use demand forecasts to plan promotional campaigns effectively."
      ]
    },
    "tr": {
      "title": "Envanter Yöneticisi",
      "tagline": "Stok seviyelerini ve talep tahminlerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Staffbix üzerindeki Envanter Yöneticisi rolü, yeniden sipariş ihtiyaçlarını değerlendirmek ve talebi tahmin etmek için araçlar kullanarak optimal stok seviyelerini sağlar. Yeniden sipariş miktarlarını, teslim süreleri ve güvenlik stoğu gereksinimlerine göre hesaplar.",
        "Bu rol, potansiyel ölü stokları işaretler ve yenileme için uyarılar gönderir, envanterin talep trendleriyle uyumlu olmasını sağlar. Gelecekteki stok ihtiyaçlarını tahmin etmek ve aşırı stoklamayı önlemek için aritmetik hesaplamalar kullanır."
      ],
      "integrationsRequired": [
        "Dahili"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Envanter Yöneticisi rolüne gidin.",
        "Dahili envanter veritabanınızı Staffbix'e bağlayın.",
        "Her SKU için yeniden sipariş eşiklerini ve güvenlik stoğu seviyelerini ayarlayın.",
        "Gerekirse mevsimsellik ayarları ile talep tahminini etkinleştirin.",
        "Uyarıları izleyin ve önerilen şekilde stok seviyelerini ayarlayın."
      ],
      "exampleTasks": [
        "SKU123'ün yeniden siparişe ihtiyaç duyup duymadığını değerlendirin ve miktarı belirleyin.",
        "SKU456 için önümüzdeki 4 haftalık talebi tahmin edin.",
        "Düşük talep nedeniyle SKU789'u potansiyel ölü stok olarak işaretleyin."
      ],
      "approvalNote": "Tüm envanter ayarlamalarının Approval Center üzerinden onaylandığından emin olun.",
      "tips": [
        "Doğruluk için teslim sürelerini ve yeniden sipariş eşiklerini düzenli olarak güncelleyin.",
        "Promosyon kampanyalarını etkili bir şekilde planlamak için talep tahminlerini kullanın."
      ]
    }
  },
  "vendor-manager": {
    "en": {
      "title": "Vendor Manager",
      "tagline": "Optimize vendor relationships and ensure compliance.",
      "whatItDoes": [
        "The Vendor Manager role on Staffbix handles contract terms, performance reviews, renegotiations, and issue escalation. It uses tools to score vendor performance, draft renegotiation briefs, and escalate issues to human teammates when necessary.",
        "Vendor performance is scored based on delivery, defect rates, billing accuracy, and response time. Renegotiation briefs are crafted with clear objectives and thresholds. Escalations ensure human intervention when needed."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Vendor Manager role settings.",
        "Connect your Email account for communication.",
        "Set up performance scoring criteria and thresholds.",
        "Activate the role to start managing vendor tasks."
      ],
      "exampleTasks": [
        "Score a vendor's performance based on recent delivery metrics.",
        "Draft a renegotiation brief with specific asks and thresholds.",
        "Escalate a complex vendor issue to a human teammate for resolution."
      ],
      "approvalNote": "Ensure all vendor-related actions comply with company policies and legal requirements.",
      "tips": [
        "Regularly review vendor performance scores to identify areas for improvement.",
        "Use the renegotiation brief tool to prepare thoroughly before discussions.",
        "Escalate issues promptly to avoid delays in vendor management."
      ]
    },
    "tr": {
      "title": "Tedarikçi Yöneticisi",
      "tagline": "Tedarikçi ilişkilerini optimize edin ve uyumluluğu sağlayın.",
      "whatItDoes": [
        "Staffbix üzerindeki Tedarikçi Yöneticisi rolü, sözleşme şartlarını, performans incelemelerini, yeniden müzakereleri ve sorun yükseltmelerini yönetir. Tedarikçi performansını puanlamak, yeniden müzakere özetleri hazırlamak ve gerektiğinde insan ekip arkadaşlarına sorunları iletmek için araçlar kullanır.",
        "Tedarikçi performansı, teslimat, kusur oranları, faturalama doğruluğu ve yanıt süresine göre puanlanır. Yeniden müzakere özetleri, net hedefler ve eşikler ile hazırlanır. Yükseltmeler, gerektiğinde insan müdahalesini sağlar."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Tedarikçi Yöneticisi rol ayarlarına gidin.",
        "İletişim için Email hesabınızı bağlayın.",
        "Performans puanlama kriterlerini ve eşiklerini ayarlayın.",
        "Tedarikçi görevlerini yönetmeye başlamak için rolü etkinleştirin."
      ],
      "exampleTasks": [
        "Son teslimat metriklerine göre bir tedarikçinin performansını puanlayın.",
        "Belirli talepler ve eşiklerle bir yeniden müzakere özeti hazırlayın.",
        "Çözüm için karmaşık bir tedarikçi sorununu insan ekip arkadaşına iletin."
      ],
      "approvalNote": "Tedarikçi ile ilgili tüm işlemlerin şirket politikalarına ve yasal gerekliliklere uygun olduğundan emin olun.",
      "tips": [
        "Geliştirme alanlarını belirlemek için düzenli olarak tedarikçi performans puanlarını gözden geçirin.",
        "Görüşmelerden önce kapsamlı bir şekilde hazırlık yapmak için yeniden müzakere özeti aracını kullanın.",
        "Tedarikçi yönetiminde gecikmeleri önlemek için sorunları zamanında iletin."
      ]
    }
  },
  "quality-assurance": {
    "en": {
      "title": "Quality Assurance",
      "tagline": "Ensure flawless releases with structured testing and bug management.",
      "whatItDoes": [
        "The Quality Assurance role on Staffbix involves managing test plans, conducting regression checks, and triaging bug reports. It uses the triage_bug_report tool to classify bugs by severity and likelihood of duplication, ensuring efficient prioritization.",
        "This role evaluates release readiness with the evaluate_release_readiness tool, deciding whether to ship or block based on test results and critical bug counts. It provides a summary and reasons for any blocking decisions.",
        "When issues exceed automated capabilities, the escalate_to_human tool is used to involve human teammates, ensuring that complex or sensitive issues are handled appropriately."
      ],
      "integrationsRequired": [
        "Internal"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Quality Assurance role.",
        "Use the triage_bug_report tool to classify incoming bug reports.",
        "Run the evaluate_release_readiness tool to assess the current release.",
        "If necessary, use escalate_to_human for issues beyond automation.",
        "Document all actions and decisions in the Brand Bible for consistency."
      ],
      "exampleTasks": [
        "Classify a new bug report as P1 with high reproduction confidence.",
        "Block a release due to unresolved P0 bugs and provide a summary.",
        "Escalate a GDPR data request to a human for legal compliance."
      ],
      "approvalNote": "Ensure all actions align with the Brand Bible and are documented in the Approval Center.",
      "tips": [
        "Regularly review the Brand Bible to stay updated on company standards.",
        "Use escalate_to_human for any situation that feels uncertain or risky.",
        "Always document your decisions and reasoning in the Approval Center."
      ]
    },
    "tr": {
      "title": "Kalite Güvencesi",
      "tagline": "Yapılandırılmış test ve hata yönetimi ile kusursuz sürümler sağlayın.",
      "whatItDoes": [
        "Staffbix'teki Kalite Güvencesi rolü, test planlarını yönetmeyi, regresyon kontrolleri yapmayı ve hata raporlarını önceliklendirmeyi içerir. triage_bug_report aracı, hataları ciddiyet ve tekrar olasılığına göre sınıflandırarak verimli önceliklendirme sağlar.",
        "Bu rol, evaluate_release_readiness aracı ile sürüm hazırlığını değerlendirir, test sonuçları ve kritik hata sayısına göre gönderim veya engelleme kararı verir. Herhangi bir engelleme kararının özetini ve nedenlerini sağlar.",
        "Sorunlar otomasyon yeteneklerini aştığında, karmaşık veya hassas sorunların uygun şekilde ele alınmasını sağlamak için escalate_to_human aracı kullanılarak insan ekip arkadaşları devreye alınır."
      ],
      "integrationsRequired": [
        "Dahili"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Kalite Güvencesi rolüne gidin.",
        "Gelen hata raporlarını sınıflandırmak için triage_bug_report aracını kullanın.",
        "Mevcut sürümü değerlendirmek için evaluate_release_readiness aracını çalıştırın.",
        "Gerekirse, otomasyonun ötesindeki sorunlar için escalate_to_human kullanın.",
        "Tüm eylemleri ve kararları tutarlılık için Brand Bible'a belgeleyin."
      ],
      "exampleTasks": [
        "Yüksek tekrar güveni ile yeni bir hata raporunu P1 olarak sınıflandırın.",
        "Çözülmemiş P0 hataları nedeniyle bir sürümü engelleyin ve bir özet sağlayın.",
        "Yasal uyumluluk için bir GDPR veri talebini bir insana yönlendirin."
      ],
      "approvalNote": "Tüm eylemlerin Brand Bible ile uyumlu olduğundan emin olun ve Approval Center'da belgelenmesini sağlayın.",
      "tips": [
        "Şirket standartları hakkında güncel kalmak için Brand Bible'ı düzenli olarak gözden geçirin.",
        "Belirsiz veya riskli görünen herhangi bir durum için escalate_to_human kullanın.",
        "Kararlarınızı ve gerekçelerinizi her zaman Approval Center'da belgeleyin."
      ]
    }
  },
  "project-coordinator": {
    "en": {
      "title": "Project Coordinator",
      "tagline": "Streamline project workflows and ensure timely delivery.",
      "whatItDoes": [
        "The Project Coordinator role manages project timelines, identifies blockers, and compiles status updates. Using tools like detect_project_blockers, it ensures tasks are on track and escalates issues when necessary.",
        "With compile_status_update, it provides daily project updates, ensuring stakeholders are informed. For complex issues, escalate_to_human is used to involve human teammates, maintaining project momentum."
      ],
      "integrationsRequired": [
        "Email",
        "Slack"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Project Coordinator role.",
        "Connect your Email and Slack accounts for communication.",
        "Set up detect_project_blockers to run hourly within your working hours.",
        "Configure compile_status_update to generate daily updates.",
        "Monitor escalations and use escalate_to_human when needed."
      ],
      "exampleTasks": [
        "Identify and escalate blocked tasks to relevant team members.",
        "Compile and send daily project status updates via Slack.",
        "Escalate complex customer requests to human teammates.",
        "Record GDPR data requests for legal compliance.",
        "Coordinate project timelines across teams using Email."
      ],
      "approvalNote": "Ensure all escalations and GDPR requests are reviewed in the Approval Center before finalizing.",
      "tips": [
        "Regularly check for blocked tasks using detect_project_blockers.",
        "Use compile_status_update to keep stakeholders informed daily.",
        "Escalate promptly to avoid project delays."
      ]
    },
    "tr": {
      "title": "Proje Koordinatörü",
      "tagline": "Proje iş akışlarını kolaylaştırın ve zamanında teslimatı sağlayın.",
      "whatItDoes": [
        "Proje Koordinatörü rolü, proje zaman çizelgelerini yönetir, engelleyicileri belirler ve durum güncellemelerini derler. detect_project_blockers gibi araçları kullanarak görevlerin yolunda gitmesini sağlar ve gerektiğinde sorunları yükseltir.",
        "compile_status_update ile günlük proje güncellemeleri sağlar, paydaşların bilgilendirilmesini garanti eder. Karmaşık sorunlar için, insan ekip arkadaşlarını dahil etmek amacıyla escalate_to_human kullanılır, proje ivmesini korur."
      ],
      "integrationsRequired": [
        "Email",
        "Slack"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Proje Koordinatörü rolüne gidin.",
        "İletişim için Email ve Slack hesaplarınızı bağlayın.",
        "Çalışma saatleriniz içinde saatlik olarak çalışacak şekilde detect_project_blockers'ı ayarlayın.",
        "Günlük güncellemeler oluşturmak için compile_status_update'ı yapılandırın.",
        "Yükseltmeleri izleyin ve gerektiğinde escalate_to_human kullanın."
      ],
      "exampleTasks": [
        "Engellenen görevleri belirleyin ve ilgili ekip üyelerine yükseltin.",
        "Günlük proje durum güncellemelerini Slack üzerinden derleyip gönderin.",
        "Karmaşık müşteri taleplerini insan ekip arkadaşlarına yükseltin.",
        "Yasal uyumluluk için GDPR veri taleplerini kaydedin.",
        "Email kullanarak ekipler arasında proje zaman çizelgelerini koordine edin."
      ],
      "approvalNote": "Tüm yükseltmelerin ve GDPR taleplerinin onaylanmadan önce Approval Center'da gözden geçirildiğinden emin olun.",
      "tips": [
        "detect_project_blockers kullanarak engellenen görevleri düzenli olarak kontrol edin.",
        "Paydaşları günlük olarak bilgilendirmek için compile_status_update kullanın.",
        "Proje gecikmelerini önlemek için hızlıca yükseltin."
      ]
    }
  },
  "data-analyst": {
    "en": {
      "title": "Data Analyst",
      "tagline": "Transform data into actionable insights.",
      "whatItDoes": [
        "The Data Analyst role on Staffbix specializes in generating custom reports and conducting ad-hoc queries to provide insights into business operations. It uses tools to analyze lead data, compute business metrics, and summarize financials.",
        "This role is crucial for designing dashboards and investigating anomalies, ensuring that decision-makers have accurate, data-driven insights. It leverages specific tools to ensure data accuracy and compliance with regulations."
      ],
      "integrationsRequired": [
        "Internal"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Operations category.",
        "Select the Data Analyst role from the available options.",
        "Use the 'query_leads_breakdown' tool to analyze lead data by status, source, or tag.",
        "Employ the 'compute_metric' tool to calculate business metrics over a specified time window.",
        "Utilize the 'monthly_summary' tool to aggregate financial data at the end of each month."
      ],
      "exampleTasks": [
        "Generate a report on lead sources for the past quarter.",
        "Calculate the conversion rate metric for the current month.",
        "Prepare a monthly financial summary for the finance team.",
        "Investigate a sudden drop in lead conversion rates.",
        "Escalate complex data requests to a human analyst."
      ],
      "approvalNote": "Ensure all data analyses comply with internal guidelines and are reviewed in the Approval Center before dissemination.",
      "tips": [
        "Always use 'compute_metric' before quoting any numbers to ensure accuracy.",
        "For GDPR-related requests, use 'gdpr_data_request' to ensure compliance.",
        "Escalate to a human when data requests exceed your tool's capabilities."
      ]
    },
    "tr": {
      "title": "Veri Analisti",
      "tagline": "Verileri eyleme dönüştürülebilir içgörülere dönüştürün.",
      "whatItDoes": [
        "Staffbix'teki Veri Analisti rolü, iş operasyonlarına dair içgörüler sağlamak için özel raporlar oluşturma ve anlık sorgular yürütme konusunda uzmanlaşmıştır. Potansiyel müşteri verilerini analiz etmek, iş metriklerini hesaplamak ve finansal özetler çıkarmak için araçlar kullanır.",
        "Bu rol, karar vericilerin doğru, veri odaklı içgörülere sahip olmasını sağlamak için panolar tasarlamak ve anormallikleri araştırmak açısından kritik öneme sahiptir. Veri doğruluğunu ve düzenlemelere uyumu sağlamak için belirli araçlardan yararlanır."
      ],
      "integrationsRequired": [
        "Dahili"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Operasyonlar kategorisine gidin.",
        "Mevcut seçeneklerden Veri Analisti rolünü seçin.",
        "Potansiyel müşteri verilerini duruma, kaynağa veya etikete göre analiz etmek için 'query_leads_breakdown' aracını kullanın.",
        "Belirli bir zaman diliminde iş metriklerini hesaplamak için 'compute_metric' aracını kullanın.",
        "Her ay sonunda finansal verileri toplamak için 'monthly_summary' aracını kullanın."
      ],
      "exampleTasks": [
        "Geçtiğimiz çeyrek için potansiyel müşteri kaynakları hakkında bir rapor oluşturun.",
        "Mevcut ay için dönüşüm oranı metriğini hesaplayın.",
        "Finans ekibi için aylık bir finansal özet hazırlayın.",
        "Potansiyel müşteri dönüşüm oranlarındaki ani düşüşü araştırın.",
        "Karmaşık veri taleplerini bir insan analiste yönlendirin."
      ],
      "approvalNote": "Tüm veri analizlerinin dahili yönergelere uygun olduğundan emin olun ve yayılmadan önce Approval Center'da gözden geçirin.",
      "tips": [
        "Herhangi bir sayıyı alıntılamadan önce doğruluğu sağlamak için her zaman 'compute_metric' kullanın.",
        "GDPR ile ilgili talepler için uyumu sağlamak amacıyla 'gdpr_data_request' kullanın.",
        "Veri talepleri aracınızın yeteneklerini aştığında bir insana yönlendirin."
      ]
    }
  },
  "tier2-support": {
    "en": {
      "title": "Tier 2 Support",
      "tagline": "Handle escalations and complex customer issues efficiently.",
      "whatItDoes": [
        "The Tier 2 Support role manages escalations from customer support, focusing on edge cases, refunds, and retention saves. It uses tools to evaluate escalations, process refunds, and document recurring issues.",
        "This role requires precise decision-making and the ability to handle sensitive customer interactions. It ensures that complex issues are resolved effectively, maintaining customer satisfaction and compliance with legal standards."
      ],
      "integrationsRequired": [
        "Stripe",
        "Email"
      ],
      "steps": [
        "Access the Staffbix platform and navigate to the Tier 2 Support role.",
        "Use 'lookup_order' to verify order details before taking any action.",
        "Evaluate the escalation using 'evaluate_escalation' to decide the appropriate response.",
        "If a refund is needed, use 'process_refund' with the Stripe payment_intent id.",
        "For unresolved issues, escalate to a human using 'escalate_to_human'."
      ],
      "exampleTasks": [
        "Evaluate a complex refund request using 'evaluate_escalation' and 'process_refund'.",
        "Document a recurring issue for the product team using 'document_recurring_issue'.",
        "Handle a GDPR data request by recording it with 'gdpr_data_request'."
      ],
      "approvalNote": "All actions, especially refunds and GDPR requests, are subject to approval based on authority levels.",
      "tips": [
        "Always verify order details with 'lookup_order' before promising any resolution.",
        "Use 'escalate_to_human' when unsure or when the customer's request exceeds your authority.",
        "Document recurring issues accurately to help the product team address underlying problems."
      ]
    },
    "tr": {
      "title": "Seviye 2 Destek",
      "tagline": "Yükseltmeleri ve karmaşık müşteri sorunlarını verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Seviye 2 Destek rolü, müşteri destek biriminden gelen yükseltmeleri yönetir, özellikle uç durumlar, iade işlemleri ve müşteri tutma çözümlerine odaklanır. Yükseltmeleri değerlendirmek, iade işlemlerini gerçekleştirmek ve tekrarlayan sorunları belgelemek için araçlar kullanır.",
        "Bu rol, hassas müşteri etkileşimlerini yönetme yeteneği ve kesin karar verme gerektirir. Karmaşık sorunların etkili bir şekilde çözülmesini sağlar, müşteri memnuniyetini ve yasal standartlara uyumu korur."
      ],
      "integrationsRequired": [
        "Stripe",
        "E-posta"
      ],
      "steps": [
        "Staffbix platformuna erişin ve Seviye 2 Destek rolüne gidin.",
        "Herhangi bir işlem yapmadan önce sipariş detaylarını doğrulamak için 'lookup_order' kullanın.",
        "Uygun yanıtı belirlemek için 'evaluate_escalation' kullanarak yükseltmeyi değerlendirin.",
        "İade gerekiyorsa, Stripe payment_intent id ile 'process_refund' kullanın.",
        "Çözülemeyen sorunlar için 'escalate_to_human' kullanarak bir insana yükseltin."
      ],
      "exampleTasks": [
        "'Evaluate_escalation' ve 'process_refund' kullanarak karmaşık bir iade talebini değerlendirin.",
        "Ürün ekibi için tekrarlayan bir sorunu 'document_recurring_issue' kullanarak belgeleyin.",
        "'Gdpr_data_request' ile kaydederek bir GDPR veri talebini yönetin."
      ],
      "approvalNote": "Tüm işlemler, özellikle iade ve GDPR talepleri, yetki seviyelerine göre onaya tabidir.",
      "tips": [
        "Herhangi bir çözüm sözü vermeden önce sipariş detaylarını 'lookup_order' ile mutlaka doğrulayın.",
        "Emin olmadığınızda veya müşterinin talebi yetkinizi aştığında 'escalate_to_human' kullanın.",
        "Ürün ekibinin temel sorunları ele almasına yardımcı olmak için tekrarlayan sorunları doğru bir şekilde belgeleyin."
      ]
    }
  },
  "customer-success": {
    "en": {
      "title": "Customer Success",
      "tagline": "Enhance customer satisfaction and retention.",
      "whatItDoes": [
        "The Customer Success role focuses on maintaining and improving customer satisfaction by managing health scores, conducting quarterly business reviews (QBRs), and executing expansion strategies. It proactively prevents churn by addressing customer concerns and ensuring a seamless experience.",
        "Utilize tools like 'lookup_order' to verify order details before making commitments, ensuring accurate information is provided to customers. For complex issues or escalations, use 'escalate_to_human' to involve a human teammate, maintaining customer trust and satisfaction.",
        "Handle GDPR-related requests with 'gdpr_data_request' to ensure compliance and protect customer data rights. This tool records requests for data access, correction, or deletion, pausing the conversation for human review."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log in to the Staffbix platform.",
        "Navigate to the Customer Success role dashboard.",
        "Integrate your Email and Web channels for seamless communication.",
        "Familiarize yourself with the 'lookup_order', 'escalate_to_human', and 'gdpr_data_request' tools.",
        "Begin managing customer interactions, ensuring all requests are handled efficiently."
      ],
      "exampleTasks": [
        "Verify a customer's order status using 'lookup_order' before confirming delivery times.",
        "Escalate a complex refund request to a human teammate using 'escalate_to_human'.",
        "Record a GDPR data deletion request with 'gdpr_data_request'.",
        "Conduct a quarterly business review (QBR) to assess customer satisfaction.",
        "Implement an expansion strategy to increase customer engagement."
      ],
      "approvalNote": "Ensure all GDPR-related requests are reviewed by a human to comply with legal requirements.",
      "tips": [
        "Always verify order details with 'lookup_order' before making promises to customers.",
        "Use 'escalate_to_human' for any situation beyond your authority to maintain customer trust.",
        "Record GDPR requests accurately to ensure compliance and protect customer data."
      ]
    },
    "tr": {
      "title": "Müşteri Başarısı",
      "tagline": "Müşteri memnuniyetini ve bağlılığını artırın.",
      "whatItDoes": [
        "Müşteri Başarısı rolü, sağlık puanlarını yöneterek, üç aylık iş incelemeleri (QBR'ler) yaparak ve genişleme stratejilerini uygulayarak müşteri memnuniyetini sürdürmeye ve iyileştirmeye odaklanır. Müşteri endişelerini ele alarak ve sorunsuz bir deneyim sağlayarak proaktif olarak müşteri kaybını önler.",
        "Müşterilere doğru bilgi sağlamak için taahhütlerde bulunmadan önce sipariş ayrıntılarını doğrulamak amacıyla 'lookup_order' gibi araçları kullanın. Karmaşık sorunlar veya yükseltmeler için, müşteri güvenini ve memnuniyetini sürdürmek adına bir insan takım arkadaşını dahil etmek için 'escalate_to_human' kullanın.",
        "GDPR ile ilgili talepleri 'gdpr_data_request' ile ele alarak uyumluluğu sağlayın ve müşteri veri haklarını koruyun. Bu araç, veri erişimi, düzeltme veya silme taleplerini kaydeder ve insan incelemesi için konuşmayı duraklatır."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web"
      ],
      "steps": [
        "Staffbix platformuna giriş yapın.",
        "Müşteri Başarısı rolü kontrol paneline gidin.",
        "Sorunsuz iletişim için E-posta ve Web kanallarınızı entegre edin.",
        "'lookup_order', 'escalate_to_human' ve 'gdpr_data_request' araçlarına aşina olun.",
        "Tüm taleplerin verimli bir şekilde ele alındığından emin olarak müşteri etkileşimlerini yönetmeye başlayın."
      ],
      "exampleTasks": [
        "Teslimat sürelerini onaylamadan önce 'lookup_order' kullanarak bir müşterinin sipariş durumunu doğrulayın.",
        "Karmaşık bir iade talebini bir insan takım arkadaşına 'escalate_to_human' kullanarak yükseltin.",
        "'gdpr_data_request' ile bir GDPR veri silme talebini kaydedin.",
        "Müşteri memnuniyetini değerlendirmek için üç aylık bir iş incelemesi (QBR) yapın.",
        "Müşteri etkileşimini artırmak için bir genişleme stratejisi uygulayın."
      ],
      "approvalNote": "Tüm GDPR ile ilgili taleplerin yasal gerekliliklere uyum sağlamak için bir insan tarafından incelendiğinden emin olun.",
      "tips": [
        "Müşterilere söz vermeden önce sipariş ayrıntılarını 'lookup_order' ile her zaman doğrulayın.",
        "Yetkinizin ötesindeki herhangi bir durum için müşteri güvenini sürdürmek adına 'escalate_to_human' kullanın.",
        "Uyumluluğu sağlamak ve müşteri verilerini korumak için GDPR taleplerini doğru bir şekilde kaydedin."
      ]
    }
  },
  "live-chat": {
    "en": {
      "title": "Live Chat Specialist",
      "tagline": "Engage, qualify, and book demos through web chat.",
      "whatItDoes": [
        "The Live Chat Specialist engages visitors on landing pages using context-aware greetings. It captures visitor intent and qualifies leads based on budget, timeline, and decision-making authority.",
        "Once a lead is qualified, it can book a discovery call directly with the prospect. If a conversation requires human intervention, it escalates to a human teammate."
      ],
      "integrationsRequired": [
        "Stripe",
        "LinkedIn",
        "WhatsApp"
      ],
      "steps": [
        "Activate the Live Chat Specialist in Staffbix.",
        "Integrate Stripe, LinkedIn, and WhatsApp for seamless operations.",
        "Use 'compose_greeting' to initiate conversations.",
        "Run 'qualify_lead' on the first message to assess potential.",
        "If qualified, use 'book_meeting' to schedule a call."
      ],
      "exampleTasks": [
        "Compose a greeting for a visitor on the pricing page.",
        "Qualify a lead based on their budget and decision timeline.",
        "Book a demo call with a prospect interested in your product.",
        "Escalate a chat to a human when a custom discount is requested.",
        "Record a GDPR data request for data erasure."
      ],
      "approvalNote": "Ensure all integrations are active and tested before deploying the Live Chat Specialist.",
      "tips": [
        "Always use 'qualify_lead' before pitching to ensure effective engagement.",
        "Escalate to a human when unsure or when handling sensitive requests.",
        "Use 'compose_greeting' to personalize interactions based on the page context."
      ]
    },
    "tr": {
      "title": "Canlı Sohbet Uzmanı",
      "tagline": "Web sohbeti aracılığıyla etkileşim kurun, nitelendirin ve demoları ayırtın.",
      "whatItDoes": [
        "Canlı Sohbet Uzmanı, bağlam farkındalığına sahip selamlamalar kullanarak açılış sayfalarındaki ziyaretçilerle etkileşim kurar. Ziyaretçi niyetini yakalar ve bütçe, zaman çizelgesi ve karar verme yetkisine göre potansiyel müşterileri nitelendirir.",
        "Bir potansiyel müşteri nitelendirildiğinde, doğrudan potansiyel müşteriyle bir keşif görüşmesi ayırtabilir. Bir konuşma insan müdahalesi gerektiriyorsa, bir insan takım arkadaşına yönlendirilir."
      ],
      "integrationsRequired": [
        "Stripe",
        "LinkedIn",
        "WhatsApp"
      ],
      "steps": [
        "Staffbix'te Canlı Sohbet Uzmanını etkinleştirin.",
        "Sorunsuz operasyonlar için Stripe, LinkedIn ve WhatsApp'ı entegre edin.",
        "Konuşmaları başlatmak için 'compose_greeting' kullanın.",
        "Potansiyeli değerlendirmek için ilk mesajda 'qualify_lead' çalıştırın.",
        "Nitelikli ise, bir görüşme ayarlamak için 'book_meeting' kullanın."
      ],
      "exampleTasks": [
        "Fiyatlandırma sayfasındaki bir ziyaretçi için bir selamlama oluşturun.",
        "Bütçeleri ve karar verme zaman çizelgelerine göre bir potansiyel müşteriyi nitelendirin.",
        "Ürününüzle ilgilenen bir potansiyel müşteriyle bir demo görüşmesi ayırtın.",
        "Özel bir indirim talep edildiğinde sohbeti bir insana yönlendirin.",
        "Veri silme için bir GDPR veri talebini kaydedin."
      ],
      "approvalNote": "Canlı Sohbet Uzmanını devreye almadan önce tüm entegrasyonların aktif ve test edilmiş olduğundan emin olun.",
      "tips": [
        "Etkili etkileşim sağlamak için teklif vermeden önce her zaman 'qualify_lead' kullanın.",
        "Emin olmadığınızda veya hassas taleplerle ilgilenirken bir insana yönlendirin.",
        "Sayfa bağlamına göre etkileşimleri kişiselleştirmek için 'compose_greeting' kullanın."
      ]
    }
  },
  "feedback-analyst": {
    "en": {
      "title": "Feedback Analyst",
      "tagline": "Transform customer feedback into actionable insights.",
      "whatItDoes": [
        "The Feedback Analyst role clusters customer feedback into themes, providing sentiment breakdowns and sample quotes. It identifies the responsible team for each theme, ensuring targeted improvements.",
        "A weekly feedback digest is compiled, summarizing themes and suggesting actions. This digest helps teams prioritize customer-centric initiatives efficiently."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Connect your Staffbix account to WhatsApp, Instagram, and LinkedIn.",
        "Use the 'cluster_feedback_themes' tool to organize feedback into themes.",
        "Run 'compile_feedback_digest' to generate a weekly summary.",
        "Review the digest for recommended actions and team assignments.",
        "Escalate complex issues to human teammates using 'escalate_to_human'."
      ],
      "exampleTasks": [
        "Cluster customer reviews from Instagram into themes with sentiment analysis.",
        "Compile a weekly feedback digest summarizing LinkedIn survey results.",
        "Escalate a GDPR data request from WhatsApp to a human team member."
      ],
      "approvalNote": "Ensure all feedback digests are reviewed in the Approval Center before distribution.",
      "tips": [
        "Regularly check the Approval Center for feedback digest reviews.",
        "Use verbatim quotes to provide context in feedback themes.",
        "Escalate issues promptly to maintain customer trust and compliance."
      ]
    },
    "tr": {
      "title": "Geri Bildirim Analisti",
      "tagline": "Müşteri geri bildirimlerini eyleme dönüştürülebilir içgörülere dönüştürün.",
      "whatItDoes": [
        "Geri Bildirim Analisti rolü, müşteri geri bildirimlerini temalara ayırır, duygu analizleri ve örnek alıntılar sağlar. Her tema için sorumlu ekibi belirleyerek hedefe yönelik iyileştirmeler sağlar.",
        "Haftalık bir geri bildirim özeti derlenir, temaları özetler ve eylemler önerir. Bu özet, ekiplerin müşteri odaklı girişimleri verimli bir şekilde önceliklendirmesine yardımcı olur."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Instagram",
        "LinkedIn"
      ],
      "steps": [
        "Staffbix hesabınızı WhatsApp, Instagram ve LinkedIn'e bağlayın.",
        "Geri bildirimleri temalara organize etmek için 'cluster_feedback_themes' aracını kullanın.",
        "Haftalık bir özet oluşturmak için 'compile_feedback_digest' çalıştırın.",
        "Önerilen eylemler ve ekip atamaları için özeti inceleyin.",
        "Karmaşık sorunları 'escalate_to_human' kullanarak insan ekip arkadaşlarına iletin."
      ],
      "exampleTasks": [
        "Instagram'dan gelen müşteri yorumlarını duygu analizi ile temalara ayırın.",
        "LinkedIn anket sonuçlarını özetleyen haftalık bir geri bildirim özeti derleyin.",
        "WhatsApp'tan gelen bir GDPR veri talebini insan bir ekip üyesine iletin."
      ],
      "approvalNote": "Tüm geri bildirim özetlerinin dağıtımdan önce Approval Center'da incelendiğinden emin olun.",
      "tips": [
        "Geri bildirim özeti incelemeleri için Approval Center'ı düzenli olarak kontrol edin.",
        "Geri bildirim temalarında bağlam sağlamak için birebir alıntılar kullanın.",
        "Müşteri güvenini ve uyumluluğunu sürdürmek için sorunları derhal iletin."
      ]
    }
  },
  "kb-editor": {
    "en": {
      "title": "Knowledge Base Editor",
      "tagline": "Keep your documentation accurate and up-to-date.",
      "whatItDoes": [
        "The Knowledge Base Editor writes and updates help articles based on customer support tickets. It ensures that the documentation remains current as the product evolves.",
        "Using the search_brand_bible tool, it identifies existing content to avoid duplication and confusion. When updates are necessary, it proposes changes through the propose_kb_update tool for approval."
      ],
      "integrationsRequired": [
        "CMS"
      ],
      "steps": [
        "Access the Staffbix platform and navigate to the Knowledge Base Editor role.",
        "Use the search_brand_bible tool to find existing content related to the ticket query.",
        "Draft a proposed update if information is stale or missing.",
        "Submit the proposal using the propose_kb_update tool.",
        "Await approval in the Approval Center before finalizing changes."
      ],
      "exampleTasks": [
        "Update a help article with new product features.",
        "Propose removal of outdated information from the Brand Bible.",
        "Draft a new FAQ based on recurring support tickets.",
        "Ensure consistency in terminology across documentation.",
        "Identify and correct contradictory information in the Brand Bible."
      ],
      "approvalNote": "All proposed updates require approval in the Approval Center before implementation.",
      "tips": [
        "Always search the Brand Bible before proposing updates to avoid redundancy.",
        "Use clear and concise language when drafting help articles.",
        "Escalate to a human if the request involves sensitive data or complex issues."
      ]
    },
    "tr": {
      "title": "Bilgi Tabanı Editörü",
      "tagline": "Dokümantasyonunuzu doğru ve güncel tutun.",
      "whatItDoes": [
        "Bilgi Tabanı Editörü, müşteri destek taleplerine dayanarak yardım makaleleri yazar ve günceller. Ürün geliştikçe dokümantasyonun güncel kalmasını sağlar.",
        "search_brand_bible aracını kullanarak mevcut içeriği belirler ve tekrar ile karışıklığı önler. Güncellemeler gerektiğinde, onay için propose_kb_update aracıyla değişiklik önerir."
      ],
      "integrationsRequired": [
        "CMS"
      ],
      "steps": [
        "Staffbix platformuna erişin ve Bilgi Tabanı Editörü rolüne gidin.",
        "Bilet sorgusuyla ilgili mevcut içeriği bulmak için search_brand_bible aracını kullanın.",
        "Bilgi eski veya eksikse önerilen bir güncelleme taslağı hazırlayın.",
        "Öneriyi propose_kb_update aracıyla gönderin.",
        "Değişiklikleri sonlandırmadan önce Approval Center'da onay bekleyin."
      ],
      "exampleTasks": [
        "Yeni ürün özellikleriyle bir yardım makalesini güncelleyin.",
        "Brand Bible'dan eski bilgilerin kaldırılmasını önerin.",
        "Tekrarlayan destek taleplerine dayalı yeni bir SSS taslağı hazırlayın.",
        "Dokümantasyon genelinde terminoloji tutarlılığını sağlayın.",
        "Brand Bible'daki çelişkili bilgileri belirleyin ve düzeltin."
      ],
      "approvalNote": "Tüm önerilen güncellemeler, uygulanmadan önce Approval Center'da onay gerektirir.",
      "tips": [
        "Gereksizliği önlemek için güncellemeleri önermeden önce her zaman Brand Bible'ı arayın.",
        "Yardım makaleleri taslağı hazırlarken açık ve öz bir dil kullanın.",
        "Talep hassas veriler veya karmaşık konular içeriyorsa bir insana yönlendirin."
      ]
    }
  },
  "concierge": {
    "en": {
      "title": "Concierge",
      "tagline": "Enhance guest experiences with tailored recommendations and bookings.",
      "whatItDoes": [
        "The Concierge role on Staffbix provides hotel and hospitality guest services through web and WhatsApp channels. It offers local recommendations and manages booking requests efficiently.",
        "Using tools like recommend_local_options, it suggests curated local venues, prioritizing operator-partner venues. It evaluates booking requests to decide between auto-booking or escalating to a human concierge for complex cases."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Web"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Concierge role settings.",
        "Connect your WhatsApp and Web channels.",
        "Configure local partner venues in the recommend_local_options tool.",
        "Set booking request parameters in evaluate_booking_request."
      ],
      "exampleTasks": [
        "Recommend top 3 local restaurants to a guest via WhatsApp.",
        "Evaluate and auto-book a city tour for a guest.",
        "Escalate a complex medical booking request to a human concierge.",
        "Record a GDPR data erasure request from a guest.",
        "Provide a guest with a list of nearby partner gyms."
      ],
      "approvalNote": "Ensure all local recommendations are vetted and partner venues are prioritized.",
      "tips": [
        "Always disclose operator-partner venues when recommending.",
        "Use escalate_to_human for requests outside your authority.",
        "Record GDPR requests promptly to comply with legal requirements."
      ]
    },
    "tr": {
      "title": "Concierge",
      "tagline": "Misafir deneyimlerini kişiselleştirilmiş öneriler ve rezervasyonlarla geliştirin.",
      "whatItDoes": [
        "Staffbix üzerindeki Concierge rolü, otel ve konaklama misafir hizmetlerini web ve WhatsApp kanalları aracılığıyla sunar. Yerel öneriler sunar ve rezervasyon taleplerini verimli bir şekilde yönetir.",
        "recommend_local_options gibi araçlar kullanarak, operatör-ortak mekanları önceliklendirerek özenle seçilmiş yerel mekanlar önerir. Rezervasyon taleplerini değerlendirerek otomatik rezervasyon yapma veya karmaşık durumlar için insan concierge'e yönlendirme kararı alır."
      ],
      "integrationsRequired": [
        "WhatsApp",
        "Web"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Concierge rolü ayarlarına gidin.",
        "WhatsApp ve Web kanallarınızı bağlayın.",
        "recommend_local_options aracında yerel ortak mekanları yapılandırın.",
        "evaluate_booking_request içinde rezervasyon talep parametrelerini ayarlayın."
      ],
      "exampleTasks": [
        "Bir misafire WhatsApp üzerinden en iyi 3 yerel restoranı önerin.",
        "Bir misafir için şehir turunu değerlendirin ve otomatik rezervasyon yapın.",
        "Karmaşık bir tıbbi rezervasyon talebini insan concierge'e yönlendirin.",
        "Bir misafirden gelen GDPR veri silme talebini kaydedin.",
        "Bir misafire yakındaki ortak spor salonlarının listesini sağlayın."
      ],
      "approvalNote": "Tüm yerel önerilerin incelendiğinden ve ortak mekanların önceliklendirildiğinden emin olun.",
      "tips": [
        "Öneri yaparken her zaman operatör-ortak mekanları belirtin.",
        "Yetkiniz dışındaki talepler için escalate_to_human kullanın.",
        "Yasal gerekliliklere uymak için GDPR taleplerini derhal kaydedin."
      ]
    }
  },
  "tutor": {
    "en": {
      "title": "Tutor",
      "tagline": "Enhance student learning with guided support and updates.",
      "whatItDoes": [
        "The Tutor role on Staffbix provides student check-ins, homework hints, and updates to parents. It uses tools to generate Socratic hints for students, ensuring they receive guidance without direct answers.",
        "Weekly updates are compiled for parents, summarizing session counts, strengths, and struggles. The role also facilitates escalation to human support when necessary, ensuring complex issues are handled appropriately."
      ],
      "integrationsRequired": [
        "Email",
        "Web"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the 'Roles' section and select 'Tutor'.",
        "Connect your Email and Web channels.",
        "Enable 'generate_socratic_hint' and 'compile_parent_update' tools.",
        "Review and activate the role settings."
      ],
      "exampleTasks": [
        "Generate Socratic hints for a student's math problem.",
        "Compile and send a weekly update email to a student's parents.",
        "Escalate a conversation to a human teammate when a parent requests a large refund."
      ],
      "approvalNote": "Ensure all tasks align with the Brand Bible and Approval Center guidelines.",
      "tips": [
        "Use 'generate_socratic_hint' to guide students without giving away answers.",
        "Regularly update parents with 'compile_parent_update' to maintain transparency.",
        "Escalate complex issues promptly to maintain service quality."
      ]
    },
    "tr": {
      "title": "Eğitmen",
      "tagline": "Öğrenci öğrenimini rehberli destek ve güncellemelerle geliştirin.",
      "whatItDoes": [
        "Staffbix üzerindeki Eğitmen rolü, öğrenci kontrolleri, ödev ipuçları ve ebeveynlere güncellemeler sağlar. Öğrencilere doğrudan cevaplar vermeden rehberlik etmelerini sağlamak için Socratic ipuçları üreten araçlar kullanır.",
        "Ebeveynler için haftalık güncellemeler derlenir, oturum sayıları, güçlü yönler ve zorluklar özetlenir. Rol ayrıca, karmaşık sorunların uygun şekilde ele alınmasını sağlamak için gerektiğinde insan desteğine yönlendirmeyi kolaylaştırır."
      ],
      "integrationsRequired": [
        "E-posta",
        "Web"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "'Roller' bölümüne gidin ve 'Eğitmen'i seçin.",
        "E-posta ve Web kanallarınızı bağlayın.",
        "'generate_socratic_hint' ve 'compile_parent_update' araçlarını etkinleştirin.",
        "Rol ayarlarını gözden geçirin ve etkinleştirin."
      ],
      "exampleTasks": [
        "Bir öğrencinin matematik problemi için Socratic ipuçları oluşturun.",
        "Bir öğrencinin ebeveynlerine haftalık güncelleme e-postası derleyip gönderin.",
        "Bir ebeveyn büyük bir geri ödeme talep ettiğinde, konuşmayı insan takım arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm görevlerin Brand Bible ve Approval Center yönergeleriyle uyumlu olduğundan emin olun.",
      "tips": [
        "Öğrencilere cevapları vermeden rehberlik etmek için 'generate_socratic_hint' kullanın.",
        "Şeffaflığı korumak için ebeveynleri düzenli olarak 'compile_parent_update' ile güncelleyin.",
        "Hizmet kalitesini korumak için karmaşık sorunları hızlıca yönlendirin."
      ]
    }
  },
  "receptionist": {
    "en": {
      "title": "Receptionist",
      "tagline": "Efficient appointment management and client communication.",
      "whatItDoes": [
        "The Receptionist role manages clinic and salon intake through phone and WhatsApp. It efficiently books appointments, sends reminders, and handles no-show recoveries.",
        "Utilizing tools like 'book_appointment_slot' and 'compose_appointment_reminder', it ensures seamless scheduling and communication. It escalates complex issues to human teammates when necessary."
      ],
      "integrationsRequired": [
        "WhatsApp"
      ],
      "steps": [
        "Log into Staffbix and navigate to the Approval Center.",
        "Connect your WhatsApp account for client communications.",
        "Set appointment parameters in the Brand Bible.",
        "Activate 'book_appointment_slot' for scheduling.",
        "Enable 'compose_appointment_reminder' for reminders and recoveries."
      ],
      "exampleTasks": [
        "Book a new appointment slot for a client via WhatsApp.",
        "Send a WhatsApp reminder for an upcoming appointment.",
        "Handle a no-show recovery message without guilt-tripping.",
        "Escalate a complex refund request to a human teammate.",
        "Record a GDPR data request for client data access."
      ],
      "approvalNote": "Ensure all appointment parameters align with the Brand Bible before activation.",
      "tips": [
        "Always verify appointment slots against the Brand Bible settings.",
        "Use 'escalate_to_human' for issues beyond your scope.",
        "Regularly update WhatsApp integration for smooth communication."
      ]
    },
    "tr": {
      "title": "Resepsiyonist",
      "tagline": "Verimli randevu yönetimi ve müşteri iletişimi.",
      "whatItDoes": [
        "Resepsiyonist rolü, klinik ve salon girişlerini telefon ve WhatsApp üzerinden yönetir. Verimli bir şekilde randevuları ayarlar, hatırlatıcılar gönderir ve gelmeyenlerin telafisini yapar.",
        "'book_appointment_slot' ve 'compose_appointment_reminder' gibi araçları kullanarak sorunsuz bir planlama ve iletişim sağlar. Gerekli olduğunda karmaşık sorunları insan ekip arkadaşlarına iletir."
      ],
      "integrationsRequired": [
        "WhatsApp"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Approval Center'a gidin.",
        "Müşteri iletişimleri için WhatsApp hesabınızı bağlayın.",
        "Brand Bible'da randevu parametrelerini ayarlayın.",
        "Planlama için 'book_appointment_slot'u etkinleştirin.",
        "Hatırlatıcılar ve telafiler için 'compose_appointment_reminder'ı etkinleştirin."
      ],
      "exampleTasks": [
        "WhatsApp üzerinden bir müşteri için yeni bir randevu saati ayarlayın.",
        "Yaklaşan bir randevu için WhatsApp hatırlatıcısı gönderin.",
        "Suçluluk hissettirmeden bir gelmeyen telafi mesajı yönetin.",
        "Karmaşık bir iade talebini insan bir ekip arkadaşına iletin.",
        "Müşteri veri erişimi için bir GDPR veri talebini kaydedin."
      ],
      "approvalNote": "Tüm randevu parametrelerinin Brand Bible ile uyumlu olduğundan emin olun.",
      "tips": [
        "Randevu saatlerini her zaman Brand Bible ayarlarına karşı doğrulayın.",
        "Kapsamınızın ötesindeki sorunlar için 'escalate_to_human' kullanın.",
        "Sorunsuz iletişim için WhatsApp entegrasyonunu düzenli olarak güncelleyin."
      ]
    }
  },
  "invoice-specialist": {
    "en": {
      "title": "Invoice Specialist",
      "tagline": "Efficiently manage invoicing and payment processes.",
      "whatItDoes": [
        "The Invoice Specialist role automates the creation and management of invoices using Stripe. It generates invoices, sends reminders, and ensures timely payment collection.",
        "This role also handles bookkeeping entries and escalates complex issues to human teammates when necessary, ensuring smooth financial operations."
      ],
      "integrationsRequired": [
        "Stripe"
      ],
      "steps": [
        "Connect your Stripe account to Staffbix.",
        "Use 'create_invoice' to generate a new invoice.",
        "Call 'list_open_invoices' to check unpaid invoices.",
        "Send reminders using 'send_invoice_reminder'.",
        "Log payments with 'record_bookkeeping_entry'."
      ],
      "exampleTasks": [
        "Create and send a new invoice to a customer.",
        "Send a payment reminder for an overdue invoice.",
        "Log a received payment in the bookkeeping system.",
        "Escalate a complex payment issue to a human teammate.",
        "Record a GDPR data request related to invoicing."
      ],
      "approvalNote": "Ensure all invoices are reviewed in the Approval Center before sending.",
      "tips": [
        "Always verify invoice details before sending reminders.",
        "Use 'escalate_to_human' for unresolved payment disputes.",
        "Regularly check the Approval Center for pending invoice reviews."
      ]
    },
    "tr": {
      "title": "Fatura Uzmanı",
      "tagline": "Fatura ve ödeme süreçlerini verimli bir şekilde yönetin.",
      "whatItDoes": [
        "Fatura Uzmanı rolü, Stripe kullanarak faturaların oluşturulmasını ve yönetilmesini otomatikleştirir. Faturalar oluşturur, hatırlatmalar gönderir ve zamanında ödeme tahsilatını sağlar.",
        "Bu rol ayrıca muhasebe kayıtlarını yönetir ve gerektiğinde karmaşık sorunları insan ekip arkadaşlarına ileterek finansal operasyonların sorunsuz ilerlemesini sağlar."
      ],
      "integrationsRequired": [
        "Stripe"
      ],
      "steps": [
        "Stripe hesabınızı Staffbix'e bağlayın.",
        "Yeni bir fatura oluşturmak için 'create_invoice' kullanın.",
        "Ödenmemiş faturaları kontrol etmek için 'list_open_invoices' çağrısı yapın.",
        "'send_invoice_reminder' kullanarak hatırlatmalar gönderin.",
        "Ödemeleri 'record_bookkeeping_entry' ile kaydedin."
      ],
      "exampleTasks": [
        "Bir müşteriye yeni bir fatura oluşturun ve gönderin.",
        "Vadesi geçmiş bir fatura için ödeme hatırlatması gönderin.",
        "Alınan bir ödemeyi muhasebe sistemine kaydedin.",
        "Karmaşık bir ödeme sorununu insan ekip arkadaşına iletin.",
        "Faturalama ile ilgili bir GDPR veri talebini kaydedin."
      ],
      "approvalNote": "Tüm faturaların gönderilmeden önce Approval Center'da incelendiğinden emin olun.",
      "tips": [
        "Hatırlatmaları göndermeden önce her zaman fatura detaylarını doğrulayın.",
        "Çözülmemiş ödeme anlaşmazlıkları için 'escalate_to_human' kullanın.",
        "Bekleyen fatura incelemeleri için düzenli olarak Approval Center'ı kontrol edin."
      ]
    }
  },
  "tax-prep": {
    "en": {
      "title": "Tax Prep Assistant",
      "tagline": "Streamline your tax preparation with precise categorization and summaries.",
      "whatItDoes": [
        "The Tax Prep Assistant categorizes expenses using the 'categorize_expense' tool, ensuring each expense aligns with your chart of accounts. It never asserts deductibility, focusing solely on accurate categorization.",
        "It compiles a region-aware tax package summary using 'compile_tax_package_summary', providing a clear arithmetic overview for your accountant. This tool does not file taxes or offer deductibility advice.",
        "The assistant logs financial transactions with 'record_bookkeeping_entry', ensuring each entry matches the correct category and date format. This maintains precise financial records for your business."
      ],
      "integrationsRequired": [
        "Email",
        "Bank"
      ],
      "steps": [
        "Connect your Email and Bank accounts to Staffbix.",
        "Access the Tax Prep Assistant from your Staffbix dashboard.",
        "Use 'categorize_expense' to classify expenses in your chart of accounts.",
        "Compile your tax package summary with 'compile_tax_package_summary'.",
        "Log transactions using 'record_bookkeeping_entry' for accurate records."
      ],
      "exampleTasks": [
        "Categorize a business lunch expense under 'Meals and Entertainment'.",
        "Compile a tax package summary for Q1 2023.",
        "Log a $500 income entry received on 2023-04-15.",
        "Reconcile monthly income and expense totals for March 2023.",
        "Escalate a complex tax query to a human teammate."
      ],
      "approvalNote": "Ensure all categorizations and summaries are reviewed by a qualified accountant.",
      "tips": [
        "Regularly update your chart of accounts for accurate categorization.",
        "Compile tax summaries monthly to avoid last-minute rushes.",
        "Escalate any uncertain or complex issues to a human teammate promptly."
      ]
    },
    "tr": {
      "title": "Vergi Hazırlık Asistanı",
      "tagline": "Vergi hazırlığınızı hassas kategorilendirme ve özetlerle kolaylaştırın.",
      "whatItDoes": [
        "Vergi Hazırlık Asistanı, her bir harcamanın hesap planınıza uygun olmasını sağlayarak 'categorize_expense' aracı ile harcamaları kategorilendirir. Kesinlikle indirilebilirlik iddiasında bulunmaz, yalnızca doğru kategorilendirmeye odaklanır.",
        "'compile_tax_package_summary' kullanarak bölgeye duyarlı bir vergi paketi özeti derler, muhasebeciniz için net bir aritmetik genel bakış sağlar. Bu araç vergi beyanı yapmaz veya indirilebilirlik tavsiyesi vermez.",
        "Asistan, 'record_bookkeeping_entry' ile finansal işlemleri kaydeder, her girişin doğru kategori ve tarih formatına uygun olmasını sağlar. Bu, işletmeniz için hassas finansal kayıtların korunmasını sağlar."
      ],
      "integrationsRequired": [
        "Email",
        "Banka"
      ],
      "steps": [
        "Email ve Banka hesaplarınızı Staffbix'e bağlayın.",
        "Staffbix kontrol panelinizden Vergi Hazırlık Asistanı'na erişin.",
        "Hesap planınızdaki harcamaları sınıflandırmak için 'categorize_expense' kullanın.",
        "Vergi paketi özetinizi 'compile_tax_package_summary' ile derleyin.",
        "Doğru kayıtlar için 'record_bookkeeping_entry' kullanarak işlemleri kaydedin."
      ],
      "exampleTasks": [
        "Bir iş yemeği harcamasını 'Yemek ve Eğlence' altında kategorilendirin.",
        "2023'ün 1. çeyreği için bir vergi paketi özeti derleyin.",
        "2023-04-15 tarihinde alınan 500$ gelir girişini kaydedin.",
        "Mart 2023 için aylık gelir ve gider toplamlarını uzlaştırın.",
        "Karmaşık bir vergi sorusunu insan bir ekip arkadaşına yönlendirin."
      ],
      "approvalNote": "Tüm kategorilendirmelerin ve özetlerin nitelikli bir muhasebeci tarafından incelendiğinden emin olun.",
      "tips": [
        "Doğru kategorilendirme için hesap planınızı düzenli olarak güncelleyin.",
        "Son dakika telaşından kaçınmak için vergi özetlerini aylık olarak derleyin.",
        "Belirsiz veya karmaşık konuları derhal insan bir ekip arkadaşına yönlendirin."
      ]
    }
  },
  "cash-flow": {
    "en": {
      "title": "Cash Flow Analyst",
      "tagline": "Manage cash flow with precision and foresight.",
      "whatItDoes": [
        "The Cash Flow Analyst role on Staffbix helps you forecast financial health by computing cash flow projections using recent bookkeeping data. It provides insights into monthly run rates and runway estimates, ensuring informed financial planning.",
        "Utilize monthly summaries to break down income and expenses, facilitating end-of-month financial reviews. This role supports maintaining financial stability by identifying cash position and potential financial risks."
      ],
      "integrationsRequired": [
        "Internal"
      ],
      "steps": [
        "Log in to Staffbix and navigate to the Finance section.",
        "Select the Cash Flow Analyst role from the available options.",
        "Use 'compute_cashflow_projection' to generate cash flow forecasts.",
        "Run 'monthly_summary' for detailed income and expense breakdowns.",
        "Review open invoices with 'list_open_invoices' before sending reminders."
      ],
      "exampleTasks": [
        "Generate a cash flow projection for the next quarter.",
        "Prepare a monthly financial summary for the board meeting.",
        "Identify overdue invoices and prepare reminders for clients.",
        "Estimate the company's runway based on current cash balance.",
        "Analyze income vs expense trends for budget adjustments."
      ],
      "approvalNote": "Ensure all financial projections and summaries are reviewed by a senior financial officer before dissemination.",
      "tips": [
        "Regularly update bookkeeping entries to ensure accurate projections.",
        "Always verify invoice details before sending reminders to clients.",
        "Use monthly summaries to identify and address financial discrepancies early."
      ]
    },
    "tr": {
      "title": "Nakit Akışı Analisti",
      "tagline": "Nakit akışını hassasiyet ve öngörü ile yönetin.",
      "whatItDoes": [
        "Staffbix üzerindeki Nakit Akışı Analisti rolü, son muhasebe verilerini kullanarak nakit akışı projeksiyonları hesaplayarak finansal sağlığı öngörmenize yardımcı olur. Aylık çalışma oranları ve pist tahminleri hakkında içgörüler sunarak bilinçli finansal planlama sağlar.",
        "Aylık özetleri kullanarak gelir ve giderleri ayırın, ay sonu finansal incelemeleri kolaylaştırın. Bu rol, nakit durumu ve potansiyel finansal riskleri belirleyerek finansal istikrarın korunmasına destek olur."
      ],
      "integrationsRequired": [
        "Dahili"
      ],
      "steps": [
        "Staffbix'e giriş yapın ve Finans bölümüne gidin.",
        "Mevcut seçeneklerden Nakit Akışı Analisti rolünü seçin.",
        "Nakit akışı tahminleri oluşturmak için 'compute_cashflow_projection' kullanın.",
        "Gelir ve gider detayları için 'monthly_summary' çalıştırın.",
        "Hatırlatıcı göndermeden önce 'list_open_invoices' ile açık faturaları gözden geçirin."
      ],
      "exampleTasks": [
        "Gelecek çeyrek için bir nakit akışı projeksiyonu oluşturun.",
        "Yönetim kurulu toplantısı için aylık finansal özet hazırlayın.",
        "Vadesi geçmiş faturaları belirleyin ve müşterilere hatırlatıcılar hazırlayın.",
        "Mevcut nakit bakiyesine göre şirketin pistini tahmin edin.",
        "Bütçe ayarlamaları için gelir ve gider eğilimlerini analiz edin."
      ],
      "approvalNote": "Tüm finansal projeksiyonlar ve özetler dağıtılmadan önce kıdemli bir finans görevlisi tarafından incelenmelidir.",
      "tips": [
        "Doğru projeksiyonlar için muhasebe kayıtlarını düzenli olarak güncelleyin.",
        "Müşterilere hatırlatıcı göndermeden önce fatura detaylarını her zaman doğrulayın.",
        "Finansal tutarsızlıkları erken tespit etmek ve çözmek için aylık özetleri kullanın."
      ]
    }
  },
  "procurement": {
    "en": {
      "title": "Procurement",
      "tagline": "Streamline SaaS procurement and management.",
      "whatItDoes": [
        "The Procurement role on Staffbix helps manage SaaS contracts by negotiating terms, reviewing renewals, and auditing unused tools. It uses specific tools to classify subscriptions and draft vendor outreach emails.",
        "Audit SaaS subscriptions to determine if they should be kept, renegotiated, downsized, or canceled based on utilization and cost. Draft vendor emails for renegotiation or cancellation, ensuring all data is operator-supplied.",
        "Escalate complex or sensitive issues to human teammates when necessary, ensuring compliance with GDPR by recording data requests without modification."
      ],
      "integrationsRequired": [
        "Email"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Procurement role dashboard.",
        "Connect your Email account for vendor communications.",
        "Use 'audit_saas_subscription' to evaluate current contracts.",
        "Draft and send vendor emails using 'draft_vendor_outreach'."
      ],
      "exampleTasks": [
        "Classify a SaaS subscription for cancellation due to low utilization.",
        "Draft an email to renegotiate a SaaS contract with a vendor.",
        "Escalate a request for a large refund to a human teammate.",
        "Record a GDPR data-subject request for data erasure.",
        "Audit SaaS tools for potential downsizing based on login recency."
      ],
      "approvalNote": "Ensure all vendor communication drafts are reviewed in the Approval Center before sending.",
      "tips": [
        "Always use operator-supplied data for vendor outreach.",
        "Escalate any request beyond your authority to a human teammate.",
        "Regularly audit subscriptions to optimize SaaS spend."
      ]
    },
    "tr": {
      "title": "Tedarik",
      "tagline": "SaaS tedarik ve yönetimini kolaylaştırın.",
      "whatItDoes": [
        "Staffbix üzerindeki Tedarik rolü, SaaS sözleşmelerini şartları müzakere ederek, yenilemeleri gözden geçirerek ve kullanılmayan araçları denetleyerek yönetmeye yardımcı olur. Abonelikleri sınıflandırmak ve satıcıya yönelik e-postalar taslağı hazırlamak için belirli araçlar kullanır.",
        "SaaS aboneliklerini, kullanım ve maliyet temelinde tutulup tutulmayacağını, yeniden müzakere edilip edilmeyeceğini, küçültülüp küçültülmeyeceğini veya iptal edilip edilmeyeceğini belirlemek için denetleyin. Yeniden müzakere veya iptal için satıcı e-postalarını taslak olarak hazırlayın, tüm verilerin operatör tarafından sağlandığından emin olun.",
        "Gerekli olduğunda karmaşık veya hassas konuları insan ekip arkadaşlarına iletin, GDPR uyumluluğunu sağlamak için veri taleplerini değişiklik yapmadan kaydedin."
      ],
      "integrationsRequired": [
        "E-posta"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Tedarik rolü kontrol paneline gidin.",
        "Satıcı iletişimleri için E-posta hesabınızı bağlayın.",
        "Mevcut sözleşmeleri değerlendirmek için 'audit_saas_subscription' kullanın.",
        "'draft_vendor_outreach' kullanarak satıcı e-postalarını taslak olarak hazırlayın ve gönderin."
      ],
      "exampleTasks": [
        "Düşük kullanım nedeniyle iptal edilecek bir SaaS aboneliğini sınıflandırın.",
        "Bir satıcı ile SaaS sözleşmesini yeniden müzakere etmek için bir e-posta taslağı hazırlayın.",
        "Büyük bir geri ödeme talebini insan ekip arkadaşına iletin.",
        "Veri silme için bir GDPR veri konusu talebini kaydedin.",
        "Giriş sıklığına göre küçültme potansiyeli olan SaaS araçlarını denetleyin."
      ],
      "approvalNote": "Gönderilmeden önce tüm satıcı iletişim taslaklarının Onay Merkezinde gözden geçirildiğinden emin olun.",
      "tips": [
        "Satıcıya yönelik iletişimlerde her zaman operatör tarafından sağlanan verileri kullanın.",
        "Yetkinizi aşan herhangi bir talebi insan ekip arkadaşına iletin.",
        "SaaS harcamalarını optimize etmek için abonelikleri düzenli olarak denetleyin."
      ]
    }
  },
  "chef-assistant": {
    "en": {
      "title": "Chef Assistant",
      "tagline": "Streamline menu creation and ensure allergen compliance.",
      "whatItDoes": [
        "The Chef Assistant role on Staffbix assists in writing precise menu descriptions and ensuring allergen compliance. It uses the write_menu_description tool to craft descriptions that align with regulatory standards, avoiding any health claims or price mentions.",
        "To maintain safety and transparency, the check_allergen_disclosure tool verifies that all allergens are properly declared for each menu item. This ensures compliance with EU and US allergen regulations, providing a reliable dining experience."
      ],
      "integrationsRequired": [
        "CMS",
        "Web"
      ],
      "steps": [
        "Log into your Staffbix account.",
        "Navigate to the Chef Assistant role in the dashboard.",
        "Connect your CMS and Web channels for seamless integration.",
        "Use the write_menu_description tool to draft menu items.",
        "Run check_allergen_disclosure to verify allergen information."
      ],
      "exampleTasks": [
        "Write a description for a new vegan pasta dish.",
        "Verify allergen information for a seafood platter.",
        "Ensure all menu items comply with EU allergen regulations.",
        "Draft a gluten-free dessert menu section.",
        "Check allergen disclosure for a seasonal menu update."
      ],
      "approvalNote": "All tasks involving allergen verification must be reviewed in the Approval Center before publication.",
      "tips": [
        "Always use the write_menu_description tool for accurate descriptions.",
        "Regularly run check_allergen_disclosure to maintain compliance.",
        "Escalate complex allergen queries to a human teammate using escalate_to_human."
      ]
    },
    "tr": {
      "title": "Şef Asistanı",
      "tagline": "Menü oluşturmayı kolaylaştırın ve alerjen uyumluluğunu sağlayın.",
      "whatItDoes": [
        "Staffbix'teki Şef Asistanı rolü, doğru menü açıklamaları yazmaya ve alerjen uyumluluğunu sağlamaya yardımcı olur. Menü açıklamalarını düzenleyici standartlara uygun olarak hazırlamak için write_menu_description aracını kullanır, sağlık iddialarından veya fiyat belirtilerinden kaçınır.",
        "Güvenliği ve şeffaflığı korumak için check_allergen_disclosure aracı, her menü öğesi için tüm alerjenlerin doğru bir şekilde beyan edildiğini doğrular. Bu, AB ve ABD alerjen düzenlemelerine uyumu sağlar ve güvenilir bir yemek deneyimi sunar."
      ],
      "integrationsRequired": [
        "CMS",
        "Web"
      ],
      "steps": [
        "Staffbix hesabınıza giriş yapın.",
        "Gösterge panelinde Şef Asistanı rolüne gidin.",
        "Sorunsuz entegrasyon için CMS ve Web kanallarınızı bağlayın.",
        "Menü öğelerini taslak olarak hazırlamak için write_menu_description aracını kullanın.",
        "Alerjen bilgilerini doğrulamak için check_allergen_disclosure çalıştırın."
      ],
      "exampleTasks": [
        "Yeni bir vegan makarna yemeği için açıklama yazın.",
        "Bir deniz ürünleri tabağı için alerjen bilgilerini doğrulayın.",
        "Tüm menü öğelerinin AB alerjen düzenlemelerine uygun olmasını sağlayın.",
        "Glutensiz tatlı menüsü bölümü taslağı hazırlayın.",
        "Mevsimlik menü güncellemesi için alerjen beyanını kontrol edin."
      ],
      "approvalNote": "Alerjen doğrulamasını içeren tüm görevler, yayınlanmadan önce Approval Center'da gözden geçirilmelidir.",
      "tips": [
        "Doğru açıklamalar için her zaman write_menu_description aracını kullanın.",
        "Uyumluluğu sürdürmek için düzenli olarak check_allergen_disclosure çalıştırın.",
        "Karmaşık alerjen sorgularını escalate_to_human kullanarak insan bir takım arkadaşına yönlendirin."
      ]
    }
  }
};
