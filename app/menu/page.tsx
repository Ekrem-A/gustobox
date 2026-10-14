"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin, UtensilsCrossed } from "lucide-react";
import { isSupabaseConfigured, supabase, type MenuItem } from "@/lib/supabase";
import styles from "./menu.module.css";

const storeLocationUrl = "https://maps.google.com/?q=Kartaltepe+Mahallesi+Bayrampasa+Istanbul";
const instagramUrl = "https://www.instagram.com/gustobox.x/";

function formatPrice(price: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price);
}

export default function PublicMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let isActive = true;

    async function loadMenu() {
      try {
        const { data, error: queryError } = await client
          .from("menu_items")
          .select("id, name, description, price, category, image_url, available, sort_order, created_at")
          .eq("available", true)
          .order("sort_order", { ascending: true });

        if (!isActive) return;
        if (queryError?.code === "PGRST205" || queryError?.code === "42P01") {
          setError("Menü tablosu henüz kurulmamış. Supabase SQL Editor'de migration dosyasını çalıştır.");
        } else if (queryError) setError("Menü şu an yüklenemedi. Lütfen biraz sonra tekrar dene.");
        else setItems((data ?? []) as MenuItem[]);
      } catch {
        if (isActive) setError("Menü bağlantısı kurulamadı. Lütfen biraz sonra tekrar dene.");
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadMenu();
    return () => { isActive = false; };
  }, []);

  const categories = ["Tümü", ...new Set(items.map((item) => item.category))];
  const filteredItems = selectedCategory === "Tümü" ? items : items.filter((item) => item.category === selectedCategory);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="GustoBox ana sayfa">
          <span className={styles.brandMark}><UtensilsCrossed size={19} /></span>
          <span>gusto<span className={styles.brandAccent}>box</span><small>KARTALTEPE</small></span>
        </Link>
        <nav className={styles.headerNav} aria-label="Sayfa menüsü">
          <a href="#menu-list">Menü</a>
          <a className={styles.location} href={storeLocationUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> Kartaltepe, Bayrampaşa <ArrowUpRight size={13} /></a>
          <a className={styles.headerCta} href="#menu-list">Menüyü gör <ArrowRight size={15} /></a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><i /> HER GÜN TAZE, HER ISIRIKTA GUSTO</span>
          <h1>İyi malzeme.<br />Bol lezzet<span>.</span></h1>
          <p>Bayrampaşa&apos;da her gün taze hazırlanan sandviç, tost ve waffle. İyi malzeme, bol lezzet.</p>
          <div className={styles.heroActions}>
            <a href="#menu-list" className={styles.scrollLink}>Menüyü keşfet <ArrowDown size={15} /></a>
            <a href={storeLocationUrl} className={styles.heroLocation} target="_blank" rel="noreferrer"><MapPin size={15} /> Yol tarifi</a>
          </div>
        </div>
        <div className={styles.heroImage} role="img" aria-label="GustoBox özel sandviçi" />
        <span className={styles.heroNote}>GUSTOBOX <i /> BAYRAMPAŞA&apos;DA TAZE</span>
      </section>

      <div className={styles.ticker} aria-label="GustoBox menüsü">
        <span>HER GÜN TAZE</span><i />
        <span>SANDVİÇ</span><i />
        <span>TOST</span><i />
        <span>WAFFLE</span>
      </div>

      <section className={styles.menuSection} id="menu-list">
        <div className={styles.menuIntro}><div><span className={styles.sectionKicker}>BUGÜNÜN FAVORİLERİ</span><h2>Bir güzellik seç.</h2></div><span className={styles.freshNote}><i /> Günlük taze hazırlanır</span></div>
        {isSupabaseConfigured && <div className={styles.categoryTabs} role="tablist" aria-label="Menü kategorileri">{categories.map((category) => <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} className={selectedCategory === category ? styles.selectedTab : ""} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div>}

        {!isSupabaseConfigured ? (
          <div className={styles.stateMessage}><strong>Menü bağlantısı hazırlanıyor.</strong><span>Supabase bilgileri eklendiğinde güncel menümüz burada görünecek.</span></div>
        ) : loading ? (
          <div className={styles.stateMessage}>Menü yükleniyor...</div>
        ) : error ? (
          <div className={styles.stateMessage}><strong>{error}</strong><span>İşletme ekibiyle iletişime geçebilirsin.</span></div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.stateMessage}><strong>Bu kategoride şu an ürün yok.</strong><span>Diğer lezzetlere göz at.</span></div>
        ) : (
          <div className={styles.productGrid}>{filteredItems.map((item, index) => (
            <article className={styles.productCard} key={item.id}>
              <div className={styles.productImage} role="img" aria-label={item.name} style={{ backgroundImage: `url("${item.image_url}")` }}>
                {index === 0 && <span className={styles.favoriteLabel}>GUSTO FAVORİSİ</span>}
              </div>
              <div className={styles.productDetails}><div className={styles.productTitle}><h3>{item.name}</h3><strong>{formatPrice(item.price)}</strong></div><p>{item.description}</p><span className={styles.productCategory}>{item.category}</span></div>
            </article>
          ))}</div>
        )}
      </section>

      <section className={styles.locationSection} id="location">
        <div><span className={styles.locationKicker}>KARTALTEPE, BAYRAMPAŞA</span><h2>Lezzet molan<br />Kartaltepe&apos;de.</h2></div>
        <a className={styles.directionsLink} href={storeLocationUrl} target="_blank" rel="noreferrer"><MapPin size={18} /><span>Kartaltepe, Bayrampaşa</span><ArrowUpRight size={17} /></a>
      </section>

      <footer className={styles.footer}><span>Güzel şeyler, güzel malzemelerle başlar.</span><span className={styles.footerBrand}>GUSTOBOX <i>·</i> BAYRAMPAŞA <a className={styles.instagramLink} href={instagramUrl} target="_blank" rel="noreferrer" aria-label="GustoBox Instagram hesabını aç">Instagram <ArrowUpRight size={13} /></a></span></footer>
    </main>
  );
}