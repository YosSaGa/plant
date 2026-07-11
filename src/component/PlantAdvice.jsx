import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './advice.css';

const plantEmoji = {
  'กะเพรา': '🌿',
  'มะเขือเทศ': '🍅',
  'ว่านหางจระเข้': '🪴',
  'ผักกาดหอม': '🥬',
  'กระบองเพชร': '🌵',
};

// ประเภทงานดูแล
const TASK_TYPES = {
  water: { label: 'รดน้ำ', icon: '💧', color: '#0ea5e9' },
  fertilize: { label: 'ใส่ปุ๋ย', icon: '🌾', color: '#ca8a04' },
  prune: { label: 'ตัดแต่งกิ่ง', icon: '✂️', color: '#db2777' },
  sunlight: { label: 'ย้ายรับแดด', icon: '☀️', color: '#f97316' },
  inspect: { label: 'ตรวจใบ/ศัตรูพืช', icon: '🔍', color: '#65a30d' },
};

// mock: รอบการดูแลพื้นฐาน (ทุกกี่วัน) ของพืชแต่ละชนิด ตอนโตเต็มวัยปกติ
const CARE_PLAN = {
  'กะเพรา': {
    water: 2, fertilize: 14, inspect: 5,
    health: 'แข็งแรงดี',
    tips: ['รดน้ำเช้า-เย็นถ้าอากาศร้อนจัด', 'เด็ดยอดเพื่อกระตุ้นแตกกิ่ง', 'วางในที่แดดรำไร 4-6 ชม./วัน'],
  },
  'มะเขือเทศ': {
    water: 1, fertilize: 10, prune: 12,
    health: 'ต้องการน้ำเพิ่ม',
    tips: ['ปักไม้ค้างเมื่อต้นสูงเกิน 30 ซม.', 'ใส่ปุ๋ยสูตรเสมอทุก 10 วัน', 'ตัดใบล่างที่แตะดินออก'],
  },
  'ว่านหางจระเข้': {
    water: 9, sunlight: 3,
    health: 'แข็งแรงดี',
    tips: ['อย่ารดน้ำถี่เกินไป รากจะเน่า', 'ใช้ดินระบายน้ำดี เช่น ดินกระบองเพชร', 'ชอบแดดจัดแต่ไม่ใช่แดดจ้าทั้งวัน'],
  },
  'ผักกาดหอม': {
    water: 2, fertilize: 7,
    health: 'แข็งแรงดี',
    tips: ['เก็บเกี่ยวใบนอกก่อน ใบในไว้โตต่อ', 'หลีกเลี่ยงแดดจัดตอนเที่ยง', 'พรวนดินเบาๆ ทุกสัปดาห์'],
  },
  'กระบองเพชร': {
    water: 14, sunlight: 4,
    health: 'แข็งแรงดี',
    tips: ['รดน้ำเมื่อดินแห้งสนิทเท่านั้น', 'ทนแดดจัดได้ดี วางกลางแจ้งได้', 'ระวังน้ำขังในกระถางช่วงหน้าฝน'],
  },
};

