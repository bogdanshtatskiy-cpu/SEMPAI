// Импортируем Firebase из интернета (без установки через npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// !!! ВСТАВЬ СВОИ ДАННЫЕ СЮДА !!!
const firebaseConfig = {
    apiKey: "AIzaSyDhElZXZz6wdjwR6DRIIqyfwfrCdRK-JZc",
    authDomain: "mc550e.firebaseapp.com",
    projectId: "mc550e",
    storageBucket: "mc550e.firebasestorage.app",
    messagingSenderId: "772399307357",
    appId: "1:772399307357:web:b4adec6deed9e1ab96cbb4"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Пароль для входа (визуальная защита)
const SECRET_PASS = "1234"; 

let currentColors = [];

// Делаем функции глобальными, чтобы HTML мог их вызывать
window.checkPassword = function() {
    const input = document.getElementById('secret-password').value;
    if(input === SECRET_PASS) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        loadPrints(); // Загружаем дизайны при входе
    } else {
        alert("Неверный ключ доступа 💅");
    }
}

window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.openAddModal = function() {
    currentColors = [];
    document.getElementById('colors-container').innerHTML = '';
    document.getElementById('files-container').innerHTML = '';
    window.addFileRow(); 
    window.openModal('add-modal');
}

window.updateFileName = function(input) {
    const fileNameElement = input.nextElementSibling;
    if (input.files && input.files.length > 0) {
        fileNameElement.innerHTML = `<i class="ph ph-check-circle" style="color: green;"></i> ${input.files[0].name}`;
    } else {
        fileNameElement.innerHTML = `<i class="ph ph-file"></i> Выберите файл...`;
    }
}

window.addFileRow = function() {
    const container = document.getElementById('files-container');
    const row = document.createElement('div');
    row.className = 'file-row';
    const uniqueId = 'jef-' + Date.now() + Math.floor(Math.random() * 1000);
    
    row.innerHTML = `
        <select class="hoop-size">
            <option value="RE36b (200x360)">RE36b (200x360)</option>
            <option value="SQ20b (200x200)">SQ20b (200x200)</option>
            <option value="RE20b (140x200)">RE20b (140x200)</option>
            <option value="SQ14b (140x140)">SQ14b (140x140)</option>
            <option value="HH10b (100x90)">HH10b (100x90)</option>
            <option value="RE10b (100x40)">RE10b (100x40)</option>
        </select>
        <input type="text" class="emb-size" placeholder="Размер (напр. 15x18 см)">
        
        <label class="custom-file-upload">
            <input type="file" id="${uniqueId}" class="jef-file" accept=".jef" onchange="updateFileName(this)">
            <span class="file-name"><i class="ph ph-file-arrow-up"></i> Загрузить .jef</span>
        </label>
        <button class="btn-danger" title="Удалить" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
    `;
    container.appendChild(row);
}

// Пипетка и цвета (Оставляем как было, просто привязываем к window)
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const colorPreview = document.getElementById('picked-color-preview');
const manualColorInput = document.getElementById('manual-color');

manualColorInput.addEventListener('input', (e) => colorPreview.style.backgroundColor = e.target.value);

document.getElementById('photo-for-color').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.style.display = 'block';
            const maxWidth = canvas.parentElement.clientWidth - 30;
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    manualColorInput.value = hex;
    colorPreview.style.backgroundColor = hex;
});

window.addColor = function() {
    const hex = manualColorInput.value;
    const code = document.getElementById('color-code').value || 'Без кода';
    currentColors.push({ hex, code });
    
    const badge = document.createElement('div');
    badge.className = 'color-badge';
    badge.innerHTML = `<div class="color-circle" style="background:${hex}"></div> ${code}`;
    document.getElementById('colors-container').appendChild(badge);
    document.getElementById('color-code').value = '';
}

// --- ОТПРАВКА ДАННЫХ В FIREBASE ---
window.savePrint = async function() {
    const coverInput = document.getElementById('cover-image');
    if (!coverInput.files[0]) return alert("Загрузи обложку дизайна!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Сохраняем...";
    btn.disabled = true;

    try {
        const printId = Date.now().toString();
        
        // 1. Загружаем обложку
        const coverRef = ref(storage, `covers/${printId}_${coverInput.files[0].name}`);
        await uploadBytes(coverRef, coverInput.files[0]);
        const coverUrl = await getDownloadURL(coverRef);

        // 2. Загружаем .jef файлы
        const fileRows = document.querySelectorAll('.file-row');
        let filesData = [];
        
        for (let row of fileRows) {
            const jefInput = row.querySelector('.jef-file');
            if (jefInput.files[0]) {
                const file = jefInput.files[0];
                const fileRef = ref(storage, `jef_files/${printId}_${file.name}`);
                await uploadBytes(fileRef, file);
                const fileUrl = await getDownloadURL(fileRef);
                
                filesData.push({
                    hoop: row.querySelector('.hoop-size').value,
                    size: row.querySelector('.emb-size').value || 'Не указан',
                    name: file.name,
                    url: fileUrl
                });
            }
        }

        // 3. Сохраняем все данные в базу Firestore
        await addDoc(collection(db, "prints"), {
            coverUrl: coverUrl,
            colors: currentColors,
            files: filesData,
            createdAt: new Date()
        });

        window.closeModal('add-modal');
        loadPrints(); // Перезагружаем сетку
    } catch (error) {
        console.error("Ошибка при сохранении:", error);
        alert("Произошла ошибка! Проверь консоль F12.");
    } finally {
        btn.innerHTML = "Сохранить в базу";
        btn.disabled = false;
    }
}

// --- ЗАГРУЗКА ИЗ FIREBASE ---
async function loadPrints() {
    const grid = document.getElementById('prints-grid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Загрузка дизайнов...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "prints"));
        grid.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const print = doc.data();
            const tile = document.createElement('div');
            tile.className = 'print-tile glass-panel';
            // Передаем данные в модалку через дата-атрибуты или создаем функцию на лету
            tile.onclick = () => showViewModal(print);
            
            tile.innerHTML = `
                <img src="${print.coverUrl}" alt="Print">
                <div class="tile-overlay">
                    <div>Цветов: ${print.colors ? print.colors.length : 0}</div>
                    <div style="font-size: 0.8em; margin-top: 5px;">Размеров: ${print.files ? print.files.length : 0}</div>
                </div>
            `;
            grid.appendChild(tile);
        });
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        grid.innerHTML = '<p style="grid-column: 1/-1; color: red;">Ошибка подключения к базе. Проверь правила Firestore!</p>';
    }
}

window.showViewModal = function(print) {
    document.getElementById('view-image').src = print.coverUrl;
    
    const colorsDiv = document.getElementById('view-colors');
    colorsDiv.innerHTML = (print.colors || []).map(c => 
        `<div class="color-badge"><div class="color-circle" style="background:${c.hex}"></div> ${c.code}</div>`
    ).join(' ');

    const filesDiv = document.getElementById('view-files');
    filesDiv.innerHTML = (print.files || []).map(f => `
        <div class="view-row">
            <div><b>${f.hoop}</b> (${f.size})<br><small style="color:#666">${f.name}</small></div>
            <a href="${f.url}" target="_blank" download class="btn-rainbow" style="text-decoration: none;"><i class="ph ph-download-simple"></i> Скачать</a>
        </div>
    `).join('');

    window.openModal('view-modal');
}
