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
- 2026/27 Süper Lig kulüpleri, gerçek futbolcu adları ve güncel hafta fikstürü görünümü

## Çalıştırma

```bash
npm test
npm start
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Veri kalıcılığı

`DATA_PATH` verilmezse veri `data/db.json` dosyasında saklanır. Railway üzerinde kalıcı volume bağlanıp `DATA_PATH=/data/db.json` ayarlanması önerilir.

## Futbol verisi

Arayüzde 2026/27 Süper Lig'in güncel kulüp ve gerçek futbolcu adları kullanılır. Fantezi fiyatları, form değerleri ve puanlar SahaNova'nın oyun değerleridir; resmî/ücretli TFF canlı veri akışı gibi gösterilmez. Canlı istatistik sağlayıcısı eklendiğinde puan motoru sunucu tarafında gerçek maç olaylarıyla beslenebilir.

## Marka notu

SahaNova bağımsız bir projedir ve Türkiye Futbol Federasyonu'nun resmî uygulaması değildir. TFF logoları, resmî görselleri veya uygulama varlıkları kopyalanmamıştır.
