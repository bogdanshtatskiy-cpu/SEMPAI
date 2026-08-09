import { useTranslation } from 'react-i18next';
import styles from '../App.module.css';
import { useCartStore } from '../store/useCartStore';
import WebApp from '@twa-dev/sdk';

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();

  const handleCheckout = () => {
    // В будущем здесь будет логика отправки данных в бота (или сохранение в Firestore)
    const orderData = {
      items,
      total: getTotalPrice()
    };
    WebApp.sendData(JSON.stringify(orderData));
    WebApp.showAlert(t('Order_success', { total: getTotalPrice() }));
  };

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
                {item.selectedColor && <p className={styles.itemColor}>Цвет: {item.selectedColor}</p>}
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
            <h3>{t('Total')}: ₴ {getTotalPrice()}</h3>
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              {t('Checkout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
