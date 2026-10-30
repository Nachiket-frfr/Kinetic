import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import aceExercises from '../data/aceExercises.json';
import AceReferenceModal from '../components/AceReferenceModal';

const ALL_EXERCISES = Object.entries(aceExercises).map(([key, val]) => ({
  key,
  title: val.title || key,
  category: val.category || 'General',
  equipment: val.equipment || 'Standard',
  primaryMuscles: val.primaryMuscles || [val.category || 'General'],
  level: val.level || 'Intermediate',
}));

const MUSCLE_GROUPS = [
  'ALL', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Full Body'
];

const EQUIPMENT_TYPES = [
  'ALL', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'
];

export default function Exercises() {
  const navigate = useNavigate();
  const { setSelectedExercise, exercisePRs } = useAppStore();

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('ALL');
  const [selectedEquip, setSelectedEquip] = useState('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedExForModal, setSelectedExForModal] = useState(null);

  const filteredExercises = ALL_EXERCISES.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase());
    
    const matchMuscle =
      selectedMuscle === 'ALL' ||
      ex.category.toLowerCase().includes(selectedMuscle.toLowerCase()) ||
      ex.primaryMuscles.some((m) => m.toLowerCase().includes(selectedMuscle.toLowerCase()));

    const matchEquip =
      selectedEquip === 'ALL' ||
      ex.equipment.toLowerCase().includes(selectedEquip.toLowerCase());

    return matchSearch && matchMuscle && matchEquip;
  });

  const handleStartExercise = (exerciseKey) => {
    setSelectedExercise(exerciseKey);
    navigate('/workout');
  };

  return (
    <div className="page-exercises">
      <div className="app-card">
        {/* Header */}
        <header className="app-header">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-name">EXERCISES</div>
              <div className="brand-subtitle">80+ ACE CERTIFIED ATHLETIC MOVEMENTS</div>
            </div>
          </div>

          <button
            type="button"
            className={`btn-secondary ${showFilterDrawer ? 'active' : ''}`}
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          >
            <span>⚡</span>
            <span>FILTERS</span>
          </button>
        </header>

        {/* Search Bar */}
        <div className="exercise-search-container">
          <input
            type="text"
            className="clean-search-input"
            placeholder="Search exercises by name, muscle, or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Drawer (Screen 15, 16) */}
        {showFilterDrawer && (
          <div className="hevy-filter-drawer">
            <div className="filter-group">
              <span className="filter-group-label">TARGET MUSCLE GROUP</span>
              <div className="filter-chips-grid">
                {MUSCLE_GROUPS.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    className={`hevy-filter-chip ${selectedMuscle === muscle ? 'active' : ''}`}
                    onClick={() => setSelectedMuscle(muscle)}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group" style={{ marginTop: '12px' }}>
              <span className="filter-group-label">EQUIPMENT TYPE</span>
              <div className="filter-chips-grid">
                {EQUIPMENT_TYPES.map((equip) => (
                  <button
                    key={equip}
                    type="button"
                    className={`hevy-filter-chip ${selectedEquip === equip ? 'active' : ''}`}
                    onClick={() => setSelectedEquip(equip)}
                  >
                    {equip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Muscle Quick Chips Horizontal Row */}
        {!showFilterDrawer && (
          <div className="category-filter-chips">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                type="button"
                className={`cat-chip-clean ${selectedMuscle === muscle ? 'active' : ''}`}
                onClick={() => setSelectedMuscle(muscle)}
              >
                {muscle.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Results Counter */}
        <div className="exercise-results-meta">
          <span>{filteredExercises.length} EXERCISES FOUND</span>
          {(selectedMuscle !== 'ALL' || selectedEquip !== 'ALL') && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={() => {
                setSelectedMuscle('ALL');
                setSelectedEquip('ALL');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Exercise Cards Grid */}
        <div className="exercise-catalog-grid">
          {filteredExercises.map((ex) => {
            const pr = exercisePRs?.[ex.key];

            return (
              <div key={ex.key} className="catalog-exercise-card">
                <div className="catalog-card-info">
                  <div className="catalog-title-row">
                    <h4 className="catalog-exercise-name">{ex.title}</h4>
                    {pr && (
                      <span className="pr-tag-badge">1RM: {pr.oneRepMax} KG</span>
                    )}
                  </div>

                  <div className="catalog-tags-row">
                    <span className="catalog-tag-muscle">{ex.category.toUpperCase()}</span>
                    <span className="catalog-tag-equip">{ex.equipment.toUpperCase()}</span>
                    <span className="catalog-tag-level">{ex.level.toUpperCase()}</span>
                  </div>
                </div>

                <div className="catalog-card-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '10px', padding: '6px 12px' }}
                    onClick={() => setSelectedExForModal(ex.key)}
                  >
                    FORM
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '10px', padding: '6px 14px' }}
                    onClick={() => handleStartExercise(ex.key)}
                  >
                    START
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ACE Reference Modal */}
        <AceReferenceModal
          exerciseKey={selectedExForModal}
          isOpen={!!selectedExForModal}
          onClose={() => setSelectedExForModal(null)}
        />
      </div>
    </div>
  );
}
