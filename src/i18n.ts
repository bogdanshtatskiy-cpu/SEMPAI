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
      "Total": "Разом",
      "Checkout": "Оформити замовлення",
      "Order_success": "Замовлення на суму ₴ {{total}} оформлено!",
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
      "Delete": "Видалити"
    }
  },
  ru: {
    translation: {
      "Welcome": "Добро пожаловать в Animeria Shop!",
      "Catalog": "Каталог",
      "Cart": "Корзина",
      "Profile": "Профиль",
      "Add_to_cart": "В корзину",
      "Catalog_desc": "Каталог 3D-печатных изделий",
      "Cart_empty": "Ваша корзина пуста",
      "Total": "Итого",
      "Checkout": "Оформить заказ",
      "Order_success": "Заказ на сумму ₴ {{total}} оформлен!",
      "Guest": "Вы вошли как гость",
      "Settings": "Настройки",
      "Name": "Имя",
      "Username": "Юзернейм",
      "Admin_Panel": "Админ-панель",
      "Add_Product": "Добавить товар",
      "Product_Title": "Название товара",
      "Product_Price": "Цена",
      "Product_Image_URL": "Ссылка на фото (URL)",
      "Manage_Products": "Управление товарами",
      "Delete": "Удалить"
    }
  },
  en: {
    translation: {
      "Welcome": "Welcome to Animeria Shop!",
      "Catalog": "Catalog",
      "Cart": "Cart",
      "Profile": "Profile",
      "Add_to_cart": "Add to cart",
      "Catalog_desc": "Catalog of 3D-printed items",
      "Cart_empty": "Your cart is empty",
      "Total": "Total",
      "Checkout": "Checkout",
      "Order_success": "Order for ₴ {{total}} placed!",
      "Guest": "You are logged in as a guest",
      "Settings": "Settings",
      "Name": "Name",
      "Username": "Username",
      "Admin_Panel": "Admin Panel",
      "Add_Product": "Add Product",
      "Product_Title": "Product Title",
      "Product_Price": "Price",
      "Product_Image_URL": "Image URL",
      "Manage_Products": "Manage Products",
      "Delete": "Delete"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ua", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    fallbackLng: "ua",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
