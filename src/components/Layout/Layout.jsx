import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSupabase } from '../../hooks/useSupabase'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stores, setStores] = useState([])
  const [currentStore, setCurrentStore] = useState(null)
  const { fetchData } = useSupabase()

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      const data = await fetchData('stores_inv2024')
      setStores(data || [])
    } catch (error) {
      console.error('Error loading stores:', error)
    }
  }

  const handleStoreChange = (storeId) => {
    const store = stores.find(s => s.id === storeId)
    setCurrentStore(store || null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div className="flex-1 lg:ml-0">
          <Header 
            onMenuClick={() => setSidebarOpen(true)}
            currentStore={currentStore}
            stores={stores}
            onStoreChange={handleStoreChange}
          />
          
          <main className="p-6">
            <Outlet context={{ currentStore, stores }} />
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout