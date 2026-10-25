// src/lib/notifications.ts
import { supabase } from './supabase';

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
  
  const config = await getSmsConfig();
  if (!config || !config.apiKey) {
    console.warn(`⚠️ [${params.logTag}] پیامک ارسال نشد: تنظیمات تکمیل نیست.`);
    return;
  }

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

  const cacheKey = `${formattedMobile}_${params.bodyId}_${params.args?.join('')}`;
  const now = Date.now();
  if (sentSmsCache.has(cacheKey) && (now - sentSmsCache.get(cacheKey)!) < 10000) {
    return;
  }
  sentSmsCache.set(cacheKey, now);

  // =========================================================================
  // حالت شبیه‌سازی (فعلا پیامک واقعی ارسال نمی‌شود)
  // وقتی خواستید پیامک واقعی فعال شود، خطوط مربوط به console.log را پاک کنید
  // و کامنت کدهای fetch را بردارید.
  // =========================================================================
  console.log(`💬 [SIMULATED SMS - ${params.logTag}]`);
  console.log(`📱 To: ${formattedMobile}`);
  console.log(`📝 BodyID: ${params.bodyId} | Args:`, params.args);
  
  /* ---> کدهای ارسال واقعی (فعلا غیرفعال) <---
  try {
    await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '09362476933', // نام کاربری پنل شما
        apiKey: config.apiKey, 
        sender: config.sender,
        mobile: formattedMobile,
        text: params.text,
        bodyId: params.bodyId,
        args: params.args
      }),
    });
  } catch (error) {
    console.error(`🚨 [NETWORK ERROR - ${params.logTag}] خطا در ارتباط با سرور:`, error);
  }
  */
}

export async function sendOtpSMS(mobile: string, code: string) {
  await sendRealSMS({
    mobile: mobile,
    bodyId: 534465, // کد الگوی پیامک ورود شما در پنل پیامک
    args: [code],
    logTag: 'OTP_LOGIN'
  });
}

export async function sendUserNotification(data: UserNotificationData) {
  let statusFarsi = '';
  
  // هماهنگ شده با وضعیت‌های سامانه تعمیرات فیکسیز
  switch (data.status) {
    case 'customer_login_success': statusFarsi = 'ورود موفق به پنل کاربری'; break;
    case 'pending_coordinator':    statusFarsi = 'درخواست جدید شما در سامانه ثبت شد و در حال بررسی است'; break;
    case 'pending_supervisor':     statusFarsi = 'در حال بررسی توسط تکنسین'; break;
    case 'accepted_waiting_device':statusFarsi = 'درخواست پذیرش شد، لطفا دستگاه را به شرکت ارسال کنید'; break;
    case 'pending_customer_approval': statusFarsi = `هزینه اولیه: ${data.price} ریال. لطفا جهت تایید به پنل مراجعه کنید`; break;
    case 'repairing':              statusFarsi = 'در حال تعمیر'; break;
    case 'estimated':              statusFarsi = 'برآورد هزینه نهایی'; break;
    case 'invoiced':               statusFarsi = `فاکتور نهایی صادر شد. مبلغ: ${data.price} ریال`; break;
    default:                       statusFarsi = 'وضعیت درخواست شما بروزرسانی شد';
  }
  
  await sendRealSMS({ 
    mobile: data.userMobile, 
    bodyId: 534466, 
    args: [data.trackingCode, statusFarsi], 
    logTag: 'USER_STATUS_UPDATE' 
  });
}