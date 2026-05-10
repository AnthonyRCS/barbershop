import { platformDashboardRepository } from "./platform-dashboard.repository.js";

export const platformDashboardService = {
  async getMetrics() {
    const [metrics, planDistribution] = await Promise.all([
      platformDashboardRepository.getGlobalMetrics(),
      platformDashboardRepository.getPlanDistribution(),
    ]);
    return { ...metrics, planDistribution };
  },

  async getGrowth() {
    return platformDashboardRepository.getMonthlyGrowth();
  },

  async getRecentActivity() {
    const [recentBusinesses, recentActivity] = await Promise.all([
      platformDashboardRepository.getRecentBusinesses(),
      platformDashboardRepository.getRecentActivity(),
    ]);
    return { recentBusinesses, recentActivity };
  },
};