// ตัวปรับตาม "ระยะการเจริญเติบโต" — เมล็ดต้องดูแลถี่/ใกล้ชิดกว่าต้นโต และยังไม่ต้องทำบางงาน
const STAGE_MODIFIERS = {
  'เมล็ด': {
    health: 'เพิ่งเพาะเมล็ด ต้องดูแลใกล้ชิดเป็นพิเศษ',
    waterFactor: 0.5, // รดน้ำถี่ขึ้น (จำนวนวันต่อรอบน้อยลง)
    disableTasks: ['prune', 'fertilize'], // เมล็ดยังไม่ต้องตัดแต่งหรือใส่ปุ๋ย
    tips: [
      'รดน้ำเป็นละอองฝอยเบาๆ อย่าให้ดินแฉะจนเมล็ดลอย',
      'คลุมด้วยพลาสติกใสหรือกระดาษชื้นช่วยรักษาความชื้นจนกว่าจะงอก',
      'วางในที่แสงรำไร ยังไม่ต้องให้รับแดดจัดจนกว่าจะงอกใบจริง',
    ],
  },
  'ต้นกล้า': {
    health: 'ต้นกล้ากำลังเติบโต ต้องระวังเรื่องแสงและความชื้น',
    waterFactor: 0.75,
    disableTasks: ['prune'], // ต้นกล้ายังเล็กเกินไปที่จะตัดแต่งกิ่ง
    tips: [
      'ค่อยๆ ให้ต้นกล้ารับแดดเพิ่มขึ้นทีละน้อย (Hardening off)',
      'ระวังโรคเน่าคอดินจากความชื้นสะสมมากเกินไป',
      'เริ่มใส่ปุ๋ยสูตรอ่อนๆ เมื่อมีใบจริง 2-3 ใบขึ้นไป',
    ],
  },
  'โตเต็มวัย': {
    health: null, // ใช้ค่า health เดิมของพืชแต่ละชนิดจาก CARE_PLAN
    waterFactor: 1,
    disableTasks: [],
    tips: [],
  },
};

// ตัวปรับตาม "วิธีการปลูก" — กระถางดินแห้งเร็วกว่า ต้องรดน้ำถี่กว่าปลูกลงดิน
const METHOD_MODIFIERS = {
  'กระถาง': {
    waterFactor: 0.85,
    tips: [
      'ดินในกระถางแห้งเร็วกว่าปลูกลงดิน ควรตรวจความชื้นหน้าดินก่อนรดน้ำทุกครั้ง',
      'เลือกกระถางที่มีรูระบายน้ำ ป้องกันรากเน่า',
      'ย้ายกระถางตามทิศแดดได้สะดวกกว่าปลูกลงดิน',
    ],
  },
  'ลงดิน': {
    waterFactor: 1.2,
    tips: [
      'ดินกลางแจ้งเก็บความชื้นได้นานกว่า ลดความถี่การรดน้ำลงได้',
      'พรวนดินรอบโคนต้นเป็นระยะ ช่วยให้รากได้รับอากาศ',
      'หมั่นกำจัดวัชพืชรอบต้น ไม่ให้แย่งน้ำและธาตุอาหารของพืชหลัก',
    ],
  },
};

// รวมค่าจาก CARE_PLAN พื้นฐาน + ปรับตามระยะ + ปรับตามวิธีปลูก ให้เป็นแผนดูแลที่ต่างกันจริงในแต่ละกรณี
function buildCarePlan(plantType, stage, method) {
  const base = CARE_PLAN[plantType] || CARE_PLAN['กะเพรา'];
  const stageMod = STAGE_MODIFIERS[stage] || STAGE_MODIFIERS['โตเต็มวัย'];
  const methodMod = METHOD_MODIFIERS[method] || METHOD_MODIFIERS['กระถาง'];

  const plan = {};
  Object.keys(TASK_TYPES).forEach((key) => {
    if (base[key] == null) return; // งานนี้ไม่เกี่ยวกับพืชชนิดนี้เลย
    if (stageMod.disableTasks.includes(key)) return; // ระยะนี้ยังไม่ต้องทำงานนี้
    const factor = key === 'water' ? stageMod.waterFactor * methodMod.waterFactor : 1;
    plan[key] = Math.max(1, Math.round(base[key] * factor));
  });

  plan.health = stageMod.health || base.health;

  // แยกเคล็ดลับเป็น 3 กลุ่ม เพื่อให้เห็นชัดว่าแตกต่างกันตามระยะ/วิธีปลูก/พืชแต่ละชนิด
  plan.tipGroups = [
    { title: `ตามระยะ: ${stage}`, tips: stageMod.tips },
    { title: `ตามวิธีปลูก: ${method === 'กระถาง' ? 'ปลูกในกระถาง' : 'ปลูกลงดิน'}`, tips: methodMod.tips },
    { title: `เคล็ดลับทั่วไปสำหรับ${plantType}`, tips: base.tips },
  ].filter((g) => g.tips.length > 0);

  return plan;
}

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTH_LABELS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const MONTH_LABELS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
const MONTHS_TO_SHOW = 6;

