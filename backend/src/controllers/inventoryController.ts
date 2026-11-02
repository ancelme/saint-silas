import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getInventory(req: AuthRequest, res: Response) {
  try {
    const [itemsResult, movementsResult] = await Promise.all([
      db.query(`SELECT * FROM stock_items ORDER BY category, name`),
      db.query(`SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 200`),
    ]);

    return res.json({
      items: itemsResult.rows.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: Number(item.quantity || 0),
        reorderLevel: Number(item.reorder_level || 0),
        unitCost: Number(item.unit_cost || 0),
        location: item.location || '',
        updatedAt: item.updated_at,
      })),
      movements: movementsResult.rows.map(movement => ({
        id: movement.id,
        itemId: movement.item_id,
        itemName: movement.item_name,
        type: movement.type,
        quantity: Number(movement.quantity || 0),
        unitCost: Number(movement.unit_cost || 0),
        referenceNo: movement.reference_no || '',
        recipient: movement.recipient || '',
        notes: movement.notes || '',
        recordedBy: movement.recorded_by || '',
        createdAt: movement.created_at,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load inventory' });
  }
}

export async function createStockItem(req: AuthRequest, res: Response) {
  try {
    const { name, category, unit, quantity, reorderLevel, unitCost, location } = req.body;
    const openingQuantity = Number(quantity || 0);
    const parsedCost = Number(unitCost || 0);
    if (!String(name || '').trim() || !String(category || '').trim() || !String(unit || '').trim()) {
      return res.status(400).json({ error: 'Item name, category, and unit are required' });
    }
    if (!Number.isFinite(openingQuantity) || openingQuantity < 0 || !Number.isFinite(parsedCost) || parsedCost < 0) {
      return res.status(400).json({ error: 'Quantity and unit cost must be valid non-negative numbers' });
    }

    const id = `stock-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await db.query(
      `INSERT INTO stock_items (id, name, category, unit, quantity, reorder_level, unit_cost, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), category.trim(), unit.trim(), openingQuantity, Number(reorderLevel || 0), parsedCost, String(location || '').trim()],
    );

    return res.status(201).json({ id, message: 'Stock item created successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create stock item' });
  }
}

export async function recordStockMovement(req: AuthRequest, res: Response) {
  try {
    const { itemId, type, quantity, unitCost, referenceNo, recipient, notes } = req.body;
    const movementType = type === 'IN' || type === 'OUT' ? type : '';
    const movementQuantity = Number(quantity);
    if (!itemId || !movementType || !Number.isFinite(movementQuantity) || movementQuantity <= 0) {
      return res.status(400).json({ error: 'Item, movement type, and a valid positive quantity are required' });
    }

    const itemResult = await db.query(`SELECT * FROM stock_items WHERE id = ?`, [itemId]);
    if (!itemResult.rows.length) return res.status(404).json({ error: 'Stock item not found' });
    const item = itemResult.rows[0];
    const currentQuantity = Number(item.quantity || 0);
    if (movementType === 'OUT' && movementQuantity > currentQuantity) {
      return res.status(409).json({ error: `Only ${currentQuantity} ${item.unit} are available` });
    }

    const nextQuantity = movementType === 'IN'
      ? currentQuantity + movementQuantity
      : currentQuantity - movementQuantity;
    const movementCost = Number(unitCost ?? item.unit_cost ?? 0);
    if (!Number.isFinite(movementCost) || movementCost < 0) {
      return res.status(400).json({ error: 'Unit cost must be a valid non-negative number' });
    }

    const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await db.query(
      `UPDATE stock_items SET quantity = ?, unit_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nextQuantity, movementType === 'IN' ? movementCost : Number(item.unit_cost || 0), itemId],
    );
    await db.query(
      `INSERT INTO stock_movements (id, item_id, item_name, type, quantity, unit_cost, reference_no, recipient, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [movementId, itemId, item.name, movementType, movementQuantity, movementCost,
        String(referenceNo || '').trim(), String(recipient || '').trim(), String(notes || '').trim(), req.user?.fullName || 'Bursar'],
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Bursar',
      role: req.user?.role || 'accountant',
      action: movementType === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
      details: `${movementType} ${movementQuantity} ${item.unit} of ${item.name}. Balance: ${nextQuantity} ${item.unit}.`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ id: movementId, quantity: nextQuantity, message: `Stock ${movementType === 'IN' ? 'received' : 'issued'} successfully` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to record stock movement' });
  }
}
