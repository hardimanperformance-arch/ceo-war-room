import { NextResponse } from 'next/server';
import { getOverviewData } from '../../../lib/data/overview';
import { getFirebloodData } from '../../../lib/data/fireblood';
import { getGtopData } from '../../../lib/data/gtop';
import { getDngData } from '../../../lib/data/dng';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'overview';
  const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'year' | 'custom';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  
  const dateRange = period === 'custom' && startDate && endDate 
    ? { start: startDate, end: endDate }
    : undefined;
  
  try {
    let data;
    
    switch (tab) {
      case 'overview':
        data = await getOverviewData(period, dateRange);
        break;
      case 'fireblood':
        data = await getFirebloodData(period, dateRange);
        break;
      case 'gtop':
        data = await getGtopData(period, dateRange);
        break;
      case 'dng':
        data = await getDngData(period, dateRange);
        break;
      default:
        data = await getOverviewData(period, dateRange);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
