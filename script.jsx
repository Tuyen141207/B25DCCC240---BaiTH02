const { useEffect, useMemo, useState } = React;

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

function getWeatherInfo(code) {
    if (code === 0) return { icon: '☀️', description: 'Trời quang' };
    if (code === 1) return { icon: '🌤️', description: 'Ít mây' };
    if (code === 2) return { icon: '⛅', description: 'Có mây' };
    if (code === 3) return { icon: '☁️', description: 'Nhiều mây' };
    if ([45, 48].includes(code)) return { icon: '🌫️', description: 'Sương mù' };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌦️', description: 'Mưa phùn' };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧️', description: 'Có mưa' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', description: 'Có tuyết' };
    if ([95, 96, 99].includes(code)) return { icon: '⛈️', description: 'Dông sét' };
    return { icon: '🌡️', description: 'Không xác định' };
}

function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLocaleLowerCase('vi');
}

function formatTemperature(celsius, unit) {
    const value = unit === 'C' ? celsius : (celsius * 9) / 5 + 32;
    return Math.round(value);
}

function formatUpdatedTime(time) {
    const date = new Date(`${time.replace(' ', 'T')}:00+07:00`);
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
}

function formatForecastDate(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);
    return {
        weekday: new Intl.DateTimeFormat('vi-VN', {
            weekday: 'short',
            timeZone: 'UTC'
        }).format(date),
        date: new Intl.DateTimeFormat('vi-VN', {
            day: 'numeric',
            month: 'numeric',
            timeZone: 'UTC'
        }).format(date)
    };
}

function validateWeatherData(data) {
    const current = data && data.current;
    const daily = data && data.daily;
    if (
        !current ||
        !Number.isFinite(current.temperature_2m) ||
        !Number.isFinite(current.relative_humidity_2m) ||
        !Number.isFinite(current.wind_speed_10m) ||
        !Number.isFinite(current.weather_code) ||
        typeof current.time !== 'string' ||
        !daily ||
        !Array.isArray(daily.time) ||
        !Array.isArray(daily.weather_code) ||
        !Array.isArray(daily.temperature_2m_max) ||
        !Array.isArray(daily.temperature_2m_min) ||
        daily.time.length < 7 ||
        daily.weather_code.length < 7 ||
        daily.temperature_2m_max.length < 7 ||
        daily.temperature_2m_min.length < 7
    ) {
        throw new Error('Dữ liệu thời tiết nhận được chưa đầy đủ. Vui lòng thử lại.');
    }
}

