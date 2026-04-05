// =========================================================
// ⚙️ TRUNG TÂM CẤU HÌNH HỆ THỐNG (CONFIG)
// =========================================================
const CONFIG = {
    // 1. LINK DỮ LIỆU ĐÁM MÂY (Google Sheet -> CSV)
    PUBLIC_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBd-vnyV-ulOXEflJ9IGWx2BINRoheQhhU6tvfd82W04V7xmk8-y8251mwsr0VyrMgefgCapMZ84DG/pub?gid=1052982976&single=true&output=csv",
    SHARE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/1I8uwsdajZMe7I1cM1DEXApEpR00GESB9Lt06i_9_qys/gviz/tq?tqx=out:csv&sheet=SHAREID",
    // 2. FORM 1: GỬI ĐÓNG GÓP PUBLIC (Chờ duyệt)
    FORM_PUBLIC: {
        URL: "https://docs.google.com/forms/d/e/1FAIpQLScOzdIzkPgeZT757_BwXn_3Wm10Tq8vPtP9MAOpRQXjxc9A6Q/formResponse",
        ENTRY_NAME: "entry.1753754339",   // Câu hỏi: Tên địa điểm
        ENTRY_COORDS: "entry.1072939078", // Câu hỏi: Tọa độ (Lat, Lng)
        ENTRY_CAT: "entry.127396233",    // Câu hỏi: Bộ sưu tập
        ENTRY_DESC: "entry.506978883",   // Câu hỏi: Mô tả / Review
        ENTRY_DATE: "entry.1832626317",   // Câu hỏi: Ngày diễn ra
        ENTRY_COLOR: "entry.284725110",  // Câu hỏi: Màu sắc
        ENTRY_ICON: "entry.1353456467",    // Câu hỏi: Biểu tượng
        ENTRY_VOTE: "entry.801492731" //VOTE-TIM"
    },

    // 3. FORM 2: HỆ THỐNG LƯU TRỮ MÃ CHIA SẺ (Chạy ngầm)
    FORM_SHARE: {
        URL: "https://docs.google.com/forms/d/e/1FAIpQLSdhhnCyOj1QHKTRWrgykQTTNerYyAmUX3c6_fc_UCHfvzHx1g/formResponse",
        ENTRY_SHARE_ID: "entry.1016520745", // Câu hỏi: Share ID (VD: TOUR-123)
        ENTRY_JSON: "entry.763611253"      // Câu hỏi: Chuỗi JSON Data
    },

    // 4- DANH SÁCH BỘ SƯU TẬP PHỔ BIẾN
    COMMON_CATEGORIES: [
        "Yêu thích",
        "Nhà hàng & Quán ăn",
        "Quán Cafe & Trà sữa",
        "Quán Bar & Pub",
        "Ẩm thực đường phố",
        "Công viên & Khu sinh thái",
        "Bảo tàng & Triển lãm",
        "Di tích lịch sử & Văn hóa",
        "Điểm Check-in sống ảo",
        "Đền, Chùa & Nhà thờ",
        "Trung tâm thương mại",
        "Chợ truyền thống / Chợ đêm",
        "Cửa hàng tiện lợi / Siêu thị",
        "Khách sạn & Nơi lưu trú",
        "Thể thao & Hoạt động ngoài trời",
        "Rạp chiếu phim & Nhà hát",
        "Sự kiện & Lễ hội",
        "Trạm tàu, xe & Sân bay"
    ]
};

// =========================================================

// Hàm tự động nhận dạng Link và xử lý xuống dòng
window.formatDescription = function(text) {
    if (!text) return '(Không có mô tả)';
    
    // 1. Dùng Regex tìm các đoạn bắt đầu bằng http:// hoặc https:// và bọc thẻ <a> lại
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formattedText = text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" style="color: #3498db; text-decoration: underline;" onclick="event.stopPropagation();">${url}</a>`;
    });

    // 2. Chuyển đổi các dấu Enter (xuống dòng) thành thẻ <br> trong HTML
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
};

// 1. Hàm hỗ trợ tải CSV (Dùng chung toàn hệ thống)
window.fetchCSV = function(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true, header: true,
            complete: function(results) { resolve(results.data); },
            error: function() { resolve([]); }
        });
    });
};

// 2. Hàm xử lý tải dữ liệu theo Share ID (Dùng chung cho cả URL và Nhập tay)
window.processShareId = async function(shareId) {
    if (!shareId) return;
    shareId = shareId.trim().toUpperCase();

    let shareRows = await fetchCSV(CONFIG.SHARE_SHEET_CSV);
    
    // Tìm dòng chứa ID (Dùng 'includes' để tránh lỗi khoảng trắng)
    let matchedRow = shareRows.find(row => Object.values(row).some(val => typeof val === 'string' && val.includes(shareId)));
    
    if (matchedRow) {
        let jsonStr = Object.values(matchedRow).find(val => typeof val === 'string' && val.startsWith('['));
        
        if (jsonStr) {
            try {
                let parsedCol = JSON.parse(jsonStr);
                let currentLocalData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
                let newCount = 0;

                parsedCol.forEach(item => {
                    item.id = `imported_${Math.random().toString(36).substr(2,9)}`;
                    item.collectionName = `${item.collectionName} (Từ bạn bè)`;
                    if (!currentLocalData.some(old => old.lat === item.lat && old.lng === item.lng && old.name === item.name)) {
                        currentLocalData.push(item);
                        newCount++;
                    }
                });

                if (newCount > 0) {
                    window.myCollectionsData = currentLocalData;
                    localStorage.setItem('moscowCollectionsData', JSON.stringify(currentLocalData));
                    if (typeof renderCustomSavedPoints === 'function') renderCustomSavedPoints();
                    alert(`🎉 TING TING! Đã tải thành công ${newCount} địa điểm từ mã ${shareId}!`);
                } else {
                    alert("📍 Các địa điểm trong mã này đã có sẵn trên bản đồ của bạn rồi!");
                }
            } catch(e) { console.error("Lỗi JSON", e); alert("❌ Lỗi dữ liệu bên trong mã này."); }
        } else {
            alert("❌ Mã hợp lệ nhưng không tìm thấy dữ liệu địa điểm.");
        }
    } else {
        alert(`❌ Không tìm thấy mã "${shareId}" trên hệ thống. Hãy chắc chắn mã đã được lưu lên đám mây!`);
    }
};

// 3. Hàm gọi hộp thoại Nhập tay (Gắn vào nút Nhập Mã)
window.askForShareId = function() {
    let userInput = prompt("Mời bạn nhập mã chia sẻ (Ví dụ: TOUR-ABC12):");
    if (userInput && userInput.trim() !== "") {
        processShareId(userInput);
    }
};

