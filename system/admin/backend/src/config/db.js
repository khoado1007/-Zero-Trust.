const mongoose = require('mongoose');

const connectMongo = async () => {
    try {
        // Chốt cứng đường link chuẩn nhất, bỏ qua .env
        const URI = process.env.MONGO_URI;
        
        console.log("⏳ Đang cắm cáp thẳng vào MongoDB tại:", URI);
        
        await mongoose.connect(URI, {
            serverSelectionTimeoutMS: 3000 // Rút ngắn thời gian chờ xuống 3s
        });
        
        console.log("✅ [SUCCESS] MONGODB ĐÃ KẾT NỐI HOÀN HẢO!");
    } catch (error) {
        console.error("❌ [CRITICAL ERROR] Không thể vào được MongoDB:", error.message);
        // ÉP SERVER TỰ SÁT NẾU LỖI DB ĐỂ KHÔNG BỊ "GIẤU BỆNH" NỮA
        process.exit(1); 
    }
};

module.exports = connectMongo;