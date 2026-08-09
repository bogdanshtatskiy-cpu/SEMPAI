import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import WebApp from '@twa-dev/sdk';
import { storage } from '../firebase';
import styles from '../App.module.css';
import { useProductsStore } from '../store/useProductsStore';
import { useOrdersStore, Order } from '../store/useOrdersStore';
import { usePromoStore } from '../store/usePromoStore';
import { Trash2, Edit2, Package, ShoppingBag, Tag } from 'lucide-react';

export default function Admin() {
  const { t } = useTranslation();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProductsStore();
  const { orders, updateOrderStatus, loading: ordersLoading } = useOrdersStore();
  const { promos, addPromo, deletePromo } = usePromoStore();
  
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'promos'>('products');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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

  const user = WebApp.initDataUnsafe?.user;
  const adminId = import.meta.env.VITE_ADMIN_TELEGRAM_ID;
  const isAdmin = user && String(user.id) === String(adminId);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка при загрузке картинки");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) uploadFile(file);
      }
    }
  };

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    let ttn;
    if (newStatus === 'shipped') {
      ttn = prompt('Введите номер ТТН:');
      if (ttn === null) return; // User cancelled
    }
    
    await updateOrderStatus(order.id, newStatus, ttn);

    // Уведомляем клиента
    try {
      await fetch('/api/notify_client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: order.userId,
          orderId: order.id,
          status: newStatus,
          ttn: ttn
        })
      });
    } catch (e) {
      console.error("Failed to notify client", e);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    const productData = {
      title,
      price: Number(price),
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      category: category || undefined,
      dimensions: dimensions || undefined,
      material: material || undefined,
      colors: colorsStr ? colorsStr.split(',').map(c => c.trim()).filter(Boolean) : undefined,
      discount: discountValue ? { type: discountType, value: Number(discountValue) } : undefined
    };

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      setEditingProductId(null);
    } else {
      await addProduct(productData);
    }

    setTitle('');
    setPrice('');
    setImageUrl('');
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
    setImageUrl(item.imageUrl || '');
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

    await addPromo({
      code: promoCode,
      discountType: promoType,
      discountValue: Number(promoValue),
      usageLimit: promoUsageLimit ? Number(promoUsageLimit) : undefined,
      minOrderAmount: promoMinOrder ? Number(promoMinOrder) : undefined,
      validFrom: promoValidFrom ? new Date(promoValidFrom).getTime() : undefined,
      validUntil: promoValidUntil ? new Date(promoValidUntil).getTime() : undefined
    });

    setPromoCode('');
    setPromoValue('');
    setPromoUsageLimit('');
    setPromoMinOrder('');
    setPromoValidFrom('');
    setPromoValidUntil('');
  };

  if (!isAdmin) {
    return (
      <div className={styles.welcome}>
        <h2>{t('Admin_Access_Denied')}</h2>
        <p>{t('Admin_Access_Denied_Desc')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>{t('Admin_Panel')}</h2>

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
                title="Вы можете нажать сюда и вставить картинку через Ctrl+V"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className={styles.fileInput} 
                />
                <p className={styles.pasteHint}>
                  {uploading ? 'Загрузка...' : 'Выберите файл или вставьте (Ctrl+V)'}
                </p>
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className={styles.imagePreview} />
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
              <input 
                type="url" 
                placeholder={t('Product_Image_URL') + ' (Опционально)'} 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                className={styles.inputField}
              />
              <textarea 
                placeholder="Описание товара" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className={styles.inputField}
                rows={3}
              />
              <input 
                type="text" 
                placeholder="Категория (например, Фигурки)" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className={styles.inputField}
              />
              <input 
                type="text" 
                placeholder="Материал (например, PLA пластик)" 
                value={material} 
                onChange={(e) => setMaterial(e.target.value)} 
                className={styles.inputField}
              />
              <input 
                type="text" 
                placeholder="Размеры (например, 10x5x5 см)" 
                value={dimensions} 
                onChange={(e) => setDimensions(e.target.value)} 
                className={styles.inputField}
              />
              <input 
                type="text" 
                placeholder="Цвета (через запятую: Черный, Белый)" 
                value={colorsStr} 
                onChange={(e) => setColorsStr(e.target.value)} 
                className={styles.inputField}
              />
              <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                <select 
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                  className={styles.inputField}
                  style={{width: '120px'}}
                >
                  <option value="percent">% (Скидка)</option>
                  <option value="fixed">₴ (Скидка)</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Скидка (0 - нет)"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className={styles.inputField}
                  style={{flex: 1}}
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
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className={styles.productImage} />
                    ) : (
                      <div className={styles.productImagePlaceholder}></div>
                    )}
                    <h3>{item.title}</h3>
                    <p className={styles.price}>₴ {item.price}</p>
                    <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                      <button 
                        className={styles.submitBtn} 
                        style={{flex: 1, margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}
                        onClick={() => handleEditProduct(item)}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button 
                        className={`${styles.submitBtn} ${styles.removeBtn}`} 
                        style={{flex: 1, margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}
                        onClick={() => deleteProduct(item.id)}
                      >
                        <Trash2 size={16} /> {t('Delete')}
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
          {ordersLoading ? <p>Загрузка заказов...</p> : orders.length === 0 ? <p>Заказов пока нет</p> : (
            orders.map(order => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <strong>{order.firstName} {order.lastName}</strong>
                    {order.username && (
                      <p style={{margin: 0}}><a href={`https://t.me/${order.username}`} target="_blank" rel="noreferrer">@{order.username}</a></p>
                    )}
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <p style={{margin: 0, fontSize: '12px'}}>{new Date(order.createdAt).toLocaleString()}</p>
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
                  <p style={{margin: '4px 0', fontSize: '14px', color: 'var(--primary-color)'}}>
                    ТТН: {order.ttn}
                  </p>
                )}
                <div>
                  <p style={{margin: '8px 0'}}><strong>Товары:</strong></p>
                  <ul style={{paddingLeft: '20px', margin: 0}}>
                    {order.items.map(item => (
                      <li key={item.cartItemId}>
                        <Link to={`/?productId=${item.id}`} style={{color: 'var(--primary-color)', textDecoration: 'none'}}>
                          {item.title}
                        </Link>
                        {item.selectedColor ? ` (Цвет: ${item.selectedColor})` : ''} - {item.quantity} шт.
                      </li>
                    ))}
                  </ul>
                  <p style={{marginTop: '8px', fontWeight: 'bold'}}>Сумма: ₴ {order.totalPrice}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'promos' && (
        <>
          <div className={styles.adminFormContainer}>
            <h3>Создать промокод</h3>
            <form onSubmit={handleAddPromo} className={styles.adminForm}>
              <input 
                type="text" 
                placeholder="Код (например: SUMMER2024)" 
                value={promoCode} 
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                required 
                className={styles.inputField}
              />
              <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                <select 
                  value={promoType}
                  onChange={e => setPromoType(e.target.value as 'percent' | 'fixed')}
                  className={styles.inputField}
                  style={{width: '120px'}}
                >
                  <option value="percent">% (Скидка)</option>
                  <option value="fixed">₴ (Скидка)</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Скидка"
                  value={promoValue}
                  onChange={e => setPromoValue(e.target.value)}
                  className={styles.inputField}
                  required
                  style={{flex: 1}}
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
              <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Діє З:</label>
                  <input 
                    type="date" 
                    value={promoValidFrom} 
                    onChange={(e) => setPromoValidFrom(e.target.value)} 
                    className={styles.inputField}
                  />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Діє ДО:</label>
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
            <h3>Активные промокоды</h3>
            {promos.map(promo => (
              <div key={promo.id} className={styles.adminProductCard}>
                <div>
                  <strong>{promo.code}</strong>
                  <p className={styles.price} style={{margin: '4px 0'}}>
                    {t('Promo_Value')}: {promo.discountType === 'percent' ? `${promo.discountValue}%` : `₴${promo.discountValue}`}
                  </p>
                  <p style={{margin: 0, fontSize: '12px', color: 'var(--text-secondary)'}}>
                    {t('Promo_Used')}: {promo.usageCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ''}
                  </p>
                  {promo.minOrderAmount && (
                    <p style={{margin: 0, fontSize: '12px', color: 'var(--text-secondary)'}}>
                      Від суми: ₴ {promo.minOrderAmount}
                    </p>
                  )}
                  {(promo.validFrom || promo.validUntil) && (
                    <p style={{margin: 0, fontSize: '12px', color: 'var(--text-secondary)'}}>
                      {promo.validFrom ? new Date(promo.validFrom).toLocaleDateString() : '∞'} - {promo.validUntil ? new Date(promo.validUntil).toLocaleDateString() : '∞'}
                    </p>
                  )}
                </div>
                <button 
                  className={`${styles.submitBtn} ${styles.removeBtn}`}
                  style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
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
