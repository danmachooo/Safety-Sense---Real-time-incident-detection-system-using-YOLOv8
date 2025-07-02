import xlsx from "xlsx";
import fs from "fs";
import models from "../../../models/index.js";
import { BadRequestError } from "../../../utils/Error.js";
const { InventoryItem, Category, Batch, Notification } = models;

export const processExcelFile = async (filePath, userId) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const results = { success: [], errors: [] };

  for (const row of data) {
    try {
      // ✅ Validate required fields
      if (
        !row.name ||
        !row.category ||
        row.unit_price === undefined ||
        row.min_stock_level === undefined
      ) {
        throw new BadRequestError(
          `Missing required fields in: ${JSON.stringify(row)}`
        );
      }

      // ✅ Safe category type fallback
      const allowedTypes = [
        "EQUIPMENT",
        "SUPPLIES",
        "RELIEF_GOODS",
        "VEHICLES",
        "COMMUNICATION_DEVICES",
      ];
      const safeType = allowedTypes.includes((row.type || "").toUpperCase())
        ? row.type.toUpperCase()
        : "SUPPLIES";

      // ✅ Find or create category
      let category = await Category.findOne({ where: { name: row.category } });
      if (!category) {
        category = await Category.create({
          name: row.category,
          type: safeType,
          description: `Auto-created from import for ${row.name}`,
        });
      }

      // ✅ Create or update inventory item
      let item = await InventoryItem.findOne({ where: { name: row.name } });
      const isNewItem = !item;

      if (isNewItem) {
        item = await InventoryItem.create({
          name: row.name,
          description: row.description || "",
          category_id: category.id,
          quantity_in_stock: 0,
          unit_price: row.unit_price,
          min_stock_level: row.min_stock_level,
          reorder_level: row.reorder_level || 0,
          unit_of_measure: row.unit_of_measure || "pcs",
          condition: row.condition || "GOOD",
          location: row.location || "Warehouse",
          is_deployable: row.is_deployable ?? true,
          notes: row.notes || "",
        });
      } else {
        await item.update({
          description: row.description || item.description,
          category_id: category.id,
          unit_price: row.unit_price,
          min_stock_level: row.min_stock_level,
          reorder_level: row.reorder_level || item.reorder_level,
          unit_of_measure: row.unit_of_measure || item.unit_of_measure,
          condition: row.condition || item.condition,
          location: row.location || item.location,
          is_deployable: row.is_deployable ?? item.is_deployable,
          notes: row.notes || item.notes,
        });
      }

      // ✅ Create batch if quantity exists
      if (row.quantity !== undefined && row.quantity > 0) {
        const batchNumber = `${item.name
          .slice(0, 3)
          .toUpperCase()}${Date.now()}`;
        const batch = await Batch.create({
          inventory_item_id: item.id,
          quantity: row.quantity,
          batch_number: batchNumber,
          supplier: row.supplier || "Unknown",
          expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
          received_by: userId,
          received_date: new Date(),
          funding_source: row.funding_source || null,
          cost: row.cost || null,
          notes: row.batch_notes || "",
        });

        await item.increment("quantity_in_stock", { by: row.quantity });

        // 🔔 Expiry notification - Fixed to match your Notification model
        if (batch.expiry_date) {
          const daysUntilExpiry = Math.ceil(
            (batch.expiry_date - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 30) {
            await Notification.create({
              userId: userId,
              actionType: "STOCK_ADJUSTED", // Using existing enum value
              entityType: "Inventory",
              entityId: item.id,
              description: `Batch ${batch.batch_number} of ${
                item.name
              } will expire in ${daysUntilExpiry} days. Priority: ${
                daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM"
              }`,
              isRead: false,
            });
          }
        }
      }

      // 🔔 Low stock notification - Fixed to match your Notification model
      if (item.quantity_in_stock <= item.min_stock_level) {
        await Notification.create({
          userId: userId,
          actionType: "STOCK_ADJUSTED", // Using existing enum value
          entityType: "Inventory",
          entityId: item.id,
          description: `${item.name} is below minimum stock level. Current stock: ${item.quantity_in_stock}, Minimum required: ${item.min_stock_level}`,
          isRead: false,
        });
      }

      // ✅ Log success
      results.success.push({
        name: item.name,
        status: isNewItem ? "created" : "updated",
        quantity_added: row.quantity || 0,
        category: category.name,
        current_stock: item.quantity_in_stock,
      });
    } catch (err) {
      console.error(`Error processing row:`, row, err.message);
      results.errors.push({
        row_data: {
          name: row.name || "Unknown",
          category: row.category || "Unknown",
          unit_price: row.unit_price,
          quantity: row.quantity,
        },
        error: err.message,
      });
    }
  }

  // 🧹 Delete the file
  try {
    fs.unlinkSync(filePath);
  } catch (fileError) {
    console.error("Error deleting file:", fileError.message);
  }

  return results;
};
