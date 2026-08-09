import { useState, useEffect } from 'react';
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

  // NP State
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<any[]>([]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  const [branchQuery, setBranchQuery] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);

  const baseTotalPrice = getTotalPrice();
  let totalPrice = baseTotalPrice;

  // NP Effects
  useEffect(() => {
    const fetchCities = async () => {
      if (cityQuery.length < 2) {
        setCities([]);
        setIsCityDropdownOpen(false);
        return;
      }
      setIsFetchingCities(true);
      try {
        const response = await fetch('/api/np', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelName: 'Address',
            calledMethod: 'searchSettlements',
            methodProperties: {
              CityName: cityQuery,
              Limit: "50"
            }
          })
        });
        if (!response.ok) {
          console.error('NP API response not ok:', response.status, response.statusText);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setCities(data.data[0]?.Addresses || []);
          setIsCityDropdownOpen(true);
        } else {
          console.error('NP API returned success:false', data);
        }
      } catch (e) {
        console.error('NP Cities Error', e);
      } finally {
        setIsFetchingCities(false);
      }
    };

    const timeoutId = setTimeout(fetchCities, 500);
    return () => clearTimeout(timeoutId);
  }, [cityQuery]);

  useEffect(() => {
    if (branchQuery) {
      const lowerQuery = branchQuery.toLowerCase();
      setFilteredBranches(branches.filter(b => b.Description.toLowerCase().includes(lowerQuery)));
      setIsBranchDropdownOpen(true);
    } else {
      setFilteredBranches(branches);
    }
  }, [branchQuery, branches]);

  const handleSelectCity = async (c: any) => {
    setCity(c.Present);
    setCityQuery(c.Present);
    setIsCityDropdownOpen(false);
    
    setBranch('');
    setBranchQuery('');
    setBranches([]);
    setFilteredBranches([]);
    
    setIsFetchingBranches(true);
    try {
      const response = await fetch('/api/np', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: 'Address',
          calledMethod: 'getWarehouses',
          methodProperties: {
            CityRef: c.DeliveryCity
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setBranches(data.data || []);
        setFilteredBranches(data.data || []);
      }
    } catch (e) {
      console.error('NP Branches Error', e);
    } finally {
      setIsFetchingBranches(false);
    }
  };

  const handleSelectBranch = (b: any) => {
    setBranch(b.Description);
    setBranchQuery(b.Description);
    setIsBranchDropdownOpen(false);
  };

  
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
      alert("Не вдалося отримати дані Telegram.");
      return;
    }

    if (baseTotalPrice < 250) {
      alert(t('Min_Order_Error', 'Минимальная сумма заказа — 250 ₴.'));
      return;
    }

    if (!phone || phone.length < 9 || !city || !branch) {
      alert("Будь ласка, заповніть всі поля доставки (Телефон, Місто, Відділення).");
      return;
    }

    setIsOrdering(true);
    
    if (appliedPromo) {
      const promoSuccess = await usePromo(appliedPromo.code);
      if (!promoSuccess) {
        alert("Помилка застосування промокоду, можливо він вже недійсний.");
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
        phone: "+380" + phone,
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
              shippingDetails: { phone: "+380" + phone, city, branch }
            }
          })
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    } else {
      alert("Помилка при оформленні замовлення. Спробуйте пізніше.");
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
                
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--text-color)'}}>+380</span>
                  <input 
                    type="tel" 
                    placeholder="ХХ ХХХ ХХ ХХ" 
                    value={phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val.slice(0, 9));
                    }} 
                    style={{border: 'none', background: 'transparent', color: 'var(--text-color)', width: '100%', outline: 'none', padding: '12px 0'}} 
                  />
                </div>
                
                {/* Город */}
                <div style={{position: 'relative'}}>
                  <input 
                    type="text" 
                    placeholder={isFetchingCities ? "Шукаємо міста..." : "Місто"} 
                    value={cityQuery} 
                    onChange={e => {
                      setCityQuery(e.target.value);
                      if (e.target.value !== city) setCity('');
                    }} 
                    onFocus={() => { if(cities.length > 0) setIsCityDropdownOpen(true) }}
                    className={styles.inputField} 
                    style={{width: '100%', boxSizing: 'border-box'}}
                  />
                  {isCityDropdownOpen && cities.length > 0 && (
                    <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
                      {cities.map((c, idx) => (
                        <div key={idx} onClick={() => handleSelectCity(c)} style={{padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer'}}>
                          {c.Present}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Отделение */}
                <div style={{position: 'relative'}}>
                  <input 
                    type="text" 
                    placeholder={isFetchingBranches ? "Завантаження відділень..." : "Відділення (номер або вулиця)"} 
                    value={branchQuery} 
                    onChange={e => {
                      setBranchQuery(e.target.value);
                      if (e.target.value !== branch) setBranch('');
                    }}
                    onFocus={() => { if(filteredBranches.length > 0) setIsBranchDropdownOpen(true) }}
                    className={styles.inputField} 
                    style={{width: '100%', boxSizing: 'border-box'}}
                    disabled={!city || branches.length === 0}
                  />
                  {isBranchDropdownOpen && filteredBranches.length > 0 && (
                    <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
                      {filteredBranches.map((b, idx) => (
                        <div key={idx} onClick={() => handleSelectBranch(b)} style={{padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '14px'}}>
                          {b.Description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
