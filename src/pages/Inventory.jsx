import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useSupabase } from '../hooks/useSupabase'
import { formatCurrency, formatNumber, calculateProfitMargin } from '../lib/utils'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

const Inventory = () => {
  const { currentStore, stores } = useOutletContext()
  const { fetchData, insertData, updateData, loading } = useSupabase()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    quantity: '',
    reorder_level: '',
    store_id: '',
    description: ''
  })

  useEffect(() => {
    loadData()
  }, [currentStore])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory])

  const loadData = async () => {
    try {
      const filters = currentStore ? { store_id: currentStore.id } : {}
      const [productsData, categoriesData] = await Promise.all([
        fetchData('products_inv2024', filters),
        fetchData('categories_inv2024')
      ])
      
      setProducts(productsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory)
    }

    setFilteredProducts(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        quantity: parseInt(formData.quantity),
        reorder_level: parseInt(formData.reorder_level),
        store_id: formData.store_id || (currentStore?.id || stores[0]?.id)
      }

      if (editingProduct) {
        await updateData('products_inv2024', editingProduct.id, data)
      } else {
        await insertData('products_inv2024', data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: '',
      cost_price: '',
      selling_price: '',
      quantity: '',
      reorder_level: '',
      store_id: '',
      description: ''
    })
    setEditingProduct(null)
    setShowAddModal(false)
  }

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id,
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
      quantity: product.quantity.toString(),
      reorder_level: product.reorder_level.toString(),
      store_id: product.store_id,
      description: product.description || ''
    })
    setEditingProduct(product)
    setShowAddModal(true)
  }

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'red' }
    if (quantity <= reorderLevel) return { status: 'Low Stock', color: 'yellow' }
    return { status: 'In Stock', color: 'green' }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const getStoreName = (storeId) => {
    const store = stores.find(s => s.id === storeId)
    return store ? store.name : 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory Management {currentStore && `- ${currentStore.name}`}
        </h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">SKU</th>
                  <th className="text-left py-3 px-4">Category</th>
                  {!currentStore && <th className="text-left py-3 px-4">Store</th>}
                  <th className="text-left py-3 px-4">Cost</th>
                  <th className="text-left py-3 px-4">Price</th>
                  <th className="text-left py-3 px-4">Margin</th>
                  <th className="text-left py-3 px-4">Stock</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const stockStatus = getStockStatus(product.quantity, product.reorder_level)
                  const margin = calculateProfitMargin(product.selling_price, product.cost_price)
                  
                  return (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500">{product.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{product.sku}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {getCategoryName(product.category_id)}
                      </td>
                      {!currentStore && (
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {getStoreName(product.store_id)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatCurrency(product.cost_price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(product.selling_price)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center text-sm ${
                          margin > 20 ? 'text-green-600' : margin > 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {margin > 20 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                           margin > 10 ? <Package className="w-3 h-3 mr-1" /> : 
                           <TrendingDown className="w-3 h-3 mr-1" />}
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatNumber(product.quantity)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                          stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stockStatus.status === 'Low Stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1 text-gray-400 hover:text-primary-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={resetForm}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            {!currentStore && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <select
                  required
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Store</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                required
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Inventory