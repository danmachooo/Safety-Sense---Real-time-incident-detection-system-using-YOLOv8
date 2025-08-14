// models/SerialItemDeployment.js
import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const SerialItemDeployment = sequelize.define(
  "SerialItemDeployment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deployment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "deployments",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE", // If deployment is deleted, remove these records
    },
    serialized_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "serialized_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT", // Don't allow deletion of serialized items with deployments
    },
    deployed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: {
          msg: "Must be a valid date",
        },
      },
    },
    returned_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Must be a valid date",
        },
        isAfterDeployment(value) {
          if (value && this.deployed_at && value <= this.deployed_at) {
            throw new Error("Return date must be after deployment date");
          }
        },
      },
    },
    return_condition: {
      type: DataTypes.ENUM("GOOD", "FAIR", "DAMAGED", "LOST"),
      allowNull: true,
      validate: {
        requiredWhenReturned(value) {
          if (this.returned_at && !value) {
            throw new Error(
              "Return condition is required when item is returned"
            );
          }
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "serial_item_deployments",
    // Optimized indexes
    indexes: [
      {
        name: "idx_serial_deployments_deployment",
        fields: ["deployment_id"],
      },
      {
        name: "idx_serial_deployments_item",
        fields: ["serialized_item_id"],
      },
      {
        name: "idx_serial_deployments_unique",
        unique: true,
        fields: ["deployment_id", "serialized_item_id"],
        where: {
          deletedAt: null,
        },
      },
      {
        name: "idx_serial_deployments_active",
        fields: ["deployed_at", "returned_at"],
        where: {
          returned_at: null,
        },
      },
      {
        name: "idx_serial_deployments_condition",
        fields: ["return_condition"],
        where: {
          return_condition: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
      {
        name: "idx_serial_deployments_deleted_at",
        fields: ["deletedAt"],
        where: {
          deletedAt: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
    ],
    hooks: {
      beforeUpdate: (deployment) => {
        // Auto-set returned_at when return_condition is provided
        if (deployment.return_condition && !deployment.returned_at) {
          deployment.returned_at = new Date();
        }
      },
    },
    // Add scopes for common queries
    scopes: {
      active: {
        where: {
          returned_at: null,
        },
      },
      returned: {
        where: {
          returned_at: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
      damaged: {
        where: {
          return_condition: ["DAMAGED", "LOST"],
        },
      },
    },
  }
);

export default SerialItemDeployment;
