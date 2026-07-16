import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './component/first.css';
import Weather from "./component/Weather";
import PlantAdvice from "./component/PlantAdvice";

function App() {
  const [plants, setPlants] = useState([]);
  const [weather, setWeather] = useState({ temp: 0, humidity: 0, condition: 'Clear', location: 'กำลังค้นหา...' });
  const [formData, setFormData] = useState({
    type: 'กะเพรา',
    stage: 'เมล็ด',
    method: 'กระถาง',
    amount: 1,
  });
  const [justAdded, setJustAdded] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [currentSeed, setCurrentSeed] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedPlant, setSelectedPlant] = useState(null);

  const plantOptions = [
  { name: 'พริก', emoji: '🌶️' },
  { name: 'ผักชีฝรั่ง', emoji: '🍃' },
  { name: 'โหระพา', emoji: '🌿' },
  { name: 'กะเพรา', emoji: '🍀' },
  { name: 'ตะไคร้', emoji: '🌾' },
];

  const stageOptions = ['เมล็ด', 'ต้นกล้า', 'โตเต็มวัย'];
  const methodOptions = [
    { name: 'กระถาง', label: 'ปลูกในกระถาง' },
    { name: 'ลงดิน', label: 'ปลูกลงดิน' },
  ];

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const API_KEY = 'd1c9079abd3e388a18f5dbbabafd5e52'; 
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=th`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        let mainCondition = data.weather[0].main; 
        if (['Thunderstorm', 'Drizzle'].includes(mainCondition)) {
          mainCondition = 'Rain';
        } else if (!['Clear', 'Rain', 'Clouds'].includes(mainCondition)) {
          mainCondition = 'Clear'; 
        }

        setWeather({ 
          temp: Math.round(data.main.temp), 
          humidity: data.main.humidity,
          condition: mainCondition, 
          location: data.name 
        });
      } catch (error) {
        console.error("Error fetching weather: ", error);
        setWeather((prev) => ({ ...prev, location: 'ดึงข้อมูลไม่สำเร็จ' }));
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        () => {
          setWeather((prev) => ({ ...prev, location: 'ไม่ได้อนุญาตตำแหน่ง' }));
        }
      );
    } else {
      setWeather((prev) => ({ ...prev, location: 'เบราว์เซอร์ไม่รองรับ GPS' }));
    }
  }, []);

  const weatherTheme = {
    Clear: { icon: '☀️', label: 'แดดจัด เหมาะแก่การรดน้ำตอนเช้า' },
    Rain: { icon: '🌧️', label: 'ฝนตก งดรดน้ำเพิ่มวันนี้' },
    Clouds: { icon: '☁️', label: 'มีเมฆมาก อากาศเย็นสบาย' },
  };
  const currentWeather = weatherTheme[weather.condition] || weatherTheme.Clear;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const setField = (name, value) => setFormData({ ...formData, [name]: value });
  const adjustAmount = (delta) => setFormData((prev) => ({ ...prev, amount: Math.max(1, Number(prev.amount) + delta) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newPlant = { ...formData, id: Date.now(), plantedAt: new Date() };

    setPlants([newPlant, ...plants]); 

    if (newPlant.stage === 'เมล็ด') {
      setCurrentSeed(newPlant);
      setShowPopup(true);
    } else {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2200);
    }
  };

  const handleViewAdvice = (plant) => {
    setSelectedPlant(plant);
    setPage('advice');
  };

  const handleGoToGuide = () => {
    setShowPopup(false);
    handleViewAdvice(currentSeed);
  };

  const handleViewPlant = (plant) => {
    setSelectedPlant(plant);
    setPage('detail');
  };

  const formatPlantedTime = (date) =>
    new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  const totalPlantAmount = plants.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const recentPlants = plants.slice(0, 3);
  const uniqueTypeCount = new Set(plants.map((p) => p.type)).size;

  const renderPlantCard = (plant) => {
    const plantInfo = plantOptions.find((p) => p.name === plant.type);
    return (
      <motion.div 
        key={plant.id} 
        className="sg-plant-card"
        layout
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, type: 'spring', bounce: 0.4 }}
        onClick={() => handleViewPlant(plant)} /* 🟢 กดที่กล่องการ์ด ไปหน้า Weather (detail) */
        style={{ cursor: 'pointer' }}
      >
        <div className="sg-plant-icon">{plantInfo ? plantInfo.emoji : '🌱'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{plant.type}</h3>
          <p>ระยะ: {plant.stage} · แบบ: {plant.method}</p>
          <p className="sg-plant-time">🕒 เริ่มปลูก: {formatPlantedTime(plant.plantedAt)}</p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.preventDefault();   /* 🟢 เบรก Event ไม่ให้ไปทริกเกอร์แท็ก Form/Link (ถ้ามี) */
              e.stopPropagation();  /* 🟢 เบรก Event Bubbling ไม่ให้มันทะลุไปโดน onClick ของการ์ดด้านบน */
              handleViewAdvice(plant); /* 🟢 ไปหน้า Advice */
            }}
          >
            👁️ ดูคำแนะนำการดูแล
          </motion.button>
        </div>
        <span className="sg-plant-count">{plant.amount} ต้น</span>
      </motion.div>
    );
  };

  return (
    <div className="sg-root">
      
      {createPortal(
        <AnimatePresence>
          {showPopup && (
            <motion.div 
              className="sg-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="sg-modal"
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 30 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <div className="sg-modal-icon">🌱</div>
                <h3>เพาะเมล็ด {currentSeed?.type} หรอ?</h3>
                <p>
                  การเริ่มปลูกจากเมล็ดต้องใช้ความใส่ใจเป็นพิเศษ<br />
                  ต้องการไปดู <strong>คำแนะนำการดูแล</strong> เลยไหม?
                </p>
                <div className="sg-modal-actions">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="sg-btn-cancel" onClick={() => setShowPopup(false)}>ไว้ทีหลัง</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="sg-btn-confirm" onClick={handleGoToGuide}>ไปเลย!</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <motion.div className="sg-blob sg-blob1" animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}></motion.div>
      <motion.div className="sg-blob sg-blob2" animate={{ y: [0, 20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}></motion.div>
      <motion.div className="sg-blob sg-blob3" animate={{ x: [0, 15, 0], y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}></motion.div>

      <div className="sg-wrap">
        <motion.header 
          className="sg-card sg-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <div className="sg-brand">
            <motion.div 
              className="sg-logo"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
            >🌿</motion.div>
            <div>
              <h1 className="sg-display sg-title">My Smart Garden</h1>
              <p className="sg-location">📍 {weather.location}</p>
            </div>
          </div>
          <div className="sg-weather">
            <div>
              <div className="sg-display sg-temp">{weather.temp}°C</div>
              <div className="sg-weather-label">{currentWeather.label}</div>
            </div>
            <div className="sg-weather-icon">{currentWeather.icon}</div>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {page === 'home' ? (
            <motion.div 
              key="home" 
              className="sg-main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sg-main-left">
                <section className="sg-card">
                  <h2 className="sg-display sg-section-title">🌱 เพิ่มพืชชนิดใหม่</h2>

                  <form onSubmit={handleSubmit}>
                    <div>
                      <label className="sg-label">ชนิดพืช</label>
                      <div className="sg-plant-grid">
                        {plantOptions.map((plant) => (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            key={plant.name}
                            onClick={() => setField('type', plant.name)}
                            className={`sg-plant-btn ${formData.type === plant.name ? 'active' : ''}`}
                          >
                            <span className="sg-plant-emoji">{plant.emoji}</span>
                            <span className="sg-plant-name">{plant.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="sg-row">
                      <div>
                        <label className="sg-label">ระยะการเจริญเติบโต</label>
                        <div className="sg-chip-group">
                          {stageOptions.map((stage) => (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              key={stage}
                              onClick={() => setField('stage', stage)}
                              className={`sg-chip ${formData.stage === stage ? 'active' : ''}`}
                            >
                              {stage}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="sg-label">วิธีการปลูก</label>
                        <div className="sg-chip-group">
                          {methodOptions.map((m) => (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              key={m.name}
                              onClick={() => setField('method', m.name)}
                              className={`sg-chip ${formData.method === m.name ? 'active' : ''}`}
                            >
                              {m.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="sg-label">จำนวนต้น</label>
                      <div className="sg-stepper">
                        <motion.button whileTap={{ scale: 0.9 }} type="button" className="sg-step-btn" onClick={() => adjustAmount(-1)}>−</motion.button>
                        <input
                          type="number"
                          name="amount"
                          min="1"
                          value={formData.amount}
                          onChange={handleChange}
                          className="sg-amount-input"
                        />
                        <motion.button whileTap={{ scale: 0.9 }} type="button" className="sg-step-btn" onClick={() => adjustAmount(1)}>+</motion.button>
                      </div>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: '#34d399' }} 
                      whileTap={{ scale: 0.98 }} 
                      type="submit" 
                      className="sg-display sg-submit"
                    >
                      + เพิ่มลงแปลงปลูก
                    </motion.button>

                    <AnimatePresence>
                      {justAdded && (
                        <motion.div 
                          className="sg-toast"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          ✨ เพิ่มพืชเรียบร้อยแล้ว!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </section>
              </div>

              <div className="sg-main-right">
                <section>
                  <h2 className="sg-display sg-section-title">
                    🪴 พืชล่าสุด <motion.span key={totalPlantAmount} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="sg-badge">{totalPlantAmount}</motion.span>
                  </h2>

                  {plants.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sg-empty">
                      <span className="sg-empty-emoji">👩‍🌾</span>
                      ยังไม่มีพืชในแปลงปลูก ลองเพิ่มพืชด้านบนดูสิ!
                    </motion.div>
                  ) : (
                    <>
                      <div className="sg-plant-list">
                        <AnimatePresence>
                          {recentPlants.map(renderPlantCard)}
                        </AnimatePresence>
                      </div>
                      <motion.button 
                        whileHover={{ x: 5 }}
                        className="sg-view-all-btn" 
                        onClick={() => setPage('stats')}
                      >
                        ดูสรุปทั้งหมด ({uniqueTypeCount} ชนิด) →
                      </motion.button>
                    </>
                  )}
                </section>
              </div>
            </motion.div>
          ) : page === 'stats' ? (
            <motion.div 
              key="stats" 
              className="sg-stats-page"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button whileHover={{ x: -5 }} className="sg-back-btn" onClick={() => setPage('home')}>← กลับหน้าหลัก</motion.button>

              <section className="sg-card sg-stats-card">
                <motion.div 
                  className="sg-stats-icon"
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >🏆</motion.div>
                <p className="sg-stats-sub">คุณปลูกพืชไปแล้วทั้งหมด</p>
                <p className="sg-stats-number">{uniqueTypeCount} <span>ชนิด</span></p>
                <p className="sg-stats-detail">จากพืชทั้งหมด {totalPlantAmount} ต้นที่บันทึกไว้</p>
              </section>

              <section>
                <h2 className="sg-display sg-section-title">📋 รายการพืชทั้งหมด</h2>
                <div className="sg-plant-list sg-plant-list-full">
                  <AnimatePresence>
                    {plants.map(renderPlantCard)}
                  </AnimatePresence>
                </div>
              </section>
            </motion.div>
          ) : page === 'detail' ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Weather
                plant={selectedPlant}
                weather={weather}
                onBack={() => setPage('home')} /* 🟢 เปลี่ยนให้ปุ่ม "กลับ" ใน Weather กลับไปที่หน้าหลัก (home) */
              />
            </motion.div>
          ) : (
            <motion.div
              key="advice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PlantAdvice
                plant={selectedPlant}
                weather={weather}
                onBack={() => setPage('home')} /* 🟢 เปลี่ยนให้ปุ่ม "กลับ" ใน Advice กลับไปที่หน้าหลักเช่นกัน */
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
