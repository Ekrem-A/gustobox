"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, type MenuItem } from "@/lib/supabase";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
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

const blankForm = { name: "", description: "", price: "", category: "", image_url: "/gusto-sandwich.jpg" };
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;
type HeroSlide = { id: string; image_url: string; storage_path: string; sort_order: number };

function formatPrice(price: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price);
}

export default function MenuDashboard() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isHeroSlidesModalOpen, setIsHeroSlidesModalOpen] = useState(false);
  const [selectedHeroImage, setSelectedHeroImage] = useState<File | null>(null);
  const [isSavingHeroSlide, setIsSavingHeroSlide] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
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

        const { data: categoryData, error: categoryError } = await client
          .from("menu_categories")
          .select("name")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (!isActive) return;
        if (categoryError?.code === "PGRST205" || categoryError?.code === "42P01") {
          setMenuCategories([...new Set((data ?? []).map((item) => item.category))]);
        } else if (categoryError) setNotice(`Kategoriler yüklenemedi: ${categoryError.message}`);
        else setMenuCategories((categoryData ?? []).map((category) => category.name));

        const { data: slideData, error: slideError } = await client
          .from("hero_slides")
          .select("id, image_url, storage_path, sort_order")
          .order("sort_order", { ascending: true });
        if (!isActive) return;
        if (slideError?.code === "PGRST205" || slideError?.code === "42P01") setHeroSlides([]);
        else if (slideError) setNotice(`Vitrin görselleri yüklenemedi: ${slideError.message}`);
        else setHeroSlides((slideData ?? []) as HeroSlide[]);
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
      else {
        setItems([]);
        setMenuCategories([]);
        setHeroSlides([]);
      }
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
  const categoryFilters = ["Tümü", ...menuCategories];
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
          setNotice(uploadError.message.toLowerCase().includes("bucket not found")
            ? "menu-images bucket'ı yok. Supabase SQL Editor'de 20261015010000_create_menu_image_storage.sql migration'ını çalıştır."
            : `Görsel yüklenemedi: ${uploadError.message}`);
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
    setForm({ ...blankForm, category: menuCategories[0] ?? "" });
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

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || isSavingCategory) return;
    const name = newCategory.trim();
    if (!name) return;
    setIsSavingCategory(true);
    try {
      const { data, error } = await supabase
        .from("menu_categories")
        .insert({ name, sort_order: menuCategories.length + 1 })
        .select("name")
        .single();
      if (error) {
        setNotice(`Kategori eklenemedi: ${error.message}`);
        return;
      }
      setMenuCategories((current) => [...current, data.name]);
      setNewCategory("");
      setNotice(`${data.name} kategorisi eklendi.`);
    } catch {
      setNotice("Kategori eklenemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function removeCategory(category: string) {
    if (!supabase || isSavingCategory) return;
    const productCount = items.filter((item) => item.category === category).length;
    if (productCount > 0) {
      setNotice("Bu kategoriyi silmeden önce ürünlerini başka kategoriye taşı.");
      return;
    }
    setIsSavingCategory(true);
    try {
      const { error } = await supabase.from("menu_categories").delete().eq("name", category);
      if (error) {
        setNotice(`Kategori silinemedi: ${error.message}`);
        return;
      }
      const remainingCategories = menuCategories.filter((entry) => entry !== category);
      setMenuCategories(remainingCategories);
      if (activeCategory === category) setActiveCategory("Tümü");
      if (form.category === category) setForm((current) => ({ ...current, category: remainingCategories[0] ?? "" }));
      setNotice(`${category} kategorisi silindi.`);
    } catch {
      setNotice("Kategori silinemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSavingCategory(false);
    }
  }

  function handleHeroImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!imageTypes.has(file.type)) {
      setNotice("Slider için JPG, PNG veya WebP görsel seç.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > maxImageSize) {
      setNotice("Slider görseli 5 MB'dan küçük olmalı.");
      event.currentTarget.value = "";
      return;
    }
    setNotice("");
    setSelectedHeroImage(file);
  }

  async function addHeroSlide() {
    if (!supabase || !selectedHeroImage || isSavingHeroSlide) return;
    const client = supabase;
    setIsSavingHeroSlide(true);
    setNotice("");
    const extension = selectedHeroImage.type === "image/png" ? "png" : selectedHeroImage.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `hero/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await client.storage.from("menu-images").upload(storagePath, selectedHeroImage, {
        cacheControl: "3600",
        contentType: selectedHeroImage.type,
        upsert: false,
      });
      if (uploadError) {
        setNotice(uploadError.message.toLowerCase().includes("bucket not found")
          ? "menu-images bucket'ı bulunamadı. Önce Storage migration'ını Supabase'te çalıştır."
          : `Slider görseli yüklenemedi: ${uploadError.message}`);
        return;
      }
      const imageUrl = client.storage.from("menu-images").getPublicUrl(storagePath).data.publicUrl;
      const { data, error } = await client
        .from("hero_slides")
        .insert({ image_url: imageUrl, storage_path: storagePath, sort_order: heroSlides.length + 1 })
        .select("id, image_url, storage_path, sort_order")
        .single();
      if (error) {
        await client.storage.from("menu-images").remove([storagePath]);
        setNotice(error.code === "PGRST205" || error.code === "42P01"
          ? "Slider tablosu yok. 20261015030000_create_hero_slides.sql migration'ını çalıştır."
          : `Slider görseli kaydedilemedi: ${error.message}`);
        return;
      }
      setHeroSlides((current) => [...current, data as HeroSlide]);
      setSelectedHeroImage(null);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
      setNotice("Vitrin görseli eklendi.");
    } catch {
      setNotice("Vitrin görseli kaydedilemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSavingHeroSlide(false);
    }
  }

  async function removeHeroSlide(slide: HeroSlide) {
    if (!supabase || isSavingHeroSlide) return;
    setIsSavingHeroSlide(true);
    try {
      const { error } = await supabase.from("hero_slides").delete().eq("id", slide.id);
      if (error) {
        setNotice(`Vitrin görseli silinemedi: ${error.message}`);
        return;
      }
      setHeroSlides((current) => current.filter((entry) => entry.id !== slide.id));
      const { error: storageError } = await supabase.storage.from("menu-images").remove([slide.storage_path]);
      setNotice(storageError ? "Görsel vitrinden kaldırıldı; Storage dosyası temizlenemedi." : "Vitrin görseli kaldırıldı.");
    } catch {
      setNotice("Vitrin görseli silinemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSavingHeroSlide(false);
    }
  }

  async function moveHeroSlide(index: number, direction: -1 | 1) {
    if (!supabase || isSavingHeroSlide) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= heroSlides.length) return;
    const reordered = [...heroSlides];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setIsSavingHeroSlide(true);
    try {
      const results = await Promise.all([
        supabase.from("hero_slides").update({ sort_order: index + 1 }).eq("id", reordered[index].id),
        supabase.from("hero_slides").update({ sort_order: targetIndex + 1 }).eq("id", reordered[targetIndex].id),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error) {
        setNotice(`Slider sırası güncellenemedi: ${error.message}`);
        return;
      }
      setHeroSlides(reordered.map((slide, slideIndex) => ({ ...slide, sort_order: slideIndex + 1 })));
    } catch {
      setNotice("Slider sırası güncellenemedi. Supabase bağlantısını kontrol et.");
    } finally {
      setIsSavingHeroSlide(false);
    }
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
          <section className="welcome-row" id="overview"><div><div className="eyebrow"><span className="eyebrow-line" /> GUSTOBOX BAYRAMPAŞA</div><h1>Menün, senin kuralların<span>.</span></h1><p>Günün lezzetlerini düzenle, misafirlerine en güzel halinle sun.</p></div><div className="welcome-actions"><button className="secondary-button" type="button" onClick={() => { setSelectedHeroImage(null); setIsHeroSlidesModalOpen(true); }}><ImagePlus size={15} /> Vitrin görselleri{heroSlides.length > 0 && <span className="button-count">{heroSlides.length}</span>}</button><button className="primary-button" type="button" onClick={openNewItem}><Plus size={17} /> Yeni ürün ekle</button></div></section>

          <section className="summary-grid" aria-label="İşletme özeti">
            <article className="summary-card summary-highlight"><div className="summary-top"><span>MENÜDE YAYINDA</span><span className="summary-icon"><Eye size={17} /></span></div><div className="summary-number">{activeCount}<small> ürün</small></div><div className="summary-foot"><span>Misafirlerin şu an görebiliyor</span></div><div className="availability-dots" aria-hidden="true">{items.map((item) => <i key={item.id} className={item.available ? "dot-on" : "dot-off"} />)}</div></article>
            <article className="summary-card"><div className="summary-top"><span>TOPLAM ÜRÜN</span><span className="summary-icon coral-icon"><ShoppingBag size={17} /></span></div><div className="summary-number">{items.length}</div><div className="summary-foot"><span>Menündeki tüm ürünler</span></div><div className="mini-bars" aria-hidden="true">{items.map((item) => <i key={item.id} />)}</div></article>
            <article className="summary-card"><div className="summary-top"><span>GİZLİ ÜRÜN</span><span className="summary-icon blue-icon"><EyeOff size={17} /></span></div><div className="summary-number">{items.length - activeCount}</div><div className="summary-foot"><span>QR menüde gösterilmiyor</span></div><div className="prep-track"><span style={{ width: `${items.length ? ((items.length - activeCount) / items.length) * 100 : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-top"><span>KATEGORİ</span><span className="summary-icon green-icon"><MenuIcon size={17} /></span></div><div className="summary-number">{menuCategories.length}</div><div className="summary-foot"><span>Menü kategorisi</span></div><div className="availability-dots" aria-hidden="true">{menuCategories.map((category) => <i key={category} className="dot-on" />)}</div></article>
          </section>

          <section className="menu-section" id="menu">
            <div className="section-heading"><div><div className="section-kicker">VİTRİNİN</div><h2>Menü ürünleri <span>{items.length}</span></h2></div><div className="section-heading-actions"><button className="secondary-button" type="button" onClick={() => { setNewCategory(""); setIsCategoryModalOpen(true); }}><Plus size={15} /> Kategorileri yönet</button><a className="secondary-button" href="/menu" target="_blank" rel="noreferrer"><Eye size={16} /> Menüyü önizle</a></div></div>
            <div className="menu-toolbar"><div className="category-tabs" role="tablist" aria-label="Ürün kategorileri">{categoryFilters.map((category) => <button key={category} type="button" role="tab" aria-selected={activeCategory === category} className={`category-tab${activeCategory === category ? " selected" : ""}`} onClick={() => setActiveCategory(category)}>{category}<span>{category === "Tümü" ? items.length : items.filter((item) => item.category === category).length}</span></button>)}</div><label className="search-box"><Search size={16} /><input aria-label="Menüde ara" placeholder="Menüde ara..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
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
            <div className="form-row"><label>Fiyat<input required type="number" min="1" step="1" placeholder="₺ 0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Kategori<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="" disabled>Kategori seç</option>{menuCategories.map((category) => <option key={category}>{category}</option>)}</select></label></div>
            <div className="modal-actions">{editingItemId && <button className="delete-button" type="button" onClick={() => void deleteItem()}><Trash2 size={15} /> Ürünü sil</button>}<button className="secondary-button" type="button" onClick={() => setIsModalOpen(false)}>Vazgeç</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={15} /> : editingItemId ? <Save size={15} /> : <Plus size={16} />}{isSaving ? "Kaydediliyor..." : editingItemId ? "Değişiklikleri kaydet" : "Ürünü ekle"}</button></div>
          </form>
        </section>
      </div>}
      {isCategoryModalOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setIsCategoryModalOpen(false); }}>
        <section className="product-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <div className="modal-heading"><div><span className="section-kicker">MENÜ DÜZENİ</span><h2 id="category-modal-title">Kategoriler</h2></div><button className="icon-button" type="button" aria-label="Pencereyi kapat" onClick={() => setIsCategoryModalOpen(false)}><X size={19} /></button></div>
          <form onSubmit={addCategory}><label>Yeni kategori<input autoFocus required maxLength={40} placeholder="Örn. Kahvaltılıklar" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /></label><button className="primary-button" type="submit" disabled={isSavingCategory}>{isSavingCategory ? <LoaderCircle size={15} /> : <Plus size={15} />}{isSavingCategory ? "Ekleniyor..." : "Kategori ekle"}</button></form>
          <div className="category-manager-list">{menuCategories.map((category) => {
            const productCount = items.filter((item) => item.category === category).length;
            return <div className="category-manager-row" key={category}><div><strong>{category}</strong><small>{productCount > 0 ? `${productCount} ürün · silmek için önce taşı` : "Ürün yok"}</small></div><button className="icon-button category-remove" type="button" aria-label={`${category} kategorisini sil`} title={productCount > 0 ? "Önce ürünleri başka kategoriye taşı" : "Kategoriyi sil"} disabled={productCount > 0 || isSavingCategory} onClick={() => void removeCategory(category)}><Trash2 size={15} /></button></div>;
          })}{menuCategories.length === 0 && <div className="empty-state"><strong>Henüz kategori yok.</strong><span>Menüyü düzenlemek için bir kategori ekle.</span></div>}</div>
        </section>
      </div>}
      {isHeroSlidesModalOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !isSavingHeroSlide) setIsHeroSlidesModalOpen(false); }}>
        <section className="product-modal hero-slides-modal" role="dialog" aria-modal="true" aria-labelledby="hero-slides-title">
          <div className="modal-heading"><div><span className="section-kicker">ANA SAYFA VİTRİNİ</span><h2 id="hero-slides-title">Slider görselleri</h2></div><button className="icon-button" type="button" aria-label="Pencereyi kapat" onClick={() => setIsHeroSlidesModalOpen(false)}><X size={19} /></button></div>
          <div className="hero-slide-upload"><input ref={heroImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Vitrin görseli seç" hidden onChange={handleHeroImageChange} /><button className="secondary-button" type="button" onClick={() => heroImageInputRef.current?.click()}><ImagePlus size={15} /> Görsel seç</button><span className="hero-slide-file-name">{selectedHeroImage?.name ?? "JPG, PNG veya WebP · En fazla 5 MB"}</span><button className="primary-button" type="button" disabled={!selectedHeroImage || isSavingHeroSlide} onClick={() => void addHeroSlide()}>{isSavingHeroSlide ? <LoaderCircle size={15} /> : <Plus size={15} />}{isSavingHeroSlide ? "Yükleniyor..." : "Slayta ekle"}</button></div>
          <div className="hero-slide-list">{heroSlides.map((slide, index) => <div className="hero-slide-row" key={slide.id}><div className="hero-slide-thumbnail" role="img" aria-label={`Vitrin görseli ${index + 1}`} style={{ backgroundImage: `url("${slide.image_url}")` }} /><div className="hero-slide-copy"><strong>Görsel {index + 1}</strong><small>{index === 0 ? "İlk sırada" : `Sıra ${index + 1}`}</small></div><div className="hero-slide-actions"><button className="icon-button" type="button" aria-label={`Görsel ${index + 1} yukarı taşı`} title="Yukarı taşı" disabled={index === 0 || isSavingHeroSlide} onClick={() => void moveHeroSlide(index, -1)}><ChevronUp size={15} /></button><button className="icon-button" type="button" aria-label={`Görsel ${index + 1} aşağı taşı`} title="Aşağı taşı" disabled={index === heroSlides.length - 1 || isSavingHeroSlide} onClick={() => void moveHeroSlide(index, 1)}><ChevronDown size={15} /></button><button className="icon-button hero-slide-delete" type="button" aria-label={`Görsel ${index + 1} sil`} title="Görseli sil" disabled={isSavingHeroSlide} onClick={() => void removeHeroSlide(slide)}><Trash2 size={15} /></button></div></div>)}{heroSlides.length === 0 && <div className="empty-state hero-slide-empty"><strong>Henüz özel slider görseli yok.</strong><span>Varsayılan sandviç görseli gösterilmeye devam eder.</span></div>}</div>
        </section>
      </div>}
    </div>
  );
}