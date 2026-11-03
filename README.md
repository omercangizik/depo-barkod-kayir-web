# Öztürk Ambalaj Deposu

Barkodla ürün arama ve Google Sheets üzerinde ürün kaydı için mobil uyumlu web uygulaması.

## Özellikler

- Telefon kamerasıyla barkod okuma ve manuel barkod/ürün arama
- Ürün ekleme, güncelleme, listeleme ve kategori yönetimi
- Excel içe/dışa aktarma
- Ürün verilerini Google Sheets üzerinde saklama

## Proje yapısı

- `frontend/`: React + Vite arayüzü (Vercel)
- `backend/`: Express API ve Google Sheets bağlantısı (Render)
- `render.yaml`: Render Blueprint yapılandırması
- `frontend/vercel.json`: istemci tarafı yönlendirmeleri

## Gereksinimler

- Node.js 22
- Google Sheets API etkin bir Google Cloud projesi
- Google Sheet üzerinde Düzenleyici erişimi olan servis hesabı

## Yerel geliştirme

1. Bağımlılıkları yükleyin:

   ```bash
   npm run install:all
   ```

2. `backend/.env.example` dosyasını `backend/.env` olarak kopyalayın ve Google servis hesabı e-posta/özel anahtarını girin. `frontend/.env.example` dosyasını da `frontend/.env` olarak kopyalayın.
3. Geliştirme sunucularını çalıştırın:

   ```bash
   npm run dev
   ```

   Arayüz `http://localhost:5173`, API `http://localhost:10000` adreslerinde çalışır.

Kamera erişimi HTTPS veya localhost gerektirir. Telefonda yerel ağ üzerinden kamera denemek için `frontend/.env` içinde `VITE_DEV_HTTPS=true` yapıp sunucuyu yeniden başlatın; tarayıcı sertifika uyarısını kabul edin. Kamera kullanılamazsa manuel barkod araması yapılabilir.

## Google Sheets hazırlığı

1. Google Cloud Console'da projeyi seçin ve **Google Sheets API**'yi etkinleştirin.
2. **APIs & Services → Credentials** bölümünden servis hesabı oluşturun ve JSON anahtarını indirin.
3. JSON içindeki `client_email` hesabını hedef Google Sheet ile **Düzenleyici** olarak paylaşın.
4. Canlı dağıtımda anahtarı dosya olarak yüklemeyin; Render servisinin `GOOGLE_SERVICE_ACCOUNT_EMAIL` ve `GOOGLE_PRIVATE_KEY` değişkenlerine girin.

Google Sheet kimlik bilgilerini Vercel'e veya Git deposuna koymayın. `.env.example` dosyaları yalnızca değişken adları ve örnek değer içerir. Sağlık kontrolü `/api/health` Google Sheets API'ye salt okunur bir `spreadsheets.get` isteği yapar; satır, başlık veya kategori yazmaz/silmez. Uygulamanın normal ürün ve kategori işlemleri ise Google Sheet'i günceller.

## Test ve derleme

Proje kökünde:

```bash
npm test
npm run build
```

Backend testleri Render'ın kullanacağı `/health` uç noktasını, oturum korumasını ve oturum durumunu Google Sheets'e bağlanmadan denetler. Google bağlantısını deploy sonrası ayrıca `https://<render-servis-adı>.onrender.com/api/health` adresinden doğrulayın; `sheets: true` başarılı erişim anlamına gelir. Bu kontrol tablo verilerini değiştirmez.

## Vercel + Render ile canlıya alma

Önce depoyu GitHub'a gönderin, sonra Render backend'i oluşturun. Render servis URL'si netleştikten sonra Vercel ortam değişkenine ekleyin. Vercel'in oluşturduğu frontend URL'sini alın ve Render'daki `FRONTEND_ORIGIN` değerini bu tam adrese göre ayarlayın. İki servisteki ortam değişkeni değişikliklerinden sonra yeniden deploy edin.

### Render paneli (backend)

1. Render'da **New → Blueprint** ile GitHub deposunu bağlayıp kökteki `render.yaml` dosyasını seçin. Oluşan web servisini inceleyip oluşturun. Alternatif olarak **New → Web Service** kullanıp aşağıdaki ayarları elle girin.
2. Servis ayarları:

   | Alan | Değer |
   | --- | --- |
   | Root Directory | `backend` |
   | Runtime | Node |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `npm start` |
   | Health Check Path | `/health` |
   | Node version | `22` (`backend/.node-version`) |

   Render, web servisini dış trafiğe açmak için `0.0.0.0` üzerinde dinlemeyi ve `PORT` ortam değişkenini kullanmayı bekler; backend bunları otomatik kullanır. Blueprint'te PORT değerini ayrıca girmeyin.