// 4. Logic Load lần đầu khi mở web
window.addEventListener('load', async function() {
    let currentLocalData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];

    // =======================================================
    currentLocalData = currentLocalData.filter(item => {
        // BỌC AN TOÀN: Chỉ kiểm tra startsWith khi điểm đó thực sự tồn tại ID
        if (item && item.id && typeof item.id === 'string') {
            return !item.id.startsWith('public_');
        }
        return true; // Giữ lại những điểm cá nhân cũ không có ID để không bị mất dữ liệu
    });

    // ==========================================
    // LUỒNG 1: TẢI ĐIỂM PUBLIC (CẦN ADMIN DUYỆT)
    // ==========================================
    // Thêm chuỗi thời gian để ÉP trình duyệt không dùng Cache cũ
    let noCacheUrl = CONFIG.PUBLIC_SHEET_CSV + "&t=" + new Date().getTime();
    
    let publicRows = await fetchCSV(noCacheUrl);
    
    publicRows.forEach(row => {
        if (row.Status === "Public") {
            let isVerified = (row.Verified === "TRUE" || row.Verified === "1");
            let badge = isVerified ? `<i class="fas fa-check-circle" style="color:#3498db; margin-left:5px;" title="Đã xác minh"></i>` : '';
            
            let lat = 0, lng = 0;
            if (row.Coords) {
                let parts = row.Coords.split(',');
                if (parts.length >= 2) {
                    lat = parseFloat(parts[0].trim());
                    lng = parseFloat(parts[1].trim());
                }
            }

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;
            // Xử lý chống lỗi định dạng số có dấu phẩy (VD: 3,00 -> 3)
            let hCount = parseInt((row.HeartCount || "0").toString().replace(',', '.')) || 0;

            // SỬA DÒNG NÀY: Tự động gắn 🌍 vào trước tên bộ sưu tập Public
            let pData = {
                id: `public_${lat}_${lng}`, 
                name: `${row.Name} ${badge}`, 
                desc: row.Desc,
                lat: lat, lng: lng, 
                collectionName: row.CollectionName ? `🌍 ${row.CollectionName}` : "🌍 Bản đồ Chung",
                color: row.Color || "#27ae60", icon: row.Icon || "fa-globe", date: row.Date || "",
                // heartCount: parseInt(row.Date) || 0
                heartCount: hCount
            };
            
            // Push dữ liệu mới nhất vào
            currentLocalData.push(pData);
        }
    });

    // Lưu lại LocalStorage (Lúc này Private được giữ nguyên, Public đã được Refresh)
    window.myCollectionsData = currentLocalData;
    localStorage.setItem('moscowCollectionsData', JSON.stringify(currentLocalData));
    
    if (typeof renderCustomSavedPoints === 'function') renderCustomSavedPoints();

    // KIỂM TRA NẾU CÓ URL CHỨA ID THÌ TỰ ĐỘNG TẢI
    const urlParams = new URLSearchParams(window.location.search);
    const incomingShareId = urlParams.get('id');
    if (incomingShareId) {
        window.history.replaceState({}, document.title, window.location.pathname);
        await processShareId(incomingShareId);
    }

    // ========================================================
    // LUỒNG 3: XỬ LÝ LINK CHIA SẺ NHANH (CÓ LAT, LNG, TITLE)
    // ========================================================
    const shareLat = urlParams.get('lat');
    const shareLng = urlParams.get('lng');
    const shareTitle = urlParams.get('title');

    if (shareLat && shareLng) {
        // 1. Dọn dẹp URL cho đẹp (ẩn các tham số đi)
        window.history.replaceState({}, document.title, window.location.pathname);

        let sLat = parseFloat(shareLat);
        let sLng = parseFloat(shareLng);
        let sTitle = shareTitle ? decodeURIComponent(shareTitle) : "Địa điểm được chia sẻ";

        if (!isNaN(sLat) && !isNaN(sLng)) {
            // 2. Delay nhẹ 500ms để đợi bản đồ tải xong Tile nền, sau đó bay (FlyTo) tới đó
            setTimeout(() => {
                map.flyTo([sLat, sLng], 16, { animate: true, duration: 1.5 });
                
                // 3. Đợi bay xong (khoảng 1.5s) thì mở Popup chào mừng
                setTimeout(() => {
                    let welcomePopup = `
                        <div style="text-align: center; padding: 5px;">
                            <h3 style="color: #e74c3c; margin: 0 0 5px 0;"><i class="fas fa-gift"></i> Xin chào!</h3>
                            <b style="color: #2c3e50; font-size: 14px;">${sTitle}</b>
                            <p style="font-size: 11px; color: #7f8c8d; margin: 8px 0;">Đây là địa điểm bạn bè vừa gửi cho bạn.</p>
                            <button onclick="showCustomSaveForm(${sLat}, ${sLng}, '${sTitle.replace(/'/g, "\\'")}')" 
                                    style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">
                                <i class="fas fa-plus"></i> Lưu vào máy
                            </button>
                        </div>
                    `;
                    L.popup()
                     .setLatLng([sLat, sLng])
                     .setContent(welcomePopup)
                     .openOn(map);
                }, 1600); // 1600ms = Đợi hàm flyTo 1.5s bay xong + dư 100ms
            }, 500);
        }
    }

});
// 1. KHỞI TẠO BẢN ĐỒ VỚI VỊ TRÍ MẶC ĐỊNH CỦA USER
// ==========================================
// Đọc vị trí người dùng đã lưu (nếu có)
let savedLocation = JSON.parse(localStorage.getItem('userDefaultLocation'));

// Nếu chưa có, dùng Moscow làm mặc định
let defaultLat = savedLocation ? savedLocation.lat : 55.751244;
let defaultLng = savedLocation ? savedLocation.lng : 37.618423;
let defaultZoom = savedLocation ? savedLocation.zoom : 13;

let map = L.map('map').setView([defaultLat, defaultLng], defaultZoom);

