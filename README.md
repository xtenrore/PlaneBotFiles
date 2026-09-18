# SahaNova Fantezi

SahaNova Fantezi, gerçek 2026/27 Süper Lig kulüpleri ve doğrulanmış gerçek futbolcu adlarıyla çalışan, Türkçe ve yalnızca web için geliştirilmiş ücretsiz bir fantezi futbol oyunudur. Tasarım ve marka bağımsızdır; TFF Fantezi Lig'in herkese açık oyun kurallarındaki temel fantezi futbol mekaniklerinden yararlanır.

## Ücretsiz model

SahaNova'da ödeme sistemi yoktur. Uygulama içi satın alma, ücretli menajer kartı, ücretli mini lig, kredi kartı, bilet satın alma, premium hak veya reklam satın alma akışı bulunmaz. Oynanabilir oyun özellikleri ücretsizdir.

## Kadro ve takım yönetimi

- 100M fantezi bütçesi
- Tam 15 kişilik kadro: 2 kaleci / 5 defans / 5 orta saha / 3 forvet
- Aynı gerçek kulüpten en fazla 3 futbolcu
- 11 ilk 11 oyuncusu + 4 yedek
- Ayrı yedek kaleci ve yedek öncelik sırası
- Kaptan ve yardımcı kaptan
- 8 standart diziliş: 3-5-2, 3-4-3, 4-4-2, 4-3-3, 4-5-1, 5-4-1, 5-3-2, 5-2-3
- Bütçe, mevki, kulüp limiti ve diziliş doğrulaması
- Oynamayan ilk 11 oyuncuları için formasyonu koruyan otomatik değişiklik sistemi
- Kaptan oynamazsa oynayan yardımcı kaptana kaptan çarpanı aktarımı
- Takımı Kaydet davranışı ve maç haftası kilidi

## Transferler

- Maç haftası öncesinde sınırsız transfer
- Transferlerden puan kesintisi yok
- Transferlerde bütçe, pozisyon ve kulüp başına 3 oyuncu sınırı korunur
- Süre sonundan sonraki kadro değişiklikleri bir sonraki geçerli haftaya hazırlanır
- Oyuncu formu, fiyatı, sahiplik oranı, fikstür zorluğu ve sakat/cezalı durum alanları

## Maç haftası ve deadline

- Maç haftası bazlı oyun döngüsü
- İlk maçtan 1 saat önce haftalık kadro deadline'ı
- Deadline sonrası mevcut haftanın Takımım, Transfer ve Nostradamus değişiklikleri kilitlenir
- Kullanıcının tarayıcı yerel saatine göre geri sayım
- Bekliyor / İşleniyor / Canlı / Eklendi puan durumu
- Geçmiş maç haftası puanları ve performans geçmişi
- Ertelenmiş veya aynı fantezi haftasına ait birden fazla maçtan puan toplama altyapısı

## Puanlama motoru

Sunucu tarafındaki puanlama motoru şu olayları destekler:

- 1–60 dakika: 1 puan; 60 dakikadan fazla: 2 puan
- Gol: kaleci 10, defans 6, orta saha 5, forvet 4 puan
- Asist: 3 puan
- Gol yememe: kaleci/defans 4, orta saha 1 puan (en az 60 dakika)
- Kalecide her 3 kurtarış: +1
- Penaltı kurtarışı: +5
- Penaltı kaçırma: -2
- Kaleci/defansta her 2 gol yeme: -1
- Sarı kart: -1
- Kırmızı kart: -3
- Kendi kalesine gol: -2
- 3 / 2 / 1 bonus puan desteği
- Canlı/geçici puanların sonradan yeniden hesaplanabilmesi
- Otomatik yedek, kaptan ve kart etkilerinin final hesaba uygulanması

## Menajer kartları — tamamı ücretsiz

- Tripleks Kaptan — kaptan 3×
- Dört Dörtlük Kaptan — kaptan 4×
- Tüm Takım Sahaya — yedek puanları da sayılır
- Hücum — standart diziliş kısıtlarını esnetir ve ilgili hafta +5M geçici bütçe verir
- Limitsiz Bütçe — ilgili hafta normal bütçe sınırını kaldırır

