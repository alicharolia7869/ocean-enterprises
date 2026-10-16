import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation as NavIcon, 
  Truck, 
  ExternalLink, 
  Phone, 
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { openGoogleMapsNavigation } from '../utils/maps';

export default function DeliveryRoute() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState(null);
  const mapRef = useRef(null);
  const leafletInstance = useRef(null);

  useEffect(() => {
    loadRouteDeliveries();
  }, []);

  const loadRouteDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.getDeliveries();
      // Sort by route sequence
      const sorted = (res.deliveries || []).sort((a, b) => (a.route_sequence || 0) - (b.route_sequence || 0));
      setDeliveries(sorted);
    } catch (err) {
      console.error('Error fetching route deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !mapRef.current) return;

    // Check if Leaflet is loaded on window
    if (!window.L) {
      console.warn('Leaflet not yet loaded from CDN');
      return;
    }

    if (leafletInstance.current) {
      leafletInstance.current.remove();
    }

    // Default center (or center on first delivery with coordinates)
    const validCoords = deliveries.filter(d => d.latitude && d.longitude);
    const initialCenter = validCoords.length > 0
      ? [validCoords[0].latitude, validCoords[0].longitude]
      : [19.1355, 72.8465]; // Muntaha Building, JVLR, Jogeshwari West, Mumbai - 400102

    const map = window.L.map(mapRef.current).setView(initialCenter, 13);
    leafletInstance.current = map;

    // OpenStreetMap Tile Layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const latLngs = [];

    // Add markers for each delivery stop
    validCoords.forEach((d, idx) => {
      const latLng = [d.latitude, d.longitude];
      latLngs.push(latLng);

      // Custom HTML numbered icon
      const customIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background: ${d.status === 'Delivered' ? '#10b981' : '#0284c7'}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            ${idx + 1}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = window.L.marker(latLng, { icon: customIcon }).addTo(map);

      const itemsList = (d.order_items || []).map(it => `<li>${it.quantity}x ${it.product_name}</li>`).join('');

      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <h4 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 15px;">Stop #${idx + 1}: ${d.business_name || d.customer_name}</h4>
          <p style="margin: 4px 0 8px; font-size: 12px; color: #475569;">📍 ${d.delivery_address}</p>
          <div style="font-size: 12px; margin-bottom: 8px;"><strong>Order:</strong> ${d.order_number} (₹${d.total_amount})</div>
          <ul style="margin: 0 0 10px 16px; padding: 0; font-size: 12px; color: #334155;">
            ${itemsList}
          </ul>
          <button 
            onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}', '_blank')"
            style="background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; width: 100%;"
          >
            🧭 Navigate in Google Maps
          </button>
        </div>
      `);
    });

    // Draw route polyline connecting sequence stops
    if (latLngs.length > 1) {
      window.L.polyline(latLngs, {
        color: '#0284c7',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);

      // Fit bounds to show all stops
      map.fitBounds(window.L.latLngBounds(latLngs), { padding: [40, 40] });
    }

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [deliveries, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ef4444', color: 'white', padding: '6px', borderRadius: '10px', display: 'flex' }}>
              <MapPin size={22} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
              Daily Delivery Route & Navigation
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Visual map of today's customer delivery stops with turn-by-turn route sequencing
          </p>
        </div>

        <button onClick={loadRouteDeliveries} className="btn btn-secondary">
          <RotateCcw size={14} />
          <span>Refresh Route</span>
        </button>
      </div>

      {/* Main Grid: Interactive Map + Sequential Route Stops */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '20px' }}>
        {/* Left: OpenStreetMap Container */}
        <div className="ocean-card" style={{ padding: '12px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} />
              <span>Live Delivery Route Map (OpenStreetMap)</span>
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {deliveries.filter(d => d.latitude && d.longitude).length} mapped stops
            </span>
          </div>

          <div 
            ref={mapRef} 
            id="leaflet-map"
            style={{ width: '100%', height: '520px', borderRadius: '12px', zIndex: 1 }}
          />
        </div>

        {/* Right: Sequential Route Itinerary */}
        <div className="ocean-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '580px', overflowY: 'auto' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              Route Itinerary ({deliveries.length} Stops)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Optimized order sequence for driver
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deliveries.map((stop, idx) => (
              <div 
                key={stop.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: stop.status === 'Delivered' ? '#10b981' : '#0284c7', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      {stop.business_name || stop.customer_name}
                    </strong>
                  </div>

                  <span className={`badge badge-${stop.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stop.status}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="#0284c7" />
                  <span>{stop.delivery_address}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>
                    ₹{stop.total_amount} ({stop.payment_status})
                  </span>

                  {/* 1-Click Navigate Button */}
                  <button
                    onClick={() => openGoogleMapsNavigation(stop.latitude, stop.longitude, stop.delivery_address)}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
                  >
                    <NavIcon size={12} />
                    <span>Navigate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
