window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareCode = urlParams.get('share');
    
    if (shareCode) {
        try {
            const decodedStr = decodeURIComponent(atob(shareCode));
            const decodedData = JSON.parse(decodedStr);
            if (Array.isArray(decodedData)) {
                // Hợp nhất dữ liệu mới vào bộ sưu tập hiện tại
                let merged = [...myCollectionsData];
                decodedData.forEach(newItem => {
                    if (!merged.some(oldItem => oldItem.id === newItem.id)) merged.push(newItem);
                });
                localStorage.setItem('moscowCollectionsData', JSON.stringify(merged));
                
                // Xóa tham số share trên URL để tránh load lại mỗi khi F5
                window.history.replaceState({}, document.title, window.location.pathname);
                alert(`🎉 Đã tự động nhận ${decodedData.length} địa điểm chia sẻ!`);
                location.reload();
            }
        } catch(e) { console.error("Lỗi mã chia sẻ:", e); }
    }
});
// ==========================================
// PHẦN 1: KHỞI TẠO BẢN ĐỒ VÀ BẢN ĐỒ NỀN
// ==========================================
const map = L.map('map').setView([55.7558, 37.6173], 11);

const mapLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 18, attribution: '&copy; CARTO' });
const mapDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18, attribution: '&copy; CARTO' });
const mapSatellite = L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}', { maxZoom: 20, attribution: '&copy; Google Maps' });
const mapOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' });

mapLight.addTo(map);

const baseMaps = {
    "🗺️ Bản đồ Sáng": mapLight,
    "🌙 Bản đồ Tối": mapDark,
    "🛰️ Ảnh Vệ tinh": mapSatellite,
    "🛣️ Đường phố": mapOSM
};

function getCustomIcon(category) {
    let iconClass = 'fa-map-marker-alt'; let color = '#3498db';
    switch(category.trim()) {
        case 'Парки и зоны отдыха': iconClass = 'fa-tree'; color = '#2ecc71'; break;
        case 'Кинотеатры': iconClass = 'fa-film'; color = '#e74c3c'; break;
        case 'Галереи': iconClass = 'fa-palette'; color = '#9b59b6'; break;
        case 'Знаковые места': iconClass = 'fa-camera'; color = '#f1c40f'; break;
        case 'Храмы, соборы': iconClass = 'fa-church'; color = '#d35400'; break;
        case 'Смотровые площадки': iconClass = 'fa-binoculars'; color = '#1abc9c'; break;
        case 'Театры': iconClass = 'fa-theater-masks'; color = '#c0392b'; break;
        case 'Музеи': iconClass = 'fa-landmark'; color = '#34495e'; break;
        case 'Усадьбы': iconClass = 'fa-home'; color = '#16a085'; break;
    }
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas ${iconClass}"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// ==========================================
// PHẦN 2: ĐỌC DỮ LIỆU TỪ GOOGLE SHEETS
// ==========================================
const sheetCSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPF_2gnye2krw0rhJwNHWVxcqXMBavmclli2XU5sN7JU-MrQWb_hRpdCNn4MwJwB-q16umkkoukSJo/pub?gid=0&single=true&output=csv';
let categoryLayers = {};
// Khởi tạo các biến lưu trữ dữ liệu cho tính năng mới
let heatData = []; // TÍNH NĂNG MỚI: Mảng chứa dữ liệu cho bản đồ nhiệt
let searchLayer = L.layerGroup(); // TÍNH NĂNG MỚI: Lớp ẩn để phục vụ thanh tìm kiếm

Papa.parse(sheetCSV_URL, {
    download: true,
    header: true,
    complete: function(results) {
        let data = results.data;
        
        // VÒNG LẶP CHẠY QUA TỪNG HÀNG DỮ LIỆU
        data.forEach(row => {
            if (row.Coordinates && row.Category) {
                let coordsArray = row.Coordinates.split(',');
                if (coordsArray.length === 2) {
                    let lat = parseFloat(coordsArray[0].trim());
                    let lng = parseFloat(coordsArray[1].trim());

                    if (!isNaN(lat) && !isNaN(lng)) {
                        
                        // 1. Thêm vào dữ liệu Bản đồ nhiệt
                        heatData.push([lat, lng, 1]); 

                        // 2. Xử lý danh mục & Nút chỉ đường
                        let cats = row.Category.split(';').map(c => c.trim());
                        let tagsHTML = cats.map(c => `<span class="category-badge" style="background:#333; margin-right:4px;">${c}</span>`).join('');
                        let routingLink = `https://www.google.com/maps/dir/?api=1&destination=$${lat},${lng}`;

                        // 3. Xử lý Reviews
                        let reviewsHTML = '';
                        if (row.Reviews) {
                            let items = row.Reviews.split('|');
                            let textReviews = []; let linkReviews = []; let linkCounter = 1;
                            items.forEach(item => {
                                let content = item.trim();
                                if (content !== '') {
                                    if (content.toLowerCase().startsWith('http://') || content.toLowerCase().startsWith('https://')) {
                                        linkReviews.push(`<a href="${content}" target="_blank" class="btn-review" style="flex: 1 1 calc(50% - 4px); background-color: #27ae60;"><i class="fas fa-external-link-alt"></i> Link ${linkCounter++}</a>`);
                                    } else {
                                        let formattedContent = content.replace(/\n/g, '<br>');
                                        textReviews.push(`<div class="text-review"><i class="fas fa-quote-left" style="color:#ccc; margin-right:5px;"></i>${formattedContent}</div>`);
                                    }
                                }
                            });
                            if (textReviews.length > 0 || linkReviews.length > 0) {
                                reviewsHTML = `<div class="reviews-container">` + textReviews.join('') + (linkReviews.length > 0 ? `<div class="link-reviews-wrapper">${linkReviews.join('')}</div>` : '') + `</div>`;
                            }
                        }

                        // 4. Các biến cho Bộ sưu tập & Thêm Review
                        // 4. Các biến cho Bộ sưu tập & Thêm Review
                        let markerId = `m_${lat}_${lng}`.replace(/\./g, '-');
                        // Đã cập nhật thành myCollectionsData và kiểm tra theo thuộc tính id
                        let isAdded = myCollectionsData.some(item => item.id === markerId); 
                        let colClass = isAdded ? "added" : "";
                        let colText = isAdded ? "❤️ Đã lưu" : "Lưu vào Bộ sưu tập";
                        
                        let formEntryId = 'entry.1274491323'; // ID Form của bạn
                        let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform';
                        let writeReviewLink = `${formBaseUrl}?usp=pp_url&${formEntryId}=${encodeURIComponent(row.Name)}`;

                        // 5. Gộp Tên & Lắp ráp Popup Tối ưu
                        let titleHTML = `<h3 style="margin: 0 0 4px 0; font-size: 15px;">${row.Name || 'Chưa có tên'}</h3>`;
                        let subNames = [];
                        if (row.Name_VI) subNames.push(`🇻🇳 ${row.Name_VI}`);
                        if (row.Name_EN) subNames.push(`🇬🇧 ${row.Name_EN}`);
                        if (subNames.length > 0) {
                            titleHTML += `<div class="sub-name-wrapper">${subNames.join(' &nbsp;•&nbsp; ')}</div>`;
                        }

                        // Cú pháp chuẩn cho link chỉ đường
// Thay thế 2 dòng gLink và yLink cũ bị lỗi bằng 2 dòng này:

// Dùng link Search API chuẩn của Google để ghim đúng vị trí
let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// Yandex Maps (Nhớ là Kinh độ Lng đứng trước Vĩ độ Lat)
let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;

                        let popupContent = `
                            <div class="popup-custom">
                                ${titleHTML}
                                <div style="margin-bottom: 8px;">${tagsHTML}</div>
                                
                                <div class="multi-lang-desc" style="margin-bottom: 8px;">
                                    ${row.Desc_VI ? `<div class="lang-block" style="padding: 6px; margin-bottom: 4px;"><span class="flag">🇻🇳</span>${row.Desc_VI}</div>` : ''}
                                    ${row.Desc_RU ? `<div class="lang-block" style="padding: 6px; margin-bottom: 4px;"><span class="flag">🇷🇺</span>${row.Desc_RU}</div>` : ''}
                                    ${row.Desc_EN ? `<div class="lang-block" style="padding: 6px; margin-bottom: 4px;"><span class="flag">🇬🇧</span>${row.Desc_EN}</div>` : ''}
                                </div>
                                
                                ${row.Image_URL ? `<img src="${row.Image_URL}" alt="${row.Name}" style="margin-bottom: 8px; width: 100%; border-radius: 6px; max-height: 120px; object-fit: cover;">` : ''}
                                
                                ${reviewsHTML}
                                
                                <div class="popup-buttons">
                                    <a href="${yLink}" target="_blank" class="btn-yandex" style="background:#ff0000;"><i class="fab fa-yandex"></i> Yandex</a>
                                    <a href="${gLink}" target="_blank" class="btn-google" style="background:#4285F4;"><i class="fab fa-google"></i> Google</a>
                                </div>
                                
                                <button id="btn_${markerId}" class="btn-collection ${colClass}" onclick="toggleCollection('${markerId}')">
                                    <span id="text_${markerId}">${colText}</span>
                                </button>

                                <a href="${writeReviewLink}" target="_blank" class="btn-write-review">
                                    <i class="fas fa-camera"></i> Thêm ảnh/review
                                </a>
                            </div>
                        `;

                        // 6. Đưa Marker vào Layer theo danh mục
                        cats.forEach(cat => {
                            if (!categoryLayers[cat]) {
                                categoryLayers[cat] = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 15 });
                            }
                            let marker = L.marker([lat, lng], { icon: getCustomIcon(cat) })
                                .bindTooltip(row.Name, { 
                                    permanent: true,       // HIỂN THỊ VĨNH VIỄN
                                    direction: 'bottom', 
                                    className: 'custom-label' 
                                })
                                .bindPopup(popupContent);
                            categoryLayers[cat].addLayer(marker);
                        });

                        // 7. Tạo Marker ẩn cho tính năng Tìm kiếm đa ngôn ngữ (NẮM ĐÚNG VỊ TRÍ TRONG VÒNG LẶP)
                        let searchKey = `${row.Name || ''} --- ${row.Name_VI || ''} --- ${row.Name_EN || ''}`;
                        let hiddenSearchMarker = L.marker([lat, lng], { title: searchKey, opacity: 0 });
                        hiddenSearchMarker.bindPopup(popupContent);
                        searchLayer.addLayer(hiddenSearchMarker);
                    }
                }
            }
        }); 
        // === KẾT THÚC VÒNG LẶP XỬ LÝ DỮ LIỆU ===

        // === CÁC LỆNH DƯỚI ĐÂY CHẠY SAU KHI ĐÃ ĐỌC XONG TOÀN BỘ FILE SHEETS ===
        
        let overlayMaps = {};
        for (let cat in categoryLayers) {
            map.addLayer(categoryLayers[cat]);
            overlayMaps[cat] = categoryLayers[cat];
        }

        // Tạo layer bản đồ nhiệt
        let heatLayer = L.heatLayer(heatData, {
            radius: 25, blur: 15, maxZoom: 15,
            gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'orange', 1.0: 'red'}
        });
        overlayMaps["🔥 Bản đồ Nhiệt"] = heatLayer;

        // Khai báo biến toàn cục để hệ thống Bộ sưu tập có thể can thiệp thêm bớt Layer
        window.mainLayerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);

        // Bảng điều khiển Layer (Đã thu gọn collapsed: true)
        // L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);

        // Kích hoạt thanh tìm kiếm Google Sheets
        map.addLayer(searchLayer); 
        let searchControl = new L.Control.Search({
            layer: searchLayer,
            propertyName: 'title',
            initial: false, // Tìm theo 1 phần ký tự
            marker: false,
            textPlaceholder: 'Tìm điểm trong danh sách...',
            moveToLocation: function(latlng, title, map) {
                map.flyTo(latlng, 16);
            }
        });
        searchControl.on('search:locationfound', function(e) {
            e.layer.openPopup();
        });
        map.addControl(searchControl);
    }
});



