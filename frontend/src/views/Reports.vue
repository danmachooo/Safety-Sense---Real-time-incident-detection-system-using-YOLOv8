<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
    <!-- Enhanced Header with Gradient -->
    <div
      class="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-10"
    >
      <div class="px-6 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div
              class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg"
            >
              <BarChart3 class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
              >
                Reports & Analytics
              </h1>
              <p class="text-sm text-gray-600 mt-1 font-medium">
                Generate comprehensive insights for inventory and incident
                management
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="showExportPreview"
              :disabled="!hasReportData || loading"
              class="inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              <Download class="w-4 h-4 mr-2" />
              Export Report
            </button>
            <button
              @click="generateReport"
              :disabled="loading"
              class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              <FileText class="w-4 h-4 mr-2" />
              <span v-if="loading">Generating...</span>
              <span v-else>Generate Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click="closePreview"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="px-8 py-6 border-b bg-gray-800 text-white flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-white">Export Preview</h2>
              <p class="text-sm text-white mt-1">
                Choose your export format and preview the report
              </p>
            </div>
            <button
              @click="closePreview"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X class="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <!-- Format Selection -->
          <div class="flex items-center space-x-4 mt-4">
            <button
              @click="selectedExportFormat = 'pdf'"
              :class="[
                'px-4 py-2 rounded-lg font-semibold transition-all duration-200',
                selectedExportFormat === 'pdf'
                  ? 'bg-red-100 text-red-800 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
            >
              <FileText class="w-4 h-4 inline mr-2" />
              PDF Report
            </button>
            <button
              @click="selectedExportFormat = 'excel'"
              :class="[
                'px-4 py-2 rounded-lg font-semibold transition-all duration-200',
                selectedExportFormat === 'excel'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
            >
              <Grid class="w-4 h-4 inline mr-2" />
              Excel Report
            </button>
          </div>
        </div>

        <!-- Preview Content -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <!-- PDF Preview -->
          <div v-if="selectedExportFormat === 'pdf'" class="p-8">
            <div
              ref="pdfPreview"
              class="bg-white max-w-4xl mx-auto"
              style="min-height: 800px"
            >
              <!-- PDF Header -->
              <div class="text-center mb-8 pb-6 border-b-2 border-gray-300">
                <div class="flex items-center justify-center mb-4">
                  <div
                    class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg mr-4"
                  >
                    <BarChart3 class="w-8 h-8 text-white" />
                  </div>
                  <h1 class="text-3xl font-bold text-gray-900">
                    {{ getReportTitle() }}
                  </h1>
                </div>
                <p class="text-gray-600 text-lg">
                  Comprehensive Analysis & Strategic Insights
                </p>
                <p class="text-sm text-gray-500 mt-2">
                  Generated on {{ formatDate(new Date()) }}
                </p>
              </div>

              <!-- Executive Summary -->
              <div class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Lightbulb class="w-6 h-6 mr-3 text-yellow-600" />
                  Executive Summary
                </h2>
                <div
                  class="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500"
                >
                  <p class="text-gray-800 leading-relaxed mb-4">
                    This {{ selectedPeriod.toLowerCase() }}
                    {{
                      selectedReportType === "combined"
                        ? "comprehensive"
                        : selectedReportType
                    }}
                    report provides detailed insights into our operational
                    performance from
                    {{ formatDate(reportData?.dateRange?.startDate) }} to
                    {{ formatDate(reportData?.dateRange?.endDate) }}.
                  </p>
                  <p class="text-gray-800 leading-relaxed">
                    {{ getExecutiveSummary() }}
                  </p>
                </div>
              </div>

              <!-- Key Performance Indicators -->
              <div class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Activity class="w-6 h-6 mr-3 text-green-600" />
                  Key Performance Indicators
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div
                    v-for="metric in getKeyMetrics()"
                    :key="metric.label"
                    class="bg-gray-50 p-4 rounded-lg border"
                  >
                    <div class="text-2xl font-bold text-gray-900">
                      {{ metric.value }}
                    </div>
                    <div class="text-sm font-semibold text-gray-600">
                      {{ metric.label }}
                    </div>
                    <div
                      v-if="metric.change"
                      class="text-xs text-green-600 mt-1"
                    >
                      {{ metric.change }}
                    </div>
                  </div>
                </div>
                <p class="text-gray-700 leading-relaxed">
                  {{ getKPIAnalysis() }}
                </p>
              </div>

              <!-- Inventory Analysis (if applicable) -->
              <div v-if="showInventoryCharts" class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Package class="w-6 h-6 mr-3 text-blue-600" />
                  Inventory Management Analysis
                </h2>
                <div class="space-y-4">
                  <div
                    class="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500"
                  >
                    <h3 class="font-bold text-yellow-800 mb-2">
                      Current Status
                    </h3>
                    <p class="text-yellow-700">{{ getInventoryInsight() }}</p>
                  </div>

                  <div
                    v-if="criticalItems.length > 0"
                    class="bg-red-50 p-4 rounded-lg border-l-4 border-red-500"
                  >
                    <h3 class="font-bold text-red-800 mb-2">
                      Critical Items Requiring Attention
                    </h3>
                    <ul class="text-red-700 space-y-1">
                      <li
                        v-for="item in criticalItems.slice(0, 5)"
                        :key="item.id"
                        class="flex justify-between"
                      >
                        <span>{{ item.name }}</span>
                        <span class="font-semibold"
                          >{{ item.quantity_in_stock }} units (Min:
                          {{ item.min_stock_level }})</span
                        >
                      </li>
                    </ul>
                  </div>

                  <div
                    class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500"
                  >
                    <h3 class="font-bold text-blue-800 mb-2">
                      Deployment Performance
                    </h3>
                    <p class="text-blue-700">{{ getDeploymentInsight() }}</p>
                  </div>
                </div>
              </div>

              <!-- Incident Analysis (if applicable) -->
              <div v-if="showIncidentCharts" class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <Shield class="w-6 h-6 mr-3 text-red-600" />
                  Security & Incident Analysis
                </h2>
                <div class="space-y-4">
                  <div
                    class="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500"
                  >
                    <h3 class="font-bold text-orange-800 mb-2">
                      Incident Overview
                    </h3>
                    <p class="text-orange-700">{{ getSecurityInsight() }}</p>
                  </div>

                  <div
                    v-if="topIncidentLocations.length > 0"
                    class="bg-red-50 p-4 rounded-lg border-l-4 border-red-500"
                  >
                    <h3 class="font-bold text-red-800 mb-2">
                      High-Risk Locations
                    </h3>
                    <ul class="text-red-700 space-y-1">
                      <li
                        v-for="location in topIncidentLocations.slice(0, 3)"
                        :key="location.location"
                        class="flex justify-between"
                      >
                        <span>{{ location.location }}</span>
                        <span class="font-semibold"
                          >{{ location.incidentCount }} incidents</span
                        >
                      </li>
                    </ul>
                  </div>

                  <div
                    class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500"
                  >
                    <h3 class="font-bold text-green-800 mb-2">
                      Response Performance
                    </h3>
                    <p class="text-green-700">{{ getPerformanceInsight() }}</p>
                  </div>
                </div>
              </div>

              <!-- Strategic Recommendations -->
              <div class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <TrendingUp class="w-6 h-6 mr-3 text-purple-600" />
                  Strategic Recommendations
                </h2>
                <div class="space-y-4">
                  <div
                    class="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500"
                  >
                    <h3 class="font-bold text-purple-800 mb-2">
                      Immediate Actions
                    </h3>
                    <ul class="text-purple-700 space-y-1 list-disc list-inside">
                      <li v-for="action in getImmediateActions()" :key="action">
                        {{ action }}
                      </li>
                    </ul>
                  </div>

                  <div
                    class="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500"
                  >
                    <h3 class="font-bold text-indigo-800 mb-2">
                      Long-term Strategy
                    </h3>
                    <ul class="text-indigo-700 space-y-1 list-disc list-inside">
                      <li
                        v-for="strategy in getLongTermStrategies()"
                        :key="strategy"
                      >
                        {{ strategy }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Conclusion -->
              <div class="mb-8">
                <h2
                  class="text-2xl font-bold text-gray-900 mb-4 flex items-center"
                >
                  <CheckCircle class="w-6 h-6 mr-3 text-green-600" />
                  Conclusion
                </h2>
                <div class="bg-gray-50 p-6 rounded-lg">
                  <p class="text-gray-800 leading-relaxed">
                    {{ getConclusion() }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Excel Preview -->
          <div v-else-if="selectedExportFormat === 'excel'" class="p-8">
            <div class="bg-white max-w-4xl mx-auto">
              <h3 class="text-xl font-bold text-gray-900 mb-4">
                Excel Export Preview
              </h3>
              <div class="bg-green-50 p-6 rounded-lg border border-green-200">
                <p class="text-green-800 mb-4">
                  The Excel export will include the following sheets:
                </p>
                <ul class="text-green-700 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Summary:</strong> Key metrics and performance
                    indicators
                  </li>
                  <li v-if="showInventoryCharts">
                    <strong>Inventory Data:</strong> Detailed inventory analysis
                    and critical items
                  </li>
                  <li v-if="showInventoryCharts">
                    <strong>Deployments:</strong> Recent deployments and
                    location analysis
                  </li>
                  <li v-if="showIncidentCharts">
                    <strong>Incidents:</strong> Incident data and location
                    breakdown
                  </li>
                  <li>
                    <strong>Recommendations:</strong> Strategic insights and
                    action items
                  </li>
                </ul>
                <div class="mt-4 p-4 bg-white rounded border">
                  <h4 class="font-semibold text-gray-900 mb-2">
                    Sample Data Structure:
                  </h4>
                  <table class="min-w-full text-sm">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="px-3 py-2 text-left">Metric</th>
                        <th class="px-3 py-2 text-left">Value</th>
                        <th class="px-3 py-2 text-left">Change</th>
                        <th class="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="metric in getKeyMetrics().slice(0, 3)"
                        :key="metric.label"
                        class="border-t"
                      >
                        <td class="px-3 py-2">{{ metric.label }}</td>
                        <td class="px-3 py-2">{{ metric.value }}</td>
                        <td class="px-3 py-2">{{ metric.change || "N/A" }}</td>
                        <td class="px-3 py-2">
                          <span
                            class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                            >Good</span
                          >
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-8 py-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0"
        >
          <div class="text-sm text-gray-600">
            <span v-if="selectedExportFormat === 'pdf'"
              >PDF will be optimized for printing and sharing</span
            >
            <span v-else
              >Excel file will include multiple sheets with detailed data</span
            >
          </div>
          <div class="flex space-x-3">
            <button
              @click="closePreview"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              @click="printReport"
              :disabled="exportLoading"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
            >
              <Printer class="w-4 h-4 inline mr-2" />
              <span v-if="exportLoading">Generating...</span>
              <span v-else>Print {{ selectedExportFormat.toUpperCase() }}</span>
            </button>
            <button
              @click="downloadReport"
              :disabled="exportLoading"
              class="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
            >
              <span v-if="exportLoading">Generating...</span>
              <span v-else
                >Download {{ selectedExportFormat.toUpperCase() }}</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Configuration Panel -->
    <div class="px-6 py-8">
      <div
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 mb-8"
      >
        <div class="flex items-center mb-6">
          <div
            class="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mr-4"
          >
            <Settings class="w-5 h-5 text-white" />
          </div>
          <h2 class="text-xl font-bold text-gray-900">Report Configuration</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Enhanced Time Period Selection -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800 mb-3">
              <Clock class="w-4 h-4 inline mr-2 text-blue-600" />
              Time Period
            </label>
            <select
              v-model="selectedPeriod"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm font-medium transition-all duration-200"
            >
              <option value="weekly">📅 Weekly Report</option>
              <option value="monthly">📊 Monthly Report</option>
              <option value="yearly">📈 Yearly Report</option>
            </select>
          </div>
          <!-- Enhanced Report Type Selection -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800 mb-3">
              <BarChart3 class="w-4 h-4 inline mr-2 text-purple-600" />
              Report Type
            </label>
            <select
              v-model="selectedReportType"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm font-medium transition-all duration-200"
            >
              <option value="combined">🔄 Combined Report</option>
              <option value="inventory">📦 Inventory Reports</option>
              <option value="incidents">🚨 Incident Reports</option>
            </select>
          </div>
          <!-- Enhanced Date Range -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-800 mb-3">
              <Calendar class="w-4 h-4 inline mr-2 text-green-600" />
              Custom Date Range
            </label>
            <div class="flex space-x-3">
              <input
                v-model="customStartDate"
                type="date"
                class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 backdrop-blur-sm font-medium transition-all duration-200"
              />
              <input
                v-model="customEndDate"
                type="date"
                class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 backdrop-blur-sm font-medium transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- Error State -->
      <div
        v-if="error && !loading"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 p-12 mb-8"
      >
        <div class="text-center">
          <div
            class="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center"
          >
            <AlertCircle class="w-10 h-10 text-red-600" />
          </div>
          <h3 class="text-2xl font-bold text-red-900 mb-3">
            Error Loading Report
          </h3>
          <p class="text-red-700 text-lg mb-6 max-w-md mx-auto">{{ error }}</p>
          <div class="flex justify-center space-x-4">
            <button
              @click="clearError"
              class="inline-flex items-center px-6 py-3 border border-red-300 rounded-xl shadow-sm text-sm font-semibold text-red-700 bg-white hover:bg-red-50 transition-all duration-200"
            >
              <X class="w-4 h-4 mr-2" />
              Dismiss
            </button>
            <button
              @click="retryGeneration"
              class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-200"
            >
              <RefreshCw class="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
      <!-- Enhanced Loading State -->
      <div
        v-if="loading"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-16"
      >
        <div class="text-center">
          <div class="relative">
            <div
              class="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"
            ></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div
                class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"
              ></div>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">
            Generating Report
          </h3>
          <p class="text-gray-600 text-lg">
            Analyzing your {{ selectedPeriod }} {{ selectedReportType }} data...
          </p>
          <div class="mt-6 bg-gray-200 rounded-full h-2 max-w-md mx-auto">
            <div
              class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-pulse"
              style="width: 60%"
            ></div>
          </div>
          <div
            class="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500"
          >
            <Database class="w-4 h-4" />
            <span>Processing {{ loadingStep }}</span>
          </div>
        </div>
      </div>
      <!-- Enhanced Report Content -->
      <div v-else-if="hasReportData" class="space-y-8">
        <!-- Enhanced Report Summary -->
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8"
        >
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2
                class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
              >
                {{ getReportTitle() }}
              </h2>
              <p
                class="text-sm text-gray-500 mt-2 font-medium flex items-center"
              >
                <Calendar class="w-4 h-4 mr-2" />
                Generated on {{ formatDate(reportData.generatedAt) }}
              </p>
            </div>
            <div
              class="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full"
            >
              <div
                class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              ></div>
              <span class="text-sm font-semibold text-green-800"
                >Live Data</span
              >
            </div>
          </div>
          <!-- Enhanced Key Metrics Grid -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
          >
            <div
              v-for="(metric, index) in getKeyMetrics()"
              :key="metric.label"
              class="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fadeInUp"
              :style="{ animationDelay: `${index * 100}ms` }"
            >
              <div
                class="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"
                :class="getMetricGradient(index)"
              ></div>
              <div class="relative">
                <div class="flex items-center justify-between mb-4">
                  <component
                    :is="metric.icon"
                    class="w-10 h-10 p-2 rounded-xl shadow-md"
                    :class="[metric.iconColor, getMetricBg(index)]"
                  />
                  <div class="text-right">
                    <div
                      class="text-3xl font-bold text-gray-900 animate-countUp"
                    >
                      {{ metric.value }}
                    </div>
                  </div>
                </div>
                <p class="text-sm font-semibold text-gray-600">
                  {{ metric.label }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- Enhanced Charts Section -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <!-- Enhanced Inventory Chart -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mr-4"
                >
                  <Package class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Inventory Analysis
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('inventory')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div
              v-if="inventoryData?.itemsByCategory?.length > 0"
              class="h-80 mb-6 relative"
            >
              <canvas ref="inventoryChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 mb-6 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <Package class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No inventory data available
                </p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div
                class="p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-blue-600">
                  {{ inventoryData?.summary?.totalItems || 1 }}
                </div>
                <div
                  class="text-xs font-semibold text-blue-800 flex items-center justify-center"
                >
                  <Package class="w-3 h-3 mr-1" />
                  Total Items
                </div>
              </div>
              <div
                class="p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-orange-600">
                  {{ inventoryData?.summary?.totalLowStockItems || 0 }}
                </div>
                <div
                  class="text-xs font-semibold text-orange-800 flex items-center justify-center"
                >
                  <AlertTriangle class="w-3 h-3 mr-1" />
                  Low Stock
                </div>
              </div>
              <div
                class="p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-purple-600">
                  {{ inventoryData?.summary?.totalCategories || 0 }}
                </div>
                <div
                  class="text-xs font-semibold text-purple-800 flex items-center justify-center"
                >
                  <Grid class="w-3 h-3 mr-1" />
                  Categories
                </div>
              </div>
            </div>
          </div>
          <!-- Enhanced Incident Chart -->
          <div
            v-if="showIncidentCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg mr-4"
                >
                  <Shield class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Incident Analysis
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('incident')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div
              v-if="incidentData?.incidentsByType?.length > 0"
              class="h-80 mb-6 relative"
            >
              <canvas ref="incidentChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 mb-6 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <Shield class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No incident data available
                </p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div
                class="p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-red-600">
                  {{ incidentData?.summary?.totalIncidents || 0 }}
                </div>
                <div
                  class="text-xs font-semibold text-red-800 flex items-center justify-center"
                >
                  <AlertCircle class="w-3 h-3 mr-1" />
                  Total Incidents
                </div>
              </div>
              <div
                class="p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-green-600">
                  {{ Math.round(incidentData?.summary?.avgResponseTime || 0) }}m
                </div>
                <div
                  class="text-xs font-semibold text-green-800 flex items-center justify-center"
                >
                  <Clock class="w-3 h-3 mr-1" />
                  Avg Response
                </div>
              </div>
              <div
                class="p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-indigo-600">
                  {{ getResolutionRate() }}%
                </div>
                <div
                  class="text-xs font-semibold text-indigo-800 flex items-center justify-center"
                >
                  <CheckCircle class="w-3 h-3 mr-1" />
                  Resolution Rate
                </div>
              </div>
            </div>
          </div>
          <!-- Enhanced Deployment Chart -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg mr-4"
                >
                  <Truck class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Deployment Analysis
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('deployment')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div
              v-if="deploymentData?.topLocations?.length > 0"
              class="h-80 mb-6 relative"
            >
              <canvas ref="deploymentChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 mb-6 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <Truck class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No deployment data available
                </p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div
                class="p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-purple-600">
                  {{ deploymentData?.summary?.totalDeployments || 0 }}
                </div>
                <div
                  class="text-xs font-semibold text-purple-800 flex items-center justify-center"
                >
                  <Truck class="w-3 h-3 mr-1" />
                  Total Deployments
                </div>
              </div>
              <div
                class="p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors duration-200"
              >
                <div class="text-2xl font-bold text-indigo-600">
                  {{ deploymentData?.summary?.totalQuantityDeployed || 0 }}
                </div>
                <div
                  class="text-xs font-semibold text-indigo-800 flex items-center justify-center"
                >
                  <Package class="w-3 h-3 mr-1" />
                  Items Deployed
                </div>
              </div>
              <div
                class="p-3 bg-cyan-50 rounded-xl hover:bg-cyan-100 transition-colors duration-200"
              >
                <div class="text-lg font-bold text-cyan-600 truncate">
                  {{ getTopDeploymentLocation() }}
                </div>
                <div
                  class="text-xs font-semibold text-cyan-800 flex items-center justify-center"
                >
                  <MapPin class="w-3 h-3 mr-1" />
                  Top Location
                </div>
              </div>
            </div>
          </div>
          <!-- Enhanced Stock Movement Chart -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-4"
                >
                  <TrendingUp class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Stock Movement Trends
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('stockMovement')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div
              v-if="stockMovementData?.movementSummary?.length > 0"
              class="h-80"
            >
              <canvas ref="stockMovementChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <TrendingUp class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No stock movement data available
                </p>
              </div>
            </div>
          </div>
          <!-- Enhanced Performance Chart -->
          <div
            v-if="showIncidentCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg mr-4"
                >
                  <Activity class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Response Performance
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('performance')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div v-if="incidentData?.incidentsByTime?.length > 0" class="h-80">
              <canvas ref="performanceChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <Activity class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No performance data available
                </p>
              </div>
            </div>
          </div>
          <!-- Enhanced Deployment Status Chart -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div
                  class="p-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg mr-4"
                >
                  <PieChart class="w-5 h-5 text-white" />
                </div>
                <h3 class="text-xl font-bold text-gray-900">
                  Deployment Status
                </h3>
              </div>
              <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                @click="refreshChart('deploymentStatus')"
              >
                <RefreshCw class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div
              v-if="deploymentData?.deploymentStats?.length > 0"
              class="h-80"
            >
              <canvas ref="deploymentStatusChart" class="rounded-xl"></canvas>
            </div>
            <div
              v-else
              class="h-80 flex items-center justify-center bg-gray-50 rounded-xl"
            >
              <div class="text-center">
                <PieChart class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 font-medium">
                  No deployment status data available
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- Enhanced Tables Section -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <!-- Enhanced Critical Items Table -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300"
          >
            <div
              class="px-8 py-6 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <AlertTriangle class="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <h3 class="text-lg font-bold text-red-900">
                      Critical Inventory Items
                    </h3>
                    <p class="text-sm text-red-700 font-medium">
                      Items requiring immediate attention
                    </p>
                  </div>
                </div>
                <div
                  class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold"
                >
                  {{ criticalItems.length }}
                </div>
              </div>
            </div>
            <div
              v-if="criticalItems.length > 0"
              class="overflow-x-auto max-h-96"
            >
              <table class="min-w-full">
                <thead class="bg-gray-50/80 sticky top-0">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Item
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Stock
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Min Level
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="item in criticalItems"
                    :key="item.id"
                    class="hover:bg-red-50/50 transition-colors duration-200"
                  >
                    <td class="px-6 py-4">
                      <div>
                        <div
                          class="text-sm font-bold text-gray-900 flex items-center"
                        >
                          <Package class="w-4 h-4 mr-2 text-gray-500" />
                          {{ item.name }}
                        </div>
                        <div class="text-xs text-gray-500 font-medium">
                          {{ item.category?.name }}
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"
                      >
                        {{ item.quantity_in_stock }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm font-semibold text-gray-900">
                      {{ item.min_stock_level }}
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800"
                      >
                        <AlertTriangle class="w-3 h-3 mr-1" />
                        Reorder Required
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-12 text-center">
              <CheckCircle class="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p class="text-green-700 font-medium">
                All items are adequately stocked
              </p>
            </div>
          </div>
          <!-- Enhanced Recent Deployments Table -->
          <div
            v-if="showInventoryCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300"
          >
            <div
              class="px-8 py-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <Truck class="w-6 h-6 text-purple-600 mr-3" />
                  <div>
                    <h3 class="text-lg font-bold text-purple-900">
                      Recent Deployments
                    </h3>
                    <p class="text-sm text-purple-700 font-medium">
                      Latest equipment deployments
                    </p>
                  </div>
                </div>
                <div
                  class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold"
                >
                  {{ recentDeployments.length }}
                </div>
              </div>
            </div>
            <div
              v-if="recentDeployments.length > 0"
              class="overflow-x-auto max-h-96"
            >
              <table class="min-w-full">
                <thead class="bg-gray-50/80 sticky top-0">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Item
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Quantity
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="deployment in recentDeployments"
                    :key="deployment.id"
                    class="hover:bg-purple-50/50 transition-colors duration-200"
                  >
                    <td class="px-6 py-4">
                      <div>
                        <div
                          class="text-sm font-bold text-gray-900 flex items-center"
                        >
                          <Package class="w-4 h-4 mr-2 text-gray-500" />
                          {{ deployment.inventoryItem?.name }}
                        </div>
                        <div class="text-xs text-gray-500 font-medium">
                          {{ deployment.inventoryItem?.category?.name }}
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div
                        class="text-sm font-semibold text-gray-900 flex items-center"
                      >
                        <MapPin class="w-4 h-4 mr-2 text-gray-500" />
                        {{ deployment.deployment_location }}
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"
                      >
                        {{ deployment.quantity_deployed }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        :class="getDeploymentStatusClass(deployment.status)"
                      >
                        <component
                          :is="getStatusIcon(deployment.status)"
                          class="w-3 h-3 mr-1"
                        />
                        {{ deployment.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-12 text-center">
              <Truck class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 font-medium">No recent deployments</p>
            </div>
          </div>
          <!-- Enhanced High-Risk Locations Table -->
          <div
            v-if="showIncidentCharts"
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300"
          >
            <div
              class="px-8 py-6 bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <MapPin class="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <h3 class="text-lg font-bold text-red-900">
                      High-Risk Locations
                    </h3>
                    <p class="text-sm text-red-700 font-medium">
                      Locations with most incidents
                    </p>
                  </div>
                </div>
                <div
                  class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold"
                >
                  {{ topIncidentLocations.length }}
                </div>
              </div>
            </div>
            <div
              v-if="topIncidentLocations.length > 0"
              class="overflow-x-auto max-h-96"
            >
              <table class="min-w-full">
                <thead class="bg-gray-50/80 sticky top-0">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Incidents
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Primary Type
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="location in topIncidentLocations"
                    :key="location.location"
                    class="hover:bg-red-50/50 transition-colors duration-200"
                  >
                    <td class="px-6 py-4">
                      <div
                        class="text-sm font-bold text-gray-900 flex items-center"
                      >
                        <MapPin class="w-4 h-4 mr-2 text-gray-500" />
                        {{ location.location }}
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"
                      >
                        {{ location.incidentCount }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm font-semibold text-gray-500">
                      {{ getPrimaryIncidentType(location.incidentTypes) }}
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        :class="getRiskLevelClass(location.incidentCount)"
                      >
                        <component
                          :is="getRiskIcon(location.incidentCount)"
                          class="w-3 h-3 mr-1"
                        />
                        {{ getRiskLevel(location.incidentCount) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-12 text-center">
              <Shield class="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p class="text-green-700 font-medium">
                No high-risk locations identified
              </p>
            </div>
          </div>
        </div>
        <!-- Enhanced Insights Section -->
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8"
        >
          <div class="flex items-center mb-8">
            <div
              class="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg mr-4"
            >
              <Lightbulb class="w-5 h-5 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">
              Key Insights & Recommendations
            </h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div
              class="group p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg"
            >
              <div class="flex items-center mb-4">
                <TrendingUp class="w-6 h-6 text-blue-600 mr-3" />
                <h4 class="font-bold text-blue-900 text-lg">
                  Inventory Health
                </h4>
              </div>
              <p class="text-sm text-blue-800 font-medium leading-relaxed">
                {{ getInventoryInsight() }}
              </p>
            </div>
            <div
              class="group p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg"
            >
              <div class="flex items-center mb-4">
                <Truck class="w-6 h-6 text-purple-600 mr-3" />
                <h4 class="font-bold text-purple-900 text-lg">
                  Deployment Status
                </h4>
              </div>
              <p class="text-sm text-purple-800 font-medium leading-relaxed">
                {{ getDeploymentInsight() }}
              </p>
            </div>
            <div
              class="group p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-orange-100 hover:border-orange-300 transition-all duration-300 hover:shadow-lg"
            >
              <div class="flex items-center mb-4">
                <AlertTriangle class="w-6 h-6 text-orange-600 mr-3" />
                <h4 class="font-bold text-orange-900 text-lg">
                  Security Status
                </h4>
              </div>
              <p class="text-sm text-orange-800 font-medium leading-relaxed">
                {{ getSecurityInsight() }}
              </p>
            </div>
            <div
              class="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100 hover:border-green-300 transition-all duration-300 hover:shadow-lg"
            >
              <div class="flex items-center mb-4">
                <CheckCircle class="w-6 h-6 text-green-600 mr-3" />
                <h4 class="font-bold text-green-900 text-lg">Performance</h4>
              </div>
              <p class="text-sm text-green-800 font-medium leading-relaxed">
                {{ getPerformanceInsight() }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- Enhanced Empty State -->
      <div
        v-else
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-16"
      >
        <div class="text-center">
          <div class="relative mb-8">
            <div
              class="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full mx-auto flex items-center justify-center"
            >
              <FileText class="w-12 h-12 text-gray-400" />
            </div>
            <div
              class="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center"
            >
              <Plus class="w-4 h-4 text-white" />
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-4">
            No Report Generated
          </h3>
          <p class="text-gray-600 mb-8 text-lg max-w-md mx-auto">
            Select your report configuration and click "Generate Report" to view
            comprehensive analytics and insights.
          </p>
          <button
            @click="generateReport"
            class="inline-flex items-center px-8 py-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            <FileText class="w-5 h-5 mr-3" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import {
  FileText,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Package,
  Shield,
  Clock,
  Users,
  Truck,
  Settings,
  BarChart3,
  Calendar,
  Activity,
  PieChart,
  MapPin,
  Lightbulb,
  Plus,
  AlertCircle,
  X,
  RefreshCw,
  Database,
  Grid,
  Printer,
} from "lucide-vue-next";
import Chart from "chart.js/auto";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import api from "../utils/axios";

// Reactive state
const printLoading = ref(false);
const loading = ref(false);
const error = ref(null);
const loadingStep = ref("inventory data");
const selectedPeriod = ref("monthly");
const selectedReportType = ref("combined");
const customStartDate = ref("");
const customEndDate = ref("");
const reportData = ref(null);
const inventoryData = ref(null);
const incidentData = ref(null);
const stockMovementData = ref(null);
const deploymentData = ref(null);
const responderData = ref(null);
const topIncidentLocations = ref([]);
const criticalItems = ref([]);
const recentDeployments = ref([]);

// Export preview state
const showPreview = ref(false);
const selectedExportFormat = ref("pdf");
const exportLoading = ref(false);
const pdfPreview = ref(null);

// Chart refs
const inventoryChart = ref(null);
const incidentChart = ref(null);
const stockMovementChart = ref(null);
const performanceChart = ref(null);
const deploymentChart = ref(null);
const deploymentStatusChart = ref(null);

// Chart instances
const chartInstances = ref({});

// API configuration
const API_BASE = "/reports";

// Computed properties
const hasReportData = computed(() => {
  return reportData.value !== null;
});

const showInventoryCharts = computed(() => {
  return (
    selectedReportType.value === "combined" ||
    selectedReportType.value === "inventory"
  );
});

const showIncidentCharts = computed(() => {
  return (
    selectedReportType.value === "combined" ||
    selectedReportType.value === "incidents"
  );
});

// Export preview functions
const showExportPreview = () => {
  if (!hasReportData.value) return;
  showPreview.value = true;
};

const closePreview = () => {
  showPreview.value = false;
  selectedExportFormat.value = "pdf";
};

const downloadReport = async () => {
  exportLoading.value = true;
  try {
    if (selectedExportFormat.value === "pdf") {
      await generatePDFReport();
    } else if (selectedExportFormat.value === "excel") {
      await generateExcelReport();
    }
  } catch (error) {
    console.error("Export error:", error);
    alert("Failed to generate report. Please try again.");
  } finally {
    exportLoading.value = false;
  }
};
const printReport = async () => {
  if (!hasReportData.value || !pdfPreview.value) {
    alert("No report data available to print");
    return;
  }

  printLoading.value = true;

  try {
    // Generate the PDF blob (same logic as your existing generatePDFReport but return blob instead of download)
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const headerHeight = 20;
    const footerHeight = 15;
    const usableHeight = pageHeight - 2 * margin - headerHeight - footerHeight;

    // Capture the content as canvas (same as your existing code)
    const canvas = await html2canvas(pdfPreview.value, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      height: pdfPreview.value.scrollHeight,
      windowHeight: pdfPreview.value.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    const usableHeightInPixels = (usableHeight * canvas.width) / contentWidth;
    const totalPages = Math.ceil(imgHeight / usableHeight);
    const breakPoints = findSmartBreakPoints(
      canvas,
      usableHeightInPixels,
      totalPages
    );

    // Generate PDF pages (same logic as your existing generatePDFReport)
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      // Add header
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(getReportTitle(), margin, margin + 5);
      pdf.text(
        `Generated: ${formatDate(new Date())}`,
        pageWidth - margin - 50,
        margin + 5
      );
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, margin + 8, pageWidth - margin, margin + 8);

      // Calculate content for this page
      let sourceY, sourceHeight;
      if (pageNum === 0) {
        sourceY = 0;
        sourceHeight = breakPoints[0];
      } else if (pageNum === totalPages - 1) {
        sourceY = breakPoints[pageNum - 1];
        sourceHeight = canvas.height - sourceY;
      } else {
        sourceY = breakPoints[pageNum - 1];
        sourceHeight = breakPoints[pageNum] - sourceY;
      }

      sourceHeight = Math.min(sourceHeight, canvas.height - sourceY);

      if (sourceHeight > 0) {
        const pageCanvas = document.createElement("canvas");
        const pageCtx = pageCanvas.getContext("2d");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceHeight);

        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL("image/png");
        const pageImgHeightMM = (sourceHeight * contentWidth) / canvas.width;

        pdf.addImage(
          pageImgData,
          "PNG",
          margin,
          margin + headerHeight,
          imgWidth,
          pageImgHeightMM
        );
        pageCanvas.remove();
      }

      // Add footer
      const footerY = pageHeight - margin - 5;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      pdf.text(`Page ${pageNum + 1} of ${totalPages}`, margin, footerY);
      pdf.text("Confidential Report", pageWidth - margin - 30, footerY);
      pdf.text("Generated by Reports & Analytics System", margin, footerY + 4);
    }

    // Instead of saving, create a blob URL and open in new window for printing
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open PDF in new window
    const printWindow = window.open(blobUrl, "_blank");

    if (!printWindow) {
      alert("Please allow popups to enable printing");
      URL.revokeObjectURL(blobUrl);
      return;
    }

    // Wait for PDF to load, then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();

        // Clean up blob URL after printing
        printWindow.onafterprint = () => {
          URL.revokeObjectURL(blobUrl);
          printWindow.close();
        };

        // Fallback cleanup in case onafterprint doesn't fire
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 30000); // Clean up after 30 seconds
      }, 1000); // Give PDF time to render
    };
  } catch (error) {
    console.error("Print error:", error);
    alert("Failed to generate PDF for printing. Please try again.");
  } finally {
    printLoading.value = false;
  }
};

// Enhanced PDF Report Generation Functions - Fixed Version with Smart Breaks
const generatePDFReport = async () => {
  if (!pdfPreview.value) return;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 15; // 15mm margins
  const contentWidth = pageWidth - 2 * margin; // Width for content
  const contentHeight = pageHeight - 2 * margin; // Height for content
  const headerHeight = 20; // Reserve space for headers
  const footerHeight = 15; // Reserve space for footers
  const usableHeight = contentHeight - headerHeight - footerHeight;

  try {
    // Capture the content as canvas with higher quality - SAME AS ORIGINAL
    const canvas = await html2canvas(pdfPreview.value, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      height: pdfPreview.value.scrollHeight,
      windowHeight: pdfPreview.value.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Convert usable height to canvas pixels for accurate calculations
    const usableHeightInPixels = (usableHeight * canvas.width) / contentWidth;

    // Calculate how many pages we need
    const totalPages = Math.ceil(imgHeight / usableHeight);

    // Smart break detection - find good cut points
    const breakPoints = findSmartBreakPoints(
      canvas,
      usableHeightInPixels,
      totalPages
    );

    // Add content page by page - KEEPING ORIGINAL STRUCTURE
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      // Add header to each page - SAME AS ORIGINAL
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(getReportTitle(), margin, margin + 5);
      pdf.text(
        `Generated: ${formatDate(new Date())}`,
        pageWidth - margin - 50,
        margin + 5
      );

      // Draw header line - SAME AS ORIGINAL
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, margin + 8, pageWidth - margin, margin + 8);

      // Calculate the portion of image for this page using smart breaks
      let sourceY, sourceHeight;

      if (pageNum === 0) {
        // First page
        sourceY = 0;
        sourceHeight = breakPoints[0];
      } else if (pageNum === totalPages - 1) {
        // Last page
        sourceY = breakPoints[pageNum - 1];
        sourceHeight = canvas.height - sourceY;
      } else {
        // Middle pages
        sourceY = breakPoints[pageNum - 1];
        sourceHeight = breakPoints[pageNum] - sourceY;
      }

      // Ensure we don't exceed canvas bounds
      sourceHeight = Math.min(sourceHeight, canvas.height - sourceY);

      // Only add image if there's content to show
      if (sourceHeight > 0) {
        // Create a temporary canvas for this page's content - SAME AS ORIGINAL
        const pageCanvas = document.createElement("canvas");
        const pageCtx = pageCanvas.getContext("2d");

        // Set canvas dimensions to match the slice we want
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceHeight);

        // Fill with white background to avoid transparency issues
        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        // Draw the portion of the original canvas for this page
        pageCtx.drawImage(
          canvas,
          0, // source x
          sourceY, // source y
          canvas.width, // source width
          sourceHeight, // source height
          0, // destination x
          0, // destination y
          canvas.width, // destination width
          sourceHeight // destination height
        );

        const pageImgData = pageCanvas.toDataURL("image/png");

        // Calculate the height in mm for this page's content
        const pageImgHeightMM = (sourceHeight * contentWidth) / canvas.width;

        // Add the image to PDF with proper positioning - SAME AS ORIGINAL
        pdf.addImage(
          pageImgData,
          "PNG",
          margin,
          margin + headerHeight,
          imgWidth,
          pageImgHeightMM
        );

        // Clean up the temporary canvas
        pageCanvas.remove();
      }

      // Add footer to each page - SAME AS ORIGINAL
      const footerY = pageHeight - margin - 5;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);

      // Draw footer line
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      // Page number and confidentiality notice
      pdf.text(`Page ${pageNum + 1} of ${totalPages}`, margin, footerY);
      pdf.text("Confidential Report", pageWidth - margin - 30, footerY);

      // Add company/system identifier
      pdf.text("Generated by Reports & Analytics System", margin, footerY + 4);
    }

    // Generate filename with timestamp - SAME AS ORIGINAL
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const fileName = `${getReportTitle().replace(
      /\s+/g,
      "_"
    )}_${timestamp}.pdf`;

    // Save the PDF - SAME AS ORIGINAL
    pdf.save(fileName);
    closePreview();
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  }
};

// Helper function to find smart break points
function findSmartBreakPoints(canvas, usableHeightInPixels, totalPages) {
  const breakPoints = [];
  const ctx = canvas.getContext("2d");
  const searchBuffer = 30; // pixels to search around ideal break point

  for (let page = 1; page < totalPages; page++) {
    const idealBreak = page * usableHeightInPixels;
    let bestBreak = idealBreak;
    let bestScore = 0;

    // Search around the ideal break point for better locations
    const searchStart = Math.max(0, idealBreak - searchBuffer);
    const searchEnd = Math.min(canvas.height, idealBreak + searchBuffer);

    for (let y = searchStart; y < searchEnd; y += 2) {
      const score = calculateBreakScore(ctx, y, canvas.width);
      if (score > bestScore) {
        bestScore = score;
        bestBreak = y;
      }
    }

    breakPoints.push(bestBreak);
  }

  return breakPoints;
}

// Calculate how good a particular Y position is for a page break
function calculateBreakScore(ctx, y, width) {
  if (y <= 0 || y >= ctx.canvas.height - 1) return 0;

  let score = 0;
  const sampleWidth = Math.min(width, 200); // Sample a portion of the width

  try {
    // Sample the current line
    const currentLine = ctx.getImageData(0, y, sampleWidth, 1);
    const currentPixels = currentLine.data;

    // Sample lines above and below
    const aboveLine = ctx.getImageData(0, Math.max(0, y - 1), sampleWidth, 1);
    const belowLine = ctx.getImageData(
      0,
      Math.min(ctx.canvas.height - 1, y + 1),
      sampleWidth,
      1
    );
    const abovePixels = aboveLine.data;
    const belowPixels = belowLine.data;

    let whitePixels = 0;
    let totalPixels = currentPixels.length / 4;

    // Check for white/light pixels (good for breaking)
    for (let i = 0; i < currentPixels.length; i += 4) {
      const r = currentPixels[i];
      const g = currentPixels[i + 1];
      const b = currentPixels[i + 2];

      // Consider pixel "white" if it's light
      if (r > 240 && g > 240 && b > 240) {
        whitePixels++;
      }
    }

    // Higher score for more white pixels (empty space)
    score += (whitePixels / totalPixels) * 100;

    // Check for horizontal lines or borders (often good break points)
    let horizontalLineScore = 0;
    for (let i = 0; i < currentPixels.length; i += 4) {
      const currentGray =
        (currentPixels[i] + currentPixels[i + 1] + currentPixels[i + 2]) / 3;
      const aboveGray =
        (abovePixels[i] + abovePixels[i + 1] + abovePixels[i + 2]) / 3;
      const belowGray =
        (belowPixels[i] + belowPixels[i + 1] + belowPixels[i + 2]) / 3;

      // Look for contrast indicating borders or separators
      if (
        Math.abs(currentGray - aboveGray) > 50 ||
        Math.abs(currentGray - belowGray) > 50
      ) {
        horizontalLineScore++;
      }
    }

    score += (horizontalLineScore / totalPixels) * 50;

    // Bonus for consistent horizontal patterns (like table borders)
    let patternBonus = 0;
    for (let i = 0; i < currentPixels.length - 12; i += 12) {
      const pixel1Gray =
        (currentPixels[i] + currentPixels[i + 1] + currentPixels[i + 2]) / 3;
      const pixel2Gray =
        (currentPixels[i + 12] +
          currentPixels[i + 13] +
          currentPixels[i + 14]) /
        3;

      if (Math.abs(pixel1Gray - pixel2Gray) < 20) {
        patternBonus++;
      }
    }
    score += (patternBonus / (totalPixels / 4)) * 20;
  } catch (error) {
    // If there's an error reading pixels, return low score
    return 0;
  }

  return score;
}
// Enhanced Excel report generation with better formatting
const generateExcelReport = () => {
  const workbook = XLSX.utils.book_new();

  // Enhanced Summary Sheet
  const summaryData = [
    ["COMPREHENSIVE REPORT SUMMARY"],
    [""],
    ["Report Information", ""],
    ["Title", getReportTitle()],
    ["Generated On", formatDate(new Date())],
    ["Report Period", selectedPeriod.value.toUpperCase()],
    ["Report Type", selectedReportType.value.toUpperCase()],
    ["Date Range", `${customStartDate.value} to ${customEndDate.value}`],
    [""],
    ["Executive Summary", ""],
    [getExecutiveSummary().substring(0, 500) + "..."],
    [""],
    ["Key Performance Metrics", "Metric", "Value", "Change", "Status"],
    ...getKeyMetrics().map((metric) => [
      "",
      metric.label,
      metric.value,
      metric.change || "N/A",
      metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "-",
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

  // Enhanced Inventory Sheet (if applicable)
  if (showInventoryCharts.value && criticalItems.value.length > 0) {
    const inventoryData = [
      ["CRITICAL INVENTORY ITEMS"],
      ["Items requiring immediate attention"],
      [""],
      [
        "Item Name",
        "Category",
        "Current Stock",
        "Minimum Level",
        "Shortage",
        "Status",
        "Priority",
      ],
      ...criticalItems.value.map((item) => [
        item.name || "N/A",
        item.category?.name || "Unknown",
        item.quantity_in_stock || 0,
        item.min_stock_level || 0,
        Math.max(
          0,
          (item.min_stock_level || 0) - (item.quantity_in_stock || 0)
        ),
        "REORDER REQUIRED",
        (item.quantity_in_stock || 0) === 0 ? "CRITICAL" : "HIGH",
      ]),
    ];

    const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
    inventorySheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      inventorySheet,
      "Critical Inventory"
    );
  }

  // Enhanced Deployments Sheet (if applicable)
  if (showInventoryCharts.value && recentDeployments.value.length > 0) {
    const deploymentData = [
      ["RECENT DEPLOYMENTS"],
      ["Latest deployment activities"],
      [""],
      ["Item", "Location", "Quantity", "Status", "Date", "Time", "Notes"],
      ...recentDeployments.value.map((deployment) => {
        const deploymentDate = new Date(deployment.created_at);
        return [
          deployment.inventoryItem?.name || "N/A",
          deployment.deployment_location || "Unknown",
          deployment.quantity_deployed || 0,
          deployment.status || "Pending",
          deploymentDate.toLocaleDateString(),
          deploymentDate.toLocaleTimeString(),
          `Deployed by system on ${deploymentDate.toDateString()}`,
        ];
      }),
    ];

    const deploymentSheet = XLSX.utils.aoa_to_sheet(deploymentData);
    deploymentSheet["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      deploymentSheet,
      "Recent Deployments"
    );
  }

  // Enhanced Incidents Sheet (if applicable)
  if (showIncidentCharts.value && topIncidentLocations.value.length > 0) {
    const incidentData = [
      ["HIGH-RISK LOCATIONS"],
      ["Locations with significant incident activity"],
      [""],
      [
        "Location",
        "Total Incidents",
        "Primary Type",
        "Risk Level",
        "Recommendation",
      ],
      ...topIncidentLocations.value.map((location) => [
        location.location || "Unknown",
        location.incidentCount || 0,
        getPrimaryIncidentType(location.incidentTypes),
        getRiskLevel(location.incidentCount),
        location.incidentCount >= 10
          ? "IMMEDIATE ATTENTION REQUIRED"
          : location.incidentCount >= 5
          ? "Enhanced monitoring recommended"
          : "Continue standard protocols",
      ]),
    ];

    const incidentSheet = XLSX.utils.aoa_to_sheet(incidentData);
    incidentSheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      incidentSheet,
      "High-Risk Locations"
    );
  }

  // Enhanced Recommendations Sheet
  const recommendationsData = [
    ["STRATEGIC RECOMMENDATIONS"],
    ["Action items and strategic initiatives"],
    [""],
    ["Priority", "Category", "Recommendation", "Timeline", "Impact"],
    ["HIGH", "Immediate Actions", "", "", ""],
    ...getImmediateActions().map((action, index) => [
      "HIGH",
      "Immediate",
      action,
      "0-30 days",
      "Critical",
    ]),
    ["", "", "", "", ""],
    ["MEDIUM", "Long-term Strategy", "", "", ""],
    ...getLongTermStrategies().map((strategy, index) => [
      "MEDIUM",
      "Strategic",
      strategy,
      "3-12 months",
      "Significant",
    ]),
  ];

  const recommendationsSheet = XLSX.utils.aoa_to_sheet(recommendationsData);
  recommendationsSheet["!cols"] = [
    { wch: 10 },
    { wch: 18 },
    { wch: 50 },
    { wch: 15 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    recommendationsSheet,
    "Recommendations"
  );

  // Save the workbook
  const fileName = `${getReportTitle().replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  XLSX.writeFile(workbook, fileName);

  closePreview();
};
// Narrative content functions
const getExecutiveSummary = () => {
  const metrics = getKeyMetrics();
  const totalItems = metrics.find((m) => m.label === "Total Items")?.value || 0;
  const incidents =
    metrics.find((m) => m.label === "Total Incidents")?.value || 0;

  return `During this reporting period, our operations maintained ${totalItems} inventory items with ${incidents} security incidents recorded.
  ${getInventoryInsight()} ${getSecurityInsight()} Overall performance indicators suggest ${getPerformanceStatus()} operational efficiency.`;
};

const getKPIAnalysis = () => {
  const metrics = getKeyMetrics();
  const analysis = [];

  if (showInventoryCharts.value) {
    analysis.push(
      "Inventory management shows stable performance with proactive monitoring of stock levels."
    );
  }

  if (showIncidentCharts.value) {
    analysis.push(
      "Security incident response times remain within acceptable parameters."
    );
  }

  analysis.push(
    "Key performance indicators demonstrate consistent operational excellence across all measured areas."
  );

  return analysis.join(" ");
};

const getImmediateActions = () => {
  const actions = [];

  if (criticalItems.value.length > 0) {
    actions.push(
      `Restock ${criticalItems.value.length} critical inventory items immediately`
    );
  }

  if (topIncidentLocations.value.length > 0) {
    actions.push(
      `Implement enhanced security measures at ${topIncidentLocations.value[0]?.location}`
    );
  }

  actions.push("Review and update standard operating procedures");
  actions.push("Conduct team performance assessment");

  return actions;
};

const getLongTermStrategies = () => {
  return [
    "Implement predictive analytics for inventory management",
    "Develop comprehensive risk assessment protocols",
    "Establish automated monitoring and alert systems",
    "Create cross-training programs for operational resilience",
    "Invest in advanced security infrastructure",
  ];
};

const getConclusion = () => {
  return `This ${selectedPeriod.value.toLowerCase()} analysis demonstrates our commitment to operational excellence and continuous improvement.
  The data reveals both strengths in our current processes and opportunities for enhancement. By implementing the recommended actions,
  we can further optimize our operations, reduce risks, and improve overall efficiency. Regular monitoring and assessment will ensure
  we maintain high standards while adapting to evolving operational requirements.`;
};

const getPerformanceStatus = () => {
  const metrics = getKeyMetrics();
  const positiveChanges = metrics.filter(
    (m) => m.change && m.change.includes("+")
  ).length;
  const totalMetrics = metrics.filter((m) => m.change).length;

  if (positiveChanges > totalMetrics / 2) return "strong";
  if (positiveChanges === totalMetrics / 2) return "stable";
  return "improving";
};

// Enhanced utility functions for styling
const getMetricGradient = (index) => {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-red-500",
    "from-purple-500 to-indigo-500",
    "from-red-500 to-pink-500",
    "from-green-500 to-emerald-500",
  ];
  return gradients[index % gradients.length];
};

const getMetricBg = (index) => {
  const backgrounds = [
    "bg-blue-100",
    "bg-orange-100",
    "bg-purple-100",
    "bg-red-100",
    "bg-green-100",
  ];
  return backgrounds[index % backgrounds.length];
};

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "active":
      return CheckCircle;
    case "pending":
      return Clock;
    case "cancelled":
    case "failed":
      return X;
    default:
      return AlertCircle;
  }
};

const getRiskIcon = (incidentCount) => {
  if (incidentCount >= 10) return AlertTriangle;
  if (incidentCount >= 5) return AlertCircle;
  return CheckCircle;
};

// Error handling functions
const clearError = () => {
  error.value = null;
};

const retryGeneration = () => {
  clearError();
  generateReport();
};

const refreshChart = (chartType) => {
  console.log("Refreshed Chart Clicked!");
};

// Utility functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDateRange = () => {
  // If custom dates are set, use them
  if (customStartDate.value && customEndDate.value) {
    return {
      startDate: customStartDate.value,
      endDate: customEndDate.value,
    };
  }

  const now = new Date();
  let startDate, endDate;

  switch (selectedPeriod.value) {
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
      break;
    case "yearly":
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = new Date();
      break;
    case "monthly":
    default:
      // FIXED: Use 90 days instead of 30 to capture more data
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90); // Changed from setMonth(-1)
      endDate = new Date();
      break;
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};
const getReportTitle = () => {
  const period =
    selectedPeriod.value.charAt(0).toUpperCase() +
    selectedPeriod.value.slice(1);
  const type =
    selectedReportType.value === "combined"
      ? "Comprehensive"
      : selectedReportType.value.charAt(0).toUpperCase() +
        selectedReportType.value.slice(1);
  return `${period} ${type} Report`;
};

const getKeyMetrics = () => {
  const metrics = [];
  if (showInventoryCharts.value && inventoryData.value) {
    metrics.push({
      label: "Total Items",
      value: inventoryData.value.summary?.totalItems || 0,
      icon: Package,
      iconColor: "text-blue-600",
      trend: "up",
      change: "+5.2%",
    });
    metrics.push({
      label: "Low Stock Items",
      value: inventoryData.value.summary?.totalLowStockItems || 0,
      icon: AlertTriangle,
      iconColor: "text-orange-600",
      trend: "down",
      change: "-2.1%",
    });
  }
  if (showInventoryCharts.value && deploymentData.value) {
    metrics.push({
      label: "Total Deployments",
      value: deploymentData.value.summary?.totalDeployments || 0,
      icon: Truck,
      iconColor: "text-purple-600",
      trend: "up",
      change: "+12.3%",
    });
  }
  if (showIncidentCharts.value && incidentData.value) {
    metrics.push({
      label: "Total Incidents",
      value: incidentData.value.summary?.totalIncidents || 0,
      icon: Shield,
      iconColor: "text-red-600",
      trend: "down",
      change: "-8.7%",
    });
    metrics.push({
      label: "Avg Response Time",
      value: `${Math.round(incidentData.value.summary?.avgResponseTime || 0)}m`,
      icon: Clock,
      iconColor: "text-green-600",
      trend: "down",
      change: "-15.4%",
    });
  }
  return metrics;
};

const getResolutionRate = () => {
  if (!incidentData.value?.summary) return 0;
  const total = incidentData.value.summary.totalIncidents;
  const resolved = incidentData.value.summary.resolvedIncidents || 0;
  return total > 0 ? Math.round((resolved / total) * 100) : 0;
};

const getPrimaryIncidentType = (types) => {
  if (!types) return "N/A";
  return types.split(",")[0] || "N/A";
};

const getRiskLevel = (incidentCount) => {
  if (incidentCount >= 10) return "High";
  if (incidentCount >= 5) return "Medium";
  return "Low";
};

const getRiskLevelClass = (incidentCount) => {
  if (incidentCount >= 10) return "bg-red-100 text-red-800";
  if (incidentCount >= 5) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
};

const getTopDeploymentLocation = () => {
  if (
    !deploymentData.value?.topLocations ||
    deploymentData.value.topLocations.length === 0
  ) {
    return "N/A";
  }
  return deploymentData.value.topLocations[0].deployment_location;
};

const getDeploymentStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "active":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Insight functions
const getInventoryInsight = () => {
  if (!inventoryData.value) return "No inventory data available.";
  const lowStockCount = inventoryData.value.summary?.totalLowStockItems || 0;
  const totalItems = inventoryData.value.summary?.totalItems || 0;
  if (lowStockCount === 0) {
    return "All inventory items are adequately stocked. Maintain current procurement schedule.";
  } else if (lowStockCount > totalItems * 0.2) {
    return `Critical: ${lowStockCount} items are low stock. Immediate restocking required to prevent operational disruption.`;
  } else {
    return `${lowStockCount} items need restocking. Schedule procurement to maintain optimal inventory levels.`;
  }
};

const getDeploymentInsight = () => {
  if (!deploymentData.value) return "No deployment data available.";
  const totalDeployments = deploymentData.value.summary?.totalDeployments || 0;
  const totalQuantity =
    deploymentData.value.summary?.totalQuantityDeployed || 0;
  if (totalDeployments === 0) {
    return "No deployments recorded during this period. Consider reviewing deployment schedules.";
  } else if (totalQuantity > 100) {
    return `High deployment activity: ${totalDeployments} deployments with ${totalQuantity} items deployed. Monitor equipment availability.`;
  } else {
    return `${totalDeployments} deployments completed successfully. Deployment operations are running smoothly.`;
  }
};

const getSecurityInsight = () => {
  if (!incidentData.value) return "No incident data available.";
  const totalIncidents = incidentData.value.summary?.totalIncidents || 0;
  const avgResponseTime = incidentData.value.summary?.avgResponseTime || 0;
  if (totalIncidents === 0) {
    return "No security incidents reported during this period. Continue monitoring protocols.";
  } else if (avgResponseTime > 30) {
    return `${totalIncidents} incidents with ${Math.round(
      avgResponseTime
    )}min avg response. Consider optimizing response procedures.`;
  } else {
    return `${totalIncidents} incidents handled efficiently with ${Math.round(
      avgResponseTime
    )}min avg response time.`;
  }
};

const getPerformanceInsight = () => {
  if (!responderData.value) return "Performance data being analyzed.";
  const avgResolutionRate = responderData.value.summary?.avgResolutionRate || 0;
  if (avgResolutionRate > 85) {
    return "Excellent team performance. Current protocols are highly effective.";
  } else if (avgResolutionRate > 70) {
    return "Good performance with room for improvement. Consider additional training opportunities.";
  } else {
    return "Performance below target. Review processes and provide additional support to team.";
  }
};

// API functions with enhanced error handling
const fetchInventoryReports = async (dateRange) => {
  try {
    loadingStep.value = "inventory data";
    const [summaryRes, deploymentsRes, batchRes, stockMovementRes] =
      await Promise.all([
        api
          .get(
            `${API_BASE}/inventory/summary?${new URLSearchParams(dateRange)}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch inventory summary",
            },
          })),
        api
          .get(
            `${API_BASE}/inventory/deployments?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch deployment data",
            },
          })),
        api
          .get(
            `${API_BASE}/inventory/batch-additions?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch batch data",
            },
          })),
        api
          .get(
            `${API_BASE}/inventory/stock-movements?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch stock movement data",
            },
          })),
      ]);

    const [summary, deployments, batches, stockMovement] = await Promise.all([
      summaryRes.data,
      deploymentsRes.data,
      batchRes.data,
      stockMovementRes.data,
    ]);

    if (summary.success) {
      inventoryData.value = summary.data;
      criticalItems.value = summary.data.reorderAlerts || [];
    } else if (summary.error) {
      throw new Error(summary.error);
    }

    if (deployments.success) {
      deploymentData.value = deployments.data;
      recentDeployments.value =
        deployments.data.deployments?.slice(0, 10) || [];
    } else if (deployments.error) {
      console.warn("Deployment data unavailable:", deployments.error);
    }

    if (stockMovement.success) {
      stockMovementData.value = stockMovement.data;
    } else if (stockMovement.error) {
      console.warn("Stock movement data unavailable:", stockMovement.error);
    }
  } catch (error) {
    console.error("Error fetching inventory reports:", error);
    throw error;
  }
};

const fetchIncidentReports = async (dateRange) => {
  try {
    loadingStep.value = "incident data";
    const [summaryRes, locationsRes, resolvedRes, responderRes] =
      await Promise.all([
        api
          .get(
            `${API_BASE}/incidents/summary?${new URLSearchParams({
              ...dateRange,
              period: selectedPeriod.value,
            })}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch incident summary",
            },
          })),
        api
          .get(
            `${API_BASE}/incidents/top-locations?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch location data",
            },
          })),
        api
          .get(
            `${API_BASE}/incidents/resolved-vs-unresolved?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch resolution data",
            },
          })),
        api
          .get(
            `${API_BASE}/incidents/responder-performance?${new URLSearchParams(
              dateRange
            )}`
          )
          .catch((err) => ({
            data: {
              success: false,
              error: err.message || "Failed to fetch performance data",
            },
          })),
      ]);

    const [summary, locations, resolved, responder] = await Promise.all([
      summaryRes.data,
      locationsRes.data,
      resolvedRes.data,
      responderRes.data,
    ]);

    if (summary.success) {
      incidentData.value = summary.data;
    } else if (summary.error) {
      throw new Error(summary.error);
    }

    if (locations.success) {
      topIncidentLocations.value = locations.data.topLocationsByCount || [];
    } else if (locations.error) {
      console.warn("Location data unavailable:", locations.error);
    }

    if (responder.success) {
      responderData.value = responder.data;
    } else if (responder.error) {
      console.warn("Responder data unavailable:", responder.error);
    }
  } catch (error) {
    console.error("Error fetching incident reports:", error);
    throw error;
  }
};

