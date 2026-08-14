import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { storage, auth } from '../firebase';
import styles from '../App.module.css';
import { useProductsStore } from '../store/useProductsStore';
import { useOrdersStore, Order } from '../store/useOrdersStore';
import { usePromoStore } from '../store/usePromoStore';
import { Trash2, Edit2, Package, ShoppingBag, Tag } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Admin() {
  const { t } = useTranslation();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProductsStore();
  const { 
    orders, archivedOrders, loadArchivedOrders, hasMoreArchived, 
    archivedLoading, updateOrderStatus, subscribeToActiveOrders, getStats, loading: ordersLoading,
    indexError
  } = useOrdersStore();
  const { promos, addPromo, deletePromo } = usePromoStore();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'promos'>('products');
  const [orderTab, setOrderTab] = useState<'active' | 'archive'>('active');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Auth States
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
      } else {
        setIsAdminAuth(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [stats, setStats] = useState({ stats7: { income: 0, count: 0 }, stats30: { income: 0, count: 0 } });

  useEffect(() => {
    if (isAdminAuth) {
      const unsubscribe = subscribeToActiveOrders();
      getStats(7).then(s7 => getStats(30).then(s30 => setStats({ stats7: s7, stats30: s30 })));
      return () => unsubscribe();
    }
  }, [isAdminAuth, subscribeToActiveOrders, getStats]);

  useEffect(() => {
    if (orderTab === 'archive' && archivedOrders.length === 0) {
      loadArchivedOrders(true);
    }
  }, [orderTab]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError('Невірний email або пароль');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };


  // Уникальные значения для подсказок
  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const existingMaterials = Array.from(new Set(products.map(p => p.material).filter(Boolean))) as string[];
  const existingColors = Array.from(new Set(products.flatMap(p => p.colors || []).filter(Boolean))) as string[];

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [material, setMaterial] = useState('');
  const [colorsStr, setColorsStr] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [uploading, setUploading] = useState(false);

  // Promo states
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState('');
  const [promoUsageLimit, setPromoUsageLimit] = useState('');
  const [promoMinOrder, setPromoMinOrder] = useState('');
  const [promoValidFrom, setPromoValidFrom] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState('');


  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImages(prev => [...prev, url]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Помилка при завантаженні картинки');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement> | ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadFile(file);
        }
        break; // Upload only first image found
      }
    }
  };

  // Global paste handler
  useEffect(() => {
    if (activeTab !== 'products') return;
    const globalPasteListener = (e: ClipboardEvent) => {
      // Don't intercept if user is typing text in an input/textarea (but allow if pasting image)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'file') return;
      if (target.tagName === 'TEXTAREA') return;

      handlePaste(e);
    };
    window.addEventListener('paste', globalPasteListener);
    return () => window.removeEventListener('paste', globalPasteListener);
  }, [activeTab]);

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    let ttn;
    if (newStatus === 'shipped') {
      ttn = prompt(t('TTN_Prompt', 'Введіть номер ТТН:'));
      if (ttn === null) return; // User cancelled
    }

    await updateOrderStatus(order.id, newStatus, ttn);

    // Уведомляем клиента
    try {
      const res = await fetch('/api/notify_client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          status: newStatus,
          ttn
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Помилка відправки повідомлення клієнту: ${errData.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Failed to notify client', e);
      alert('Network error: Failed to notify client');
    }
  };

  const stats7Days = stats.stats7;
  const stats30Days = stats.stats30;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    const productData: any = {
      title,
      price: Number(price),
    };
    if (images.length > 0) {
      productData.imageUrls = images;
      productData.imageUrl = images[0];
    } else {
      productData.imageUrls = null;
      productData.imageUrl = null;
    }
    if (description) productData.description = description;
    if (category) productData.category = category;
    if (dimensions) productData.dimensions = dimensions;
    if (material) productData.material = material;
    if (colorsStr) productData.colors = colorsStr.split(',').map(c => c.trim()).filter(Boolean);
    if (discountValue) productData.discount = { type: discountType, value: Number(discountValue) };

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      setEditingProductId(null);
    } else {
      await addProduct(productData);
    }

    setTitle('');
    setPrice('');
    setImages([]);
    setDescription('');
    setCategory('');
    setDimensions('');
    setMaterial('');
    setColorsStr('');
    setDiscountValue('');
  };
  const handleEditProduct = (item: any) => {
    setEditingProductId(item.id);
    setTitle(item.title);
    setPrice(item.price.toString());
    setImages(item.imageUrls || (item.imageUrl ? [item.imageUrl] : []));
    setDescription(item.description || '');
    setCategory(item.category || '');
    setDimensions(item.dimensions || '');
    setMaterial(item.material || '');
    setColorsStr(item.colors ? item.colors.join(', ') : '');
    if (item.discount) {
      setDiscountType(item.discount.type);
      setDiscountValue(item.discount.value.toString());
    } else {
      setDiscountType('percent');
      setDiscountValue('');
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoValue) return;

    const promoData: any = {
      code: promoCode,
      discountType: promoType,
      discountValue: Number(promoValue),
    };
    if (promoUsageLimit) promoData.usageLimit = Number(promoUsageLimit);
    if (promoMinOrder) promoData.minOrderAmount = Number(promoMinOrder);
    if (promoValidFrom) promoData.validFrom = new Date(promoValidFrom).getTime();
    if (promoValidUntil) promoData.validUntil = new Date(promoValidUntil).getTime();

    await addPromo(promoData);

    setPromoCode('');
    setPromoValue('');
    setPromoUsageLimit('');
    setPromoMinOrder('');
    setPromoValidFrom('');
    setPromoValidUntil('');
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!isAdminAuth) {
    return (
      <div className={styles.container} style={{ maxWidth: '400px', margin: '40px auto' }}>
        <div style={{ background: 'var(--surface-color)', padding: '32px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: 'var(--text-color)' }}>Вхід для адміністратора</h2>
          <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>Введіть email та пароль з Firebase Console</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputField}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              required
            />
            {authError && <p style={{ color: 'var(--danger-color)', fontSize: '14px', textAlign: 'center' }}>{authError}</p>}
            <button type="submit" className={styles.checkoutBtn} style={{ marginTop: '8px' }}>
              Увійти
            </button>
          </form>

          <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '20px', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '14px' }}>
            Повернутися в магазин
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>{t('Admin_Panel')}</h2>
        <button onClick={handleLogout} className={styles.deleteBtn} style={{ padding: '8px 16px', margin: 0 }}>
          Вийти
        </button>
      </div>
      <div className={styles.adminTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'products' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} /> {t('Admin_Products_Tab')}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={16} /> {t('Admin_Orders_Tab')} {orders.filter(o => o.status === 'new').length > 0 && `(${orders.filter(o => o.status === 'new').length})`}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'promos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('promos')}
        >
          <Tag size={16} /> {t('Admin_Promos_Tab')}
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          <div className={styles.adminFormContainer}>
            <h3>{editingProductId ? t('Product_Title') : t('Add_Product')}</h3>
            <form onSubmit={handleAddProduct} className={styles.adminForm}>
              <div
                className={styles.uploadArea}
                onPaste={handlePaste}
                title={t('Upload_Hint', 'Вы можете нажать сюда и вставить картинку через Ctrl+V')}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <p className={styles.pasteHint}>
                  {uploading ? t('Upload_Loading', 'Загрузка...') : t('Upload_Placeholder', 'Выберите файл или вставьте (Ctrl+V)')}
                </p>
              </div>

              {images.length > 0 && (
                <div className={styles.adminImagesGrid}>
                  {images.map((img, index) => (
                    <div key={index} className={styles.adminImageThumb}>
                      <img src={img} alt="Preview" className={styles.imagePreview} />
                      <button
                        type="button"
                        className={styles.removeImageBtn}
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder={t('Product_Title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={styles.inputField}
              />
              <input
                type="number"
                placeholder={t('Product_Price')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={styles.inputField}
              />
              <textarea
                placeholder={t('Product_Desc', 'Описание товара')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.inputField}
                rows={3}
              />
              <div>
                <input
                  type="text"
                  placeholder={t('Product_Category', 'Категория (например, Фигурки)')}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.inputField}
                  style={{ width: '100%' }}
                />
                {existingCategories.length > 0 && (
                  <div className={styles.suggestionsScroll}>
                    {existingCategories.map(cat => (
                      <button key={cat} type="button" className={styles.suggestionPill} onClick={() => setCategory(cat)}>{cat}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder={t('Product_Material', 'Материал (например, PLA пластик)')}
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className={styles.inputField}
                  style={{ width: '100%' }}
                />
                {existingMaterials.length > 0 && (
                  <div className={styles.suggestionsScroll}>
                    {existingMaterials.map(mat => (
                      <button key={mat} type="button" className={styles.suggestionPill} onClick={() => setMaterial(mat)}>{mat}</button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder={t('Product_Dimensions', 'Размеры (например, 10x5x5 см)')}
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className={styles.inputField}
              />
              <div>
                <input
                  type="text"
                  placeholder={t('Product_Colors', 'Цвета (через запятую: Черный, Белый)')}
                  value={colorsStr}
                  onChange={(e) => setColorsStr(e.target.value)}
                  className={styles.inputField}
                  style={{ width: '100%' }}
                />
                {existingColors.length > 0 && (
                  <div className={styles.suggestionsScroll}>
                    {existingColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={styles.suggestionPill}
                        onClick={() => {
                          const currentColors = colorsStr ? colorsStr.split(',').map(c => c.trim()).filter(Boolean) : [];
                          if (!currentColors.includes(color)) {
                            setColorsStr(currentColors.length > 0 ? `${colorsStr}, ${color}` : color);
                          }
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                  className={styles.inputField}
                  style={{ width: '120px' }}
                >
                  <option value="percent">% (Скидка)</option>
                  <option value="fixed">₴ (Скидка)</option>
                </select>
                <input
                  type="number"
                  placeholder={t('Discount_Zero', 'Скидка (0 - нет)')}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className={styles.inputField}
                  style={{ flex: 1 }}
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={uploading}>
                {editingProductId ? t('Save_Changes', 'Зберегти зміни') : t('Add_Product')}
              </button>
            </form>
          </div>

          <div className={styles.adminProductsList}>
            <h3>{t('Manage_Products')}</h3>
            {loading ? <p>Loading...</p> : (
              <div className={styles.productsGrid}>
                {products.map((item) => (
                  <div key={item.id} className={styles.productCard}>
                    {(item.imageUrls?.[0] || item.imageUrl) ? (
                      <div style={{ position: 'relative', width: '80px', height: '80px', overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
                        <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} className={styles.productImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                    ) : (<div className={styles.productImagePlaceholder}></div>
                    )}
                    <h3>{item.title}</h3>
                    <p className={styles.price}>₴ {item.price}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        className={styles.submitBtn}
                        style={{ flex: 1, margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px' }}
                        onClick={() => handleEditProduct(item)}
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        className={`${styles.submitBtn} ${styles.removeBtn}`}
                        style={{ flex: 1, margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px' }}
                        onClick={() => deleteProduct(item.id)}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div>
          {/* Статистика */}
          {orderTab === 'archive' && (
            <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '16px' }}>Статистика (Виконані)</h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: 'var(--bg-color)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Дохід (7 днів)</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₴ {stats7Days.income}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{stats7Days.count} замовлень</p>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-color)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Дохід (30 днів)</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₴ {stats30Days.income}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{stats30Days.count} замовлень</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              className={orderTab === 'active' ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setOrderTab('active')}
              style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
            >
              Активні
            </button>
            <button
              className={orderTab === 'archive' ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setOrderTab('archive')}
              style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
            >
              Архів
            </button>
          </div>

          {indexError && (
            <div style={{ background: '#ffebee', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ffcdd2' }}>
              <h4 style={{ color: '#d32f2f', margin: '0 0 8px 0' }}>⚠️ Потрібно створити Індекс в базі даних!</h4>
              <p style={{ color: '#c62828', margin: '0 0 12px 0', fontSize: '14px' }}>
                Firestore вимагає Composite Index для фільтрації та сортування замовлень. Будь ласка, перейдіть за посиланням нижче, щоб автоматично його створити:
              </p>
              <a 
                href={indexError.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0] || '#'} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: 'inline-block', 
                  background: '#d32f2f', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Створити Індекс в Firebase
              </a>
              <p style={{ fontSize: '12px', color: '#c62828', marginTop: '12px', marginBottom: 0 }}>
                Після створення індексу зачекайте 1-2 хвилини, поки він побудується (статус "Building" змінится на "Enabled" у консолі Firebase), після чого перезавантажте сторінку.
              </p>
            </div>
          )}

          {(orderTab === 'active' ? ordersLoading : archivedLoading) ? <p>Завантаження замовлень...</p> : (orderTab === 'active' ? orders : archivedOrders).length === 0 ? <p>Замовлень у цій категорії немає</p> : (
            <>
              {(orderTab === 'active' ? orders : archivedOrders).map((order) => (
                <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <strong>{order.firstName} {order.lastName}</strong>
                    {order.username && (
                      <p style={{ margin: 0 }}><a href={`https://t.me/${order.username}`} target="_blank" rel="noreferrer">@{order.username}</a></p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '12px' }}>{new Date(order.createdAt).toLocaleString()}</p>
                    <select
                      className={styles.statusSelect}
                      style={order.status === 'cancelled' ? { backgroundColor: 'var(--danger-color)', color: 'white' } : {}}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value as any)}
                    >
                      <option value="new">{t('Status_New')}</option>
                      <option value="processing">{t('Status_Processing')}</option>
                      <option value="shipped">{t('Status_Shipped')}</option>
                      <option value="completed">{t('Status_Completed')}</option>
                      <option value="cancelled">{t('Status_Cancelled')}</option>
                    </select>
                  </div>
                </div>
                {order.ttn && (
                  <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--primary-color)' }}>
                    ТТН: {order.ttn}
                  </p>
                )}
                {order.shippingDetails && (
                  <div style={{ margin: '8px 0', padding: '8px', background: 'var(--bg-color)', borderRadius: '8px', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 4px 0' }}><strong>📞 Телефон:</strong> {order.shippingDetails.phone}</p>
                    <p style={{ margin: '0' }}><strong>📍 Нова Пошта:</strong> м. {order.shippingDetails.city}, Відд. {order.shippingDetails.branch}</p>
                  </div>
                )}
                <div>
                  <p style={{ margin: '8px 0' }}><strong>Товари:</strong></p>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {order.items.map(item => (
                      <li key={item.cartItemId}>
                        <Link to={`/?productId=${item.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                          {item.title}
                        </Link>
                        {item.selectedColor ? ` (Колір: ${item.selectedColor})` : ''} - {item.quantity} шт.
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Сума: ₴ {order.totalPrice}</p>
                </div>
              </div>
              ))}
              
              {orderTab === 'archive' && hasMoreArchived && (
                <button 
                  onClick={() => loadArchivedOrders()} 
                  className={styles.submitBtn} 
                  disabled={archivedLoading}
                  style={{marginTop: '16px'}}
                >
                  {archivedLoading ? 'Завантаження...' : 'Завантажити ще'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'promos' && (
        <>
          <div className={styles.adminFormContainer}>
            <h3>Створити промокод</h3>
            <form onSubmit={handleAddPromo} className={styles.adminForm}>
              <input
                type="text"
                placeholder="Код (наприклад: SUMMER2024)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                required
                className={styles.inputField}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={promoType}
                  onChange={e => setPromoType(e.target.value as 'percent' | 'fixed')}
                  className={styles.inputField}
                  style={{ width: '120px' }}
                >
                  <option value="percent">% (Знижка)</option>
                  <option value="fixed">₴ (Знижка)</option>
                </select>
                <input
                  type="number"
                  placeholder="Знижка"
                  value={promoValue}
                  onChange={e => setPromoValue(e.target.value)}
                  className={styles.inputField}
                  required
                  style={{ flex: 1 }}
                />
              </div>
              <input
                type="number"
                placeholder={t('Promo_Limit')}
                value={promoUsageLimit}
                onChange={(e) => setPromoUsageLimit(e.target.value)}
                className={styles.inputField}
              />
              <input
                type="number"
                placeholder="Мінімальна сума замовлення (Опціонально)"
                value={promoMinOrder}
                onChange={(e) => setPromoMinOrder(e.target.value)}
                className={styles.inputField}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Діє З:</label>
                  <input
                    type="date"
                    value={promoValidFrom}
                    onChange={(e) => setPromoValidFrom(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Діє ДО:</label>
                  <input
                    type="date"
                    value={promoValidUntil}
                    onChange={(e) => setPromoValidUntil(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>
              <button type="submit" className={styles.submitBtn}>
                {t('Promo_Add_Btn')}
              </button>
            </form>
          </div>

          <div className={styles.adminProductsList}>
            <h3>Активні промокоди</h3>
            {promos.map(promo => (
              <div key={promo.id} className={styles.adminProductCard}>
                <div>
                  <strong>{promo.code}</strong>
                  <p className={styles.price} style={{ margin: '4px 0' }}>
                    {t('Promo_Value')}: {promo.discountType === 'percent' ? `${promo.discountValue}%` : `₴${promo.discountValue}`}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t('Promo_Used')}: {promo.usageCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ''}
                  </p>
                  {promo.minOrderAmount && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Від суми: ₴ {promo.minOrderAmount}
                    </p>
                  )}
                  {(promo.validFrom || promo.validUntil) && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {promo.validFrom ? new Date(promo.validFrom).toLocaleDateString('uk-UA', { month: 'long', day: 'numeric', year: 'numeric' }) : '∞'} - {promo.validUntil ? new Date(promo.validUntil).toLocaleDateString('uk-UA', { month: 'long', day: 'numeric', year: 'numeric' }) : '∞'}
                    </p>
                  )}
                </div>
                <button
                  className={`${styles.submitBtn} ${styles.removeBtn}`}
                  style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => deletePromo(promo.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
