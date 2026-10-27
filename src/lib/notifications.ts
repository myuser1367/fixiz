import { supabase } from './supabase';

// ============================================================================
// 🎛 کلید تغییر حالت ارسال پیامک (آزمایشی / واقعی)
// اگر true باشد: پیامک ارسال نمی‌شود و فقط در کنسول مرورگر نمایش داده می‌شود (حالت تست)
// اگر false باشد: پیامک‌ها به صورت واقعی به پنل ملی‌پیامک ارسال می‌شوند.
// ============================================================================
const IS_SIMULATION_MODE = true; 


export interface NotificationData {
  trackingCode: string;
  userMobile: string;
}

export interface UserNotificationData {
  trackingCode: string;
  userMobile: string;
  status: string;
  price?: string | null;
}

interface SmsParams {
  mobile: string | number;
  text?: string;
  bodyId?: number;
  args?: string[];
  logTag: string;
}

const sentSmsCache = new Map<string, number>();

async function getSmsConfig() {
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error || !data) return null;

    const settings = Object.fromEntries(data.map((d) => [d.key, d.value]));

    return {
      apiKey: settings.sms_api_key,
      sender: settings.sms_sender_number,
      adminPhone: settings.admin_mobile,
    };
  } catch (err) {
    console.error('خطا در دریافت تنظیمات پیامک:', err);
    return null;
  }
}

async function sendRealSMS(params: SmsParams) {
  if (!params.mobile) return;
  
  let formattedMobile = String(params.mobile).replace(/[^\d]/g, '');
  if (formattedMobile.startsWith('98')) {
    formattedMobile = '0' + formattedMobile.substring(2);
  } else if (!formattedMobile.startsWith('0') && formattedMobile.length === 10) {
    formattedMobile = '0' + formattedMobile;
  }

  if (formattedMobile.length !== 11) {
    console.warn(`شماره موبایل نامعتبر است: ${formattedMobile}`);
    return;
  }

  // جلوگیری از ارسال تکراری در فاصله کمتر از ۱۰ ثانیه
  const cacheKey = `${formattedMobile}_${params.bodyId}_${params.args?.join('')}`;
  const now = Date.now();
  if (sentSmsCache.has(cacheKey) && (now - sentSmsCache.get(cacheKey)!) < 10000) {
    return;
  }
  sentSmsCache.set(cacheKey, now);

  // === حالت شبیه‌سازی ===
  if (IS_SIMULATION_MODE) {
    console.log(`\n💬 [پیامک شبیه‌سازی شده - ${params.logTag}]`);
    console.log(`📱 ارسال به: ${formattedMobile}`);
    console.log(`📝 کد الگو: ${params.bodyId} | متغیرها:`, params.args);
    console.log('--------------------------------------------------\n');
    return; // در حالت تست، ادامه کد و ارسال واقعی متوقف می‌شود
  }

  // === حالت ارسال واقعی پیامک ===
  const config = await getSmsConfig();
  if (!config || !config.apiKey) {
    console.warn(`⚠️ [${params.logTag}] پیامک ارسال نشد: تنظیمات API در دیتابیس تکمیل نیست.`);
    return;
  }

 try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '09362476933', // نام کاربری ورود به پنل ملی‌پیامک شما
        apiKey: config.apiKey, 
        sender: config.sender,
        mobile: formattedMobile,
        text: params.text,
        bodyId: params.bodyId,
        args: params.args
      }),
    });
    
    const result = await response.json();
    console.log(" پاسخ سرور ملی پیامک:", result); // <-- این خط را اضافه کنید تا نتیجه را ببینیم

    if (!response.ok || result.RetStatus < 0) {
        console.error(" خطا در ارسال پیامک از طریق پترن:", result);
    }
  } catch (error) {
    console.error(`🚨 [NETWORK ERROR - ${params.logTag}] خطا در ارتباط با سرور:`, error);
  }
 }
// ۱. ارسال پیامک کد تایید (OTP) - کد الگو: 569556
export async function sendOtpSMS(mobile: string, code: string) {
  await sendRealSMS({
    mobile: mobile,
    bodyId: 569556, 
    args: [code], // {0} -> کد تایید
    logTag: 'OTP_LOGIN'
  });
}

// ارسال اعلان‌های تغییر وضعیت بر اساس الگوهای تایید شده
export async function sendUserNotification(data: UserNotificationData) {
  // ۲. الگوی پذیرش و درخواست ارسال دستگاه (زمانی که سرپرست دستگاه را پذیرش می‌کند) - کد الگو: 569559
  if (data.status === 'accepted_waiting_device' || data.status === 'waiting_for_device') {
    await sendRealSMS({ 
      mobile: data.userMobile, 
      bodyId: 569559, 
      args: [data.trackingCode], // {0} -> کد پیگیری
      logTag: 'NOTIFY_ACCEPTED_SEND_DEVICE' 
    });
    return;
  }

  // ۳. الگوی برآورد هزینه (نیاز به تایید مشتری در پنل کاربری) - کد الگو: 569557
  if (data.status === 'pending_customer_approval') {
    await sendRealSMS({ 
      mobile: data.userMobile, 
      bodyId: 569557, 
      args: [data.trackingCode], // {0} -> کد پیگیری
      logTag: 'NOTIFY_ESTIMATE_APPROVAL' 
    });
    return;
  }

  // ۴. الگوی صدور فاکتور نهایی - کد الگو: 570068
  if (data.status === 'invoiced' && data.price) {
    // حذف ویرگول‌های احتمالی در مبلغ ارسالی از فرانت‌اند تا فقط عدد خالص بماند
    const cleanPrice = String(data.price).replace(/,/g, '');
    
    await sendRealSMS({ 
      mobile: data.userMobile, 
      bodyId: 570068, 
      args: [data.trackingCode, cleanPrice], // {0} -> کد پیگیری | {1} -> مبلغ فاکتور
      logTag: 'NOTIFY_INVOICED' 
    });
    return;
  }
}

export async function sendAdminNotifications(_data?: NotificationData) {
  try {
    // دریافت شماره موبایل پرسنلی که *فقط* نقش واحد هماهنگی (coordinator) دارند
    const { data: personnel, error } = await supabase
      .from('personnel_users')
      .select('phone, role, full_name')
      .eq('role', 'coordinator'); 

    if (error || !personnel || personnel.length === 0) {
      return;
    }

    // ارسال پیامک برای تک‌تک شماره‌های پیدا شده در واحد هماهنگی (در صورت وجود الگوی تایید شده برای مدیران)
    // برای استفاده از این بخش باید یک الگوی جدید در پنل پیامک بسازید. فعلاً غیرفعال است.
    /*
    for (const person of personnel) {
      if (person.phone) {
        await sendRealSMS({
          mobile: person.phone,
          bodyId: XXXXXX, // کد الگوی اطلاع به ادمین (در صورت ساخت)
          args: [data.trackingCode], 
          logTag: `ADMIN_NEW_REQUEST_TO_${person.role.toUpperCase()}`
        });
      }
    }
    */
  } catch (err) {
    console.error("خطای غیرمنتظره در ارسال پیامک هماهنگی:", err);
  }
}