let locateControl = L.control({position: 'topleft'});
locateControl.onAdd = function() {
    let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.style.backgroundColor = 'white';
    div.style.width = '34px';
    div.style.height = '34px';
    div.style.cursor = 'pointer';
    div.innerHTML = `<a href="#" title="Vị trí của tôi" style="font-size:18px; color: #333; line-height:34px; text-align:center; display:block; text-decoration:none;"><i class="fas fa-crosshairs"></i></a>`;
    
    div.onclick = function(e){
        e.preventDefault();
        map.locate({setView: true, maxZoom: 16}); // Lệnh tìm vị trí và zoom đến
    }
    return div;
};
locateControl.addTo(map);

// Lắng nghe sự kiện nếu tìm thấy vị trí thì vẽ một chấm xanh
map.on('locationfound', function(e) {
    L.circleMarker(e.latlng, { radius: 8, color: 'white', fillColor: '#4285F4', fillOpacity: 1 }).addTo(map).bindPopup("Bạn đang ở đây!").openPopup();
});
map.on('locationerror', function(e) {
    alert("Không thể xác định vị trí của bạn. Vui lòng cấp quyền vị trí cho trình duyệt.");
});

        // let overlayMaps = {};
        // for (let cat in categoryLayers) {
        //     map.addLayer(categoryLayers[cat]);
        //     overlayMaps[cat] = categoryLayers[cat];
        // }
        // L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
//     }
// });

// ==========================================
// PHẦN 3: SỰ KIỆN CLICK THÊM ĐỊA ĐIỂM MỚI 
// (Nằm hoàn toàn bên ngoài Papa.parse)
// ==========================================
map.on('click', function(e) {
    let lat = e.latlng.lat.toFixed(6);
    let lng = e.latlng.lng.toFixed(6);
    let coordsStr = `${lat}, ${lng}`;

    // --- CẤU HÌNH GOOGLE FORM CHO ĐỊA ĐIỂM MỚI TẠI ĐÂY ---
    let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform';
    let nameEntryId = 'entry.1274491323';   // ID Tên địa điểm
    let coordsEntryId = 'entry.218236711'; // ID Tọa độ

    let addLocationUrl = `${formBaseUrl}?usp=pp_url&${nameEntryId}=%C4%90%E1%BB%8Ba+%C4%91i%E1%BB%83m+m%E1%BB%9Bi&${coordsEntryId}=${encodeURIComponent(coordsStr)}`;
// Thay thế 2 dòng gLink và yLink cũ bị lỗi bằng 2 dòng này:

// Dùng link Search API chuẩn của Google để ghim đúng vị trí
let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// Yandex Maps (Nhớ là Kinh độ Lng đứng trước Vĩ độ Lat)
let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
    let popupContent = `
        <div class="popup-custom" style="text-align: center; padding: 10px;">
            <div style="font-size: 24px; color: #27ae60; margin-bottom: 5px;">
                <i class="fas fa-map-marked-alt"></i>
            </div>
            <h4 style="margin: 0 0 5px 0; color: #333;">Thêm địa điểm tại đây?</h4>
            <p style="font-size: 11px; color: #7f8c8d; margin-bottom: 15px;">Tọa độ: ${coordsStr}</p>
            
            <a href="${addLocationUrl}" target="_blank" class="btn-review" style="background-color: #27ae60; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; display: block;">
                <i class="fas fa-plus-circle"></i> Đóng góp địa điểm mới
            </a>
            <div class="popup-buttons" style="display: flex; flex-direction: column; gap: 5px;">
                    <div class="popup-buttons" style="margin-bottom:10px; border-top:none; padding-top:0;">
                    <a href="${yLink}" target="_blank" class="btn-yandex" style="background:#ff0000; flex:1;"><i class="fab fa-yandex"></i> Yandex</a>
                    <a href="${gLink}" target="_blank" class="btn-google" style="background:#4285F4; flex:1;"><i class="fab fa-google"></i> Google</a>
                    </div>
                <hr style="border:0; border-top:1px dashed #ccc; margin: 5px 0;">
                <button onclick="showCustomSaveForm(${lat}, ${lng})" style="background:#9b59b6; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">
                    <i class="fas fa-plus"></i> Lưu vào Bộ sưu tập
                </button>
            </div>
        </div>
    `;

    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
});


// ==========================================
// HỆ TRỤC BỘ SƯU TẬP ĐA TẦNG, CHIA SẺ & LƯU TRỮ
// ==========================================

let myCollectionsData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
let customLayerGroups = {}; // Object lưu trữ các layer bộ sưu tập cá nhân

// 1. HÀM TẠO FORM LƯU ĐỊA ĐIỂM (TÍCH HỢP CHỌN BỘ SƯU TẬP)

// window.showCustomSaveForm = function(lat, lng, defaultName = "", defaultId = null) {

// // Dùng link Search API chuẩn của Google để ghim đúng vị trí
// let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
// // Yandex Maps (Nhớ là Kinh độ Lng đứng trước Vĩ độ Lat)
// let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;

//     let coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//     let markerId = defaultId || `custom_${lat.toFixed(6)}_${lng.toFixed(6)}`.replace(/\./g, '-');
//     // Tìm xem điểm này đã có trong bộ sưu tập chưa để lấy màu/icon cũ (nếu có)
//     let existing = myCollectionsData.find(item => item.id === markerId) || {};
//     let currentColor = existing.color || '#8e44ad';
//     let currentIcon = existing.icon || 'fa-heart';
//     // Lấy danh sách các Bộ sưu tập đã có để gợi ý
//     // let existingColNames = [...new Set(myCollectionsData.map(item => item.collectionName || 'Yêu thích'))];
//     // Ép chữ 'Yêu thích' luôn luôn xuất hiện đầu tiên trong danh sách gợi ý
//     let existingColNames = [...new Set(['Yêu thích', ...myCollectionsData.map(item => item.collectionName || 'Yêu thích')])];
//     let datalistOptions = existingColNames.map(name => `<option value="${name}">`).join('');

