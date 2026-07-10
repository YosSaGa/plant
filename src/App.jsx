import React, { useState, useEffect } from 'react';
// Import ไฟล์ CSS ของคุณที่นี่
import './component/first.css'; 

function App() {
  const [plants, setPlants] = useState([]);
  const [weather, setWeather] = useState({ temp: 0, condition: 'Clear', location: 'กำลังค้นหา...' }); 
  const [formData, setFormData] = useState({
    type: 'กะเพรา',
    stage: 'เมล็ด',
    method: 'กระถาง',
    amount: 1,
  });
  const [justAdded, setJustAdded] = useState(false);

  const plantOptions = [
    { name: 'กะเพรา', emoji: '🌿' },
    { name: 'มะเขือเทศ', emoji: '🍅' },
    { name: 'ว่านหางจระเข้', emoji: '🪴' },
    { name: 'ผักกาดหอม', emoji: '🥬' },
    { name: 'กระบองเพชร', emoji: '🌵' },
  ];

  const stageOptions = ['เมล็ด', 'ต้นกล้า', 'โตเต็มวัย'];
  const methodOptions = [
    { name: 'กระถาง', label: 'ปลูกในกระถาง' },
    { name: 'ลงดิน', label: 'ปลูกลงดิน' },
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async () => {
          setWeather({
            temp: 32,
            condition: 'Clear',
            location: 'Songkhla',
          });
        },
        () => {
          setWeather((prev) => ({ ...prev, location: 'ไม่สามารถระบุตำแหน่งได้' }));
        }
      );
    }
  }, []);

  const weatherTheme = {
    Clear: { icon: '☀️', label: 'แดดจัด เหมาะแก่การรดน้ำตอนเช้า' },
    Rain: { icon: '🌧️', label: 'ฝนตก งดรดน้ำเพิ่มวันนี้' },
    Clouds: { icon: '☁️', label: 'มีเมฆมาก อากาศเย็นสบาย' },
  };
  const currentWeather = weatherTheme[weather.condition] || weatherTheme.Clear;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setField = (name, value) => setFormData({ ...formData, [name]: value });

  const adjustAmount = (delta) => {
    setFormData((prev) => ({ ...prev, amount: Math.max(1, Number(prev.amount) + delta) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentTime = new Date();
    setPlants([...plants, { ...formData, id: Date.now(), plantedAt: currentTime }]);
    
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2200);
  };

  return (
    <div className="sg-root">
      <div className="sg-blob sg-blob1"></div>
      <div className="sg-blob sg-blob2"></div>
      <div className="sg-blob sg-blob3"></div>

      <div className="sg-wrap">
        <header className="sg-card sg-header">
          <div className="sg-brand">
            <div className="sg-logo">🌿</div>
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
        </header>

        <div className="sg-main">
          <div className="sg-main-left">
            <section className="sg-card">
              <h2 className="sg-display sg-section-title">🌱 เพิ่มพืชชนิดใหม่</h2>

              <form onSubmit={handleSubmit}>
                <div>
                  <label className="sg-label">ชนิดพืช</label>
                  <div className="sg-plant-grid">
                    {plantOptions.map((plant) => (
                      <button
                        type="button"
                        key={plant.name}
                        onClick={() => setField('type', plant.name)}
                        className={`sg-plant-btn ${formData.type === plant.name ? 'active' : ''}`}
                      >
                        <span className="sg-plant-emoji">{plant.emoji}</span>
                        <span className="sg-plant-name">{plant.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sg-row">
                  <div>
                    <label className="sg-label">ระยะการเจริญเติบโต</label>
                    <div className="sg-chip-group">
                      {stageOptions.map((stage) => (
                        <button
                          type="button"
                          key={stage}
                          onClick={() => setField('stage', stage)}
                          className={`sg-chip ${formData.stage === stage ? 'active' : ''}`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="sg-label">วิธีการปลูก</label>
                    <div className="sg-chip-group">
                      {methodOptions.map((m) => (
                        <button
                          type="button"
                          key={m.name}
                          onClick={() => setField('method', m.name)}
                          className={`sg-chip ${formData.method === m.name ? 'active' : ''}`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="sg-label">จำนวนต้น</label>
                  <div className="sg-stepper">
                    <button type="button" className="sg-step-btn" onClick={() => adjustAmount(-1)}>−</button>
                    <input
                      type="number"
                      name="amount"
                      min="1"
                      value={formData.amount}
                      onChange={handleChange}
                      className="sg-amount-input"
                    />
                    <button type="button" className="sg-step-btn" onClick={() => adjustAmount(1)}>+</button>
                  </div>
                </div>

                <button type="submit" className="sg-display sg-submit">+ เพิ่มลงแปลงปลูก</button>

                {justAdded && <div className="sg-toast">✨ เพิ่มพืชเรียบร้อยแล้ว!</div>}
              </form>
            </section>
          </div>

          <div className="sg-main-right">
            <section>
              <h2 className="sg-display sg-section-title">
                🪴 พืชที่คุณกำลังดูแล <span className="sg-badge">{plants.length}</span>
              </h2>

              {plants.length === 0 ? (
                <div className="sg-empty">
                  <span className="sg-empty-emoji">👩‍🌾</span>
                  ยังไม่มีพืชในแปลงปลูก ลองเพิ่มพืชด้านบนดูสิ!
                </div>
              ) : (
                <div className="sg-plant-list">
                  {plants.map((plant) => {
                    const plantInfo = plantOptions.find((p) => p.name === plant.type);
                    
                    const formattedTime = new Intl.DateTimeFormat('th-TH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(plant.plantedAt);

                    return (
                      <div key={plant.id} className="sg-plant-card">
                        <div className="sg-plant-icon">{plantInfo ? plantInfo.emoji : '🌱'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3>{plant.type}</h3>
                          <p>ระยะ: {plant.stage} · แบบ: {plant.method}</p>
                          <p className="sg-plant-time">🕒 เริ่มปลูก: {formattedTime}</p>
                          <button>👁️ ดูคำแนะนำการดูแล</button>
                        </div>
                        <span className="sg-plant-count">{plant.amount} ต้น</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;