// ... (Giữ nguyên phần khởi tạo baseMaps và mainLayerControl bên dưới) ...
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
if (window.mainLayerControl) {
    window.mainLayerControl.remove(); 
}
window.mainLayerControl = L.control.layers(baseMaps, {}, { collapsed: true }).addTo(map);
window.customLayerGroups = {};
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
                        let routingLink = `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

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
        for (let cat in categoryLayers) {
            window.mainLayerControl.addOverlay(categoryLayers[cat], cat);
        }
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

// Lắng nghe sự kiện nếu tìm thấy vị trí thì vẽ một chấm xanh
map.on('locationfound', function(e) {
    L.circleMarker(e.latlng, { radius: 8, color: 'white', fillColor: '#4285F4', fillOpacity: 1 }).addTo(map).bindPopup("Bạn đang ở đây!").openPopup();
});
// map.on('locationerror', function(e) {
//     alert("Không thể xác định vị trí của bạn. Vui lòng cấp quyền vị trí cho trình duyệt.");
// });
map.on('locationerror', function(e) {
    alert("❌ Không thể định vị.\n\n1. Hãy đảm bảo bạn đã BẬT GPS trên điện thoại.\n2. Bấm vào biểu tượng 'Ổ khóa' (hoặc 'Aa') trên thanh địa chỉ trình duyệt -> Chọn 'Cài đặt trang web' -> Cho phép Vị trí.\n3. Web phải chạy ở dạng https://");
});


// ==========================================
// HỆ TRỤC BỘ SƯU TẬP ĐA TẦNG, CHIA SẺ & LƯU TRỮ
// ==========================================

let myCollectionsData = JSON.parse(localStorage.getItem('moscowCollectionsData')) || [];
let customLayerGroups = {}; // Object lưu trữ các layer bộ sưu tập cá nhân

// window.showCustomSaveForm = function(lat, lng, defaultName = "", defaultId = null, passedCategory = null) {
// Thay đổi dòng khai báo và 3 dòng lấy giá trị bên dưới nó thành như sau:
window.showCustomSaveForm = function(lat, lng, defaultName = "", defaultId = null, passedCategory = null, passedColor = null, passedIcon = null) {
    let markerId = defaultId || `custom_${lat.toFixed(6)}_${lng.toFixed(6)}`.replace(/\./g, '-');
    let existing = myCollectionsData.find(item => item.id === markerId) || {};
    
    // Ưu tiên màu/icon được truyền vào, nếu không có thì lấy của điểm cũ, nếu không có nữa thì lấy mặc định
    let currentColor = passedColor || existing.color || '#8e44ad';
    let currentIcon = passedIcon || existing.icon || 'fa-heart';
    let currentCat = passedCategory || existing.collectionName || 'Yêu thích';

    let gLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    let yLink = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;

    // 2. Xử lý logic Dropdown (Danh sách bộ sưu tập)
    let categoryOptions = '';
    let isCommonCat = false;
    
    // Đọc danh sách từ CONFIG
    if (typeof CONFIG !== 'undefined' && CONFIG.COMMON_CATEGORIES) {
        categoryOptions = CONFIG.COMMON_CATEGORIES.map(cat => {
            let selected = (cat === currentCat) ? 'selected' : '';
            if (cat === currentCat) isCommonCat = true;
            return `<option value="${cat}" ${selected}>${cat}</option>`;
        }).join('');
    }
    
    // Nếu bộ sưu tập cũ không nằm trong danh sách chung, tự động chọn "OTHER"
    let selectOther = !isCommonCat ? 'selected' : '';
    let otherInputDisplay = isCommonCat ? 'none' : 'block';

    // 3. Xây dựng giao diện HTML
    let popupContent = `
        <div class="popup-custom" style="min-width: 250px;">
            <h4 style="margin: 0 0 10px 0; color: #9b59b6;"><i class="fas fa-paint-brush"></i> Tùy chỉnh địa điểm</h4>
            
            <label style="font-size: 11px; color:#555; display:block; margin-bottom:3px;">Tên địa điểm / Sự kiện:</label>
            <input type="text" id="cName_${markerId}" value="${defaultName || existing.name || ''}" placeholder="Tên địa điểm..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
            
            <label style="font-size: 11px; color:#555; display:block; margin-bottom:3px;">Bộ sưu tập:</label>
            <select id="cCatSelect_${markerId}" onchange="toggleOtherCategory('${markerId}')" style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
                ${categoryOptions}
                <option value="OTHER" ${selectOther}>-- Nhập mục khác... --</option>
            </select>
            <input type="text" id="cCatOther_${markerId}" value="${!isCommonCat ? currentCat : ''}" placeholder="Tên bộ sưu tập mới..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; display:${otherInputDisplay};">

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
         
            <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Ngày diễn ra (nếu có):</label>
            <input type="date" id="cDate_${markerId}" value="${existing.date || ''}" style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">

            <label style="font-size: 11px; display:block; margin-bottom:3px; color:#555;">Mô tả / Đánh giá:</label>
            <textarea id="cDesc_${markerId}" placeholder="Ghi chú cá nhân..." style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc; height:50px; box-sizing:border-box;">${existing.desc || ''}</textarea>
            
            <div class="popup-buttons" style="margin-bottom:10px; padding-top:0; border:none; display:flex; gap:5px;">
                <a href="${yLink}" target="_blank" style="background:#ff0000; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-yandex"></i> Yandex</a>
                <a href="${gLink}" target="_blank" style="background:#4285F4; flex:1; padding:8px; color:white; text-align:center; text-decoration:none; border-radius:4px;"><i class="fab fa-google"></i> Google</a>
            </div>

            <button onclick="savePointDataWithLogic('${markerId}', ${lat.toFixed(6)}, ${lng.toFixed(6)}, false)" style="width:100%; background:#9b59b6; border:none; padding:10px; border-radius:4px; color:white; font-weight:bold; cursor:pointer; margin-bottom: 5px;">
                <i class="fas fa-lock"></i> Chỉ lưu vào máy của tôi
            </button>

            <button onclick="savePointDataWithLogic('${markerId}', ${lat.toFixed(6)}, ${lng.toFixed(6)}, true)" style="width: 100%; background: #27ae60; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer; border: 2px solid #2ecc71;">
                <i class="fas fa-globe-asia"></i> Lưu máy & Đóng góp Public
            </button>
        </div>
    `;
    L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);
};
window.toggleOtherCategory = function(id) {
    let select = document.getElementById(`cCatSelect_${id}`);
    let otherInput = document.getElementById(`cCatOther_${id}`);
    otherInput.style.display = (select.value === "OTHER") ? "block" : "none";
};
window.savePointDataWithLogic = function(markerId, lat, lng, isPublicShare = false) {
    // Đọc tên
    let nameVal = document.getElementById(`cName_${markerId}`).value.trim();
    if (!nameVal) return alert("Vui lòng nhập tên địa điểm hoặc sự kiện!");

    // Xử lý đọc Bộ sưu tập (Category)
    let selectVal = document.getElementById(`cCatSelect_${markerId}`).value;
    let otherVal = document.getElementById(`cCatOther_${markerId}`).value.trim();
    let finalCategory = (selectVal === "OTHER") ? otherVal : selectVal;
    
    if (selectVal === "OTHER" && !finalCategory) {
        return alert("Vui lòng nhập tên bộ sưu tập mới!");
    }
    if (!finalCategory) finalCategory = 'Yêu thích'; // Giá trị dự phòng

    // Đọc các trường còn lại
    let colorVal = document.getElementById(`cColor_${markerId}`).value;
    let iconVal = document.getElementById(`cIcon_${markerId}`).value;
    let descVal = document.getElementById(`cDesc_${markerId}`).value.trim();
    let dateVal = document.getElementById(`cDate_${markerId}`) ? document.getElementById(`cDate_${markerId}`).value : '';
    
    // TẠO ID MỚI ĐỂ LƯU KHÔNG GIỚI HẠN SỰ KIỆN TẠI 1 ĐỊA ĐIỂM
    let uniqueEventId = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    let newData = { 
        id: uniqueEventId, name: nameVal, desc: descVal, lat: lat, lng: lng, 
        collectionName: finalCategory, color: colorVal, icon: iconVal, date: dateVal 
    };
    
    // Lưu vào máy (LocalStorage)
    myCollectionsData.push(newData);
    localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
    
    // Gửi ngầm lên Google Form nếu chọn Đóng góp Public
    if (isPublicShare && typeof CONFIG !== 'undefined') {
        let formData = new URLSearchParams();
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_NAME, nameVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_COORDS, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        // formData.append(CONFIG.FORM_PUBLIC.ENTRY_CAT, finalCategory);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_DESC, descVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_DATE, dateVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_COLOR, colorVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_ICON, iconVal);
        // XỬ LÝ LÔ-GIC "MỤC KHÁC" CỦA GOOGLE FORM
        // ==========================================
        if (selectVal === "OTHER") {
            // Bắn tín hiệu 1: Chọn nút "Khác"
            formData.append(CONFIG.FORM_PUBLIC.ENTRY_CAT, "__other_option__");
            // Bắn tín hiệu 2: Gửi nội dung ô text
            formData.append(`${CONFIG.FORM_PUBLIC.ENTRY_CAT}.other_option_response`, otherVal);
        } else {
            // Nếu chọn mục có sẵn thì gửi bình thường
            formData.append(CONFIG.FORM_PUBLIC.ENTRY_CAT, selectVal);
        }

        fetch(CONFIG.FORM_PUBLIC.URL, { method: "POST", mode: "no-cors", body: formData })
            .then(() => alert("Cảm ơn! Đã lưu cá nhân VÀ gửi đóng góp lên Bản đồ chung."))
            .catch(e => console.error("Lỗi gửi Public:", e));
    }

    // Vẽ lại bản đồ và đóng popup
    renderCustomSavedPoints();
    map.closePopup();
};


window.savePointData = function(markerId, lat, lng, isPublicShare = false) {
    let nameVal = document.getElementById(`cName_${markerId}`).value.trim();
    let catVal = document.getElementById(`cCat_${markerId}`).value.trim() || 'Yêu thích';
    let colorVal = document.getElementById(`cColor_${markerId}`).value;
    let iconVal = document.getElementById(`cIcon_${markerId}`).value;
    let descVal = document.getElementById(`cDesc_${markerId}`).value.trim();
    let dateVal = document.getElementById(`cDate_${markerId}`) ? document.getElementById(`cDate_${markerId}`).value : '';
    
    if (!nameVal) return alert("Vui lòng nhập tên địa điểm!");

    // LUÔN TẠO ID MỚI ĐỂ KHÔNG GIỚI HẠN SỐ SỰ KIỆN TẠI 1 CHỖ
    let uniqueEventId = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    let newData = { 
        id: uniqueEventId, name: nameVal, desc: descVal, lat: lat, lng: lng, 
        collectionName: catVal, color: colorVal, icon: iconVal, date: dateVal 
    };
    
    myCollectionsData.push(newData);
    localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
    
    // Bắn ngầm lên Google Form (Sử dụng CONFIG)
    if (isPublicShare) {
        let formData = new URLSearchParams();
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_NAME, nameVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_COORDS, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_CAT, catVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_DESC, descVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_DATE, dateVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_COLOR, colorVal);
        formData.append(CONFIG.FORM_PUBLIC.ENTRY_ICON, iconVal);

        fetch(CONFIG.FORM_PUBLIC.URL, { method: "POST", mode: "no-cors", body: formData });
    }

    renderCustomSavedPoints();
    map.closePopup();
};


window.removeCustomPoint = function(markerId) {
    if (confirm("Bạn có chắc muốn xóa điểm này khỏi bộ sưu tập?")) {
        myCollectionsData = myCollectionsData.filter(item => item.id !== markerId);
        localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));
        renderCustomSavedPoints();
        updateCollectionCount();
    }
};

window.renderCustomSavedPoints = function() {
    // 1. Dọn dẹp layer và bảng điều khiển cũ
    for (let cat in customLayerGroups) {
        map.removeLayer(customLayerGroups[cat]);
        if (window.mainLayerControl) window.mainLayerControl.removeLayer(customLayerGroups[cat]);
    }
    customLayerGroups = {};

    // 2. GOM NHÓM DỮ LIỆU THEO TỌA ĐỘ
    let groupedLocations = {};
    myCollectionsData.forEach(item => {
        // === BỘ LỌC RÁC: CHỐT CHẶN BẢO VỆ TỌA ĐỘ ===
        // Nếu dữ liệu bị hỏng (không có lat/lng hoặc bị NaN), lập tức bỏ qua để cứu bản đồ!
        if (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null || isNaN(item.lat) || isNaN(item.lng)) {
            return; 
        }

        if (window.currentFilterDates && window.currentFilterDates.length > 0) {
            if (!item.date || !window.currentFilterDates.includes(item.date)) return;
        }

        // Ép kiểu dữ liệu về số thực (Float) để Leaflet không bao giờ bị lỗi
        let pLat = parseFloat(item.lat);
        let pLng = parseFloat(item.lng);
        let key = `${pLat.toFixed(6)}_${pLng.toFixed(6)}`;
        
        if (!groupedLocations[key]) {
            groupedLocations[key] = {
                lat: pLat, lng: pLng, 
                mainInfo: item, 
                allEvents: []
            };
        }
        groupedLocations[key].allEvents.push(item);
    });

    // 3. VẼ MARKER CHO TỪNG NHÓM
    Object.values(groupedLocations).forEach(group => {
        let cName = group.mainInfo.collectionName || 'Yêu thích';
        
        if (!customLayerGroups[cName]) {
            customLayerGroups[cName] = L.markerClusterGroup({ maxClusterRadius: 30 });
            map.addLayer(customLayerGroups[cName]);
        }

// Bọc an toàn tên địa điểm và tên Layer (Đã fix lỗi dấu nháy kép)
        let safeName = group.mainInfo.name ? group.mainInfo.name : "Địa điểm chưa có tên";
        let plainName = safeName.replace(/<[^>]*>?/gm, '').trim();
        let escapedName = plainName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let escapedCat = cName.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        // Tạo link Google & Yandex
        let gLink = `https://www.google.com/maps/search/?api=1&query=${group.lat},${group.lng}`;
        let yLink = `https://yandex.ru/maps/?pt=${group.lng},${group.lat}&z=16&l=map`;

        // CHUYỂN MÀU VÀ ICON LÊN TRÊN ĐỂ TRUYỀN VÀO NÚT
        let pColor = group.mainInfo.color || '#8e44ad';
        let pIcon = group.mainInfo.icon || 'fa-heart';

        // Dò xem đang được Yêu thích chưa
        let isFav = myCollectionsData.some(item => item.lat === group.lat && item.lng === group.lng && item.collectionName === 'Yêu thích');
        let favIconColor = isFav ? '#e74c3c' : '#ccc';
        let favTooltip = isFav ? 'Bỏ Yêu thích' : 'Thêm vào Yêu thích';
 // =====================================
        // TÍNH NĂNG MỚI: TẠO HUY HIỆU TỔNG SỐ TIM
        // =====================================
        // Quét toàn bộ các dòng (sự kiện) của địa điểm này và lấy số tim lớn nhất
        let globalHearts = Math.max(0, ...group.allEvents.map(ev => ev.heartCount || 0));
        
        let globalHeartBadge = globalHearts > 0 ? `<span style="color:#e74c3c; font-size:12px; margin-left:8px; background:#fff0f0; padding:2px 6px; border-radius:10px; border: 1px solid #ffcccc;" title="${globalHearts} lượt yêu thích toàn cầu"><i class="fas fa-heart"></i> ${globalHearts}</span>` : '';
        // Xử lý danh sách Sự kiện (Gắn nhãn Public/Cá nhân)
        let eventsListHTML = group.allEvents.map(ev => {
            let isPublic = ev.id && ev.id.startsWith('public_');
            let badge = isPublic ? `<span style="background:#f1c40f; color:#000; padding:2px 4px; border-radius:3px; font-size:8px; margin-left:5px;">🌍 Public</span>` : `<span style="background:#9b59b6; color:#fff; padding:2px 4px; border-radius:3px; font-size:8px; margin-left:5px;">🔒 Cá nhân</span>`;
            
            return `
            <div style="border-bottom: 1px dashed #eee; padding: 5px 0; font-size: 11px;">
                <b style="color: #e67e22;">${ev.date ? '📅 ' + ev.date : '📌 Thông tin:'}</b> ${badge}<br>
                <span style="display:block; margin-top:3px;">${typeof formatDescription === 'function' ? formatDescription(ev.desc) : (ev.desc || '')}</span>
                <i class="fas fa-trash-alt" onclick="event.stopPropagation(); removeCustomPoint('${ev.id}')" style="float:right; cursor:pointer; color:#ccc; margin-left:10px;" title="Xóa"></i>
            </div>`;
        }).join('');

        let singleShareUrl = `${window.location.origin}${window.location.pathname}?lat=${group.lat}&lng=${group.lng}&title=${encodeURIComponent(plainName)}`;

        // TẠO POPUP CONTENT CHUẨN (ĐÃ FIX LỖI THIẾU CHỮ 'event' Ở NÚT TIM)
        let popupContent = `
            <div class="popup-custom" style="min-width:220px; max-height:300px; overflow-y:auto; padding-right:5px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="margin:0; color:#8e44ad; display:flex; align-items:center;">${safeName} ${globalHeartBadge}</h3>
                    
                    <i class="fas fa-heart" onclick="toggleQuickFavorite(event, ${group.lat}, ${group.lng}, '${escapedName}')" style="color:${favIconColor}; font-size:18px; cursor:pointer; transition:0.3s;" title="${favTooltip}"></i>
                
                </div>
                
                <div style="display:flex; gap:10px; margin-top:5px; font-size:11px;">
                    <span style="color:#7f8c8d;"><i class="fas fa-layer-group"></i> ${cName}</span>
                    <a href="javascript:void(0)" onclick="navigator.clipboard.writeText('${singleShareUrl}').then(()=>alert('Đã copy link địa điểm!'))" style="color:#3498db; text-decoration:none;">
                        <i class="fas fa-share-alt"></i> Chia sẻ
                    </a>
                </div>

                <div style="margin-top:5px; border-top: 1px solid #f1f1f1; padding-top:10px;">
                    ${eventsListHTML}
                </div>
                
                <div class="popup-buttons" style="margin-top:10px; border:none; display:flex; gap:5px;">
                    <a href="${yLink}" target="_blank" style="background:#ff0000; flex:1; padding:6px; color:white; text-align:center; text-decoration:none; border-radius:4px; font-size:11px;"><i class="fab fa-yandex"></i> Yandex</a>
                    <a href="${gLink}" target="_blank" style="background:#4285F4; flex:1; padding:6px; color:white; text-align:center; text-decoration:none; border-radius:4px; font-size:11px;"><i class="fab fa-google"></i> Google</a>
                </div>

                <div style="margin-top:5px; display:flex; gap:5px;">
                    <button onclick="showCustomSaveForm(${group.lat}, ${group.lng}, '${escapedName}', null, '${escapedCat}', '${pColor}', '${pIcon}')" 
                            style="flex:1; background:#27ae60; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">
                        <i class="fas fa-plus"></i> Thêm sự kiện
                    </button>
                </div>
            </div>
        `;
        // 1. Nhận diện nguồn gốc địa điểm thông qua ID
        let isPublic = group.mainInfo.id && group.mainInfo.id.startsWith('public_');
        let isImported = group.mainInfo.id && group.mainInfo.id.startsWith('imported_');

        // 2. Tùy chỉnh Hình dáng và Màu viền
        let borderRadius = isPublic ? '8px' : '50%'; // Public hình vuông bo góc, Cá nhân hình tròn
        let borderColor = isPublic ? '#f1c40f' : 'white'; // Public viền vàng, Cá nhân viền trắng
        
        // 3. Tạo Huy hiệu (Mini Badge) đính kèm ở góc phải bên dưới
        let miniBadge = '';
        if (isPublic) {
            miniBadge = `<div style="position:absolute; bottom:-4px; right:-4px; background:#f1c40f; color:#333; width:14px; height:14px; border-radius:50%; font-size:9px; display:flex; align-items:center; justify-content:center; border:1px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);" title="Địa điểm Công cộng"><i class="fas fa-globe-americas"></i></div>`;
        } else if (isImported) {
            miniBadge = `<div style="position:absolute; bottom:-4px; right:-4px; background:#3498db; color:white; width:14px; height:14px; border-radius:50%; font-size:8px; display:flex; align-items:center; justify-content:center; border:1px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);" title="Được bạn bè chia sẻ"><i class="fas fa-user-friends"></i></div>`;
        }