//     // Link Form đóng góp
//     let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform';
//     let nameEntryId = 'entry.1274491323';   
//     let coordsEntryId = 'entry.218236711'; 
//     let publicShareUrl = `${formBaseUrl}?usp=pp_url&${nameEntryId}=${encodeURIComponent(defaultName || 'Địa điểm mới')}&${coordsEntryId}=${encodeURIComponent(coordsStr)}`;

//     let popupContent = `
//         <div class="popup-custom" style="text-align: left; padding: 5px; min-width: 240px;">
//             <h4 style="margin: 0 0 10px 0; color: #9b59b6;"><i class="fas fa-bookmark"></i> Lưu vào Bộ sưu tập</h4>
            
//             <input type="text" id="cName_${markerId}" value="${defaultName}" placeholder="Tên địa điểm (bắt buộc)" style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
            
//             <input type="text" id="cCat_${markerId}" list="colList_${markerId}" placeholder="Tên Bộ sưu tập (VD: Ngày 1, Quán ăn...)" value="Yêu thích" style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-weight: bold; color: #8e44ad;">
//             <datalist id="colList_${markerId}">${datalistOptions}</datalist>
//             <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
//                 <div style="flex: 1;">
//                     <label style="font-size: 11px; display:block; margin-bottom:3px;">Màu sắc:</label>
//                     <input type="color" id="cColor_${markerId}" value="${currentColor}" style="width:100%; height:30px; border:none; padding:0; cursor:pointer;">
//                 </div>
//                 <div style="flex: 1;">
//                     <label style="font-size: 11px; display:block; margin-bottom:3px;">Biểu tượng:</label>
//                     <select id="cIcon_${markerId}" style="width:100%; padding:5px; border-radius:4px;">
//                         <option value="fa-heart" ${currentIcon === 'fa-heart' ? 'selected' : ''}>❤️ Tim</option>
//                         <option value="fa-star" ${currentIcon === 'fa-star' ? 'selected' : ''}>⭐ Sao</option>
//                         <option value="fa-camera" ${currentIcon === 'fa-camera' ? 'selected' : ''}>📷 Ảnh</option>
//                         <option value="fa-utensils" ${currentIcon === 'fa-utensils' ? 'selected' : ''}>🍴 Ăn uống</option>
//                         <option value="fa-flag" ${currentIcon === 'fa-flag' ? 'selected' : ''}>🚩 Cờ</option>
//                         <option value="fa-landmark" ${currentIcon === 'fa-landmark' ? 'selected' : ''}>🏛️ Di tích</option>
//                     </select>
//                 </div>
//             </div>

//             <textarea id="cDesc_${markerId}" placeholder="Ghi chú cá nhân..." style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; resize: vertical; min-height: 50px;"></textarea>
            
//             <div style="display:flex; gap:5px; margin-bottom: 10px;">
//                 <button onclick="savePointData('${markerId}', ${lat}, ${lng}, false, '')" style="flex:1; background: #9b59b6; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">
//                     <i class="fas fa-save"></i> Chỉ lưu cá nhân
//                 </button>
//             </div>

//             <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 10px;">
//                 <p style="font-size: 10px; color: #555; margin: 0 0 5px 0;">Vừa lưu vừa Đóng góp lên Bản đồ chung:</p>
//                 <button onclick="savePointData('${markerId}', ${lat}, ${lng}, true, '${publicShareUrl}')" style="width: 100%; background: #27ae60; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">
//                     <i class="fas fa-globe-asia"></i> Lưu & Chia sẻ Public
//                 </button>
//             </div>
//         </div>
//     `;
//     L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);
// };

