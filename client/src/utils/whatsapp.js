// WhatsApp Integration & Deep Linking Utility

/**
 * Clean phone number for WhatsApp deep link (adds 91 default country code if missing)
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Resolve phone number from either a customer record or a joined order/delivery object
 */
function resolveWhatsAppPhone(customer, order) {
  return (
    customer?.whatsapp_number ||
    customer?.customer_whatsapp ||
    customer?.phone ||
    customer?.customer_phone ||
    order?.customer_whatsapp ||
    order?.customer_phone ||
    ''
  );
}

/**
 * Resolve customer display name from either a customer record or a joined order/delivery object
 */
function resolveCustomerName(customer, order, fallback = 'Customer') {
  return (
    customer?.business_name ||
    customer?.name ||
    customer?.customer_name ||
    order?.business_name ||
    order?.customer_name ||
    fallback
  );
}

/**
 * Resolve delivery address from either an order/delivery or customer object
 */
function resolveDeliveryAddress(customer, order, fallback = 'Standard location') {
  return (
    order?.delivery_address ||
    order?.customer_address ||
    customer?.address ||
    customer?.customer_address ||
    customer?.delivery_address ||
    fallback
  );
}

/**
 * Open WhatsApp chat with prefilled message
 */
export function openWhatsApp(phone, message) {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  const url = formattedPhone 
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

/**
 * Template 1: Order Confirmation
 */
export function sendOrderConfirmation(customer, order) {
  const items = order?.items || order?.order_items || [];
  const itemsText = items
    .map(it => `• ${it.quantity} x ${it.product_name} (₹${it.subtotal ?? (it.quantity * (it.price || 0))})`)
    .join('\n');

  const customerName = resolveCustomerName(customer, order, 'Valued Customer');
  const address = resolveDeliveryAddress(customer, order, 'Standard location');
  const phone = resolveWhatsAppPhone(customer, order);

  const text = 
`Hello ${customerName},

Your Ocean Enterprises order *#${order.order_number}* has been confirmed! 🌊

*Order Details:*
${itemsText || 'Standard items'}

*Total Amount:* ₹${order.total_amount}
*Payment Status:* ${order.payment_status}
*Delivery Address:* ${address}

Thank you for choosing Ocean Enterprises! Pure Water & Refreshing Drinks Express Distribution.`;

  openWhatsApp(phone, text);
}

/**
 * Template 2: Delivery Notification (Out for Delivery)
 */
export function sendDeliveryNotification(customer, order) {
  const customerName = resolveCustomerName(customer, order, 'Customer');
  const address = resolveDeliveryAddress(customer, order, 'Standard location');
  const phone = resolveWhatsAppPhone(customer, order);

  const text = 
`Hello ${customerName},

🚚 Your Ocean Enterprises order *#${order.order_number}* is *OUT FOR DELIVERY* and will reach you shortly!

*Delivery Address:* ${address}
*Total Amount:* ₹${order.total_amount} (${order.payment_status === 'Paid' ? 'Paid Online' : 'Cash/UPI Due: ₹' + (order.total_amount - (order.paid_amount || 0))})

Please ensure someone is available at the counter to receive the shipment.

Thank you!
Ocean Enterprises`;

  openWhatsApp(phone, text);
}

/**
 * Template 3: Order Delivered
 */
export function sendOrderDelivered(customer, order) {
  const customerName = resolveCustomerName(customer, order, 'Customer');
  const phone = resolveWhatsAppPhone(customer, order);

  const text = 
`Hello ${customerName},

✅ Your order *#${order.order_number}* from *Ocean Enterprises* has been delivered successfully!

Thank you for your business! If you need empty water jars picked up or a refill tomorrow, just reply to this chat.

Have a wonderful day! 💧`;

  openWhatsApp(phone, text);
}

/**
 * Template 4: Payment Reminder
 */
export function sendPaymentReminder(customer, amountDue, upiId = 'oceanenterprises@okhdfcbank') {
  const customerName = resolveCustomerName(customer, null, 'Customer');
  const phone = resolveWhatsAppPhone(customer, null);

  const text = 
`Hello ${customerName},

Greetings from *Ocean Enterprises*! 🌊

This is a gentle reminder that an outstanding balance of *₹${amountDue}* is currently pending on your account.

*Payment Options:*
• UPI Payment: *${upiId}*
• Or Pay Cash to our delivery representative.

If you have already made this payment, kindly ignore this message or send the payment screenshot.

Thank you for your cooperation!
Ocean Enterprises`;

  openWhatsApp(phone, text);
}

/**
 * Template 5: Customer "Order on WhatsApp" pre-filled message generator
 */
export function generateOrderCatalogLink(businessPhone = '919876543210') {
  const template = 
`Hello Ocean Enterprises, I want to place an order.

Water:
2 x 20L Water Jar

Cold Drinks:
3 x Thums Up
2 x Appy Fizz

Delivery Location:
[Please enter your shop/business name & address here]`;

  return `https://wa.me/${businessPhone}?text=${encodeURIComponent(template)}`;
}