// 4. Lắp ráp Icon (XÓA VIỀN VUÔNG)
        let customIcon = L.divIcon({
            className: '', // QUAN TRỌNG: Để trống chuỗi này để Leaflet KHÔNG tự thêm CSS viền vuông mặc định!
            html: `
                <div style="position:relative; width:28px; height:28px; background:transparent; border:none;">
                    <div style="background-color:${pColor}; width:100%; height:100%; border-radius:${borderRadius}; display:flex; align-items:center; justify-content:center; color:white; border:2px solid ${borderColor}; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: 0.3s;">
                        <i class="fas ${pIcon}"></i>
                    </div>
                    ${miniBadge}
                </div>
            `,
            iconSize: [28, 28]
        });

        // 5. Gắn nội dung sự kiện nếu được bật
        let showDesc = document.getElementById('show-event-desc-toggle')?.checked;
        let tooltipText = `${safeName} <span style="font-size:10px; color:#888;">(${group.allEvents.length})</span>`;
        
        if (showDesc && group.allEvents.length > 0) {
            let latestDesc = group.allEvents[0].desc || "";
            let shortDesc = latestDesc.length > 20 ? latestDesc.substring(0, 20) + "..." : latestDesc;
            tooltipText = `<b style="color:#d35400;">${shortDesc}</b><br>${tooltipText}`;
        }

        // 6. Vẽ Marker (FIX LỖI NÚT "HIỂN THỊ TẤT CẢ TÊN")
        L.marker([group.lat, group.lng], {icon: customIcon})
         .bindTooltip(tooltipText, {
             permanent: true, // QUAN TRỌNG: Phải LÀ TRUE để CSS toggle ẩn/hiện của bạn có thể hoạt động!
             direction: 'bottom', 
             className: 'custom-label'
         })
         .bindPopup(popupContent)
         .addTo(customLayerGroups[cName]);

    });

    // 4. BÂY GIỜ MỚI ĐĂNG KÝ VÀO BẢNG ĐIỀU KHIỂN
    for (let cName in customLayerGroups) {
        let count = customLayerGroups[cName].getLayers().length;
        
        let prefixIcon = '💖'; // Mặc định là Bộ sưu tập Cá nhân
        let displayName = cName;

        // Nhận diện Layer Public (Có chứa hình 🌍)
        if (cName.includes('🌍')) {
            prefixIcon = '🌍';
            // Xóa chữ 🌍 trong cName để tránh bị lặp (Ví dụ: 🌍 🌍 Bản đồ chung)
            displayName = cName.replace('🌍', '').trim(); 
        } 
        // Nhận diện Layer được Share từ bạn bè
        else if (cName.includes('(Từ bạn bè)')) {
            prefixIcon = '🤝'; // Đổi thành icon Bắt tay hoặc 👥 Hai người
            // Rút gọn tên cho đẹp, không cần chữ "Từ bạn bè" lặp lại trên bảng điều khiển
            displayName = cName.replace('(Từ bạn bè)', '').trim(); 
        }

        // Tạo nhãn HTML với Icon đã được phân loại
        let labelHtml = `${prefixIcon} <span style="font-weight: 500;">${displayName}</span> <span style="font-size:10px; color:#888; font-weight:normal; margin-left:3px;">(${count} điểm)</span>`;
        
        if (window.mainLayerControl) {
            window.mainLayerControl.addOverlay(customLayerGroups[cName], labelHtml);
        }
    }

    setTimeout(injectLayerToggleAll, 100);

    if (typeof updateEventSummary === 'function') updateEventSummary();
};
// 5. CÁC SỰ KIỆN CLICK VÀ SEARCH
map.on('click', function(e) { showCustomSaveForm(e.latlng.lat, e.latlng.lng); });


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
           <button onclick="showMyFavoritesList()" style="width:100%; background:#e74c3c; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold; margin-bottom: 8px;">
                <i class="fas fa-list-ul"></i> Xem danh sách đã Thả Tim
            </button>
            <div style="display: flex; gap: 5px; margin-top: 5px;">

                <button onclick="shareCollection()" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-copy"></i> Copy Mã Share</button>
                <button onclick="importCollection()" style="flex:1; background:#8e44ad; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-download"></i> Nhập Mã</button>
            </div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button onclick="openShareManager()" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;">
                <i class="fas fa-share-alt"></i> Quản lý Chia sẻ & QR
                </button>
                <button onclick="askForShareId()" style="flex:1; background:#8e44ad; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size: 11px; font-weight: bold;"><i class="fas fa-download"></i> Nhập ID</button>
           
            </div>
            <a href="https://forms.gle/R4MfQn31MQNFXGH67" target="_blank" class="btn-tour" style="display: block; background: #e74c3c; color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 15px;">
                <i class="fas fa-paper-plane"></i> Đăng ký Tour
            </a>
            <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="show-labels-checkbox" checked onchange="toggleAllLabels(this.checked)"> 
                    <label for="show-labels-checkbox">Hiển thị tất cả tên địa điểm</label>
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
            <label style="font-size:11px; color:#666; display:flex; align-items:center; gap:5px; margin-top:5px;">
    <input type="checkbox" id="show-event-desc-toggle" onchange="renderCustomSavedPoints()"> Hiện mô tả sự kiện
</label>
            
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

    // === TỰ ĐỘNG ZOOM VỪA VẶN CÁC ĐIỂM ĐÃ LỌC ===
    if (window.currentFilterDates.length > 0) {
        let bounds = L.latLngBounds();
        let hasPoints = false;
        
        for(let cat in customLayerGroups) {
            customLayerGroups[cat].eachLayer(function(layer) {
                // Gom tọa độ của tất cả các marker đang hiển thị
                if (layer.getLatLng) {
                    bounds.extend(layer.getLatLng());
                    hasPoints = true;
                }
            });
        }
        
        if (hasPoints) {
            // Zoom mượt mà đến khu vực chứa điểm, cách lề 50px
            map.flyToBounds(bounds, {padding: [50, 50], maxZoom: 15, duration: 1});
        }
    }
};

window.updateEventSummary = function() {
    let summaryDiv = document.getElementById('event-summary-list');
    if (!summaryDiv) return;

    let counts = {};
    myCollectionsData.forEach(item => {
        if (item.date) counts[item.date] = (counts[item.date] || 0) + 1;
    });

    let dates = Object.keys(counts).sort((a, b) => a.localeCompare(b)); // Sắp xếp từ sớm đến muộn
    if (dates.length === 0) {
        summaryDiv.innerHTML = '<span style="color:#999; font-style:italic;">Chưa có sự kiện nào được đặt ngày.</span>';
        return;
    }

    // Lấy ngày hôm nay (YYYY-MM-DD) để so sánh
    let today = new Date().toISOString().split('T')[0];
    
    let pastDates = dates.filter(d => d < today);
    let futureDates = dates.filter(d => d >= today);

    // Hàm hỗ trợ tạo nút HTML
    const createDateHTML = (dList) => dList.map(d => {
        let isSelected = window.currentFilterDates.includes(d);
        let style = isSelected ? 'background:#f4e8fa; color:#8e44ad; font-weight:bold; border-left: 3px solid #8e44ad;' : 'color:#555; background: #f9f9f9; border-left: 3px solid transparent;';
        let parts = d.split('-');
        let displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
        return `
            <div onclick="event.stopPropagation(); applyDateFilter('${d}')" style="padding:4px 6px; border-radius:3px; margin-bottom:4px; cursor:pointer; transition: 0.2s; ${style}">
                📅 ${displayDate}: <span style="float:right; background:#e74c3c; color:white; padding:1px 5px; border-radius:10px; font-size:9px;">${counts[d]}</span>
            </div>
        `;
    }).join('');

    // Hiển thị Tương lai lên trên, Quá khứ ở dưới
    let finalHTML = '';
    if (futureDates.length > 0) {
        finalHTML += `<div style="font-size:10px; color:#27ae60; font-weight:bold; margin:5px 0;">🔴 SẮP TỚI:</div>` + createDateHTML(futureDates);
    }
    if (pastDates.length > 0) {
        finalHTML += `<div style="font-size:10px; color:#95a5a6; font-weight:bold; margin:10px 0 5px 0; border-top:1px dashed #ddd; padding-top:5px;">⚪ ĐÃ QUA:</div>` + createDateHTML(pastDates);
    }
    summaryDiv.innerHTML = finalHTML;
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
// 1. HÀM MỞ TRÌNH QUẢN LÝ CHIA SẺ (Đã nâng cấp Chọn tất cả)
window.openShareManager = function() {
    let categories = [...new Set(myCollectionsData.map(item => item.collectionName || 'Yêu thích'))];
    if (categories.length === 0) return alert("Bạn chưa có địa điểm nào để chia sẻ!");

    // Nút Checkbox "Chọn tất cả" trên cùng
    let selectAllHTML = `
        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #eee; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="chk_all_share" checked onchange="toggleAllShare(this.checked)" style="width: 18px; height: 18px; cursor:pointer;">
            <label for="chk_all_share" style="cursor:pointer; font-size: 14px; font-weight: bold; color: #e74c3c;">Chọn tất cả</label>
        </div>
    `;

    // Danh sách các bộ sưu tập (Thêm onchange="checkShareAllStatus()")
    let checkboxHTML = categories.map(cat => `
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="share-cat-check" value="${cat}" id="chk_${cat}" checked style="width: 18px; height: 18px; cursor:pointer;" onchange="checkShareAllStatus()">
            <label for="chk_${cat}" style="cursor:pointer; font-size: 14px;">${cat}</label>
        </div>
    `).join('');

    let managerHTML = `
        <div id="share-modal" style="text-align: left; padding: 10px;">
            <h4 style="margin: 0 0 15px 0; color: #3498db;"><i class="fas fa-tasks"></i> Chọn Bộ sưu tập muốn chia sẻ</h4>
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                ${selectAllHTML}
                ${checkboxHTML}
            </div>
            <button onclick="executeShareAction()" style="width: 100%; background: #3498db; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">
                <i class="fas fa-magic"></i> Tạo Mã & QR Code
            </button>
        </div>
    `;

    L.popup().setLatLng(map.getCenter()).setContent(managerHTML).openOn(map);
};

// 1.1 Hàm Hỗ trợ: Khi bấm "Chọn tất cả" -> Tick/Bỏ tick tất cả mục con
window.toggleAllShare = function(isChecked) {
    let checkboxes = document.querySelectorAll('.share-cat-check');
    checkboxes.forEach(chk => chk.checked = isChecked);
};

// 1.2 Hàm Hỗ trợ: Khi bỏ tick 1 mục con -> Tự động bỏ tick "Chọn tất cả"
window.checkShareAllStatus = function() {
    let allCheckboxes = document.querySelectorAll('.share-cat-check');
    let checkedCheckboxes = document.querySelectorAll('.share-cat-check:checked');
    let masterCheckbox = document.getElementById('chk_all_share');
    if (masterCheckbox) {
        masterCheckbox.checked = (allCheckboxes.length === checkedCheckboxes.length);
    }
};

window.executeShareAction = async function() {
    let selectedCats = Array.from(document.querySelectorAll('.share-cat-check:checked')).map(el => el.value);
    if (selectedCats.length === 0) return alert("Vui lòng chọn ít nhất một bộ sưu tập!");

    // 1. Lọc dữ liệu cần chia sẻ
    let filteredData = myCollectionsData.filter(item => selectedCats.includes(item.collectionName || 'Yêu thích'));
    
    // 2. Tạo một ID ngẫu nhiên, duy nhất cho lượt chia sẻ này
    let shareId = 'TOUR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    let jsonDataStr = JSON.stringify(filteredData);

    // Sử dụng CONFIG để tạo Data gửi đi
    let formData = new URLSearchParams();
    formData.append(CONFIG.FORM_SHARE.ENTRY_SHARE_ID, shareId);
    formData.append(CONFIG.FORM_SHARE.ENTRY_JSON, jsonDataStr);

    try {
        fetch(CONFIG.FORM_SHARE.URL, { method: "POST", mode: "no-cors", body: formData });
    } catch(e) { console.log("Lỗi mạng", e); }

    // 4. Tạo link rút gọn chứa ID
    let shareUrl = `${window.location.origin}${window.location.pathname}?id=${shareId}`;
    
    // Tự động copy và hiển thị QR Code ... (Giữ nguyên phần vẽ QRious của bạn)
    navigator.clipboard.writeText(shareUrl).catch(()=>console.log("Copy tay"));
    
    let resultHTML = `
        <div style="text-align: center; padding: 10px;">
            <p style="color: #27ae60; font-weight: bold;"><i class="fas fa-check-circle"></i> ĐÃ TẠO MÃ CLOUD & COPY LINK!</p>
            <p style="font-size:12px; color:#555;">ID của bạn: <b>${shareId}</b></p>
            <input type="text" value="${shareUrl}" onclick="this.select()" readonly style="width:100%; padding:5px; text-align:center; border:1px dashed #ccc; font-size:11px;">
            <canvas id="qr-canvas" style="margin: 5px 0; border: 5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);"></canvas>
            <p style="font-size:10px; color:#888;">(Link rút gọn, mã QR thưa, tải siêu nhanh)</p>
        </div>
    `;
    L.popup().setLatLng(map.getCenter()).setContent(resultHTML).openOn(map);

    setTimeout(() => {
        new QRious({ element: document.getElementById('qr-canvas'), value: shareUrl, size: 200, level: 'L' });
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
// Đảm bảo lúc mới vào web, các nhãn tên được ẩn đi gọn gàng
document.getElementById('map').classList.add('hide-all-labels');
// Gọi hàm vẽ ngay khi trang web tải xong
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        renderCustomSavedPoints();
    }, 500); // Delay nhẹ để đảm bảo Map và Control đã render xong
});