window.showCustomSaveForm = function(lat, lng, defaultName = "", defaultId = null) {
    let markerId = defaultId || `custom_${lat.toFixed(6)}_${lng.toFixed(6)}`.replace(/\./g, '-');
    let existing = myCollectionsData.find(item => item.id === markerId) || {};
    let currentColor = existing.color || '#8e44ad';
    let currentIcon = existing.icon || 'fa-heart';

    let gLink = `https://www.google.com/maps/search/?api=1&query=$${lat},${lng}`;
    let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;

    // --- TẠO LINK GOOGLE FORM TỰ ĐỘNG ĐIỀN ĐỂ ĐÓNG GÓP ---
    let coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform'; // THAY ID FORM
    let nameEntryId = 'entry.1274491323';   // THAY ID CÂU HỎI TÊN
    let coordsEntryId = 'entry.218236711'; // THAY ID CÂU HỎI TỌA ĐỘ
    let publicShareUrl = `${formBaseUrl}?usp=pp_url&${nameEntryId}=${encodeURIComponent(defaultName || existing.name || 'Địa điểm mới')}&${coordsEntryId}=${encodeURIComponent(coordsStr)}`;

    let popupContent = `
        <div class="popup-custom" style="min-width: 250px;">
            <h4 style="margin: 0 0 10px 0; color: #9b59b6;"><i class="fas fa-paint-brush"></i> Tùy chỉnh địa điểm</h4>
            <input type="text" id="cName_${markerId}" value="${defaultName || existing.name || ''}" placeholder="Tên địa điểm..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
            <input type="text" id="cCat_${markerId}" list="colList_${markerId}" value="${existing.collectionName || 'Yêu thích'}" style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">

            <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                <div style="flex: 1;">
                    <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Màu sắc:</label>
                    <input type="color" id="cColor_${markerId}" value="${currentColor}" 
                           onchange="document.getElementById('displayIcon_${markerId}').style.color = this.value" 
                           style="width:100%; height:34px; border:1px solid #ccc; border-radius:4px; padding:0; cursor:pointer;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Biểu tượng:</label>
                    <div onclick="openIconPicker('${markerId}')" style="width:100%; height:34px; border:1px solid #ccc; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f9f9f9; transition:0.2s;">
                        <i id="displayIcon_${markerId}" class="fas ${currentIcon}" style="font-size: 18px; color: ${currentColor}; transition: color 0.2s;"></i>
                    </div>
                    <input type="hidden" id="cIcon_${markerId}" value="${currentIcon}">
                </div>
            </div>

            <textarea id="cDesc_${markerId}" placeholder="Ghi chú cá nhân..." style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc; height:50px; box-sizing:border-box;">${existing.desc || ''}</textarea>
            
            <div class="popup-buttons" style="margin-bottom:10px; padding-top:0; border:none; display:flex; gap:5px;">
                <a href="${yLink}" target="_blank" class="btn-yandex" style="background:#ff0000; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-yandex"></i> Yandex</a>
                <a href="${gLink}" target="_blank" class="btn-google" style="background:#4285F4; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-google"></i> Google</a>
            </div>

            <button onclick="savePointData('${markerId}', ${lat}, ${lng}, false, '')" class="btn-write-review" style="background:#9b59b6; width:100%; border:none; padding:10px; border-radius:4px; color:white; font-weight:bold; cursor:pointer; margin-bottom: 5px;">
                <i class="fas fa-save"></i> Chỉ lưu cá nhân
            </button>

            <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; margin-top: 5px;">
                <p style="font-size: 10px; color: #555; margin: 0 0 5px 0;">Vừa lưu vừa Đóng góp lên Bản đồ chung:</p>
                <button onclick="savePointData('${markerId}', ${lat}, ${lng}, true, '${publicShareUrl}')" style="width: 100%; background: #27ae60; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-globe-asia"></i> Lưu & Chia sẻ Public
                </button>
            </div>
        </div>
    `;
    L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);
};
// window.showCustomSaveForm = function(lat, lng, defaultName = "", defaultId = null) {
//     let markerId = defaultId || `custom_${lat.toFixed(6)}_${lng.toFixed(6)}`.replace(/\./g, '-');
//     let existing = myCollectionsData.find(item => item.id === markerId) || {};
//     let currentColor = existing.color || '#8e44ad';
//     let currentIcon = existing.icon || 'fa-heart';

//     let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
//     let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;

//     let popupContent = `
//         <div class="popup-custom" style="min-width: 250px;">
//             <h4 style="margin: 0 0 10px 0; color: #9b59b6;"><i class="fas fa-paint-brush"></i> Tùy chỉnh địa điểm</h4>
//             <input type="text" id="cName_${markerId}" value="${defaultName || existing.name || ''}" placeholder="Tên địa điểm..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
//             <input type="text" id="cCat_${markerId}" list="colList_${markerId}" value="${existing.collectionName || 'Yêu thích'}" style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">

//             <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
//                 <div style="flex: 1;">
//                     <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Màu sắc:</label>
//                     <input type="color" id="cColor_${markerId}" value="${currentColor}" 
//                            onchange="document.getElementById('displayIcon_${markerId}').style.color = this.value" 
//                            style="width:100%; height:34px; border:1px solid #ccc; border-radius:4px; padding:0; cursor:pointer;">
//                 </div>
//                 <div style="flex: 1;">
//                     <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Biểu tượng:</label>
//                     <div onclick="openIconPicker('${markerId}')" style="width:100%; height:34px; border:1px solid #ccc; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f9f9f9; transition:0.2s;">
//                         <i id="displayIcon_${markerId}" class="fas ${currentIcon}" style="font-size: 18px; color: ${currentColor}; transition: color 0.2s;"></i>
//                     </div>
//                     <input type="hidden" id="cIcon_${markerId}" value="${currentIcon}">
//                 </div>
//             </div>

//             <textarea id="cDesc_${markerId}" placeholder="Ghi chú cá nhân..." style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc; height:50px; box-sizing:border-box;">${existing.desc || ''}</textarea>
            
//             <div class="popup-buttons" style="margin-bottom:10px; padding-top:0; border:none; display:flex; gap:5px;">
//                 <a href="${yLink}" target="_blank" class="btn-yandex" style="background:#ff0000; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-yandex"></i> Yandex</a>
//                 <a href="${gLink}" target="_blank" class="btn-google" style="background:#4285F4; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-google"></i> Google</a>
//             </div>

//             <button onclick="savePointData('${markerId}', ${lat}, ${lng})" class="btn-write-review" style="background:#9b59b6; width:100%; border:none; padding:10px; border-radius:4px; color:white; font-weight:bold; cursor:pointer;">
//                 <i class="fas fa-save"></i> Lưu Bộ sưu tập
//             </button>

//         </div>
//     `;
//     L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);
// };
// Thêm 2 tham số: isPublicShare và publicUrl
window.savePointData = function(markerId, lat, lng, isPublicShare = false, publicUrl = '') {
    let nameVal = document.getElementById(`cName_${markerId}`).value.trim();
    let catVal = document.getElementById(`cCat_${markerId}`).value.trim() || 'Yêu thích';
    let colorVal = document.getElementById(`cColor_${markerId}`).value;
    let iconVal = document.getElementById(`cIcon_${markerId}`).value;
    let descVal = document.getElementById(`cDesc_${markerId}`).value.trim();
    
    if (!nameVal) return alert("Vui lòng nhập tên địa điểm!");

    let existingIndex = myCollectionsData.findIndex(item => item.id === markerId);
    let newData = { 
        id: markerId, 
        name: nameVal, 
        desc: descVal, 
        lat: lat, 
        lng: lng, 
        collectionName: catVal,
        color: colorVal, 
        icon: iconVal    
    };
    
    if (existingIndex > -1) {
        myCollectionsData[existingIndex] = newData;
    } else {
        myCollectionsData.push(newData);
    }

    localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
    renderCustomSavedPoints();
    updateCollectionCount();
    map.closePopup();

    // KIỂM TRA: Nếu người dùng bấm nút xanh, mở tab mới đẩy dữ liệu sang Form
    if (isPublicShare && publicUrl) {
        window.open(publicUrl, '_blank');
    }
};
// window.savePointData = function(markerId, lat, lng) {
//     let nameVal = document.getElementById(`cName_${markerId}`).value.trim();
//     let catVal = document.getElementById(`cCat_${markerId}`).value.trim() || 'Yêu thích';
//     let colorVal = document.getElementById(`cColor_${markerId}`).value;
//     let iconVal = document.getElementById(`cIcon_${markerId}`).value;
//     let descVal = document.getElementById(`cDesc_${markerId}`).value.trim();
    
