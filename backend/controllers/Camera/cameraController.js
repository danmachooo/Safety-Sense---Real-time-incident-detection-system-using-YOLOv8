const { StatusCodes } = require('http-status-codes');
const { BadRequestError, NotFoundError } = require('../../utils/Error');
const Camera = require('../../models/Incidents/Camera');
const CameraLog = require('../../models/Incidents/CameraLog');
const { Op } = require('sequelize');
const { get } = require('../../routes/SystemRoutes');

const registerCamera = async (req, res, next) => {
  try {
    const { name, ipAddress, rtspUrl, location, model, description } = req.body;

    console.log("Request body: ", req.body);

    if(!name || !ipAddress || !rtspUrl || !location || !model || !description) throw new BadRequestError('Required fields are missing.')
    
    const camera = await Camera.create({
      name,
      ipAddress,
      rtspUrl,
      location,
      model,
      description
    });

    await CameraLog.create({
      cameraId: camera.id,
      userId: req.user.id,
      actionType: 'CREATED',
      description: 'Camera registered'
    });

    return res.status(StatusCodes.CREATED).json({ 
        success: true,
        message: 'Camera has been registered.'
    });

  } catch (error) {
    console.error('Register Camera Error: ', error.message);
    next(error);
  }
};

const updateCamera = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ipAddress, rtspUrl, location, description } = req.body;

    if(!name || !ipAddress || !rtspUrl || !location || !description) throw new BadRequestError('Required fields are missing.')
    
    
    const camera = await Camera.findByPk(id);
    if (!camera) throw new NotFoundError('Camera not found.');

    const oldValues = { ...camera.toJSON() };

    const updatedCamera = await camera.update({
      name,
      ipAddress,
      rtspUrl,
      location,
      description
    });

     await CameraLog.create({
      cameraId: camera.id,
      userId: req.user.id,
      actionType: 'UPDATED',
      description: JSON.stringify({ old: oldValues, new: camera.toJSON() })
    });

    return res.status(StatusCodes.OK).json({ 
        success: true,
        message: 'Camera has been updated.',
        data: updatedCamera
    });
  } catch (error) {
    console.error('Update Camera Error: ', error);
    next(error);
  }
};

const deleteCamera = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const camera = await Camera.findByPk(id);
    if (!camera) throw new NotFoundError('Camera not found.');


    await camera.destroy(); // This will perform a soft delete

    await CameraLog.create({
      cameraId: camera.id,
      userId: req.user.id,
      actionType: 'DELETED',
      description: 'Camera deleted'
    });

    return res.status(StatusCodes.OK).json({ 
        success: true,
        message: 'Camera has been deleted.',
    }); 

    } catch (error) {
        console.error('Delete Camera Error: ', error);
        next(error);
    }
};
const getCameras = async (req, res, next) => {
  try {
    let { page, limit, search, sortBy, sortOrder } = req.query;

    // Default values for pagination
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Default sorting
    const validSortColumns = ['name', 'ipAddress', 'location', 'status', 'createdAt'];
    const validSortOrders = ['asc', 'desc'];
    
    let order = [['createdAt', 'desc']]; // Default sorting by newest cameras
    if (sortBy && validSortColumns.includes(sortBy)) {
      const direction = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';
      order = [[sortBy, direction]];
    }

    // Search filter
    const whereCondition = {};
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { ipAddress: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ];
    }

    // Fetch cameras with pagination, sorting, and filtering
    const { count, rows } = await Camera.findAndCountAll({
      where: whereCondition,
      offset,
      limit: limitNumber,
      order
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cameras retrieved successfully.',
      totalCameras: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      data: rows
    });

  } catch (error) {
    console.error('Get Cameras Error: ', error);
    next(error);
  }
};

const getCamera = async (req, res, next) => {
  try {
    const { id } = req.params;
    const camera = await Camera.findByPk(id);

    if(!camera) throw new NotFoundError('Camera not found.')

    return res.status(StatusCodes.OK).json({ 
        success: true,
        message: 'Retrieving all cameras.',
        data: camera
    });  
    } catch (error) {
        console.error('Get Camera Error: ', error);
        next(error);
  }
};

const restoreCamera = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const camera = await Camera.findByPk(id, { paranoid: false });
    if (!camera) throw new NotFoundError('Camera not found.');


    await camera.restore();

    await CameraLog.create({
      cameraId: camera.id,
      userId: req.user.id,
      actionType: 'RESTORED',
      description: 'Camera restored'
    });

    return res.status(StatusCodes.OK).json({ 
        success: true,
        message: 'Camera has been restored.',
    });  
  } catch (error) {
    console.error('Restore Camera Error: ', error);
    next(error);
  }
};

const getDeletedCameras = async (req, res, next) => {
  try {
      let { search, page, limit, sortBy, sortOrder } = req.query;

      const whereCondition = {
          deletedAt: { [Op.ne]: null }, // ✅ Fetch only soft-deleted users
      };

      if (search) {
          whereCondition[Op.or] = [
              { name: { [Op.like]: `%${search}%` } },
              { location: { [Op.like]: `%${search}%` } },
              { status: { [Op.like]: `%${search}%` } },
          ];
      }


      // ✅ Pagination
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(limit) || 10;
      const offset = (pageNumber - 1) * limitNumber;

      // ✅ Sorting
      const validSortColumns = ["name", "location", "status", "deletedAt"];
      const validSortOrders = ["asc", "desc"];

      let order = [["deletedAt", "desc"]]; // Default sorting by newest users

      if (sortBy && validSortColumns.includes(sortBy)) {
          const direction = validSortOrders.includes(sortOrder) ? sortOrder : "asc";
          order = [[sortBy, direction]];
      }

      // ✅ Fetch deleted users
      const { count, rows } = await Camera.findAndCountAll({
          where: whereCondition,
          paranoid: false, // ✅ Fetch soft-deleted records
          offset,
          limit: limitNumber,
          order,
      });

      return res.status(StatusCodes.OK).json({
          success: true,
          message: "Deleted cameras retrieved successfully.",
          totalUsers: count,
          totalPages: Math.ceil(count / limitNumber),
          currentPage: pageNumber,
          data: rows,
      });

  } catch (error) {
      console.error("An error occurred: " + error);
      next(error);
  }
};


module.exports = {
  registerCamera,
  updateCamera,
  deleteCamera,
  getCameras,
  getCamera,
  restoreCamera,
  getDeletedCameras
};  