import { supabase } from "@/integrations/supabase/client";

export interface MarketRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
}

export interface MarketResponse {
  records: MarketRecord[];
  total: number;
  count: number;
  limit: string;
  offset: string;
}

export const fetchMarketPrices = async (limit = 100, offset = 0): Promise<MarketRecord[]> => {
  try {
    // Invoke the 'get-prices' Edge Function which reads from Redis cache
    const { data, error } = await supabase.functions.invoke('get-prices');

    if (error) {
      console.error("Error fetching market data from Redis cache:", error);
      // Fallback to empty array or handle error appropriately
      return [];
    }

    // Safely parse data if the Edge Function returns it as a string (e.g. Content-Type mismatch)
    let parsedData = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse stringified market data:", e);
      }
    }

    if (parsedData && Array.isArray(parsedData)) {
      return parsedData as MarketRecord[];
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch market prices:", error);
    return [];
  }
};