//     if (!nameVal) return alert("Vui lòng nhập tên địa điểm!");

//     let existingIndex = myCollectionsData.findIndex(item => item.id === markerId);
//     let newData = { 
//         id: markerId, 
//         name: nameVal, 
//         desc: descVal, 
//         lat: lat, 
//         lng: lng, 
//         collectionName: catVal,
//         color: colorVal, // Lưu màu mới
//         icon: iconVal    // Lưu icon mới
//     };
    
//     if (existingIndex > -1) {
//         myCollectionsData[existingIndex] = newData;
//     } else {
//         myCollectionsData.push(newData);
//     }

//     localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
//     renderCustomSavedPoints();
//     updateCollectionCount();
//     map.closePopup();
// };
// 3. HÀM XÓA ĐỊA ĐIỂM
window.removeCustomPoint = function(markerId) {
    if (confirm("Bạn có chắc muốn xóa điểm này khỏi bộ sưu tập?")) {
        myCollectionsData = myCollectionsData.filter(item => item.id !== markerId);
        localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
        renderCustomSavedPoints();
        updateCollectionCount();
    }
};

// 4. HÀM VẼ LẠI CÁC BỘ SƯU TẬP (BIẾN THÀNH CÁC LAYER ĐỘC LẬP)
window.renderCustomSavedPoints = function() {
    // Xóa các Layer bộ sưu tập cũ khỏi bản đồ và thanh công cụ
    for (let cName in customLayerGroups) {
        map.removeLayer(customLayerGroups[cName]);
        if (window.mainLayerControl) window.mainLayerControl.removeLayer(customLayerGroups[cName]);
    }
    customLayerGroups = {};

    // Gom nhóm và tạo Layer mới
    myCollectionsData.forEach(item => {
        let cName = item.collectionName || 'Yêu thích';
        
        // Khởi tạo cụm mới nếu Category này chưa có
        if (!customLayerGroups[cName]) {
            customLayerGroups[cName] = L.markerClusterGroup({ maxClusterRadius: 30 });
            map.addLayer(customLayerGroups[cName]); // Tự động hiển thị lên bản đồ
            if (window.mainLayerControl) window.mainLayerControl.addOverlay(customLayerGroups[cName], `💖 BST: ${cName}`);
        }

        // Ví dụ logic xử lý icon linh hoạt
        let pColor = item.color || '#8e44ad';
        let pIcon = item.icon || 'fa-heart';

        let customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${pColor}; width:28px; height:28px; border-radius:50%;">
                    <i class="fas ${pIcon}"></i>
                </div>`,
            iconSize: [28, 28]
        });

        let formattedDesc = item.desc ? item.desc.replace(/\n/g, '<br>') : '';
        let descHTML = formattedDesc ? `<div class="text-review" style="white-space: pre-line; margin-bottom: 10px; background-color: #f4e8fa; border-left-color: #9b59b6;"><i class="fas fa-pen" style="color:#bdc3c7; margin-right:5px;"></i> ${formattedDesc}</div>` : '';

        let gLink = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
        let yLink = `https://yandex.ru/maps/?pt=${item.lng},${item.lat}&z=16&l=map`;
        let popupContent = `
            <div class="popup-custom" style="padding: 5px; min-width: 200px;">
                <h3 style="margin: 0 0 5px 0; font-size: 15px; color:#2c3e50;">${item.name}</h3>
                <span style="display:inline-block; background:#9b59b6; color:white; padding: 2px 6px; border-radius:10px; font-size:10px; margin-bottom:10px;">${cName}</span>
                ${descHTML}
                
            <div class="popup-buttons" style="margin-bottom:10px; border-top:none; padding-top:0;">
                <a href="${yLink}" target="_blank" class="btn-yandex" style="background:#ff0000; flex:1;"><i class="fab fa-yandex"></i> Yandex</a>
                <a href="${gLink}" target="_blank" class="btn-google" style="background:#4285F4; flex:1;"><i class="fab fa-google"></i> Google</a>
            </div>
                
                <div style="display:flex; gap:5px;">
                    <button onclick="showCustomSaveForm(${item.lat}, ${item.lng}, '${item.name}', '${item.id}')" style="flex:1; background:#f39c12; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size: 11px;"><i class="fas fa-edit"></i> Sửa</button>
                    <button onclick="removeCustomPoint('${item.id}')" style="flex:1; background:#e74c3c; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size: 11px;"><i class="fas fa-trash"></i> Xóa</button>
                </div>
            </div>
        `;
        // L.marker([item.lat, item.lng], {icon: customIcon}).bindTooltip(item.name, {className: 'custom-label'}).bindPopup(popupContent).addTo(customLayerGroups[cName]);
    L.marker([item.lat, item.lng], {icon: customIcon})
 .bindTooltip(item.name, {permanent: true, direction: 'bottom', className: 'custom-label'})
 .bindPopup(popupContent)
 .addTo(customLayerGroups[cName]);
    });
};

// 5. CÁC SỰ KIỆN CLICK VÀ SEARCH
map.on('click', function(e) { showCustomSaveForm(e.latlng.lat, e.latlng.lng); });

