import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './weather.css';

const plantEmoji = {
  'กะเพรา': '🌿',
  'มะเขือเทศ': '🍅',
  'ว่านหางจระเข้': '🪴',
  'ผักกาดหอม': '🥬',
  'กระบองเพชร': '🌵',
};

function getSceneKey(weather) {
  const { temp, condition } = weather;
  if (condition === 'Rain') return 'rain';
  if (condition === 'Clouds') return 'cloudy';
  if (temp <= 20) return 'evening';
  if (temp >= 33) return 'hot';
  return 'day';
}

const SCENES = {
  day: { className: 'wx-scene-day', icon: '☀️', title: 'กลางวันแจ่มใส', desc: 'แดดอ่อนกำลังดี เหมาะกับการรดน้ำตอนเช้า' },
  hot: { className: 'wx-scene-hot', icon: '🥵', title: 'อากาศร้อนจัด', desc: 'ดินอาจแห้งเร็ว ลองรดน้ำเพิ่มอีกรอบตอนเย็น' },
  cloudy: { className: 'wx-scene-cloudy', icon: '☁️', title: 'ฟ้าครึ้มมีเมฆมาก', desc: 'อากาศเย็นสบาย ต้นไม้พักผ่อนได้เต็มที่' },
  rain: { className: 'wx-scene-rain', icon: '🌧️', title: 'ฝนกำลังตก', desc: 'งดรดน้ำเพิ่มวันนี้ ดินยังชุ่มอยู่' },
  evening: { className: 'wx-scene-evening', icon: '🌙', title: 'อากาศเย็น ยามพลบค่ำ', desc: 'อุณหภูมิลดลง เหมาะกับการพักตัวของต้นไม้' },
};

const BASE_WATER_ML = { 'กะเพรา': 200, 'มะเขือเทศ': 350, 'ว่านหางจระเข้': 80, 'ผักกาดหอม': 150, 'กระบองเพชร': 40 };
const WATER_FORMULA = { tempRef: 28, tempStep: 0.03, humidityRef: 50, humidityStep: 0.01, minFactor: 0.6, maxFactor: 1.6 };

function clampFactor(f) {
  return Math.min(WATER_FORMULA.maxFactor, Math.max(WATER_FORMULA.minFactor, f));
}

function calcWateringAdvice(plantType, temp, humidity) {
  const baseMl = BASE_WATER_ML[plantType] || BASE_WATER_ML['กะเพรา'];
  const hasWeather = typeof temp === 'number' && typeof humidity === 'number';
  const t = hasWeather ? temp : WATER_FORMULA.tempRef;
  const h = hasWeather ? humidity : WATER_FORMULA.humidityRef;

  const rawTempFactor = 1 + (t - WATER_FORMULA.tempRef) * WATER_FORMULA.tempStep;
  const tempFactor = clampFactor(rawTempFactor);
  const rawHumidityFactor = 1 - (h - WATER_FORMULA.humidityRef) * WATER_FORMULA.humidityStep;
  const humidityFactor = clampFactor(rawHumidityFactor);
  
  const combinedFactor = tempFactor * humidityFactor;
  const finalMl = Math.round((baseMl * combinedFactor) / 10) * 10;

  let level = 'normal';
  let adviceText = 'ปริมาณน้ำใกล้เคียงปกติ รดน้ำตามรอบที่แนะนำได้เลย';
  if (combinedFactor >= 1.15) { level = 'increase'; adviceText = 'อากาศร้อนและ/หรือแห้งกว่าปกติ ควรรดน้ำเพิ่มขึ้นจากปกติ'; } 
  else if (combinedFactor <= 0.85) { level = 'decrease'; adviceText = 'ความชื้นในอากาศสูงหรืออากาศเย็นกว่าปกติ ควรลดปริมาณน้ำลง'; }

  return { hasWeather, baseMl, temp: t, humidity: h, tempFactor, humidityFactor, combinedFactor, finalMl, level, adviceText };
}

