// functions/api/send-sms.ts
export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { username, apiKey, sender, mobile, text, bodyId, args } = body;

    if (!username || !apiKey || !mobile) {
      return new Response(JSON.stringify({ error: "اطلاعات ناقص است" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let url = '';
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', apiKey);
    formData.append('to', mobile);

    // اگر کد الگو (bodyId) ارسال شده باشد، از وب‌سرویس خدماتی (ضد بلک‌لیست) استفاده می‌شود
    if (bodyId) {
      url = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';
      formData.append('bodyId', bodyId.toString());
      formData.append('text', Array.isArray(args) ? args.join(';') : args);
    } 
    // در غیر این صورت پیامک عادی ارسال می‌شود
    else {
      url = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';
      formData.append('from', sender);
      formData.append('text', text);
      formData.append('isflash', 'false');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}