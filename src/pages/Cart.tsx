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
      alert('Промокод не найден');
      return;
    }
    if (promo.expiresAt && Date.now() > promo.expiresAt) {
      alert('Промокод истек');
      return;
    }
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      alert('Лимит использований исчерпан');
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
      totalPrice: totalPrice
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
              totalPrice: totalPrice
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
                <p style={{margin: '0 0 8px 0'}}>Промокод:</p>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input 
                    type="text" 
                    value={inputPromo} 
                    onChange={e => setInputPromo(e.target.value)} 
                    className={styles.inputField} 
                    style={{margin: 0, textTransform: 'uppercase'}}
                    placeholder="PROMO2026"
                    disabled={!!appliedPromo}
                  />
                  {!appliedPromo ? (
                    <button onClick={handleApplyPromo} className={styles.submitBtn} style={{margin: 0}}>Применить</button>
                  ) : (
                    <button onClick={() => setAppliedPromo(null)} className={styles.submitBtn} style={{margin: 0, background: 'var(--danger-color)', color: '#fff'}}>Отменить</button>
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