function buildMonthTasks(plan, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const taskKeys = Object.keys(plan).filter((k) => TASK_TYPES[k]);
  const map = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const tasks = [];
    taskKeys.forEach((key) => {
      const freq = plan[key];
      if (day % freq === 0 || day === 1) tasks.push(key);
    });
    if (tasks.length) map[day] = tasks;
  }
  return { map, daysInMonth };
}

function PlantAdvice({ plant, weather, onBack }) {
  const plantType = plant?.type || 'กะเพรา';
  const stage = plant?.stage || 'โตเต็มวัย';
  const method = plant?.method || 'กระถาง';
  const plan = useMemo(() => buildCarePlan(plantType, stage, method), [plantType, stage, method]);
  const emoji = plantEmoji[plantType] || '🌱';

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const monthList = useMemo(
    () =>
      Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
        const d = new Date(todayYear, todayMonth + i, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),
    [todayYear, todayMonth]
  );

  const monthsData = useMemo(
    () =>
      monthList.map(({ year, month }) => ({
        year,
        month,
        ...buildMonthTasks(plan, year, month),
      })),
    [monthList, plan]
  );

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayDate);

  const [completedTasks, setCompletedTasks] = useState({});

  // State สำหรับ Popup แจ้งเตือนทั่วไป (แทน Toast)
  const [alertData, setAlertData] = useState(null);

  // State สำหรับยืนยันการทำแล้ว/ยังไม่ทำ
  const [pendingConfirm, setPendingConfirm] = useState(null);

  useEffect(() => {
    setCompletedTasks({});
    setPendingConfirm(null);
    setAlertData(null);
    setMonthIndex(0);
    setSelectedDay(todayDate);
  }, [plant?.id]);

  const taskKey = (y, m, d, t) => `${y}-${m}-${d}:${t}`;

  // เช็กว่าเป็นอนาคตหรือไม่
  const isFutureDay = (y, m, d) => {
    const target = new Date(y, m, d);
    const now = new Date(todayYear, todayMonth, todayDate);
    return target.getTime() > now.getTime();
  };

  // เช็กว่าเป็นอดีตที่เลยมาแล้วหรือไม่
  const isPastDay = (y, m, d) => {
    const target = new Date(y, m, d);
    const now = new Date(todayYear, todayMonth, todayDate);
    return target.getTime() < now.getTime();
  };

  // ดับเบิลคลิกที่ "วันในปฏิทิน"
  const handleDayDoubleClick = (y, m, d) => {
    const monthEntry = monthsData.find((entry) => entry.year === y && entry.month === m);
    const tasks = monthEntry?.map[d] || [];

    if (tasks.length === 0) {
      setAlertData({
        title: 'ไม่ต้องทำอะไร',
        desc: `วันที่ ${d} ${MONTH_LABELS[m]} ไม่มีงานที่ต้องดูแล${plantType}เลยนะ พักได้สบายๆ`,
        icon: '🌤️'
      });
      return;
    }

    if (isFutureDay(y, m, d)) {
      setAlertData({
        title: 'ยังไม่ถึงกำหนด',
        desc: 'งานนี้ยังไม่ถึงวันที่ต้องทำ รอให้ถึงวันนั้นก่อนนะ จะได้ไม่ลืมทำ 🌱',
        icon: '⏳'
      });
      return;
    }

    if (isPastDay(y, m, d)) {
      setAlertData({
        title: 'เลยกำหนดแล้ว',
        desc: 'งานนี้เลยกำหนดเวลาไปแล้ว ไม่สามารถติ๊กย้อนหลังได้ 🥀',
        icon: '⚠️'
      });
      return;
    }

    const alreadyDone = tasks.every((t) => completedTasks[taskKey(y, m, d, t)]);
    setPendingConfirm({ y, m, d, tasks, alreadyDone });
  };

  const confirmDayDone = () => {
    if (!pendingConfirm) return;
    const { y, m, d, tasks, alreadyDone } = pendingConfirm;
    setCompletedTasks((prev) => {
      const updated = { ...prev };
      tasks.forEach((t) => {
        updated[taskKey(y, m, d, t)] = !alreadyDone;
      });
      return updated;
    });
    setPendingConfirm(null);
  };

  const cancelConfirm = () => setPendingConfirm(null);

  const goToMonth = (idx) => {
    const clamped = Math.max(0, Math.min(MONTHS_TO_SHOW - 1, idx));
    setMonthIndex(clamped);
    setSelectedDay(clamped === 0 ? todayDate : 1);
  };

  const { year, month, map: taskMap, daysInMonth } = monthsData[monthIndex];

  const firstWeekday = new Date(year, month, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const daysSincePlanted = plant?.plantedAt
    ? Math.max(0, Math.floor((today - new Date(plant.plantedAt)) / (1000 * 60 * 60 * 24)))
    : 0;

  const nextTask = useMemo(() => {
    for (let mi = 0; mi < monthsData.length; mi++) {
      const m = monthsData[mi];
      const startDay = mi === 0 ? todayDate : 1;
      for (let d = startDay; d <= m.daysInMonth; d++) {
        if (m.map[d]) {
          return { day: d, month: m.month, year: m.year, tasks: m.map[d] };
        }
      }
    }
    return null;
  }, [monthsData, todayDate]);

  const selectedTasks = taskMap[selectedDay] || [];

  const pendingMonthLabel = pendingConfirm ? MONTH_LABELS[pendingConfirm.m] : '';
  const pendingIcons = pendingConfirm ? pendingConfirm.tasks.map((t) => TASK_TYPES[t].icon).join(' ') : '';
  const pendingLabels = pendingConfirm ? pendingConfirm.tasks.map((t) => TASK_TYPES[t].label).join(', ') : '';
  const pendingColor = pendingConfirm ? TASK_TYPES[pendingConfirm.tasks[0]].color : '#059669';

  return (
    <motion.div
      className="adv-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* ใช้ createPortal เพื่อโยน Popup ไปที่ document.body ให้ลอยกลางจอเสมอ */}
      {createPortal(
        <>
          <AnimatePresence>
            {alertData && (
              <motion.div
                className="adv-confirm-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAlertData(null)}
              >
                <motion.div
                  className="adv-confirm-modal"
                  initial={{ scale: 0.85, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="adv-confirm-icon adv-confirm-icon-neutral">
                    {alertData.icon}
                  </div>
                  <h3 className="adv-display adv-confirm-title">{alertData.title}</h3>
                  <p className="adv-confirm-desc">{alertData.desc}</p>
                  <div className="adv-confirm-actions">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="adv-confirm-ok adv-confirm-ok-full"
                      onClick={() => setAlertData(null)}
                    >
                      ตกลง
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {pendingConfirm && (
              <motion.div
                className="adv-confirm-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cancelConfirm}
              >
                <motion.div
                  className="adv-confirm-modal"
                  initial={{ scale: 0.85, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="adv-confirm-icon" style={{ '--tc': pendingColor }}>
                    {pendingIcons}
                  </div>
                  <h3 className="adv-display adv-confirm-title">
                    {pendingConfirm.alreadyDone
                      ? 'ยกเลิกการทำเครื่องหมายว่าทำแล้ว?'
                      : 'ยืนยันว่าทำแล้วใช่ไหม?'}
                  </h3>
                  <p className="adv-confirm-desc">
                    วันที่ {pendingConfirm.d} {pendingMonthLabel} · {pendingLabels}
                    {pendingConfirm.alreadyDone
                      ? ' — จะเปลี่ยนกลับเป็นยังไม่ได้ทำ'
                      : ' — เมื่อยืนยันแล้วช่องวันที่นี้จะขึ้นสีเขียว ✓'}
                  </p>
                  <div className="adv-confirm-actions">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="adv-confirm-cancel"
                      onClick={cancelConfirm}
                    >
                      ไม่ใช่
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="adv-confirm-ok"
                      onClick={confirmDayDone}
                    >
                      {pendingConfirm.alreadyDone ? 'ยืนยันยกเลิก' : 'ใช่ ทำแล้ว'}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      <div className="adv-wrap">
        <motion.button whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }} className="adv-back-btn" onClick={onBack}>
          ← กลับ
        </motion.button>

        <motion.header
          className="adv-card adv-header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.3 }}
        >
          <div className="adv-plant-icon">{emoji}</div>
          <div>
            <h1 className="adv-display adv-title">คำแนะนำการดูแล{plantType}</h1>
            <p className="adv-sub">
              ระยะ: {stage} · แบบ: {method} · {plant?.amount || 1} ต้น
            </p>
          </div>
        </motion.header>

        {/* Dashboard cards */}
        <div className="adv-dashboard">
          <motion.div className="adv-card adv-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <span className="adv-stat-label">สภาพอากาศตอนนี้</span>
            <div className="adv-weather-mini-row">
              <span className="adv-stat-value">🌡️ {weather?.temp ?? '--'}°C</span>
              <span className="adv-stat-value">💧 {weather?.humidity ?? '--'}%</span>
            </div>
            <div className="adv-moisture-bar">
              <motion.div
                className="adv-moisture-fill"
                initial={{ width: 0 }}
                animate={{ width: `${weather?.humidity ?? 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          <motion.div className="adv-card adv-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="adv-stat-label">สถานะสุขภาพ</span>
            <span className="adv-stat-value adv-health">🌱 {plan.health}</span>
          </motion.div>

          <motion.div className="adv-card adv-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <span className="adv-stat-label">อายุการปลูก</span>
            <span className="adv-stat-value">{daysSincePlanted} วัน</span>
          </motion.div>

          <motion.div className="adv-card adv-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <span className="adv-stat-label">งานถัดไป</span>
            {nextTask ? (
              <span className="adv-stat-value adv-next-task">
                {nextTask.tasks.map((t) => TASK_TYPES[t].icon).join(' ')} วันที่ {nextTask.day}
                {nextTask.month !== month ? ` ${MONTH_LABELS_SHORT[nextTask.month]}` : ''}
              </span>
            ) : (
              <span className="adv-stat-value">ไม่มีงานใน 6 เดือนนี้</span>
            )}
          </motion.div>
        </div>

        <div className="adv-content">
          {/* ปฏิทิน */}
          <section className="adv-card adv-calendar-card">
            <div className="adv-calendar-nav">
              <h2 className="adv-display adv-section-title adv-calendar-title">
                📅 ปฏิทินดูแล — {MONTH_LABELS[month]} {year + 543}
              </h2>
              <div className="adv-month-arrows">
                <motion.button
                  whileHover={{ scale: monthIndex === 0 ? 1 : 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="adv-arrow-btn"
                  disabled={monthIndex === 0}
                  onClick={() => goToMonth(monthIndex - 1)}
                >
                  ‹
                </motion.button>
                <motion.button
                  whileHover={{ scale: monthIndex === MONTHS_TO_SHOW - 1 ? 1 : 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="adv-arrow-btn"
                  disabled={monthIndex === MONTHS_TO_SHOW - 1}
                  onClick={() => goToMonth(monthIndex + 1)}
                >
                  ›
                </motion.button>
              </div>
            </div>

            <div className="adv-month-pills">
              {monthsData.map((m, idx) => (
                <motion.button
                  key={`${m.year}-${m.month}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`adv-month-pill ${idx === monthIndex ? 'active' : ''}`}
                  onClick={() => goToMonth(idx)}
                >
                  {MONTH_LABELS_SHORT[m.month]} {String(m.year + 543).slice(-2)}
                </motion.button>
              ))}
            </div>

            <div className="adv-legend">
              {Object.entries(TASK_TYPES)
                .filter(([key]) => plan[key])
                .map(([key, t]) => (
                  <span key={key} className="adv-legend-item" style={{ '--tc': t.color }}>
                    <span className="adv-legend-dot" />
                    {t.icon} {t.label}
                  </span>
                ))}
            </div>

            <p className="adv-calendar-hint">💡 ดับเบิลคลิกที่วันในปฏิทินเพื่อทำเครื่องหมายว่าทำแล้ว</p>

            <div className="adv-weekday-row">
              {DAY_LABELS.map((d) => (
                <div key={d} className="adv-weekday">{d}</div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={monthIndex}
                className="adv-grid"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {leadingBlanks.map((_, i) => (
                  <div key={`blank-${i}`} className="adv-cell adv-cell-blank" />
                ))}
                {dayCells.map((day) => {
                  const tasks = taskMap[day] || [];
                  const isToday = monthIndex === 0 && day === todayDate;
                  const isSelected = day === selectedDay;
                  const isDone = tasks.length > 0 && tasks.every((t) => completedTasks[taskKey(year, month, day, t)]);
                  return (
                    <motion.button
                      key={day}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      className={`adv-cell ${isToday ? 'adv-cell-today' : ''} ${isSelected ? 'adv-cell-selected' : ''} ${isDone ? 'adv-cell-done' : ''}`}
                      onClick={() => setSelectedDay(day)}
                      onDoubleClick={() => handleDayDoubleClick(year, month, day)}
                    >
                      <span className="adv-cell-day">{day}</span>
                      {tasks.length > 0 && (
                        <span className="adv-cell-dots">
                          {tasks.map((t) => (
                            <span key={t} className="adv-dot" style={{ background: TASK_TYPES[t].color }} />
                          ))}
                        </span>
                      )}
                      {isDone && <span className="adv-cell-check">✓</span>}
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </section>

          {/* งานของวันที่เลือก + เคล็ดลับ */}
          <div className="adv-side">
            <section className="adv-card adv-day-card">
              <h3 className="adv-display adv-section-title-sm">
                🗓️ วันที่ {selectedDay} {MONTH_LABELS[month]}
              </h3>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedTasks.length === 0 ? (
                    <p className="adv-empty-day">ไม่มีงานที่ต้องทำในวันนี้ 🌤️</p>
                  ) : (
                    <ul className="adv-task-list">
                      {selectedTasks.map((t) => {
                        const done = !!completedTasks[taskKey(year, month, selectedDay, t)];
                        return (
                          <li
                            key={t}
                            className={`adv-task-item ${done ? 'adv-task-done' : ''}`}
                            style={{ '--tc': TASK_TYPES[t].color }}
                          >
                            <span className={`adv-task-check ${done ? 'checked' : ''}`}>{done ? '✓' : ''}</span>
                            <span className="adv-task-icon">{TASK_TYPES[t].icon}</span>
                            <span className="adv-task-label">{TASK_TYPES[t].label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>

            <section className="adv-card adv-tips-card">
              <h3 className="adv-display adv-section-title-sm">💡 เคล็ดลับการดูแล{plantType}</h3>
              {plan.tipGroups.map((group) => (
                <div key={group.title} className="adv-tips-group">
                  <p className="adv-tips-group-title">{group.title}</p>
                  <ul className="adv-tips-list">
                    {group.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PlantAdvice;
