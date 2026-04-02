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
        
        data.forEach(row => {
            if (row.Coordinates && row.Category) {
                let coordsArray = row.Coordinates.split(',');
                if (coordsArray.length === 2) {
                    let lat = parseFloat(coordsArray[0].trim());
                    let lng = parseFloat(coordsArray[1].trim());

                    if (!isNaN(lat) && !isNaN(lng)) {
                        let cats = row.Category.split(';').map(c => c.trim());
                        let tagsHTML = cats.map(c => `<span class="category-badge" style="background:#333; margin-right:4px;">${c}</span>`).join('');
                        // TÍNH NĂNG MỚI (Heatmap): Thêm tọa độ vào mảng bản đồ nhiệt
                        heatData.push([lat, lng, 1]); // Số 1 là cường độ nhiệt (intensity)

                        // TÍNH NĂNG MỚI (Routing): Cập nhật Link Google Maps thành link Chỉ đường
                        let routingLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

                        // Xử lý Text & Link Review
                        let reviewsHTML = '';
                        if (row.Reviews) {
                            let items = row.Reviews.split('|');
                            let textReviews = []; let linkReviews = []; let linkCounter = 1;
                            items.forEach(item => {
                                let content = item.trim();
                                if (content !== '') {
                                    if (content.toLowerCase().startsWith('http://') || content.toLowerCase().startsWith('https://')) {
                                        linkReviews.push(`<a href="${content}" target="_blank" class="btn-review" style="flex: 1 1 45%; margin: 2%; background-color: #27ae60;"><i class="fas fa-external-link-alt"></i> Link ${linkCounter++}</a>`);
                                    } else {
                                        let formattedContent = content.replace(/\n/g, '<br>'); // Chuyển dấu xuống dòng thành thẻ <br>
                                        textReviews.push(`<div class="text-review"><i class="fas fa-quote-left" style="color:#ccc; margin-right:5px;"></i>${formattedContent}</div>`);
                                    }
                                }
                            });
                            if (textReviews.length > 0 || linkReviews.length > 0) {
                                reviewsHTML = `<div class="reviews-container">` + textReviews.join('') + (linkReviews.length > 0 ? `<div class="link-reviews-wrapper">${linkReviews.join('')}</div>` : '') + `</div>`;
                            }
                        }

                        let formEntryId = 'entry.1274491323'; // ID tên địa điểm cho form cập nhật ảnh
                        let formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeDXHWF-A8H1htIUwH3g13sKN5kxrnTaU4Nm8vT4p6e4ufL-w/viewform';
                        let writeReviewLink = `${formBaseUrl}?usp=pp_url&${formEntryId}=${encodeURIComponent(row.Name)}`;

                        // Lắp ráp Popup bản hoàn chỉnh
                        let popupContent = `
                            <div class="popup-custom">
                                <h3>${row.Name || 'Chưa có tên'}</h3>
                                ${row.Name_VI ? `<h4>🇻🇳 ${row.Name_VI}</h4>` : ''}
                                ${row.Name_EN ? `<h4>🇬🇧 ${row.Name_EN}</h4>` : ''}
                                <div style="margin-bottom: 10px;">${tagsHTML}</div>
                                
                                <div class="multi-lang-desc">
                                    ${row.Desc_VI ? `<div class="lang-block"><span class="flag">🇻🇳</span>${row.Desc_VI}</div>` : ''}
                                    ${row.Desc_RU ? `<div class="lang-block"><span class="flag">🇷🇺</span>${row.Desc_RU}</div>` : ''}
                                    ${row.Desc_EN ? `<div class="lang-block"><span class="flag">🇬🇧</span>${row.Desc_EN}</div>` : ''}
                                </div>
                                
                                ${row.Image_URL ? `<img src="${row.Image_URL}" alt="${row.Name}" style="margin-bottom: 10px; width: 100%; border-radius: 8px;">` : ''}
                                ${reviewsHTML}
                                
                                <div class="popup-buttons" style="display: flex; flex-wrap: wrap; justify-content: space-between; border-top: 1px solid #eee; padding-top: 10px;">
                                    <a href="${row.Yandex_Link}" target="_blank" class="btn-yandex" style="flex: 1 1 45%; margin: 2%;"><i class="fab fa-yandex"></i> Yandex</a>
                                    <a href="${row.Google_Link}" target="_blank" class="btn-google" style="flex: 1 1 45%; margin: 2%;"><i class="fab fa-google"></i> Google</a>
                                </div>
                                
                                <a href="${writeReviewLink}" target="_blank" style="background-color: #f39c12; color: white; width: 100%; display: block; margin-top: 10px; text-align: center; padding: 8px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 12px;">
                                    <i class="fas fa-pen"></i> Đóng góp thêm ảnh/review
                                </a>
                            </div>
                        `;
                        // Khởi tạo Marker hiển thị
                        cats.forEach(cat => {
                            if (!categoryLayers[cat]) {
                                categoryLayers[cat] = L.markerClusterGroup({ maxClusterRadius: 40 });
                            }
                            let marker = L.marker([lat, lng], { icon: getCustomIcon(cat) })
                                          .bindTooltip(row.Name, { direction: 'bottom', className: 'custom-label' })
                                          .bindPopup(popupContent);
                            categoryLayers[cat].addLayer(marker);
                        });

                        // TÍNH NĂNG MỚI (Search): Tạo một marker vô hình chứa Title để thanh tìm kiếm quét
                        let hiddenSearchMarker = L.marker([lat, lng], { title: row.Name, opacity: 0 });
                        hiddenSearchMarker.bindPopup(popupContent);
                        searchLayer.addLayer(hiddenSearchMarker);
                    

                        // cats.forEach(cat => {
                        //     if (!categoryLayers[cat]) {
                        //         categoryLayers[cat] = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 15 });
                        //     }
                        //     let marker = L.marker([lat, lng], { icon: getCustomIcon(cat) })
                        //                   .bindTooltip(row.Name, { direction: 'bottom', className: 'custom-label' })
                        //                   .bindPopup(popupContent);
                        //     categoryLayers[cat].addLayer(marker);
                        // });
                    }
                }
            }
        });
        // Đưa các lớp lên bản đồ
        let overlayMaps = {};
        for (let cat in categoryLayers) {
            map.addLayer(categoryLayers[cat]);
            overlayMaps[cat] = categoryLayers[cat];
        }

        // TÍNH NĂNG MỚI (Heatmap): Tạo layer bản đồ nhiệt và đưa vào menu bộ lọc
        let heatLayer = L.heatLayer(heatData, {
            radius: 25, 
            blur: 15, 
            maxZoom: 15,
            gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'orange', 1.0: 'red'}
        });
        overlayMaps["🔥 Bản đồ Nhiệt (Độ hot)"] = heatLayer;

        // Cập nhật Layer Control
        L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

        // TÍNH NĂNG MỚI (Search): Kích hoạt thanh tìm kiếm
        map.addLayer(searchLayer); // Thêm lớp vô hình vào map
        let searchControl = new L.Control.Search({
            layer: searchLayer,
            propertyName: 'title', // Tìm kiếm dựa trên trường Name
            marker: false,
            moveToLocation: function(latlng, title, map) {
                map.flyTo(latlng, 16); // Bay đến vị trí khi chọn
            }
        });
        searchControl.on('search:locationfound', function(e) {
            e.layer.openPopup(); // Tự động mở popup khi tìm thấy
        });
        map.addControl(searchControl);
    }
});

