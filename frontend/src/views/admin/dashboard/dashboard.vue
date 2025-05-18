<template>
  <div class="dashboard">
    <header class="header">
      <div class="logo">
        <h1>Disaster Management</h1>
      </div>
      <div class="user-info">
        <span class="user-name">Admin User</span>
        <div class="avatar">
          <img
            src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
            alt="User Avatar"
          />
        </div>
      </div>
    </header>

    <div class="dashboard-content">
      <div class="sidebar">
        <nav>
          <ul>
            <li class="active">
              <span class="icon"><i class="fas fa-tachometer-alt"></i></span>
              Dashboard
            </li>
            <li>
              <span class="icon"><i class="fas fa-fire"></i></span> Incidents
            </li>
            <li>
              <span class="icon"><i class="fas fa-users"></i></span> Users
            </li>
            <li>
              <span class="icon"><i class="fas fa-box"></i></span> Inventory
            </li>
            <li>
              <span class="icon"><i class="fas fa-truck"></i></span> Deployments
            </li>
            <li>
              <span class="icon"><i class="fas fa-cog"></i></span> Settings
            </li>
          </ul>
        </nav>
      </div>

      <main class="main-content">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon incidents">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="stat-details">
              <h3>Total Incidents</h3>
              <p class="stat-value">
                {{ dashboardData.dashboardSummary.data.counts.totalIncidents }}
              </p>
              <p class="stat-label">
                {{
                  dashboardData.dashboardSummary.data.counts.activeIncidents
                }}
                active
              </p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon users">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-details">
              <h3>Total Users</h3>
              <p class="stat-value">
                {{ dashboardData.dashboardSummary.data.counts.totalUsers }}
              </p>
              <p class="stat-label">
                {{
                  dashboardData.dashboardSummary.data.counts.totalRescuers
                }}
                rescuers
              </p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon inventory">
              <i class="fas fa-box"></i>
            </div>
            <div class="stat-details">
              <h3>Inventory Items</h3>
              <p class="stat-value">
                {{
                  dashboardData.dashboardSummary.data.counts.totalInventoryItems
                }}
              </p>
              <p class="stat-label">
                {{ dashboardData.inventoryStats.data.lowStockItems }} low stock
              </p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon deployments">
              <i class="fas fa-truck"></i>
            </div>
            <div class="stat-details">
              <h3>Active Deployments</h3>
              <p class="stat-value">
                {{
                  dashboardData.dashboardSummary.data.counts.activeDeployments
                }}
              </p>
              <p class="stat-label">
                {{ dashboardData.deploymentStats.data.totalDeployments }} total
              </p>
            </div>
          </div>
        </div>

        <div class="charts-section">
          <div class="chart-container">
            <h2>Incidents by Type</h2>
            <canvas ref="incidentsByTypeChart"></canvas>
          </div>
          <div class="chart-container">
            <h2>Incidents by Status</h2>
            <canvas ref="incidentsByStatusChart"></canvas>
          </div>
          <div class="chart-container">
            <h2>Incidents by Day</h2>
            <canvas ref="incidentsByDayChart"></canvas>
          </div>
          <div class="chart-container">
            <h2>Deployments by Type</h2>
            <canvas ref="deploymentsByTypeChart"></canvas>
          </div>
        </div>

        <div class="map-section">
          <h2>Incident Map</h2>
          <div ref="mapContainer" class="map-container"></div>
        </div>

        <div class="tables-section">
          <div class="table-container">
            <h2>Recent Incidents</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="incident in dashboardData.dashboardSummary.data
                    .recentIncidents"
                  :key="incident.id"
                >
                  <td>#{{ incident.id }}</td>
                  <td>
                    <span :class="`incident-type ${incident.type}`">{{
                      incident.type
                    }}</span>
                  </td>
                  <td>
                    <span :class="`incident-status ${incident.status}`">{{
                      incident.status
                    }}</span>
                  </td>
                  <td>{{ formatDate(incident.createdAt) }}</td>
                  <td>
                    {{ incident.camera ? incident.camera.location : "N/A" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-container">
            <h2>Low Stock Items</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>In Stock</th>
                  <th>Min Level</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in dashboardData.dashboardSummary.data
                    .lowStockItems"
                  :key="item.id"
                >
                  <td>#{{ item.id }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.category.name }}</td>
                  <td>{{ item.quantity_in_stock }}</td>
                  <td>{{ item.min_stock_level }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="activity-feed">
          <h2>Activity Feed</h2>
          <div class="feed-items">
            <div
              v-for="(activity, index) in dashboardData.activityFeed.data"
              :key="index"
              class="feed-item"
            >
              <div class="feed-icon" :class="activity.type">
                <i :class="getActivityIcon(activity.type)"></i>
              </div>
              <div class="feed-content">
                <p class="feed-title">{{ getActivityTitle(activity) }}</p>
                <p class="feed-time">{{ formatDate(activity.timestamp) }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import Chart from "chart.js/auto";

export default {
  name: "DisasterManagementDashboard",
  setup() {
    const incidentsByTypeChart = ref(null);
    const incidentsByStatusChart = ref(null);
    const incidentsByDayChart = ref(null);
    const deploymentsByTypeChart = ref(null);
    const mapContainer = ref(null);
    let map = null;
    let markers = [];

    // Mock data from the provided JSON
    const dashboardData = {
      dashboardSummary: {
        success: true,
        message: "Dashboard summary retrieved successfully",
        data: {
          counts: {
            totalIncidents: 150,
            activeIncidents: 45,
            totalUsers: 200,
            totalRescuers: 50,
            totalInventoryItems: 300,
            activeDeployments: 20,
          },
          recentIncidents: [
            {
              id: 1,
              type: "fire",
              status: "ongoing",
              createdAt: "2025-05-03T10:00:00Z",
              camera: {
                id: 101,
                name: "Camera-01",
                location: "Downtown",
              },
              accepters: [
                {
                  id: 201,
                  firstname: "John",
                  lastname: "Doe",
                  IncidentAcceptance: { acceptedAt: "2025-05-03T10:05:00Z" },
                },
              ],
            },
            {
              id: 2,
              type: "flood",
              status: "pending",
              createdAt: "2025-05-02T15:30:00Z",
              camera: null,
              accepters: [],
            },
          ],
          incidentsByType: [
            { type: "fire", count: 60 },
            { type: "flood", count: 45 },
          ],
          incidentsByStatus: [
            { status: "pending", count: 20 },
            { status: "ongoing", count: 25 },
          ],
          lowStockItems: [
            {
              id: 301,
              name: "First Aid Kit",
              quantity_in_stock: 5,
              min_stock_level: 10,
              category: { id: 401, name: "Medical" },
            },
          ],
          recentDeployments: [
            {
              id: 501,
              deployment_type: "emergency",
              status: "DEPLOYED",
              deployment_date: "2025-05-03T08:00:00Z",
              inventoryDeploymentItem: { id: 302, name: "Water Pump" },
              deployer: { id: 202, firstname: "Jane", lastname: "Smith" },
            },
          ],
        },
      },
      incidentStats: {
        success: true,
        message: "Incident statistics retrieved successfully",
        data: {
          incidentsByDay: [
            { date: "2025-05-01", count: 10 },
            { date: "2025-05-02", count: 15 },
          ],
          incidentsByType: [
            { type: "fire", count: 30 },
            { type: "flood", count: 20 },
          ],
          incidentsByStatus: [
            { status: "pending", count: 15 },
            { status: "resolved", count: 10 },
          ],
          incidentsBySource: [
            { source: "camera-detected", count: 40 },
            { source: "user-reported", count: 30 },
          ],
          avgResolutionTime: 4.5,
          timeframe: "month",
          totalIncidents: 70,
        },
      },
      inventoryStats: {
        success: true,
        message: "Inventory statistics retrieved successfully",
        data: {
          itemsByCategory: [
            { categoryName: "Medical", itemCount: 100, totalQuantity: 500 },
            { categoryName: "Equipment", itemCount: 50, totalQuantity: 200 },
          ],
          lowStockItems: 15,
          itemsByCondition: [
            { condition: "new", count: 200 },
            { condition: "used", count: 100 },
          ],
          maintenanceItems: 10,
          expiringBatches: 5,
          totalValue: 15000.75,
          totalItems: 300,
        },
      },
      deploymentStats: {
        success: true,
        message: "Deployment statistics retrieved successfully",
        data: {
          deploymentsByDay: [
            { date: "2025-05-01", count: 5 },
            { date: "2025-05-02", count: 8 },
          ],
          deploymentsByType: [
            { deployment_type: "emergency", count: 15 },
            { deployment_type: "routine", count: 10 },
          ],
          deploymentsByStatus: [
            { status: "DEPLOYED", count: 20 },
            { status: "COMPLETED", count: 5 },
          ],
          topLocations: [
            { location: "Downtown", count: 10 },
            { location: "Suburbs", count: 8 },
          ],
          topDeployers: [
            { id: 202, name: "Jane Smith", deploymentCount: 12 },
            { id: 203, name: "Mike Johnson", deploymentCount: 10 },
          ],
          timeframe: "month",
          totalDeployments: 25,
        },
      },
      userActivityStats: {
        success: true,
        message: "User activity statistics retrieved successfully",
        data: {
          topResponders: [
            { id: 201, name: "John Doe", acceptedCount: 15 },
            { id: 202, name: "Jane Smith", acceptedCount: 12 },
          ],
          newUsers: 30,
          activeUsers: 50,
          acceptanceRate: 75.5,
          avgResponseTime: 10.25,
          timeframe: "month",
          totalUsers: 200,
        },
      },
      activityFeed: {
        success: true,
        message: "Activity feed retrieved successfully",
        data: [
          {
            type: "incident",
            id: 1,
            incidentType: "fire",
            status: "ongoing",
            timestamp: "2025-05-03T10:00:00Z",
          },
          {
            type: "acceptance",
            incidentId: 1,
            incidentType: "fire",
            user: { id: 201, firstname: "John", lastname: "Doe" },
            timestamp: "2025-05-03T10:05:00Z",
          },
          {
            type: "deployment",
            id: 501,
            deployment_type: "emergency",
            status: "DEPLOYED",
            deployer: { id: 202, firstname: "Jane", lastname: "Smith" },
            inventoryItem: { id: 302, name: "Water Pump" },
            timestamp: "2025-05-03T08:00:00Z",
          },
        ],
      },
      mapData: {
        success: true,
        message: "Map data retrieved successfully",
        data: {
          incidents: [
            {
              id: 1,
              type: "fire",
              status: "ongoing",
              longitude: -122.4194,
              latitude: 37.7749,
              createdAt: "2025-05-03T10:00:00Z",
              snapshotUrl: "http://example.com/snapshot1.jpg",
              description: "Fire in downtown area",
              camera: { id: 101, name: "Camera-01", location: "Downtown" },
            },
          ],
          cameras: [
            {
              id: 101,
              name: "Camera-01",
              location: "Downtown",
              status: "active",
              longitude: -122.4194,
              latitude: 37.7749,
            },
          ],
          deployments: [
            {
              id: 501,
              deployment_type: "emergency",
              status: "DEPLOYED",
              deployment_location: "Downtown",
              deployment_date: "2025-05-03T08:00:00Z",
              inventoryDeploymentItem: { id: 302, name: "Water Pump" },
            },
          ],
          timeframe: "day",
        },
      },
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const getActivityIcon = (type) => {
      switch (type) {
        case "incident":
          return "fas fa-exclamation-triangle";
        case "acceptance":
          return "fas fa-check-circle";
        case "deployment":
          return "fas fa-truck";
        default:
          return "fas fa-info-circle";
      }
    };

    const getActivityTitle = (activity) => {
      switch (activity.type) {
        case "incident":
          return `New ${activity.incidentType} incident reported (ID: ${activity.id})`;
        case "acceptance":
          return `${activity.user.firstname} ${activity.user.lastname} accepted ${activity.incidentType} incident`;
        case "deployment":
          return `${activity.deployer.firstname} ${activity.deployer.lastname} deployed ${activity.inventoryItem.name}`;
        default:
          return "Activity recorded";
      }
    };

    const initCharts = () => {
      // Incidents by Type Chart
      new Chart(incidentsByTypeChart.value, {
        type: "doughnut",
        data: {
          labels: dashboardData.incidentStats.data.incidentsByType.map(
            (item) => item.type
          ),
          datasets: [
            {
              data: dashboardData.incidentStats.data.incidentsByType.map(
                (item) => item.count
              ),
              backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
            },
            title: {
              display: false,
            },
          },
        },
      });

      // Incidents by Status Chart
      new Chart(incidentsByStatusChart.value, {
        type: "pie",
        data: {
          labels: dashboardData.incidentStats.data.incidentsByStatus.map(
            (item) => item.status
          ),
          datasets: [
            {
              data: dashboardData.incidentStats.data.incidentsByStatus.map(
                (item) => item.count
              ),
              backgroundColor: ["#FF9F40", "#4BC0C0", "#36A2EB"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
            },
            title: {
              display: false,
            },
          },
        },
      });

      // Incidents by Day Chart
      new Chart(incidentsByDayChart.value, {
        type: "line",
        data: {
          labels: dashboardData.incidentStats.data.incidentsByDay.map(
            (item) => {
              const date = new Date(item.date);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }
          ),
          datasets: [
            {
              label: "Incidents",
              data: dashboardData.incidentStats.data.incidentsByDay.map(
                (item) => item.count
              ),
              fill: false,
              borderColor: "#4BC0C0",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });

      // Deployments by Type Chart
      new Chart(deploymentsByTypeChart.value, {
        type: "bar",
        data: {
          labels: dashboardData.deploymentStats.data.deploymentsByType.map(
            (item) => item.deployment_type
          ),
          datasets: [
            {
              label: "Deployments",
              data: dashboardData.deploymentStats.data.deploymentsByType.map(
                (item) => item.count
              ),
              backgroundColor: ["#36A2EB", "#FF6384"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    };

    const initMap = () => {
      // Initialize Google Maps
      if (window.google && window.google.maps) {
        // Center map on the first incident
        const firstIncident = dashboardData.mapData.data.incidents[0];
        const mapCenter = {
          lat: firstIncident.latitude,
          lng: firstIncident.longitude,
        };

        map = new window.google.maps.Map(mapContainer.value, {
          center: mapCenter,
          zoom: 12,
          styles: [
            {
              featureType: "administrative",
              elementType: "geometry",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "transit",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        // Add markers for incidents
        dashboardData.mapData.data.incidents.forEach((incident) => {
          const marker = new window.google.maps.Marker({
            position: { lat: incident.latitude, lng: incident.longitude },
            map: map,
            title: `${incident.type} incident`,
            icon: {
              url:
                incident.type === "fire"
                  ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  : "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
                <div class="info-window">
                  <h3>${incident.type.toUpperCase()} Incident #${
              incident.id
            }</h3>
                  <p>Status: ${incident.status}</p>
                  <p>Location: ${
                    incident.camera ? incident.camera.location : "Unknown"
                  }</p>
                  <p>Reported: ${formatDate(incident.createdAt)}</p>
                </div>
              `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          markers.push(marker);
        });

        // Add markers for cameras
        dashboardData.mapData.data.cameras.forEach((camera) => {
          const marker = new window.google.maps.Marker({
            position: { lat: camera.latitude, lng: camera.longitude },
            map: map,
            title: camera.name,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
                <div class="info-window">
                  <h3>Camera: ${camera.name}</h3>
                  <p>Location: ${camera.location}</p>
                  <p>Status: ${camera.status}</p>
                </div>
              `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          markers.push(marker);
        });
      } else {
        console.error("Google Maps API not loaded");
      }
    };

    const loadGoogleMapsScript = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap`;
      script.async = true;
      script.defer = true;

      // Define the callback function globally
      window.initMap = initMap;

      document.head.appendChild(script);
    };

    onMounted(() => {
      initCharts();
      loadGoogleMapsScript();

      // Load Font Awesome
      const fontAwesome = document.createElement("link");
      fontAwesome.rel = "stylesheet";
      fontAwesome.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
      document.head.appendChild(fontAwesome);
    });

    return {
      incidentsByTypeChart,
      incidentsByStatusChart,
      incidentsByDayChart,
      deploymentsByTypeChart,
      mapContainer,
      dashboardData,
      formatDate,
      getActivityIcon,
      getActivityTitle,
    };
  },
};
</script>

<style>
/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

body {
  background-color: #f5f7fa;
  color: #333;
}

.dashboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header Styles */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 70px;
}

.logo h1 {
  font-size: 1.5rem;
  color: #2c3e50;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-weight: 500;
}

.avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

/* Dashboard Content */
.dashboard-content {
  display: flex;
  flex: 1;
}

/* Sidebar Styles */
.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 1.5rem 0;
}

.sidebar nav ul {
  list-style: none;
}

.sidebar nav ul li {
  padding: 0.75rem 1.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.3s;
}

.sidebar nav ul li:hover {
  background-color: #34495e;
}

.sidebar nav ul li.active {
  background-color: #3498db;
  border-left: 4px solid #2980b9;
}

.sidebar .icon {
  margin-right: 0.75rem;
  width: 20px;
  text-align: center;
}

/* Main Content Styles */
.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.5rem;
}

.stat-icon.incidents {
  background-color: #ff6b6b;
  color: #fff;
}

.stat-icon.users {
  background-color: #48dbfb;
  color: #fff;
}

.stat-icon.inventory {
  background-color: #feca57;
  color: #fff;
}

.stat-icon.deployments {
  background-color: #1dd1a1;
  color: #fff;
}

.stat-details {
  flex: 1;
}

.stat-details h3 {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #7f8c8d;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-container h2 {
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

/* Map Section */
.map-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.map-section h2 {
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.map-container {
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
}

/* Tables Section */
.tables-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.table-container {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.table-container h2 {
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th,
table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

table th {
  font-weight: 600;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.incident-type,
.incident-status {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.incident-type.fire {
  background-color: #ffeceb;
  color: #e74c3c;
}

.incident-type.flood {
  background-color: #e3f2fd;
  color: #2196f3;
}

.incident-status.ongoing {
  background-color: #fff8e1;
  color: #ffa000;
}

.incident-status.pending {
  background-color: #e8f5e9;
  color: #4caf50;
}

/* Activity Feed */
.activity-feed {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.activity-feed h2 {
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.feed-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feed-item {
  display: flex;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.feed-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1rem;
}

.feed-icon.incident {
  background-color: #ff6b6b;
  color: #fff;
}

.feed-icon.acceptance {
  background-color: #1dd1a1;
  color: #fff;
}

.feed-icon.deployment {
  background-color: #feca57;
  color: #fff;
}

.feed-content {
  flex: 1;
}

.feed-title {
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.feed-time {
  font-size: 0.8rem;
  color: #7f8c8d;
}

/* Responsive Adjustments */
@media (max-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .tables-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    padding: 1rem 0;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }
}

/* Info Window Styles for Google Maps */
.info-window {
  padding: 0.5rem;
}

.info-window h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.info-window p {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  color: #7f8c8d;
}
</style>
