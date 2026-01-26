// Overview data - aggregates from all brands
// TODO: Replace mock data with real API calls

export async function getOverviewData() {
  // This will eventually call WooCommerce APIs for all three stores
  // and aggregate the results
  
  return {
    metrics: [
      { label: 'Total Revenue (All Brands)', value: '£847,230', change: '+6.8%', changeType: 'positive', status: 'good' },
      { label: 'Fireblood Revenue', value: '£712,154', change: '+8.2%', changeType: 'positive', status: 'good', color: '#FF4757' },
      { label: 'Gtop Revenue', value: '£98,420', change: '+3.1%', changeType: 'positive', status: 'warning', color: '#00E676' },
      { label: 'DNG Revenue', value: '£36,656', change: '-12.4%', changeType: 'negative', status: 'warning', color: '#AA80FF' },
      { label: 'Total Customers', value: '14,892', change: '+892', changeType: 'positive', status: 'good' },
      { label: 'Blended CAC', value: '£16.40', change: '+£1.80', changeType: 'negative', status: 'warning' },
    ],
    revenueTrend: [
      { month: 'Jul', fireblood: 580000, gtop: 112800, dng: 8200, total: 701000 },
      { month: 'Aug', fireblood: 612000, gtop: 106400, dng: 6800, total: 725200 },
      { month: 'Sep', fireblood: 645000, gtop: 102800, dng: 7400, total: 755200 },
      { month: 'Oct', fireblood: 668000, gtop: 101200, dng: 18240, total: 787440 },
      { month: 'Nov', fireblood: 690000, gtop: 99800, dng: 5200, total: 795000 },
      { month: 'Dec', fireblood: 712154, gtop: 98420, dng: 36656, total: 847230 },
    ],
    brandBreakdown: [
      { name: 'Fireblood', value: 712154, color: '#FF4757' },
      { name: 'Gtop', value: 98420, color: '#00E676' },
      { name: 'DNG', value: 36656, color: '#AA80FF' },
    ],
  };
}
