import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';
import { useCartStore } from '../store/useCartStore';
import { useOrdersStore } from '../store/useOrdersStore';

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const createOrder = useOrdersStore(state => state.createOrder);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const totalPrice = getTotalPrice();

  const handleCheckout = async () => {
    const user = WebApp.initDataUnsafe?.user;
    if (!user) {
      alert("Не удалось получить данные Telegram.");
      return;
    }

    setIsOrdering(true);
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
          
          <div className={styles.cartTotal}>
            <h3>{t('Total')}: ₴ {totalPrice}</h3>
            <button className={styles.checkoutBtn} onClick={handleCheckout} disabled={isOrdering}>
              {isOrdering ? t('Ordering') : t('Checkout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
