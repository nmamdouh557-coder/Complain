import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { db } from './src/lib/db.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.set('trust proxy', 1); // Trust Railway's proxy

  const safeParse = (val: any) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return Array.isArray(val) ? val : (val ? [val] : []);
  };

  const safeParseObj = (val: any) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return val && typeof val === 'object' ? val : {};
  };

  console.log('Starting server...');
  
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL is not set in environment variables.');
    console.error('PostgreSQL connection will fail unless DATABASE_URL is provided.');
  } else {
    const dbInfo = process.env.DATABASE_URL.split('@').pop();
    console.log(`DATABASE_URL is present. Attempting to connect to: ${dbInfo}`);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cors());

  // Initialization state
  let dbInitialized = false;
  let serverInitializationError: any = null;

  // Middleware to check for initialization - early return if failed
  app.use((req, res, next) => {
    // Log every request to help debug routing
    if (req.path.startsWith('/api/')) {
      console.log(`[API Request] ${req.method} ${req.path} - dbInitialized: ${dbInitialized}`);
    }

    if (req.path.startsWith('/api/') && req.path !== '/api/health' && req.path !== '/api/debug-server') {
      if (serverInitializationError) {
        console.error(`[API Error] Blocking request due to initialization error: ${serverInitializationError.message}`);
        return res.status(503).json({ 
          message: 'Database initialization failed. Please check your connection.',
          error: serverInitializationError.message || String(serverInitializationError),
          hint: 'This usually means the DATABASE_URL is incorrect or the database is unreachable.'
        });
      }
      
      if (!dbInitialized && req.path !== '/api/upload' && !req.path.includes('login') && req.method !== 'OPTIONS') {
         console.warn(`[API Warn] Request to ${req.path} while database is still initializing...`);
         // We can choose to block here if we want to be safe
         // return res.status(503).json({ message: 'Database is still initializing. Please wait a few seconds and try again.' });
      }
    }
    next();
  });

  // Cloudinary Configuration
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  
  if (hasCloudinary) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  const storage = hasCloudinary ? new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'complaints',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov'],
      resource_type: 'auto'
    } as any,
  }) : multer.memoryStorage(); // Fallback to memory if no Cloudinary

  const upload = multer({ storage: storage });
  
  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Debug route
  app.get('/api/debug-server', (req, res) => {
    res.json({ message: 'Server is running and routing correctly', node_env: process.env.NODE_ENV });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      dbInitialized,
      hasError: !!serverInitializationError,
      error: serverInitializationError ? serverInitializationError.message : null
    });
  });

  // Cloudinary direct upload route
  app.post('/api/upload', (req, res, next) => {
    console.log(`${new Date().toISOString()} - Uploading files...`);
    upload.array('files')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          message: 'File upload error', 
          error: err.message,
          code: err.code
        });
      }
      next();
    });
  }, (req: any, res) => {
    try {
      if (!hasCloudinary) {
        console.warn('Upload attempted but Cloudinary not configured');
        return res.status(503).json({ 
          message: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.' 
        });
      }

      const files = req.files as any[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const urls = files.map(file => file.path || file.secure_url);
      console.log(`Successfully uploaded ${urls.length} files to Cloudinary`);
      res.json({ urls });
    } catch (error) {
      console.error('Upload handler error:', error);
      res.status(500).json({ message: 'Failed to process uploaded files' });
    }
  });

  // Database setup - already handled by lib/db.js
  
  // Helper functions
  const checkRole = async (userId: any, allowedRoles: string[]) => {
    console.log(`[checkRole] Checking role for userId: ${userId}, allowedRoles: ${JSON.stringify(allowedRoles)}`);
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.warn('[checkRole] Invalid userId provided:', userId);
      return false;
    }
    
    let user = await db.get('SELECT username, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.log(`[checkRole] User not found by ID, checking by username: ${userId}`);
      user = await db.get('SELECT username, role FROM users WHERE LOWER(username) = LOWER(?)', [userId]);
    }
    
    if (!user) {
      console.warn(`[checkRole] User not found for: ${userId}`);
      return false;
    }
    
    const isAllowed = allowedRoles.includes(user.role);
    console.log(`[checkRole] User: ${user.username}, Role: ${user.role}, Allowed: ${isAllowed}`);
    return isAllowed;
  };
  
  // Config routes - move them here to ensure they are defined early
  app.get('/api/config', async (req, res) => {
    try {
      const configs = await db.all('SELECT * FROM configurations');
      res.json(configs.map(c => ({ ...c, value: safeParse(c.value) })));
    } catch (error) {
      console.error('Failed to fetch config:', error);
      res.status(500).json({ message: 'Failed to fetch configuration', error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const { key, value, userId } = req.body;
      if (!await checkRole(userId, ['admin', 'supervisor'])) {
        return res.status(403).json({ 
          message: 'Access denied',
          hint: 'Your session might be outdated. Please try logging out and logging in again.'
        });
      }
      const valueStr = JSON.stringify(value);
      await db.run(
        'INSERT INTO configurations (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, valueStr]
      );
      res.json({ key, value });
    } catch (error) {
      console.error('Update config error:', error);
      res.status(500).json({ message: 'Failed to update configuration' });
    }
  });

  console.log('Initializing database...');
  
  const initializeDatabase = async () => {
    try {
      console.log('Opening database...');
      console.log('Executing schema creation...');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      brand TEXT,
      brands TEXT DEFAULT '[]',
      branch TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      complaint_number TEXT UNIQUE NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      branch TEXT NOT NULL,
      platform TEXT NOT NULL,
      order_id TEXT,
      order_date TEXT,
      complaint_source TEXT NOT NULL,
      type_of_complaint TEXT,
      title TEXT NOT NULL,
      case_type TEXT NOT NULL,
      item TEXT,
      product TEXT,
      response TEXT,
      notes TEXT,
      comment TEXT,
      admin_notes TEXT,
      admin_notes_by TEXT,
      admin_notes_by_username TEXT,
      amount_spent TEXT,
      responsible_party TEXT,
      action_taken TEXT,
      complaint_comment TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT NOT NULL DEFAULT 'medium',
      is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
      is_processed BOOLEAN NOT NULL DEFAULT FALSE,
      validation_status TEXT,
      date_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      images TEXT DEFAULT '[]',
      created_by TEXT,
      creator_username TEXT,
      closed_by_username TEXT,
      closed_at TIMESTAMP,
      updated_by TEXT,
      updated_by_username TEXT,
      custom_fields TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP,
      escalation_timestamp TIMESTAMP,
      validation_timestamp TIMESTAMP,
      flag_note_timestamp TIMESTAMP,
      follow_up_timestamp TIMESTAMP,
      opx_responsible_party TEXT,
      opx_comment TEXT,
      follow_up_satisfaction TEXT,
      follow_up_agent_resolution TEXT,
      follow_up_help_provided TEXT,
      follow_up_service_suggestions TEXT,
      follow_up_overall_rating TEXT,
      branch_comment TEXT,
      branch_attachments TEXT DEFAULT '[]',
      branch_response_at TIMESTAMP,
      assigned_to TEXT,
      assigned_to_username TEXT,
      CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
      CONSTRAINT fk_admin_notes_by FOREIGN KEY (admin_notes_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_branch ON complaints(branch);
    CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);

    CREATE TABLE IF NOT EXISTS catering_requests (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      brand TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      date TEXT NOT NULL,
      serving_time TEXT,
      address TEXT,
      location TEXT NOT NULL,
      package TEXT,
      items TEXT,
      additional TEXT,
      notes TEXT,
      delivery_charge DECIMAL DEFAULT 0,
      payment_method TEXT,
      total_amount DECIMAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_by TEXT NOT NULL,
      creator_username TEXT,
      confirmed_by TEXT,
      confirmed_by_name TEXT,
      start_time TEXT,
      end_time TEXT,
      process_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_catering_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS catering_availability (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      type TEXT NOT NULL DEFAULT 'Busy',
      busy_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      brand TEXT,
      reason TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_catering_avail_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS catering_logs (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      request_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      user_id TEXT NOT NULL,
      username TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_catering_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_complaints_customer_phone ON complaints(customer_phone);

    CREATE TABLE IF NOT EXISTS configurations (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS manager_requests (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      order_id TEXT,
      brand TEXT NOT NULL,
      branch TEXT NOT NULL,
      reason TEXT NOT NULL,
      request_type TEXT,
      item TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_by TEXT,
      creator_username TEXT,
      approved_by TEXT,
      approver_username TEXT,
      approver_comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP,
      CONSTRAINT fk_manager_requests_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_manager_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      brand TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      creator_username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_suggestions_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id TEXT NOT NULL,
      title TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'GENERAL',
      is_read BOOLEAN DEFAULT FALSE,
      related_id TEXT,
      created_by_username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pre_orders (
      ${!!process.env.DATABASE_URL ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT'},
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      date TEXT,
      time TEXT,
      address TEXT,
      brand TEXT NOT NULL,
      branch TEXT NOT NULL,
      order_type TEXT,
      payment_status TEXT,
      items TEXT,
      total_amount DECIMAL,
      notes TEXT,
      status TEXT DEFAULT 'Pending',
      created_by TEXT,
      creator_username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_pre_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    );
    `);

      console.log('Tables initialized. Running migrations...');
      
      const addColumnIfNotExists = async (tableName: string, columnName: string, columnDef: string) => {
        try {
          const isPostgres = !!process.env.DATABASE_URL;
          let hasColumn = false;

          if (isPostgres) {
            const res = await db.query(
              "SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
              [tableName.toLowerCase(), columnName.toLowerCase()]
            );
            hasColumn = res.rowCount > 0;
          } else {
            const info = await db.all(`PRAGMA table_info(${tableName})`);
            hasColumn = info.some((col: any) => col.name.toLowerCase() === columnName.toLowerCase());
          }

          if (!hasColumn) {
            await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
            console.log(`Added column ${columnName} to ${tableName}`);
          }
        } catch (error) {
          console.error(`Error checking/adding column ${columnName} to ${tableName}:`, error);
        }
      };

      // Run migrations
      await addColumnIfNotExists('users', 'brand', 'TEXT');
  await addColumnIfNotExists('users', 'branch', 'TEXT');
  
  await addColumnIfNotExists('complaints', 'brand', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfNotExists('complaints', 'branch', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfNotExists('complaints', 'is_processed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumnIfNotExists('complaints', 'creator_username', 'TEXT');
  await addColumnIfNotExists('complaints', 'closed_by_username', 'TEXT');
  await addColumnIfNotExists('complaints', 'closed_at', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'validation_status', 'TEXT');
  await addColumnIfNotExists('complaints', 'order_date', 'TEXT');
  await addColumnIfNotExists('complaints', 'action_taken', 'TEXT');
  await addColumnIfNotExists('complaints', 'follow_up_satisfaction', 'TEXT');
  await addColumnIfNotExists('complaints', 'follow_up_overall_rating', 'TEXT');
  await addColumnIfNotExists('complaints', 'amount_spent', 'TEXT');
  await addColumnIfNotExists('complaints', 'responsible_party', 'TEXT');
  await addColumnIfNotExists('complaints', 'branch_comment', 'TEXT');
  await addColumnIfNotExists('complaints', 'is_escalated', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumnIfNotExists('complaints', 'images', "TEXT DEFAULT '[]'");
  await addColumnIfNotExists('complaints', 'custom_fields', "TEXT DEFAULT '{}'");
  await addColumnIfNotExists('complaints', 'priority', "TEXT DEFAULT 'medium'");
  await addColumnIfNotExists('complaints', 'product', 'TEXT');
  await addColumnIfNotExists('complaints', 'response', 'TEXT');
  await addColumnIfNotExists('complaints', 'admin_notes', 'TEXT');
  await addColumnIfNotExists('complaints', 'admin_notes_by_username', 'TEXT');
  await addColumnIfNotExists('complaints', 'comment', 'TEXT');
  await addColumnIfNotExists('notifications', 'created_by_username', 'TEXT');
  
  await addColumnIfNotExists('manager_requests', 'brand', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfNotExists('manager_requests', 'branch', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfNotExists('manager_requests', 'request_type', 'TEXT');
  await addColumnIfNotExists('manager_requests', 'item', 'TEXT');
  await addColumnIfNotExists('manager_requests', 'creator_username', 'TEXT');
  await addColumnIfNotExists('manager_requests', 'approver_username', 'TEXT');
  await addColumnIfNotExists('manager_requests', 'approved_at', 'TIMESTAMP');

  await addColumnIfNotExists('complaints', 'branch_comment', 'TEXT');
  await addColumnIfNotExists('complaints', 'branch_attachments', "TEXT DEFAULT '[]'");
  await addColumnIfNotExists('complaints', 'escalation_timestamp', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'validation_timestamp', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'flag_note_timestamp', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'follow_up_timestamp', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'branch_response_at', 'TIMESTAMP');
  await addColumnIfNotExists('complaints', 'updated_by_username', 'TEXT');
  await addColumnIfNotExists('complaints', 'opx_responsible_party', 'TEXT');
  await addColumnIfNotExists('complaints', 'opx_comment', 'TEXT');
  await addColumnIfNotExists('complaints', 'assigned_to', 'TEXT');
  await addColumnIfNotExists('complaints', 'assigned_to_username', 'TEXT');

  // Catering migrations
  await addColumnIfNotExists('catering_requests', 'serving_time', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'address', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'package', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'items', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'additional', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'delivery_charge', 'DECIMAL DEFAULT 0');
  await addColumnIfNotExists('catering_requests', 'payment_method', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'total_amount', 'DECIMAL DEFAULT 0');
  await addColumnIfNotExists('catering_requests', 'start_time', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'end_time', 'TEXT');
  await addColumnIfNotExists('catering_requests', 'process_message', 'TEXT');

  // Seed default users if not exists
  const seedUsers = async () => {
    // Rename 'Quality' to 'OPX' in users and complaints
    try {
      console.log('Starting migration: Quality -> OPX');
      // Update users table - rename ANY user named Quality to OPX
      const userUpdate = await db.run('UPDATE users SET username = ? WHERE LOWER(username) = LOWER(?)', ['OPX', 'Quality']);
      if ((userUpdate.changes || 0) > 0) {
        console.log(`Renamed ${userUpdate.changes} Quality users to OPX in users table`);
      }

      // Update complaints table - always run to catch missed rows from previous partial migrations
      // Update by username match
      const complaintsUpdate = await db.run('UPDATE complaints SET assigned_to_username = ? WHERE LOWER(assigned_to_username) = LOWER(?)', ['OPX', 'Quality']);
      console.log(`Updated assigned_to_username from Quality to OPX in ${complaintsUpdate.changes || 0} rows`);
      
      const categoryUpdate = await db.run('UPDATE complaints SET title = ? WHERE LOWER(title) = LOWER(?)', ['OPX', 'Quality']);
      console.log(`Updated title from Quality to OPX in ${categoryUpdate.changes || 0} rows`);
      
      // Update where assigned_to matches a user who is now OPX but assigned_to_username is still Quality
      const deepUpdate = await db.run(`
        UPDATE complaints 
        SET assigned_to_username = 'OPX' 
        WHERE assigned_to IN (SELECT id FROM users WHERE username = 'OPX') 
        AND LOWER(assigned_to_username) = LOWER('Quality')
      `);
      console.log(`Deep update fixed ${deepUpdate.changes || 0} assigned_to_username rows`);

      if ((complaintsUpdate.changes || 0) > 0 || (categoryUpdate.changes || 0) > 0 || (deepUpdate.changes || 0) > 0) {
        console.log('Renamed existing Quality assignments to OPX successfully');
      }
    } catch (err) {
      console.error('Migration error:', err);
    }

    const defaultUsers = [
      { id: 'user-id-admin-0000-0000-000000000000', username: 'employee', role: 'employee' },
      { id: 'user-id-admin-0000-0000-000000000001', username: 'team', role: 'complaints_team' },
      { id: 'user-id-admin-0000-0000-000000000002', username: 'manager', role: 'manager' },
      { id: 'user-id-admin-0000-0000-000000000003', username: 'admin', role: 'admin' },
      { id: 'user-id-admin-0000-0000-000000000004', username: 'OPX', role: 'quality', brands: ["yelo", "shakir", "bbt", "Slice", "pattie", "Just c", "chili", "Mishmash", "Table", "FM"] },
      { id: 'user-id-admin-0000-0000-000000000005', username: 'Yelo_Salmiya', role: 'restaurant_user', brand: 'yelo', branch: 'Salmiya' },
    ];

    for (const u of defaultUsers) {
      const exists = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [u.username]);
      const defaultPassword = u.username === 'Yelo_Salmiya' ? 'Yelo_Salmiya123' : 'password123';
      
      if (!exists) {
        await db.run(
          'INSERT INTO users (id, username, password, role, brand, brands, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [u.id, u.username, defaultPassword, u.role, u.brand || null, JSON.stringify(u.brands || []), u.branch || null]
        );
      } else {
        // Only update role, don't revert password if it was changed
        const existingBrands = safeParse(exists.brands);
        const brandsToSet = u.brands || existingBrands;
        
        await db.run(
          'UPDATE users SET id = ?, role = ?, brand = ?, brands = ?, branch = ? WHERE username = ?',
          [u.id, u.role, u.brand || exists.brand, JSON.stringify(brandsToSet), u.branch || exists.branch, u.username]
        );
        
        // Special case: if it's our seeded user and still has the old default, update it to the new expected one
        if (exists.password === 'password123' && u.username === 'Yelo_Salmiya') {
          await db.run('UPDATE users SET password = ? WHERE username = ?', ['Yelo_Salmiya123', u.username]);
        }
      }
    }
  };

  const seedConfigurations = async () => {
    const defaultConfigs = [
      { key: 'brands', value: ["yelo", "shakir", "bbt", "Slice", "pattie", "Just c", "chili", "Mishmash", "Table", "FM"] },
      { key: 'titles', value: ["Dispatch", "OPX", "Critical", "Low Rating", "Others", "Service"] },
      { key: 'platforms', value: ["Ordable", "Talabat", "Cari", "Jahez", "V-Thru", "Deliveroo", "Take Away", "Dine In", "Live Long", "APP", "Keeta", "Call Center"] },
      { key: 'sources', value: ["Call Center Call", "Cari Call Center", "Cari Daily Reviews", "Deliveroo Call Center", "Deliveroo Rating Reviews", "Jahez Call Center", "Jahez Daily Reviews", "Social Media", "Survey Call", "Talabat Call Center", "Talabat Daily Reviews", "V-Thru Call Center", "WhatsApp", "WhatsApp Survey", "Keeta Call center", "Keeta Daily Reviews", "Ordable Daily Reviews", "FM App Reviews", "Live Long Call Center"] },
      { key: 'responsible_parties', value: ["Store", "Aggregator", "Call Center", "Central Kitchen", "Store & Call Center", "Store & Central Kitchen", "Technical issue", "Supplier", "Duplicated Complaints", "Own Driver Verdi", "Own Driver Do", "Own Driver Tokaan", "Call Center & Own Driver", "Pending", "Store & Aggregator", "Invalid Complaint", "Duplicate Complaint", "CPU", "No Answer", "Own Driver Armada", "Brand"] },
      { key: 'responses', value: ["Apology", "Compensation", "Escalated", "Re-Delivery", "Refund", "Refund + Compensation", "Refund + Voucher", "Voucher", "Re-Delivery + Voucher", "Pending", "No Answer"] },
      { key: 'complaint_status', value: ["Open", "Closed", "Escalated"] },
      { key: 'validation_types', value: ["Valid", "Invalid", "No Answer", "Incorrect Info", "Repeated"] },
      { key: 'form_field_ordering', value: ["customerPhone", "customerName", "brand", "branch", "title", "caseType", "platform", "complaintSource", "orderId", "orderDate", "dateTime", "status", "item", "notes"] },
      { key: 'manager_request_types', value: ["Manager Contact", "Refund Request", "Compensation Request", "Other"] },
      { key: 'case_type_mapping', value: {
        "Hygiene": "Critical",
        "Hair": "Critical",
        "Foreign Object": "Critical",
        "Attitude": "Critical",
        "Food Poisoning": "Critical",
        "Expired": "Critical",
        "Rare / Undercooked": "Critical",
        "Bug": "Critical",
        "Over Cooked": "OPX",
        "Less Quantity": "OPX",
        "Bad Smell": "OPX",
        "Rancid Taste": "OPX",
        "Salty": "OPX",
        "Oily": "OPX",
        "Dry": "OPX",
        "Damaged": "OPX",
        "Cold": "OPX",
        "Preparation Delay": "Service",
        "Late Delivery": "Service",
        "Packaging Issue": "Service",
        "Missing Condiment": "Service",
        "Wrong": "Dispatch",
        "Missing Main": "Dispatch",
        "Missing Side": "Dispatch",
        "Missing Drink": "Dispatch",
        "Missing Sauce": "Dispatch",
        "Low Rate": "Low Rating",
        "Technical Issue": "Others"
      }},
      { key: 'brands_branches', value: {
        "yelo": ["Adailiya", "Khairan", "Jaber Al-Ahmad", "Sabah Al-Salem", "Vibes", "Qortuba", "Dahiya Abdullah", "Fahaheel", "Jleeb Al-Shuyo", "Egaila", "Salmiya", "Jabriya", "Ishbiliya", "Sabah Al Ahmad", "Ardiya", "Midan Hawally", "Yard Mall", "Jahra", "Salwa", "Zahra"],
        "shakir": ["Rai", "Qurain", "Salmiya", "City", "Jahra", "Ardiya", "Egaila", "Hawally", "Sabah Al Ahmed"],
        "bbt": ["Shamiya", "Hilltop", "West Mishref", "Yard (Vibes)", "Salmiya", "Adriya", "Jahra", "Adailiya", "Shuhada", "Mangaf"],
        "Slice": ["Mishref", "City", "Yard Mall", "Adailiya", "Jabriya", "Ardiya", "Jahra"],
        "pattie": ["Adailiya", "Mishref", "Ardiya", "Jahra", "Salmiya", "Yard", "Hawally"],
        "Just c": ["Qortuba", "Yard"],
        "chili": ["Qortuba", "Yard", "Hawally"],
        "Mishmash": ["Ardiya", "Kaifan", "Mahboula", "Jabriya", "S-Salem", "S-Abdallah", "Salmiya", "Khaitan", "Mangaf", "W-Abdullah", "Salwa", "Qadsiya", "Qurain", "Khairan"],
        "Table": ["Al-Rai", "Adriya", "Kuwait City", "Salmiya", "Hawally", "Jahra", "Egaila", "Aswaq Al-Qurain", "Sabah Al Ahmed"],
        "FM": ["Rai", "City", "Salmiya", "Egaila", "Jahra"]
      }},
      { key: 'complaint_categories', value: {
        "Dispatch": ["Wrong", "Missing Main", "Missing Side", "Missing Drink", "Missing Sauce"],
        "OPX": ["Over Cooked", "Less Quantity", "Bad Smell", "Rancid Taste", "Salty", "Oily", "Dry", "Damaged", "Cold"],
        "Critical": ["Hygiene", "Hair", "Foreign Object", "Attitude", "Food Poisoning", "Expired", "Rare / Undercooked", "Bug"],
        "Low Rating": ["Low Rate"],
        "Others": ["Technical Issue"],
        "Service": ["Preparation Delay", "Late Delivery", "Packaging Issue", "Missing Condiment"]
      }},
      { key: 'brand_items', value: {
        "chili": ["12 Taco DIY Box", "Amigo Fries", "aquafina water", "Build Your Burrito", "Build Your Burrito Bowl", "Build Your Quesadilla", "Build Your Set Of 3 Tacos", "Build Your Taco", "Caramello", "Cheese Broccoli Soup", "Chicken Enchilada Soup", "Chips & Salsa", "Lipton Iced Tea- Lemon Zero", "Lipton Iced Tea- Peach Zero", "Lipton Iced Tea- Red Fruits Zero", "Lipton Iced Tea -Tropical Zero", "Low Carb", "Nachos", "Slim Churros", "Traditional Burrito", "Traditional Burrito Bowl", "Traditional Chicken Taco", "Traditional Quesadilla", "Traditional Shrimp Taco", "Traditional Steak Taco", "Vegan", "Vodavoda Water", "Build Your Burrito Bowl combo", "Shani", "Mirinda", "7up", "Pepsi Diet", "Pepsi"],
        "FM": ["Guacamole Egg Tacos", "3.5KD Deal", "Turkish Egg Tacos", "Bacon & Egg Muffin", "FM Egg Muffin", "FM Breakfast", "Breakfast Cheese Platter", "Spanish Omlette", "Egg Avocado Platter", "Vanilla Pancake", "Crispy airBaked™ Chicken Katsu", "Grilled Lemon Chicken", "Chicken Fajita Pasta", "Steak With Mushroom Sauce", "Truffle Chicken Pasta", "Spaghetti Bolognese", "Zucchini Beef Lasagna", "Chicken Machboos", "Peri Peri Chicken", "Mongolian Beef", "Shrimp Spaghetti", "Dijon Chicken Pasta", "Maqlouba", "Short Ribs Tacos", "Shish Tawook with Batata Harra", "Short Ribs & Mash", "Kung Pao Chicken", "Butter Chicken", "Black Pepper Beef", "Murabyan", "Chicken Pink Pasta", "Zucchini Chicken Lasagna", "Burgers", "proPatty™ Fhopper", "proPatty™ Big FM", "airBaked™ Chicken Foyale", "airBaked™ Fwister", "airBaked™ FM Chicken", "proPatty™ FM Burger with Fries", "proPatty™ Double Cheese Burger with Fries", "airBaked™ Chicken Burger with Fries", "proPatty™ FM Burger with Sweet Potato Fries", "proPatty™ Double Cheese Burger with Sweet Potato Fries", "airBaked™ Chicken Burger with Sweet Potato Fries", "proPatty™ FM Burger", "proPatty™ Double Cheese Burger", "Mushroom proPatty™ Burger", "airBaked™ Chicken Burger", "airBaked™ Chicken Supreme Burger", "Spicy slaw airBaked™ Chicken Burger", "Spicy airBaked™ Supreme Burger", "Burrata Sandwich", "Halloumi Sandwich", "Club Sandwich", "Turkey Pesto Sandwich", "Chicken Shawarma Wrap", "Beef Shawarma Wrap", "Grilled Chicken Quesadillas", "Philly Cheesesteak", "Beef Burrito", "Chicken Burrito", "Chicken Philly Sandwich", "Mozzarella Pesto Sandwich", "Mushroom Egg Wrap", "Lil airBaked™ Chicken Burger", "Lil proPatty™ Cheese Burger", "Mini Spaghetti Bolognese", "Mini airBaked™ Chicken Wrap", "Mini airBaked™ Chicken Nuggets", "Couscous Beetroot Tabbouleh", "Mini Fattoush", "Mini Asian Chicken Salad", "Mini Italian Salad", "Mini Chicken Caesar Salad", "Quinoa Salad", "Crisp Garden Salad", "Rocca Feta Salad", "Mexican Salad", "Chicken Caesar Salad", "Asian Salad", "Fattoush", "Asian Chicken Bowl", "Steak Rice Bowl", "Chicken Shawarma Bowl", "Mushroom Steak Bowl", "Beef Shawarma Bowl", "Beef Shawarma Side", "Chicken Fajita Side", "Chicken Shawarma", "Jasmine Rice", "Mini airBaked™ Chicken Nuggets", "airBaked™ Fries", "airBaked™ Potato Wedges", "Messy airBaked™ Fries", "airBaked™ Sweet Potato Fries", "Batata Harra", "airBaked™ Nashville Hot Chicken Bites", "airBaked™ Buffalo Shrimp Bites", "Lentil Soup", "Mushroom Soup", "Jareesh", "Mini Grilled Corn", "Hummus", "Lotus Oats", "Mango Yogurt", "Beetroot Pot", "Edamame", "Veggies Crudités", "Chocolate Oats", "Triple Berry Oats", "Berry Parfait", "Pro Chips Sea Salt & Vinegar", "Pro Puffs Spicy Pizza", "Pro Puffs Cheese", "Pro Puffs Spicy", "Pro Puffs Chili Lemon", "Pro Chips Sweet Chili", "Spicy Mexican Mayo", "Tahina", "Guacamole", "Light Smoke House", "Light Ranch", "Light Honey Mustard", "Big FM Sauce", "Fwister Sauce", "Light Mayo Sauce", "Ketchup", "Tropical Fruits", "Classic Fruit Salad", "Exotic Fruit Salad", "Seasonal Fruit Salad", "Fresh Pomegranate", "Red Grapes", "Roasted Coconut Truffle", "Pistachio Chocolate Bite", "Pecan Turtle", "Peanut Bites", "Snickers Bar", "Peanut Butter Protein Bar", "Hazelnut Protein Bar", "Salted Caramel Protein Bar", "Pecan cheesecake", "Mini Peanut Butter Bite", "Salted Pecan Bites", "Mango Zest", "Orange Citrus", "Watermelon Lemonade", "Pomade", "Sparkling Water", "Pepsi Diet", "Pepsi Zero Sugar", "7up Zero Sugar", "Voda Voda water 330 ml", "Kinza Diet Cola", "Kinza Zero Lemon", "Vanilla Protein shake", "Chocolate Protein Shake", "Matcha Protein Shake", "Spanish Latte", "Cold Brew", "Classic Latte", "Vanilla Protein Latte", "Zing Shot", "Energy Shot", "Immunity Shot", "Heart Beet Shot", "MATAFI airBaked™ Supreme", "MATAFI airBaked™ Chicken", "MATAFI Loaded airBaked™ Fries", "MATAFI airBaked™ Chicken Wrap", "Super Dandash Salad", "airBaked™ Giant Nugget Original", "airBaked™ Giant Nugget Sandwich", "airBaked™ Giant Nugget Keto", "Super Grilled Chicken", "Super airBaked™ Chicken", "Super Beef Shawarma", "Super Chicken Shawarma", "Super Grilled Shrimp", "Super Herb Salmon", "Super Sous-Vide Steak", "Sweet & Sour Chicken Bowl", "Salmon & Dill Rice", "Pepperoni Pizza", "Chicken Ranch Pizza", "Classic Margherita Pizza", "Halal Girls proSauce™", "Beetroot proSauce™", "MATES Hazelnut Protein Bar", "MATES Peanut Butter Protein Bar", "Snickers HiProtein Bar", "Snickers White HiProtein Bar", "Chipotle proSauce™", "Avo-Lime proSauce™", "Golden Mustard proSauce™"],
        "Just c": ["12 PCS of potato buns, pattiesand Slice Cheese", "18 PCS of potato buns, pattiesand Slice Cheese", "6 PCS of potato buns, pattiesand Slice Cheese", "7up", "7up Zero Sugar", "Avocado", "Bacon", "BBQ Box", "BBQ Burger", "BBQ Sauce", "BBQ Slider", "Beef patty ( 100 gm )", "Beef patty ( 140 gm )", "Big C Burger", "C - Fries", "C- Sauce", "Cheddar Cheese", "Classic Burger", "Classic Chicken Burger", "Classic Chicken Slider", "Classic Meal Combo", "Classic Slider", "Crispy Cheese", "DOUBLE DECKER SESAME BUN", "Epsa Iced Tea - Lemon", "Epsa Iced Tea - Peach", "Epsa Iced Tea - Pink Lemonade", "Honey Mustard Sauce", "Jarritos Guava", "Jarritos Lime", "Jarritos Mandarin", "Jarritos Mexican Cola", "Just C Meal", "Lipton Ice Tea - Lemon Zero", "Lipton Ice Tea - Peach Zero", "Lipton Ice Tea - Red Fruits Zero", "Lipton Ice Tea - Tropical Zero", "Mapple Sauce", "Mirinda", "Mountain Dew", "Mushroom Burger", "Mushroom Slider", "Pepsi", "Pepsi Diet", "POTATO BUN", "Provolone Cheese", "SESAME BUN", "Shani", "SLIDER POTATO", "SLIDER SESAME", "Special Chicken Slider", "Spical Chicken ( Moderately Spicy )", "Truffle Aioli Sauce", "Truffle Burger", "Truffle Slider", "Vodavoda Water", "Ziggy Fries", "Ziggy Fries With Cheese"],
        "Mishmash": ["Beef Philly Steak Samoon", "3.5KD Deal", "Tenders 5pc Combo", "Double Puri", "Chicken Bites Wrap", "Chicken Caesar wrap", "Musahab wrap", "Chicken Philly Steak Samoon", "Kabab Samoon", "Mushroom Steak Samoon", "Shabah Samoon", "Tawook Samoon", "Chicken Tenders", "Telyani Samoon", "BBQ Burger", "Cheeseburger", "Creamy Mushroom Burger", "Cheesy Puri", "Classic Puri", "Spicy Puri", "Chicken Puri feast", "Classic Chicken Fillet", "Chick-Spicy Fillet", "Buffalo Chicken Fillet", "Grilled Chicken Burger", "Beef Philly Steak Sandwich", "Chicken Philly Steak Sandwich", "Mishmash Quesadilla", "Grilled Chicken Quesadilla", "Toasted Grill’d Chicken", "Toasted Cheeseburger", "Toasted BBQ Burger", "Toasted Mushroom Burger", "Beef Kabab (Regular)", "Beef Kabab (Healthy)", "Khishkhash Beef Kabab (Regular)", "Khishkhash Beef Kabab (Healthy)", "Shish Tawouk (Regular)", "Shish Tawouk (Healthy)", "Tikka Tenderloin (Regular)", "Tikka Tenderloin (Healthy)", "Mix Grills (Regular)", "Mix Grills (Healthy)", "Classic Arayis", "Arayis with Cheese", "Chicken Grills (Regular)", "Chicken Grills (Healthy)", "Half Deboned Chicken (Regular)", "Half Deboned Chicken (Spicy)", "Half Deboned Chicken (Healthy Regular)", "Half Deboned Chicken (Healthy Spicy)", "Deboned Chicken (Whole) (Regular)", "Deboned Chicken (Whole) (Spicy)", "Deboned Chicken (Whole) (Healthy Regular)", "Deboned Chicken (Whole) (Healthy Spicy)", "Beef Steak Tenderloin Rice Bowl", "Chicken Rice Bowl", "Grilled Tenderloin Steak Bowl", "Grilled Chicken Steak Bowl", "Grilld Chic Bowl", "Grilld Tawouk Bowl", "Grilld Tikka Bowl", "Burghul Super Bowl", "Lettuce Super Bowl", "Beef Shawarma", "Chicken Shawarma", "Kabab Grilled Wrap", "Khishkhash Grilled Wrap", "Tawouk Grilled Wrap", "Original Fries", "Cheese Fries", "Mishmash Fries", "MxS Shrimp Wrap", "MxS Dynamite Shrimp", "Philly Steak Fries", "Chicken Bites", "Buffalo Bites", "Chicken Wings (Grilled)", "Chicken Wings (Bufflo)", "Chicken Wings (BBQ)", "Jalapeno Bites", "Onion Rings", "Chicken Caesar Salad", "Peanut Butter Coleslaw", "Hummus", "Mutabbal", "Tabboulah", "Plain Rice", "Plain Burghul", "Mishmash Bread", "Hoagie Rolls", "Pumpkin Burger Bun", "Appetizer Feast", "Chicken Grilld Feast", "Mishmash Feast", "Chicken Feast", "Chicken Burger Feast", "Beef Burger Feast", "Medium Grills Feast", "Large Grills Feast", "Philly Steak Feast", "Shawarma Feas", "Char-Grilled Wraps Feast", "Buffalo Sauce", "Caeser Sauce", "Cheese Sauce", "Chick-Spicy Sauce", "Garlic Sauce", "Honey Mustard Sauce", "Ketchup", "Ketchup And Mayonnaise", "Khishkhash Sauce", "Pepper Sauce", "Ranch Sauce", "Real Mayonnaise", "Slimmed Sour Cream", "Special BBQ Sauce", "Spicy Ranch Sauce", "Tahini Sauce", "Vinaigrette Sauce", "Coca Cola", "Coca Cola Light", "Coca Cola Zero", "Sprite", "Sprite Zero", "Alsi Cola", "Alsi Cola Zero", "Mineral Water", "Fresh Lemon With Mint Juice", "Fresh Orange Juice", "Vimto", "Belgian Chocolate Cookie", "Angus Beef Burger BBQ Plate", "Chicken Breast BBQ Plate", "Chopped Tenderloin Steak BBQ Plate", "Chopped Chicken Steak BBQ Plate", "Tikka Tenderloin BBQ Plate", "Shish Tawouk BBQ Plate", "Beef Kabab BBQ Plate", "Meat Arayis BBQ Plate", "BBQ Arayis with Cheese", "Vegetables Plate BBQ", "Char-Grills BBQ Box", "Beef Burger BBQ Box", "Chicken Burger BBQ Box", "Tenderloin Steak BBQ Box", "Chicken Steak BBQ Box", "Nashville Bites", "Nashville Chicken Fillet", "Nashville Fries", "NASHVILLE MESSY FRIES", "Nashville Quesadilla", "Nashville Sauce", "Nashville Shish Tawook Wrap", "Nashville Shish Tawouk", "Nashville Tenders 5pc Combo"],
        "Table": ["Eggplant Fattah", "Grilled Wings", "Roasted Potato Fingers", "Tabel™ Batata Harra", "Tabel™ Grape Leaves", "Hummus", "3.5KD Deal", "Tabel™ Hummus", "Kabab Coconut Curry Bowl", "Tawook Coconut Curry Bowl", "Tawook Bowl combo", "Deboned Chicken Family Box", "Beef Hummus", "Farm Salad", "Chef Salad", "Creamy Tawook Hamsa", "Halloumi Tomato Hamsa", "Tikka Mushroom Hamsa", "Tikka Tomato Hamsa", "Fattoush", "Tabboulah", "Mutabbal", "Muhammarah", "Yogurt Salad", "Organic Brown Rice", "Tabel™ Bread", "Roasted Pumpkin Soup", "Tabel™ Tahini- 150 Ml", "Tabel™ Spicy Tahini- 150 Ml", "Brown Rice Wholesome Bowl", "Quinoa & Brown Rice Wholesome Bowl", "Quinoa Wholesome Bowl", "Veggies Wholesome Bowl", "Herbs Tawouk & Chimichurri Pesto Rice Bowl", "Herbs Tawouk & Karaz Rice Bowl", "Herbs Tawouk & Khishkhash Rice Bowl", "Herbs Tawouk & Mushroom Rice Bowl", "Herbs Tawouk & Tahini Rice Bowl", "Herbs Tawouk Rice Bowl without sauce", "Kabab & Chimichurri Pesto Rice Bowl", "Kabab & Karaz Rice Bowl", "Kabab & Khishkhash Rice Bowl", "Kabab & Mushroom Rice Bowl", "Kabab & Tahini Rice Bowl", "Kabab Rice Bowl without sauce", "Tawouk & Chimichurri Pesto Rice Bowl", "Tawouk & Karaz Rice Bowl", "Tawouk & Khishkhash Rice Bowl", "Tawouk & Mushroom Rice Bowl", "Tawouk & Tahini Rice Bowl", "Tawouk Rice Bowl without sauce", "Tenderloin & Chimichurri Pesto Rice Bowl", "Tenderloin & Karaz Rice Bowl", "Tenderloin & Khishkhash Rice Bowl", "Tenderloin & Mushroom Rice Bowl", "Tenderloin & Tahini Rice Bowl", "Tenderloin Rice Bowl without sauce", "Herbs Tawook Coconut Curry Bowl", "Tenderloin Coconut Curry Bowl", "Chimichurri Pesto \"Mangoo3\"", "Karaz \"Mangoo3\"", "Khishkhash \"Mangoo3\"", "Mushroom \"Mangoo3\"", "Tahini \"Mangoo3\"", "Half Grilled Chicken (Regular)", "Grilled Half Grilled Chicken (Spicy)", "Whole Grilled Chicken (Regular)", "Whole Grilled Chicken (Spicy)", "Herbs Tawouk", "Shish Tawouk", "Kabab", "Khishkhash Kabab", "Tenderloin Tikka", "Mixed Grills", "Beef Arayis", "Beef Arayis With Cheese", "Mix Arayis", "\"Mangoo3\" Goodness Box", "Appetizer Goodness Box", "Brown Rice Goodness Box", "Chargrilled Wraps Goodness Box", "Shawarma Goodness Box", "Fam Goodness Box", "Gathering Goodness Box", "Beef Shawarma", "Chicken Shawarma", "Grilled Halloumi wrap", "Herbs Tawouk Wrap", "Tabel Tawouk Wrap", "Khishkhash Kabab Wrap", "Mutabbal Kabab Wrap", "Chimichurri Pesto", "Garlic Chimmichuri", "Garlic Sauce", "Khishkhash Sauce", "Mushroom Sauce", "Tabel™ Karaz Sauce", "Tabel™ Sauce", "Tabel™ Spicy Sauce", "Tabel™ Tahini", "Tabel™ Spicy Tahini", "Alsi Cola", "Alsi Cola Zero", "Carbonated Water", "Lemon Falvor Carbonated Water", "Strawberry Flavor Carbonated Water", "Mineral Water", "Mint Lemonade", "Orange Juice", "Creamy Choconafa", "Creamy Choconafa Goodness Box", "Herbs Tawook Mushroom Bil Fern", "Meat Ball Khishkhash Bil Fern", "Meat Ball Mushroom Bil Fern", "Meat Ball Tahina Bil Fern", "Tawouk Coconut Curry Bil Fern", "Iskender Tenderloin Burgul Bowl", "Red Pepper & Garlic Sauce", "Sujuk Hummus", "Turkish Beef Rolls", "Sujuk platter", "Turkish Kabab Dish", "Turkish Mixed Grill - Sujuk", "Turkish Mixed Grills - Tikka", "Turkish Shish Tawook Dish", "Turkish Tikka Dish", "Turkish Shish Tawook saj", "Turkish Sujuk Saj", "Turkish Tikka Saj", "Turkish Kabab saj", "Turkish Chicken Shawarma Saj"],
        "shakir": ["1 Beef Arayes Sandwich", "1 Beef Kaizer Shawarma", "1 Beef Kebab Sandwich", "1 Beef Kebab Wrap", "1 Bun", "3.5KD Deal", "1 Chicken Arayes Sandwich", "1 Chicken Kaizer Shawarma", "1 Lebanese Chicken Shawarma", "1 Lebanese Meat Shawarma", "1 Mixed Grill Platter (4 People)", "1 Regular Beef Shawarma", "1 Regular Chicken Shawarma", "1 Regular Meat Shawarma", "1 Shish Tawouq Wrap", "1 Spicy Beef Kaizer Shawarma", "1 Spicy Beef Shawarma", "1 Spicy Chicken Kaizer Shawarma", "1 Spicy Chicken Shawarma", "1 Spicy Meat Shawarma", "1 Tawouq Sandwich", "2 Beef & 2 Chicken", "2 Fattoush", "2 Hummus", "2 Mixed Grill Platter (4 People)", "2 Shakir Salad", "3 Fattoush", "3 Hummus", "3 Pcs Of Beef", "3 Pcs Of Chicken", "3 Pcs Of Spicy Beef", "3 Pcs Of Spicy Chicken", "3 Shakir Salad", "4 Pcs Of Beef", "4 Pcs Of Chicken", "4 Regular Fries", "7up", "7up Zero Sugar", "8 Regular Fries", "Arayes & Wraps Combo", "Aquafina Water", "Banana & Fruits Mix", "Beef Kaizer Combo", "Beef Kebab Platter", "Beef Kebab Sandwich", "Beef Kebab Wrap", "Beef Tikka Platter", "Broasted Garlic Sauce", "Cheese Sticks", "Chicken Arayes Sandwich", "Chicken Kaizer Combo", "Chicken Kebab Platter", "Coconut & Pineapple Mix", "Coleslaw", "Crispy Wrap Regular", "Crispy Wrap Spicy", "Crispy Box ( 4 Pieces) Regular", "Crispy Box ( 4 Pieces) Spicy", "Crispy Box ( 6 Pieces) Regular", "Crispy Box ( 6 Pieces) Spicy", "Crispy Wrap Combo Regular", "Crispy Wrap Combo Spicy", "Diwaniya Pack (6-8)", "Diwaniya Pack 2 (10-12)", "Fried Sliced Potato", "Fruits & Icecream Mix", "Garlic Sauce", "Grilled Sandwiches Combo", "Grilled wings", "Hummus With Beef Shawarma", "Kabab Combo", "kinza cola", "kinza diet cola", "kinza diet lemon", "kinza lemon", "kinza orange", "Laban", "Lebanese Beef Shawarma", "Lebanese Box", "Lebanese Chicken Shawarma", "Lipton Ice Tea - Lemon Zero", "Lipton Ice Tea - Peach Zero", "Lipton Ice Tea - Red Fruits Zero", "Lipton Ice Tea - Tropical Zero", "Meat Arayes Sandwich", "Mirinda", "MIX Combo", "Mixed Grill Platter", "Mountain Dew", "Muhammara", "Muttabal", "Musahab Wrap", "Mini Katayef", "Musahab Rice Bowl", "Grilled Chicken Platter", "Musahab Wrap Combo", "Peach, Fruits & Ice Cream Mix", "Pepsi", "Pepsi Diet", "Plain Beef", "Plain Chicken", "Plain Meat", "Shakir Banana", "Shakir Broasted Meal", "Shakir Broasted Meal Spicy", "Shakir Grills Sauce", "Shakir Hummus", "Shakir Lemonade", "Shakir Mango", "Shakir Mini Meat Shawarma", "Shakir Peach", "Shakir Salad", "Shakir Shawarma Chicken Platter", "Shakir Shawarma Meat Platter", "Shakir Spicy Garlic", "Shakir Watermelon", "Shakirs Large Platter", "Shakirs Medium Platter", "Shani", "Shawarma Shakir Box", "2 Shawarma Combo", "3 Shawarma Combo", "Shawarma Combo", "Shish Tawouq Platter", "Shish Tawouq Sandwich", "Shish Tawouq Wrap", "Spicy Chicken Shawarma", "Spicy Fried Sliced Potatoes", "Spicy Garlic Broasted Sauce", "Spicy Meat Shawarma", "Spicy Mix", "Spicy Tahina", "Super Beef Shawarma", "Super Chicken Shawarma", "Samoun Chicken Shawarma", "3 Samoun Chicken Shawarma", "Tahina Garlic Sauce", "Tahina Sauce", "Tawouq Combo", "Tawouq & Arayes Combo", "Vimto", "Pepsi 1.25L", "Diet Pepsi 1.25L", "Miranda 1.25L", "7UP 1.25L", "7UP Diet 1.25L", "8 shawerma combo", "12pc Broasted Box", "12pc Family Meal"],
        "Slice": ["2 7up", "2 7up Zero Sugar", "2 Aquafina Water", "2 Kinza Citrus", "2 Kinza Cola", "2 Kinza Diet Cola", "2 Kinza Diet Lemon", "2 Kinza Lemon", "2 Kinza Orange", "2 Mirinda", "2 Pepsi", "2 Pepsi Diet", "2 Shani", "4 7up", "4 7up Zero Sugar", "4 Aquafina Water", "4 Fries", "4 Kinza Citrus", "4 Kinza Cola", "4 Kinza Diet Cola", "4 Kinza Diet Lemon", "4 Kinza Lemon", "4 Kinza Orange", "4 Mirinda", "4 Pepsi", "4 Pepsi Diet", "4 Shani", "7up", "7up Zero Sugar", "8 Fries", "Aquafina Water", "BBQ Sauce", "Beef", "Beef & Chicken", "Caesar Sauce", "Caramel Feuille", "Ceasar Sauce", "Cheese Bites", "Chicken", "Classic Fries", "Combo Box 12 Pcs", "Combo Box 24 Pcs", "Create Your Own Doner", "Create Your Own Meal Doner", "Create Your Own Meal Slicer", "Create Your Own Rice Bowl", "Create Your Own Salad", "Create Your Own Slicer", "Crispy Onion", "Crispy Onions", "Extra Beef", "Extra Chicken", "Garlic Mayo", "Hot Sauce", "KDD Apple & Rasberry (0% Sugar & Calories)", "KDD Cocktail (0% Sugar & Calories)", "KDD Lemon & Mint Mojito (0% Sugar & Calories)", "KDD Mango & Peach (0% Sugar & Calories)", "Kids Meal", "Kinza Citrus", "Kinza Cocktail", "Kinza Cola", "Kinza Diet Cola", "Kinza Diet Lemon", "Kinza Lemon", "Kinza Lift Up", "Kinza Orange", "Lettuce", "Lipton Ice Tea - Lemon Zero", "Lipton Ice Tea - Peach Zero", "Lipton Ice Tea - Red Fruits Zero", "Lipton Ice Tea - Tropical Zero", "Mirinda", "Mountain Dew", "No Sauce", "No Vegetables", "Onion", "Parmesan Caesar", "Parmesan Caesar Doner", "Parmesan Caesar Slicer", "Parmesan Ceasar Doner", "Pepsi", "Pepsi Diet", "Pickles", "Pita", "Pita Doner", "Pita Slicer", "Purple Cabbage", "Roasted Doner", "Roasted Sauce", "Roasted Signature Doner", "Roasted Slicer", "Saj", "Saj Doner", "Saj Slicer", "Sauces", "Seasoned Fries", "Shani", "Signature Fries", "Signature Sauces", "Slice Combo", "Special Sauce", "Spicy Doner", "Spicy Ranch", "Spicy Signature Doner", "Spicy Signature Sauce", "Spicy Slicer", "Tahina Sauce", "Tomatos", "Unseasoned Fries", "Vodavoda Water", "White Ranch", "Without Crispy Onion", "Without Seasoning", "Without Spicy Ranch", "Without White Ranch", "Yoghurt Sauce"],
        "yelo": ["2 pcs Pepperoni Garlic Bread", "2 pcs Pesto Garlic Bread", "2pcs Garlic Bread", "3 Pc Cheesy Garlic Bread", "3 Pc Pepporoni Garlic Bread", "3 Pc Pesto Garlic Bread", "3x3x3 - Good for 3", "4 for 4", "3.5KD Deal", "4 pcs BBQ Wings", "4 pcs Buffalo Wings", "5 for 5 ( NY Pizza )", "5 for 5 ( Square Pizza)", "7-Up Zero Sugar", "7-Up", "All for One - Good for 1", "Apricot Jam", "Aquafina Water", "Bacon Ranch", "Bacon", "Baked Wedges", "BBQ Chicken Wings", "BBQ Ranch", "Black Olives", "Buffalo Chicken (Thin - Pan - NY)", "Buffalo Chicken Wings", "Buffalo Chicken", "Buffalo Mac & Cheese", "Buffalo Ranch", "Cheese", "Cheesy Garlic Bread", "Chicken", "Chili Flakes", "Classic Crispy Chicken", "Classic Pepperoni Pizza (Thin - Pan - NY)", "Classic Pepperoni", "Cheesy Crust", "Cheesy Jalapeno Crust", "Cookie", "Cool Ranch", "Chicken Alfredo Pizza", "Alfredo Pasta", "Diet Pepsi", "Duo Combo", "Everything (Thin - Pan - NY)", "Supreme (Everything)", "Fresh Mushroom", "Garlic Bread", "Green Capsicum", "Green Pepper", "Group 1 - Good for 2", "Group 2 - Good for 2-3", "Group 3 - Good for 3-4", "Group 4 - Good for 3", "Group 6 - Good for 3-4", "Group 7 - Good for 2", "Honey Mustard Ranch", "Jalapeno", "Kinza Citrus", "Kinza Cola", "Kinza Diet Cola", "Kinza Diet Lemon", "Kinza Lemon", "Kinza Orange", "Ketchup", "Large Half and Half", "Large NY Buffalo Chicken", "Large NY Classic Crispy Chicken", "Large NY Classic Pepperoni", "Large NY Everything", "Large NY Margherita", "Large NY MeatLover", "Large NY Pesto", "Large NY Soho", "Large NY Spicy Crispy Chicken", "Large NY Tornado Crispy Chicken", "Large NY Veggie", "Large NY Yelo Pepperoni", "Loaded Wedges", "Long Pizza & Wedges", "Long Pizza & Drink", "Long Pizza & Garlic Bread", "Mac & Cheese", "Margharita", "Margherita Pizza (Thin - Pan - NY)", "Margherita", "Meat Balls", "Meat Lovers (Thin - Pan - NY)", "Meat Lovers", "Medium Half and Half", "Medium NY Buffalo Chicken", "Medium NY Margherita", "Medium NY Pepperoni", "Mineral Water", "Mirinda", "Mountain Dew", "Mushroom", "New York Large (Classic)", "New York Large", "New York Medium (Classic)", "New York Medium", "NY Buffalo Chicken", "NY Classic Crispy Chicken", "NY Classic Pepperoni", "NY Everything", "NY Eveything", "NY Margherita", "NY MeatLover", "NY Medium Buffalo Chicken", "NY Medium Classic Crispy Chicken", "NY Medium Classic Pepperoni", "NY Medium Everything", "NY Medium Margherita", "NY Medium Meat Lovers", "NY Medium Pepperoni", "NY Medium Spicy Crispy Chicken", "NY Medium Tornado Crispy Chicken", "NY Medium Veggie", "NY Medium Yelo Pepperoni", "NY Pepperoni", "NY Pesto", "NY Soho", "NY Spicy Crispy Chicken", "NY Tornado Crispy Chicken", "NY Veggie", "NY Yelo Pepperoni", "NY Yelo Peppperoni", "Mushroom Truffle", "Olives", "One for All", "Onion", "Pan Buffalo Chicken", "Pan Classic Crispy Chicken", "Pan Everything", "Pan Margherita", "Pan MeatLover", "Pan Medium", "Pan Pepperoni", "Pan Pesto", "Pan Soho", "Pan Spicy Crispy Chicken", "Pan Tornado Crispy Chicken", "Pan Veggie", "Pepperoni Garlic Bread", "Pepperoni", "Pepsi Diet", "Pepsi Zero", "Pepsi", "Pesto Garlic Bread", "Pesto Pizza (Thin - Pan - NY)", "Pesto Ranch Sauce", "Pesto Ranch", "Pesto", "Potato Wedges", "Red Capsicum", "Ranch Supreme", "Seen Jeem Long Pizza", "Shani", "Shredded Mozzarella Cheese", "Skinny Ranch", "Soft Drinks", "Soho Pizza (Thin - Pan - NY)", "Soho", "HOT WHEELS™ Kids Meal Chicken Chunks", "HOT WHEELS™ Kids Meal Pepperoni", "HOT WHEELS™ Kids Meal Margarita", "Small Pan Margarita", "Small NY Margarita", "Small Pan Pepperoni", "Small NY Pepperoni", "KDD Apple juice", "KDD Orange Juice", "Solo 1 - Good for 1", "Solo 2 - Good for 1-2", "Solo 4 - Good for 1", "Spicy Crispy Chicken", "Spicy Ranch", "Spicy Chipotle Bacon Pizza", "Peri Peri Ranch Chicken Pizza", "Spicy Honey Pepperoni Pizza", "Summer Saver Box", "Sweet Honey Bacon", "Ramadan Solo Meal", "Thin Crust Buffalo Chicken", "Thin Crust Classic Crispy Chicken", "Thin Crust Everything", "Thin Crust Margharita", "Thin Crust Meat Lover", "Thin Crust Medium (New)", "Thin Crust Medium Buffalo Chicken", "Thin Crust Medium Everything", "Thin Crust Medium Margharita", "Thin Crust Medium Pepperoni", "Thin Crust Medium Pesto", "Thin Crust Medium Soho", "Thin Crust Medium Veggie", "Thin Crust Pepperoni", "Thin Crust Pesto", "Thin Crust Soho", "Thin Crust Spicy Crispy Chicken", "Thin Crust Tornado Crispy Chicken", "Thin Crust Veggie", "Tomato", "Tornado Crispy Chicken", "Truffle Ranch", "Veggie Pizza (Thin - Pan - NY)", "Veggie", "Yelo Pepperoni Pizza (NY)", "Yelo Pepperoni", "Vimto", "Yelo! Kids Meal"],
        "bbt": ["7up", "Aquafina Water", "3.5KD Deal", "BBQ Sauce", "BBT Mayo", "BBT Ranch Sauce", "BBT Sauce", "Buttercup", "Cheese Dip", "CLASSIC ROLLS BEEF", "CLASSIC ROLLS BEEF Meal", "Cheeseburger Duo Combo", "Chicken Fillaaa", "Chicken Fillaaa Meal", "Chicken Nugget Meal", "Chicken Nuggets", "Chili Lime", "Chilli Lime Old Skool", "Chilli Lime Supreme", "Chilli Lime Old Skool Meal", "Chilli Lime Supreme Meal", "Chilli Lime Tenders Fillaaa (New)", "Classic Old Skool", "Classic Supreme", "Classic Old Skool Meal", "Classic Supreme Meal", "Coleslaw", "Crispy Fries", "Curly Fries", "Extra 1pc Tenders", "Extra 1pc Toast", "Extra Cheese", "Extra Coleslaw", "Extra Sauce", "Fillaaa Sauce", "FILAAA PARTY", "French Fries", "Fries", "Honey Mustard", "Kinza Cola", "Kinza Diet Cola", "Kinza Diet Lemon", "Kinza Lemon", "Kinza Orange", "Lipton Ice Tea - Lemon Zero", "Lipton Ice Tea - Peach Zero", "Lipton Ice Tea - Red Fruits Zero", "Lipton Ice Tea - Tropical Zero", "Little Cheeseburger", "Little Chicken Burger", "Little Chicken Burger Duo Combo", "Little Wrap Fillaaa Meal", "Little Wrap Fillaaa Duo Combo", "Little Wrap Fillaaaa", "Messy Fries", "Miranda", "Mirinda", "Mountain Dew", "Nesqiuk", "Nuggets", "Nuggets Duo Combo", "Oreo Madness", "Peanut Butter", "Pepsi", "Pepsi Zero", "Quarter Pounder Burger", "Quarter Pounder Meal", "Schnitzel x Burger", "Schnitzel X Meal", "Salt", "SMOKEY ROLLS BEEF", "SMOKEY ROLLS BEEF Meal", "Shani", "Southwest Burger", "Southwest Meal", "Salt n Vinegar Tenders Fillaaa", "\"Not So Ranch\" Sauce", "Strawberry", "Sweet Chili", "Suuuper Beef", "Suuuper Beef Combo", "Suuuper Chicken", "Suuuper Chicken Combo", "Tang", "Tenders Fillaaa", "Toast", "Triple X", "Triple X Box", "TRIPLE X Meal", "Water", "Westcoast Burger", "Westcoast Meal", "Kidkit Little chicken", "Kidkit Little Cheese Burger", "Kidkit Chicken Nuggets", "XL Fillaaa Sauce", "3amos Burger combo"],
        "pattie": ["(5Pcs) 4pcs Happy Nuggets Pattie", "(5Pcs) Aquafina Water", "(5Pcs) Capri Sun Apple", "(5Pcs) Capri Sun Orange", "(5Pcs) Classic Pattie", "(5Pcs) Crispy Chicken Pattie", "(5Pcs) Mirinda", "(5Pcs) Pattie Pattie", "(5Pcs) Pepsi", "(5Pcs) Pepsi Zero", "10 Pcs Nuggets", "12 Slider Combo", "12 Sliders", "2 Fries", "3.5KD Deal", "2 Pcs Of Beef Crunch", "2 Pcs Of Cheesestake Pattie", "2 Pcs Of Chicken Bites", "2 Pcs Of Classic Pattie", "2 Pcs Of Crispy Chicken Pattie", "2 Pcs Of Honey Mustard", "2 Pcs Of Onion Rings", "2 Pcs Of Pattie Pattie", "2 Pcs Of Pattie Pattie Mayo", "2 Pcs Of Pattie Pattie Sauce", "2 Pcs Of Ranch", "2 Pcs Of Spicy Chicken Pattie", "2 Pcs Of Sweet Bacon Pattie", "2 Pcs Of Sweet Chili", "2 Pcs Of Truffle Mushroom Pattie", "24 Slider Combo", "24 Sliders", "3 Pcs Of Cheesestake Pattie", "3 Pcs Of Classic Pattie", "3 Pcs Of Crispy Chicken", "3 Pcs Of Pattie Pattie", "3 Pcs Of Spicy Chicken", "3 Pcs Of Sweet Bacon", "3 Pcs Of Sweet Bacon Pattie", "3 Pcs Of Truffle Mushroom", "3 Pcs Of Truffle Mushroom Pattie", "5 Pcs Nuggets", "6 Pcs Of Cheesestake Pattie", "6 Pcs Of Classic Pattie", "6 Pcs Of Crispy Chicken", "6 Pcs Of Pattie Pattie", "6 Pcs Of Spicy Chicken", "6 Pcs Of Sweet Bacon", "6 Pcs Of Truffle Mushroom", "6 Pcs Of Truffle Mushroom Pattie", "6 Slider Combo", "7up", "Aquafina Water", "Beef Crunch", "Capri-sun juice apple", "Capri-sun juice orange", "Cheesesteak Pattie Slider", "Chicken Bites", "Chicken Nuggets", "Chicken Slider Combo", "Classic Pattie", "Classic Pattie Slider", "Crispy Chicken", "Crispy chicken nuggets (4 pcs)", "Crispy Chicken Pattie Slider", "Family Fries", "Fries", "Happie Nuggets Pattie", "Happie Pattie Party Pack", "Happie Slider Pattie", "Honey Mustard", "Jalapeno Cheese Nuggets", "Kinza cola", "Kinza diet cola", "Kinza diet lemon", "Kinza lemon", "Lipton Ice Tea - Lemon Zero", "Lipton Ice Tea - Peach Zero", "Lipton Ice Tea - Red Fruits Zero", "Lipton Ice Tea - Tropical Zero", "Nashville Chicken Slider", "Nashville Chicken Bites", "Nashville Loaded Fries", "Curly Fries", "Cookies", "Marinara", "Mirinda", "Mountain Dew", "Onion Rings", "Pattie Fries", "Pattie Pattie", "Pattie Pattie Mayo", "Pattie Pattie Sauce", "Pattie Pattie Slider", "Pepsi", "Pepsi Diet", "Pepsi Zero", "Ranch", "Shani", "Solo Feast", "Solo Meal", "Spiced Corn", "Spicy Chicken Pattie Slider", "Sweet Bacon Slider", "Sweet Chili", "The Original", "The Trio", "Truffle Mushroom Pattie Slider", "Water", "Crispy Chicken Pattie Slider PLUS+", "Spicy Chicken Pattie Slider PLUS+", "Nashville Chicken slider PLUS+", "Cheesesteak Pattie Slider PLUS+", "Classic Pattie Slider PLUS+", "Sweet Bacon Slider PLUS+", "Truffle Mushroom Pattie Slider PLUS+", "Pattie Pattie slider PLUS+", "Rodeo Chicken Slider", "Rodeo Chicken Slider PLUS+", "Rodeo Beef Slider", "Rodeo Beef Slider PLUS+", "BBQ Fries", "BBQ Chicken Fries"]
      }}
    ];

    for (const config of defaultConfigs) {
      await db.run(
        'INSERT INTO configurations (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [config.key, JSON.stringify(config.value)]
      );
    }
  };

  await seedUsers();
  await seedConfigurations();
  
  dbInitialized = true;
  console.log('Database initialization complete.');
} catch (err: any) {
  console.error('DATABASE INITIALIZATION FAILED:', err);
  serverInitializationError = err;
}
};

// Start initialization
initializeDatabase();

  const generateComplaintNumber = (brand: string) => {
    const brandPrefixes: Record<string, string> = {
      'shakir': 'SH',
      'yelo': 'YE',
      'bbt': 'BB',
      'slice': 'SL',
      'pattie': 'PA',
      'just c': 'JC',
      'chili': 'CH',
      'mishmash': 'MI',
      'table': 'TA',
      'fm': 'FM'
    };
    const prefix = brandPrefixes[brand.toLowerCase()] || brand.substring(0, 2).toUpperCase() || 'CP';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  };

  // API Routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      // Use LOWER() for case-insensitive username matching
      let user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?', [username, password]);
      
      // Robustness: if not found and contains spaces, try with underscores
      if (!user && typeof username === 'string' && username.includes(' ')) {
        const underscored = username.replace(/ /g, '_');
        user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?', [underscored, password]);
      }

      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        userWithoutPassword.brands = safeParse(userWithoutPassword.brands);
        res.json({ user: userWithoutPassword });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!await checkRole(userId, ['admin', 'supervisor'])) {
        return res.status(403).json({ 
          message: 'Access denied',
          hint: 'Your session might be outdated. Please try logging out and logging in again.'
        });
      }
      const users = await db.all('SELECT id, username, role, brand, brands, branch, createdAt FROM users ORDER BY createdAt DESC');
      res.json(users.map(u => ({ ...u, brands: safeParse(u.brands) })));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ message: 'Failed to fetch users', error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, role, brand, brands, branch, actorId } = req.body;
    if (!await checkRole(actorId, ['admin', 'supervisor'])) {
      return res.status(403).json({ message: 'Access denied' });
    }
    try {
      const id = uuidv4();
      await db.run(
        'INSERT INTO users (id, username, password, role, brand, brands, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, username, password || 'password123', role, brand, JSON.stringify(brands || []), branch]
      );
      res.status(201).json({ id, username, role, brand, brands, branch });
    } catch (e) {
      res.status(400).json({ message: 'Username already exists' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      if (!await checkRole(userId, ['admin', 'supervisor'])) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await db.run('DELETE FROM users WHERE id = ?', [id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { actorId, ...data } = req.body;
      if (!await checkRole(actorId, ['admin', 'supervisor'])) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const allowedFields = ['username', 'password', 'role', 'brand', 'brands', 'branch'];
      const updates = [];
      const params = [];

      for (const key of Object.keys(data)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          if (key === 'brands') {
            params.push(JSON.stringify(data[key] || []));
          } else {
            params.push(data[key]);
          }
        }
      }

      if (updates.length > 0) {
        params.push(id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.get('/api/complaints', async (req, res) => {
    try {
      const { status, userId } = req.query;
      
      // Get user to check role
      const user = userId ? await db.get('SELECT role, brand, brands, branch FROM users WHERE id = ?', [userId]) : null;

      let query = `
        SELECT c.*, COALESCE(c.creator_username, u.username) as user_username 
        FROM complaints c 
        LEFT JOIN users u ON c.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (user) {
        if (user.role === 'restaurant_user') {
          query += ' AND c.brand = ? AND c.branch = ?';
          params.push(user.brand);
          params.push(user.branch);
        } else if (user.role === 'quality') {
          query += " AND (LOWER(c.priority) = 'critical' OR LOWER(COALESCE(c.type_of_complaint, '')) = 'critical' OR LOWER(COALESCE(c.title, '')) = 'critical') AND c.status = 'Closed'";
          const userBrands = safeParse(user.brands);
          if (userBrands.length > 0) {
            query += ` AND c.brand IN (${userBrands.map(() => '?').join(',')})`;
            params.push(...userBrands);
          }
        }
      }

      if (status === 'open') {
        query += " AND c.status = 'Open'";
      } else if (status === 'closed') {
        query += " AND c.status = 'Closed'";
      } else if (status === 'escalated') {
        query += " AND c.is_escalated = TRUE";
      }

      query += ' ORDER BY c.date_time DESC LIMIT 1000';
      console.log(`Executing query with ${params.length} params`);
      const complaints = await db.all(query, params);
      console.log(`Query returned ${complaints.length} rows`);
      
      // Map to camelCase and parse JSON fields
      const result = complaints.map(c => {
        try {
          return {
            id: c.id,
            complaintNumber: c.complaint_number,
            customerPhone: c.customer_phone,
            customerName: c.customer_name,
            brand: c.brand,
            branch: c.branch,
            platform: c.platform,
            orderId: c.order_id,
            orderDate: c.order_date,
            complaintSource: c.complaint_source,
            typeOfComplaint: c.type_of_complaint,
            title: c.title,
            caseType: c.case_type,
            item: c.item,
            product: c.product,
            response: c.response,
            notes: c.notes,
            comment: c.comment,
            adminNotes: c.admin_notes,
            adminNotesBy: c.admin_notes_by,
            adminNotesByUsername: c.admin_notes_by_username,
            amountSpent: c.amount_spent,
            responsibleParty: c.responsible_party,
            actionTaken: c.action_taken,
            complaintComment: c.complaint_comment,
            status: c.status,
            priority: c.priority,
            isEscalated: !!c.is_escalated,
            isProcessed: !!c.is_processed,
            validationStatus: c.validation_status,
            dateTime: c.date_time,
            images: safeParse(c.images),
            createdBy: c.created_by,
            creatorUsername: c.user_username || c.creator_username || 'N/A',
            updatedBy: c.updated_by,
            updatedByUsername: c.updated_by_username,
            customFields: safeParseObj(c.custom_fields),
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            resolvedAt: c.resolved_at,
            escalationTimestamp: c.escalation_timestamp,
            validationTimestamp: c.validation_timestamp,
            flagNoteTimestamp: c.flag_note_timestamp,
            followUpTimestamp: c.follow_up_timestamp,
            opxResponsibleParty: c.opx_responsible_party,
            opxComment: c.opx_comment,
            followUpSatisfaction: c.follow_up_satisfaction,
            followUpAgentResolution: c.follow_up_agent_resolution,
            followUpHelpProvided: c.follow_up_help_provided,
            followUpServiceSuggestions: c.follow_up_service_suggestions,
            followUpOverallRating: c.follow_up_overall_rating,
            branchComment: c.branch_comment,
            branchAttachments: JSON.parse(c.branch_attachments || '[]'),
            closedByUsername: c.closed_by_username,
            closedAt: c.closed_at,
            assignedToUid: c.assigned_to,
            assignedToUsername: c.assigned_to_username
          };
        } catch (e) {
          console.error(`Error parsing complaint ${c.id}:`, e);
          return null;
        }
      }).filter(Boolean);

      res.json(result);
    } catch (error) {
      console.error('Fetch complaints error:', error);
      res.status(500).json({ message: 'Failed to fetch complaints' });
    }
  });

  app.get('/api/complaints/search', async (req, res) => {
    try {
      const { orderId, phone, userId } = req.query;
      const user = userId ? await db.get('SELECT role, brand, brands, branch FROM users WHERE id = ?', [userId]) : null;

      const conditions = [];
      const params = [];

      if (orderId) {
        conditions.push('c.order_id LIKE ?');
        params.push(`%${orderId}%`);
      }
      if (phone) {
        conditions.push('c.customer_phone LIKE ?');
        params.push(`%${phone}%`);
      }

      if (conditions.length === 0) return res.json([]);

      let query = `
        SELECT c.*, COALESCE(c.creator_username, u.username) as user_username 
        FROM complaints c 
        LEFT JOIN users u ON c.created_by = u.id
        WHERE (${conditions.join(' OR ')})
      `;

      if (user && user.role === 'restaurant_user') {
        query += ' AND c.brand = ? AND c.branch = ?';
        params.push(user.brand);
        params.push(user.branch);
      } else if (user && user.role === 'quality') {
        query += " AND (LOWER(c.priority) = 'critical' OR LOWER(COALESCE(c.type_of_complaint, '')) = 'critical' OR LOWER(COALESCE(c.title, '')) = 'critical') AND c.status = 'Closed'";
        const userBrands = JSON.parse(user.brands || '[]');
        if (userBrands.length > 0) {
          query += ` AND c.brand IN (${userBrands.map(() => '?').join(',')})`;
          params.push(...userBrands);
        }
      }

      query += ' ORDER BY c.date_time DESC';
      
      const complaints = await db.all(query, params);
      const result = complaints.map(c => {
        try {
          return {
            id: c.id,
            complaintNumber: c.complaint_number,
            customerPhone: c.customer_phone,
            customerName: c.customer_name,
            brand: c.brand,
            branch: c.branch,
            platform: c.platform,
            orderId: c.order_id,
            orderDate: c.order_date,
            complaintSource: c.complaint_source,
            typeOfComplaint: c.type_of_complaint,
            title: c.title,
            caseType: c.case_type,
            item: c.item,
            product: c.product,
            response: c.response,
            notes: c.notes,
            comment: c.comment,
            adminNotes: c.admin_notes,
            adminNotesBy: c.admin_notes_by,
            adminNotesByUsername: c.admin_notes_by_username,
            amountSpent: c.amount_spent,
            responsibleParty: c.responsible_party,
            actionTaken: c.action_taken,
            complaintComment: c.complaint_comment,
            status: c.status,
            priority: c.priority,
            isEscalated: !!c.is_escalated,
            isProcessed: !!c.is_processed,
            validationStatus: c.validation_status,
            dateTime: c.date_time,
            images: JSON.parse(c.images || '[]'),
            createdBy: c.created_by,
            creatorUsername: c.user_username || c.creator_username || 'N/A',
            updatedBy: c.updated_by,
            updatedByUsername: c.updated_by_username,
            customFields: JSON.parse(c.custom_fields || '{}'),
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            resolvedAt: c.resolved_at,
            escalationTimestamp: c.escalation_timestamp,
            validationTimestamp: c.validation_timestamp,
            flagNoteTimestamp: c.flag_note_timestamp,
            followUpTimestamp: c.follow_up_timestamp,
            opxResponsibleParty: c.opx_responsible_party,
            opxComment: c.opx_comment,
            followUpSatisfaction: c.follow_up_satisfaction,
            followUpAgentResolution: c.follow_up_agent_resolution,
            followUpHelpProvided: c.follow_up_help_provided,
            followUpServiceSuggestions: c.follow_up_service_suggestions,
            followUpOverallRating: c.follow_up_overall_rating,
            branchComment: c.branch_comment,
            branchAttachments: JSON.parse(c.branch_attachments || '[]'),
            closedByUsername: c.closed_by_username,
            closedAt: c.closed_at,
            assignedToUid: c.assigned_to,
            assignedToUsername: c.assigned_to_username
          };
        } catch (e) {
          console.error(`Error parsing search result ${c.id}:`, e);
          return null;
        }
      }).filter(Boolean);
      res.json(result);
    } catch (error) {
      console.error('Search complaints error:', error);
      res.status(500).json({ message: 'Failed to search complaints' });
    }
  });

  app.get('/api/complaints/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT c.*, COALESCE(c.creator_username, u.username) as user_username 
        FROM complaints c 
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = ?
      `;
      const c = await db.get(query, [id]);
      if (!c) return res.status(404).json({ message: 'Complaint not found' });
      
      res.json({
        id: c.id,
        complaintNumber: c.complaint_number,
        customerPhone: c.customer_phone,
        customerName: c.customer_name,
        brand: c.brand,
        branch: c.branch,
        platform: c.platform,
        orderId: c.order_id,
        orderDate: c.order_date,
        complaintSource: c.complaint_source,
        typeOfComplaint: c.type_of_complaint,
        title: c.title,
        caseType: c.case_type,
        item: c.item,
        product: c.product,
        response: c.response,
        notes: c.notes,
        comment: c.comment,
        adminNotes: c.admin_notes,
        adminNotesBy: c.admin_notes_by,
        adminNotesByUsername: c.admin_notes_by_username,
        amountSpent: c.amount_spent,
        responsibleParty: c.responsible_party,
        actionTaken: c.action_taken,
        complaintComment: c.complaint_comment,
        status: c.status,
        priority: c.priority,
        isEscalated: !!c.is_escalated,
        isProcessed: !!c.is_processed,
        validationStatus: c.validation_status,
        dateTime: c.date_time,
        images: JSON.parse(c.images || '[]'),
        createdBy: c.created_by,
        creatorUsername: c.user_username || c.creator_username || 'N/A',
        updatedBy: c.updated_by,
        updatedByUsername: c.updated_by_username,
        customFields: JSON.parse(c.custom_fields || '{}'),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        resolvedAt: c.resolved_at,
        escalationTimestamp: c.escalation_timestamp,
        validationTimestamp: c.validation_timestamp,
        flagNoteTimestamp: c.flag_note_timestamp,
        followUpTimestamp: c.follow_up_timestamp,
        opxResponsibleParty: c.opx_responsible_party,
        opxComment: c.opx_comment,
        followUpSatisfaction: c.follow_up_satisfaction,
        followUpAgentResolution: c.follow_up_agent_resolution,
        followUpHelpProvided: c.follow_up_help_provided,
        followUpServiceSuggestions: c.follow_up_service_suggestions,
        followUpOverallRating: c.follow_up_overall_rating,
        branchComment: c.branch_comment,
        branchAttachments: JSON.parse(c.branch_attachments || '[]'),
        closedByUsername: c.closed_by_username,
        closedAt: c.closed_at,
        assignedToUid: c.assigned_to,
        assignedToUsername: c.assigned_to_username
      });
    } catch (error) {
      console.error('Fetch complaint by id error:', error);
      res.status(500).json({ message: 'Failed to fetch complaint' });
    }
  });

  app.post('/api/complaints', async (req, res) => {
    const data = req.body;
    const createdBy = data.createdByUid; 
    const creatorUsername = data.creatorUsername;
    const complaintNumber = generateComplaintNumber(data.brand || 'CMP');
    
    // Auto-assignment for Open status
    let assignedTo = null;
    let assignedToUsername = null;
    if (data.status === 'Open') {
      const qualityUser = await db.get('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)', ['OPX']);
      if (qualityUser) {
        assignedTo = qualityUser.id;
        assignedToUsername = qualityUser.username;
      }
    }

    const fields = [
      'complaint_number', 'customer_phone', 'customer_name', 'brand', 'branch', 'platform', 
      'order_id', 'order_date', 'complaint_source', 'type_of_complaint', 'title', 'case_type', 'item', 
      'product', 'response', 'notes', 'comment', 'admin_notes', 'status', 'priority', 
      'is_escalated', 'is_processed', 'date_time', 'images', 'created_by', 'creator_username', 
      'closed_by_username', 'closed_at', 'custom_fields', 'assigned_to', 'assigned_to_username'
    ];
    
    const placeholders = fields.map(() => '?').join(', ');
    const values = [
      complaintNumber, data.customerPhone, data.customerName, data.brand, data.branch, data.platform,
      data.orderId, data.orderDate, data.complaintSource, data.typeOfComplaint, data.title, data.caseType, data.item,
      data.product, data.response, data.notes, data.comment, data.adminNotes, data.status || 'Open',
      data.priority || 'medium', !!data.isEscalated, !!data.isProcessed, data.dateTime || new Date().toISOString(),
      JSON.stringify(data.images || []), createdBy, creatorUsername, data.closedByUsername, data.closedAt, 
      JSON.stringify(data.customFields || {}), assignedTo, assignedToUsername
    ];

    try {
      const result = await db.get(
        `INSERT INTO complaints (${fields.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        values
      );
      res.status(201).json({ id: result.id, complaintNumber });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to create complaint' });
    }
  });

  app.post('/api/complaints/bulk', async (req, res) => {
    const { complaints, createdByUid, creatorUsername } = req.body;
    if (!Array.isArray(complaints)) {
      return res.status(400).json({ message: 'Complaints must be an array' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const fields = [
      'complaint_number', 'customer_phone', 'customer_name', 'brand', 'branch', 'platform', 
      'order_id', 'order_date', 'complaint_source', 'type_of_complaint', 'title', 'case_type', 'item', 
      'product', 'response', 'notes', 'comment', 'admin_notes', 'status', 'priority', 
      'is_escalated', 'is_processed', 'date_time', 'images', 'created_by', 'creator_username', 
      'closed_by_username', 'closed_at', 'action_taken', 'follow_up_satisfaction', 'follow_up_overall_rating', 'custom_fields', 'assigned_to', 'assigned_to_username'
    ];
    const placeholders = fields.map(() => '?').join(', ');
    
    const qualityUser = await db.get('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)', ['OPX']);

    for (const data of complaints) {
      const complaintNumber = generateComplaintNumber(data.brand || 'CMP');
      
      const isStatusOpen = (data.status || 'Open') === 'Open';
      const assignedTo = isStatusOpen && qualityUser ? qualityUser.id : null;
      const assignedToUsername = isStatusOpen && qualityUser ? qualityUser.username : null;

      const finalCreatedByUid = data.createdByUid || createdByUid || null;
      const finalCreatorUsername = data.creatorUsername || creatorUsername || 'N/A';

      const values = [
        complaintNumber, data.customerPhone, data.customerName, data.brand, data.branch, data.platform,
        data.orderId, data.orderDate, data.complaintSource, data.typeOfComplaint || data.title, data.title, data.caseType, data.item,
        data.product, data.response, data.notes, data.comment, data.adminNotes, data.status || 'Open',
        data.priority || 'medium', !!data.isEscalated, !!data.isProcessed, data.dateTime || new Date().toISOString(),
        JSON.stringify(data.images || []), finalCreatedByUid, finalCreatorUsername,
        data.closedByUsername, data.closedAt, data.actionTaken, data.followUpSatisfaction, data.followUpOverallRating,
        JSON.stringify(data.customFields || {}), assignedTo, assignedToUsername
      ];

      try {
        await db.run(
          `INSERT INTO complaints (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    res.json(results);
  });

  app.delete('/api/complaints', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!await checkRole(userId, ['admin', 'supervisor'])) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await db.run('DELETE FROM complaints');
      res.json({ message: 'All complaints deleted successfully' });
    } catch (error) {
      console.error('Delete all complaints error:', error);
      res.status(500).json({ message: 'Failed to delete all complaints' });
    }
  });

  app.delete('/api/complaints/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      if (!await checkRole(userId, ['admin', 'supervisor'])) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await db.run('DELETE FROM complaints WHERE id = ?', [id]);
      res.json({ message: 'Complaint deleted successfully' });
    } catch (error) {
      console.error('Delete complaint error:', error);
      res.status(500).json({ message: 'Failed to delete complaint' });
    }
  });

  app.patch('/api/complaints/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const updatedBy = data.updatedByUid;
    const updatedByUsername = data.updatedByUsername;

    const updates = [];
    const params = [];

    const allowedFields = [
      'status', 'is_escalated', 'is_processed', 'validation_status', 'admin_notes', 'admin_notes_by', 'admin_notes_by_username',
      'response', 'action_taken', 'responsible_party', 'amount_spent', 'resolved_at',
      'follow_up_satisfaction', 'follow_up_agent_resolution', 'follow_up_help_provided',
      'follow_up_service_suggestions', 'follow_up_overall_rating',
      'customer_phone', 'customer_name', 'brand', 'branch', 'platform', 'order_id', 'order_date',
      'complaint_source', 'type_of_complaint', 'title', 'case_type', 'item', 'product',
      'notes', 'comment', 'complaint_comment', 'priority', 'branch_comment', 'branch_attachments',
      'branch_response_at',
      'escalation_timestamp', 'validation_timestamp', 'flag_note_timestamp', 'follow_up_timestamp',
      'opx_responsible_party', 'opx_comment',
      'closed_by_username', 'closed_at', 'images', 'custom_fields'
    ];

    const now = new Date().toISOString();

    for (const key of Object.keys(data)) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        if (dbKey === 'images' || dbKey === 'branch_attachments' || dbKey === 'custom_fields') {
          params.push(JSON.stringify(data[key]));
        } else {
          params.push(data[key]);
        }
      }
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    if (updatedBy) {
      updates.push('updated_by = ?');
      params.push(updatedBy);
      updates.push('updated_by_username = ?');
      params.push(updatedByUsername);
    }

    params.push(id);

    try {
      await db.run(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to update complaint' });
    }
  });

  app.get('/api/manager-requests', async (req, res) => {
    try {
      const { userId } = req.query;
      let query = `
        SELECT r.*, u.username as creatorName 
        FROM manager_requests r 
        LEFT JOIN users u ON r.created_by = u.id
      `;
      const params = [];

      if (userId) {
        const user = await db.get('SELECT role, brand, branch FROM users WHERE id = ?', [userId]);
        if (user && user.role === 'restaurant_user') {
          query += ' WHERE r.brand = ? AND r.branch = ?';
          params.push(user.brand, user.branch);
        }
      }

      query += ' ORDER BY r.created_at DESC';
      
      const requests = await db.all(query, params);
      res.json(requests.map(r => ({
        id: r.id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        orderId: r.order_id,
        brand: r.brand,
        branch: r.branch,
        reason: r.reason,
        requestType: r.request_type,
        item: r.item,
        status: r.status,
        createdBy: r.created_by,
        creatorName: r.creatorName || r.creator_username,
        approvedBy: r.approved_by,
        approverName: r.approver_username,
        approverComment: r.approver_comment,
        createdAt: r.created_at,
        approvedAt: r.approved_at
      })));
    } catch (error) {
      console.error('Fetch manager requests error:', error);
      res.status(500).json({ message: 'Failed to fetch manager requests' });
    }
  });

  app.post('/api/manager-requests', async (req, res) => {
    try {
      const data = req.body;
      const fields = ['customer_name', 'customer_phone', 'order_id', 'brand', 'branch', 'reason', 'request_type', 'item', 'created_by', 'creator_username'];
      const placeholders = fields.map(() => '?').join(', ');
      const values = [data.customerName, data.customerPhone, data.orderId, data.brand, data.branch, data.reason, data.requestType, data.item, data.createdBy, data.creatorUsername];

      await db.run(`INSERT INTO manager_requests (${fields.join(', ')}) VALUES (${placeholders})`, values);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Create manager request error:', error);
      res.status(500).json({ message: 'Failed to create manager request' });
    }
  });

  app.patch('/api/manager-requests/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy, approverUsername, approverComment } = req.body;
      
      if (!await checkRole(approvedBy, ['admin', 'supervisor', 'manager', 'complaints_team'])) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const approvedAt = new Date().toISOString();
      await db.run(
        'UPDATE manager_requests SET status = ?, approved_by = ?, approver_username = ?, approver_comment = ?, approved_at = ? WHERE id = ?',
        [status, approvedBy, approverUsername, approverComment, approvedAt, id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Update manager request error:', error);
      res.status(500).json({ message: 'Failed to update manager request' });
    }
  });

  // Suggestions API
  app.get('/api/suggestions', async (req, res) => {
    try {
      const suggestions = await db.all('SELECT * FROM suggestions ORDER BY created_at DESC');
      res.json(suggestions.map(s => ({
        id: s.id,
        customerName: s.customer_name,
        customerPhone: s.customer_phone,
        brand: s.brand,
        title: s.title,
        description: s.description,
        date: s.date,
        createdBy: s.created_by,
        creatorUsername: s.creator_username,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })));
    } catch (error) {
      console.error('Fetch suggestions error:', error);
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  });

  app.post('/api/suggestions', async (req, res) => {
    try {
      const data = req.body;
      const id = uuidv4();
      const fields = ['id', 'customer_name', 'customer_phone', 'brand', 'title', 'description', 'created_by', 'creator_username'];
      const placeholders = fields.map(() => '?').join(', ');
      const values = [id, data.customerName, data.customerPhone, data.brand, data.title || '', data.description, data.createdBy, data.creatorUsername];

      await db.run(`INSERT INTO suggestions (${fields.join(', ')}) VALUES (${placeholders})`, values);
      res.status(201).json({ id, success: true });
    } catch (error) {
      console.error('Create suggestion error:', error);
      res.status(500).json({ message: 'Failed to create suggestion' });
    }
  });

  app.patch('/api/suggestions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const allowedFields = ['customer_name', 'customer_phone', 'brand', 'title', 'description'];
      const updates = [];
      const params = [];

      for (const key of Object.keys(data)) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (allowedFields.includes(dbKey)) {
          updates.push(`${dbKey} = ?`);
          params.push(data[key]);
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        await db.run(`UPDATE suggestions SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Update suggestion error:', error);
      res.status(500).json({ message: 'Failed to update suggestion' });
    }
  });

  app.delete('/api/suggestions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.run('DELETE FROM suggestions WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete suggestion error:', error);
      res.status(500).json({ message: 'Failed to delete suggestion' });
    }
  });

  // Notifications API
  app.get('/api/notifications', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ message: 'userId is required' });
      const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
      res.json(notifications.map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        relatedId: n.related_id,
        createdByUsername: n.created_by_username || 'System',
        isRead: !!n.is_read,
        createdAt: n.created_at
      })));
    } catch (error) {
      console.error('Fetch notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.patch('/api/notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { isRead } = req.body;
      await db.run('UPDATE notifications SET is_read = ? WHERE id = ?', [!!isRead, id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Update notification error:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  app.patch('/api/notifications/read-all', async (req, res) => {
    try {
      const { userId } = req.body;
      await db.run('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Read all notifications error:', error);
      res.status(500).json({ message: 'Failed to read all notifications' });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const { recipientRole, message, title, type, relatedId, brand, branch, createdBy, createdByUsername } = req.body;
      
      let usersToNotify = [];
      if (recipientRole) {
        // Broaden complaints_team to include managers and admins if that's the convention
        const roles = [recipientRole];
        if (recipientRole === 'complaints_team') {
          roles.push('manager', 'admin', 'supervisor', 'team_leader');
        }
        
        const placeholders = roles.map(() => '?').join(',');
        let query = `SELECT id FROM users WHERE role IN (${placeholders})`;
        const params = [...roles];

        if (recipientRole === 'restaurant_user' && brand && branch) {
          query += ' AND brand = ? AND branch = ?';
          params.push(brand, branch);
        }

        usersToNotify = await db.all(query, params);
      }

      for (const user of usersToNotify) {
        // Don't notify the person who triggered it
        if (user.id === createdBy) continue;
        
        await db.run(
          'INSERT INTO notifications (user_id, title, message, type, related_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, title || 'New Notification', message, type || 'GENERAL', relatedId ? relatedId.toString() : null, createdByUsername || null]
        );
      }

      res.status(201).json({ success: true, notifiedCount: usersToNotify.length });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  // Catering Endpoints
  app.get('/api/catering/requests', async (req, res) => {
    try {
      const requests = await db.all('SELECT * FROM catering_requests ORDER BY created_at DESC');
      res.json(requests.map(r => ({
        id: r.id,
        brand: r.brand,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        date: r.date,
        servingTime: r.serving_time,
        address: r.address,
        location: r.location,
        package: r.package,
        items: r.items,
        additional: r.additional,
        notes: r.notes,
        deliveryCharge: r.delivery_charge,
        paymentMethod: r.payment_method,
        totalAmount: r.total_amount,
        status: r.status,
        createdBy: r.created_by,
        creatorUsername: r.creator_username,
        confirmedBy: r.confirmed_by,
        confirmedByName: r.confirmed_by_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })));
    } catch (error) {
      console.error('Fetch catering requests error:', error);
      res.status(500).json({ message: 'Failed to fetch catering requests' });
    }
  });

  app.post('/api/catering/requests', async (req, res) => {
    try {
      const { 
        brand, customerName, customerPhone, date, servingTime, 
        address, location, package: pkg, items, additional, notes,
        deliveryCharge, paymentMethod, totalAmount, createdBy, creatorUsername 
      } = req.body;
      
      const result = await db.get(
        `INSERT INTO catering_requests (
          brand, customer_name, customer_phone, date, serving_time, 
          address, location, package, items, additional, notes,
          delivery_charge, payment_method, total_amount, status, created_by, creator_username,
          start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?) RETURNING id`,
        [
          brand, customerName, customerPhone, date, servingTime, 
          address, location, pkg, items, additional, notes,
          deliveryCharge, paymentMethod, totalAmount, createdBy, creatorUsername,
          servingTime?.split('-')[0]?.trim() || '', 
          servingTime?.split('-')[1]?.trim() || ''
        ]
      );

      const requestId = result.id;

      // Log action
      await db.run(
        'INSERT INTO catering_logs (request_id, action, details, user_id, username) VALUES (?, ?, ?, ?, ?)',
        [requestId, 'CREATE', JSON.stringify(req.body), createdBy, creatorUsername]
      );

      // Create notifications for managers and admins
      const managers = await db.all("SELECT id FROM users WHERE role IN ('manager', 'admin', 'complaints_team', 'supervisor', 'team_leader')");
      for (const m of managers) {
        if (m.id !== createdBy) {
          await db.run(
            'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
            [m.id, 'New Catering Request', `A new request #${requestId} was submitted for ${brand} by ${creatorUsername}.`, 'CATERING_NEW', requestId.toString()]
          );
        }
      }

      console.log(`[NOTIFICATION] New catering request #${requestId} for ${brand} on ${date}`);

      res.status(201).json({ id: requestId, success: true });
    } catch (error) {
      console.error('Create catering request error:', error);
      res.status(500).json({ message: 'Failed to create catering request' });
    }
  });

  app.patch('/api/catering/requests/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, confirmedBy, confirmedByName, userId, username, ...otherData } = req.body;
      
      const updates = [];
      const params = [];
      
      if (status) {
        updates.push('status = ?');
        params.push(status);
      }
      if (confirmedBy) {
        updates.push('confirmed_by = ?');
        params.push(confirmedBy);
      }
      if (confirmedByName) {
        updates.push('confirmed_by_name = ?');
        params.push(confirmedByName);
      }

      for (const [key, value] of Object.entries(otherData)) {
        if (key === 'id') continue;
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${dbKey} = ?`);
        params.push(value);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        await db.run(`UPDATE catering_requests SET ${updates.join(', ')} WHERE id = ?`, params);
        
        // Log action
        await db.run(
          'INSERT INTO catering_logs (request_id, action, details, user_id, username) VALUES (?, ?, ?, ?, ?)',
          [id, status ? 'STATUS_CHANGE' : 'UPDATE', JSON.stringify(req.body), userId, username]
        );

        // Notify the creator if status changed
        if (status) {
          const req = await db.get('SELECT created_by, brand FROM catering_requests WHERE id = ?', [id]);
          if (req && req.created_by !== userId) {
            await db.run(
              'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
              [req.created_by, 'Catering Request Update', `Your request #${id} for ${req.brand} is now ${status}.`, 'CATERING_STATUS', id.toString()]
            );
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Update catering request error:', error);
      res.status(500).json({ message: 'Failed to update catering request' });
    }
  });

  app.get('/api/catering/availability', async (req, res) => {
    try {
      const availability = await db.all('SELECT * FROM catering_availability');
      res.json(availability.map(a => ({
        id: a.id,
        type: a.type,
        busyType: a.busy_type,
        startDate: a.start_date,
        endDate: a.end_date,
        startTime: a.start_time,
        endTime: a.end_time,
        brand: a.brand,
        reason: a.reason,
        createdBy: a.created_by
      })));
    } catch (error) {
      console.error('Fetch catering availability error:', error);
      res.status(500).json({ message: 'Failed to fetch catering availability' });
    }
  });

  app.post('/api/catering/availability', async (req, res) => {
    try {
      const { 
        type, busyType, startDate, endDate, startTime, endTime, brand, reason, createdBy 
      } = req.body;
      
      const result = await db.get(
        `INSERT INTO catering_availability (
          type, busy_type, start_date, end_date, start_time, end_time, brand, reason, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [type || 'Busy', busyType, startDate, endDate, startTime, endTime, brand, reason, createdBy]
      );

      res.status(201).json({ id: result.id, success: true });
    } catch (error) {
      console.error('Create catering availability error:', error);
      res.status(500).json({ message: 'Failed to create catering availability' });
    }
  });

  app.get('/api/catering/logs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await db.all('SELECT * FROM catering_logs WHERE request_id = ? ORDER BY timestamp DESC', [id]);
      res.json(logs);
    } catch (error) {
      console.error('Fetch catering logs error:', error);
      res.status(500).json({ message: 'Failed to fetch catering logs' });
    }
  });

  // Pre-Order APIs
  app.get('/api/pre-orders', async (req, res) => {
    try {
      const { brand, branch } = req.query;
      let query = 'SELECT * FROM pre_orders';
      const params = [];

      if (brand && branch) {
        query += ' WHERE brand = ? AND branch = ?';
        params.push(brand, branch);
      } else if (brand) {
        query += ' WHERE brand = ?';
        params.push(brand);
      }

      query += ' ORDER BY created_at DESC';
      
      const orders = await db.all(query, params);
      res.json(orders.map(o => ({
        ...o,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        orderType: o.order_type,
        paymentStatus: o.payment_status,
        totalAmount: o.total_amount,
        items: JSON.parse(o.items || '[]'),
        createdAt: o.created_at,
        updatedAt: o.updated_at
      })));
    } catch (error) {
      console.error('Fetch pre-orders error:', error);
      res.status(500).json({ message: 'Failed to fetch pre-orders' });
    }
  });

  app.post('/api/pre-orders', async (req, res) => {
    try {
      const { 
        customer, phone, date, time, address, 
        brand, branch, orderType, paymentStatus, 
        items, totalAmount, generalNotes,
        createdBy, creatorUsername 
      } = req.body;
      
      const result = await db.get(
        `INSERT INTO pre_orders (
          customer_name, customer_phone, date, time, address, 
          brand, branch, order_type, payment_status, items, 
          total_amount, notes, created_by, creator_username
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          customer, phone, date, time, address, 
          brand, branch, orderType, paymentStatus, JSON.stringify(items), 
          totalAmount, generalNotes, createdBy, creatorUsername
        ]
      );

      const orderId = result.id;
      res.status(201).json({ id: orderId, success: true });
    } catch (error) {
      console.error('Create pre-order error:', error);
      res.status(500).json({ message: 'Failed to create pre-order' });
    }
  });

  // Profile update route
  app.put('/api/auth/profile', async (req, res) => {
    try {
      const { id, username, password } = req.body;
      if (!id) return res.status(400).json({ message: 'User ID is required' });

      const updates = [];
      const params = [];

      if (username) {
        updates.push('username = ?');
        params.push(username);
      }
      if (password) {
        updates.push('password = ?');
        params.push(password);
      }

      if (updates.length > 0) {
        params.push(id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        
        // Fetch updated user
        const updatedUser = await db.get('SELECT id, username, role, brand, brands, branch FROM users WHERE id = ?', [id]);
        if (updatedUser) {
          updatedUser.brands = JSON.parse(updatedUser.brands || '[]');
          return res.json({ user: updatedUser });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Database 404 handler
  app.all('/api/*', (req, res) => {
    console.warn(`404 for API route: ${req.method} ${req.url}`);
    res.status(404).json({ message: `API route ${req.method} ${req.url} not found` });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: process.env.NODE_ENV === 'production' ? null : err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  });

  // API 404 handler
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.path}`);
    res.status(404).json({ message: `API route ${req.method} ${req.path} not found` });
  });

  // Generic Error Handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      console.error('[API Internal Error]', err);
      return res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log('Running in DEVELOPMENT mode with Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode');
    const distPath = path.join(process.cwd(), 'dist');
    
    // Safety check for dist directory
    if (!fs.existsSync(distPath)) {
       console.warn('WARNING: dist directory not found! Static files will not be served.');
       console.log('Make sure "npm run build" was executed successfully.');
    } else {
       console.log(`Serving static files from: ${distPath}`);
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html: ${err.message}`);
          res.status(500).send('Error loading application. Please check server logs.');
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Domain: ${process.env.RAILWAY_STATIC_URL || 'localhost'}`);
    console.log(`[Server] Port: ${PORT}`);
    console.log(`[Server] Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