function App() {
    const [selectedCity, setSelectedCity] = useState(null);
    const [weather, setWeather] = useState(null);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [unit, setUnit] = useState('C');
    const [search, setSearch] = useState('');
    const [retryKey, setRetryKey] = useState(0);

    const visibleCities = useMemo(() => {
        const query = normalizeText(search.trim());
        return query
            ? CITIES.filter(city => normalizeText(city.name).includes(query))
            : CITIES;
    }, [search]);

    useEffect(() => {
        if (!selectedCity) return undefined;

        const controller = new AbortController();
        const params = new URLSearchParams({
            latitude: selectedCity.lat,
            longitude: selectedCity.lon,
            current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
            timezone: 'Asia/Ho_Chi_Minh',
            forecast_days: '7'
        });

        setStatus('loading');
        setErrorMessage('');

        async function loadWeather() {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
                    { signal: controller.signal }
                );
                if (!response.ok) {
                    throw new Error(`Không thể tải dữ liệu (HTTP ${response.status}).`);
                }

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.reason || 'API không thể trả dữ liệu thời tiết.');
                }
                validateWeatherData(data);
                setWeather(data);
                setStatus('success');
            } catch (error) {
                if (error.name === 'AbortError') return;
                console.error('Không thể tải thời tiết:', error);
                setErrorMessage(
                    error instanceof TypeError
                        ? 'Không thể kết nối đến dịch vụ thời tiết. Hãy kiểm tra mạng và thử lại.'
                        : error.message || 'Đã xảy ra lỗi khi tải dữ liệu thời tiết.'
                );
                setStatus('error');
            }
        }

        loadWeather();
        return () => controller.abort();
    }, [selectedCity, retryKey]);

    function selectCity(city) {
        if (selectedCity && city.id === selectedCity.id) {
            setRetryKey(key => key + 1);
            return;
        }
        setWeather(null);
        setSelectedCity(city);
    }

    return (
        <div className="app-shell">
            <header className="topbar">
                <a className="brand" href="#" aria-label="Thời tiết Việt Nam">
                    <span className="brand-icon" aria-hidden="true">☀</span>
                    <span>weather<span className="brand-accent">vn</span></span>
                </a>
                <span className="topbar-note"><span className="live-dot"></span>Dữ liệu trực tiếp từ Open-Meteo</span>
            </header>

            <main className="container">
                <section className="intro">
                    <p className="eyebrow">THỜI TIẾT VIỆT NAM</p>
                    <h1>Dự báo thời tiết</h1>
                    <p className="intro-copy">Cập nhật tình hình thời tiết tại các thành phố trên cả nước.</p>
                </section>

                <div className="dashboard">
                    <aside className="sidebar" aria-label="Danh sách thành phố">
                        <div className="sidebar-heading">
                            <div>
                                <h2>Thành phố</h2>
                                <p>Chọn địa điểm bạn quan tâm</p>
                            </div>
                            <span className="city-count">{CITIES.length}</span>
                        </div>
                        <label className="search-box">
                            <span className="search-icon" aria-hidden="true">⌕</span>
                            <input
                                type="search"
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Tìm thành phố..."
                                aria-label="Tìm thành phố"
                            />
                        </label>
                        <div className="city-list">
                            {visibleCities.map(city => (
                                <button
                                    className={`city-btn${selectedCity && selectedCity.id === city.id ? ' active' : ''}`}
                                    key={city.id}
                                    type="button"
                                    onClick={() => selectCity(city)}
                                    aria-pressed={Boolean(selectedCity && selectedCity.id === city.id)}
                                >
                                    <span className="city-pin" aria-hidden="true">⌖</span>
                                    <span>{city.name}</span>
                                    <span className="city-arrow" aria-hidden="true">›</span>
                                </button>
                            ))}
                            {visibleCities.length === 0 && (
                                <p className="empty-search">Không tìm thấy thành phố phù hợp.</p>
                            )}
                        </div>
                    </aside>

                    <section className="main-content" aria-live="polite">
                        <div className="content-header">
                            <div>
                                <p className="section-kicker">THỜI TIẾT HIỆN TẠI</p>
                                <h2>{selectedCity ? selectedCity.name : 'Chào mừng bạn'}</h2>
                            </div>
                            <div className="unit-toggle" role="group" aria-label="Đơn vị nhiệt độ">
                                <button
                                    className={`unit-btn${unit === 'C' ? ' active' : ''}`}
                                    type="button"
                                    onClick={() => setUnit('C')}
                                    aria-pressed={unit === 'C'}
                                >°C</button>
                                <button
                                    className={`unit-btn${unit === 'F' ? ' active' : ''}`}
                                    type="button"
                                    onClick={() => setUnit('F')}
                                    aria-pressed={unit === 'F'}
                                >°F</button>
                            </div>
                        </div>

                        {status === 'idle' && (
                            <div className="status-box idle-state">
                                <span className="status-illustration" aria-hidden="true">🌤️</span>
                                <h3>Bầu trời đang chờ bạn khám phá</h3>
                                <p>Chọn một thành phố để xem thời tiết hiện tại và dự báo 7 ngày.</p>
                            </div>
                        )}

                        {status === 'loading' && (
                            <div className="status-box loading-state" role="status">
                                <span className="spinner" aria-hidden="true"></span>
                                <h3>Đang cập nhật thời tiết</h3>
                                <p>Đang lấy dữ liệu mới nhất cho {selectedCity.name}...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="status-box error-state" role="alert">
                                <span className="status-illustration" aria-hidden="true">☁️</span>
                                <h3>Chưa thể tải dữ liệu</h3>
                                <p>{errorMessage}</p>
                                <button
                                    className="retry-btn"
                                    type="button"
                                    onClick={() => setRetryKey(key => key + 1)}
                                >
                                    <span aria-hidden="true">↻</span> Thử lại
                                </button>
                            </div>
                        )}

                        {status === 'success' && weather && (
                            <div className="weather-content">
                                <article className="current-card">
                                    <div className="current-main">
                                        <div className="current-summary">
                                            <span className="main-icon" role="img" aria-label={getWeatherInfo(weather.current.weather_code).description}>
                                                {getWeatherInfo(weather.current.weather_code).icon}
                                            </span>
                                            <div>
                                                <p className="weather-caption">HIỆN TẠI</p>
                                                <p className="temp-text">
                                                    {formatTemperature(weather.current.temperature_2m, unit)}
                                                    <span>°{unit}</span>
                                                </p>
                                                <p className="desc-text">{getWeatherInfo(weather.current.weather_code).description}</p>
                                            </div>
                                        </div>
                                        <p className="updated-at">
                                            <span aria-hidden="true">◷</span> Cập nhật lúc {formatUpdatedTime(weather.current.time)}
                                        </p>
                                    </div>
                                    <div className="current-details">
                                        <div className="detail-item">
                                            <span className="detail-icon humidity-icon" aria-hidden="true">💧</span>
                                            <div><span className="detail-label">Độ ẩm</span><strong>{weather.current.relative_humidity_2m}%</strong></div>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-icon wind-icon" aria-hidden="true">💨</span>
                                            <div><span className="detail-label">Tốc độ gió</span><strong>{weather.current.wind_speed_10m} <small>km/h</small></strong></div>
                                        </div>
                                    </div>
                                </article>

                                <section className="forecast-section">
                                    <div className="forecast-heading">
                                        <div>
                                            <p className="section-kicker">NHÌN TRƯỚC MỖI NGÀY</p>
                                            <h3>Dự báo 7 ngày</h3>
                                        </div>
                                        <span className="forecast-period">7 ngày tới</span>
                                    </div>
                                    <div className="forecast-grid">
                                        {weather.daily.time.slice(0, 7).map((date, index) => {
                                            const day = formatForecastDate(date);
                                            const info = getWeatherInfo(weather.daily.weather_code[index]);
                                            return (
                                                <article className="forecast-card" key={date}>
                                                    <p className="forecast-day">{index === 0 ? 'Hôm nay' : day.weekday}</p>
                                                    <p className="forecast-date">{day.date}</p>
                                                    <span className="forecast-icon" role="img" aria-label={info.description}>{info.icon}</span>
                                                    <p className="forecast-condition">{info.description}</p>
                                                    <p className="forecast-temps">
                                                        <strong>{formatTemperature(weather.daily.temperature_2m_max[index], unit)}°</strong>
                                                        <span>{formatTemperature(weather.daily.temperature_2m_min[index], unit)}°</span>
                                                    </p>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>
                        )}

                        <footer className="content-footer">
                            <span>☀</span> Thời tiết được cung cấp bởi Open-Meteo
                        </footer>
                    </section>
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
