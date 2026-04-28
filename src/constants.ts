export const DEFAULT_CATERING_FIELDS = [
  { id: 'customerName', label: 'Client Name', type: 'text', required: true },
  { id: 'customerPhone', label: 'Phone', type: 'text', required: true },
  { id: 'date', label: 'Event Date', type: 'date', required: true },
  { id: 'servingTime', label: 'Serving Time', type: 'text', required: true },
  { id: 'address', label: 'Delivery Address', type: 'text', required: false },
  { id: 'location', label: 'Location Map Link', type: 'text', required: false },
  { id: 'paymentMethod', label: 'Payment Method', type: 'dropdown', options: ['Cash on Delivery', 'Online', 'Bank Transfer'], required: true },
];

export const DEFAULT_PREORDER_FIELDS = [
  { id: 'customer', label: 'Customer Name', type: 'text', required: true },
  { id: 'phone', label: 'Phone Number', type: 'text', required: true },
  { id: 'date', label: 'Order Date', type: 'date', required: true },
  { id: 'time', label: 'Order Time', type: 'text', required: true },
  { id: 'orderType', label: 'Order Type', type: 'dropdown', options: ['Pick Up', 'Delivery'], required: true },
  { id: 'paymentStatus', label: 'Payment Status', type: 'dropdown', options: ['Paid', 'Unpaid'], required: true },
  { id: 'address', label: 'Delivery Address', type: 'text', required: false },
];