// TÍNH NĂNG MỚI (Geolocation): Nút định vị "Vị trí của tôi"
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
        </div>
    `;

    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
});
// ==========================================
// PHẦN 4: BẢNG CHÚ GIẢI CÓ THỂ THU GỌN
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
            <hr>
            <p><b>📍 Mục đích:</b> Bản đồ tổng hợp các điểm đến, bảo tàng, nhà hát và góc check-in tuyệt đẹp tại Mát-xcơ-va.</p>
            <p><b>💡 Hướng dẫn:</b></p>
            <ul style="padding-left: 20px; margin: 5px 0;">
                <li>Dùng menu góc trên bên phải để lọc địa điểm.</li>
                <li>Click trực tiếp lên bản đồ (vị trí trống) để đóng góp điểm đến mới.</li>
            </ul>
            <hr>
            <p><b>📞 Liên hệ:</b></p>
            <p style="margin: 5px 0;"><i class="fab fa-facebook" style="color: #1877F2;"></i> <a href="https://www.facebook.com/lopmaybay" target="_blank" style="text-decoration: none; color: #333;">Fanpage của chúng tôi</a></p>
            
            <a href="https://forms.gle/R4MfQn31MQNFXGH67" target="_blank" class="btn-tour" style="display: block; background: #e74c3c; color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 15px;">
                <i class="fas fa-paper-plane"></i> Đăng ký Tour Mát-xcơ-va
            </a>
        </div>
    `;

    // Thêm sự kiện Click để thu gọn / mở rộng
    setTimeout(() => {
        let toggleBtn = div.querySelector('#toggle-legend');
        toggleBtn.addEventListener('click', function() {
            div.classList.toggle('collapsed');
        });
    }, 0);

    return div;
};

legendControl.addTo(map);