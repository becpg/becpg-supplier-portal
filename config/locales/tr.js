/**
 * Turkish translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/company/page#LABELS": {
        "title": "Şirketim",
        "noSupplier": "Tedarikçi kaydı yok",
        "noSupplierHint": "Hesabınız hiçbir tedarikçiye bağlı değil. Müşteri temsilcinizle iletişime geçin.",
        "approval": "Onay durumu",
        "approvalHint": "Belgelerinizden, projelerinizden ve uygunsuzluklarınızdan anlık olarak hesaplanır.",
        "reasons": {
            "documentExpired": "Zorunlu bir belgenin süresi doldu",
            "documentExpiring": "Zorunlu bir belgenin süresi dolmak üzere",
            "documentMissing": "Zorunlu bir belge sağlanmadı",
            "blockingNc": "Engelleyici bir uygunsuzluk açık",
            "openProject": "Bir listeleme projesi sürüyor",
            "blockingCatalog": "Engelleyici bir katalog karşılanmadı"
        },
        "metrics": {
            "documentsExpired": "Süresi dolmuş belgeler",
            "documentsExpiring": "Süresi dolmak üzere olan belgeler",
            "documentsMissing": "Eksik belgeler",
            "openNc": "Açık NC",
            "openProjects": "Açık projeler"
        },
        "sections": {
            "identity": "Kimlik",
            "surveyList": "Soru formu",
            "contactList": "Kişiler",
            "plant": "Tesisler",
            "certification": "Sertifikalar",
            "documents": "Belgeler",
            "specs": "Spesifikasyonlar"
        },
        "frozen": "Müşteri tarafından doğrulanmış liste — salt okunur",
        "emptyList": "Satır yok",
        "emptyListHint": "Bu bölüm henüz doldurulmadı.",
        "questionnaire": "{done} / {total} soru yanıtlandı",
        "noProperties": "Görüntülenecek özellik yok",
        "yes": "Evet",
        "no": "Hayır",
        "code": "Kod",
        "request": "Güncelleme talep et"
    },
    "app/documents/page#LABELS": {
        "title": "Belgelerim",
        "tabRequirements": "Gereksinimler",
        "tabAll": "Tüm belgeler",
        "tabSigned": "İmzalananlar",
        "deposit": "Belge yükle",
        "depositTitle": "Belge yükle",
        "entity": "İlgili ürün",
        "chooseEntity": "Bir ürün seçin…",
        "filters": {
            "open": "İşlenecek",
            "blocking": "Engelleyici",
            "expiring": "Süresi doluyor",
            "done": "Sağlandı",
            "all": "Tümü"
        },
        "stats": {
            "toProvide": "Sağlanacak",
            "expired": "Süresi doldu",
            "expiring": "Süresi doluyor < {days} g",
            "compliance": "Belge uygunluğu",
            "mandatory": "{done} / {total} zorunlu",
            "noScope": "değerlendirilecek kapsam yok"
        },
        "search": "Belge ara",
        "noMatch": "Bu filtreye uyan belge yok",
        "noMatchHint": "Tüm belgeleri görmek için \"Tümü\" seçeneğini deneyin.",
        "columns": {
            "document": "Belge",
            "entity": "Ürün",
            "status": "Durum",
            "validity": "Geçerlilik",
            "modified": "Değiştirilme",
            "ai": "AI incelemesi",
            "actions": ""
        },
        "download": "İndir",
        "noFile": "Henüz sağlanmadı",
        "blockingBanner": "{count} zorunlu belge onayınızı engelliyor. Bunlar listenin en üstünde yer alır.",
        "scopeEmpty": "Hesabınız hiçbir tedarikçiye bağlı olmadığından belge gereksinimi hesaplanamıyor. Yukarıdaki sayaçlar karşılanmış değil, boştur. Müşteri temsilcinizle iletişime geçin."
    },
    "app/error#LABELS": {
        "title": "Bu sayfa görüntülenemedi",
        "message": "Görüntüleme sırasında teknik bir hata oluştu. Girdiğiniz bilgiler kaybolmadı: girdikçe kaydedilir.",
        "retry": "Yeniden dene",
        "home": "Ana sayfaya dön",
        "reference": "Destek ekibine iletilecek referans"
    },
    "app/global-error#LABELS": {
        "title": "Portal başlatılamadı",
        "message": "Teknik bir hata portalın görüntülenmesini engelliyor. Yeniden deneyin; sorun devam ederse aşağıdaki referansla beCPG irtibat kişinize başvurun.",
        "retry": "Yeniden dene",
        "reference": "Referans"
    },
    "app/help/page#LABELS": {
        "title": "Yardım",
        "subtitle": "Portal adım adım nasıl çalışır",
        "scope": "beCPG tedarikçi portalı",
        "search": "Yardımda ara",
        "expandAll": "Tümünü genişlet",
        "collapseAll": "Tümünü daralt",
        "topics": "İçindekiler",
        "noResult": "Eşleşen konu yok",
        "noResultHint": "Başka bir kelime deneyin: \"belge\", \"imza\", \"adım\", \"onay\".",
        "anchor": "Bu konunun bağlantısı",
        "anchorCopied": "Bağlantı kopyalandı",
        "goTo": "Git",
        "monitorNotice": "Bu yardım tedarikçi görünümünü açıklar: tedarikçilerinizin gördüğü ekranlar; burada \"müşteriniz\" kendi şirketiniz anlamına gelir. İzleme alanı henüz belgelenmedi."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Nereden başlamalı",
            "summary": "Pano tek bir soruyu yanıtlar: sizden ne bekleniyor ve ne zamana kadar.",
            "blocks": [
                {
                    "p": "Her şey panoda başlar. Üstteki dört kart, bu müşteriyle olan dosyanızı özetler:"
                },
                {
                    "ul": [
                        "**Onay durumu** — Onaylandı, Devam ediyor, Yenilenecek veya Askıya alındı; geçerlilik tarihiyle birlikte.",
                        "**Doluluk** — kartlarınızda beklenen alanlardan halihazırda doldurulmuş olanların oranı.",
                        "**Gerekli eylemler** — kaç görevin açık olduğu ve kaçının geciktiği.",
                        "**Belgeler** — kaçının geçerli olduğu, kaçının yakında sona ereceği, kaçının eksik olduğu."
                    ]
                },
                {
                    "p": "Altındaki listeler ayrıntıları içerir: görevleriniz, ürünleriniz, belgeleriniz, tartışmalarınız ve bildirimleriniz. Üst bilgideki zil, aynı bildirim listesini her ekrandan gösterir."
                },
                {
                    "note": "Bir hesap birden fazla beCPG müşterisi için çalışabilir; her müşteri için bir portal vardır. Müşterinin logosu ve adı her zaman sol üstte görünür: hangi dosyada olduğunuzu bu gösterir."
                },
                {
                    "warn": "\"TEST ortamı\" başlığı görüntüleniyorsa bir deneme ortamındasınız: burada girdiğiniz hiçbir bilgi bağlayıcı değildir."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Pano"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Görevlerim"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Belgelerim"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Bir listeleme görevi nasıl işler",
            "summary": "Bir görev, müşterinizin açtığı bir projeden gelir. Türü, hangi ekrana yönlendirileceğinizi belirler.",
            "blocks": [
                {
                    "p": "Müşteriniz bir listeleme projesi açar ve bu proje size görevler gönderir. Bir görevin başlığı, ilgili ürünü, son tarihi ve türü vardır. Bir göreve tıklamak sizi doğrudan onu tamamlayan ekrana götürür — ara sayfa yoktur."
                },
                {
                    "ul": [
                        "**Asistan** — bir ürün kartı veya tedarikçi kartınız için yönlendirmeli veri girişi.",
                        "**İmza** — bir PDF belgesini okuyup ardından imzalama.",
                        "**Belge** — beklenen bir belgeyi yükleme veya yenileme.",
                        "**İnceleme** — bir ürünü baştan sona okuma, giriş gerektirmez."
                    ]
                },
                {
                    "p": "Planlandı veya Devam ediyor durumundaki bir görev sizi bekliyor. Reddedildi durumundaki bir görev müşteriniz tarafından bir gerekçeyle geri gönderilmiştir: yeniden göndermeden önce açıklamayı okuyun. Tamamlandı durumundaki bir görev başka bir şey gerektirmez."
                },
                {
                    "p": "Son tarihi geçmiş bir görev hem listede hem bildirimlerde gecikmiş olarak işaretlenir. Yedi günden fazla gecikmede kırmızıya döner."
                },
                {
                    "note": "Bir görevi istediğiniz kadar açıp bırakabilirsiniz: siz tamamlayana kadar açık kalır ve iki ziyaret arasında hiçbir şey kaybolmaz."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Görevlerim"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "Asistan adımlarının sırası",
            "summary": "Üst bilgide teknik föy, sürekli görünen bir Bağlam paneli, müşterinizin bölümleri, ardından uygunluk.",
            "blocks": [
                {
                    "p": "Asistan her zaman aynı sırayı izler. Tek yönlü bir tünel değildir: bir adım ziyaret edildiği anda ona serbestçe geri dönebilirsiniz."
                },
                {
                    "ol": [
                        "**Üst bilgi · Teknik föy** — sizden beklenen ilk adım. Eksik olduğu sürece her adımın üzerinde kırmızı bir şerit bunu belirtir; yüklendikten sonra tarihini ve geçerliliğini gösteren tek bir satır kalır. AI'nın değer önermek için okuduğu belge budur: o olmadan okunacak bir şey yoktur. Müşteriniz böyle bir belge türü yapılandırmadıysa şerit hiç gösterilmez.",
                        "**Adım 0 · Bağlam** — her zaman görünür olan ve telefonda tek dokunuşla açılan bir sayfaya dönüşen panel. AI önerilerini, geçerli spesifikasyonu, müşterinizin halihazırda doğruladığı listeleri ve önceki retleri içerir. Bu adımdan geçmezsiniz: hangi adımda olursanız olun oradadır.",
                        "**Müşterinizin bölümleri** — özellikler, soru formu, bileşenler, besin öğeleri, alerjenler, fiziko-kimyasal, beyanlar, mikrobiyoloji, organoleptik, ambalaj malzemeleri, belgeler… Hangi bölümlerin hangi sırayla görüneceği müşterinizin yapılandırmasına ve ürün türüne bağlıdır: portal bunları seçmez.",
                        "**Belgeler** — bu adım, müşterinizin verdiği yerde kalır; genellikle sona yakındır. Bu bilinçli bir tercihtir: beCPG beklenen belgeleri girdiğiniz bilgilerden türetir (\"GDO içermez\" beyanı ilgili beyannameyi gerektirir), bu yüzden çok erken sorulursa liste boş veya hatalı olur. Her durumda yalnızca teknik föy beklenir ve o da üst bilgidedir.",
                        "**Uygunluk** — hâlâ eksik olan alanların listesi, her biri doğrudan alana gitmek için tıklanabilir; ayrıca doluluk puanı. Müşteriniz engelleyici bir kontrol tanımladıysa, bu kontrol karşılanana kadar tamamlama kullanılamaz."
                    ]
                },
                {
                    "note": "Her bölüm, herhangi bir düğmeye basmadan otomatik olarak kaydedilir. Asistanın altında, gezinme düğmelerinin yanındaki \"HH:MM'de kaydedildi\" göstergesi bunu doğrular — portalı kapatsanız, cihaz değiştirseniz veya bağlantıyı kaybetseniz bile tam kaldığınız yerden devam edersiniz."
                },
                {
                    "p": "Bazı adımlar arasında kartınız yeniden hesaplanır (alerjenler, besin öğeleri, maliyetler…). Bu hesaplama arka planda çalışır ve sizi asla engellemez: çalışırken veri girmeye devam edebilirsiniz."
                },
                {
                    "p": "Geniş ekranda \"Giriş alanını genişlet\", geniş tablolar için yan panelleri gizler ve adım listesini simgelerine indirger. Seçim bir karttan diğerine hatırlanır; paneller üst bilgideki simgeler aracılığıyla bir tık uzaktadır."
                },
                {
                    "note": "İrtibat kişiniz sizin adınıza veri giriyorsa, asistanın üstündeki \"… adına veri giriyorsunuz\" başlığı bunu açıkça belirtir."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Bir tabloda hızlı veri girişi",
            "summary": "Bileşenler, besin öğeleri, alerjenler: her şey klavyeden yapılır ve bir hesap tablosu bloğu doğrudan yapıştırılabilir.",
            "blocks": [
                {
                    "p": "Tablo bölümleri — bileşenler, besin öğeleri, alerjenler, fiziko-kimyasal… — klavyeden ayrılmadan doldurulur. Tablonun üzerindeki klavye düğmesi listeyi istediğiniz zaman yeniden gösterir."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — sonraki / önceki hücre.",
                        "**Enter** — satırı kaydeder ve aynı sütunda aşağı iner; son satırda yeni bir satır ekler.",
                        "**↑ / ↓** — aynı sütun, üstteki / alttaki satır.",
                        "**Esc** — düzenlenen satırdaki değişiklikleri iptal eder.",
                        "**Ctrl+D** — geçerli satırı çoğaltır.",
                        "**Ctrl+V** — bir hesap tablosundan hücre bloğu yapıştırır."
                    ]
                },
                {
                    "p": "Hesap tablosundan yapıştırma, birden çok satır ve sütunu tek seferde alır, eksik satırları oluşturur ve alamadıklarını size bildirir — önerilen listenin dışındaki bir değer, metin bulunan yerde beklenen bir sayı, salt okunur bir sütun. Hiçbir şey tahmin edilmez: tam eşleşmesi olmayan her şey düzeltmeniz için size geri verilir."
                },
                {
                    "note": "Asistanın her yerinde olduğu gibi, bir satır ondan ayrıldığınız anda kaydedilir — ya da Enter'a bastığınızda veya bir kutuyu işaretlediğiniz anda. Kaydet düğmesi yoktur: onaylanacak bir şey yoktur. Yalnızca yapıştırma işlemi \"N satırı kaydet\" seçeneği sunar, çünkü bu satırları kimse tek tek gözden geçirmemiştir."
                },
                {
                    "p": "Telefonda tablo, her satır için bir karta dönüşür: aynı alanlar alt alta, yatay kaydırma olmadan."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Spesifikasyon ve katalog: fark nedir",
            "summary": "Spesifikasyon okunur. Katalog doldurulur — ve tamamlayıp tamamlayamayacağınıza karar veren odur.",
            "blocks": [
                {
                    "p": "Bunlar iki farklı nesnedir ve aynı ana hizmet etmezler. En basit yol, onları karşılaştığınız sırayla ele almaktır."
                },
                {
                    "ul": [
                        "**Spesifikasyon** — müşterinizden gelen, bir ürüne veya ürün ailesine bağlı bir belge. Gereksinimlerini belirtir: yasaklı maddeler, kabul edilen menşeler, analitik eşikler, taşıma koşulları, KSS taahhütleri. Okunacak bir **referans metindir**. Portal onu asistanın \"Bağlam\" panelinde gösterir ve \"Spesifikasyonlar\" ekranı hepsini bir araya getirir.",
                        "**Katalog** — müşterinizin tanımladığı bir **zorunlu alanlar listesi**: \"bir hammaddenin bende listelenmesi için menşe, yoğunluk, EAN kodu, majör alerjen… gerekiyor\". Bir metin değil, bir kontroldür. Portal onu sürekli hesaplar ve puanını \"Uygunluk\" adımında verir."
                    ]
                },
                {
                    "p": "Başka bir deyişle: spesifikasyon size **müşterinizin ürününüzden ne beklediğini** söyler, katalog ise **kartının eksiksiz olduğunu** doğrular. Spesifikasyona uyup yine de eksik bir karta sahip olabilirsiniz, tersi de mümkündür."
                },
                {
                    "p": "İkisinden yalnızca biri göndermenizi engeller: katalog. Müşteriniz engelleyici bir katalog tanımladığında, bir alan eksik olduğu sürece \"Bitir\" düğmesi kullanılamaz ve \"Uygunluk\" adımı tam olarak hangilerinin eksik olduğunu listeler — her satır sizi alana götürür."
                },
                {
                    "note": "Bir spesifikasyon belge de talep edebilir (organik sertifikası, GDO içermez beyannamesi). Bunlar \"Belgelerim\" altında ve Belgeler adımında geçerlilik tarihleriyle görünür — katalogda değil."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Spesifikasyonlar"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Belgelerim"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Dondurulmuş liste ne anlama gelir",
            "summary": "Müşteriniz tarafından doğrulanan bir liste salt okunur hale gelir. Bu bilinçli bir tercihtir ve talep üzerine geri alınabilir.",
            "blocks": [
                {
                    "p": "Müşteriniz bir bölümü doğruladığında — bileşen listesi, soru formu, alerjenler… — o bölüm **dondurulur**: tüm değerleriyle görmeye devam edersiniz ancak artık değiştiremezsiniz. Bir asma kilit ve \"Salt okunur\" ibaresi bunu belirtir."
                },
                {
                    "p": "Amaç da budur: bir değer doğrulandıktan sonra müşterinizin dayandığı referans haline gelir (etiketleme, spesifikasyonlar, kontroller). Onların haberi olmadan değişebilseydi, doğrulamanın hiçbir anlamı olmazdı."
                },
                {
                    "p": "Dondurulmuş listeler ayrıca asistanın \"Bağlam\" panelinde \"Doğrulanmış listeler\" altında listelenir: neyin kesinleştiğini ve neyin hâlâ açık olduğunu görmenin en hızlı yolu budur."
                },
                {
                    "warn": "Dondurulmuş bir listede hata mı fark ettiniz? Yinelenen bir kart oluşturmayın. Karta bağlı tartışma üzerinden bölümün yeniden açılmasını isteyin: müşteriniz dondurmayı kaldırır ve bölüm yeniden düzenlenebilir hale gelir."
                },
                {
                    "p": "Bir kartın tamamı başka bir nedenle de salt okunur olabilir: görev tamamlanmıştır, proje kapatılmıştır veya yalnızca okuma erişiminiz vardır. Asistan hangisinin geçerli olduğunu size bildirir."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Tartışmalar"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "AI ne önerir",
            "summary": "Öneriler — asla sizin yerinize yazılan değerler değil.",
            "blocks": [
                {
                    "p": "Müşterinizde otomatik çıkarma etkinleştirildiğinde portal belgelerinizi okur ve bulduğu değerleri önerir. Bunlar formun sağındaki \"Bağlam\" panelinde görünür ve her adım değişiminde yeniden okunur — az önce girdiğiniz bilgiler, önerilecek kalan değerleri değiştirir."
                },
                {
                    "p": "Her şey asistanın üst bilgisindeki **teknik föy** ile başlar. Yüklenmediği sürece okunacak bir şey yoktur ve öneri listesi boş kalır: kırmızı şeridin anlamı budur."
                },
                {
                    "ul": [
                        "**Uygula** — değer karta yazılır. Bu tıklamadan önce hiçbir şey yazılmaz.",
                        "**Genişlet** — panele sığmayan uzun analizler için."
                    ]
                },
                {
                    "note": "İstemediğiniz bir öneriyi reddetmeniz gerekmez: uygulamayın, varsayılan zaten budur. Okumanın ne kadar kesin olduğunu iddia ettiğine bakılmaksızın hiçbir değer otomatik olarak uygulanmaz. Kartı taahhüt eden sizsiniz: karar alan alan sizindir."
                },
                {
                    "p": "Her durumda nihai değer sizindir: doğruladıklarınızdan siz sorumlu kalırsınız ve görevi tamamlamadan önce hiçbir şey müşterinize ulaşmaz."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Belge geçerliliği ve yenileme",
            "summary": "Portal hangi belgelerin beklendiğini, ne kadar süre geçerli olduklarını ve hangilerinin eksik olduğunu bilir.",
            "blocks": [
                {
                    "p": "Beklenen belgeler tahmin etmeniz gereken bir liste değildir: müşteriniz bunları yapılandırır (belge türü, zorunlu olup olmadığı, geçerlilik süresi, kapsam) ve \"Belgelerim\" ekranı bunları size olduğu gibi, ürün ürün sunar."
                },
                {
                    "ul": [
                        "**Geçerli** — sağlandı, kabul edildi ve geçerlilik sonu yakın değil.",
                        "**Yenilenecek** — geçerlilik sonuna 60 günden az kaldı (müşterinizin ayarlayabileceği bir süre).",
                        "**Süresi doldu** — geçerlilik sonu geçti. Zorunlu bir belge için bu, onayınızı askıya alır.",
                        "**Eksik** — bekleniyor ve hiç sağlanmadı.",
                        "**Reddedildi** — sağlandı ancak müşteriniz tarafından reddedildi: yeniden yüklemeden önce gerekçeyi okuyun."
                    ]
                },
                {
                    "p": "Her belgenin bir geçerlilik dönemi (başlangıç ve bitiş) vardır; satırında gösterilir ve beCPG'nin renklendirdiği şekilde renklendirilir: süresi içindeyken **yeşil**, son tarih yaklaştıkça **turuncu**, geçtikten sonra **kırmızı**."
                },
                {
                    "p": "Türe bağlı olarak bu dönem, yükleme tarihinden ve müşterinizin yapılandırdığı süreden otomatik olarak türetilir ya da **sizin girmeniz gerekir**: bu durumda yükleme alanında, yüklediğiniz belgeye göre doldurulacak iki tarih kutusu görünür. Bunlar dosyayla birlikte gider ve daha sonra satırdaki \"Düzenle\" ile değiştirilebilir."
                },
                {
                    "warn": "Geçerliliği hiç doldurulmamış zorunlu bir belge kırmızıyla \"Geçerlilik doldurulacak\" olarak işaretlenir. Bitiş tarihi olmadan süresi asla dolmaz, hatırlatma gönderilmez ve müşteriniz belgenin ne zamandan beri geçerli olduğunu bilemez."
                },
                {
                    "p": "Yenilemek, aynı satıra yeni bir sürüm yüklemek demektir — asla ikinci bir satır oluşturmak değil. Önceki sürüm kendi geçerlilik dönemiyle belge geçmişinde kalır: geçmiş bir tarihte kapsam altında olduğunuzu kanıtlayan budur."
                },
                {
                    "note": "Dosya adı ve nereye kaydedildiği önemli değildir: portal belgeyi müşterinizin yapılandırmasına göre yeniden adlandırır ve dosyalar. Dosyayı size teslim edildiği haliyle yükleyin."
                },
                {
                    "p": "Süre dolmadan önceki e-posta hatırlatmaları, müşterinizin tanımladığı kurallara göre beCPG tarafından gönderilir. Portal her zaman gerçek durumu gösterir: e-postaya güvenmeyin, referans \"Belgelerim\" ekranıdır."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Belgelerim"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "Onay durumu",
            "summary": "Belgelerinizden, kartlarınızdan ve uygunsuzluklarınızdan anlık olarak hesaplanır. Asla dondurulmaz.",
            "blocks": [
                {
                    "p": "Panoda gösterilen durum elle girilmiş bir karar değildir: dosyanızdan, her görüntülendiğinde yeniden hesaplanır. Nedeni düzeltin, durum değişir."
                },
                {
                    "ul": [
                        "**Askıya alındı** — en az bir zorunlu belgenin süresi doldu veya engelleyici bir uygunsuzluk açık.",
                        "**Yenilenecek** — en az bir zorunlu belgenin süresi dolmak üzere.",
                        "**Devam ediyor** — bir listeleme projesi açık, ya da zorunlu bir belge hiç sağlanmadı, ya da engelleyici bir kontrol karşılanmadı.",
                        "**Onaylandı** — yukarıdakilerin hiçbiri."
                    ]
                },
                {
                    "p": "Pano kartı, durumun arkasındaki nedenleri listeler: her biri tıklanabilir ve sizi düzeltilmesi gereken yere götürür."
                },
                {
                    "note": "Aynı durum müşterinizin satın alma sistemleri tarafından da okunur. Bu nedenle süresi dolmuş zorunlu bir belge yalnızca turuncu bir etiket göstermekle kalmaz, bir siparişi de engelleyebilir."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "İmza nasıl çalışır",
            "summary": "Önce okumanız, ardından imzalamanız istenir. İmza tarayıcınız tarafından değil, beCPG tarafından uygulanır.",
            "blocks": [
                {
                    "p": "Bir İmza görevi, belgeyi portala yerleşik bir görüntüleyicide açar. Dosya portaldan asla çıkmaz ve telefonda da kullanılabilir kalır."
                },
                {
                    "ol": [
                        "**Belgenin tamamını okuyun.** Okuma ilerlemesi sayfa sayfa izlenir: bir sayfa görüntülenmediği sürece imzalama kullanılamaz.",
                        "**İmzanızı çizin**; parmağınızla, fareyle veya kalemle, müşterinizin hazırladığı yerlere. İmza ve paraf alanları önceden konumlandırılmıştır: bunları yerleştirmeniz gerekmez.",
                        "**Onay kutusunu işaretleyin**, ardından gönderin. Görev bir kez gönderilir."
                    ]
                },
                {
                    "p": "beCPG belgeyi kendi sunucusunda imzalar, imzalı sürümü arşivler ve alıcılara e-postayla gönderir. Portal kendi adına hiçbir sertifika düzenlemez."
                },
                {
                    "note": "Gönderim sırasında bağlantı kesilirse yeniden deneyin: istek benzersiz bir kimlik taşır, bu nedenle iki kez ulaşan bir istek iki kez imzalamaz. Önceden imzalanmış bir belge, yeniden imzalamanız istenmek yerine indirme bağlantısıyla birlikte imzalı olarak gösterilir."
                },
                {
                    "warn": "Bir imza portaldan reddedilemez veya geri alınamaz. Belge hatalıysa imzalamayın: tartışmayı açın ve müşterinize bildirin."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Müşterinizin açıklamaları nereye düşer",
            "summary": "Her kart için tek bir konuşma, ancak her mesaj ilgili olduğu öğeye bağlanır.",
            "blocks": [
                {
                    "p": "Bir kartın tartışması her iki tarafta da aynıdır: müşterinizin beCPG'den yazdıkları size burada ulaşır, yanıtlarınız da onlara orada ulaşır. Takip edilecek ayrı bir posta kutusu yoktur."
                },
                {
                    "p": "Bir mesaj üç yere bağlanabilir; panelin üstündeki seçici hangisini okuyacağınızı veya hedefleyeceğinizi seçmenizi sağlar:"
                },
                {
                    "ul": [
                        "**Kartın tamamı** — bir alana veya tablo satırına bırakılan açıklamalar dahil, konuşmanın tamamı. Varsayılan görünüm budur.",
                        "**Bir alan** — \"yasal unvan eksik\". Asistanda o alanın yanında bir baloncuk görünür.",
                        "**Bir tablo satırı** — \"doymuş yağ değeri hatalı\". Açıklama satır numarasını değil, satırın kendisini takip eder."
                    ]
                },
                {
                    "note": "\"Kartın tamamı\" yerine bir alandan veya satırdan yazmak herkese zaman kazandırır: irtibat kişiniz, iki yüz alan arasında aramadan neden bahsettiğinizi hemen görür."
                },
                {
                    "p": "Listeleme kapatıldığında tartışma salt okunur hale gelir: yazışmayı yeniden okuyabilirsiniz ancak ekleme yapamazsınız. Ekran hangi nedenin geçerli olduğunu size bildirir."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Tartışmalar"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "Kime başvurmalı",
            "summary": "İrtibat kişiniz müşterinizdir. Karta bağlı tartışma doğru kanaldır.",
            "blocks": [
                {
                    "p": "Bu portal sizin için müşteriniz tarafından açılır: beklenen belgeleri, asistan adımlarını, doğrulamaları ve son tarihleri o yapılandırır. Bu nedenle içerikle ilgili her konuda ilk muhatabınız odur."
                },
                {
                    "ul": [
                        "**Bir kartla ilgili soru, açıklama, düzeltme, dondurması kaldırılacak liste** — karta veya göreve bağlı tartışmayı kullanın. Mesajınız dosyanızı takip eden kişiye ulaşır ve ilgili ürüne bağlı kalır.",
                        "**Açık bir gerekçe olmadan reddedilen bir belge** — yeniden yüklemeden önce ürün tartışmasında yanıt verin.",
                        "**Karşılayamayacağınız bir son tarih** — görevin gecikmesine izin vermek yerine bunu tartışmada belirtin.",
                        "**Bir erişim sorunu** (parola, eklenecek bir iş arkadaşı, kapatılacak bir hesap) — müşterideki irtibat kişiniz aracılığıyla ilerleyin: hesaplar bu portaldan değil, onların tarafında oluşturulur ve kapatılır."
                    ]
                },
                {
                    "note": "Beyan ettiğiniz kişiler ve müşterinizin irtibat kişileri, tedarikçi kartınızın Kişiler sekmesinde listelenir."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Tartışmalar"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Şirketim"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Spesifikasyonlar"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Hoş geldiniz",
        "intro": "Tedarikçi alanınıza erişmek için oturum açın: görevleriniz, ürünleriniz, belgeleriniz ve onay durumunuz.",
        "chooseTenant": "Müşterinizi seçin",
        "chooseTenantHelp": "Birden fazla beCPG müşterisi için mi çalışıyorsunuz? Dosyasını açmak istediğiniz müşteriyi seçin.",
        "sso": "Müşterinizin kimlik doğrulama hizmetine yönlendirileceksiniz.",
        "testNotice": "TEST ortamı — burada girilen veriler bağlayıcı değildir.",
        "help": "Yardım mı gerekiyor?",
        "errorTitle": "Oturum açılamadı",
        "pitch": "beCPG tedarikçi portalı",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Listeleme talepleriniz ve görevleriniz tek bir yerde"
            },
            {
                "icon": "folder_shared",
                "text": "Belgeleriniz ve sertifikalarınız, son geçerlilik tarihleriyle"
            },
            {
                "icon": "verified",
                "text": "Müşteriniz tarafından güncel tutulan onay durumunuz"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "Bu müşteri için kimlik doğrulama yapılandırılmamış.",
        "tenant_mismatch": "Oturumunuz başka bir müşteriye aitti. Lütfen yeniden oturum açın.",
        "dev_auth_misconfigured": "Geliştirme modu açık ancak yanlış yapılandırılmış.",
        "session_expired": "Oturumunuzun süresi doldu. Lütfen yeniden oturum açın."
    },
    "app/messages/page#LABELS": {
        "title": "Tartışmalar",
        "subjects": "Konular",
        "messageCount": "{count} mesaj",
        "search": "Konu ara",
        "myRecord": "Tedarikçi kaydım",
        "back": "Konular",
        "placeholder": "Bir mesaj yazın…",
        "send": "Gönder",
        "sending": "Gönderiliyor…",
        "empty": "Mesaj yok",
        "emptyHint": "Tartışmayı başlatın — müşteriye bildirim gönderilecek.",
        "noSubject": "Bir konu seçin",
        "noSubjectHint": "Yazışmaları görmek için bir ürün veya kaydınızı seçin.",
        "noSubjects": "Tartışma konusu yok",
        "noSubjectsHint": "Tartışmalar ürünlerinize bağlıdır. Şu anda size bağlı bir ürün yok.",
        "field": "Alan",
        "edited": "düzenlendi",
        "you": "Siz",
        "openSubject": "Kartı aç",
        "thread": "Tartışma",
        "more": "Daha fazla yükle",
        "loading": "Yükleniyor…",
        "tooLong": "Mesaj çok uzun (en fazla 20.000 karakter).",
        "denyReasons": {
            "noAssignedTask": "Listeleme kapatıldı: bu tartışma salt okunur.",
            "readAccess": "Bu kartta yalnızca okuma erişiminiz var.",
            "noPermission": "Bu tartışmaya yazma yetkiniz yok."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Projeler",
        "notFound": "Proje bulunamadı",
        "notFoundHint": "Bu proje mevcut değil, bir tedarikçi projesi değil veya kapsamınızın dışında.",
        "kpi": {
            "response": "Yanıt oranı",
            "age": "Açık kalma süresi",
            "due": "Son tarih",
            "tasks": "Açık görevler"
        },
        "hints": {
            "days": "{count} g",
            "noDue": "Son tarih yok",
            "overdue": "{count} g gecikmiş",
            "dueIn": "{count} g içinde",
            "late": "{count} gecikmiş",
            "unanswered": "Açıldığından beri yanıt yok"
        },
        "tasks": "Açık görevler",
        "tasksEmpty": "Bu projede açık görev yok.",
        "tasksHint": "İş akışının neyi ve kimden beklediği.",
        "noAssignee": "Atanmamış",
        "entities": "Projenin konusu",
        "entitiesHint": "Girilen verileri ve tartışmasını okumak için kartı açın.",
        "entitiesEmpty": "Bu proje hiçbir karta başvurmuyor.",
        "unreadable": "Kapsamınızın dışında",
        "open": "Aç",
        "suppliers": "Tedarikçiler",
        "manager": "Yönetici",
        "discussion": "Proje tartışması",
        "state": "Durum"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Projeler",
        "subtitle": "Açık listeleme ve yenileme projeleri. Tedarikçilerine hatırlatma göndermek veya üst kademeye iletmek için projeleri seçin.",
        "stats": {
            "open": "Açık projeler",
            "openState": "Projeler · {state}",
            "response": "Yanıt oranı",
            "unanswered": "Yanıt yok",
            "reminders": "Gönderilecek hatırlatmalar"
        },
        "hints": {
            "scanned": "{count} tarandı",
            "meanCompletion": "Ortalama ilerleme %{value}",
            "escalations": "{count} üst kademeye iletilecek",
            "late": "{count} gecikmiş",
            "noEscalation": "Üst kademeye iletme gerekmiyor",
            "answered": "{count} yanıtlandı"
        },
        "startCampaign": "Proje başlat",
        "allOpen": "Tüm açık projeler",
        "state": "Proje durumu",
        "sortLabel": "Sıralama",
        "sorts": {
            "dueDate": "En yakın son tarih",
            "completion": "En düşük yanıt oranı",
            "age": "En uzun süredir açık",
            "name": "Ad"
        },
        "searchSupplier": "Tedarikçiye göre filtrele",
        "truncated": "Tarama penceresi: beCPG bir listelemeyi 250 satırla sınırlar ve {scanned} proje okundu. Bu sayfadaki sıralama ve toplamlar bu pencereyi kapsar — eksiksiz bir görünüm için durumu veya kapsamı daraltın.",
        "scopeEmpty": "Bu kapsama uyan tedarikçi yok. Kapsama hiçbir proje bağlanamaz: yukarıdaki sayaçlar ölçüm değil, tanım gereği sıfırdır.",
        "parkScoped": "Sayaçlar filtrelenmiş kapsamla sınırlıdır ({count} tedarikçi).",
        "noRate": "Puanlanacak proje yok",
        "unsupported": "Standart beCPG modeli tarafından desteklenmeyen filtre(ler): {names}. Bunları müşteri tarafında yapılandırın.",
        "pageOf": "{from}-{to} / {total} proje",
        "previous": "Önceki",
        "next": "Sonraki",
        "rows": "Satır",
        "reminder": "Portaldaki açık projeniz hâlâ yanıtınızı bekliyor. Lütfen size atanan görevleri en kısa sürede tamamlayın.",
        "hintTargets": "Seçilen projelerin tedarikçileri",
        "noteReminder": "beCPG hatırlatma günlüğü tutmaz: \"Son hatırlatma\" sütunu, gerçekte mevcut olan en yakın bilgi olan projedeki son etkinliği gösterir.",
        "truncatedShort": "Pencere: {scanned} proje okundu"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Belge uygunluğu",
        "views": "Uygunluk görünümleri",
        "matrixView": "Matris",
        "sceneView": "3B görünüm",
        "subtitle": "Tedarikçi × belge türü matrisi. Toplu hatırlatma göndermek için hücreleri veya satırları seçin.",
        "search": "Tedarikçi ara",
        "allTypes": "Tüm belge türleri",
        "allStatuses": "Tüm durumlar",
        "mandatoryOnly": "Yalnızca zorunlu belgeler",
        "export": "Dışa aktar",
        "stats": {
            "suppliers": "Tedarikçiler",
            "missing": "Eksik",
            "expired": "Süresi doldu",
            "expiring": "Yenilenecek",
            "refused": "Reddedildi"
        },
        "statuses": {
            "valid": "Geçerli",
            "expiring": "Süresi yakında doluyor",
            "expired": "Süresi doldu",
            "missing": "Eksik",
            "refused": "Reddedildi",
            "toValidate": "İnceleniyor"
        },
        "truncatedShort": "Pencere: {scanned} tedarikçi okundu",
        "truncated": "Portföy tarama penceresinden büyük ({scanned} / {total} tedarikçi): eksiksiz bir matris için filtreleri daraltın.",
        "scopeEmpty": "Bu kapsama uyan tedarikçi yok. Hiçbir belge sorgusu çalıştırılmadı: yukarıdaki sayaçlar ölçüm değil, tanım gereği sıfırdır.",
        "cellsScope": "hücre · portföydeki {total} tedarikçi üzerinden",
        "statusScope": "Görüntüleme filtresi “{status}”: bu sayfada gösterilen {shown} satırdan {kept} satır tutuldu. Yukarıdaki sayaçlar bu sayfayı değil, portföydeki {total} tedarikçiyi kapsar.",
        "unsupported": "Standart beCPG modeli tarafından desteklenmeyen filtre(ler): {names}. Bunları müşteri tarafında yapılandırın.",
        "pageOf": "{from}-{to} / {total} tedarikçi",
        "previous": "Önceki",
        "next": "Sonraki",
        "rows": "Satır",
        "reminder": "Tedarikçi dosyanızda portalda güncellenmesi gereken belgeler var: {types}. Lütfen bunları en kısa sürede yükleyin.",
        "reminderGeneric": "Tedarikçi dosyanızda eksik veya süresi dolmuş zorunlu belgeler var. Lütfen bunları portalda güncelleyin.",
        "hintTypes": "Hedeflenen {count} belge türü"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Tedarikçi izleme — beCPG",
        "metaDescription": "Tedarikçi portföyüne genel bakış: belge uygunluğu ve projeler",
        "title": "İzleme alanı",
        "denied": "İzleme alanı iç ekiplere ayrılmıştır",
        "deniedGroups": "Hesabınız, izleme alanını açan beCPG gruplarının hiçbirine ait değil: {groups}. Üyelik için beCPG yöneticinize başvurun.",
        "backSupplier": "Panoma git"
    },
    "app/monitor/page#LABELS": {
        "title": "Tedarikçi portföyü izleme",
        "description": "Tedarikçi portföyünüzün onayı, doküman uygunluğu, süre bitişleri, projeleri ve uygunsuzlukları, gerçek zamanlı.",
        "generatedAt": "{time} itibarıyla veriler",
        "truncated": "Portföy tarama penceresinden büyük: {total} tedarikçiden {scanned} tanesi okundu. “≈” ile işaretli sayaçlar sınırlandırılmıştır; dağılım ve ilk 10 bu pencereyi kapsar.",
        "truncatedShort": "Pencere: {scanned} tedarikçi okundu",
        "tablist": "Portföy okuması",
        "tabs": {
            "quality": "Kalite",
            "purchasing": "Satın alma",
            "rnd": "Ar-Ge",
            "csr": "KSS",
            "assistant": "Asistan"
        },
        "ai": "YZ"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Tedarikçi ürünleri",
        "subtitle": "Bir tedarikçiye emanet edilen ürünler. Yenilenmesi gerekenleri görmek için sertifika tarihine göre filtreleyin.",
        "search": "Ürün, kod, yasal unvan ara…",
        "state": "Ürün durumu",
        "anyState": "Tüm durumlar",
        "certified": "Sertifika tarihi",
        "anyCertified": "Tüm tarihler",
        "certifiedNone": "Tarih yok",
        "certifiedYears": "{count} yıldan uzun süre önce sertifikalandırıldı",
        "columns": {
            "name": "Ürün",
            "code": "Kod",
            "supplierRef": "Tedarikçi referansı",
            "suppliers": "Tedarikçi(ler)",
            "plants": "Tedarikçi tesisleri",
            "state": "Durum",
            "certificate": "Sertifika tarihi",
            "modified": "Güncellenme"
        },
        "age": "{count} yıl önce",
        "ageMonths": "{count} ay önce",
        "none": "—",
        "empty": "Bu kapsamda ürün yok",
        "emptyHint": "Bu filtrelerle tedarikçi özelliğini taşıyan ürün yok. Ürünler, kendilerine bir tedarikçi bağlandığı anda burada görünür.",
        "pageOf": "{from} - {to} / {total}",
        "previous": "Önceki sayfa",
        "next": "Sonraki sayfa",
        "rows": "Sayfa başına satır",
        "sortScope": "Sıralama, portföyün tamamına değil, gösterilen sayfaya uygulanır.",
        "tiles": {
            "total": "Ürünler",
            "valid": "Onaylananlar",
            "draft": "Simülasyon",
            "noCertificate": "Listeleme tarihi olmayanlar"
        }
    },
    "app/monitor/quality/[id]/page#LABELS": {
        "back": "Uygunsuzluklar",
        "notFound": "Uygunsuzluk bulunamadı",
        "notFoundHint": "Mevcut değil veya kapsamınızın dışında.",
        "blocking": "Engelleyici",
        "priority": "Öncelik",
        "product": "Ürün",
        "suppliers": "Tedarikçiler",
        "batch": "Parti",
        "created": "Oluşturulma tarihi",
        "modified": "Güncellendi",
        "cost": "Maliyet",
        "discussion": "Tartışma"
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Uygunsuzluklar",
        "startNc": "Uygunsuzluk başlat",
        "subtitle": "Tedarikçi NC'leri, işlem süresi ve düzeltici faaliyet ilerlemesi. İlgili tedarikçilere hatırlatma göndermek, üst kademeye iletmek veya askıya almak için NC'leri seçin.",
        "stats": {
            "open": "Açık NC'ler",
            "blocking": "Engelleyici",
            "overdue": "Hedef aşıldı",
            "delay": "Ortalama süre"
        },
        "hints": {
            "total": "Toplam {count}",
            "blocking": "Onay durumunu \"askıya alındı\" yapar",
            "noBlocking": "NC nedeniyle engellenen onay yok",
            "actionsLate": "{count} düzeltici faaliyet gecikmiş",
            "noActionsLate": "Gecikmiş düzeltici faaliyet yok",
            "closing": "Ortalama kapanış {value} g",
            "noClosing": "Bu kapsamda kapatılmış NC yok",
            "closingHidden": "{count} kapalı uygunsuzluk · dahil etmek için tıklayın"
        },
        "dayUnit": "g",
        "allStates": "Tüm durumlar",
        "allTypes": "Tüm türler",
        "includeClosed": "Kapatılmış NC'leri dahil et",
        "searchSupplier": "Tedarikçiye göre filtrele",
        "truncatedShort": "Pencere: {scanned} uygunsuzluk okundu",
        "truncated": "Tarama penceresinden fazla NC var ({scanned} tarandı): eksiksiz bir görünüm için filtreleri daraltın.",
        "inexact": "Yaklaşık sayaçlar: motor en az bir sorgu için sınırlandırılmış bir toplam döndürdü.",
        "scopeEmpty": "Bu kapsama uyan tedarikçi yok. Hiçbir sorgu çalıştırılmadı: yukarıdaki sayaçlar ölçüm değil, tanım gereği sıfırdır.",
        "unsupported": "Standart beCPG modeli tarafından desteklenmeyen filtre(ler): {names}. Bunları müşteri tarafında yapılandırın.",
        "pageOf": "{from}-{to} / {total} NC",
        "previous": "Önceki",
        "next": "Sonraki",
        "rows": "Satır",
        "reminder": "Sizi ilgilendiren açık bir uygunsuzluk var. Lütfen ilgili düzeltici faaliyetleri portalda en kısa sürede ele alın.",
        "hintTargets": "Seçilen NC'lerin tedarikçileri",
        "note": "İşlem süresi: NC oluşturulduğundan beri; kapatılmış bir NC için oluşturulması ile son değiştirilmesi arasında — beCPG kapanış tarihi saklamaz."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "back": "Tedarikçiler",
        "notFound": "Tedarikçi bulunamadı",
        "notFoundHint": "Bu tedarikçi mevcut değil veya kapsamınızın dışında.",
        "tiles": {
            "label": "Tedarikçi göstergeleri",
            "nc": "Engelleyici NC'ler",
            "ncHint": "açık",
            "projects": "Devam eden projeler",
            "projectsHint": "{count} yanıtsız",
            "documents": "Zorunlu belgeler",
            "documentsHint": "{expired} süresi dolmuş · {missing} eksik",
            "documentsNone": "beklenen yok",
            "products": "Ürünler",
            "productsHint": "bağlı",
            "delay": "Yanıt süresi",
            "delayHint": "{period} ortalaması",
            "delayNone": "karar modülü",
            "completion": "Doluluk",
            "completionHint": "{count} aktif katalog",
            "completionNone": "aktif katalog yok",
            "days": "g"
        },
        "tabs": {
            "label": "Tedarikçi kartı",
            "overview": "Genel bakış",
            "nc": "Uygunsuzluklar",
            "projects": "Projeler",
            "documents": "Belgeler",
            "products": "Ürünler",
            "subSuppliers": "Alt tedarikçiler",
            "history": "Geçmiş"
        },
        "status": "Onay durumu",
        "statusHelp": "Durum her görüntülemede hesaplanır, asla saklanmaz: karşılanan ilk kural geçerlidir.",
        "risk": "Risk puanı",
        "riskHelp": "Her neden kendi ağırlığını ekler; her ek tekrar azalan bir ek puan ekler.",
        "riskFrom": "{from} itibarıyla",
        "reasonNames": {
            "documentExpired": "Süresi dolmuş belge",
            "blockingNc": "Engelleyici NC",
            "campaignNoAnswer": "Yanıtsız proje",
            "scoreDropping": "Düşen puan",
            "documentExpiring": "Süresi dolmak üzere olan belge",
            "lateTask": "Geciken görev",
            "lowCompletion": "Düşük doluluk",
            "documentMissing": "Eksik belge",
            "openNc": "Açık NC"
        },
        "activity": "Etkinlik ve yanıt verme hızı",
        "activityHelp": "Tedarikçiye verilen görevler ve yıllık ortalama yanıt süresi, karar modülünden okunur.",
        "identity": "Kimlik",
        "identityRows": {
            "code": "Kod",
            "erpCode": "ERP kodu",
            "legalName": "Ticari unvan",
            "state": "beCPG durumu",
            "family": "Aile",
            "subFamily": "Alt aile",
            "sites": "Tesisler",
            "subsidiaries": "Bağlı şirketler",
            "parent": "Ana tedarikçi",
            "catalogs": "Aktif kataloglar"
        },
        "scorecard": "Değerlendirme",
        "scorecardHelp": "Tedarikçinin son projelerinde puanlanan kriterlerin ağırlıklı ortalaması.",
        "allNc": "Tüm NC'leri",
        "startNc": "NC başlat",
        "exchanges": "Yazışmalar",
        "ncFile": "tedarikci-nc",
        "projectsFile": "tedarikci-projeler",
        "none": "—"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Tedarikçiler",
        "statuses": {
            "suspended": "Askıya alındı",
            "toRenew": "Yenilenecek",
            "inProgress": "Devam ediyor",
            "approved": "Onaylandı"
        },
        "statusFiltered": "Filtre etkin",
        "export": "Dışa aktar (CSV)",
        "exportCutTitle": "Eksik dışa aktarma: {total} satırdan {scanned} satır",
        "exportCutMessage": "beCPG bir listelemeyi sorgu başına 250 satırla sınırlar, bu nedenle dışa aktarma portföyün tamamını değil, okunan pencereyi kapsar. Eksiksiz bir dosya için filtreleri daraltın (aile, satın almacı, durum) ve gruplar halinde dışa aktarın.",
        "exportCutConfirm": "Pencereyi dışa aktar",
        "generatedAt": "{time} itibarıyla veriler",
        "windowOf": "{from}-{to} / {total} tedarikçi",
        "previous": "Önceki pencere",
        "next": "Sonraki pencere",
        "truncated": "Portföy tarama penceresinden büyük ({total} tedarikçiden {scanned} okundu): sıralama ve derecelendirme bu pencereyi kapsar. Portföy genelinde kesin bir sıralama için filtreleri daraltın.",
        "sortScope": "Okunan pencere içinde sıralandı",
        "sortedBy": "Açılış sıralaması: {sort}",
        "reminder": "Merhaba,\n\nTedarikçi dosyanızın güncellenmesi gerekiyor (eksik, süresi dolmuş veya beklemede olan zorunlu belgeler).\nTamamlamak için lütfen portalda oturum açın.\n\nSaygılarımızla,",
        "countsScope": "Okunan {scanned} tedarikçi üzerinden dağılım",
        "sortNames": {
            "risk": "risk, azalan",
            "name": "ad",
            "code": "kod",
            "status": "onay durumu",
            "completion": "doluluk",
            "expiring": "süresi dolmak üzere olan belgeler",
            "expired": "süresi dolmuş belgeler",
            "nc": "açık NC'ler",
            "lastActivity": "son etkinlik"
        },
        "truncatedShort": "Pencere: {scanned} tedarikçi okundu"
    },
    "app/not-found#LABELS": {
        "title": "Sayfa bulunamadı",
        "message": "Bu adres mevcut değil veya işaret ettiği öğeye artık erişilemiyor. Bir e-postadan geldiyseniz bağlantının süresi dolmuş olabilir.",
        "home": "Ana sayfaya dön"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Kart",
        "notFound": "Ürün bulunamadı",
        "notFoundHint": "Bu kart mevcut değil veya kapsamınızda değil.",
        "back": "Ürünlerim",
        "monitorBack": "Tedarikçi ürünleri",
        "versionTitle": "{date} tarihli {label} sürümü",
        "versionBy": "yazan: {author}",
        "versionBack": "Güncel sürüme dön",
        "versionFailed": "Bu sürüm okunamadı.",
        "request": "Güncelleme talep et",
        "startProject": "Proje başlat",
        "partial": "Bu kart eksik gösteriliyor: hesabınızın okuyamayabileceği en az bir veriye işaret ediyor. İlgili alanlar ekranda yer almıyor — bu, boş oldukları anlamına gelmez. Bunlardan birine ihtiyacınız varsa beCPG irtibat kişinizden erişim isteyin."
    },
    "app/products/page#LABELS": {
        "title": "Ürünlerim",
        "search": "Ürün ara",
        "allStates": "Tüm durumlar",
        "allTypes": "Tüm türler",
        "branch": "Güncelleme",
        "branchFrom": "{version} sürümünün güncellemesi",
        "columns": {
            "name": "Ürün",
            "code": "Kod",
            "type": "Tür",
            "state": "Durum",
            "completion": "Doluluk",
            "project": "Proje",
            "supplierRef": "Tedarikçi referansı",
            "certificateDate": "Sertifika tarihi",
            "modified": "Güncellenme",
            "actions": "İşlemler"
        },
        "stats": {
            "total": "Ürünler",
            "valid": "Doğrulandı",
            "pending": "Devam ediyor",
            "completion": "Ortalama doluluk"
        },
        "empty": "Ürün yok",
        "emptyHint": "Henüz size bağlı bir ürün yok. Müşteri bir kart atadığı anda burada görünür.",
        "request": "Güncelleme talep et"
    },
    "app/specs/page#LABELS": {
        "title": "Spesifikasyonlar",
        "stats": {
            "specs": "Spesifikasyonlar",
            "products": "Kapsanan ürünler"
        },
        "emptyHint": "Size açık bir spesifikasyon yok. Geçerli bir spesifikasyon varsa müşteri bunu paylaşacaktır."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Görev",
        "notFound": "Görev bulunamadı",
        "notFoundHint": "Bu görev artık mevcut değil, zaten işlenmiş veya kapsamınızda değil.",
        "back": "Görevlerim",
        "noEntity": "Bu görev hiçbir karta işaret etmiyor",
        "noEntityHint": "Bu göreve bağlı çıktı hiçbir ürüne başvurmuyor. Proje tartışması üzerinden müşterinizle iletişime geçin.",
        "documents": "Sağlanacak belgeler",
        "viewDocument": "Belgeyi görüntüle",
        "due": "Son tarih: {date}",
        "late": "Gecikmiş",
        "done": "Tamamlandı",
        "discussion": "Tartışma"
    },
    "app/tasks/page#LOCAL": {
        "title": "Görevlerim",
        "search": "Görev, ürün, kod ara…",
        "anyType": "Tüm türler",
        "anyPriority": "Tüm öncelikler",
        "anyProduct": "Tüm ürünler",
        "anyDue": "Tüm son tarihler",
        "dueLate": "Gecikmiş",
        "dueToday": "Bugün",
        "dueWeek": "7 gün içinde",
        "dueMonth": "30 gün içinde",
        "dueNone": "Son tarih yok",
        "stateOpen": "Devam ediyor",
        "stateDone": "Tamamlandı",
        "colTask": "Görev",
        "colProduct": "Ürün / müşteri",
        "colType": "Tür",
        "colPriority": "Öncelik",
        "colDue": "Son tarih",
        "colProgress": "İlerleme",
        "kpiTotal": "Görevler",
        "kpiLate": "Gecikmiş",
        "kpiReview": "İncelenecek",
        "kpiNext": "Sonraki son tarih",
        "kpiNone": "Yok",
        "reset": "Sıfırla",
        "empty": "Görev yok",
        "emptyHint": "Şu anda sizden beklenen bir şey yok.",
        "emptyFiltered": "Bu filtrelere uyan görev yok.",
        "truncated": "Yalnızca ilk görevler gösteriliyor. Geri kalanını görmek için filtreleri daraltın.",
        "scoped": "Kapsam: {supplier}.",
        "scopedAll": "Kapsam: tüm tedarikçiler.",
        "orphans": "{count} görev hiçbir tedarikçi kaydınıza bağlı değil ve burada listelenmiyor. Bunları görmek için sağ üst köşeden \"Tüm tedarikçiler\" seçeneğini seçin.",
        "priorityHigh": "Yüksek",
        "priorityMedium": "Orta",
        "priorityLow": "Düşük",
        "noPriority": "Öncelik yok",
        "untitled": "Başlıksız görev",
        "caption": "Görev listem"
    },
    "components/dashboard/taskTypes#TASK_TYPE_META.wizard": "Asistan",
    "components/dashboard/taskTypes#TASK_TYPE_META.signature": "İmza",
    "components/dashboard/taskTypes#TASK_TYPE_META.document": "Belge",
    "components/dashboard/taskTypes#TASK_TYPE_META.review": "İnceleme",
    "components/dashboard/taskTypes#TASK_TYPE_META.workflow": "İş akışı",
    "components/dashboard/DashboardKpis#REASONS": {
        "documentExpired": "Zorunlu belgenin süresi doldu",
        "documentExpiring": "Belgenin süresi dolmak üzere",
        "documentMissing": "Beklenen belge sağlanmadı",
        "documentRefused": "Belge reddedildi",
        "catalogIncomplete": "Eksik kayıt",
        "openProject": "Açık listeleme projesi",
        "openNonConformity": "Açık uygunsuzluk"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Tartışmalarım",
        "empty": "Tartışma yok",
        "emptyHint": "Müşterinizin görevleriniz ve ürünleriniz hakkındaki açıklamaları burada görünecek.",
        "all": "Tümünü gör",
        "messages": "{count} mesaj",
        "anonymous": "Kullanıcı",
        "onField": "{field} üzerinde",
        "unread": "Yeni",
        "unreadCount": "{count} okunmamış"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Belgelerim",
        "empty": "Beklenen belge yok",
        "emptyHint": "Müşterinizin talep ettiği sertifikalar burada görünecek.",
        "all": "Tümünü gör",
        "supplierScope": "Tedarikçi",
        "mandatory": "Zorunlu",
        "until": "{date} tarihine kadar",
        "expiredSince": "{days} g önce süresi doldu",
        "expiresIn": "{days} g içinde süresi doluyor",
        "noValidity": "Bitiş tarihi yok",
        "upload": "Yeni sürüm yükle",
        "uploadFirst": "Belgeyi yükle",
        "download": "İndir",
        "uploading": "Yükleniyor…",
        "uploaded": "Belge yüklendi. Şimdi müşterinizin doğrulamasını bekliyor."
    },
    "components/dashboard/NonConformityCard#LOCAL": {
        "title": "Açık uygunsuzluklar",
        "hint": "Müşteriniz tarafından kaydedildi; işlemleri için sizinle iletişime geçecektir.",
        "declared": "Bildirim tarihi: {date}",
        "priority": "Öncelik {level}"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Bildirimlerim",
        "empty": "Bildirim yok",
        "emptyHint": "Şu anda ilginizi gerektiren bir şey yok.",
        "overdue": "{days} g gecikmiş",
        "expiresIn": "{days} g içinde",
        "types": {
            "task.overdue": "Gecikmiş görev",
            "document.expired": "Süresi dolmuş belge",
            "document.expiring": "Yenilenecek belge",
            "document.missing": "Eksik belge",
            "document.refused": "Reddedilmiş belge"
        },
        "assigned": "Bana atanan",
        "mandatory": "Zorunlu",
        "isNew": "Yeni",
        "scopeEmpty": {
            "noSupplierIdentity": "Hesabınız hiçbir tedarikçiye bağlı olmadığından belgeleriniz belirlenemiyor. Yalnızca görevleriniz listeleniyor. Bunu müşterideki irtibat kişinize bildirin.",
            "internalAccount": "İç hesap: belge uyarıları belgeyi sağlamakla yükümlü tedarikçiyi izler, bu nedenle zilinizde yalnızca görevleriniz listelenir. Portföy genelindeki görünüm Belge uygunluğu altındadır.",
            "fallback": "Hesap kapsamınız boş: bazı uyarılar hesaplanamıyor."
        },
        "countTitle": "{total} beklemede · en acil {shown} tanesi aşağıda"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Ürünlerim",
        "empty": "Ürün yok",
        "emptyHint": "Müşterinizin size emanet ettiği ürünler burada görünecek.",
        "all": "Tümünü gör",
        "updatedOn": "{date} tarihinde güncellendi",
        "request": "Güncelleme talep et",
        "noCompletion": "Puanlanmadı",
        "completion": "Doluluk"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Onaylandı",
        "ToValidate": "Onay bekliyor",
        "Refused": "Düzeltilecek",
        "Simulation": "Simülasyon",
        "Stopped": "Durduruldu",
        "Archived": "Arşivlendi"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Görevlerim",
        "empty": "Devam eden görev yok",
        "emptyHint": "Her şey güncel. Yeni müşteri talepleri burada görünecek.",
        "all": "Tümünü gör",
        "overdue": "{days} g gecikmiş",
        "overdueToday": "Bugün son gün",
        "dueIn": "{days} g içinde",
        "noDue": "Son tarih yok",
        "priorityHigh": "Yüksek",
        "priorityMedium": "Orta",
        "priorityLow": "Düşük",
        "progress": "İlerleme",
        "untitled": "Başlıksız görev"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Satırı düzenle",
        "create": "Yeni satır",
        "save": "Kaydet",
        "cancel": "İptal",
        "refused": "Satır kaydedilmedi. Zorunlu alanları kontrol edip yeniden deneyin."
    },
    "components/datalist/renderers/signals#RENDERER_LABELS": {
        "formulated": "Formüle edilmiş değer",
        "requirementBroken": "Gereklilik karşılanmadı",
        "claimDescription": "Beyanın açıklaması",
        "nutrientDetails": "Besin öğesi ayrıntıları ({country})",
        "roundedFor": "Mevzuata göre yuvarlanmış değer: {country}",
        "valueLine": "Değer: {value}",
        "toleranceMin": "Asgari tolerans: {value}",
        "toleranceMax": "Azami tolerans: {value}",
        "minimum": "Asgari değer: {value}",
        "maximum": "Azami değer: {value}",
        "gda": "% RA: {value}",
        "perServing": "Porsiyon başına değer: {value}",
        "missingSources": "Bu beyanı içermeyen {count} kaynak",
        "missingSourcesList": "Bu beyanı içermeyen kaynaklar:",
        "omitted": "Beyandan çıkarılan bileşen",
        "packagingLevel": {
            "Primary": "Birincil",
            "Inner": "İç ambalaj",
            "Secondary": "İkincil",
            "Tertiary": "Üçüncül"
        }
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} satır",
        "addRow": "Satır ekle",
        "deleteRow": "Satırı sil",
        "editRow": "Satırı düzenle",
        "moveUp": "Yukarı taşı",
        "moveDown": "Aşağı taşı",
        "actions": "Eylemler",
        "order": "Sıra",
        "row": "Satır {index}",
        "newRow": "Yeni satır",
        "totalRow": "Toplam satırı, beCPG tarafından hesaplanır",
        "incomplete": "Bu satırı kaydetmek için zorunlu alanları doldurun",
        "sortBy": "{column} sütununa göre sırala",
        "saving": "Kaydediliyor…",
        "saved": "Kaydedildi",
        "discard": "Değişiklikleri iptal et",
        "failed": "Kaydetme başarısız oldu",
        "retry": "Yeniden dene",
        "deleting": "Siliniyor…",
        "search": "Listede ara",
        "readOnly": "Salt okunur",
        "frozenTitle": "Müşteriniz tarafından doğrulanmış liste",
        "frozenText": "Müşteriniz bu listeyi doğruladı: liste artık donduruldu ve değiştirilemez. Bir düzeltme gerekiyorsa proje tartışması üzerinden yeniden açılmasını isteyin.",
        "readAccessTitle": "Yalnızca görüntüleme",
        "readAccessText": "Bu varlıkta yalnızca okuma erişiminiz var.",
        "noTaskTitle": "Açık görev yok",
        "noTaskText": "Düzenleme yalnızca size bir görev atanmışken açıktır. Bu liste görünür kalır.",
        "wizardReadOnlyTitle": "Salt okunur asistan",
        "wizardReadOnlyText": "Bu asistan görüntüleme için yapılandırılmıştır: hiçbir değişiklik yapılamaz.",
        "protectedTitle": "Korumalı alan",
        "protectedText": "\"{column}\" sütunu korumalıdır: değeri müşterinizin uygunluk kontrollerini besler. Değiştirmek istediğinizi lütfen onaylayın.",
        "protectedUnlock": "Yine de değiştir",
        "protectedLocked": "Korumalı alan — kilidi açmak için tıklayın",
        "deleteTitle": "Bu satır silinsin mi?",
        "deleteText": "Bu satır listeden kalıcı olarak kaldırılacak.",
        "expand": "Ayrıntıları göster",
        "collapse": "Ayrıntıları gizle",
        "nestedEmpty": "Öğe yok",
        "empty": "Bu liste boş",
        "emptyHint": "Başlamak için ilk satırı ekleyin.",
        "emptyReadOnly": "Müşteriniz bu listede satır beklemiyor.",
        "mandatory": "Zorunlu alan",
        "detail": "Ayrıntı",
        "duplicate": "Bu satırı çoğalt",
        "select": "Seç",
        "selectRow": "{index}. satırı seç",
        "selectAll": "Bu sayfadaki tüm satırları seç",
        "selected": "{count} satır seçildi",
        "clearSelection": "Seçimi temizle",
        "bulkMoveUp": "Yukarı taşı",
        "bulkMoveUpLong": "Seçimi yukarı taşı",
        "bulkMoveDown": "Aşağı taşı",
        "bulkMoveDownLong": "Seçimi aşağı taşı",
        "bulkDuplicate": "Çoğalt",
        "bulkDuplicateLong": "Seçimi çoğalt",
        "bulkDelete": "Sil",
        "bulkDeleteLong": "Seçimi sil",
        "accessDenied": "Erişim reddedildi",
        "accessDeniedRow": "Bu satır, hesabınızın okuyamayacağı bir özellik içeriyor: burada düzenlenemez.",
        "bulkEdit": "Düzenle",
        "bulkEditLong": "Seçimi düzenle",
        "bulkEditTitle": "{count} satırı düzenle",
        "bulkEditPickFields": "Doldurulacak alanlar",
        "bulkEditSearchField": "Alan ara",
        "bulkEditApply": "{count} satıra uygula",
        "bulkEditCancel": "İptal",
        "bulkEditEmptyClears": "İşaretlenip boş bırakılan bir alan, değeri her satırda temizler.",
        "bulkEditSkipped": "Seçilen {count} satır düzenlenemez ve olduğu gibi bırakılacak.",
        "bulkEditTooMany": "{count} satır seçildi, en fazla {max} seçilebilir. Seçimi daraltın.",
        "bulkEditNoColumn": "Bu listenin hiçbir sütunu toplu olarak doldurulamaz.",
        "deleteSelectedTitle": "{count} satır silinsin mi?",
        "deleteSelectedText": "Bu satırlar listeden kalıcı olarak kaldırılacak.",
        "rowsPerPage": "Sayfa başına satır",
        "shortcuts": "Klavye kısayolları",
        "shortcutsTitle": "Klavyeyle veri girişi",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "sonraki / önceki hücre"
            ],
            [
                "Enter",
                "satırı kaydeder ve aynı sütunda aşağı iner"
            ],
            [
                "Son satırda Enter",
                "satır ekler"
            ],
            [
                "↑ / ↓",
                "aynı sütun, üstteki / alttaki satır"
            ],
            [
                "Esc",
                "düzenlenen satırdaki değişiklikleri iptal eder"
            ],
            [
                "Ctrl+Enter",
                "satır ekler"
            ],
            [
                "Ctrl+D",
                "geçerli satırı çoğaltır"
            ],
            [
                "Ctrl+V",
                "bir hesap tablosundan hücre bloğu yapıştırır"
            ]
        ],
        "pasteTitle": "Hesap tablosundan yapıştırıldı",
        "pasteApplied": "{rows} satıra {cells} değer yapıştırıldı, bunlardan {created} tanesi yeni.",
        "pasteNothing": "Hiçbir şey yapıştırılamadı.",
        "pasteUndo": "Yapıştırmayı geri al",
        "pasteSave": "{count} satırı kaydet",
        "pasteResolving": "Etiketler aranıyor…",
        "pasteUnmatched": "{count} değer alınmadı — bunları elle düzeltin:",
        "pasteExtraColumns": "Listenin son sütunundan sonra yapıştırılan {count} sütun: yok sayıldı.",
        "pasteRefusedRows": "Listenin sonundan sonra {count} satır: bu liste yeni satır kabul etmiyor.",
        "pasteLine": "satır {line}",
        "pasteReasons": {
            "number": "bir sayı bekleniyordu",
            "integer": "bir tam sayı bekleniyordu",
            "boolean": "evet / hayır bekleniyordu",
            "date": "bir tarih bekleniyordu (gg/aa/yyyy)",
            "list": "önerilen listenin dışında bir değer",
            "readonly": "sütun değiştirilemez",
            "association": "referans verilerde tam eşleşme yok"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Yüklenen belgeler",
        "subtitle": "Türü ne olursa olsun bu ürünün klasöründeki dosyalar.",
        "empty": "Yüklenmiş dosya yok",
        "emptyHint": "Bu ürünün klasöründe henüz belge yok.",
        "signed": "İmzalı",
        "download": "İndir",
        "consult": "Görüntüle",
        "modified": "{date} tarihinde değiştirildi"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Bir dosyayı buraya bırakın",
        "or": "veya",
        "browse": "Gözat",
        "deposit": "Yükle",
        "renew": "Yenile",
        "replace": "Değiştir",
        "uploading": "Yükleniyor…",
        "analysing": "Belge analiz ediliyor…",
        "done": "Dosya yüklendi",
        "doneHint": "Müşteri tarafından incelenecek. Sizden başka bir şey beklenmiyor.",
        "retry": "Yeniden dene",
        "cancel": "İptal",
        "tooLarge": "Dosya çok büyük ({size}). En fazla: {max}.",
        "badType": "Desteklenmeyen biçim ({name}). Beklenen: {accept}.",
        "empty": "Dosya boş.",
        "failed": "Yükleme başarısız oldu.",
        "locked": "Yükleme kullanılamıyor",
        "accepted": "Biçimler: {accept} — en fazla {max}",
        "aiValid": "AI tarafından kontrol edildi",
        "aiToValidate": "Kontrol edilecek",
        "aiRefused": "AI tarafından reddedildi",
        "aiOn": "{date} tarihinde analiz edildi",
        "selected": "Seçilen dosya",
        "validityHint": "Belgenin üzerinde yazan geçerlilik tarihleri.",
        "validityInverted": "Bitiş tarihi başlangıç tarihinden önce.",
        "validityMissing": "Dosyayı yüklemeden önce geçerlilik sonunu doldurun.",
        "validityNotApplied": "Dosya yüklendi ancak geçerlilik tarihleri kaydedilmedi. Bunları belge satırında doldurun."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "{from} - {to} arasında geçerli",
        "from": "{from} tarihinden beri geçerli",
        "to": "{to} tarihine kadar geçerli",
        "none": "Geçerlilik tarihi yok",
        "required": "Geçerlilik doldurulacak",
        "expired": "Geçerlilik {to} tarihinde sona erdi",
        "fromLabel": "Geçerlilik başlangıcı",
        "toLabel": "Geçerlilik sonu",
        "edit": "Düzenle",
        "setDates": "Doldur",
        "save": "Kaydet",
        "cancel": "İptal",
        "saved": "Geçerlilik kaydedildi",
        "inverted": "Bitiş tarihi başlangıç tarihinden önce.",
        "hint": "Yüklediğiniz belgenin üzerinde yazan tarihler."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Belge",
        "download": "İndir",
        "close": "Kapat",
        "unsupported": "Bu dosya türü için önizleme yok",
        "unsupportedHint": "Bu biçim tarayıcıda önizlenemez. Okumak için indirin.",
        "failed": "Belge görüntülenemedi",
        "failedHint": "Yine de indirilebilir.",
        "signed": "Elektronik olarak imzalandı",
        "signedBy": "{name}, {date}",
        "pending": "İmza sürüyor",
        "validated": "{date} tarihinde onaylandı",
        "validatedBy": "{name} tarafından {date} tarihinde onaylandı"
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Sağlanacak",
        "refused": "Reddedildi",
        "toValidate": "İnceleniyor",
        "valid": "Geçerli",
        "validUntil": "{date} tarihine kadar geçerli",
        "expiredOn": "{date} tarihinde süresi doldu",
        "expiredSince": "{days} gün önce süresi doldu",
        "expiresToday": "Bugün süresi doluyor",
        "expiresIn": "{days} gün içinde süresi doluyor",
        "noDate": "Geçerlilik tarihi yok",
        "from": "Başlangıç",
        "to": "bitiş",
        "since": "Başlangıç",
        "until": "Bitiş"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Zorunlu",
        "satisfied": "Sağlandı",
        "upload": "Yükle",
        "renew": "Yenile",
        "replace": "Değiştir",
        "download": "İndir",
        "consult": "Görüntüle",
        "details": "Ayrıntılar",
        "hide": "Gizle",
        "of": "{done} / {total} zorunlu belge",
        "allDone": "Her şey güncel",
        "allDoneHint": "Şu anda sizden beklenen bir şey yok.",
        "nothing": "Belge gereksinimi yok",
        "nothingHint": "Müşteri bu kapsam için henüz beklenen bir belge tanımlamadı.",
        "openCount": "{count} ele alınacak",
        "blockingCount": "{count} zorunlu belge düzeltilecek",
        "category": "Kategori",
        "readOnly": "Bu kartta yükleme kapalı.",
        "noEntity": "Tedarikçi belgeleri",
        "aiHints": "Analiz notları",
        "deposit": "Dosya yükle",
        "file": "Dosya"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "İmzalı belge",
        "signedAt": "İmzalanma tarihi",
        "download": "İndir",
        "search": "İmzalı belge ara",
        "empty": "İmzalı belge yok",
        "emptyHint": "Görevlerinizden imzaladığınız belgeler burada görünür.",
        "truncated": "Kısmi liste: imzalı belgelerin tamamı okunamadı."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Değer ekle",
        "remove": "Bu değeri kaldır"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Doldurulacak alan yok",
        "emptyHint": "Bu formun yapılandırması hiçbir alan döndürmüyor."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Ara…",
        "hint": "Verileri filtrelemek için ad veya kod girin",
        "loading": "Aranıyor…",
        "noResult": "Sonuç yok",
        "clear": "Temizle",
        "remove": "Kaldır",
        "browse": "Değerleri göster",
        "error": "Arama başarısız oldu",
        "errorUnconfigured": "Bu alan için yapılandırılmış bir değer listesi yok. Bunu müşterideki irtibat kişinize bildirin.",
        "showing": "{total} öğeden 1 - {count} arası gösteriliyor",
        "favourite": "Favori"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Evet",
        "no": "Hayır",
        "empty": "(boş)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} diğer dil",
        "less": "Diğer dilleri gizle",
        "required": "müşteri tarafından zorunlu",
        "missing": "{count} zorunlu dil hâlâ boş"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "gün",
        "mo": "ay",
        "y": "yıl"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Birim"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Evet",
        "no": "Hayır",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Seçin…",
        "offList": "değer listede yok",
        "empty": "Önerilen değer yok"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "bayt"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Bu alan zorunludur.",
        "validation.number": "Bir sayı girin.",
        "validation.integer": "Bir tam sayı girin.",
        "validation.date": "Geçerli bir tarih girin.",
        "validation.boolean": "Evet veya hayır girin.",
        "validation.list": "Listeden bir değer seçin.",
        "validation.regex": "Beklenen biçime uyulmuyor.",
        "validation.min": "Değer {min} veya daha büyük olmalıdır.",
        "validation.max": "Değer {max} veya daha küçük olmalıdır.",
        "validation.range": "Değer {min} ile {max} arasında olmalıdır.",
        "validation.minLength": "En az {min} karakter girin.",
        "validation.maxLength": "En fazla {max} karakter girin."
    },
    "components/monitor/AiDrafts#LABELS": {
        "draft": "AI ile tedarikçi bazında kişiselleştir",
        "drafting": "Mesajlar yazılıyor…",
        "unavailable": "AI asistanı bu örnekte kullanılamıyor.",
        "common": "Ortak bir mesaja dön",
        "none": "AI hiçbir mesaj önermedi.",
        "help": "Her tedarikçiye kendi dilinde, gecikmiş veya eksik olanlara göre bir mesaj. Göndermeden önce okuyun ve düzenleyin."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} tedarikçi seçildi",
        "selectedPlural": "{count} tedarikçi seçildi",
        "clear": "Seçimi temizle",
        "overflow": "Yalnızca ilk {max} tanesi işlenecek.",
        "loading": "Eylemler yükleniyor…",
        "unavailable": "Profiliniz için kullanılabilir eylem yok.",
        "actions": {
            "remind": "Hatırlat",
            "escalate": "Üst kademeye ilet",
            "suspend": "Askıya al"
        },
        "targets": "İlgili tedarikçiler",
        "report": "Eylem sonucu",
        "reportOk": "{count} tedarikçi başarıyla işlendi.",
        "reportKo": "{count} başarısız:",
        "reportSkipped": "{count} tedarikçi dışarıda bırakıldı: {max} sınırının üzerinde.",
        "reportNone": "Hiçbir tedarikçi işlenmedi.",
        "close": "Kapat",
        "errors": {
            "notFound": "Tedarikçi kapsamınızın dışında"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Proje",
            "suppliers": "Tedarikçiler",
            "response": "Yanıt oranı",
            "age": "Süre",
            "silence": "Son hatırlatma",
            "due": "Son tarih",
            "reminders": "Hatırlatmalar",
            "follow": "Takip",
            "manager": "Sorumlu"
        },
        "days": "{count} g",
        "since": "{count} gündür açık",
        "lastActivity": "Son etkinlik {date}",
        "silenceDays": "{count} g önce",
        "silenceToday": "Bugün",
        "silenceHint": "beCPG hatırlatma günlüğü tutmaz: bu sütun, gerçekte mevcut olan en yakın bilgi olan projedeki son etkinliği (cm:modified) gösterir.",
        "noSilence": "Tarihli etkinlik yok",
        "noAnswer": "Yanıt yok",
        "late": "Gecikmiş",
        "onTrack": "Zamanında",
        "toRemind": "Hatırlatılacak",
        "toEscalate": "Üst kademeye iletilecek",
        "lateTasks": "{late} / {open} görev gecikmiş",
        "noTasks": "Açık görev yok",
        "dueIn": "{count} g içinde",
        "overdue": "{count} g gecikmiş",
        "noDue": "Son tarih yok",
        "others": "+{count}",
        "empty": "Bu kapsamda açık proje yok",
        "projectStates": {
            "Planned": "Planlandı",
            "InProgress": "Devam ediyor",
            "OnHold": "Beklemede",
            "Completed": "Tamamlandı",
            "Cancelled": "İptal edildi"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Tedarikçi",
        "types": "{count} belge türü",
        "notApplicable": "Bu tedarikçi için geçerli değil",
        "mandatory": "Zorunlu",
        "legend": "Açıklama",
        "expected": "{count} bekleniyor",
        "selectRow": "{name} seç",
        "selectCell": "{name} için {type} seç",
        "download": "İndir",
        "preview": "Görüntüle",
        "empty": "Bu kapsamda tedarikçi yok",
        "emptyHint": "Matrisi görmek için filtreleri genişletin.",
        "noColumns": "Bu kapsamda somutlaştırılmış belge türü yok",
        "noColumnsHint": "beCPG beklenen belgeleri formülasyon sırasında somutlaştırır: yapılandırılmış bir belge gereksinimi yoksa matris boştur.",
        "toggle": "Belgeleri göster",
        "summary": "{missing} eksik · {expired} süresi dolmuş · {expiring} yenilenecek",
        "completeness": "%{value} uygun",
        "status": {
            "missing": "Eksik",
            "expired": "Süresi dolmuş",
            "refused": "Reddedildi",
            "expiring": "Yenilenecek",
            "toValidate": "Onaylanacak",
            "valid": "Geçerli"
        }
    },
    "components/monitor/DocumentScene#LABELS": {
        "relief": "Kabartma",
        "constellation": "Takımyıldız",
        "mode": "Görüntüleme modu",
        "filters": "Gösterilen durumlar",
        "statuses": {
            "expired": "Süresi doldu",
            "missing": "Eksik",
            "refused": "Reddedildi",
            "expiring": "Süresi yakında doluyor",
            "toValidate": "Doğrulanacak",
            "valid": "Geçerli"
        },
        "aria": "Tedarikçiler ve beklenen belgeler, üç boyutlu",
        "rotate": "Döndürmek için sürükleyin",
        "zoom": "Yakınlaştırmak için kaydırın",
        "pick": "İşlem yapmak için bir tedarikçiye tıklayın",
        "pickTitle": "Sahnede bir tedarikçiye tıklayın",
        "waiting": "{count} belge bekliyor",
        "waitingAxis": "Bekleyen",
        "family": "Aile",
        "severity": "Önem derecesi",
        "noFamily": "Ailesiz",
        "openSheet": "Kartı aç",
        "view": "Görüntüle",
        "empty": "Bu kapsamda beklenen belge yok"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Geçerli",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Simülasyon",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Doğrulanacak",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Reddedildi",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Arşivlendi",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Durduruldu",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Tedarikçi, kod, yasal unvan ara…",
        "toggle": "Daha fazla filtre",
        "reset": "Sıfırla",
        "close": "Filtreleri gizle",
        "legend": "Portföy filtreleri",
        "family": "Aile",
        "subFamily": "Alt aile",
        "site": "Tesis",
        "subsidiary": "Bağlı şirket",
        "market": "Pazar",
        "state": "Tedarikçi durumu",
        "any": "Tümü",
        "windowScoped": "pencereyle sınırlı",
        "windowScopedHelp": "Alfresco ilişkileri dizinlemez: bu filtre portföyün tamamına değil, halihazırda okunmuş tedarikçilere uygulanır.",
        "unsupported": "yapılandırılmamış",
        "unsupportedHelp": "Hiçbir standart beCPG özelliği bu kavramı taşımıyor. Özelliği izleme yapılandırmasında bildirerek müşteri tarafında etkinleştirin.",
        "noVocabulary": "Yüklenen kapsamda değer yok",
        "active": "{count} etkin filtre",
        "activePlural": "{count} etkin filtre",
        "clearOne": "Bu filtreyi kaldır",
        "anyFamily": "Tüm aileler",
        "anySubFamily": "Tüm alt aileler",
        "anyState": "Tüm durumlar"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Uygunsuzluk",
            "suppliers": "Tedarikçiler",
            "state": "Durum",
            "priority": "Öncelik",
            "delay": "İşlem süresi",
            "actions": "Düzeltici faaliyetler",
            "cost": "Maliyet"
        },
        "states": {
            "new": "Yeni",
            "analysis": "Analiz",
            "treatment": "İşlem",
            "response": "Yanıt",
            "classification": "Sınıflandırma",
            "closing": "Kapanış",
            "closed": "Kapatıldı"
        },
        "types": {
            "NonConformity": "Uygunsuzluk",
            "Claim": "Şikâyet"
        },
        "priorities": {
            "1": "Yüksek",
            "2": "Orta",
            "3": "Düşük"
        },
        "blocking": "Engelleyici",
        "blockingHint": "Yüksek öncelikli ve hâlâ açık: türetilmiş onay durumunu \"askıya alındı\" yapan budur (hesaplanır, asla saklanmaz).",
        "days": "{count} g",
        "openSince": "{count} gündür açık",
        "overdue": "İşlem hedefi aşıldı",
        "closedIn": "{count} günde ele alındı",
        "closedApprox": "beCPG kapanış tarihi saklamaz: kapatılmış bir NC'nin süresi, oluşturulması ile son değiştirilmesi arasında ölçülür.",
        "createdOn": "{date} tarihinde oluşturuldu",
        "noDelay": "Oluşturma tarihi yok",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} gecikmiş",
        "noActions": "Faaliyet yok",
        "noActionsHint": "beCPG'de bu NC'ye bağlı işlem görevi yok — eylem planı henüz açılmadı.",
        "actionState": {
            "done": "tamamlandı",
            "late": "gecikmiş",
            "open": "devam ediyor"
        },
        "andMore": "… ve {count} tane daha",
        "others": "+{count}",
        "noSupplier": "Bağlı tedarikçi yok",
        "empty": "Bu kapsamda uygunsuzluk yok",
        "open": "Bu uygunsuzluğu aç"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Kalite",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Belge uygunluğu, uygunsuzluklar, sertifikalar, denetimler",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Satın alma",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Onay durumu (siparişi engeller), puan, yanıt verme hızı",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "Ar-Ge",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Teknik veri doluluğu, kataloglar, spesifikasyonlar",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "KSS",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Sertifikalar, menşeler, KSS soru formları",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "İş görünümü",
        "hint": "Aynı portföy, dört farklı okuma. Kartları ve sütunları yeniden sıralar."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} süresi dolmuş belge",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} süresi dolmak üzere olan belge",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} eksik belge",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} engelleyici NC",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} açık NC",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "Yanıtsız {count} proje",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} gecikmiş görev",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Düşük doluluk (%{score})",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Puan düşüyor",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} listeleme devam ediyor",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Engelleyici katalog karşılanmadı",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Kritik",
    "components/monitor/RiskList#RISK_LEVELS.high": "Yüksek",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Orta",
    "components/monitor/RiskList#RISK_LEVELS.low": "Düşük",
    "components/monitor/RiskList#LABELS": {
        "title": "Risk altındaki ilk 10 tedarikçi",
        "empty": "Bu kapsamda risk altında tedarikçi yok",
        "emptyHint": "Süresi dolmuş belge, engelleyici NC veya yanıtsız proje tespit edilmedi.",
        "riskScore": "Risk puanı {score}",
        "level": "{level} risk",
        "lastActivity": "Son etkinlik: {date}",
        "completion": "Doluluk %{value}",
        "openSheet": "Kartı aç",
        "actions": {
            "remind": "Hatırlat",
            "escalate": "Üst kademeye ilet",
            "suspend": "Askıya al"
        },
        "dialog": {
            "remindTitle": "{target} için hatırlatma",
            "escalateTitle": "{target} üst kademeye ilet",
            "suspendTitle": "{target} askıya al",
            "messageLabel": "Mesaj",
            "messageHelp": "Tedarikçinin portalda ve beCPG'de okuduğu tartışma dizisine gönderilir.",
            "escalateHelp": "Tedarikçinin açık projesine dahili olarak gönderilir; asla tedarikçinin okuduğu diziye değil.",
            "messageLang": "Mesaj dili",
            "supplierLang": "tedarikçi dili",
            "messageRequired": "Mesaj zorunludur.",
            "suspendWarning": "Onay durumu anlık olarak türetilir, asla saklanmaz: bu eylem \"askıya alındı\" yazmaz. Müşterinin askıya alma sürecini başlatır. beCPG engelleyici NC'yi kaydettiğinde durum kendiliğinden değişir.",
            "suspendIrreversible": "Başlatılan bir süreç portaldan iptal edilemez. Seçimi kontrol edin.",
            "process": "Başlatılacak süreç",
            "noProcess": "Bu ortamda hiçbir askıya alma sürecine izin verilmiyor (PORTAL_PROCESS_TEMPLATES).",
            "targets": "Hedeflenen {count} tedarikçi:",
            "send": "Gönder",
            "suspendConfirm": "Askıya almayı başlat"
        },
        "result": {
            "ok": "{count} eylem yürütüldü.",
            "partial": "{ok} başarılı, {failed} başarısız.",
            "failed": "Hiçbir eylem başarılı olmadı."
        },
        "defaults": {
            "remind": "Merhaba,\n\nTedarikçi dosyanızın güncellenmesi gerekiyor: {reasons}.\nTamamlamak için lütfen portalda oturum açın.\n\nSaygılarımızla,",
            "escalate": "Üst kademeye iletme: hatırlatmalara rağmen tedarikçi dosyası hâlâ anomali durumunda ({reasons}).\nLütfen konuyu devralın.",
            "genericReasons": "bekleyen belgeler ve son tarihler"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Proje başlat",
        "supplier": "Tedarikçi",
        "supplierPlaceholder": "Bir tedarikçi seçin…",
        "scope": "Kapsam",
        "scopeSupplier": "Tedarikçi kaydının kendisi",
        "scopeAll": "Bu tedarikçinin tüm ürünleri",
        "scopeOne": "Tek bir ürün",
        "entity": "Ürün",
        "entityPlaceholder": "Bir ürün seçin…",
        "process": "Proje şablonu",
        "processPlaceholder": "Bir şablon seçin…",
        "start": "Başlat",
        "cancel": "İptal",
        "starting": "Başlatılıyor…",
        "noEntity": "Bu tedarikçiye bağlı ürün yok: gönderilecek bir şey yok.",
        "noProcess": "Bu ortamda portala açık bir proje şablonu yok.",
        "countAll": "{count} ürün gönderilecek, her biri için bir proje.",
        "done": "{count} proje başlatıldı",
        "partial": "{done} başlatıldı, {failed} başarısız",
        "failedTitle": "Bu ürünler başlatılamadı",
        "countTruncated": "Burada {total} üründen yalnızca {count} tanesi listelenebilir: yalnızca bunlar gönderilecek.",
        "suppliersTruncated": "{total} tedarikçiden yalnızca {count} tanesi sunuluyor. Listede yoksa projeyi tedarikçinin sayfasından başlatın.",
        "atLeast": "en az {count}",
        "loadFailed": "Liste yüklenemedi.",
        "retry": "Yeniden dene"
    },
    "components/monitor/StartNcDialog#LABELS": {
        "title": "Uygunsuzluk başlat",
        "supplier": "Tedarikçi",
        "supplierPlaceholder": "Bir tedarikçi seçin…",
        "product": "Ürün",
        "productNone": "Belirli bir ürün yok",
        "batch": "Parti",
        "priority": "Öncelik",
        "priorities": {
            "1": "Yüksek (engelleyici)",
            "2": "Orta",
            "3": "Düşük"
        },
        "dueDate": "Son tarih",
        "description": "Açıklama",
        "cancel": "İptal",
        "start": "Başlat",
        "started": "Uygunsuzluk başlatıldı: beCPG kaydeder ve analizini açar."
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Puan kartı",
        "subtitle": "Kriterler, ağırlıklar ve puanlar — müşteri tarafında yapılandırılır",
        "weighted": "Ağırlıklı puan",
        "weightedHint": "{count} kriter · toplam ağırlık {weight}",
        "criterion": "Kriter",
        "weight": "ağırlık {weight}",
        "weightShare": "toplamın %{share}",
        "range": "ölçek {range}",
        "noScore": "Puanlanmadı",
        "scaleNote": "Ölçek, yapılandırmadan (veya gözlemlenen en yüksek puandan) çıkarılır: ham puan her zaman gösterilir.",
        "unavailable": "Bu tedarikçi için puan kartı yok",
        "unavailableHint": "Puan kartları, tedarikçi projelerinin taşıdığı puanlarla beslenir. Kapsamınızda puanlanmış proje bulunamadı.",
        "completion": "Katalog doluluğu",
        "completionSubtitle": "Tedarikçi varlıklarında etkin olan kataloglar",
        "completionEmpty": "Bu tedarikçide etkin katalog yok",
        "completionScore": "Ortalama doluluk",
        "approval": "Onay durumu",
        "approvalDerived": "Her görüntülemede yeniden hesaplanır",
        "history": "Eğilim",
        "historyUnavailable": "Geçmiş kullanılamıyor",
        "historyWhy": "beCPG karar modülü geçmişi sağlayamadı.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "BI modülü çalışıyor ancak henüz tedarikçileri ayırt etmiyor: tedarikçi ekseninin küpe eklenmesi ve şemanın yeniden yüklenmesi gerekiyor.",
            "supplierUnresolved": "Bu tedarikçi henüz BI modülünde değil: bir sonraki yeniden oluşturmada görünecek.",
            "noData": "BI modülü bu tedarikçiyi tanıyor ancak dönem için henüz veri noktası yok: geçmiş, beslendikçe dolar.",
            "unknownQuery": "İstenen seri portalda tanımlı değil: bu eksik veri değil, bir yapılandırma hatasıdır.",
            "unreachable": "beCPG karar modülü yanıt vermiyor: bu örnekte devre dışı veya sunucusuna ulaşılamıyor.",
            "denied": "Hesabınızın beCPG karar modülüne erişimi yok."
        },
        "historyNeeds": "Etkinleştirmek için BI tarafında gerekenler",
        "dimensions": "Boyutlar",
        "measures": "Ölçüler",
        "statusPartial": "kısmi",
        "statusMissing": "oluşturulacak",
        "trendLast": "Son nokta: {date} tarihinde {value}",
        "trendCaption": "Zaman içinde ağırlıklı puan"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Portföydeki tedarikçiler, onay durumu ve türetilmiş göstergeler",
        "columns": {
            "name": "Tedarikçi",
            "code": "Kod",
            "status": "Onay",
            "risk": "Risk",
            "completion": "Doluluk",
            "documentsExpired": "Süresi dolmuş bel.",
            "documentsExpiring": "Süresi dolacak bel.",
            "documentsMissing": "Eksik bel.",
            "openNc": "Açık NC'ler",
            "openProjects": "Projeler",
            "family": "Aile",
            "sites": "Tesisler",
            "lastActivity": "Son etkinlik"
        },
        "metrics": {
            "documentsExpired": "{count} zorunlu belgenin süresi doldu",
            "documentsExpiring": "{count} belgenin süresi dolmak üzere",
            "documentsMissing": "{count} zorunlu belge sağlanmadı",
            "openNc": "{count} açık uygunsuzluk",
            "openProjects": "{count} açık proje"
        },
        "none": "—",
        "empty": "Bu kapsamda tedarikçi yok",
        "emptyHint": "Filtreleri genişletin veya satın almacı kapsamınızı kontrol edin.",
        "emptyFiltered": "Bu filtrelere uyan tedarikçi yok.",
        "compare": "Karşılaştır",
        "compareTitle": "{count} tedarikçi karşılaştırılıyor",
        "compareCapped": "Karşılaştırma, seçilen ilk {max} tedarikçiyle sınırlıdır — bunun ötesinde sütunlar okunamaz hale gelir.",
        "compareRows": {
            "status": "Onay durumu",
            "reasons": "Nedenler",
            "risk": "Risk puanı",
            "completion": "Doluluk (kataloglar)",
            "documentsExpired": "Süresi dolmuş belgeler",
            "documentsExpiring": "Süresi dolmak üzere olan belgeler",
            "documentsMissing": "Eksik belgeler",
            "openNc": "Açık NC'ler",
            "openProjects": "Açık projeler",
            "state": "beCPG durumu",
            "family": "Aile",
            "sites": "Tesisler",
            "lastActivity": "Son etkinlik"
        },
        "openSheet": "Kartı aç",
        "selected": "{count} seçildi",
        "clear": "Seçimi temizle",
        "close": "Kapat",
        "noReason": "Risk nedeni yok"
    },
    "components/monitor/WorkflowTasks#LABELS": {
        "title": "Devam eden görevler",
        "none": "Devam eden görev yok",
        "pooled": "Üstlenilecek",
        "unassigned": "Atanmamış",
        "due": "Son tarih",
        "open": "Aç",
        "history": "Geçmiş ({count})",
        "hideHistory": "Geçmişi gizle",
        "doneBy": "yapan: {who}"
    },
    "components/monitor/cockpit/AssistantTab#LABELS": {
        "priorities": "Haftanın öncelikleri",
        "prioritiesHelp": "En riskli tedarikçiler üzerinde kurallarla hesaplanır: engelleyici uygunsuzluklu kritik risk, üst kademeye iletilecek; süresi dolmuş doküman, en az beş eksik doküman veya yanıtsız proje, hatırlatılacak.",
        "kinds": {
            "escalate": "Üst kademeye iletilecek",
            "remind": "Hatırlatılacak"
        },
        "score": "Risk {score}",
        "openSheet": "Kartı aç",
        "none": "Bu hafta bu kapsamda öncelik yok.",
        "copilot": "Yardımcı pilot",
        "wire": "beCPG tarafında bağlanacak",
        "copilotSoon": "Yardımcı pilot, beCPG asistanına bağlandığında portföyünüzle ilgili soruları yanıtlayacak.",
        "ask": "Portföyünüzle ilgili bir soru sorun…",
        "askLabel": "Yardımcı pilota soru"
    },
    "components/monitor/cockpit/CsrTab#LABELS": {
        "expected": "Beklenen sertifikalar",
        "expectedHelp": "Etiketi “sertifika” içeren doküman türleri, ilgili her tedarikçi için bir tane.",
        "valid": "Geçerli sertifikalar",
        "outOf": "/ {total}",
        "origins": "Beyan edilen menşeler",
        "surveys": "KSS anketleri",
        "notWired": "beCPG bu bilgiyi henüz portala sunmuyor.",
        "byType": "Doküman türüne göre uygunluk",
        "byTypeAria": "Türe göre doküman durumu",
        "byTypeHelp": "Her doküman türü için ilgili tedarikçi başına bir durum: dokümanlarının en olumsuzu.",
        "map": "Tedarik menşeleri",
        "mapEmpty": "Menşe ülkeleri ve tedarikçi tesisleri haritası.",
        "csv": {
            "type": "Doküman türü",
            "expected": "Beklenen"
        }
    },
    "components/monitor/cockpit/PurchasingTab#LABELS": {
        "approved": "Onaylı tedarikçiler",
        "outOf": "/ {total}",
        "openProjects": "Açık projeler",
        "answered": "Yanıtlanan",
        "unanswered": "Yanıtsız",
        "openProjectsHelp": "Tüm örneğin açık tedarikçi projeleri: bir proje bir tedarikçi altında tutulmaz, bu yüzden portföy filtreleri uygulanmaz.",
        "responseRate": "Yanıt oranı",
        "meanCompletion": "Ortalama ilerleme %{value}",
        "lateTasks": "Geciken görevler",
        "lateProjects": "{count} geciken proje",
        "composition": "Portföy bileşimi",
        "compositionAria": "Aile, alt aile ve onay durumuna göre tedarikçiler",
        "compositionHelp": "İç halka: aileler. Orta halka: alt aileler. Dış halka: onay durumu. Genişletmek için bir aileye tıklayın.",
        "reactivity": "Tedarikçi tepki hızı",
        "reactivityAria": "Yıllara göre görevler ve ortalama yanıt süresi",
        "reactivityHelp": "Çubuklar: bitiş yılına göre tedarikçi proje görevleri (logaritmik ölçek). Çizgi: gün cinsinden ortalama yanıt süresi.",
        "tasks": "Görevler",
        "delay": "Ort. yanıt süresi (gün)",
        "days": "Gün",
        "taskStates": "Tedarikçi proje görevleri",
        "taskStatesAria": "Duruma göre görevler",
        "taskStatesHelp": "Karar destek modülünden okunan tüm tedarikçi proje görevleri, duruma göre (logaritmik ölçek)."
    },
    "components/monitor/cockpit/QualityTab#LABELS": {
        "health": "Portföy sağlığı",
        "healthAria": "Sağlık endeksi 100 üzerinden {value}",
        "healthOutOf": "100 üzerinden",
        "healthHelp": "100 üzerinden endeks: %35 onay oranı, %35 doküman uygunluğu, %20 projelere yanıt oranı, %10 engelleyici uygunsuzluğu olmayan tedarikçi payı.",
        "healthPartial": "Kısmi hesaplama, ağırlıklar yeniden dağıtıldı: {missing} kullanılamıyor.",
        "weights": {
            "approval": "Onay %{weight}",
            "compliance": "Uygunluk %{weight}",
            "response": "Yanıt %{weight}",
            "noBlockingNc": "Engelleyici uygunsuzluk yok %{weight}"
        },
        "inputs": {
            "approval": "onay oranı",
            "compliance": "doküman uygunluğu",
            "response": "yanıt oranı",
            "noBlockingNc": "engelleyici uygunsuzluğu olmayan pay"
        },
        "compliance": "Doküman uygunluğu",
        "compliant": "Uygun",
        "complianceHelp": "Geçerli zorunlu dokümanların kapsamda beklenen zorunlu dokümanlara oranı.",
        "complianceNoRate": "Oran kullanılamıyor: bir sayaç beCPG okuma sınırına ulaştı.",
        "openNc": "Açık uygunsuzluklar",
        "suspended": "Askıya alınan tedarikçiler",
        "outOf": "/ {total}",
        "toReview": "Gözden geçirilecek dokümanlar",
        "toReviewHelp": "Onaylanacak ve süresi dolmuş dokümanlar, tedarikçi ve doküman türü başına bir tane.",
        "riskMap": "Risk haritası",
        "riskMapAria": "Risk puanı ve açık projelere göre tedarikçiler",
        "riskMapHelp": "Yatay: açık projeler. Dikey: risk puanı. Boyut: anomaliler (eksik ve süresi dolmuş dokümanlar, engelleyici uygunsuzluklar). Kartını açmak için bir tedarikçiye tıklayın.",
        "openProjects": "Açık projeler",
        "riskScore": "Risk puanı",
        "anomalies": "Boyut: anomaliler",
        "priorities": "Öncelikli bölge",
        "bubble": "Risk {score} · {projects} açık proje · {anomalies} anomali",
        "ncAge": "Açık uygunsuzlukların yaşı",
        "ncAgeAria": "Yaşa göre açık uygunsuzluklar",
        "ncUndated": "Oluşturma tarihi olmayan {count} uygunsuzluk",
        "csv": {
            "rank": "Sıra",
            "supplier": "Tedarikçi",
            "code": "Kod",
            "status": "Onay",
            "level": "Risk seviyesi",
            "score": "Risk puanı",
            "reasons": "Nedenler",
            "openProjects": "Açık projeler",
            "anomalies": "Anomaliler"
        }
    },
    "components/monitor/cockpit/RndTab#LABELS": {
        "progress": "{year} ortalama ilerleme",
        "progressNoYear": "Ortalama ilerleme",
        "projects": "{count} proje",
        "tasksInProgress": "Devam eden görevler",
        "tasksPlanned": "{count} planlanan",
        "technicalSheets": "Eksik teknik föyler",
        "technicalSheetsHint": "{toValidate} onaylanacak · {expired} süresi dolmuş",
        "technicalSheetsHelp": "Etiketi “teknik föy” içeren doküman türleri, ilgili her tedarikçi için bir tane.",
        "activeFiles": "Aktif dosyalar",
        "activeSince": "{date} tarihinden beri son etkinlik",
        "activeHelp": "Önceki çeyreğin başından beri değiştirilen tedarikçiler.",
        "projectProgress": "Proje ilerlemesi",
        "projectProgressAria": "Yıllara göre proje sayısı ve ortalama ilerleme",
        "projectProgressHelp": "Çubuklar: son değişiklik yılına göre projeler. Çizgi: % cinsinden ortalama ilerleme.",
        "projectsSeries": "Projeler",
        "averageSeries": "Ortalama ilerleme (%)",
        "landscape": "Portföy görünümü",
        "landscapeAria": "Aile ve onay durumuna göre tedarikçiler",
        "landscapeHelp": "Aile ve onay durumuna göre tedarikçiler. Tarayıcı izin verirse 3B görünüm, aksi halde gruplanmış çubuklar.",
        "freshness": "Dosya güncelliği",
        "freshnessAria": "Son etkinlik ayına göre tedarikçiler",
        "recent": "{date} tarihinden beri aktif",
        "older": "Daha eski",
        "undated": "Etkinlik tarihi olmayan {count} tedarikçi",
        "fromCube": "beCPG karar destek modülünden okunur, toplu iş ile beslenir."
    },
    "components/monitor/cockpit/parts#LABELS": {
        "export": "Dışa aktar",
        "soon": "Bağlanacak",
        "decisionModule": "Karar destek modülü",
        "chartFailed": "Grafik yüklenemedi.",
        "window": "Tarama penceresi: rakamlar okunan tedarikçileri kapsar.",
        "unavailable": "Veri kullanılamıyor",
        "empty": "Gösterilecek bir şey yok",
        "reasons": {
            "denied": "beCPG bu bilgiye erişimi reddetti.",
            "notFound": "Bilgi beCPG’de bulunamadı.",
            "unavailable": "beCPG bu blok için yanıt vermedi. Birazdan tekrar deneyin.",
            "noMatchingDocumentType": "Bu kapsamda eşleşen doküman türü yok.",
            "noData": "Bu kapsam için veri yok."
        }
    },
    "components/monitor/cockpit/vocabulary#VOCABULARY": {
        "approval": {
            "approved": "Onaylı",
            "inProgress": "Devam ediyor",
            "toRenew": "Yenilenecek",
            "suspended": "Askıya alınan"
        },
        "documents": {
            "valid": "Geçerli",
            "expiring": "Yakında sona eriyor",
            "toValidate": "Onaylanacak",
            "expired": "Süresi dolmuş",
            "refused": "Reddedilen",
            "missing": "Eksik"
        },
        "taskStates": {
            "planned": "Planlanan",
            "inProgress": "Devam eden",
            "completed": "Tamamlanan",
            "cancelled": "İptal edilen",
            "refused": "Reddedilen",
            "onHold": "Beklemede"
        },
        "ncAges": {
            "under3Months": "< 3 ay",
            "from3To12Months": "3-12 ay",
            "from1To2Years": "1-2 yıl",
            "over2Years": "> 2 yıl"
        },
        "nc": {
            "blocking": "Engelleyici",
            "nonBlocking": "Engelleyici olmayan"
        },
        "noFamily": "Ailesiz",
        "noSubFamily": "Alt ailesiz"
    },
    "components/monitor/supplier/ActivityChart#LABELS": {
        "tasks": "Görevler",
        "delay": "Ortalama yanıt süresi (g)",
        "days": "g",
        "aria": "Bu tedarikçi için yıllara göre görevler ve ortalama yanıt süresi"
    },
    "components/monitor/supplier/RiskScore#LABELS": {
        "ring": "Risk puanı 100 üzerinden {score}, seviye {level}",
        "none": "Risk nedeni yok",
        "scale": "Seviye ölçeği",
        "contributions": "Puanı oluşturanlar",
        "points": "+{points}"
    },
    "components/monitor/supplier/SheetLists#LABELS": {
        "documents": {
            "search": "Belge ara",
            "document": "Belge",
            "mandatory": "Zorunlu",
            "validity": "Geçerlilik",
            "status": "Durum",
            "entity": "Bağlı olduğu öğe",
            "download": "İndir",
            "empty": "Beklenen veya sağlanan belge yok",
            "file": "tedarikci-belgeler",
            "yes": "Evet",
            "no": "Hayır"
        },
        "products": {
            "search": "Ürün ara",
            "product": "Ürün",
            "code": "Kod",
            "state": "Durum",
            "completion": "Doluluk",
            "modified": "Güncellendi",
            "empty": "Bağlı ürün yok",
            "file": "tedarikci-urunler"
        },
        "subSuppliers": {
            "search": "Alt tedarikçi ara",
            "supplier": "Alt tedarikçi",
            "code": "Kod",
            "state": "beCPG durumu",
            "file": "alt-tedarikciler"
        },
        "activity": {
            "empty": "Kayıtlı yazışma yok",
            "message": "Mesaj",
            "activity": "Etkinlik"
        },
        "unavailable": "beCPG bu listeyi getiremedi: liste bu tedarikçi hakkında bir şey söylemiyor."
    },
    "components/monitor/supplier/StatusLadder#LABELS": {
        "current": "Karşılanan kural",
        "next": "Ardından",
        "approvedWhen": "Onaylanma koşulu",
        "approvedNow": "Tüm koşullar karşılandı",
        "seeAll": "{count} öğenin tümünü gör",
        "days": "{count} g",
        "on": "{name} üzerinde",
        "conditions": {
            "documentExpired": "Süresi dolmuş zorunlu belge yok",
            "blockingNc": "Engelleyici NC yok",
            "documentExpiring": "Yenilenecek belge yok",
            "openProject": "Açık proje yok",
            "documentMissing": "Eksik zorunlu belge yok",
            "blockingCatalog": "Engelleyici kataloglar karşılandı"
        },
        "met": "karşılandı",
        "unmet": "karşılanmadı",
        "progress": "{total} koşuldan {met} tanesi karşılandı"
    },
    "components/monitor/supplier/SupplierBand#LABELS": {
        "erp": "ERP {code}",
        "risk": "Risk {level} · {score}",
        "created": "Oluşturulma",
        "lastActivity": "Son etkinlik",
        "startProject": "Proje başlat",
        "openInBecpg": "beCPG'de aç",
        "actions": "Tedarikçi işlemleri",
        "parent": "Bağlı olduğu:",
        "group": "{count} alt tedarikçi"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Uygunluk",
        "overall": "Doluluk",
        "complete": "Eksiksiz",
        "incomplete": "Eksik",
        "missing": "Eksik alanlar",
        "missingCount": "{count} eksik alan",
        "duplicates": "Zaten kullanılan değerler",
        "duplicateOn": "Kullanan",
        "duplicateUnnamed": "{count} diğer ürün",
        "protectedFields": "Bu katalogdaki {count} alan müşteriniz tarafından doldurulur",
        "protectedFieldsHint": "Puana dahildirler ancak sizden istenmezler: bunları siz değil, müşteriniz girer.",
        "none": "Geçerli katalog yok",
        "noneHint": "Bu ürün için yapılandırılmış bir uygunluk kataloğu yok, dolayısıyla geçilecek bir doluluk kontrolü de yok.",
        "allComplete": "Tüm kataloglar eksiksiz",
        "allCompleteHint": "Veri tarafında bu ürünün doğrulanmasını engelleyen bir şey yok.",
        "missingHint": "%100'e ulaşmak için aşağıdaki alanları doldurun — doğrulamayı engelleyenler bunlardır.",
        "goToField": "Alana git",
        "notScored": "Puanlanmadı"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Tamamlanma",
        "noScore": "Henüz değerlendirilmedi",
        "notCounted": "puana dahil değil",
        "more": "+ {count} katalog daha"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Kod",
        "branch": "Güncelleme devam ediyor",
        "branchFrom": "{version} sürümünün güncellemesi",
        "branchTitle": "Bu kart, listeleme için oluşturulmuş bir çalışma kopyasıdır.",
        "branchTitleLocked": "Bu kart, listeleme için oluşturulmuş çalışma kopyasıdır. Onaylanmış sürüm müşteri tarafında mevcuttur ancak ona okuma erişiminiz yok.",
        "erpCode": "ERP kodu",
        "supplier": "Tedarikçi",
        "subsidiary": "Bağlı şirket",
        "project": "Proje",
        "modified": "Güncellenme",
        "created": "Oluşturulma tarihi",
        "version": "Sürüm",
        "legalName": "Yasal unvan",
        "back": "Ürünlerim",
        "types": {
            "bcpg:rawMaterial": "Hammadde",
            "bcpg:finishedProduct": "Bitmiş ürün",
            "bcpg:semiFinishedProduct": "Yarı mamul",
            "bcpg:localSemiFinishedProduct": "Yerel yarı mamul",
            "bcpg:packagingMaterial": "Ambalaj",
            "bcpg:packagingKit": "Ambalaj seti",
            "bcpg:supplier": "Tedarikçi",
            "bcpg:productSpecification": "Spesifikasyon",
            "qa:nc": "Uygunsuzluk"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Kart",
        "compliance": "Uygunluk",
        "documents": "Belgeler",
        "specs": "Spesifikasyonlar",
        "sections": "Kart bölümleri",
        "noProperties": "Görüntülenecek özellik yok",
        "noPropertiesHint": "Bu ürünün özellikleri asistan yapılandırması tarafından sunulmuyor.",
        "rawProperties": "Özellikler",
        "rawNotice": "Teknik etiketler: bu ürün için asistan yapılandırması kullanılamıyor.",
        "noData": "Sağlanan veri yok",
        "noDataHint": "Bu bölümde bu ürün için satır yok.",
        "configTitle": "Yapılandırma kullanılamıyor",
        "configHint": "Bu bölümün yapılandırması yüklenemedi. Diğer sekmeler kullanılabilir durumda.",
        "yes": "Evet",
        "no": "Hayır",
        "versionLoading": "Sürüm okunuyor…",
        "versionUnavailable": "Sürümlerde saklanmaz",
        "versionUnavailableHint": "Bu bölüm kartın güncel sürümünde görüntülenir.",
        "versionRows": "{count} satır"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Bu kartta açık bir görev var",
        "many": "Bu kartta birden fazla açık görev var",
        "open": "Görevi aç",
        "all": "Bu ürünün görevlerini gör",
        "untitled": "Başlıksız görev"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Güncelleme talep et",
        "template": "Talep türü",
        "templatePlaceholder": "Seçin…",
        "noTemplate": "Müşteriniz tedarikçilere hiçbir talep türü açmamış. Mesajlar bölümünden ona yazın.",
        "reason": "Talep nedeni",
        "reasonHint": "Yeni reçete, yeni menşe, yeni üretim tesisi, yeni teknik föy…",
        "submit": "Talebi gönder",
        "sent": "Talep gönderildi. Sizin için bir güncelleme görevi açıldı."
    },
    "components/products/VersionPicker#LABELS": {
        "open": "Kart sürümleri",
        "current": "güncel",
        "failed": "Geçmiş okunamadı.",
        "none": "Önceki sürüm yok",
        "by": "yazan: {author}"
    },
    "components/review/AiPrecheck#LABELS": {
        "title": "AI ön doğrulaması",
        "running": "Kart okunuyor…",
        "verdicts": {
            "blocking": "Doğrulamadan önce düzeltilecek",
            "toCheck": "Kontrol edilecek noktalar",
            "clear": "Engelleyici nokta yok"
        },
        "severities": {
            "error": "Hata",
            "warning": "Kontrol edilecek",
            "ok": "Uygun"
        },
        "addToFeedback": "Geri bildirime ekle",
        "added": "Eklendi",
        "open": "Bölümü aç",
        "proposed": "Tedarikçiye önerilen geri bildirim",
        "reformulate": "Yeniden ifade et",
        "translate": "Çevir",
        "useMessage": "Bu mesajı kullan",
        "help": "AI kartı sizden önce okur: değerlerin tutarlılığı, kütle dengesi, alerjenler, zorunlu belgeler. Hiçbir karar vermez: her nokta kontrol edilmelidir ve geri bildirime ekleyen sizsiniz.",
        "failed": "Ön doğrulama tamamlanmadı.",
        "retry": "Yeniden dene"
    },
    "components/review/ReviewChanges#LABELS": {
        "title": "Referanstan bu yana {count} değişiklik",
        "none": "Referanstan bu yana değişiklik yok",
        "added": "Eklendi",
        "removed": "Kaldırıldı",
        "empty": "boş",
        "flag": "İşaretle",
        "flagged": "İşaretlendi",
        "flagText": "kontrol edilecek ({before} → {after})",
        "addedText": "satır eklendi, kontrol edilecek",
        "removedText": "satır kaldırıldı, kontrol edilecek",
        "show": "Değişiklikleri göster",
        "hide": "Değişiklikleri gizle"
    },
    "components/review/ReviewWorkspace#LABELS": {
        "due": "Son tarih: {date}",
        "late": "Gecikmiş",
        "comparedBranch": "Doğrulanmış kartla karşılaştırıldı",
        "comparedVersion": "{date} tarihli {label} sürümüyle karşılaştırıldı",
        "noReference": "İlk sürüm: karşılaştırılacak bir şey yok",
        "progress": "{total} bölümden {done} tanesi incelendi",
        "validateHint": "\"Kartı doğrula\", her bölüm kabul edildiğinde etkinleşir",
        "sendBack": "Tedarikçiye geri gönder ({count})",
        "validate": "Kartı doğrula",
        "sections": "İncelenecek bölümler",
        "compliance": "Uygunluk",
        "accepted": "kabul edildi",
        "returned": "düzeltme istendi",
        "toRead": "incelenecek",
        "legendChanged": "referanstan bu yana değişiklikler",
        "aiPoints": "AI tarafından tespit edilen noktalar",
        "frozen": "Doğrulanmış liste",
        "accept": "Kabul et ve devam et",
        "acceptLast": "Kabul et",
        "askCorrection": "Düzeltme iste",
        "correctionPlaceholder": "Tedarikçinin bu bölümde düzeltmesi gerekenler…",
        "addRemark": "Geri bildirime ekle",
        "cancel": "İptal",
        "returnTitle": "Tedarikçiye geri bildirim",
        "returnEmpty": "Düzeltme istenmedi. Bir satırı işaretleyin veya bir bölüm için düzeltme isteyin.",
        "remove": "Kaldır",
        "messageLabel": "Tedarikçiye gönderilen mesaj",
        "messageIntro": "Merhaba,\n\n\"{name}\" kartı doğrulanmadan önce lütfen şunları düzeltin:",
        "messageOutro": "\n\nSaygılarımızla,",
        "sendBackTitle": "Kart tedarikçiye geri gönderilsin mi?",
        "sendBackConfirm": "Geri gönder",
        "validateTitle": "Kart doğrulansın mı?",
        "validateMessage": "Görev tamamlanır ve proje bir sonraki adıma geçer.",
        "sent": "Kart tedarikçiye geri gönderildi.",
        "validated": "Kart doğrulandı.",
        "discussion": "Tedarikçiyle yazışmalar",
        "closed": "Bu görev kapandı: inceleme salt okunurdur."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Menüyü aç",
        "account": "Hesabım",
        "home": "beCPG — portal ana sayfası"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Daha fazla",
        "menu": "Menü",
        "close": "Menüyü kapat",
        "supplierSpace": "Tedarikçi alanı",
        "monitorSpace": "İzleme alanı",
        "collapse": "Menüyü daralt",
        "expand": "Menüyü genişlet"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Bildirimler",
        "panel": "Bildirimler",
        "close": "Kapat",
        "refresh": "Yenile",
        "markRead": "Okundu olarak işaretle",
        "countOne": "1 bekleyen bildirim",
        "countMany": "{count} bekleyen bildirim",
        "countNone": "Bildirim yok",
        "updatedAt": "{time} itibarıyla güncellendi",
        "more": "ve {count} tane daha — \"Belgelerim\" ve \"Görevlerim\" bölümlerine bakın",
        "moreTasks": "ve {count} tane daha — \"Görevlerim\" bölümüne bakın",
        "allTasks": "Görevlerim",
        "allDocuments": "Belgelerim"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Tüm tedarikçiler",
        "change": "Tedarikçi değiştir",
        "current": "Seçili tedarikçi",
        "group": "Tedarikçi kayıtlarım",
        "scope": "Kapsam"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Önceki sayfa",
        "next": "Sonraki sayfa",
        "page": "Sayfa",
        "of": "/ {pages}",
        "zoomIn": "Yakınlaştır",
        "zoomOut": "Uzaklaştır",
        "fit": "Genişliğe sığdır",
        "download": "PDF'yi indir",
        "loading": "Belge yükleniyor…",
        "pageLoading": "{page}. sayfa yükleniyor…",
        "error": "Bu belge görüntülenemedi",
        "errorHint": "Dosya korumalı veya geçici olarak kullanılamıyor olabilir. Yeniden deneyebilir veya okumak için indirebilirsiniz.",
        "retry": "Yeniden dene",
        "pinch": "Yakınlaştırmak için iki parmakla sıkıştırın"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Çerçeveler, imzanızın ve parafınızın uygulanacağı yerleri gösterir.",
        "counter": "Belge {index} / {total}",
        "read": "Okundu",
        "unavailable": "Belge kullanılamıyor",
        "unavailableHint": "Bu belgeye artık beCPG'de erişilemiyor: imzalandıktan sonra değiştirilmiş veya erişiminiz kaldırılmış olabilir. Bir kopyaya ihtiyacınız varsa müşterinizden isteyin."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "İmza",
        "back": "Görevlerim",
        "loading": "Belge açılıyor…",
        "notFound": "İmzalanacak belge yok",
        "notFoundHint": "Bu görev imzalanabilir bir belgeye başvurmuyor. Çıktı hâlâ hazırlanıyor olabilir — proje tartışması üzerinden müşterinizle iletişime geçin.",
        "readTitle": "Belgenin okunması",
        "progress": "{seen} / {pages} sayfa okundu",
        "progressDone": "Belgenin tamamı okundu",
        "progressHint": "İmzala düğmesi, tüm sayfalar görüntülendikten sonra etkinleşir.",
        "readyHint": "Her şey hazır: imzanız belgeye uygulanacak.",
        "goToPage": "{page}. sayfadan devam et",
        "goToDocumentPage": "{document}. belge, {page}. sayfadan devam et",
        "documentCount": "İmzalanacak {count} belge",
        "toSignature": "İmzaya git",
        "signTitle": "İmzanız",
        "initialsTitle": "Parafınız",
        "initialsHint": "Her sayfanın altına uygulanacak.",
        "consent": "Belgenin tamamını okudum ve elektronik olarak imzalamayı kabul ediyorum. Bu imzanın ıslak imza ile aynı değere sahip olduğunu kabul ediyorum.",
        "sign": "Belgeyi imzala",
        "signing": "İmzalanıyor…",
        "blockedRead": "İmzalayabilmek için tüm sayfaları okuyun.",
        "blockedSignature": "İmzanızı ekleyin.",
        "blockedInitials": "Parafınızı ekleyin.",
        "blockedConsent": "Onay kutusunu işaretleyin.",
        "successTitle": "Belge imzalandı",
        "successBody": "İmzanız kaydedildi. beCPG imzayı belgeye uygular ve size bir kopyasını e-postayla gönderir. Belgeyi ayrıca Belgelerim › İmzalananlar altında bulabilirsiniz.",
        "successNext": "Sizden başka bir şey beklenmiyor: görev kapanır ve müşterinize bildirim gönderilir.",
        "successDownload": "Belgeyi indir",
        "successBack": "Görevlerime dön",
        "signedTitle": "Bu belge zaten imzalandı",
        "signedBody": "Bu görev için zaten bir imza kaydedildi. Yeniden yapılacak bir şey yok — belgeyi indirebilirsiniz.",
        "signedBodyNoCopy": "Bu görev için zaten bir imza kaydedildi. Yeniden yapılacak bir şey yok. Belgeye artık portaldan erişilemiyor; bir kopyaya ihtiyacınız varsa müşterinizden isteyin.",
        "signedView": "Belgeyi görüntüle",
        "signedComplete": "Görevi tamamla",
        "signedCompleteDone": "Görev tamamlandı.",
        "signedCompleteError": "Görev tamamlanamadı.",
        "cancelledTitle": "İmza iptal edildi",
        "cancelledBody": "Bu imza talebi müşteriniz tarafından iptal edildi. Sizden bir işlem beklenmiyor.",
        "closedTitle": "Görev zaten işlendi",
        "closedBody": "Bu görev artık açık değil. Bunun bir hata olduğunu düşünüyorsanız müşterinizle iletişime geçin.",
        "externalTitle": "Sağlayıcınızda imza",
        "externalBody": "Müşteriniz harici bir imza hizmeti kullanıyor. Belge yeni bir sekmede açılır; işiniz bittiğinde buraya geri dönün.",
        "externalOpen": "İmzayı aç",
        "failed": "İmza kaydedilemedi.",
        "failedNetwork": "Gönderim sırasında bağlantı kesildi. İmzanız kaybolmadı: yeniden deneyin, iki kez kaydedilmeyecek.",
        "retry": "Yeniden dene",
        "refresh": "Yenile",
        "leaving": "İmza gönderiliyor. Şimdi ayrılmak işlemi kesebilir.",
        "document": "Belge"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Çiz",
        "type": "Adımı yaz",
        "drawHint": "Çerçevenin içine parmağınızla, kalemle veya fareyle imzalayın.",
        "typeHint": "Adınız imza olarak uygulanacak.",
        "namePlaceholder": "Ad SOYAD",
        "nameLabel": "İmzalayanın adı",
        "clear": "Temizle",
        "undo": "Son çizgiyi geri al",
        "preview": "İmzanızın önizlemesi",
        "empty": "Henüz imza yok",
        "required": "Devam etmek için imzanız gerekli.",
        "initialsType": "Baş harflerimi yaz",
        "initialsDrawHint": "Baş harflerinizi çerçevenin içine çizin.",
        "initialsTypeHint": "Bu baş harfler paraf olarak uygulanacak.",
        "initialsNameLabel": "Baş harfler",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Parafınızın önizlemesi",
        "initialsEmpty": "Henüz paraf yok"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "İmza",
        "initials": "Paraf",
        "date": "Tarih",
        "text": "Metin"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Spesifikasyonlar",
        "subtitle": "Ürünlerinize uygulanan referans belgeler",
        "consult": "Görüntüle",
        "open": "Aç",
        "download": "İndir",
        "appliesTo": "Uygulandığı ürünler",
        "andOthers": "ve {count} tane daha",
        "updated": "{date} tarihinde güncellendi",
        "search": "Spesifikasyon ara",
        "none": "Spesifikasyon yok",
        "noneHint": "Bu kapsama bağlı spesifikasyon yok. Geçerli bir spesifikasyon varsa müşteri bunu paylaşacaktır.",
        "noResult": "Bu aramaya uyan spesifikasyon yok",
        "count": "{count} belge",
        "readFirst": "Doldurmadan önce okuyun",
        "unreadable": "{count} spesifikasyon ürünlerinize uygulanıyor ancak hesabınız bunları açamıyor. Müşterinizden erişim isteyin."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Zorunlu soru",
        "noAnswer": "Yanıtlanmadı",
        "choose": "Bir yanıt seçin",
        "openLink": "Bağlantıyı aç",
        "answer": "Yanıt",
        "blank": "Bu zorunlu soru hâlâ boş."
    },
    "components/tasks/NcAssist#LABELS": {
        "title": "AI yardımı",
        "help": "Uygunsuzluk, ürün, tedarikçi ve geçmiş uygunsuzluklara dayalı AI önerileri. Göreve yanıt verene kadar hiçbir şey kaydedilmez.",
        "answers": "Önerilen yanıtlar",
        "apply": "Kullan",
        "applied": "Kullanıldı",
        "applyAll": "Tümünü kullan",
        "causes": "Olası kök nedenler",
        "actions": "Önerilen düzeltici faaliyetler",
        "addToComment": "Yoruma ekle",
        "similar": "Benzer uygunsuzluklar",
        "likelihood": {
            "high": "olası",
            "medium": "mümkün",
            "low": "düşük olasılık"
        },
        "yes": "Evet",
        "no": "Hayır"
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Görevi tamamla",
        "refuse": "Reddet",
        "completeTitle": "Bu görev tamamlansın mı?",
        "completeMessage": "Görev tamamlandı olarak işaretlenecek ve proje bir sonraki adıma geçecek.",
        "refuseTitle": "Bu görev reddedilsin mi?",
        "refuseReason": "Ret gerekçesi",
        "refuseReasonHint": "Bu metin tedarikçiye gönderilir: neyi düzeltmesi gerektiğini belirtin.",
        "refuseReasonRequired": "Reddetmek için bir gerekçe gereklidir.",
        "cancel": "İptal",
        "completed": "Görev tamamlandı.",
        "refused": "Görev reddedildi."
    },
    "components/tasks/WorkflowTaskScreen#LABELS": {
        "back": "Görevlerim",
        "assignee": "Atanan",
        "pooled": "Üstlenilecek",
        "due": "Son tarih",
        "startedBy": "Başlatan",
        "concerns": "İlgili",
        "answer": "Yanıtınız",
        "claim": "Görevi üstlen",
        "release": "Havuza geri bırak",
        "claimed": "Görev artık sizde",
        "released": "Görev havuza geri bırakıldı",
        "save": "Kaydet",
        "saved": "Yanıt kaydedildi",
        "done": "Görev tamamlandı",
        "completed": "Görev tamamlandı, iş akışı devam ediyor",
        "claimFirst": "Yanıtlamak için görevi üstlenin.",
        "closed": "Bu görev tamamlandı.",
        "discussion": "Tartışma"
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Tümünü seç",
        "selectRow": "Satırı seç",
        "columns": "Görünür sütunlar",
        "rowsPerPage": "Sayfa başına satır",
        "export": "Dışa aktar",
        "legend": "Açıklama"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Burada henüz gösterilecek bir şey yok. Öğeler oluşturulur veya gönderilir gönderilmez görünecek.",
        "search": "Aramanıza uyan öğe yok. Daha az kelime deneyin veya filtrelerden birini kaldırın."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Önceki sekmeler",
        "next": "Sonraki sekmeler"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Bekleyen değişiklikler",
        "saving": "Kaydediliyor…",
        "saved": "{time} itibarıyla kaydedildi",
        "savedShort": "Kaydedildi",
        "error": "Kaydedilemedi",
        "retry": "Yeniden dene",
        "unsaved": "Değişiklikleriniz kaybolmadı: yeniden gönderilecekler."
    },
    "components/wizard/SuggestionSources#LABELS": {
        "source": "Kaynak",
        "conflict": "Belgeler aynı değeri vermiyor",
        "choose": "Bu seçimi uygula",
        "version": "v{version}"
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Teknik föy",
        "deposited": "{date} tarihinde yüklendi",
        "replace": "Değiştir",
        "cancel": "İptal",
        "missing": "Teknik föy eksik",
        "missingHint": "AI önerilerini etkinleştirmek için teknik föyünüzü yükleyin.",
        "missingClosed": "Bu karta teknik föy yüklenmedi."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Bağlam",
        "discussion": "Tartışma",
        "documents": "Belgeler",
        "technicalSheet": "Teknik föy",
        "suggestions": "Öneriler",
        "compliance": "Uygunluk",
        "properties": "Özellikler",
        "list": "Liste",
        "survey": "Soru formu",
        "readOnly": "Salt okunur",
        "readOnlyReasons": {
            "readAccess": "Bu kartta yalnızca okuma erişiminiz var.",
            "noAssignedTask": "Bu kartta size atanmış görev yok: veri girişi kapalı.",
            "wizardReadOnly": "Bu asistan salt okunur olarak yapılandırılmış."
        },
        "finish": "Bitir",
        "finished": "Görev müşterinize gönderildi",
        "finishBlocked": "Bitirmek için \"Uygunluk\" adımındaki eksik alanları doldurun.",
        "finishMissingStep": "\"{step}\": {count} zorunlu yanıt eksik.",
        "finishGapStep": "{step} · {count} alan",
        "finishGapCatalog": "{step} · {count} bekleniyor",
        "finishGapCatalogPlain": "{step} tamamlanacak",
        "notFound": "Kart bulunamadı",
        "notFoundHint": "Bu kart mevcut değil veya kapsamınızda değil.",
        "unknownWizard": "Veri giriş asistanı yapılandırılmamış",
        "unknownWizardHint": "Bu görev, bu örnekte tanımlı olmayan \"{wizard}\" asistanını gerektiriyor. Bunu beCPG yöneticinize bildirin.",
        "backToTasks": "Görevlere dön",
        "delegated": "{supplier} adına veri giriyorsunuz",
        "due": "Son tarih: {date}",
        "step": "Adım",
        "widen": "Giriş alanını genişlet",
        "widenHint": "Yan panelleri gizler ve adımları simgelerine indirger.",
        "restore": "Panelleri geri getir",
        "steps": "Adımlar"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Önceki",
        "next": "Sonraki",
        "finish": "Bitir",
        "finishing": "Gönderiliyor…",
        "formulating": "Yeniden hesaplanıyor…",
        "blocked": "Henüz bitirilemez",
        "incomplete": "Kart eksik"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Adımlar",
        "step": "Adım {index} / {total}",
        "open": "Bir adım seçin",
        "frozen": "Müşteri tarafından doğrulandı",
        "readOnly": "Salt okunur",
        "done": "Ziyaret edildi",
        "complete": "Eksiksiz",
        "current": "Geçerli adım",
        "todo": "Henüz ziyaret edilmedi",
        "locked": "Daha sonra kullanılabilir",
        "incomplete": "{count} zorunlu alan eksik",
        "catalogGap": "Katalog tarafından beklenen {count} alan",
        "remaining": "Tamamlanacak {count} bölüm",
        "remainingNone": "Eksik olarak bildirilen bir şey yok",
        "remainingHint": "Müşteriniz kartı doğrulamak için bu bilgileri bekliyor.",
        "remainingHintNone": "İstediğiniz zaman herhangi bir adıma geri dönebilirsiniz.",
        "collapse": "Adımları daralt",
        "expand": "Adımları genişlet"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Tartışma",
        "subtitle": "Bu kartla ilgili müşterinizle yazışmalarınız",
        "subtitleInternal": "Bu kartla ilgili tedarikçiyle yazışmalarınız",
        "emptyHintInternal": "Tedarikçiye bir soru sorun veya açıklamalarından birini yanıtlayın.",
        "placeholder": "Bir mesaj yazın…",
        "send": "Gönder",
        "empty": "Mesaj yok",
        "emptyHint": "Müşterinize bir soru sorun veya açıklamalarından birini yanıtlayın.",
        "emptyAnchored": "Bu öğede mesaj yok",
        "subject": "Konu",
        "whole": "Kartın tamamı",
        "onField": "Alan: {label}",
        "onRow": "Satır: {label}",
        "onRowOfList": "\"{list}\" listesinin \"{label}\" satırı",
        "inList": "\"{list}\" listesinin bir satırı",
        "row": "bir satır",
        "anchored": "{label} üzerinde",
        "clear": "Bağlantıyı kaldır",
        "readOnly": "Tartışma salt okunur.",
        "posting": "Gönderiliyor…",
        "count": "{count} mesaj",
        "denyReasons": {
            "noAssignedTask": "Listeleme kapatıldı: bu tartışma salt okunur.",
            "readAccess": "Bu kartta yalnızca okuma erişiminiz var.",
            "noPermission": "Bu tartışmaya yazma yetkiniz yok."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Bağlam",
        "suggestions": "AI önerileri",
        "specs": "Spesifikasyonlar",
        "specsUnreadable": "Bu karta bir spesifikasyon bağlı ancak hesabınız onu açamıyor.",
        "refusals": "Önceki retler",
        "more": "+{count} tane daha"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Satır {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Beklenen belgeler",
        "otherTitle": "Diğer belgeler",
        "otherSubtitle": "Klasördeki, yukarıdaki gereksinimlerin hiçbirini karşılamayan dosyalar. Yararlı her belgeyi (fotoğraf, analiz…) buraya bırakın.",
        "blocking": "{count} zorunlu belge eksik",
        "allGood": "Tüm zorunlu belgeler sağlandı",
        "readOnly": "Bu karta belge yükleyemezsiniz."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Bu alana yorum yap",
        "comments": "Bu alanda {count} mesaj",
        "catalogGap": "Müşterinizin kataloğu tarafından bekleniyor",
        "catalogGapLocale": "Müşterinizin kataloğu tarafından {locale} dilinde bekleniyor",
        "frozenTitle": "Müşteriniz tarafından doğrulanmış bölüm",
        "frozenText": "Müşteriniz bu bilgileri doğruladı: bilgiler donduruldu ve artık değiştirilemez. Bir düzeltme gerekiyorsa tartışma üzerinden yeniden açılmasını isteyin.",
        "readAccessTitle": "Salt okunur",
        "readAccessText": "Bu kartta yazma erişiminiz yok.",
        "noTaskTitle": "Açık görev yok",
        "noTaskText": "Bu kart şu anda size atanmamış: okuyabilirsiniz ancak değiştiremezsiniz.",
        "readOnlyTitle": "Salt okunur",
        "readOnlyText": "Bu adım değiştirilemez."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Uygunluk",
        "subtitle": "Müşterinizin kartı doğrulayabilmesi için hâlâ eksik olanlar.",
        "subtitleInternal": "Tedarikçinin kartında hâlâ eksik olanlar.",
        "blocking": "Engelleyici katalog(lar): {names}",
        "blockingHint": "Bitirebilmek için aşağıdaki eksik alanları doldurun.",
        "ready": "Tüm engelleyici kataloglar karşılandı",
        "incomplete": "Tamamlanacak katalog(lar): {names}",
        "documents": "Zorunlu belgeler",
        "documentsMissing": "{count} zorunlu belge eksik",
        "documentsOk": "Tüm zorunlu belgeler sağlandı",
        "reviewTitle": "Salt okunur kart",
        "reviewSubtitle": "Bu kartı görüntülüyorsunuz: hiçbir değişiklik yapılamaz.",
        "expand": "Göster",
        "collapse": "Gizle",
        "expandAll": "Tümünü genişlet",
        "collapseAll": "Tümünü daralt",
        "reviewed": "Bölüm incelendi",
        "reviewedHint": "İlerledikçe bölümleri işaretleyin: {total} bölümden {done} tanesi incelendi.",
        "empty": "Görüntülenecek bir şey yok"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Otomatik çıkarma",
        "subtitle": "Bu değerler yüklediğiniz belgelerden okundu. Kontrol edin: son söz sizde.",
        "applied": "Otomatik olarak uygulandı",
        "appliedHint": "Yüksek güven: değer zaten yerinde, geri alabilirsiniz.",
        "toConfirm": "Onaylanacak",
        "toConfirmHint": "Önerilen değeri kontrol edin, ardından uygulayın.",
        "flagged": "Kendiniz girin",
        "flaggedHint": "Çıkarma yeterince güvenilir değil: girmeyi size bırakmayı tercih ediyoruz.",
        "unscored": "Öneriler",
        "unscoredHint": "Bu öneriler bir güven puanı olmadan gelir.",
        "apply": "Uygula",
        "expand": "Genişlet",
        "applyAnyway": "Yine de uygula",
        "revoke": "Geri al",
        "restore": "Gözden geçir",
        "applying": "Uygulanıyor…",
        "appliedAt": "Uygulandı",
        "revoked": "Geri alındı",
        "dismissed": "Yok sayıldı",
        "notRevocable": "Önceki değer otomatik olarak geri yüklenemez: gerekirse alanı doğrudan düzenleyin.",
        "empty": "Öneri yok",
        "emptyHint": "Bu adım için önerilecek bir şey yok. Teknik föy hemen yukarıda yüklü: çıkarma, orada bulduğu değerleri önerecek.",
        "emptyEntityLevel": "Analiz çalıştı ancak yalnızca kartın kendisinden yapılan, hiçbir belgeyle desteklenmeyen çıkarımlar üretti: bunlar size sunulmuyor.",
        "analysing": "Analiz devam ediyor",
        "analysingHint": "Portal belgelerinizi okuyor. Öneriler sayfadan ayrılmadan burada kendiliğinden görünecek: bir teknik föyün okunması genellikle bir dakikadan kısa sürer.",
        "analysingPlugins": "Çalışıyor: {plugins}",
        "refresh": "Analizi yeniden çalıştır",
        "readOnly": "Bu kart salt okunur: öneriler uygulanamaz.",
        "source": "Kaynak",
        "changes": "{count} değer",
        "error": "Öneri uygulanamadı."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Tartışma",
        "answered": "{total} sorudan {answered} tanesi yanıtlandı",
        "empty": "Soru yok",
        "emptyHint": "Müşteriniz bu kart için henüz bir soru formu yayınlamadı.",
        "check": "Yanıtlarımı kontrol et",
        "complete": "Soru formu tamamlandı",
        "missingTitle": "{count} zorunlu soru hâlâ boş",
        "missingHint": "Gitmek için birini seçin. Diğer yanıtlarınız zaten kaydedildi.",
        "readOnly": "Yalnızca görüntüleme",
        "noneAnswered": "Kaydedilmiş yanıt yok",
        "noneAnsweredHint": "Soru formu siz yanıtladıkça açılır.",
        "dropped": "Müşteriniz yanıtlarınızdan {count} tanesini saklayacak bir yer bırakmadı: {questions}. Bunlar kaydedilmedi — müşterinize bildirin."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Kod",
        "name": "Tedarikçi",
        "legalName": "Yasal unvan",
        "approvalStatus": "Onay durumu",
        "approvalReasons": "Nedenler",
        "completion": "Doluluk (%)",
        "risk": "Risk",
        "riskLevel": "Risk düzeyi",
        "documentsExpired": "Süresi dolmuş belgeler",
        "documentsExpiring": "Süresi dolmak üzere olan belgeler",
        "documentsMissing": "Eksik belgeler",
        "openNc": "Açık NC'ler",
        "openProjects": "Açık projeler",
        "family": "Aile",
        "lastActivity": "Son etkinlik",
        "state": "Durum",
        "compliance": "Uygunluk (%)"
    },
    "config/messages#messages": {
        "app.title": "Tedarikçi Portalı",
        "app.shortTitle": "Portal",
        "app.tenantSuffix": "tedarikçi alanı",
        "app.description": "beCPG tedarikçi portalı — listeleme, belgeler ve uygunluk",
        "nav.dashboard": "Pano",
        "nav.tasks": "Görevlerim",
        "nav.products": "Ürünlerim",
        "nav.documents": "Belgelerim",
        "nav.company": "Şirketim",
        "nav.specs": "Spesifikasyonlar",
        "nav.messages": "Tartışmalar",
        "nav.notifications": "Bildirimler",
        "nav.help": "Yardım",
        "nav.monitor": "İzleme",
        "nav.monitor.suppliers": "Tedarikçiler",
        "nav.monitor.products": "Tedarikçi ürünleri",
        "nav.monitor.documents": "Belge uygunluğu",
        "nav.monitor.campaigns": "Projeler",
        "nav.monitor.quality": "Uygunsuzluklar",
        "nav.monitor.reports": "Raporlar",
        "nav.monitor.tasks": "Görevlerim",
        "account.profile": "Profilim",
        "account.language": "Dil",
        "account.login": "Oturum aç",
        "account.logout": "Oturumu kapat",
        "account.tenant": "Müşteri",
        "account.suppliers": "Tedarikçi kayıtlarım",
        "account.allSuppliers": "Tüm tedarikçiler",
        "action.save": "Kaydet",
        "action.cancel": "İptal",
        "action.close": "Kapat",
        "action.back": "Geri",
        "action.next": "Sonraki",
        "action.previous": "Önceki",
        "action.submit": "Gönder",
        "action.confirm": "Onayla",
        "action.delete": "Sil",
        "action.download": "İndir",
        "action.upload": "Dosya yükle",
        "action.retry": "Yeniden dene",
        "action.search": "Ara",
        "action.filter": "Filtrele",
        "action.reset": "Sıfırla",
        "action.export": "Dışa aktar",
        "action.sign": "İmzala",
        "action.showMore": "{count} tane daha",
        "action.showLess": "Daha az göster",
        "suggestion.replaces": "{value} değerinin yerine geçer",
        "state.loading": "Yükleniyor…",
        "state.saving": "Kaydediliyor…",
        "state.saved": "Kaydedildi",
        "state.empty": "Görüntülenecek bir şey yok",
        "state.noResults": "Bu arama için sonuç yok",
        "state.required": "Zorunlu alan",
        "state.of": "{from}-{to} / {total}",
        "state.page": "Sayfa {page} / {pages}",
        "state.atLeast": "en az {total}",
        "error.title": "Bir sorun oluştu",
        "error.generic": "Bir sorun oluştu. Lütfen yeniden deneyin.",
        "error.network": "Sunucuya ulaşılamıyor.",
        "error.upstream": "beCPG bir hata döndürdü. Yeniden deneyin; sorun devam ederse yöneticinize bildirin.",
        "error.unauthorized": "Oturumunuzun süresi doldu. Lütfen yeniden oturum açın.",
        "error.forbidden": "Bu işlemi gerçekleştirme yetkiniz yok.",
        "error.notFound": "Bu sayfa veya öğe mevcut değil.",
        "error.tenant": "Hesabınızla ilişkilendirilmiş müşteri yok.",
        "error.upload": "Dosya yüklenemedi.",
        "error.http": "Hata {status}: {message}",
        "status.approved": "Onaylandı",
        "status.inProgress": "Devam ediyor",
        "status.toRenew": "Yenilenecek",
        "status.suspended": "Askıya alındı",
        "status.valid": "Geçerli",
        "status.expiring": "Süresi yakında doluyor",
        "status.expired": "Süresi doldu",
        "status.missing": "Eksik",
        "status.validityMissing": "Geçerlilik doldurulacak",
        "status.rejected": "Reddedildi",
        "status.pending": "Beklemede",
        "status.completed": "Tamamlandı",
        "status.late": "Gecikmiş",
        "status.draft": "Simülasyon",
        "status.notApplicable": "Uygulanamaz",
        "test.banner": "TEST ortamı — burada girilen veriler bağlayıcı değildir",
        "test.badge": "Test",
        "app.monitorSuffix": "tedarikçi yönetimi"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Gelişim",
        "help": "beCPG karar modülünden okunur, toplu yüklenir: rakamlar son yüklemeye ait olabilir.",
        "period": "Dönem",
        "measures": {
            "stepsNumber": "Görevler",
            "averageActualDurations": "Ort. gerçek süre (g)",
            "refusalRate": "Ret oranı",
            "avgResponseDelay": "Ort. yanıt süresi (g)",
            "averageProgress": "Ort. ilerleme",
            "projectsNumber": "Projeler"
        }
    },
    "components/ui/useListExport#LABELS": {
        "done": "{count} satır dışa aktarıldı.",
        "cut": "Kısmi dışa aktarma: {count} satır, bir dışa aktarmanın sınırı. Geri kalanı için filtreleri daraltın."
    }
};

export default LOCALE;
