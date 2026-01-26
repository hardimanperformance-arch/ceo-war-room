import { NextResponse } from 'next/server';
import { getOverviewData } from '@/lib/data/overview';
import { getFirebloodData } from '@/lib/data/fireblood';
import { getGtopData } from '@/lib/data/gtop';
import { getDngData } from '@/lib/data/dng';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'overview';
  
  try {
    let data;
    
    switch (tab) {
      case 'overview':
        data = await getOverviewData();
        break;
      case 'fireblood':
        data = await getFirebloodData();
        break;
      case 'gtop':
        data = await getGtopData();
        break;
      case 'dng':
        data = await getDngData();
        break;
      default:
        data = await getOverviewData();
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
