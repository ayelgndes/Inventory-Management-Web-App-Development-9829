import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Profitability from './pages/Profitability'
import Reports from './pages/Reports'
import DataImport from './pages/DataImport'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="profitability" element={<Profitability />} />
          <Route path="reports" element={<Reports />} />
          <Route path="import" element={<DataImport />} />
          <Route path="stores" element={<div className="p-6"><h1 className="text-2xl font-bold">Stores Management - Coming Soon</h1></div>} />
          <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-bold">User Management - Coming Soon</h1></div>} />
          <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App