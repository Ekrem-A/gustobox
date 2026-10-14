"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, type MenuItem } from "@/lib/supabase";
import {
  ArrowUpRight,
  Bell,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu as MenuIcon,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Save,
  ShoppingBag,
  Soup,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

const categories = ["Tümü", "Sandviçler", "Atıştırmalıklar", "İçecekler"];
const blankForm = { name: "", description: "", price: "", category: "Sandviçler", image_url: "/gusto-sandwich.jpg" };
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

function formatPrice(price: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price);
}

export default function MenuDashboard() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(blankForm);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imagePreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let isActive = true;
    const client = supabase;

    async function loadItems() {
      setItemsLoading(true);
      try {
        const { data, error } = await client.from("menu_items").select("*").order("sort_order").order("created_at");
        if (!isActive) return;
        if (error?.code === "PGRST205" || error?.code === "42P01") {
          setNotice("Menü tablosu yok. Supabase SQL Editor'de supabase/migrations dosyasını çalıştır.");
        } else if (error) setNotice(`Menü yüklenemedi: ${error.message}`);
        else setItems((data ?? []) as MenuItem[]);
      } catch {
        if (isActive) setNotice("Supabase bağlantısı kurulamadı. Bağlantı ayarlarını kontrol et.");
      } finally {
        if (isActive) setItemsLoading(false);
      }
    }

    async function loadSession() {
      const { data, error } = await client.auth.getSession();
      if (!isActive) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
      if (data.session?.user.app_metadata.role === "admin") await loadItems();
    }

    void loadSession();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.app_metadata.role === "admin") void loadItems();
      else setItems([]);
      setAuthLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === "Tümü" || item.category === activeCategory;
    const matchesSearch = `${item.name} ${item.description}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"));
    return matchesCategory && matchesSearch;
  });
  const activeCount = items.filter((item) => item.available).length;

  if (!isSupabaseConfigured || !supabase) {
    return <main className="auth-screen"><section className="auth-panel"><span className="brand-mark"><UtensilsCrossed size={20} /></span><div className="section-kicker">GUSTOBOX YÖNETİM</div><h1>Supabase bağlantısı gerekli</h1><p>Menüyü kaydedip yönetebilmek için proje bilgilerini `.env.local` dosyasına ekle.</p><ol><li>`.env.example` dosyasını `.env.local` olarak kopyala.</li><li>Supabase URL ve anon key değerlerini gir.</li><li>`supabase/README.md` içindeki tablo kurulumunu tamamla.</li></ol><a className="secondary-button" href="/menu">QR menü sayfasını aç</a></section></main>;
  }

  if (authLoading) {
    return <main className="auth-screen"><section className="auth-panel auth-loading"><LoaderCircle size={25} /><span>GustoBox açılıyor...</span></section></main>;
  }

  if (!session) {
    return <main className="auth-screen"><section className="auth-panel"><span className="brand-mark"><UtensilsCrossed size={20} /></span><div className="section-kicker">GUSTOBOX YÖNETİM</div><h1>Tekrar hoş geldin.</h1><p>Menünü düzenlemek için işletme hesabınla giriş yap.</p><form className="auth-form" onSubmit={signIn}><label>E-posta<input type="email" required autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label><label>Şifre<input type="password" required autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} /></label>{authError && <span className="auth-error" role="alert">{authError}</span>}<button className="primary-button" type="submit">Yönetim paneline gir</button></form><a className="auth-public-link" href="/menu">QR menüyü görüntüle <ArrowUpRight size={14} /></a></section></main>;
  }

  if (session.user.app_metadata.role !== "admin") {
    return <main className="auth-screen"><section className="auth-panel"><span className="brand-mark"><UtensilsCrossed size={20} /></span><div className="section-kicker">GUSTOBOX YÖNETİM</div><h1>Bu hesap yönetici değil.</h1><p>Bu Supabase hesabına admin rolü atanmamış. Kurulum için `supabase/README.md` dosyasına bak.</p><button className="secondary-button" type="button" onClick={() => void signOut()}><LogOut size={15} /> Çıkış yap</button></section></main>;
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError("Giriş başarısız. E-posta ve şifreni kontrol et.");
    } catch {
      setAuthError("Supabase bağlantısı kurulamadı. Proje ayarlarını kontrol et.");
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const client = supabase;
    setIsSaving(true);
    setNotice("");
    let imageUrl = form.image_url.trim() || "/gusto-sandwich.jpg";
    let uploadedImagePath: string | null = null;
    try {
      if (selectedImage) {
        const extension = selectedImage.type === "image/png" ? "png" : selectedImage.type === "image/webp" ? "webp" : "jpg";
        uploadedImagePath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage.from("menu-images").upload(uploadedImagePath, selectedImage, {
          cacheControl: "3600",
          contentType: selectedImage.type,
          upsert: false,
        });
        if (uploadError) {
          setNotice(`Görsel yüklenemedi: ${uploadError.message}`);
          return;
        }
        imageUrl = client.storage.from("menu-images").getPublicUrl(uploadedImagePath).data.publicUrl;
      }
      const values = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        image_url: imageUrl,
      };
      const result = editingItemId
        ? await client.from("menu_items").update(values).eq("id", editingItemId).select().single()
        : await client.from("menu_items").insert({ ...values, available: true, sort_order: items.length + 1 }).select().single();
      if (result.error) {
        if (uploadedImagePath) await client.storage.from("menu-images").remove([uploadedImagePath]);
        setNotice(`Ürün kaydedilemedi: ${result.error.message}`);
        return;
      }
      const savedItem = result.data as MenuItem;
      setItems((current) => editingItemId
        ? current.map((item) => item.id === savedItem.id ? savedItem : item)
        : [savedItem, ...current]);
      setActiveCategory("Tümü");
      setSearch("");
      setForm(blankForm);
      clearSelectedImage();
      setIsModalOpen(false);
      setNotice(editingItemId ? `${savedItem.name} güncellendi.` : `${savedItem.name} menüye eklendi.`);
      setEditingItemId(null);
    } catch {
      setNotice("Ürün kaydedilemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!imageTypes.has(file.type)) {
      setNotice("JPG, PNG veya WebP formatında bir görsel seç.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > maxImageSize) {
      setNotice("Görsel boyutu 5 MB'dan küçük olmalı.");
      event.currentTarget.value = "";
      return;
    }
    setNotice("");
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    imagePreviewRef.current = URL.createObjectURL(file);
    setImagePreview(imagePreviewRef.current);
    setSelectedImage(file);
  }

  function clearSelectedImage() {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    imagePreviewRef.current = null;
    setImagePreview("");
    setSelectedImage(null);
  }

  async function toggleAvailability(item: MenuItem) {
    if (!supabase) return;
    const nextAvailability = !item.available;
    try {
      const { error } = await supabase.from("menu_items").update({ available: nextAvailability }).eq("id", item.id);
      if (error) {
        setNotice(`Durum güncellenemedi: ${error.message}`);
        return;
      }
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, available: nextAvailability } : entry));
    } catch {
      setNotice("Durum güncellenemedi. Supabase bağlantısını kontrol et.");
    }
  }

  function openNewItem() {
    setEditingItemId(null);
    setForm(blankForm);
    clearSelectedImage();
    setIsModalOpen(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, image_url: item.image_url });
    clearSelectedImage();
    setIsModalOpen(true);
  }

  async function deleteItem() {
    if (!supabase || !editingItemId) return;
    const item = items.find((entry) => entry.id === editingItemId);
    if (!item || !window.confirm(`“${item.name}” ürününü silmek istiyor musun?`)) return;
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", editingItemId);
      if (error) {
        setNotice(`Ürün silinemedi: ${error.message}`);
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== editingItemId));
      setIsModalOpen(false);
      setEditingItemId(null);
      setNotice(`${item.name} menüden silindi.`);
    } catch {
      setNotice("Ürün silinemedi. Supabase bağlantısını kontrol et.");
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(`Çıkış yapılamadı: ${error.message}`);
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="GustoBox ana sayfa">
          <span className="brand-mark"><UtensilsCrossed size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">gusto<span>box</span><small>LEZZETİN KUTUSU</small></span>
        </a>
        <div className="workspace-label">ÇALIŞMA ALANI</div>
        <nav className="sidebar-nav" aria-label="Ana menü">
          <a className="nav-link" href="#overview"><LayoutDashboard size={18} /><span>Genel bakış</span></a>
          <a className="nav-link active" href="#menu"><MenuIcon size={18} /><span>Menü yönetimi</span><span className="nav-count">{items.length}</span></a>
          <a className="nav-link" href="/menu"><QrCode size={18} /><span>QR menü</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><Soup size={19} /></span><strong>Bir şeye mi takıldın?</strong><span>GustoBox ekibi yanında.</span><a href="mailto:merhaba@gustobox.com">Bize ulaş <ArrowUpRight size={13} /></a></div>
          <button className="profile-button" type="button" onClick={() => void signOut()}><span className="avatar">G</span><span className="profile-copy"><strong>GustoBox Bayrampaşa</strong><small>Çıkış yap</small></span><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-area" id="top">
        <header className="topbar">
          <div className="breadcrumb"><span>GustoBox</span><span className="crumb-divider">/</span><strong>Menü yönetimi</strong></div>
          <div className="topbar-actions"><span className="open-status"><i /> Şu an açık</span><button className="icon-button notification-button" type="button" aria-label="Bildirimler" onClick={() => setNotice("Yeni bildirimin yok.")}><Bell size={18} /><i /></button><button className="top-avatar" type="button" aria-label="Hesap menüsü" onClick={() => setNotice("GustoBox Bayrampaşa hesabı.")}>G</button></div>
        </header>

        <div className="page-content">
          <section className="welcome-row" id="overview"><div><div className="eyebrow"><span className="eyebrow-line" /> GUSTOBOX BAYRAMPAŞA</div><h1>Menün, senin kuralların<span>.</span></h1><p>Günün lezzetlerini düzenle, misafirlerine en güzel halinle sun.</p></div><button className="primary-button" type="button" onClick={openNewItem}><Plus size={17} /> Yeni ürün ekle</button></section>

          <section className="summary-grid" aria-label="İşletme özeti">
            <article className="summary-card summary-highlight"><div className="summary-top"><span>MENÜDE YAYINDA</span><span className="summary-icon"><Eye size={17} /></span></div><div className="summary-number">{activeCount}<small> ürün</small></div><div className="summary-foot"><span>Misafirlerin şu an görebiliyor</span></div><div className="availability-dots" aria-hidden="true">{items.map((item) => <i key={item.id} className={item.available ? "dot-on" : "dot-off"} />)}</div></article>
            <article className="summary-card"><div className="summary-top"><span>TOPLAM ÜRÜN</span><span className="summary-icon coral-icon"><ShoppingBag size={17} /></span></div><div className="summary-number">{items.length}</div><div className="summary-foot"><span>Menündeki tüm ürünler</span></div><div className="mini-bars" aria-hidden="true">{items.map((item) => <i key={item.id} />)}</div></article>
            <article className="summary-card"><div className="summary-top"><span>GİZLİ ÜRÜN</span><span className="summary-icon blue-icon"><EyeOff size={17} /></span></div><div className="summary-number">{items.length - activeCount}</div><div className="summary-foot"><span>QR menüde gösterilmiyor</span></div><div className="prep-track"><span style={{ width: `${items.length ? ((items.length - activeCount) / items.length) * 100 : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-top"><span>KATEGORİ</span><span className="summary-icon green-icon"><MenuIcon size={17} /></span></div><div className="summary-number">{categories.length - 1}</div><div className="summary-foot"><span>Menü kategorisi</span></div><div className="availability-dots" aria-hidden="true">{categories.slice(1).map((category) => <i key={category} className="dot-on" />)}</div></article>
          </section>

          <section className="menu-section" id="menu">
            <div className="section-heading"><div><div className="section-kicker">VİTRİNİN</div><h2>Menü ürünleri <span>{items.length}</span></h2></div><a className="secondary-button" href="/menu" target="_blank" rel="noreferrer"><Eye size={16} /> Menüyü önizle</a></div>
            <div className="menu-toolbar"><div className="category-tabs" role="tablist" aria-label="Ürün kategorileri">{categories.map((category) => <button key={category} type="button" role="tab" aria-selected={activeCategory === category} className={`category-tab${activeCategory === category ? " selected" : ""}`} onClick={() => setActiveCategory(category)}>{category}<span>{category === "Tümü" ? items.length : items.filter((item) => item.category === category).length}</span></button>)}</div><label className="search-box"><Search size={16} /><input aria-label="Menüde ara" placeholder="Menüde ara..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
            <div className="table-wrap"><div className="table-head"><span>ÜRÜN</span><span>KATEGORİ</span><span>FİYAT</span><span>DURUM</span><span aria-label="İşlemler" /></div><div className="product-list">
              {itemsLoading ? <div className="empty-state"><LoaderCircle size={21} /><strong>Menü ürünleri yükleniyor...</strong></div> : filteredItems.map((item) => <article className={`product-row${item.available ? "" : " product-unavailable"}`} key={item.id}><div className="product-cell"><div className="product-photo" role="img" aria-label={item.name} style={{ backgroundImage: `url("${item.image_url}")` }} /><div className="product-copy"><strong>{item.name}</strong><span>{item.description}</span></div></div><div className="category-cell"><span className={`category-tag ${item.category === "Sandviçler" ? "tag-sandwich" : item.category === "İçecekler" ? "tag-drink" : "tag-snack"}`}>{item.category}</span></div><div className="price-cell">{formatPrice(item.price)}</div><div className="status-cell"><button className={`availability-toggle${item.available ? " is-on" : ""}`} type="button" role="switch" aria-checked={item.available} aria-label={`${item.name} ${item.available ? "yayında" : "yayında değil"}`} onClick={() => void toggleAvailability(item)}><span /></button><span>{item.available ? "Yayında" : "Gizli"}</span></div><button className="row-more" type="button" aria-label={`${item.name} düzenle`} onClick={() => openEditItem(item)}><MoreHorizontal size={19} /></button></article>)}
              {!itemsLoading && filteredItems.length === 0 && <div className="empty-state"><Search size={21} /><strong>Aramana uygun ürün bulamadık.</strong><span>Başka bir ürün adı ya da kategori deneyebilirsin.</span></div>}
            </div></div>
            <div className="table-footer"><span>Toplam <strong>{filteredItems.length}</strong> ürün gösteriliyor</span><span className="sort-button"><MenuIcon size={14} /> Menü sırası</span></div>
          </section>
          <footer className="page-footer"><span>Güzel şeyler, güzel malzemelerle başlar.</span><span>GUSTOBOX <i>·</i> 2026</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><Check size={17} /><span>{notice}</span><button type="button" aria-label="Bildirimi kapat" onClick={() => setNotice("")}><X size={16} /></button></div>}
      {isModalOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false); }}>
        <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><span className="section-kicker">MENÜNÜ ZENGİNLEŞTİR</span><h2 id="modal-title">{editingItemId ? "Ürünü düzenle" : "Yeni ürün ekle"}</h2></div><button className="icon-button" type="button" aria-label="Pencereyi kapat" onClick={() => setIsModalOpen(false)}><X size={19} /></button></div>
          <form onSubmit={saveItem}>
            <label>Ürün adı<input autoFocus required maxLength={80} placeholder="Örn. Gusto özel sandviç" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Açıklama <span className="optional-label">İSTEĞE BAĞLI</span><textarea rows={3} maxLength={240} placeholder="İçindekileri kısaca anlat..." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="image-upload-field"><label className="image-picker"><span className="image-field-label"><ImagePlus size={14} /> Cihazdan fotoğraf seç</span><input className="image-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} /><span className="image-upload-hint">{selectedImage ? selectedImage.name : "JPG, PNG veya WebP · En fazla 5 MB"}</span></label><div className="image-preview" role="img" aria-label="Ürün fotoğrafı önizlemesi" style={{ backgroundImage: `url("${imagePreview || form.image_url}")` }} /></div>
            <div className="form-row"><label>Fiyat<input required type="number" min="1" step="1" placeholder="₺ 0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Sandviçler</option><option>Atıştırmalıklar</option><option>İçecekler</option></select></label></div>
            <div className="modal-actions">{editingItemId && <button className="delete-button" type="button" onClick={() => void deleteItem()}><Trash2 size={15} /> Ürünü sil</button>}<button className="secondary-button" type="button" onClick={() => setIsModalOpen(false)}>Vazgeç</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={15} /> : editingItemId ? <Save size={15} /> : <Plus size={16} />}{isSaving ? "Kaydediliyor..." : editingItemId ? "Değişiklikleri kaydet" : "Ürünü ekle"}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}