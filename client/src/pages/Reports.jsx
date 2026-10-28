import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  Users, 
  Package, 
  Droplet, 
  Clock, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { exportToCSV, printStatement } from '../utils/export';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('sales'); // 'sales' | 'customers' | 'products'
  const [salesPeriod, setSalesPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  const [salesData, setSalesData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [activeReport, salesPeriod]);

  const loadReport = async () => {
    try {
      setLoading(true);
      if (activeReport === 'sales') {
        const res = await api.getSalesReport(salesPeriod);
        setSalesData(res.salesData || []);
      } else if (activeReport === 'customers') {
        const res = await api.getCustomerWiseReport();
        setCustomerData(res.customerWise || []);
      } else if (activeReport === 'products') {
        const res = await api.getProductWiseReport();
        setProductData(res.productWise || []);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (activeReport === 'sales') {
      exportToCSV(`Ocean_Enterprises_Sales_${salesPeriod}`, salesData);
    } else if (activeReport === 'customers') {
      exportToCSV('Ocean_Enterprises_Customer_Sales_Report', customerData);
    } else if (activeReport === 'products') {
      exportToCSV('Ocean_Enterprises_Product_Sales_Report', productData);
    }
  };

  const handlePrint = () => {
    if (activeReport === 'sales') {
      const rows = salesData.map(d => `
        <tr>
          <td>${d.label || d.date}</td>
          <td>₹${d.orderSales?.toLocaleString()}</td>
          <td>₹${d.waterSales?.toLocaleString()}</td>
          <td><strong>₹${d.totalSales?.toLocaleString()}</strong></td>
        </tr>
      `).join('');
      printStatement(`Sales Report (${salesPeriod.toUpperCase()})`, `
        <table>
          <thead>
            <tr><th>Period</th><th>Orders Sales</th><th>Water Supply Sales</th><th>Total Revenue</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    } else if (activeReport === 'customers') {
      const rows = customerData.map(c => `
        <tr>
          <td>${c.business_name || c.name}</td>
          <td>${c.customer_type || 'Shop'}</td>
          <td>${c.water_units ?? c.total_water_units ?? 0} Jars</td>
          <td>${c.orders_count ?? c.total_orders ?? 0}</td>
          <td>₹${c.total_sales?.toLocaleString()}</td>
          <td style="color: red;">₹${c.total_pending?.toLocaleString()}</td>
        </tr>
      `).join('');
      printStatement('Customer-wise Performance Report', `
        <table>
          <thead>
            <tr><th>Client</th><th>Type</th><th>Water Jars</th><th>Orders</th><th>Total Sales</th><th>Pending Due</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    } else if (activeReport === 'products') {
      const rows = productData.map(p => `
        <tr>
          <td>${p.name} (${p.size})</td>
          <td>${p.category}</td>
          <td>${p.units_sold}</td>
          <td>₹${p.selling_price}</td>
          <td>₹${p.revenue?.toLocaleString()}</td>
          <td style="color: green;">₹${p.profit?.toLocaleString()}</td>
        </tr>
      `).join('');
      printStatement('Product Sales & Profitability Report', `
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th>Units Sold</th><th>Price</th><th>Revenue</th><th>Profit</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Business Analytics & Reports
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Operational sales summaries, customer accounts performance, and inventory profitability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} />
            <span>Print PDF</span>
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            <Download size={16} />
            <span>Export Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* Report Tab Selector */}
      <div className="ocean-card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveReport('sales')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: activeReport === 'sales' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: activeReport === 'sales' ? '#e0f2fe' : 'white',
                color: activeReport === 'sales' ? '#0369a1' : '#64748b'
              }}
            >
              📈 Sales Performance
            </button>

            <button
              onClick={() => setActiveReport('customers')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: activeReport === 'customers' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: activeReport === 'customers' ? '#e0f2fe' : 'white',
                color: activeReport === 'customers' ? '#0369a1' : '#64748b'
              }}
            >
              👥 Customer Accounts
            </button>

            <button
              onClick={() => setActiveReport('products')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: activeReport === 'products' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: activeReport === 'products' ? '#e0f2fe' : 'white',
                color: activeReport === 'products' ? '#0369a1' : '#64748b'
              }}
            >
              📦 Product Profitability
            </button>
          </div>

          {activeReport === 'sales' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {['daily', 'weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  onClick={() => setSalesPeriod(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: 'none',
                    background: salesPeriod === p ? '#0369a1' : '#f1f5f9',
                    color: salesPeriod === p ? 'white' : '#475569',
                    textTransform: 'capitalize'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Tables */}
      <div className="ocean-card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeReport === 'sales' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="ocean-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Order Sales</th>
                  <th>Water Supply Sales</th>
                  <th>Total Sales</th>
                  {salesPeriod === 'daily' && <th>Water Units Distributed</th>}
                </tr>
              </thead>
              <tbody>
                {salesData.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d.label || d.date}</strong></td>
                    <td>₹{d.orderSales?.toLocaleString()}</td>
                    <td>₹{d.waterSales?.toLocaleString()}</td>
                    <td>
                      <strong style={{ fontSize: '15px', color: '#059669' }}>
                        ₹{d.totalSales?.toLocaleString()}
                      </strong>
                    </td>
                    {salesPeriod === 'daily' && (
                      <td>
                        <span style={{ fontWeight: '800', color: '#0284c7' }}>
                          {d.waterUnits || 0} Jars
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'customers' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="ocean-table">
              <thead>
                <tr>
                  <th>Customer / Business</th>
                  <th>Type</th>
                  <th>Water Jars</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                  <th>Total Paid</th>
                  <th>Outstanding Due</th>
                </tr>
              </thead>
              <tbody>
                {customerData.map(c => (
                  <tr key={c.id ?? c.customer_id}>
                    <td>
                      <strong>{c.business_name || c.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {c.phone}</div>
                    </td>
                    <td>{c.customer_type || 'Shop'}</td>
                    <td><strong style={{ color: '#0284c7' }}>{c.water_units ?? c.total_water_units ?? 0} Jars</strong></td>
                    <td>{c.orders_count ?? c.total_orders ?? 0}</td>
                    <td><strong>₹{c.total_sales?.toLocaleString()}</strong></td>
                    <td style={{ color: '#16a34a' }}>₹{c.total_paid?.toLocaleString()}</td>
                    <td style={{ color: c.total_pending > 0 ? '#e11d48' : '#64748b', fontWeight: '800' }}>
                      {c.total_pending > 0 ? `₹${c.total_pending?.toLocaleString()}` : '✓ Clear'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'products' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="ocean-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Selling Price</th>
                  <th>Units Sold</th>
                  <th>Revenue Generated</th>
                  <th>Estimated Profit</th>
                </tr>
              </thead>
              <tbody>
                {productData.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong> ({p.size})
                    </td>
                    <td>{p.category}</td>
                    <td>₹{p.selling_price}</td>
                    <td><strong>{p.units_sold}</strong></td>
                    <td><strong style={{ color: '#0f172a' }}>₹{p.revenue?.toLocaleString()}</strong></td>
                    <td>
                      <span style={{ fontWeight: '800', color: '#16a34a' }}>
                        +₹{p.profit?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
