// models/SerializedItem.js
import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const SerializedItem = sequelize.define(
  "SerializedItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serial_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        name: "unique_serial_number",
        msg: "Serial number must be unique",
      },
      validate: {
        notEmpty: {
          msg: "Serial number cannot be empty",
        },
        len: {
          args: [5, 100],
          msg: "Serial number must be between 5 and 100 characters",
        },
        // Custom validation for serial number format
        isValidFormat(value) {
          const pattern = /^[A-Z]{2,4}-\d+-\d{6}-\d+$/;
          if (!pattern.test(value)) {
            throw new Error(
              "Serial number must follow format: [CategoryCode]-[BatchNumber]-[YYMMDD]-[Sequence]"
            );
          }
        },
      },
      comment:
        "Unique serial number format: [CategoryCode]-[BatchNumber]-[YYMMDD]-[Sequence]",
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "batches",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "inventory_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    status: {
      type: DataTypes.ENUM(
        "AVAILABLE",
        "DEPLOYED",
        "MAINTENANCE",
        "LOST",
        "DAMAGED",
        "RETIRED"
      ),
      defaultValue: "AVAILABLE",
      allowNull: false,
    },
    // REMOVED REDUNDANT DEPLOYMENT FIELDS:
    // - deployed_to (tracked in SerialItemDeployment)
    // - deployed_date (tracked in SerialItemDeployment.deployed_at)
    // - return_date (tracked in SerialItemDeployment.returned_at)

    condition_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "General condition notes for the item",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    last_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Must be a valid date",
        },
      },
    },
    next_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Must be a valid date",
        },
      },
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "serialized_items",
    // Optimized indexes (removed redundant deployment-related indexes)
    indexes: [
      {
        name: "idx_serialized_items_serial_number",
        unique: true,
        fields: ["serial_number"],
      },
      {
        name: "idx_serialized_items_batch",
        fields: ["batch_id"],
      },
      {
        name: "idx_serialized_items_inventory",
        fields: ["inventory_item_id"],
      },
      {
        name: "idx_serialized_items_status",
        fields: ["status"],
      },
      {
        name: "idx_serialized_items_maintenance",
        fields: ["next_maintenance_date"],
        where: {
          next_maintenance_date: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
      {
        name: "idx_serialized_items_created_by",
        fields: ["created_by"],
      },
      {
        name: "idx_serialized_items_deleted_at",
        fields: ["deletedAt"],
        where: {
          deletedAt: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
    ],
    hooks: {
      beforeValidate: (item) => {
        // Normalize serial number to uppercase
        if (item.serial_number) {
          item.serial_number = item.serial_number.trim().toUpperCase();
        }
      },
    },
    // Add scopes for common queries
    scopes: {
      available: {
        where: {
          status: "AVAILABLE",
        },
      },
      needsMaintenance: {
        where: {
          next_maintenance_date: {
            [sequelize.Sequelize.Op.lte]: new Date(),
          },
        },
      },
      // Use joins to get deployment info instead of storing it redundantly
      withCurrentDeployment: {
        include: [
          {
            model: sequelize.models.SerialItemDeployment,
            as: "currentDeployment",
            where: {
              returned_at: null,
            },
            required: false,
          },
        ],
      },
    },
  }
);

export default SerializedItem;
