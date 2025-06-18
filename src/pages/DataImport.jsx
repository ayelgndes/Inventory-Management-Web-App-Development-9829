import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useSupabase } from '../hooks/useSupabase'
import {
  Database,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw
} from 'lucide-react'

const DataImport = () => {
  const { currentStore, stores } = useOutletContext()
  const { insertData, loading } = useSupabase()
  const [importHistory, setImportHistory] = useState([])
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [importType, setImportType] = useState('csv')
  const [sqlConfig, setSqlConfig] = useState({
    server: '',
    database: '',
    username: '',
    password: '',
    query: ''
  })
  const [csvData, setCsvData] = useState('')
  const [importStatus, setImportStatus] = useState(null)

  const handleCSVImport = async () => {
    try {
      setImportStatus({ type: 'loading', message: 'Processing CSV data...' })
      
      // Parse CSV data
      const lines = csvData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1)

      const products = rows.map(row => {
        const values = row.split(',').map(v => v.trim())
        const product = {}
        
        headers.forEach((header, index) => {
          const value = values[index] || ''
          
          // Map common CSV headers to database fields
          switch (header.toLowerCase()) {
            case 'name':
            case 'product_name':
              product.name = value
              break
            case 'sku':
            case 'product_code':
              product.sku = value
              break
            case 'cost':
            case 'cost_price':
              product.cost_price = parseFloat(value) || 0
              break
            case 'price':
            case 'selling_price':
              product.selling_price = parseFloat(value) || 0
              break
            case 'quantity':
            case 'stock':
              product.quantity = parseInt(value) || 0
              break
            case 'reorder_level':
            case 'min_stock':
              product.reorder_level = parseInt(value) || 10
              break
            case 'description':
              product.description = value
              break
            default:
              // Store additional fields as JSON in description
              if (value) {
                product.description = (product.description || '') + ` ${header}: ${value}`
              }
          }
        })

        // Set defaults
        product.store_id = currentStore?.id || stores[0]?.id
        product.category_id = 'default-category-id' // You might want to handle this better
        
        return product
      })

      // Import products
      for (const product of products) {
        if (product.name && product.sku) {
          await insertData('products_inv2024', product)
        }
      }

      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${products.length} products` 
      })
      
      // Add to import history
      const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: 'CSV Import',
        status: 'Success',
        records: products.length,
        store: currentStore?.name || 'All Stores'
      }
      setImportHistory(prev => [historyEntry, ...prev])
      
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus({ 
        type: 'error', 
        message: `Import failed: ${error.message}` 
      })
    }
  }

  const handleSQLImport = async () => {
    try {
      setImportStatus({ type: 'loading', message: 'Connecting to MS SQL Server...' })
      
      // Note: In a real application, this would connect to your backend API
      // that handles the MS SQL connection securely
      const response = await fetch('/api/import-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: sqlConfig,
          targetStore: currentStore?.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to connect to SQL Server')
      }

      const data = await response.json()
      
      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${data.recordsImported} records from SQL Server` 
      })

      // Add to import history
      const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: 'SQL Server Import',
        status: 'Success',
        records: data.recordsImported,
        store: currentStore?.name || 'All Stores'
      }
      setImportHistory(prev => [historyEntry, ...prev])

    } catch (error) {
      console.error('SQL Import error:', error)
      setImportStatus({ 
        type: 'error', 
        message: `SQL Import failed: ${error.message}` 
      })
    }
  }

  const generateSampleCSV = () => {
    const sampleData = `name,sku,cost_price,selling_price,quantity,reorder_level,description
"Laptop Computer","LAP001",800.00,1200.00,15,5,"High-performance laptop"
"Wireless Mouse","MOU001",15.00,25.00,50,10,"Ergonomic wireless mouse"
"Keyboard","KEY001",45.00,75.00,30,8,"Mechanical keyboard"
"Monitor","MON001",200.00,350.00,20,5,"24-inch LED monitor"
"USB Cable","USB001",5.00,12.00,100,25,"USB-C cable 6ft"`

    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_inventory.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const ImportCard = ({ icon: Icon, title, description, onAction, actionLabel, color = 'blue' }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="text-center p-6">
        <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <Button onClick={onAction} className="w-full">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <Button onClick={generateSampleCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Sample CSV
        </Button>
      </div>

      {/* Import Status */}
      {importStatus && (
        <Card className={`border-l-4 ${
          importStatus.type === 'success' ? 'border-green-500 bg-green-50' :
          importStatus.type === 'error' ? 'border-red-500 bg-red-50' :
          'border-blue-500 bg-blue-50'
        }`}>
          <CardContent className="flex items-center">
            {importStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mr-3" />}
            {importStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mr-3" />}
            {importStatus.type === 'loading' && <RefreshCw className="w-5 h-5 text-blue-600 mr-3 animate-spin" />}
            <p className={`${
              importStatus.type === 'success' ? 'text-green-800' :
              importStatus.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {importStatus.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ImportCard
          icon={Upload}
          title="CSV Import"
          description="Import inventory data from CSV files with automatic field mapping"
          onAction={() => setImportType('csv')}
          actionLabel="Import CSV"
          color="green"
        />
        
        <ImportCard
          icon={Database}
          title="MS SQL Server"
          description="Connect to your existing MS SQL database and import data directly"
          onAction={() => setImportType('sql')}
          actionLabel="Configure SQL"
          color="blue"
        />
        
        <ImportCard
          icon={Settings}
          title="API Integration"
          description="Set up automated data sync with external systems via REST API"
          onAction={() => setShowConfigModal(true)}
          actionLabel="Setup API"
          color="purple"
        />
      </div>

      {/* CSV Import Section */}
      {importType === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Data Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV Data (Paste your CSV content here)
              </label>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="name,sku,cost_price,selling_price,quantity,reorder_level,description
Laptop Computer,LAP001,800.00,1200.00,15,5,High-performance laptop
Wireless Mouse,MOU001,15.00,25.00,50,10,Ergonomic wireless mouse"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2"><strong>Supported columns:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>name, product_name - Product name (required)</li>
                <li>sku, product_code - Product SKU (required)</li>
                <li>cost, cost_price - Cost price</li>
                <li>price, selling_price - Selling price</li>
                <li>quantity, stock - Current stock quantity</li>
                <li>reorder_level, min_stock - Minimum stock level</li>
                <li>description - Product description</li>
              </ul>
            </div>
            <Button 
              onClick={handleCSVImport} 
              disabled={!csvData.trim() || loading}
              loading={loading}
              className="w-full"
            >
              Import CSV Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SQL Import Section */}
      {importType === 'sql' && (
        <Card>
          <CardHeader>
            <CardTitle>MS SQL Server Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Address
                </label>
                <input
                  type="text"
                  value={sqlConfig.server}
                  onChange={(e) => setSqlConfig({ ...sqlConfig, server: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="localhost or IP address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={sqlConfig.database}
                  onChange={(e) => setSqlConfig({ ...sqlConfig, database: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="InventoryDB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={sqlConfig.username}
                  onChange={(e) => setSqlConfig({ ...sqlConfig, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={sqlConfig.password}
                  onChange={(e) => setSqlConfig({ ...sqlConfig, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SQL Query
              </label>
              <textarea
                value={sqlConfig.query}
                onChange={(e) => setSqlConfig({ ...sqlConfig, query: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="SELECT ProductName as name, ProductCode as sku, CostPrice as cost_price, SellingPrice as selling_price, Quantity as quantity, MinStock as reorder_level, Description as description FROM Products WHERE Active = 1"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Security Note:</strong> This connection will be processed securely through our backend API. 
                Your database credentials are not stored and are only used for the import process.
              </p>
            </div>
            <Button 
              onClick={handleSQLImport} 
              disabled={!sqlConfig.server || !sqlConfig.database || !sqlConfig.query || loading}
              loading={loading}
              className="w-full"
            >
              Import from SQL Server
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {importHistory.length > 0 ? (
            <div className="space-y-3">
              {importHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      entry.status === 'Success' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{entry.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString()} - {entry.store}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{entry.records} records</p>
                    <p className={`text-sm ${
                      entry.status === 'Success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No import history available</p>
          )}
        </CardContent>
      </Card>

      {/* API Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="API Integration Setup"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">REST API Endpoints</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Import Products:</strong> POST /api/products/import</p>
              <p><strong>Sync Inventory:</strong> POST /api/inventory/sync</p>
              <p><strong>Webhook URL:</strong> https://yourapp.com/webhooks/inventory</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your API key for authentication"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Frequency
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="manual">Manual</option>
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConfigModal(false)}>
              Save Configuration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DataImport