// Hàm xử lý khi tick/bỏ tick ô "Bật/Tắt tất cả"
window.toggleAllLayers = function(isTurnOn) {
    // Xử lý các Bộ sưu tập cá nhân / Public / Share
    if (typeof customLayerGroups !== 'undefined') {
        for (let cat in customLayerGroups) {
            if (isTurnOn) {
                map.addLayer(customLayerGroups[cat]);
            } else {
                map.removeLayer(customLayerGroups[cat]);
            }
        }
    }
    
    // Xử lý các Layer từ Google Sheets (nếu bạn có dùng layerGroups riêng)
    if (typeof layerGroups !== 'undefined') {
        for (let cat in layerGroups) {
            if (isTurnOn) {
                map.addLayer(layerGroups[cat]);
            } else {
                map.removeLayer(layerGroups[cat]);
            }
        }
    }
};
// ==========================================
// ĐIỀU KHIỂN VỊ TRÍ MẶC ĐỊNH (HOME & SAVE)
// ==========================================
let homeControl = L.control({position: 'topleft'});
homeControl.onAdd = function() {
    let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.style.display = 'flex'; // Xếp ngang 2 nút
    L.DomEvent.disableClickPropagation(div);
    
    div.innerHTML = `
        <a href="#" title="Bay về Khu vực mặc định" onclick="event.preventDefault(); goToDefaultLocation();" style="width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#2c3e50; text-decoration:none; border-right:1px solid #ccc;">
            <i class="fas fa-home"></i>
        </a>
        <a href="#" title="Lưu khu vực này làm mặc định" onclick="event.preventDefault(); saveDefaultLocation();" style="width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#e74c3c; text-decoration:none;">
            <i class="fas fa-save"></i>
        </a>
    `;
    return div;
};
homeControl.addTo(map);

