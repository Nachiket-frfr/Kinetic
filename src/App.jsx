import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home             from './pages/Home';
import Workout          from './pages/Workout';
import Exercises        from './pages/Exercises';
import StepCounter      from './pages/StepCounter';
import Measure          from './pages/Measure';
import MacrosCalculator from './pages/MacrosCalculator';
import Profile          from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter basename="/Exercise-app-1/">
      <Layout>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/workout"     element={<Workout />} />
          <Route path="/exercises"   element={<Exercises />} />
          <Route path="/steps"       element={<StepCounter />} />
          <Route path="/measure"     element={<Measure />} />
          <Route path="/macros"      element={<MacrosCalculator />} />
          <Route path="/profile"     element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}