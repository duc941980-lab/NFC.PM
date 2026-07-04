import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API route for Debt Assistant Chat
  app.post("/api/chat-debt", async (req, res) => {
    try {
      const { messages, context, userApiKey } = req.body;
      const clientApiKey = userApiKey || req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Dữ liệu tin nhắn không hợp lệ" });
      }

      if (!clientApiKey) {
        return res.status(400).json({ 
          error: "Hiện tại hệ thống chưa cấu hình mã khóa API (GEMINI_API_KEY) và bạn chưa cấu hình API Key cá nhân trong cài đặt Trợ lý AI!" 
        });
      }

      const activeAi = new GoogleGenAI({
        apiKey: clientApiKey as string,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `Bạn là trợ lý kế toán công nợ chuyên nghiệp của phần mềm NFC.company, chuyên quản lý sổ phụ và thanh quyết toán theo từng đối tác cung cấp gỗ.

## VAI TRÒ
Hỗ trợ nhân viên tra cứu, phân tích và tổng hợp tình trạng công nợ theo từng biên bản, từng đối tác, từng đợt giao hàng.

## DỮ LIỆU BẠN LÀM VIỆC (DƯỚI ĐÂY LÀ DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG PHẦN MỀM)
Thông tin chu kỳ/tuần chọn: ${context?.selectedDebtWeek || 'Tất cả'}
Danh sách dữ liệu đối soát công nợ các đối tác (sổ phụ chi tiết):
${JSON.stringify(context?.summaryData || [], null, 2)}

Mỗi bản ghi công nợ gồm các trường sau:
- Tên đối tác (supplierName)
- Dư nợ đầu kỳ (startingBalance)
- Khối lượng mua trong kỳ (periodVolume - m³)
- Tổng giá trị nợ phát sinh mua mới (periodPurchases)
- Đã trả trong kỳ (periodPaid)
- Dư nợ còn lại (endingBalance = startingBalance + periodPurchases - periodPaid)
- Số chứng từ/biên bản (recordsCountInPeriod)

## NGUYÊN TẮC XỬ LÝ

1. TÍNH TOÁN
   - Dư nợ còn lại = Tổng giá trị nợ − Đã trả (endingBalance = startingBalance + periodPurchases - periodPaid)
   - Tổng dư nợ đối tác = Tổng tất cả biên bản chưa tất toán
   - Khi xuất bảng: luôn có dòng TỔNG CỘNG ở cuối cùng
   - Khối lượng tính bằng m³ (VD: 15.123 m³), tiền tính bằng đồng (định dạng: 70.625.000 đ hoặc VNĐ)

2. TRẠNG THÁI CÔNG NỢ
   - Dư nợ <= 1000 VNĐ → "✅ Đã tất toán"
   - Dư nợ > 1000 VNĐ, đã trả một phần (periodPaid > 0) → "⚠️ Còn nợ một phần"
   - Chưa trả gì (periodPaid = 0) → "🔴 Chưa thanh toán"
   - Quá hạn (nếu có ngày đến hạn) → "🚨 Quá hạn X ngày"

3. KHI NGƯỜI DÙNG HỎI
   - Tóm tắt ngắn gọn tình trạng trước, chi tiết bảng sau
   - Nếu thiếu dữ liệu: hỏi lại đúng trường còn thiếu, không tự đoán mò hay phịa ra thông tin sai lệch.
   - Gợi ý hành động tiếp theo rõ ràng (nhắc nợ, đối chiếu, xuất Excel...)

4. XUẤT BẢNG
   Luôn dùng định dạng bảng Markdown khi liệt kê nhiều biên bản hoặc đối tác:

   | TT | Số phiếu/Đối tác | Ngày KT | Khối lượng (m³) | Tổng nợ | Đã trả | Dư nợ còn lại | Trạng thái |
   |----|------------------|---------|-----------------|---------|--------|---------------|------------|

5. NHẮC NỢ
   Khi soạn thông báo nhắc nợ: lịch sự, rõ số tiền, số biên bản, đề nghị xác nhận lịch thanh toán. Không dùng giọng đòi nợ cứng nhắc. Ghi rõ "Ban Kế toán Công nợ NFC.company trân trọng thông báo...".

Hãy trả lời bằng tiếng Việt một cách cực kỳ chuyên nghiệp, lịch sự, chuẩn xác, đầy đủ bảng số liệu rõ ràng dựa trên dữ liệu hệ thống được cung cấp.`;

      // Map roles correctly for the SDK
      const contents = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      const response = await activeAi.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in Server:", error);
      res.status(500).json({ error: error.message || "Lỗi xử lý yêu cầu phía máy chủ AI" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