L.Control.geocoder({
    defaultMarkGeocode: false, position: 'topleft', placeholder: "Tìm địa điểm bất kỳ..."
}).on('markgeocode', function(e) {
    let lat = e.geocode.center.lat, lng = e.geocode.center.lng, name = e.geocode.name.split(',')[0];
    map.flyTo([lat, lng], 16);
    setTimeout(() => showCustomSaveForm(lat, lng, name), 600); 
}).addTo(map);

// 6. CHIA SẺ MÃ CODE (TỰ ĐỘNG COPY VÀO CLIPBOARD)
window.shareCollection = function() {
    if (myCollectionsData.length === 0) return alert("Bạn chưa có địa điểm nào trong Bộ sưu tập!");
    let code = btoa(encodeURIComponent(JSON.stringify(myCollectionsData)));
    
    // Sử dụng Clipboard API hiện đại để Copy tự động
    navigator.clipboard.writeText(code).then(() => {
        alert("✅ Đã TỰ ĐỘNG COPY mã chia sẻ vào khay nhớ tạm! \nHãy dán (Ctrl+V) gửi cho bạn bè nhé.");
    }).catch(err => {
        prompt("Trình duyệt chặn Copy tự động. Vui lòng copy thủ công mã dưới đây:", code);
    });
};

window.importCollection = function() {
    let code = prompt("Dán mã Code từ bạn bè vào đây:");
    if (code) {
        try {
            let decoded = JSON.parse(decodeURIComponent(atob(code)));
            if (Array.isArray(decoded)) {
                let merged = [...myCollectionsData];
                decoded.forEach(newItem => {
                    if (!merged.some(oldItem => oldItem.id === newItem.id)) merged.push(newItem);
                });
                localStorage.setItem('moscowCollectionsData', JSON.stringify(merged));
                alert(`🎉 Nhập thành công! Trang sẽ tải lại để hiển thị các Bộ sưu tập mới.`);
                location.reload();
            }
        } catch(e) { alert("Mã Code không hợp lệ hoặc đã bị hỏng!"); }
    }
};

window.updateCollectionCount = function() {
    let counter = document.getElementById('col-count');
    if (counter) counter.innerText = myCollectionsData.length;
};

setTimeout(renderCustomSavedPoints, 800);

// ==========================================
// BẢNG CHÚ GIẢI (LEGEND) NẰM Ở CUỐI CÙNG
// ==========================================
let legendControl = L.control({position: 'bottomleft'});
legendControl.onAdd = function (map) {
    let div = L.DomUtil.create('div', 'info-legend');
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.innerHTML = `
        <div class="legend-header" id="toggle-legend">
            <h4><i class="fas fa-map-marked-alt"></i> Thông tin bản đồ</h4>
            <i class="fas fa-chevron-up" style="color: #888;"></i>
        </div>
        <div class="legend-content">
            <p style="margin: 8px 0; font-size: 12px;"><b>💡 Mẹo:</b> Click bất kỳ đâu trên bản đồ để lưu địa điểm và tạo Bộ sưu tập riêng!</p>
            <hr>
            <p style="margin: 5px 0; color: #8e44ad;"><b>💖 Bộ sưu tập cá nhân</b></p>
            <p style="margin: 5px 0; font-size: 11px;">Bạn đang có: <b id="col-count" style="color: #e74c3c; font-size: 14px;">0</b> địa điểm</p>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button onclick="shareCollection()" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-copy"></i> Copy Mã Share</button>
                <button onclick="importCollection()" style="flex:1; background:#8e44ad; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-download"></i> Nhập Mã</button>
            </div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button onclick="openShareManager()" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;">
                <i class="fas fa-share-alt"></i> Quản lý Chia sẻ & QR
                </button>
            </div>
            <a href="https://forms.gle/R4MfQn31MQNFXGH67" target="_blank" class="btn-tour" style="display: block; background: #e74c3c; color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 15px;">
                <i class="fas fa-paper-plane"></i> Đăng ký Tour
            </a>
            <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="toggle-all-labels" onchange="toggleGlobalLabels(this.checked)"> 
                    <b>Hiển thị tất cả tên địa điểm</b>
                </label>
            </div>
        </div>
    `;

    setTimeout(() => {
        div.querySelector('#toggle-legend').addEventListener('click', () => div.classList.toggle('collapsed'));
        updateCollectionCount(); 
    }, 100);
    return div;
};
legendControl.addTo(map);

// Cập nhật lại hành vi của các nút "Lưu" ở điểm Google Sheets cũ (Dẫn thẳng về form mới)
window.toggleCollection = function(markerId) {
    let latlng = markerId.replace('m_', '').split('_');
    showCustomSaveForm(parseFloat(latlng[0].replace('-', '.')), parseFloat(latlng[1].replace('-', '.')), "Điểm từ danh sách");
};
// Hàm Bật/Tắt nhãn tên
window.toggleGlobalLabels = function(show) {
    const mapContainer = document.getElementById('map');
    if (show) {
        mapContainer.classList.add('show-all-labels');
        mapContainer.classList.remove('hide-all-labels');
    } else {
        mapContainer.classList.add('hide-all-labels');
        mapContainer.classList.remove('show-all-labels');
    }
};
// 1. HÀM MỞ TRÌNH QUẢN LÝ CHIA SẺ (Thay thế hàm cũ)
window.openShareManager = function() {
    // Lấy danh sách các Bộ sưu tập cá nhân khả dụng
    let categories = [...new Set(myCollectionsData.map(item => item.collectionName || 'Yêu thích'))];
    
    if (categories.length === 0) return alert("Bạn chưa có địa điểm nào để chia sẻ!");

    // Tạo nội dung HTML cho giao diện chọn (dùng Checkbox)
    let checkboxHTML = categories.map(cat => `
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="share-cat-check" value="${cat}" id="chk_${cat}" checked style="width: 18px; height: 18px; cursor:pointer;">
            <label for="chk_${cat}" style="cursor:pointer; font-size: 14px;">${cat}</label>
        </div>
    `).join('');

    let managerHTML = `
        <div id="share-modal" style="text-align: left; padding: 10px;">
            <h4 style="margin: 0 0 15px 0; color: #3498db;"><i class="fas fa-tasks"></i> Chọn Bộ sưu tập muốn chia sẻ</h4>
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                ${checkboxHTML}
            </div>
            <button onclick="executeShareAction()" style="width: 100%; background: #3498db; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">
                <i class="fas fa-magic"></i> Tạo Mã & QR Code
            </button>
        </div>
    `;

    // Hiển thị giao diện chọn (Bạn có thể nhắm vào một div popup hoặc dùng L.popup trung tâm)
    L.popup().setLatLng(map.getCenter()).setContent(managerHTML).openOn(map);
};

