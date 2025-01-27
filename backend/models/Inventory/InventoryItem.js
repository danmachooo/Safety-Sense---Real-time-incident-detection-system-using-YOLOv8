const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const InventoryItem = sequelize.define('InventoryItem', {
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'checked_out', 'missing'),
    defaultValue: 'available'
  },
  lastCheckedBy: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (item) => {
      item.sku = await generateSKU(item.name);
    },
    afterCreate: (item) => logAction('create', item.id),
    afterUpdate: (item) => logAction('update', item.id),
    afterDestroy: (item) => logAction('delete', item.id)
  }
});

// Helper function to generate SKU (DATE-NAME-NUMBER)
const generateSKU = async (name) => {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // Format: YYYYMMDD
    const baseSKU = name.toUpperCase().replace(/\s+/g, '-'); // Convert name to uppercase and replace spaces with hyphens
    const count = await InventoryItem.count({ where: { name } }); // Count existing items with the same name
    return `${date}-${baseSKU}-${count + 1}`; // Format: DATE-NAME-NUMBER
  };

// Helper function for action logging
const logAction = async (action, itemId, details = '') => {
  await sequelize.models.ActionLog.create({
    action,
    itemId,
    details
  });
};

// Custom methods
InventoryItem.checkout = async function(sku, userId, quantity) {
  const item = await this.findOne({ where: { sku } });
  
  if (!item) throw new Error('Item not found');
  if (item.quantity < quantity) throw new Error('Insufficient stock');
  
  item.quantity -= quantity;
  item.status = quantity === 0 ? 'missing' : 'checked_out';
  item.lastCheckedBy = userId;
  await item.save();
  
  await sequelize.models.ActionLog.create({
    action: 'checkout',
    itemId: item.id,
    details: `Checked out ${quantity} units by ${userId}`
  });

  return item;
};

InventoryItem.checkin = async function(sku, userId, quantity) {
  const item = await this.findOne({ where: { sku } });
  
  if (!item) throw new Error('Item not found');
  
  item.quantity += quantity;
  item.status = 'available';
  item.lastCheckedBy = userId;
  await item.save();
  
  await sequelize.models.ActionLog.create({
    action: 'checkin',
    itemId: item.id,
    details: `Checked in ${quantity} units by ${userId}`
  });

  return item;
};

module.exports = InventoryItem;