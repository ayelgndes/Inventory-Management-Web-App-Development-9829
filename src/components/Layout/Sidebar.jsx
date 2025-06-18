import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  Store,
  TrendingUp,
  FileText,
  Database,
  Settings,
  Users
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: Store, label: 'Stores', path: '/stores' },
    { icon: TrendingUp, label: 'Profitability', path: '/profitability' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Database, label: 'Data Import', path: '/import' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 lg:relative lg:translate-x-0 lg:shadow-none border-r border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Inventory Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Multi-Store Management</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500' : ''
                  }`
                }
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </motion.div>
    </>
  )
}

export default Sidebar