// 2. HÀM THỰC THI CHIA SẺ (TỐI ƯU QR & AUTO COPY)
window.executeShareAction = function() {
    let selectedCats = Array.from(document.querySelectorAll('.share-cat-check:checked')).map(el => el.value);
    
    if (selectedCats.length === 0) return alert("Vui lòng chọn ít nhất một bộ sưu tập!");

    // Lọc dữ liệu theo layer đã chọn và TỐI GIẢN để QR Code nhẹ hơn
    let filteredData = myCollectionsData.filter(item => selectedCats.includes(item.collectionName || 'Yêu thích'))
        .map(item => ({
            n: item.name,    // Rút gọn key 'name' thành 'n'
            d: item.desc,    // Rút gọn 'desc' thành 'd'
            c: item.collectionName,
            la: item.lat,
            ln: item.lng
        }));

    let code = btoa(encodeURIComponent(JSON.stringify(filteredData)));
    let shareUrl = `${window.location.origin}${window.location.pathname}?share=${code}`;

    // Tự động Copy vào Clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        // Tạo QR Code (Sử dụng API với dữ liệu đã rút gọn nên mã sẽ thưa và dễ quét hơn)
        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
        
        let resultHTML = `
            <div style="text-align: center; padding: 10px;">
                <p style="color: #27ae60; font-weight: bold;"><i class="fas fa-check-circle"></i> ĐÃ TỰ ĐỘNG COPY LINK!</p>
                <img src="${qrUrl}" alt="QR Code" style="width: 180px; margin: 10px 0; border: 5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <p style="font-size: 11px; color: #666;">Quét mã trên để xem lộ trình chia sẻ.</p>
                <button onclick="map.closePopup()" style="background: #eee; border: none; padding: 5px 15px; border-radius: 4px; cursor:pointer;">Đóng</button>
            </div>
        `;
        L.popup().setLatLng(map.getCenter()).setContent(resultHTML).openOn(map);
    });
};

// --- DANH SÁCH CÁC ICON KHẢ DỤNG ---
const AVAILABLE_ICONS = [
    'fa-heart', 'fa-star', 'fa-camera', 'fa-utensils', 'fa-flag', 'fa-map-marker-alt',
    'fa-landmark', 'fa-coffee', 'fa-tree', 'fa-car', 'fa-shopping-cart', 'fa-music',
    'fa-book', 'fa-hospital', 'fa-bicycle', 'fa-bed', 'fa-plane', 'fa-cocktail',
    'fa-hiking', 'fa-swimmer', 'fa-monument', 'fa-museum', 'fa-theater-masks',
    'fa-subway', 'fa-bus', 'fa-train', 'fa-ship', 'fa-campground', 'fa-fire'
];

// Hàm Mở bảng chọn Icon
window.openIconPicker = function(markerId) {
    let existing = document.getElementById('icon-picker-wrapper');
    if(existing) existing.remove();

    let overlay = document.createElement('div');
    overlay.id = 'icon-picker-wrapper';
    overlay.className = 'icon-picker-overlay';

    let currentVal = document.getElementById(`cIcon_${markerId}`).value;

    let iconsHTML = AVAILABLE_ICONS.map(icon => `
        <div class="icon-item ${icon === currentVal ? 'selected' : ''}" onclick="selectIcon('${markerId}', '${icon}')">
            <i class="fas ${icon}"></i>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div class="icon-picker-modal">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0; color:#2c3e50;"><i class="fas fa-icons"></i> Chọn Biểu tượng</h4>
                <i class="fas fa-times" style="cursor:pointer; font-size: 18px; color:#e74c3c;" onclick="document.getElementById('icon-picker-wrapper').remove()"></i>
            </div>
            <input type="text" id="icon-search" placeholder="Tìm kiếm (VD: car, tree...)" onkeyup="filterIcons()" style="padding:8px; border:1px solid #ccc; border-radius:4px; width:100%; box-sizing:border-box; outline:none;">
            <div class="icon-grid" id="icon-grid-container">
                ${iconsHTML}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

// Hàm khi người dùng click chọn 1 Icon
window.selectIcon = function(markerId, iconClass) {
    document.getElementById(`cIcon_${markerId}`).value = iconClass; // Lưu giá trị ẩn
    document.getElementById(`displayIcon_${markerId}`).className = `fas ${iconClass}`; // Đổi icon hiển thị
    document.getElementById('icon-picker-wrapper').remove(); // Đóng bảng
};

// Hàm lọc icon khi gõ tìm kiếm
window.filterIcons = function() {
    let term = document.getElementById('icon-search').value.toLowerCase();
    let items = document.querySelectorAll('.icon-item');
    items.forEach(item => {
        let iconClass = item.querySelector('i').className;
        if(iconClass.includes(term)) item.style.display = 'block';
        else item.style.display = 'none';
    });
};
// --- CHÈN DÒNG NÀY VÀO CUỐI CÙNG CỦA FILE SCRIPT.JS ---
// Đảm bảo lúc mới vào web, các nhãn tên được ẩn đi gọn gàng
document.getElementById('map').classList.add('hide-all-labels');