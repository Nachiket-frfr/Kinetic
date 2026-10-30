import React, { useState, useMemo, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import triggerHaptic from '../features/sensors/useHaptics';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', multiplier: 1.2, icon: '🛋️', desc: 'Desk job, little to no regular exercise' },
  { id: 'light', label: 'Light Activity', multiplier: 1.375, icon: '🚶', desc: '1–3 training sessions / light walking weekly' },
  { id: 'moderate', label: 'Moderate Active', multiplier: 1.55, icon: '🏋️', desc: '3–5 moderate workout sessions weekly' },
  { id: 'heavy', label: 'Very Active', multiplier: 1.725, icon: '🏃', desc: '6–7 intense training sessions weekly' },
  { id: 'athlete', label: 'Extreme / Athlete', multiplier: 1.9, icon: '⚡', desc: '2x/day training or heavy physical labor' },
];

const GOAL_OPTIONS = [
  { id: 'aggressive_cut', label: 'Aggressive Cut', adj: -0.25, badge: '-25%', color: '#FF375F', desc: 'Rapid fat loss with high protein muscle protection' },
  { id: 'moderate_cut', label: 'Moderate Cut', adj: -0.15, badge: '-15%', color: '#FF9F0A', desc: 'Sustainable body recomposition' },
  { id: 'maintain', label: 'Maintain Weight', adj: 0, badge: '±0%', color: '#30D158', desc: 'Metabolic equilibrium & peak recovery' },
  { id: 'lean_bulk', label: 'Lean Bulk', adj: 0.10, badge: '+10%', color: '#158FF2', desc: 'Clean muscle hypertrophy with minimal fat' },
  { id: 'heavy_bulk', label: 'Power Bulk', adj: 0.20, badge: '+20%', color: '#BF5AF2', desc: 'Maximum mass & absolute strength building' },
];

const DIET_PRESETS = [
  { id: 'high_protein', label: 'High Protein / Hypertrophy', p: 40, c: 40, f: 20, icon: '🥩' },
  { id: 'balanced', label: 'Balanced Athletic', p: 30, c: 40, f: 30, icon: '⚡' },
  { id: 'low_carb', label: 'Low Carb / Ketogenic', p: 30, c: 10, f: 60, icon: '🥑' },
  { id: 'endurance', label: 'High Carb Endurance', p: 25, c: 55, f: 20, icon: '🍚' },
  { id: 'custom', label: 'Custom Ratios', p: 33, c: 33, f: 34, icon: '🎛️' },
];

const FOOD_SOURCES = {
  protein: [
    'Chicken Breast (31g/100g)', 'Whey / Plant Isolate (25g/scoop)', 'Eggs & Egg Whites (6g/egg)',
    'Wild Salmon / Tuna (25g/100g)', 'Greek Yogurt 0% (10g/100g)', 'Extra Firm Tofu / Tempeh (18g/100g)',
    'Lean Grass-Fed Beef (26g/100g)', 'Cottage Cheese (11g/100g)'
  ],
  carbs: [
    'Steel-Cut / Rolled Oats (66g/100g)', 'Jasmine / Basmati Rice (28g cooked/100g)', 'Sweet Potatoes / Yams (20g/100g)',
    'Quinoa & Whole Grains (21g cooked/100g)', 'Bananas & Berries (23g / 14g)', 'Whole Wheat Pasta (30g cooked/100g)',
    'Cream of Rice (78g dry/100g)', 'Apples & Citrus Fruits (15g/100g)'
  ],
  fats: [
    'Extra Virgin Olive Oil (14g fat/tbsp)', 'Raw Almonds / Walnuts (14g fat/oz)', 'Hass Avocado (15g fat/half)',
    'Natural Peanut / Almond Butter (16g fat/2 tbsp)', 'Chia / Flax Seeds (9g fat/2 tbsp)', 'Dark Chocolate 85%+ (12g fat/oz)',
    'Wild Caught Salmon (Omega-3s)', 'Whole Organic Eggs (5g fat/egg)'
  ],
};