function Weather({ plant, weather, onBack }) {
  const sceneKey = getSceneKey(weather);
  const scene = SCENES[sceneKey];
  const emoji = plantEmoji[plant?.type] || '🌱';

  const wateringAdvice = useMemo(() => calcWateringAdvice(plant?.type, weather?.temp, weather?.humidity), [plant?.type, weather?.temp, weather?.humidity]);

  const [showFormula, setShowFormula] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(false); // ควบคุมการเปิดปิดการ์ด

  // ข้อมูลของตกแต่ง (ดอกไม้, หญ้า, บัวรดน้ำ)
  const groundDecorations = useMemo(() => [
    { id: 'f1', emoji: '🌼', left: '12%', bottom: '25%', size: '1.5rem' },
    { id: 'f2', emoji: '🌸', left: '22%', bottom: '15%', size: '1.8rem' },
    { id: 'f3', emoji: '🌻', left: '85%', bottom: '20%', size: '1.7rem' },
    { id: 'p1', emoji: '🌿', left: '6%', bottom: '38%', size: '2.2rem' },
    { id: 'p2', emoji: '🪴', left: '76%', bottom: '32%', size: '2.0rem' },
    { id: 'tool', emoji: '🚰', left: '65%', bottom: '12%', size: '2.5rem' },
  ], []);

  const stars = useMemo(() => Array.from({ length: 22 }).map((_, i) => ({ id: i, top: Math.round(((i * 37) % 60) + 3), left: Math.round(((i * 61) % 94) + 2), delay: (i % 6) * 0.4, size: (i % 3) + 1 })), []);
  const raindrops = useMemo(() => Array.from({ length: 34 }).map((_, i) => ({ id: i, left: Math.round(((i * 29) % 100)), delay: ((i * 13) % 20) / 10, duration: 0.7 + ((i * 7) % 5) / 10 })), []);
  const clouds = useMemo(() => {
    if (sceneKey === 'cloudy') return [{ top: 12, size: 1.2, duration: 26, delay: 0 }, { top: 26, size: 0.85, duration: 20, delay: 2 }, { top: 8, size: 0.7, duration: 32, delay: 5 }, { top: 34, size: 1, duration: 24, delay: 1 }];
    if (sceneKey === 'rain') return [{ top: 10, size: 1.3, duration: 22, delay: 0 }, { top: 22, size: 1, duration: 18, delay: 3 }];
    if (sceneKey === 'day') return [{ top: 14, size: 0.9, duration: 30, delay: 0 }, { top: 28, size: 0.65, duration: 24, delay: 4 }];
    if (sceneKey === 'hot') return [{ top: 16, size: 0.55, duration: 34, delay: 0 }];
    return [];
  }, [sceneKey]);

  return (
    <motion.div className={`wx-root ${scene.className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <motion.button whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }} className="wx-back-btn" onClick={onBack}>
        ← กลับ
      </motion.button>

      {/* Popup อธิบายสูตรคำนวณน้ำ */}
      <AnimatePresence>
        {showFormula && (
          <motion.div className="wx-formula-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFormula(false)}>
            <motion.div className="wx-formula-modal" initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 20 }} transition={{ type: 'spring', bounce: 0.4 }} onClick={(e) => e.stopPropagation()}>
              <div className="wx-formula-icon">🧮</div>
              <h3 className="wx-display wx-formula-title">สูตรคำนวณปริมาณน้ำ</h3>
              <p className="wx-formula-intro">คำนวณจากปริมาณน้ำฐานของ{plant?.type || 'ต้นไม้'} เทียบกับอุณหภูมิและความชื้นจริงตอนนี้</p>
              <ol className="wx-formula-list">
                <li><span className="wx-formula-step">น้ำฐาน (อากาศปกติ ~28°C, ความชื้น ~50%)</span><span className="wx-formula-eq">{wateringAdvice.baseMl} มล./ครั้ง</span></li>
                <li><span className="wx-formula-step">ตัวคูณอุณหภูมิ = 1 + (อุณหภูมิ − 28) × 0.03</span><span className="wx-formula-eq">1 + ({wateringAdvice.temp}° − 28) × 0.03 = {wateringAdvice.tempFactor.toFixed(2)}</span></li>
                <li><span className="wx-formula-step">ตัวคูณความชื้น = 1 − (ความชื้น − 50) × 0.01</span><span className="wx-formula-eq">1 − ({wateringAdvice.humidity}% − 50) × 0.01 = {wateringAdvice.humidityFactor.toFixed(2)}</span></li>
                <li><span className="wx-formula-step">ปริมาณน้ำแนะนำ = ฐาน × ตัวคูณอุณหภูมิ × ตัวคูณความชื้น</span><span className="wx-formula-eq wx-formula-final">{wateringAdvice.baseMl} × {wateringAdvice.tempFactor.toFixed(2)} × {wateringAdvice.humidityFactor.toFixed(2)} ≈ {wateringAdvice.finalMl} มล.</span></li>
              </ol>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="wx-formula-ok" onClick={() => setShowFormula(false)}>เข้าใจแล้ว</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="wx-sky">
        {(sceneKey === 'day' || sceneKey === 'hot') && (
          <motion.div className={`wx-sun ${sceneKey === 'hot' ? 'wx-sun-hot' : ''}`} animate={{ scale: [1, 1.06, 1], opacity: [0.95, 1, 0.95] }} transition={{ duration: sceneKey === 'hot' ? 2.5 : 4, repeat: Infinity, ease: 'easeInOut' }} />
        )}
        {sceneKey === 'evening' && (
          <>
            <motion.div className="wx-moon" animate={{ opacity: [0.9, 1, 0.9] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
            {stars.map((s) => ( <motion.div key={s.id} className="wx-star" style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size * 3, height: s.size * 3 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.4, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }} /> ))}
          </>
        )}
        {clouds.map((c, i) => (
          <motion.div key={i} className="wx-cloud" style={{ top: `${c.top}%`, transform: `scale(${c.size})` }} initial={{ x: '-20vw' }} animate={{ x: '120vw' }} transition={{ duration: c.duration, repeat: Infinity, ease: 'linear', delay: c.delay }}>
            <span className="wx-cloud-shape" />
          </motion.div>
        ))}
        {sceneKey === 'rain' && raindrops.map((r) => ( <motion.div key={r.id} className="wx-raindrop" style={{ left: `${r.left}%` }} initial={{ y: '-10%', opacity: 0 }} animate={{ y: '110%', opacity: [0, 1, 0] }} transition={{ duration: r.duration, repeat: Infinity, delay: r.delay, ease: 'linear' }} /> ))}
        {sceneKey === 'hot' && <motion.div className="wx-heat-haze" animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />}
      </div>

      <div className="wx-ground">
        <div className="wx-ground-mound" />
        
        {/* เลเยอร์ของตกแต่ง */}
        <div className="wx-decor-layer">
          {groundDecorations.map(d => (
            <div key={d.id} className="wx-decor-item" style={{ left: d.left, bottom: d.bottom, fontSize: d.size }}>{d.emoji}</div>
          ))}
          <div className="wx-decor-item wx-butterfly" style={{ left: '35%', bottom: '65%', fontSize: '1.8rem' }}>🦋</div>
          <div className="wx-decor-item wx-butterfly" style={{ left: '70%', bottom: '75%', fontSize: '1.2rem', animationDelay: '1.5s' }}>🦋</div>
          <div className="wx-grass-line">🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾🌿🌾</div>
        </div>

        <motion.div className="wx-plant-wrap" animate={{ rotate: [-3, 3, -3], y: [0, -4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: 'bottom center' }}>
          <span className="wx-plant-emoji">{emoji}</span>
          <div className="wx-pot" />
        </motion.div>
      </div>

      {/* ปุ่มเปิดข้อมูลย้ายมาซ้ายล่าง */}
      {!showInfoCard && (
        <motion.button
          className="wx-view-info-btn"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowInfoCard(true)}
        >
          ℹ️ ข้อมูลต้นไม้
        </motion.button>
      )}

      {/* การ์ดข้อมูล (Popup) */}
      <AnimatePresence>
        {showInfoCard && (
          <motion.div
            className="wx-info-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInfoCard(false)}
          >
            <motion.div
              className="wx-info-card"
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="wx-close-card-btn" onClick={() => setShowInfoCard(false)}>✕</button>
              
              <div className="wx-info-top">
                <h2 className="wx-display">{plant?.type || 'ต้นไม้'}</h2>
                <span className="wx-scene-chip">{scene.icon} {scene.title}</span>
              </div>
              <p className="wx-info-desc">{scene.desc}</p>

              <div className="wx-stats-row">
                <div className="wx-stat-chip">
                  <span className="wx-stat-icon">🌡️</span>
                  <div className="wx-stat-body">
                    <span className="wx-stat-label">อุณหภูมิ</span>
                    <span className="wx-stat-value">{weather.temp}°C</span>
                  </div>
                </div>
                <div className="wx-stat-chip">
                  <span className="wx-stat-icon">💧</span>
                  <div className="wx-stat-body">
                    <span className="wx-stat-label">ความชื้นในอากาศ</span>
                    <span className="wx-stat-value">{weather.humidity ?? '--'}%</span>
                    <div className="wx-humidity-bar">
                      <motion.div className="wx-humidity-fill" initial={{ width: 0 }} animate={{ width: `${weather.humidity ?? 0}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`wx-water-section wx-water-${wateringAdvice.level}`}>
                <div className="wx-water-top">
                  <span className="wx-water-label">💧 ปริมาณน้ำที่ควรรดวันนี้</span>
                  <button type="button" className="wx-info-btn" onClick={() => setShowFormula(true)} aria-label="ดูวิธีคำนวณ">?</button>
                </div>
                <div className="wx-water-value">
                  {wateringAdvice.finalMl} <span>มล. / ครั้ง</span>
                </div>
                <p className={`wx-water-advice wx-water-advice-${wateringAdvice.level}`}>
                  {wateringAdvice.level === 'increase' && '⬆️ '}
                  {wateringAdvice.level === 'decrease' && '⬇️ '}
                  {wateringAdvice.level === 'normal' && '✅ '}
                  {wateringAdvice.adviceText}
                </p>
              </div>

              <div className="wx-info-meta">
                <span>ระยะ: {plant?.stage}</span>
                <span>วิธีปลูก: {plant?.method}</span>
                <span>{plant?.amount} ต้น</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Weather;