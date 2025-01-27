const InventoryItem = require('../../models/Inventory/InventoryItem');
const ActionLog = require('../../models/Inventory/ActionLog');

const createItem = async (req, res) => {
    const { name, description, quantity } = req.body;

    const newItem = await InventoryItem.create({
        name: name,
        description, description,
        quantity: quantity
    });

    if(!newItem) return res.status(500).json({ success: false,  message: "Internal server error.", error: error.message });
    
    return res.status(201).json({ success: true, message: "Item has been added successfully!", data: newItem});
    
}

const checkinItem = async (req, res) => {
    const {userId, sku, quantity } = req.body;

    const checkin = await InventoryItem.checkin(sku, userId, quantity);

    if(!checkin) return res.status(500).json({ success: false,  message: "Internal server error.", error: error.message });

    return res.status(200).json({ success: true, message: `${quantity} of ${sku} has been checked in by ${userId}`, data: newItem});

}

const checkoutItem = async (req, res) => {
    const {userId, sku, quantity } = req.body;

    const checkout = await InventoryItem.checkout(sku, userId, quantity);

    if(!checkout) return res.status(500).json({ success: false,  message: "Internal server error.", error: error.message });
    
    return res.status(200).json({ success: true, message: `${quantity} of ${sku} has been checked out by ${userId}`, data: newItem});

}

const updateItem = async (req, res) => {
    const {id, name, description, quantity } = req.body;

    const updateItem = await InventoryItem.update(
    {
        name: name,
        description, description,
        quantity: quantity
    },
    {
        where: {
            id: id
        }
    });

    if(!updateItem) return res.status(500).json({ success: false,  message: "Internal server error.", error: error.message });
    
    return res.status(201).json({ success: true, message: "Item has been updated successfully!", data: updateItem});
    
}

const deleteItem = async (req, res) => {
    const { id } = req.body;
    
    const item = await InventoryItem.findByPk(id);

    if(!item) return res.status(404).json({ success: false,  message: "Item not found!" });

    await item.destroy();
    return res.status(200).json({success: true, message: 'Item has been deleted!'});
}