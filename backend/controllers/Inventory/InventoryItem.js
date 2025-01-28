const InventoryItem = require('../../models/Inventory/InventoryItem');
const { BadRequestError, NotFoundError  } = require('../../utils/Error');

const createItem = async (req, res) => {
    const { name, description, quantity } = req.body;
    
    if(!name || !description || !quantity)
        throw new BadRequestError("Invalid Request! Required fields are missing.");

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new BadRequestError("Quantity must be a positive number.");
      }

    const newItem = await InventoryItem.create({
        name: name,
        description: description,
        quantity: quantity
    });
    
    return res.status(201).json({ success: true, message: "Item has been added successfully!", data: newItem});
    
}

const checkinItem = async (req, res) => {
    const { sku, quantity } = req.body;
    const userId = req.user.id; 

    if(!userId || !sku || !quantity) 
        throw new BadRequestError("Invalid Request! Required fields are missing.");

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new BadRequestError("Quantity must be a positive number.");
    }

    const checkin = await InventoryItem.checkin(sku, userId, quantity);
    if (!checkin) {
        throw new NotFoundError("Item not found.");
    }

    return res.status(200).json({ success: true, message: `${quantity} of ${sku} has been checked in by ${userId}`, data: checkin});

}

const checkoutItem = async (req, res) => {
    const { sku, quantity } = req.body;
    const userId = req.user.id; 

    if(!userId || !sku || !quantity) 
        throw new BadRequestError("Invalid Request! Required fields are missing.");
    
    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new BadRequestError("Quantity must be a positive number.");
    }

    const checkout = await InventoryItem.checkout(sku, userId, quantity);
    if (!checkout) {
        throw new NotFoundError("Item not found.");
    }

    return res.status(200).json({ success: true, message: `${quantity} of ${sku} has been checked out by ${userId}`, data: checkout});

}

const updateItem = async (req, res) => {
    const { id } = req.params;
    const { name, description, quantity } = req.body;

    if(!id || !name || !description || !quantity) 
        throw new BadRequestError("Invalid Request! Required fields are missing.");

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new BadRequestError("Quantity must be a positive number.");
    }

    const updateItem = await InventoryItem.update(
    {
        name: name,
        description: description,
        quantity: quantity
    },
    {
        where: {
            id: id
        }
    });
    const updatedItem = await InventoryItem.findByPk(id);
s
    return res.status(201).json({ success: true, message: "Item has been updated successfully!", data: updatedItem});
    
}

const deleteItem = async (req, res) => {
    const { id } = req.body;
    
    if(!id) throw new BadRequestError("Invalid Request! Required fields are missing.");

    
    const item = await InventoryItem.findByPk(id);

    if(!item) throw new NotFoundError("Item not found.");


    await item.destroy();
    return res.status(200).json({success: true, message: 'Item has been deleted!'});
}

const test = (req, res) => {
    res.status(200).json({message: 'test'});
}

module.exports = {
    createItem,
    checkinItem,
    checkoutItem,
    updateItem,
    deleteItem,
    test
}