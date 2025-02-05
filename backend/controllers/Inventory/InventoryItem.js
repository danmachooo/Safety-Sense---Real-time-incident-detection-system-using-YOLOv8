const {InventoryItem} = require('../../models/Inventory/Associations');
const { BadRequestError, NotFoundError  } = require('../../utils/Error');


const createItem = async (req, res) => {
  try {
    const { name, description, quantity } = req.body;
    
    if (!name || typeof quantity !== 'number') {
      throw new BadRequestError("Valid name and quantity required");
    }

    console.log('Final Parsed Body:', req.body);
    console.log('Before creation - req.body:', req.body); 
    

    const newItem = await InventoryItem.create({
      name ,
      description,
      quantity
    });

    console.log('After creation - newItem:', newItem.toJSON()); 
    
    return res.status(201).json({
      success: true,
      data: newItem
    });
    
  } catch (error) {
    console.error('Creation Error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => `${err.path}: ${err.message}`);
      throw new BadRequestError(messages.join(', '));
    }
    
    throw error;
  }
};

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
  
    if (!id || !name || typeof quantity !== 'number') {
      throw new BadRequestError("Invalid request parameters");
    }
  
    const [affectedCount] = await InventoryItem.update(
      { name, description, quantity },
      { where: { id } }
    );
  
    if (affectedCount === 0) {
      throw new NotFoundError("Item not found");
    }
  
    const updatedItem = await InventoryItem.findByPk(id);
    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: updatedItem
    });
  };

const deleteItem = async (req, res) => {
  const { id } = req.params; 
  
  if (!id) {
    throw new BadRequestError("Item ID is required");
  }

  const item = await InventoryItem.findByPk(id);
  if (!item) {
    throw new NotFoundError("Item not found");
  }

  await item.destroy();
  return res.status(200).json({
    success: true,
    message: "Item deleted successfully"
  });
};

const getItem = async (req, res) => {
  try {
    const { id } = req.params;
  
    if(!id) throw new BadRequestError("Item ID is required");
  
    const item = await InventoryItem.findByPk(id);
  
    if(!item) throw new NotFoundError('Item not found.');
  
    return res.status(200).json({
      success: true,
      message: `Item Found: ${item.id}`,
      data: item
    });

  } catch (error) {
    console.error(error);
  }
}

const getAllItems = async (req, res) => {
  try {
    const items = await InventoryItem.findAll();

    if(!items) throw new NotFoundError('Item not found.');

    return res.status(200).json({
      success: true,
      message: `Item Found: ${items}`,
      data: items
    });
  } catch (error) {
    console.error('Error: ' + error);
  }
}

const test = async (req, res) => {
    res.status(200).json({message: 'test'});
}

module.exports = {
    createItem,
    checkinItem,
    checkoutItem,
    updateItem,
    deleteItem,
    getItem,
    getAllItems,
    test
}