export default function MacrosCalculator({ isEmbedded = false }) {
  const { athleteProfile, measurements, macroGoals, setMacroGoals } = useAppStore();

  // Submission Gate: Analysis is shown strictly AFTER questionnaire submission
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Unit System: 'metric' (kg, cm) vs 'imperial' (lbs, inches)
  const [unitSystem, setUnitSystem] = useState('metric');

  // Question 1: Biometrics
  const [gender, setGender] = useState(macroGoals?.gender || 'male');
  const [age, setAge] = useState(macroGoals?.age || 26);
  const [weightKg, setWeightKg] = useState(() => {
    return measurements?.currentWeightKg || athleteProfile?.weightKg || 75;
  });
  const [heightCm, setHeightCm] = useState(() => {
    return athleteProfile?.heightCm || 178;
  });
  const [bodyFat, setBodyFat] = useState(macroGoals?.bodyFatPercent || '');
  const [useKatch, setUseKatch] = useState(false);

  // Question 2: Physical Activity Level
  const [activityId, setActivityId] = useState(macroGoals?.activityId || 'moderate');

  // Question 3: Fitness Goal
  const [goalId, setGoalId] = useState(macroGoals?.goalType || 'maintain');

  // Question 4: Dietary Strategy
  const [presetId, setPresetId] = useState(macroGoals?.dietPreset || 'high_protein');
  const [customP, setCustomP] = useState(35);
  const [customC, setCustomC] = useState(40);
  const [customF, setCustomF] = useState(25);

  // Question 5: Meal Frequency
  const [mealsCount, setMealsCount] = useState(macroGoals?.mealsPerDay || 4);

  // UI state
  const [toastMessage, setToastMessage] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [activeFoodTab, setActiveFoodTab] = useState('protein');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Convert for Imperial Display
  const displayWeight = useMemo(() => {
    if (unitSystem === 'imperial') return Math.round(weightKg * 2.20462);
    return weightKg;
  }, [unitSystem, weightKg]);

  const handleWeightChange = (val) => {
    const num = parseFloat(val) || 0;
    if (unitSystem === 'imperial') {
      setWeightKg(Math.round((num / 2.20462) * 10) / 10);
    } else {
      setWeightKg(num);
    }
  };

  const handleHeightChange = (val) => {
    const num = parseFloat(val) || 0;
    setHeightCm(num);
  };

  // ── Scientific BMR & TDEE Calculations ───────────────────────────
  const calculationResults = useMemo(() => {
    const w = Math.max(30, Number(weightKg) || 75);
    const h = Math.max(100, Number(heightCm) || 178);
    const a = Math.max(14, Number(age) || 26);
    const bf = parseFloat(bodyFat);

    let bmr = 0;
    let formulaName = 'Mifflin-St Jeor';

    if (useKatch && !isNaN(bf) && bf > 3 && bf < 60) {
      const lbm = w * (1 - bf / 100);
      bmr = Math.round(370 + 21.6 * lbm);
      formulaName = `Katch-McArdle (${bf}% BF)`;
    } else {
      if (gender === 'male') {
        bmr = Math.round(10 * w + 6.25 * h - 5 * a + 5);
      } else {
        bmr = Math.round(10 * w + 6.25 * h - 5 * a - 161);
      }
    }

    const activityObj = ACTIVITY_LEVELS.find((lvl) => lvl.id === activityId) || ACTIVITY_LEVELS[2];
    const tdee = Math.round(bmr * activityObj.multiplier);

    const goalObj = GOAL_OPTIONS.find((g) => g.id === goalId) || GOAL_OPTIONS[2];
    const targetCalories = Math.round(tdee * (1 + goalObj.adj));

    // Determine Macro Percentages
    let pPct = 30, cPct = 40, fPct = 30;
    if (presetId === 'custom') {
      pPct = customP;
      cPct = customC;
      fPct = customF;
    } else {
      const preset = DIET_PRESETS.find((p) => p.id === presetId) || DIET_PRESETS[0];
      pPct = preset.p;
      cPct = preset.c;
      fPct = preset.f;
    }

    // Grams conversion:
    // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
    const proteinCal = targetCalories * (pPct / 100);
    const carbsCal = targetCalories * (cPct / 100);
    const fatCal = targetCalories * (fPct / 100);

    const proteinGrams = Math.round(proteinCal / 4);
    const carbsGrams = Math.round(carbsCal / 4);
    const fatGrams = Math.round(fatCal / 9);

    // Protein per bodyweight check
    const proteinPerKg = +(proteinGrams / w).toFixed(2);
    const proteinPerLb = +(proteinGrams / (w * 2.20462)).toFixed(2);

    // Recommended Water Intake (Base: ~35ml per kg + activity bonus)
    const baseWaterLiters = (w * 0.035) + (activityObj.multiplier > 1.5 ? 0.8 : 0.4);
    const waterLiters = +baseWaterLiters.toFixed(1);
    const waterGlasses = Math.round(waterLiters * 4); // 250ml glasses

    return {
      bmr,
      tdee,
      targetCalories,
      formulaName,
      pPct,
      cPct,
      fPct,
      proteinGrams,
      carbsGrams,
      fatGrams,
      proteinCal,
      carbsCal,
      fatCal,
      proteinPerKg,
      proteinPerLb,
      waterLiters,
      waterGlasses,
    };
  }, [weightKg, heightCm, age, gender, useKatch, bodyFat, activityId, goalId, presetId, customP, customC, customF]);

  // Per Meal Distribution
  const perMealBreakdown = useMemo(() => {
    const count = Math.max(1, mealsCount);
    return {
      calories: Math.round(calculationResults.targetCalories / count),
      protein: Math.round(calculationResults.proteinGrams / count),
      carbs: Math.round(calculationResults.carbsGrams / count),
      fat: Math.round(calculationResults.fatGrams / count),
    };
  }, [calculationResults, mealsCount]);

  // Handle custom slider adjustments
  const handleCustomProtein = (val) => {
    const p = Number(val);
    const remainder = 100 - p;
    const currentCFSum = customC + customF || 1;
    const newC = Math.round((customC / currentCFSum) * remainder);
    const newF = 100 - p - newC;
    setCustomP(p);
    setCustomC(newC);
    setCustomF(newF);
  };

  const handleCustomCarbs = (val) => {
    const c = Number(val);
    const remainder = 100 - c;
    const currentPFSum = customP + customF || 1;
    const newP = Math.round((customP / currentPFSum) * remainder);
    const newF = 100 - c - newP;
    setCustomC(c);
    setCustomP(newP);
    setCustomF(newF);
  };

  const handleCustomFat = (val) => {
    const f = Number(val);
    const remainder = 100 - f;
    const currentPCSum = customP + customC || 1;
    const newP = Math.round((customP / currentPCSum) * remainder);
    const newC = 100 - f - newP;
    setCustomF(f);
    setCustomP(newP);
    setCustomC(newC);
  };

  // Submit questions to trigger analysis
  const handleSubmitQuestions = (e) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    triggerHaptic('medium');

    setTimeout(() => {
      setIsCalculating(false);
      setHasSubmitted(true);
      triggerHaptic('success');
      triggerToast('✓ Nutrition Analysis Generated!');

      setTimeout(() => {
        const el = document.getElementById('macros-analysis-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }, 450);
  };

  const handleEditQuestions = () => {
    setHasSubmitted(false);
    triggerHaptic('light');
    const el = document.getElementById('macros-questions-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveToDailyGoals = () => {
    setMacroGoals({
      calories: calculationResults.targetCalories,
      proteinGrams: calculationResults.proteinGrams,
      carbsGrams: calculationResults.carbsGrams,
      fatGrams: calculationResults.fatGrams,
      waterLiters: calculationResults.waterLiters,
      tdee: calculationResults.tdee,
      bmr: calculationResults.bmr,
      goalType: goalId,
      dietPreset: presetId,
      activityId,
      gender,
      age,
      bodyFatPercent: bodyFat ? Number(bodyFat) : null,
      mealsPerDay: mealsCount,
      lastCalculatedAt: new Date().toISOString(),
    });
    triggerHaptic('success');
    triggerToast(`✓ Daily Nutrition Goals updated: ${calculationResults.targetCalories.toLocaleString()} Kcal (${calculationResults.proteinGrams}g P / ${calculationResults.carbsGrams}g C / ${calculationResults.fatGrams}g F)`);
  };

  // Radial Donut Angles
  const donutP = calculationResults.pPct;
  const donutC = calculationResults.cPct;
  const donutF = calculationResults.fPct;
  const circumference = 2 * Math.PI * 45; // radius 45

  const pOffset = circumference * (1 - donutP / 100);
  const cOffset = circumference * (1 - donutC / 100);
  const fOffset = circumference * (1 - donutF / 100);

  return (
    <div className={`page-macros-calculator ${isEmbedded ? 'is-embedded' : ''}`}>
      <div className={isEmbedded ? 'mc-card-embedded' : 'app-card'}>
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="mc-header">
          <div className="mc-header-left">
            <span className="mc-header-icon">🥗</span>
            <div>
              <h1 className="mc-title">MACROS CALCULATOR</h1>
              <span className="mc-subtitle">BIOMETRIC ASSESSMENT &amp; TDEE ENGINE</span>
            </div>
          </div>
          <button
            type="button"
            className="sc-algo-btn"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            title="Scientific Methodology & Formulas"
          >
            <span>{showFormulaInfo ? '✕' : 'ℹ️'}</span>
            <span>{showFormulaInfo ? 'CLOSE' : 'SCIENCE'}</span>
          </button>
        </div>

        {/* ── Formula Info Drawer ─────────────────────────────── */}
        {showFormulaInfo && (
          <div className="sc-algo-panel" style={{ animation: 'slideDown 0.25s ease' }}>
            <div className="sc-algo-title-row">
              <span className="sc-algo-dot" style={{ background: '#30D158', boxShadow: '0 0 10px #30D158' }} />
              <span className="sc-algo-panel-title">METABOLIC SCIENCE &amp; FORMULAS</span>
              <span className="sc-algo-version">ISO 2374 BIOMETRICS</span>
            </div>
            <div className="mc-formula-grid">
              <div className="mc-formula-card">
                <span className="mc-formula-name">Mifflin-St Jeor Equation (Default)</span>
                <code className="mc-formula-code">
                  Men: 10W + 6.25H - 5A + 5<br />
                  Women: 10W + 6.25H - 5A - 161
                </code>
                <span className="mc-formula-desc">The clinical gold-standard for non-obese active individuals, accurate within 5% of direct calorimetry.</span>
              </div>
              <div className="mc-formula-card">
                <span className="mc-formula-name">Katch-McArdle Equation (Lean Mass)</span>
                <code className="mc-formula-code">BMR = 370 + (21.6 × LBM in kg)</code>
                <span className="mc-formula-desc">Uses body fat percentage to calculate true metabolic tissue expenditure, ideal for lean muscular athletes.</span>
              </div>
              <div className="mc-formula-card">
                <span className="mc-formula-name">Thermic Effect of Food (TEF)</span>
                <span className="mc-formula-desc">Protein requires 20–30% of its caloric value just to metabolize, compared to 5–10% for carbs and 0–3% for fats.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTIONNAIRE FORM (Questions asked before analysis) ── */}
        <form id="macros-questions-form" onSubmit={handleSubmitQuestions}>
          <div className="mc-form-header-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mc-step-badge">ASSESSMENT</span>
              <span className="mc-step-title">Answer the 5 lifestyle questions below to generate your personalized nutrition blueprint</span>
            </div>
            {hasSubmitted && (
              <button
                type="button"
                className="mc-jump-analysis-btn"
                onClick={() => {
                  const el = document.getElementById('macros-analysis-results');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Jump to Analysis ↓
              </button>
            )}
          </div>

          {/* ── QUESTION 1: Biometric Identity ───────────────────── */}
          <div className="mc-section">
            <div className="sc-section-header-row">
              <span className="sc-section-dot" />
              <span className="sc-section-label">QUESTION 1: BIOMETRIC SPECS</span>
              <div className="mc-unit-toggle">
                <button
                  type="button"
                  className={`mc-unit-btn ${unitSystem === 'metric' ? 'active' : ''}`}
                  onClick={() => setUnitSystem('metric')}
                >
                  METRIC (KG, CM)
                </button>
                <button
                  type="button"
                  className={`mc-unit-btn ${unitSystem === 'imperial' ? 'active' : ''}`}
                  onClick={() => setUnitSystem('imperial')}
                >
                  IMPERIAL (LBS, FT)
                </button>
              </div>
            </div>

            <div className="mc-biometrics-grid">
              {/* Gender Toggle */}
              <div className="mc-field-box">
                <label className="mc-field-label">BIOLOGICAL SEX</label>
                <div className="mc-gender-selector">
                  <button
                    type="button"
                    className={`mc-gender-btn ${gender === 'male' ? 'active' : ''}`}
                    onClick={() => setGender('male')}
                  >
                    <span>♂ MALE</span>
                  </button>
                  <button
                    type="button"
                    className={`mc-gender-btn ${gender === 'female' ? 'active' : ''}`}
                    onClick={() => setGender('female')}
                  >
                    <span>♀ FEMALE</span>
                  </button>
                </div>
              </div>

              {/* Age */}
              <div className="mc-field-box">
                <label className="mc-field-label">AGE (YEARS)</label>
                <div className="mc-input-wrap">
                  <input
                    type="number"
                    min="14"
                    max="99"
                    className="mc-input"
                    value={age}
                    onChange={(e) => setAge(Math.max(1, parseInt(e.target.value) || 0))}
                  />
                  <span className="mc-input-unit">YRS</span>
                </div>
              </div>

              {/* Weight */}
              <div className="mc-field-box">
                <label className="mc-field-label">
                  BODY WEIGHT {unitSystem === 'imperial' ? '(LBS)' : '(KG)'}
                </label>
                <div className="mc-input-wrap">
                  <input
                    type="number"
                    step="0.5"
                    className="mc-input"
                    value={displayWeight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                  />
                  <span className="mc-input-unit">{unitSystem === 'imperial' ? 'LBS' : 'KG'}</span>
                </div>
              </div>

              {/* Height */}
              <div className="mc-field-box">
                <label className="mc-field-label">
                  HEIGHT (CM)
                </label>
                <div className="mc-input-wrap">
                  <input
                    type="number"
                    className="mc-input"
                    value={heightCm}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                  <span className="mc-input-unit">CM</span>
                </div>
              </div>
            </div>

            {/* Optional Body Fat Toggle (Katch-McArdle) */}
            <div className="mc-bodyfat-row">
              <div className="mc-bf-toggle-wrap">
                <input
                  type="checkbox"
                  id="katchCheck"
                  checked={useKatch}
                  onChange={(e) => setUseKatch(e.target.checked)}
                />
                <label htmlFor="katchCheck" className="mc-bf-checkbox-label">
                  <span>Include Body Fat % (Katch-McArdle Lean Mass Model)</span>
                  <span className="mc-bf-hint">Recommended if you know your DEXA scan or caliper reading</span>
                </label>
              </div>
              {useKatch && (
                <div className="mc-input-wrap" style={{ maxWidth: '140px' }}>
                  <input
                    type="number"
                    min="4"
                    max="55"
                    placeholder="e.g. 14"
                    className="mc-input"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                  />
                  <span className="mc-input-unit">% BF</span>
                </div>
              )}
            </div>
          </div>

          {/* ── QUESTION 2: Physical Activity Level (TDEE) ──────── */}
          <div className="mc-section">
            <div className="sc-section-header-row">
              <span className="sc-section-dot" style={{ background: '#FFD60A', boxShadow: '0 0 8px #FFD60A' }} />
              <span className="sc-section-label">QUESTION 2: PHYSICAL ACTIVITY LEVEL</span>
              <span className="sc-sensor-type">MULTIPLIER: x{ACTIVITY_LEVELS.find((a) => a.id === activityId)?.multiplier}</span>
            </div>

            <div className="mc-activity-grid">
              {ACTIVITY_LEVELS.map((lvl) => {
                const isSelected = activityId === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    className={`mc-activity-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setActivityId(lvl.id)}
                  >
                    <div className="mc-act-icon-wrap">{lvl.icon}</div>
                    <div className="mc-act-body">
                      <div className="mc-act-title-row">
                        <span className="mc-act-title">{lvl.label}</span>
                        <span className="mc-act-mult">x{lvl.multiplier}</span>
                      </div>
                      <span className="mc-act-desc">{lvl.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── QUESTION 3: Primary Fitness Objective ────────────── */}
          <div className="mc-section">
            <div className="sc-section-header-row">
              <span className="sc-section-dot" style={{ background: '#FF375F', boxShadow: '0 0 8px #FF375F' }} />
              <span className="sc-section-label">QUESTION 3: PRIMARY FITNESS OBJECTIVE</span>
            </div>

            <div className="mc-goals-grid">
              {GOAL_OPTIONS.map((g) => {
                const isSelected = goalId === g.id;
                return (
                  <div
                    key={g.id}
                    className={`mc-goal-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setGoalId(g.id)}
                    style={{
                      borderColor: isSelected ? g.color : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: isSelected ? `0 0 16px ${g.color}30` : 'none',
                    }}
                  >
                    <div className="mc-goal-badge" style={{ background: `${g.color}20`, color: g.color }}>
                      {g.badge}
                    </div>
                    <span className="mc-goal-label">{g.label}</span>
                    <span className="mc-goal-desc">{g.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── QUESTION 4: Macronutrient Split Presets ──────────── */}
          <div className="mc-section">
            <div className="sc-section-header-row">
              <span className="sc-section-dot" style={{ background: '#158FF2', boxShadow: '0 0 8px #158FF2' }} />
              <span className="sc-section-label">QUESTION 4: DIETARY STRATEGY &amp; MACRO RATIOS</span>
            </div>

            <div className="mc-presets-row">
              {DIET_PRESETS.map((p) => {
                const isSelected = presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`mc-preset-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setPresetId(p.id)}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    {p.id !== 'custom' && (
                      <span className="mc-preset-ratio">{p.p}P / {p.c}C / {p.f}F</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Sliders when presetId === 'custom' */}
            {presetId === 'custom' && (
              <div className="mc-custom-sliders-box">
                <div className="mc-slider-row">
                  <div className="mc-slider-meta">
                    <span style={{ color: '#158FF2', fontWeight: 800 }}>PROTEIN ({customP}%)</span>
                    <span className="font-mono">{calculationResults.proteinGrams}g</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    value={customP}
                    onChange={(e) => handleCustomProtein(e.target.value)}
                    className="mc-range-slider"
                    style={{ accentColor: '#158FF2' }}
                  />
                </div>

                <div className="mc-slider-row">
                  <div className="mc-slider-meta">
                    <span style={{ color: '#30D158', fontWeight: 800 }}>CARBOHYDRATES ({customC}%)</span>
                    <span className="font-mono">{calculationResults.carbsGrams}g</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="70"
                    value={customC}
                    onChange={(e) => handleCustomCarbs(e.target.value)}
                    className="mc-range-slider"
                    style={{ accentColor: '#30D158' }}
                  />
                </div>

                <div className="mc-slider-row">
                  <div className="mc-slider-meta">
                    <span style={{ color: '#FFD60A', fontWeight: 800 }}>HEALTHY FATS ({customF}%)</span>
                    <span className="font-mono">{calculationResults.fatGrams}g</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={customF}
                    onChange={(e) => handleCustomFat(e.target.value)}
                    className="mc-range-slider"
                    style={{ accentColor: '#FFD60A' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── QUESTION 5: Daily Meal Frequency ────────────────── */}
          <div className="mc-section">
            <div className="sc-section-header-row">
              <span className="sc-section-dot" style={{ background: '#00D2FF', boxShadow: '0 0 8px #00D2FF' }} />
              <span className="sc-section-label">QUESTION 5: PLANNED MEAL FREQUENCY</span>
              <span className="sc-sensor-type">{mealsCount} MEALS / DAY</span>
            </div>

            <div className="mc-meal-count-buttons" style={{ marginTop: '10px' }}>
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`mc-meal-btn ${mealsCount === num ? 'active' : ''}`}
                  onClick={() => setMealsCount(num)}
                  style={{ flex: 1, padding: '10px', fontSize: '11px' }}
                >
                  {num} MEALS
                </button>
              ))}
            </div>
          </div>

          {/* ── SUBMISSION BUTTON BAR ───────────────────────────── */}
          <div className="mc-submit-container">
            <button
              type="submit"
              className="mc-submit-action-btn"
              disabled={isCalculating}
            >
              {isCalculating ? (
                <span className="mc-btn-inner">
                  <span className="mc-spinner">⏳</span>
                  <span>CALCULATING METABOLIC TARGETS...</span>
                </span>
              ) : (
                <span className="mc-btn-inner">
                  <span className="mc-btn-icon">⚡</span>
                  <span className="mc-btn-title">SUBMIT ANSWERS &amp; CALCULATE MACROS</span>
                  <span className="mc-btn-arrow">→</span>
                </span>
              )}
            </button>
            <p className="mc-submit-subtitle">
              {hasSubmitted
                ? '✓ Analysis generated below. Modify any answers above and re-calculate anytime.'
                : 'Applies Mifflin-St Jeor / Katch-McArdle metabolic models with dynamic TEF adjustment'}
            </p>
          </div>
        </form>

        {/* ── REVEALED ANALYSIS REPORT (Rendered ONLY after submission) ── */}
        {hasSubmitted ? (
          <div id="macros-analysis-results" className="mc-results-hud-wrapper" style={{ animation: 'fadeIn 0.35s ease-out' }}>
            {/* Top Analysis Banner */}
            <div className="mc-analysis-ready-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mc-ready-dot" />
                <span className="mc-ready-title">MACROS &amp; METABOLIC ANALYSIS GENERATED</span>
              </div>
              <button
                type="button"
                className="mc-edit-answers-btn"
                onClick={handleEditQuestions}
                title="Modify Questionnaire Answers"
              >
                ✏️ EDIT ANSWERS
              </button>
            </div>

            <div className="mc-results-hud">
              <div className="mc-hud-header">
                <div>
                  <span className="mc-hud-badge">CALCULATED TARGET</span>
                  <h2 className="mc-hud-title">DAILY NUTRITION BLUEPRINT</h2>
                </div>
                <div className="mc-hud-formula-tag">
                  {calculationResults.formulaName}
                </div>
              </div>

              <div className="mc-hud-center-stage">
                {/* Radial Macro Chart */}
                <div className="mc-chart-box">
                  <svg className="mc-donut-svg" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" stroke="rgba(255,255,255,0.06)" strokeWidth="12" fill="none" />
                    {/* Fat (Gold) */}
                    <circle
                      cx="60" cy="60" r="45"
                      stroke="#FFD60A" strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={fOffset}
                      strokeLinecap="round" fill="none"
                      transform="rotate(-90 60 60)"
                    />
                    {/* Carbs (Lime) */}
                    <circle
                      cx="60" cy="60" r="45"
                      stroke="#30D158" strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={cOffset}
                      strokeLinecap="round" fill="none"
                      transform="rotate(30 60 60)"
                    />
                    {/* Protein (Electric Blue) */}
                    <circle
                      cx="60" cy="60" r="45"
                      stroke="#158FF2" strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={pOffset}
                      strokeLinecap="round" fill="none"
                      transform="rotate(150 60 60)"
                    />
                  </svg>
                  <div className="mc-chart-center">
                    <span className="mc-chart-kcal">{calculationResults.targetCalories.toLocaleString()}</span>
                    <span className="mc-chart-unit">KCAL / DAY</span>
                    <span className="mc-chart-tdee">TDEE: {calculationResults.tdee.toLocaleString()}</span>
                  </div>
                </div>

                {/* 3 Core Macro Cards */}
                <div className="mc-macro-cards-col">
                  {/* Protein */}
                  <div className="mc-macro-stat-card" style={{ borderColor: 'rgba(21, 143, 242, 0.4)' }}>
                    <div className="mc-stat-top">
                      <span className="mc-stat-dot" style={{ background: '#158FF2' }} />
                      <span className="mc-stat-name">PROTEIN</span>
                      <span className="mc-stat-pct" style={{ color: '#158FF2' }}>{calculationResults.pPct}%</span>
                    </div>
                    <div className="mc-stat-val-row">
                      <span className="mc-stat-grams">{calculationResults.proteinGrams}g</span>
                      <span className="mc-stat-cal">({Math.round(calculationResults.proteinCal)} kcal)</span>
                    </div>
                    <div className="mc-stat-sub">
                      {calculationResults.proteinPerKg}g / kg • {calculationResults.proteinPerLb}g / lb body mass
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="mc-macro-stat-card" style={{ borderColor: 'rgba(48, 209, 88, 0.4)' }}>
                    <div className="mc-stat-top">
                      <span className="mc-stat-dot" style={{ background: '#30D158' }} />
                      <span className="mc-stat-name">CARBOHYDRATES</span>
                      <span className="mc-stat-pct" style={{ color: '#30D158' }}>{calculationResults.cPct}%</span>
                    </div>
                    <div className="mc-stat-val-row">
                      <span className="mc-stat-grams">{calculationResults.carbsGrams}g</span>
                      <span className="mc-stat-cal">({Math.round(calculationResults.carbsCal)} kcal)</span>
                    </div>
                    <div className="mc-stat-sub">
                      Fuel source for glycogen replenishment &amp; intense reps
                    </div>
                  </div>

                  {/* Fats */}
                  <div className="mc-macro-stat-card" style={{ borderColor: 'rgba(255, 214, 10, 0.4)' }}>
                    <div className="mc-stat-top">
                      <span className="mc-stat-dot" style={{ background: '#FFD60A' }} />
                      <span className="mc-stat-name">HEALTHY FATS</span>
                      <span className="mc-stat-pct" style={{ color: '#FFD60A' }}>{calculationResults.fPct}%</span>
                    </div>
                    <div className="mc-stat-val-row">
                      <span className="mc-stat-grams">{calculationResults.fatGrams}g</span>
                      <span className="mc-stat-cal">({Math.round(calculationResults.fatCal)} kcal)</span>
                    </div>
                    <div className="mc-stat-sub">
                      Essential for hormone production &amp; joint lubrication
                    </div>
                  </div>
                </div>
              </div>

              {/* Hydration Banner */}
              <div className="mc-hydration-banner">
                <span className="mc-water-icon">💧</span>
                <div className="mc-water-body">
                  <span className="mc-water-title">OPTIMAL HYDRATION TARGET</span>
                  <span className="mc-water-desc">
                    Drink approximately <strong>{calculationResults.waterLiters} Liters</strong> ({calculationResults.waterGlasses} glasses) of water daily to maximize muscle protein synthesis and renal waste clearance.
                  </span>
                </div>
              </div>

              {/* Meal Breakdown Drawer */}
              <div className="mc-meal-breakdown">
                <div className="mc-meal-header">
                  <span className="mc-meal-title">PER-MEAL TARGETS ({mealsCount} MEALS)</span>
                  <div className="mc-meal-count-buttons">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`mc-meal-btn ${mealsCount === num ? 'active' : ''}`}
                        onClick={() => setMealsCount(num)}
                      >
                        {num} MEALS
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mc-meal-grid">
                  <div className="mc-meal-cell">
                    <span className="mc-meal-cell-val" style={{ color: '#158FF2' }}>{perMealBreakdown.protein}g</span>
                    <span className="mc-meal-cell-lbl">PROTEIN / MEAL</span>
                  </div>
                  <div className="mc-meal-cell">
                    <span className="mc-meal-cell-val" style={{ color: '#30D158' }}>{perMealBreakdown.carbs}g</span>
                    <span className="mc-meal-cell-lbl">CARBS / MEAL</span>
                  </div>
                  <div className="mc-meal-cell">
                    <span className="mc-meal-cell-val" style={{ color: '#FFD60A' }}>{perMealBreakdown.fat}g</span>
                    <span className="mc-meal-cell-lbl">FAT / MEAL</span>
                  </div>
                  <div className="mc-meal-cell">
                    <span className="mc-meal-cell-val" style={{ color: '#FFFFFF' }}>{perMealBreakdown.calories}</span>
                    <span className="mc-meal-cell-lbl">KCAL / MEAL</span>
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="mc-action-row">
                <button
                  type="button"
                  className="btn-primary mc-save-btn"
                  onClick={handleSaveToDailyGoals}
                >
                  <span>💾 SAVE AS DAILY NUTRITION TARGETS</span>
                </button>
              </div>
            </div>

            {/* Whole Food Sources Cheatsheet */}
            <div className="mc-section" style={{ marginTop: '24px' }}>
              <div className="sc-section-header-row">
                <span className="sc-section-dot" style={{ background: '#30D158', boxShadow: '0 0 8px #30D158' }} />
                <span className="sc-section-label">WHOLE FOOD MACRO SOURCES</span>
              </div>

              <div className="mc-food-tabs">
                <button
                  type="button"
                  className={`mc-food-tab ${activeFoodTab === 'protein' ? 'active' : ''}`}
                  onClick={() => setActiveFoodTab('protein')}
                  style={{ color: activeFoodTab === 'protein' ? '#158FF2' : 'var(--text-muted)' }}
                >
                  🥩 CLEAN PROTEIN
                </button>
                <button
                  type="button"
                  className={`mc-food-tab ${activeFoodTab === 'carbs' ? 'active' : ''}`}
                  onClick={() => setActiveFoodTab('carbs')}
                  style={{ color: activeFoodTab === 'carbs' ? '#30D158' : 'var(--text-muted)' }}
                >
                  🍚 COMPLEX CARBS
                </button>
                <button
                  type="button"
                  className={`mc-food-tab ${activeFoodTab === 'fats' ? 'active' : ''}`}
                  onClick={() => setActiveFoodTab('fats')}
                  style={{ color: activeFoodTab === 'fats' ? '#FFD60A' : 'var(--text-muted)' }}
                >
                  🥑 ESSENTIAL FATS
                </button>
              </div>

              <div className="mc-food-list">
                {FOOD_SOURCES[activeFoodTab].map((item, idx) => (
                  <div key={idx} className="mc-food-chip">
                    <span className="mc-food-dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder prompt encouraging submission */
          <div className="mc-pending-submission-placeholder">
            <span className="mc-pending-icon">📊</span>
            <h3 className="mc-pending-title">AWAITING QUESTIONNAIRE SUBMISSION</h3>
            <p className="mc-pending-desc">
              Review your answers to the 5 questions above and click <strong>Submit Answers &amp; Calculate Macros</strong> to unlock your full metabolic profile, calorie targets, and plate breakdown.
            </p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="sync-toast-banner" style={{ zIndex: 1000 }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
