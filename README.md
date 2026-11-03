# Öztürk Ambalaj Deposu

Barkodlu ürün kayıt sistemi.

Ambalaj deposundaki ürünleri telefon veya bilgisayar kamerasıyla barkod okutarak kaydeden, Google Sheets üzerinde saklayan mobil uyumlu web uygulaması.

## Özellikler

- Kamera ile barkod okuma (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR)
- Manuel barkod arama
- Yeni ürün ekleme ve mevcut ürün düzenleme
- Boş alanların dolu bilgileri silmemesi; alan temizleme
- Ürün listesi, arama, kategori ve eksik bilgi filtresi
- Excel içe / dışa aktarma
- Verilerin Google Sheets üzerinde tutulması

## Gereksinimler

- Node.js 20 veya üzeri
- Google Cloud servis hesabı (Sheets API açık)
- Verilen Google Sheets belgesine düzenleyici erişimi

Spreadsheet ID: `10KCbcRYIWy3uKwlYiViCww8EqEyCUg70W5yVca3AkBU`

## Kurulum

### 1. Bağımlılıklar

Proje kökünde:

```bash
npm install
npm run install:all
```

### 2. Ortam dosyaları

`backend/.env.example` dosyasını `backend/.env` olarak kopyalayın.

`frontend/.env.example` dosyasını `frontend/.env` olarak kopyalayın.

Uygulama, personelin ortak kullandığı tek bir `APP_PASSWORD` ile giriş yapar. Varsayılan şifre `3456`'dır; bu parola yalnızca backend ortamında tutulur.

### 3. Google servis hesabı

Mevcut tablo verileri silinmez. Uygulama başlarken `Urunler` ve `Kategoriler` sayfalarını yoksa oluşturur, eksik kolon başlıklarını ekler, varsayılan ana kategorileri tamamlar.