const generateReport = async () => {
  loading.value = true;
  error.value = null;
  try {
    const dateRange = getDateRange();
    if (
      selectedReportType.value === "combined" ||
      selectedReportType.value === "inventory"
    ) {
      await fetchInventoryReports(dateRange);
    }
    if (
      selectedReportType.value === "combined" ||
      selectedReportType.value === "incidents"
    ) {
      await fetchIncidentReports(dateRange);
    }
    loadingStep.value = "generating charts";
    reportData.value = {
      generatedAt: new Date(),
      period: selectedPeriod.value,
      reportType: selectedReportType.value,
      dateRange,
    };

    // Wait for DOM updates then create charts
    await nextTick();
    setTimeout(createCharts, 100);
  } catch (err) {
    console.error("Error generating report:", err);
    error.value = err.message || "Failed to generate report. Please try again.";
  } finally {
    loading.value = false;
    loadingStep.value = "";
  }
};

const createCharts = () => {
  // Destroy existing charts
  Object.values(chartInstances.value).forEach((chart) => {
    if (chart) chart.destroy();
  });
  chartInstances.value = {};

  if (showInventoryCharts.value && inventoryData.value) {
    createInventoryChart();
    createStockMovementChart();
  }

  if (showInventoryCharts.value && deploymentData.value) {
    createDeploymentChart();
    createDeploymentStatusChart();
  }

  if (showIncidentCharts.value && incidentData.value) {
    createIncidentChart();
    createPerformanceChart();
  }
};

