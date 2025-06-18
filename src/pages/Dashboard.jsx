import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { useSupabase } from '../hooks/useSupabase'
import { formatCurrency, formatNumber } from '../lib/utils'
import {
  TrendingUp,
  Package,
  DollarSign,
  Store,
  AlertTriangle,
  TrendingDown
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const Dashboard = () => {
  const { currentStore } = useOutletContext()
  const { fetchData, loading } = useSupabase()
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    totalProfit: 0,
    salesData: [],
    categoryData: [],
    topProducts: []
  })

  useEffect(() => {
    loadDashboardData()
  }, [currentStore])

  const loadDashboardData = async () => {
    try {
      const filters = currentStore ? { store_id: currentStore.id } : {}
      
      const [products, sales, categories] = await Promise.all([
        fetchData('products_inv2024', filters),
        fetchData('sales_inv2024', filters),
        fetchData('categories_inv2024')
      ])

      // Calculate metrics
      const totalProducts = products?.length || 0
      const totalValue = products?.reduce((sum, p) => sum + (p.cost_price * p.quantity), 0) || 0
      const lowStockItems = products?.filter(p => p.quantity <= p.reorder_level).length || 0
      const totalProfit = sales?.reduce((sum, s) => sum + s.profit, 0) || 0

      // Prepare chart data
      const salesData = prepareSalesData(sales || [])
      const categoryData = prepareCategoryData(products || [], categories || [])
      const topProducts = prepareTopProducts(products || [], sales || [])

      setDashboardData({
        totalProducts,
        totalValue,
        lowStockItems,
        totalProfit,
        salesData,
        categoryData,
        topProducts
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const prepareSalesData = (sales) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.sale_date?.startsWith(date))
      const revenue = daySales.reduce((sum, s) => sum + s.total_amount, 0)
      const profit = daySales.reduce((sum, s) => sum + s.profit, 0)
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        revenue,
        profit
      }
    })
  }

  const prepareCategoryData = (products, categories) => {
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = { name: cat.name, value: 0, color: cat.color || '#8884d8' }
      return acc
    }, {})

    products.forEach(product => {
      if (categoryMap[product.category_id]) {
        categoryMap[product.category_id].value += product.quantity
      }
    })

    return Object.values(categoryMap).filter(cat => cat.value > 0)
  }

  const prepareTopProducts = (products, sales) => {
    const productSales = sales.reduce((acc, sale) => {
      if (!acc[sale.product_id]) {
        acc[sale.product_id] = { quantity: 0, revenue: 0 }
      }
      acc[sale.product_id].quantity += sale.quantity
      acc[sale.product_id].revenue += sale.total_amount
      return acc
    }, {})

    return products
      .map(product => ({
        ...product,
        soldQuantity: productSales[product.id]?.quantity || 0,
        revenue: productSales[product.id]?.revenue || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }

  const StatCard = ({ icon: Icon, title, value, change, color = 'blue' }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-xs flex items-center mt-1 ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </CardContent>
    </Card>
  )

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard {currentStore && `- ${currentStore.name}`}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          title="Total Products"
          value={formatNumber(dashboardData.totalProducts)}
          change={5.2}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          title="Inventory Value"
          value={formatCurrency(dashboardData.totalValue)}
          change={8.1}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          title="Total Profit"
          value={formatCurrency(dashboardData.totalProfit)}
          change={12.3}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={formatNumber(dashboardData.lowStockItems)}
          change={-2.4}
          color="red"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-600">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                  <p className="text-sm text-gray-500">{product.soldQuantity} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard