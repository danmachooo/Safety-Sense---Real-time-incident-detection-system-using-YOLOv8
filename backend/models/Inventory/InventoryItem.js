const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../config/database');
const ActionLog = require('../Inventory/ActionLog')

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
  tableName: 'InventoryItem',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['sku']  // Index on SKU (already unique)
    },
    {
      fields: ['name']
    },
    {
      fields: ['status']
    }
  ],

  hooks: {
    beforeValidate: async (item) => {
      console.log('Before Validate Hook - Item:', item); 
      if (!item.sku) {
        item.sku = await generateSKU(item.name);
        console.log("GENERATED SKU: ", item.sku);
      }
    },
    afterCreate: (item) => logAction('create', item.id),
    afterUpdate: (item) => logAction('update', item.id),
    afterDestroy: (item) => logAction('delete', item.id)
  }
  
});

// Generate SKU Helper Function
async function generateSKU(name) {
  try {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const baseSKU = name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/gi, '').substring(0, 20);
    
    const count = await InventoryItem.count({
      where: { sku: { [Op.like]: `${date}-${baseSKU}%` } }
    });

    return `${date}-${baseSKU}-${count + 1}`;
  } catch (error) {
    console.error('SKU Generation Failed:', error);
    throw new Error('SKU generation failed');
  }
}

// Logging Function
const logAction = async (action, itemId, details = '') => {
  await ActionLog.create(
    {
      action,
      itemId,
      details
    },
    { hooks: false }  // Disables hooks for ActionLog creation
  );
};



// Checkout Function
InventoryItem.checkout = async function (sku, userId, quantity) {
  const item = await this.findOne({ where: { sku } });
  
  if (!item) throw new Error('Item not found');
  if (item.quantity < quantity) throw new Error('Insufficient stock');
  
  item.quantity -= quantity;
  item.status = quantity === 0 ? 'missing' : 'checked_out';
  item.lastCheckedBy = userId;
  await item.save();
  
  await ActionLog.create({
    action: 'checkout',
    itemId: item.id,
    details: `Checked out ${quantity} units by ${userId}`
  });

  return item;
};

// Checkin Function
InventoryItem.checkin = async function (sku, userId, quantity) {
  const item = await this.findOne({ where: { sku } });
  
  if (!item) throw new Error('Item not found');
  
  item.quantity += quantity;
  item.status = 'available';
  item.lastCheckedBy = userId;
  await item.save();
  
  await ActionLog.create({
    action: 'checkin',
    itemId: item.id,
    details: `Checked in ${quantity} units by ${userId}`
  });

  return item;
};

module.exports = InventoryItem;