window.goToDefaultLocation = function() {
    let savedLocation = JSON.parse(localStorage.getItem('userDefaultLocation'));
    if (savedLocation) {
        map.flyTo([savedLocation.lat, savedLocation.lng], savedLocation.zoom, {animate: true, duration: 1.5});
    } else {
        map.flyTo([55.751244, 37.618423], 13); // Mặc định Moscow nếu chưa lưu
    }
};

window.saveDefaultLocation = function() {
    let confirmSave = confirm("Ghi nhớ góc nhìn bản đồ hiện tại làm Mặc định cho những lần mở web sau?");
    if (confirmSave) {
        let loc = { lat: map.getCenter().lat, lng: map.getCenter().lng, zoom: map.getZoom() };
        localStorage.setItem('userDefaultLocation', JSON.stringify(loc));
        alert("✅ Đã lưu khu vực mặc định!");
    }
};
// ==========================================
// HỆ THỐNG TÌM KIẾM THÔNG MINH (LOCAL + OSM)
// ==========================================

// 1. Tạo Giao diện Thanh tìm kiếm trên bản đồ
let searchControl = L.control({position: 'topleft'});
searchControl.onAdd = function() {
    let div = L.DomUtil.create('div', 'search-container-master');
    L.DomEvent.disableClickPropagation(div); // CHẶN HOÀN TOÀN CLICK XUYÊN THẤU XUỐNG BẢN ĐỒ
    L.DomEvent.disableScrollPropagation(div);
    
    div.innerHTML = `
        <div id="smart-search-box" class="custom-search-wrapper">
            <i class="fas fa-search custom-search-icon" onclick="toggleSearchBar()"></i>
            <input type="text" id="smart-search-input" class="custom-search-input" placeholder="Tìm kiếm & Enter..." autocomplete="off">
        </div>
        <div id="search-results" class="search-suggestions"></div>
    `;
    return div;
};
searchControl.addTo(map);

// Hàm mở rộng thanh tìm kiếm và hiển thị lịch sử
window.toggleSearchBar = function() {
    let box = document.getElementById('smart-search-box');
    let input = document.getElementById('smart-search-input');
    box.classList.toggle('active');
    if (box.classList.contains('active')) {
        input.focus();
        showSearchHistory(); // Hiện lịch sử khi vừa mở
    } else {
        document.getElementById('search-results').style.display = 'none';
    }
};

// 2. Thuật toán Debounce & Lưu Lịch sử
let searchTimeout = null;
document.getElementById('smart-search-input').addEventListener('input', function(e) {
    let query = e.target.value.trim();
    if (query.length < 2) return showSearchHistory();

    clearTimeout(searchTimeout);
    document.getElementById('search-results').style.display = 'block';
    document.getElementById('search-results').innerHTML = '<div style="padding:10px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tìm...</div>';
    searchTimeout = setTimeout(() => performHybridSearch(query), 500);
});

// Lưu lịch sử khi ấn Enter
document.getElementById('smart-search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        let query = e.target.value.trim();
        if (query) {
            let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
            history = history.filter(q => q !== query); // Xóa trùng
            history.unshift(query); // Thêm lên đầu
            if (history.length > 5) history.pop(); // Giữ tối đa 5 lịch sử
            localStorage.setItem('searchHistory', JSON.stringify(history));
        }
    }
});

window.showSearchHistory = function() {
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    let resultsDiv = document.getElementById('search-results');
    if (history.length === 0 || document.getElementById('smart-search-input').value.length >= 2) return;
    
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `<div class="history-title">🕒 TÌM KIẾM GẦN ĐÂY</div>` + 
        history.map(q => `
            <div class="search-item" onclick="document.getElementById('smart-search-input').value='${q}'; performHybridSearch('${q}');">
                <i class="fas fa-history search-item-icon" style="color:#aaa;"></i> <span>${q}</span>
            </div>
        `).join('');
};

