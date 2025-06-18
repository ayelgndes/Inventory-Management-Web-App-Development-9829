import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { useSupabase } from '../hooks/useSupabase'
import { formatCurrency, formatNumber, calculateProfitMargin, calculateProfit } from '../lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Package,
  Calendar
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
  ScatterChart,
  Scatter
} from 'recharts'

const Profitability = () => {
  const { currentStore } = useOutletContext()
  const { fetchData, loading } = useSupabase()
  const [profitabilityData, setProfitabilityData] = useState({
    summary: {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageMargin: 0,
      topPerformer: null,
      worstPerformer: null
    },
    products: [],
    categories: [],
    trends: []
  })
  const [timeRange, setTimeRange] = useState('30')
  const [sortBy, setSortBy] = useState('profit')

  useEffect(() => {
    loadProfitabilityData()
  }, [currentStore, timeRange])

  const loadProfitabilityData = async () => {
    try {
      const filters = currentStore ? { store_id: currentStore.id } : {}
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(timeRange))

      const [products, sales, categories] = await Promise.all([
        fetchData('products_inv2024', filters),
        fetchData('sales_inv2024', {
          ...filters,
          sale_date: `gte.${startDate.toISOString().split('T')[0]}`
        }),
        fetchData('categories_inv2024')
      ])

      const summary = calculateSummary(products || [], sales || [])
      const productProfitability = calculateProductProfitability(products || [], sales || [])
      const categoryProfitability = calculateCategoryProfitability(products || [], sales || [], categories || [])
      const trends = calculateTrends(sales || [])

      setProfitabilityData({
        summary,
        products: productProfitability,
        categories: categoryProfitability,
        trends
      })
    } catch (error) {
      console.error('Error loading profitability data:', error)
    }
  }

  const calculateSummary = (products, sales) => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalCost = sales.reduce((sum, sale) => {
      const product = products.find(p => p.id === sale.product_id)
      return sum + (product ? product.cost_price * sale.quantity : 0)
    }, 0)
    const totalProfit = totalRevenue - totalCost
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0

    // Find top and worst performers
    const productProfits = products.map(product => {
      const productSales = sales.filter(s => s.product_id === product.id)
      const revenue = productSales.reduce((sum, s) => sum + s.total_amount, 0)
      const cost = productSales.reduce((sum, s) => sum + (product.cost_price * s.quantity), 0)
      const profit = revenue - cost
      
      return {
        ...product,
        profit,
        revenue,
        margin: revenue > 0 ? (profit / revenue * 100) : 0
      }
    }).filter(p => p.revenue > 0)

    const topPerformer = productProfits.sort((a, b) => b.profit - a.profit)[0] || null
    const worstPerformer = productProfits.sort((a, b) => a.profit - b.profit)[0] || null

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin,
      topPerformer,
      worstPerformer
    }
  }

  const calculateProductProfitability = (products, sales) => {
    return products.map(product => {
      const productSales = sales.filter(s => s.product_id === product.id)
      const revenue = productSales.reduce((sum, s) => sum + s.total_amount, 0)
      const quantitySold = productSales.reduce((sum, s) => sum + s.quantity, 0)
      const cost = quantitySold * product.cost_price
      const profit = revenue - cost
      const margin = revenue > 0 ? (profit / revenue * 100) : 0
      const profitPerUnit = quantitySold > 0 ? profit / quantitySold : 0

      return {
        ...product,
        revenue,
        cost,
        profit,
        margin,
        quantitySold,
        profitPerUnit,
        inventoryValue: product.quantity * product.cost_price,
        potentialProfit: product.quantity * (product.selling_price - product.cost_price)
      }
    }).filter(p => p.revenue > 0 || p.quantity > 0)
  }

  const calculateCategoryProfitability = (products, sales, categories) => {
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = { ...cat, revenue: 0, cost: 0, profit: 0, products: 0 }
      return acc
    }, {})

    products.forEach(product => {
      if (categoryMap[product.category_id]) {
        const productSales = sales.filter(s => s.product_id === product.id)
        const revenue = productSales.reduce((sum, s) => sum + s.total_amount, 0)
        const quantitySold = productSales.reduce((sum, s) => sum + s.quantity, 0)
        const cost = quantitySold * product.cost_price

        categoryMap[product.category_id].revenue += revenue
        categoryMap[product.category_id].cost += cost
        categoryMap[product.category_id].profit += (revenue - cost)
        categoryMap[product.category_id].products += 1
      }
    })

    return Object.values(categoryMap)
      .filter(cat => cat.revenue > 0)
      .map(cat => ({
        ...cat,
        margin: cat.revenue > 0 ? (cat.profit / cat.revenue * 100) : 0
      }))
  }

  const calculateTrends = (sales) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last30Days.map(date => {
      const daySales = sales.filter(s => s.sale_date?.startsWith(date))
      const revenue = daySales.reduce((sum, s) => sum + s.total_amount, 0)
      const profit = daySales.reduce((sum, s) => sum + s.profit, 0)
      const margin = revenue > 0 ? (profit / revenue * 100) : 0

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        profit,
        margin
      }
    })
  }

  const sortedProducts = [...profitabilityData.products].sort((a, b) => {
    switch (sortBy) {
      case 'profit': return b.profit - a.profit
      case 'margin': return b.margin - a.margin
      case 'revenue': return b.revenue - a.revenue
      case 'quantity': return b.quantitySold - a.quantitySold
      default: return b.profit - a.profit
    }
  })

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = 'blue' }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <p className={`text-xs flex items-center mt-1 ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
               trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
              {trend !== 0 ? `${Math.abs(trend).toFixed(1)}%` : 'No change'}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Profitability Analysis {currentStore && `- ${currentStore.name}`}
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(profitabilityData.summary.totalRevenue)}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          title="Total Profit"
          value={formatCurrency(profitabilityData.summary.totalProfit)}
          color="blue"
        />
        <StatCard
          icon={Percent}
          title="Average Margin"
          value={`${profitabilityData.summary.averageMargin.toFixed(1)}%`}
          color="purple"
        />
        <StatCard
          icon={Package}
          title="Products Analyzed"
          value={formatNumber(profitabilityData.products.length)}
          color="orange"
        />
      </div>

      {/* Top/Worst Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {profitabilityData.summary.topPerformer ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">{profitabilityData.summary.topPerformer.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Profit</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(profitabilityData.summary.topPerformer.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margin</p>
                    <p className="font-semibold">{profitabilityData.summary.topPerformer.margin.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {profitabilityData.summary.worstPerformer ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">{profitabilityData.summary.worstPerformer.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Profit</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(profitabilityData.summary.worstPerformer.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margin</p>
                    <p className="font-semibold">{profitabilityData.summary.worstPerformer.margin.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitabilityData.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'margin' ? `${value.toFixed(1)}%` : formatCurrency(value),
                  name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Margin'
                ]}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#0ea5e9" name="revenue" />
              <Bar yAxisId="left" dataKey="profit" fill="#10b981" name="profit" />
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#8b5cf6" name="margin" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Product Profitability Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Profitability</CardTitle>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="profit">Sort by Profit</option>
              <option value="margin">Sort by Margin</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="quantity">Sort by Quantity Sold</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">Revenue</th>
                  <th className="text-left py-3 px-4">Cost</th>
                  <th className="text-left py-3 px-4">Profit</th>
                  <th className="text-left py-3 px-4">Margin</th>
                  <th className="text-left py-3 px-4">Qty Sold</th>
                  <th className="text-left py-3 px-4">Profit/Unit</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.slice(0, 20).map(product => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${
                        product.profit > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
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
                    <td className="py-3 px-4 text-gray-600">
                      {formatNumber(product.quantitySold)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCurrency(product.profitPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Profitability