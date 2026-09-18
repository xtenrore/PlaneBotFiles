# SahaNova Fantezi

Türkçe, web tabanlı fantezi futbol oyunu. TFF Fantezi Lig gibi modern fantezi futbol uygulamalarındaki temel oyun döngülerini bağımsız bir tasarım ve özgün arayüzle web'e taşır.

## Özellikler

- 15 kişilik bütçeli kadro kurma (2 GK / 5 DEF / 5 MID / 3 FWD)
- 6 farklı geçerli diziliş ve ilk 11 yönetimi
- Kaptan / kaptan yardımcısı
- Oyuncu formu, fiyatı, sahiplik oranı, sakat/cezalı durumu
- Serbest transfer + ek transfer puan maliyeti
- Canlı maç merkezi ve haftalık fikstür
- Nostradamus skor tahmini
- Genel sıralama ve özel lig oluşturma / davet koduyla katılma
- Özel kartlar: Üçlü Kaptan, Dörtlü Kaptan, Yedek Gücü, Sınırsız Bütçe, Hücum!
- Ödül / başarım görünümü
- Türkçe responsive arayüz; masaüstü ve mobil destek
- İlk açılışta tam ekran deneyimi
- Railway healthcheck ve kalıcı veri yolu desteği
- Sunucu tarafı oyun kuralları ve otomatik testler

## Çalıştırma

```bash
npm test
npm start
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Veri kalıcılığı

`DATA_PATH` verilmezse veri `data/db.json` dosyasında saklanır. Railway üzerinde kalıcı volume bağlanıp `DATA_PATH=/data/db.json` ayarlanması önerilir.

## Canlı futbol verisi

Bu depo, üçüncü taraf ücretli veya kapalı bir TFF veri kaynağını kopyalamaz. Oyuncu/maç veri modeli gerçek veri sağlayıcısına bağlanmaya hazırdır; varsayılan dağıtım güvenli demo veri setiyle gelir. Puan hesaplama motoru sunucu tarafındadır ve maç istatistikleri beslendiğinde gerçek haftalık puan üretmek için genişletilebilir.

## Marka notu

SahaNova bağımsız bir projedir ve Türkiye Futbol Federasyonu'nun resmî uygulaması değildir. TFF logoları, resmî görselleri veya uygulama varlıkları kopyalanmamıştır.
