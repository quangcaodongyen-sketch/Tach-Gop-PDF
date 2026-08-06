import { STORAGE_KEY } from '../components/ApiKeyModal';

export const SELECTED_MODEL_KEY = 'pdfpro_selected_model';

// Fallback models chain
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

export interface GeminiAnalyzeParams {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
}

/**
 * Call Gemini API directly from Client-Side with fallback and retry logic.
 */
export async function analyzeWithGemini(params: GeminiAnalyzeParams): Promise<string> {
  const apiKey = localStorage.getItem(STORAGE_KEY) || '';
  if (!apiKey) {
    throw new Error('API Key Gemini chưa được cấu hình. Vui lòng nhập API Key để sử dụng.');
  }

  // Get current selected model, default to 'gemini-3-flash-preview'
  const selectedModel = localStorage.getItem(SELECTED_MODEL_KEY) || 'gemini-3-flash-preview';

  // Construct our queue of models to try
  const modelsToTry = [
    selectedModel,
    ...FALLBACK_MODELS.filter(m => m !== selectedModel)
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini API] Đang thử kết nối bằng model: ${model}`);
      
      const contentsParts: any[] = [];
      if (params.prompt) {
        contentsParts.push({ text: params.prompt });
      }
      if (params.imageBase64) {
        contentsParts.push({
          inlineData: {
            data: params.imageBase64,
            mimeType: params.mimeType || 'image/jpeg'
          }
        });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: contentsParts
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Lỗi HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Không nhận được dữ liệu văn bản từ API.');
      }

      return text;
    } catch (err: any) {
      console.warn(`[Gemini API] Thử model ${model} thất bại:`, err.message || err);
      lastError = err;
      
      if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid'))) {
        throw new Error('API Key của bạn không hợp lệ hoặc đã bị vô hiệu hoá. Vui lòng kiểm tra lại cấu hình.');
      }
    }
  }

  const errorMsg = lastError?.message || 'Lỗi kết nối Google API';
  if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota') || errorMsg.includes('Quota')) {
    throw new Error('API Key này đã hết quota sử dụng hôm nay. Vui lòng dán API key của Gmail khác vào để tiếp tục hoặc chờ đến ngày mai.');
  }
  
  throw new Error(`Xử lý thất bại sau khi thử tất cả model. Chi tiết lỗi: ${errorMsg}`);
}
