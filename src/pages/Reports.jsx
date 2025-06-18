import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useSupabase } from '../hooks/useSupabase'
import { formatCurrency, formatNumber, formatDate } from '../lib/utils'
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3
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

const Reports = () => {
  const { currentStore } = useOutletContext()
  const { fetchData, loading } = useSupabase()
  const [reportData, setReportData] = useState({
    salesReport: [],
    inventoryReport: [],
    profitabilityReport: [],
    financialSummary: {
      totalSales: 0,
      totalCost: 0,
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0
    }
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState('sales')

  useEffect(() => {
    loadReportData()
  }, [currentStore, dateRange])

  const loadReportData = async () => {
    try {
      const filters = currentStore ? { store_id: currentStore.id } : {}
      
      const [products, sales, categories, stores] = await Promise.all([
        fetchData('products_inv2024', filters),
        fetchData('sales_inv2024', filters),
        fetchData('categories_inv2024'),
        fetchData('stores_inv2024')
      ])

      // Filter sales by date range
      const filteredSales = (sales || []).filter(sale => {
        if (!sale.sale_date) return false
        const saleDate = sale.sale_date.split('T')[0]
        return saleDate >= dateRange.startDate && saleDate <= dateRange.endDate
      })

      const salesReport = generateSalesReport(filteredSales, products || [])
      const inventoryReport = generateInventoryReport(products || [], categories || [], stores || [])
      const profitabilityReport = generateProfitabilityReport(products || [], filteredSales)
      const financialSummary = generateFinancialSummary(filteredSales, products || [])

      setReportData({
        salesReport,
        inventoryReport,
        profitabilityReport,
        financialSummary
      })
    } catch (error) {
      console.error('Error loading report data:', error)
    }
  }

  const generateSalesReport = (sales, products) => {
    const productMap = products.reduce((acc, product) => {
      acc[product.id] = product
      return acc
    }, {})

    const dailySales = sales.reduce((acc, sale) => {
      const date = sale.sale_date?.split('T')[0] || new Date().toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          totalSales: 0,
          totalProfit: 0,
          itemsSold: 0,
          transactions: 0
        }
      }
      
      acc[date].totalSales += sale.total_amount
      acc[date].totalProfit += sale.profit
      acc[date].itemsSold += sale.quantity
      acc[date].transactions += 1
      
      return acc
    }, {})

    return Object.values(dailySales).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const generateInventoryReport = (products, categories, stores) => {
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name
      return acc
    }, {})

    const storeMap = stores.reduce((acc, store) => {
      acc[store.id] = store.name
      return acc
    }, {})

    return products.map(product => ({
      ...product,
      categoryName: categoryMap[product.category_id] || 'Unknown',
      storeName: storeMap[product.store_id] || 'Unknown',
      inventoryValue: product.cost_price * product.quantity,
      potentialRevenue: product.selling_price * product.quantity,
      potentialProfit: (product.selling_price - product.cost_price) * product.quantity,
      stockStatus: product.quantity <= product.reorder_level ? 'Low Stock' : 'In Stock'
    }))
  }

  const generateProfitabilityReport = (products, sales) => {
    const productProfitability = products.map(product => {
      const productSales = sales.filter(s => s.product_id === product.id)
      const totalSold = productSales.reduce((sum, s) => sum + s.quantity, 0)
      const totalRevenue = productSales.reduce((sum, s) => sum + s.total_amount, 0)
      const totalCost = totalSold * product.cost_price
      const profit = totalRevenue - totalCost
      const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0

      return {
        ...product,
        totalSold,
        totalRevenue,
        totalCost,
        profit,
        margin,
        profitPerUnit: totalSold > 0 ? profit / totalSold : 0
      }
    })

    return productProfitability.filter(p => p.totalSold > 0).sort((a, b) => b.profit - a.profit)
  }

  const generateFinancialSummary = (sales, products) => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalCost = sales.reduce((sum, sale) => {
      const product = products.find(p => p.id === sale.product_id)
      return sum + (product ? product.cost_price * sale.quantity : 0)
    }, 0)
    const grossProfit = totalSales - totalCost
    const netProfit = grossProfit // Simplified - in real scenario, subtract expenses
    const profitMargin = totalSales > 0 ? (grossProfit / totalSales * 100) : 0

    return {
      totalSales,
      totalCost,
      grossProfit,
      netProfit,
      profitMargin
    }
  }

  const exportReport = (type) => {
    let data = []
    let filename = `${type}_report_${dateRange.startDate}_to_${dateRange.endDate}`

    switch (type) {
      case 'sales':
        data = reportData.salesReport
        break
      case 'inventory':
        data = reportData.inventoryReport
        break
      case 'profitability':
        data = reportData.profitabilityReport
        break
      default:
        data = reportData.salesReport
    }

    // Convert to CSV
    if (data.length > 0) {
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(item => Object.values(item).join(','))
      const csv = [headers, ...rows].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  const ReportCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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
          Financial Reports {currentStore && `- ${currentStore.name}`}
        </h1>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard
          icon={DollarSign}
          title="Total Sales"
          value={formatCurrency(reportData.financialSummary.totalSales)}
          color="green"
        />
        <ReportCard
          icon={TrendingUp}
          title="Gross Profit"
          value={formatCurrency(reportData.financialSummary.grossProfit)}
          color="blue"
        />
        <ReportCard
          icon={BarChart3}
          title="Profit Margin"
          value={`${reportData.financialSummary.profitMargin.toFixed(1)}%`}
          color="purple"
        />
        <ReportCard
          icon={Package}
          title="Total Cost"
          value={formatCurrency(reportData.financialSummary.totalCost)}
          color="orange"
        />
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="sales">Sales Report</option>
                <option value="inventory">Inventory Report</option>
                <option value="profitability">Profitability Report</option>
              </select>
            </div>
            <Button onClick={() => exportReport(reportType)}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.salesReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => formatDate(date)}
                formatter={(value, name) => [
                  name === 'totalSales' || name === 'totalProfit' ? formatCurrency(value) : formatNumber(value),
                  name === 'totalSales' ? 'Sales' : 
                  name === 'totalProfit' ? 'Profit' : 
                  name === 'itemsSold' ? 'Items Sold' : 'Transactions'
                ]}
              />
              <Line type="monotone" dataKey="totalSales" stroke="#0ea5e9" name="totalSales" />
              <Line type="monotone" dataKey="totalProfit" stroke="#10b981" name="totalProfit" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Report Tables */}
      {reportType === 'sales' && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Sales</th>
                    <th className="text-left py-3 px-4">Profit</th>
                    <th className="text-left py-3 px-4">Items Sold</th>
                    <th className="text-left py-3 px-4">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesReport.map((day, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{formatDate(day.date)}</td>
                      <td className="py-3 px-4">{formatCurrency(day.totalSales)}</td>
                      <td className="py-3 px-4 text-green-600">{formatCurrency(day.totalProfit)}</td>
                      <td className="py-3 px-4">{formatNumber(day.itemsSold)}</td>
                      <td className="py-3 px-4">{formatNumber(day.transactions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'inventory' && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Stock</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Value</th>
                    <th className="text-left py-3 px-4">Potential Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.inventoryReport.slice(0, 20).map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{product.categoryName}</td>
                      <td className="py-3 px-4">{formatNumber(product.quantity)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {product.stockStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(product.inventoryValue)}</td>
                      <td className="py-3 px-4">{formatCurrency(product.potentialRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'profitability' && (
        <Card>
          <CardHeader>
            <CardTitle>Profitability Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-left py-3 px-4">Sold</th>
                    <th className="text-left py-3 px-4">Revenue</th>
                    <th className="text-left py-3 px-4">Cost</th>
                    <th className="text-left py-3 px-4">Profit</th>
                    <th className="text-left py-3 px-4">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.profitabilityReport.slice(0, 20).map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                      </td>
                      <td className="py-3 px-4">{formatNumber(product.totalSold)}</td>
                      <td className="py-3 px-4">{formatCurrency(product.totalRevenue)}</td>
                      <td className="py-3 px-4">{formatCurrency(product.totalCost)}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${product.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(product.profit)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          product.margin > 20 ? 'text-green-600' : 
                          product.margin > 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Reports