// 3. Hàm Tìm kiếm Cốt lõi
async function performHybridSearch(query) {
    let resultsDiv = document.getElementById('search-results');
    let finalResults = [];
    let queryLower = query.toLowerCase();

    // --- ƯU TIÊN 1: TÌM TRONG DỮ LIỆU LOCAL (Nhanh, Chính xác) ---
    if (window.myCollectionsData) {
        let localMatches = window.myCollectionsData.filter(item => 
            (item.name && item.name.toLowerCase().includes(queryLower)) || 
            (item.desc && item.desc.toLowerCase().includes(queryLower))
        );
        
        localMatches.forEach(match => {
            finalResults.push({
                type: 'local', id: match.id, lat: match.lat, lng: match.lng,
                title: match.name, subtitle: match.collectionName || 'Bộ sưu tập',
                icon: 'fa-star'
            });
        });
    }

    // --- ƯU TIÊN 2: TÌM QUA OPENSTREETMAP (Địa chỉ, Đường phố) ---
    // Giới hạn 5 kết quả, ưu tiên tìm quanh khu vực bản đồ đang hiển thị
    try {
        let bounds = map.getBounds();
        let viewBox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
        let osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewBox}&bounded=0&limit=5`;
        
        let response = await fetch(osmUrl);
        let osmData = await response.json();
        
        osmData.forEach(item => {
            finalResults.push({
                type: 'osm', id: item.place_id, lat: item.lat, lng: item.lon,
                title: item.display_name.split(',')[0], // Lấy tên chính
                subtitle: item.display_name,            // Lấy địa chỉ đầy đủ
                icon: 'fa-map-marker-alt'
            });
        });
    } catch(e) { console.error("Lỗi tìm kiếm OSM:", e); }

    // --- RENDER KẾT QUẢ VÀ FIX LỖI CLICK ---
    if (finalResults.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:10px; text-align:center; color:#e74c3c;">Không tìm thấy kết quả.</div>';
        return;
    }

    resultsDiv.innerHTML = finalResults.map(item => {
        // Bọc thép tên địa điểm (Tránh vỡ code HTML)
        let safeTitle = item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        return `
        <div class="search-item" onclick="flyToSearchResult(${item.lat}, ${item.lng}, '${safeTitle}', '${item.type}')">
            <i class="fas ${item.icon} search-item-icon ${item.type === 'local' ? 'search-local' : 'search-osm'}"></i>
            <div>
                <b style="color:#333;">${item.title}</b><br>
                <span style="color:#7f8c8d; font-size:10px;">${item.subtitle.substring(0, 50)}...</span>
            </div>
        </div>
        `;
    }).join('');
}

// 4. Xử lý khi người dùng Click vào một kết quả
let tempSearchMarker = null;
window.flyToSearchResult = function(lat, lng, title, type) {
    document.getElementById('search-results').style.display = 'none';
    map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });

    if (tempSearchMarker) map.removeLayer(tempSearchMarker);

    if (type === 'osm') {
        // Nếu là địa điểm mới từ OSM, tạo marker tạm và hiện form lưu
        tempSearchMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`
                <div style="text-align:center;">
                    <b>${title}</b><br>
                    <button onclick="showCustomSaveForm(${lat.toFixed(6)}, ${lng.toFixed(6)}, '${title}')" style="margin-top:10px; background:#27ae60; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                        <i class="fas fa-plus"></i> Thêm vào bộ sưu tập
                    </button>
                </div>
            `).openPopup();
    }
};

// ==========================================
// CÀI ĐẶT VỊ TRÍ MẶC ĐỊNH (SET DEFAULT VIEW)
// Hàm Bật/Tắt tên trực tiếp từ Checkbox Custom
window.toggleAllLabels = function(isVisible) {
    let mapDiv = document.getElementById('map');
    if (!mapDiv) return;
    
    if (isVisible) {
        // Nếu tick -> Xóa class ẩn đi -> Hiện tên
        mapDiv.classList.remove('hide-all-labels');
    } else {
        // Nếu bỏ tick -> Thêm class ẩn vào -> Tắt tên
        mapDiv.classList.add('hide-all-labels');
    }
};

// Đảm bảo đồng bộ trạng thái khi vừa load trang web xong
document.addEventListener('DOMContentLoaded', function() {
    let checkbox = document.querySelector('input[onchange*="toggleAllLabels"]');
    if (checkbox) {
        toggleAllLabels(checkbox.checked);
    }
});
// ==========================================
// TÍNH NĂNG: BẬT/TẮT TẤT CẢ LAYER TRONG BẢNG ĐIỀU KHIỂN
// ==========================================

// Hàm bơm giao diện Checkbox vào đầu bảng điều khiển Leaflet
window.injectLayerToggleAll = function() {
    let controlContainer = document.querySelector('.leaflet-control-layers');
    let formContainer = document.querySelector('.leaflet-control-layers-list');

    if (controlContainer && formContainer && !document.getElementById('toggle-all-layers-container')) {
        let toggleDiv = document.createElement('div');
        toggleDiv.id = 'toggle-all-layers-container';
        toggleDiv.style.borderBottom = '1px solid #ddd';
        toggleDiv.style.marginBottom = '8px';
        toggleDiv.style.padding = '8px 10px';
        toggleDiv.style.background = '#f8f9fa';

        L.DomEvent.disableClickPropagation(toggleDiv); // Chặn click xuyên thấu
        
        toggleDiv.innerHTML = `
            <label style="display: flex; align-items: center; font-weight: bold; color: #2c3e50; cursor: pointer; margin: 0;">
                <input type="checkbox" id="toggle-all-layers-checkbox" checked onchange="toggleAllLayers(this.checked)" style="margin-right: 8px; cursor: pointer; width: 14px; height: 14px;">
                <span>Tất cả Layer</span>
            </label>
        `;
        
        // Chèn lên trên cùng của bảng điều khiển (Bên trên danh sách Leaflet)
        controlContainer.insertBefore(toggleDiv, formContainer);
    }
};

// Hàm xử lý Logic khi người dùng tick/bỏ tick
window.toggleAllLayers = function(isTurnOn) {
    // 1. Ẩn/Hiện Layer Cá nhân & Public
    if (typeof customLayerGroups !== 'undefined') {
        for (let cat in customLayerGroups) {
            if (isTurnOn) map.addLayer(customLayerGroups[cat]);
            else map.removeLayer(customLayerGroups[cat]);
        }
    }
    
    // 2. Ẩn/Hiện Layer từ Google Sheets
    // (Trong code cũ của bạn gọi là 'layerGroups' nhưng thực tế tên biến là 'categoryLayers'. Tôi đã sửa lại cho chuẩn!)
    if (typeof categoryLayers !== 'undefined') {
        for (let cat in categoryLayers) {
            if (isTurnOn) map.addLayer(categoryLayers[cat]);
            else map.removeLayer(categoryLayers[cat]);
        }
    }

    // 3. ĐỒNG BỘ GIAO DIỆN: Ép các dấu tick trong bảng điều khiển Leaflet khớp với trạng thái thực tế
    let leafletCheckboxes = document.querySelectorAll('.leaflet-control-layers-overlays input[type="checkbox"]');
    leafletCheckboxes.forEach(chk => chk.checked = isTurnOn);
};


window.toggleQuickFavorite = function(e, lat, lng, name) {
    // 1. Ngăn chặn sự kiện làm đóng popup hoặc click xuyên thấu
    if (e) L.DomEvent.stopPropagation(e);

    let isFav = myCollectionsData.some(item => item.lat === lat && item.lng === lng && item.collectionName === 'Yêu thích');
    
    if (isFav) {
        // Bỏ yêu thích: Xóa khỏi mảng cá nhân [cite: 298]
        myCollectionsData = myCollectionsData.filter(item => !(item.lat === lat && item.lng === lng && item.collectionName === 'Yêu thích'));
    } else {
        // Thêm yêu thích: Tạo đối tượng mới [cite: 204]
        let uniqueEventId = `fav_${Date.now()}`;
        myCollectionsData.push({
            id: uniqueEventId, name: name, lat: lat, lng: lng, 
            collectionName: 'Yêu thích', color: '#e74c3c', icon: 'fa-heart', desc: 'Đã lưu yêu thích', date: ''
        });

        // 2. GỬI DỮ LIỆU ĐẾM TIM VỀ GOOGLE FORM (Tùy chọn)
        if (typeof CONFIG !== 'undefined' && CONFIG.FORM_PUBLIC) {
            let formData = new URLSearchParams();
            formData.append(CONFIG.FORM_PUBLIC.ENTRY_NAME, name);
            formData.append(CONFIG.FORM_PUBLIC.ENTRY_COORDS, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            formData.append(CONFIG.FORM_PUBLIC.ENTRY_VOTE, "VOTE_FAVORITE"); // Đánh dấu đây là lượt tim
            fetch(CONFIG.FORM_PUBLIC.URL, { method: "POST", mode: "no-cors", body: formData });
        }
    }

    localStorage.setItem('moscowCollectionsData', JSON.stringify(myCollectionsData));

   // 3. VẼ LẠI NHƯNG GIỮ POPUP MỞ (Fix lỗi map.getPopup)
    // Thay vì hỏi map, chúng ta dùng luôn tọa độ lat, lng truyền vào!
    let openPopupLatLng = L.latLng(lat, lng); 
    
    renderCustomSavedPoints(); 
    
    // Tìm lại marker tại vị trí đó và mở lại popup sau khi render xong
    setTimeout(() => {
        map.eachLayer(l => {
            if (l instanceof L.Marker && l.getLatLng && l.getLatLng().equals(openPopupLatLng)) {
                l.openPopup();
            }
        });
    }, 150); // Tăng delay lên một chút để chắc chắn bản đồ đã vẽ xong

};
// ==========================================
// TÍNH NĂNG: XEM DANH SÁCH ĐÃ THẢ TIM CỦA TÔI
// ==========================================
window.showMyFavoritesList = function() {
    // Lọc ra các địa điểm thuộc bộ sưu tập "Yêu thích"
    let favs = myCollectionsData.filter(item => item.collectionName === 'Yêu thích');
    
    if (favs.length === 0) {
        return alert("Bạn chưa thả tim địa điểm nào! Hãy click vào biểu tượng ❤️ trên các địa điểm để lưu nhé.");
    }

    // Tạo danh sách HTML
    let listHTML = favs.map(item => {
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #eee; padding:8px 0;">
                <div style="flex:1;">
                    <b style="color:#2c3e50; font-size:13px;">${item.name}</b>
                    <p style="margin:2px 0 0 0; font-size:10px; color:#7f8c8d;">${item.desc || 'Đã lưu yêu thích'}</p>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="map.closePopup(); map.flyTo([${item.lat}, ${item.lng}], 17, {animate:true, duration:1.5});" style="background:#3498db; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:10px;"><i class="fas fa-location-arrow"></i> Đi</button>
                    <button onclick="removeCustomPoint('${item.id}'); map.closePopup();" style="background:#e74c3c; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:10px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');

    // Đưa danh sách vào một Popup đặt giữa màn hình
    let popupContent = `
        <div style="min-width: 250px; max-width: 320px; max-height: 350px; overflow-y: auto; padding-right:5px;">
            <h3 style="color:#e74c3c; margin-top:0; border-bottom:2px solid #e74c3c; padding-bottom:5px; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-heart"></i> Đã Thích (${favs.length})
            </h3>
            ${listHTML}
        </div>
    `;
    L.popup().setLatLng(map.getCenter()).setContent(popupContent).openOn(map);
};