1. [Google Cloud Console](https://console.cloud.google.com/) içinde bir proje seçin veya oluşturun.
2. **APIs & Services → Library** üzerinden **Google Sheets API** ürününü etkinleştirin.
3. **APIs & Services → Credentials → Create credentials → Service account** ile servis hesabı oluşturun.
4. Servis hesabı için JSON anahtar indirin. Dosyayı `backend/google-credentials.json` olarak kaydedin (bu dosya Git'e gitmez).
5. JSON içindeki `client_email` değerini kopyalayın.
6. Google Sheets belgesini bu e-posta ile **Düzenleyici** olarak paylaşın:
   https://docs.google.com/spreadsheets/d/10KCbcRYIWy3uKwlYiViCww8EqEyCUg70W5yVca3AkBU/edit

`backend/.env` örneği:

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
APP_PASSWORD=3456
GOOGLE_SPREADSHEET_ID=10KCbcRYIWy3uKwlYiViCww8EqEyCUg70W5yVca3AkBU
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

JSON dosyası kullanmak istemezseniz e-posta ve özel anahtarı `.env` içine yazabilirsiniz:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=servis-hesabi@proje.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Mevcut tabloyu inceleme

```bash
npm run inspect-sheets --prefix backend
```

Bu komut sayfa adlarını ve ürün sayısını yazdırır; mevcut satırları silmez.

### 5. Geliştirme sunucuları

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Sağlık kontrolü: http://localhost:4000/api/health

Sağlık kontrolü `sheets: true` dönene kadar Google bağlantısı tamamlanmış sayılmaz.

## Telefon kamerası

Tarayıcı kamera erişimi için güvenli köken (HTTPS veya localhost) gerekir.

Aynı ağdaki telefonla denemek için `frontend/.env` içine şunu yazın:

```env
VITE_DEV_HTTPS=true
```

Ardından `npm run dev` ile yeniden başlatın. Tarayıcıdaki kendi imzalı sertifikayı bir kez kabul etmeniz gerekir.

Kamera izni verilmezse barkod ekranındaki manuel arama kullanılır.

## Kullanım

1. Ana sayfada **Barkod Okut**.
2. Barkod okutulur veya yazılır.
3. Kayıt varsa düzenleme formu, yoksa yeni ürün formu açılır.
4. Zorunlu alanlar: Barkod No, Ürün Adı, Ana Kategori.
5. Kaydet yalnızca değişen veya yeni girilen alanları günceller.
6. Bir alanı silmek için **Alanı temizle** kullanın.
7. Excel aktarımında kolonları eşleştirip onaylayın. Boş hücreler mevcut veriyi silmez.

## API

| Metod | Yol | Açıklama |
| --- | --- | --- |
| GET | `/api/health` | API ve Sheets bağlantı durumu (hassas Sheet bilgisi döndürmez) |
| POST | `/api/auth/login` | Uygulama parolasıyla güvenli oturum açma |
| GET | `/api/products` | Ürün listesi (`search`, `category`, `incomplete`, `page`, `limit`) |
| GET | `/api/products/stats` | Özet sayılar |
| GET | `/api/products/barcode/:barcode` | Barkod ile ürün |
| POST | `/api/products` | Yeni ürün |
| PUT | `/api/products/barcode/:barcode` | Güncelleme (`updates`, `clearFields`) |
| POST | `/api/products/import/preview` | Excel önizleme |
| POST | `/api/products/import` | Excel aktarımı |
| GET | `/api/products/export` | Excel indirme |
| GET | `/api/categories` | Kategoriler |
| POST | `/api/categories` | Alt kategori ekleme |

Ürün ve kategori uçları, `HttpOnly`, `SameSite=Strict` oturum çerezi ile korunur. Oturum açma denemeleri sınırlıdır.

## Yayına alma

1. Google kimlik bilgilerini sunucu ortam değişkenlerine yazın. JSON dosyasını repoya koymayın.
2. `APP_PASSWORD` ortak giriş şifresini backend ortamında ayarlayın. `FRONTEND_ORIGIN` değerini uygulamanızın tam HTTPS adresi yapın.
3. Üretimi derleyin:

```bash
npm run install:all
npm run build
```

4. `NODE_ENV=production` ile backend'i başlatın:

```bash
npm start
```

Üretimde backend `frontend/dist` dosyalarını da sunar. Kamera için HTTPS zorunludur.

### Ortam değişkenleri (üretim)

```env
PORT=4000
NODE_ENV=production
FRONTEND_ORIGIN=https://sizin-alan-adiniz.com
APP_PASSWORD=3456
GOOGLE_SPREADSHEET_ID=10KCbcRYIWy3uKwlYiViCww8EqEyCUg70W5yVca3AkBU
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`GOOGLE_PRIVATE_KEY` satır sonlarını `\n` olarak saklayın.

### Önerilen barındırma

- Tek süreç: Railway, Render, Fly.io veya bir VPS
- Önünde Nginx / Caddy ile HTTPS
- Frontend ayrı barındırılırsa API isteklerini `/api` yoluna yönlendirin

### Netlify ile yayınlama

Bu proje Netlify'de statik frontend, ayrı bir Node.js servisinde backend olarak çalışır. Netlify hesabınıza Git deposunu bağlayın; `netlify.toml` build komutunu ve yayın klasörünü ayarlar. Backend'i Render, Railway veya bir VPS üzerinde ayrıca yayınlayın.

Netlify ortam değişkenlerine `API_BACKEND_URL` olarak backend'in HTTPS origin adresini yazın (ör. `https://depo-api.onrender.com`). Netlify build'i `/api/*` isteklerini backend'e proxy eden yönlendirmeyi üretir. Backend ortam değişkenlerinde `FRONTEND_ORIGIN` değerini Netlify sitenizin adresi olarak ayarlayın; `APP_PASSWORD` ve Google Sheets kimlik bilgileri yalnızca backend'de saklanmalıdır.

Netlify dağıtımında `API_BACKEND_URL` tanımlı değilse build hata verir; böylece backend'e bağlanmayan bir canlı sürüm yayınlanmaz. Netlify ortam değişkenleri yalnızca frontend build'i için, backend gizli ayarları ise backend servisinin panelinde tanımlanmalıdır.

## Güvenlik

- Servis hesabı anahtarı yalnızca backend `.env` veya gizli dosyada durur.
- `.env` ve `google-credentials.json` Git'e eklenmez.
- Excel yüklemesi 10 MB, XLSX dosya türü, 10.000 satır, 100 sütun ve sıkıştırılmış dosya boyutu denetimleriyle sınırlandırılmıştır.
- Uygulama tek ortak `APP_PASSWORD` ile oturum açar; ayrı kullanıcı veya rol yönetimi yoktur.
- Barkod bazlı kilit, aynı barkodun eşzamanlı yazılmasını engeller.

## Proje yapısı

```
frontend/   React + Vite arayüz
backend/    Express API ve Google Sheets
README.md
```
