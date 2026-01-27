import { NextResponse } from 'next/server';
import { getOverviewData } from '@/lib/data/overview';
import { getFirebloodData } from '@/lib/data/fireblood';
import { getGtopData } from '@/lib/data/gtop';
import { getDngData } from '@/lib/data/dng';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'overview';
  const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'year';
  
  try {
    let data;
    
    switch (tab) {
      case 'overview':
        data = await getOverviewData(period);
        break;
      case 'fireblood':
        data = await getFirebloodData(period);
        break;
      case 'gtop':
        data = await getGtopData(period);
        break;
      case 'dng':
        data = await getDngData(period);
        break;
      default:
        data = await getOverviewData(period);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
