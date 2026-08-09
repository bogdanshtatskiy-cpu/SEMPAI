import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';
import { useCartStore } from '../store/useCartStore';
import { useOrdersStore } from '../store/useOrdersStore';
import { usePromoStore, PromoCode } from '../store/usePromoStore';

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const createOrder = useOrdersStore(state => state.createOrder);
  const { promos, usePromo } = usePromoStore();
  
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [inputPromo, setInputPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [branch, setBranch] = useState('');

  const baseTotalPrice = getTotalPrice();
  let totalPrice = baseTotalPrice;
  
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percent') {
      totalPrice = Math.round(baseTotalPrice * (1 - appliedPromo.discountValue / 100));
    } else {
      totalPrice = Math.max(0, baseTotalPrice - appliedPromo.discountValue);
    }
  }

  const handleApplyPromo = () => {
    const promo = promos.find(p => p.code === inputPromo.toUpperCase());
    if (!promo) {
      alert(t('Promo_Not_Found', 'Промокод не найден'));
      return;
    }
    if (promo.validFrom && Date.now() < promo.validFrom) {
      alert(t('Promo_Expired', 'Промокод еще не активен'));
      return;
    }
    if (promo.validUntil && Date.now() > promo.validUntil) {
      alert(t('Promo_Expired', 'Промокод истек'));
      return;
    }
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      alert(t('Promo_Limit_Reached', 'Лимит использований исчерпан'));
      return;
    }
    if (promo.minOrderAmount && baseTotalPrice < promo.minOrderAmount) {
      alert(t('Promo_Min_Order').replace('{{amount}}', promo.minOrderAmount.toString()));
      return;
    }
    setAppliedPromo(promo);
  };

  const handleCheckout = async () => {
    const user = WebApp.initDataUnsafe?.user;
    if (!user) {
      alert("Не удалось получить данные Telegram.");
      return;
    }

    if (baseTotalPrice < 250) {
      alert(t('Min_Order_Error', 'Минимальная сумма заказа — 250 ₴.'));
      return;
    }

    if (!phone || !city || !branch) {
      alert("Пожалуйста, заполните все поля доставки (Телефон, Город, Отделение).");
      return;
    }

    setIsOrdering(true);
    
    if (appliedPromo) {
      const promoSuccess = await usePromo(appliedPromo.code);
      if (!promoSuccess) {
        alert("Ошибка применения промокода, возможно он больше недействителен.");
        setIsOrdering(false);
        return;
      }
    }

    const success = await createOrder({
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      items: items,
      totalPrice: totalPrice,
      shippingDetails: {
        phone,
        city,
        branch
      }
    });
    
    setIsOrdering(false);
    if (success) {
      setOrderSuccess(true);
      clearCart();
      
      // Отправляем уведомление админу через наш безопасный сервер Vercel
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            order: {
              userId: user.id,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              items: items,
              totalPrice: totalPrice,
              shippingDetails: { phone, city, branch }
            }
          })
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    } else {
      alert("Ошибка при оформлении заказа. Попробуйте позже.");
    }
  };

  if (orderSuccess) {
    return (
      <div className={styles.welcome}>
        <h2>🎉 {t('Order_success_title')}</h2>
        <p>{t('Order_success_message')}</p>
        
        <div style={{marginTop: '20px', padding: '16px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '12px'}}>
          <p style={{margin: '0 0 8px 0', fontSize: '15px', lineHeight: '1.5'}}>{t('Order_Success_Promo')}</p>
          <h2 style={{margin: 0, letterSpacing: '2px', color: 'var(--primary-color)'}}>NEXT5</h2>
        </div>

        <button className={styles.checkoutBtn} onClick={() => setOrderSuccess(false)} style={{marginTop: '20px'}}>
          {t('Back')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>{t('Cart')}</h2>
      
      {items.length === 0 ? (
        <p>{t('Cart_empty')}</p>
      ) : (
        <div className={styles.cartContainer}>
          {items.map((item) => (
            <div key={item.cartItemId} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <h4>{item.title}</h4>
                {item.selectedColor && <p className={styles.itemColor}>{t('Color')}: {item.selectedColor}</p>}
                <p>₴ {item.price}</p>
              </div>
              <div className={styles.cartItemActions}>
                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>+</button>
                <button onClick={() => removeItem(item.cartItemId)} className={styles.removeBtn}>x</button>
              </div>
            </div>
          ))}
          
          {items.length > 0 && (
            <div className={styles.cartFooter}>
              <div style={{marginBottom: '16px'}}>
                <p style={{margin: '0 0 8px 0'}}>{t('Promo_Code')}:</p>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input 
                    type="text" 
                    value={inputPromo} 
                    onChange={e => setInputPromo(e.target.value)} 
                    className={styles.inputField} 
                    style={{margin: 0, textTransform: 'uppercase'}}
                    placeholder={t('Promo_Code_Placeholder')}
                    disabled={!!appliedPromo}
                  />
                  {!appliedPromo ? (
                    <button onClick={handleApplyPromo} className={styles.submitBtn} style={{margin: 0}}>{t('Promo_Apply')}</button>
                  ) : (
                    <button onClick={() => setAppliedPromo(null)} className={styles.submitBtn} style={{margin: 0, background: 'var(--danger-color)', color: '#fff'}}>{t('Promo_Cancel')}</button>
                  )}
                </div>
              </div>
              
              <div className={styles.cartTotal}>
                {appliedPromo ? (
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                    <span style={{textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '14px'}}>₴ {baseTotalPrice}</span>
                    <span>{t('Total')}: ₴ {totalPrice}</span>
                  </div>
                ) : (
                  <span>{t('Total')}: ₴ {totalPrice}</span>
                )}
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                <h3 style={{margin: '0 0 8px 0'}}>Доставка (Нова Пошта)</h3>
                <input type="tel" placeholder="Номер телефона (+380...)" value={phone} onChange={e => setPhone(e.target.value)} className={styles.inputField} />
                <input type="text" placeholder="Город" value={city} onChange={e => setCity(e.target.value)} className={styles.inputField} />
                <input type="text" placeholder="Отделение (например, №12)" value={branch} onChange={e => setBranch(e.target.value)} className={styles.inputField} />
              </div>

              <button 
                className={styles.checkoutBtn} 
                onClick={handleCheckout}
                disabled={isOrdering}>
                  {isOrdering ? t('Ordering') : t('Checkout')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