3. **Environment → Environment Variables** alanına şunları ekleyin:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `APP_PASSWORD` | Şirket içinde paylaşacağınız uygulama parolası |
   | `FRONTEND_ORIGIN` | Vercel URL'niz, ör. `https://ozturk-ambalaj.vercel.app` |
   | `GOOGLE_SPREADSHEET_ID` | Kullanılacak Google Sheet kimliği |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Servis hesabının `client_email` değeri |
   | `GOOGLE_PRIVATE_KEY` | JSON anahtarındaki `private_key` değeri; `\n` satır sonları korunmalı |

   `FRONTEND_ORIGIN` içinde yalnızca origin girin (protokol + alan adı, sonunda `/` veya sayfa yolu olmadan). Vercel Preview adreslerini de kullanacaksanız, gereken tam HTTPS originleri virgülle ayırın. `APP_PASSWORD` için güçlü ve tahmin edilmesi zor bir parola belirleyin; üretimde örnek/development parolası `3456` kullanmayın. Bu değerler yalnızca Render'da tutulur.

4. İlk deploy başarılı olunca Render'ın verdiği servis adresini not edin; sonraki bölümde Vercel'e gireceksiniz.

### Vercel paneli (frontend)

1. Vercel'de **Add New → Project** ile aynı GitHub deposunu içe aktarın.
2. Proje ayarları:

   | Alan | Değer |
   | --- | --- |
   | Root Directory | `frontend` |
   | Framework Preset | Vite |
   | Install Command | `npm ci --include=dev` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Node.js Version | `22.x` |

3. `frontend/vercel.json` bu install/build/output ayarlarını da içerir. **Settings → Environment Variables** bölümünde aşağıdaki değişkeni Production ve Preview için (Preview'ı kullanacaksanız) tanımlayın:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://<render-servis-adı>.onrender.com/api` |

   Bu değişken frontend derlemesine dahil edilir ve gizli bilgi içermemelidir. `APP_PASSWORD` veya Google anahtarlarını Vercel'e eklemeyin. Kaydedince Vercel'de redeploy başlatın.

4. Vercel deployment URL'nizi alın, Render'daki `FRONTEND_ORIGIN` değerine yazın ve Render'ı yeniden deploy edin. Vercel'de özel alan adı bağlarsanız onu da `FRONTEND_ORIGIN` listesine ekleyin.

### Yayın sonrası kontrol

1. `https://<render-servis-adı>.onrender.com/health` → `{"success":true,"data":{"api":true}}` beklenir. Bu yalnızca backend'in çalıştığını doğrular.
2. `https://<render-servis-adı>.onrender.com/api/health` → `data.sheets: true` beklenir. Bu Google Sheets erişimini salt okunur biçimde kontrol eder.
3. Vercel adresinde oturum açmayı, manuel ürün aramayı, izin verildiyse kamera taramasını ve bir ürün kaydını deneyin. Gerçek ürün kaydı Google Sheet'i değiştirir; canlı kontrol için önce test ürünü kullanın ve gerekirse sonradan kendiniz kaldırın.

## Uygulama kullanımı

1. Barkodu kamerayla okutun veya manuel olarak arayın.
2. Ürün bulunursa mevcut alanları düzenleyin; bulunmazsa yeni kayıt açılır.
3. Kayıt için Barkod No, Ürün Adı ve Ana Kategori gereklidir.
4. Excel aktarımında dosyadaki kolonları eşleştirip önizlemeyi kontrol edin.

## Güvenlik ve gizli dosyalar

- `.env`, `.env.*` (örnek dosyalar dışında), `google-credentials.json` ve servis hesabı anahtarı Git dışında tutulur.
- Google kimlik bilgileri yalnızca Render backend ortamında saklanır.
- Uygulama tek ortak parola ile oturum açar; ayrı kullanıcı/rol yönetimi yoktur.
- Canlıya almadan önce `git status` ve `git ls-files` ile anahtar veya `.env` dosyalarının repoya eklenmediğini kontrol edin. Daha önce GitHub'a anahtar yüklendiyse dosyayı silmek yeterli değildir; servis hesabı anahtarını Google Cloud Console'dan iptal edip yenisini oluşturun.
