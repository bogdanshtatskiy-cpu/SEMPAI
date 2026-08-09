import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  ua: {
    translation: {
      "Welcome": "Ласкаво просимо в Animeria Shop!",
      "Catalog": "Каталог",
      "Cart": "Кошик",
      "Profile": "Профіль",
      "Add_to_cart": "В кошик",
      "Catalog_desc": "Каталог 3D-друкованих виробів",
      "Cart_empty": "Ваш кошик порожній",
      "Empty_cart": "Кошик порожній",
      "Order_success": "Замовлення на суму ₴ {{total}} успішно оформлено!",
      "Order_success_title": "Замовлення успішно оформлено!",
      "Order_success_message": "Дякуємо за покупку. Менеджер зв'яжеться з вами в Telegram найближчим часом.",
      "Ordering": "Оформлюємо...",
      "Color": "Колір",
      "Total": "Разом",
      "Checkout": "Оформити замовлення",
      "Back": "Повернутися",
      "Guest": "Ви увійшли як гість",
      "Settings": "Налаштування",
      "Name": "Ім'я",
      "Username": "Юзернейм",
      "Admin_Panel": "Адмін-панель",
      "Add_Product": "Додати товар",
      "Product_Title": "Назва товару",
      "Product_Price": "Ціна",
      "Product_Image_URL": "Посилання на фото (URL)",
      "Manage_Products": "Управління товарами",
      "Delete": "Видалити",
      "Remove": "Видалити",
      "Favorites_Title": "Обране",
      "Favorites_Empty": "Список обраного порожній",
      "Admin_Products_Tab": "Товари",
      "Admin_Orders_Tab": "Замовлення",
      "Admin_Promos_Tab": "Промокоди",
      "Admin_Access_Denied": "Доступ заборонено",
      "Admin_Access_Denied_Desc": "Ця сторінка доступна лише адміністратору магазину.",
      "Promo_Code": "Промокод",
      "Promo_Code_Placeholder": "Наприклад: SUMMER2024",
      "Promo_Discount_Percent": "% (Знижка)",
      "Promo_Discount_Fixed": "₴ (Знижка)",
      "Promo_Value": "Знижка",
      "Promo_Limit": "Ліміт використань (Опціонально)",
      "Promo_Add_Btn": "Додати промокод",
      "Promo_Active_List": "Активні промокоди",
      "Promo_Used": "Використано",
      "Status_New": "Новий",
      "Status_Processing": "В роботі",
      "Status_Shipped": "Відправлено",
      "Status_Completed": "Виконано",
      "Status_Cancelled": "❌ Скасовано",
      "TTN_Prompt": "Введіть номер ТТН:",
      "Promo_Apply": "Застосувати",
      "Promo_Cancel": "Скасувати",
      "Promo_Not_Found": "Промокод не знайдено",
      "Promo_Expired": "Промокод закінчився",
      "Promo_Limit_Reached": "Ліміт використань вичерпано",
      "Upload_Loading": "Завантаження...",
      "Upload_Placeholder": "Виберіть файл або вставте (Ctrl+V)",
      "Upload_Hint": "Ви можете натиснути сюди і вставити картинку через Ctrl+V",
      "Product_Desc": "Опис товару",
      "Product_Category": "Категорія (наприклад, Фігурки)",
      "Product_Material": "Матеріал (наприклад, PLA пластик)",
      "Product_Dimensions": "Розміри (наприклад, 10x5x5 см)",
      "Product_Colors": "Кольори (через кому: Чорний, Білий)",
      "Discount_Zero": "Знижка (0 - немає)",
      "Save_Changes": "Зберегти зміни",
      "Search_Placeholder": "Пошук товарів...",
      "All_Categories": "Всі товари",
      "Nothing_Found": "Нічого не знайдено",
      "Material_Label": "Матеріал:",
      "Dimensions_Label": "Розміри:",
      "Color_Label": "Колір:",
      "Promo_Min_Order": "Діє від ₴{{amount}}",
      "Min_Order_Error": "Мінімальна сума замовлення — ₴250",
      "Order_Success_Promo": "🎁 Ваш подарунок — промокод NEXT5 на знижку 5% на наступні замовлення!"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ua", // language to use
    fallbackLng: "ua",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