Aynı maç haftasında yalnız bir kart etkinleştirilebilir. Her kart bir devrede en fazla 2, sezon boyunca en fazla 4 kez kullanılabilir. Bu hakların tamamı ücretsizdir.

## Nostradamus

- Haftanın gerçek maçları için skor tahmini
- Haftadaki tüm maçları tahmin etmeye +1 puan
- Doğru tahmin edilen her maç sonucu için +1 puan
- Yanlış tahmin için eksi puan yok
- Maç haftası deadline'ında kilitlenir
- Nostradamus puanları toplam fantezi puanına eklenir

## Ligler ve kupalar

- Genel Lig'e otomatik katılım
- Profil ülkesine göre Ülke Ligi'ne otomatik katılım
- Favori kulüp seçildiğinde Favori Takım Ligi'ne otomatik katılım
- Özel lig oluşturma ve davet koduyla katılma
- Klasik lig ve Head-to-Head formatı
- H2H: galibiyet 3 / beraberlik 1 / mağlubiyet 0
- H2H eşitliğinde ham fantezi puanı tie-break
- Lig yöneticisinin ligi katılıma açıp kapatması, kullanıcı çıkarması, yöneticiliği devretmesi ve özel ligi silmesi
- Ligden çıkarılan kullanıcının aynı özel lige tekrar katılamaması
- Genel Kupa, Ülke Kupası ve favori kulüp seçilmişse Favori Takım Kupası
- Eleme eşleşmeleri ve bay geçme desteği
- Klasik sıralamada toplam fantezi puanı, ardından fantezi golü tie-break'i; tam eşitlikte ortak sıra

## Profil, bildirimler ve destek

- Menajer adı ve takım adı düzenleme
- Ülke seçimi
- Favori Süper Lig kulübü seçimi
- Deadline, puan ve sistem bildirim tercihleri
- Tarayıcı bildirim izniyle yerel deadline hatırlatıcısı
- Uygulama içi bildirim merkezi
- Teknik, puanlama, takım ve lig sorunları için destek formu
- Hesap silme talebi
- 30 günlük geri alma süresi
- 30 gün dolmadan silme talebini iptal etme
- Yardım ve oyun kuralları ekranı

## Gerçek futbol verisi

- 2026/27 Süper Lig'deki 18 kulüp
- 216 seçilmiş gerçek futbolcu
- Seçilmiş oyuncular 16 Eylül 2026 tarihli TFF resmî A takım listelerine karşı denetlenmiştir
- Güncel maç haftası fikstür görünümü
- Gerçek oyuncu adları ve kulüpleri

Fantezi fiyatı, sahiplik, form ve oyun içi puanlar SahaNova'nın oyun değerleridir. Proje kapalı veya ücretli bir TFF canlı veri akışını taklit etmez. Sunucu, gerçek maç olaylarını sağlayan lisanslı/izinli bir veri kaynağı bağlandığında dakika, gol, asist, kart, kurtarış ve diğer istatistikleri alıp puanları yeniden hesaplayabilecek şekilde hazırlanmıştır.

## Henüz haricî servis gerektiren parçalar

Aşağıdaki işlevler sahte biçimde taklit edilmemiştir çünkü güvenli bir üretim sistemi için haricî servis/kimlik bilgisi gerekir:

- Gerçek e-posta hesabı oluşturma, e-posta doğrulama ve şifre sıfırlama gönderimleri
- Lisanslı/izinli gerçek zamanlı resmî maç olayı veri sağlayıcısı
- Sayfa kapalıyken de çalışan gerçek Web Push altyapısı

Bunlar oyunun ücretli olması gerektiği anlamına gelmez; yalnızca ilgili servislerin güvenli bağlantısı gerekir.

## Teknik

```bash
npm test
npm run check
npm start
```

Varsayılan adres `http://localhost:3000`'dir.

Railway'de kalıcı veri için `/data` volume kullanılır ve `DATA_PATH=/data/db.json` olarak ayarlanır. Sağlık kontrolü `/api/health` üzerindedir.

## Marka notu

SahaNova bağımsız bir projedir ve Türkiye Futbol Federasyonu'nun resmî uygulaması değildir. TFF logoları, resmî görselleri veya uygulama varlıkları kopyalanmamıştır.
