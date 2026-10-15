const CITIES = [
    { id: 'hn', name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
    { id: 'hp', name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
    { id: 'hue', name: 'Huế', lat: 16.4637, lon: 107.5909 },
    { id: 'dn', name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
    { id: 'nt', name: 'Nha Trang', lat: 12.2388, lon: 109.1967 },
    { id: 'dl', name: 'Đà Lạt', lat: 11.9404, lon: 108.4583 },
    { id: 'hcm', name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
    { id: 'ct', name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 }
];
let currentCity = null;
let currentWeatherData = null;
let currentUnit = 'C'; 
const cityListEl = document.getElementById('city-list');
const cityTitleEl = document.getElementById('city-title');
const statusBoxEl = document.getElementById('status-box');
const weatherContentEl = document.getElementById('weather-content');
const currentWeatherEl = document.getElementById('current-weather');
const forecastGridEl = document.getElementById('forecast-grid');
const btnC = document.getElementById('btn-c');
const btnF = document.getElementById('btn-f');
function initCities() {
    cityListEl.innerHTML = '';
    CITIES.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'city-btn';
        btn.textContent = city.name;
        btn.id = `btn-${city.id}`;
        btn.onclick = () => fetchWeather(city);
        cityListEl.appendChild(btn);
    });
}
function setStatus(statusType) {
    weatherContentEl.style.display = 'none';
    statusBoxEl.style.display = 'block';
    if (statusType === 'loading') {
        statusBoxEl.innerHTML = 'Đang tải dữ liệu thời tiết...';
    } else if (statusType === 'error') {
        statusBoxEl.innerHTML = `
            <p style="color: red;">Đã xảy ra lỗi khi lấy dữ liệu.</p>
            <button class="retry-btn" onclick="fetchWeather(currentCity)">Thử lại</button>
        `;
    } else if (statusType === 'success') {
        statusBoxEl.style.display = 'none';
        weatherContentEl.style.display = 'block';
    }
}
function updateActiveCityButton() {
    document.querySelectorAll('.city-btn').forEach(btn => btn.classList.remove('active'));
    if (currentCity) {
        document.getElementById(`btn-${currentCity.id}`).classList.add('active');
    }
}
async function fetchWeather(city) {
    currentCity = city;
    cityTitleEl.textContent = `Thời tiết ${city.name}`;
    updateActiveCityButton();
    setStatus('loading');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FHo_Chi_Minh&forecast_days=7`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network error');
        currentWeatherData = await res.json();
        renderWeather(); 
        setStatus('success');
    } catch (error) {
        console.error(error);
        setStatus('error');
    }
}
function renderWeather() {
    if (!currentWeatherData) return;

    // Render hiện tại
    const curr = currentWeatherData.current;
    const wInfo = getWeatherInfo(curr.weather_code);
    currentWeatherEl.innerHTML = `
        <div class="current-header">
            <span class="main-icon">${wInfo.icon}</span>
            <div>
                <h3 class="temp-text">${convertTemp(curr.temperature_2m)}°${currentUnit}</h3>
                <p class="desc-text">${wInfo.desc}</p>
            </div>
        </div>
        <div class="current-details">
            <p>💧 Độ ẩm: ${curr.relative_humidity_2m}%</p>
            <p>💨 Gió: ${curr.wind_speed_10m} km/h</p>
            <p style="font-size: 0.85rem; color: #6b7280; margin-top: 10px;">
                Cập nhật: ${new Date(curr.time).toLocaleString('vi-VN')}
            </p>
        </div>
    `;
    const daily = currentWeatherData.daily;
    forecastGridEl.innerHTML = '';
    daily.time.forEach((time, index) => {
        const dInfo = formatDay(time);
        const dayWInfo = getWeatherInfo(daily.weather_code[index]);
        const maxT = convertTemp(daily.temperature_2m_max[index]);
        const minT = convertTemp(daily.temperature_2m_min[index]);
        forecastGridEl.innerHTML += `
            <div class="forecast-card">
                <p style="font-weight: bold;">${dInfo.dayOfWeek}</p>
                <p style="font-size: 0.85rem; color: #6b7280;">${dInfo.dateShort}</p>
                <div style="font-size: 2rem; margin: 10px 0;">${dayWInfo.icon}</div>
                <div style="font-size: 0.9rem;">
                    <span style="font-weight: bold;">${maxT}°</span> / 
                    <span style="color: #6b7280;">${minT}°</span>
                </div>
            </div>
        `;
    });
}
btnC.addEventListener('click', () => {
    currentUnit = 'C';
    btnC.classList.add('active');
    btnF.classList.remove('active');
    renderWeather();
});
btnF.addEventListener('click', () => {
    currentUnit = 'F';
    btnF.classList.add('active');
    btnC.classList.remove('active');
    renderWeather();
});
function convertTemp(celsius) {
    if (currentUnit === 'C') return Math.round(celsius);
    return Math.round((celsius * 9) / 5 + 32);
}

function getWeatherInfo(code) {
    if (code === 0) return { icon: '☀️', desc: 'Trời quang' };
    if ([1, 2, 3].includes(code)) return { icon: '⛅', desc: 'Nhiều mây' };
    if ([45, 48].includes(code)) return { icon: '🌫️', desc: 'Sương mù' };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌧️', desc: 'Mưa phùn' };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧️', desc: 'Mưa' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', desc: 'Tuyết' };
    if ([95, 96, 99].includes(code)) return { icon: '⛈️', desc: 'Dông sét' };
    return { icon: '🌡️', desc: 'Không xác định' };
}
function formatDay(dateString) {
    const date = new Date(dateString);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
        dayOfWeek: days[date.getDay()],
        dateShort: `${date.getDate()}/${date.getMonth() + 1}`
    };
}
initCities();