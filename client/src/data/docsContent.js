// Structured Documentation Content for the Ocean Enterprises Help & Documentation Center (/docs)
// Grounded strictly in the verified features, routes, and workflows of the application.

export const DOCS_CONTACT = {
  businessName: 'Ocean Enterprises',
  tagline: 'Packaged Drinking Water & Wholesale Beverage Distribution',
  address: 'Muntaha Building, JVLR Road, Jogeshwari (West), Mumbai - 400102',
  phone: '+91 98765 43210',
  whatsapp: '919876543210',
  email: 'orders@oceanenterprises.com'
};

export const DOCS_ROUTES = [
  {
    slug: 'getting-started',
    path: '/docs/getting-started',
    title: 'Overview & Getting Started',
    shortTitle: 'Getting Started',
    category: 'Foundations',
    readTime: '4 min read',
    summary: 'Learn how Ocean Enterprises BMS connects 20L water supply, wholesale beverage orders, GPS route dispatch, and customer ledgers in one workspace.',
    sections: [
      {
        id: 'what-is-ocean-bms',
        heading: '1. What is the Ocean Enterprises Workspace?',
        paragraphs: [
          'The Ocean Enterprises Business Management System is an operational command center and financial ledger built specifically for packaged drinking water supply (20L refillable jars, 1L and 500ml bottled water boxes) and wholesale cold-beverage distribution (Frooti, Appy Fizz, Thums Up, Smoodh, B Fizz, and fruit drinks).',
          'The platform replaces paper delivery slips, manual calculator tallies, and scattered WhatsApp chats with a single system that tracks daily water drops, multi-item beverage orders, delivery van routes, warehouse stock, and customer receivables in real time.'
        ],
        highlights: [
          {
            label: '10-Second Rapid Water Entry',
            detail: 'Log daily 20L water jar drops with tactile +1, +2, +5, +10 buttons, automatic stock deduction, and 1-click WhatsApp receipts.'
          },
          {
            label: 'WhatsApp Order Parser',
            detail: 'Paste unstructured customer WhatsApp messages to automatically detect products, quantities, and customer details.'
          },
          {
            label: 'Live Dispatch & GPS Route Map',
            detail: 'Track orders from New Order to Delivered with ordered stop sequences and Leaflet + Google Maps turn-by-turn navigation.'
          },
          {
            label: 'FIFO Receivables & Monthly Ledgers',
            detail: 'Record full or partial payments via Cash, UPI, Bank Transfer, or Cheque with automatic oldest-first settlement.'
          }
        ]
      },
      {
        id: 'signing-in',
        heading: '2. Signing In to the Workspace',
        paragraphs: [
          'To access operational modules, open the application and sign in with your administrator or operator credentials. Your authenticated session remains active for 30 days on your device until you sign out.'
        ],
        steps: [
          'Open the Ocean Enterprises login screen at the root URL (/).',
          'In the "Email or Phone Number" field, enter your registered email (e.g., admin@ocean.com), your 10-digit phone number (9876543210 or +91 9876543210), or your account name (Ocean Admin).',
          'Enter your password and click "Sign In to Workspace".',
          'Once signed in, you land directly on the Operations & Distribution Command Dashboard.'
        ],
        callout: {
          type: 'tip',
          title: 'Flexible Sign-In Identifiers',
          text: 'You do not need to type the "+91" country code when signing in with a phone number. Entering the 10-digit mobile number (9876543210), full email (admin@ocean.com), or account name (Ocean Admin) all work seamlessly.'
        }
      },
      {
        id: 'workspace-navigation',
        heading: '3. Navigating the Interface (Desktop & Mobile)',
        paragraphs: [
          'The workspace adapts automatically to desktop monitors at the plant office and mobile phones carried by delivery drivers.'
        ],
        table: {
          headers: ['Navigation Area', 'Where It Appears', 'Primary Purpose'],
          rows: [
            ['Left Sidebar', 'Desktop (fixed) & Mobile (slide-out drawer via ☰ button)', 'Full navigation across all 11 operational modules plus Help & Docs.'],
            ['Top Header Bar', 'All screens (sticky top bar)', 'Contains the Plant Active indicator, Global Search (Ctrl+K), "+ Rapid Water" shortcut, Help button, and Log Out.'],
            ['Global Search Modal', 'Press Ctrl+K (or Cmd+K on Mac) from any screen', 'Instant cross-workspace search across Customers, Products, and Orders.'],
            ['Mobile Bottom Bar', 'Mobile & tablet screens (<= 1024px width)', '1-thumb access to Home, Water, Orders (WhatsApp), Delivery, and Clients.']
          ]
        }
      },
      {
        id: 'daily-plant-workflow',
        heading: '4. Recommended Daily Plant Workflow',
        paragraphs: [
          'Follow this five-step sequence for smooth daily plant and dispatch operations:'
        ],
        steps: [
          'Morning Stock Check: Open "Inventory & Stock" or check the Dashboard "Low Stock Alerts" panel to verify 20L water jars and beverage cases before loading vans.',
          'Log Rapid Water Drops: Use "Rapid Water Entry" for quick dockside or van 20L jar deliveries throughout the day.',
          'Process Incoming WhatsApp Orders: Paste customer text messages into "WhatsApp Orders", review the parsed items, and click "Accept & Create Order".',
          'Dispatch & Navigate: Open "Deliveries" and "Route Map" to sequence stops, launch Google Maps navigation, and update statuses to Out for Delivery and Delivered.',
          'Evening Collections & Reconciliation: Record cash and UPI collections in "Payments", send 1-click WhatsApp reminders for pending balances, and review "Reports".'
        ]
      }
    ]
  },
  {
    slug: 'user-guide',
    path: '/docs/user-guide',
    title: 'Step-by-Step Operator User Guide',
    shortTitle: 'User Guide',
    category: 'Operations Manual',
    readTime: '8 min read',
    summary: 'Complete step-by-step instructions for logging water deliveries, parsing WhatsApp orders, dispatching routes, managing customers, and settling payments.',
    sections: [
      {
        id: 'dashboard-operations',
        heading: '1. Using the Operations Dashboard',
        paragraphs: [
          'The Dashboard gives you an immediate pulse of today\'s plant activity and outstanding receivables.'
        ],
        steps: [
          'Review the 6 top KPI cards: Today\'s Orders, Water Jars (20L), Beverage Orders, Pending Deliveries, Pending Payments, and Today\'s Sales.',
          'Check the "Live Dispatch Pipeline" bar to see how many active orders are in New Order, Confirmed, Preparing, Out for Delivery, or Delivered status.',
          'Use the "Today\'s Active Orders" table to update an order\'s status directly using the inline status dropdown without leaving the Dashboard.',
          'Click "Sync Live" in the top-right corner at any time to refresh all metrics from the database.'
        ]
      },
      {
        id: 'rapid-water-entry-guide',
        heading: '2. Recording a 10-Second Rapid Water Supply Entry',
        paragraphs: [
          'Rapid Water Entry is designed for high-speed 20L water jar logging without creating a multi-item order.'
        ],
        steps: [
          'Click "Rapid Water Entry" in the sidebar or "+ Rapid Water" in the top header.',
          'Filter or choose the client in "1. Select Customer". The dropdown shows each customer\'s business name, contact person, and current pending balance.',
          'Set the jar count in "2. Water Jar Quantity (20L)" using the +1, +2, +5, +10, or Reset (1) buttons, or type a number directly. Adjust "Price / Jar (₹)" if the customer has a custom rate (default is ₹35).',
          'In "3. Payment Status", choose either "⏳ Pending (Add to Monthly Ledger)" or "✅ Paid Instantly" (and select Cash, UPI, or Bank Transfer).',
          'Click "SAVE WATER ENTRY". Stock for 20L Water Jar is deducted automatically.',
          'Click "Send WhatsApp Slip" on the green confirmation banner to send a formatted delivery receipt with today\'s jar count and updated account balance.'
        ],
        callout: {
          type: 'note',
          title: 'Monthly Water Summary Tab',
          text: 'On the right panel of Rapid Water Entry, switch from "Today\'s Water Log" to "Customer Monthly Water Ledger" and pick any month (YYYY-MM) to inspect total jars delivered, delivery days, paid amounts, and pending dues per customer.'
        }
      },
      {
        id: 'whatsapp-orders-guide',
        heading: '3. Parsing & Managing WhatsApp Orders',
        paragraphs: [
          'When customers send informal orders over WhatsApp (such as "2 water bottles, 3 Thums Up, 2 Appy Fizz"), the WhatsApp Order Processing Engine converts the text into a structured order.'
        ],
        steps: [
          'Open "WhatsApp Orders" from the sidebar.',
          'Paste the customer\'s message into "1. Paste Customer WhatsApp Message" and click "Auto-Parse Message".',
          'Inspect the "Parsed Order Preview": verify the Confidence badge (HIGH when both customer and products are matched, MEDIUM when products are matched), confirm or select the customer, and review the extracted items and subtotals.',
          'Add any optional delivery notes and click "Accept & Create Order".',
          'Use the right-hand "Order Processing & WhatsApp Notification Queue" to send 1-click WhatsApp updates: Confirm Order, Out for Delivery, Delivered, Remind Payment, or Mark Paid.'
        ]
      },
      {
        id: 'deliveries-and-route-map',
        heading: '4. Managing Deliveries & Interactive GPS Route Map',
        paragraphs: [
          'Every created order automatically generates a delivery stop on the Delivery Management Board.'
        ],
        steps: [
          'Open "Deliveries" from the sidebar and filter by status (All, New Order, Confirmed, Preparing, Out for Delivery, Delivered).',
          'Use the Up (▲) and Down (▼) arrows on any stop card to reorder the driver\'s delivery sequence.',
          'Click "Navigate (Google Maps)" on any stop card to launch turn-by-turn Google Maps directions.',
          'Click "Interactive Route Map" (or "Route Map" in the sidebar) to view all GPS-pinned stops as numbered markers on OpenStreetMap connected by a route line.'
        ]
      },
      {
        id: 'customers-and-gps-pinning',
        heading: '5. Managing Customers, Live GPS & Account Statements',
        paragraphs: [
          'The Customers module stores client contact details, shop categories (Restaurant, Office, Shop, Residential), GPS coordinates, and full transaction ledgers.'
        ],
        steps: [
          'Open "Customers" and click "+ Add New Customer" (or click the Edit icon on an existing customer).',
          'Enter Customer Name, Business/Shop Name, Customer Type, Phone Number, WhatsApp Number, and Full Delivery Address.',
          'To pin exact map coordinates while at the customer\'s location, click "Capture Live Phone GPS" to fill Latitude and Longitude automatically, then click "Save Customer".',
          'Click "Ledger" on any customer row to view their complete Monthly Breakdown, Water Supply Log, and Order History, or click "Print Statement" to print/save a PDF statement.'
        ]
      },
      {
        id: 'payments-and-receivables',
        heading: '6. Recording Payments & Sending UPI Reminders',
        paragraphs: [
          'The Payments module tracks all cash, UPI, bank transfer, and cheque collections and manages pending customer balances.'
        ],
        steps: [
          'Open "Payments" from the sidebar.',
          'In the left "Pending Receivables" panel, click "Remind" next to any customer to open WhatsApp with an overdue reminder pre-filled with their exact pending balance and your business UPI ID.',
          'Click "Collect" next to a customer (or "+ Record Payment" at the top) to open the payment modal.',
          'Enter the amount received (full or partial), choose the Payment Mode (Cash, UPI, Bank Transfer, Cheque), add optional reference notes, and click "Save Payment".',
          'The system automatically allocates general customer payments in FIFO order—settling the oldest unpaid orders first and then the oldest unpaid water entries.'
        ]
      },
      {
        id: 'products-reports-settings',
        heading: '7. Inventory, Reports & Business Settings',
        paragraphs: [
          'Manage your catalog, analyze performance, and keep company details up to date:'
        ],
        steps: [
          'Inventory & Stock: Open "Inventory & Stock" to add new Water or Beverage SKUs, edit prices and minimum stock alert thresholds, or click "+ Add Stock" to record incoming warehouse stock.',
          'All Orders: Open "All Orders" to create manual multi-item orders, filter by Time Period / Customer / Delivery Status / Payment Status, or click "Export CSV".',
          'Reports: Open "Reports" to switch between the Sales Report (Daily / Weekly / Monthly), Customer-wise Report, and Product-wise Profitability Report. Use "Export CSV" or "Print / PDF" on any report.',
          'Settings: Open "Settings" to update your Business Name, UPI ID, Phone, WhatsApp Number, Warehouse Address, or Admin Password.'
        ]
      }
    ]
  },
  {
    slug: 'features',
    path: '/docs/features',
    title: 'Verified Feature Reference & Rules',
    shortTitle: 'Features & Rules',
    category: 'System Reference',
    readTime: '6 min read',
    summary: 'Detailed breakdown of all implemented features, financial balance rules, FIFO payment allocation, stock restoration logic, and system boundaries.',
    sections: [
      {
        id: 'feature-catalog',
        heading: '1. Complete Implemented Feature Catalog',
        paragraphs: [
          'Every feature listed below is implemented, tested, and active in the Ocean Enterprises workspace:'
        ],
        table: {
          headers: ['Module', 'Key Capabilities', 'Data Export / External Action'],
          rows: [
            ['Dashboard', '6 live KPI cards, Quick Operations launcher, Live Dispatch Pipeline, Active Orders inline status control, Low Stock Alerts.', '1-click navigation to all modules'],
            ['Rapid Water Entry', 'Tactile +1/+2/+5/+10 jar buttons, custom per-jar pricing, Paid/Pending toggle, Today\'s Water Log, Monthly Customer Water Ledger.', '1-click WhatsApp delivery slip'],
            ['WhatsApp Orders', 'Natural-language keyword & quantity parser, customer auto-matching, confidence scoring, notification queue.', '5 WhatsApp message templates'],
            ['Deliveries & Route Map', '5-stage dispatch workflow, manual stop sequence reordering, Leaflet GPS pin map with route polylines.', 'Google Maps turn-by-turn directions'],
            ['Customers', 'Category filtering (Restaurant, Office, Shop, Residential), HTML5 GPS capture, monthly ledger modal.', 'Printable customer account statement'],
            ['Payments', 'Cash/UPI/Bank/Cheque logging, atomic FIFO settlement across orders & water entries, pending receivables ranking.', 'WhatsApp UPI payment reminder'],
            ['All Orders', 'Multi-item order builder, advance payment support, time/status/payment/customer filters, order cancellation/deletion.', 'CSV export + WhatsApp confirmation'],
            ['Inventory & Stock', 'Water & Beverage SKU management, profit/unit calculation, quick +Add Stock modal, low-stock filter.', 'Real-time stock alerts'],
            ['Reports', 'Daily (14d), Weekly (8w), and Monthly (6m) sales breakdown, Customer-wise ledger, Product-wise profit.', 'CSV export + Printable PDF view'],
            ['Settings & Security', 'Company profile, phone/WhatsApp handles, UPI ID configuration, admin password update, 30-day JWT auth.', 'Instant workspace configuration']
          ]
        }
      },
      {
        id: 'financial-calculation-rules',
        heading: '2. Financial Ledger & FIFO Payment Allocation Rules',
        paragraphs: [
          'Understanding how the system calculates pending balances and applies partial payments ensures accurate bookkeeping:'
        ],
        highlights: [
          {
            label: 'Customer Pending Balance Formula',
            detail: 'A customer\'s pending balance equals the sum of (total_amount - paid_amount) across all non-cancelled Orders plus the sum of (total_amount - paid_amount) across all unpaid/partial Water Entries.'
          },
          {
            label: 'Partial Payments on Water Entries & Orders',
            detail: 'Both multi-item Orders and Rapid Water Entries track paid_amount and transition automatically between Pending (₹0 paid), Partial (0 < paid < total), and Paid (paid = total).'
          },
          {
            label: 'Automatic FIFO Allocation',
            detail: 'When you record a general payment in the Payments screen, the system applies the amount to the customer\'s oldest unpaid Orders first (by order date), and then applies any remaining balance to their oldest unpaid Water Entries (by entry date).'
          },
          {
            label: 'Cancelled Orders Excluded',
            detail: 'Marking an order as Cancelled immediately excludes it from revenue totals and customer pending balances.'
          }
        ]
      },
      {
        id: 'inventory-stock-rules',
        heading: '3. Automatic Inventory Deduction & Restoration Rules',
        paragraphs: [
          'Warehouse stock quantities are synchronized automatically with order and water entry lifecycle events:'
        ],
        steps: [
          'Order or Water Entry Created: Product stock is automatically reduced by the ordered quantity (and clamped at 0 so stock never becomes negative).',
          'Order Marked Cancelled: If an active order\'s status is changed to Cancelled, the exact item quantities are automatically added back to product stock.',
          'Cancelled Order Re-Activated: If a Cancelled order is changed back to an active status (e.g., Confirmed), the item quantities are deducted again.',
          'Order or Water Entry Deleted: Deleting a water entry or a non-cancelled order restores the stock quantities and removes associated order items and delivery stops.'
        ]
      },
      {
        id: 'keyboard-shortcuts',
        heading: '4. Keyboard Shortcuts & Accessibility',
        paragraphs: [
          'Use these keyboard shortcuts for faster navigation across the application:'
        ],
        table: {
          headers: ['Shortcut', 'Where It Works', 'Action'],
          rows: [
            ['Ctrl + K (or Cmd + K)', 'Anywhere in the authenticated workspace', 'Opens or closes the Global Search modal.'],
            ['Escape (Esc)', 'Modals, Global Search, and Mobile Drawers', 'Closes the currently open modal or navigation drawer.'],
            ['Tab / Shift + Tab', 'All forms, tables, and Help Center', 'Moves keyboard focus sequentially across interactive controls.']
          ]
        }
      },
      {
        id: 'system-boundaries',
        heading: '5. Current System Boundaries & Transparency Notes',
        paragraphs: [
          'To ensure clear expectations for operators and administrators, please note the following design boundaries:'
        ],
        highlights: [
          {
            label: 'WhatsApp Deep-Link Mode',
            detail: 'WhatsApp buttons open pre-formatted messages in WhatsApp Web or the WhatsApp mobile app (via wa.me links) for you to review and press Send. Inbound WhatsApp messages are pasted into the WhatsApp Orders parser rather than pulled automatically via a paid third-party webhook.'
          },
          {
            label: 'Manual Stop Sequence Control',
            detail: 'Dispatchers control the exact stop order on the Deliveries board using the Up/Down sequence buttons rather than automatic external route-matrix recalculation.'
          }
        ]
      }
    ]
  },
  {
    slug: 'troubleshooting',
    path: '/docs/troubleshooting',
    title: 'Troubleshooting & Common Issues',
    shortTitle: 'Troubleshooting',
    category: 'Support & Diagnostics',
    readTime: '5 min read',
    summary: 'Quickly resolve sign-in errors, missing orders in filtered views, missing GPS pins on the route map, WhatsApp parser mismatches, and browser popup blocks.',
    sections: [
      {
        id: 'login-troubleshooting',
        heading: '1. Sign-In & Session Issues',
        paragraphs: [
          'If you encounter an error while signing in or your session unexpectedly returns to the login screen, check the following solutions:'
        ],
        table: {
          headers: ['Error / Symptom', 'Root Cause', 'How to Fix It'],
          rows: [
            ['"Invalid credentials. Please check your email/phone." (401)', 'The entered email, phone number, or account name did not match an account.', 'Enter admin@ocean.com, 9876543210, +91 9876543210, or Ocean Admin.'],
            ['"Invalid password. Please try again." (401)', 'The password does not match the current administrator password.', 'Check Caps Lock and spaces. If changed in Settings, use the updated password.'],
            ['Redirected to Sign-In when clicking a menu tab', 'Your 30-day session token expired or browser storage was cleared.', 'Sign in again to issue a fresh 30-day session token.'],
            ['"Authentication service is not configured" (503)', 'Production JWT_SECRET environment variable is missing or shorter than 16 characters.', 'Ask the system administrator to configure a strong JWT_SECRET in the hosting environment.']
          ]
        }
      },
      {
        id: 'orders-and-filters-troubleshooting',
        heading: '2. Missing Orders or Empty Tables',
        paragraphs: [
          'If you know orders or customers exist in the system but a table displays "No orders match the selected filters":'
        ],
        steps: [
          'On the "All Orders" page, check the 4 filter dropdowns at the top: set Time Period to "All Time", Customer to "All Customers", Delivery Status to "All Delivery Status", and Payment Status to "All Payment Status".',
          'Clear any text typed into the Search input box.',
          'On the "Customers" or "Inventory & Stock" pages, ensure the category filter is set to "All" and "Low Stock Only" is unchecked if you want to see the full catalog.'
        ]
      },
      {
        id: 'map-and-gps-troubleshooting',
        heading: '3. Route Map & GPS Coordinate Issues',
        paragraphs: [
          'If a scheduled delivery appears in the Stop Sequence list with a yellow "No GPS" badge instead of a numbered pin on the map:'
        ],
        steps: [
          'Open "Customers" from the left sidebar and locate the customer.',
          'Click the "Edit" (pencil) button on the customer\'s row.',
          'Click "Capture Live Phone GPS" (if you are at the customer\'s location and have allowed browser location permissions) or enter the customer\'s Latitude and Longitude manually.',
          'Click "Save Customer". For existing orders, ensure the order\'s delivery coordinates or customer coordinates are updated.'
        ],
        callout: {
          type: 'warning',
          title: 'Browser Geolocation Permissions',
          text: 'The "Capture Live Phone GPS" button requires HTTPS (or localhost) and browser permission to access your device location. If blocked, click the lock/site-settings icon in your browser address bar and set Location to Allow.'
        }
      },
      {
        id: 'whatsapp-and-print-troubleshooting',
        heading: '4. WhatsApp Parser & Print Statement Issues',
        paragraphs: [
          'Solutions for WhatsApp text parsing and printable statement windows:'
        ],
        highlights: [
          {
            label: 'WhatsApp Parser Shows LOW Confidence',
            detail: 'Ensure each item includes a quantity and a recognized product keyword such as "20L", "water", "jar", "1L", "500ml water", "Frooti 1.2", "Frooti 600", "Frooti 300", "Frooti 160", "Appy Fizz", "Thums Up", "Litchi", or "Guava". Separate multiple items with commas, newlines, or plus signs (+).'
          },
          {
            label: 'Print Statement or WhatsApp Window Does Not Open',
            detail: 'Both Print Statement and WhatsApp actions open a new browser tab. If nothing happens when clicking the button, disable your browser\'s pop-up blocker for this site.'
          }
        ]
      },
      {
        id: 'system-health-verification',
        heading: '5. Checking System & Database Connectivity',
        paragraphs: [
          'Administrators can verify live server and database health at any time by opening `/api/health` (or `/health`) in the browser:'
        ],
        steps: [
          'Open /api/health in a new browser tab.',
          'Verify that "status" is "online", "storage" is "postgresql", "database_connected" is true, and "persistent" is true.',
          'If "status" shows "degraded", the database connection requires administrator attention.'
        ]
      }
    ]
  },
  {
    slug: 'faq',
    path: '/docs/faq',
    title: 'Frequently Asked Questions (FAQ)',
    shortTitle: 'FAQ',
    category: 'Quick Answers',
    readTime: '5 min read',
    summary: 'Direct answers to common questions about signing in, water jar pricing, partial payments, inventory restoration, WhatsApp slips, and reports.',
    sections: [
      {
        id: 'faq-list',
        heading: 'Frequently Asked Questions',
        paragraphs: [
          'Browse common operational questions grouped by workflow, or use the search bar above to filter by keyword.'
        ],
        faqs: [
          {
            category: 'Sign-In & Account',
            question: 'What can I enter in the "Email or Phone Number" field on the login screen?',
            answer: 'You can sign in using your registered email address (admin@ocean.com), your 10-digit phone number (9876543210), your full phone number with country code (+91 9876543210), or your account name (Ocean Admin).'
          },
          {
            category: 'Sign-In & Account',
            question: 'How do I change the administrator password?',
            answer: 'Sign in, open "Settings" from the left sidebar, scroll to the "Change Admin Password" card, enter your current password and your new password (at least 6 characters), and click "Update Password".'
          },
          {
            category: 'Rapid Water Supply',
            question: 'When should I use "Rapid Water Entry" vs. "All Orders"?',
            answer: 'Use "Rapid Water Entry" for fast, single-step 20L water jar deliveries (takes under 10 seconds). Use "All Orders" or "WhatsApp Orders" when a customer orders multiple different products (such as water jars plus cases of Frooti, Thums Up, or Appy Fizz) that require staged delivery tracking.'
          },
          {
            category: 'Rapid Water Supply',
            question: 'Can I set a custom price per 20L water jar for a specific delivery?',
            answer: 'Yes. While the default rate in Rapid Water Entry is ₹35 per jar, you can edit the "Price / Jar (₹)" field before saving, and the total payable will recalculate automatically.'
          },
          {
            category: 'Rapid Water Supply',
            question: 'What happens if I accidentally log a wrong water entry?',
            answer: 'In the "Today\'s Water Log" table on the right side of the Rapid Water Entry screen, click the red trash icon next to the entry. Confirming deletion removes the entry, deletes any payment created with it, and restores the water jars back into warehouse stock.'
          },
          {
            category: 'Payments & Ledgers',
            question: 'How does the system handle partial payments from a customer?',
            answer: 'When you record a partial payment in the "Payments" screen (for example, ₹200 paid toward a ₹350 water bill), the system updates the water entry or order to "Partial", records ₹200 as paid_amount, and leaves ₹150 as the customer\'s remaining pending balance across the Customer Ledger, Dashboard, Water Summary, and Reports.'
          },
          {
            category: 'Payments & Ledgers',
            question: 'In what order are general customer payments applied to unpaid bills?',
            answer: 'General payments are allocated automatically using FIFO (First-In, First-Out): the payment settles the customer\'s oldest unpaid or partial Orders first, and any remaining amount settles their oldest unpaid or partial Water Entries.'
          },
          {
            category: 'Payments & Ledgers',
            question: 'Where do I change the UPI ID included in WhatsApp payment reminders?',
            answer: 'Open "Settings" from the sidebar, update the "UPI ID (for WhatsApp Payment Reminders)" field (for example, oceanenterprises@okhdfcbank), and click "Save Business Settings".'
          },
          {
            category: 'Orders & WhatsApp',
            question: 'Does the app send WhatsApp messages automatically in the background?',
            answer: 'No. Clicking any WhatsApp action button opens WhatsApp Web (on desktop) or the WhatsApp app (on mobile) with the customer\'s phone number and a formatted message pre-filled so you can review it and tap Send.'
          },
          {
            category: 'Deliveries & Route Map',
            question: 'How do I change the stop order for a delivery driver?',
            answer: 'Open "Deliveries" from the sidebar and click the Up (▲) or Down (▼) arrow buttons next to the stop number (#1, #2, #3...) on any delivery card. The updated sequence is saved immediately and reflected on the Interactive Route Map.'
          },
          {
            category: 'Inventory & Reports',
            question: 'If I cancel or delete an order, is the product stock restored?',
            answer: 'Yes. Changing an order\'s status to "Cancelled" or deleting an active order automatically adds the ordered item quantities back into product stock. If a already-cancelled order is later deleted, stock is not double-added.'
          },
          {
            category: 'Inventory & Reports',
            question: 'How can I download data for Excel or accounting software?',
            answer: 'You can click "Export CSV" on the "All Orders" screen and on all three tabs of the "Reports" screen (Sales Report, Customer-wise Report, and Product-wise Report). You can also click "Print / PDF" on Reports or "Print Statement" inside any Customer Ledger.'
          }
        ]
      }
    ]
  }
];

