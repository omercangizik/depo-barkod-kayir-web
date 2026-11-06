export const PRODUCT_FIELDS = [
  "barkodNo",
  "koliDisBarkodNo",
  "urunAdi",
  "anaKategori",
  "altKategori",
  "disKutuBoyutu",
  "marka",
  "urunKodu",
  "stokKodu",
  "malzeme",
  "olcu",
  "hacim",
  "renk",
  "paketIciAdet",
  "koliIciPaket",
  "birim",
  "mevcutStok",
  "minimumStok",
  "rafKonum",
  "alisFiyati",
  "satisFiyati",
  "kayitTarihi",
  "guncellemeTarihi",
  "aciklama",
] as const;

export type ProductField = (typeof PRODUCT_FIELDS)[number];

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  "Alüminyum Ürünler": ["Alüminyum Folyolar", "Alüminyum Yemek Kapları", "Alüminyum Kaseler", "Alüminyum Tepsiler", "Alüminyum Kapaklar", "Bölmeli Alüminyum Kaplar"],
  "Plastik Gıda Kapları": ["Sızdırmaz Kaplar", "Mikrodalga Kapları", "Plastik Yemek Kapları", "Plastik Salata Kapları", "Plastik Tatlı Kapları", "Plastik Pasta Kapları", "Plastik Çorba Kaseleri", "Plastik Sos Kapları", "Plastik Şarküteri Kapları", "Plastik Kahvaltılık Kaplar", "Plastik Dondurma Kapları", "Plastik Tepsiler", "Kristal Kaplar", "PET Gıda Kapları", "Bölmeli Plastik Kaplar", "Plastik Kapaklar"],
  "Bardak ve Bardak Aksesuarları": ["PET Bardaklar", "Plastik Bardaklar", "Karton Bardaklar", "Bardak Kapakları", "Bombe Bardak Kapakları", "Düz Bardak Kapakları", "Bardak Taşıyıcıları", "Bardak Kılıfları"],
  "Kraft Ambalaj Ürünleri": ["Kraft Çantalar", "Kraft Kese Kağıtları", "Kraft Kaseler", "Kraft Yemek Kutuları", "Kraft Pencereli Ambalajlar", "Kraft Doypack Ambalajlar", "Kraft Bardaklar", "Kraft Bardak Tutucuları", "Kraft Paketleme Kağıtları"],
  "Karton Gıda Ambalajları": ["Karton Yemek Kutuları", "Hamburger Kutuları", "Baklava Kutuları", "Pasta Kutuları", "Tatlı Kutuları", "Pizza Kutuları", "Pide Kutuları", "Sushi Kutuları", "Karton Kaseler", "Karton Tabaklar", "Karton Tepsiler", "Karton Kapaklar", "Diğer Karton Gıda Kutuları"],
  "Köpük Ürünler": ["Köpük Bardaklar", "Köpük Tabaklar", "Köpük Yemek Kapları", "Köpük Kaseler", "Köpük Kapaklar", "Köpük Tepsiler", "Köpük Servis Ambalajları", "Strafor Ambalajlar"],
  "Tek Kullanımlık Servis Ürünleri": ["Plastik Çatallar", "Plastik Kaşıklar", "Plastik Bıçaklar", "Çatal Kaşık Setleri", "Çatal Bıçak Setleri", "Ahşap Çatal ve Kaşıklar", "Dondurma Kaşıkları", "Cips Çatalları", "Pipetler", "İçecek Karıştırıcıları", "Kürdanlar", "Çöp Şişler", "Hesap Alma Kapları", "Kaşık ve Çatal Kılıfları", "Plastik Servis Tabakları"],
  "Kağıt Ürünleri": ["Peçeteler", "Baskılı Peçeteler", "Dispenser Peçeteler", "Kağıt Havlular", "Z Katlama Havlular", "Rulo Havlular", "Tuvalet Kağıtları", "Masa Örtüsü Kağıtları", "Yağlı Kağıtlar", "Pişirme Kağıtları", "Şamua Kağıtlar", "Diğer Kağıt Ürünleri"],
  "Mendil ve Islak Hijyen Ürünleri": ["Islak Mendiller", "Kolonyalı Mendiller", "Esanslı Mendiller", "Baskılı Mendiller", "Baskısız Mendiller", "Tekli Mendiller", "Paketli Mendiller"],
  "Poşet ve Plastik Torbalar": ["El Geçme Poşetler", "Atlet Poşetler", "Hışır Poşetler", "Kilitli Poşetler", "Şeffaf Poşetler", "Takviyeli Poşetler", "Saplı Poşetler", "Ambalaj Torbaları", "Gıda Torbaları", "Şarküteri Poşetleri", "Vakum Poşetleri", "Diğer Plastik Poşetler"],
  "Çöp Poşetleri": ["Küçük Boy Çöp Poşetleri", "Orta Boy Çöp Poşetleri", "Büyük Boy Çöp Poşetleri", "Battal Boy Çöp Poşetleri", "Jumbo Boy Çöp Poşetleri", "Hantal Boy Çöp Torbaları", "Büzgülü Çöp Torbaları", "Endüstriyel Çöp Torbaları", "Kokulu Çöp Poşetleri"],
  "Ambalaj ve Paketleme Malzemeleri": ["Streç Filmler", "Sanayi Tipi Streç Filmler", "Gıda Streç Filmleri", "Balonlu Naylonlar", "Patpat Ambalajlar", "Ambalaj Bantları", "Koli Bantları", "Paketleme Filmleri", "Koruyucu Ambalaj Malzemeleri"],
  "Şişe ve İçecek Ambalajları": ["PET Şişeler", "Detoks Şişeleri", "Ayran Şişeleri", "Su Şişeleri", "Diğer İçecek Şişeleri", "Şişe Kapakları", "Şişe ve Kapak Setleri"],
  "Kavanoz, Kova ve Teneke Ürünleri": ["Cam Kavanozlar", "Cam Kavanoz Kapakları", "Plastik Kavanozlar", "Plastik Kovalar", "Gıda Kovaları", "Midye Kovalar", "Teneke Kutular", "Metal Kaplar", "Metal Kovalar"],
  "Eldiven ve Koruyucu Ürünler": ["Nitril Eldivenler", "Lateks Eldivenler", "Vinil Eldivenler", "Plastik Eldivenler", "Şeffaf Eldivenler", "Bone ve Saç Örtüleri", "Maskeler", "Diğer Koruyucu Ürünler"],
  "Temizlik Kimyasalları": ["Bulaşık Deterjanları", "Bulaşık Makinesi Deterjanları", "Çamaşır Deterjanları", "Çamaşır Suları", "Genel Temizlik Ürünleri", "Yüzey Temizleyiciler", "Cam Temizleyiciler", "Yağ Çözücüler", "Kireç Çözücüler", "WC Temizleyiciler", "Sıvı Sabunlar", "Köpük Sabunlar", "El Yıkama Sıvıları", "Dezenfektanlar", "Parlatıcılar", "Makine Temizlik Ürünleri"],
  "Temizlik Ekipmanları": ["Moplar", "Mop Aparatları", "Mop Kovaları", "Temizlik Kovaları", "Temizlik Fırçaları", "Bulaşık Fırçaları", "Süngerler", "Mikrofiber Bezler", "Temizlik Bezleri", "Cam Temizlik Aparatları", "Çekçekler", "Yer Temizlik Aparatları", "Çöp Kovaları", "Diğer Temizlik Ekipmanları"],
  "Kolonya ve Koku Ürünleri": ["Kolonyalar", "Sprey Kolonyalar", "Dökme Kolonyalar", "Oda Kokuları", "Oda Kokusu Yedekleri", "Ortam Kokuları", "Esanslar", "Koku Gidericiler", "Diğer Koku Ürünleri"],
  "Adisyon ve Kırtasiye Ürünleri": ["Adisyon Fişleri", "Sipariş Fişleri", "Tahsilat Makbuzları", "Cep Tahsilat Makbuzları", "Numaralı Fişler", "Otokopili Fişler", "Hesap Fişleri", "Yaz-Boz Kağıtları", "Kırtasiye Sarf Malzemeleri", "Diğer İşletme Evrakları"],
  "Koli ve Taşıma Ambalajları": ["Karton Koliler", "Oluklu Mukavva Kutular", "Koli İçi Ayırıcılar", "Koli Seperatörleri", "Palet Ambalajları", "Taşıma Koruma Malzemeleri"],
  "Diğer Ürünler": ["Özel Üretim Ürünler", "Sınıflandırılmamış Ürünler", "Tanımlanamayan Ürünler", "Diğer Sarf Malzemeleri"],
};
export const DEFAULT_CATEGORIES = Object.keys(DEFAULT_SUBCATEGORIES);

