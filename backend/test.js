import models from "./models/index.js";

const { SerialItemDeployment, SerializedItem, User, Deployment } = models;

async function getItemDeploymentHistory(serialNumber) {
  try {
    const item = await SerializedItem.findOne({
      where: { serial_number: serialNumber },
      attributes: ["id", "serial_number", "status", "condition_notes"],
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: ["id", "name", "description"],
        },
        {
          model: SerialItemDeployment,
          as: "deploymentHistory",
          attributes: ["deployed_at", "returned_at", "return_condition"],
          include: [
            {
              model: Deployment,
              as: "deployment",
              attributes: [
                "id",
                "deployment_type",
                "deployment_date",
                "expected_return_date",
                "actual_return_date",
              ],
              include: [
                {
                  model: User,
                  as: "recipient",
                  attributes: ["id", "name", "email"],
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      order: [
        [
          { model: SerialItemDeployment, as: "deploymentHistory" },
          "deployed_at",
          "DESC",
        ],
      ],
    });

    if (!item) {
      throw new Error("Item not found");
    }

    return item;
  } catch (error) {
    console.error("Error fetching deployment history:", error);
    throw error;
  }
}

// Usage example
const serialNumber = "SUP-SAM20250814082137-250814-001";

getItemDeploymentHistory(serialNumber)
  .then((result) => {
    console.log("Item Details:");
    console.log(`Serial Number: ${result.serial_number}`);
    console.log(`Item Name: ${result.item.name}`);
    console.log(`Current Status: ${result.status}`);

    console.log("\nDeployment History:");
    result.deploymentHistory.forEach((deployment) => {
      const borrower = deployment.deployment.recipient;
      console.log("\n--------------------------------");
      console.log(`Deployment Date: ${deployment.deployed_at}`);
      console.log(`Borrower: ${borrower.name} (${borrower.email})`);
      console.log(`Deployment Type: ${deployment.deployment.deployment_type}`);

      if (deployment.returned_at) {
        console.log(`Returned At: ${deployment.returned_at}`);
        console.log(`Return Condition: ${deployment.return_condition}`);
      } else {
        console.log("Status: Currently Deployed");
      }
    });
  })
  .catch((error) => console.error(error));
