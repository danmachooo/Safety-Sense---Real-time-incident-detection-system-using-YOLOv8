<template>
  <div class="min-h-screen bg-slate-50">
    <div
      class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10"
    >
      <div class="px-6 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-orange-600 rounded-xl shadow-sm">
              <AlertTriangle class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                Incident Management
              </h1>
              <p class="text-sm text-gray-600 mt-1 font-medium">
                Monitor, manage, and respond to all reported incidents
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-3"></div>
        </div>
      </div>
    </div>

    <div class="px-6 py-8">
      <div
        v-if="error"
        class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center"
      >
        <AlertCircle class="w-5 h-5 mr-2" />
        {{ error }}
      </div>

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8"
      >
        <div class="flex items-center mb-6">
          <div class="p-2 bg-purple-600 rounded-lg mr-4">
            <Filter class="w-5 h-5 text-white" />
          </div>
          <h2 class="text-xl font-bold text-gray-900">Filter Incidents</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800">
              <Camera class="w-4 h-4 inline mr-2 text-blue-600" />
              Report Source
            </label>
            <select
              v-model="filterSource"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium transition-all duration-200"
            >
              <option value="all">All Sources</option>
              <option value="yolo">Camera (YOLO)</option>
              <option value="human">Human Reported</option>
            </select>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800">
              <Activity class="w-4 h-4 inline mr-2 text-green-600" />
              Status
            </label>
            <select
              v-model="filterStatus"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white font-medium transition-all duration-200"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="ongoing">Ongoing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800">
              <AlertCircle class="w-4 h-4 inline mr-2 text-red-600" />
              Incident Type
            </label>
            <select
              v-model="filterType"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white font-medium transition-all duration-200"
            >
              <option value="all">All Types</option>
              <option value="Fire">Fire</option>
              <option value="Accident">Accident</option>
              <option value="Medical">Medical</option>
              <option value="Crime">Crime</option>
              <option value="Flood">Flood</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800">
              <Search class="w-4 h-4 inline mr-2 text-purple-600" />
              Search
            </label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search incidents..."
              class="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-medium transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 hover:scale-105"
        >
          <div class="flex items-center justify-between mb-4">
            <component
              :is="stat.icon"
              class="w-10 h-10 p-2 rounded-xl"
              :class="stat.iconClass"
            />
            <div class="text-right">
              <div class="text-3xl font-bold text-gray-900">
                {{ stat.value }}
              </div>
            </div>
          </div>
          <p class="text-sm font-semibold text-gray-600">{{ stat.label }}</p>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div class="px-8 py-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="p-2 bg-pink-600 rounded-lg mr-4">
                <List class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-xl font-bold text-gray-900">Incident List</h3>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-500 font-medium">
                <span v-if="isLoading">Loading...</span>
                <span v-else>{{ incidents.length }} incidents found</span>
              </span>
              <button
                @click="fetchIncidents"
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                title="Refresh List"
              >
                <RefreshCw
                  class="w-4 h-4 text-gray-600"
                  :class="{ 'animate-spin': isLoading }"
                />
              </button>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto relative min-h-[200px]">
          <div
            v-if="isLoading"
            class="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"
          >
            <div
              class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"
            ></div>
          </div>

          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Source
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-1/3"
                >
                  Location
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="incident in incidents"
                :key="incident.id"
                class="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                @click="openIncidentDetail(incident)"
              >
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      incident.reportType === 'yolo'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800',
                    ]"
                  >
                    <Camera
                      v-if="incident.reportType === 'yolo'"
                      class="w-3 h-3 mr-1"
                    />
                    <User v-else class="w-3 h-3 mr-1" />
                    {{ incident.reportType === "yolo" ? "Camera" : "Human" }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      getTypeClass(incident.type),
                    ]"
                  >
                    {{ incident.type }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      getStatusClass(incident.status),
                    ]"
                  >
                    {{ capitalizeFirst(incident.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  <div class="flex items-start">
                    <MapPin
                      class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400"
                    />
                    <span
                      class="truncate max-w-[200px] block"
                      :title="getDisplayAddress(incident)"
                    >
                      {{ getDisplayAddress(incident) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ formatDate(incident.createdAt) }}
                </td>
                <td class="px-6 py-4">
                  <button
                    @click.stop="openIncidentDetail(incident)"
                    class="p-2 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                  >
                    <Eye class="w-4 h-4 text-blue-600" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="incidents.length === 0 && !isLoading"
          class="px-8 py-16 text-center"
        >
          <div
            class="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center"
          >
            <AlertCircle class="w-10 h-10 text-gray-400" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            No incidents found
          </h3>
          <p class="text-gray-500">
            Try adjusting your filters to see more results.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="selectedIncident"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click="closeIncidentDetail"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <div
          class="px-8 py-6 border-b flex-shrink-0 transition-colors"
          :class="
            selectedIncident.reportType === 'yolo'
              ? 'bg-blue-600'
              : 'bg-purple-600'
          "
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="p-3 bg-white/20 rounded-xl">
                <Camera
                  v-if="selectedIncident.reportType === 'yolo'"
                  class="w-6 h-6 text-white"
                />
                <User v-else class="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">
                  Incident #{{ selectedIncident.id }}
                </h2>
                <p class="text-white/80 text-sm">
                  {{
                    selectedIncident.reportType === "yolo"
                      ? "Camera Detected (YOLO AI)"
                      : "Human Reported"
                  }}
                </p>
              </div>
            </div>
            <button
              @click="closeIncidentDetail"
              class="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <X class="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="space-y-6">
              <div class="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3
                  class="text-lg font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Info class="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div class="space-y-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Type</span>
                    <span
                      :class="[
                        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                        getTypeClass(selectedIncident.type),
                      ]"
                    >
                      {{ selectedIncident.type }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Status</span>
                    <span
                      :class="[
                        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                        getStatusClass(selectedIncident.status),
                      ]"
                    >
                      {{ capitalizeFirst(selectedIncident.status) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Report Source</span>
                    <span class="font-semibold text-gray-900">
                      {{
                        selectedIncident.reportType === "yolo"
                          ? "Camera (YOLO)"
                          : "Human"
                      }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Created At</span>
                    <span class="font-semibold text-gray-900">
                      {{ formatDate(selectedIncident.createdAt) }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex flex-col"
              >
                <div
                  class="p-4 border-b border-gray-200 flex justify-between items-center bg-white"
                >
                  <h3 class="font-bold text-gray-900 flex items-center">
                    <MapPin class="w-5 h-5 mr-2 text-green-600" />
                    Location
                  </h3>
                  <div class="text-right flex-1 ml-4">
                    <p
                      v-if="isAddressLoading"
                      class="text-sm text-gray-500 animate-pulse"
                    >
                      Loading address...
                    </p>
                    <p
                      v-else
                      class="text-sm font-medium text-gray-900 break-words whitespace-normal"
                    >
                      {{
                        incidentAddress || getDisplayAddress(selectedIncident)
                      }}
                    </p>
                    <p class="text-xs font-mono text-gray-500 mt-1">
                      {{ selectedIncident.latitude }},
                      {{ selectedIncident.longitude }}
                    </p>
                  </div>
                </div>
                <div class="h-64 w-full bg-gray-200 relative">
                  <iframe
                    title="Incident Location Map"
                    width="100%"
                    height="100%"
                    frameborder="0"
                    scrolling="no"
                    marginheight="0"
                    marginwidth="0"
                    :src="mapUrl"
                    class="absolute inset-0 grayscale-[20%]"
                  ></iframe>
                </div>
              </div>

              <div
                v-if="selectedIncident.description"
                class="bg-gray-50 rounded-xl p-6 border border-gray-100"
              >
                <h3
                  class="text-lg font-bold text-gray-900 mb-4 flex items-center"
                >
                  <FileText class="w-5 h-5 mr-2 text-purple-600" />
                  Description
                </h3>

                <p class="text-gray-700 leading-relaxed whitespace-pre-line">
                  {{ getParsedDescription(selectedIncident.description).text }}
                </p>

                <div
                  v-if="
                    getParsedDescription(selectedIncident.description).reason
                  "
                  class="mt-4 pt-4 border-t border-red-200"
                >
                  <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                    <span
                      class="block text-xs font-bold text-red-800 uppercase tracking-wide mb-1"
                    >
                      Dismissal Reason
                    </span>
                    <p class="text-sm text-red-700 font-medium">
                      {{
                        getParsedDescription(selectedIncident.description)
                          .reason
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div
                v-if="
                  selectedIncident.reportType === 'yolo' &&
                  selectedIncident.yoloData
                "
                class="space-y-6"
              >
                <div class="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3
                    class="text-lg font-bold text-gray-900 mb-4 flex items-center"
                  >
                    <Cpu class="w-5 h-5 mr-2 text-blue-600" />
                    AI Detection Details
                  </h3>
                  <div class="space-y-4">
                    <div class="flex justify-between">
                      <span class="text-gray-600">AI Type</span>
                      <span class="font-semibold text-gray-900 capitalize">
                        {{ selectedIncident.yoloData.aiType.replace("_", " ") }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Confidence</span>
                      <div class="flex items-center space-x-2">
                        <div class="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            class="bg-blue-600 h-2 rounded-full"
                            :style="{
                              width: `${
                                selectedIncident.yoloData.confidence * 100
                              }%`,
                            }"
                          ></div>
                        </div>
                        <span class="font-semibold text-gray-900">
                          {{
                            (
                              selectedIncident.yoloData.confidence * 100
                            ).toFixed(1)
                          }}%
                        </span>
                      </div>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Camera ID</span>
                      <span class="font-semibold text-gray-900">
                        {{ selectedIncident.yoloData.cameraId || "N/A" }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="
                  selectedIncident.reportType === 'human' &&
                  selectedIncident.humanData
                "
                class="space-y-6"
              >
                <div
                  class="bg-purple-50 rounded-xl p-6 border border-purple-100"
                >
                  <h3
                    class="text-lg font-bold text-gray-900 mb-4 flex items-center"
                  >
                    <User class="w-5 h-5 mr-2 text-purple-600" />
                    Reporter Information
                  </h3>
                  <div class="space-y-4">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Reported By</span>
                      <span class="font-semibold text-gray-900">
                        {{ selectedIncident.humanData.reportedBy }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Contact</span>
                      <span class="font-semibold text-gray-900">
                        {{ selectedIncident.humanData.contact || "N/A" }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">IP Address</span>
                      <div class="flex items-center space-x-2">
                        <span class="font-mono text-gray-900">
                          {{ selectedIncident.humanData.ipAddress || "N/A" }}
                        </span>
                        <button
                          v-if="
                            selectedIncident.humanData.ipAddress &&
                            selectedIncident.status !== 'dismissed'
                          "
                          @click="
                            openPenalizeModal(
                              selectedIncident.humanData.ipAddress
                            )
                          "
                          class="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Penalize this Reporter"
                        >
                          <Ban class="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="selectedIncident.status === 'pending'"
                  class="bg-yellow-50 rounded-xl p-6 border border-yellow-200"
                >
                  <h3
                    class="text-lg font-bold text-yellow-800 mb-2 flex items-center"
                  >
                    <AlertTriangle class="w-5 h-5 mr-2" />
                    Abuse Detection
                  </h3>
                  <p class="text-yellow-700 text-sm mb-4">
                    If this incident appears to be spam or abuse, you can
                    penalize the reporter to prevent future spam.
                  </p>
                  <button
                    @click="
                      openPenalizeModal(selectedIncident.humanData.ipAddress)
                    "
                    class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    <Ban class="w-4 h-4 mr-2" />
                    Penalize Reporter & Dismiss
                  </button>
                </div>
              </div>

              <div
                v-if="selectedIncident.snapshotUrl"
                class="bg-gray-50 rounded-xl p-6 border border-gray-100"
              >
                <h3
                  class="text-lg font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Image class="w-5 h-5 mr-2 text-gray-600" />
                  Incident Snapshot
                </h3>
                <img
                  :src="selectedIncident.snapshotUrl"
                  alt="Incident snapshot"
                  class="w-full rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-8 py-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0"
        >
          <div class="text-sm text-gray-600">
            Last updated: {{ formatDate(selectedIncident.updatedAt) }}
          </div>
          <div class="flex space-x-3">
            <button
              @click="closeIncidentDetail"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              Close
            </button>

            <button
              v-if="selectedIncident.status === 'pending'"
              @click.stop="openDismissModal"
              class="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors duration-200"
            >
              <X class="w-4 h-4 inline mr-2" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showDismissModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style="z-index: 100"
      @click="showDismissModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        @click.stop
      >
        <div class="text-center">
          <div
            class="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <FileText class="w-8 h-8 text-red-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Dismiss Incident</h3>
          <p class="text-gray-600 mb-6">
            Please provide a reason for dismissing this incident. This will be
            logged in the system.
          </p>

          <div class="mb-6 text-left">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Dismissal <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="dismissReason"
              rows="3"
              placeholder="e.g., Duplicate report, False alarm, Test data..."
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>

          <div class="flex space-x-3 justify-center">
            <button
              @click="showDismissModal = false"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex-1"
            >
              Cancel
            </button>
            <button
              @click="confirmDismiss"
              :disabled="!dismissReason.trim()"
              class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showPenalizeModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style="z-index: 100"
      @click="showPenalizeModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        @click.stop
      >
        <div class="text-center">
          <div
            class="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <Ban class="w-8 h-8 text-red-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            Penalize & Dismiss?
          </h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to penalize
            <span class="font-mono font-bold">{{ ipToPenalize }}</span
            >? This will record an offense against the IP and dismiss the
            current incident.
          </p>

          <div class="mb-6 text-left">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Penalizing
            </label>
            <textarea
              v-model="dismissReason"
              rows="2"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>

          <div class="flex space-x-3 justify-center">
            <button
              @click="showPenalizeModal = false"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex-1"
            >
              Cancel
            </button>
            <button
              @click="confirmPenalizeAndDismiss"
              :disabled="!dismissReason.trim()"
              class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex-1 disabled:opacity-50"
            >
              Confirm Penalize
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="notification.show"
      class="fixed top-6 right-6 z-[9999] animate-slide-in"
    >
      <div
        :class="[
          'flex items-center p-4 rounded-xl shadow-lg backdrop-blur-sm border transform transition-all duration-300',
          notification.type === 'success'
            ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200'
            : notification.type === 'warning'
            ? 'bg-amber-50/90 text-amber-800 border-amber-200'
            : 'bg-red-50/90 text-red-800 border-red-200',
        ]"
      >
        <component
          :is="
            notification.type === 'success'
              ? CheckCircle
              : notification.type === 'warning'
              ? AlertTriangle
              : AlertCircle
          "
          class="w-5 h-5 mr-3"
        />
        <span class="text-sm font-medium">{{ notification.message }}</span>
        <button
          @click="notification.show = false"
          class="ml-4 hover:opacity-70 transition-opacity"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";
import {
  AlertTriangle,
  AlertCircle,
  Camera,
  User,
  Filter,
  Activity,
  Search,
  List,
  Eye,
  MapPin,
  X,
  Info,
  FileText,
  Cpu,
  Image,
  Box,
  Ban,
  Check,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/authStore";
import { storeToRefs } from "pinia";
import api from "../utils/axios";
// --- CONFIGURATION ---

const authStore = useAuthStore();
const { authUser } = storeToRefs(authStore);

const CURRENT_USER_ID = authUser.value.id;
console.log("CURRENT LOGGED IN: ", CURRENT_USER_ID);

// --- STATE ---
const incidents = ref([]);
const isLoading = ref(false);
const showDismissModal = ref(false);
const dismissReason = ref("");
const error = ref(null);

// Geocoding State
const incidentAddress = ref("");
const isAddressLoading = ref(false);
const tableAddresses = ref({}); // Cache for table display

// Filter States
const filterSource = ref("all");
const filterStatus = ref("all");
const filterType = ref("all");
const searchQuery = ref("");
let searchDebounceTimeout = null;

// Modal States
const selectedIncident = ref(null);
const showPenalizeModal = ref(false);
const ipToPenalize = ref("");

// Notification State
const notification = ref({
  show: false,
  message: "",
  type: "success",
});

// --- API ACTIONS ---

const transformIncidentData = (data) => {
  return {
    ...data,
    snapshotUrl: data.snapshotSignedUrls?.main || data.snapshotUrl,
    yoloData: data.yoloDetails
      ? {
          ...data.yoloDetails,
          detectionFrameUrl: data.snapshotSignedUrls?.ai,
        }
      : null,
    humanData: data.humanDetails,
  };
};

const fetchIncidents = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const params = {};
    if (filterSource.value === "yolo") params.source = "camera";
    else if (filterSource.value === "human") params.source = "citizen";

    if (filterStatus.value !== "all") params.status = filterStatus.value;
    if (filterType.value !== "all") params.type = filterType.value;
    if (searchQuery.value) params.search = searchQuery.value;

    params.sortBy = "createdAt";
    params.sortOrder = "desc";

    const response = await api.get("/incidents/", { params });

    if (response.data && response.data.success) {
      incidents.value = response.data.data.map(transformIncidentData);
      processAddressQueue(incidents.value); // Start background fetch for missing addresses
    } else {
      incidents.value = [];
    }
  } catch (err) {
    console.error("Failed to fetch incidents:", err);
    error.value = "Failed to load incidents. Please check connection.";
  } finally {
    isLoading.value = false;
  }
};

// 1. Function: Dismissing an Incident Report
const executeDismissal = async (id, reason) => {
  try {
    // Calls your backend: router.post("/:id/global-dismiss", ...)
    await api.post(`incidents/${id}/global-dismiss`, {
      userId: CURRENT_USER_ID,
      reason: reason || "Dismissed via Dashboard",
    });

    showNotification(`Incident #${id} has been dismissed`, "success");

    // Close modals
    showDismissModal.value = false;
    showPenalizeModal.value = false;
    closeIncidentDetail();

    // Refresh list
    fetchIncidents();
  } catch (err) {
    console.error("Failed to dismiss:", err);
    showNotification("Failed to dismiss incident", "error");
    throw err;
  }
};

// 2. Function: Penalize IP (Helper)
const executePenalize = async (ip) => {
  try {
    const response = await api.post("/incidents/penalize-reporter", { ip });
    return response.data;
  } catch (err) {
    console.error("Failed to penalize IP:", err);
    throw new Error("Failed to penalize the reporter.");
  }
};

const openDismissModal = () => {
  dismissReason.value = ""; // Reset reason
  showDismissModal.value = true;
};

// Confirms the action from the modal
const confirmDismiss = () => {
  if (!selectedIncident.value) return;

  // validation (optional: ensure reason isn't empty)
  if (!dismissReason.value.trim()) {
    showNotification("Please provide a reason for dismissal", "warning");
    return;
  }

  executeDismissal(selectedIncident.value.id, dismissReason.value);
};

// --- SMART REVERSE GEOCODING QUEUE ---
const processAddressQueue = (incidentList) => {
  // Filter items that need geocoding:
  // 1. Don't have a camera location name
  // 2. Haven't been cached yet
  const queue = incidentList.filter((incident) => {
    const hasCameraLocation = incident.yoloData?.camera?.location;
    const isCached = tableAddresses.value[incident.id];
    return !hasCameraLocation && !isCached;
  });

  // Process queue with 1s delay to respect OpenStreetMap rate limits
  let delay = 0;
  queue.forEach((incident) => {
    setTimeout(() => {
      axios
        .get(`https://nominatim.openstreetmap.org/reverse`, {
          params: {
            lat: incident.latitude,
            lon: incident.longitude,
            format: "json",
          },
        })
        .then((response) => {
          if (response.data && response.data.display_name) {
            // Store shortened address in cache
            const shortName =
              response.data.address?.road ||
              response.data.address?.suburb ||
              response.data.display_name.split(",")[0];
            tableAddresses.value[incident.id] = shortName || "Unknown Location";
          }
        })
        .catch(() => {
          tableAddresses.value[incident.id] = "Loc. Unavailable";
        });
    }, delay);
    delay += 1200; // 1.2 second interval
  });
};

// --- HELPER: Parse Description to separate Dismissal Reason ---
const getParsedDescription = (fullDescription) => {
  if (!fullDescription) return { text: "", reason: null };

  const separator = "Dismissal Reason:";

  // Check if the specific separator exists
  if (fullDescription.includes(separator)) {
    // Split the string into parts
    const parts = fullDescription.split(separator);

    // The last part is the reason
    const reason = parts.pop().trim();

    // Join the remaining parts (in case user typed "Dismissal Reason:" themselves) to form the main text
    const text = parts.join(separator).trim();

    return { text, reason };
  }

  // Return original text if no reason found
  return { text: fullDescription, reason: null };
};

// --- HELPERS ---
const getDisplayAddress = (incident) => {
  // 1. Prefer Camera Location Name (Fastest)
  if (incident.yoloData?.camera?.location) {
    return incident.yoloData.camera.location;
  }
  // 2. Check Cache (From Queue)
  if (tableAddresses.value[incident.id]) {
    return tableAddresses.value[incident.id];
  }
  // 3. Fallback to Coordinates
  return `${parseFloat(incident.latitude).toFixed(4)}, ${parseFloat(
    incident.longitude
  ).toFixed(4)}`;
};

const fetchAddressForModal = async (lat, lon) => {
  isAddressLoading.value = true;
  incidentAddress.value = "";
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: { lat, lon, format: "json" },
      }
    );
    if (response.data && response.data.display_name) {
      incidentAddress.value = response.data.display_name;
    } else {
      incidentAddress.value = "Address not found";
    }
  } catch (e) {
    incidentAddress.value = "Address unavailable";
  } finally {
    isAddressLoading.value = false;
  }
};

// --- COMPUTED ---

const stats = computed(() => [
  {
    label: "Total Incidents",
    value: incidents.value.length,
    icon: AlertCircle,
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    label: "Pending",
    value: incidents.value.filter((i) => i.status === "pending").length,
    icon: Clock,
    iconClass: "bg-yellow-100 text-yellow-600",
  },
  {
    label: "Ongoing",
    value: incidents.value.filter((i) => i.status === "ongoing").length,
    icon: Activity,
    iconClass: "bg-orange-100 text-orange-600",
  },
  {
    label: "Resolved",
    value: incidents.value.filter((i) => i.status === "resolved").length,
    icon: CheckCircle,
    iconClass: "bg-green-100 text-green-600",
  },
  {
    label: "Camera Detected",
    value: incidents.value.filter((i) => i.reportType === "yolo").length,
    icon: Camera,
    iconClass: "bg-purple-100 text-purple-600",
  },
]);

const mapUrl = computed(() => {
  if (!selectedIncident.value) return "";
  const lat = parseFloat(selectedIncident.value.latitude);
  const lon = parseFloat(selectedIncident.value.longitude);
  const delta = 0.005;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${
    lon - delta
  }%2C${lat - delta}%2C${lon + delta}%2C${
    lat + delta
  }&layer=mapnik&marker=${lat}%2C${lon}`;
});

// --- METHODS ---

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getStatusClass = (status) => {
  const classes = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    ongoing: "bg-orange-100 text-orange-800",
    resolved: "bg-green-100 text-green-800",
    dismissed: "bg-gray-100 text-gray-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
};

const getTypeClass = (type) => {
  const classes = {
    Fire: "bg-red-100 text-red-800",
    Accident: "bg-orange-100 text-orange-800",
    Medical: "bg-pink-100 text-pink-800",
    Crime: "bg-purple-100 text-purple-800",
    Flood: "bg-cyan-100 text-cyan-800",
    Other: "bg-gray-100 text-gray-800",
  };
  return classes[type] || "bg-gray-100 text-gray-800";
};

const openIncidentDetail = (incident) => {
  selectedIncident.value = incident;
  // Trigger Detailed Geocoding for Modal
  fetchAddressForModal(incident.latitude, incident.longitude);
};

const closeIncidentDetail = () => {
  selectedIncident.value = null;
  incidentAddress.value = "";
};

// 3. Function: Prepare Penalize Modal (UI Logic)
const openPenalizeModal = (ip) => {
  ipToPenalize.value = ip;
  // Pre-fill reason for the dismissal part
  dismissReason.value = "Spam/Abuse detected from Reporter";
  showPenalizeModal.value = true;
};

// 4. Function: Penalize + Dismiss (Combined Action)
const confirmPenalizeAndDismiss = async () => {
  if (!dismissReason.value.trim()) {
    showNotification("Reason is required", "warning");
    return;
  }

  try {
    // Step A: Penalize the Reporter first
    await executePenalize(ipToPenalize.value);
    showNotification(`Reporter IP ${ipToPenalize.value} penalized.`, "success");

    // Step B: If there is an active incident, Dismiss it
    if (selectedIncident.value) {
      await executeDismissal(selectedIncident.value.id, dismissReason.value);
    } else {
      // If we just penalized without an open incident context (rare case)
      showPenalizeModal.value = false;
    }
  } catch (err) {
    // Error notification handled in individual functions,
    // but we catch here to stop the flow.
    console.error(err);
  }
};

const showNotification = (message, type = "success") => {
  notification.value = { show: true, message, type };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

// --- WATCHERS & LIFECYCLE ---

watch([filterSource, filterStatus, filterType], () => {
  fetchIncidents();
});

watch(searchQuery, () => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    fetchIncidents();
  }, 500);
});

onMounted(() => {
  fetchIncidents();
});
</script>

<style scoped>
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>
