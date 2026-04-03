

window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareCode = urlParams.get('share');
    
    if (shareCode) {
        try {
            const decodedStr = decodeURIComponent(atob(shareCode));
            const decodedData = JSON.parse(decodedStr);
            
            if (Array.isArray(decodedData)) {
                // Lấy dữ liệu hiện tại
                let currentData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
                let newCount = 0;

                decodedData.forEach(item => {
                    // CHUẨN HÓA: Ép mọi dữ liệu về cấu trúc chuẩn
                    let restored = {
                        id: item.id || `shared_${(item.la || item.lat).toFixed(6)}_${(item.ln || item.lng).toFixed(6)}`.replace(/\./g, '-'),
                        name: item.n || item.name || "Địa điểm mới",
                        desc: item.d || item.desc || "",
                        lat: parseFloat(item.la || item.lat),
                        lng: parseFloat(item.ln || item.lng),
                        collectionName: item.c || item.collectionName || "Được chia sẻ",
                        date: item.dt || item.date || "",
                        color: item.color || "#e67e22",
                        icon: item.icon || "fa-share-alt"
                    };

                    // Kiểm tra nếu tọa độ chưa tồn tại thì mới thêm
                    if (!currentData.some(old => old.lat === restored.lat && old.lng === restored.lng)) {
                        currentData.push(restored);
                        newCount++;
                    }
                });

                if (newCount > 0) {
                    localStorage.setItem('moscowCollectionsData', JSON.stringify(currentData));
                    // Cập nhật lại biến toàn cục trước khi reload hoặc vẽ
                    window.myCollectionsData = currentData;
                    alert(`🎉 Đã nhận thêm ${newCount} địa điểm!`);
                }
                // Xóa tham số share để tránh lặp lại
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            }
        } catch(e) { console.error("Lỗi Import:", e); }
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

                    let coordsStr = `${lat}, ${lng}`;

                    if (!isNaN(lat) && !isNaN(lng)) {
                        
                        // 1. Thêm vào dữ liệu Bản đồ nhiệt
                        heatData.push([lat, lng, 1]); 

                        // 2. Xử lý danh mục & Nút chỉ đường
                        let cats = row.Category.split(';').map(c => c.trim());
                        let tagsHTML = cats.map(c => `<span class="category-badge" style="background:#333; margin-right:4px;">${c}</span>`).join('');
                        let routingLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

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
                        let markerId = `m_${lat}_${lng}`.replace(/\./g, '-');
                        // Đã cập nhật thành myCollectionsData và kiểm tra theo thuộc tính id
                        let isAdded = myCollectionsData.some(item => item.id === markerId); 
                        let colClass = isAdded ? "added" : "";
                        let colText = isAdded ? "❤️ Đã lưu" : "Lưu vào Bộ sưu tập";
                        
                        let formEntryId = 'entry.1274491323'; // ID Form của bạn
                        let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform';
                        let coordsEntryId = 'entry.218236711'; // ID Tọa độ

                        let writeReviewLink = `${formBaseUrl}?usp=pp_url&${formEntryId}=${encodeURIComponent(row.Name)}&${coordsEntryId}=${encodeURIComponent(coordsStr)}`;


                        // 5. Gộp Tên & Lắp ráp Popup Tối ưu
                        let titleHTML = `<h3 style="margin: 0 0 4px 0; font-size: 15px;">${row.Name || 'Chưa có tên'}</h3>`;
                        let subNames = [];
                        if (row.Name_VI) subNames.push(`🇻🇳 ${row.Name_VI}`);
                        if (row.Name_EN) subNames.push(`🇬🇧 ${row.Name_EN}`);
                        if (subNames.length > 0) {
                            titleHTML += `<div class="sub-name-wrapper">${subNames.join(' &nbsp;•&nbsp; ')}</div>`;
                        }

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
        // window.mainLayerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
        window.mainLayerControl = L.control.layers(baseMaps, {}, { collapsed: true }).addTo(map);
        window.customLayerGroups = {}; // Lưu trữ các nhóm layer cá nhân
        // Bảng điều khiển Layer (Đã thu gọn collapsed: true)
        // L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
        // Đăng ký các Layer của Google Sheets vào Bảng điều khiển chung
        // for (let cat in layerGroups) {
        //     window.mainLayerControl.addOverlay(layerGroups[cat], cat);
        // }
        for (let cat in categoryLayers) {
            window.mainLayerControl.addOverlay(categoryLayers[cat], cat);
        }
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

// Tìm đến đoạn khởi tạo locateControl và sửa lại như sau:
let locateControl = L.control({position: 'topleft'});

locateControl.onAdd = function() {
    let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.style.backgroundColor = 'white';
    div.style.width = '34px';
    div.style.height = '34px';
    div.style.cursor = 'pointer';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.innerHTML = `<a href="#" title="Vị trí của tôi" style="color: #333;"><i class="fas fa-crosshairs"></i></a>`;
    
    // QUAN TRỌNG: Ngăn chặn sự kiện click truyền xuống bản đồ nền
    L.DomEvent.disableClickPropagation(div);

    div.onclick = function(e){
        e.preventDefault();
        // Bật độ chính xác cao cho GPS di động
        map.locate({
            setView: true, 
            maxZoom: 16,
            enableHighAccuracy: true // Giúp GPS di động nhạy hơn
        });
    }
    return div;
};
locateControl.addTo(map);

// let locateControl = L.control({position: 'topleft'});
// locateControl.onAdd = function() {
//     let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
//     div.style.backgroundColor = 'white';
//     div.style.width = '34px';
//     div.style.height = '34px';
//     div.style.cursor = 'pointer';
//     div.innerHTML = `<a href="#" title="Vị trí của tôi" style="font-size:18px; color: #333; line-height:34px; text-align:center; display:block; text-decoration:none;"><i class="fas fa-crosshairs"></i></a>`;
    
//     div.onclick = function(e){
//         e.preventDefault();
//         map.locate({setView: true, maxZoom: 16}); // Lệnh tìm vị trí và zoom đến
//     }
//     return div;
// };
// locateControl.addTo(map);

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

    let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
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
           
            <label style="font-size: 11px; display:block; margin-bottom:3px;">Ngày diễn ra sự kiện:</label>
            <input type="date" id="cDate_${markerId}" value="${existing.date || ''}" style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc;">

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

// Thêm 2 tham số: isPublicShare và publicUrl
window.savePointData = function(markerId, lat, lng, isPublicShare = false, publicUrl = '') {
    let nameVal = document.getElementById(`cName_${markerId}`).value.trim();
    let catVal = document.getElementById(`cCat_${markerId}`).value.trim() || 'Yêu thích';
    let colorVal = document.getElementById(`cColor_${markerId}`).value;
    let iconVal = document.getElementById(`cIcon_${markerId}`).value;
    let descVal = document.getElementById(`cDesc_${markerId}`).value.trim();
    let dateVal = document.getElementById(`cDate_${markerId}`) ? document.getElementById(`cDate_${markerId}`).value : '';

    if (!nameVal) return alert("Vui lòng nhập tên địa điểm!");

    let existingIndex = myCollectionsData.findIndex(item => item.id === markerId);

    let newData = { 
    id: markerId, name: nameVal, desc: descVal, lat: lat, lng: lng, 
    collectionName: catVal, color: colorVal, icon: iconVal,
    date: dateVal // Đã thêm ngày tháng
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


// window.renderCustomSavedPoints = function() {
//     // 1. XÓA CÁC LAYER CÁ NHÂN CŨ KHỎI BẢN ĐỒ
//     // Chúng ta không xóa cả bảng điều khiển, chỉ xóa các lớp (overlays) bên trong nó
//     for (let cat in customLayerGroups) {
//         map.removeLayer(customLayerGroups[cat]);
//         if (window.mainLayerControl) {
//             window.mainLayerControl.removeLayer(customLayerGroups[cat]);
//         }
//     }
//     customLayerGroups = {};

//     // 2. DUYỆT DỮ LIỆU ĐỂ VẼ
//     myCollectionsData.forEach(item => {
//         // KIỂM TRA TỌA ĐỘ HỢP LỆ (Tránh lỗi undefined, undefined)
//         if (!item.lat || !item.lng || isNaN(item.lat) || isNaN(item.lng)) {
//             console.warn("Bỏ qua điểm lỗi tọa độ:", item);
//             return;
//         }

//         // Kiểm tra bộ lọc ngày
//         if (window.currentFilterDates && window.currentFilterDates.length > 0) {
//             if (!item.date || !window.currentFilterDates.includes(item.date)) return;
//         }

//         let cName = item.collectionName || 'Yêu thích';

//         // Tạo nhóm layer nếu chưa có
//         if (!customLayerGroups[cName]) {
//             customLayerGroups[cName] = L.markerClusterGroup({ maxClusterRadius: 30 });
//             map.addLayer(customLayerGroups[cName]);
            
//             // THÊM VÀO BẢNG ĐIỀU KHIỂN (Chỉ thêm nếu bảng đã tồn tại)
//             if (window.mainLayerControl) {
//                 window.mainLayerControl.addOverlay(customLayerGroups[cName], `💖 ${cName}`);
//             }
//         }

//         let pColor = item.color || '#8e44ad';
//         let pIcon = item.icon || 'fa-heart';
        
//         let customIcon = L.divIcon({
//             className: 'custom-div-icon',
//             html: `<div style="background-color:${pColor}; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"><i class="fas ${pIcon}"></i></div>`,
//             iconSize: [28, 28]
//         });

//         // SỬA LỖI CÚ PHÁP LINK (Dùng dấu $ trước ngoặc nhọn)
//         let gLink = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
//         let yLink = `https://yandex.ru/maps/?pt=${item.lng},${item.lat}&z=16&l=map`;

//         let popupContent = `
//             <div class="popup-custom">
//                 <h3 style="margin:0 0 5px 0;">${item.name}</h3>
//                 <p style="font-size:12px; color:#666;">${item.desc || 'Không có mô tả'}</p>
//                 <div style="display:flex; gap:5px; margin-top:10px;">
//                     <a href="${gLink}" target="_blank" style="flex:1; background:#4285F4; color:white; text-align:center; padding:5px; border-radius:4px; text-decoration:none; font-size:12px;">Google Maps</a>
//                     <a href="${yLink}" target="_blank" style="flex:1; background:#ff0000; color:white; text-align:center; padding:5px; border-radius:4px; text-decoration:none; font-size:12px;">Yandex</a>
//                 </div>
//                 <button onclick="removeCustomPoint('${item.id}')" style="width:100%; margin-top:8px; background:#f8f9fa; border:1px solid #ddd; padding:5px; border-radius:4px; cursor:pointer; font-size:11px;">🗑️ Xóa khỏi bộ sưu tập</button>
//             </div>
//         `;

//         L.marker([item.lat, item.lng], {icon: customIcon})
//          .bindTooltip(item.name, {permanent: true, direction: 'bottom', className: 'custom-label'})
//          .bindPopup(popupContent)
//          .addTo(customLayerGroups[cName]);
//     });

//     if (typeof updateEventSummary === 'function') updateEventSummary();
// };

// window.renderCustomSavedPoints = function() {
//     // 1. Lấy dữ liệu mới nhất từ biến toàn cục
//     if (!window.myCollectionsData) {
//         window.myCollectionsData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
//     }

//     // 2. Duyệt qua từng địa điểm trong bộ sưu tập
//     myCollectionsData.forEach(item => {
//         // Kiểm tra tọa độ hợp lệ
//         if (!item.lat || !item.lng) return;

//         // Lọc theo ngày (Multi-select)
//         if (window.currentFilterDates && window.currentFilterDates.length > 0) {
//             if (!item.date || !window.currentFilterDates.includes(item.date)) return;
//         }

//         let cName = item.collectionName || 'Yêu thích';

//         // 3. LOGIC QUAN TRỌNG: Tạo và Đăng ký Layer Group
//         if (!customLayerGroups[cName]) {
//             // Tạo nhóm mới trên bản đồ
//             customLayerGroups[cName] = L.markerClusterGroup({ maxClusterRadius: 30 });
//             map.addLayer(customLayerGroups[cName]);
            
//             // Đăng ký vào bảng điều khiển Layer (Overlay)
//             if (window.mainLayerControl) {
//                 window.mainLayerControl.addOverlay(customLayerGroups[cName], `💖 ${cName}`);
//             }
//         }

//         // Vẽ Marker (Giữ nguyên logic icon/popup của bạn)
//         let pColor = item.color || '#8e44ad';
//         let pIcon = item.icon || 'fa-heart';
//         let customIcon = L.divIcon({
//             className: 'custom-div-icon',
//             html: `<div style="background-color:${pColor}; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; border:2px solid white;"><i class="fas ${pIcon}" style="font-size:12px;"></i></div>`,
//             iconSize: [28, 28]
//         });

//         L.marker([item.lat, item.lng], {icon: customIcon})
//          .bindTooltip(item.name, {permanent: true, direction: 'bottom', className: 'custom-label'})
//          .bindPopup(`<b>${item.name}</b><br>${item.desc || ''}`)
//          .addTo(customLayerGroups[cName]);
//     });

//     // Cập nhật thống kê ngày (nếu có)
//     if (typeof updateEventSummary === 'function') updateEventSummary();
// };
window.renderCustomSavedPoints = function() {
    // Lấy dữ liệu
    if (!window.myCollectionsData) {
        window.myCollectionsData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
    }

    // 1. CHỈ XÓA LAYER CÁ NHÂN CŨ (Tuyệt đối không dùng mainLayerControl.remove() nữa)
    for (let cat in customLayerGroups) {
        map.removeLayer(customLayerGroups[cat]); // Xóa khỏi bản đồ
        if (window.mainLayerControl) {
            window.mainLayerControl.removeLayer(customLayerGroups[cat]); // Rút tên khỏi Bảng điều khiển
        }
    }
    customLayerGroups = {}; // Làm rỗng danh sách tạm

    // 2. VẼ VÀ ĐĂNG KÝ LẠI TỪ ĐẦU
    myCollectionsData.forEach(item => {
        if (!item.lat || !item.lng) return;

        // Lọc theo ngày
        if (window.currentFilterDates && window.currentFilterDates.length > 0) {
            if (!item.date || !window.currentFilterDates.includes(item.date)) return;
        }

        let cName = item.collectionName || 'Yêu thích';

        // Nếu nhóm layer chưa tồn tại -> Tạo mới và Đăng ký
        if (!customLayerGroups[cName]) {
            customLayerGroups[cName] = L.markerClusterGroup({ maxClusterRadius: 30 });
            map.addLayer(customLayerGroups[cName]);
            
            // Đăng ký tên bộ sưu tập vào Bảng điều khiển chung
            if (window.mainLayerControl) {
                window.mainLayerControl.addOverlay(customLayerGroups[cName], `💖 ${cName}`);
            }
        }

        // Tạo Icon
        let pColor = item.color || '#8e44ad';
        let pIcon = item.icon || 'fa-heart';
        let customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${pColor}; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; border:2px solid white;"><i class="fas ${pIcon}" style="font-size:12px;"></i></div>`,
            iconSize: [28, 28]
        });

        // Tạo Popup (Đã sửa lỗi link Google/Yandex)
        let gLink = `https://www.google.com/maps/search/?api=1&query=$${item.lat},${item.lng}`;
        let yLink = `https://yandex.ru/maps/?pt=${item.lng},${item.lat}&z=16&l=map`;

        let popupContent = `
            <div class="popup-custom">
                <h3 style="margin:0 0 5px 0;">${item.name}</h3>
                <p style="font-size:12px; color:#666;">${item.desc || 'Không có mô tả'}</p>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <a href="${gLink}" target="_blank" style="flex:1; background:#4285F4; color:white; text-align:center; padding:5px; border-radius:4px; text-decoration:none; font-size:12px;">Google</a>
                    <a href="${yLink}" target="_blank" style="flex:1; background:#ff0000; color:white; text-align:center; padding:5px; border-radius:4px; text-decoration:none; font-size:12px;">Yandex</a>
                </div>
                <button onclick="removeCustomPoint('${item.id}')" style="width:100%; margin-top:8px; background:#f8f9fa; border:1px solid #ddd; padding:5px; border-radius:4px; cursor:pointer; font-size:11px;">🗑️ Xóa</button>
            </div>
        `;

        // Vẽ điểm lên bản đồ
        L.marker([item.lat, item.lng], {icon: customIcon})
         .bindTooltip(item.name, {permanent: true, direction: 'bottom', className: 'custom-label'})
         .bindPopup(popupContent)
         .addTo(customLayerGroups[cName]);
    });

    if (typeof updateEventSummary === 'function') updateEventSummary();
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

// Tạo biến toàn cục lưu trữ ngày đang lọc
// window.currentFilterDate = '';

// Khởi tạo công cụ lọc trên bản đồ (CÓ TÍNH NĂNG THU GỌN)
let dateFilterControl = L.control({position: 'topright'});

dateFilterControl.onAdd = function() {
    let div = L.DomUtil.create('div', 'date-filter-control');
    L.DomEvent.disableClickPropagation(div); // Tránh xuyên thấu click
    L.DomEvent.disableScrollPropagation(div); // Tránh cuộn nhầm bản đồ khi cuộn danh sách
    
    // Tạo cấu trúc HTML chia làm 2 phần: Header (Tiêu đề) và Content (Nội dung)
    div.innerHTML = `
        <div style="background:white; border-radius:5px; box-shadow:0 1px 5px rgba(0,0,0,0.4); width: 180px; box-sizing: border-box; overflow: hidden;">
            
            <div id="toggle-date-filter" style="padding: 10px; background: #fdfdfd; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid transparent;">
                <b style="font-size:12px; color:#333; margin:0;"><i class="fas fa-calendar-alt"></i> Lọc theo ngày</b>
                <i class="fas fa-chevron-down" id="date-filter-icon" style="color: #888; font-size: 12px; transition: transform 0.3s;"></i>
            </div>
            
            <div id="date-filter-content" style="padding: 0 10px 10px 10px; display: block;">
                <input type="date" id="map-date-filter" onchange="applyDateFilter(this.value)" style="margin-top:5px; padding:5px; width:100%; border:1px solid #ccc; border-radius:3px; box-sizing: border-box; font-family: inherit;">
                
                <div id="event-summary-list" style="margin-top:8px; font-size:11px; max-height:120px; overflow-y:auto; border-top:1px dashed #eee; padding-top:5px;">
                    <span style="color:#999; font-style:italic;">Đang tải...</span>
                </div>

                <button onclick="event.stopPropagation(); applyDateFilter('')" style="margin-top:8px; width:100%; padding:6px; background:#e74c3c; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px; font-weight: bold;">
                    <i class="fas fa-times"></i> Hiện tất cả
                </button>
            </div>

        </div>
    `;

    // Logic xử lý ẩn hiện khi người dùng click vào Tiêu đề
    setTimeout(() => {
        let toggleBtn = div.querySelector('#toggle-date-filter');
        let content = div.querySelector('#date-filter-content');
        let icon = div.querySelector('#date-filter-icon');
        
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Chặn click xuyên thấu
            
            if (content.style.display === 'none') {
                // Mở rộng ra
                content.style.display = 'block';
                toggleBtn.style.borderBottom = '1px solid #eee';
                icon.style.transform = 'rotate(0deg)'; // Mũi tên chỉ xuống
            } else {
                // Thu gọn lại
                content.style.display = 'none';
                toggleBtn.style.borderBottom = '1px solid transparent';
                icon.style.transform = 'rotate(180deg)'; // Mũi tên chỉ lên
            }
        });
    }, 100);

    return div;
};
dateFilterControl.addTo(map);

// Dùng mảng (Array) để lưu nhiều ngày cùng lúc
window.currentFilterDates = []; 

// Hàm thực thi lệnh lọc (Hỗ trợ Bật/Tắt nhiều ngày)
window.applyDateFilter = function(dateStr) {
    if (!dateStr) {
        // Nút "Hiện tất cả": Làm rỗng mảng
        window.currentFilterDates = [];
    } else {
        // Bấm vào 1 ngày: Kiểm tra xem ngày đó đã có trong mảng chưa
        let index = window.currentFilterDates.indexOf(dateStr);
        if (index > -1) {
            // Đã có -> Bỏ chọn (Xóa khỏi mảng)
            window.currentFilterDates.splice(index, 1);
        } else {
            // Chưa có -> Chọn thêm (Thêm vào mảng)
            window.currentFilterDates.push(dateStr);
        }
    }
    
    // Reset ô input lịch sau khi chọn để tránh gây bối rối
    let dateInput = document.getElementById('map-date-filter');
    if(dateInput) dateInput.value = ''; 

    renderCustomSavedPoints(); // Vẽ lại bản đồ
    updateEventSummary();      // Cập nhật lại UI danh sách
};
// Hàm 2: Tự động gom nhóm và đếm số lượng sự kiện theo từng ngày
window.updateEventSummary = function() {
    let summaryDiv = document.getElementById('event-summary-list');
    if (!summaryDiv) return;

    // Quét dữ liệu và đếm
    let counts = {};
    myCollectionsData.forEach(item => {
        if (item.date) { // Chỉ đếm những điểm có nhập ngày tháng
            counts[item.date] = (counts[item.date] || 0) + 1;
        }
    });

    let dates = Object.keys(counts).sort(); // Sắp xếp theo thứ tự thời gian

    if (dates.length === 0) {
        summaryDiv.innerHTML = '<span style="color:#999; font-style:italic;">Chưa có sự kiện nào được đặt ngày.</span>';
        return;
    }

    // Tạo các nút bấm HTML cho từng ngày có sự kiện
    // let html = dates.map(d => {
    //     // Highlight nếu ngày này đang được chọn
    //     let isSelected = (d === window.currentFilterDate);
    //     let style = isSelected 
    //         ? 'background:#f4e8fa; color:#8e44ad; font-weight:bold; border-left: 3px solid #8e44ad;' 
    //         : 'color:#555; background: #f9f9f9;';
            
    //     // Chuyển đổi định dạng YYYY-MM-DD sang DD/MM/YYYY cho đẹp
    //     let parts = d.split('-');
    //     let displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;

    //     return `
    //         <div onclick="event.stopPropagation(); applyDateFilter('${d}')" style="padding:4px 6px; border-radius:3px; margin-bottom:4px; cursor:pointer; transition: 0.2s; ${style}">
    //              📅 ${displayDate}: <span style="float:right; background:#e74c3c; color:white; padding:1px 5px; border-radius:10px; font-size:9px;">${counts[d]}</span>
    //         </div>
    //     `;
    // }).join('');


    // Tạo các nút bấm HTML cho từng ngày
    let html = dates.map(d => {
        // KIỂM TRA MẢNG: Xem ngày này có nằm trong danh sách đang chọn không
        let isSelected = window.currentFilterDates.includes(d);
        
        let style = isSelected 
            ? 'background:#f4e8fa; color:#8e44ad; font-weight:bold; border-left: 3px solid #8e44ad;' 
            : 'color:#555; background: #f9f9f9; border-left: 3px solid transparent;';
            
        let parts = d.split('-');
        let displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;

        return `
            <div onclick="event.stopPropagation(); applyDateFilter('${d}')" style="padding:4px 6px; border-radius:3px; margin-bottom:4px; cursor:pointer; transition: 0.2s; ${style}">
                📅 ${displayDate}: <span style="float:right; background:#e74c3c; color:white; padding:1px 5px; border-radius:10px; font-size:9px;">${counts[d]}</span>
            </div>
        `;
    }).join('');


    summaryDiv.innerHTML = html;
};


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
// window.executeShareAction = function() {
//     let selectedCats = Array.from(document.querySelectorAll('.share-cat-check:checked')).map(el => el.value);
    
//     if (selectedCats.length === 0) return alert("Vui lòng chọn ít nhất một bộ sưu tập!");

//     // Lọc dữ liệu theo layer đã chọn và TỐI GIẢN để QR Code nhẹ hơn
//     let filteredData = myCollectionsData.filter(item => selectedCats.includes(item.collectionName || 'Yêu thích'))
//         .map(item => ({
//             n: item.name,    // Rút gọn key 'name' thành 'n'
//             d: item.desc,    // Rút gọn 'desc' thành 'd'
//             c: item.collectionName,
//             la: item.lat,
//             ln: item.lng
//         }));

//     let code = btoa(encodeURIComponent(JSON.stringify(filteredData)));
//     let shareUrl = `${window.location.origin}${window.location.pathname}?share=${code}`;

//     // Tự động Copy vào Clipboard
//     navigator.clipboard.writeText(shareUrl).then(() => {
//         // Tạo QR Code (Sử dụng API với dữ liệu đã rút gọn nên mã sẽ thưa và dễ quét hơn)
//         let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
        
//         let resultHTML = `
//             <div style="text-align: center; padding: 10px;">
//                 <p style="color: #27ae60; font-weight: bold;"><i class="fas fa-check-circle"></i> ĐÃ TỰ ĐỘNG COPY LINK!</p>
//                 <img src="${qrUrl}" alt="QR Code" style="width: 180px; margin: 10px 0; border: 5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
//                 <p style="font-size: 11px; color: #666;">Quét mã trên để xem lộ trình chia sẻ.</p>
//                 <button onclick="map.closePopup()" style="background: #eee; border: none; padding: 5px 15px; border-radius: 4px; cursor:pointer;">Đóng</button>
//             </div>
//         `;
//         L.popup().setLatLng(map.getCenter()).setContent(resultHTML).openOn(map);
//     });
// };
// 2. HÀM THỰC THI CHIA SẺ (TÍCH HỢP API RÚT GỌN LINK TỰ ĐỘNG)
// window.executeShareAction = async function() {
//     let selectedCats = Array.from(document.querySelectorAll('.share-cat-check:checked')).map(el => el.value);
    
//     if (selectedCats.length === 0) return alert("Vui lòng chọn ít nhất một bộ sưu tập!");

//     // Hiển thị trạng thái Loading để người dùng chờ API xử lý
//     let btnSubmit = document.querySelector('#share-modal button');
//     let originalBtnText = btnSubmit.innerHTML;
//     btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo link rút gọn...';
//     btnSubmit.disabled = true;

//     try {
//         // 1. Lọc và Tối giản dữ liệu
//         let filteredData = myCollectionsData.filter(item => selectedCats.includes(item.collectionName || 'Yêu thích'))
//             .map(item => ({
//                 n: item.name,
//                 d: item.desc,
//                 c: item.collectionName,
//                 la: item.lat,
//                 ln: item.lng
//             }));

//         // 2. Tạo Link gốc (Dài)
//         let code = btoa(encodeURIComponent(JSON.stringify(filteredData)));
//         let longShareUrl = `${window.location.origin}${window.location.pathname}?share=${code}`;

//         // 3. Gọi API is.gd để rút gọn Link
//         let finalShareUrl = longShareUrl; // Fallback: mặc định dùng link dài nếu API lỗi
//         try {
//             let response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longShareUrl)}`);
//             let data = await response.json();
//             if (data.shorturl) {
//                 finalShareUrl = data.shorturl; // Lấy link siêu ngắn thành công!
//             }
//         } catch (apiError) {
//             console.warn("Không thể rút gọn link, sử dụng link gốc.", apiError);
//         }

//         // 4. Copy và Hiển thị QR Code (Từ link ngắn)
//         await navigator.clipboard.writeText(finalShareUrl);
        
//         let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(finalShareUrl)}`;
        
//         let resultHTML = `
//             <div style="text-align: center; padding: 10px;">
//                 <p style="color: #27ae60; font-weight: bold; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> ĐÃ TỰ ĐỘNG COPY LINK NGẮN!</p>
//                 <input type="text" value="${finalShareUrl}" readonly style="width: 100%; padding: 5px; text-align: center; border: 1px dashed #ccc; background: #f9f9f9; font-size: 11px; margin-bottom: 10px;">
                
//                 <img src="${qrUrl}" alt="QR Code" style="width: 180px; margin: 5px 0; border: 5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                
//                 <p style="font-size: 11px; color: #666; margin-top: 5px;">Mã QR giờ đã rất thưa và dễ quét.</p>
//                 <button onclick="map.closePopup()" style="background: #eee; border: none; padding: 8px 20px; border-radius: 4px; cursor:pointer; font-weight: bold; margin-top: 10px;">Đóng</button>
//             </div>
//         `;
//         L.popup().setLatLng(map.getCenter()).setContent(resultHTML).openOn(map);

//     } catch (error) {
//         alert("Đã xảy ra lỗi khi tạo chia sẻ!");
//         console.error(error);
//     } finally {
//         // Phục hồi lại nút bấm
//         if(btnSubmit) {
//             btnSubmit.innerHTML = originalBtnText;
//             btnSubmit.disabled = false;
//         }
//     }
// };

window.executeShareAction = function() {
    let selectedCats = Array.from(document.querySelectorAll('.share-cat-check:checked')).map(el => el.value);
    if (selectedCats.length === 0) return alert("Vui lòng chọn ít nhất một bộ sưu tập!");

    // 1. Lọc và Tối giản dữ liệu
    let filteredData = myCollectionsData.filter(item => selectedCats.includes(item.collectionName || 'Yêu thích'))
        .map(item => ({
            n: item.name, d: item.desc, c: item.collectionName,
            la: item.lat, ln: item.lng,
            dt: item.date || '' // Thêm trường ngày tháng vào chia sẻ
        }));

    // 2. Tạo Link
    let code = btoa(encodeURIComponent(JSON.stringify(filteredData)));
    let shareUrl = `${window.location.origin}${window.location.pathname}?share=${code}`;

    // 3. Tự động Copy
    navigator.clipboard.writeText(shareUrl).catch(() => console.log("Copy thủ công"));
    
    // 4. Hiển thị Popup và Vẽ QR Code bằng QRious
    let resultHTML = `
        <div style="text-align: center; padding: 10px;">
            <p style="color: #27ae60; font-weight: bold; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> ĐÃ COPY LINK!</p>
            <input type="text" value="${shareUrl}" onclick="this.select()" readonly style="width: 100%; padding: 5px; text-align: center; border: 1px dashed #ccc; font-size: 11px; margin-bottom: 10px;">
            
            <canvas id="qr-canvas" style="margin: 5px 0; border: 5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);"></canvas>
            
            <button onclick="map.closePopup()" style="background: #eee; border: none; padding: 8px 20px; border-radius: 4px; cursor:pointer; font-weight: bold; margin-top: 10px;">Đóng</button>
        </div>
    `;
    L.popup().setLatLng(map.getCenter()).setContent(resultHTML).openOn(map);

    // Vẽ QR ngay sau khi Popup mở ra (delay 100ms để DOM kịp load)
    setTimeout(() => {
        new QRious({
            element: document.getElementById('qr-canvas'),
            value: shareUrl,
            size: 220, // Kích thước QR
            level: 'L' // Giảm mức độ sửa lỗi để mã thưa và dễ quét hơn với link dài
        });
    }, 100);
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
// Gọi hàm vẽ ngay khi trang web tải xong
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        renderCustomSavedPoints();
    }, 500); // Delay nhẹ để đảm bảo Map và Control đã render xong
});