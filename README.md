# Öztürk Ambalaj Deposu

Barkodla ürün arama ve Google Sheets üzerinde ürün kaydı için mobil uyumlu web uygulaması.

## Özellikler

- Telefon kamerasıyla barkod okuma ve manuel barkod/ürün arama
- Ürün ekleme, güncelleme, listeleme ve kategori yönetimi
- Excel içe/dışa aktarma
- Ürün verilerini Google Sheets üzerinde saklama

## Proje yapısı

- `frontend/`: React + Vite arayüzü
- `backend/`: Express API ve Google Sheets bağlantısı
- `render.yaml`: frontend ve API'yi tek Render Web Service üzerinde yayınlama yapılandırması
- `frontend/vercel.json`: Vercel'de ayrı frontend kullanımı için yönlendirme yapılandırması

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

Backend testleri Render'ın kullanacağı `/health` uç noktasını ve giriş ekranı olmadan API erişimini Google Sheets'e bağlanmadan denetler. Google bağlantısını deploy sonrası ayrıca `https://<render-servis-adı>.onrender.com/api/health` adresinden doğrulayın; `sheets: true` başarılı erişim anlamına gelir. Bu kontrol tablo verilerini değiştirmez.

## Render ile tek serviste canlıya alma

Bu kurulum frontend'i ve API'yi aynı Render Web Service'te sunar. Böylece harici bir API URL'si, Vercel deployment'ı ve iki servis arasında origin eşleştirmesi gerekmez; frontend API'yi aynı alan adındaki `/api` yolundan çağırır.

1. Render'da **New → Web Service** ile `omercangizik/depo-barkod-kayir-web` GitHub deposunu bağlayın.
2. Servis ayarlarını şöyle girin:

   | Alan | Değer |
   | --- | --- |
   | Root Directory | boş bırakın (repo kökü) |
   | Runtime | Node |
   | Build Command | `npm ci --prefix backend --include=dev && npm ci --prefix frontend --include=dev && npm run build --prefix backend && npm run build --prefix frontend` |
   | Start Command | `npm start --prefix backend` |
   | Health Check Path | `/health` |
   | Node version | `22` (`.node-version`) |

   Repo kökündeki `render.yaml` bu ayarlarla Blueprint deploy da oluşturabilir. Render'ın otomatik `PORT` ve `0.0.0.0` ayarlarını değiştirmeyin.

3. **Environment → Environment Variables** alanına şunları ekleyin:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `VITE_API_URL` | `/api` (Blueprint tarafından ayarlanır; frontend ve API aynı origin'de) |
   | `GOOGLE_SPREADSHEET_ID` | Google Sheet kimliği |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Servis hesabı JSON dosyasındaki `client_email` |
   | `GOOGLE_PRIVATE_KEY` | Aynı JSON'daki `private_key` değerinin tamamı; `\\n` satır sonları korunmalı |

   Bu tek servisli yapıda `FRONTEND_ORIGIN` gerekmez; varsa eski Vercel origin değerini kaldırın. `VITE_API_URL` başka bir host içermemeli. Google anahtarını Render'a girin; GitHub'a veya Vercel'e koymayın.

4. Deploy tamamlandığında Render'ın verdiği `https://...onrender.com` adresini açın; bu adres hem web uygulaması hem API olacaktır.

### Yayın sonrası kontrol

1. `https://<render-servis-adı>.onrender.com/health` → `{"success":true,"data":{"api":true}}` beklenir.
2. Aynı hosttaki `/api/health` → `data.sheets: true` döndürmeli; bu kontrol Google Sheets'e salt okunur istek yapar.
3. Render adresinde ürün arama ve kamera izinlerini kontrol edin. Gerçek ürün kaydı Google Sheet'i değiştirir; kayıt kontrolünde geçici bir ürün kullanın.

## Uygulama kullanımı

1. Barkodu kamerayla okutun veya manuel olarak arayın.
2. Ürün bulunursa mevcut alanları düzenleyin; bulunmazsa yeni kayıt açılır.
3. Kayıt için Barkod No, Ürün Adı ve Ana Kategori gereklidir.
4. Excel aktarımında dosyadaki kolonları eşleştirip önizlemeyi kontrol edin.

## Güvenlik ve gizli dosyalar

- `.env`, `.env.*` (örnek dosyalar dışında), `google-credentials.json` ve servis hesabı anahtarı Git dışında tutulur.
- Google kimlik bilgileri yalnızca Render backend ortamında saklanır.
- Uygulamaya giriş parolası yoktur; Render URL'sine erişen kişiler uygulamayı kullanabilir. Şirket içi kullanım için URL'yi yalnızca çalışanlarla paylaşın.
- Canlıya almadan önce `git status` ve `git ls-files` ile anahtar veya `.env` dosyalarının repoya eklenmediğini kontrol edin. Daha önce GitHub'a anahtar yüklendiyse dosyayı silmek yeterli değildir; servis hesabı anahtarını Google Cloud Console'dan iptal edip yenisini oluşturun.
