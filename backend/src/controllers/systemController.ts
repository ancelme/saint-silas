import { Request, Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getSchoolSettings(req: Request, res: Response) {
  try {
    const result = await db.query(`SELECT setting_key, setting_value, category, description FROM school_settings`);
    const settings: Record<string, string> = {};
    result.rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });
    return res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
}

export async function updateSchoolSetting(req: AuthRequest, res: Response) {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Setting key is required' });
    }

    await db.query(
      `INSERT INTO school_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_at = CURRENT_TIMESTAMP`,
      [key, String(value)]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'SETTING_UPDATE',
      details: `Updated school setting: ${key} = ${value}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Setting updated successfully' });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
}

export async function exportDatabaseDump(req: AuthRequest, res: Response) {
  try {
    const dump = await db.generateSqlBackup();
    const filename = `st_silas_backup_${new Date().toISOString().split('T')[0]}.sql`;

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Owner',
      role: req.user?.role || 'owner',
      action: 'DATABASE_BACKUP_EXPORT',
      details: `Exported full database SQL dump (${dump.length} bytes)`,
      ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(dump);
  } catch (error: any) {
    console.error('Error exporting database:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate database dump' });
  }
}

export async function getSystemHealth(req: Request, res: Response) {
  try {
    const dbInfo = db.getDatabaseEngine();
    return res.json({
      status: 'healthy',
      institution: 'St. Silas Private Primary School',
      rebCenterCode: '530413',
      database: {
        engine: dbInfo.engine,
        connected: dbInfo.isConnected,
        isProductionConfigured: dbInfo.engine === 'postgresql'
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'unhealthy', error: error.message });
  }
}
