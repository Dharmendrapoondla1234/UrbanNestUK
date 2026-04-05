import { useState } from 'react';
import Layout from './components/layout/Layout.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import LeadsPage  from './pages/Leads.jsx';
import ContactsPage from './pages/Contacts.jsx';
import PipelinePage from './pages/Pipeline.jsx';
import TasksPage  from './pages/Tasks.jsx';
import AnalyticsPage from './pages/Analytics.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <Dashboard setPage={setPage} />;
      case 'leads':      return <LeadsPage />;
      case 'contacts':   return <ContactsPage />;
      case 'pipeline':   return <PipelinePage />;
      case 'tasks':      return <TasksPage />;
      case 'analytics':  return <AnalyticsPage />;
      default:           return <Dashboard setPage={setPage} />;
    }
  };

  return (
    <Layout page={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  );
}
