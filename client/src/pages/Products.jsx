import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Droplet, 
  CupSoda, 
  ArrowUpRight, 
  CheckCircle2, 
  X,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { api } from '../services/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const initialForm = {
    name: '',
    category: 'Water',
    size: '20L',
    selling_price: 35,
    purchase_price: 15,
    stock: 100,
    minimum_stock: 20
  };
  const [formData, setFormData] = useState(initialForm);

  // Quick Stock Add Modal
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [addedStockUnits, setAddedStockUnits] = useState(50);

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, lowStockFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        category: categoryFilter,
        lowStockOnly: lowStockFilter ? 'true' : 'false'
      });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      size: p.size,
      selling_price: p.selling_price,
      purchase_price: p.purchase_price,
      stock: p.stock,
      minimum_stock: p.minimum_stock
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        alert('Product details updated successfully!');
      } else {
        await api.createProduct(formData);
        alert('New product added to inventory catalog!');
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      alert('Error saving product: ' + err.message);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    try {
      await api.adjustStock(stockModalProduct.id, {
        adjustmentType: 'ADD',
        quantity: addedStockUnits
      });
      alert(`Added ${addedStockUnits} units to ${stockModalProduct.name}!`);
      setStockModalProduct(null);
      loadProducts();
    } catch (err) {
      alert('Error updating stock: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Deactivate product "${name}" from inventory?`)) return;
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (err) {
      alert('Error removing product: ' + err.message);
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.size && p.size.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Products & Inventory Management
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Track stock levels, pricing, purchases, and low-inventory alerts
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="ocean-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              placeholder="Search products by name or size (e.g. 20L, Frooti, Thums Up)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Water', 'Beverage'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: categoryFilter === cat ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: categoryFilter === cat ? '#e0f2fe' : 'white',
                  color: categoryFilter === cat ? '#0369a1' : '#64748b'
                }}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: lowStockFilter ? '1px solid #f43f5e' : '1px solid #e2e8f0',
                background: lowStockFilter ? '#ffe4e6' : 'white',
                color: lowStockFilter ? '#be123c' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={14} color={lowStockFilter ? '#be123c' : '#64748b'} />
              <span>Low Stock Alerts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="ocean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ocean-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Size</th>
                <th>Selling Price</th>
                <th>Purchase Price</th>
                <th>Profit Margin</th>
                <th>Current Stock</th>
                <th>Units Sold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const margin = p.selling_price - p.purchase_price;
                const isLow = p.stock <= p.minimum_stock;
                return (
                  <tr key={p.id} style={isLow ? { background: '#fffbeb' } : {}}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {p.category === 'Water' ? (
                          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px', borderRadius: '8px' }}>
                            <Droplet size={16} fill="#0284c7" />
                          </div>
                        ) : (
                          <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px', borderRadius: '8px' }}>
                            <CupSoda size={16} />
                          </div>
                        )}
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{p.name}</strong>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td style={{ fontWeight: '600' }}>{p.size}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>₹{p.selling_price}</td>
                    <td style={{ color: '#64748b' }}>₹{p.purchase_price}</td>
                    <td style={{ fontWeight: '700', color: '#059669' }}>
                      +₹{margin} <span style={{ fontSize: '11px', color: '#64748b' }}>({Math.round((margin / p.selling_price) * 100)}%)</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: isLow ? '#e11d48' : '#0f172a' }}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            LOW
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{p.units_sold || 0}</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-paid' : 'badge-cancelled'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setStockModalProduct(p)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', color: '#0284c7', borderColor: '#bae6fd' }}
                          title="Add inventory batch"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                          title="Edit Product"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          title="Deactivate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Product Name *:
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 20L Water Jar, Frooti 600 ml"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Category:
                  </label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Water">Water (Jars & Bottles)</option>
                    <option value="Beverage">Cold Drink / Beverage</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Size / Volume:
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.size}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. 20L, 1.2L, 600ml, 250ml"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Selling Price (₹) *:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className="form-input"
                    value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Purchase Price (₹):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={formData.purchase_price}
                    onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Current Stock (Units):
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Minimum Stock Alert Level:
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.minimum_stock}
                    onChange={e => setFormData({ ...formData, minimum_stock: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Batch Modal */}
      {stockModalProduct && (
        <div className="modal-overlay" onClick={() => setStockModalProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                Receive Inventory Stock
              </h3>
              <button onClick={() => setStockModalProduct(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{stockModalProduct.name} ({stockModalProduct.size})</strong>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Current Stock: <strong>{stockModalProduct.stock} units</strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Units Received:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[20, 50, 100, 200].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAddedStockUnits(n)}
                      className="qty-btn"
                      style={{ flex: 1, padding: '8px 0', fontSize: '13px' }}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800' }}
                  value={addedStockUnits}
                  onChange={e => setAddedStockUnits(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setStockModalProduct(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Add to Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
