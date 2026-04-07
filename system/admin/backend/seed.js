const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const connectMongo = require('./src/config/db');
const SecurityLog = require('./src/models/nosql/SecurityLog');

async function main() {
    console.log('⏳ Đang kết nối Database...');
    await connectMongo(); // Kết nối MongoDB

    console.log('🧹 Đang dọn dẹp dữ liệu cũ (nếu có)...');
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();
    await prisma.networkRule.deleteMany();
    await SecurityLog.deleteMany();

    console.log('🏢 Đang tạo Network Rule (IP Công ty)...');
    await prisma.networkRule.create({
        data: {
            locationName: 'Trụ sở chính STU',
            allowedIp: '192.168.1.100' // IP chuẩn để so sánh
        }
    });

    console.log('👨‍💼 Đang tạo Sếp và Thiết bị (Hợp lệ)...');
    await prisma.user.create({
        data: {
            employeeId: 'BOSS001',
            fullName: 'CEO Nguyễn Văn Sếp',
            email: 'boss@company.com',
            department: 'Ban Giám Đốc',
            role: 'ADMIN',
            devices: {
                create: {
                    deviceId: 'MAC-001-BOSS', // Trùng khớp với agent_boss.exe
                    deviceName: 'Dell XPS 15',
                    isRemoteAllowed: true // Sếp có đặc quyền ra ngoài mạng
                }
            }
        }
    });

    console.log('🧑‍💻 Đang tạo Nhân viên và Thiết bị...');
    await prisma.user.create({
        data: {
            employeeId: 'DEV001',
            fullName: 'Đỗ Tiến Đăng Khoa',
            email: 'dh52300866@student.stu.edu.vn',
            department: 'IT Support',
            devices: {
                create: {
                    deviceId: 'MAC-002-DEV', // Trùng khớp với agent_dev.exe
                    deviceName: 'ThinkPad T14',
                    isRemoteAllowed: false // Không được phép dùng IP lạ
                }
            }
        }
    });

    console.log('📝 Đang ghi thử 1 Log vào MongoDB...');
    await SecurityLog.create({
        device_id: 'SYSTEM',
        ip_address: '127.0.0.1',
        status: 'SAFE',
        message: 'Hệ thống Zero Trust khởi tạo và nạp dữ liệu thành công',
        action_taken: 'System_Init'
    });

    console.log('✅ BƠM DỮ LIỆU MẪU THÀNH CÔNG! ĐÃ SẴN SÀNG TEST.');
}

main()
    .catch((e) => {
        console.error('❌ Có lỗi xảy ra:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });