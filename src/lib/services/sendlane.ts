// Sendlane API Service

export class SendlaneService {
  private apiKey: string;
  private baseUrl = 'https://api.sendlane.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Sendlane API error: ${response.status}`);
    }

    return response.json();
  }

  async getLists() {
    return this.fetch('/lists');
  }

  async getListStats(listId: string) {
    return this.fetch(`/lists/${listId}`);
  }

  async getTotalSubscribers() {
    try {
      const lists = await this.getLists();
      let total = 0;
      
      if (lists.data && Array.isArray(lists.data)) {
        total = lists.data.reduce((sum: number, list: any) => {
          return sum + (list.subscriber_count || list.active_count || 0);
        }, 0);
      }
      
      return { totalSubscribers: total, lists: lists.data };
    } catch (error) {
      console.error('Sendlane fetch error:', error);
      return null;
    }
  }
}

export function getSendlane(): SendlaneService | null {
  const apiKey = process.env.SENDLANE_API_KEY;
  
  if (!apiKey) {
    console.log('Sendlane not configured');
    return null;
  }
  
  return new SendlaneService(apiKey);
}