/**
 * Resolve which documentation article slug corresponds to a URL pathname.
 */
export function resolveDocSlugFromPath(pathname = '') {
  const clean = String(pathname || '').replace(/\/+$/, '');
  if (!clean || clean === '/docs') {
    return 'getting-started';
  }
  const parts = clean.split('/');
  const last = parts[parts.length - 1];
  const found = DOCS_ARTICLES_MAP[last];
  return found ? found.slug : 'getting-started';
}

export const DOCS_ARTICLES_MAP = DOCS_ROUTES.reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});

/**
 * Case-insensitive search across all documentation articles, sections, steps, tables, callouts, and FAQs.
 */
export function searchDocumentation(rawQuery) {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return [];

  const results = [];

  for (const article of DOCS_ROUTES) {
    const titleMatch = article.title.toLowerCase().includes(query);
    const summaryMatch = article.summary.toLowerCase().includes(query);

    if (titleMatch || summaryMatch) {
      results.push({
        id: `${article.slug}__overview`,
        slug: article.slug,
        path: article.path,
        articleTitle: article.title,
        category: article.category,
        sectionId: article.sections[0]?.id || '',
        sectionHeading: article.title,
        snippet: article.summary,
        score: titleMatch ? 100 : 80
      });
    }

    for (const section of article.sections) {
      const headingMatch = section.heading.toLowerCase().includes(query);
      const matchingParagraph = (section.paragraphs || []).find(p => p.toLowerCase().includes(query));
      const matchingStep = (section.steps || []).find(s => s.toLowerCase().includes(query));
      const matchingHighlight = (section.highlights || []).find(
        h => h.label.toLowerCase().includes(query) || h.detail.toLowerCase().includes(query)
      );
      const matchingCallout =
        section.callout &&
        (section.callout.title.toLowerCase().includes(query) ||
          section.callout.text.toLowerCase().includes(query))
          ? section.callout
          : null;
      const matchingTableRow = section.table?.rows?.find(row =>
        row.some(cell => String(cell).toLowerCase().includes(query))
      );

      if (
        headingMatch ||
        matchingParagraph ||
        matchingStep ||
        matchingHighlight ||
        matchingCallout ||
        matchingTableRow
      ) {
        let snippet = section.paragraphs?.[0] || article.summary;
        if (matchingParagraph) snippet = matchingParagraph;
        else if (matchingStep) snippet = matchingStep;
        else if (matchingHighlight) snippet = `${matchingHighlight.label}: ${matchingHighlight.detail}`;
        else if (matchingCallout) snippet = `${matchingCallout.title}: ${matchingCallout.text}`;
        else if (matchingTableRow) snippet = matchingTableRow.join(' — ');

        results.push({
          id: `${article.slug}__${section.id}`,
          slug: article.slug,
          path: article.path,
          articleTitle: article.title,
          category: article.category,
          sectionId: section.id,
          sectionHeading: section.heading,
          snippet,
          score: headingMatch ? 90 : 60
        });
      }

      if (section.faqs) {
        section.faqs.forEach((faq, idx) => {
          if (
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query) ||
            faq.category.toLowerCase().includes(query)
          ) {
            results.push({
              id: `${article.slug}__faq_${idx}`,
              slug: article.slug,
              path: article.path,
              articleTitle: article.title,
              category: `FAQ • ${faq.category}`,
              sectionId: section.id,
              sectionHeading: faq.question,
              snippet: faq.answer,
              score: faq.question.toLowerCase().includes(query) ? 85 : 65
            });
          }
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
