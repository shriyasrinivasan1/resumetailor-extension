import { useState } from 'react';
import NavBar from './components/NavBar';
import Dashboard from './screens/Dashboard';
import ResumeDatabase from './screens/ResumeDatabase';
import Generate from './screens/Generate';
import History from './screens/History';

const SCREENS = {
  dashboard: Dashboard,
  database: ResumeDatabase,
  generate: Generate,
  history: History,
};

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const Screen = SCREENS[screen] || Dashboard;

  return (
    <div className="app">
      <div className="screen-container">
        {/* onNavigate lets child screens redirect to another tab */}
        <Screen onNavigate={setScreen} />
      </div>
      <NavBar activeScreen={screen} onNavigate={setScreen} />
    </div>
  );
}
