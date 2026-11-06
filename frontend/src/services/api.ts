import { 
  User, 
  RFQListItem, 
  RFQDetail, 
  Bid, 
  LeaderboardResponse, 
  ActivityLog, 
  AuctionConfig 
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || JSON.stringify(data);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async listSuppliers(): Promise<{ id: string; email: string; full_name: string; carrier_name: string }[]> {
    const res = await fetch(`${API_BASE_URL}/auth/suppliers`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // RFQs
  async listRFQs(status?: string): Promise<RFQListItem[]> {
    const url = status 
      ? `${API_BASE_URL}/rfqs?status_filter=${status}` 
      : `${API_BASE_URL}/rfqs`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getRFQ(id: string): Promise<RFQDetail> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createRFQ(data: {
    name: string;
    description?: string;
    service_type: string;
    pickup_location: string;
    destination: string;
    pickup_at: string;
    bid_start_at: string;
    initial_close_at: string;
    forced_close_at: string;
    enable_british_auction: boolean;
    auction_config?: AuctionConfig;
    invited_supplier_ids: string[];
  }): Promise<RFQDetail> {
    const res = await fetch(`${API_BASE_URL}/rfqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async publishRFQ(id: string): Promise<RFQDetail> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${id}/publish`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async inviteSuppliers(rfqId: string, supplierIds: string[]): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(supplierIds),
    });
    return handleResponse(res);
  },

  // Bidding
  async submitBid(rfqId: string, data: {
    freight_charges: number;
    origin_charges: number;
    destination_charges: number;
    transit_days: number;
    validity_days: number;
  }): Promise<Bid> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getBids(rfqId: string): Promise<Bid[]> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/bids`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getMyBids(rfqId: string): Promise<Bid[]> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/my-bids`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Auction Realtime Data
  async getLeaderboard(rfqId: string): Promise<LeaderboardResponse> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/leaderboard`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getActivityLogs(rfqId: string): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/activity`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },
};
