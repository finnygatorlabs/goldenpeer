const { pool } = require("../config/database");

const TABLE_DEFINITIONS = [
  {
    name: "ss_users",
    sql: `CREATE TABLE IF NOT EXISTS ss_users (
      user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      account_type VARCHAR(50) NOT NULL DEFAULT 'B2C',
      subscription_type VARCHAR(50) NOT NULL DEFAULT 'FREE',
      subscription_source VARCHAR(50),
      subscription_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`,
  },
  {
    name: "user_profiles",
    sql: `CREATE TABLE IF NOT EXISTS user_profiles (
      profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone_number VARCHAR(20),
      date_of_birth DATE,
      hearing_loss_level VARCHAR(50) DEFAULT 'NONE',
      tech_comfort_level VARCHAR(50) DEFAULT 'BEGINNER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "user_settings",
    sql: `CREATE TABLE IF NOT EXISTS user_settings (
      setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      color_scheme VARCHAR(50) DEFAULT 'LIGHT',
      font_size VARCHAR(50) DEFAULT 'NORMAL',
      font_family VARCHAR(50) DEFAULT 'SANS_SERIF',
      line_height VARCHAR(50) DEFAULT 'NORMAL',
      letter_spacing VARCHAR(50) DEFAULT 'NORMAL',
      high_contrast_enabled BOOLEAN DEFAULT FALSE,
      captions_enabled BOOLEAN DEFAULT TRUE,
      voice_gender VARCHAR(50) DEFAULT 'FEMALE',
      voice_speed DECIMAL(2,1) DEFAULT 1.0,
      voice_volume INTEGER DEFAULT 80,
      hearing_aid_connected BOOLEAN DEFAULT FALSE,
      hearing_aid_model VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "voice_requests",
    sql: `CREATE TABLE IF NOT EXISTS voice_requests (
      request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      request_text TEXT NOT NULL,
      response_text TEXT NOT NULL,
      voice_file_path VARCHAR(500),
      duration_seconds INTEGER,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      user_rating INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "scam_analyses",
    sql: `CREATE TABLE IF NOT EXISTS scam_analyses (
      analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      input_text TEXT NOT NULL,
      risk_score INTEGER,
      risk_level VARCHAR(50),
      detected_patterns JSONB,
      explanation TEXT,
      recommended_action TEXT,
      user_reported_scam BOOLEAN DEFAULT FALSE,
      family_notified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "scam_library",
    sql: `CREATE TABLE IF NOT EXISTS scam_library (
      pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pattern_name VARCHAR(100) NOT NULL,
      keywords JSONB,
      description TEXT,
      accuracy INTEGER DEFAULT 0,
      false_positive_rate INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_contacts",
    sql: `CREATE TABLE IF NOT EXISTS ss_contacts (
      contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      contact_name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20),
      email VARCHAR(255),
      category VARCHAR(50) DEFAULT 'OTHER',
      favorite_task VARCHAR(100),
      usage_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "family_members",
    sql: `CREATE TABLE IF NOT EXISTS family_members (
      family_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      family_email VARCHAR(255) NOT NULL,
      family_name VARCHAR(100),
      relationship VARCHAR(50),
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "family_alerts",
    sql: `CREATE TABLE IF NOT EXISTS family_alerts (
      alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      family_id UUID NOT NULL REFERENCES family_members(family_id) ON DELETE CASCADE,
      alert_type VARCHAR(50),
      alert_message TEXT,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_subscriptions",
    sql: `CREATE TABLE IF NOT EXISTS ss_subscriptions (
      subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      subscription_type VARCHAR(50) DEFAULT 'FREE',
      subscription_source VARCHAR(50) DEFAULT 'STRIPE',
      external_subscription_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      current_period_start DATE,
      current_period_end DATE,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_telecom_accounts",
    sql: `CREATE TABLE IF NOT EXISTS ss_telecom_accounts (
      telecom_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      carrier VARCHAR(50),
      carrier_user_id VARCHAR(255),
      carrier_phone VARCHAR(20),
      carrier_auth_token VARCHAR(500),
      subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_insurance_accounts",
    sql: `CREATE TABLE IF NOT EXISTS ss_insurance_accounts (
      insurance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      insurance_provider VARCHAR(100),
      member_id VARCHAR(255),
      member_dob DATE,
      insurance_auth_token VARCHAR(500),
      subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_facility_accounts",
    sql: `CREATE TABLE IF NOT EXISTS ss_facility_accounts (
      facility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_name VARCHAR(255) NOT NULL,
      facility_type VARCHAR(50),
      address VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(10),
      phone VARCHAR(20),
      email VARCHAR(255),
      admin_user_id UUID NOT NULL REFERENCES ss_users(user_id),
      api_key VARCHAR(500),
      facility_code VARCHAR(50) UNIQUE,
      subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_facility_residents",
    sql: `CREATE TABLE IF NOT EXISTS ss_facility_residents (
      resident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES ss_facility_accounts(facility_id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ss_users(user_id) ON DELETE CASCADE,
      resident_name VARCHAR(100),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_admin_users",
    sql: `CREATE TABLE IF NOT EXISTS ss_admin_users (
      admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'SUPPORT',
      permissions JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`,
  },
  {
    name: "ss_admin_activity_log",
    sql: `CREATE TABLE IF NOT EXISTS ss_admin_activity_log (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES ss_admin_users(admin_id) ON DELETE CASCADE,
      action VARCHAR(50),
      resource_type VARCHAR(50),
      resource_id VARCHAR(255),
      changes JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_analytics_events",
    sql: `CREATE TABLE IF NOT EXISTS ss_analytics_events (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES ss_users(user_id) ON DELETE SET NULL,
      event_type VARCHAR(50),
      event_data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: "ss_error_logs",
    sql: `CREATE TABLE IF NOT EXISTS ss_error_logs (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES ss_users(user_id) ON DELETE SET NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      endpoint VARCHAR(255),
      status_code INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  },
];

async function initDatabase() {
  let created = 0;
  let skipped = 0;

  for (const table of TABLE_DEFINITIONS) {
    try {
      await pool.query(table.sql);
      created++;
    } catch (err) {
      if (err.code === "42P07") {
        skipped++;
      } else {
        console.error(`Failed to create table ${table.name}:`, err.message);
        throw err;
      }
    }
  }

  console.log(`Database initialized: ${created} tables ready, ${skipped} already existed`);
}

module.exports = { initDatabase };
