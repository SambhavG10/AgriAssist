export interface AIAdvisoryData {
    sowing: string;
    harvest: string;
    irrigation: string;
    stages: string[];
    diseases: string[];
}

export const fetchAIAdvisory = async (crop: string, location: string): Promise<AIAdvisoryData> => {
    try {
        const response = await fetch('/api/advisory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ crop, location }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as AIAdvisoryData;
    } catch (error) {
        console.error("Error fetching AI advisory:", error);
        throw error;
    }
};
