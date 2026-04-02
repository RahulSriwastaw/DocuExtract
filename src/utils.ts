/**
 * Safely parses JSON from a fetch Response object.
 * Handles cases where the response might be HTML (e.g., Cloudflare errors or 404s).
 */
export async function safeJson(res: Response) {
  try {
    const contentType = res.headers.get("content-type");
    
    // If it's JSON, parse it normally
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    
    // If not JSON, it might be an HTML error page or plain text
    const text = await res.text();
    
    // Check if it's HTML
    if (text.includes("<!doctype") || text.includes("<html")) {
      // Check for Cloudflare specific errors
      if (text.includes("Error code 522")) {
        return { 
          error: "Database connection timeout (Cloudflare 522). Your Supabase project might be paused or experiencing high latency.",
          isPaused: true 
        };
      }
      
      // Generic HTML error
      return { 
        error: `The server returned an HTML response instead of JSON (Status: ${res.status}). This often happens during server errors or if the API endpoint is incorrect.` 
      };
    }
    
    // If it's just plain text, return it as an error or wrap it
    return { 
      error: text || `Unexpected response format: ${contentType || 'unknown'} (Status: ${res.status})` 
    };
  } catch (e: any) {
    return { 
      error: `Failed to process server response: ${e.message}` 
    };
  }
}