export type Product = Record<ProductField, string> & { rowNumber?: number };

export const FIELD_LABELS: Record<ProductField, string> = {
  barkodNo: "Ürün / İç Barkod No",
  koliDisBarkodNo: "Koli Dış Barkod No",
  urunAdi: "Ürün Adı",
  anaKategori: "Ana Kategori",
  altKategori: "Alt Kategori",
  disKutuBoyutu: "Dış Kutu Boyutu",
  marka: "Marka",
  urunKodu: "Üretici Ürün Kodu",
  stokKodu: "Stok Kodu",
  malzeme: "Malzeme",
  olcu: "Ölçü / Ebat",
  hacim: "Hacim",
  renk: "Renk",
  paketIciAdet: "Paket İçi Adet",
  koliIciPaket: "Koli İçi Paket",
  birim: "Birim",
  mevcutStok: "Mevcut Stok",
  minimumStok: "Minimum Stok",
  rafKonum: "Depo Konumu",
  alisFiyati: "Alış Fiyatı",
  satisFiyati: "Satış Fiyatı",
  kayitTarihi: "Kayıt Tarihi",
  guncellemeTarihi: "Güncelleme Tarihi",
  aciklama: "Açıklama",
};

export const NUMERIC_FIELDS: ProductField[] = [
  "paketIciAdet",
  "koliIciPaket",
  "mevcutStok",
  "minimumStok",
  "alisFiyati",
  "satisFiyati",
];

export type ApiError = { message: string; code?: string };

export type PaginatedProducts = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductStats = {
  total: number;
  incomplete: number;
  addedToday: number;
  updatedToday: number;
  recent: Product[];
};

export type Categories = {
  anaKategoriler: string[];
  altKategoriler: { anaKategori: string; altKategori: string }[];
};

export type ImportReport = {
  totalRows: number;
  created: number;
  updated: number;
  skippedEmpty: number;
  errorCount: number;
  errors: { rowIndex: number; barkodNo: string; reason: string }[];
};

export function emptyProduct(): Product {
  return PRODUCT_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as Product);
}
