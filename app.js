// Пароль для входа (Помни, что на GitHub Pages это видно всем, кто нажмет F12)
const SECRET_PASS = "1234"; 

let printsDB = [];
let currentColors = [];

function checkPassword() {
    const input = document.getElementById('secret-password').value;
    if(input === SECRET_PASS) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    } else {
        alert("Неверный ключ доступа 💅");
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openAddModal() {
    currentColors = [];
    document.getElementById('colors-container').innerHTML = '';
    document.getElementById('files-container').innerHTML = '';
    addFileRow(); 
    openModal('add-modal');
}

// Функция для обновления текста на кастомной кнопке файла
function updateFileName(input) {
    const fileNameElement = input.nextElementSibling;
    if (input.files && input.files.length > 0) {
        fileNameElement.innerHTML = `<i class="ph ph-check-circle" style="color: green;"></i> ${input.files[0].name}`;
    } else {
        fileNameElement.innerHTML = `<i class="ph ph-file"></i> Выберите файл...`;
    }
}

// Добавление строки (Идеально ровный Grid)
function addFileRow() {
    const container = document.getElementById('files-container');
    const row = document.createElement('div');
    row.className = 'file-row';
    // Создаем уникальный ID для инпута, чтобы label с ним работал
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

// --- Пипетка ---
const photoInput = document.getElementById('photo-for-color');
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const colorPreview = document.getElementById('picked-color-preview');
const manualColorInput = document.getElementById('manual-color');

// Синхронизация ручного инпута цвета и кружочка превью
manualColorInput.addEventListener('input', (e) => {
    colorPreview.style.backgroundColor = e.target.value;
});

if(photoInput) {
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                canvas.style.display = 'block';
                const maxWidth = canvas.parentElement.clientWidth - 30; // адаптивная ширина
                const scale = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = "#" + ("000000" + rgbToHex(pixel[0], pixel[1], pixel[2])).slice(-6);
    manualColorInput.value = hex;
    colorPreview.style.backgroundColor = hex;
});

function rgbToHex(r, g, b) { return ((r << 16) | (g << 8) | b).toString(16); }

function addColor() {
    const hex = manualColorInput.value;
    const code = document.getElementById('color-code').value || 'Без кода';
    currentColors.push({ hex, code });
    
    const badge = document.createElement('div');
    badge.className = 'color-badge';
    badge.innerHTML = `<div class="color-circle" style="background:${hex}"></div> ${code}`;
    document.getElementById('colors-container').appendChild(badge);
    document.getElementById('color-code').value = '';
}

function savePrint() {
    alert("Кнопка работает! Позже здесь будет код для отправки файлов в Базу Данных.");
    closeModal('add-modal');
}