const createInventoryChart = () => {
  if (!inventoryChart.value || !inventoryData.value?.itemsByCategory) return;

  const ctx = inventoryChart.value.getContext("2d");
  chartInstances.value.inventory = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: inventoryData.value.itemsByCategory.map(
        (item) => item.categoryName
      ),
      datasets: [
        {
          data: inventoryData.value.itemsByCategory.map(
            (item) => item.itemCount
          ),
          backgroundColor: [
            "#3B82F6",
            "#EF4444",
            "#10B981",
            "#F59E0B",
            "#8B5CF6",
            "#EC4899",
            "#06B6D4",
            "#84CC16",
          ],
          borderWidth: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
    },
  });
};

const createIncidentChart = () => {
  if (!incidentChart.value || !incidentData.value?.incidentsByType) return;

  const ctx = incidentChart.value.getContext("2d");
  chartInstances.value.incident = new Chart(ctx, {
    type: "pie",
    data: {
      labels: incidentData.value.incidentsByType.map((item) => item.type),
      datasets: [
        {
          data: incidentData.value.incidentsByType.map((item) => item.count),
          backgroundColor: [
            "#EF4444",
            "#F59E0B",
            "#3B82F6",
            "#10B981",
            "#8B5CF6",
            "#EC4899",
            "#06B6D4",
            "#84CC16",
          ],
          borderWidth: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
    },
  });
};

const createDeploymentChart = () => {
  if (!deploymentChart.value || !deploymentData.value?.topLocations) return;

  const ctx = deploymentChart.value.getContext("2d");
  chartInstances.value.deployment = new Chart(ctx, {
    type: "bar",
    data: {
      labels: deploymentData.value.topLocations.map(
        (item) => item.deployment_location
      ),
      datasets: [
        {
          label: "Deployments",
          data: deploymentData.value.topLocations.map(
            (item) => item.deploymentCount
          ),
          backgroundColor: "rgba(139, 92, 246, 0.8)",
          borderColor: "#8B5CF6",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        y: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
};

const createDeploymentStatusChart = () => {
  if (!deploymentStatusChart.value || !deploymentData.value?.deploymentStats)
    return;

  const ctx = deploymentStatusChart.value.getContext("2d");
  const statusData = deploymentData.value.deploymentStats.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + parseInt(item.count);
      return acc;
    },
    {}
  );

  chartInstances.value.deploymentStatus = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [
        {
          data: Object.values(statusData),
          backgroundColor: [
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#3B82F6",
            "#8B5CF6",
          ],
          borderWidth: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
    },
  });
};

const createStockMovementChart = () => {
  if (!stockMovementChart.value || !stockMovementData.value?.movementSummary)
    return;

  const ctx = stockMovementChart.value.getContext("2d");
  const deployed = stockMovementData.value.movementSummary.find(
    (item) => item.type === "DEPLOYED"
  );
  const replenished = stockMovementData.value.movementSummary.find(
    (item) => item.type === "REPLENISHED"
  );

  chartInstances.value.stockMovement = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Deployed", "Replenished"],
      datasets: [
        {
          label: "Quantity",
          data: [deployed?.totalQuantity || 0, replenished?.totalQuantity || 0],
          backgroundColor: [
            "rgba(239, 68, 68, 0.8)",
            "rgba(16, 185, 129, 0.8)",
          ],
          borderColor: ["#EF4444", "#10B981"],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
};

const createPerformanceChart = () => {
  if (!performanceChart.value || !incidentData.value?.incidentsByTime) return;

  const ctx = performanceChart.value.getContext("2d");
  chartInstances.value.performance = new Chart(ctx, {
    type: "line",
    data: {
      labels: incidentData.value.incidentsByTime.map((item) => item.timePeriod),
      datasets: [
        {
          label: "Incidents",
          data: incidentData.value.incidentsByTime.map((item) => item.count),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
};

const exportReport = () => {
  if (!hasReportData.value) return;

  // Create export data
  const exportData = {
    reportTitle: getReportTitle(),
    generatedAt: reportData.value.generatedAt,
    period: selectedPeriod.value,
    reportType: selectedReportType.value,
    keyMetrics: getKeyMetrics(),
    insights: {
      inventory: getInventoryInsight(),
      deployment: getDeploymentInsight(),
      security: getSecurityInsight(),
      performance: getPerformanceInsight(),
    },
    criticalItems: criticalItems.value,
    recentDeployments: recentDeployments.value,
    topIncidentLocations: topIncidentLocations.value,
  };

  // Create and download JSON file
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getReportTitle().replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Watchers
watch([selectedPeriod, selectedReportType], () => {
  // Reset data when configuration changes
  reportData.value = null;
  inventoryData.value = null;
  incidentData.value = null;
  stockMovementData.value = null;
  deploymentData.value = null;
  responderData.value = null;
  topIncidentLocations.value = [];
  criticalItems.value = [];
  recentDeployments.value = [];
  error.value = null;
});

// Set default date range on mount
onMounted(() => {
  const dateRange = getDateRange();
  customStartDate.value = dateRange.startDate;
  customEndDate.value = dateRange.endDate;
});
</script>

<style scoped>
/* Enhanced scrollbar styling */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0);
  border-radius: 4px;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #cbd5e1, #94a3b8);
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}
.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, #94a3b8, #64748b);
}

/* Custom animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes countUp {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out forwards;
}
.animate-countUp {
  animation: countUp 0.8s ease-out forwards;
}

/* Glassmorphism effect */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

/* Enhanced hover effects */
.group:hover .group-hover\:scale-105 {
  transform: scale(1.05);
}

/* Custom gradient text */
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}

/* Enhanced shadows */
.shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Loading animation */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Smooth transitions */
* {
  transition-property: color, background-color, border-color,
    text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter,
    backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>
